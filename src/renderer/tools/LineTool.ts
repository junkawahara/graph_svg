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
    this.startPoint = point;

    // Create preview line
    this.previewLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    this.previewLine.setAttribute('x1', String(point.x));
    this.previewLine.setAttribute('y1', String(point.y));
    this.previewLine.setAttribute('x2', String(point.x));
    this.previewLine.setAttribute('y2', String(point.y));

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

    this.previewLine.setAttribute('x2', String(point.x));
    this.previewLine.setAttribute('y2', String(point.y));
  }

  onMouseUp(point: Point, _event: MouseEvent): void {
    if (!this.isDrawing || !this.startPoint) return;

    // Remove preview
    if (this.previewLine) {
      this.previewLine.remove();
      this.previewLine = null;
    }

    // Don't create line if too small
    const dx = point.x - this.startPoint.x;
    const dy = point.y - this.startPoint.y;
    const length = Math.sqrt(dx * dx + dy * dy);

    if (length >= 5) {
      // Create actual line
      const line = Line.fromPoints(this.startPoint, point, editorState.currentStyle);
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
