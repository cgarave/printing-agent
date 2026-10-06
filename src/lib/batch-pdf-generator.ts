import { jsPDF } from 'jspdf';

export type PaperSize = 'a4' | 'letter' | 'legal';
export type LayoutOption = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
export type Orientation = 'vertical' | 'horizontal';

const PAPER_DIMENSIONS: Record<PaperSize, { width: number; height: number }> = {
  a4: { width: 210, height: 297 },
  letter: { width: 215.9, height: 279.4 },
  legal: { width: 215.9, height: 330.2 }, 
};

export interface GridLayoutConfig {
  cols: number;
  rows: number;
  colFractions: number[];
  rowFractions: number[];
}

export function getGridLayoutConfig(
  layout: LayoutOption,
  orientation: Orientation,
  customColFractions?: number[],
  customRowFractions?: number[]
): GridLayoutConfig {
  let cols = 1;
  let rows = 1;
  
  if (layout === 1) { cols = 1; rows = 1; }
  else if (layout === 2) {
    if (orientation === 'vertical') { cols = 1; rows = 2; }
    else { cols = 2; rows = 1; }
  }
  else if (layout === 3) {
    if (orientation === 'vertical') { cols = 1; rows = 3; }
    else { cols = 3; rows = 1; }
  }
  else if (layout === 4) { cols = 2; rows = 2; }
  else if (layout === 5 || layout === 6) {
    if (orientation === 'vertical') { cols = 2; rows = 3; }
    else { cols = 3; rows = 2; }
  }
  else if (layout === 7 || layout === 8) {
    if (orientation === 'vertical') { cols = 2; rows = 4; }
    else { cols = 4; rows = 2; }
  }
  else if (layout === 9) { cols = 3; rows = 3; }
  else if (layout === 10) {
    if (orientation === 'vertical') { cols = 2; rows = 5; }
    else { cols = 5; rows = 2; }
  }

  // Generate default fractions
  const defaultColFractions = Array(cols).fill(1 / cols);
  const defaultRowFractions = Array(rows).fill(1 / rows);

  // Use custom if length matches
  const colFractions = (customColFractions && customColFractions.length === cols) 
    ? customColFractions 
    : defaultColFractions;
    
  const rowFractions = (customRowFractions && customRowFractions.length === rows) 
    ? customRowFractions 
    : defaultRowFractions;

  return { cols, rows, colFractions, rowFractions };
}

export interface BatchImageItem {
  src: string;
  rotation?: number;
}

export type BatchImageInput = string | BatchImageItem;

export async function rotateImageCanvas(src: string, degrees: number): Promise<string> {
  const norm = ((degrees % 360) + 360) % 360;
  if (norm === 0 || typeof document === 'undefined') return src;

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const radians = (norm * Math.PI) / 180;
      const sin = Math.abs(Math.sin(radians));
      const cos = Math.abs(Math.cos(radians));

      const newWidth = Math.max(1, Math.round(img.width * cos + img.height * sin));
      const newHeight = Math.max(1, Math.round(img.width * sin + img.height * cos));

      const canvas = document.createElement('canvas');
      canvas.width = newWidth;
      canvas.height = newHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(src);
        return;
      }

      ctx.translate(newWidth / 2, newHeight / 2);
      ctx.rotate(radians);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);

      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(src);
    img.src = src;
  });
}

export async function generateBatchPdf(
  images: BatchImageInput[],
  paperSize: PaperSize,
  layout: LayoutOption,
  orientation: Orientation,
  pageFractions: { colFractions?: number[]; rowFractions?: number[] }[],
  margin: number = 0,
  gap: number = 0
): Promise<jsPDF> {
  const { width: pageWidth, height: pageHeight } = PAPER_DIMENSIONS[paperSize];
  
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [pageWidth, pageHeight],
  });

  const usableWidth = pageWidth - margin * 2;
  const usableHeight = pageHeight - margin * 2;

  const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  };

  let imgIndex = 0;
  let pageIndex = 0;
  
  while (imgIndex < images.length) {
    if (pageIndex > 0) {
      doc.addPage();
    }
    
    // Get fractions for this page (fallback to the first page's if not defined)
    const fractions = pageFractions[pageIndex] || pageFractions[0] || {};
    const config = getGridLayoutConfig(layout, orientation, fractions.colFractions, fractions.rowFractions);
    const { cols, rows, colFractions, rowFractions } = config;

    const totalGapW = (cols - 1) * gap;
    const totalGapH = (rows - 1) * gap;
    const netWidth = Math.max(0, usableWidth - totalGapW);
    const netHeight = Math.max(0, usableHeight - totalGapH);

    // Compute column widths and X offsets for this page
    const colWidths: number[] = colFractions.map((f) => netWidth * f);
    const colXOffsets: number[] = [];
    let currentX = margin;
    for (let c = 0; c < cols; c++) {
      colXOffsets.push(currentX);
      currentX += colWidths[c] + gap;
    }

    // Compute row heights and Y offsets for this page
    const rowHeights: number[] = rowFractions.map((f) => netHeight * f);
    const rowYOffsets: number[] = [];
    let currentY = margin;
    for (let r = 0; r < rows; r++) {
      rowYOffsets.push(currentY);
      currentY += rowHeights[r] + gap;
    }

    const getCellBounds = (index: number): { x: number; y: number; w: number; h: number } => {
      const colIndex = index % cols;
      const rowIndex = Math.floor(index / cols);

      const x = colXOffsets[colIndex] ?? margin;
      const y = rowYOffsets[rowIndex] ?? margin;
      const w = colWidths[colIndex] ?? netWidth;
      const h = rowHeights[rowIndex] ?? netHeight;

      return { x, y, w, h };
    };

    for (let slot = 0; slot < layout && imgIndex < images.length; slot++, imgIndex++) {
      const bounds = getCellBounds(slot);
      const rawItem = images[imgIndex];
      const imgSrc = typeof rawItem === 'string' ? rawItem : rawItem.src;
      const imgRotation = typeof rawItem === 'string' ? 0 : (rawItem.rotation || 0);

      const effectiveSrc = imgRotation !== 0
        ? await rotateImageCanvas(imgSrc, imgRotation)
        : imgSrc;
      
      const img = await loadImage(effectiveSrc);
      
      const imgRatio = img.width / img.height;
      const boundsRatio = bounds.w / bounds.h;
      
      let finalW = bounds.w;
      let finalH = bounds.h;
      
      if (imgRatio > boundsRatio) {
        finalH = bounds.w / imgRatio;
      } else {
        finalW = bounds.h * imgRatio;
      }
      
      const x = bounds.x + (bounds.w - finalW) / 2;
      const y = bounds.y + (bounds.h - finalH) / 2;
      
      try {
        doc.addImage(img, 'JPEG', x, y, finalW, finalH, undefined, 'FAST');
      } catch (e) {
        doc.addImage(img, 'PNG', x, y, finalW, finalH, undefined, 'FAST');
      }

      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.2);
      doc.setLineDashPattern([2, 2], 0);
      doc.rect(bounds.x, bounds.y, bounds.w, bounds.h, 'S');
      doc.setLineDashPattern([], 0); 
    }
    
    pageIndex++;
  }

  return doc;
}
