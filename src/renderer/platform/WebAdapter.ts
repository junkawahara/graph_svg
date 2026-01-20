/**
 * Web Platform Adapter
 *
 * Implementation of PlatformAdapter for Web browser environment.
 * Uses File System Access API where available, with fallback to
 * traditional file input/download methods.
 */

import {
  PlatformAdapter,
  FileOpenResult,
  FileSaveResult,
  MenuEventType,
  MenuEventWithArg,
  DragDropCallbacks
} from '../../shared/platform';
import { AppSettings, DEFAULT_SETTINGS } from '../../shared/settings';

// Storage key for settings
const SETTINGS_KEY = 'drawsvg-settings';

// File type definitions
interface FilePickerTypes {
  description: string;
  accept: Record<string, string[]>;
}

export class WebAdapter implements PlatformAdapter {
  readonly isElectron = false;
  readonly isWeb = true;

  private currentFilePath: string | null = null;
  private currentFileHandle: FileSystemFileHandle | null = null;
  private beforeCloseCallback: (() => Promise<boolean | void> | void) | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private menuEventListeners: Map<string, Set<(...args: any[]) => void>> = new Map();
  private dragDropCleanup: (() => void) | null = null;

  // Check if File System Access API is available
  private get hasFileSystemAccess(): boolean {
    return 'showOpenFilePicker' in window && 'showSaveFilePicker' in window;
  }

  async openFile(): Promise<FileOpenResult | null> {
    try {
      if (this.hasFileSystemAccess) {
        return this.openFileWithFSAccess([
          { description: 'SVG files', accept: { 'image/svg+xml': ['.svg'] } }
        ]);
      }
      return this.openFileWithInput('.svg');
    } catch (e) {
      if ((e as Error).name === 'AbortError') {
        return null; // User cancelled
      }
      throw e;
    }
  }

  async openGraphFile(): Promise<FileOpenResult | null> {
    try {
      if (this.hasFileSystemAccess) {
        return this.openFileWithFSAccess([
          { description: 'Graph files', accept: { 'text/plain': ['.txt', '.dimacs', '.col', '.edgelist'] } }
        ]);
      }
      return this.openFileWithInput('.txt,.dimacs,.col,.edgelist');
    } catch (e) {
      if ((e as Error).name === 'AbortError') {
        return null;
      }
      throw e;
    }
  }

  private async openFileWithFSAccess(types: FilePickerTypes[]): Promise<FileOpenResult | null> {
    const [handle] = await (window as unknown as { showOpenFilePicker: (options: { types: FilePickerTypes[] }) => Promise<FileSystemFileHandle[]> }).showOpenFilePicker({
      types
    });
    const file = await handle.getFile();
    const content = await file.text();
    this.currentFileHandle = handle;
    this.currentFilePath = file.name;
    return { path: file.name, content };
  }

