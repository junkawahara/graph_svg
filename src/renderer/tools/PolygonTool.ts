import { Point } from '../../shared/types';
import { Tool } from './Tool';
import { Polygon } from '../shapes/Polygon';
import { editorState } from '../core/EditorState';
import { eventBus } from '../core/EventBus';

/**
 * Tool for drawing polygons
 * - Click to add vertices
 * - Double-click or click near starting point to close the polygon
 * - Press Escape to cancel
 */
export class PolygonTool implements Tool {
  readonly name = 'polygon';

  private points: Point[] = [];
  private previewPolygon: SVGPolygonElement | null = null;
  private previewLine: SVGLineElement | null = null;
  private startMarker: SVGCircleElement | null = null;
  private svgElement: SVGSVGElement;
  private keyHandler: ((e: KeyboardEvent) => void) | null = null;

  private static CLOSE_DISTANCE = 15; // Distance to first point to close polygon

  constructor(svgElement: SVGSVGElement) {
    this.svgElement = svgElement;
  }

  onActivate(): void {
    // Setup keyboard handler for Escape key
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

    // Check for double-click to close
    if (event.detail === 2 && this.points.length >= 3) {
      this.finishPolygon();
      return;
    }

    // Check if clicking near the starting point to close
    if (this.points.length >= 3) {
      const startPoint = this.points[0];
      const dist = Math.sqrt(
        (snappedPoint.x - startPoint.x) ** 2 + (snappedPoint.y - startPoint.y) ** 2
      );
      if (dist <= PolygonTool.CLOSE_DISTANCE) {
        this.finishPolygon();
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

    // Update the preview polygon to include current mouse position
    if (this.previewPolygon && this.points.length >= 1) {
      const allPoints = [...this.points, snappedPoint];
      const pointsStr = allPoints.map(p => `${p.x},${p.y}`).join(' ');
      this.previewPolygon.setAttribute('points', pointsStr);
    }

    // Highlight start marker when near first point
    if (this.startMarker && this.points.length >= 3) {
      const startPoint = this.points[0];
      const dist = Math.sqrt(
        (snappedPoint.x - startPoint.x) ** 2 + (snappedPoint.y - startPoint.y) ** 2
      );
      if (dist <= PolygonTool.CLOSE_DISTANCE) {
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
    // Don't cancel on mouse leave - allow continuing when mouse returns
  }

  private updatePreview(currentPoint: Point): void {
    const style = editorState.currentStyle;

    // Create preview polygon if needed
    if (!this.previewPolygon) {
      this.previewPolygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      this.previewPolygon.setAttribute('fill', style.fillNone ? 'none' : style.fill);
      this.previewPolygon.setAttribute('stroke', style.stroke);
      this.previewPolygon.setAttribute('stroke-width', String(style.strokeWidth));
      this.previewPolygon.setAttribute('stroke-dasharray', '5,5');
      this.previewPolygon.setAttribute('opacity', '0.5');
      this.previewPolygon.classList.add('preview-shape');
      this.svgElement.appendChild(this.previewPolygon);
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

    // Update polygon points
    const pointsStr = this.points.map(p => `${p.x},${p.y}`).join(' ');
    this.previewPolygon.setAttribute('points', pointsStr);

    // Update preview line
    this.previewLine.setAttribute('x1', String(currentPoint.x));
    this.previewLine.setAttribute('y1', String(currentPoint.y));
    this.previewLine.setAttribute('x2', String(currentPoint.x));
    this.previewLine.setAttribute('y2', String(currentPoint.y));
  }

  private finishPolygon(): void {
    if (this.points.length < 3) {
      this.cancelDrawing();
      return;
    }

    // Create the actual polygon
    const polygon = Polygon.fromPoints(this.points, { ...editorState.currentStyle });
    eventBus.emit('shape:added', polygon);

    // Reset for next polygon
    this.cleanup();
  }

  private cancelDrawing(): void {
    this.cleanup();
  }

  private cleanup(): void {
    // Remove preview elements
    if (this.previewPolygon) {
      this.previewPolygon.remove();
      this.previewPolygon = null;
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
