'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Upload,
  Check,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Type,
  Layers,
  ChevronDown,
} from 'lucide-react';
import { CustomerPhotoData, PACKAGE_PRESETS, PackagePreset, PhotoFormatCategory, PhotoSize } from '@/lib/types';

interface PhotoEditorModalProps {
  isOpen: boolean;
  quadrantLabel: string;
  initialData: CustomerPhotoData | null;
  initialFormat?: PhotoFormatCategory;
  onClose: () => void;
  onSave: (data: CustomerPhotoData) => void;
}



export default function PhotoEditorModal({
  isOpen,
  quadrantLabel,
  initialData,
  initialFormat,
  onClose,
  onSave,
}: PhotoEditorModalProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(initialData?.originalImage || null);
  const [processedPreview, setProcessedPreview] = useState<string | null>(
    initialData?.processedImage || null
  );

  // Crop / Transform state
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [panX, setPanX] = useState<number>(0);
  const [panY, setPanY] = useState<number>(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Frame size mode (2x2, passport, or 1x1)
  const [frameMode, setFrameMode] = useState<PhotoFormatCategory>(() => {
    if (initialData?.frameMode) {
      return initialData.frameMode;
    }
    if (initialData?.customCounts.passport && !initialData?.customCounts['2x2']) {
      return 'passport';
    }
    if (initialData?.customCounts['1x1'] && !initialData?.customCounts['2x2'] && !initialData?.customCounts.passport) {
      return '1x1';
    }
    return initialFormat || '2x2';
  });

  const [packageFilter, setPackageFilter] = useState<PhotoFormatCategory | 'all'>(() => {
    if (initialData?.frameMode) return initialData.frameMode;
    return initialFormat || '2x2';
  });

  // Track natural image dimensions whenever active source changes
  useEffect(() => {
    const src = processedPreview || imageSrc;
    if (src) {
      const tempImg = new Image();
      tempImg.onload = () => {
        if (tempImg.naturalWidth > 0 && tempImg.naturalHeight > 0) {
          setNaturalSize({ width: tempImg.naturalWidth, height: tempImg.naturalHeight });
        }
      };
      tempImg.src = src;
    }
  }, [processedPreview, imageSrc]);

  // Options
  const [selectedBgColor, setSelectedBgColor] = useState<string>(
    initialData?.backgroundColor || '#FFFFFF'
  );
  const [nameTagEnabled, setNameTagEnabled] = useState<boolean>(
    initialData?.nameTagEnabled || false
  );
  const [customerName, setCustomerName] = useState<string>(
    initialData?.customerName || ''
  );
  const [selectedPresetId, setSelectedPresetId] = useState<string>(() => {
    if (initialData?.presetId) return initialData.presetId;
    const defaultMode = initialFormat || '2x2';
    if (defaultMode === 'passport') return 'passport-standard';
    if (defaultMode === '1x1') return '1x1-dozen';
    return '2x2-combo';
  });
  const [customCounts, setCustomCounts] = useState<{
    '2x2': number;
    '1x1': number;
    'passport': number;
  }>(() => {
    if (initialData?.customCounts) return initialData.customCounts;
    const defaultMode = initialFormat || '2x2';
    if (defaultMode === 'passport') return { '2x2': 0, '1x1': 0, passport: 6 };
    if (defaultMode === '1x1') return { '2x2': 0, '1x1': 12, passport: 0 };
    return { '2x2': 2, '1x1': 8, passport: 0 };
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  // Sync frame mode change with presets
  const handleFrameModeChange = (newMode: PhotoFormatCategory) => {
    setFrameMode(newMode);
    setPackageFilter(newMode);
    const currentPreset = PACKAGE_PRESETS.find((p) => p.id === selectedPresetId);
    if (!currentPreset || currentPreset.category !== newMode) {
      const defaultForCategory = PACKAGE_PRESETS.find((p) => p.category === newMode);
      if (defaultForCategory) {
        setSelectedPresetId(defaultForCategory.id);
        setCustomCounts({ ...defaultForCategory.counts });
      }
    }
  };

  // Sync preset changes to counts & frame mode
  const handlePresetSelect = (preset: PackagePreset) => {
    setSelectedPresetId(preset.id);
    setCustomCounts({ ...preset.counts });
    setFrameMode(preset.category);
    setPackageFilter(preset.category);
  };

  const handleCustomCountChange = (size: PhotoSize, delta: number) => {
    setSelectedPresetId('custom');
    setCustomCounts((prev) => ({
      ...prev,
      [size]: Math.max(0, (prev[size] || 0) + delta),
    }));
  };

  // Handle File Upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setImageSrc(result);
      setProcessedPreview(result);
      // Reset crop params
      setZoom(1);
      setRotation(0);
      setPanX(0);
      setPanY(0);
      setSelectedBgColor('original');
    };
    reader.readAsDataURL(file);
  };

  // Render cropped photo onto high-res canvas with pure white frame background
  const renderCroppedForSize = async (
    targetMode: PhotoFormatCategory
  ): Promise<string> => {
    const activeImageSrc = processedPreview || imageSrc;
    if (!activeImageSrc) return '';

    // Load and decode image to ensure natural dimensions and pixels are fully ready
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = activeImageSrc;
    try {
      await img.decode();
    } catch {
      await new Promise((resolve) => {
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
      });
    }

    const imgNaturalW = img.naturalWidth || naturalSize?.width || 600;
    const imgNaturalH = img.naturalHeight || naturalSize?.height || 600;

    // Active frame dimensions from screen workboard
    const activeFrameW = frameMode === 'passport' ? 280 : frameMode === '1x1' ? 280 : 320;
    const activeFrameH = frameMode === 'passport' ? 360 : frameMode === '1x1' ? 280 : 320;

    // Display scale in active screen frame (cover behavior)
    const activeBaseScale = Math.max(activeFrameW / imgNaturalW, activeFrameH / imgNaturalH);
    const activeDisplayW = imgNaturalW * activeBaseScale;
    const activeDisplayH = imgNaturalH * activeBaseScale;

    // Output target dimensions (300 DPI high resolution)
    let canvasW = 600;
    let canvasH = 600;
    if (targetMode === 'passport') {
      canvasW = 700; // 35mm at 300DPI (7:9 ratio)
      canvasH = 900; // 45mm at 300DPI
    } else {
      canvasW = 600; // 1:1 ratio for 2x2 and 1x1
      canvasH = 600;
    }

    const canvas = document.createElement('canvas');
    canvas.width = canvasW;
    canvas.height = canvasH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return activeImageSrc;

    // 1. Fill solid pure white background from frame
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    // Multiplier from screen frame to high-res canvas
    const scaleFactor = targetMode === 'passport' ? (canvasW / 280) : (canvasW / 320);

    ctx.translate(canvas.width / 2 + panX * scaleFactor, canvas.height / 2 + panY * scaleFactor);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(zoom, zoom);

    const drawW = activeDisplayW * scaleFactor;
    const drawH = activeDisplayH * scaleFactor;
    ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();

    return canvas.toDataURL('image/jpeg', 0.95);
  };

  const handleSave = async () => {
    if (!imageSrc || isSaving) return;
    setIsSaving(true);
    try {
      const finalPhoto = await renderCroppedForSize(frameMode);
      const finalPhoto2x2 = await renderCroppedForSize('2x2');
      const finalPhotoPassport = await renderCroppedForSize('passport');

      onSave({
        originalImage: imageSrc,
        processedImage: finalPhoto,
        processedImage2x2: finalPhoto2x2,
        processedImagePassport: finalPhotoPassport,
        frameMode,
        nameTagEnabled,
        customerName: customerName.trim(),
        backgroundColor: selectedBgColor,
        presetId: selectedPresetId,
        customCounts,
      });

      onClose();
    } catch (err) {
      console.error('Failed to crop photo:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Mouse pan handlers
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

  const framePixelW = frameMode === 'passport' ? 280 : frameMode === '1x1' ? 280 : 320;
  const framePixelH = frameMode === 'passport' ? 360 : frameMode === '1x1' ? 280 : 320;

  const baseScale =
    naturalSize && naturalSize.width > 0 && naturalSize.height > 0
      ? Math.max(framePixelW / naturalSize.width, framePixelH / naturalSize.height)
      : 1;

  const displayW = naturalSize && naturalSize.width > 0 ? naturalSize.width * baseScale : framePixelW;
  const displayH = naturalSize && naturalSize.height > 0 ? naturalSize.height * baseScale : framePixelH;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl rounded-2xl bg-white shadow-2xl border border-slate-200/80 overflow-hidden my-6">
        {/* Modal Header */}
        <div className="border-b border-slate-100 px-6 py-4 bg-white">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
            {quadrantLabel}
          </h2>
        </div>

        {/* Modal Body */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-6">
          {/* Left Column: Photo Framing Canvas (7 cols) */}
          <div className="lg:col-span-7 flex flex-col items-center justify-center gap-4">
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />

            {/* Direct Physical Photo Frame without heavy outside container */}
            <div className="flex flex-col items-center justify-center w-full py-2">
              <div
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                className={`relative bg-white shadow-md border border-slate-300 rounded-sm overflow-hidden select-none cursor-grab active:cursor-grabbing transition-all ${
                  frameMode === 'passport'
                    ? 'w-[280px] h-[360px]'
                    : frameMode === '1x1'
                    ? 'w-[280px] h-[280px]'
                    : 'w-[320px] h-[320px]'
                }`}
              >
                {imageSrc ? (
                  <>
                    {/* The Scaled/Panned Image */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
                      <img
                        src={processedPreview || imageSrc}
                        alt="Crop target"
                        onLoad={(e) => {
                          const target = e.currentTarget;
                          if (target.naturalWidth > 0 && target.naturalHeight > 0) {
                            setNaturalSize({ width: target.naturalWidth, height: target.naturalHeight });
                          }
                        }}
                        style={{
                          width: `${displayW}px`,
                          height: `${displayH}px`,
                          maxWidth: 'none',
                          maxHeight: 'none',
                          transform: `translate(${panX}px, ${panY}px) scale(${zoom}) rotate(${rotation}deg)`,
                          transformOrigin: 'center center',
                        }}
                      />
                    </div>

                    {/* Framing Guidelines */}
                    {frameMode === 'passport' ? (
                      <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-between p-3">
                        <div className="w-full flex justify-between items-center text-[9px] text-slate-500 font-mono border-b border-dashed border-blue-400/70 pb-0.5">
                          <span>Top of Head (Crown)</span>
                          <span>35×45mm</span>
                        </div>

                        {/* Passport Face Oval */}
                        <div className="w-[185px] h-[235px] rounded-full border-2 border-blue-500/70 border-dashed flex flex-col items-center justify-between p-2">
                          <span className="text-[9px] text-blue-700 bg-white/95 px-1.5 py-0.5 rounded font-bold shadow-2xs">
                            Hairline
                          </span>
                          <div className="w-full flex items-center justify-center gap-1">
                            <div className="h-px bg-blue-500/60 flex-1 border-t border-dotted border-blue-600" />
                            <span className="text-[8px] text-blue-700 font-semibold bg-white/95 px-1 rounded">
                              Eye Level
                            </span>
                            <div className="h-px bg-blue-500/60 flex-1 border-t border-dotted border-blue-600" />
                          </div>
                          <span className="text-[9px] text-blue-700 bg-white/95 px-1.5 py-0.5 rounded font-bold shadow-2xs">
                            Chin Line
                          </span>
                        </div>

                        <div className="w-full text-center text-[9px] text-slate-500 font-mono border-t border-dashed border-blue-400/70 pt-0.5">
                          Bottom Edge
                        </div>
                      </div>
                    ) : (
                      <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-between p-4">
                        <span className="text-[9px] text-slate-600 bg-white/95 px-2 py-0.5 rounded-full font-bold shadow-2xs">
                          Top of Head
                        </span>

                        {/* 2x2 / 1x1 Face Oval */}
                        <div className="w-[180px] h-[210px] rounded-full border-2 border-blue-500/70 border-dashed flex flex-col items-center justify-center p-2">
                          <div className="w-full flex items-center justify-center gap-1">
                            <div className="h-px bg-blue-500/60 flex-1 border-t border-dotted border-blue-600" />
                            <span className="text-[8px] text-blue-700 font-semibold bg-white/95 px-1 rounded">
                              Eye Level
                            </span>
                            <div className="h-px bg-blue-500/60 flex-1 border-t border-dotted border-blue-600" />
                          </div>
                        </div>

                        <span className="text-[9px] text-slate-600 bg-white/95 px-2 py-0.5 rounded-full font-bold shadow-2xs">
                          Chin Line
                        </span>
                      </div>
                    )}

                    {/* Live Name Tag Preview Overlay */}
                    {nameTagEnabled && customerName && (
                      <div className="absolute bottom-0 inset-x-0 bg-white border-t border-slate-400 py-1 px-2 text-center shadow-md z-20">
                        <p className="text-xs font-black text-black tracking-wider uppercase truncate">
                          {customerName}
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  /* Frame Dropzone */
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-full flex flex-col items-center justify-center p-6 text-center cursor-pointer text-slate-400 hover:text-blue-600 hover:bg-slate-50/50 transition group"
                  >
                    <div className="w-12 h-12 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 group-hover:text-blue-600 group-hover:border-blue-200 transition shadow-2xs mb-3">
                      <Upload className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-semibold text-slate-700 group-hover:text-blue-600 transition">
                      Click to upload or drag photo
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1">
                      {frameMode === 'passport'
                        ? 'Passport format (35×45 mm)'
                        : frameMode === '1x1'
                        ? '1×1 inch format (25×25 mm)'
                        : '2×2 inch format (51×51 mm)'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Crop Controls Toolbar */}
            {imageSrc && (
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50/80 p-2.5 rounded-xl border border-slate-200/80 max-w-[360px] w-full shadow-2xs">
                {/* Zoom */}
                <div className="flex items-center gap-2">
                  <ZoomOut className="w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="range"
                    min="0.5"
                    max="2.5"
                    step="0.05"
                    value={zoom}
                    onChange={(e) => setZoom(parseFloat(e.target.value))}
                    className="w-20 accent-blue-600 h-1.5"
                  />
                  <ZoomIn className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-[11px] font-mono text-slate-500 w-8">
                    {Math.round(zoom * 100)}%
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setRotation((prev) => (prev + 90) % 360)}
                    className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded-md transition border border-transparent hover:border-slate-200 shadow-2xs"
                    title="Rotate 90°"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setZoom(1);
                      setRotation(0);
                      setPanX(0);
                      setPanY(0);
                    }}
                    className="px-2 py-1 text-[11px] font-medium text-slate-500 hover:text-slate-800 hover:bg-white rounded-md transition"
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition"
                  >
                    <Upload className="w-3 h-3" />
                    Replace
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Settings & Package Bundles (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-3.5">
            {/* Card 1: Frame Format & Name Tag */}
            <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/80 flex flex-col gap-3">
              {/* Frame Format Dropdown */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Frame Format
                </label>
                <div className="relative">
                  <select
                    value={frameMode}
                    onChange={(e) => handleFrameModeChange(e.target.value as PhotoFormatCategory)}
                    className="w-full appearance-none bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 pr-8 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition shadow-2xs cursor-pointer"
                  >
                    <option value="2x2">2×2" Frame (51 × 51 mm)</option>
                    <option value="passport">Passport Frame (35 × 45 mm)</option>
                    <option value="1x1">1×1" Frame (25 × 25 mm)</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Name Tag Option */}
              <div className="pt-2.5 border-t border-slate-200/60">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-800">
                    <input
                      type="checkbox"
                      checked={nameTagEnabled}
                      onChange={(e) => setNameTagEnabled(e.target.checked)}
                      className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500 accent-blue-600"
                    />
                    <Type className="w-3.5 h-3.5 text-blue-600" />
                    Print Name Tag on Bottom
                  </label>
                  <span className="text-[10px] text-slate-400">Optional</span>
                </div>

                {nameTagEnabled && (
                  <div className="flex flex-col gap-2 mt-2.5">
                    <input
                      type="text"
                      placeholder="e.g. JUAN D. DELA CRUZ"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs uppercase font-semibold bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-hidden shadow-2xs"
                    />
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => setCustomerName((prev) => prev.toUpperCase())}
                        className="px-2 py-0.5 text-[10px] font-semibold bg-white border border-slate-200 rounded text-slate-600 hover:bg-slate-100"
                      >
                        ALL CAPS
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setCustomerName((prev) =>
                            prev.replace(
                              /\w\S*/g,
                              (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
                            )
                          )
                        }
                        className="px-2 py-0.5 text-[10px] font-semibold bg-white border border-slate-200 rounded text-slate-600 hover:bg-slate-100"
                      >
                        Title Case
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Card 2: Package Bundles */}
            <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/80 flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-blue-600" />
                  Select Output Package Bundle
                </span>
              </div>

              {/* Package Format Filter Tabs */}
              <div className="flex items-center bg-slate-200/70 p-0.5 rounded-lg mb-2.5">
                <button
                  type="button"
                  onClick={() => setPackageFilter('2x2')}
                  className={`flex-1 py-1 text-[11px] font-semibold rounded-md transition text-center ${
                    packageFilter === '2x2'
                      ? 'bg-white text-slate-900 shadow-2xs font-bold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  2×2
                </button>
                <button
                  type="button"
                  onClick={() => setPackageFilter('passport')}
                  className={`flex-1 py-1 text-[11px] font-semibold rounded-md transition text-center ${
                    packageFilter === 'passport'
                      ? 'bg-white text-slate-900 shadow-2xs font-bold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Passport
                </button>
                <button
                  type="button"
                  onClick={() => setPackageFilter('1x1')}
                  className={`flex-1 py-1 text-[11px] font-semibold rounded-md transition text-center ${
                    packageFilter === '1x1'
                      ? 'bg-white text-slate-900 shadow-2xs font-bold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  1×1
                </button>
                <button
                  type="button"
                  onClick={() => setPackageFilter('all')}
                  className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition text-center ${
                    packageFilter === 'all'
                      ? 'bg-white text-slate-900 shadow-2xs font-bold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  All
                </button>
              </div>

              {/* Preset Cards List */}
              <div className="flex flex-col gap-1.5 max-h-[160px] overflow-y-auto pr-0.5">
                {PACKAGE_PRESETS.filter((p) => packageFilter === 'all' || p.category === packageFilter).map((preset) => {
                  const isSelected = selectedPresetId === preset.id;
                  const isPassportPreset = preset.category === 'passport';
                  return (
                    <div
                      key={preset.id}
                      onClick={() => handlePresetSelect(preset)}
                      className={`p-2.5 rounded-lg border text-left cursor-pointer transition flex items-center justify-between ${
                        isSelected
                          ? isPassportPreset
                            ? 'border-purple-600 bg-purple-50/70 shadow-2xs'
                            : 'border-blue-600 bg-blue-50/70 shadow-2xs'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-bold text-slate-800 truncate">{preset.name}</p>
                          <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded shrink-0 ${
                            preset.category === 'passport'
                              ? 'bg-purple-100 text-purple-700'
                              : preset.category === '1x1'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {preset.category === 'passport' ? 'Passport' : preset.category.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 truncate">{preset.description}</p>
                      </div>
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ml-2 ${
                          isSelected
                            ? isPassportPreset
                              ? 'border-purple-600 bg-purple-600 text-white'
                              : 'border-blue-600 bg-blue-600 text-white'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Card 3: Separate Container Card for Customize Photo Quantities */}
            <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/80">
              <span className="text-xs font-semibold text-slate-800 mb-2 block">
                Customize Photo Quantities
              </span>
              <div className="grid grid-cols-3 gap-2">
                {/* 2x2 count */}
                <div className="bg-white p-2 rounded-lg border border-slate-200/80 text-center shadow-2xs">
                  <span className="text-[11px] font-semibold text-slate-600 block">2×2"</span>
                  <div className="flex items-center justify-center gap-1.5 mt-1">
                    <button
                      type="button"
                      onClick={() => handleCustomCountChange('2x2', -1)}
                      className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition"
                    >
                      -
                    </button>
                    <span className="text-xs font-mono font-bold w-4 text-center">
                      {customCounts['2x2']}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCustomCountChange('2x2', 1)}
                      className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* 1x1 count */}
                <div className="bg-white p-2 rounded-lg border border-slate-200/80 text-center shadow-2xs">
                  <span className="text-[11px] font-semibold text-slate-600 block">1×1"</span>
                  <div className="flex items-center justify-center gap-1.5 mt-1">
                    <button
                      type="button"
                      onClick={() => handleCustomCountChange('1x1', -1)}
                      className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition"
                    >
                      -
                    </button>
                    <span className="text-xs font-mono font-bold w-4 text-center">
                      {customCounts['1x1']}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCustomCountChange('1x1', 1)}
                      className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Passport count */}
                <div className="bg-white p-2 rounded-lg border border-slate-200/80 text-center shadow-2xs">
                  <span className="text-[11px] font-semibold text-slate-600 block">Passport</span>
                  <div className="flex items-center justify-center gap-1.5 mt-1">
                    <button
                      type="button"
                      onClick={() => handleCustomCountChange('passport', -1)}
                      className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition"
                    >
                      -
                    </button>
                    <span className="text-xs font-mono font-bold w-4 text-center">
                      {customCounts['passport']}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCustomCountChange('passport', 1)}
                      className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-1 mt-auto">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!imageSrc || isSaving}
                onClick={handleSave}
                className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed rounded-lg shadow-2xs transition"
              >
                <Check className="w-3.5 h-3.5" />
                {isSaving ? 'Applying...' : 'Apply'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
