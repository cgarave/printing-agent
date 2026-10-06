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

    // --- WebRTC Setup (Host or Sync Client) ---
    let peer: any = null;
    let syncConn: any = null;
    
    if (typeof window !== 'undefined' && window.location.pathname !== '/customer') {
      import('peerjs').then(({ default: Peer }) => {
        const syncHostId = localStorage.getItem('sync_host_id');
        
        if (syncHostId) {
          // --- CLIENT SYNC MODE ---
          peer = new Peer();
          peer.on('open', () => {
            console.log('PeerJS Sync Client ready. Connecting to host:', syncHostId);
            syncConn = peer.connect(syncHostId);
            
            syncConn.on('open', () => {
              console.log('Connected to Host PC');
              // Request initial full queue
              syncConn.send({ type: 'REQUEST_FULL_QUEUE' });
            });
            
            syncConn.on('data', (data: any) => {
              if (data && data.type === 'FULL_QUEUE_SYNC') {
                // We got the full queue from the host. 
                // We don't save to local IndexedDB to avoid conflicts, just keep in state
                // Or we can save it. For now, we'll just keep it in React state by mapping it
                const syncedQueue = data.payload.map((item: any) => {
                  let file: File | undefined;
                  let fileUrl = '';
                  if (item.fileBuffer) {
                    file = new File([item.fileBuffer], item.fileName, { type: item.fileType });
                    fileUrl = URL.createObjectURL(file);
                  }
                  return { ...item, file, fileUrl, timestamp: new Date(item.timestamp) };
                });
                
                setQueue((prevQueue) => {
                  prevQueue.forEach(item => { if (item.fileUrl) URL.revokeObjectURL(item.fileUrl); });
                  return syncedQueue;
                });
              } else if (data && data.type === 'NEW_REQUEST' || data && data.type === 'QUEUE_UPDATED') {
                // Host says something changed, request full sync again for simplicity
                syncConn.send({ type: 'REQUEST_FULL_QUEUE' });
                if (data.type === 'NEW_REQUEST') {
                  setUnreadCount((prev) => prev + 1);
                  const audio = new Audio('/notification.mp3');
                  audio.play().catch(e => console.log('Audio play blocked:', e));
                }
              }
            });
            
            // Expose the connection to context functions
            (window as any).syncConn = syncConn;
          });
          
        } else {
          // --- HOST MODE ---
          let shopId = localStorage.getItem('shop_id');
          if (!shopId) {
            shopId = `shop-${Math.random().toString(36).substr(2, 9)}`;
            localStorage.setItem('shop_id', shopId);
          }

          peer = new Peer(shopId);
          
          // Store connections from sync clients
          const syncClients: any[] = [];

          peer.on('open', (id: string) => {
            console.log('PeerJS Host ready with ID:', id);
          });

          peer.on('connection', (conn: any) => {
            conn.on('data', async (data: any) => {
              if (data && data.type === 'NEW_REQUEST') {
                // Customer uploading a file
                const newRequest = {
                  ...data.payload,
                  id: `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                  status: 'pending',
                  timestamp: new Date(),
                };
                
                try {
                  // @ts-ignore
                  await dbAddRequest(newRequest);
                  await loadQueue();
                  setUnreadCount((prev) => prev + 1);
                  
                  const audio = new Audio('/notification.mp3');
                  audio.play().catch(e => console.log('Audio play blocked:', e));
                  
                  channel.postMessage({ type: 'NEW_REQUEST' });
                  conn.send({ type: 'SUCCESS' });
                  
                  // Broadcast to all sync clients
                  syncClients.forEach(c => c.send({ type: 'NEW_REQUEST' }));
                } catch (err) {
                  console.error("Failed to save WebRTC request to DB", err);
                  conn.send({ type: 'ERROR', error: 'Failed to save' });
                }
              } else if (data && data.type === 'REQUEST_FULL_QUEUE') {
                // Sync client requesting full queue
                if (!syncClients.includes(conn)) syncClients.push(conn);
                const allReqs = await getAllRequests();
                conn.send({ type: 'FULL_QUEUE_SYNC', payload: allReqs });
              } else if (data && data.type === 'SYNC_ACTION_UPDATE') {
                // Sync client updating status
                await dbUpdateStatus(data.payload.id, data.payload.status);
                await loadQueue();
                channel.postMessage({ type: 'SYNC' });
                syncClients.forEach(c => c.send({ type: 'QUEUE_UPDATED' }));
              } else if (data && data.type === 'SYNC_ACTION_REMOVE') {
                // Sync client removing item
                await dbRemoveRequest(data.payload.id);
                await loadQueue();
                channel.postMessage({ type: 'SYNC' });
                syncClients.forEach(c => c.send({ type: 'QUEUE_UPDATED' }));
              } else if (data && data.type === 'SYNC_ACTION_ADD') {
                // Sync client adding item (e.g. they dropped a file on their end)
                const newRequest = {
                  ...data.payload,
                  id: `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                  status: 'pending',
                  timestamp: new Date(),
                };
                await dbAddRequest(newRequest);
                await loadQueue();
                channel.postMessage({ type: 'SYNC' });
                syncClients.forEach(c => c.send({ type: 'QUEUE_UPDATED' }));
              }
            });
            
            conn.on('close', () => {
              const idx = syncClients.indexOf(conn);
              if (idx > -1) syncClients.splice(idx, 1);
            });
          });

          peer.on('error', (err: any) => {
            console.error('PeerJS Host Error:', err);
          });
        }
      });
    }

    return () => {
      channel.close();
      if (peer) peer.destroy();
      (window as any).syncConn = null;
    };
  }, [loadQueue]);

  const addToQueue = async (requestData: Omit<PrintRequest, 'id' | 'status' | 'timestamp' | 'file' | 'fileUrl'>) => {
    const syncConn = (window as any).syncConn;
    if (syncConn) {
      syncConn.send({ type: 'SYNC_ACTION_ADD', payload: requestData });
      return;
    }

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
    const syncConn = (window as any).syncConn;
    if (syncConn) {
      syncConn.send({ type: 'SYNC_ACTION_UPDATE', payload: { id, status } });
      return;
    }

    await dbUpdateStatus(id, status);
    await loadQueue();
    const channel = new BroadcastChannel('print-queue-sync');
    channel.postMessage({ type: 'SYNC' });
    channel.close();
  };

  const removeFromQueue = async (id: string) => {
    const syncConn = (window as any).syncConn;
    if (syncConn) {
      syncConn.send({ type: 'SYNC_ACTION_REMOVE', payload: { id } });
      return;
    }

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
