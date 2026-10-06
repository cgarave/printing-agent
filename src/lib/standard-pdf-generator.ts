import jsPDF from 'jspdf';
import { StandardSizeKey, PaperSizeKey, STANDARD_PHOTO_SIZES, PAPER_SIZES } from './standard-sizes';

interface PrintItem {
  id: string;
  processedImage: string; // base64
  copies: number;
}

export async function generateStandardPhotosPdf(
  items: PrintItem[],
  targetSizeKey: StandardSizeKey,
  paperSizeKey: PaperSizeKey
): Promise<jsPDF> {
  const paper = PAPER_SIZES[paperSizeKey];
  const photoSize = STANDARD_PHOTO_SIZES[targetSizeKey];

  // We have a list of images to print, and a number of copies for each.
  // Flatten the list into individual photo instances.
  const photosToPrint: string[] = [];
  for (const item of items) {
    for (let i = 0; i < item.copies; i++) {
      photosToPrint.push(item.processedImage);
    }
  }

  // Calculate grid packing
  const paddingMm = 5; // Minimum margin around the edge of the paper
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

  const photosPerPage = cols * rows;

  // Initialize PDF
  // jsPDF orientation is 'p' or 'l'. We'll stick to 'p' (portrait) paper for consistency,
  // and just rotate/draw the images if they are landscape. Wait, if the paper itself is 'a4' portrait, we just draw with drawW/drawH.
  const doc = new jsPDF({
    orientation: 'p',
    unit: 'mm',
    format: [paper.widthMm, paper.heightMm],
  });

  if (photosToPrint.length === 0 || photosPerPage === 0) {
    return doc; // Empty doc or cannot fit
  }

  // Calculate starting X and Y to center the grid on the page
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

    // We might need to rotate the image 90 degrees if it's placed in landscape slot but the cropped image is portrait.
    // Wait, the cropper outputs the image exactly as the targetSizeKey aspect ratio.
    // So if target is 4R (102x152), the image is 102 wide, 152 tall.
    // If our grid slot is landscape (drawW=152, drawH=102), we MUST rotate the image 90 degrees to fit.
    
    if (isLandscapePhoto) {
      // jsPDF drawImage with rotation rotates around the top-left coordinate by default,
      // or we can just specify a rotation angle.
      // Easiest is to use the center of the bounding box as the center of rotation.
      const cx = x + drawW / 2;
      const cy = y + drawH / 2;
      
      // When rotating 90 deg: image width becomes height, height becomes width.
      // Image original dimensions: photoSize.widthMm, photoSize.heightMm
      // We draw it rotated by -90 around its center.
      doc.addImage(photoBase64, 'JPEG', cx - photoSize.widthMm / 2, cy - photoSize.heightMm / 2, photoSize.widthMm, photoSize.heightMm, undefined, 'FAST', -90);
    } else {
      doc.addImage(photoBase64, 'JPEG', x, y, drawW, drawH);
    }

    // Draw subtle gray cutting guides
    doc.setDrawColor(200, 200, 200); // subtle gray
    doc.setLineWidth(0.2);

    // Outline of the photo
    doc.rect(x, y, drawW, drawH);
    
    // Tiny crop marks at the corners (optional, rect is usually enough if it's gray)
    // The rect itself serves as a cutting guide.
  }

  return doc;
}
