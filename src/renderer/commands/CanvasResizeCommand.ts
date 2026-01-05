import { Command } from './Command';
import { CanvasSize } from '../../shared/types';
import { editorState } from '../core/EditorState';

/**
 * Command for resizing the canvas
 */
export class CanvasResizeCommand implements Command {
  private beforeSize: CanvasSize;
  private afterSize: CanvasSize;

  constructor(beforeSize: CanvasSize, afterSize: CanvasSize) {
    this.beforeSize = { ...beforeSize };
    this.afterSize = { ...afterSize };
  }

  execute(): void {
    editorState.setCanvasSize(this.afterSize.width, this.afterSize.height);
    editorState.markDirty();
  }

  undo(): void {
    editorState.setCanvasSize(this.beforeSize.width, this.beforeSize.height);
  }

  getDescription(): string {
    return `Resize canvas from ${this.beforeSize.width}x${this.beforeSize.height} to ${this.afterSize.width}x${this.afterSize.height}`;
  }
}
