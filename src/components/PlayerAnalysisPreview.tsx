import { Button } from "@/components/ui/button";
import { Printer, Download, Settings } from "lucide-react";
import { useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { getPdfTemplate } from "@/components/pdf-templates";
import { PDFDocument, rgb, PDFFont } from "pdf-lib";
import layoutConfig from "@/config/layout.json";
import {
  smartTrim,
  fitTextInBox,
  getCenteredX,
  getRightAlignedX,
} from "@/utils/pdfTextUtils";
import { LayoutEditor } from "./LayoutEditor";

interface PlayerAnalysisPreviewProps {
  playerId: string;
  analysis: any;
  template: {
    name: string;
    backgroundFrontUrl: string | null;
    backgroundBackUrl: string | null;
    layout_config?: any;
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
  const [layoutMode, setLayoutMode] = useState(false);
  const pdfContainerRef = useRef<HTMLDivElement>(null);

  const TemplateComponent = getPdfTemplate(template.pdfTemplateComponent);

  type Fonts = {
    readexRegular: PDFFont;
    khandSemibold: PDFFont;
  };

  const generatePDF = async (): Promise<PDFDocument | null> => {
    setGenerating(true);
    try {
      // Use room-specific layout config if available, otherwise fall back to default
      const activeLayoutConfig = template.layout_config || layoutConfig;
      const pdfDoc = await PDFDocument.create();
      const { w: PAGE_WIDTH, h: PAGE_HEIGHT } = activeLayoutConfig.pageSize;

      // Load custom fonts
      console.log('Loading fonts...');
      const [readexRegularBytes, khandSemiboldBytes] = await Promise.all([
        fetch('https://fonts.gstatic.com/s/readexpro/v21/SLXnc0jZ4WUJcClHTtv0t7IaDRsBsWRiJCyX8pg.ttf').then(r => r.arrayBuffer()),
        fetch('https://fonts.gstatic.com/s/khand/v17/TwMN-IINQlQQ0bL5cFE3ZwaH__-C.ttf').then(r => r.arrayBuffer())
      ]);

      const fonts: Fonts = {
        readexRegular: await pdfDoc.embedFont(readexRegularBytes),
        khandSemibold: await pdfDoc.embedFont(khandSemiboldBytes)
      };
      console.log('Fonts loaded');

      // Load Page 1 template as vector PDF
      if (template.backgroundFrontUrl) {
        try {
          const frontResponse = await fetch(template.backgroundFrontUrl);
          
          if (!frontResponse.ok) {
            throw new Error(`Failed to fetch front template: ${frontResponse.statusText}`);
          }
          
          const contentType = frontResponse.headers.get('content-type');
          const frontBytes = await frontResponse.arrayBuffer();
          
          let page1;
          
          if (contentType?.includes('pdf')) {
            // Load template PDF and copy page (BEST QUALITY - vector)
            const frontPdf = await PDFDocument.load(frontBytes, { 
              ignoreEncryption: true,
              updateMetadata: false,
              throwOnInvalidObject: false
            });
            const [frontPage] = await pdfDoc.copyPages(frontPdf, [0]);
            pdfDoc.addPage(frontPage);
            page1 = pdfDoc.getPage(pdfDoc.getPages().length - 1);
          } else {
            // FALLBACK: PNG/image template (LOWER QUALITY - rasterized)
            console.warn('⚠️ Front template is not PDF (got:', contentType, ') - using PNG fallback. Quality will be lower.');
            console.warn('⚠️ For best quality, replace with PDF template in database.');
            
            toast({
              title: "Varování",
              description: "Šablona není ve formátu PDF - kvalita může být nižší",
              variant: "default",
            });
            
            // Create blank page and embed PNG
            page1 = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
            const image = await pdfDoc.embedPng(frontBytes);
            const imgDims = image.scale(1);
            
            page1.drawImage(image, {
              x: 0,
              y: 0,
              width: PAGE_WIDTH,
              height: PAGE_HEIGHT,
            });
          }

          // === PAGE 1 - Text overlays using layout config ===
          const layout1 = activeLayoutConfig.page1;

          // 1) Player Color
          const colorConfig = layout1.color;
          const colorText = smartTrim(
            analysis.color || player?.band_color || "neznámá",
            colorConfig.maxChars
          );
          const colorFont = fonts.readexRegular;
          const colorX = colorConfig.align === 'center' 
            ? getCenteredX(colorText, colorFont, colorConfig.size, colorConfig.box.x, colorConfig.box.w)
            : colorConfig.box.x;
          
          page1.drawText(colorText, {
            x: colorX,
            y: colorConfig.box.y,
            size: colorConfig.size,
            font: colorFont,
            color: rgb(0, 0, 0)
          });

          // 2) Role
          const roleConfig = layout1.role;
          const roleText = smartTrim(analysis.role || "", roleConfig.maxChars);
          const roleFont = fonts.khandSemibold;
          const roleX = roleConfig.align === 'center'
            ? getCenteredX(roleText, roleFont, roleConfig.size, roleConfig.box.x, roleConfig.box.w)
            : roleConfig.box.x;
          
          page1.drawText(roleText, {
            x: roleX,
            y: roleConfig.box.y,
            size: roleConfig.size,
            font: roleFont,
            color: rgb(0, 0, 0)
          });

          // 3) Game Code
          const gameCodeConfig = layout1.gameCode;
          const gameCodeText = smartTrim(analysis.gameCode || "", gameCodeConfig.maxChars);
          const gameCodeFont = fonts.readexRegular;
          const gameCodeX = gameCodeConfig.align === 'right'
            ? getRightAlignedX(gameCodeText, gameCodeFont, gameCodeConfig.size, gameCodeConfig.box.x, gameCodeConfig.box.w)
            : gameCodeConfig.box.x;
          
          page1.drawText(gameCodeText, {
            x: gameCodeX,
            y: gameCodeConfig.box.y,
            size: gameCodeConfig.size,
            font: gameCodeFont,
            color: rgb(0, 0, 0)
          });

          // 4) Strengths - 3 boxes
          const strengths = (analysis.strengths || []).slice(0, 3);
          strengths.forEach((item: any, idx: number) => {
            const config = layout1.strengths[idx];
            if (!config) return;

            const title = smartTrim(item.title || "", 30);
            const bodyText = smartTrim(item.text || item.description || "", config.body.maxChars);
            
            // Draw title
            if (title) {
              page1.drawText(title, {
                x: config.title.x,
                y: config.title.y,
                size: config.title.size,
                font: fonts.readexRegular,
                color: rgb(0, 0, 0)
              });
            }
            
            // Draw body (wrapped)
            if (bodyText) {
              const bodyLines = fitTextInBox(
                bodyText,
                fonts.readexRegular,
                config.body.size,
                config.body.w,
                60, // Approximate height
                10  // Line height
              );
              
              let yPos = config.body.y;
              bodyLines.forEach(line => {
                if (line) {
                  page1.drawText(line, {
                    x: config.body.x,
                    y: yPos,
                    size: config.body.size,
                    font: fonts.readexRegular,
                    color: rgb(0.2, 0.2, 0.2)
                  });
                  yPos -= 10;
                }
              });
            }
          });

          // 5) Weaknesses - 3 boxes
          const weaknesses = (analysis.weaknesses || []).slice(0, 3);
          weaknesses.forEach((item: any, idx: number) => {
            const config = layout1.weaknesses[idx];
            if (!config) return;

            const title = smartTrim(item.title || "", 30);
            const bodyText = smartTrim(item.text || item.description || "", config.body.maxChars);
            
            // Draw title
            if (title) {
              page1.drawText(title, {
                x: config.title.x,
                y: config.title.y,
                size: config.title.size,
                font: fonts.readexRegular,
                color: rgb(0, 0, 0)
              });
            }
            
            // Draw body (wrapped)
            if (bodyText) {
              const bodyLines = fitTextInBox(
                bodyText,
                fonts.readexRegular,
                config.body.size,
                config.body.w,
                60,
                10
              );
              
              let yPos = config.body.y;
              bodyLines.forEach(line => {
                if (line) {
                  page1.drawText(line, {
                    x: config.body.x,
                    y: yPos,
                    size: config.body.size,
                    font: fonts.readexRegular,
                    color: rgb(0.2, 0.2, 0.2)
                  });
                  yPos -= 10;
                }
              });
            }
          });

          // 6) Long Analysis
          const longAnalysisConfig = layout1.longAnalysis;
          const longAnalysisText = smartTrim(
            analysis.longAnalysis || analysis.trust || "",
            longAnalysisConfig.maxChars
          );
          
          if (longAnalysisText) {
            const longAnalysisLines = fitTextInBox(
              longAnalysisText,
              fonts.readexRegular,
              longAnalysisConfig.size,
              longAnalysisConfig.w,
              longAnalysisConfig.h,
              12
            );

            let yPos = longAnalysisConfig.y;
            longAnalysisLines.forEach(line => {
              if (line) {
                page1.drawText(line, {
                  x: longAnalysisConfig.x,
                  y: yPos,
                  size: longAnalysisConfig.size,
                  font: fonts.readexRegular,
                  color: rgb(0, 0, 0)
                });
                yPos -= 12;
              }
            });
          }

        } catch (error) {
          console.error('Error loading front background:', error);
          toast({
            title: "Chyba",
            description: "Nepodařilo se načíst pozadí přední strany",
            variant: "destructive",
          });
          return null;
        }
      }

      // Load Page 2 template as vector PDF
      if (template.backgroundBackUrl) {
        try {
          const backResponse = await fetch(template.backgroundBackUrl);
          
          if (!backResponse.ok) {
            throw new Error(`Failed to fetch back template: ${backResponse.statusText}`);
          }
          
          const contentType = backResponse.headers.get('content-type');
          const backBytes = await backResponse.arrayBuffer();
          
          let page2;
          
          if (contentType?.includes('pdf')) {
            // Load template PDF and copy page (BEST QUALITY - vector)
            const backPdf = await PDFDocument.load(backBytes, {
              ignoreEncryption: true,
              updateMetadata: false,
              throwOnInvalidObject: false
            });
            const [backPage] = await pdfDoc.copyPages(backPdf, [0]);
            pdfDoc.addPage(backPage);
            page2 = pdfDoc.getPage(pdfDoc.getPages().length - 1);
          } else {
            // FALLBACK: PNG/image template (LOWER QUALITY - rasterized)
            console.warn('⚠️ Back template is not PDF (got:', contentType, ') - using PNG fallback. Quality will be lower.');
            console.warn('⚠️ For best quality, replace with PDF template in database.');
            
            // Create blank page and embed PNG
            page2 = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
            const image = await pdfDoc.embedPng(backBytes);
            
            page2.drawImage(image, {
              x: 0,
              y: 0,
              width: PAGE_WIDTH,
              height: PAGE_HEIGHT,
            });
          }

          // === PAGE 2 - Text overlays using layout config ===
          const layout2 = activeLayoutConfig.page2;

          // 7) Personality Traits - 3 columns
          const traits = (analysis.traits || analysis.personalityTraits || []).slice(0, 3);
          
          traits.forEach((trait: any, idx: number) => {
            const config = layout2.traits[idx];
            if (!config) return;

            const title = smartTrim(trait.title || "", config.title.maxChars);
            const bodyText = smartTrim(trait.text || trait.description || "", config.body.maxChars);
            
            // Draw title
            if (title) {
              page2.drawText(title, {
                x: config.title.x,
                y: config.title.y,
                size: config.title.size,
                font: fonts.khandSemibold,
                color: rgb(0, 0, 0)
              });
            }
            
            // Draw body (wrapped)
            if (bodyText) {
              const bodyLines = fitTextInBox(
                bodyText,
                fonts.readexRegular,
                config.body.size,
                config.body.w,
                70,
                10
              );
              
              let yPos = config.body.y;
              bodyLines.forEach(line => {
                if (line) {
                  page2.drawText(line, {
                    x: config.body.x,
                    y: yPos,
                    size: config.body.size,
                    font: fonts.readexRegular,
                    color: rgb(0.2, 0.2, 0.2)
                  });
                  yPos -= 10;
                }
              });
            }
          });

          // 8) Collaboration Advice
          const collabConfig = layout2.collaboration;
          const collabText = smartTrim(
            analysis.collaborationAdvice || analysis.collaboration || "",
            collabConfig.maxChars
          );
          
          if (collabText) {
            const collabLines = fitTextInBox(
              collabText,
              fonts.readexRegular,
              collabConfig.size,
              collabConfig.w,
              collabConfig.h,
              10
            );

            let yPos = collabConfig.y;
            collabLines.forEach(line => {
              if (line) {
                page2.drawText(line, {
                  x: collabConfig.x,
                  y: yPos,
                  size: collabConfig.size,
                  font: fonts.readexRegular,
                  color: rgb(0, 0, 0)
                });
                yPos -= 10;
              }
            });
          }

        } catch (error) {
          console.error('Error loading back background:', error);
          toast({
            title: "Chyba",
            description: "Nepodařilo se načíst pozadí zadní strany",
            variant: "destructive",
          });
          return null;
        }
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
        <Button onClick={() => setLayoutMode(true)} variant="secondary">
          <Settings className="w-4 h-4 mr-2" />
          Layout Mode
        </Button>
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

      {/* Layout Editor Modal */}
      {layoutMode && (
        <LayoutEditor
          onClose={() => setLayoutMode(false)}
          backgroundFrontUrl={template.backgroundFrontUrl}
          backgroundBackUrl={template.backgroundBackUrl}
        />
      )}

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
