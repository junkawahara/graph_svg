import { Command } from './Command';
import { Shape } from '../shapes/Shape';
import { Line } from '../shapes/Line';
import { Ellipse } from '../shapes/Ellipse';

interface LineState {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface EllipseState {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

type ShapeState = LineState | EllipseState;

/**
 * Command for resizing a shape
 */
export class ResizeShapeCommand implements Command {
  private beforeState: ShapeState;
  private afterState: ShapeState;

  constructor(
    private shape: Shape,
    beforeState: ShapeState,
    afterState: ShapeState
  ) {
    this.beforeState = beforeState;
    this.afterState = afterState;
  }

  /**
   * Capture current state of a shape
   */
  static captureState(shape: Shape): ShapeState {
    if (shape instanceof Line) {
      return {
        x1: shape.x1,
        y1: shape.y1,
        x2: shape.x2,
        y2: shape.y2
      };
    } else if (shape instanceof Ellipse) {
      return {
        cx: shape.cx,
        cy: shape.cy,
        rx: shape.rx,
        ry: shape.ry
      };
    }
    throw new Error('Unknown shape type');
  }

  execute(): void {
    this.applyState(this.afterState);
  }

  undo(): void {
    this.applyState(this.beforeState);
  }

  private applyState(state: ShapeState): void {
    if (this.shape instanceof Line && 'x1' in state) {
      this.shape.x1 = state.x1;
      this.shape.y1 = state.y1;
      this.shape.x2 = state.x2;
      this.shape.y2 = state.y2;
    } else if (this.shape instanceof Ellipse && 'cx' in state) {
      this.shape.cx = state.cx;
      this.shape.cy = state.cy;
      this.shape.rx = state.rx;
      this.shape.ry = state.ry;
    }
    this.shape.updateElement();
  }

  getDescription(): string {
    return `Resize ${this.shape.type}`;
  }
}
