export interface PdfTemplateProps {
  analysis: {
    role: string;
    code: string;
    color: string;
    gameCode: string;
    strengths: Array<{ title: string; description: string }>;
    weaknesses: Array<{ title: string; description: string }>;
    trust: string;
    personalityTraits: Array<{ title: string; description: string }>;
    collaboration: string;
    [key: string]: any;
  };
  player: {
    full_name?: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    band_color?: string;
    [key: string]: any;
  };
  template: {
    name: string;
    backgroundFrontUrl: string | null;
    backgroundBackUrl: string | null;
    version: number;
  };
}
