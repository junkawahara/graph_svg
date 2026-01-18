/**
 * Tool for adding points to path segments
 */

import { Point, PathCommand } from '../../shared/types';
import { Tool } from './Tool';
import { Path } from '../shapes/Path';
import { Edge } from '../shapes/Edge';
import { Shape } from '../shapes/Shape';
import { findSegmentAt, SegmentHitResult } from '../core/PathGeometry';
import { AddPathPointCommand } from '../commands/AddPathPointCommand';
import { historyManager } from '../core/HistoryManager';
import { editorState } from '../core/EditorState';
import { rotatePoint } from '../shapes/Shape';

/**
 * Interface for shapes that support path point operations
 */
export interface PathPointEditable {
  commands?: PathCommand[];
  pathCommands?: PathCommand[];
  rotation?: number;
  getRotationCenter?(): Point;
  insertCommand(index: number, command: PathCommand): void;
  replaceCommand(index: number, command: PathCommand): void;
  removeCommand(index: number): PathCommand | null;
  canRemoveCommand(index: number): boolean;
  getCommandCount(): number;
  getCommand(index: number): PathCommand | null;
  getCommandStart(cmdIndex: number): Point;
}

/**
 * Get path commands from a shape (Path or Edge with lineType='path')
 */
function getPathCommands(shape: Shape): PathCommand[] | null {
  if (shape.type === 'path') {
    return (shape as Path).commands;
  } else if (shape.type === 'edge') {
    const edge = shape as Edge;
    if (edge.lineType === 'path' && edge.pathCommands.length > 0) {
      return edge.pathCommands;
    }
  }
  return null;
}

/**
 * Check if a shape is path-point editable
 */
function isPathPointEditable(shape: Shape): shape is Shape & PathPointEditable {
  if (shape.type === 'path') return true;
  if (shape.type === 'edge') {
    const edge = shape as Edge;
    return edge.lineType === 'path' && edge.pathCommands.length > 0;
  }
  return false;
}

export class AddPathPointTool implements Tool {
  readonly name = 'add-path-point';

  private svg: SVGSVGElement;
  private findShapeAt: (point: Point) => Shape | null;
  private updateHandles: () => void;

  private hoveredShape: (Shape & PathPointEditable) | null = null;
  private hoveredSegment: SegmentHitResult | null = null;
  private highlightElement: SVGCircleElement | null = null;
  private segmentHighlight: SVGPathElement | null = null;

  constructor(options: {
    svg: SVGSVGElement;
    findShapeAt: (point: Point) => Shape | null;
    updateHandles: () => void;
  }) {
    this.svg = options.svg;
    this.findShapeAt = options.findShapeAt;
    this.updateHandles = options.updateHandles;
  }

  onActivate(): void {
    // Change cursor
    this.svg.style.cursor = 'crosshair';
  }

  onDeactivate(): void {
    this.clearHighlight();
    this.svg.style.cursor = '';
  }

  onMouseDown(_point: Point, _event: MouseEvent): void {
    // No action on mouse down
  }

  onMouseMove(point: Point, _event: MouseEvent): void {
    const shape = this.findShapeAt(point);

    if (shape && isPathPointEditable(shape)) {
      const commands = getPathCommands(shape);
      if (!commands) {
        this.clearHighlight();
        this.hoveredShape = null;
        this.hoveredSegment = null;
        return;
      }

      // Transform point to shape's local coordinate system if rotated
      let localPoint = point;
      const rotation = (shape as any).rotation || 0;
      if (rotation !== 0 && (shape as any).getRotationCenter) {
        const center = (shape as any).getRotationCenter();
        localPoint = rotatePoint(point, center, -rotation);
      }

      // Find which segment is hovered
      const segmentHit = findSegmentAt(commands, localPoint, 10);

      if (segmentHit) {
        this.hoveredShape = shape;
        this.hoveredSegment = segmentHit;
        this.showHighlight(segmentHit.point, shape);
      } else {
        this.clearHighlight();
        this.hoveredShape = null;
        this.hoveredSegment = null;
      }
    } else {
      this.clearHighlight();
      this.hoveredShape = null;
      this.hoveredSegment = null;
    }
  }

  onMouseUp(point: Point, event: MouseEvent): void {
    if (!this.hoveredShape || !this.hoveredSegment) return;

    const useBezier = event.shiftKey;

    const command = new AddPathPointCommand(
      this.hoveredShape,
      this.hoveredSegment.commandIndex,
      this.hoveredSegment.t,
      this.hoveredSegment.point,
      useBezier
    );

    historyManager.execute(command);

    // Update handles to reflect the new point
    this.updateHandles();

    // Clear highlight after adding
    this.clearHighlight();
    this.hoveredShape = null;
    this.hoveredSegment = null;
  }

  onMouseLeave(): void {
    this.clearHighlight();
    this.hoveredShape = null;
    this.hoveredSegment = null;
  }

  private showHighlight(point: Point, shape: Shape): void {
    // Transform point back to screen coordinates if shape is rotated
    let displayPoint = point;
    const rotation = (shape as any).rotation || 0;
    if (rotation !== 0 && (shape as any).getRotationCenter) {
      const center = (shape as any).getRotationCenter();
      displayPoint = rotatePoint(point, center, rotation);
    }

    if (!this.highlightElement) {
      this.highlightElement = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      this.highlightElement.setAttribute('r', '6');
      this.highlightElement.setAttribute('fill', '#4a90d9');
      this.highlightElement.setAttribute('stroke', '#ffffff');
      this.highlightElement.setAttribute('stroke-width', '2');
      this.highlightElement.style.pointerEvents = 'none';
      this.svg.appendChild(this.highlightElement);
    }

    this.highlightElement.setAttribute('cx', String(displayPoint.x));
    this.highlightElement.setAttribute('cy', String(displayPoint.y));
  }

  private clearHighlight(): void {
    if (this.highlightElement) {
      this.highlightElement.remove();
      this.highlightElement = null;
    }
    if (this.segmentHighlight) {
      this.segmentHighlight.remove();
      this.segmentHighlight = null;
    }
  }

  /**
   * Add a point at the specified location (used by context menu)
   */
  addPointAtLocation(shape: Shape, point: Point, useBezier: boolean): boolean {
    if (!isPathPointEditable(shape)) return false;

    const commands = getPathCommands(shape);
    if (!commands) return false;

    // Transform point to shape's local coordinate system if rotated
    let localPoint = point;
    const rotation = (shape as any).rotation || 0;
    if (rotation !== 0 && (shape as any).getRotationCenter) {
      const center = (shape as any).getRotationCenter();
      localPoint = rotatePoint(point, center, -rotation);
    }

    const segmentHit = findSegmentAt(commands, localPoint, 15);
    if (!segmentHit) return false;

    const command = new AddPathPointCommand(
      shape,
      segmentHit.commandIndex,
      segmentHit.t,
      segmentHit.point,
      useBezier
    );

    historyManager.execute(command);
    this.updateHandles();
    return true;
  }
}
