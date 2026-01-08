import { Point } from '../../shared/types';
import { Ellipse } from '../shapes/Ellipse';
import { Handle, HandleSet, HandlePosition, createHandleElement, getCursorForHandle } from './Handle';

/**
 * Handle for ellipse corner
 */
class EllipseCornerHandle implements Handle {
  type = 'corner' as const;
  private handleElement: SVGCircleElement | null = null;

  constructor(
    public position: HandlePosition,
    private ellipse: Ellipse
  ) {}

  getPosition(): Point {
    const bounds = this.ellipse.getBounds();
    switch (this.position) {
      case 'nw':
        return { x: bounds.x, y: bounds.y };
      case 'ne':
        return { x: bounds.x + bounds.width, y: bounds.y };
      case 'se':
        return { x: bounds.x + bounds.width, y: bounds.y + bounds.height };
      case 'sw':
        return { x: bounds.x, y: bounds.y + bounds.height };
      default:
        return { x: this.ellipse.cx, y: this.ellipse.cy };
    }
  }

  hitTest(point: Point, tolerance: number = 8): boolean {
    const pos = this.getPosition();
    const dx = point.x - pos.x;
    const dy = point.y - pos.y;
    return Math.sqrt(dx * dx + dy * dy) <= tolerance;
  }

  onDrag(point: Point, _event?: MouseEvent): void {
    const bounds = this.ellipse.getBounds();
    let newX = bounds.x;
    let newY = bounds.y;
    let newWidth = bounds.width;
    let newHeight = bounds.height;

    // Calculate new bounds based on which corner is being dragged
    switch (this.position) {
      case 'nw':
        newWidth = bounds.x + bounds.width - point.x;
        newHeight = bounds.y + bounds.height - point.y;
        newX = point.x;
        newY = point.y;
        break;
      case 'ne':
        newWidth = point.x - bounds.x;
        newHeight = bounds.y + bounds.height - point.y;
        newY = point.y;
        break;
      case 'se':
        newWidth = point.x - bounds.x;
        newHeight = point.y - bounds.y;
        break;
      case 'sw':
        newWidth = bounds.x + bounds.width - point.x;
        newHeight = point.y - bounds.y;
        newX = point.x;
        break;
    }

    // Ensure minimum size
    if (newWidth < 6) newWidth = 6;
    if (newHeight < 6) newHeight = 6;

    // Update ellipse properties
    this.ellipse.rx = newWidth / 2;
    this.ellipse.ry = newHeight / 2;
    this.ellipse.cx = newX + newWidth / 2;
    this.ellipse.cy = newY + newHeight / 2;

    this.ellipse.updateElement();
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
 * Handle set for Ellipse shape (4 corners)
 */
export class EllipseHandles implements HandleSet {
  handles: Handle[] = [];
  element: SVGGElement | null = null;
  private cornerHandles: EllipseCornerHandle[] = [];

  constructor(public shape: Ellipse) {
    const positions: HandlePosition[] = ['nw', 'ne', 'se', 'sw'];
    this.cornerHandles = positions.map(pos => new EllipseCornerHandle(pos, shape));
    this.handles = this.cornerHandles;
  }

  render(svg: SVGSVGElement): SVGGElement {
    // Remove existing if any
    this.remove();

    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.classList.add('handle-group');

    // Create handle elements for each corner
    this.cornerHandles.forEach(handle => {
      const pos = handle.getPosition();
      const el = createHandleElement(pos.x, pos.y, getCursorForHandle(handle.position));
      handle.setElement(el);
      group.appendChild(el);
    });

    svg.appendChild(group);
    this.element = group;
    return group;
  }

  update(): void {
    this.cornerHandles.forEach(handle => handle.updateElement());
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
