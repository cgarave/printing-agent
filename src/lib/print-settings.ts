import { jsPDF } from 'jspdf';

export type BorderStyle = 'solid_gray' | 'dashed_gray' | 'solid_black';

export function applyCuttingBorder(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  enabled: boolean,
  style: BorderStyle
) {
  if (!enabled) return;

  if (style === 'solid_black') {
    doc.setDrawColor(0, 0, 0);
    doc.setLineDashPattern([], 0);
    doc.setLineWidth(0.15);
  } else if (style === 'dashed_gray') {
    doc.setDrawColor(200, 200, 200);
    doc.setLineDashPattern([2, 2], 0);
    doc.setLineWidth(0.2);
  } else {
    // solid_gray
    doc.setDrawColor(210, 210, 210);
    doc.setLineDashPattern([], 0);
    doc.setLineWidth(0.15);
  }

  doc.rect(x, y, w, h, 'S');
  doc.setLineDashPattern([], 0); // Reset dash
}
