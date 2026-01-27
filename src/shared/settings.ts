import { StyleClass, DEFAULT_STYLE } from './types';

/**
 * Application settings interface
 */
export interface AppSettings {
  snapOnStartup: boolean;
  gridSize: number;
  fitToContentMargin: number;
  autoLayoutPadding: number;
  autoNodeLabelPrefix: string;
  autoNodeLabelStartNumber: number;
  styleClasses: StyleClass[];
}

/**
 * Default (built-in) style classes
 */
export const DEFAULT_STYLE_CLASSES: StyleClass[] = [
  {
    id: 'builtin-thick-line',
    name: 'thick-line',
    style: { ...DEFAULT_STYLE, strokeWidth: 4 },
    isBuiltin: true
  },
  {
    id: 'builtin-dashed',
    name: 'dashed',
    style: { ...DEFAULT_STYLE, strokeDasharray: '5,5' },
    isBuiltin: true
  },
  {
    id: 'builtin-dotted',
    name: 'dotted',
    style: { ...DEFAULT_STYLE, strokeDasharray: '2,2' },
    isBuiltin: true
  },
  {
    id: 'builtin-no-stroke',
    name: 'no-stroke',
    style: { ...DEFAULT_STYLE, strokeWidth: 0 },
    isBuiltin: true
  },
  {
    id: 'builtin-semi-transparent',
    name: 'semi-transparent',
    style: { ...DEFAULT_STYLE, opacity: 0.5 },
    isBuiltin: true
  }
];

/**
 * Default application settings
 */
export const DEFAULT_SETTINGS: AppSettings = {
  snapOnStartup: true,
  gridSize: 10,
  fitToContentMargin: 20,
  autoLayoutPadding: 50,
  autoNodeLabelPrefix: 'v',
  autoNodeLabelStartNumber: 0,
  styleClasses: DEFAULT_STYLE_CLASSES
};

/**
 * Window state for persistence
 */
export interface WindowState {
  x?: number;
  y?: number;
  width: number;
  height: number;
  isMaximized?: boolean;
}

/**
 * Default window state
 */
export const DEFAULT_WINDOW_STATE: WindowState = {
  width: 1200,
  height: 800
};

/**
 * Combined store schema
 */
export interface StoreSchema {
  settings: AppSettings;
  windowState: WindowState;
}
