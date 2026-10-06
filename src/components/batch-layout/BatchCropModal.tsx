'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Check, RotateCcw, Crop as CropIcon } from 'lucide-react';

export type AspectRatioPreset = 'free' | 'cell' | 'original' | '1:1' | '4:3' | '3:2' | '16:9';

interface CropBox {
  x: number; // 0 to 1
  y: number; // 0 to 1
  w: number; // 0 to 1
  h: number; // 0 to 1
}

interface BatchCropModalProps {
  isOpen: boolean;
  imageSrc: string | null;
  cellAspectRatio?: number;
  onClose: () => void;
  onSave: (croppedBase64: string) => void;
}

type DragType = 'move' | 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'w' | 'e';

export default function BatchCropModal({
  isOpen,
  imageSrc,
  cellAspectRatio,
  onClose,
  onSave,
}: BatchCropModalProps) {
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);
  const [crop, setCrop] = useState<CropBox>({ x: 0, y: 0, w: 1, h: 1 });
  const [activePreset, setActivePreset] = useState<AspectRatioPreset>('free');

  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const isDraggingRef = useRef(false);
  const dragTypeRef = useRef<DragType>('move');
  const dragStartRef = useRef<{ clientX: number; clientY: number; crop: CropBox }>({
    clientX: 0,
    clientY: 0,
    crop: { x: 0, y: 0, w: 1, h: 1 },
  });

  // Load natural image dimensions
  useEffect(() => {
    if (isOpen && imageSrc) {
      setCrop({ x: 0, y: 0, w: 1, h: 1 });
      setActivePreset('free');
      const img = new Image();
      img.onload = () => {
        setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.src = imageSrc;
    }
  }, [isOpen, imageSrc]);

  // Keyboard shortcut: Esc to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Apply preset ratio
  const applyPreset = useCallback(
    (preset: AspectRatioPreset) => {
      setActivePreset(preset);
      if (!naturalSize || preset === 'free') return;

      let targetRatio = 1;
      if (preset === '1:1') targetRatio = 1;
      else if (preset === '4:3') targetRatio = 4 / 3;
      else if (preset === '3:2') targetRatio = 3 / 2;
      else if (preset === '16:9') targetRatio = 16 / 9;
      else if (preset === 'original') targetRatio = naturalSize.width / naturalSize.height;
      else if (preset === 'cell' && cellAspectRatio) targetRatio = cellAspectRatio;

      const imgRatio = naturalSize.width / naturalSize.height;

      // targetRatio in pixel space: (w * naturalW) / (h * naturalH) = targetRatio
      // Therefore (w / h) in normalized space = targetRatio / imgRatio
      const normalizedRatio = targetRatio / imgRatio;

      let newW = 1;
      let newH = 1;

      if (normalizedRatio <= 1) {
        newW = normalizedRatio;
        newH = 1;
      } else {
        newW = 1;
        newH = 1 / normalizedRatio;
      }

      // Center the crop box
      const newX = (1 - newW) / 2;
      const newY = (1 - newH) / 2;

      setCrop({
        x: Math.max(0, newX),
        y: Math.max(0, newY),
        w: Math.min(1, newW),
        h: Math.min(1, newH),
      });
    },
    [naturalSize, cellAspectRatio]
  );

  const startDrag = (e: React.MouseEvent | React.TouchEvent, type: DragType) => {
    e.preventDefault();
    e.stopPropagation();
    isDraggingRef.current = true;
    dragTypeRef.current = type;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    dragStartRef.current = {
      clientX,
      clientY,
      crop: { ...crop },
    };
  };

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      if (!isDraggingRef.current || !imgRef.current) return;

      const rect = imgRef.current.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      const dx = (clientX - dragStartRef.current.clientX) / rect.width;
      const dy = (clientY - dragStartRef.current.clientY) / rect.height;
      const start = dragStartRef.current.crop;
      const type = dragTypeRef.current;

      const MIN_SIZE = 0.05; // min 5% size

      let newCrop = { ...start };

      if (type === 'move') {
        const clampedX = Math.max(0, Math.min(1 - start.w, start.x + dx));
        const clampedY = Math.max(0, Math.min(1 - start.h, start.y + dy));
        newCrop = { ...start, x: clampedX, y: clampedY };
      } else {
        let x = start.x;
        let y = start.y;
        let w = start.w;
        let h = start.h;

        if (type.includes('w')) {
          const right = start.x + start.w;
          x = Math.max(0, Math.min(right - MIN_SIZE, start.x + dx));
          w = right - x;
        }
        if (type.includes('e')) {
          w = Math.max(MIN_SIZE, Math.min(1 - start.x, start.w + dx));
        }
        if (type.includes('n')) {
          const bottom = start.y + start.h;
          y = Math.max(0, Math.min(bottom - MIN_SIZE, start.y + dy));
          h = bottom - y;
        }
        if (type.includes('s')) {
          h = Math.max(MIN_SIZE, Math.min(1 - start.y, start.h + dy));
        }

        // If locked to a ratio, adjust width or height
        if (activePreset !== 'free' && naturalSize) {
          let targetRatio = 1;
          if (activePreset === '1:1') targetRatio = 1;
          else if (activePreset === '4:3') targetRatio = 4 / 3;
          else if (activePreset === '3:2') targetRatio = 3 / 2;
          else if (activePreset === '16:9') targetRatio = 16 / 9;
          else if (activePreset === 'original') targetRatio = naturalSize.width / naturalSize.height;
          else if (activePreset === 'cell' && cellAspectRatio) targetRatio = cellAspectRatio;

          const imgRatio = naturalSize.width / naturalSize.height;
          const normalizedRatio = targetRatio / imgRatio;

          if (type === 'e' || type === 'w' || type === 'se' || type === 'sw') {
            h = w / normalizedRatio;
            if (y + h > 1) {
              h = 1 - y;
              w = h * normalizedRatio;
            }
          } else {
            w = h * normalizedRatio;
            if (x + w > 1) {
              w = 1 - x;
              h = w / normalizedRatio;
            }
          }
        }

        newCrop = {
          x: Math.max(0, Math.min(1 - MIN_SIZE, x)),
          y: Math.max(0, Math.min(1 - MIN_SIZE, y)),
          w: Math.max(MIN_SIZE, Math.min(1 - x, w)),
          h: Math.max(MIN_SIZE, Math.min(1 - y, h)),
        };
      }

      setCrop(newCrop);
    };

    const handlePointerUp = () => {
      isDraggingRef.current = false;
    };

    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);
    window.addEventListener('touchmove', handlePointerMove, { passive: false });
    window.addEventListener('touchend', handlePointerUp);

    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchend', handlePointerUp);
    };
  }, [isOpen, activePreset, naturalSize, cellAspectRatio]);

  const handleApply = () => {
    if (!imageSrc || !naturalSize) return;

    const canvas = document.createElement('canvas');
    const naturalW = naturalSize.width;
    const naturalH = naturalSize.height;

    const sourceX = Math.round(crop.x * naturalW);
    const sourceY = Math.round(crop.y * naturalH);
    const sourceW = Math.max(1, Math.round(crop.w * naturalW));
    const sourceH = Math.max(1, Math.round(crop.h * naturalH));

    canvas.width = sourceW;
    canvas.height = sourceH;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      ctx.drawImage(img, sourceX, sourceY, sourceW, sourceH, 0, 0, sourceW, sourceH);
      onSave(canvas.toDataURL('image/png'));
      onClose();
    };
    img.src = imageSrc;
  };

  const handleReset = () => {
    setCrop({ x: 0, y: 0, w: 1, h: 1 });
    setActivePreset('free');
  };

  if (!isOpen || !imageSrc) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 sm:p-4">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="border-b border-slate-100 px-5 py-3.5 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
              <CropIcon className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900">Crop Image</h2>
              <p className="text-[11px] text-slate-500">Drag corners or box to adjust framing</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Aspect Ratio Toolbar */}
        <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-200/80 flex items-center gap-1.5 overflow-x-auto text-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase mr-1">Aspect:</span>
          {(
            [
              { id: 'free', label: 'Freeform' },
              ...(cellAspectRatio ? [{ id: 'cell', label: 'Cell Ratio' }] : []),
              { id: 'original', label: 'Original' },
              { id: '1:1', label: '1:1' },
              { id: '4:3', label: '4:3' },
              { id: '3:2', label: '3:2' },
              { id: '16:9', label: '16:9' },
            ] as { id: AspectRatioPreset; label: string }[]
          ).map((item) => (
            <button
              key={item.id}
              onClick={() => applyPreset(item.id)}
              className={`px-2.5 py-1 rounded-md font-medium transition text-xs whitespace-nowrap ${
                activePreset === item.id
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              {item.label}
            </button>
          ))}

          <button
            onClick={handleReset}
            className="ml-auto flex items-center gap-1 px-2.5 py-1 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-100 rounded-md transition text-xs font-medium whitespace-nowrap"
            title="Reset crop box to full image"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        </div>

        {/* Interactive Workspace */}
        <div
          ref={containerRef}
          className="flex-1 bg-slate-900/95 flex items-center justify-center p-4 sm:p-6 overflow-hidden min-h-[300px] select-none"
        >
          <div className="relative inline-block max-w-full max-h-[58vh]">
            {/* The Image */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={imageSrc}
              alt="Crop target"
              className="block max-w-full max-h-[58vh] object-contain pointer-events-none select-none rounded-xs shadow-md"
            />

            {/* Darkened Overlays (4 segments around crop box) */}
            <div
              className="absolute bg-black/60 pointer-events-none"
              style={{ top: 0, left: 0, right: 0, height: `${crop.y * 100}%` }}
            />
            <div
              className="absolute bg-black/60 pointer-events-none"
              style={{
                top: `${(crop.y + crop.h) * 100}%`,
                left: 0,
                right: 0,
                bottom: 0,
              }}
            />
            <div
              className="absolute bg-black/60 pointer-events-none"
              style={{
                top: `${crop.y * 100}%`,
                left: 0,
                width: `${crop.x * 100}%`,
                height: `${crop.h * 100}%`,
              }}
            />
            <div
              className="absolute bg-black/60 pointer-events-none"
              style={{
                top: `${crop.y * 100}%`,
                left: `${(crop.x + crop.w) * 100}%`,
                right: 0,
                height: `${crop.h * 100}%`,
              }}
            />

            {/* The Crop Rectangle */}
            <div
              className="absolute border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.5)] cursor-move"
              style={{
                top: `${crop.y * 100}%`,
                left: `${crop.x * 100}%`,
                width: `${crop.w * 100}%`,
                height: `${crop.h * 100}%`,
              }}
              onMouseDown={(e) => startDrag(e, 'move')}
              onTouchStart={(e) => startDrag(e, 'move')}
            >
              {/* Rule of Thirds Grid Lines */}
              <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3">
                <div className="border-r border-b border-white/30" />
                <div className="border-r border-b border-white/30" />
                <div className="border-b border-white/30" />
                <div className="border-r border-b border-white/30" />
                <div className="border-r border-b border-white/30" />
                <div className="border-b border-white/30" />
                <div className="border-r border-white/30" />
                <div className="border-r border-white/30" />
                <div />
              </div>

              {/* Corner Handles */}
              {/* Top-Left */}
              <div
                className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-white border border-slate-700 rounded-xs cursor-nwse-resize hover:scale-125 transition-transform"
                onMouseDown={(e) => startDrag(e, 'nw')}
                onTouchStart={(e) => startDrag(e, 'nw')}
              />
              {/* Top-Right */}
              <div
                className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-white border border-slate-700 rounded-xs cursor-nesw-resize hover:scale-125 transition-transform"
                onMouseDown={(e) => startDrag(e, 'ne')}
                onTouchStart={(e) => startDrag(e, 'ne')}
              />
              {/* Bottom-Left */}
              <div
                className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 bg-white border border-slate-700 rounded-xs cursor-nesw-resize hover:scale-125 transition-transform"
                onMouseDown={(e) => startDrag(e, 'sw')}
                onTouchStart={(e) => startDrag(e, 'sw')}
              />
              {/* Bottom-Right */}
              <div
                className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-white border border-slate-700 rounded-xs cursor-nwse-resize hover:scale-125 transition-transform"
                onMouseDown={(e) => startDrag(e, 'se')}
                onTouchStart={(e) => startDrag(e, 'se')}
              />

              {/* Edge Handles */}
              {/* Top */}
              <div
                className="absolute -top-1 left-1/2 -translate-x-1/2 w-6 h-2 bg-white/80 border border-slate-700 rounded-full cursor-ns-resize"
                onMouseDown={(e) => startDrag(e, 'n')}
                onTouchStart={(e) => startDrag(e, 'n')}
              />
              {/* Bottom */}
              <div
                className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-6 h-2 bg-white/80 border border-slate-700 rounded-full cursor-ns-resize"
                onMouseDown={(e) => startDrag(e, 's')}
                onTouchStart={(e) => startDrag(e, 's')}
              />
              {/* Left */}
              <div
                className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-6 bg-white/80 border border-slate-700 rounded-full cursor-ew-resize"
                onMouseDown={(e) => startDrag(e, 'w')}
                onTouchStart={(e) => startDrag(e, 'w')}
              />
              {/* Right */}
              <div
                className="absolute top-1/2 -right-1 -translate-y-1/2 w-2 h-6 bg-white/80 border border-slate-700 rounded-full cursor-ew-resize"
                onMouseDown={(e) => startDrag(e, 'e')}
                onTouchStart={(e) => startDrag(e, 'e')}
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-slate-100 px-5 py-3.5 flex items-center justify-between bg-white">
          <div className="text-xs text-slate-500">
            {naturalSize && (
              <span>
                Selection: {Math.round(crop.w * naturalSize.width)} ×{' '}
                {Math.round(crop.h * naturalSize.height)} px
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Apply Crop</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
