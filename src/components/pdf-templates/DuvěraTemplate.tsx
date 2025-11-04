import { PdfTemplateProps } from "./types";
import strengthIcon from '@/assets/pdf-icons/strength-icon.svg';
import weaknessIcon from '@/assets/pdf-icons/weakness-icon.svg';
import personalityIcon from '@/assets/pdf-icons/personality-icon.svg';
import destiniscoLogo from '@/assets/pdf-icons/destinisco-logo.svg';

export const DuvěraTemplate = ({ analysis, player, template }: PdfTemplateProps) => {
  // Fallback pro starý formát dat
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
    ((analysis as any).behavior_insights || []).slice(0, 6).map((insight: string) => ({
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
      {/* Strana 1 */}
      <div 
        className="pdf-page page-front relative" 
        style={{
          width: '210mm',
          height: '297mm',
          padding: '20mm',
          pageBreakAfter: 'always',
          backgroundColor: '#ffffff',
          fontFamily: "'Open Sans', sans-serif",
        }}
      >
        {/* Background Pattern */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `
              repeating-linear-gradient(0deg, rgba(0,0,0,0.05) 0px, transparent 1px, transparent 20px),
              repeating-linear-gradient(90deg, rgba(0,0,0,0.05) 0px, transparent 1px, transparent 20px)
            `,
            zIndex: 0,
          }}
        />

        <div className="relative z-10 h-full flex flex-col">
          {/* Header */}
          <div className="text-center mb-6 pb-4 border-b border-gray-200">
            <div className="mb-2">
              <svg width="50" height="50" viewBox="0 0 50 50" className="mx-auto" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="25" cy="25" r="20" fill="#1a1a1a"/>
                <path d="M25 10 L25 40 M15 25 L35 25" stroke="white" strokeWidth="3"/>
              </svg>
            </div>
            <h1 className="text-3xl font-bold mb-1" style={{ fontFamily: "'Khand', sans-serif", letterSpacing: '2px' }}>
              DESTINISCO NEXUS™
            </h1>
            <p className="text-sm text-gray-600" style={{ fontFamily: "'Khand', sans-serif" }}>
              Psychoanalýza hráče: {color}
            </p>
            <div className="mt-3">
              <svg width="40" height="40" viewBox="0 0 40 40" className="mx-auto" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="20" cy="12" r="6" fill="#1a1a1a"/>
                <path d="M10 35C10 27 14 23 20 23C26 23 30 27 30 35" stroke="#1a1a1a" strokeWidth="3"/>
              </svg>
            </div>
          </div>

          {/* Role Badge */}
          {role && (
            <div className="bg-black text-white text-center py-3 px-6 mx-20 mb-4" style={{ borderRadius: '2px' }}>
              <p className="text-xs uppercase mb-1" style={{ fontFamily: "'Khand', sans-serif", letterSpacing: '1px' }}>
                Vaše role:
              </p>
              <p className="text-xl font-bold" style={{ fontFamily: "'Khand', sans-serif" }}>
                {role}
              </p>
            </div>
          )}

          {/* Disclaimer */}
          <p className="text-xs text-center text-gray-500 mb-6 leading-relaxed">
            Herní psychoanalýza byla automaticky vygenerována dle nasbíraných herních dat z únikové hry Důvěra. 
            Kód hry: {gameCode}
          </p>

          {/* Strengths & Weaknesses - 2 columns */}
          <div className="grid grid-cols-2 gap-6 mb-6 flex-1">
            {/* Strengths */}
            <div>
              <h2 className="text-lg font-bold text-center mb-4 uppercase" style={{ fontFamily: "'Khand', sans-serif", letterSpacing: '1px' }}>
                Silné stránky
              </h2>
              <div className="space-y-3">
                {strengths.slice(0, 3).map((item, idx) => (
                  <div key={idx} className="flex gap-2">
                    <img src={strengthIcon} alt="" className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold mb-1" style={{ fontFamily: "'Khand', sans-serif" }}>
                        {item.title}
                      </p>
                      <p className="text-xs text-gray-700 leading-snug">
                        {item.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Weaknesses */}
            <div>
              <h2 className="text-lg font-bold text-center mb-4 uppercase" style={{ fontFamily: "'Khand', sans-serif", letterSpacing: '1px' }}>
                Oblasti k rozvoji
              </h2>
              <div className="space-y-3">
                {weaknesses.slice(0, 3).map((item, idx) => (
                  <div key={idx} className="flex gap-2">
                    <img src={weaknessIcon} alt="" className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold mb-1" style={{ fontFamily: "'Khand', sans-serif" }}>
                        {item.title}
                      </p>
                      <p className="text-xs text-gray-700 leading-snug">
                        {item.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Trust Section */}
          <div className="mt-auto">
            <h2 className="text-lg font-bold text-center mb-3 uppercase" style={{ fontFamily: "'Khand', sans-serif", letterSpacing: '1px' }}>
              Důvěra (v sebe, ostatní a příběh)
            </h2>
            <p className="text-xs text-gray-700 leading-relaxed text-justify">
              {trust}
            </p>
          </div>
        </div>
      </div>

      {/* Strana 2 */}
      <div 
        className="pdf-page page-back relative" 
        style={{
          width: '210mm',
          height: '297mm',
          padding: '20mm',
          backgroundColor: '#ffffff',
          fontFamily: "'Open Sans', sans-serif",
        }}
      >
        {/* Background Pattern */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `
              repeating-linear-gradient(0deg, rgba(0,0,0,0.05) 0px, transparent 1px, transparent 20px),
              repeating-linear-gradient(90deg, rgba(0,0,0,0.05) 0px, transparent 1px, transparent 20px)
            `,
            zIndex: 0,
          }}
        />

        <div className="relative z-10 h-full flex flex-col">
          {/* Personality Traits - 3 columns */}
          <div className="mb-8 pb-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-center mb-6 uppercase" style={{ fontFamily: "'Khand', sans-serif", letterSpacing: '1px' }}>
              Osobnostní rysy
            </h2>
            <div className="grid grid-cols-3 gap-4">
              {personalityTraits.slice(0, 3).map((trait, idx) => (
                <div key={idx} className="text-center">
                  <img src={personalityIcon} alt="" className="w-6 h-6 mx-auto mb-2" />
                  <p className="text-sm font-semibold mb-2" style={{ fontFamily: "'Khand', sans-serif" }}>
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
          <div className="flex-1 mb-8">
            <h2 className="text-xl font-bold text-center mb-4 uppercase" style={{ fontFamily: "'Khand', sans-serif", letterSpacing: '1px' }}>
              Pro zlepšení spolupráce ve stejném týmu
            </h2>
            <p className="text-xs text-gray-700 leading-relaxed text-justify">
              {collaboration}
            </p>
          </div>

          {/* Footer */}
          <div className="mt-auto pt-6 border-t border-gray-200 flex justify-center">
            <img src={destiniscoLogo} alt="Destinisco" className="h-16" />
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
