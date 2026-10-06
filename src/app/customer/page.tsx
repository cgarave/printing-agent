'use client';

import React, { useState, useRef, useCallback } from 'react';
import { UploadCloud, CheckCircle2, File as FileIcon, X, Send } from 'lucide-react';
import { usePrintQueue } from '@/lib/contexts/PrintQueueContext';

export default function CustomerUploadPage() {
  const { addToQueue } = usePrintQueue();
  const [file, setFile] = useState<File | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setIsUploading(true);

    try {
      // Create a temporary object URL for previews (will be persisted in queue)
      const fileUrl = URL.createObjectURL(file);
      await addToQueue({
        customerName: customerName.trim() || 'Guest',
        file,
        fileUrl,
        fileType: file.type || 'application/octet-stream',
      });
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        setFile(null);
        setCustomerName('');
      }, 3000);
    } catch (error) {
      console.error('Failed to submit file', error);
      alert('Upload failed. Please try again.');
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
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Your Document or Photo</label>
                
                {!file ? (
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 rounded-xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition"
                  >
                    <UploadCloud className="w-10 h-10 text-slate-400" />
                    <div className="text-center">
                      <p className="text-sm font-medium text-slate-700">Tap to upload or drag and drop</p>
                      <p className="text-xs text-slate-500 mt-1">Images, PDFs, or Word Documents</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-10 h-10 bg-white rounded-lg border border-slate-200 flex items-center justify-center shrink-0">
                        {file.type.startsWith('image/') ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={URL.createObjectURL(file)} alt="preview" className="w-full h-full object-cover rounded-lg" />
                        ) : (
                          <FileIcon className="w-5 h-5 text-blue-500" />
                        )}
                      </div>
                      <div className="truncate">
                        <p className="text-sm font-semibold text-slate-800 truncate">{file.name}</p>
                        <p className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFile(null)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition shrink-0"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                )}
                
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
              </div>

              <button
                type="submit"
                disabled={!file || !customerName.trim() || isUploading}
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
