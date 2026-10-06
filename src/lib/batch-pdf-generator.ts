import { jsPDF } from 'jspdf';

export type PaperSize = 'a4' | 'letter' | 'legal';
export type LayoutOption = 1 | 2 | 3 | 4;
export type Orientation = 'vertical' | 'horizontal';

const PAPER_DIMENSIONS: Record<PaperSize, { width: number; height: number }> = {
  a4: { width: 210, height: 297 },
  letter: { width: 215.9, height: 279.4 },
  legal: { width: 215.9, height: 330.2 }, // 8.5 x 13 is actually Folio, often called Legal in some regions (Legal is usually 8.5x14). We use 8.5x13 as requested.
};

export async function generateBatchPdf(
  images: string[], // data URIs
  paperSize: PaperSize,
  layout: LayoutOption,
  orientation: Orientation,
  gridFractions: number[] // array of length `layout` summing to 1.0 (for 2, 3) or length 2 for each axis if 4
): Promise<jsPDF> {
  const { width: pageWidth, height: pageHeight } = PAPER_DIMENSIONS[paperSize];
  
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [pageWidth, pageHeight],
  });

  const getCellBounds = (index: number): { x: number, y: number, w: number, h: number } => {
    if (layout === 1) {
      return { x: 0, y: 0, w: pageWidth, h: pageHeight };
    }
    
    if (layout === 2) {
      if (orientation === 'vertical') {
        const topH = pageHeight * gridFractions[0];
        const botH = pageHeight * gridFractions[1];
        if (index === 0) return { x: 0, y: 0, w: pageWidth, h: topH };
        if (index === 1) return { x: 0, y: topH, w: pageWidth, h: botH };
      } else {
        const leftW = pageWidth * gridFractions[0];
        const rightW = pageWidth * gridFractions[1];
        if (index === 0) return { x: 0, y: 0, w: leftW, h: pageHeight };
        if (index === 1) return { x: leftW, y: 0, w: rightW, h: pageHeight };
      }
    }
    
    if (layout === 3) {
      if (orientation === 'vertical') {
        const h0 = pageHeight * gridFractions[0];
        const h1 = pageHeight * gridFractions[1];
        const h2 = pageHeight * gridFractions[2];
        if (index === 0) return { x: 0, y: 0, w: pageWidth, h: h0 };
        if (index === 1) return { x: 0, y: h0, w: pageWidth, h: h1 };
        if (index === 2) return { x: 0, y: h0 + h1, w: pageWidth, h: h2 };
      } else {
        const w0 = pageWidth * gridFractions[0];
        const w1 = pageWidth * gridFractions[1];
        const w2 = pageWidth * gridFractions[2];
        if (index === 0) return { x: 0, y: 0, w: w0, h: pageHeight };
        if (index === 1) return { x: w0, y: 0, w: w1, h: pageHeight };
        if (index === 2) return { x: w0 + w1, y: 0, w: w2, h: pageHeight };
      }
    }

    if (layout === 4) {
      // 4 layout is 2x2 grid.
      // gridFractions will have 2 arrays or 4 values? Let's assume gridFractions has [rowFraction, colFraction] 
      // rowFraction is for the first row, colFraction is for the first column.
      const row0H = pageHeight * gridFractions[0];
      const row1H = pageHeight * (1 - gridFractions[0]);
      const col0W = pageWidth * gridFractions[1];
      const col1W = pageWidth * (1 - gridFractions[1]);
      
      if (index === 0) return { x: 0, y: 0, w: col0W, h: row0H }; // Top-Left
      if (index === 1) return { x: col0W, y: 0, w: col1W, h: row0H }; // Top-Right
      if (index === 2) return { x: 0, y: row0H, w: col0W, h: row1H }; // Bot-Left
      if (index === 3) return { x: col0W, y: row0H, w: col1W, h: row1H }; // Bot-Right
    }
    
    return { x: 0, y: 0, w: pageWidth, h: pageHeight };
  };

  const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  };

  let imgIndex = 0;
  while (imgIndex < images.length) {
    if (imgIndex > 0) {
      doc.addPage();
    }
    
    for (let slot = 0; slot < layout && imgIndex < images.length; slot++, imgIndex++) {
      const bounds = getCellBounds(slot);
      const imgData = images[imgIndex];
      
      const img = await loadImage(imgData);
      
      // Calculate object-fit: contain dimensions
      const imgRatio = img.width / img.height;
      const boundsRatio = bounds.w / bounds.h;
      
      let finalW = bounds.w;
      let finalH = bounds.h;
      
      if (imgRatio > boundsRatio) {
        // Image is wider than bounds (relative to height)
        finalH = bounds.w / imgRatio;
      } else {
        // Image is taller than bounds
        finalW = bounds.h * imgRatio;
      }
      
      // Center image in the bounds
      const x = bounds.x + (bounds.w - finalW) / 2;
      const y = bounds.y + (bounds.h - finalH) / 2;
      
      // We will try JPEG, fallback to PNG if it fails
      try {
        doc.addImage(img, 'JPEG', x, y, finalW, finalH, undefined, 'FAST');
      } catch (e) {
        doc.addImage(img, 'PNG', x, y, finalW, finalH, undefined, 'FAST');
      }

      // Draw dashed border around the bounds for cutting guide
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.2);
      doc.setLineDashPattern([2, 2], 0);
      doc.rect(bounds.x, bounds.y, bounds.w, bounds.h, 'S');
      doc.setLineDashPattern([], 0); // reset
    }
  }

  return doc;
}
