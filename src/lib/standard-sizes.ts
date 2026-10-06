export type StandardSizeKey = '1.5x3' | '2R' | '3R' | '4R' | '5R' | '6R' | '8R' | 'A4';

export interface StandardSize {
  widthMm: number;
  heightMm: number;
  label: string;
}

export const STANDARD_PHOTO_SIZES: Record<StandardSizeKey, StandardSize> = {
  '1.5x3': { widthMm: 38.1, heightMm: 76.2, label: '1.5×3 inches' },
  '2R': { widthMm: 63.5, heightMm: 88.9, label: '2R (2.5×3.5")' },
  '3R': { widthMm: 89, heightMm: 127, label: '3R (3.5×5")' },
  '4R': { widthMm: 102, heightMm: 152, label: '4R (4×6")' },
  '5R': { widthMm: 127, heightMm: 178, label: '5R (5×7")' },
  '6R': { widthMm: 152, heightMm: 203, label: '6R (6×8")' },
  '8R': { widthMm: 203, heightMm: 254, label: '8R (8×10")' },
  'A4': { widthMm: 210, heightMm: 297, label: 'A4 Full Page' },
};

export type PaperSizeKey = 'a4' | 'letter' | 'legal';

export const PAPER_SIZES: Record<PaperSizeKey, StandardSize> = {
  a4: { widthMm: 210, heightMm: 297, label: 'A4' },
  letter: { widthMm: 215.9, heightMm: 279.4, label: 'Letter' },
  legal: { widthMm: 215.9, heightMm: 330.2, label: 'Legal' },
};
