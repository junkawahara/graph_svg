import { Command } from './Command';
import { CanvasSize } from '../../shared/types';
import { editorState } from '../core/EditorState';
import { Shape } from '../shapes/Shape';

/**
 * Command for fitting canvas to content
 * Moves all shapes to origin area and resizes canvas to fit
 */
export class FitCanvasToContentCommand implements Command {
  private shapes: Shape[];
  private beforeSize: CanvasSize;
  private afterSize: CanvasSize;
  private offsetX: number;
  private offsetY: number;

  constructor(
    shapes: Shape[],
    beforeSize: CanvasSize,
    afterSize: CanvasSize,
    offsetX: number,
    offsetY: number
  ) {
    this.shapes = shapes;
    this.beforeSize = { ...beforeSize };
    this.afterSize = { ...afterSize };
    this.offsetX = offsetX;
    this.offsetY = offsetY;
  }

  execute(): void {
    // Move all shapes by offset
    for (const shape of this.shapes) {
      shape.move(this.offsetX, this.offsetY);
    }

    // Resize canvas
    editorState.setCanvasSize(this.afterSize.width, this.afterSize.height);
    editorState.markDirty();
  }

  undo(): void {
    // Move all shapes back
    for (const shape of this.shapes) {
      shape.move(-this.offsetX, -this.offsetY);
    }

    // Restore canvas size
    editorState.setCanvasSize(this.beforeSize.width, this.beforeSize.height);
  }

  getDescription(): string {
    return `Fit canvas to content (${this.afterSize.width}x${this.afterSize.height})`;
  }
}
