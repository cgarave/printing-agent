'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { getAllRequests, addRequest as dbAddRequest, updateRequestStatus as dbUpdateStatus, removeRequest as dbRemoveRequest } from '../db';

export type PrintRequest = {
  id: string;
  customerName: string;
  fileBuffer: ArrayBuffer; // Stored as ArrayBuffer for reliable IDB serialization
  fileName: string;
  fileType: string;
  status: 'pending' | 'processing' | 'completed';
  timestamp: Date;
  
  // These are constructed on load and not stored in DB directly
  file?: File;
  fileUrl?: string; 
};

interface PrintQueueContextType {
  queue: PrintRequest[];
  addToQueue: (request: Omit<PrintRequest, 'id' | 'status' | 'timestamp' | 'file' | 'fileUrl'>) => Promise<void>;
  updateStatus: (id: string, status: PrintRequest['status']) => Promise<void>;
  removeFromQueue: (id: string) => Promise<void>;
  unreadCount: number;
  clearUnread: () => void;
}

const PrintQueueContext = createContext<PrintQueueContextType | undefined>(undefined);

export function PrintQueueProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<PrintRequest[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadQueue = useCallback(async () => {
    try {
      const data = await getAllRequests();
      
      // We must regenerate fileUrl for this specific tab/window
      // because Blob URLs from other tabs are invalid.
      setQueue((prevQueue) => {
        // Revoke old URLs
        prevQueue.forEach(item => {
          if (item.fileUrl) URL.revokeObjectURL(item.fileUrl);
        });

        return data.map(item => {
          let file: File | undefined;
          let fileUrl = '';
          
          if (item.fileBuffer) {
            file = new File([item.fileBuffer], item.fileName, { type: item.fileType });
            fileUrl = URL.createObjectURL(file);
          }
          
          return {
            ...item,
            file,
            fileUrl
          };
        });
      });
    } catch (error) {
      console.error('Failed to load queue from IndexedDB', error);
    }
  }, []);

  useEffect(() => {
    loadQueue();

    // Setup BroadcastChannel for multi-tab sync
    const channel = new BroadcastChannel('print-queue-sync');
    channel.onmessage = (event) => {
      if (event.data.type === 'NEW_REQUEST') {
        loadQueue();
        setUnreadCount((prev) => prev + 1);
        
        // Play notification sound
        const audio = new Audio('/notification.mp3'); // We'll assume a file or fallback gracefully
        audio.play().catch(e => console.log('Audio play blocked or missing:', e));
      } else if (event.data.type === 'SYNC') {
        loadQueue();
      }
    };

    return () => channel.close();
  }, [loadQueue]);

  const addToQueue = async (requestData: Omit<PrintRequest, 'id' | 'status' | 'timestamp' | 'file' | 'fileUrl'>) => {
    const newRequest: PrintRequest = {
      ...requestData,
      id: `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      status: 'pending',
      timestamp: new Date(),
    };

    await dbAddRequest(newRequest);
    await loadQueue();
    
    const channel = new BroadcastChannel('print-queue-sync');
    channel.postMessage({ type: 'NEW_REQUEST' });
    channel.close();
  };

  const updateStatus = async (id: string, status: PrintRequest['status']) => {
    await dbUpdateStatus(id, status);
    await loadQueue();
    const channel = new BroadcastChannel('print-queue-sync');
    channel.postMessage({ type: 'SYNC' });
    channel.close();
  };

  const removeFromQueue = async (id: string) => {
    // Revoke object URL to prevent memory leaks
    const item = queue.find(q => q.id === id);
    if (item && item.fileUrl) {
        URL.revokeObjectURL(item.fileUrl);
    }
    
    await dbRemoveRequest(id);
    await loadQueue();
    const channel = new BroadcastChannel('print-queue-sync');
    channel.postMessage({ type: 'SYNC' });
    channel.close();
  };

  const clearUnread = () => setUnreadCount(0);

  return (
    <PrintQueueContext.Provider value={{ queue, addToQueue, updateStatus, removeFromQueue, unreadCount, clearUnread }}>
      {children}
    </PrintQueueContext.Provider>
  );
}

export function usePrintQueue() {
  const context = useContext(PrintQueueContext);
  if (context === undefined) {
    throw new Error('usePrintQueue must be used within a PrintQueueProvider');
  }
  return context;
}
