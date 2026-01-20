import { Point } from '../../shared/types';
import { Tool } from './Tool';

export interface ZoomToolCallbacks {
  getSvgElement: () => SVGSVGElement;
  zoomInAt: (screenX: number, screenY: number) => void;
  zoomOutAt: (screenX: number, screenY: number) => void;
  zoomToRect: (svgX: number, svgY: number, svgWidth: number, svgHeight: number) => void;
  screenToSvg: (screenX: number, screenY: number) => Point;
}

/**
 * Tool for zooming in/out on the canvas
 * - Click to zoom in at cursor position
 * - Shift+Click to zoom out at cursor position
 * - Drag to select a rectangle area to zoom into
 */
export class ZoomTool implements Tool {
  readonly name = 'zoom';

  private isDragging = false;
  private dragStartPoint: Point | null = null;
  private dragStartScreen: { x: number; y: number } | null = null;
  private selectionRect: SVGRectElement | null = null;
  private callbacks: ZoomToolCallbacks;

  constructor(callbacks: ZoomToolCallbacks) {
    this.callbacks = callbacks;
  }

  onMouseDown(point: Point, event: MouseEvent): void {
    this.isDragging = true;
    this.dragStartPoint = point;
    this.dragStartScreen = { x: event.clientX, y: event.clientY };

    // Create selection rectangle
    const svg = this.callbacks.getSvgElement();
    this.selectionRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    this.selectionRect.setAttribute('fill', 'rgba(33, 150, 243, 0.2)');
    this.selectionRect.setAttribute('stroke', '#2196F3');
    this.selectionRect.setAttribute('stroke-width', '1');
    this.selectionRect.setAttribute('stroke-dasharray', '4,2');
    this.selectionRect.setAttribute('x', String(point.x));
    this.selectionRect.setAttribute('y', String(point.y));
    this.selectionRect.setAttribute('width', '0');
    this.selectionRect.setAttribute('height', '0');
    this.selectionRect.style.pointerEvents = 'none';
    svg.appendChild(this.selectionRect);
  }

  onMouseMove(point: Point, event: MouseEvent): void {
    if (!this.isDragging || !this.dragStartPoint || !this.selectionRect) return;

    // Update selection rectangle
    const minX = Math.min(this.dragStartPoint.x, point.x);
    const minY = Math.min(this.dragStartPoint.y, point.y);
    const width = Math.abs(point.x - this.dragStartPoint.x);
    const height = Math.abs(point.y - this.dragStartPoint.y);

    this.selectionRect.setAttribute('x', String(minX));
    this.selectionRect.setAttribute('y', String(minY));
    this.selectionRect.setAttribute('width', String(width));
    this.selectionRect.setAttribute('height', String(height));
  }

  onMouseUp(point: Point, event: MouseEvent): void {
    if (!this.isDragging || !this.dragStartPoint || !this.dragStartScreen) {
      this.cleanup();
      return;
    }

    // Calculate drag distance to determine if it was a click or drag
    const dragDistance = Math.sqrt(
      Math.pow(event.clientX - this.dragStartScreen.x, 2) +
      Math.pow(event.clientY - this.dragStartScreen.y, 2)
    );

    const svg = this.callbacks.getSvgElement();
    const rect = svg.getBoundingClientRect();
    const screenX = event.clientX - rect.left;
    const screenY = event.clientY - rect.top;

    if (dragDistance < 5) {
      // It was a click - zoom in or out based on shift key
      if (event.shiftKey) {
        this.callbacks.zoomOutAt(screenX, screenY);
      } else {
        this.callbacks.zoomInAt(screenX, screenY);
      }
    } else {
      // It was a drag - zoom to the selected rectangle
      const minX = Math.min(this.dragStartPoint.x, point.x);
      const minY = Math.min(this.dragStartPoint.y, point.y);
      const width = Math.abs(point.x - this.dragStartPoint.x);
      const height = Math.abs(point.y - this.dragStartPoint.y);

      // Only zoom if the rectangle has meaningful size
      if (width > 10 && height > 10) {
        if (event.shiftKey) {
          // Shift+drag: zoom out at center point
          this.callbacks.zoomOutAt(screenX, screenY);
        } else {
          // Normal drag: zoom to fit selected rectangle
          this.callbacks.zoomToRect(minX, minY, width, height);
        }
      }
    }

    this.cleanup();
  }

  onMouseLeave(): void {
    this.cleanup();
  }

  onActivate(): void {
    // Nothing to do
  }

  onDeactivate(): void {
    this.cleanup();
  }

  private cleanup(): void {
    if (this.selectionRect) {
      this.selectionRect.remove();
      this.selectionRect = null;
    }
    this.isDragging = false;
    this.dragStartPoint = null;
    this.dragStartScreen = null;
  }
}
