import React from 'react';
import { X, Clock, File as FileIcon, Image as ImageIcon, Trash2, ArrowRight } from 'lucide-react';
import { usePrintQueue, PrintRequest } from '@/lib/contexts/PrintQueueContext';

export type ActiveTab = 'id_photos' | 'doc_encoder' | 'batch_layout' | 'standard_photos';

interface QueueDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSendToFile: (file: File, mode: ActiveTab) => void;
}

export default function QueueDrawer({ isOpen, onClose, onSendToFile }: QueueDrawerProps) {
  const { queue, removeFromQueue } = usePrintQueue();

  if (!isOpen) return null;

  const handleSend = (req: PrintRequest, mode: ActiveTab) => {
    if (req.file) {
      onSendToFile(req.file, mode);
      onClose();
    }
  };

  return (
    <>
      <div 
        className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-50 transition-opacity"
        onClick={onClose}
      />
      
      <div className="fixed inset-y-0 right-0 w-full sm:w-96 bg-slate-50 shadow-2xl z-50 flex flex-col border-l border-slate-200 animate-in slide-in-from-right">
        <div className="flex items-center justify-between px-5 py-4 bg-white border-b border-slate-200">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-black tracking-tight text-slate-900">Print Queue</h2>
            <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">
              {queue.length}
            </span>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {queue.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3">
              <Clock className="w-12 h-12 opacity-20" />
              <p className="text-sm font-medium">Queue is empty</p>
            </div>
          ) : (
            queue.map(req => {
              const isImage = req.fileType.startsWith('image/');
              return (
                <div key={req.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 overflow-hidden flex-1">
                      <div className="w-12 h-12 bg-slate-100 rounded-lg border border-slate-200 flex items-center justify-center shrink-0">
                        {isImage ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={req.fileUrl} alt="preview" className="w-full h-full object-cover rounded-lg" />
                        ) : (
                          <FileIcon className="w-6 h-6 text-slate-400" />
                        )}
                      </div>
                      <div className="truncate">
                        <p className="text-sm font-bold text-slate-900 truncate">{req.customerName}</p>
                        <p className="text-xs text-slate-500 truncate">{req.fileName}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {req.timestamp.toLocaleTimeString()} • {req.file ? (req.file.size / 1024 / 1024).toFixed(2) : '0.00'} MB
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={() => removeFromQueue(req.id)}
                      className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-md transition"
                      title="Remove from queue"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    {isImage ? (
                      <>
                        <button onClick={() => handleSend(req, 'id_photos')} className="text-[11px] font-semibold flex items-center justify-center gap-1.5 bg-blue-50 text-blue-700 py-1.5 rounded-lg hover:bg-blue-100 transition">
                          ID Photos <ArrowRight className="w-3 h-3" />
                        </button>
                        <button onClick={() => handleSend(req, 'standard_photos')} className="text-[11px] font-semibold flex items-center justify-center gap-1.5 bg-purple-50 text-purple-700 py-1.5 rounded-lg hover:bg-purple-100 transition">
                          Standard <ArrowRight className="w-3 h-3" />
                        </button>
                        <button onClick={() => handleSend(req, 'batch_layout')} className="text-[11px] font-semibold flex items-center justify-center gap-1.5 bg-slate-100 text-slate-700 py-1.5 rounded-lg hover:bg-slate-200 transition col-span-2">
                          Batch Layout <ArrowRight className="w-3 h-3" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => handleSend(req, 'doc_encoder')} className="text-[11px] font-semibold flex items-center justify-center gap-1.5 bg-emerald-50 text-emerald-700 py-1.5 rounded-lg hover:bg-emerald-100 transition">
                          Doc Encoder <ArrowRight className="w-3 h-3" />
                        </button>
                        <button onClick={() => handleSend(req, 'batch_layout')} className="text-[11px] font-semibold flex items-center justify-center gap-1.5 bg-slate-100 text-slate-700 py-1.5 rounded-lg hover:bg-slate-200 transition">
                          Batch Layout <ArrowRight className="w-3 h-3" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
