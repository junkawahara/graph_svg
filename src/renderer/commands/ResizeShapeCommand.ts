import { Command } from './Command';
import { Shape } from '../shapes/Shape';
import { Line } from '../shapes/Line';
import { Ellipse } from '../shapes/Ellipse';
import { Rectangle } from '../shapes/Rectangle';
import { Text } from '../shapes/Text';

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

interface RectangleState {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface TextState {
  x: number;
  y: number;
}

type ShapeState = LineState | EllipseState | RectangleState | TextState;

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
    } else if (shape instanceof Rectangle) {
      return {
        x: shape.x,
        y: shape.y,
        width: shape.width,
        height: shape.height
      };
    } else if (shape instanceof Text) {
      return {
        x: shape.x,
        y: shape.y
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
    } else if (this.shape instanceof Rectangle && 'width' in state) {
      this.shape.x = state.x;
      this.shape.y = state.y;
      this.shape.width = state.width;
      this.shape.height = state.height;
    } else if (this.shape instanceof Text && 'x' in state && !('width' in state)) {
      this.shape.x = state.x;
      this.shape.y = state.y;
    }
    this.shape.updateElement();
  }

  getDescription(): string {
    return `Resize ${this.shape.type}`;
  }
}
