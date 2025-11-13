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

    // Fetch available roles for this room
    const { data: availableRoles, error: rolesError } = await supabase
      .from("role_templates")
      .select("name, czech_name, english_name, description")
      .eq("room_id", player.session.rooms.id);

    if (rolesError) {
      console.error("Chyba při načítání rolí:", rolesError);
    }

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

    // Prepare list of available roles based on language
    const lang = observation?.language || "cs";
    const rolesList = (availableRoles || []).map((r: any) => {
      if (lang === "cs") return r.czech_name || r.name;
      if (lang === "en") return r.english_name || r.name;
      return r.name;
    }).filter(Boolean);

    const rolesString = rolesList.join(", ");

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

    // Build system prompt with language instruction and ENFORCE role selection
    const systemPrompt = `Jsi expert na psychologickou analýzu výkonnosti hráčů v únikových místnostech. Tvým úkolem je vytvořit profesionální, pozitivní a rozvíjející zpětnou vazbu založenou na pozorování chování během hry.

KONTEXT: Únikovky jsou týmové aktivity zaměřené na řešení hádanek pod časovým tlakem. Hráči projevují různé vzorce chování - někteří vedou tým, jiní detailně řeší hádanky, další propojují nápovědy. Každý styl přispívá k úspěchu týmu.

${aiBrief}

TÓNEM A STYLEM:
- Buď pozitivní, podporující a vývojově orientovaný
- Silné stránky: Konkrétní příklady toho, co hráč dělal dobře
- Oblasti k rozvoji: Konstruktivně, s návrhy na zlepšení (ne jako kritika)
- Propoj pozorované chování s psychologickými významy z lexikonu
- Používej konkrétní jazyk místo obecných frází

DŮLEŽITÉ: ${selectedLanguage.instruction}

${roleName ? `KRITICKÉ: Hráč má PŘIŘAZENOU ROLI: "${roleName}". MUSÍŠ použít PŘESNĚ tuto roli v poli "role". Nesmíš použít žádnou jinou roli.` : `KRITICKÉ: Vyber roli POUZE z těchto dostupných rolí: ${rolesString}. NESMÍŠ vymýšlet žádné jiné role, které nejsou v tomto seznamu.`}

STRUKTURA VÝSTUPU (JSON):
- role: ${roleName ? `MUSÍ BÝT PŘESNĚ: "${roleName}"` : `Jedna z těchto rolí: ${rolesString}`}
- strengths: Pole 3 objektů { "title": "Výstižný název", "text": "Detailní popis co hráč dělal dobře a proč je to cenné" }
- weaknesses: Pole 3 objektů { "title": "Oblast rozvoje", "text": "Konstruktivní popis příležitosti ke zlepšení s konkrétními doporučeními" }
- longAnalysis: Hlubší analýza (150-200 slov) o tom, jak hráč důvěřuje sobě, ostatním členům týmu a příběhu/zadání hry. Zmiň konkrétní pozorované chování.
- traits: Pole 3 objektů { "title": "Název rysu", "text": "Popis osobnostního rysu projeveného během hry" }
- collaborationAdvice: Text (100-120 slov) s praktickými doporučeními, jak může hráč zlepšit týmovou spolupráci v budoucích hrách nebo projektech.

PŘÍKLAD KVALITNÍHO VÝSTUPU:
Strengths title: "Strategické myšlení pod tlakem"
Strengths text: "Během hry jste prokázal schopnost rychle vyhodnotit situaci a navrhnout postup řešení. Vaše organizované myšlení pomohlo týmu neztratit se v množství informací a soustředit se na klíčové hádanky. Tato dovednost je cenná nejen v únikovkách, ale i v náročných pracovních projektech."

${selectedLanguage.instruction} Využij poskytnuté chování a jejich psychologické významy k vytvoření konkrétní, personalizované analýzy.`;

    // Build user prompt with behavior meanings
    const userPrompt = `Analyzuj tohoto hráče na základě pozorovaného chování:

=== INFORMACE O HRÁČI ===
${JSON.stringify(playerData, null, 2)}

=== PSYCHOLOGICKÝ LEXIKON (jak interpretovat chování) ===
${JSON.stringify(behaviorLexicon, null, 2)}

=== POZOROVANÉ CHOVÁNÍ BĚHEM HRY ===
${JSON.stringify(behaviorContext, null, 2)}

INSTRUKCE K ANALÝZE:
1. Prozkoumej každé zaškrtnuté chování a jeho psychologický význam
2. Identifikuj vzorce - opakující se styly jednání
3. Propoj chování s konkrétními silnými stránkami (3x)
4. Najdi konstruktivní oblasti k rozvoji (3x)
5. Analyzuj důvěru: v sebe (sebevědomí), v ostatní (delegování, naslouchání), v zadání hry (následování příběhu)
6. Identifikuj 3 klíčové osobnostní rysy projevené během hry
7. Navrhni praktická doporučení pro budoucí týmovou spolupráci

FORMÁT: Vrať JSON s těmito klíči:
- role: text
- strengths: pole 3 objektů {title, text}
- weaknesses: pole 3 objektů {title, text}
- longAnalysis: text o důvěře, 150-200 slov
- traits: pole 3 objektů {title, text}
- collaborationAdvice: text s doporučeními, 100-120 slov`;

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
        tools: [
          {
            type: "function",
            function: {
              name: "create_analysis",
              description: "Create a psychological analysis of the player",
              parameters: {
                type: "object",
                properties: {
                  role: {
                    type: "string",
                    description: roleName 
                      ? `Player's assigned role. MUST be exactly: "${roleName}"` 
                      : `Player's role. Choose ONLY from these available roles: ${rolesString}`,
                    enum: roleName ? [roleName] : rolesList
                  },
                  strengths: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string", description: "Concise title for the strength, max 40 characters" },
                        text: { type: "string", description: "Detailed description with specific examples, max 400 characters" }
                      },
                      required: ["title", "text"],
                      additionalProperties: false
                    },
                    minItems: 3,
                    maxItems: 3
                  },
                  weaknesses: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string", description: "Constructive title for area of development, max 40 characters" },
                        text: { type: "string", description: "Constructive description with specific suggestions for improvement, max 400 characters" }
                      },
                      required: ["title", "text"],
                      additionalProperties: false
                    },
                    minItems: 3,
                    maxItems: 3
                  },
                  longAnalysis: {
                    type: "string",
                    description: "Deep analysis of player's trust (in self, others, and game narrative), 1200-1500 characters with specific behavioral examples"
                  },
                  traits: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string", description: "Personality trait name, max 30 characters" },
                        text: { type: "string", description: "Description of how this trait manifested during the game, max 250 characters" }
                      },
                      required: ["title", "text"],
                      additionalProperties: false
                    },
                    minItems: 3,
                    maxItems: 3
                  },
                  collaborationAdvice: {
                    type: "string",
                    description: "Practical recommendations for future team collaboration, 700-900 characters with actionable suggestions"
                  }
                },
                required: ["role", "strengths", "weaknesses", "longAnalysis", "traits", "collaborationAdvice"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "create_analysis" } }
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

    // Extract structured output from tool call
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function?.name !== "create_analysis") {
      console.error("AI nevrátilo tool call:", JSON.stringify(aiData, null, 2));
      throw new Error("AI nevrátilo strukturovaný výstup");
    }

    let aiOutputJson;
    try {
      aiOutputJson = JSON.parse(toolCall.function.arguments);
      console.log("AI výstup úspěšně parsován z tool call");
    } catch (parseError) {
      console.error("Chyba při parsování arguments z tool call:", parseError);
      console.error("Arguments:", toolCall.function.arguments);
      throw new Error("AI nevrátilo platný JSON");
    }

    // Validate and truncate AI output to fit exact character limits
    aiOutputJson.strengths = (aiOutputJson.strengths || []).slice(0, 3).map((s: any) => ({
      title: (s.title || "").slice(0, 40),
      text: (s.text || s.description || "").slice(0, 400)
    }));

    aiOutputJson.weaknesses = (aiOutputJson.weaknesses || []).slice(0, 3).map((w: any) => ({
      title: (w.title || "").slice(0, 40),
      text: (w.text || w.description || "").slice(0, 400)
    }));

    aiOutputJson.longAnalysis = (aiOutputJson.longAnalysis || aiOutputJson.trust || "").slice(0, 1500);

    aiOutputJson.traits = (aiOutputJson.traits || aiOutputJson.personalityTraits || []).slice(0, 3).map((t: any) => ({
      title: (t.title || "").slice(0, 30),
      text: (t.text || t.description || "").slice(0, 250)
    }));

    aiOutputJson.collaborationAdvice = (aiOutputJson.collaborationAdvice || aiOutputJson.collaboration || "").slice(0, 900);

    // Add dynamic data to AI output
    aiOutputJson.code = player.session.code || "N/A";
    aiOutputJson.color = player.band_color || "Neurčeno";
    aiOutputJson.gameCode = player.session.code || "N/A";

    // Validate required keys
    const requiredKeys = ["role", "strengths", "weaknesses", "longAnalysis", "traits", "collaborationAdvice"];
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

    // Validate and enforce role
    if (roleName && aiOutputJson.role !== roleName) {
      console.error(`AI vrátilo nesprávnou roli: ${aiOutputJson.role}, očekávána: ${roleName}`);
      aiOutputJson.role = roleName; // Force correct role
    }

    if (!roleName && !rolesList.includes(aiOutputJson.role)) {
      console.error(`AI vrátilo nevalidní roli: ${aiOutputJson.role}, dostupné: ${rolesString}`);
      // Use first available role as fallback
      aiOutputJson.role = rolesList[0] || "Neurčená role";
    }

    console.log("Role validována:", aiOutputJson.role);

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
