import { jsPDF } from 'jspdf';
import { CustomerPhotoData, QuadrantId, QuadrantSlotState } from './types';
import { calculateQuadrantLayout, QUADRANT_WIDTH_MM, QUADRANT_HEIGHT_MM } from './photo-packing';

export interface QuadrantOffset {
  x: number;
  y: number;
}

export const QUADRANT_OFFSETS: Record<QuadrantId, QuadrantOffset> = {
  q1: { x: 0, y: 0 },
  q2: { x: QUADRANT_WIDTH_MM, y: 0 },
  q3: { x: 0, y: QUADRANT_HEIGHT_MM },
  q4: { x: QUADRANT_WIDTH_MM, y: QUADRANT_HEIGHT_MM },
};

/**
 * Generates an exact A4 (210 x 297 mm) 300 DPI PDF containing the selected quadrants
 * with cutting guidelines and precise photo dimensions.
 */
export async function generateA4GangSheetPdf(
  quadrants: QuadrantSlotState[],
  options?: { showQuadrantBorders?: boolean }
): Promise<jsPDF> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4', // 210 x 297 mm
  });

  const { showQuadrantBorders = true } = options || {};

  // Draw faint center quadrant dividing lines if enabled (for cutting A4 in 4 pieces)
  if (showQuadrantBorders) {
    doc.setDrawColor(210, 210, 210);
    doc.setLineWidth(0.15); // faint hairline
    // Vertical center line
    doc.setLineDashPattern([2, 2], 0);
    doc.line(QUADRANT_WIDTH_MM, 0, QUADRANT_WIDTH_MM, 297);
    // Horizontal center line
    doc.line(0, QUADRANT_HEIGHT_MM, 210, QUADRANT_HEIGHT_MM);
    doc.setLineDashPattern([], 0); // reset solid
  }

  for (const slot of quadrants) {
    if (!slot.enabled || !slot.photoData) {
      continue;
    }

    const offset = QUADRANT_OFFSETS[slot.id];
    const { photoData } = slot;

    // Calculate layout for this quadrant
    const layout = calculateQuadrantLayout(photoData.customCounts);

    for (const item of layout.items) {
      const photoX = offset.x + item.xMm;
      const photoY = offset.y + item.yMm;

      // 1. Draw photo image with exact aspect ratio
      const imageToDraw =
        item.size === 'passport' && photoData.processedImagePassport
          ? photoData.processedImagePassport
          : (item.size === '2x2' || item.size === '1x1') && photoData.processedImage2x2
          ? photoData.processedImage2x2
          : photoData.processedImage;

      try {
        doc.addImage(
          imageToDraw,
          'JPEG',
          photoX,
          photoY,
          item.widthMm,
          item.heightMm,
          undefined,
          'FAST'
        );
      } catch (err) {
        // Fallback for PNG or other formats
        doc.addImage(
          imageToDraw,
          'PNG',
          photoX,
          photoY,
          item.widthMm,
          item.heightMm,
          undefined,
          'FAST'
        );
      }

      // 2. Draw Name Tag Banner if enabled
      if (photoData.nameTagEnabled && photoData.customerName) {
        const tagHeightMm = item.size === '2x2' ? 6.5 : item.size === 'passport' ? 5.5 : 4.0;
        const tagY = photoY + item.heightMm - tagHeightMm;

        // Solid white strip
        doc.setFillColor(255, 255, 255);
        doc.rect(photoX, tagY, item.widthMm, tagHeightMm, 'F');

        // Thin separator line above name tag
        doc.setDrawColor(180, 180, 180);
        doc.setLineWidth(0.1);
        doc.line(photoX, tagY, photoX + item.widthMm, tagY);

        // Name text
        doc.setTextColor(0, 0, 0);
        const fontSize = item.size === '2x2' ? 7.5 : item.size === 'passport' ? 6.5 : 4.8;
        doc.setFontSize(fontSize);
        doc.setFont('helvetica', 'bold');

        const textX = photoX + item.widthMm / 2;
        const textY = tagY + tagHeightMm / 2 + (fontSize * 0.35) / 2;
        doc.text(photoData.customerName, textX, textY, { align: 'center' });
      }

      // 3. Draw ultra-fine 0.25pt cutting guide around each photo
      doc.setDrawColor(175, 175, 175);
      doc.setLineWidth(0.09); // ~0.25pt hairline
      doc.rect(photoX, photoY, item.widthMm, item.heightMm, 'S');
    }
  }

  return doc;
}
