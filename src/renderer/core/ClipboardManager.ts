import { Shape } from '../shapes/Shape';
import { ShapeData } from '../../shared/types';

/**
 * Manages clipboard for copy/paste operations
 */
export class ClipboardManager {
  private clipboard: ShapeData[] = [];
  private pasteOffset = 20; // Offset for each paste

  /**
   * Copy shapes to clipboard
   */
  copy(shapes: Shape[]): void {
    this.clipboard = shapes.map(shape => shape.serialize());
  }

  /**
   * Check if clipboard has content
   */
  hasContent(): boolean {
    return this.clipboard.length > 0;
  }

  /**
   * Get clipboard content (serialized shape data)
   */
  getContent(): ShapeData[] {
    return this.clipboard;
  }

  /**
   * Get paste offset
   */
  getPasteOffset(): number {
    return this.pasteOffset;
  }

  /**
   * Clear clipboard
   */
  clear(): void {
    this.clipboard = [];
  }
}

// Global clipboard manager instance
export const clipboardManager = new ClipboardManager();
