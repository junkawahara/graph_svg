import { Point, Bounds, ShapeStyle, EllipseData, generateId } from '../../shared/types';
import { Shape, applyStyle } from './Shape';

/**
 * Ellipse shape implementation
 */
export class Ellipse implements Shape {
  readonly type = 'ellipse';
  element: SVGEllipseElement | null = null;

  constructor(
    public readonly id: string,
    public cx: number,
    public cy: number,
    public rx: number,
    public ry: number,
    public style: ShapeStyle
  ) {}

  /**
   * Create ellipse from bounding box (two corner points)
   */
  static fromBoundingBox(topLeft: Point, bottomRight: Point, style: ShapeStyle): Ellipse {
    const cx = (topLeft.x + bottomRight.x) / 2;
    const cy = (topLeft.y + bottomRight.y) / 2;
    const rx = Math.abs(bottomRight.x - topLeft.x) / 2;
    const ry = Math.abs(bottomRight.y - topLeft.y) / 2;
    return new Ellipse(generateId(), cx, cy, rx, ry, style);
  }

  /**
   * Create ellipse from center and radii
   */
  static fromCenter(center: Point, rx: number, ry: number, style: ShapeStyle): Ellipse {
    return new Ellipse(generateId(), center.x, center.y, rx, ry, style);
  }

  /**
   * Create ellipse from SVG element
   */
  static fromElement(el: SVGEllipseElement, style: ShapeStyle): Ellipse {
    return new Ellipse(
      el.id || generateId(),
      parseFloat(el.getAttribute('cx') || '0'),
      parseFloat(el.getAttribute('cy') || '0'),
      parseFloat(el.getAttribute('rx') || '0'),
      parseFloat(el.getAttribute('ry') || '0'),
      style
    );
  }

  render(): SVGEllipseElement {
    const ellipse = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
    ellipse.id = this.id;
    ellipse.setAttribute('cx', String(this.cx));
    ellipse.setAttribute('cy', String(this.cy));
    ellipse.setAttribute('rx', String(this.rx));
    ellipse.setAttribute('ry', String(this.ry));
    applyStyle(ellipse, this.style);

    this.element = ellipse;
    return ellipse;
  }

  updateElement(): void {
    if (!this.element) return;

    this.element.setAttribute('cx', String(this.cx));
    this.element.setAttribute('cy', String(this.cy));
    this.element.setAttribute('rx', String(this.rx));
    this.element.setAttribute('ry', String(this.ry));
    applyStyle(this.element, this.style);
  }

  hitTest(point: Point, tolerance: number = 5): boolean {
    // Check if point is within ellipse + tolerance
    // Using ellipse equation: (x-cx)^2/rx^2 + (y-cy)^2/ry^2 <= 1
    const dx = point.x - this.cx;
    const dy = point.y - this.cy;

    // Check outer boundary (ellipse + tolerance)
    const outerRx = this.rx + tolerance;
    const outerRy = this.ry + tolerance;
    const outerValue = (dx * dx) / (outerRx * outerRx) + (dy * dy) / (outerRy * outerRy);

    if (outerValue > 1) {
      return false;
    }

    // If fill is none, only hit test the stroke
    if (this.style.fillNone) {
      const innerRx = Math.max(0, this.rx - tolerance);
      const innerRy = Math.max(0, this.ry - tolerance);
      if (innerRx > 0 && innerRy > 0) {
        const innerValue = (dx * dx) / (innerRx * innerRx) + (dy * dy) / (innerRy * innerRy);
        return innerValue >= 1;
      }
    }

    return true;
  }

  getBounds(): Bounds {
    return {
      x: this.cx - this.rx,
      y: this.cy - this.ry,
      width: this.rx * 2,
      height: this.ry * 2
    };
  }

  move(dx: number, dy: number): void {
    this.cx += dx;
    this.cy += dy;
    this.updateElement();
  }

  serialize(): EllipseData {
    return {
      id: this.id,
      type: 'ellipse',
      cx: this.cx,
      cy: this.cy,
      rx: this.rx,
      ry: this.ry,
      style: { ...this.style }
    };
  }

  clone(): Ellipse {
    return new Ellipse(
      generateId(),
      this.cx,
      this.cy,
      this.rx,
      this.ry,
      { ...this.style }
    );
  }

  applyTransform(translateX: number, translateY: number, scaleX: number, scaleY: number): void {
    this.cx = this.cx * scaleX + translateX;
    this.cy = this.cy * scaleY + translateY;
    this.rx = this.rx * Math.abs(scaleX);
    this.ry = this.ry * Math.abs(scaleY);
    this.updateElement();
  }
}
