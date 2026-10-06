'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { UploadCloud, Layers, Trash2, Printer, Download, X, Copy, RotateCw, Crop } from 'lucide-react';
import JSZip from 'jszip';
import { generateBatchPdf, getGridLayoutConfig, PaperSize, LayoutOption, Orientation } from '@/lib/batch-pdf-generator';
import BatchCropModal from './BatchCropModal';

export interface QueueImage {
  id: string;
  src: string;
  rotation: number;
}

export interface PageFraction {
  colFractions?: number[][];
  rowFractions?: number[];
}

const ROTATION_STEPS = [0, 90, 180, 270];

export default function BatchLayoutView({ initialFile }: { initialFile?: File }) {
  const [images, setImages] = useState<QueueImage[]>([]);
  const [croppingIndex, setCroppingIndex] = useState<number | null>(null);
  const [globalRotation, setGlobalRotation] = useState<number>(0);
  const [paperSize, setPaperSize] = useState<PaperSize>('a4');
  const [layout, setLayout] = useState<LayoutOption>(2);
  const [orientation, setOrientation] = useState<Orientation>('vertical');
  
  const [margin, setMargin] = useState<number>(0);
  const [gap, setGap] = useState<number>(0);
  
  const [pageFractions, setPageFractions] = useState<PageFraction[]>([]);
  const [unifiedLayout, setUnifiedLayout] = useState<boolean>(true);
  const [isGridLocked, setIsGridLocked] = useState<boolean>(false);
  
  const [isExporting, setIsExporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialFile) {
      processFiles([initialFile]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialFile]);

  useEffect(() => {
    setPageFractions([]);
  }, [layout, orientation]);

  const config = getGridLayoutConfig(layout, orientation, pageFractions[0]?.colFractions, pageFractions[0]?.rowFractions);
  const totalPages = Math.max(1, Math.ceil(images.length / layout));

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;
    await processFiles(Array.from(files));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const processFiles = async (files: File[]) => {
    const newImages: QueueImage[] = [];

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
              newImages.push({
                id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                src: `data:${mime};base64,${base64}`,
                rotation: globalRotation,
              });
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
        newImages.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          src: url,
          rotation: globalRotation,
        });
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

  const duplicateImage = (index: number) => {
    setImages((prev) => {
      const copy = [...prev];
      const target = prev[index];
      copy.splice(index + 1, 0, {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        src: target.src,
        rotation: target.rotation,
      });
      return copy;
    });
  };

  const rotateImage = (index: number) => {
    setImages((prev) =>
      prev.map((img, i) => {
        if (i !== index) return img;
        const currentIdx = ROTATION_STEPS.indexOf(img.rotation);
        const nextAngle = currentIdx >= 0 && currentIdx < ROTATION_STEPS.length - 1
          ? ROTATION_STEPS[currentIdx + 1]
          : ROTATION_STEPS[0];
        return { ...img, rotation: nextAngle };
      })
    );
  };

  const handleGlobalRotationChange = (deg: number) => {
    setGlobalRotation(deg);
    setImages((prev) => prev.map((img) => ({ ...img, rotation: deg })));
  };

  const paperDim = {
    a4: { w: 210, h: 297 },
    letter: { w: 215.9, h: 279.4 },
    legal: { w: 215.9, h: 330.2 },
  }[paperSize];
  const cellWidthMm = (paperDim.w - margin * 2) / config.cols;
  const cellHeightMm = (paperDim.h - margin * 2) / config.rows;
  const currentCellRatio = cellWidthMm / cellHeightMm;

  const handleSaveCrop = (croppedBase64: string) => {
    if (croppingIndex === null) return;
    setImages((prev) =>
      prev.map((img, i) =>
        i === croppingIndex
          ? { ...img, src: croppedBase64 }
          : img
      )
    );
    setCroppingIndex(null);
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
      const doc = await generateBatchPdf(images, paperSize, layout, orientation, pageFractions, margin, gap);
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

  const aspectRatios: Record<PaperSize, number> = {
    a4: 210 / 297,
    letter: 215.9 / 279.4,
    legal: 215.9 / 330.2
  };
  const previewRatio = aspectRatios[paperSize];

  // For snapping
  const SNAP_THRESHOLD = 0.02;

  const handleDividerDrag = useCallback((
    e: React.MouseEvent,
    pageIndex: number,
    dividerIndex: number,
    type: 'row' | 'col',
    rowIndex?: number // defined if type is 'col'
  ) => {
    e.preventDefault();
    
    const targetPageIndex = unifiedLayout ? 0 : pageIndex;
    const currentFrac = pageFractions[targetPageIndex] || pageFractions[0] || {};
    const pageConfig = getGridLayoutConfig(layout, orientation, currentFrac.colFractions, currentFrac.rowFractions);
    
    const startPos = type === 'row' ? e.clientY : e.clientX;
    const initialFractions = type === 'row' ? [...pageConfig.rowFractions] : [...pageConfig.colFractions[rowIndex!]];
    
    const previewWidth = 200;
    const previewHeight = 200 / previewRatio;
    
    // Calculate all possible snap points for columns
    let snapPoints: number[] = [];
    if (type === 'col') {
      pageConfig.colFractions.forEach((rFractions, rIdx) => {
        if (rIdx === rowIndex) return; // don't snap to our own row
        let acc = 0;
        for (let i = 0; i < rFractions.length - 1; i++) {
          acc += rFractions[i];
          snapPoints.push(acc);
        }
      });
    }
    
    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaPx = type === 'row' ? (moveEvent.clientY - startPos) : (moveEvent.clientX - startPos);
      const dimensionPx = type === 'row' ? previewHeight : previewWidth;
      const deltaFracRaw = deltaPx / dimensionPx;
      
      const newFractions = [...initialFractions];
      
      const maxDelta = initialFractions[dividerIndex + 1] - 0.05;
      const minDelta = -initialFractions[dividerIndex] + 0.05;
      let clampedDelta = Math.max(minDelta, Math.min(maxDelta, deltaFracRaw));
      
      // Magnetic snapping for columns
      if (type === 'col') {
        const originalDividerPos = initialFractions.slice(0, dividerIndex + 1).reduce((a,b)=>a+b, 0);
        const intendedPos = originalDividerPos + clampedDelta;
        
        let snappedPos = intendedPos;
        for (const sp of snapPoints) {
          if (Math.abs(intendedPos - sp) < SNAP_THRESHOLD) {
            snappedPos = sp;
            break;
          }
        }
        clampedDelta = snappedPos - originalDividerPos;
      }
      
      newFractions[dividerIndex] = initialFractions[dividerIndex] + clampedDelta;
      newFractions[dividerIndex + 1] = initialFractions[dividerIndex + 1] - clampedDelta;
      
      setPageFractions((prev) => {
        const next = [...prev];
        while (next.length <= targetPageIndex) next.push(prev[0] || {});
        
        const pageUpdate = { ...next[targetPageIndex] };
        if (type === 'row') {
          pageUpdate.rowFractions = newFractions;
        } else {
          const newColFracs = pageConfig.colFractions.map(r => [...r]);
          newColFracs[rowIndex!] = newFractions;
          pageUpdate.colFractions = newColFracs;
        }
        
        if (unifiedLayout) return [pageUpdate];
        next[targetPageIndex] = pageUpdate;
        return next;
      });
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [layout, orientation, pageFractions, unifiedLayout, previewRatio]);

  const renderCellContent = (index: number) => {
    const img = images[index];
    if (img) {
      return (
        <div className="w-full h-full p-1 overflow-hidden flex items-center justify-center pointer-events-none">
          <img 
            src={img.src} 
            alt={`Preview ${index + 1}`} 
            style={{ transform: `rotate(${img.rotation}deg)` }} 
            className="max-w-full max-h-full object-contain" 
          />
        </div>
      );
    }
    return <span className="text-slate-400 text-[10px] font-mono pointer-events-none">{index + 1}</span>;
  };

  const renderPreviewPage = (pageIndex: number) => {
    const fractions = pageFractions[pageIndex] || pageFractions[0] || {};
    const pageConfig = getGridLayoutConfig(layout, orientation, fractions.colFractions, fractions.rowFractions);
    
    const rowOffsets: number[] = [];
    let accRow = 0;
    for (let r = 0; r < pageConfig.rows; r++) {
      accRow += pageConfig.rowFractions[r];
      rowOffsets.push(accRow);
    }

    const marginPx = margin * (200 / 210);
    const gapPx = gap * (200 / 210);

    return (
      <div 
        key={pageIndex}
        className="relative bg-white border border-slate-300 shadow-sm overflow-hidden select-none shrink-0"
        style={{ 
          width: '200px', 
          height: `${200 / previewRatio}px`,
          padding: `${marginPx}px`,
        }}
      >
        <div className="absolute top-1 left-1 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded-sm z-20 pointer-events-none shadow-sm backdrop-blur-sm font-medium tracking-wide">Page {pageIndex + 1}</div>
        
        {/* Draw the Grid cells & Vertical dividers inside rows */}
        <div className="w-full h-full relative" style={{ display: 'flex', flexDirection: 'column', gap: `${gapPx}px` }}>
          {Array.from({ length: pageConfig.rows }).map((_, r) => {
            const rColFractions = pageConfig.colFractions[r];
            
            // Calculate column offsets for this specific row
            const colOffsets: number[] = [];
            let accCol = 0;
            for (let c = 0; c < pageConfig.cols; c++) {
              accCol += rColFractions[c];
              colOffsets.push(accCol);
            }

            return (
              <div key={`row-${r}`} className="w-full flex relative" style={{ height: `calc(${pageConfig.rowFractions[r] * 100}% - ${gapPx * (pageConfig.rows - 1) / pageConfig.rows}px)`, gap: `${gapPx}px` }}>
                {Array.from({ length: pageConfig.cols }).map((_, c) => {
                  const slotIndex = pageIndex * layout + (r * pageConfig.cols + c);
                  return (
                    <div key={`cell-${c}`} className="h-full border border-blue-400 border-dashed bg-blue-50/50 flex items-center justify-center relative" style={{ width: `calc(${rColFractions[c] * 100}% - ${gapPx * (pageConfig.cols - 1) / pageConfig.cols}px)` }}>
                      {slotIndex < (pageIndex + 1) * layout ? renderCellContent(slotIndex) : null}
                    </div>
                  );
                })}
                
                {/* Vertical Dividers scoped to this row */}
                {!isGridLocked && colOffsets.slice(0, -1).map((offset, i) => (
                  <div 
                    key={`vdiv-${r}-${i}`}
                    className="w-2 bg-blue-500/0 cursor-col-resize absolute top-0 bottom-0 z-10 hover:bg-blue-500/50 transition-all -translate-x-1/2" 
                    style={{ left: `calc(${offset * 100}%)` }}
                    onMouseDown={(e) => handleDividerDrag(e, pageIndex, i, 'col', r)}
                  />
                ))}
              </div>
            );
          })}
        </div>

        {/* Horizontal Dividers (Rows) */}
        {!isGridLocked && rowOffsets.slice(0, -1).map((offset, i) => (
          <div 
            key={`hdiv-${i}`}
            className="h-2 bg-blue-500/0 cursor-row-resize absolute left-0 right-0 z-10 hover:bg-blue-500/50 transition-all -translate-y-1/2" 
            style={{ top: `calc(${marginPx}px + ${offset} * (100% - ${marginPx * 2}px))` }}
            onMouseDown={(e) => handleDividerDrag(e, pageIndex, i, 'row')}
          />
        ))}
      </div>
    );
  };

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

          <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-2 py-1 bg-slate-50">
            <label className="text-[10px] font-semibold text-slate-500 uppercase">Rotate</label>
            <select
              value={globalRotation}
              onChange={(e) => handleGlobalRotationChange(Number(e.target.value))}
              className="text-xs bg-transparent font-medium text-slate-700 outline-none"
              title="Rotate all images to maximize paper space"
            >
              <option value={0}>0°</option>
              <option value={90}>90°</option>
              <option value={180}>180°</option>
              <option value={270}>270°</option>
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
              {images.map((img, i) => (
                <div key={img.id || i} className="relative group aspect-square rounded-lg border border-slate-200 overflow-hidden bg-slate-100 flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={img.src} 
                    alt="Upload" 
                    className="w-full h-full object-cover transition-transform duration-200" 
                    style={{ transform: `rotate(${img.rotation}deg)` }}
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition flex items-center justify-center gap-1.5">
                    <button 
                      type="button"
                      onClick={() => setCroppingIndex(i)} 
                      title="Crop image" 
                      className="bg-white text-slate-700 hover:text-blue-600 p-1.5 rounded-full hover:scale-110 transition shadow-xs"
                    >
                      <Crop className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      type="button"
                      onClick={() => rotateImage(i)} 
                      title={`Rotate image (currently ${img.rotation}°)`} 
                      className="bg-white text-slate-700 hover:text-blue-600 p-1.5 rounded-full hover:scale-110 transition shadow-xs"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      type="button"
                      onClick={() => duplicateImage(i)} 
                      title="Duplicate image" 
                      className="bg-white text-slate-700 hover:text-blue-600 p-1.5 rounded-full hover:scale-110 transition shadow-xs"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      type="button"
                      onClick={() => removeImage(i)} 
                      title="Remove image" 
                      className="bg-white text-red-600 hover:text-red-700 p-1.5 rounded-full hover:scale-110 transition shadow-xs"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="absolute top-1 left-1 bg-black/60 text-white text-[10px] px-1.5 rounded font-mono">
                    {i + 1}
                  </div>
                  {img.rotation > 0 && (
                    <div className="absolute bottom-1 right-1 bg-blue-600/90 text-white text-[9px] px-1 py-0.5 rounded font-mono font-bold shadow-xs">
                      {img.rotation}°
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Layout Preview */}
        <div className="w-full md:w-[280px] flex-shrink-0 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col items-center">
          <div className="w-full flex flex-col gap-3 mb-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-800 text-sm">Preview</h3>
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-[10px] font-semibold text-slate-500 uppercase">Unified Layout</span>
                <div className="relative inline-block w-8 h-4 bg-slate-200 rounded-full">
                  <input 
                    type="checkbox" 
                    className="peer sr-only" 
                    checked={unifiedLayout} 
                    onChange={(e) => setUnifiedLayout(e.target.checked)} 
                    disabled={isGridLocked}
                  />
                  <div className="absolute left-0.5 top-0.5 bg-white w-3 h-3 rounded-full transition-transform peer-checked:translate-x-4 peer-checked:bg-blue-500 shadow-sm"></div>
                </div>
              </label>
            </div>
            
            <div className="flex items-center justify-between border-t border-slate-100 pt-3">
              <button 
                onClick={() => setPageFractions([])}
                className="text-[10px] font-semibold text-slate-500 hover:text-blue-600 transition"
              >
                RESET GRID
              </button>
              
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-[10px] font-semibold text-slate-500 uppercase">Lock Grid</span>
                <div className="relative inline-block w-8 h-4 bg-slate-200 rounded-full">
                  <input 
                    type="checkbox" 
                    className="peer sr-only" 
                    checked={isGridLocked} 
                    onChange={(e) => {
                      setIsGridLocked(e.target.checked);
                      if (e.target.checked) setPageFractions([]);
                    }} 
                  />
                  <div className="absolute left-0.5 top-0.5 bg-white w-3 h-3 rounded-full transition-transform peer-checked:translate-x-4 peer-checked:bg-blue-500 shadow-sm"></div>
                </div>
              </label>
            </div>
          </div>
          
          <p className="text-[10px] text-slate-500 w-full mb-4 leading-tight text-center">
            {layout > 1
              ? (isGridLocked ? "Grid is locked to perfect even fractions." : "Drag the grid dividers to adjust cell sizes. Columns magnetically snap.")
              : "Image fits inside the bounding cell."}
          </p>
          
          <div className="w-full overflow-y-auto pr-2 max-h-[600px] flex flex-col items-center gap-6 pb-2" style={{ scrollbarWidth: 'thin' }}>
            {Array.from({ length: totalPages }).map((_, i) => renderPreviewPage(i))}
          </div>
        </div>
      </div>

      {/* Crop Modal */}
      {croppingIndex !== null && images[croppingIndex] && (
        <BatchCropModal
          isOpen={croppingIndex !== null}
          imageSrc={images[croppingIndex].src}
          cellAspectRatio={currentCellRatio}
          onClose={() => setCroppingIndex(null)}
          onSave={handleSaveCrop}
        />
      )}
    </div>
  );
}
