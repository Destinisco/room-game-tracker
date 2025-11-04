export interface PdfTemplateProps {
  analysis: {
    code?: string;
    color?: string;
    role?: string;
    faithText?: string;
    strength1_name?: string;
    strength1_text?: string;
    strength2_name?: string;
    strength2_text?: string;
    flaw1_name?: string;
    flaw1_text?: string;
    teamTips?: string;
    [key: string]: any;
  };
  player: {
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
