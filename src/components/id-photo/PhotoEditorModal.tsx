'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Upload,
  Crop,
  Sparkles,
  Check,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Type,
  Layers,
  Palette,
} from 'lucide-react';
import { CustomerPhotoData, PACKAGE_PRESETS, PackagePreset, PhotoSize } from '@/lib/types';
import { processBackgroundColor } from '@/lib/background-removal';

interface PhotoEditorModalProps {
  isOpen: boolean;
  quadrantLabel: string;
  initialData: CustomerPhotoData | null;
  onClose: () => void;
  onSave: (data: CustomerPhotoData) => void;
}

const BG_COLORS = [
  { name: 'Original', value: 'original', bgClass: 'bg-slate-200 text-slate-800' },
  { name: 'Pure White', value: '#FFFFFF', bgClass: 'bg-white text-slate-900 border border-slate-300' },
  { name: 'Royal Blue', value: '#0D47A1', bgClass: 'bg-blue-800 text-white' },
  { name: 'Standard Red', value: '#D32F2F', bgClass: 'bg-red-700 text-white' },
  { name: 'Neutral Gray', value: '#E5E7EB', bgClass: 'bg-gray-200 text-gray-800' },
  { name: 'Transparent', value: 'transparent', bgClass: 'bg-slate-100 text-slate-700 border border-dashed border-slate-400' },
];

