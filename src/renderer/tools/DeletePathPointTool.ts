/**
 * Tool for deleting points from paths
 */

import { Point, PathCommand } from '../../shared/types';
import { Tool } from './Tool';
import { Path } from '../shapes/Path';
import { Edge } from '../shapes/Edge';
import { Shape } from '../shapes/Shape';
import { findAnchorAt } from '../core/PathGeometry';
import { DeletePathPointCommand } from '../commands/DeletePathPointCommand';
import { historyManager } from '../core/HistoryManager';
import { rotatePoint } from '../shapes/Shape';
import { PathPointEditable } from './AddPathPointTool';

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

/**
 * Get anchor points from a shape
 */
function getAnchorPoints(shape: Shape): Point[] {
  if (shape.type === 'path') {
    return (shape as Path).getAnchorPoints();
  } else if (shape.type === 'edge') {
    return (shape as Edge).getAnchorPoints();
  }
  return [];
}

export class DeletePathPointTool implements Tool {
  readonly name = 'delete-path-point';

  private svg: SVGSVGElement;
  private findShapeAt: (point: Point) => Shape | null;
  private updateHandles: () => void;

  private hoveredShape: (Shape & PathPointEditable) | null = null;
  private hoveredAnchor: { anchorIndex: number; commandIndex: number } | null = null;
  private highlightElement: SVGCircleElement | null = null;

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
        this.hoveredAnchor = null;
        return;
      }

      // Transform point to shape's local coordinate system if rotated
      let localPoint = point;
      const rotation = (shape as any).rotation || 0;
      if (rotation !== 0 && (shape as any).getRotationCenter) {
        const center = (shape as any).getRotationCenter();
        localPoint = rotatePoint(point, center, -rotation);
      }

      // Find anchor point near cursor
      const anchorHit = findAnchorAt(commands, localPoint, 10);

      if (anchorHit && shape.canRemoveCommand(anchorHit.commandIndex)) {
        this.hoveredShape = shape;
        this.hoveredAnchor = anchorHit;
        this.showHighlight(shape, anchorHit);
      } else {
        this.clearHighlight();
        this.hoveredShape = null;
        this.hoveredAnchor = null;
      }
    } else {
      this.clearHighlight();
      this.hoveredShape = null;
      this.hoveredAnchor = null;
    }
  }

  onMouseUp(point: Point, _event: MouseEvent): void {
    if (!this.hoveredShape || !this.hoveredAnchor) return;

    const command = new DeletePathPointCommand(
      this.hoveredShape,
      this.hoveredAnchor.commandIndex
    );

    historyManager.execute(command);

    // Update handles to reflect the removed point
    this.updateHandles();

    // Clear highlight after deleting
    this.clearHighlight();
    this.hoveredShape = null;
    this.hoveredAnchor = null;
  }

  onMouseLeave(): void {
    this.clearHighlight();
    this.hoveredShape = null;
    this.hoveredAnchor = null;
  }

  private showHighlight(shape: Shape, anchor: { anchorIndex: number; commandIndex: number }): void {
    const anchors = getAnchorPoints(shape);
    if (anchor.anchorIndex >= anchors.length) return;

    let point = anchors[anchor.anchorIndex];

    // Transform point back to screen coordinates if shape is rotated
    const rotation = (shape as any).rotation || 0;
    if (rotation !== 0 && (shape as any).getRotationCenter) {
      const center = (shape as any).getRotationCenter();
      point = rotatePoint(point, center, rotation);
    }

    if (!this.highlightElement) {
      this.highlightElement = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      this.highlightElement.setAttribute('r', '8');
      this.highlightElement.setAttribute('fill', 'rgba(255, 0, 0, 0.3)');
      this.highlightElement.setAttribute('stroke', '#ff0000');
      this.highlightElement.setAttribute('stroke-width', '2');
      this.highlightElement.style.pointerEvents = 'none';
      this.svg.appendChild(this.highlightElement);
    }

    this.highlightElement.setAttribute('cx', String(point.x));
    this.highlightElement.setAttribute('cy', String(point.y));
  }

  private clearHighlight(): void {
    if (this.highlightElement) {
      this.highlightElement.remove();
      this.highlightElement = null;
    }
  }

  /**
   * Delete anchor at the specified location (used by context menu)
   */
  deleteAnchorAtLocation(shape: Shape, point: Point): boolean {
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

    const anchorHit = findAnchorAt(commands, localPoint, 15);
    if (!anchorHit || !shape.canRemoveCommand(anchorHit.commandIndex)) {
      return false;
    }

    const command = new DeletePathPointCommand(shape, anchorHit.commandIndex);
    historyManager.execute(command);
    this.updateHandles();
    return true;
  }
}
