import { PdfTemplateProps } from "./types";

export const DuvěraTemplate = ({ analysis, player, template }: PdfTemplateProps) => {
  // Parse data with fallbacks for old format
  const strengths = analysis.strengths || 
    ((analysis as any).features || []).slice(0, 3).map((f: string) => ({
      title: "Silná stránka",
      description: f
    }));

  const weaknesses = analysis.weaknesses || 
    ((analysis as any).flaws || []).slice(0, 3).map((f: string) => ({
      title: "Oblast k rozvoji",
      description: f
    }));

  const trust = analysis.trust || (analysis as any).recommendations || "Informace o důvěře nejsou k dispozici.";
  
  const personalityTraits = analysis.personalityTraits || 
    ((analysis as any).behavior_insights || []).slice(0, 3).map((insight: string) => ({
      title: "Osobnostní rys",
      description: insight
    }));

  const collaboration = analysis.collaboration || (analysis as any).team_dynamics || "Informace o spolupráci nejsou k dispozici.";
  
  const role = analysis.role || "Neznámá role";
  const code = analysis.code || "N/A";
  const color = analysis.color || player.band_color || "neznámá";
  const gameCode = analysis.gameCode || "N/A";

  return (
    <div className="pdf-container">
      {/* Front Page */}
      <div 
        className="pdf-page page-front relative" 
        style={{
          width: '210mm',
          height: '297mm',
          padding: '0',
          pageBreakAfter: 'always',
          backgroundColor: '#ffffff',
          fontFamily: "'Readex Pro', sans-serif",
          overflow: 'hidden',
        }}
      >
        {/* Background - support both PDF and images */}
        {template.backgroundFrontUrl && (
          template.backgroundFrontUrl.toLowerCase().endsWith('.pdf') ? (
            <object 
              type="application/pdf" 
              data={template.backgroundFrontUrl}
              className="absolute inset-0 pointer-events-none"
              style={{ width: '210mm', height: '297mm' }}
            >
              <embed 
                src={template.backgroundFrontUrl}
                type="application/pdf"
                style={{ width: '210mm', height: '297mm' }}
              />
            </object>
          ) : (
            <img 
              src={template.backgroundFrontUrl}
              alt="Background"
              className="absolute inset-0 w-full h-full pointer-events-none"
              style={{ 
                width: '210mm', 
                height: '297mm',
                objectFit: 'fill',
                imageRendering: '-webkit-optimize-contrast'
              }}
              crossOrigin="anonymous"
            />
          )
        )}
        
        <div className="relative z-10 h-full flex flex-col" style={{ height: '297mm', padding: '15mm' }}>
          {/* Dynamic data positioned absolutely for background graphics */}
          <div style={{ position: 'absolute', top: '25mm', left: '50%', transform: 'translateX(-50%)', textAlign: 'center' }}>
            <p className="text-sm font-semibold">{color}</p>
          </div>
          
          {role && (
            <div style={{ position: 'absolute', top: '60mm', left: '50%', transform: 'translateX(-50%)', textAlign: 'center' }}>
              <p className="text-lg font-bold">{role}</p>
            </div>
          )}
          
          <div style={{ position: 'absolute', top: '85mm', left: '50%', transform: 'translateX(-50%)', textAlign: 'center' }}>
            <p className="text-xs">{gameCode}</p>
          </div>

          {/* Strengths & Weaknesses Section */}
          <div className="grid grid-cols-2 gap-8" style={{ marginTop: '110mm', paddingBottom: '20px' }}>
            {/* Strengths */}
            <div>
              <div className="space-y-3">
                {strengths.slice(0, 3).map((item, idx) => (
                  <div key={idx}>
                    <p className="text-xs text-gray-700 leading-snug">
                      {item.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Weaknesses */}
            <div>
              <div className="space-y-3">
                {weaknesses.slice(0, 3).map((item, idx) => (
                  <div key={idx}>
                    <p className="text-xs text-gray-700 leading-snug">
                      {item.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Trust Section */}
          <div className="flex flex-col justify-center items-center" style={{ marginTop: '20px' }}>
            <p className="text-xs text-gray-700 leading-relaxed text-justify max-w-[85%]">
              {trust}
            </p>
          </div>
        </div>
      </div>

      {/* Back Page */}
      <div 
        className="pdf-page page-back relative" 
        style={{
          width: '210mm',
          height: '297mm',
          padding: '0',
          backgroundColor: '#ffffff',
          fontFamily: "'Readex Pro', sans-serif",
          overflow: 'hidden',
        }}
      >
        {/* Background - support both PDF and images */}
        {template.backgroundBackUrl && (
          template.backgroundBackUrl.toLowerCase().endsWith('.pdf') ? (
            <object 
              type="application/pdf" 
              data={template.backgroundBackUrl}
              className="absolute inset-0 pointer-events-none"
              style={{ width: '210mm', height: '297mm' }}
            >
              <embed 
                src={template.backgroundBackUrl}
                type="application/pdf"
                style={{ width: '210mm', height: '297mm' }}
              />
            </object>
          ) : (
            <img 
              src={template.backgroundBackUrl}
              alt="Background"
              className="absolute inset-0 w-full h-full pointer-events-none"
              style={{ 
                width: '210mm', 
                height: '297mm',
                objectFit: 'fill',
                imageRendering: '-webkit-optimize-contrast'
              }}
              crossOrigin="anonymous"
            />
          )
        )}
        
        <div className="relative z-10 h-full flex flex-col" style={{ height: '297mm', padding: '15mm' }}>
          {/* Personality Traits Section */}
          <div className="flex flex-col justify-center" style={{ minHeight: '33.33%', paddingTop: '50mm' }}>
            <div className="grid grid-cols-3 gap-6">
              {personalityTraits.slice(0, 3).map((trait, idx) => (
                <div key={idx} className="text-center flex flex-col justify-center items-center">
                  <p className="text-sm font-semibold mb-2">
                    {trait.title}
                  </p>
                  <p className="text-xs text-gray-700 leading-snug">
                    {trait.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Collaboration Section */}
          <div className="flex flex-col justify-center items-center" style={{ minHeight: '33.33%', paddingTop: '20px' }}>
            <p className="text-xs text-gray-700 leading-relaxed text-justify max-w-[75%]">
              {collaboration}
            </p>
          </div>
        </div>
      </div>

      {/* Print-specific CSS */}
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 0;
          }
          .pdf-page {
            page-break-after: always;
            margin: 0;
            box-shadow: none !important;
          }
          .pdf-container {
            margin: 0;
            padding: 0;
          }
          .no-print {
            display: none !important;
          }
          img {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
        @media screen {
          .pdf-page {
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            margin-bottom: 20px;
          }
          img {
            image-rendering: -webkit-optimize-contrast;
            image-rendering: crisp-edges;
          }
        }
      `}</style>
    </div>
  );
};
