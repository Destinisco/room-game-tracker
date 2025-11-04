import { DuvěraTemplate } from './DuvěraTemplate';
import { DefaultTemplate } from './DefaultTemplate';
import { PdfTemplateProps } from './types';

export const PDF_TEMPLATES: Record<string, React.ComponentType<PdfTemplateProps>> = {
  'DuvěraTemplate': DuvěraTemplate,
  'DefaultTemplate': DefaultTemplate,
};

export const getPdfTemplate = (templateName: string) => {
  return PDF_TEMPLATES[templateName] || PDF_TEMPLATES['DefaultTemplate'];
};

export * from './types';
