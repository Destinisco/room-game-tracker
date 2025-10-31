import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useUserRole } from "@/hooks/useUserRole";
import { Sparkles, Loader2 } from "lucide-react";
import { PlayerAnalysisPreview } from "./PlayerAnalysisPreview";

interface Role {
  id: string;
  name: string;
  description: string | null;
}

interface BehaviorItem {
  id: string;
  label: string;
}

interface Category {
  id: string;
  name: string;
  items: BehaviorItem[];
}

interface Observation {
  id: string;
  primary_role_id: string | null;
  checks: Record<string, string>;
  language: string;
  notes: string | null;
}

interface Player {
  id: string;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  band_color: string | null;
  gender: string | null;
  consent: boolean;
}

interface PlayerObservationProps {
  playerId: string;
  roomId: string;
}

export const PlayerObservation = ({ playerId, roomId }: PlayerObservationProps) => {
  const { toast } = useToast();
  const { isAdmin } = useUserRole();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [player, setPlayer] = useState<Player | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [observation, setObservation] = useState<Observation | null>(null);
  const [checks, setChecks] = useState<Record<string, string>>({});
  const [primaryRoleId, setPrimaryRoleId] = useState<string>("");
  const [language, setLanguage] = useState<string>("cs");
  const [notes, setNotes] = useState<string>("");
  const [consentBlocked, setConsentBlocked] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [template, setTemplate] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: playerData, error: playerError } = await supabase
          .from("players")
          .select("*")
          .eq("id", playerId)
          .single();

        if (playerError) throw playerError;
        setPlayer(playerData);
        // Admins can always edit, regardless of consent
        setConsentBlocked(!isAdmin && !playerData.consent);

        const { data: rolesData, error: rolesError } = await supabase
          .from("role_templates")
          .select("*")
          .eq("room_id", roomId)
          .order("created_at", { ascending: true });

        if (rolesError) throw rolesError;
        setRoles(rolesData || []);

        const { data: categoriesData, error: categoriesError } = await supabase
          .from("behavior_categories")
          .select(`
            id,
            name,
            behavior_items (
              id,
              label
            )
          `)
          .eq("room_id", roomId)
          .order("created_at", { ascending: true });

        if (categoriesError) throw categoriesError;

        const formattedCategories = categoriesData.map((cat: any) => ({
          id: cat.id,
          name: cat.name,
          items: cat.behavior_items || [],
        }));

        setCategories(formattedCategories);

        const { data: observationData, error: observationError } = await supabase
          .from("player_observations")
          .select("*")
          .eq("player_id", playerId)
          .maybeSingle();

        if (observationError && observationError.code !== "PGRST116") {
          throw observationError;
        }

        if (observationData) {
          setObservation(observationData as Observation);
          setChecks((observationData.checks as Record<string, string>) || {});
          setPrimaryRoleId(observationData.primary_role_id || "");
          setLanguage(observationData.language || "cs");
          setNotes(observationData.notes || "");
        }

        // Load existing analysis
        const { data: analysisData } = await supabase
          .from("player_analyses")
          .select("*")
          .eq("player_id", playerId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (analysisData) {
          setAnalysis(analysisData);
        }

        // Load published template
        const { data: templateData } = await supabase
          .from("game_templates")
          .select("*")
          .eq("room_id", roomId)
          .eq("status", "published")
          .order("version", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (templateData) {
          setTemplate(templateData);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast({
          title: "Chyba",
          description: "Nepodařilo se načíst data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [playerId, roomId, toast, isAdmin]);

  const handleCheckChange = (itemId: string, value: string) => {
    setChecks((prev) => ({
      ...prev,
      [itemId]: value,
    }));
  };

  const getCategoryCount = (category: Category) => {
    const yesCount = category.items.filter((item) => checks[item.id] === "yes").length;
    const totalCount = category.items.length;
    return { yesCount, totalCount };
  };

  const getSelectedBehaviors = () => {
    const selected: { category: string; item: string }[] = [];
    categories.forEach((category) => {
      category.items.forEach((item) => {
        if (checks[item.id] === "yes") {
          selected.push({ category: category.name, item: item.label });
        }
      });
    });
    return selected;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        player_id: playerId,
        primary_role_id: primaryRoleId || null,
        checks,
        language,
        notes,
      };

      if (observation) {
        const { error } = await supabase
          .from("player_observations")
          .update(payload)
          .eq("id", observation.id);
        if (error) throw error;
      } else {
        const { data: newObs, error } = await supabase
          .from("player_observations")
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        if (newObs) setObservation(newObs as Observation);
      }

      toast({
        title: "Uloženo",
        description: "Pozorování bylo úspěšně uloženo",
      });
    } catch (error) {
      console.error("Error saving observation:", error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se uložit pozorování",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateAnalysis = async () => {
    if (!player?.consent && !isAdmin) {
      toast({
        title: "Souhlas chybí",
        description: "Hráč neudělil souhlas, nelze generovat analýzu",
        variant: "destructive",
      });
      return;
    }

    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-analysis", {
        body: { playerId },
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      toast({
        title: "Analýza vygenerována",
        description: "Profil hráče byl úspěšně vygenerován",
      });
      
      // Reload analysis
      const { data: analysisData } = await supabase
        .from("player_analyses")
        .select("*")
        .eq("player_id", playerId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (analysisData) {
        setAnalysis(analysisData);
      }
    } catch (error) {
      console.error("Error generating analysis:", error);
      toast({
        title: "Chyba",
        description: error instanceof Error ? error.message : "Nepodařilo se vygenerovat analýzu",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Načítání...</div>;
  }

  const selectedBehaviors = getSelectedBehaviors();

  return (
    <TooltipProvider>
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Detail hráče</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {player && (
            <div className="space-y-3 p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                {player.band_color && (
                  <Badge variant="outline" className="text-base">
                    {player.band_color}
                  </Badge>
                )}
                <h3 className="text-xl font-semibold">
                  {player.first_name} {player.last_name}
                </h3>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                {player.email && <div>Email: {player.email}</div>}
                {player.phone && <div>Telefon: {player.phone}</div>}
                {player.gender && <div>Pohlaví: {player.gender}</div>}
                <div>
                  Souhlas: {player.consent ? (
                    <Badge variant="default" className="ml-1">Ano</Badge>
                  ) : (
                    <Badge variant="destructive" className="ml-1">Ne</Badge>
                  )}
                </div>
              </div>
            </div>
          )}

          {!player?.consent && !isAdmin && (
            <div className="p-4 bg-destructive/10 border border-destructive rounded-lg">
              <p className="text-sm text-destructive font-medium">
                ⚠️ Pozorování a analýza jsou zablokované, protože hráč neposkytl souhlas se zpracováním herního profilu.
              </p>
            </div>
          )}

          {isAdmin && !player?.consent && (
            <div className="p-4 bg-warning/10 border border-warning rounded-lg">
              <p className="text-sm text-warning font-medium">
                ℹ️ Hráč neudělil souhlas, ale jako admin můžete upravovat profil a generovat analýzu.
              </p>
            </div>
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <div className={consentBlocked ? "pointer-events-none opacity-50" : ""}>
                <div className="space-y-2">
                  <Label>Jazyk výstupu</Label>
                  <Select value={language} onValueChange={setLanguage} disabled={consentBlocked}>
                    <SelectTrigger>
                      <SelectValue placeholder="Vyberte jazyk" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cs">Čeština</SelectItem>
                      <SelectItem value="en">Angličtina</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 mt-4">
                  <Label>Hlavní role</Label>
                  <Select value={primaryRoleId} onValueChange={setPrimaryRoleId} disabled={consentBlocked}>
                    <SelectTrigger>
                      <SelectValue placeholder="Vyberte hlavní roli" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((role) => (
                        <SelectItem key={role.id} value={role.id}>
                          {role.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-4 mt-6">
                  <h3 className="font-semibold text-lg">Pozorované chování</h3>
                  {categories.map((category) => {
                    const { yesCount, totalCount } = getCategoryCount(category);
                    return (
                      <Card key={category.id}>
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base">{category.name}</CardTitle>
                            <Badge variant="secondary">{yesCount}/{totalCount}</Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {category.items.map((item) => (
                            <div key={item.id} className="flex items-center justify-between">
                              <label className="text-sm font-medium">
                                {item.label}
                              </label>
                              <ToggleGroup
                                type="single"
                                value={checks[item.id] || ""}
                                onValueChange={(value) => handleCheckChange(item.id, value)}
                                disabled={consentBlocked}
                              >
                                <ToggleGroupItem value="yes" aria-label="Ano">
                                  Ano
                                </ToggleGroupItem>
                                <ToggleGroupItem value="no" aria-label="Ne">
                                  Ne
                                </ToggleGroupItem>
                              </ToggleGroup>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {selectedBehaviors.length > 0 && (
                  <div className="space-y-2 p-4 bg-muted rounded-lg mt-4">
                    <h4 className="font-semibold">Souhrn</h4>
                    {player && (
                      <div className="text-sm space-y-1">
                        {player.band_color && <div>Barva: {player.band_color}</div>}
                        {player.gender && <div>Pohlaví: {player.gender}</div>}
                      </div>
                    )}
                    <div className="mt-2">
                      <p className="text-sm font-medium mb-1">Vybrané (Ano):</p>
                      <div className="text-sm space-y-1">
                        {selectedBehaviors.map((behavior, index) => (
                          <div key={index}>
                            {behavior.category} – {behavior.item}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-2 mt-4">
                  <Label>Poznámky</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Volitelné poznámky k pozorování..."
                    rows={4}
                    disabled={consentBlocked}
                  />
                </div>

                <div className="flex gap-2 mt-4">
                  <Button onClick={handleSave} disabled={saving || consentBlocked} className="flex-1">
                    {saving ? "Ukládání..." : "Uložit pozorování"}
                  </Button>
                  <Button 
                    onClick={handleGenerateAnalysis}
                    disabled={generating || consentBlocked}
                    variant={analysis ? "secondary" : "default"}
                  >
                    {generating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generuji...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        {analysis ? "Regenerovat" : "Generovat"}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </TooltipTrigger>
            {consentBlocked && (
              <TooltipContent>
                <p>Vyžaduje souhlas se zpracováním herního profilu</p>
              </TooltipContent>
            )}
          </Tooltip>

          {isAdmin && analysis && player && template && (
            <div className="mt-6 pt-6 border-t">
              <h3 className="text-lg font-semibold mb-4">Analýza hráče</h3>
              <PlayerAnalysisPreview 
                playerId={player.id}
                analysis={analysis.ai_output_json}
                template={{
                  name: template.name,
                  accentColor: template.accent_color,
                  fontFamily: template.font_family,
                  layoutDefinition: template.layout_definition,
                }}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};
