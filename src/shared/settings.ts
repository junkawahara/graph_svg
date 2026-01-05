/**
 * Application settings interface
 */
export interface AppSettings {
  snapOnStartup: boolean;
  gridSize: number;
}

/**
 * Default application settings
 */
export const DEFAULT_SETTINGS: AppSettings = {
  snapOnStartup: false,
  gridSize: 10
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
