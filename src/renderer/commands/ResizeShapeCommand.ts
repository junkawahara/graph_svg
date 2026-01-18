import { Command } from './Command';
import { Shape } from '../shapes/Shape';
import { Line } from '../shapes/Line';
import { Ellipse } from '../shapes/Ellipse';
import { Rectangle } from '../shapes/Rectangle';
import { Text } from '../shapes/Text';
import { Node } from '../shapes/Node';
import { Polygon } from '../shapes/Polygon';
import { Polyline } from '../shapes/Polyline';
import { Path } from '../shapes/Path';
import { Edge } from '../shapes/Edge';
import { Point, PathCommand } from '../../shared/types';

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

interface PolygonState {
  points: Point[];
}

interface PathState {
  commands: PathCommand[];
}

interface EdgeState {
  pathCommands: PathCommand[];
}

type ShapeState = LineState | EllipseState | RectangleState | TextState | PolygonState | PathState | EdgeState;

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
    } else if (shape instanceof Node) {
      // Node must be checked before Ellipse since Node is not an Ellipse subclass
      return {
        cx: shape.cx,
        cy: shape.cy,
        rx: shape.rx,
        ry: shape.ry
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
    } else if (shape instanceof Polygon || shape instanceof Polyline) {
      return {
        points: shape.points.map(p => ({ ...p }))
      };
    } else if (shape instanceof Path) {
      return {
        commands: shape.commands.map(cmd => ({ ...cmd }))
      };
    } else if (shape instanceof Edge) {
      return {
        pathCommands: shape.pathCommands.map(cmd => ({ ...cmd }))
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
    } else if (this.shape instanceof Node && 'cx' in state) {
      this.shape.cx = state.cx;
      this.shape.cy = state.cy;
      this.shape.rx = state.rx;
      this.shape.ry = state.ry;
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
    } else if (this.shape instanceof Text && 'x' in state && !('width' in state) && !('points' in state)) {
      this.shape.x = state.x;
      this.shape.y = state.y;
    } else if ((this.shape instanceof Polygon || this.shape instanceof Polyline) && 'points' in state) {
      this.shape.points = state.points.map(p => ({ ...p }));
    } else if (this.shape instanceof Path && 'commands' in state) {
      this.shape.commands = state.commands.map(cmd => ({ ...cmd }));
    } else if (this.shape instanceof Edge && 'pathCommands' in state) {
      this.shape.pathCommands = state.pathCommands.map(cmd => ({ ...cmd }));
    }
    this.shape.updateElement();
  }

  getDescription(): string {
    return `Resize ${this.shape.type}`;
  }
}
