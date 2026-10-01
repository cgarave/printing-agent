'use client';

import React from 'react';
import { Plus, Edit2, Trash2, CheckSquare, Square, User, Layers } from 'lucide-react';
import { CustomerPhotoData, PhotoFormatCategory, QuadrantSlotState } from '@/lib/types';
import { calculateQuadrantLayout, QUADRANT_WIDTH_MM, QUADRANT_HEIGHT_MM } from '@/lib/photo-packing';

interface QuadrantSlotProps {
  slot: QuadrantSlotState;
  onEdit: () => void;
  onToggleEnabled: () => void;
  onClear: () => void;
  onChangeFormat: (format: PhotoFormatCategory) => void;
}

export default function QuadrantSlot({
  slot,
  onEdit,
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

  return (
    <div
      className={`relative flex flex-col rounded-xl border transition-all ${
        enabled
          ? 'border-slate-300 bg-white shadow-xs'
          : 'border-slate-200 bg-slate-100/60 opacity-60'
      }`}
    >
      {/* Slot Header Bar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200 bg-slate-50/80 rounded-t-xl gap-2">
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
              <Square className="w-4 h-4 text-slate-400" />
            )}
          </button>
          <div className="truncate">
            <span className="text-xs font-bold text-slate-800">{label}</span>
            <span className="text-[10px] text-slate-500 ml-1 hidden sm:inline">
              ({sublabel})
            </span>
          </div>
        </div>

        {/* Quadrant Output Size Toggle & Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChangeFormat('2x2');
              }}
              className={`px-2 py-0.5 text-[10px] font-bold rounded transition ${
                activeFormat === '2x2'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Set output package to 2×2 (51×51 mm)"
            >
              2×2
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChangeFormat('passport');
              }}
              className={`px-2 py-0.5 text-[10px] font-bold rounded transition ${
                activeFormat === 'passport'
                  ? 'bg-purple-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Set output package to Passport (35×45 mm)"
            >
              Passport
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChangeFormat('1x1');
              }}
              className={`px-1.5 py-0.5 text-[10px] font-bold rounded transition ${
                activeFormat === '1x1'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Set output package to 1×1 (25×25 mm)"
            >
              1×1
            </button>
          </div>

          {photoData ? (
            <>
              <button
                type="button"
                onClick={onEdit}
                className="p-1 rounded text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition"
                title="Edit package or crop"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={onClear}
                className="p-1 rounded text-red-500 hover:bg-red-50 transition"
                title="Clear this quadrant"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 transition"
            >
              <Plus className="w-3 h-3" />
              Load
            </button>
          )}
        </div>
      </div>

      {/* Slot Content / Visual Miniature Preview */}
      <div
        onClick={onEdit}
        className="relative flex-1 min-h-[230px] p-2 flex items-center justify-center cursor-pointer overflow-hidden bg-slate-50/50 hover:bg-slate-100/60 transition group"
      >
        {photoData && layout ? (
          <div className="relative w-full h-full flex flex-col items-center justify-center">
            {/* Scaled Aspect Ratio Container matching 105 x 148.5 mm (A4 1/4 sheet) */}
            <div className="relative w-[180px] h-[254px] bg-white shadow-sm border border-slate-300 overflow-hidden">
              {/* Hairline center indicator */}
              <div className="absolute inset-0 pointer-events-none border border-dashed border-slate-200/60" />

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
                    className="absolute border border-slate-400/90 overflow-hidden bg-white shadow-2xs group/item"
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
          <div className="flex flex-col items-center justify-center text-center p-4">
            <div className="w-10 h-10 rounded-full bg-slate-200/70 flex items-center justify-center text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600 transition mb-2">
              <Plus className="w-5 h-5" />
            </div>
            <p className="text-xs font-semibold text-slate-700 group-hover:text-blue-600 transition">
              Click to load Photo
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Output set to: <strong className="text-slate-600">{activeFormat === 'passport' ? 'Passport (35×45 mm)' : activeFormat === '1x1' ? '1×1" Grid' : '2×2" Combo'}</strong>
            </p>
            <div className="flex items-center gap-1.5 mt-3">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onChangeFormat('2x2');
                  onEdit();
                }}
                className="px-2 py-1 text-[10px] font-bold rounded bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100"
              >
                + 2×2 Combo
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onChangeFormat('passport');
                  onEdit();
                }}
                className="px-2 py-1 text-[10px] font-bold rounded bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100"
              >
                + Passport (35×45mm)
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Slot Footer Summary */}
      {photoData && (
        <div className="px-3 py-1.5 border-t border-slate-200 bg-white rounded-b-xl flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-1.5 truncate">
            <User className="w-3 h-3 text-slate-400 shrink-0" />
            <span className="font-semibold text-slate-700 truncate">
              {photoData.customerName || 'Customer Package'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 ml-1">
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
              activeFormat === 'passport'
                ? 'bg-purple-100 text-purple-700'
                : activeFormat === '1x1'
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-blue-100 text-blue-700'
            }`}>
              {photoData.customCounts['passport'] > 0 && `${photoData.customCounts['passport']}x Pass (35×45mm) `}
              {photoData.customCounts['2x2'] > 0 && `${photoData.customCounts['2x2']}x 2×2" `}
              {photoData.customCounts['1x1'] > 0 && `${photoData.customCounts['1x1']}x 1×1"`}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
