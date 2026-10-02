'use client';

import React from 'react';
import { Plus, Edit2, Trash2, CheckSquare, Square, User } from 'lucide-react';
import { CustomerPhotoData, PhotoFormatCategory, QuadrantSlotState } from '@/lib/types';
import { calculateQuadrantLayout, QUADRANT_WIDTH_MM, QUADRANT_HEIGHT_MM } from '@/lib/photo-packing';

interface QuadrantSlotProps {
  slot: QuadrantSlotState;
  onEdit: () => void;
  onEditWithFormat: (format: PhotoFormatCategory) => void;
  onToggleEnabled: () => void;
  onClear: () => void;
  onChangeFormat: (format: PhotoFormatCategory) => void;
}

export default function QuadrantSlot({
  slot,
  onEdit,
  onEditWithFormat,
  onToggleEnabled,
  onClear,
  onChangeFormat,
}: QuadrantSlotProps) {
  const { id, label, sublabel, enabled, photoData } = slot;

  const activeFormat: PhotoFormatCategory =
    slot.format ||
    photoData?.frameMode ||
    (photoData?.customCounts.passport && !photoData.customCounts['2x2'] ? 'passport' : '2x2');

  const layout = photoData ? calculateQuadrantLayout(photoData.customCounts) : null;

  const handleEditActive = () => {
    onEditWithFormat(activeFormat);
  };

  return (
    <div
      className={`relative flex flex-col rounded-2xl border transition-all duration-200 overflow-hidden ${
        enabled
          ? 'border-slate-200/90 bg-white shadow-xs hover:border-slate-300'
          : 'border-slate-200/60 bg-slate-50/70 opacity-60'
      }`}
    >
      {/* Slot Header Bar */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-slate-100 bg-slate-50/60 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {/* Print Checkbox */}
          <button
            type="button"
            onClick={onToggleEnabled}
            title={enabled ? 'Uncheck to skip printing this quadrant' : 'Check to include in print'}
            className="text-blue-600 hover:text-blue-700 transition shrink-0"
          >
            {enabled ? (
              <CheckSquare className="w-4 h-4 text-blue-600" />
            ) : (
              <Square className="w-4 h-4 text-slate-300" />
            )}
          </button>
          <div className="truncate">
            <span className="text-xs font-semibold text-slate-800">{label}</span>
            <span className="text-[10px] text-slate-400 ml-1.5 hidden sm:inline">
              ({sublabel})
            </span>
          </div>
        </div>

        {/* Quadrant Output Size Toggle & Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200/60">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChangeFormat('2x2');
              }}
              className={`px-2 py-0.5 text-[10px] font-semibold rounded-md transition ${
                activeFormat === '2x2'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
              title="2×2 inches (51×51 mm)"
            >
              2×2
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChangeFormat('passport');
              }}
              className={`px-2 py-0.5 text-[10px] font-semibold rounded-md transition ${
                activeFormat === 'passport'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Passport (35×45 mm)"
            >
              Passport
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChangeFormat('1x1');
              }}
              className={`px-1.5 py-0.5 text-[10px] font-semibold rounded-md transition ${
                activeFormat === '1x1'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
              title="1×1 inch (25×25 mm)"
            >
              1×1
            </button>
          </div>

          {photoData && (
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={handleEditActive}
                className="p-1 rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                title="Edit photo or crop"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={onClear}
                className="p-1 rounded-md text-slate-400 hover:bg-red-50 hover:text-red-600 transition"
                title="Clear quadrant"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Slot Content / Visual Miniature Preview */}
      <div
        onClick={handleEditActive}
        className="relative flex-1 min-h-[220px] p-3 flex items-center justify-center cursor-pointer overflow-hidden transition group"
      >
        {photoData && layout ? (
          <div className="relative w-full h-full flex flex-col items-center justify-center">
            {/* Scaled Aspect Ratio Container matching 105 x 148.5 mm (A4 1/4 sheet) */}
            <div className="relative w-[170px] sm:w-[180px] h-[240px] sm:h-[254px] bg-white shadow-xs border border-slate-200/90 rounded-xs overflow-hidden group-hover:border-slate-300 transition">
              {layout.items.map((item) => {
                const leftPct = (item.xMm / QUADRANT_WIDTH_MM) * 100;
                const topPct = (item.yMm / QUADRANT_HEIGHT_MM) * 100;
                const widthPct = (item.widthMm / QUADRANT_WIDTH_MM) * 100;
                const heightPct = (item.heightMm / QUADRANT_HEIGHT_MM) * 100;

                const itemImage =
                  item.size === 'passport' && photoData.processedImagePassport
                    ? photoData.processedImagePassport
                    : (item.size === '2x2' || item.size === '1x1') && photoData.processedImage2x2
                    ? photoData.processedImage2x2
                    : photoData.processedImage;

                return (
                  <div
                    key={item.id}
                    className="absolute border border-slate-700 overflow-hidden bg-white shadow-2xs group/item"
                    style={{
                      left: `${leftPct}%`,
                      top: `${topPct}%`,
                      width: `${widthPct}%`,
                      height: `${heightPct}%`,
                    }}
                  >
                    <img
                      src={itemImage}
                      alt="Mini preview"
                      className="w-full h-full object-cover"
                    />

                    {/* Size Pill Tag */}
                    <div className="absolute top-0.5 left-0.5 bg-black/60 text-white text-[6px] font-mono px-0.5 rounded leading-none">
                      {item.size === 'passport' ? '35×45' : item.size === '2x2' ? '2×2"' : '1×1"'}
                    </div>

                    {/* Name Tag Ribbon if enabled */}
                    {photoData.nameTagEnabled && photoData.customerName && (
                      <div className="absolute bottom-0 inset-x-0 bg-white border-t border-slate-300 py-0.5 text-center leading-none">
                        <span className="text-[6px] font-bold text-black uppercase tracking-tight truncate block px-0.5">
                          {photoData.customerName}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="w-[170px] sm:w-[180px] h-[240px] sm:h-[254px] rounded-xl border-2 border-dashed border-slate-200 bg-white/70 group-hover:border-blue-400/80 group-hover:bg-blue-50/20 transition flex flex-col items-center justify-center p-4 text-center">
            <div className="w-9 h-9 rounded-full bg-slate-50 border border-slate-200/80 flex items-center justify-center text-slate-400 group-hover:text-blue-600 group-hover:border-blue-200 transition shadow-2xs mb-2">
              <Plus className="w-4 h-4" />
            </div>
            <p className="text-xs font-semibold text-slate-700 group-hover:text-blue-600 transition">
              Load Photo
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {activeFormat === 'passport' ? 'Passport (35×45mm)' : activeFormat === '1x1' ? '1×1" Grid' : '2×2" Package'}
            </p>
          </div>
        )}
      </div>

      {/* Slot Footer Summary */}
      {photoData && (
        <div className="px-3.5 py-2 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 truncate">
            <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="font-medium text-slate-700 truncate text-[11px]">
              {photoData.customerName || 'Customer Package'}
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0 ml-1">
            <span className="text-[10px] font-semibold text-slate-600 bg-white border border-slate-200/80 px-2 py-0.5 rounded-md">
              {photoData.customCounts['passport'] > 0 && `${photoData.customCounts['passport']}× Pass `}
              {photoData.customCounts['2x2'] > 0 && `${photoData.customCounts['2x2']}× 2×2" `}
              {photoData.customCounts['1x1'] > 0 && `${photoData.customCounts['1x1']}× 1×1"`}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
