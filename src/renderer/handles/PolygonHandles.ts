import { Point } from '../../shared/types';
import { Polygon } from '../shapes/Polygon';
import { Polyline } from '../shapes/Polyline';
import { Handle, HandleSet, HandlePosition, createHandleElement } from './Handle';

/**
 * Handle for polygon/polyline vertex
 */
class VertexHandle implements Handle {
  type = 'endpoint' as const;
  position: HandlePosition;
  private handleElement: SVGCircleElement | null = null;

  constructor(
    private index: number,
    private shape: Polygon | Polyline
  ) {
    // Use 'start' or 'end' for position as they map to 'move' cursor
    this.position = index === 0 ? 'start' : 'end';
  }

  getPosition(): Point {
    return { ...this.shape.points[this.index] };
  }

  hitTest(point: Point, tolerance: number = 8): boolean {
    const pos = this.getPosition();
    const dx = point.x - pos.x;
    const dy = point.y - pos.y;
    return Math.sqrt(dx * dx + dy * dy) <= tolerance;
  }

  onDrag(point: Point): void {
    this.shape.setVertex(this.index, point);
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

  getIndex(): number {
    return this.index;
  }
}

/**
 * Handle set for Polygon shape - one handle per vertex
 */
export class PolygonHandles implements HandleSet {
  handles: Handle[] = [];
  element: SVGGElement | null = null;
  private vertexHandles: VertexHandle[] = [];

  constructor(public shape: Polygon) {
    this.createHandles();
  }

  private createHandles(): void {
    this.vertexHandles = [];
    this.handles = [];

    for (let i = 0; i < this.shape.points.length; i++) {
      const handle = new VertexHandle(i, this.shape);
      this.vertexHandles.push(handle);
      this.handles.push(handle);
    }
  }

  render(svg: SVGSVGElement): SVGGElement {
    // Remove existing if any
    this.remove();

    // Recreate handles in case points changed
    this.createHandles();

    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.classList.add('handle-group');

    // Create handle elements for each vertex
    for (const handle of this.vertexHandles) {
      const pos = handle.getPosition();
      const el = createHandleElement(pos.x, pos.y, 'move');
      handle.setElement(el);
      group.appendChild(el);
    }

    svg.appendChild(group);
    this.element = group;
    return group;
  }

  update(): void {
    // If number of points changed, re-render handles
    if (this.vertexHandles.length !== this.shape.points.length) {
      if (this.element) {
        const svg = this.element.ownerSVGElement;
        if (svg) {
          this.render(svg);
        }
      }
      return;
    }

    // Update existing handle positions
    for (const handle of this.vertexHandles) {
      handle.updateElement();
    }
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

/**
 * Handle set for Polyline shape - one handle per vertex
 */
export class PolylineHandles implements HandleSet {
  handles: Handle[] = [];
  element: SVGGElement | null = null;
  private vertexHandles: VertexHandle[] = [];

  constructor(public shape: Polyline) {
    this.createHandles();
  }

  private createHandles(): void {
    this.vertexHandles = [];
    this.handles = [];

    for (let i = 0; i < this.shape.points.length; i++) {
      const handle = new VertexHandle(i, this.shape);
      this.vertexHandles.push(handle);
      this.handles.push(handle);
    }
  }

  render(svg: SVGSVGElement): SVGGElement {
    // Remove existing if any
    this.remove();

    // Recreate handles in case points changed
    this.createHandles();

    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.classList.add('handle-group');

    // Create handle elements for each vertex
    for (const handle of this.vertexHandles) {
      const pos = handle.getPosition();
      const el = createHandleElement(pos.x, pos.y, 'move');
      handle.setElement(el);
      group.appendChild(el);
    }

    svg.appendChild(group);
    this.element = group;
    return group;
  }

  update(): void {
    // If number of points changed, re-render handles
    if (this.vertexHandles.length !== this.shape.points.length) {
      if (this.element) {
        const svg = this.element.ownerSVGElement;
        if (svg) {
          this.render(svg);
        }
      }
      return;
    }

    // Update existing handle positions
    for (const handle of this.vertexHandles) {
      handle.updateElement();
    }
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
