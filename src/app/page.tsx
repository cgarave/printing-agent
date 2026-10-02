'use client';

import React, { useState, useEffect } from 'react';
import {
  Camera,
  FileText,
  Settings,
  Printer,
  Sparkles,
  Layers,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';
import A4GangSheet from '@/components/id-photo/A4GangSheet';
import DocEncoderView from '@/components/doc-encoder/DocEncoderView';
import SettingsModal from '@/components/settings/SettingsModal';

type ActiveTab = 'id_photos' | 'doc_encoder';

export default function Home() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('id_photos');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [shopName, setShopName] = useState('Print Shop Express');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('shop_name');
      if (stored) setShopName(stored);
    }
  }, [isSettingsOpen]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-100/60 font-sans">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Shop Identity */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black tracking-tight text-slate-900">
                  Printing Agent
                </h1>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                  Counter v1.0
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">{shopName}</p>
            </div>
          </div>

          {/* Center Tabs Switcher */}
          <nav className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setActiveTab('id_photos')}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'id_photos'
                  ? 'bg-white text-blue-700 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Camera className="w-4 h-4" />
              ID Photos (A4)
            </button>

            <button
              onClick={() => setActiveTab('doc_encoder')}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'doc_encoder'
                  ? 'bg-white text-blue-700 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <FileText className="w-4 h-4" />
              Document Encoder
            </button>
          </nav>

          {/* Right Action: Settings */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition shadow-xs"
              title="Shop Settings & API Keys"
            >
              <Settings className="w-4 h-4 text-slate-500" />
              <span className="hidden sm:inline">Settings</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'id_photos' ? <A4GangSheet /> : <DocEncoderView />}
      </main>

      {/* Counter Operator Footer */}
      <footer className="bg-white border-t border-slate-200 py-3 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">Printing Agent</span>
            <span>•</span>
            <span>ID Photos & Document Encoding</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono text-[11px]">
              Shortcut: <kbd className="font-bold">Ctrl + P</kbd>
            </span>
          </div>
        </div>
      </footer>

      {/* Settings Modal */}
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
}
