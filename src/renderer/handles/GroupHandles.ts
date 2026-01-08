import { Point, Bounds } from '../../shared/types';
import { Group } from '../shapes/Group';
import { Handle, HandleSet, HandlePosition, createHandleElement, getCursorForHandle } from './Handle';

/**
 * Handle for group corner - scales the group
 */
class GroupCornerHandle implements Handle {
  type = 'corner' as const;
  private handleElement: SVGCircleElement | null = null;
  private originalBounds: Bounds | null = null;

  constructor(
    public position: HandlePosition,
    private group: Group
  ) {}

  getPosition(): Point {
    const bounds = this.group.getBounds();
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

  /**
   * Store the original bounds when drag starts
   */
  startDrag(): void {
    this.originalBounds = this.group.getBounds();
  }

  onDrag(point: Point, event?: MouseEvent): void {
    if (!this.originalBounds) {
      this.originalBounds = this.group.getBounds();
    }

    const bounds = this.originalBounds;
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
    const minSize = 10;
    if (newWidth < minSize) {
      newWidth = minSize;
      if (this.position === 'nw' || this.position === 'sw') {
        newX = bounds.x + bounds.width - minSize;
      }
    }
    if (newHeight < minSize) {
      newHeight = minSize;
      if (this.position === 'nw' || this.position === 'ne') {
        newY = bounds.y + bounds.height - minSize;
      }
    }

    // Calculate scale factors
    const sx = newWidth / bounds.width;
    const sy = newHeight / bounds.height;

    // Calculate scale origin based on opposite corner
    let originX: number;
    let originY: number;
    switch (this.position) {
      case 'nw':
        originX = bounds.x + bounds.width;
        originY = bounds.y + bounds.height;
        break;
      case 'ne':
        originX = bounds.x;
        originY = bounds.y + bounds.height;
        break;
      case 'se':
        originX = bounds.x;
        originY = bounds.y;
        break;
      case 'sw':
        originX = bounds.x + bounds.width;
        originY = bounds.y;
        break;
      default:
        originX = bounds.x;
        originY = bounds.y;
    }

    // Alt key enables position-only mode (scale positions without changing child sizes)
    const positionOnly = event?.altKey ?? false;

    // Scale the group from the opposite corner
    this.group.scale(sx, sy, { x: originX, y: originY }, positionOnly);

    // Reset original bounds for next drag event
    this.originalBounds = this.group.getBounds();
  }

  /**
   * End dragging - clear original bounds
   */
  endDrag(): void {
    this.originalBounds = null;
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
 * Handle set for Group shape (4 corners)
 */
export class GroupHandles implements HandleSet {
  handles: Handle[] = [];
  element: SVGGElement | null = null;
  private cornerHandles: GroupCornerHandle[] = [];

  constructor(public shape: Group) {
    const positions: HandlePosition[] = ['nw', 'ne', 'se', 'sw'];
    this.cornerHandles = positions.map(pos => new GroupCornerHandle(pos, shape));
    this.handles = this.cornerHandles;
  }

  render(svg: SVGSVGElement): SVGGElement {
    // Remove existing if any
    this.remove();

    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.classList.add('handle-group');

    // Draw a dashed bounding box to indicate it's a group
    const bounds = this.shape.getBounds();
    const boundingRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    boundingRect.setAttribute('x', String(bounds.x));
    boundingRect.setAttribute('y', String(bounds.y));
    boundingRect.setAttribute('width', String(bounds.width));
    boundingRect.setAttribute('height', String(bounds.height));
    boundingRect.setAttribute('fill', 'none');
    boundingRect.setAttribute('stroke', '#0e639c');
    boundingRect.setAttribute('stroke-width', '1');
    boundingRect.setAttribute('stroke-dasharray', '4,2');
    boundingRect.setAttribute('pointer-events', 'none');
    boundingRect.classList.add('group-bounding-rect');
    group.appendChild(boundingRect);

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
    // Update corner handles
    this.cornerHandles.forEach(handle => handle.updateElement());

    // Update bounding box
    if (this.element) {
      const boundingRect = this.element.querySelector('.group-bounding-rect');
      if (boundingRect) {
        const bounds = this.shape.getBounds();
        boundingRect.setAttribute('x', String(bounds.x));
        boundingRect.setAttribute('y', String(bounds.y));
        boundingRect.setAttribute('width', String(bounds.width));
        boundingRect.setAttribute('height', String(bounds.height));
      }
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

  /**
   * Start drag operation - store original bounds in all handles
   */
  startDrag(): void {
    this.cornerHandles.forEach(handle => handle.startDrag());
  }

  /**
   * End drag operation
   */
  endDrag(): void {
    this.cornerHandles.forEach(handle => handle.endDrag());
  }
}
