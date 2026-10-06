'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { UploadCloud, Layers, Trash2, Printer, Download, X } from 'lucide-react';
import JSZip from 'jszip';
import { generateBatchPdf, getGridLayoutConfig, PaperSize, LayoutOption, Orientation } from '@/lib/batch-pdf-generator';

export default function BatchLayoutView() {
  const [images, setImages] = useState<string[]>([]);
  const [paperSize, setPaperSize] = useState<PaperSize>('a4');
  const [layout, setLayout] = useState<LayoutOption>(2);
  const [orientation, setOrientation] = useState<Orientation>('vertical');
  
  const [margin, setMargin] = useState<number>(0);
  const [gap, setGap] = useState<number>(0);
  
  // Grid fractions sum to 1.0. For layout=2, default [0.5, 0.5]
  // For layout=4 (2x2), gridFractions[0] is row fraction, [1] is col fraction.
  const [gridFractions, setGridFractions] = useState<number[]>([0.5, 0.5]);
  
  const [isExporting, setIsExporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize fractions on layout change
  useEffect(() => {
    if (layout === 1) setGridFractions([1.0]);
    else if (layout === 2) setGridFractions([0.5, 0.5]);
    else if (layout === 3) setGridFractions([0.333, 0.333, 0.334]);
    else if (layout === 4) setGridFractions([0.5, 0.5]); // [row split, col split]
    else setGridFractions([0.5, 0.5]);
  }, [layout]);

  const config = getGridLayoutConfig(layout, orientation, gridFractions);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;
    await processFiles(Array.from(files));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const processFiles = async (files: File[]) => {
    const newImages: string[] = [];

    for (const file of files) {
      if (file.name.toLowerCase().endsWith('.zip')) {
        try {
          const zip = await JSZip.loadAsync(file);
          const zipEntries = Object.values(zip.files);
          
          for (const entry of zipEntries) {
            if (!entry.dir && entry.name.match(/\.(jpg|jpeg|png|webp)$/i)) {
              const base64 = await entry.async('base64');
              const ext = entry.name.split('.').pop()?.toLowerCase();
              const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
              newImages.push(`data:${mime};base64,${base64}`);
            }
          }
        } catch (error) {
          console.error("Failed to parse zip", error);
          alert(`Failed to extract ${file.name}`);
        }
      } else if (file.type.startsWith('image/')) {
        const url = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(file);
        });
        newImages.push(url);
      }
    }

    if (newImages.length > 0) {
      setImages((prev) => [...prev, ...newImages]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      await processFiles(Array.from(e.dataTransfer.files));
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const clearAll = () => {
    if (confirm('Clear all images?')) {
      setImages([]);
    }
  };

  const exportPdf = async (print: boolean) => {
    if (images.length === 0) return;
    setIsExporting(true);
    try {
      const doc = await generateBatchPdf(images, paperSize, layout, orientation, gridFractions, margin, gap);
      if (print) {
        const blob = doc.output('blob');
        const blobUrl = URL.createObjectURL(blob);
        const printWindow = window.open(blobUrl, '_blank');
        if (printWindow) {
          printWindow.focus();
        } else {
          doc.save('Batch_Print.pdf');
        }
      } else {
        doc.save('Batch_Print.pdf');
      }
    } catch (e) {
      console.error(e);
      alert('Failed to generate PDF.');
    } finally {
      setIsExporting(false);
    }
  };

  // --- Resizing Logic for the preview grid ---
  const containerRef = useRef<HTMLDivElement>(null);

  const handleDividerDrag = useCallback((e: React.MouseEvent, dividerIndex: number, type: 'horizontal' | 'vertical') => {
    e.preventDefault();
    const container = containerRef.current;
    if (!container) return;

    const startPos = type === 'horizontal' ? e.clientY : e.clientX;
    const initialFractions = [...gridFractions];

    const onMouseMove = (moveEvent: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const delta = type === 'horizontal' ? (moveEvent.clientY - startPos) / rect.height : (moveEvent.clientX - startPos) / rect.width;
      
      const newFractions = [...initialFractions];
      
      if (layout === 2 || layout === 3) {
        // Adjust dividerIndex and dividerIndex+1
        const maxDelta = initialFractions[dividerIndex + 1] - 0.05; // min 5%
        const minDelta = -initialFractions[dividerIndex] + 0.05;
        const clampedDelta = Math.max(minDelta, Math.min(maxDelta, delta));
        
        newFractions[dividerIndex] = initialFractions[dividerIndex] + clampedDelta;
        newFractions[dividerIndex + 1] = initialFractions[dividerIndex + 1] - clampedDelta;
      } else if (layout === 4) {
        // 4 per page. gridFractions[0] is row fraction, [1] is col fraction
        if (type === 'horizontal') { // adjusting row (dividerIndex 0)
          const maxDelta = (1 - initialFractions[0]) - 0.05;
          const minDelta = -initialFractions[0] + 0.05;
          newFractions[0] = initialFractions[0] + Math.max(minDelta, Math.min(maxDelta, delta));
        } else { // adjusting col
          const maxDelta = (1 - initialFractions[1]) - 0.05;
          const minDelta = -initialFractions[1] + 0.05;
          newFractions[1] = initialFractions[1] + Math.max(minDelta, Math.min(maxDelta, delta));
        }
      }
      
      setGridFractions(newFractions);
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [gridFractions, layout]);

  // Preview dimensions (scaled down)
  const aspectRatios: Record<PaperSize, number> = {
    a4: 210 / 297,
    letter: 215.9 / 279.4,
    legal: 215.9 / 330.2
  };
  const previewRatio = aspectRatios[paperSize];

  return (
    <div className="flex flex-col gap-5">
      {/* Top Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white px-5 py-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            Batch Layout <span className="bg-blue-100 text-blue-800 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider">New</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Upload images or ZIP files, layout automatically.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <select 
            value={paperSize} 
            onChange={(e) => setPaperSize(e.target.value as PaperSize)}
            className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-slate-50 font-medium text-slate-700"
          >
            <option value="a4">A4 (210×297mm)</option>
            <option value="letter">Letter (8.5×11")</option>
            <option value="legal">Legal (8.5×13")</option>
          </select>

          <select 
            value={layout} 
            onChange={(e) => setLayout(Number(e.target.value) as LayoutOption)}
            className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-slate-50 font-medium text-slate-700"
          >
            <option value={1}>1 per page</option>
            <option value={2}>2 per page</option>
            <option value={3}>3 per page</option>
            <option value={4}>4 per page (2x2)</option>
            <option value={5}>5 per page</option>
            <option value={6}>6 per page</option>
            <option value={7}>7 per page</option>
            <option value={8}>8 per page</option>
            <option value={9}>9 per page (3x3)</option>
            <option value={10}>10 per page</option>
          </select>

          {(layout === 2 || layout === 3 || layout === 5 || layout === 6 || layout === 7 || layout === 8 || layout === 10) && (
            <select 
              value={orientation} 
              onChange={(e) => setOrientation(e.target.value as Orientation)}
              className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-slate-50 font-medium text-slate-700"
            >
              <option value="vertical">Vertical Split ({getGridLayoutConfig(layout, 'vertical').cols}×{getGridLayoutConfig(layout, 'vertical').rows})</option>
              <option value="horizontal">Horizontal Split ({getGridLayoutConfig(layout, 'horizontal').cols}×{getGridLayoutConfig(layout, 'horizontal').rows})</option>
            </select>
          )}

          <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-2 py-1 bg-slate-50">
            <label className="text-[10px] font-semibold text-slate-500 uppercase">Margin</label>
            <select
              value={margin}
              onChange={(e) => setMargin(Number(e.target.value))}
              className="text-xs bg-transparent font-medium text-slate-700 outline-none"
            >
              <option value={0}>0 mm</option>
              <option value={5}>5 mm</option>
              <option value={10}>10 mm</option>
              <option value={15}>15 mm</option>
            </select>
          </div>

          <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-2 py-1 bg-slate-50">
            <label className="text-[10px] font-semibold text-slate-500 uppercase">Gap</label>
            <select
              value={gap}
              onChange={(e) => setGap(Number(e.target.value))}
              className="text-xs bg-transparent font-medium text-slate-700 outline-none"
              disabled={layout === 1}
            >
              <option value={0}>0 mm</option>
              <option value={2}>2 mm</option>
              <option value={5}>5 mm</option>
              <option value={10}>10 mm</option>
            </select>
          </div>

          <div className="h-5 w-px bg-slate-200" />

          <button
            onClick={() => exportPdf(false)}
            disabled={isExporting || images.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg disabled:opacity-50 transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download PDF</span>
          </button>
          
          <button
            onClick={() => exportPdf(true)}
            disabled={isExporting || images.length === 0}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 shadow-sm transition"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-5 items-start">
        {/* Left: Uploader & Gallery */}
        <div className="flex-1 w-full bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800 text-sm">Image Queue ({images.length})</h3>
            {images.length > 0 && (
              <button onClick={clearAll} className="text-xs text-red-500 hover:bg-red-50 px-2 py-1 rounded flex items-center gap-1 transition">
                <Trash2 className="w-3.5 h-3.5" /> Clear All
              </button>
            )}
          </div>
          
          <div 
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className="border-2 border-dashed border-slate-300 rounded-xl p-8 flex flex-col items-center justify-center text-center bg-slate-50 hover:bg-slate-100 transition cursor-pointer mb-5"
            onClick={() => fileInputRef.current?.click()}
          >
            <UploadCloud className="w-8 h-8 text-blue-500 mb-2" />
            <p className="text-sm font-semibold text-slate-700">Drag & drop images or ZIP file</p>
            <p className="text-xs text-slate-500 mt-1">or click to browse</p>
            <input 
              type="file" 
              multiple 
              accept="image/*,.zip" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleFileUpload}
            />
          </div>

          {images.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 max-h-96 overflow-y-auto pr-1">
              {images.map((src, i) => (
                <div key={i} className="relative group aspect-square rounded-lg border border-slate-200 overflow-hidden bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="Upload" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                    <button onClick={() => removeImage(i)} className="bg-white text-red-600 p-1.5 rounded-full hover:scale-110 transition">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="absolute top-1 left-1 bg-black/60 text-white text-[10px] px-1.5 rounded font-mono">
                    {i + 1}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Layout Preview */}
        <div className="w-full md:w-80 flex-shrink-0 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col items-center">
          <h3 className="font-semibold text-slate-800 text-sm w-full mb-4">Layout Preview</h3>
          <p className="text-[10px] text-slate-500 w-full mb-4 leading-tight text-center">
            {layout > 1 && layout <= 4
              ? "Drag the dividers to adjust cell sizes."
              : layout > 4
              ? `${layout} images per page in a ${config.cols}×${config.rows} grid.`
              : "Image fits inside the bounding cell."}
          </p>
          
          {/* Interactive Paper Preview */}
          <div 
            ref={containerRef}
            className="relative bg-white border border-slate-300 shadow-sm overflow-hidden select-none"
            style={{ 
              width: '200px', 
              height: `${200 / previewRatio}px`,
              display: 'flex',
              flexDirection: (layout === 4 || orientation === 'vertical') ? 'column' : 'row',
              padding: `${margin * (200 / 210)}px`,
              gap: (layout === 4 || layout >= 5) ? 0 : `${gap * (200 / 210)}px`
            }}
          >
            {/* Generate CSS Grid or Flexboxes for the preview based on layout and fractions */}
            {layout === 1 && (
              <div className="flex-1 border border-blue-400 border-dashed bg-blue-50/50 flex items-center justify-center">
                <span className="text-slate-400 text-xs font-mono">1</span>
              </div>
            )}
            
            {layout === 2 && orientation === 'vertical' && (
              <>
                <div style={{ height: `calc(${gridFractions[0] * 100}% - ${gap * (200 / 210) / 2}px)` }} className="border border-blue-400 border-dashed bg-blue-50/50 flex items-center justify-center">
                  <span className="text-slate-400 text-xs font-mono">1</span>
                </div>
                <div 
                  className="h-2 bg-blue-500/0 cursor-row-resize absolute left-0 right-0 z-10 hover:bg-blue-500/50 transition-all -translate-y-1/2" 
                  style={{ top: `calc(${margin * (200 / 210)}px + ${gridFractions[0]} * (100% - ${margin * 2 * (200 / 210)}px))` }}
                  onMouseDown={(e) => handleDividerDrag(e, 0, 'horizontal')}
                />
                <div style={{ height: `calc(${gridFractions[1] * 100}% - ${gap * (200 / 210) / 2}px)` }} className="border border-blue-400 border-dashed bg-blue-50/50 flex items-center justify-center">
                  <span className="text-slate-400 text-xs font-mono">2</span>
                </div>
              </>
            )}

            {layout === 2 && orientation === 'horizontal' && (
              <>
                <div style={{ width: `calc(${gridFractions[0] * 100}% - ${gap * (200 / 210) / 2}px)` }} className="h-full border border-blue-400 border-dashed bg-blue-50/50 flex items-center justify-center">
                  <span className="text-slate-400 text-xs font-mono">1</span>
                </div>
                <div 
                  className="w-2 bg-blue-500/0 cursor-col-resize absolute top-0 bottom-0 z-10 hover:bg-blue-500/50 transition-all -translate-x-1/2" 
                  style={{ left: `calc(${margin * (200 / 210)}px + ${gridFractions[0]} * (100% - ${margin * 2 * (200 / 210)}px))` }}
                  onMouseDown={(e) => handleDividerDrag(e, 0, 'vertical')}
                />
                <div style={{ width: `calc(${gridFractions[1] * 100}% - ${gap * (200 / 210) / 2}px)` }} className="h-full border border-blue-400 border-dashed bg-blue-50/50 flex items-center justify-center">
                  <span className="text-slate-400 text-xs font-mono">2</span>
                </div>
              </>
            )}

            {layout === 3 && orientation === 'vertical' && (
              <>
                <div style={{ height: `calc(${gridFractions[0] * 100}% - ${gap * (200 / 210) * 0.666}px)` }} className="border border-blue-400 border-dashed bg-blue-50/50 flex items-center justify-center">
                  <span className="text-slate-400 text-xs font-mono">1</span>
                </div>
                <div 
                  className="h-2 bg-blue-500/0 cursor-row-resize absolute left-0 right-0 z-10 hover:bg-blue-500/50 transition-all -translate-y-1/2" 
                  style={{ top: `calc(${margin * (200 / 210)}px + ${gridFractions[0]} * (100% - ${margin * 2 * (200 / 210)}px))` }}
                  onMouseDown={(e) => handleDividerDrag(e, 0, 'horizontal')}
                />
                <div style={{ height: `calc(${gridFractions[1] * 100}% - ${gap * (200 / 210) * 0.666}px)` }} className="border border-blue-400 border-dashed bg-blue-50/50 flex items-center justify-center">
                  <span className="text-slate-400 text-xs font-mono">2</span>
                </div>
                <div 
                  className="h-2 bg-blue-500/0 cursor-row-resize absolute left-0 right-0 z-10 hover:bg-blue-500/50 transition-all -translate-y-1/2" 
                  style={{ top: `calc(${margin * (200 / 210)}px + ${(gridFractions[0] + gridFractions[1])} * (100% - ${margin * 2 * (200 / 210)}px))` }}
                  onMouseDown={(e) => handleDividerDrag(e, 1, 'horizontal')}
                />
                <div style={{ height: `calc(${gridFractions[2] * 100}% - ${gap * (200 / 210) * 0.666}px)` }} className="border border-blue-400 border-dashed bg-blue-50/50 flex items-center justify-center">
                  <span className="text-slate-400 text-xs font-mono">3</span>
                </div>
              </>
            )}

            {layout === 3 && orientation === 'horizontal' && (
              <>
                <div style={{ width: `calc(${gridFractions[0] * 100}% - ${gap * (200 / 210) * 0.666}px)` }} className="h-full border border-blue-400 border-dashed bg-blue-50/50 flex items-center justify-center">
                  <span className="text-slate-400 text-xs font-mono">1</span>
                </div>
                <div 
                  className="w-2 bg-blue-500/0 cursor-col-resize absolute top-0 bottom-0 z-10 hover:bg-blue-500/50 transition-all -translate-x-1/2" 
                  style={{ left: `calc(${margin * (200 / 210)}px + ${gridFractions[0]} * (100% - ${margin * 2 * (200 / 210)}px))` }}
                  onMouseDown={(e) => handleDividerDrag(e, 0, 'vertical')}
                />
                <div style={{ width: `calc(${gridFractions[1] * 100}% - ${gap * (200 / 210) * 0.666}px)` }} className="h-full border border-blue-400 border-dashed bg-blue-50/50 flex items-center justify-center">
                  <span className="text-slate-400 text-xs font-mono">2</span>
                </div>
                <div 
                  className="w-2 bg-blue-500/0 cursor-col-resize absolute top-0 bottom-0 z-10 hover:bg-blue-500/50 transition-all -translate-x-1/2" 
                  style={{ left: `calc(${margin * (200 / 210)}px + ${(gridFractions[0] + gridFractions[1])} * (100% - ${margin * 2 * (200 / 210)}px))` }}
                  onMouseDown={(e) => handleDividerDrag(e, 1, 'vertical')}
                />
                <div style={{ width: `calc(${gridFractions[2] * 100}% - ${gap * (200 / 210) * 0.666}px)` }} className="h-full border border-blue-400 border-dashed bg-blue-50/50 flex items-center justify-center">
                  <span className="text-slate-400 text-xs font-mono">3</span>
                </div>
              </>
            )}

            {layout === 4 && (
              <div className="absolute inset-0 flex flex-col" style={{
                padding: `${margin * (200 / 210)}px`,
                gap: `${gap * (200 / 210)}px`
              }}>
                <div style={{ height: `calc(${gridFractions[0] * 100}% - ${gap * (200 / 210) / 2}px)`, gap: `${gap * (200 / 210)}px` }} className="w-full flex">
                  <div style={{ width: `calc(${gridFractions[1] * 100}% - ${gap * (200 / 210) / 2}px)` }} className="h-full border border-blue-400 border-dashed bg-blue-50/50 flex items-center justify-center">
                    <span className="text-slate-400 text-xs font-mono">1</span>
                  </div>
                  <div style={{ width: `calc(${(1 - gridFractions[1]) * 100}% - ${gap * (200 / 210) / 2}px)` }} className="h-full border border-blue-400 border-dashed bg-blue-50/50 flex items-center justify-center">
                    <span className="text-slate-400 text-xs font-mono">2</span>
                  </div>
                </div>
                <div style={{ height: `calc(${(1 - gridFractions[0]) * 100}% - ${gap * (200 / 210) / 2}px)`, gap: `${gap * (200 / 210)}px` }} className="w-full flex">
                  <div style={{ width: `calc(${gridFractions[1] * 100}% - ${gap * (200 / 210) / 2}px)` }} className="h-full border border-blue-400 border-dashed bg-blue-50/50 flex items-center justify-center">
                    <span className="text-slate-400 text-xs font-mono">3</span>
                  </div>
                  <div style={{ width: `calc(${(1 - gridFractions[1]) * 100}% - ${gap * (200 / 210) / 2}px)` }} className="h-full border border-blue-400 border-dashed bg-blue-50/50 flex items-center justify-center">
                    <span className="text-slate-400 text-xs font-mono">4</span>
                  </div>
                </div>
                
                {/* Dividers for 4 layout */}
                {/* Horizontal Divider (Row) */}
                <div 
                  className="h-2 bg-blue-500/0 cursor-row-resize absolute left-0 right-0 z-10 hover:bg-blue-500/50 transition-all -translate-y-1/2" 
                  style={{ top: `calc(${margin * (200 / 210)}px + ${gridFractions[0]} * (100% - ${margin * 2 * (200 / 210)}px))` }}
                  onMouseDown={(e) => handleDividerDrag(e, 0, 'horizontal')}
                />
                {/* Vertical Divider (Col) */}
                <div 
                  className="w-2 bg-blue-500/0 cursor-col-resize absolute top-0 bottom-0 z-10 hover:bg-blue-500/50 transition-all -translate-x-1/2" 
                  style={{ left: `calc(${margin * (200 / 210)}px + ${gridFractions[1]} * (100% - ${margin * 2 * (200 / 210)}px))` }}
                  onMouseDown={(e) => handleDividerDrag(e, 0, 'vertical')}
                />
              </div>
            )}

            {layout >= 5 && (
              <div 
                className="w-full h-full"
                style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${config.cols}, minmax(0, 1fr))`,
                  gridTemplateRows: `repeat(${config.rows}, minmax(0, 1fr))`,
                  gap: `${gap * (200 / 210)}px`,
                }}
              >
                {Array.from({ length: layout }).map((_, slot) => (
                  <div 
                    key={slot}
                    className="border border-blue-400 border-dashed bg-blue-50/50 flex items-center justify-center rounded-xs"
                  >
                    <span className="text-slate-400 text-[10px] font-mono">{slot + 1}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          
        </div>
      </div>
    </div>
  );
}
