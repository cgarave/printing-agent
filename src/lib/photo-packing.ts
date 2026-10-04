import { PhotoSize, PHOTO_SIZES, CustomerPhotoEntry } from './types';

export interface PackedPhotoItem {
  id: string;
  size: PhotoSize;
  xMm: number; // relative to quadrant origin (top-left)
  yMm: number;
  widthMm: number;
  heightMm: number;
  label: string;
  photoId?: string;
  customerName?: string;
  nameTagEnabled?: boolean;
  imageToDraw?: string;
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
 * Accurately centers photos vertically and prevents quadrant overflow.
 * Associates each packed slot with the designated person's photo when multiple photos are provided.
 */
export function calculateQuadrantLayout(
  counts: {
    '2x2': number;
    '1x1': number;
    'passport': number;
  },
  photos?: CustomerPhotoEntry[]
): QuadrantLayout {
  const items: PackedPhotoItem[] = [];

  const num2x2 = counts['2x2'] || 0;
  const numPassport = counts['passport'] || 0;
  const num1x1 = counts['1x1'] || 0;

  const size2x2 = PHOTO_SIZES['2x2'];
  const sizePass = PHOTO_SIZES['passport'];
  const size1x1 = PHOTO_SIZES['1x1'];

  // Calculate rows per section
  const rows2x2 = Math.ceil(num2x2 / 2);
  const rowsPass = Math.ceil(numPassport / 2);
  const rows1x1 = Math.ceil(num1x1 / 4);

  // Compute total required vertical height to center inside quadrant
  let totalContentHeight = 0;

  if (rows2x2 > 0) {
    totalContentHeight += rows2x2 * size2x2.heightMm;
  }
  if (rowsPass > 0) {
    totalContentHeight += rowsPass * sizePass.heightMm;
  }
  if (rows1x1 > 0) {
    totalContentHeight += rows1x1 * size1x1.heightMm;
  }

  // Vertically center inside the 148.5mm quadrant
  let currentY = Math.max(2.0, (QUADRANT_HEIGHT_MM - totalContentHeight) / 2);
  let itemIdCounter = 1;

  // 1. Pack 2x2 photos (50.8mm x 50.8mm)
  if (num2x2 > 0) {
    const assignments2x2: CustomerPhotoEntry[] = [];
    if (photos && photos.length > 0) {
      for (const p of photos) {
        const count = p.counts['2x2'] || 0;
        for (let c = 0; c < count; c++) {
          assignments2x2.push(p);
        }
      }
    }

    const maxCols2x2 = 2;
    const startX2x2 = Math.max(
      1.0,
      (QUADRANT_WIDTH_MM - maxCols2x2 * size2x2.widthMm) / 2
    );

    for (let i = 0; i < num2x2; i++) {
      const col = i % maxCols2x2;
      const row = Math.floor(i / maxCols2x2);
      const x = startX2x2 + col * size2x2.widthMm;
      const y = currentY + row * size2x2.heightMm;

      const assignedPhoto = assignments2x2[i] || photos?.[0];
      const imageToDraw =
        assignedPhoto?.processedImage2x2 || assignedPhoto?.processedImage;

      items.push({
        id: `photo-2x2-${itemIdCounter++}`,
        size: '2x2',
        xMm: x,
        yMm: y,
        widthMm: size2x2.widthMm,
        heightMm: size2x2.heightMm,
        label: '2×2"',
        photoId: assignedPhoto?.id,
        customerName: assignedPhoto?.customerName,
        nameTagEnabled: assignedPhoto?.nameTagEnabled,
        imageToDraw,
      });
    }

    currentY += rows2x2 * size2x2.heightMm;
  }

  // 2. Pack Passport photos (35mm x 45mm)
  if (numPassport > 0) {
    const assignmentsPass: CustomerPhotoEntry[] = [];
    if (photos && photos.length > 0) {
      for (const p of photos) {
        const count = p.counts['passport'] || 0;
        for (let c = 0; c < count; c++) {
          assignmentsPass.push(p);
        }
      }
    }

    const maxColsPass = 2;
    const startXPass = Math.max(
      2.0,
      (QUADRANT_WIDTH_MM - maxColsPass * sizePass.widthMm) / 2
    );

    for (let i = 0; i < numPassport; i++) {
      const col = i % maxColsPass;
      const row = Math.floor(i / maxColsPass);
      const x = startXPass + col * sizePass.widthMm;
      const y = currentY + row * sizePass.heightMm;

      const assignedPhoto = assignmentsPass[i] || photos?.[0];
      const imageToDraw =
        assignedPhoto?.processedImagePassport || assignedPhoto?.processedImage;

      items.push({
        id: `photo-pass-${itemIdCounter++}`,
        size: 'passport',
        xMm: x,
        yMm: y,
        widthMm: sizePass.widthMm,
        heightMm: sizePass.heightMm,
        label: 'Passport',
        photoId: assignedPhoto?.id,
        customerName: assignedPhoto?.customerName,
        nameTagEnabled: assignedPhoto?.nameTagEnabled,
        imageToDraw,
      });
    }

    currentY += rowsPass * sizePass.heightMm;
  }

  // 3. Pack 1x1 photos (25.4mm x 25.4mm)
  if (num1x1 > 0) {
    const assignments1x1: CustomerPhotoEntry[] = [];
    if (photos && photos.length > 0) {
      for (const p of photos) {
        const count = p.counts['1x1'] || 0;
        for (let c = 0; c < count; c++) {
          assignments1x1.push(p);
        }
      }
    }

    const maxCols1x1 = 4;
    const totalWidth1x1 = maxCols1x1 * size1x1.widthMm;
    const startX1x1 = Math.max(1.0, (QUADRANT_WIDTH_MM - totalWidth1x1) / 2);

    for (let i = 0; i < num1x1; i++) {
      const col = i % maxCols1x1;
      const row = Math.floor(i / maxCols1x1);
      const x = startX1x1 + col * size1x1.widthMm;
      const y = currentY + row * size1x1.heightMm;

      const assignedPhoto = assignments1x1[i] || photos?.[0];
      const imageToDraw =
        assignedPhoto?.processedImage2x2 || assignedPhoto?.processedImage;

      items.push({
        id: `photo-1x1-${itemIdCounter++}`,
        size: '1x1',
        xMm: x,
        yMm: y,
        widthMm: size1x1.widthMm,
        heightMm: size1x1.heightMm,
        label: '1×1"',
        photoId: assignedPhoto?.id,
        customerName: assignedPhoto?.customerName,
        nameTagEnabled: assignedPhoto?.nameTagEnabled,
        imageToDraw,
      });
    }
  }

  return {
    quadrantWidthMm: QUADRANT_WIDTH_MM,
    quadrantHeightMm: QUADRANT_HEIGHT_MM,
    items,
  };
}
