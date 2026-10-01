import { PhotoSize, PHOTO_SIZES } from './types';

export interface PackedPhotoItem {
  id: string;
  size: PhotoSize;
  xMm: number; // relative to quadrant origin (top-left)
  yMm: number;
  widthMm: number;
  heightMm: number;
  label: string;
}

export interface QuadrantLayout {
  quadrantWidthMm: number;
  quadrantHeightMm: number;
  items: PackedPhotoItem[];
}

export const QUADRANT_WIDTH_MM = 105;
export const QUADRANT_HEIGHT_MM = 148.5;

/**
 * Computes exact millimeter coordinates for photos packed within a 105x148.5mm quadrant.
 */
export function calculateQuadrantLayout(counts: {
  '2x2': number;
  '1x1': number;
  'passport': number;
}): QuadrantLayout {
  const items: PackedPhotoItem[] = [];
  const gapMm = 1.5; // hairline cutting gap between photos

  // We pack starting from top-left with safe outer margins
  let currentY = 5.0; // top padding
  let itemIdCounter = 1;

  // 1. Pack 2x2 photos (50.8mm x 50.8mm)
  // Can fit 2 per row comfortably (50.8 + 1.5 + 50.8 = 103.1mm)
  const num2x2 = counts['2x2'] || 0;
  const size2x2 = PHOTO_SIZES['2x2'];
  const maxCols2x2 = 2;
  const startX2x2 = Math.max(1.0, (QUADRANT_WIDTH_MM - (maxCols2x2 * size2x2.widthMm + (maxCols2x2 - 1) * gapMm)) / 2);

  let row2x2Count = 0;
  for (let i = 0; i < num2x2; i++) {
    const col = i % maxCols2x2;
    if (col === 0 && i > 0) {
      currentY += size2x2.heightMm + gapMm;
      row2x2Count++;
    }
    const x = startX2x2 + col * (size2x2.widthMm + gapMm);
    items.push({
      id: `photo-2x2-${itemIdCounter++}`,
      size: '2x2',
      xMm: x,
      yMm: currentY,
      widthMm: size2x2.widthMm,
      heightMm: size2x2.heightMm,
      label: '2×2"',
    });
  }

  if (num2x2 > 0) {
    currentY += size2x2.heightMm + gapMm * 1.5;
  }

  // 2. Pack Passport photos (35mm x 45mm)
  const numPassport = counts['passport'] || 0;
  const sizePass = PHOTO_SIZES['passport'];
  const maxColsPass = 2; // 2 cols = 71.5mm, nicely centered
  const startXPass = Math.max(2.0, (QUADRANT_WIDTH_MM - (maxColsPass * sizePass.widthMm + (maxColsPass - 1) * gapMm)) / 2);

  for (let i = 0; i < numPassport; i++) {
    const col = i % maxColsPass;
    if (col === 0 && i > 0) {
      currentY += sizePass.heightMm + gapMm;
    }
    const x = startXPass + col * (sizePass.widthMm + gapMm);
    items.push({
      id: `photo-pass-${itemIdCounter++}`,
      size: 'passport',
      xMm: x,
      yMm: currentY,
      widthMm: sizePass.widthMm,
      heightMm: sizePass.heightMm,
      label: 'Passport',
    });
  }

  if (numPassport > 0) {
    currentY += sizePass.heightMm + gapMm * 1.5;
  }

  // 3. Pack 1x1 photos (25.4mm x 25.4mm)
  // Can fit 3 or 4 per row (4 * 25.4 = 101.6mm)
  const num1x1 = counts['1x1'] || 0;
  const size1x1 = PHOTO_SIZES['1x1'];
  // Determine if 4 cols fits nicely
  const maxCols1x1 = 4;
  const totalWidth1x1 = maxCols1x1 * size1x1.widthMm + (maxCols1x1 - 1) * gapMm;
  const startX1x1 = Math.max(1.0, (QUADRANT_WIDTH_MM - totalWidth1x1) / 2);

  for (let i = 0; i < num1x1; i++) {
    const col = i % maxCols1x1;
    if (col === 0 && i > 0) {
      currentY += size1x1.heightMm + gapMm;
    }
    const x = startX1x1 + col * (size1x1.widthMm + gapMm);
    items.push({
      id: `photo-1x1-${itemIdCounter++}`,
      size: '1x1',
      xMm: x,
      yMm: currentY,
      widthMm: size1x1.widthMm,
      heightMm: size1x1.heightMm,
      label: '1×1"',
    });
  }

  return {
    quadrantWidthMm: QUADRANT_WIDTH_MM,
    quadrantHeightMm: QUADRANT_HEIGHT_MM,
    items,
  };
}
