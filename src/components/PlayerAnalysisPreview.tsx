import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Printer, Download, Loader2 } from "lucide-react";
import { useState } from "react";

interface PlayerAnalysisPreviewProps {
  playerId: string;
  analysis: any;
  template: {
    name: string;
    accentColor: string;
    fontFamily: string;
    layoutDefinition: any[];
  };
  onPrint?: () => void;
  onDownload?: () => void;
}

export const PlayerAnalysisPreview = ({
  playerId,
  analysis,
  template,
  onPrint,
  onDownload,
}: PlayerAnalysisPreviewProps) => {
  const [printing, setPrinting] = useState(false);

  const handlePrint = () => {
    setPrinting(true);
    setTimeout(() => {
      window.print();
      setPrinting(false);
      onPrint?.();
    }, 100);
  };

  const getAlignmentClass = (align: string) => {
    switch (align) {
      case "center":
        return "text-center";
      case "right":
        return "text-right";
      default:
        return "text-left";
    }
  };

  const renderPage = (pageNum: number) => {
    // Sort blocks by order
    const sortedBlocks = [...template.layoutDefinition].sort(
      (a, b) => a.order - b.order
    );

    // Split blocks into two pages (roughly half on each)
    const midpoint = Math.ceil(sortedBlocks.length / 2);
    const pageBlocks =
      pageNum === 1
        ? sortedBlocks.slice(0, midpoint)
        : sortedBlocks.slice(midpoint);

    return (
      <div
        className="bg-white p-12 shadow-lg min-h-[297mm] w-[210mm] mx-auto"
        style={{
          fontFamily: template.fontFamily,
        }}
      >
        {/* Header with code and color */}
        <div
          className="flex justify-between items-start mb-8 pb-4 border-b-2"
          style={{ borderColor: template.accentColor }}
        >
          <div
            className="text-4xl font-bold"
            style={{ color: template.accentColor }}
          >
            {analysis.code || ""}
          </div>
          {analysis.color && (
            <div
              className="px-6 py-2 rounded-full text-white font-semibold"
              style={{ backgroundColor: template.accentColor }}
            >
              {analysis.color}
            </div>
          )}
        </div>

        {/* Content blocks */}
        <div className="space-y-6">
          {pageBlocks.map((block: any, index: number) => {
            const value = analysis[block.key];
            if (!value) return null;

            return (
              <div key={index} className={getAlignmentClass(block.align)}>
                {block.heading === "L" && (
                  <h1
                    className={`${block.size} font-bold mb-3`}
                    style={{ color: template.accentColor }}
                  >
                    {block.key === "faithText" && "Průběh hry"}
                    {block.key === "flaw1_name" && "Oblast ke zlepšení"}
                    {block.key === "teamTips" && "Doporučení pro tým"}
                  </h1>
                )}
                {block.heading === "M" && block.key !== "role" && (
                  <h2
                    className={`${block.size} font-semibold mb-2`}
                    style={{ color: template.accentColor }}
                  >
                    {block.key === "strength1_text" && "Silná stránka 1"}
                    {block.key === "strength2_text" && "Silná stránka 2"}
                  </h2>
                )}
                <p className={`${block.size} leading-relaxed text-gray-800`}>
                  {value}
                </p>
              </div>
            );
          })}
        </div>

        {/* Page number */}
        <div className="absolute bottom-8 right-12 text-gray-400 text-sm">
          Strana {pageNum} / 2
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Action buttons */}
      <div className="flex gap-2 justify-end print:hidden">
        <Button onClick={handlePrint} disabled={printing}>
          {printing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Připravuji tisk...
            </>
          ) : (
            <>
              <Printer className="w-4 h-4 mr-2" />
              Tisk
            </>
          )}
        </Button>
        {onDownload && (
          <Button variant="secondary" onClick={onDownload}>
            <Download className="w-4 h-4 mr-2" />
            Stáhnout PDF
          </Button>
        )}
      </div>

      {/* Preview pages */}
      <div className="space-y-8 print:space-y-0">
        {renderPage(1)}
        <div className="print:page-break-before-always">
          {renderPage(2)}
        </div>
      </div>

      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:space-y-0,
          .print\\:space-y-0 * {
            visibility: visible;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:page-break-before-always {
            page-break-before: always;
          }
          @page {
            size: A4;
            margin: 0;
          }
        }
      `}</style>
    </div>
  );
};
