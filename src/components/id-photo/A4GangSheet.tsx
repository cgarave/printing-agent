'use client';

import React, { useState } from 'react';
import {
  Printer,
  Download,
  CheckSquare,
  Square,
  Trash2,
  FileCheck,
  Sparkles,
  Info,
  Layers,
  Copy,
} from 'lucide-react';
import { CustomerPhotoData, PACKAGE_PRESETS, PhotoFormatCategory, QuadrantId, QuadrantSlotState } from '@/lib/types';
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

export default function A4GangSheet() {
  const [quadrants, setQuadrants] = useState<QuadrantSlotState[]>(INITIAL_QUADRANTS);
  const [activeEditingSlotId, setActiveEditingSlotId] = useState<QuadrantId | null>(null);
  const [activeEditingFormat, setActiveEditingFormat] = useState<PhotoFormatCategory>('2x2');
  const [isExportingPdf, setIsExportingPdf] = useState(false);

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

          return {
            ...q,
            format,
            photoData: {
              ...q.photoData,
              frameMode: format,
              presetId: defaultPreset ? defaultPreset.id : q.photoData.presetId,
              customCounts: defaultPreset ? { ...defaultPreset.counts } : q.photoData.customCounts,
              processedImage: newProcessed,
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

          return {
            ...q,
            format: targetFormat,
            photoData: {
              ...q.photoData,
              frameMode: targetFormat,
              presetId: defaultPackage ? defaultPackage.id : q.photoData.presetId,
              customCounts: defaultPackage ? { ...defaultPackage.counts } : q.photoData.customCounts,
              processedImage: newProcessed,
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
        photoData: { ...sourcePhoto },
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
      const doc = await generateA4GangSheetPdf(quadrants, { showQuadrantBorders: true });
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
      const doc = await generateA4GangSheetPdf(quadrants, { showQuadrantBorders: true });
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
    <div className="flex flex-col gap-6">
      {/* Top Controls & Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            A4 Photo Paper Sheet (210 × 297 mm)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            4 independent quadrants. Uncheck any quadrant to skip printing on reused/cut paper.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Toggle All */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg mr-2">
            <button
              onClick={() => handleSelectAll(true)}
              className="px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-white rounded transition"
            >
              Select All
            </button>
            <button
              onClick={() => handleSelectAll(false)}
              className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-white rounded transition"
            >
              Deselect All
            </button>
          </div>

          {/* Clear All */}
          <button
            onClick={handleClearAll}
            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
            title="Clear all 4 quadrants"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          {/* Export PDF Button */}
          <button
            onClick={handleExportPdf}
            disabled={isExportingPdf || totalLoaded === 0}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-xs transition"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            {isExportingPdf ? 'Generating PDF...' : 'Download A4 PDF'}
          </button>

          {/* Print Button */}
          <button
            onClick={handleDirectPrint}
            disabled={totalLoaded === 0}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-lg shadow-xs transition"
          >
            <Printer className="w-3.5 h-3.5" />
            Print A4 Sheet ({totalEnabled}/4)
          </button>
        </div>
      </div>

      {/* Quick Sheet Layout Presets Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mr-1">
            <Layers className="w-3.5 h-3.5 text-blue-600" />
            Sheet Presets:
          </span>
          <button
            type="button"
            onClick={() => handleApplySheetPreset('all-2x2')}
            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition"
          >
            All 2×2 (Govt/Job)
          </button>
          <button
            type="button"
            onClick={() => handleApplySheetPreset('all-passport')}
            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 transition"
          >
            All Passport (35×45mm DFA)
          </button>
          <button
            type="button"
            onClick={() => handleApplySheetPreset('mixed')}
            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 text-slate-800 border border-slate-200 hover:bg-slate-200 transition"
          >
            Mixed (2x 2×2 + 2x Passport)
          </button>
          <button
            type="button"
            onClick={() => handleApplySheetPreset('all-1x1')}
            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition"
          >
            All 1×1 Grid
          </button>
        </div>

        {/* Copy to All Quadrants shortcut */}
        {totalLoaded > 0 && (
          <button
            type="button"
            onClick={handleDuplicateToAll}
            className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-slate-700 bg-slate-100 border border-slate-300 hover:bg-slate-200 rounded-lg transition"
            title="Duplicate loaded photo to all enabled quadrants"
          >
            <Copy className="w-3.5 h-3.5 text-slate-600" />
            Duplicate Photo to All Quadrants
          </button>
        )}
      </div>

      {/* Visual A4 Paper Representation: 2x2 Quadrant Grid */}
      <div className="flex justify-center">
        <div className="w-full max-w-4xl bg-slate-100/70 p-4 sm:p-6 rounded-3xl border border-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {quadrants.map((slot) => (
              <QuadrantSlot
                key={slot.id}
                slot={slot}
                onEdit={() => handleEditSlot(slot.id)}
                onEditWithFormat={(format) => handleEditSlot(slot.id, format)}
                onToggleEnabled={() => handleToggleEnabled(slot.id)}
                onClear={() => handleClearSlot(slot.id)}
                onChangeFormat={(format) => handleChangeSlotFormat(slot.id, format)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Helpful Operational Tips */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-600">
        <div className="bg-blue-50/60 border border-blue-200/80 p-3.5 rounded-xl flex gap-2.5">
          <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <p>
            <strong className="text-blue-900 block font-semibold mb-0.5">Flexible Quadrant Formats</strong>
            Choose 2×2", Passport (35×45mm), or 1×1" independently per quadrant, or apply sheet presets to all quadrants with 1 click.
          </p>
        </div>
        <div className="bg-emerald-50/60 border border-emerald-200/80 p-3.5 rounded-xl flex gap-2.5">
          <FileCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <p>
            <strong className="text-emerald-900 block font-semibold mb-0.5">Zero-Gap Cutting Borders</strong>
            Photos abut seamlessly with crisp cutting guide borders for single-pass trimmer slicing without paper waste.
          </p>
        </div>
        <div className="bg-purple-50/60 border border-purple-200/80 p-3.5 rounded-xl flex gap-2.5">
          <Sparkles className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
          <p>
            <strong className="text-purple-900 block font-semibold mb-0.5">True 300 DPI Metric Scale</strong>
            Outputs exact 50.8mm (2×2"), 35×45mm (Passport), and 25.4mm (1×1") dimensions without stretching or scaling bugs.
          </p>
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
