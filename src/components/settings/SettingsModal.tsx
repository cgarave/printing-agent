'use client';

import React, { useState, useEffect } from 'react';
import { X, Key, Check, Info, ShieldCheck, Sparkles, Store } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [apiKey, setApiKey] = useState('');
  const [shopName, setShopName] = useState('Print Shop Express');
  const [shopId, setShopId] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedKey = localStorage.getItem('gemini_api_key') || '';
      const storedShop = localStorage.getItem('shop_name') || 'Print Shop Express';
      let storedShopId = localStorage.getItem('shop_id');
      
      if (!storedShopId) {
        storedShopId = `shop-${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem('shop_id', storedShopId);
      }
      
      setApiKey(storedKey);
      setShopName(storedShop);
      setShopId(storedShopId);
    }
  }, [isOpen]);

  const handleSave = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('gemini_api_key', apiKey.trim());
      localStorage.setItem('shop_name', shopName.trim());
      window.dispatchEvent(new Event('settings_saved'));
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 700);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-100 text-blue-700 rounded-lg">
              <Key className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-slate-800">Counter Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Shop Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
              <Store className="w-3.5 h-3.5 text-blue-600" />
              Print Shop Name
            </label>
            <input
              type="text"
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              placeholder="e.g. Rush ID & Print Center"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>

          {/* Optional Gemini API Key */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                Optional Google Gemini API Key
              </label>
              <span className="text-[10px] text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded font-medium">
                Optional
              </span>
            </div>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
            />
            <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
              Enables optional 1-click AI parsing for messy document scans & ID photos. Word (.docx) files and photo cropping work 100% locally with <strong>no API key required</strong>.
            </p>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-[11px] text-slate-600 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <p>
              Your key is saved locally in this browser only. It is never logged or transmitted to third parties.
            </p>
          </div>

          <div className="border-t border-slate-100 pt-5 flex flex-col items-center text-center">
            <label className="block text-sm font-bold text-slate-700 mb-1">Customer Upload Portal</label>
            <p className="text-[11px] text-slate-500 mb-4 max-w-[280px]">
              Customers can scan this QR code with their phone to send files directly to your PC (No app required).
            </p>
            
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs mb-4 inline-block">
              {shopId && (
                <QRCodeSVG 
                  value={typeof window !== 'undefined' ? `${window.location.origin}/customer?shopId=${shopId}` : ''} 
                  size={140}
                  level="H"
                />
              )}
            </div>

            <div className="flex items-center gap-2 w-full mb-2">
              <input 
                type="text" 
                readOnly 
                value={typeof window !== 'undefined' && shopId ? `${window.location.origin}/customer?shopId=${shopId}` : ''} 
                className="flex-1 px-3 py-2 text-[10px] font-mono border border-slate-300 rounded-lg bg-slate-50 outline-none text-slate-500"
              />
              <a 
                href={typeof window !== 'undefined' && shopId ? `/customer?shopId=${shopId}` : '/customer'} 
                target="_blank" 
                rel="noreferrer"
                className="px-3 py-2 text-[11px] font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-lg transition shrink-0"
              >
                Open / Test
              </a>
            </div>
            <button
              onClick={() => {
                if (confirm('Are you sure? Your old QR code will stop working.')) {
                  const newId = `shop-${Math.random().toString(36).substr(2, 9)}`;
                  setShopId(newId);
                  if (typeof window !== 'undefined') {
                    localStorage.setItem('shop_id', newId);
                    // Force page reload to re-initialize PeerJS with the new ID
                    window.location.reload();
                  }
                }
              }}
              className="text-[11px] font-bold text-red-600 hover:text-red-700 underline mb-4"
            >
              Regenerate QR Code
            </button>

            <div className="w-full border-t border-slate-200 pt-4 mt-2 flex flex-col items-start text-left">
              <label className="block text-sm font-bold text-slate-700 mb-1">PC-to-PC Sync (Beta)</label>
              <p className="text-[11px] text-slate-500 mb-3">
                Want to view this queue on a 2nd computer? Copy the Host ID from the main PC and enter it here on the 2nd PC.
              </p>
              
              <div className="w-full mb-3">
                <label className="text-[10px] font-bold text-slate-600 block mb-1">This PC's Host ID:</label>
                <input 
                  type="text" 
                  readOnly 
                  value={shopId} 
                  className="w-full px-3 py-2 text-[10px] font-mono border border-slate-300 rounded-lg bg-slate-50 outline-none text-slate-500"
                />
              </div>

              <div className="w-full">
                <label className="text-[10px] font-bold text-slate-600 block mb-1">Connect to another Host PC:</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Paste Host ID here..."
                    id="syncHostInput"
                    defaultValue={typeof window !== 'undefined' ? localStorage.getItem('sync_host_id') || '' : ''}
                    className="flex-1 px-3 py-2 text-[10px] font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <button 
                    onClick={() => {
                      const input = document.getElementById('syncHostInput') as HTMLInputElement;
                      if (input && input.value.trim()) {
                        localStorage.setItem('sync_host_id', input.value.trim());
                        window.location.reload();
                      } else {
                        localStorage.removeItem('sync_host_id');
                        window.location.reload();
                      }
                    }}
                    className="px-3 py-2 text-[11px] font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition shrink-0"
                  >
                    Link PC
                  </button>
                </div>
                <p className="text-[9px] text-slate-400 mt-1">Leave blank and click Link PC to disconnect.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 bg-slate-50 border-t border-slate-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition"
          >
            {savedSuccess ? (
              <>
                <Check className="w-3.5 h-3.5" /> Saved!
              </>
            ) : (
              'Save Settings'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
