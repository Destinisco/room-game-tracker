import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { getPdfTemplate } from "@/components/pdf-templates";

interface PlayerAnalysisPreviewProps {
  playerId: string;
  analysis: any;
  template: {
    name: string;
    backgroundFrontUrl: string | null;
    backgroundBackUrl: string | null;
    version: number;
    pdfTemplateComponent: string;
  };
  player?: any;
}

export const PlayerAnalysisPreview = ({
  playerId,
  analysis,
  template,
  player,
}: PlayerAnalysisPreviewProps) => {
  const { toast } = useToast();
  const [printing, setPrinting] = useState(false);

  const TemplateComponent = getPdfTemplate(template.pdfTemplateComponent);

  const handlePrint = () => {
    setPrinting(true);
    toast({
      title: "Příprava tisku",
      description: "V novém okně můžete dokument vytisknout nebo uložit jako PDF",
    });
    setTimeout(() => {
      window.print();
      setPrinting(false);
    }, 500);
  };

  return (
    <div className="space-y-4">
      {/* Action buttons */}
      <div className="flex gap-2 justify-end no-print">
        <Button onClick={handlePrint} disabled={printing}>
          {printing ? (
            <>
              <Printer className="w-4 h-4 mr-2 animate-spin" />
              Připravuji...
            </>
          ) : (
            <>
              <Printer className="w-4 h-4 mr-2" />
              Vytisknout / Uložit PDF
            </>
          )}
        </Button>
      </div>

      {/* PDF Template */}
      <TemplateComponent 
        analysis={analysis}
        player={player || {}}
        template={template}
      />

      <style>{`
        @media print {
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};
