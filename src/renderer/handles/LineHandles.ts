import { Point } from '../../shared/types';
import { Line } from '../shapes/Line';
import { Handle, HandleSet, HandlePosition, createHandleElement, getCursorForHandle } from './Handle';
import { round3 } from '../core/MathUtils';

/**
 * Handle for line endpoint
 */
class LineEndpointHandle implements Handle {
  type = 'endpoint' as const;
  private handleElement: SVGCircleElement | null = null;

  constructor(
    public position: HandlePosition,
    private line: Line
  ) {}

  getPosition(): Point {
    if (this.position === 'start') {
      return { x: this.line.x1, y: this.line.y1 };
    } else {
      return { x: this.line.x2, y: this.line.y2 };
    }
  }

  hitTest(point: Point, tolerance: number = 8): boolean {
    const pos = this.getPosition();
    const dx = point.x - pos.x;
    const dy = point.y - pos.y;
    return Math.sqrt(dx * dx + dy * dy) <= tolerance;
  }

  onDrag(point: Point, _event?: MouseEvent): void {
    if (this.position === 'start') {
      this.line.x1 = round3(point.x);
      this.line.y1 = round3(point.y);
    } else {
      this.line.x2 = round3(point.x);
      this.line.y2 = round3(point.y);
    }
    this.line.updateElement();
  }

  setElement(el: SVGCircleElement): void {
    this.handleElement = el;
  }

  updateElement(): void {
    if (!this.handleElement) return;
    const pos = this.getPosition();
    this.handleElement.setAttribute('cx', String(pos.x));
    this.handleElement.setAttribute('cy', String(pos.y));
  }
}

/**
 * Handle set for Line shape (2 endpoints)
 */
export class LineHandles implements HandleSet {
  handles: Handle[] = [];
  element: SVGGElement | null = null;
  private startHandle: LineEndpointHandle;
  private endHandle: LineEndpointHandle;

  constructor(public shape: Line) {
    this.startHandle = new LineEndpointHandle('start', shape);
    this.endHandle = new LineEndpointHandle('end', shape);
    this.handles = [this.startHandle, this.endHandle];
  }

  render(svg: SVGSVGElement): SVGGElement {
    // Remove existing if any
    this.remove();

    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.classList.add('handle-group');

    // Create handle elements
    const startPos = this.startHandle.getPosition();
    const startEl = createHandleElement(startPos.x, startPos.y, getCursorForHandle('start'));
    this.startHandle.setElement(startEl);
    group.appendChild(startEl);

    const endPos = this.endHandle.getPosition();
    const endEl = createHandleElement(endPos.x, endPos.y, getCursorForHandle('end'));
    this.endHandle.setElement(endEl);
    group.appendChild(endEl);

    svg.appendChild(group);
    this.element = group;
    return group;
  }

  update(): void {
    this.startHandle.updateElement();
    this.endHandle.updateElement();
  }

  remove(): void {
    if (this.element) {
      this.element.remove();
      this.element = null;
    }
  }

  findHandleAt(point: Point): Handle | null {
    for (const handle of this.handles) {
      if (handle.hitTest(point)) {
        return handle;
      }
    }
    return null;
  }
}
