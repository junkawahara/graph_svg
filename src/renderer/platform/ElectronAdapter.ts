/**
 * Electron Platform Adapter
 *
 * Implementation of PlatformAdapter for Electron environment.
 * Uses window.electronAPI exposed by preload script.
 */

import {
  PlatformAdapter,
  FileOpenResult,
  FileSaveResult,
  MenuEventType,
  MenuEventWithArg,
  DragDropCallbacks
} from '../../shared/platform';
import { AppSettings } from '../../shared/settings';

export class ElectronAdapter implements PlatformAdapter {
  readonly isElectron = true;
  readonly isWeb = false;

  private currentFilePath: string | null = null;

  async openFile(): Promise<FileOpenResult | null> {
    const result = await window.electronAPI.openFile();
    if (result) {
      this.currentFilePath = result.path;
    }
    return result;
  }

  async openGraphFile(): Promise<FileOpenResult | null> {
    return window.electronAPI.openGraphFile();
  }

  async saveFile(content: string, currentPath?: string): Promise<FileSaveResult | null> {
    const path = currentPath || this.currentFilePath;
    if (path) {
      const success = await window.electronAPI.saveFileToPath(path, content);
      return success ? { path, success: true } : null;
    }
    // No current path, use saveAs
    return this.saveFileAs(content);
  }

  async saveFileAs(content: string, defaultPath?: string): Promise<FileSaveResult | null> {
    const path = await window.electronAPI.saveFileAs(content, defaultPath);
    if (path) {
      this.currentFilePath = path;
      return { path, success: true };
    }
    return null;
  }

  async saveFileToPath(path: string, content: string): Promise<boolean> {
    const success = await window.electronAPI.saveFileToPath(path, content);
    if (success) {
      this.currentFilePath = path;
    }
    return success;
  }

  async readSettings(): Promise<AppSettings> {
    return window.electronAPI.readSettings();
  }

  async writeSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
    return window.electronAPI.writeSettings(settings);
  }

  setWindowTitle(title: string): void {
    window.electronAPI.setWindowTitle(title);
  }

  onBeforeClose(callback: () => Promise<boolean | void> | void): () => void {
    return window.electronAPI.onBeforeClose(() => {
      callback();
    });
  }

  allowClose(): void {
    window.electronAPI.allowClose();
  }

  onMenuEvent(event: MenuEventType, callback: () => void): () => void {
    const methodMap: Record<MenuEventType, keyof typeof window.electronAPI> = {
      new: 'onMenuNew',
      open: 'onMenuOpen',
      importGraph: 'onMenuImportGraph',
      save: 'onMenuSave',
      saveAs: 'onMenuSaveAs',
      exportFitToContent: 'onMenuExportFitToContent',
      undo: 'onMenuUndo',
      redo: 'onMenuRedo',
      delete: 'onMenuDelete',
      group: 'onMenuGroup',
      ungroup: 'onMenuUngroup',
      zoomReset: 'onMenuZoomReset',
      toggleSnap: 'onMenuToggleSnap',
      fitCanvasToContent: 'onMenuFitCanvasToContent',
      autoLayout: 'onMenuAutoLayout',
      autoLabelNodes: 'onMenuAutoLabelNodes',
      autoLabelEdges: 'onMenuAutoLabelEdges',
      toggleDirectedEdge: 'onMenuToggleDirectedEdge',
      openSettings: 'onOpenSettings'
    };

    const method = methodMap[event];
    if (method && typeof window.electronAPI[method] === 'function') {
      return (window.electronAPI[method] as (cb: () => void) => () => void)(callback);
    }
    // Return no-op unsubscribe if method not found
    return () => {};
  }

  onMenuEventWithArg(event: MenuEventWithArg, callback: (arg: string) => void): () => void {
    const methodMap: Record<MenuEventWithArg, keyof typeof window.electronAPI> = {
      tool: 'onMenuTool',
      zorder: 'onMenuZorder',
      align: 'onMenuAlign',
      distribute: 'onMenuDistribute'
    };

    const method = methodMap[event];
    if (method && typeof window.electronAPI[method] === 'function') {
      return (window.electronAPI[method] as (cb: (arg: string) => void) => () => void)(callback);
    }
    return () => {};
  }

  setupDragDrop(_callbacks: DragDropCallbacks): () => void {
    // Drag & drop is handled natively in Electron, no need for setup
    return () => {};
  }

  async initialize(): Promise<void> {
    // No additional initialization needed for Electron
  }

  // Helper method to get current file path
  getCurrentFilePath(): string | null {
    return this.currentFilePath;
  }

  // Helper method to set current file path
  setCurrentFilePath(path: string | null): void {
    this.currentFilePath = path;
  }
}
