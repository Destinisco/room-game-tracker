import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
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
import { Sparkles, Loader2, Edit2 } from "lucide-react";
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
  const [editingPlayer, setEditingPlayer] = useState(false);
  const [playerEdits, setPlayerEdits] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    band_color: "",
    gender: "",
    consent: false,
  });

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
        setPlayerEdits({
          first_name: playerData.first_name || "",
          last_name: playerData.last_name || "",
          email: playerData.email || "",
          phone: playerData.phone || "",
          band_color: playerData.band_color || "",
          gender: playerData.gender || "",
          consent: playerData.consent || false,
        });
        // Admins can always edit, regardless of consent
        setConsentBlocked(!isAdmin && !playerData.consent);

        // First get room to find room_type_id
        const { data: roomData, error: roomError } = await supabase
          .from("rooms")
          .select("room_type_id")
          .eq("id", roomId)
          .single();

        if (roomError) throw roomError;

        // Then fetch roles using room_type_id
        if (roomData?.room_type_id) {
          const { data: rolesData, error: rolesError } = await supabase
            .from("role_templates")
            .select("*")
            .eq("room_type_id", roomData.room_type_id)
            .order("created_at", { ascending: true });

          if (rolesError) throw rolesError;
          setRoles(rolesData || []);
        }

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

        // Load latest analysis template with room_type info
        const { data: roomTypeData } = await supabase
          .from("rooms")
          .select("room_type_id")
          .eq("id", roomId)
          .single();

        if (roomTypeData?.room_type_id) {
          const { data: templateData } = await supabase
            .from("analysis_templates")
            .select(`
              *,
              room_type:room_types!room_type_id (
                name,
                pdf_template_component
              )
            `)
            .eq("room_type_id", roomTypeData.room_type_id)
            .order("version", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (templateData) {
            setTemplate(templateData);
          }
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

  const handleSavePlayer = async () => {
    if (!isAdmin) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from("players")
        .update(playerEdits)
        .eq("id", playerId);

      if (error) throw error;

      setPlayer({ ...player!, ...playerEdits });
      setEditingPlayer(false);
      setConsentBlocked(!isAdmin && !playerEdits.consent);

      toast({
        title: "Uloženo",
        description: "Údaje hráče byly úspěšně uloženy",
      });
    } catch (error) {
      console.error("Error saving player:", error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se uložit údaje hráče",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
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
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {!editingPlayer && player.band_color && (
                    <Badge variant="outline" className="text-base">
                      {player.band_color}
                    </Badge>
                  )}
                  {!editingPlayer && (
                    <h3 className="text-xl font-semibold">
                      {player.first_name} {player.last_name}
                    </h3>
                  )}
                  {editingPlayer && (
                    <h3 className="text-xl font-semibold">Editace údajů hráče</h3>
                  )}
                </div>
                {isAdmin && !editingPlayer && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingPlayer(true)}
                  >
                    <Edit2 className="w-4 h-4 mr-2" />
                    Upravit
                  </Button>
                )}
              </div>

              {!editingPlayer ? (
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
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Jméno</Label>
                      <Input
                        value={playerEdits.first_name}
                        onChange={(e) => setPlayerEdits({ ...playerEdits, first_name: e.target.value })}
                        placeholder="Jméno"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Příjmení</Label>
                      <Input
                        value={playerEdits.last_name}
                        onChange={(e) => setPlayerEdits({ ...playerEdits, last_name: e.target.value })}
                        placeholder="Příjmení"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input
                        type="email"
                        value={playerEdits.email}
                        onChange={(e) => setPlayerEdits({ ...playerEdits, email: e.target.value })}
                        placeholder="email@example.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Telefon</Label>
                      <Input
                        value={playerEdits.phone}
                        onChange={(e) => setPlayerEdits({ ...playerEdits, phone: e.target.value })}
                        placeholder="+420..."
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Barva pásku</Label>
                      <Input
                        value={playerEdits.band_color}
                        onChange={(e) => setPlayerEdits({ ...playerEdits, band_color: e.target.value })}
                        placeholder="Modrá"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Pohlaví</Label>
                      <Select
                        value={playerEdits.gender}
                        onValueChange={(value) => setPlayerEdits({ ...playerEdits, gender: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Vyberte pohlaví" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Muž">Muž</SelectItem>
                          <SelectItem value="Žena">Žena</SelectItem>
                          <SelectItem value="Jiné">Jiné</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={playerEdits.consent}
                      onCheckedChange={(checked) => setPlayerEdits({ ...playerEdits, consent: checked })}
                      id="consent"
                    />
                    <Label htmlFor="consent">Souhlas se zpracováním herního profilu</Label>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleSavePlayer} disabled={saving}>
                      {saving ? "Ukládání..." : "Uložit"}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setEditingPlayer(false);
                        setPlayerEdits({
                          first_name: player.first_name || "",
                          last_name: player.last_name || "",
                          email: player.email || "",
                          phone: player.phone || "",
                          band_color: player.band_color || "",
                          gender: player.gender || "",
                          consent: player.consent || false,
                        });
                      }}
                    >
                      Zrušit
                    </Button>
                  </div>
                </div>
              )}
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

          {generating && (
            <div className="mt-6 pt-6 border-t text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="mt-2 text-sm text-muted-foreground">Generuji analýzu...</p>
            </div>
          )}

          {isAdmin && analysis && player && template && !generating && (
            <div className="mt-6 pt-6 border-t">
              <h3 className="text-lg font-semibold mb-4">Analýza hráče</h3>
              <PlayerAnalysisPreview 
                playerId={player.id}
                analysis={analysis.ai_output_json}
                player={player}
                template={{
                  name: template.name,
                  backgroundFrontUrl: template.background_front_url,
                  backgroundBackUrl: template.background_back_url,
                  version: template.version,
                  pdfTemplateComponent: template.room_type?.pdf_template_component || 'DefaultTemplate',
                }}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};
