'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Upload,
  Check,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Type,
  Layers,
  ChevronDown,
  Plus,
  X,
  Users,
} from 'lucide-react';
import {
  CustomerPhotoData,
  CustomerPhotoEntry,
  PACKAGE_PRESETS,
  PackagePreset,
  PhotoFormatCategory,
  PhotoSize,
  getQuadrantTotalCounts,
} from '@/lib/types';

interface PhotoEditorModalProps {
  isOpen: boolean;
  quadrantLabel: string;
  initialData: CustomerPhotoData | null;
  initialFormat?: PhotoFormatCategory;
  onClose: () => void;
  onSave: (data: CustomerPhotoData) => void;
}

interface PersonDraft {
  id: string;
  originalImage: string | null;
  processedPreview: string | null;
  zoom: number;
  rotation: number;
  panX: number;
  panY: number;
  customerName: string;
  nameTagEnabled: boolean;
  counts: {
    '2x2': number;
    '1x1': number;
    'passport': number;
  };
}

const DEFAULT_PERSON: PersonDraft = {
  id: 'person-1',
  originalImage: null,
  processedPreview: null,
  zoom: 1,
  rotation: 0,
  panX: 0,
  panY: 0,
  customerName: '',
  nameTagEnabled: false,
  counts: { '2x2': 2, '1x1': 8, passport: 0 },
};

function splitPresetCounts(
  preset: PackagePreset,
  numPersons: number
): { '2x2': number; '1x1': number; passport: number }[] {
  const splitDimension = (total: number): number[] => {
    if (numPersons <= 0) return [];
    const base = Math.floor(total / numPersons);
    const remainder = total % numPersons;
    return Array.from({ length: numPersons }, (_, i) => base + (i < remainder ? 1 : 0));
  };

  const splits2x2 = splitDimension(preset.counts['2x2'] || 0);
  const splits1x1 = splitDimension(preset.counts['1x1'] || 0);
  const splitsPass = splitDimension(preset.counts.passport || 0);

  return Array.from({ length: numPersons }, (_, i) => ({
    '2x2': splits2x2[i] || 0,
    '1x1': splits1x1[i] || 0,
    passport: splitsPass[i] || 0,
  }));
}

function createInitialPersons(
  initialData: CustomerPhotoData | null,
  initialFormat?: PhotoFormatCategory
): PersonDraft[] {
  const defaultMode =
    initialData?.frameMode ||
    (initialData?.customCounts?.passport && !initialData?.customCounts?.['2x2']
      ? 'passport'
      : initialData?.customCounts?.['1x1'] &&
        !initialData?.customCounts?.['2x2'] &&
        !initialData?.customCounts?.passport
      ? '1x1'
      : initialFormat || '2x2');

  const defaultPresetId =
    initialData?.presetId ||
    (defaultMode === 'passport'
      ? 'passport-standard'
      : defaultMode === '1x1'
      ? '1x1-dozen'
      : '2x2-combo');

  if (initialData?.photos && initialData.photos.length > 0) {
    return initialData.photos.map((p, idx) => ({
      id: p.id || `person-${idx + 1}`,
      originalImage: p.originalImage || null,
      processedPreview: p.processedImage || null,
      zoom: p.cropState?.zoom ?? 1,
      rotation: p.cropState?.rotation ?? 0,
      panX: p.cropState?.panX ?? 0,
      panY: p.cropState?.panY ?? 0,
      customerName: p.customerName || '',
      nameTagEnabled: p.nameTagEnabled ?? false,
      counts: {
        '2x2': p.counts?.['2x2'] ?? 0,
        '1x1': p.counts?.['1x1'] ?? 0,
        passport: p.counts?.passport ?? 0,
      },
    }));
  }

  if (initialData?.originalImage) {
    return [
      {
        id: 'person-1',
        originalImage: initialData.originalImage,
        processedPreview: initialData.processedImage || null,
        zoom: 1,
        rotation: 0,
        panX: 0,
        panY: 0,
        customerName: initialData.customerName || '',
        nameTagEnabled: initialData.nameTagEnabled ?? false,
        counts: {
          '2x2': initialData.customCounts?.['2x2'] ?? 0,
          '1x1': initialData.customCounts?.['1x1'] ?? 0,
          passport: initialData.customCounts?.passport ?? 0,
        },
      },
    ];
  }

  const targetPreset = PACKAGE_PRESETS.find((p) => p.id === defaultPresetId) || PACKAGE_PRESETS[0];
  return [
    {
      id: 'person-1',
      originalImage: null,
      processedPreview: null,
      zoom: 1,
      rotation: 0,
      panX: 0,
      panY: 0,
      customerName: '',
      nameTagEnabled: false,
      counts: { ...targetPreset.counts },
    },
  ];
}

