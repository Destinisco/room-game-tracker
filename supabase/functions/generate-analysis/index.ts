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

    // Fetch player with session and room data (including ai_brief and behavior_lexicon)
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
            band_colors,
            ai_brief,
            behavior_lexicon
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
        primary_role:role_templates(name, czech_name, english_name, description)
      `)
      .eq("player_id", playerId)
      .maybeSingle();

    if (obsError) {
      console.error("Chyba při načítání pozorování:", obsError);
    }

    console.log("Pozorování načteno");

    // Fetch behavior categories with items (including psychological meanings)
    const { data: behaviorData, error: behaviorError } = await supabase
      .from("behavior_categories")
      .select(`
        id,
        name,
        items:behavior_items(id, label, psychological_meaning)
      `)
      .eq("room_id", player.session.rooms.id);

    if (behaviorError) {
      console.error("Chyba při načítání kategorií chování:", behaviorError);
    }

    // Fetch analysis template for this room
    const { data: template, error: templateError } = await supabase
      .from("analysis_templates")
      .select("*")
      .eq("room_id", player.session.rooms.id)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (templateError) {
      console.error("Chyba při načítání šablony:", templateError);
    }

    console.log("Šablona načtena:", template ? `verze ${template.version}` : "žádná");

    // Build behavior context with psychological meanings
    const behaviorContext = (behaviorData || []).map((category: any) => {
      const checkedItems = (category.items || [])
        .filter((item: any) => {
          const categoryKey = category.name;
          const itemKey = item.label;
          const fullKey = `${categoryKey}.${itemKey}`;
          return observation?.checks?.[fullKey] === true;
        })
        .map((item: any) => ({
          label: item.label,
          meaning: item.psychological_meaning || "Význam není definován"
        }));

      return {
        category: category.name,
        checkedBehaviors: checkedItems
      };
    }).filter((cat: any) => cat.checkedBehaviors.length > 0);

    // Determine role name based on language
    let roleName = null;
    if (observation?.primary_role) {
      const lang = observation.language || "cs";
      if (lang === "cs") {
        roleName = observation.primary_role.czech_name || observation.primary_role.name;
      } else if (lang === "en") {
        roleName = observation.primary_role.english_name || observation.primary_role.name;
      } else {
        roleName = observation.primary_role.name;
      }
    }

    // Prepare player data for AI
    const playerData = {
      full_name: player.full_name,
      email: player.email,
      phone: player.phone,
      band_color: player.band_color,
      gender: player.gender,
      code: player.session.code,
      role: roleName,
      role_description: observation?.primary_role?.description || null,
      notes: observation?.notes || null,
      language: observation?.language || "cs",
      behavior_context: behaviorContext,
    };

    // Get room configuration
    const room = player.session.rooms;
    const aiBrief = room.ai_brief || "Vytvořte pozitivní a motivující analýzu zaměřenou na osobnostní rozvoj.";
    const behaviorLexicon = room.behavior_lexicon || {};

    // Language mapping
    const languageMap: Record<string, { name: string; instruction: string }> = {
      cs: { name: "češtině", instruction: "Všechny texty musí být v češtině." },
      en: { name: "angličtině", instruction: "All texts must be in English." },
      de: { name: "němčině", instruction: "Alle Texte müssen auf Deutsch sein." },
      pl: { name: "polštině", instruction: "Wszystkie teksty muszą być po polsku." },
      sk: { name: "slovenštině", instruction: "Všetky texty musia byť v slovenčine." },
    };
    
    const selectedLanguage = languageMap[playerData.language] || languageMap.cs;

    // Build system prompt with language instruction
    const systemPrompt = `Jsi expert na psychologickou analýzu a hodnocení týmové spolupráce v únikových hrách.
${aiBrief}

DŮLEŽITÉ: ${selectedLanguage.instruction}

Vždy vrať validní JSON s následujícími klíči:
- role: Typ role hráče (např. "Supporter", "Navigator", "Analyzer", "Leader") - ${selectedLanguage.instruction}
- strengths: Pole 3 objektů s klíči "title" a "description" pro silné stránky
- weaknesses: Pole 3 objektů s klíči "title" a "description" pro oblasti k rozvoji
- trust: Dlouhý text (100-150 slov) o důvěře hráče v sebe, ostatní a příběh
- personalityTraits: Pole 3 objektů s klíči "title" a "description" pro klíčové osobnostní rysy
- collaboration: Krátký text (50-70 slov) s doporučeními pro budoucí spolupráci v týmu

Formát pro strengths, weaknesses a personalityTraits:
[
  { "title": "Název vlastnosti", "description": "Velmi stručný popis (max 2-3 řádky, 30-40 slov)" },
  ...
]

${selectedLanguage.instruction} Použij informace o zaškrtnutém chování a jejich psychologických významech.`;

    // Build user prompt with behavior meanings
    const userPrompt = `Analyzuj tohoto hráče:

${JSON.stringify(playerData, null, 2)}

Behavior Lexikon (psychologické významy):
${JSON.stringify(behaviorLexicon, null, 2)}

Zaškrtnuté chování s významy:
${JSON.stringify(behaviorContext, null, 2)}

Vrať JSON s klíči: role, strengths (array[3] objektů s title+description - description max 2-3 řádky), weaknesses (array[3] objektů s title+description - description max 2-3 řádky), trust (dlouhý text 100-150 slov), personalityTraits (array[3] objektů s title+description - description max 2-3 řádky), collaboration (krátký text 50-70 slov).`;

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
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
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

    // Add dynamic data to AI output
    aiOutputJson.code = player.session.code || "N/A";
    aiOutputJson.color = player.band_color || "Neurčeno";
    aiOutputJson.gameCode = player.session.code || "N/A"; // Use session code as game code

    // Validate required keys
    const requiredKeys = ["role", "strengths", "weaknesses", "trust", "personalityTraits", "collaboration"];
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

    const templateVersion = template?.version || 1;

    if (existingAnalysis) {
      console.log("Aktualizuji existující analýzu");
      const { error: updateError } = await supabase
        .from("player_analyses")
        .update({
          ai_version: 1, // Static version for now
          template_version: templateVersion,
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
          ai_version: 1,
          template_version: templateVersion,
          ai_output_json: aiOutputJson,
        });

      if (insertError) {
        console.error("Chyba při vkládání analýzy:", insertError);
        throw insertError;
      }
    }

    console.log("Analýza uložena");

    // Prepare template data for response
    const templateData = template ? {
      name: template.name,
      slotsJson: template.slots_json,
      backgroundFrontUrl: template.background_front_url,
      backgroundBackUrl: template.background_back_url,
      version: template.version,
    } : null;

    return new Response(
      JSON.stringify({
        success: true,
        analysis: aiOutputJson,
        template: templateData,
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
