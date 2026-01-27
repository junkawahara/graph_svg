import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import { AppSettings } from '../shared/settings';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // File operations
  saveFileAs: (content: string, defaultPath?: string) => ipcRenderer.invoke('file:saveAs', content, defaultPath),
  saveFileToPath: (filePath: string, content: string) => ipcRenderer.invoke('file:saveToPath', filePath, content),
  openFile: () => ipcRenderer.invoke('file:open'),
  openGraphFile: () => ipcRenderer.invoke('file:openGraph'),

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
  onMenuImportGraph: (callback: () => void) => {
    const handler = (_event: IpcRendererEvent) => callback();
    ipcRenderer.on('menu:importGraph', handler);
    return () => ipcRenderer.removeListener('menu:importGraph', handler);
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
  },
  onMenuDelete: (callback: () => void) => {
    const handler = (_event: IpcRendererEvent) => callback();
    ipcRenderer.on('menu:delete', handler);
    return () => ipcRenderer.removeListener('menu:delete', handler);
  },
  onMenuGroup: (callback: () => void) => {
    const handler = (_event: IpcRendererEvent) => callback();
    ipcRenderer.on('menu:group', handler);
    return () => ipcRenderer.removeListener('menu:group', handler);
  },
  onMenuUngroup: (callback: () => void) => {
    const handler = (_event: IpcRendererEvent) => callback();
    ipcRenderer.on('menu:ungroup', handler);
    return () => ipcRenderer.removeListener('menu:ungroup', handler);
  },
  onMenuZoomReset: (callback: () => void) => {
    const handler = (_event: IpcRendererEvent) => callback();
    ipcRenderer.on('menu:zoomReset', handler);
    return () => ipcRenderer.removeListener('menu:zoomReset', handler);
  },
  onMenuToggleSnap: (callback: () => void) => {
    const handler = (_event: IpcRendererEvent) => callback();
    ipcRenderer.on('menu:toggleSnap', handler);
    return () => ipcRenderer.removeListener('menu:toggleSnap', handler);
  },
  onMenuTool: (callback: (tool: string) => void) => {
    const handler = (_event: IpcRendererEvent, tool: string) => callback(tool);
    ipcRenderer.on('menu:tool', handler);
    return () => ipcRenderer.removeListener('menu:tool', handler);
  },
  onMenuZorder: (callback: (operation: string) => void) => {
    const handler = (_event: IpcRendererEvent, operation: string) => callback(operation);
    ipcRenderer.on('menu:zorder', handler);
    return () => ipcRenderer.removeListener('menu:zorder', handler);
  },
  onMenuAutoLayout: (callback: () => void) => {
    const handler = (_event: IpcRendererEvent) => callback();
    ipcRenderer.on('menu:autoLayout', handler);
    return () => ipcRenderer.removeListener('menu:autoLayout', handler);
  },
  onMenuAutoLabelNodes: (callback: () => void) => {
    const handler = (_event: IpcRendererEvent) => callback();
    ipcRenderer.on('menu:autoLabelNodes', handler);
    return () => ipcRenderer.removeListener('menu:autoLabelNodes', handler);
  },
  onMenuAutoLabelEdges: (callback: () => void) => {
    const handler = (_event: IpcRendererEvent) => callback();
    ipcRenderer.on('menu:autoLabelEdges', handler);
    return () => ipcRenderer.removeListener('menu:autoLabelEdges', handler);
  },
  onMenuToggleDirectedEdge: (callback: () => void) => {
    const handler = (_event: IpcRendererEvent) => callback();
    ipcRenderer.on('menu:toggleDirectedEdge', handler);
    return () => ipcRenderer.removeListener('menu:toggleDirectedEdge', handler);
  },
  onMenuAlign: (callback: (alignment: string) => void) => {
    const handler = (_event: IpcRendererEvent, alignment: string) => callback(alignment);
    ipcRenderer.on('menu:align', handler);
    return () => ipcRenderer.removeListener('menu:align', handler);
  },
  onMenuDistribute: (callback: (distribution: string) => void) => {
    const handler = (_event: IpcRendererEvent, distribution: string) => callback(distribution);
    ipcRenderer.on('menu:distribute', handler);
    return () => ipcRenderer.removeListener('menu:distribute', handler);
  }
});

// Type declaration for the exposed API
declare global {
  interface Window {
    electronAPI: {
      saveFileAs: (content: string, defaultPath?: string) => Promise<string | null>;
      saveFileToPath: (filePath: string, content: string) => Promise<boolean>;
      openFile: () => Promise<{ path: string; content: string } | null>;
      openGraphFile: () => Promise<{ path: string; content: string } | null>;
      setWindowTitle: (title: string) => Promise<void>;
      allowClose: () => Promise<void>;
      readSettings: () => Promise<AppSettings>;
      writeSettings: (settings: Partial<AppSettings>) => Promise<AppSettings>;
      onOpenSettings: (callback: () => void) => () => void;
      onMenuNew: (callback: () => void) => () => void;
      onMenuOpen: (callback: () => void) => () => void;
      onMenuImportGraph: (callback: () => void) => () => void;
      onMenuSave: (callback: () => void) => () => void;
      onMenuSaveAs: (callback: () => void) => () => void;
      onMenuUndo: (callback: () => void) => () => void;
      onMenuRedo: (callback: () => void) => () => void;
      onMenuExportFitToContent: (callback: () => void) => () => void;
      onMenuFitCanvasToContent: (callback: () => void) => () => void;
      onBeforeClose: (callback: () => void) => () => void;
      onMenuDelete: (callback: () => void) => () => void;
      onMenuGroup: (callback: () => void) => () => void;
      onMenuUngroup: (callback: () => void) => () => void;
      onMenuZoomReset: (callback: () => void) => () => void;
      onMenuToggleSnap: (callback: () => void) => () => void;
      onMenuTool: (callback: (tool: string) => void) => () => void;
      onMenuZorder: (callback: (operation: string) => void) => () => void;
      onMenuAutoLayout: (callback: () => void) => () => void;
      onMenuAutoLabelNodes: (callback: () => void) => () => void;
      onMenuAutoLabelEdges: (callback: () => void) => () => void;
      onMenuToggleDirectedEdge: (callback: () => void) => () => void;
      onMenuAlign: (callback: (alignment: string) => void) => () => void;
      onMenuDistribute: (callback: (distribution: string) => void) => () => void;
    };
  }
}
