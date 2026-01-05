import { Point } from '../../shared/types';
import { Tool } from './Tool';
import { Polyline } from '../shapes/Polyline';
import { editorState } from '../core/EditorState';
import { eventBus } from '../core/EventBus';

/**
 * Tool for drawing polylines (open paths)
 * - Click to add vertices
 * - Double-click or press Enter to finish the polyline
 * - Press Escape to cancel
 */
export class PolylineTool implements Tool {
  readonly name = 'polyline';

  private points: Point[] = [];
  private previewPolyline: SVGPolylineElement | null = null;
  private previewLine: SVGLineElement | null = null;
  private svgElement: SVGSVGElement;
  private keyHandler: ((e: KeyboardEvent) => void) | null = null;

  constructor(svgElement: SVGSVGElement) {
    this.svgElement = svgElement;
  }

  onActivate(): void {
    // Setup keyboard handler for Escape and Enter keys
    this.keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this.cancelDrawing();
      } else if (e.key === 'Enter' && this.points.length >= 2) {
        this.finishPolyline();
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

    // Check for double-click to finish
    if (event.detail === 2 && this.points.length >= 2) {
      this.finishPolyline();
      return;
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

    // Update the preview polyline to include current mouse position
    if (this.previewPolyline && this.points.length >= 1) {
      const allPoints = [...this.points, snappedPoint];
      const pointsStr = allPoints.map(p => `${p.x},${p.y}`).join(' ');
      this.previewPolyline.setAttribute('points', pointsStr);
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

    // Create preview polyline if needed
    if (!this.previewPolyline) {
      this.previewPolyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
      this.previewPolyline.setAttribute('fill', 'none');
      this.previewPolyline.setAttribute('stroke', style.stroke);
      this.previewPolyline.setAttribute('stroke-width', String(style.strokeWidth));
      this.previewPolyline.setAttribute('stroke-dasharray', '5,5');
      this.previewPolyline.setAttribute('opacity', '0.7');
      this.previewPolyline.classList.add('preview-shape');
      this.svgElement.appendChild(this.previewPolyline);
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

    // Update polyline points
    const pointsStr = this.points.map(p => `${p.x},${p.y}`).join(' ');
    this.previewPolyline.setAttribute('points', pointsStr);

    // Update preview line
    this.previewLine.setAttribute('x1', String(currentPoint.x));
    this.previewLine.setAttribute('y1', String(currentPoint.y));
    this.previewLine.setAttribute('x2', String(currentPoint.x));
    this.previewLine.setAttribute('y2', String(currentPoint.y));
  }

  private finishPolyline(): void {
    if (this.points.length < 2) {
      this.cancelDrawing();
      return;
    }

    // Create the actual polyline
    const polyline = Polyline.fromPoints(this.points, { ...editorState.currentStyle });
    eventBus.emit('shape:added', polyline);

    // Reset for next polyline
    this.cleanup();
  }

  private cancelDrawing(): void {
    this.cleanup();
  }

  private cleanup(): void {
    // Remove preview elements
    if (this.previewPolyline) {
      this.previewPolyline.remove();
      this.previewPolyline = null;
    }
    if (this.previewLine) {
      this.previewLine.remove();
      this.previewLine = null;
    }
    this.points = [];
  }
}
