import { Point } from '../../shared/types';
import { Tool } from './Tool';
import { BezierPath } from '../shapes/BezierPath';
import { editorState } from '../core/EditorState';
import { eventBus } from '../core/EventBus';

/**
 * Tool for drawing bezier paths (cubic bezier curves)
 * - Click to add anchor points
 * - Double-click or click near starting point to close/finish the path
 * - Press Escape to cancel
 * - Control points are positioned at 1/3 and 2/3 along the line initially (creating straight lines)
 * - After creation, control points can be adjusted using handles
 */
export class BezierPathTool implements Tool {
  readonly name = 'bezierPath';

  private points: Point[] = [];
  private previewPath: SVGPathElement | null = null;
  private previewLine: SVGLineElement | null = null;
  private startMarker: SVGCircleElement | null = null;
  private svgElement: SVGSVGElement;
  private keyHandler: ((e: KeyboardEvent) => void) | null = null;

  private static CLOSE_DISTANCE = 15;

  constructor(svgElement: SVGSVGElement) {
    this.svgElement = svgElement;
  }

  onActivate(): void {
    this.keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this.cancelDrawing();
      }
    };
    document.addEventListener('keydown', this.keyHandler);
  }

  onDeactivate(): void {
    this.cleanup();
    if (this.keyHandler) {
      document.removeEventListener('keydown', this.keyHandler);
      this.keyHandler = null;
    }
  }

  onMouseDown(point: Point, event: MouseEvent): void {
    const snappedPoint = editorState.snapPoint(point);

    // Check for double-click to finish (open path)
    if (event.detail === 2 && this.points.length >= 2) {
      this.finishPath(false);
      return;
    }

    // Check if clicking near the starting point to close
    if (this.points.length >= 3) {
      const startPoint = this.points[0];
      const dist = Math.sqrt(
        (snappedPoint.x - startPoint.x) ** 2 + (snappedPoint.y - startPoint.y) ** 2
      );
      if (dist <= BezierPathTool.CLOSE_DISTANCE) {
        this.finishPath(true);
        return;
      }
    }

    // Add new point
    this.points.push(snappedPoint);

    // Update preview
    this.updatePreview(snappedPoint);
  }

  onMouseMove(point: Point, _event: MouseEvent): void {
    if (this.points.length === 0) return;

    const snappedPoint = editorState.snapPoint(point);

    // Update the preview line from last point to current mouse position
    if (this.previewLine) {
      const lastPoint = this.points[this.points.length - 1];
      this.previewLine.setAttribute('x1', String(lastPoint.x));
      this.previewLine.setAttribute('y1', String(lastPoint.y));
      this.previewLine.setAttribute('x2', String(snappedPoint.x));
      this.previewLine.setAttribute('y2', String(snappedPoint.y));
    }

    // Update the preview path to include current mouse position
    if (this.previewPath && this.points.length >= 1) {
      const allPoints = [...this.points, snappedPoint];
      const pathData = this.buildPreviewPathData(allPoints);
      this.previewPath.setAttribute('d', pathData);
    }

    // Highlight start marker when near first point
    if (this.startMarker && this.points.length >= 3) {
      const startPoint = this.points[0];
      const dist = Math.sqrt(
        (snappedPoint.x - startPoint.x) ** 2 + (snappedPoint.y - startPoint.y) ** 2
      );
      if (dist <= BezierPathTool.CLOSE_DISTANCE) {
        this.startMarker.setAttribute('fill', '#00ff00');
        this.startMarker.setAttribute('r', '8');
      } else {
        this.startMarker.setAttribute('fill', '#ff0000');
        this.startMarker.setAttribute('r', '5');
      }
    }
  }

  onMouseUp(_point: Point, _event: MouseEvent): void {
    // Points are added on mouseDown
  }

  onMouseLeave(): void {
    // Don't cancel on mouse leave
  }

  /**
   * Build SVG path data for preview (straight line segments)
   */
  private buildPreviewPathData(points: Point[]): string {
    if (points.length === 0) return '';
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      d += ` L ${points[i].x} ${points[i].y}`;
    }
    return d;
  }

  private updatePreview(currentPoint: Point): void {
    const style = editorState.currentStyle;

    // Create preview path if needed
    if (!this.previewPath) {
      this.previewPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      this.previewPath.setAttribute('fill', style.fillNone ? 'none' : style.fill);
      this.previewPath.setAttribute('stroke', style.stroke);
      this.previewPath.setAttribute('stroke-width', String(style.strokeWidth));
      this.previewPath.setAttribute('stroke-dasharray', '5,5');
      this.previewPath.setAttribute('opacity', '0.5');
      this.previewPath.classList.add('preview-shape');
      this.svgElement.appendChild(this.previewPath);
    }

    // Create preview line if needed
    if (!this.previewLine) {
      this.previewLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      this.previewLine.setAttribute('stroke', style.stroke);
      this.previewLine.setAttribute('stroke-width', String(style.strokeWidth));
      this.previewLine.setAttribute('stroke-dasharray', '5,5');
      this.previewLine.setAttribute('opacity', '0.7');
      this.previewLine.classList.add('preview-shape');
      this.svgElement.appendChild(this.previewLine);
    }

    // Create start marker for first point
    if (this.points.length === 1 && !this.startMarker) {
      this.startMarker = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      this.startMarker.setAttribute('cx', String(this.points[0].x));
      this.startMarker.setAttribute('cy', String(this.points[0].y));
      this.startMarker.setAttribute('r', '5');
      this.startMarker.setAttribute('fill', '#ff0000');
      this.startMarker.setAttribute('stroke', '#ffffff');
      this.startMarker.setAttribute('stroke-width', '2');
      this.startMarker.classList.add('preview-shape');
      this.svgElement.appendChild(this.startMarker);
    }

    // Update path
    const pathData = this.buildPreviewPathData(this.points);
    this.previewPath.setAttribute('d', pathData);

    // Update preview line
    this.previewLine.setAttribute('x1', String(currentPoint.x));
    this.previewLine.setAttribute('y1', String(currentPoint.y));
    this.previewLine.setAttribute('x2', String(currentPoint.x));
    this.previewLine.setAttribute('y2', String(currentPoint.y));
  }

  private finishPath(closed: boolean): void {
    if (this.points.length < 2) {
      this.cancelDrawing();
      return;
    }

    // Create the actual bezier path with default control points
    const bezierPath = BezierPath.fromAnchorPoints(
      this.points,
      closed,
      { ...editorState.currentStyle }
    );
    eventBus.emit('shape:added', bezierPath);

    // Reset for next path
    this.cleanup();
  }

  private cancelDrawing(): void {
    this.cleanup();
  }

  private cleanup(): void {
    if (this.previewPath) {
      this.previewPath.remove();
      this.previewPath = null;
    }
    if (this.previewLine) {
      this.previewLine.remove();
      this.previewLine = null;
    }
    if (this.startMarker) {
      this.startMarker.remove();
      this.startMarker = null;
    }
    this.points = [];
  }
}
