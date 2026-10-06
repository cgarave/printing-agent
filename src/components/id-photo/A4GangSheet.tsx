'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Printer,
  Download,
  Trash2,
  Layers,
  Copy,
  ChevronDown,
} from 'lucide-react';
import { CustomerPhotoData, PACKAGE_PRESETS, PhotoFormatCategory, QuadrantId, QuadrantSlotState, PrintLayoutMode } from '@/lib/types';
import QuadrantSlot from './QuadrantSlot';
import PhotoEditorModal from './PhotoEditorModal';
import { generateA4GangSheetPdf } from '@/lib/pdf-generator';

const INITIAL_QUADRANTS: QuadrantSlotState[] = [
  {
    id: 'q1',
    label: 'Quadrant 1',
    sublabel: 'Top-Left',
    enabled: true,
    format: '2x2',
    photoData: null,
  },
  {
    id: 'q2',
    label: 'Quadrant 2',
    sublabel: 'Top-Right',
    enabled: true,
    format: '2x2',
    photoData: null,
  },
  {
    id: 'q3',
    label: 'Quadrant 3',
    sublabel: 'Bottom-Left',
    enabled: true,
    format: '2x2',
    photoData: null,
  },
  {
    id: 'q4',
    label: 'Quadrant 4',
    sublabel: 'Bottom-Right',
    enabled: true,
    format: '2x2',
    photoData: null,
  },
];

