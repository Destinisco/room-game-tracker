import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface AnalysisTemplate {
  id: string;
  room_id: string;
  name: string;
  slots_json: string;
  background_url: string | null;
  version: number;
  created_at: string;
  updated_at: string;
}

interface AnalysisTemplateTabProps {
  roomId: string;
}

const DEFAULT_SLOTS_JSON = `{
  "pageSize": "A4",
  "dpi": 300,
  "slots": [
    {"name":"role","page":1,"x":80,"y":140,"width":300,"fontSize":16,"source":"player.role"},
    {"name":"strength1","page":1,"x":80,"y":260,"width":500,"fontSize":11,"source":"ai.strengths[0]"},
    {"name":"strength2","page":1,"x":80,"y":310,"width":500,"fontSize":11,"source":"ai.strengths[1]"},
    {"name":"strength3","page":1,"x":80,"y":360,"width":500,"fontSize":11,"source":"ai.strengths[2]"},
    {"name":"flaw1","page":1,"x":80,"y":460,"width":500,"fontSize":11,"source":"ai.flaws[0]"},
    {"name":"flaw2","page":1,"x":80,"y":510,"width":500,"fontSize":11,"source":"ai.flaws[1]"},
    {"name":"flaw3","page":1,"x":80,"y":560,"width":500,"fontSize":11,"source":"ai.flaws[2]"},
    {"name":"story","page":1,"x":80,"y":680,"width":500,"fontSize":11,"source":"ai.story"},
    {"name":"feature1","page":2,"x":80,"y":180,"width":500,"fontSize":11,"source":"ai.features[0]"},
    {"name":"feature2","page":2,"x":80,"y":230,"width":500,"fontSize":11,"source":"ai.features[1]"},
    {"name":"feature3","page":2,"x":80,"y":280,"width":500,"fontSize":11,"source":"ai.features[2]"},
    {"name":"recommendations","page":2,"x":80,"y":390,"width":500,"fontSize":11,"source":"ai.recommendations"}
  ]
}`;

export const AnalysisTemplateTab = ({ roomId }: AnalysisTemplateTabProps) => {
  const [template, setTemplate] = useState<AnalysisTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [jsonError, setJsonError] = useState("");
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: "",
    slotsJson: DEFAULT_SLOTS_JSON,
    backgroundUrl: "",
  });

  useEffect(() => {
    fetchTemplate();
  }, [roomId]);

  const fetchTemplate = async () => {
    try {
      const { data, error } = await supabase
        .from("analysis_templates")
        .select("*")
        .eq("room_id", roomId)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setTemplate(data);
        setFormData({
          name: data.name,
          slotsJson: data.slots_json,
          backgroundUrl: data.background_url || "",
        });
      }
    } catch (error) {
      console.error("Error fetching template:", error);
    } finally {
      setLoading(false);
    }
  };

  const validateJSON = (jsonString: string) => {
    try {
      JSON.parse(jsonString);
      setJsonError("");
      return true;
    } catch (e) {
      setJsonError("Nevalidní JSON formát");
      return false;
    }
  };

  const handleSlotsJsonChange = (value: string) => {
    setFormData({ ...formData, slotsJson: value });
    validateJSON(value);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Chyba",
        description: "Zadejte název šablony",
        variant: "destructive",
      });
      return;
    }

    if (!validateJSON(formData.slotsJson)) {
      toast({
        title: "Chyba",
        description: "Opravte JSON před uložením",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    try {
      if (template) {
        // Update existing template (increment version)
        const { error } = await supabase
          .from("analysis_templates")
          .update({
            name: formData.name,
            slots_json: formData.slotsJson,
            background_url: formData.backgroundUrl || null,
            version: template.version + 1,
          })
          .eq("id", template.id);

        if (error) throw error;
      } else {
        // Create new template
        const { error } = await supabase
          .from("analysis_templates")
          .insert({
            room_id: roomId,
            name: formData.name,
            slots_json: formData.slotsJson,
            background_url: formData.backgroundUrl || null,
            version: 1,
          });

        if (error) throw error;
      }

      toast({
        title: "Uloženo",
        description: "Šablona byla úspěšně uložena",
      });

      fetchTemplate();
    } catch (error) {
      console.error("Error saving template:", error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se uložit šablonu",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-muted-foreground">Načítání...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Analytická šablona PDF</h3>
        <p className="text-sm text-muted-foreground">
          Definujte layout a pozice textů pro generované PDF analýzy
        </p>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label htmlFor="template-name">Název šablony *</Label>
              {template && (
                <Badge variant="secondary">
                  Verze {template.version}
                </Badge>
              )}
            </div>
            <Input
              id="template-name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="např. Důvěra – hlavní šablona"
            />
          </div>

          <div>
            <Label htmlFor="slots-json">Slots JSON *</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Definice pozic a stylů textových polí v PDF
            </p>
            <Textarea
              id="slots-json"
              value={formData.slotsJson}
              onChange={(e) => handleSlotsJsonChange(e.target.value)}
              className={`font-mono text-xs ${jsonError ? "border-destructive" : ""}`}
              rows={20}
            />
            {jsonError && (
              <p className="text-xs text-destructive mt-1">{jsonError}</p>
            )}
          </div>

          <div>
            <Label htmlFor="background-url">URL pozadí PDF</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Zatím zadejte URL, nahrávání souborů bude přidáno později
            </p>
            <Input
              id="background-url"
              value={formData.backgroundUrl}
              onChange={(e) =>
                setFormData({ ...formData, backgroundUrl: e.target.value })
              }
              placeholder="https://..."
            />
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving || !!jsonError}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Ukládání..." : "Uložit šablonu"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {!template && (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-muted-foreground">
            <p>Šablona ještě nebyla vytvořena</p>
            <p className="text-sm mt-2">
              Vyplňte formulář výše a uložte první verzi šablony
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
