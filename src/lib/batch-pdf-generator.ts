import { jsPDF } from 'jspdf';

export type PaperSize = 'a4' | 'letter' | 'legal';
export type LayoutOption = 1 | 2 | 3 | 4;
export type Orientation = 'vertical' | 'horizontal';

const PAPER_DIMENSIONS: Record<PaperSize, { width: number; height: number }> = {
  a4: { width: 210, height: 297 },
  letter: { width: 215.9, height: 279.4 },
  legal: { width: 215.9, height: 330.2 }, 
};

export async function generateBatchPdf(
  images: string[],
  paperSize: PaperSize,
  layout: LayoutOption,
  orientation: Orientation,
  gridFractions: number[],
  margin: number = 0,
  gap: number = 0
): Promise<jsPDF> {
  const { width: pageWidth, height: pageHeight } = PAPER_DIMENSIONS[paperSize];
  
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [pageWidth, pageHeight],
  });

  const getCellBounds = (index: number): { x: number, y: number, w: number, h: number } => {
    const usableWidth = pageWidth - margin * 2;
    const usableHeight = pageHeight - margin * 2;
    const startX = margin;
    const startY = margin;

    if (layout === 1) {
      return { x: startX, y: startY, w: usableWidth, h: usableHeight };
    }
    
    if (layout === 2) {
      if (orientation === 'vertical') {
        const topH = (usableHeight - gap) * gridFractions[0];
        const botH = (usableHeight - gap) * gridFractions[1];
        if (index === 0) return { x: startX, y: startY, w: usableWidth, h: topH };
        if (index === 1) return { x: startX, y: startY + topH + gap, w: usableWidth, h: botH };
      } else {
        const leftW = (usableWidth - gap) * gridFractions[0];
        const rightW = (usableWidth - gap) * gridFractions[1];
        if (index === 0) return { x: startX, y: startY, w: leftW, h: usableHeight };
        if (index === 1) return { x: startX + leftW + gap, y: startY, w: rightW, h: usableHeight };
      }
    }
    
    if (layout === 3) {
      if (orientation === 'vertical') {
        const h0 = (usableHeight - gap * 2) * gridFractions[0];
        const h1 = (usableHeight - gap * 2) * gridFractions[1];
        const h2 = (usableHeight - gap * 2) * gridFractions[2];
        if (index === 0) return { x: startX, y: startY, w: usableWidth, h: h0 };
        if (index === 1) return { x: startX, y: startY + h0 + gap, w: usableWidth, h: h1 };
        if (index === 2) return { x: startX, y: startY + h0 + h1 + gap * 2, w: usableWidth, h: h2 };
      } else {
        const w0 = (usableWidth - gap * 2) * gridFractions[0];
        const w1 = (usableWidth - gap * 2) * gridFractions[1];
        const w2 = (usableWidth - gap * 2) * gridFractions[2];
        if (index === 0) return { x: startX, y: startY, w: w0, h: usableHeight };
        if (index === 1) return { x: startX + w0 + gap, y: startY, w: w1, h: usableHeight };
        if (index === 2) return { x: startX + w0 + w1 + gap * 2, y: startY, w: w2, h: usableHeight };
      }
    }

    if (layout === 4) {
      const row0H = (usableHeight - gap) * gridFractions[0];
      const row1H = (usableHeight - gap) * (1 - gridFractions[0]);
      const col0W = (usableWidth - gap) * gridFractions[1];
      const col1W = (usableWidth - gap) * (1 - gridFractions[1]);
      
      if (index === 0) return { x: startX, y: startY, w: col0W, h: row0H }; 
      if (index === 1) return { x: startX + col0W + gap, y: startY, w: col1W, h: row0H }; 
      if (index === 2) return { x: startX, y: startY + row0H + gap, w: col0W, h: row1H }; 
      if (index === 3) return { x: startX + col0W + gap, y: startY + row0H + gap, w: col1W, h: row1H }; 
    }
    
    return { x: startX, y: startY, w: usableWidth, h: usableHeight };
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
  }

  return doc;
}

