import { PdfTemplateProps } from "./types";

export const DefaultTemplate = ({ analysis, player, template }: PdfTemplateProps) => {
  return (
    <div className="pdf-container max-w-4xl mx-auto p-8">
      <div className="pdf-page bg-background p-12 rounded-lg shadow-lg" style={{ minHeight: '297mm' }}>
        <h1 className="text-3xl font-bold mb-6 text-primary">{template.name}</h1>
        
        <div className="space-y-6">
          <section>
            <h2 className="text-xl font-semibold mb-3 text-secondary">Hráč</h2>
            <div className="bg-muted p-4 rounded">
              <pre className="whitespace-pre-wrap text-sm">
                {JSON.stringify(player, null, 2)}
              </pre>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-secondary">Analýza</h2>
            <div className="bg-muted p-4 rounded">
              <pre className="whitespace-pre-wrap text-sm">
                {JSON.stringify(analysis, null, 2)}
              </pre>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-secondary">Šablona</h2>
            <div className="bg-muted p-4 rounded">
              <pre className="whitespace-pre-wrap text-sm">
                {JSON.stringify(template, null, 2)}
              </pre>
            </div>
          </section>
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
      `}</style>
    </div>
  );
};
