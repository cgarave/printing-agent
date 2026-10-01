'use client';

import React from 'react';
import { Plus, Edit2, Trash2, Printer, CheckSquare, Square, User } from 'lucide-react';
import { QuadrantSlotState } from '@/lib/types';
import { calculateQuadrantLayout, QUADRANT_WIDTH_MM, QUADRANT_HEIGHT_MM } from '@/lib/photo-packing';

interface QuadrantSlotProps {
  slot: QuadrantSlotState;
  onEdit: () => void;
  onToggleEnabled: () => void;
  onClear: () => void;
}

export default function QuadrantSlot({
  slot,
  onEdit,
  onToggleEnabled,
  onClear,
}: QuadrantSlotProps) {
  const { id, label, sublabel, enabled, photoData } = slot;

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
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200 bg-slate-50/80 rounded-t-xl">
        <div className="flex items-center gap-2">
          {/* Print Checkbox */}
          <button
            onClick={onToggleEnabled}
            title={enabled ? 'Uncheck to skip printing this quadrant' : 'Check to include in print'}
            className="text-blue-600 hover:text-blue-700 transition"
          >
            {enabled ? (
              <CheckSquare className="w-4 h-4 text-blue-600" />
            ) : (
              <Square className="w-4 h-4 text-slate-400" />
            )}
          </button>
          <div>
            <span className="text-xs font-bold text-slate-800">{label}</span>
            <span className="text-[10px] text-slate-500 ml-1.5 hidden sm:inline">
              ({sublabel})
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {photoData ? (
            <>
              <button
                onClick={onEdit}
                className="p-1 rounded text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition"
                title="Edit package or photo"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={onClear}
                className="p-1 rounded text-red-500 hover:bg-red-50 transition"
                title="Clear this quadrant"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <button
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
        className="relative flex-1 min-h-[220px] p-2 flex items-center justify-center cursor-pointer overflow-hidden bg-slate-50/50 hover:bg-slate-100/60 transition group"
      >
        {photoData && layout ? (
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Scaled Aspect Ratio Container matching 105 x 148.5 mm (approx 1:1.414) */}
            <div
              className="relative w-[180px] h-[254px] bg-white shadow-xs border border-slate-300 overflow-hidden"
              style={{
                // Aspect ratio is 105 / 148.5
              }}
            >
              {layout.items.map((item) => {
                // Compute percentage coordinates relative to 105x148.5 mm
                const leftPct = (item.xMm / QUADRANT_WIDTH_MM) * 100;
                const topPct = (item.yMm / QUADRANT_HEIGHT_MM) * 100;
                const widthPct = (item.widthMm / QUADRANT_WIDTH_MM) * 100;
                const heightPct = (item.heightMm / QUADRANT_HEIGHT_MM) * 100;

                return (
                  <div
                    key={item.id}
                    className="absolute border border-slate-400/80 overflow-hidden bg-slate-100"
                    style={{
                      left: `${leftPct}%`,
                      top: `${topPct}%`,
                      width: `${widthPct}%`,
                      height: `${heightPct}%`,
                    }}
                  >
                    <img
                      src={photoData.processedImage}
                      alt="Mini preview"
                      className="w-full h-full object-cover"
                    />

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
            <p className="text-xs font-semibold text-slate-600 group-hover:text-blue-600 transition">
              Click to load Customer Photo
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              2×2, 1×1, or Passport Combos
            </p>
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
          <span className="text-[10px] text-slate-500 font-mono shrink-0 ml-1">
            {photoData.customCounts['2x2'] > 0 && `${photoData.customCounts['2x2']}x 2×2 `}
            {photoData.customCounts['1x1'] > 0 && `${photoData.customCounts['1x1']}x 1×1 `}
            {photoData.customCounts['passport'] > 0 && `${photoData.customCounts['passport']}x Pass`}
          </span>
        </div>
      )}
    </div>
  );
}
