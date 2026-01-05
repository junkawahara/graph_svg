import { Point } from '../../shared/types';
import { Tool } from './Tool';
import { Line } from '../shapes/Line';
import { editorState } from '../core/EditorState';
import { eventBus } from '../core/EventBus';

/**
 * Tool for drawing lines
 */
export class LineTool implements Tool {
  readonly name = 'line';

  private isDrawing = false;
  private startPoint: Point | null = null;
  private previewLine: SVGLineElement | null = null;
  private svgElement: SVGSVGElement;

  constructor(svgElement: SVGSVGElement) {
    this.svgElement = svgElement;
  }

  onMouseDown(point: Point, _event: MouseEvent): void {
    this.isDrawing = true;
    const snappedPoint = editorState.snapPoint(point);
    this.startPoint = snappedPoint;

    // Create preview line
    this.previewLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    this.previewLine.setAttribute('x1', String(snappedPoint.x));
    this.previewLine.setAttribute('y1', String(snappedPoint.y));
    this.previewLine.setAttribute('x2', String(snappedPoint.x));
    this.previewLine.setAttribute('y2', String(snappedPoint.y));

    const style = editorState.currentStyle;
    this.previewLine.setAttribute('stroke', style.stroke);
    this.previewLine.setAttribute('stroke-width', String(style.strokeWidth));
    this.previewLine.setAttribute('stroke-dasharray', '5,5');
    this.previewLine.setAttribute('opacity', '0.7');
    this.previewLine.classList.add('preview-shape');

    this.svgElement.appendChild(this.previewLine);
  }

  onMouseMove(point: Point, _event: MouseEvent): void {
    if (!this.isDrawing || !this.previewLine) return;

    const snappedPoint = editorState.snapPoint(point);
    this.previewLine.setAttribute('x2', String(snappedPoint.x));
    this.previewLine.setAttribute('y2', String(snappedPoint.y));
  }

  onMouseUp(point: Point, _event: MouseEvent): void {
    if (!this.isDrawing || !this.startPoint) return;

    // Remove preview
    if (this.previewLine) {
      this.previewLine.remove();
      this.previewLine = null;
    }

    const snappedPoint = editorState.snapPoint(point);

    // Don't create line if too small
    const dx = snappedPoint.x - this.startPoint.x;
    const dy = snappedPoint.y - this.startPoint.y;
    const length = Math.sqrt(dx * dx + dy * dy);

    if (length >= 5) {
      // Create actual line
      const line = Line.fromPoints(this.startPoint, snappedPoint, editorState.currentStyle);
      eventBus.emit('shape:added', line);
    }

    this.isDrawing = false;
    this.startPoint = null;
  }

  onMouseLeave(): void {
    // Cancel drawing if mouse leaves canvas
    if (this.previewLine) {
      this.previewLine.remove();
      this.previewLine = null;
    }
    this.isDrawing = false;
    this.startPoint = null;
  }

  onDeactivate(): void {
    // Clean up when switching tools
    if (this.previewLine) {
      this.previewLine.remove();
      this.previewLine = null;
    }
    this.isDrawing = false;
    this.startPoint = null;
  }
}
