import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { playerId } = await req.json();

    if (!playerId) {
      throw new Error("playerId je povinný");
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("Načítám data hráče:", playerId);

    // Fetch player with session and room data
    const { data: player, error: playerError } = await supabase
      .from("players")
      .select(`
        *,
        session:game_sessions!inner(
          id,
          code,
          room_id,
          rooms!inner(
            id,
            name,
            band_colors
          )
        )
      `)
      .eq("id", playerId)
      .single();

    if (playerError || !player) {
      console.error("Chyba při načítání hráče:", playerError);
      throw new Error("Hráč nenalezen");
    }

    console.log("Hráč načten:", player.full_name);

    // Check consent
    if (!player.consent) {
      throw new Error("Hráč neudělil souhlas, nelze generovat analýzu");
    }

    // Fetch player observations
    const { data: observation, error: obsError } = await supabase
      .from("player_observations")
      .select(`
        *,
        primary_role:role_templates(name, description)
      `)
      .eq("player_id", playerId)
      .maybeSingle();

    if (obsError) {
      console.error("Chyba při načítání pozorování:", obsError);
    }

    console.log("Pozorování načteno");

    // Fetch behavior categories with items
    const { data: behaviorData, error: behaviorError } = await supabase
      .from("behavior_categories")
      .select(`
        id,
        name,
        items:behavior_items(id, label)
      `)
      .eq("room_id", player.session.rooms.id);

    if (behaviorError) {
      console.error("Chyba při načítání kategorií chování:", behaviorError);
    }

    // Fetch published AI brief for this room
    const { data: aiBrief, error: briefError } = await supabase
      .from("game_ai_briefs")
      .select("*")
      .eq("room_id", player.session.rooms.id)
      .eq("status", "published")
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (briefError || !aiBrief) {
      console.error("Chyba při načítání AI briefu:", briefError);
      throw new Error("AI brief nenalezen pro tuto místnost");
    }

    console.log("AI brief načten, verze:", aiBrief.version);

    // Fetch published template for this room
    const { data: template, error: templateError } = await supabase
      .from("game_templates")
      .select("*")
      .eq("room_id", player.session.rooms.id)
      .eq("status", "published")
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (templateError || !template) {
      console.error("Chyba při načítání šablony:", templateError);
      throw new Error("Šablona nenalezena pro tuto místnost");
    }

    console.log("Šablona načtena, verze:", template.version);

    // Prepare player data for AI
    const playerData = {
      full_name: player.full_name,
      email: player.email,
      phone: player.phone,
      band_color: player.band_color,
      gender: player.gender,
      code: player.session.code,
      role: observation?.primary_role?.name || null,
      notes: observation?.notes || null,
      checks: observation?.checks || {},
      language: observation?.language || "cs",
    };

    // Prepare required keys from output schema
    const requiredKeys = aiBrief.output_schema.required || [];

    // Build user prompt from template
    let userPrompt = aiBrief.user_prompt_template
      .replace("{{json player}}", JSON.stringify(playerData, null, 2))
      .replace("{{json required_keys}}", JSON.stringify(requiredKeys));

    console.log("Volám Lovable AI...");

    // Call Lovable AI
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY není nakonfigurován");
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: aiBrief.model,
        messages: [
          { role: "system", content: aiBrief.system_prompt },
          { role: "user", content: userPrompt }
        ],
        temperature: aiBrief.temperature,
        max_tokens: aiBrief.max_tokens,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        throw new Error("Překročen limit požadavků AI. Zkuste to znovu později.");
      }
      if (aiResponse.status === 402) {
        throw new Error("Nedostatek kreditů pro AI. Přidejte kredity ve workspace nastavení.");
      }
      
      throw new Error("Chyba při volání AI API");
    }

    const aiData = await aiResponse.json();
    console.log("AI odpověď přijata");

    const aiContent = aiData.choices?.[0]?.message?.content;
    if (!aiContent) {
      throw new Error("AI nevrátilo žádný obsah");
    }

    // Parse JSON from AI response
    let aiOutputJson;
    try {
      // Try to extract JSON from markdown code blocks if present
      const jsonMatch = aiContent.match(/```json\s*([\s\S]*?)\s*```/) || 
                       aiContent.match(/```\s*([\s\S]*?)\s*```/);
      
      const jsonString = jsonMatch ? jsonMatch[1] : aiContent;
      aiOutputJson = JSON.parse(jsonString.trim());
    } catch (parseError) {
      console.error("Chyba při parsování JSON z AI:", parseError);
      console.error("AI obsah:", aiContent);
      throw new Error("AI nevrátilo platný JSON");
    }

    // Validate that all required keys are present
    const missingKeys = requiredKeys.filter((key: string) => !(key in aiOutputJson));
    if (missingKeys.length > 0) {
      console.error("Chybějící klíče:", missingKeys);
      return new Response(
        JSON.stringify({
          error: "AI nevrátilo všechny požadované klíče",
          missingKeys,
          aiOutput: aiOutputJson,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("AI výstup validován");

    // Save or update analysis
    const { data: existingAnalysis } = await supabase
      .from("player_analyses")
      .select("id")
      .eq("player_id", playerId)
      .maybeSingle();

    if (existingAnalysis) {
      console.log("Aktualizuji existující analýzu");
      const { error: updateError } = await supabase
        .from("player_analyses")
        .update({
          ai_version: aiBrief.version,
          template_version: template.version,
          ai_output_json: aiOutputJson,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingAnalysis.id);

      if (updateError) {
        console.error("Chyba při aktualizaci analýzy:", updateError);
        throw updateError;
      }
    } else {
      console.log("Vytvářím novou analýzu");
      const { error: insertError } = await supabase
        .from("player_analyses")
        .insert({
          session_id: player.session.id,
          player_id: playerId,
          ai_version: aiBrief.version,
          template_version: template.version,
          ai_output_json: aiOutputJson,
        });

      if (insertError) {
        console.error("Chyba při vkládání analýzy:", insertError);
        throw insertError;
      }
    }

    console.log("Analýza uložena");

    return new Response(
      JSON.stringify({
        success: true,
        analysis: aiOutputJson,
        template: {
          name: template.name,
          accentColor: template.accent_color,
          fontFamily: template.font_family,
          layoutDefinition: template.layout_definition,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Chyba v generate-analysis:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Neznámá chyba",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
