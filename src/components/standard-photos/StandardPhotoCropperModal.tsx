'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { StandardSizeKey, STANDARD_PHOTO_SIZES } from '@/lib/standard-sizes';
import { ZoomIn, ZoomOut, Check, X } from 'lucide-react';

interface StandardPhotoCropperModalProps {
  isOpen: boolean;
  imageUrl: string | null;
  targetSizeKey: StandardSizeKey;
  onClose: () => void;
  onSave: (croppedBase64: string) => void;
}

export default function StandardPhotoCropperModal({
  isOpen,
  imageUrl,
  targetSizeKey,
  onClose,
  onSave,
}: StandardPhotoCropperModalProps) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);

  const targetSize = STANDARD_PHOTO_SIZES[targetSizeKey];

  useEffect(() => {
    if (isOpen && imageUrl) {
      setZoom(1);
      setRotation(0);
      setPanX(0);
      setPanY(0);
      const img = new Image();
      img.onload = () => {
        setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.src = imageUrl;
    }
  }, [isOpen, imageUrl, targetSizeKey]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - panX, y: e.clientY - panY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPanX(e.clientX - dragStart.x);
    setPanY(e.clientY - dragStart.y);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    // Zoom in/out via mouse wheel
    const zoomSensitivity = 0.001;
    const newZoom = Math.max(0.1, Math.min(5, zoom - e.deltaY * zoomSensitivity));
    setZoom(newZoom);
  };

  const handleSave = async () => {
    if (!imageUrl || !naturalSize) return;

    // The display frame dimensions in the modal UI
    const frameW = 300;
    const frameH = 300 * (targetSize.heightMm / targetSize.widthMm);

    // Render cropped image
    const canvas = document.createElement('canvas');
    // For print quality, we want a high-resolution canvas. 
    // Assuming 300 DPI, 1 inch = 25.4 mm -> 300 / 25.4 = 11.81 pixels per mm
    const pxPerMm = 11.81;
    const canvasW = Math.round(targetSize.widthMm * pxPerMm);
    const canvasH = Math.round(targetSize.heightMm * pxPerMm);
    
    canvas.width = canvasW;
    canvas.height = canvasH;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;
    
    await new Promise((resolve) => {
      if (img.complete) resolve(true);
      else img.onload = () => resolve(true);
    });

    // White background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvasW, canvasH);

    ctx.save();
    
    // UI base scale to fit the image into the preview frame initially
    const baseScale = Math.max(frameW / naturalSize.width, frameH / naturalSize.height);
    const displayW = naturalSize.width * baseScale;
    const displayH = naturalSize.height * baseScale;

    // Scale factor from UI frame to final high-res Canvas
    const scaleFactor = canvasW / frameW;

    ctx.translate(canvasW / 2 + panX * scaleFactor, canvasH / 2 + panY * scaleFactor);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(zoom, zoom);

    const drawW = displayW * scaleFactor;
    const drawH = displayH * scaleFactor;
    ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();

    onSave(canvas.toDataURL('image/jpeg', 0.95));
  };

  if (!isOpen) return null;

  // Frame preview dimensions
  const frameW = 300;
  const frameH = 300 * (targetSize.heightMm / targetSize.widthMm);

  const baseScale = naturalSize ? Math.max(frameW / naturalSize.width, frameH / naturalSize.height) : 1;
  const displayW = naturalSize ? naturalSize.width * baseScale : frameW;
  const displayH = naturalSize ? naturalSize.height * baseScale : frameH;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col">
        <div className="border-b border-slate-100 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Crop to {targetSize.label}</h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 transition rounded-full hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 flex flex-col items-center bg-slate-50/50">
          <div className="text-xs text-slate-500 mb-4">Drag to pan, scroll to zoom</div>
          
          <div 
            className="relative bg-white shadow-md border border-slate-300 overflow-hidden cursor-grab active:cursor-grabbing"
            style={{ width: frameW, height: frameH }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
          >
            {imageUrl && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl}
                  alt="Crop preview"
                  style={{
                    width: `${displayW}px`,
                    height: `${displayH}px`,
                    maxWidth: 'none',
                    maxHeight: 'none',
                    transform: `translate(${panX}px, ${panY}px) rotate(${rotation}deg) scale(${zoom})`,
                    transformOrigin: 'center center'
                  }}
                />
              </div>
            )}
          </div>

          <div className="flex items-center gap-4 mt-6">
            <button onClick={() => setZoom(z => Math.max(0.1, z - 0.1))} className="p-2 bg-white border border-slate-200 rounded-full text-slate-600 hover:bg-slate-50 shadow-xs">
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono w-12 text-center text-slate-500">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(z => Math.min(5, z + 0.1))} className="p-2 bg-white border border-slate-200 rounded-full text-slate-600 hover:bg-slate-50 shadow-xs">
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-3 mt-4 w-full max-w-[240px]">
            <span className="text-xs font-semibold text-slate-500 w-16">Rotate</span>
            <input 
              type="range" 
              min="0" 
              max="90" 
              value={rotation} 
              onChange={(e) => setRotation(Number(e.target.value))}
              className="flex-1 accent-blue-600 h-1.5 bg-slate-200 rounded-lg appearance-none"
            />
            <span className="text-xs font-mono w-8 text-right text-slate-500">{rotation}°</span>
          </div>
        </div>

        <div className="border-t border-slate-100 px-6 py-4 flex justify-end gap-3 bg-white">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition">
            Cancel
          </button>
          <button onClick={handleSave} className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition">
            <Check className="w-4 h-4" />
            Apply Crop
          </button>
        </div>
      </div>
    </div>
  );
}
