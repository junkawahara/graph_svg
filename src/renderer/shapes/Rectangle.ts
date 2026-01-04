import { Point, Bounds, ShapeStyle, RectangleData, generateId } from '../../shared/types';
import { Shape, applyStyle } from './Shape';

/**
 * Rectangle shape implementation
 */
export class Rectangle implements Shape {
  readonly type = 'rectangle';
  element: SVGRectElement | null = null;

  constructor(
    public readonly id: string,
    public x: number,
    public y: number,
    public width: number,
    public height: number,
    public style: ShapeStyle
  ) {}

  /**
   * Create rectangle from bounding box (two corner points)
   */
  static fromBoundingBox(topLeft: Point, bottomRight: Point, style: ShapeStyle): Rectangle {
    const x = Math.min(topLeft.x, bottomRight.x);
    const y = Math.min(topLeft.y, bottomRight.y);
    const width = Math.abs(bottomRight.x - topLeft.x);
    const height = Math.abs(bottomRight.y - topLeft.y);
    return new Rectangle(generateId(), x, y, width, height, style);
  }

  /**
   * Create rectangle from SVG element
   */
  static fromElement(el: SVGRectElement, style: ShapeStyle): Rectangle {
    return new Rectangle(
      el.id || generateId(),
      parseFloat(el.getAttribute('x') || '0'),
      parseFloat(el.getAttribute('y') || '0'),
      parseFloat(el.getAttribute('width') || '0'),
      parseFloat(el.getAttribute('height') || '0'),
      style
    );
  }

  render(): SVGRectElement {
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.id = this.id;
    rect.setAttribute('x', String(this.x));
    rect.setAttribute('y', String(this.y));
    rect.setAttribute('width', String(this.width));
    rect.setAttribute('height', String(this.height));
    applyStyle(rect, this.style);

    this.element = rect;
    return rect;
  }

  updateElement(): void {
    if (!this.element) return;

    this.element.setAttribute('x', String(this.x));
    this.element.setAttribute('y', String(this.y));
    this.element.setAttribute('width', String(this.width));
    this.element.setAttribute('height', String(this.height));
    applyStyle(this.element, this.style);
  }

  hitTest(point: Point, tolerance: number = 5): boolean {
    // Check if point is within rectangle + tolerance
    const outerX = this.x - tolerance;
    const outerY = this.y - tolerance;
    const outerWidth = this.width + tolerance * 2;
    const outerHeight = this.height + tolerance * 2;

    const inOuter = point.x >= outerX && point.x <= outerX + outerWidth &&
                    point.y >= outerY && point.y <= outerY + outerHeight;

    if (!inOuter) {
      return false;
    }

    // If fill is none, only hit test the stroke
    if (this.style.fillNone) {
      const innerX = this.x + tolerance;
      const innerY = this.y + tolerance;
      const innerWidth = Math.max(0, this.width - tolerance * 2);
      const innerHeight = Math.max(0, this.height - tolerance * 2);

      const inInner = point.x >= innerX && point.x <= innerX + innerWidth &&
                      point.y >= innerY && point.y <= innerY + innerHeight;

      return !inInner;
    }

    return true;
  }

  getBounds(): Bounds {
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height
    };
  }

  move(dx: number, dy: number): void {
    this.x += dx;
    this.y += dy;
    this.updateElement();
  }

  serialize(): RectangleData {
    return {
      id: this.id,
      type: 'rectangle',
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      style: { ...this.style }
    };
  }

  clone(): Rectangle {
    return new Rectangle(
      generateId(),
      this.x,
      this.y,
      this.width,
      this.height,
      { ...this.style }
    );
  }
}
