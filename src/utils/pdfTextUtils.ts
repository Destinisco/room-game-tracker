import { PDFFont } from 'pdf-lib';

/**
 * Measure text width
 */
export const measureText = (text: string, font: PDFFont, size: number): number => {
  return font.widthOfTextAtSize(text, size);
};

/**
 * Smart trim: trim at word boundary and add ellipsis
 */
export const smartTrim = (text: string, maxChars: number): string => {
  if (text.length <= maxChars) return text;
  
  let trimmed = text.slice(0, maxChars);
  
  // Find last space or punctuation
  const lastSpace = trimmed.lastIndexOf(' ');
  const lastPunctuation = Math.max(
    trimmed.lastIndexOf('.'),
    trimmed.lastIndexOf(','),
    trimmed.lastIndexOf(';')
  );
  
  const cutPoint = Math.max(lastSpace, lastPunctuation);
  
  if (cutPoint > 0) {
    trimmed = trimmed.slice(0, cutPoint);
  }
  
  return trimmed.trim() + '…';
};

/**
 * Wrap text to fit within maxWidth, breaking at word boundaries
 */
export const wrapText = (
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number
): string[] => {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const width = measureText(testLine, font, size);
    
    if (width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  
  if (currentLine) {
    lines.push(currentLine);
  }
  
  return lines;
};

/**
 * Fit text within a box (width and height), wrapping and trimming as needed
 */
export const fitTextInBox = (
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
  maxHeight: number,
  lineHeight: number
): string[] => {
  const lines = wrapText(text, font, size, maxWidth);
  const maxLines = Math.floor(maxHeight / lineHeight);
  
  if (lines.length <= maxLines) {
    return lines;
  }
  
  // Need to trim
  const truncatedLines = lines.slice(0, maxLines);
  let lastLine = truncatedLines[maxLines - 1];
  
  // Shorten last line to fit ellipsis
  while (measureText(lastLine + '…', font, size) > maxWidth && lastLine.length > 0) {
    const words = lastLine.split(' ');
    if (words.length <= 1) {
      // Single word, character-by-character trim
      lastLine = lastLine.slice(0, -1);
    } else {
      words.pop();
      lastLine = words.join(' ');
    }
  }
  
  truncatedLines[maxLines - 1] = lastLine + '…';
  
  return truncatedLines;
};

/**
 * Calculate centered X position
 */
export const getCenteredX = (
  text: string,
  font: PDFFont,
  size: number,
  boxX: number,
  boxWidth: number
): number => {
  const textWidth = measureText(text, font, size);
  return boxX + (boxWidth - textWidth) / 2;
};

/**
 * Calculate right-aligned X position
 */
export const getRightAlignedX = (
  text: string,
  font: PDFFont,
  size: number,
  boxX: number,
  boxWidth: number
): number => {
  const textWidth = measureText(text, font, size);
  return boxX + boxWidth - textWidth;
};
