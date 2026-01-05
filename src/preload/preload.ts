import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import { AppSettings } from '../shared/settings';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // File operations
  saveFile: (content: string) => ipcRenderer.invoke('file:save', content),
  saveFileAs: (content: string, defaultPath?: string) => ipcRenderer.invoke('file:saveAs', content, defaultPath),
  saveFileToPath: (filePath: string, content: string) => ipcRenderer.invoke('file:saveToPath', filePath, content),
  openFile: () => ipcRenderer.invoke('file:open'),

  // Window operations
  setWindowTitle: (title: string) => ipcRenderer.invoke('window:setTitle', title),
  allowClose: () => ipcRenderer.invoke('app:allowClose'),

  // Settings operations
  readSettings: () => ipcRenderer.invoke('settings:read'),
  writeSettings: (settings: Partial<AppSettings>) => ipcRenderer.invoke('settings:write', settings),

  // Menu event listeners
  onOpenSettings: (callback: () => void) => {
    const handler = (_event: IpcRendererEvent) => callback();
    ipcRenderer.on('open-settings', handler);
    return () => ipcRenderer.removeListener('open-settings', handler);
  },
  onMenuNew: (callback: () => void) => {
    const handler = (_event: IpcRendererEvent) => callback();
    ipcRenderer.on('menu:new', handler);
    return () => ipcRenderer.removeListener('menu:new', handler);
  },
  onMenuOpen: (callback: () => void) => {
    const handler = (_event: IpcRendererEvent) => callback();
    ipcRenderer.on('menu:open', handler);
    return () => ipcRenderer.removeListener('menu:open', handler);
  },
  onMenuSave: (callback: () => void) => {
    const handler = (_event: IpcRendererEvent) => callback();
    ipcRenderer.on('menu:save', handler);
    return () => ipcRenderer.removeListener('menu:save', handler);
  },
  onMenuSaveAs: (callback: () => void) => {
    const handler = (_event: IpcRendererEvent) => callback();
    ipcRenderer.on('menu:saveAs', handler);
    return () => ipcRenderer.removeListener('menu:saveAs', handler);
  },
  onMenuUndo: (callback: () => void) => {
    const handler = (_event: IpcRendererEvent) => callback();
    ipcRenderer.on('menu:undo', handler);
    return () => ipcRenderer.removeListener('menu:undo', handler);
  },
  onMenuRedo: (callback: () => void) => {
    const handler = (_event: IpcRendererEvent) => callback();
    ipcRenderer.on('menu:redo', handler);
    return () => ipcRenderer.removeListener('menu:redo', handler);
  },
  onMenuExportFitToContent: (callback: () => void) => {
    const handler = (_event: IpcRendererEvent) => callback();
    ipcRenderer.on('menu:exportFitToContent', handler);
    return () => ipcRenderer.removeListener('menu:exportFitToContent', handler);
  },
  onMenuFitCanvasToContent: (callback: () => void) => {
    const handler = (_event: IpcRendererEvent) => callback();
    ipcRenderer.on('menu:fitCanvasToContent', handler);
    return () => ipcRenderer.removeListener('menu:fitCanvasToContent', handler);
  },
  onBeforeClose: (callback: () => void) => {
    const handler = (_event: IpcRendererEvent) => callback();
    ipcRenderer.on('app:beforeClose', handler);
    return () => ipcRenderer.removeListener('app:beforeClose', handler);
  }
});

// Type declaration for the exposed API
declare global {
  interface Window {
    electronAPI: {
      saveFile: (content: string) => Promise<string | null>;
      saveFileAs: (content: string, defaultPath?: string) => Promise<string | null>;
      saveFileToPath: (filePath: string, content: string) => Promise<boolean>;
      openFile: () => Promise<{ path: string; content: string } | null>;
      setWindowTitle: (title: string) => Promise<void>;
      allowClose: () => Promise<void>;
      readSettings: () => Promise<AppSettings>;
      writeSettings: (settings: Partial<AppSettings>) => Promise<AppSettings>;
      onOpenSettings: (callback: () => void) => () => void;
      onMenuNew: (callback: () => void) => () => void;
      onMenuOpen: (callback: () => void) => () => void;
      onMenuSave: (callback: () => void) => () => void;
      onMenuSaveAs: (callback: () => void) => () => void;
      onMenuUndo: (callback: () => void) => () => void;
      onMenuRedo: (callback: () => void) => () => void;
      onMenuExportFitToContent: (callback: () => void) => () => void;
      onMenuFitCanvasToContent: (callback: () => void) => () => void;
      onBeforeClose: (callback: () => void) => () => void;
    };
  }
}
