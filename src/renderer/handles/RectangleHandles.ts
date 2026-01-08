import { Point } from '../../shared/types';
import { Rectangle } from '../shapes/Rectangle';
import { Handle, HandleSet, HandlePosition, createHandleElement, getCursorForHandle } from './Handle';

/**
 * Handle for rectangle corner
 */
class RectangleCornerHandle implements Handle {
  type = 'corner' as const;
  private handleElement: SVGCircleElement | null = null;

  constructor(
    public position: HandlePosition,
    private rectangle: Rectangle
  ) {}

  getPosition(): Point {
    const bounds = this.rectangle.getBounds();
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
        return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
    }
  }

  hitTest(point: Point, tolerance: number = 8): boolean {
    const pos = this.getPosition();
    const dx = point.x - pos.x;
    const dy = point.y - pos.y;
    return Math.sqrt(dx * dx + dy * dy) <= tolerance;
  }

  onDrag(point: Point, _event?: MouseEvent): void {
    const bounds = this.rectangle.getBounds();
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

    // Update rectangle properties
    this.rectangle.x = newX;
    this.rectangle.y = newY;
    this.rectangle.width = newWidth;
    this.rectangle.height = newHeight;

    this.rectangle.updateElement();
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
 * Handle set for Rectangle shape (4 corners)
 */
export class RectangleHandles implements HandleSet {
  handles: Handle[] = [];
  element: SVGGElement | null = null;
  private cornerHandles: RectangleCornerHandle[] = [];

  constructor(public shape: Rectangle) {
    const positions: HandlePosition[] = ['nw', 'ne', 'se', 'sw'];
    this.cornerHandles = positions.map(pos => new RectangleCornerHandle(pos, shape));
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
