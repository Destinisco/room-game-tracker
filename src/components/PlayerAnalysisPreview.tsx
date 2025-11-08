import { Button } from "@/components/ui/button";
import { Printer, Download } from "lucide-react";
import { useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { getPdfTemplate } from "@/components/pdf-templates";
import { PDFDocument, rgb } from "pdf-lib";

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
  const [generating, setGenerating] = useState(false);
  const pdfContainerRef = useRef<HTMLDivElement>(null);

  const TemplateComponent = getPdfTemplate(template.pdfTemplateComponent);

  const generatePDF = async (): Promise<PDFDocument | null> => {
    setGenerating(true);
    try {
      const pdfDoc = await PDFDocument.create();

      // Load background PDFs if available
      if (template.backgroundFrontUrl) {
        const frontResponse = await fetch(template.backgroundFrontUrl);
        const frontBytes = await frontResponse.arrayBuffer();
        const frontPdf = await PDFDocument.load(frontBytes);
        const [frontPage] = await pdfDoc.copyPages(frontPdf, [0]);
        pdfDoc.addPage(frontPage);

        // Add text overlays for front page
        const page = pdfDoc.getPage(0);
        const { width, height } = page.getSize();
        
        // Convert mm to points (1mm = 2.83465 points)
        const mmToPoints = (mm: number) => mm * 2.83465;
        
        // Add color (25mm from top, centered)
        const color = analysis.color || player?.band_color || "neznámá";
        page.drawText(color, {
          x: width / 2 - (color.length * 3),
          y: height - mmToPoints(25),
          size: 10,
          color: rgb(0, 0, 0),
        });

        // Add role (60mm from top, centered)
        const role = analysis.role || "Neznámá role";
        page.drawText(role, {
          x: width / 2 - (role.length * 4),
          y: height - mmToPoints(60),
          size: 14,
          color: rgb(0, 0, 0),
        });

        // Add game code (85mm from top, centered)
        const gameCode = analysis.gameCode || "N/A";
        page.drawText(gameCode, {
          x: width / 2 - (gameCode.length * 2),
          y: height - mmToPoints(85),
          size: 8,
          color: rgb(0, 0, 0),
        });

        // Add strengths (left column, starting at 110mm)
        const strengths = analysis.strengths || [];
        let yPos = height - mmToPoints(110);
        strengths.slice(0, 3).forEach((item: any, idx: number) => {
          const text = item.description || "";
          page.drawText(text, {
            x: mmToPoints(20),
            y: yPos,
            size: 8,
            color: rgb(0.3, 0.3, 0.3),
            maxWidth: mmToPoints(80),
          });
          yPos -= mmToPoints(15);
        });

        // Add weaknesses (right column, starting at 110mm)
        const weaknesses = analysis.weaknesses || [];
        yPos = height - mmToPoints(110);
        weaknesses.slice(0, 3).forEach((item: any, idx: number) => {
          const text = item.description || "";
          page.drawText(text, {
            x: mmToPoints(115),
            y: yPos,
            size: 8,
            color: rgb(0.3, 0.3, 0.3),
            maxWidth: mmToPoints(80),
          });
          yPos -= mmToPoints(15);
        });

        // Add trust section
        const trust = analysis.trust || "";
        page.drawText(trust, {
          x: width / 2 - mmToPoints(75),
          y: height - mmToPoints(180),
          size: 8,
          color: rgb(0.3, 0.3, 0.3),
          maxWidth: mmToPoints(150),
        });
      }

      // Load back page if available
      if (template.backgroundBackUrl) {
        const backResponse = await fetch(template.backgroundBackUrl);
        const backBytes = await backResponse.arrayBuffer();
        const backPdf = await PDFDocument.load(backBytes);
        const [backPage] = await pdfDoc.copyPages(backPdf, [0]);
        pdfDoc.addPage(backPage);

        // Add text overlays for back page
        const page = pdfDoc.getPage(1);
        const { width, height } = page.getSize();
        const mmToPoints = (mm: number) => mm * 2.83465;

        // Add personality traits (3 columns, starting at 50mm)
        const personalityTraits = analysis.personalityTraits || [];
        const colWidth = width / 3;
        personalityTraits.slice(0, 3).forEach((trait: any, idx: number) => {
          const text = trait.description || "";
          page.drawText(text, {
            x: colWidth * idx + mmToPoints(10),
            y: height - mmToPoints(60),
            size: 8,
            color: rgb(0.3, 0.3, 0.3),
            maxWidth: colWidth - mmToPoints(20),
          });
        });

        // Add collaboration section
        const collaboration = analysis.collaboration || "";
        page.drawText(collaboration, {
          x: width / 2 - mmToPoints(65),
          y: height - mmToPoints(120),
          size: 8,
          color: rgb(0.3, 0.3, 0.3),
          maxWidth: mmToPoints(130),
        });
      }

      return pdfDoc;
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se vytvořit PDF, zkuste znovu",
        variant: "destructive",
      });
      return null;
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async () => {
    toast({
      title: "Generování PDF",
      description: "Vytváření PDF souboru...",
    });

    const pdfDoc = await generatePDF();
    if (pdfDoc) {
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      const gameCode = analysis.gameCode || 'session';
      const playerCode = analysis.code || player?.band_color || 'player';
      const filename = `analyza_${gameCode}_${playerCode}.pdf`;
      
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      
      URL.revokeObjectURL(url);
      
      toast({
        title: "Hotovo",
        description: "PDF bylo úspěšně staženo",
      });
    }
  };

  const handlePrint = async () => {
    toast({
      title: "Příprava tisku",
      description: "Generování PDF pro tisk...",
    });

    const pdfDoc = await generatePDF();
    if (pdfDoc) {
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
      
      // Use data URL instead of blob URL to avoid Chrome blocking
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const printWindow = window.open('', '_blank');
        
        if (printWindow) {
          printWindow.document.write(`
            <html>
              <head>
                <title>Tisk analýzy</title>
              </head>
              <body style="margin: 0;">
                <iframe src="${dataUrl}" style="border: none; width: 100%; height: 100vh;" onload="this.contentWindow.print()"></iframe>
              </body>
            </html>
          `);
          printWindow.document.close();
        }
      };
      reader.readAsDataURL(blob);
      
      toast({
        title: "Připraveno k tisku",
        description: "PDF bylo otevřeno v nové záložce",
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Debug: Data structure */}
      <div className="no-print bg-yellow-50 p-4 mb-4 rounded">
        <details>
          <summary className="cursor-pointer font-semibold">Debug: Struktura analýzy</summary>
          <pre className="text-xs mt-2 overflow-auto">{JSON.stringify(analysis, null, 2)}</pre>
        </details>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 justify-end no-print">
        <Button onClick={handleDownload} disabled={generating} variant="outline">
          {generating ? (
            <>
              <Download className="w-4 h-4 mr-2 animate-spin" />
              Generuji...
            </>
          ) : (
            <>
              <Download className="w-4 h-4 mr-2" />
              Stáhnout PDF
            </>
          )}
        </Button>
        <Button onClick={handlePrint} disabled={generating}>
          {generating ? (
            <>
              <Printer className="w-4 h-4 mr-2 animate-spin" />
              Generuji...
            </>
          ) : (
            <>
              <Printer className="w-4 h-4 mr-2" />
              Vytisknout
            </>
          )}
        </Button>
      </div>

      {/* PDF Template */}
      <div className="pdf-container" ref={pdfContainerRef}>
        <TemplateComponent 
          analysis={analysis}
          player={player || {}}
          template={template}
        />
      </div>

      <style>{`
        @media print {
          /* Hide everything by default */
          body * {
            visibility: hidden;
          }
          
          /* Show only PDF container */
          .pdf-container,
          .pdf-container * {
            visibility: visible;
          }
          
          .pdf-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          
          /* Hide action buttons and debug */
          .no-print {
            display: none !important;
          }
          
          /* Page breaks */
          .pdf-page {
            page-break-after: always;
          }
        }
      `}</style>
    </div>
  );
};
