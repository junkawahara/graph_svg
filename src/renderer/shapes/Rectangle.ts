import { Point, Bounds, ShapeStyle, RectangleData, generateId } from '../../shared/types';
import { Shape, applyStyle, applyRotation, normalizeRotation, rotatePoint, getRotatedBounds } from './Shape';
import { round3 } from '../core/MathUtils';

/**
 * Rectangle shape implementation
 */
export class Rectangle implements Shape {
  readonly type = 'rectangle';
  element: SVGRectElement | null = null;
  rotation: number = 0;
  className?: string;

  constructor(
    public readonly id: string,
    public x: number,
    public y: number,
    public width: number,
    public height: number,
    public style: ShapeStyle,
    rotation: number = 0
  ) {
    this.rotation = normalizeRotation(rotation);
  }

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

    // Apply rotation
    const center = this.getRotationCenter();
    applyRotation(rect, this.rotation, center.x, center.y);

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

    // Apply rotation
    const center = this.getRotationCenter();
    applyRotation(this.element, this.rotation, center.x, center.y);
  }

  hitTest(point: Point, tolerance: number = 5): boolean {
    // If rotated, transform the test point to the shape's local coordinate system
    let testPoint = point;
    if (this.rotation !== 0) {
      const center = this.getRotationCenter();
      // Rotate the point in the opposite direction
      testPoint = rotatePoint(point, center, -this.rotation);
    }

    // Check if point is within rectangle + tolerance
    const outerX = this.x - tolerance;
    const outerY = this.y - tolerance;
    const outerWidth = this.width + tolerance * 2;
    const outerHeight = this.height + tolerance * 2;

    const inOuter = testPoint.x >= outerX && testPoint.x <= outerX + outerWidth &&
                    testPoint.y >= outerY && testPoint.y <= outerY + outerHeight;

    if (!inOuter) {
      return false;
    }

    // If fill is none, only hit test the stroke
    if (this.style.fillNone) {
      const innerX = this.x + tolerance;
      const innerY = this.y + tolerance;
      const innerWidth = Math.max(0, this.width - tolerance * 2);
      const innerHeight = Math.max(0, this.height - tolerance * 2);

      const inInner = testPoint.x >= innerX && testPoint.x <= innerX + innerWidth &&
                      testPoint.y >= innerY && testPoint.y <= innerY + innerHeight;

      return !inInner;
    }

    return true;
  }

  getBounds(): Bounds {
    const baseBounds = {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height
    };
    return getRotatedBounds(baseBounds, this.rotation);
  }

  getRotationCenter(): Point {
    return {
      x: this.x + this.width / 2,
      y: this.y + this.height / 2
    };
  }

  setRotation(angle: number): void {
    this.rotation = normalizeRotation(angle);
    this.updateElement();
  }

  move(dx: number, dy: number): void {
    this.x = round3(this.x + dx);
    this.y = round3(this.y + dy);
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
      style: { ...this.style },
      rotation: this.rotation,
      className: this.className
    };
  }

  clone(): Rectangle {
    const cloned = new Rectangle(
      generateId(),
      this.x,
      this.y,
      this.width,
      this.height,
      { ...this.style },
      this.rotation
    );
    cloned.className = this.className;
    return cloned;
  }

  applyTransform(translateX: number, translateY: number, scaleX: number, scaleY: number): void {
    this.x = round3(this.x * scaleX + translateX);
    this.y = round3(this.y * scaleY + translateY);
    this.width = round3(this.width * Math.abs(scaleX));
    this.height = round3(this.height * Math.abs(scaleY));
    // Handle negative scale (flip)
    if (scaleX < 0) {
      this.x = round3(this.x - this.width);
    }
    if (scaleY < 0) {
      this.y = round3(this.y - this.height);
    }
    this.updateElement();
  }
}
