import { Point } from '../../shared/types';
import { Tool } from './Tool';
import { Rectangle } from '../shapes/Rectangle';
import { editorState } from '../core/EditorState';
import { eventBus } from '../core/EventBus';

/**
 * Tool for drawing rectangles by dragging bounding box
 */
export class RectangleTool implements Tool {
  readonly name = 'rectangle';

  private isDrawing = false;
  private startPoint: Point | null = null;
  private previewRect: SVGRectElement | null = null;
  private svgElement: SVGSVGElement;

  constructor(svgElement: SVGSVGElement) {
    this.svgElement = svgElement;
  }

  onMouseDown(point: Point, _event: MouseEvent): void {
    this.isDrawing = true;
    const snappedPoint = editorState.snapPoint(point);
    this.startPoint = snappedPoint;

    // Create preview rectangle
    this.previewRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    this.previewRect.setAttribute('x', String(snappedPoint.x));
    this.previewRect.setAttribute('y', String(snappedPoint.y));
    this.previewRect.setAttribute('width', '0');
    this.previewRect.setAttribute('height', '0');

    const style = editorState.currentStyle;
    if (style.fillNone) {
      this.previewRect.setAttribute('fill', 'none');
    } else {
      this.previewRect.setAttribute('fill', style.fill);
    }
    this.previewRect.setAttribute('stroke', style.stroke);
    this.previewRect.setAttribute('stroke-width', String(style.strokeWidth));
    this.previewRect.setAttribute('stroke-dasharray', '5,5');
    this.previewRect.setAttribute('opacity', '0.7');
    this.previewRect.classList.add('preview-shape');

    this.svgElement.appendChild(this.previewRect);
  }

  onMouseMove(point: Point, _event: MouseEvent): void {
    if (!this.isDrawing || !this.previewRect || !this.startPoint) return;

    const snappedPoint = editorState.snapPoint(point);

    // Calculate rectangle parameters from bounding box
    const x = Math.min(this.startPoint.x, snappedPoint.x);
    const y = Math.min(this.startPoint.y, snappedPoint.y);
    const width = Math.abs(snappedPoint.x - this.startPoint.x);
    const height = Math.abs(snappedPoint.y - this.startPoint.y);

    this.previewRect.setAttribute('x', String(x));
    this.previewRect.setAttribute('y', String(y));
    this.previewRect.setAttribute('width', String(width));
    this.previewRect.setAttribute('height', String(height));
  }

  onMouseUp(point: Point, _event: MouseEvent): void {
    if (!this.isDrawing || !this.startPoint) return;

    // Remove preview
    if (this.previewRect) {
      this.previewRect.remove();
      this.previewRect = null;
    }

    const snappedPoint = editorState.snapPoint(point);

    // Calculate size
    const width = Math.abs(snappedPoint.x - this.startPoint.x);
    const height = Math.abs(snappedPoint.y - this.startPoint.y);

    // Don't create rectangle if too small
    if (width >= 3 && height >= 3) {
      // Create actual rectangle
      const rectangle = Rectangle.fromBoundingBox(this.startPoint, snappedPoint, editorState.currentStyle);
      eventBus.emit('shape:added', rectangle);
    }

    this.isDrawing = false;
    this.startPoint = null;
  }

  onMouseLeave(): void {
    // Cancel drawing if mouse leaves canvas
    if (this.previewRect) {
      this.previewRect.remove();
      this.previewRect = null;
    }
    this.isDrawing = false;
    this.startPoint = null;
  }

  onDeactivate(): void {
    // Clean up when switching tools
    if (this.previewRect) {
      this.previewRect.remove();
      this.previewRect = null;
    }
    this.isDrawing = false;
    this.startPoint = null;
  }
}
