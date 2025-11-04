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
  background_front_url: string | null;
  background_back_url: string | null;
  version: number;
  created_at: string;
  updated_at: string;
}

interface AnalysisTemplateTabProps {
  roomTypeId: string;
  pdfTemplateComponent: string;
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

export const AnalysisTemplateTab = ({ roomTypeId, pdfTemplateComponent }: AnalysisTemplateTabProps) => {
  const [template, setTemplate] = useState<AnalysisTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: "",
    backgroundFrontUrl: "",
    backgroundBackUrl: "",
  });
  const [uploadingFront, setUploadingFront] = useState(false);
  const [uploadingBack, setUploadingBack] = useState(false);

  useEffect(() => {
    fetchTemplate();
  }, [roomTypeId]);

  const fetchTemplate = async () => {
    try {
      const { data, error } = await supabase
        .from("analysis_templates")
        .select("*")
        .eq("room_type_id", roomTypeId)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setTemplate(data);
        setFormData({
          name: data.name,
          backgroundFrontUrl: data.background_front_url || "",
          backgroundBackUrl: data.background_back_url || "",
        });
      }
    } catch (error) {
      console.error("Error fetching template:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file: File, side: 'front' | 'back') => {
    const setUploading = side === 'front' ? setUploadingFront : setUploadingBack;
    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${roomTypeId}_${side}_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('pdf-backgrounds')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('pdf-backgrounds')
        .getPublicUrl(filePath);

      if (side === 'front') {
        setFormData({ ...formData, backgroundFrontUrl: publicUrl });
      } else {
        setFormData({ ...formData, backgroundBackUrl: publicUrl });
      }

      toast({
        title: "Nahráno",
        description: `PDF pozadí (${side === 'front' ? 'přední' : 'zadní'} strana) bylo úspěšně nahráno`,
      });
    } catch (error) {
      console.error("Error uploading PDF:", error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se nahrát PDF",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
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

    setSaving(true);

    try {
      if (template) {
        // Update existing template (increment version)
        const { error } = await supabase
          .from("analysis_templates")
          .update({
            name: formData.name,
            background_front_url: formData.backgroundFrontUrl || null,
            background_back_url: formData.backgroundBackUrl || null,
            version: template.version + 1,
          })
          .eq("id", template.id);

        if (error) throw error;
      } else {
        // Create new template
        const { error } = await supabase
          .from("analysis_templates")
          .insert({
            room_type_id: roomTypeId,
            name: formData.name,
            slots_json: '{}',
            background_front_url: formData.backgroundFrontUrl || null,
            background_back_url: formData.backgroundBackUrl || null,
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
          Nastavení PDF šablony pro generované analýzy hráčů
        </p>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div>
            <Label>PDF Template komponenta</Label>
            <div className="p-3 bg-muted rounded-md font-mono text-sm mt-2">
              {pdfTemplateComponent}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Komponenta je definována v kódu: 
              <code className="ml-1 bg-muted px-1 py-0.5 rounded">
                src/components/pdf-templates/{pdfTemplateComponent}.tsx
              </code>
            </p>
          </div>

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
            <Label htmlFor="background-front">PDF pozadí – přední strana</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Nahrajte PDF soubor pro stranu 1 (max 10 MB)
            </p>
            <div className="flex gap-2 items-center">
              <Input
                id="background-front"
                type="file"
                accept="application/pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file, 'front');
                }}
                disabled={uploadingFront}
              />
              {formData.backgroundFrontUrl && (
                <a
                  href={formData.backgroundFrontUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline"
                >
                  Zobrazit
                </a>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="background-back">PDF pozadí – zadní strana</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Nahrajte PDF soubor pro stranu 2 (max 10 MB)
            </p>
            <div className="flex gap-2 items-center">
              <Input
                id="background-back"
                type="file"
                accept="application/pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file, 'back');
                }}
                disabled={uploadingBack}
              />
              {formData.backgroundBackUrl && (
                <a
                  href={formData.backgroundBackUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline"
                >
                  Zobrazit
                </a>
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
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
