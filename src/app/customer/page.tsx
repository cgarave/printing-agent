'use client';

import React, { useState, useRef, useCallback } from 'react';
import { UploadCloud, CheckCircle2, File as FileIcon, X, Send } from 'lucide-react';
import { usePrintQueue } from '@/lib/contexts/PrintQueueContext';

export default function CustomerUploadPage() {
  const { addToQueue } = usePrintQueue();
  const [files, setFiles] = useState<File[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFiles((prev) => [...prev, ...Array.from(e.dataTransfer.files)]);
    }
  }, []);

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length === 0) return;

    setIsUploading(true);

    try {
      const params = new URLSearchParams(window.location.search);
      const shopId = params.get('shopId');

      if (shopId) {
        // Use WebRTC to send to Admin PC directly
        const { default: Peer } = await import('peerjs');
        const peer = new Peer();

        await new Promise((resolve, reject) => {
          peer.on('open', async () => {
            const conn = peer.connect(shopId);
            
            conn.on('open', async () => {
              // Send files sequentially
              for (const file of files) {
                const buffer = await file.arrayBuffer();
                const payload = {
                  customerName: customerName.trim() || 'Guest',
                  fileBuffer: buffer,
                  fileName: file.name,
                  fileType: file.type || 'application/octet-stream',
                };
                
                await new Promise((resFile, rejFile) => {
                  const dataHandler = (data: any) => {
                    if (data && data.type === 'SUCCESS') {
                      conn.off('data', dataHandler);
                      resFile(true);
                    } else if (data && data.type === 'ERROR') {
                      conn.off('data', dataHandler);
                      rejFile(new Error(data.error));
                    }
                  };
                  conn.on('data', dataHandler);
                  conn.send({ type: 'NEW_REQUEST', payload });
                });
              }
              
              peer.destroy();
              resolve(true);
            });
            
            conn.on('error', (err) => reject(err));
            setTimeout(() => reject(new Error('Connection timed out. Admin PC might be offline.')), 30000);
          });
          peer.on('error', (err) => reject(err));
        });
      } else {
        // Fallback to local IndexedDB (Testing on same device)
        for (const file of files) {
          const buffer = await file.arrayBuffer();
          await addToQueue({
            customerName: customerName.trim() || 'Guest',
            fileBuffer: buffer,
            fileName: file.name,
            fileType: file.type || 'application/octet-stream',
          });
        }
      }

      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        setFiles([]);
        setCustomerName('');
      }, 3000);
    } catch (error: any) {
      console.error('Failed to submit files', error);
      alert(error.message || 'Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="bg-blue-600 px-6 py-8 text-center text-white">
          <h1 className="text-2xl font-black tracking-tight">Print Shop Kiosk</h1>
          <p className="text-blue-100 text-sm mt-2 font-medium">Send your files to the counter for printing.</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
          {isSuccess ? (
            <div className="flex flex-col items-center justify-center py-10 text-emerald-600 gap-3">
              <CheckCircle2 className="w-16 h-16 animate-bounce" />
              <p className="text-lg font-bold text-slate-800">Sent to Print Queue!</p>
              <p className="text-sm text-slate-500">The counter admin will assist you shortly.</p>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Your Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-semibold text-slate-700">Your Documents or Photos</label>
                  {files.length > 0 && (
                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{files.length} selected</span>
                  )}
                </div>
                
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 rounded-xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition mb-3"
                >
                  <UploadCloud className="w-10 h-10 text-slate-400" />
                  <div className="text-center">
                    <p className="text-sm font-medium text-slate-700">Tap to upload or drag and drop</p>
                    <p className="text-xs text-slate-500 mt-1">Select multiple images, PDFs, or Word Docs</p>
                  </div>
                </div>

                {files.length > 0 && (
                  <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                    {files.map((file, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="w-8 h-8 bg-white rounded-lg border border-slate-200 flex items-center justify-center shrink-0">
                            {file.type.startsWith('image/') ? (
                              <ImageIcon file={file} />
                            ) : (
                              <FileIcon className="w-4 h-4 text-blue-500" />
                            )}
                          </div>
                          <div className="truncate">
                            <p className="text-sm font-semibold text-slate-800 truncate">{file.name}</p>
                            <p className="text-[10px] text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition shrink-0"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                <input
                  type="file"
                  multiple
                  ref={fileInputRef}
                  onChange={(e) => {
                    if (e.target.files) {
                      setFiles((prev) => [...prev, ...Array.from(e.target.files as FileList)]);
                    }
                  }}
                  className="hidden"
                />
              </div>

              <button
                type="submit"
                disabled={files.length === 0 || !customerName.trim() || isUploading}
                className="mt-2 w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white py-3 rounded-xl font-bold transition shadow-sm"
              >
                {isUploading ? 'Sending...' : (
                  <>
                    <Send className="w-5 h-5" />
                    Send to Counter
                  </>
                )}
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  );
}

// Helper to render image previews safely without leaking object URLs
function ImageIcon({ file }: { file: File }) {
  const [url, setUrl] = useState('');
  React.useEffect(() => {
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  
  if (!url) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt="preview" className="w-full h-full object-cover rounded-lg" />;
}
