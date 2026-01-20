/**
 * Platform Adapter Interface
 *
 * Abstraction layer for platform-specific operations.
 * Implemented by ElectronAdapter and WebAdapter.
 */

import { AppSettings } from '../settings';

/**
 * Result of file open operation
 */
export interface FileOpenResult {
  path: string;
  content: string;
}

/**
 * Result of file save operation
 */
export interface FileSaveResult {
  path: string;
  success: boolean;
}

/**
 * Menu event types
 */
export type MenuEventType =
  | 'new'
  | 'open'
  | 'importGraph'
  | 'save'
  | 'saveAs'
  | 'exportFitToContent'
  | 'undo'
  | 'redo'
  | 'delete'
  | 'group'
  | 'ungroup'
  | 'zoomReset'
  | 'toggleSnap'
  | 'fitCanvasToContent'
  | 'autoLayout'
  | 'toggleDirectedEdge'
  | 'openSettings';

/**
 * Menu event with argument types
 */
export type MenuEventWithArg =
  | 'tool'      // arg: tool name
  | 'zorder'    // arg: operation name
  | 'align'     // arg: alignment type
  | 'distribute'; // arg: distribution type

/**
 * Callback for drag & drop events
 */
export interface DragDropCallbacks {
  onSvgDrop: (content: string, filename: string) => void;
  onGraphDrop: (content: string, filename: string) => void;
}

/**
 * Platform Adapter Interface
 *
 * Provides a unified API for platform-specific operations,
 * allowing the application to run in both Electron and Web environments.
 */
export interface PlatformAdapter {
  // Platform identification
  readonly isElectron: boolean;
  readonly isWeb: boolean;

  // File operations
  openFile(): Promise<FileOpenResult | null>;
  openGraphFile(): Promise<FileOpenResult | null>;
  saveFile(content: string, currentPath?: string): Promise<FileSaveResult | null>;
  saveFileAs(content: string, defaultPath?: string): Promise<FileSaveResult | null>;
  saveFileToPath(path: string, content: string): Promise<boolean>;

  // Settings
  readSettings(): Promise<AppSettings>;
  writeSettings(settings: Partial<AppSettings>): Promise<AppSettings>;

  // Window operations
  setWindowTitle(title: string): void;

  // Application lifecycle
  onBeforeClose(callback: () => Promise<boolean | void> | void): () => void;
  allowClose(): void;

  // Menu event listeners
  onMenuEvent(event: MenuEventType, callback: () => void): () => void;
  onMenuEventWithArg(event: MenuEventWithArg, callback: (arg: string) => void): () => void;

  // Drag & drop (Web only, no-op on Electron)
  setupDragDrop(callbacks: DragDropCallbacks): () => void;

  // Initialization
  initialize(): Promise<void>;
}