  private openFileWithInput(accept: string): Promise<FileOpenResult | null> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = accept;

      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) {
          resolve(null);
          return;
        }
        const content = await file.text();
        this.currentFilePath = file.name;
        this.currentFileHandle = null;
        resolve({ path: file.name, content });
      };

      input.oncancel = () => resolve(null);
      input.click();
    });
  }

  async saveFile(content: string, currentPath?: string): Promise<FileSaveResult | null> {
    const path = currentPath || this.currentFilePath;

    // If we have a file handle from File System Access API, use it
    if (this.hasFileSystemAccess && this.currentFileHandle) {
      try {
        const writable = await this.currentFileHandle.createWritable();
        await writable.write(content);
        await writable.close();
        return { path: path || 'drawing.svg', success: true };
      } catch (e) {
        if ((e as Error).name === 'AbortError') {
          return null;
        }
        // Fall through to saveAs if permission denied
      }
    }

    // No existing handle, use saveAs
    return this.saveFileAs(content, path || undefined);
  }

  async saveFileAs(content: string, defaultPath?: string): Promise<FileSaveResult | null> {
    try {
      if (this.hasFileSystemAccess) {
        return this.saveFileWithFSAccess(content, defaultPath);
      }
      return this.saveFileWithDownload(content, defaultPath);
    } catch (e) {
      if ((e as Error).name === 'AbortError') {
        return null;
      }
      throw e;
    }
  }

  private async saveFileWithFSAccess(content: string, defaultPath?: string): Promise<FileSaveResult | null> {
    const handle = await (window as unknown as {
      showSaveFilePicker: (options: {
        suggestedName?: string;
        types: FilePickerTypes[];
      }) => Promise<FileSystemFileHandle>
    }).showSaveFilePicker({
      suggestedName: defaultPath || 'drawing.svg',
      types: [
        { description: 'SVG files', accept: { 'image/svg+xml': ['.svg'] } }
      ]
    });

    const writable = await handle.createWritable();
    await writable.write(content);
    await writable.close();

    this.currentFileHandle = handle;
    this.currentFilePath = handle.name;
    return { path: handle.name, success: true };
  }

  private saveFileWithDownload(content: string, defaultPath?: string): FileSaveResult {
    const filename = defaultPath || 'drawing.svg';
    const blob = new Blob([content], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();

    URL.revokeObjectURL(url);
    this.currentFilePath = filename;
    return { path: filename, success: true };
  }

  async saveFileToPath(_path: string, content: string): Promise<boolean> {
    // In web environment, we can't save to arbitrary paths
    // Use the current handle if available, otherwise download
    if (this.currentFileHandle) {
      try {
        const writable = await this.currentFileHandle.createWritable();
        await writable.write(content);
        await writable.close();
        return true;
      } catch {
        return false;
      }
    }

    // Fallback to download
    const result = this.saveFileWithDownload(content, _path);
    return result.success;
  }

  async readSettings(): Promise<AppSettings> {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...DEFAULT_SETTINGS, ...parsed };
      }
    } catch {
      // Ignore parse errors
    }
    return { ...DEFAULT_SETTINGS };
  }

  async writeSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
    const current = await this.readSettings();
    const updated = { ...current, ...settings };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
    return updated;
  }

  setWindowTitle(title: string): void {
    document.title = title;
  }

  onBeforeClose(callback: () => Promise<boolean | void> | void): () => void {
    this.beforeCloseCallback = callback;

    const handler = (e: BeforeUnloadEvent) => {
      // Call callback to check if we should warn
      const result = this.beforeCloseCallback?.();
      // Standard way to show confirmation dialog
      e.preventDefault();
      // Chrome requires returnValue to be set
      e.returnValue = '';
      return '';
    };

    window.addEventListener('beforeunload', handler);
    return () => {
      window.removeEventListener('beforeunload', handler);
      this.beforeCloseCallback = null;
    };
  }

  allowClose(): void {
    // In web environment, just clear the callback
    this.beforeCloseCallback = null;
  }

  onMenuEvent(event: MenuEventType, callback: () => void): () => void {
    const key = `menu:${event}`;
    if (!this.menuEventListeners.has(key)) {
      this.menuEventListeners.set(key, new Set());
    }
    this.menuEventListeners.get(key)!.add(callback);

    return () => {
      this.menuEventListeners.get(key)?.delete(callback);
    };
  }

  onMenuEventWithArg(event: MenuEventWithArg, callback: (arg: string) => void): () => void {
    const key = `menu:${event}`;
    if (!this.menuEventListeners.has(key)) {
      this.menuEventListeners.set(key, new Set());
    }
    this.menuEventListeners.get(key)!.add(callback);

    return () => {
      this.menuEventListeners.get(key)?.delete(callback);
    };
  }

  /**
   * Emit a menu event (called by WebMenuBar)
   */
  emitMenuEvent(event: MenuEventType): void {
    const key = `menu:${event}`;
    this.menuEventListeners.get(key)?.forEach(cb => (cb as () => void)());
  }

  /**
   * Emit a menu event with argument (called by WebMenuBar)
   */
  emitMenuEventWithArg(event: MenuEventWithArg, arg: string): void {
    const key = `menu:${event}`;
    this.menuEventListeners.get(key)?.forEach(cb => (cb as (arg: string) => void)(arg));
  }

  setupDragDrop(callbacks: DragDropCallbacks): () => void {
    // Clean up previous listeners if any
    this.dragDropCleanup?.();

    const overlay = this.createDropOverlay();

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'copy';
      }
      overlay.style.display = 'flex';
    };

    const handleDragLeave = (e: DragEvent) => {
      // Only hide if leaving the document
      if (e.relatedTarget === null) {
        overlay.style.display = 'none';
      }
    };

    const handleDrop = async (e: DragEvent) => {
      e.preventDefault();
      overlay.style.display = 'none';

      const file = e.dataTransfer?.files[0];
      if (!file) return;

      const content = await file.text();
      const filename = file.name.toLowerCase();

      if (filename.endsWith('.svg')) {
        callbacks.onSvgDrop(content, file.name);
      } else if (/\.(txt|dimacs|col|edgelist)$/.test(filename)) {
        callbacks.onGraphDrop(content, file.name);
      }
    };

    document.body.addEventListener('dragover', handleDragOver);
    document.body.addEventListener('dragleave', handleDragLeave);
    document.body.addEventListener('drop', handleDrop);
    document.body.appendChild(overlay);

    this.dragDropCleanup = () => {
      document.body.removeEventListener('dragover', handleDragOver);
      document.body.removeEventListener('dragleave', handleDragLeave);
      document.body.removeEventListener('drop', handleDrop);
      overlay.remove();
    };

    return this.dragDropCleanup;
  }

  private createDropOverlay(): HTMLElement {
    const overlay = document.createElement('div');
    overlay.className = 'drop-overlay';
    overlay.innerHTML = `
      <div class="drop-overlay-content">
        <div class="drop-overlay-icon">📄</div>
        <div class="drop-overlay-text">Drop SVG or Graph file here</div>
      </div>
    `;
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 100, 200, 0.2);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      pointer-events: none;
    `;

    const content = overlay.querySelector('.drop-overlay-content') as HTMLElement;
    if (content) {
      content.style.cssText = `
        background: white;
        padding: 40px 60px;
        border-radius: 12px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        text-align: center;
      `;
    }

    const icon = overlay.querySelector('.drop-overlay-icon') as HTMLElement;
    if (icon) {
      icon.style.cssText = 'font-size: 48px; margin-bottom: 12px;';
    }

    const text = overlay.querySelector('.drop-overlay-text') as HTMLElement;
    if (text) {
      text.style.cssText = 'font-size: 18px; color: #333;';
    }

    return overlay;
  }

  async initialize(): Promise<void> {
    // Nothing to initialize for web platform
  }

  // Helper method to get current file path
  getCurrentFilePath(): string | null {
    return this.currentFilePath;
  }

  // Helper method to set current file path
  setCurrentFilePath(path: string | null): void {
    this.currentFilePath = path;
    if (!path) {
      this.currentFileHandle = null;
    }
  }
}
