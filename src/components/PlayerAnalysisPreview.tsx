import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PlayerAnalysisPreviewProps {
  playerId: string;
  analysis: any;
  template: {
    name: string;
    slotsJson: any;
    backgroundFrontUrl: string | null;
    backgroundBackUrl: string | null;
    version: number;
  };
}

export const PlayerAnalysisPreview = ({
  playerId,
  analysis,
  template,
}: PlayerAnalysisPreviewProps) => {
  const [downloading, setDownloading] = useState(false);
  const { toast } = useToast();

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-pdf", {
        body: {
          playerId,
          analysis,
          template,
        },
      });

      if (error) throw error;

      // Open HTML in new window for printing
      const blob = new Blob([data], { type: "text/html" });
      const url = window.URL.createObjectURL(blob);
      const printWindow = window.open(url, "_blank");
      
      if (printWindow) {
        printWindow.onload = () => {
          window.URL.revokeObjectURL(url);
        };
      }

      toast({
        title: "Připraveno k tisku",
        description: "V novém okně můžete dokument vytisknout nebo uložit jako PDF",
      });
    } catch (error) {
      console.error("Error downloading PDF:", error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se připravit dokument",
        variant: "destructive",
      });
    } finally {
      setDownloading(false);
    }
  };

  // Render analysis as readable HTML preview
  return (
    <div className="space-y-4">
      {/* Action buttons */}
      <div className="flex gap-2 justify-end">
        <Button onClick={handleDownloadPDF} disabled={downloading}>
          {downloading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generuji PDF...
            </>
          ) : (
            <>
              <Download className="w-4 h-4 mr-2" />
              Stáhnout PDF
            </>
          )}
        </Button>
      </div>

      {/* HTML Preview */}
      <Card className="p-8 bg-white">
        <div className="space-y-6 max-w-4xl mx-auto">
          {/* Header */}
          <div className="border-b pb-4 mb-6">
            <h1 className="text-3xl font-bold text-primary mb-2">
              {template.name}
            </h1>
            {analysis.code && (
              <p className="text-lg text-muted-foreground">
                Kód: {analysis.code}
              </p>
            )}
            {analysis.color && (
              <p className="text-lg text-muted-foreground">
                Barva týmu: {analysis.color}
              </p>
            )}
          </div>

          {/* Analysis content */}
          <div className="space-y-8">
            {Object.entries(analysis).map(([key, value]) => {
              // Skip meta fields
              if (
                key === "code" ||
                key === "color" ||
                !value ||
                typeof value !== "string"
              )
                return null;

              // Get label from key
              const getLabel = (k: string) => {
                const labels: Record<string, string> = {
                  role: "Role",
                  faithText: "Průběh hry",
                  strength1_name: "Silná stránka 1 - Název",
                  strength1_text: "Silná stránka 1 - Popis",
                  strength2_name: "Silná stránka 2 - Název",
                  strength2_text: "Silná stránka 2 - Popis",
                  flaw1_name: "Oblast ke zlepšení - Název",
                  flaw1_text: "Oblast ke zlepšení - Popis",
                  teamTips: "Doporučení pro tým",
                };
                return labels[k] || k;
              };

              return (
                <div key={key} className="space-y-2">
                  <h3 className="text-lg font-semibold text-foreground">
                    {getLabel(key)}
                  </h3>
                  <p className="text-base text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {value as string}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Footer note */}
          <div className="mt-12 pt-6 border-t text-sm text-muted-foreground">
            <p>
              Pro získání profesionálního PDF s grafickým designem klikněte na
              tlačítko "Stáhnout PDF" výše.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};
