import { Point } from '../../shared/types';
import { Tool } from './Tool';
import { Ellipse } from '../shapes/Ellipse';
import { editorState } from '../core/EditorState';
import { eventBus } from '../core/EventBus';

/**
 * Tool for drawing ellipses by dragging bounding box
 */
export class EllipseTool implements Tool {
  readonly name = 'ellipse';

  private isDrawing = false;
  private startPoint: Point | null = null;
  private previewEllipse: SVGEllipseElement | null = null;
  private svgElement: SVGSVGElement;

  constructor(svgElement: SVGSVGElement) {
    this.svgElement = svgElement;
  }

  onMouseDown(point: Point, _event: MouseEvent): void {
    this.isDrawing = true;
    const snappedPoint = editorState.snapPoint(point);
    this.startPoint = snappedPoint;

    // Create preview ellipse
    this.previewEllipse = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
    this.previewEllipse.setAttribute('cx', String(snappedPoint.x));
    this.previewEllipse.setAttribute('cy', String(snappedPoint.y));
    this.previewEllipse.setAttribute('rx', '0');
    this.previewEllipse.setAttribute('ry', '0');

    const style = editorState.currentStyle;
    if (style.fillNone) {
      this.previewEllipse.setAttribute('fill', 'none');
    } else {
      this.previewEllipse.setAttribute('fill', style.fill);
    }
    this.previewEllipse.setAttribute('stroke', style.stroke);
    this.previewEllipse.setAttribute('stroke-width', String(style.strokeWidth));
    this.previewEllipse.setAttribute('stroke-dasharray', '5,5');
    this.previewEllipse.setAttribute('opacity', '0.7');
    this.previewEllipse.classList.add('preview-shape');

    this.svgElement.appendChild(this.previewEllipse);
  }

  onMouseMove(point: Point, _event: MouseEvent): void {
    if (!this.isDrawing || !this.previewEllipse || !this.startPoint) return;

    const snappedPoint = editorState.snapPoint(point);

    // Calculate ellipse parameters from bounding box
    const cx = (this.startPoint.x + snappedPoint.x) / 2;
    const cy = (this.startPoint.y + snappedPoint.y) / 2;
    const rx = Math.abs(snappedPoint.x - this.startPoint.x) / 2;
    const ry = Math.abs(snappedPoint.y - this.startPoint.y) / 2;

    this.previewEllipse.setAttribute('cx', String(cx));
    this.previewEllipse.setAttribute('cy', String(cy));
    this.previewEllipse.setAttribute('rx', String(rx));
    this.previewEllipse.setAttribute('ry', String(ry));
  }

  onMouseUp(point: Point, _event: MouseEvent): void {
    if (!this.isDrawing || !this.startPoint) return;

    // Remove preview
    if (this.previewEllipse) {
      this.previewEllipse.remove();
      this.previewEllipse = null;
    }

    const snappedPoint = editorState.snapPoint(point);

    // Calculate size
    const rx = Math.abs(snappedPoint.x - this.startPoint.x) / 2;
    const ry = Math.abs(snappedPoint.y - this.startPoint.y) / 2;

    // Don't create ellipse if too small
    if (rx >= 3 && ry >= 3) {
      // Create actual ellipse
      const ellipse = Ellipse.fromBoundingBox(this.startPoint, snappedPoint, editorState.currentStyle);
      eventBus.emit('shape:added', ellipse);
    }

    this.isDrawing = false;
    this.startPoint = null;
  }

  onMouseLeave(): void {
    // Cancel drawing if mouse leaves canvas
    if (this.previewEllipse) {
      this.previewEllipse.remove();
      this.previewEllipse = null;
    }
    this.isDrawing = false;
    this.startPoint = null;
  }

  onDeactivate(): void {
    // Clean up when switching tools
    if (this.previewEllipse) {
      this.previewEllipse.remove();
      this.previewEllipse = null;
    }
    this.isDrawing = false;
    this.startPoint = null;
  }
}
