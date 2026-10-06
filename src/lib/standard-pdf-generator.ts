import jsPDF from 'jspdf';
import { StandardSizeKey, PaperSizeKey, STANDARD_PHOTO_SIZES, PAPER_SIZES } from './standard-sizes';

export interface PrintItem {
  id: string;
  processedImage: string; // base64
  copies: number;
}

export function calculatePaperLayout(targetSizeKey: StandardSizeKey, paperSizeKey: PaperSizeKey) {
  const paper = PAPER_SIZES[paperSizeKey];
  const photoSize = STANDARD_PHOTO_SIZES[targetSizeKey];

  const paddingMm = 5; // Minimum margin
  const availW = paper.widthMm - paddingMm * 2;
  const availH = paper.heightMm - paddingMm * 2;

  // Try Portrait photo orientation
  const colsP = Math.floor(availW / photoSize.widthMm);
  const rowsP = Math.floor(availH / photoSize.heightMm);
  const fitP = colsP * rowsP;

  // Try Landscape photo orientation
  const colsL = Math.floor(availW / photoSize.heightMm);
  const rowsL = Math.floor(availH / photoSize.widthMm);
  const fitL = colsL * rowsL;

  let isLandscapePhoto = false;
  let cols = colsP;
  let rows = rowsP;
  let drawW = photoSize.widthMm;
  let drawH = photoSize.heightMm;

  if (fitL > fitP) {
    isLandscapePhoto = true;
    cols = colsL;
    rows = rowsL;
    drawW = photoSize.heightMm;
    drawH = photoSize.widthMm;
  }

  return {
    cols,
    rows,
    drawW,
    drawH,
    isLandscapePhoto,
    photosPerPage: cols * rows,
    paddingMm,
    paperWidth: paper.widthMm,
    paperHeight: paper.heightMm,
  };
}

export async function generateStandardPhotosPdf(
  items: PrintItem[],
  targetSizeKey: StandardSizeKey,
  paperSizeKey: PaperSizeKey
): Promise<jsPDF> {
  const paper = PAPER_SIZES[paperSizeKey];
  const photoSize = STANDARD_PHOTO_SIZES[targetSizeKey];

  // Flatten the list into individual photo instances.
  const photosToPrint: string[] = [];
  for (const item of items) {
    for (let i = 0; i < item.copies; i++) {
      photosToPrint.push(item.processedImage);
    }
  }

  const layout = calculatePaperLayout(targetSizeKey, paperSizeKey);
  const { cols, rows, drawW, drawH, isLandscapePhoto, photosPerPage, paddingMm } = layout;

  const doc = new jsPDF({
    orientation: 'p',
    unit: 'mm',
    format: [paper.widthMm, paper.heightMm],
  });

  if (photosToPrint.length === 0 || photosPerPage === 0) {
    return doc; // Empty doc or cannot fit
  }

  const availW = paper.widthMm - paddingMm * 2;
  const availH = paper.heightMm - paddingMm * 2;
  const gridW = cols * drawW;
  const gridH = rows * drawH;
  const startX = paddingMm + (availW - gridW) / 2;
  const startY = paddingMm + (availH - gridH) / 2;

  let currentPage = 1;

  for (let i = 0; i < photosToPrint.length; i++) {
    const photoBase64 = photosToPrint[i];
    const pageIndex = Math.floor(i / photosPerPage);
    const indexOnPage = i % photosPerPage;

    if (pageIndex + 1 > currentPage) {
      doc.addPage();
      currentPage++;
    }

    const col = indexOnPage % cols;
    const row = Math.floor(indexOnPage / cols);

    const x = startX + col * drawW;
    const y = startY + row * drawH;
    
    if (isLandscapePhoto) {
      const cx = x + drawW / 2;
      const cy = y + drawH / 2;
      
      doc.addImage(photoBase64, 'JPEG', cx - photoSize.widthMm / 2, cy - photoSize.heightMm / 2, photoSize.widthMm, photoSize.heightMm, undefined, 'FAST', -90);
    } else {
      doc.addImage(photoBase64, 'JPEG', x, y, drawW, drawH);
    }

    doc.setDrawColor(200, 200, 200); // subtle gray
    doc.setLineWidth(0.2);
    doc.rect(x, y, drawW, drawH);
  }

  return doc;
}
