/**
 * Platform detection and adapter export
 *
 * Automatically detects the current platform (Electron or Web)
 * and provides the appropriate adapter.
 */

import { PlatformAdapter } from '../../shared/platform';
import { ElectronAdapter } from './ElectronAdapter';
import { WebAdapter } from './WebAdapter';

// Singleton instance
let platformAdapter: PlatformAdapter | null = null;

/**
 * Detect if running in Electron environment
 */
function isElectron(): boolean {
  return typeof window !== 'undefined' &&
         typeof (window as unknown as { electronAPI?: unknown }).electronAPI !== 'undefined';
}

/**
 * Get the platform adapter singleton
 *
 * Automatically creates the appropriate adapter based on the environment.
 */
export function getPlatformAdapter(): PlatformAdapter {
  if (!platformAdapter) {
    if (isElectron()) {
      platformAdapter = new ElectronAdapter();
    } else {
      platformAdapter = new WebAdapter();
    }
  }
  return platformAdapter;
}

/**
 * Reset the platform adapter (mainly for testing)
 */
export function resetPlatformAdapter(): void {
  platformAdapter = null;
}

// Export adapter classes for direct use if needed
export { ElectronAdapter } from './ElectronAdapter';
export { WebAdapter } from './WebAdapter';

// Re-export types from shared
export type {
  PlatformAdapter,
  FileOpenResult,
  FileSaveResult,
  MenuEventType,
  MenuEventWithArg,
  DragDropCallbacks
} from '../../shared/platform';
