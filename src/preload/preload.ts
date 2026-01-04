import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // File operations (to be implemented in Phase 10)
  saveFile: (content: string) => ipcRenderer.invoke('file:save', content),
  openFile: () => ipcRenderer.invoke('file:open'),
});

// Type declaration for the exposed API
declare global {
  interface Window {
    electronAPI: {
      saveFile: (content: string) => Promise<string | null>;
      openFile: () => Promise<{ path: string; content: string } | null>;
    };
  }
}
