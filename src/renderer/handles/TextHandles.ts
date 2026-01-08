import { Point } from '../../shared/types';
import { Text } from '../shapes/Text';
import { Handle, HandleSet, HandlePosition, createHandleElement } from './Handle';

/**
 * Center handle for text (move only, no resize)
 */
class TextCenterHandle implements Handle {
  type = 'corner' as const;
  position: HandlePosition = 'nw';
  private handleElement: SVGCircleElement | null = null;

  constructor(private text: Text) {}

  getPosition(): Point {
    const bounds = this.text.getBounds();
    return {
      x: bounds.x + bounds.width / 2,
      y: bounds.y + bounds.height / 2
    };
  }

  hitTest(point: Point, tolerance: number = 8): boolean {
    const pos = this.getPosition();
    const dx = point.x - pos.x;
    const dy = point.y - pos.y;
    return Math.sqrt(dx * dx + dy * dy) <= tolerance;
  }

  onDrag(point: Point, _event?: MouseEvent): void {
    // Move text to center on the drag point
    const bounds = this.text.getBounds();
    const dx = point.x - (bounds.x + bounds.width / 2);
    const dy = point.y - (bounds.y + bounds.height / 2);
    this.text.move(dx, dy);
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
 * Handle set for Text shape (single center handle)
 */
export class TextHandles implements HandleSet {
  handles: Handle[] = [];
  element: SVGGElement | null = null;
  private centerHandle: TextCenterHandle;

  constructor(public shape: Text) {
    this.centerHandle = new TextCenterHandle(shape);
    this.handles = [this.centerHandle];
  }

  render(svg: SVGSVGElement): SVGGElement {
    // Remove existing if any
    this.remove();

    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.classList.add('handle-group');

    // Create center handle element
    const pos = this.centerHandle.getPosition();
    const el = createHandleElement(pos.x, pos.y, 'move');
    this.centerHandle.setElement(el);
    group.appendChild(el);

    svg.appendChild(group);
    this.element = group;
    return group;
  }

  update(): void {
    this.centerHandle.updateElement();
  }

  remove(): void {
    if (this.element) {
      this.element.remove();
      this.element = null;
    }
  }

  findHandleAt(point: Point): Handle | null {
    if (this.centerHandle.hitTest(point)) {
      return this.centerHandle;
    }
    return null;
  }
}
