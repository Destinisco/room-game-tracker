import { PdfTemplateProps } from "./types";
import strengthIcon from '@/assets/pdf-icons/strength-icon.svg';
import weaknessIcon from '@/assets/pdf-icons/weakness-icon.svg';
import personalityIcon from '@/assets/pdf-icons/personality-icon.svg';
import destiniscoLogo from '@/assets/pdf-icons/destinisco-logo.svg';

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

  // Prepare background styles
  const backgroundFrontStyle = template.backgroundFrontUrl 
    ? { backgroundImage: `url(${template.backgroundFrontUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : {};
  
  const backgroundBackStyle = template.backgroundBackUrl
    ? { backgroundImage: `url(${template.backgroundBackUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : {};

  return (
    <div className="pdf-container">
      {/* Front Page */}
      <div 
        className="pdf-page page-front relative" 
        style={{
          width: '210mm',
          height: '297mm',
          padding: '15mm',
          pageBreakAfter: 'always',
          backgroundColor: '#ffffff',
          fontFamily: "'Readex Pro', sans-serif",
          border: '2px solid #000000',
          ...backgroundFrontStyle,
        }}
      >
        <div className="relative z-10 h-full flex flex-col" style={{ height: 'calc(297mm - 30mm)' }}>
          {/* Top Third - Header + Logo + Role */}
          <div className="flex flex-col" style={{ minHeight: '33.33%', paddingBottom: '20px', borderBottom: '2px solid #000000' }}>
            {/* Header */}
            <div className="text-center mb-4">
              <h1 className="text-2xl font-semibold mb-1">
                Destinisco Nexus™
              </h1>
              <p className="text-sm text-gray-700">
                Psychoanalýza hráče: {color}
              </p>
            </div>

            {/* Centered Icon/Logo Space */}
            <div className="flex justify-center mb-4">
              <div className="w-24 h-24 flex items-center justify-center">
                <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="40" cy="40" r="35" fill="none" stroke="#1a1a1a" strokeWidth="2"/>
                  <path d="M40 15 L40 65 M20 40 L60 40" stroke="#1a1a1a" strokeWidth="2"/>
                </svg>
              </div>
            </div>

            {/* Role Badge - flexible height */}
            {role && (
              <div className="mb-4 flex justify-center">
                <div className="bg-black text-white text-center py-2 px-8 inline-block">
                  <p className="text-xs uppercase mb-1">
                    Vaše role:
                  </p>
                  <p className="text-lg font-bold">
                    {role}
                  </p>
                </div>
              </div>
            )}

            {/* Disclaimer */}
            <p className="text-xs text-center text-gray-600 leading-relaxed px-8">
              Herní psychoanalýza byla automaticky vygenerována dle nasbíraných herních dat z únikové hry Důvěra. 
              Kód hry: {gameCode}
            </p>
          </div>

          {/* Middle Third - Strengths & Weaknesses */}
          <div className="grid grid-cols-2 gap-0" style={{ minHeight: '33.33%', borderBottom: '2px solid #000000', paddingTop: '20px', paddingBottom: '20px' }}>
            {/* Strengths */}
            <div style={{ borderRight: '2px solid #000000', paddingRight: '20px' }}>
              <h2 className="text-base font-bold mb-4">
                Silné stránky:
              </h2>
              <div className="space-y-4">
                {strengths.slice(0, 3).map((item, idx) => (
                  <div key={idx} className="flex gap-2 border border-gray-300 p-3 rounded">
                    <img src={strengthIcon} alt="" className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold mb-1">
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
            <div style={{ paddingLeft: '20px' }}>
              <h2 className="text-base font-bold mb-4">
                Slabé stránky:
              </h2>
              <div className="space-y-4">
                {weaknesses.slice(0, 3).map((item, idx) => (
                  <div key={idx} className="flex gap-2 border border-gray-300 p-3 rounded">
                    <img src={weaknessIcon} alt="" className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold mb-1">
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

          {/* Bottom Third - Trust Section */}
          <div className="flex flex-col justify-center" style={{ minHeight: '33.33%', paddingTop: '20px' }}>
            <h2 className="text-base font-bold text-center mb-3">
              Důvěra (v sebe, ostatní a příběh)
            </h2>
            <p className="text-xs text-gray-700 leading-relaxed text-justify">
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
          padding: '15mm',
          backgroundColor: '#ffffff',
          fontFamily: "'Readex Pro', sans-serif",
          border: '2px solid #000000',
          ...backgroundBackStyle,
        }}
      >
        <div className="relative z-10 h-full flex flex-col" style={{ height: 'calc(297mm - 30mm)' }}>
          {/* Top Third - Personality Traits */}
          <div className="flex flex-col justify-center" style={{ minHeight: '33.33%', borderBottom: '2px solid #000000', paddingBottom: '20px' }}>
            <h2 className="text-xl font-bold text-center mb-8">
              Predikce osobnostních rysů
            </h2>
            <div className="grid grid-cols-3 gap-6">
              {personalityTraits.slice(0, 3).map((trait, idx) => (
                <div key={idx} className="text-center">
                  <img src={personalityIcon} alt="" className="w-8 h-8 mx-auto mb-3" />
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

          {/* Middle Third - Collaboration Section */}
          <div className="flex flex-col justify-center" style={{ minHeight: '33.33%', borderBottom: '2px solid #000000', paddingTop: '20px', paddingBottom: '20px' }}>
            <h2 className="text-base font-bold text-center mb-4">
              Pro zlepšení spolupráce ve stejném týmu
            </h2>
            <p className="text-xs text-gray-700 leading-relaxed text-justify mb-6">
              {collaboration}
            </p>
            <h3 className="text-sm font-bold text-center mb-2">
              Opakované hraní stejné Destinisco únikové hry ve stejném složení se doporučuje minimálně 6 měsíců od poslední hry
            </h3>
          </div>

          {/* Bottom Third - Footer with Logo */}
          <div className="flex flex-col justify-center items-center" style={{ minHeight: '33.33%', paddingTop: '20px' }}>
            <img src={destiniscoLogo} alt="Destinisco" className="h-12 mb-2" />
            <p className="text-xs text-gray-600">Adaptivní únikové hry</p>
            <p className="text-xs text-gray-600 mt-1">www.destinisco.com</p>
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
