import { Button } from "@/components/ui/button";
import { Printer, Download } from "lucide-react";
import { useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { getPdfTemplate } from "@/components/pdf-templates";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

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

  const generatePDF = async (): Promise<jsPDF | null> => {
    if (!pdfContainerRef.current) return null;

    setGenerating(true);
    try {
      // Wait for all images to load
      const images = pdfContainerRef.current.querySelectorAll('img');
      await Promise.all(
        Array.from(images).map(img => {
          if (img.complete) return Promise.resolve();
          return new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
          });
        })
      );

      // Get all pages
      const pages = pdfContainerRef.current.querySelectorAll('.pdf-page');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: false,
      });

      for (let i = 0; i < pages.length; i++) {
        const page = pages[i] as HTMLElement;
        
        // Capture at high resolution (3x for ~300 DPI)
        const canvas = await html2canvas(page, {
          scale: 3,
          useCORS: true,
          allowTaint: false,
          backgroundColor: '#ffffff',
          logging: false,
          windowWidth: page.scrollWidth,
          windowHeight: page.scrollHeight,
        });

        const imgData = canvas.toDataURL('image/jpeg', 1.0);
        
        if (i > 0) {
          pdf.addPage();
        }
        
        // A4 dimensions: 210mm x 297mm
        pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
      }

      return pdf;
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

    const pdf = await generatePDF();
    if (pdf) {
      const gameCode = analysis.gameCode || 'session';
      const playerCode = analysis.code || player?.band_color || 'player';
      const filename = `analyza_${gameCode}_${playerCode}.pdf`;
      pdf.save(filename);
      
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

    const pdf = await generatePDF();
    if (pdf) {
      // Open PDF in new tab for printing
      const pdfBlob = pdf.output('blob');
      const pdfUrl = URL.createObjectURL(pdfBlob);
      const printWindow = window.open(pdfUrl);
      
      if (printWindow) {
        printWindow.addEventListener('load', () => {
          printWindow.print();
        });
      }
      
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
