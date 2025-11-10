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

  // Utility functions
  const convertY = (yTop: number, pageHeight = 867): number => {
    return pageHeight - yTop;
  };

  const wrapText = (
    text: string,
    maxWidth: number,
    font: any,
    fontSize: number
  ): string[] => {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const width = font.widthOfTextAtSize(testLine, fontSize);
      
      if (width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    
    if (currentLine) lines.push(currentLine);
    return lines;
  };

  const fitTextInBox = (
    text: string,
    maxWidth: number,
    maxHeight: number,
    font: any,
    fontSize: number,
    lineHeight: number
  ): string[] => {
    const lines = wrapText(text, maxWidth, font, fontSize);
    const maxLines = Math.floor(maxHeight / lineHeight);
    
    if (lines.length <= maxLines) return lines;
    
    const truncatedLines = lines.slice(0, maxLines);
    const lastLine = truncatedLines[maxLines - 1];
    
    let shortened = lastLine;
    while (font.widthOfTextAtSize(shortened + '...', fontSize) > maxWidth) {
      const words = shortened.split(' ');
      if (words.length <= 1) break;
      words.pop();
      shortened = words.join(' ');
    }
    truncatedLines[maxLines - 1] = shortened + '...';
    
    return truncatedLines;
  };

  const generatePDF = async (): Promise<PDFDocument | null> => {
    setGenerating(true);
    try {
      const pdfDoc = await PDFDocument.create();
      const PAGE_HEIGHT = 867;

      // Load custom fonts
      console.log('Loading fonts...');
      const [readexRegularBytes, khandSemiboldBytes] = await Promise.all([
        fetch('https://fonts.gstatic.com/s/readexpro/v21/SLXnc0jZ4WUJcClHTtv0t7IaDRsBsWRiJCyX8pg.ttf').then(r => r.arrayBuffer()),
        fetch('https://fonts.gstatic.com/s/khand/v17/TwMN-IINQlQQ0bL5cFE3ZwaH__-C.ttf').then(r => r.arrayBuffer())
      ]);

      const fonts = {
        readexRegular: await pdfDoc.embedFont(readexRegularBytes),
        khandSemibold: await pdfDoc.embedFont(khandSemiboldBytes)
      };
      console.log('Fonts loaded');

      // Load background for front page
      if (template.backgroundFrontUrl) {
        try {
          const frontResponse = await fetch(template.backgroundFrontUrl);
          
          if (!frontResponse.ok) {
            throw new Error(`Failed to fetch background: ${frontResponse.statusText}`);
          }
          
          const contentType = frontResponse.headers.get('content-type');
          const frontBytes = await frontResponse.arrayBuffer();
          
          if (contentType?.includes('pdf')) {
            const frontPdf = await PDFDocument.load(frontBytes, { 
              ignoreEncryption: true,
              updateMetadata: false,
              throwOnInvalidObject: false
            });
            const [frontPage] = await pdfDoc.copyPages(frontPdf, [0]);
            pdfDoc.addPage(frontPage);
          } 
          else if (contentType?.includes('image')) {
            let image;
            
            if (contentType.includes('png')) {
              image = await pdfDoc.embedPng(frontBytes);
            } else if (contentType.includes('jpeg') || contentType.includes('jpg')) {
              image = await pdfDoc.embedJpg(frontBytes);
            }
            
            if (image) {
              const page = pdfDoc.addPage([595, 867]);
              page.drawImage(image, {
                x: 0,
                y: 0,
                width: 595,
                height: 867,
              });
            }
          } else {
            console.error('Unsupported background format:', contentType);
            toast({
              title: "Chyba",
              description: "Nepodporovaný formát pozadí",
              variant: "destructive",
            });
            return null;
          }

          // === STRANA 1 - Text overlays ===
          const page1 = pdfDoc.getPage(pdfDoc.getPages().length - 1);

          // 1) Barva hráče - Rect: x=365, y=128, w=160, h=20 (LEFT align)
          const barvaText = (analysis.color || player?.band_color || "neznámá").slice(0, 20);
          page1.drawText(barvaText, {
            x: 365,
            y: convertY(128, PAGE_HEIGHT),
            size: 12,
            font: fonts.readexRegular,
            color: rgb(0, 0, 0)
          });

          // 2) Role - Rect: x=210, y=238, w=175, h=34 (CENTER)
          const roleText = (analysis.role || "").slice(0, 30);
          const roleWidth = fonts.khandSemibold.widthOfTextAtSize(roleText, 24);
          const roleCenterX = 210 + (175 - roleWidth) / 2;
          page1.drawText(roleText, {
            x: roleCenterX,
            y: convertY(238, PAGE_HEIGHT),
            size: 24,
            font: fonts.khandSemibold,
            color: rgb(0, 0, 0)
          });

          // 3) Kód hry - Rect: x=485, y=304, w=90, h=16 (RIGHT align)
          const gameCodeText = (analysis.gameCode || "").slice(0, 15);
          const gameCodeWidth = fonts.readexRegular.widthOfTextAtSize(gameCodeText, 8);
          const gameCodeX = 485 + 90 - gameCodeWidth;
          page1.drawText(gameCodeText, {
            x: gameCodeX,
            y: convertY(304, PAGE_HEIGHT),
            size: 8,
            font: fonts.readexRegular,
            color: rgb(0, 0, 0)
          });

          // 4) Silné stránky - 3 boxy (x=110, y=372/460/548, w=215, h=66)
          const strengthBoxes = [
            { x: 110, y: 372, w: 215, h: 66 },
            { x: 110, y: 460, w: 215, h: 66 },
            { x: 110, y: 548, w: 215, h: 66 }
          ];

          const strengths = (analysis.strengths || []).slice(0, 3);
          strengths.forEach((item: any, idx: number) => {
            const box = strengthBoxes[idx];
            const title = (item.title || "").slice(0, 30);
            const text = (item.text || item.description || "").slice(0, 260);
            
            page1.drawText(title, {
              x: box.x,
              y: convertY(box.y, PAGE_HEIGHT),
              size: 10,
              font: fonts.readexRegular,
              color: rgb(0, 0, 0)
            });
            
            const descLines = fitTextInBox(
              text,
              box.w,
              box.h - 12,
              fonts.readexRegular,
              8,
              10
            );
            
            let yPos = convertY(box.y + 12, PAGE_HEIGHT);
            descLines.forEach(line => {
              page1.drawText(line, {
                x: box.x,
                y: yPos,
                size: 8,
                font: fonts.readexRegular,
                color: rgb(0.2, 0.2, 0.2)
              });
              yPos -= 10;
            });
          });

          // 5) Slabé stránky - 3 boxy (x=388, y=372/460/548, w=215, h=66)
          const weaknessBoxes = [
            { x: 388, y: 372, w: 215, h: 66 },
            { x: 388, y: 460, w: 215, h: 66 },
            { x: 388, y: 548, w: 215, h: 66 }
          ];

          const weaknesses = (analysis.weaknesses || []).slice(0, 3);
          weaknesses.forEach((item: any, idx: number) => {
            const box = weaknessBoxes[idx];
            const title = (item.title || "").slice(0, 30);
            const text = (item.text || item.description || "").slice(0, 260);
            
            page1.drawText(title, {
              x: box.x,
              y: convertY(box.y, PAGE_HEIGHT),
              size: 10,
              font: fonts.readexRegular,
              color: rgb(0, 0, 0)
            });
            
            const descLines = fitTextInBox(
              text,
              box.w,
              box.h - 12,
              fonts.readexRegular,
              8,
              10
            );
            
            let yPos = convertY(box.y + 12, PAGE_HEIGHT);
            descLines.forEach(line => {
              page1.drawText(line, {
                x: box.x,
                y: yPos,
                size: 8,
                font: fonts.readexRegular,
                color: rgb(0.2, 0.2, 0.2)
              });
              yPos -= 10;
            });
          });

          // 6) Dlouhá analýza - Rect: x=60, y=640, w=475, h=120
          const longAnalysisText = (analysis.longAnalysis || analysis.trust || "").slice(0, 1000);
          const longAnalysisLines = fitTextInBox(
            longAnalysisText,
            475,
            120,
            fonts.readexRegular,
            10,
            12
          );

          let longAnalysisYPos = convertY(640, PAGE_HEIGHT);
          longAnalysisLines.forEach(line => {
            page1.drawText(line, {
              x: 60,
              y: longAnalysisYPos,
              size: 10,
              font: fonts.readexRegular,
              color: rgb(0, 0, 0)
            });
            longAnalysisYPos -= 12;
          });

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

      // Load back page
      if (template.backgroundBackUrl) {
        try {
          const backResponse = await fetch(template.backgroundBackUrl);
          
          if (!backResponse.ok) {
            throw new Error(`Failed to fetch background: ${backResponse.statusText}`);
          }
          
          const contentType = backResponse.headers.get('content-type');
          const backBytes = await backResponse.arrayBuffer();
          
          if (contentType?.includes('pdf')) {
            const backPdf = await PDFDocument.load(backBytes, {
              ignoreEncryption: true,
              updateMetadata: false,
              throwOnInvalidObject: false
            });
            const [backPage] = await pdfDoc.copyPages(backPdf, [0]);
            pdfDoc.addPage(backPage);
          }
          else if (contentType?.includes('image')) {
            let image;
            
            if (contentType.includes('png')) {
              image = await pdfDoc.embedPng(backBytes);
            } else if (contentType.includes('jpeg') || contentType.includes('jpg')) {
              image = await pdfDoc.embedJpg(backBytes);
            }
            
            if (image) {
              const page = pdfDoc.addPage([595, 867]);
              page.drawImage(image, {
                x: 0,
                y: 0,
                width: 595,
                height: 867,
              });
            }
          } else {
            console.error('Unsupported background format:', contentType);
            toast({
              title: "Chyba",
              description: "Nepodporovaný formát pozadí zadní strany",
              variant: "destructive",
            });
            return null;
          }

          // === STRANA 2 - Text overlays ===
          const page2 = pdfDoc.getPage(pdfDoc.getPages().length - 1);

          // 7) Predikce osobnostních rysů - 3 sloupce
          // Titulek: x=115/275/435, y=238
          // Text: x=115/275/435, y=258, w=150, h=70
          const traits = (analysis.traits || analysis.personalityTraits || []).slice(0, 3);
          const traitXPositions = [115, 275, 435];
          
          traits.forEach((trait: any, idx: number) => {
            const xPos = traitXPositions[idx];
            const title = (trait.title || "").slice(0, 20);
            const text = (trait.text || trait.description || "").slice(0, 160);
            
            // Titulek
            page2.drawText(title, {
              x: xPos,
              y: convertY(238, PAGE_HEIGHT),
              size: 12,
              font: fonts.khandSemibold,
              color: rgb(0, 0, 0)
            });
            
            // Text
            const descLines = fitTextInBox(
              text,
              150,
              70,
              fonts.readexRegular,
              8,
              10
            );
            
            let yPos = convertY(258, PAGE_HEIGHT);
            descLines.forEach(line => {
              page2.drawText(line, {
                x: xPos,
                y: yPos,
                size: 8,
                font: fonts.readexRegular,
                color: rgb(0.2, 0.2, 0.2)
              });
              yPos -= 10;
            });
          });

          // 8) Doporučení pro spolupráci - Rect: x=110, y=440, w=480, h=80
          const collabText = (analysis.collaborationAdvice || analysis.collaboration || "").slice(0, 450);
          const collabLines = fitTextInBox(
            collabText,
            480,
            80,
            fonts.readexRegular,
            8,
            10
          );

          let collabYPos = convertY(440, PAGE_HEIGHT);
          collabLines.forEach(line => {
            page2.drawText(line, {
              x: 110,
              y: collabYPos,
              size: 8,
              font: fonts.readexRegular,
              color: rgb(0, 0, 0)
            });
            collabYPos -= 10;
          });

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