export default function PhotoEditorModal({
  isOpen,
  quadrantLabel,
  initialData,
  initialFormat,
  onClose,
  onSave,
}: PhotoEditorModalProps) {
  // Synchronous initial state guarantees persons is never empty
  const [persons, setPersons] = useState<PersonDraft[]>(() =>
    createInitialPersons(initialData, initialFormat)
  );
  const [activePersonIndex, setActivePersonIndex] = useState<number>(0);

  // Dragging state for crop canvas
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Quadrant-level Frame format mode (2x2, passport, or 1x1)
  const [frameMode, setFrameMode] = useState<PhotoFormatCategory>(() => {
    return (
      initialData?.frameMode ||
      (initialData?.customCounts?.passport && !initialData?.customCounts?.['2x2']
        ? 'passport'
        : initialData?.customCounts?.['1x1'] &&
          !initialData?.customCounts?.['2x2'] &&
          !initialData?.customCounts?.passport
        ? '1x1'
        : initialFormat || '2x2')
    );
  });

  const [packageFilter, setPackageFilter] = useState<PhotoFormatCategory | 'all'>(() => {
    return (
      initialData?.frameMode ||
      (initialData?.customCounts?.passport && !initialData?.customCounts?.['2x2']
        ? 'passport'
        : initialData?.customCounts?.['1x1'] &&
          !initialData?.customCounts?.['2x2'] &&
          !initialData?.customCounts?.passport
        ? '1x1'
        : initialFormat || '2x2')
    );
  });

  const [selectedPresetId, setSelectedPresetId] = useState<string>(() => {
    if (initialData?.presetId) return initialData.presetId;
    const mode = initialFormat || '2x2';
    if (mode === 'passport') return 'passport-standard';
    if (mode === '1x1') return '1x1-dozen';
    return '2x2-combo';
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Re-sync when initialData or initialFormat changes while opening
  useEffect(() => {
    if (!isOpen) return;

    const newPersons = createInitialPersons(initialData, initialFormat);
    setPersons(newPersons);
    setActivePersonIndex(0);

    const mode: PhotoFormatCategory =
      initialData?.frameMode ||
      (initialData?.customCounts?.passport && !initialData?.customCounts?.['2x2']
        ? 'passport'
        : initialData?.customCounts?.['1x1'] &&
          !initialData?.customCounts?.['2x2'] &&
          !initialData?.customCounts?.passport
        ? '1x1'
        : initialFormat || '2x2');

    setFrameMode(mode);
    setPackageFilter(mode);

    const presetId =
      initialData?.presetId ||
      (mode === 'passport'
        ? 'passport-standard'
        : mode === '1x1'
        ? '1x1-dozen'
        : '2x2-combo');
    setSelectedPresetId(presetId);
  }, [isOpen, initialData, initialFormat]);

  // Safe active person reference (guaranteed non-null)
  const activePerson = persons[activePersonIndex] || persons[0] || DEFAULT_PERSON;
  const activeCounts = activePerson.counts || { '2x2': 0, '1x1': 0, passport: 0 };

  // Track natural image dimensions whenever active person's image changes
  useEffect(() => {
    const src = activePerson?.processedPreview || activePerson?.originalImage;
    if (src) {
      const tempImg = new Image();
      tempImg.onload = () => {
        if (tempImg.naturalWidth > 0 && tempImg.naturalHeight > 0) {
          setNaturalSize({ width: tempImg.naturalWidth, height: tempImg.naturalHeight });
        }
      };
      tempImg.src = src;
    } else {
      setNaturalSize(null);
    }
  }, [activePerson?.processedPreview, activePerson?.originalImage]);

  // Helper to update active person
  const updateActivePerson = useCallback(
    (updater: Partial<PersonDraft> | ((prev: PersonDraft) => PersonDraft)) => {
      setPersons((prev) => {
        if (prev.length === 0) return [DEFAULT_PERSON];
        return prev.map((p, idx) => {
          if (idx !== activePersonIndex) return p;
          return typeof updater === 'function' ? updater(p) : { ...p, ...updater };
        });
      });
    },
    [activePersonIndex]
  );

  // Load a File into the active person
  const loadFileForActivePerson = useCallback(
    (file: File) => {
      if (!file.type.startsWith('image/')) {
        alert('Please choose a valid image file (JPEG, PNG, WebP).');
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (!result) return;
        updateActivePerson({
          originalImage: result,
          processedPreview: result,
          zoom: 1,
          rotation: 0,
          panX: 0,
          panY: 0,
        });
      };
      reader.onerror = (err) => {
        console.error('File reading error:', err);
        alert('Failed to read the selected image file. Please try another image.');
      };
      reader.readAsDataURL(file);
    },
    [updateActivePerson]
  );

  // Handle File Input Change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      loadFileForActivePerson(file);
    }
  };

  // Add person
  const handleAddPerson = () => {
    if (persons.length >= 4) return;
    const newIndex = persons.length;
    const newPersonId = `person-${Date.now()}`;
    const newPerson: PersonDraft = {
      id: newPersonId,
      originalImage: null,
      processedPreview: null,
      zoom: 1,
      rotation: 0,
      panX: 0,
      panY: 0,
      customerName: '',
      nameTagEnabled: false,
      counts: { '2x2': 0, '1x1': 0, passport: 0 },
    };

    const currentPreset = PACKAGE_PRESETS.find((p) => p.id === selectedPresetId);
    if (currentPreset) {
      const splitList = splitPresetCounts(currentPreset, persons.length + 1);
      setPersons((prev) => {
        const updated = prev.map((p, idx) => ({
          ...p,
          counts: splitList[idx] || { '2x2': 0, '1x1': 0, passport: 0 },
        }));
        return [
          ...updated,
          {
            ...newPerson,
            counts: splitList[newIndex] || { '2x2': 0, '1x1': 0, passport: 0 },
          },
        ];
      });
    } else {
      setPersons((prev) => [...prev, newPerson]);
    }

    setActivePersonIndex(newIndex);
  };

  // Remove person
  const handleRemovePerson = (indexToRemove: number) => {
    if (persons.length <= 1) return;
    const remaining = persons.filter((_, idx) => idx !== indexToRemove);

    const currentPreset = PACKAGE_PRESETS.find((p) => p.id === selectedPresetId);
    let finalPersons = remaining;
    if (currentPreset) {
      const splitList = splitPresetCounts(currentPreset, remaining.length);
      finalPersons = remaining.map((p, idx) => ({
        ...p,
        counts: splitList[idx] || { '2x2': 0, '1x1': 0, passport: 0 },
      }));
    } else {
      const removedCounts = persons[indexToRemove]?.counts || { '2x2': 0, '1x1': 0, passport: 0 };
      finalPersons = remaining.map((p, idx) => {
        if (idx === 0) {
          return {
            ...p,
            counts: {
              '2x2': (p.counts?.['2x2'] || 0) + (removedCounts['2x2'] || 0),
              '1x1': (p.counts?.['1x1'] || 0) + (removedCounts['1x1'] || 0),
              passport: (p.counts?.passport || 0) + (removedCounts.passport || 0),
            },
          };
        }
        return p;
      });
    }

    setPersons(finalPersons);
    setActivePersonIndex((prev) => Math.min(prev, finalPersons.length - 1));
  };

  // Sync frame mode change with presets & split
  const handleFrameModeChange = (newMode: PhotoFormatCategory) => {
    setFrameMode(newMode);
    setPackageFilter(newMode);
    const currentPreset = PACKAGE_PRESETS.find((p) => p.id === selectedPresetId);
    if (!currentPreset || currentPreset.category !== newMode) {
      const defaultForCategory = PACKAGE_PRESETS.find((p) => p.category === newMode);
      if (defaultForCategory) {
        setSelectedPresetId(defaultForCategory.id);
        const splitList = splitPresetCounts(defaultForCategory, persons.length);
        setPersons((prev) =>
          prev.map((p, idx) => ({
            ...p,
            counts: splitList[idx] || { '2x2': 0, '1x1': 0, passport: 0 },
          }))
        );
      }
    }
  };

  // Sync preset changes across all persons
  const handlePresetSelect = (preset: PackagePreset) => {
    setSelectedPresetId(preset.id);
    setFrameMode(preset.category);
    setPackageFilter(preset.category);
    const splitList = splitPresetCounts(preset, persons.length);
    setPersons((prev) =>
      prev.map((p, idx) => ({
        ...p,
        counts: splitList[idx] || { '2x2': 0, '1x1': 0, passport: 0 },
      }))
    );
  };

  // Custom quantity changes for active person
  const handleCustomCountChange = (size: PhotoSize, delta: number) => {
    setSelectedPresetId('custom');
    updateActivePerson((prev) => ({
      ...prev,
      counts: {
        ...prev.counts,
        [size]: Math.max(0, (prev.counts?.[size] || 0) + delta),
      },
    }));
  };

  // Render cropped photo onto high-res canvas with pure white frame background
  const renderCroppedForPerson = async (
    person: PersonDraft,
    targetMode: PhotoFormatCategory
  ): Promise<string> => {
    const activeImageSrc = person.processedPreview || person.originalImage;
    if (!activeImageSrc) return '';

    try {
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

      const imgNaturalW = img.naturalWidth || 600;
      const imgNaturalH = img.naturalHeight || 600;

      const activeFrameW = frameMode === 'passport' ? 280 : frameMode === '1x1' ? 280 : 320;
      const activeFrameH = frameMode === 'passport' ? 360 : frameMode === '1x1' ? 280 : 320;

      const activeBaseScale = Math.max(activeFrameW / imgNaturalW, activeFrameH / imgNaturalH);
      const activeDisplayW = imgNaturalW * activeBaseScale;
      const activeDisplayH = imgNaturalH * activeBaseScale;

      let canvasW = 600;
      let canvasH = 600;
      if (targetMode === 'passport') {
        canvasW = 700; // 35mm at 300DPI
        canvasH = 900; // 45mm at 300DPI
      } else {
        canvasW = 600;
        canvasH = 600;
      }

      const canvas = document.createElement('canvas');
      canvas.width = canvasW;
      canvas.height = canvasH;
      const ctx = canvas.getContext('2d');
      if (!ctx) return activeImageSrc;

      // 1. Pure white frame background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      const scaleFactor = canvasW / activeFrameW;

      ctx.translate(
        canvas.width / 2 + person.panX * scaleFactor,
        canvas.height / 2 + person.panY * scaleFactor
      );
      ctx.rotate((person.rotation * Math.PI) / 180);
      ctx.scale(person.zoom, person.zoom);

      const drawW = activeDisplayW * scaleFactor;
      const drawH = activeDisplayH * scaleFactor;
      ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();

      return canvas.toDataURL('image/jpeg', 0.95);
    } catch (err) {
      console.error('Failed to render cropped canvas for person:', err);
      return activeImageSrc;
    }
  };

  const handleSave = async () => {
    const personsWithPhotos = persons.filter((p) => Boolean(p.originalImage));
    if (personsWithPhotos.length === 0 || isSaving) return;

    if (persons.some((p) => !p.originalImage)) {
      alert('Please upload a photo for each added person, or remove unneeded person tabs.');
      return;
    }

    setIsSaving(true);
    try {
      const photoEntries: CustomerPhotoEntry[] = await Promise.all(
        persons.map(async (p) => {
          const finalPhoto = await renderCroppedForPerson(p, frameMode);
          const finalPhoto2x2 = await renderCroppedForPerson(p, '2x2');
          const finalPhotoPassport = await renderCroppedForPerson(p, 'passport');

          return {
            id: p.id,
            originalImage: p.originalImage!,
            processedImage: finalPhoto,
            processedImage2x2: finalPhoto2x2,
            processedImagePassport: finalPhotoPassport,
            customerName: p.customerName.trim(),
            nameTagEnabled: p.nameTagEnabled,
            counts: { ...p.counts },
            cropState: {
              zoom: p.zoom,
              rotation: p.rotation,
              panX: p.panX,
              panY: p.panY,
              frameMode,
            },
          };
        })
      );

      const totalCounts = getQuadrantTotalCounts(photoEntries);

      onSave({
        photos: photoEntries,
        frameMode,
        presetId: selectedPresetId,
        customCounts: totalCounts,
        originalImage: photoEntries[0]?.originalImage || '',
        processedImage: photoEntries[0]?.processedImage || '',
        processedImage2x2: photoEntries[0]?.processedImage2x2,
        processedImagePassport: photoEntries[0]?.processedImagePassport,
        customerName: photoEntries[0]?.customerName || '',
        nameTagEnabled: photoEntries[0]?.nameTagEnabled || false,
        backgroundColor: '#FFFFFF',
      });

      onClose();
    } catch (err) {
      console.error('Failed to crop photo:', err);
      alert('An error occurred while cropping photos. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Mouse pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!activePerson?.originalImage) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - activePerson.panX, y: e.clientY - activePerson.panY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !activePerson) return;
    const newPanX = e.clientX - dragStart.x;
    const newPanY = e.clientY - dragStart.y;
    updateActivePerson({ panX: newPanX, panY: newPanY });
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

  const displayW =
    naturalSize && naturalSize.width > 0 ? naturalSize.width * baseScale : framePixelW;
  const displayH =
    naturalSize && naturalSize.height > 0 ? naturalSize.height * baseScale : framePixelH;

  const totalQuadrantCounts = getQuadrantTotalCounts(persons);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl rounded-2xl bg-white shadow-2xl border border-slate-200/80 overflow-hidden my-6 max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="border-b border-slate-100 px-6 py-4 bg-white flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              {quadrantLabel}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Upload single or multi-person customer photos for this quadrant
            </p>
          </div>
        </div>

        {/* Multi-Person Tab Selector Bar */}
        <div className="flex items-center justify-between gap-2 px-6 py-2.5 bg-slate-50/70 border-b border-slate-100">
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
            <span className="text-[11px] font-semibold text-slate-500 mr-1 flex items-center gap-1 shrink-0">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              Photos ({persons.length}):
            </span>

            {persons.map((person, idx) => {
              const isActive = activePersonIndex === idx;
              const displayName = person.customerName?.trim()
                ? person.customerName.trim().toUpperCase()
                : `Person ${idx + 1}`;
              const hasImage = Boolean(person.originalImage);

              return (
                <div
                  key={person.id}
                  onClick={() => setActivePersonIndex(idx)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs font-semibold cursor-pointer transition shrink-0 ${
                    isActive
                      ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      hasImage
                        ? isActive
                          ? 'bg-emerald-400'
                          : 'bg-emerald-500'
                        : 'bg-amber-400'
                    }`}
                    title={hasImage ? 'Photo loaded' : 'No photo uploaded'}
                  />
                  <span className="truncate max-w-[110px]">{displayName}</span>

                  {persons.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemovePerson(idx);
                      }}
                      className="p-0.5 rounded-sm hover:bg-red-500 hover:text-white text-slate-400 transition ml-0.5"
                      title={`Remove ${displayName}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}

            {persons.length < 4 && (
              <button
                type="button"
                onClick={handleAddPerson}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-dashed border-slate-300 text-slate-600 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50/30 text-xs font-semibold transition shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Person</span>
              </button>
            )}
          </div>

          <div className="hidden sm:flex items-center gap-1 text-[11px] text-slate-400 shrink-0">
            <span>Up to 4 persons in 1 quadrant</span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 overflow-y-auto flex-1 min-h-0">
          {/* Left Column: Photo Framing Canvas (7 cols) */}
          <div className="lg:col-span-7 flex flex-col items-center justify-center gap-4">
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onClick={(e) => {
                // Ensure selecting the same file again triggers onChange
                (e.target as HTMLInputElement).value = '';
              }}
              onChange={handleFileChange}
              className="hidden"
            />

            {/* Direct Physical Photo Frame */}
            <div className="flex flex-col items-center justify-center w-full py-2">
              <div
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDragEnter={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const file = e.dataTransfer.files?.[0];
                  if (file) {
                    loadFileForActivePerson(file);
                  }
                }}
                className={`relative bg-white shadow-md border border-slate-300 rounded-sm overflow-hidden select-none cursor-grab active:cursor-grabbing transition-all ${
                  frameMode === 'passport'
                    ? 'w-[280px] h-[360px]'
                    : frameMode === '1x1'
                    ? 'w-[280px] h-[280px]'
                    : 'w-[320px] h-[320px]'
                }`}
              >
                {activePerson?.originalImage ? (
                  <>
                    {/* The Scaled/Panned Image */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
                      <img
                        src={activePerson.processedPreview || activePerson.originalImage}
                        alt="Crop target"
                        onLoad={(e) => {
                          const target = e.currentTarget;
                          if (target.naturalWidth > 0 && target.naturalHeight > 0) {
                            setNaturalSize({
                              width: target.naturalWidth,
                              height: target.naturalHeight,
                            });
                          }
                        }}
                        style={{
                          width: `${displayW}px`,
                          height: `${displayH}px`,
                          maxWidth: 'none',
                          maxHeight: 'none',
                          transform: `translate(${activePerson.panX}px, ${activePerson.panY}px) scale(${activePerson.zoom}) rotate(${activePerson.rotation}deg)`,
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
                    {activePerson.nameTagEnabled && activePerson.customerName && (
                      <div className="absolute bottom-0 inset-x-0 bg-white border-t border-slate-400 py-1 px-2 text-center shadow-md z-20">
                        <p className="text-xs font-black text-black tracking-wider uppercase truncate">
                          {activePerson.customerName}
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
                      Upload photo for {activePerson?.customerName || `Person ${activePersonIndex + 1}`}
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
            {activePerson?.originalImage && (
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50/80 p-2.5 rounded-xl border border-slate-200/80 max-w-[360px] w-full shadow-2xs">
                {/* Zoom */}
                <div className="flex items-center gap-2">
                  <ZoomOut className="w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="range"
                    min="0.5"
                    max="2.5"
                    step="0.05"
                    value={activePerson.zoom}
                    onChange={(e) =>
                      updateActivePerson({ zoom: parseFloat(e.target.value) })
                    }
                    className="w-20 accent-blue-600 h-1.5"
                  />
                  <ZoomIn className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-[11px] font-mono text-slate-500 w-8">
                    {Math.round(activePerson.zoom * 100)}%
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      updateActivePerson((prev) => ({
                        ...prev,
                        rotation: (prev.rotation + 90) % 360,
                      }))
                    }
                    className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded-md transition border border-transparent hover:border-slate-200 shadow-2xs"
                    title="Rotate 90°"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updateActivePerson({
                        zoom: 1,
                        rotation: 0,
                        panX: 0,
                        panY: 0,
                      })
                    }
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
                    onChange={(e) =>
                      handleFrameModeChange(e.target.value as PhotoFormatCategory)
                    }
                    className="w-full appearance-none bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 pr-8 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition shadow-2xs cursor-pointer"
                  >
                    <option value="2x2">2×2" Frame (51 × 51 mm)</option>
                    <option value="passport">Passport Frame (35 × 45 mm)</option>
                    <option value="1x1">1×1" Frame (25 × 25 mm)</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Name Tag Option for Active Person */}
              <div className="pt-2.5 border-t border-slate-200/60">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-800">
                    <input
                      type="checkbox"
                      checked={activePerson.nameTagEnabled}
                      onChange={(e) =>
                        updateActivePerson({ nameTagEnabled: e.target.checked })
                      }
                      className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500 accent-blue-600"
                    />
                    <Type className="w-3.5 h-3.5 text-blue-600" />
                    Print Name Tag ({activePerson.customerName || `Person ${activePersonIndex + 1}`})
                  </label>
                  <span className="text-[10px] text-slate-400">Optional</span>
                </div>

                {activePerson.nameTagEnabled && (
                  <div className="flex flex-col gap-2 mt-2.5">
                    <input
                      type="text"
                      placeholder="e.g. JUAN D. DELA CRUZ"
                      value={activePerson.customerName}
                      onChange={(e) =>
                        updateActivePerson({ customerName: e.target.value })
                      }
                      className="w-full px-3 py-1.5 text-xs uppercase font-semibold bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-hidden shadow-2xs"
                    />
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          updateActivePerson((prev) => ({
                            ...prev,
                            customerName: prev.customerName.toUpperCase(),
                          }))
                        }
                        className="px-2 py-0.5 text-[10px] font-semibold bg-white border border-slate-200 rounded text-slate-600 hover:bg-slate-100"
                      >
                        ALL CAPS
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          updateActivePerson((prev) => ({
                            ...prev,
                            customerName: prev.customerName.replace(
                              /\w\S*/g,
                              (txt) =>
                                txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
                            ),
                          }))
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
                {persons.length > 1 && (
                  <span className="text-[10px] font-semibold text-slate-500">
                    Auto-split across {persons.length} persons
                  </span>
                )}
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
                {PACKAGE_PRESETS.filter(
                  (p) => packageFilter === 'all' || p.category === packageFilter
                ).map((preset) => {
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
                          <p className="text-xs font-bold text-slate-800 truncate">
                            {preset.name}
                          </p>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.2 rounded shrink-0 ${
                              preset.category === 'passport'
                                ? 'bg-purple-100 text-purple-700'
                                : preset.category === '1x1'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {preset.category === 'passport'
                              ? 'Passport'
                              : preset.category.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                          {preset.description}
                        </p>
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
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-800">
                  {persons.length > 1
                    ? `Quantities for ${
                        activePerson.customerName?.trim() || `Person ${activePersonIndex + 1}`
                      }`
                    : 'Customize Photo Quantities'}
                </span>
                {persons.length > 1 && (
                  <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                    Person {activePersonIndex + 1} of {persons.length}
                  </span>
                )}
              </div>

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
                      {activeCounts['2x2']}
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
                      {activeCounts['1x1']}
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
                      {activeCounts['passport']}
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

              {/* Combined Quadrant Total */}
              <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-200/70 text-[11px]">
                <span className="text-slate-500 font-medium">Quadrant Total:</span>
                <span className="font-semibold text-slate-800 bg-white border border-slate-200/80 px-2 py-0.5 rounded-md">
                  {totalQuadrantCounts['passport'] > 0 &&
                    `${totalQuadrantCounts['passport']}× Pass `}
                  {totalQuadrantCounts['2x2'] > 0 && `${totalQuadrantCounts['2x2']}× 2×2" `}
                  {totalQuadrantCounts['1x1'] > 0 && `${totalQuadrantCounts['1x1']}× 1×1"`}
                  {totalQuadrantCounts['passport'] === 0 &&
                    totalQuadrantCounts['2x2'] === 0 &&
                    totalQuadrantCounts['1x1'] === 0 &&
                    '0 photos'}
                </span>
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
                disabled={persons.every((p) => !p.originalImage) || isSaving}
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
