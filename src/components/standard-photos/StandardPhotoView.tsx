'use client';

import React, { useState, useRef } from 'react';
import { StandardSizeKey, PaperSizeKey, STANDARD_PHOTO_SIZES, PAPER_SIZES } from '@/lib/standard-sizes';
import { UploadCloud, Image as ImageIcon, Trash2, Printer, Download, Crop, Plus, Minus, X, RotateCw } from 'lucide-react';
import StandardPhotoCropperModal from './StandardPhotoCropperModal';
import { generateStandardPhotosPdf, calculatePaperLayout } from '@/lib/standard-pdf-generator';

interface PhotoItem {
  id: string;
  originalImage: string;
  croppedImage: string; // The ready-to-print image
  copies: number;
  rotation: number;
}

export default function StandardPhotoView({ initialFile }: { initialFile?: File }) {
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [targetSize, setTargetSize] = useState<StandardSizeKey>('4R');
  const [paperSize, setPaperSize] = useState<PaperSizeKey>('a4');
  const [isExporting, setIsExporting] = useState(false);

  const [editingPhotoId, setEditingPhotoId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle incoming file from print queue
  React.useEffect(() => {
    if (initialFile) {
      const processFile = async () => {
        const url = URL.createObjectURL(initialFile);
        const cropped = await autoCropImage(url, targetSize);
        setPhotos(prev => [...prev, {
          id: Math.random().toString(36).substring(7),
          originalImage: url,
          croppedImage: cropped,
          copies: 1,
          rotation: 0
        }]);
      };
      processFile();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialFile]);

  // Helper to auto-crop an image (center cover) to base64
  const autoCropImage = (src: string, sizeKey: StandardSizeKey, rotation: number = 0): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const target = STANDARD_PHOTO_SIZES[sizeKey];
        const pxPerMm = 11.81;
        const canvasW = Math.round(target.widthMm * pxPerMm);
        const canvasH = Math.round(target.heightMm * pxPerMm);
        
        const canvas = document.createElement('canvas');
        canvas.width = canvasW;
        canvas.height = canvasH;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(src);

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvasW, canvasH);

        // Calculate rotated natural dimensions
        let naturalW = img.naturalWidth;
        let naturalH = img.naturalHeight;
        if (rotation === 90 || rotation === 270) {
          naturalW = img.naturalHeight;
          naturalH = img.naturalWidth;
        }

        const imgAspect = naturalW / naturalH;
        const targetAspect = canvasW / canvasH;

        let drawW = canvasW;
        let drawH = canvasH;

        if (imgAspect > targetAspect) {
          // Image is wider than target
          drawW = naturalH * targetAspect;
          drawH = naturalH;
        } else {
          // Image is taller than target
          drawW = naturalW;
          drawH = naturalW / targetAspect;
        }

        // Draw the image centered and scaled, applying rotation
        ctx.save();
        ctx.translate(canvasW / 2, canvasH / 2);
        
        // Scale to fit target dimensions
        const scale = canvasW / drawW;
        ctx.scale(scale, scale);
        
        // Rotate
        ctx.rotate((rotation * Math.PI) / 180);
        
        // Draw centered
        ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
        
        ctx.restore();
        resolve(canvas.toDataURL('image/jpeg', 0.95));
      };
      img.onerror = () => resolve(src);
      img.src = src;
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (const file of Array.from(files)) {
      if (file.type.startsWith('image/')) {
        const url = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (ev) => resolve(ev.target?.result as string);
          reader.readAsDataURL(file);
        });

        const cropped = await autoCropImage(url, targetSize);
        
        setPhotos(prev => [...prev, {
          id: Math.random().toString(36).substring(7),
          originalImage: url,
          croppedImage: cropped,
          copies: 1,
          rotation: 0,
        }]);
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleTargetSizeChange = async (newSize: StandardSizeKey) => {
    setTargetSize(newSize);
    // Re-auto-crop all images to the new target size aspect ratio
    const updated = await Promise.all(photos.map(async p => {
      const newCropped = await autoCropImage(p.originalImage, newSize, p.rotation);
      return { ...p, croppedImage: newCropped };
    }));
    setPhotos(updated);
  };

  const updateCopies = (id: string, delta: number) => {
    setPhotos(prev => prev.map(p => {
      if (p.id === id) {
        return { ...p, copies: Math.max(1, p.copies + delta) };
      }
      return p;
    }));
  };

  const removePhoto = (id: string) => {
    setPhotos(prev => prev.filter(p => p.id !== id));
  };

  const rotatePhoto = async (id: string) => {
    const photo = photos.find(p => p.id === id);
    if (!photo) return;
    const newRotation = (photo.rotation + 90) % 360;
    const newCropped = await autoCropImage(photo.originalImage, targetSize, newRotation);
    setPhotos(prev => prev.map(p => p.id === id ? { ...p, rotation: newRotation, croppedImage: newCropped } : p));
  };

  const handleSaveCrop = (croppedBase64: string) => {
    setPhotos(prev => prev.map(p => {
      if (p.id === editingPhotoId) {
        return { ...p, croppedImage: croppedBase64 };
      }
      return p;
    }));
    setEditingPhotoId(null);
  };

  const exportPdf = async (print: boolean) => {
    if (photos.length === 0) return;
    setIsExporting(true);
    try {
      const items = photos.map(p => ({
        id: p.id,
        processedImage: p.croppedImage,
        copies: p.copies
      }));
      const doc = await generateStandardPhotosPdf(items, targetSize, paperSize);
      
      if (print) {
        const blob = doc.output('blob');
        const blobUrl = URL.createObjectURL(blob);
        const printWindow = window.open(blobUrl, '_blank');
        if (printWindow) {
          printWindow.focus();
        } else {
          doc.save('Standard_Photos.pdf');
        }
      } else {
        doc.save('Standard_Photos.pdf');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to generate PDF.');
    } finally {
      setIsExporting(false);
    }
  };

  const editingPhoto = photos.find(p => p.id === editingPhotoId);

  const totalPrints = photos.reduce((sum, p) => sum + p.copies, 0);

  return (
    <div className="flex flex-col gap-5">
      {/* Top Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white px-5 py-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            Standard Photos <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider">New</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Print standard sizes (2R, 3R, 4R, etc.) on standard paper.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-2 py-1 bg-slate-50">
            <label className="text-[10px] font-semibold text-slate-500 uppercase">Target Size</label>
            <select 
              value={targetSize} 
              onChange={(e) => handleTargetSizeChange(e.target.value as StandardSizeKey)}
              className="text-xs bg-transparent font-medium text-slate-700 outline-none cursor-pointer"
            >
              {Object.entries(STANDARD_PHOTO_SIZES).map(([key, size]) => (
                <option key={key} value={key}>{size.label}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-2 py-1 bg-slate-50">
            <label className="text-[10px] font-semibold text-slate-500 uppercase">Paper Size</label>
            <select 
              value={paperSize} 
              onChange={(e) => setPaperSize(e.target.value as PaperSizeKey)}
              className="text-xs bg-transparent font-medium text-slate-700 outline-none cursor-pointer"
            >
              <option value="a4">A4</option>
              <option value="letter">Letter</option>
              <option value="legal">Legal</option>
            </select>
          </div>

          <div className="h-5 w-px bg-slate-200 mx-1" />

          <button
            onClick={() => exportPdf(false)}
            disabled={isExporting || photos.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg disabled:opacity-50 transition shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Download PDF</span>
          </button>
          
          <button
            onClick={() => exportPdf(true)}
            disabled={isExporting || photos.length === 0}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 shadow-sm transition"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print ({totalPrints})</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-5 items-start">
        {/* Left: Uploader */}
        <div className="w-full md:w-64 flex-shrink-0 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col">
          <div 
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files) {
                 // handle drop logic here if needed, or just let file input handle click
              }
            }}
            className="border-2 border-dashed border-slate-300 rounded-xl p-6 flex flex-col items-center justify-center text-center bg-slate-50 hover:bg-blue-50 hover:border-blue-300 transition cursor-pointer mb-5"
            onClick={() => fileInputRef.current?.click()}
          >
            <UploadCloud className="w-8 h-8 text-blue-500 mb-2" />
            <p className="text-sm font-semibold text-slate-700">Add Photos</p>
            <p className="text-xs text-slate-500 mt-1">JPEG, PNG</p>
            <input 
              type="file" 
              multiple 
              accept="image/*" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleFileUpload}
            />
          </div>

          <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-100">
            <p className="font-semibold text-slate-700 mb-1 flex items-center gap-1"><ImageIcon className="w-3 h-3"/> Instructions:</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Upload photos you want to print.</li>
              <li>They are automatically center-cropped to fit {STANDARD_PHOTO_SIZES[targetSize].label}.</li>
              <li>Click <strong>Crop</strong> to adjust framing manually.</li>
              <li>Adjust the number of copies for each.</li>
            </ul>
          </div>
        </div>

        {/* Center: Gallery */}
        <div className="flex-1 w-full bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs min-h-[400px]">
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
            <h3 className="font-semibold text-slate-800 text-sm">Photos to Print ({photos.length})</h3>
            {photos.length > 0 && (
              <button onClick={() => setPhotos([])} className="text-xs text-red-500 hover:bg-red-50 px-2 py-1 rounded flex items-center gap-1 transition font-medium">
                <Trash2 className="w-3.5 h-3.5" /> Clear All
              </button>
            )}
          </div>

          {photos.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400">
              <ImageIcon className="w-12 h-12 mb-3 text-slate-200" />
              <p className="text-sm font-medium">No photos uploaded yet</p>
              <p className="text-xs">Click 'Add Photos' to start</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {photos.map(p => (
                <div key={p.id} className="group relative bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs hover:shadow-md transition">
                  <div className="relative aspect-square bg-slate-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.croppedImage} alt="Preview" className="w-full h-full object-contain p-2" />
                    
                    {/* Hover Actions */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button 
                        onClick={() => rotatePhoto(p.id)}
                        className="bg-white text-slate-800 p-1.5 rounded-full hover:scale-110 transition"
                        title="Rotate"
                      >
                        <RotateCw className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => setEditingPhotoId(p.id)}
                        className="bg-white text-slate-800 p-1.5 rounded-full hover:scale-110 transition"
                        title="Manual Crop"
                      >
                        <Crop className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => removePhoto(p.id)}
                        className="bg-red-500 text-white p-1.5 rounded-full hover:scale-110 transition"
                        title="Remove"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Copies Controls */}
                  <div className="p-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase">Copies</span>
                    <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-md p-0.5 shadow-2xs">
                      <button 
                        onClick={() => updateCopies(p.id, -1)} 
                        disabled={p.copies <= 1}
                        className="p-0.5 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-xs font-bold text-slate-800 w-4 text-center">{p.copies}</span>
                      <button 
                        onClick={() => updateCopies(p.id, 1)}
                        className="p-0.5 text-slate-400 hover:text-slate-700 rounded"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Paper Preview */}
        <div className="w-full md:w-80 flex-shrink-0 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col items-center">
          <h3 className="font-semibold text-slate-800 text-sm w-full mb-4">Paper Preview</h3>
          <p className="text-[10px] text-slate-500 w-full mb-4 leading-tight text-center">
            {PAPER_SIZES[paperSize].label} divided into {calculatePaperLayout(targetSize, paperSize).photosPerPage} slots for {STANDARD_PHOTO_SIZES[targetSize].label}
          </p>
          
          <div className="relative bg-white border border-slate-300 shadow-sm overflow-hidden select-none flex items-center justify-center"
               style={{
                 width: '240px',
                 height: `${240 * (PAPER_SIZES[paperSize].heightMm / PAPER_SIZES[paperSize].widthMm)}px`,
               }}>
            
            {(() => {
              const layout = calculatePaperLayout(targetSize, paperSize);
              const { cols, rows, drawW, drawH, photosPerPage, paddingMm, paperWidth, paperHeight } = layout;
              
              const scale = 240 / paperWidth;
              
              const gridW = cols * drawW;
              const gridH = rows * drawH;
              const startX = paddingMm + (paperWidth - paddingMm * 2 - gridW) / 2;
              const startY = paddingMm + (paperHeight - paddingMm * 2 - gridH) / 2;
              
              // Flatten photos
              const flattenedPhotos: string[] = [];
              for (const p of photos) {
                for (let i = 0; i < p.copies; i++) {
                  flattenedPhotos.push(p.croppedImage);
                }
              }

              return (
                <div className="absolute" style={{
                  top: startY * scale,
                  left: startX * scale,
                  width: gridW * scale,
                  height: gridH * scale,
                  display: 'grid',
                  gridTemplateColumns: `repeat(${cols}, ${drawW * scale}px)`,
                  gridTemplateRows: `repeat(${rows}, ${drawH * scale}px)`,
                }}>
                  {Array.from({ length: photosPerPage }).map((_, i) => {
                    const src = flattenedPhotos[i];
                    return (
                      <div key={i} className="border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden">
                        {src ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={src} alt="Slot" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-slate-300 text-[10px]">{i + 1}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
          <div className="mt-4 text-[10px] text-slate-400 text-center">
            {photos.length === 0 ? "Empty slots" : `Showing page 1`}
          </div>
        </div>
      </div>

      <StandardPhotoCropperModal
        isOpen={editingPhotoId !== null}
        imageUrl={editingPhoto?.originalImage || null}
        targetSizeKey={targetSize}
        rotation={editingPhoto?.rotation || 0}
        onClose={() => setEditingPhotoId(null)}
        onSave={handleSaveCrop}
      />
    </div>
  );
}
