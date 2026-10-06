'use client';

import React, { useState, useEffect } from 'react';
import {
  Camera,
  FileText,
  Settings,
  Printer,
  Layers,
  Inbox,
} from 'lucide-react';
import A4GangSheet from '@/components/id-photo/A4GangSheet';
import DocEncoderView from '@/components/doc-encoder/DocEncoderView';
import SettingsModal from '@/components/settings/SettingsModal';
import BatchLayoutView from '@/components/batch-layout/BatchLayoutView';
import StandardPhotoView from '@/components/standard-photos/StandardPhotoView';
import QueueDrawer, { ActiveTab } from '@/components/queue/QueueDrawer';
import { usePrintQueue } from '@/lib/contexts/PrintQueueContext';

export default function Home() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('id_photos');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [shopName, setShopName] = useState('Print Shop Express');
  
  // File passed from the queue to the active tool
  const [activeFile, setActiveFile] = useState<File | undefined>(undefined);
  
  const { unreadCount, clearUnread } = usePrintQueue();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const loadShopName = () => {
        const stored = localStorage.getItem('shop_name');
        if (stored) setShopName(stored);
      };
      
      // Load initially
      loadShopName();
      
      // Listen for changes
      window.addEventListener('settings_saved', loadShopName);
      return () => window.removeEventListener('settings_saved', loadShopName);
    }
  }, []);

  const handleOpenQueue = () => {
    setIsQueueOpen(true);
    clearUnread();
  };

  const handleSendToFile = (file: File, mode: ActiveTab) => {
    setActiveTab(mode);
    // Force a re-trigger by creating a new File reference if needed, 
    // or just pass it down and let the component handle it via useEffect.
    // To ensure the child component detects a *new* file even if it's the same name,
    // we can use a wrapper or just rely on object identity. The `file` object from DB is recreated.
    setActiveFile(file);
  };

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
            
            <button
              onClick={() => setActiveTab('batch_layout')}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'batch_layout'
                  ? 'bg-white text-blue-700 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Layers className="w-4 h-4" />
              Batch Layout
            </button>
            
            <button
              onClick={() => setActiveTab('standard_photos')}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'standard_photos'
                  ? 'bg-white text-blue-700 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Layers className="w-4 h-4" />
              Standard Photos
            </button>
          </nav>

          {/* Right Action: Queue & Settings */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenQueue}
              className="relative inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 border border-blue-700 rounded-lg hover:bg-blue-700 transition shadow-xs"
              title="Print Queue"
            >
              <Inbox className="w-4 h-4 text-blue-100" />
              <span className="hidden sm:inline">Queue</span>
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white shadow-sm ring-2 ring-white">
                  {unreadCount}
                </span>
              )}
            </button>

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
        {activeTab === 'id_photos' ? <A4GangSheet initialFile={activeFile} /> : 
         activeTab === 'doc_encoder' ? <DocEncoderView initialFile={activeFile} /> :
         activeTab === 'standard_photos' ? <StandardPhotoView initialFile={activeFile} /> :
         <BatchLayoutView initialFile={activeFile} />}
      </main>

      {/* Counter Operator Footer */}
      <footer className="bg-white border-t border-slate-200 py-3 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">Printing Agent</span>
            <span>•</span>
            <span>ID Photos, Document Encoding, & Batch Print</span>
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
      
      {/* Queue Drawer */}
      <QueueDrawer isOpen={isQueueOpen} onClose={() => setIsQueueOpen(false)} onSendToFile={handleSendToFile} />
    </div>
  );
}
