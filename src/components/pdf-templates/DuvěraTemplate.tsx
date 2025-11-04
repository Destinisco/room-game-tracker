import { PdfTemplateProps } from "./types";

export const DuvěraTemplate = ({ analysis, player, template }: PdfTemplateProps) => {
  return (
    <div className="pdf-container">
      {/* Strana 1 - Přední strana */}
      <div 
        className="pdf-page page-front" 
        style={{
          backgroundImage: template.backgroundFrontUrl 
            ? `url(${template.backgroundFrontUrl})` 
            : 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.8) 100%)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          width: '210mm',
          height: '297mm',
          padding: '20mm',
          pageBreakAfter: 'always',
          position: 'relative',
          color: 'hsl(var(--foreground))',
        }}
      >
        <div className="content-overlay" style={{ position: 'relative', zIndex: 1 }}>
          {/* Hlavička */}
          <div className="mb-8">
            <h1 className="text-5xl font-bold mb-2">{analysis.code || 'Kód hráče'}</h1>
            {analysis.color && (
              <p className="text-xl opacity-90">Barva týmu: {analysis.color}</p>
            )}
          </div>

          <div className="space-y-8">
            {/* Role */}
            {analysis.role && (
              <section className="bg-background/80 p-6 rounded-lg">
                <h2 className="text-2xl font-semibold mb-3 text-primary">Role</h2>
                <p className="text-lg leading-relaxed">{analysis.role}</p>
              </section>
            )}

            {/* Průběh hry */}
            {analysis.faithText && (
              <section className="bg-background/80 p-6 rounded-lg">
                <h2 className="text-2xl font-semibold mb-3 text-primary">Průběh hry</h2>
                <p className="leading-relaxed whitespace-pre-wrap">{analysis.faithText}</p>
              </section>
            )}

            {/* Silná stránka 1 */}
            {analysis.strength1_name && (
              <section className="bg-background/80 p-6 rounded-lg">
                <h2 className="text-2xl font-semibold mb-3 text-primary">
                  {analysis.strength1_name}
                </h2>
                <p className="leading-relaxed whitespace-pre-wrap">{analysis.strength1_text}</p>
              </section>
            )}

            {/* Silná stránka 2 */}
            {analysis.strength2_name && (
              <section className="bg-background/80 p-6 rounded-lg">
                <h2 className="text-2xl font-semibold mb-3 text-primary">
                  {analysis.strength2_name}
                </h2>
                <p className="leading-relaxed whitespace-pre-wrap">{analysis.strength2_text}</p>
              </section>
            )}
          </div>
        </div>
      </div>

      {/* Strana 2 - Zadní strana */}
      <div 
        className="pdf-page page-back" 
        style={{
          backgroundImage: template.backgroundBackUrl 
            ? `url(${template.backgroundBackUrl})` 
            : 'linear-gradient(135deg, hsl(var(--secondary)) 0%, hsl(var(--secondary) / 0.8) 100%)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          width: '210mm',
          height: '297mm',
          padding: '20mm',
          position: 'relative',
          color: 'hsl(var(--foreground))',
        }}
      >
        <div className="content-overlay" style={{ position: 'relative', zIndex: 1 }}>
          <div className="space-y-8">
            {/* Oblast ke zlepšení */}
            {analysis.flaw1_name && (
              <section className="bg-background/80 p-6 rounded-lg">
                <h2 className="text-2xl font-semibold mb-3 text-primary">
                  {analysis.flaw1_name}
                </h2>
                <p className="leading-relaxed whitespace-pre-wrap">{analysis.flaw1_text}</p>
              </section>
            )}

            {/* Doporučení pro tým */}
            {analysis.teamTips && (
              <section className="bg-background/80 p-6 rounded-lg">
                <h2 className="text-2xl font-semibold mb-3 text-primary">
                  Doporučení pro tým
                </h2>
                <p className="leading-relaxed whitespace-pre-wrap">{analysis.teamTips}</p>
              </section>
            )}
          </div>

          {/* Patička */}
          <footer className="absolute bottom-8 left-8 right-8 pt-6 border-t border-foreground/20 text-sm opacity-75">
            <div className="flex justify-between items-center">
              <div>
                <p>Generováno: {new Date().toLocaleDateString('cs-CZ')}</p>
                <p>Šablona: {template.name} (v{template.version})</p>
              </div>
              {player.first_name && player.last_name && (
                <p>{player.first_name} {player.last_name}</p>
              )}
            </div>
          </footer>
        </div>
      </div>

      {/* Print-specific CSS */}
      <style>{`
        @media print {
          .pdf-page {
            page-break-after: always;
            margin: 0;
            box-shadow: none;
          }
          .pdf-container {
            margin: 0;
            padding: 0;
          }
          @page {
            size: A4;
            margin: 0;
          }
        }
        @media screen {
          .pdf-page {
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            margin-bottom: 20px;
          }
        }
      `}</style>
    </div>
  );
};