export default function A4GangSheet({ initialFile }: { initialFile?: File }) {
  const [quadrants, setQuadrants] = useState<QuadrantSlotState[]>(INITIAL_QUADRANTS);
  const [layoutMode, setLayoutMode] = useState<PrintLayoutMode>('full');
  const [activeEditingSlotId, setActiveEditingSlotId] = useState<QuadrantId | null>(null);
  const [activeEditingFormat, setActiveEditingFormat] = useState<PhotoFormatCategory>('2x2');
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isPresetsOpen, setIsPresetsOpen] = useState(false);
  const presetsRef = useRef<HTMLDivElement>(null);

  // Handle incoming file from print queue
  useEffect(() => {
    if (initialFile) {
      const hasUnsaved = quadrants.some(q => q.photoData !== null);
      if (hasUnsaved) {
        const confirmOverwrite = window.confirm("You have unsaved work in ID Photos. Do you want to overwrite it with the new file from the queue?");
        if (!confirmOverwrite) return;
      }
      
      const fileUrl = URL.createObjectURL(initialFile);
      setQuadrants((prev) => prev.map((q) => {
        if (q.id === 'q1') {
          return {
            ...q,
            enabled: true,
            photoData: {
              originalImage: fileUrl,
              processedImage: fileUrl,
              frameMode: '2x2',
              presetId: '2x2-combo',
              customCounts: { '2x2': 6, '1x1': 0, passport: 0 },
              customerName: '',
              backgroundColor: '#FFFFFF',
              photos: []
            } as CustomerPhotoData
          };
        }
        return { ...q, photoData: null }; // Clear others
      }));
      setActiveEditingFormat('2x2');
      setActiveEditingSlotId('q1');
    }
  }, [initialFile]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (presetsRef.current && !presetsRef.current.contains(event.target as Node)) {
        setIsPresetsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Active slot for modal
  const activeSlot = quadrants.find((q) => q.id === activeEditingSlotId) || null;

  const handleEditSlot = (id: QuadrantId, forcedFormat?: PhotoFormatCategory) => {
    const slot = quadrants.find((q) => q.id === id);
    const targetFormat = forcedFormat || slot?.format || slot?.photoData?.frameMode || '2x2';
    setActiveEditingFormat(targetFormat);
    setActiveEditingSlotId(id);
  };

  const handleSaveSlotData = (data: CustomerPhotoData) => {
    if (!activeEditingSlotId) return;
    setQuadrants((prev) =>
      prev.map((q) =>
        q.id === activeEditingSlotId
          ? { ...q, photoData: data, format: data.frameMode, enabled: true }
          : q
      )
    );
  };

  const handleChangeSlotFormat = (id: QuadrantId, format: PhotoFormatCategory) => {
    setQuadrants((prev) =>
      prev.map((q) => {
        if (q.id !== id) return q;

        if (q.photoData) {
          const defaultPreset = PACKAGE_PRESETS.find((p) => p.category === format);
          const newProcessed =
            format === 'passport'
              ? q.photoData.processedImagePassport || q.photoData.processedImage
              : q.photoData.processedImage2x2 || q.photoData.processedImage;

          const numPersons = q.photoData.photos?.length || 1;
          const targetCounts = defaultPreset ? { ...defaultPreset.counts } : q.photoData.customCounts;

          const updatedPhotos = q.photoData.photos
            ? q.photoData.photos.map((p, idx) => {
                const base2x2 = Math.floor(targetCounts['2x2'] / numPersons);
                const rem2x2 = targetCounts['2x2'] % numPersons;
                const base1x1 = Math.floor(targetCounts['1x1'] / numPersons);
                const rem1x1 = targetCounts['1x1'] % numPersons;
                const basePass = Math.floor(targetCounts.passport / numPersons);
                const remPass = targetCounts.passport % numPersons;

                return {
                  ...p,
                  processedImage:
                    format === 'passport'
                      ? p.processedImagePassport || p.processedImage
                      : p.processedImage2x2 || p.processedImage,
                  counts: {
                    '2x2': base2x2 + (idx < rem2x2 ? 1 : 0),
                    '1x1': base1x1 + (idx < rem1x1 ? 1 : 0),
                    passport: basePass + (idx < remPass ? 1 : 0),
                  },
                };
              })
            : [];

          return {
            ...q,
            format,
            photoData: {
              ...q.photoData,
              frameMode: format,
              presetId: defaultPreset ? defaultPreset.id : q.photoData.presetId,
              customCounts: targetCounts,
              processedImage: newProcessed,
              photos: updatedPhotos,
            },
          };
        }

        return { ...q, format };
      })
    );
  };

  const handleApplySheetPreset = (presetType: 'all-2x2' | 'all-passport' | 'mixed' | 'all-1x1') => {
    setQuadrants((prev) =>
      prev.map((q, idx) => {
        let targetFormat: PhotoFormatCategory = '2x2';
        if (presetType === 'all-passport') targetFormat = 'passport';
        else if (presetType === 'all-1x1') targetFormat = '1x1';
        else if (presetType === 'mixed') {
          targetFormat = idx < 2 ? '2x2' : 'passport';
        }

        const defaultPackage = PACKAGE_PRESETS.find((p) => p.category === targetFormat);

        if (q.photoData) {
          const newProcessed =
            targetFormat === 'passport'
              ? q.photoData.processedImagePassport || q.photoData.processedImage
              : q.photoData.processedImage2x2 || q.photoData.processedImage;

          const numPersons = q.photoData.photos?.length || 1;
          const targetCounts = defaultPackage ? { ...defaultPackage.counts } : q.photoData.customCounts;

          const updatedPhotos = q.photoData.photos
            ? q.photoData.photos.map((p, pIdx) => {
                const base2x2 = Math.floor(targetCounts['2x2'] / numPersons);
                const rem2x2 = targetCounts['2x2'] % numPersons;
                const base1x1 = Math.floor(targetCounts['1x1'] / numPersons);
                const rem1x1 = targetCounts['1x1'] % numPersons;
                const basePass = Math.floor(targetCounts.passport / numPersons);
                const remPass = targetCounts.passport % numPersons;

                return {
                  ...p,
                  processedImage:
                    targetFormat === 'passport'
                      ? p.processedImagePassport || p.processedImage
                      : p.processedImage2x2 || p.processedImage,
                  counts: {
                    '2x2': base2x2 + (pIdx < rem2x2 ? 1 : 0),
                    '1x1': base1x1 + (pIdx < rem1x1 ? 1 : 0),
                    passport: basePass + (pIdx < remPass ? 1 : 0),
                  },
                };
              })
            : [];

          return {
            ...q,
            format: targetFormat,
            photoData: {
              ...q.photoData,
              frameMode: targetFormat,
              presetId: defaultPackage ? defaultPackage.id : q.photoData.presetId,
              customCounts: targetCounts,
              processedImage: newProcessed,
              photos: updatedPhotos,
            },
          };
        }

        return { ...q, format: targetFormat };
      })
    );
  };

  const handleDuplicateToAll = () => {
    const sourcePhoto = quadrants.find((q) => q.photoData !== null)?.photoData;
    if (!sourcePhoto) {
      alert('Please load at least one photo first to copy to all quadrants.');
      return;
    }

    setQuadrants((prev) =>
      prev.map((q) => ({
        ...q,
        enabled: true,
        format: sourcePhoto.frameMode,
        photoData: {
          ...sourcePhoto,
          customCounts: { ...sourcePhoto.customCounts },
          photos: sourcePhoto.photos
            ? sourcePhoto.photos.map((p) => ({
                ...p,
                counts: { ...p.counts },
                cropState: p.cropState ? { ...p.cropState } : undefined,
              }))
            : [],
        },
      }))
    );
  };

  const handleToggleEnabled = (id: QuadrantId) => {
    setQuadrants((prev) =>
      prev.map((q) => (q.id === id ? { ...q, enabled: !q.enabled } : q))
    );
  };

  const handleClearSlot = (id: QuadrantId) => {
    setQuadrants((prev) =>
      prev.map((q) => (q.id === id ? { ...q, photoData: null } : q))
    );
  };

  const handleSelectAll = (enable: boolean) => {
    setQuadrants((prev) => prev.map((q) => ({ ...q, enabled: enable })));
  };

  const handleClearAll = () => {
    if (confirm('Clear all photos from all 4 quadrants?')) {
      setQuadrants(INITIAL_QUADRANTS);
    }
  };

  // PDF Export
  const handleExportPdf = async () => {
    const hasAnyPhotos = quadrants.some((q) => q.enabled && q.photoData);
    if (!hasAnyPhotos) {
      alert('Please load at least one photo into an enabled quadrant before generating PDF.');
      return;
    }

    setIsExportingPdf(true);
    try {
      const doc = await generateA4GangSheetPdf(quadrants, { showQuadrantBorders: true, layoutMode });
      doc.save(`A4_ID_Gang_Sheet_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (err) {
      console.error('Failed to export PDF:', err);
      alert('Failed to generate PDF. Check console for details.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Direct Browser Print
  const handleDirectPrint = async () => {
    const hasAnyPhotos = quadrants.some((q) => q.enabled && q.photoData);
    if (!hasAnyPhotos) {
      alert('Please load at least one photo into an enabled quadrant before printing.');
      return;
    }

    // Generate high-res PDF and open in new print window for exact 100% metric scale!
    try {
      const doc = await generateA4GangSheetPdf(quadrants, { showQuadrantBorders: true, layoutMode });
      const blob = doc.output('blob');
      const blobUrl = URL.createObjectURL(blob);
      const printWindow = window.open(blobUrl, '_blank');
      if (printWindow) {
        printWindow.focus();
      } else {
        doc.save(`A4_ID_Gang_Sheet_${new Date().toISOString().slice(0, 10)}.pdf`);
      }
    } catch (err) {
      console.error('Print preview failed:', err);
      window.print();
    }
  };

  const totalLoaded = quadrants.filter((q) => q.photoData !== null).length;
  const totalEnabled = quadrants.filter((q) => q.enabled && q.photoData !== null).length;

  return (
    <div className="flex flex-col gap-5">
      {/* Top Controls & Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white px-4 py-3 sm:px-5 sm:py-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            A4 Photo Sheet
            <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">210 × 297 mm</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            4 quadrants. Uncheck any quadrant to skip used paper.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Paper Layout Mode Toggle */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200/60 mr-1">
            <button
              onClick={() => setLayoutMode('full')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition ${layoutMode === 'full' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}
              title="Standard 4 quadrants layout"
            >
              Full A4
            </button>
            <button
              onClick={() => setLayoutMode('half-vertical')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition ${layoutMode === 'half-vertical' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}
              title="For A4 cut in half vertically (105x297mm)"
            >
              Half (Vert)
            </button>
            <button
              onClick={() => setLayoutMode('half-horizontal')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition ${layoutMode === 'half-horizontal' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}
              title="For A4 cut in half horizontally (210x148.5mm)"
            >
              Half (Horiz)
            </button>
            <button
              onClick={() => setLayoutMode('single')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition ${layoutMode === 'single' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}
              title="For a single quadrant cut (105x148.5mm)"
            >
              1 Quadrant
            </button>
          </div>

          {/* Select / Deselect Group */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200/60">
            <button
              onClick={() => handleSelectAll(true)}
              className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-white rounded-md transition shadow-2xs"
            >
              Select All
            </button>
            <button
              onClick={() => handleSelectAll(false)}
              className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-white rounded-md transition shadow-2xs"
            >
              Deselect All
            </button>
          </div>

          {/* Sheet Presets Dropdown */}
          <div className="relative" ref={presetsRef}>
            <button
              type="button"
              onClick={() => setIsPresetsOpen(!isPresetsOpen)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-2xs transition"
              title="Apply layout preset to all quadrants"
            >
              <Layers className="w-3.5 h-3.5 text-slate-500" />
              <span>Presets</span>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isPresetsOpen ? 'rotate-180' : ''}`} />
            </button>

            {isPresetsOpen && (
              <div className="absolute left-0 sm:right-0 sm:left-auto mt-1.5 w-56 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-30">
                <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Sheet Presets
                </div>
                <button
                  type="button"
                  onClick={() => {
                    handleApplySheetPreset('all-2x2');
                    setIsPresetsOpen(false);
                  }}
                  className="w-full text-left px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-blue-600 flex items-center justify-between"
                >
                  <span>All 2×2"</span>
                  <span className="text-[10px] text-slate-400">4× each</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleApplySheetPreset('all-passport');
                    setIsPresetsOpen(false);
                  }}
                  className="w-full text-left px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-purple-600 flex items-center justify-between"
                >
                  <span>All Passport (35×45mm)</span>
                  <span className="text-[10px] text-slate-400">4× each</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleApplySheetPreset('mixed');
                    setIsPresetsOpen(false);
                  }}
                  className="w-full text-left px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 flex items-center justify-between"
                >
                  <span>Mixed (2× 2x2 + 2× Pass)</span>
                  <span className="text-[10px] text-slate-400">2 + 2</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleApplySheetPreset('all-1x1');
                    setIsPresetsOpen(false);
                  }}
                  className="w-full text-left px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-emerald-600 flex items-center justify-between"
                >
                  <span>All 1×1" Grid</span>
                  <span className="text-[10px] text-slate-400">8× each</span>
                </button>

                {totalLoaded > 0 && (
                  <>
                    <div className="border-t border-slate-100 my-1" />
                    <button
                      type="button"
                      onClick={() => {
                        handleDuplicateToAll();
                        setIsPresetsOpen(false);
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-50 flex items-center gap-1.5"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Duplicate photo to all</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Clear All */}
          {totalLoaded > 0 && (
            <button
              onClick={handleClearAll}
              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
              title="Clear all 4 quadrants"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          <div className="h-4 w-px bg-slate-200 hidden sm:block mx-0.5" />

          {/* Export PDF Button */}
          <button
            onClick={handleExportPdf}
            disabled={isExportingPdf || totalLoaded === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg shadow-2xs transition"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>{isExportingPdf ? 'Exporting...' : 'Download PDF'}</span>
          </button>

          {/* Print Button */}
          <button
            onClick={handleDirectPrint}
            disabled={totalLoaded === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed rounded-lg shadow-2xs transition"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print ({totalEnabled}/4)</span>
          </button>
        </div>
      </div>

      {/* Visual A4 Paper Representation: 2x2 Quadrant Grid */}
      <div className="flex justify-center">
        <div className={`w-full bg-slate-200/50 p-3 sm:p-5 rounded-3xl border border-slate-200/80 ${layoutMode === 'full' || layoutMode === 'half-horizontal' ? 'max-w-4xl' : 'max-w-sm'}`}>
          <div className={`grid gap-3 sm:gap-4 ${
            layoutMode === 'full' || layoutMode === 'half-horizontal' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'
          }`}>
            {quadrants
              .filter((slot) => {
                if (layoutMode === 'single') return slot.id === 'q1';
                if (layoutMode === 'half-vertical' || layoutMode === 'half-horizontal') return slot.id === 'q1' || slot.id === 'q2';
                return true;
              })
              .map((slot) => {
                const displaySlot = { ...slot };
                if (layoutMode === 'half-vertical') {
                  displaySlot.label = slot.id === 'q1' ? 'Top Quadrant' : 'Bottom Quadrant';
                  displaySlot.sublabel = 'Centered';
                } else if (layoutMode === 'half-horizontal') {
                  displaySlot.label = slot.id === 'q1' ? 'Left Quadrant' : 'Right Quadrant';
                  displaySlot.sublabel = 'Top Edge';
                } else if (layoutMode === 'single') {
                  displaySlot.label = 'Single Quadrant';
                  displaySlot.sublabel = 'Top-Center';
                }

                return (
                  <QuadrantSlot
                    key={slot.id}
                    slot={displaySlot}
                    onEdit={() => handleEditSlot(slot.id)}
                    onEditWithFormat={(format) => handleEditSlot(slot.id, format)}
                    onToggleEnabled={() => handleToggleEnabled(slot.id)}
                    onClear={() => handleClearSlot(slot.id)}
                    onChangeFormat={(format) => handleChangeSlotFormat(slot.id, format)}
                  />
                );
              })}
          </div>
        </div>
      </div>

      {/* Photo Editor Modal */}
      {activeSlot && (
        <PhotoEditorModal
          isOpen={activeEditingSlotId !== null}
          quadrantLabel={`${activeSlot.label} (${activeSlot.sublabel})`}
          initialData={activeSlot.photoData}
          initialFormat={activeEditingFormat}
          onClose={() => setActiveEditingSlotId(null)}
          onSave={handleSaveSlotData}
        />
      )}
    </div>
  );
}