export default function PhotoEditorModal({
  isOpen,
  quadrantLabel,
  initialData,
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

  // Options
  const [selectedBgColor, setSelectedBgColor] = useState<string>(
    initialData?.backgroundColor || 'original'
  );
  const [isRemovingBg, setIsRemovingBg] = useState(false);
  const [nameTagEnabled, setNameTagEnabled] = useState<boolean>(
    initialData?.nameTagEnabled || false
  );
  const [customerName, setCustomerName] = useState<string>(
    initialData?.customerName || ''
  );
  const [selectedPresetId, setSelectedPresetId] = useState<string>(
    initialData?.presetId || 'preset-a'
  );
  const [customCounts, setCustomCounts] = useState<{
    '2x2': number;
    '1x1': number;
    'passport': number;
  }>(
    initialData?.customCounts || {
      '2x2': 2,
      '1x1': 8,
      'passport': 0,
    }
  );

  // Frame size mode (2x2, passport, or 1x1)
  const [frameMode, setFrameMode] = useState<'2x2' | 'passport' | '1x1'>(() => {
    if (initialData?.customCounts.passport && !initialData?.customCounts['2x2']) {
      return 'passport';
    }
    if (initialData?.customCounts['1x1'] && !initialData?.customCounts['2x2'] && !initialData?.customCounts.passport) {
      return '1x1';
    }
    return '2x2';
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  // Sync preset changes to counts & frame mode
  const handlePresetSelect = (preset: PackagePreset) => {
    setSelectedPresetId(preset.id);
    setCustomCounts({ ...preset.counts });
    if (preset.counts.passport > 0 && preset.counts['2x2'] === 0) {
      setFrameMode('passport');
    } else if (preset.counts['1x1'] > 0 && preset.counts['2x2'] === 0 && preset.counts.passport === 0) {
      setFrameMode('1x1');
    } else {
      setFrameMode('2x2');
    }
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

  // Optional 1-click Background Removal trigger
  const handleBgColorApply = async (colorValue: string) => {
    setSelectedBgColor(colorValue);
    if (!imageSrc) return;

    if (colorValue === 'original') {
      setProcessedPreview(imageSrc);
      return;
    }

    setIsRemovingBg(true);
    try {
      const recolored = await processBackgroundColor(imageSrc, {
        targetColor: colorValue,
        tolerance: 34,
        feather: 2,
      });
      setProcessedPreview(recolored);
    } catch (err) {
      console.error('BG removal failed:', err);
    } finally {
      setIsRemovingBg(false);
    }
  };

  // Render cropped photo onto high-res canvas with pure white frame background
  const renderCroppedImage = (): string => {
    const canvas = document.createElement('canvas');
    let targetWidth = 600;
    let targetHeight = 600;
    let framePixelW = 320;
    let framePixelH = 320;

    if (frameMode === 'passport') {
      // 35mm x 45mm (7:9 ratio) at 300 DPI: 560 x 720 px for crisp metric output
      targetWidth = 560;
      targetHeight = 720;
      framePixelW = 280;
      framePixelH = 360;
    } else if (frameMode === '1x1') {
      targetWidth = 600;
      targetHeight = 600;
      framePixelW = 280;
      framePixelH = 280;
    }

    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return processedPreview || imageSrc || '';

    const activeImageSrc = processedPreview || imageSrc;
    if (!activeImageSrc) return '';

    const img = new Image();
    img.src = activeImageSrc;

    // 1. Fill solid pure white background from the frame as base
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    // Scale panning proportional to screen frame size
    const panScaleX = targetWidth / framePixelW;
    const panScaleY = targetHeight / framePixelH;
    ctx.translate(canvas.width / 2 + panX * panScaleX, canvas.height / 2 + panY * panScaleY);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(zoom, zoom);

    // Center image
    const w = img.width || targetWidth;
    const h = img.height || targetHeight;
    const scale = Math.max(targetWidth / w, targetHeight / h);
    const drawW = w * scale;
    const drawH = h * scale;

    ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();

    return canvas.toDataURL('image/jpeg', 0.95);
  };

  const handleSave = () => {
    if (!imageSrc) return;

    const finalPhoto = renderCroppedImage();

    onSave({
      originalImage: imageSrc,
      processedImage: finalPhoto,
      nameTagEnabled,
      customerName: customerName.trim(),
      backgroundColor: selectedBgColor,
      presetId: selectedPresetId,
      customCounts,
    });

    onClose();
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-5xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold">
                {quadrantLabel.substring(0, 2)}
              </span>
              <h2 className="text-xl font-bold text-slate-800">
                Setup Customer Package — {quadrantLabel}
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Crop portrait, optionally recolor background or add name tag, and select package bundle.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-6">
          {/* Left Column: Photo Framing Canvas (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                <Crop className="w-4 h-4 text-blue-600" />
                1. Frame & Position Photo
              </span>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition"
              >
                <Upload className="w-3.5 h-3.5" />
                {imageSrc ? 'Replace Photo' : 'Upload Photo'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
            {/* Frame Size Selector: 2x2 vs Passport vs 1x1 */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
              <span className="text-[11px] font-bold text-slate-600 px-2 shrink-0">
                Frame Format:
              </span>
              <div className="flex items-center gap-1 w-full">
                <button
                  type="button"
                  onClick={() => setFrameMode('2x2')}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition text-center ${
                    frameMode === '2x2'
                      ? 'bg-white text-blue-700 shadow-xs ring-1 ring-blue-600/30'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  2×2" Frame (51×51 mm)
                </button>
                <button
                  type="button"
                  onClick={() => setFrameMode('passport')}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition text-center ${
                    frameMode === 'passport'
                      ? 'bg-white text-blue-700 shadow-xs ring-1 ring-blue-600/30'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  Passport Frame (35×45 mm)
                </button>
                <button
                  type="button"
                  onClick={() => setFrameMode('1x1')}
                  className={`py-1.5 px-3 rounded-lg text-xs font-bold transition text-center ${
                    frameMode === '1x1'
                      ? 'bg-white text-blue-700 shadow-xs ring-1 ring-blue-600/30'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  1×1" Frame
                </button>
              </div>
            </div>

            {/* Outer Workboard Container with White Background Photo Frame */}
            <div className="w-full min-h-[410px] bg-slate-100/90 rounded-2xl border border-slate-200 flex flex-col items-center justify-center p-4 overflow-hidden relative shadow-inner">
              {/* Active Format Badge */}
              <div className="absolute top-2.5 left-3 flex items-center gap-1.5 z-10">
                <span className="text-[10px] font-bold uppercase tracking-wider bg-white/90 text-slate-700 px-2.5 py-0.5 rounded-full border border-slate-200 shadow-2xs">
                  {frameMode === 'passport'
                    ? 'Passport Format (35 × 45 mm)'
                    : frameMode === '1x1'
                    ? '1×1 inch Format (25 × 25 mm)'
                    : '2×2 inch Format (51 × 51 mm)'}
                </span>
                <span className="text-[10px] text-slate-500 font-medium hidden sm:inline">
                  • Solid white photo background
                </span>
              </div>

              {/* Physical White Background Photo Frame (2x2 or Passport Size) */}
              <div
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                className={`relative bg-white shadow-xl border-2 border-slate-300 rounded-sm overflow-hidden select-none cursor-grab active:cursor-grabbing transition-all ${
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
                  <div
                    className="absolute inset-0 flex items-center justify-center pointer-events-none transition-transform duration-75"
                    style={{
                      transform: `translate(${panX}px, ${panY}px) scale(${zoom}) rotate(${rotation}deg)`,
                    }}
                  >
                    <img
                      src={processedPreview || imageSrc}
                      alt="Crop target"
                      className="max-w-none max-h-none object-contain"
                    />
                  </div>

                  {/* Framing Guidelines matching the Frame Format */}
                  {frameMode === 'passport' ? (
                    // Passport (35x45mm) Specification Guides: Crown, Eye Line, Chin Line
                    <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-between p-3">
                      <div className="w-full flex justify-between items-center text-[9px] text-slate-500 font-mono border-b border-dashed border-blue-400/70 pb-0.5">
                        <span>Top of Head (Crown)</span>
                        <span>35×45mm</span>
                      </div>

                      {/* Passport Face Oval (32-36mm face height) */}
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
                    // 2x2 or 1x1 Guidelines
                    <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-between p-4">
                      <span className="text-[9px] text-slate-600 bg-white/95 px-2 py-0.5 rounded-full font-bold shadow-2xs">
                        Top of Head
                      </span>

                      {/* 2x2 Face Oval */}
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
                    <div className="absolute bottom-2 inset-x-4 bg-white border border-slate-400 py-1 px-2 text-center shadow-md">
                      <p className="text-xs font-black text-black tracking-wider uppercase truncate">
                        {customerName}
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-full flex flex-col items-center justify-center p-6 text-center cursor-pointer text-slate-400 hover:text-blue-600 transition"
                >
                  <Upload className="w-10 h-10 mb-2 text-slate-400" />
                  <p className="text-xs font-bold text-slate-700">
                    Click to upload or drag photo
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {frameMode === 'passport'
                      ? 'Passport format (35×45 mm)'
                      : '2×2 format (51×51 mm)'}
                  </p>
                </div>
              )}
            </div>

            <p className="text-[11px] text-slate-500 mt-2.5 font-medium">
              Drag to position photo within white background frame
            </p>
          </div>

            {/* Crop Controls Toolbar */}
            {imageSrc && (
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                {/* Zoom */}
                <div className="flex items-center gap-2">
                  <ZoomOut className="w-4 h-4 text-slate-500" />
                  <input
                    type="range"
                    min="0.5"
                    max="2.5"
                    step="0.05"
                    value={zoom}
                    onChange={(e) => setZoom(parseFloat(e.target.value))}
                    className="w-24 accent-blue-600"
                  />
                  <ZoomIn className="w-4 h-4 text-slate-500" />
                  <span className="text-xs font-mono text-slate-600 min-w-9">
                    {Math.round(zoom * 100)}%
                  </span>
                </div>

                {/* Rotate & Reset */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setRotation((prev) => (prev + 90) % 360)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    Rotate 90°
                  </button>
                  <button
                    onClick={() => {
                      setZoom(1);
                      setRotation(0);
                      setPanX(0);
                      setPanY(0);
                    }}
                    className="px-2.5 py-1 text-xs font-medium text-slate-500 bg-white border border-slate-200 rounded-lg hover:bg-slate-100"
                  >
                    Reset
                  </button>
                </div>
              </div>
            )}

            {/* Optional Background Recolor Bar */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-blue-600" />
                  Optional: 1-Click Background Color
                </span>
                {isRemovingBg && (
                  <span className="text-xs text-blue-600 font-medium flex items-center gap-1 animate-pulse">
                    <Sparkles className="w-3 h-3" /> Processing...
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {BG_COLORS.map((bg) => (
                  <button
                    key={bg.value}
                    disabled={!imageSrc || isRemovingBg}
                    onClick={() => handleBgColorApply(bg.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition ${
                      bg.bgClass
                    } ${
                      selectedBgColor === bg.value
                        ? 'ring-2 ring-blue-500 ring-offset-1 font-bold'
                        : 'opacity-80 hover:opacity-100'
                    }`}
                  >
                    {selectedBgColor === bg.value && <Check className="w-3 h-3" />}
                    {bg.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Name Tag & Package Bundle (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-5">
            {/* 2. Name Tag Banner Option */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-slate-800">
                  <input
                    type="checkbox"
                    checked={nameTagEnabled}
                    onChange={(e) => setNameTagEnabled(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 accent-blue-600"
                  />
                  <Type className="w-4 h-4 text-blue-600" />
                  Print Name Tag on Bottom
                </label>
                <span className="text-[11px] text-slate-500">Optional</span>
              </div>

              {nameTagEnabled && (
                <div className="flex flex-col gap-2 mt-2">
                  <input
                    type="text"
                    placeholder="e.g. JUAN D. DELA CRUZ"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3 py-2 text-xs uppercase font-semibold border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCustomerName((prev) => prev.toUpperCase())}
                      className="px-2 py-1 text-[10px] font-semibold bg-white border border-slate-200 rounded text-slate-700 hover:bg-slate-100"
                    >
                      ALL CAPS
                    </button>
                    <button
                      onClick={() =>
                        setCustomerName((prev) =>
                          prev.replace(
                            /\w\S*/g,
                            (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
                          )
                        )
                      }
                      className="px-2 py-1 text-[10px] font-semibold bg-white border border-slate-200 rounded text-slate-700 hover:bg-slate-100"
                    >
                      Title Case
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 3. Package Selection */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex-1 flex flex-col">
              <span className="text-sm font-semibold text-slate-800 flex items-center gap-1.5 mb-3">
                <Layers className="w-4 h-4 text-blue-600" />
                2. Select Photo Package Bundle
              </span>

              {/* Preset Cards */}
              <div className="flex flex-col gap-2 mb-4">
                {PACKAGE_PRESETS.map((preset) => {
                  const isSelected = selectedPresetId === preset.id;
                  return (
                    <div
                      key={preset.id}
                      onClick={() => handlePresetSelect(preset)}
                      className={`p-3 rounded-lg border text-left cursor-pointer transition flex items-center justify-between ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/70 shadow-xs'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div>
                        <p className="text-xs font-bold text-slate-800">{preset.name}</p>
                        <p className="text-[11px] text-slate-500">{preset.description}</p>
                      </div>
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          isSelected ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3" />}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Custom Quantities Picker */}
              <div className="border-t border-slate-200 pt-3 mt-auto">
                <span className="text-xs font-semibold text-slate-700 mb-2 block">
                  Or Customize Photo Quantities:
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {/* 2x2 count */}
                  <div className="bg-white p-2 rounded-lg border border-slate-200 text-center">
                    <span className="text-[11px] font-bold text-slate-600 block">2×2"</span>
                    <div className="flex items-center justify-center gap-1.5 mt-1">
                      <button
                        onClick={() => handleCustomCountChange('2x2', -1)}
                        className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700"
                      >
                        -
                      </button>
                      <span className="text-xs font-mono font-bold w-4 text-center">
                        {customCounts['2x2']}
                      </span>
                      <button
                        onClick={() => handleCustomCountChange('2x2', 1)}
                        className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* 1x1 count */}
                  <div className="bg-white p-2 rounded-lg border border-slate-200 text-center">
                    <span className="text-[11px] font-bold text-slate-600 block">1×1"</span>
                    <div className="flex items-center justify-center gap-1.5 mt-1">
                      <button
                        onClick={() => handleCustomCountChange('1x1', -1)}
                        className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700"
                      >
                        -
                      </button>
                      <span className="text-xs font-mono font-bold w-4 text-center">
                        {customCounts['1x1']}
                      </span>
                      <button
                        onClick={() => handleCustomCountChange('1x1', 1)}
                        className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Passport count */}
                  <div className="bg-white p-2 rounded-lg border border-slate-200 text-center">
                    <span className="text-[11px] font-bold text-slate-600 block">Passport</span>
                    <div className="flex items-center justify-center gap-1.5 mt-1">
                      <button
                        onClick={() => handleCustomCountChange('passport', -1)}
                        className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700"
                      >
                        -
                      </button>
                      <span className="text-xs font-mono font-bold w-4 text-center">
                        {customCounts['passport']}
                      </span>
                      <button
                        onClick={() => handleCustomCountChange('passport', 1)}
                        className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                disabled={!imageSrc}
                onClick={handleSave}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-lg shadow-sm transition"
              >
                <Check className="w-4 h-4" />
                Apply to {quadrantLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
