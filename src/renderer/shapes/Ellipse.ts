import { Point, Bounds, ShapeStyle, EllipseData, generateId } from '../../shared/types';
import { Shape, applyStyle, applyRotation, normalizeRotation, rotatePoint, getRotatedBounds } from './Shape';
import { round3 } from '../core/MathUtils';
import { Matrix2D, decomposeMatrix } from '../core/TransformParser';

/**
 * Ellipse shape implementation
 */
export class Ellipse implements Shape {
  readonly type = 'ellipse';
  element: SVGEllipseElement | null = null;
  rotation: number = 0;
  className?: string;

  constructor(
    public readonly id: string,
    public cx: number,
    public cy: number,
    public rx: number,
    public ry: number,
    public style: ShapeStyle,
    rotation: number = 0
  ) {
    this.rotation = normalizeRotation(rotation);
  }

  /**
   * Create ellipse from bounding box (two corner points)
   */
  static fromBoundingBox(topLeft: Point, bottomRight: Point, style: ShapeStyle): Ellipse {
    const cx = round3((topLeft.x + bottomRight.x) / 2);
    const cy = round3((topLeft.y + bottomRight.y) / 2);
    const rx = round3(Math.abs(bottomRight.x - topLeft.x) / 2);
    const ry = round3(Math.abs(bottomRight.y - topLeft.y) / 2);
    return new Ellipse(generateId(), cx, cy, rx, ry, style);
  }

  /**
   * Create ellipse from center and radii
   */
  static fromCenter(center: Point, rx: number, ry: number, style: ShapeStyle): Ellipse {
    return new Ellipse(generateId(), round3(center.x), round3(center.y), round3(rx), round3(ry), style);
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

    // Apply rotation
    applyRotation(ellipse, this.rotation, this.cx, this.cy);

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

    // Apply rotation
    applyRotation(this.element, this.rotation, this.cx, this.cy);
  }

  hitTest(point: Point, tolerance: number = 5): boolean {
    // If rotated, transform the test point to the shape's local coordinate system
    let testPoint = point;
    if (this.rotation !== 0) {
      const center = this.getRotationCenter();
      testPoint = rotatePoint(point, center, -this.rotation);
    }

    // Check if point is within ellipse + tolerance
    // Using ellipse equation: (x-cx)^2/rx^2 + (y-cy)^2/ry^2 <= 1
    const dx = testPoint.x - this.cx;
    const dy = testPoint.y - this.cy;

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
    const baseBounds = {
      x: this.cx - this.rx,
      y: this.cy - this.ry,
      width: this.rx * 2,
      height: this.ry * 2
    };
    return getRotatedBounds(baseBounds, this.rotation);
  }

  getRotationCenter(): Point {
    return { x: this.cx, y: this.cy };
  }

  setRotation(angle: number): void {
    this.rotation = normalizeRotation(angle);
    this.updateElement();
  }

  move(dx: number, dy: number): void {
    this.cx = round3(this.cx + dx);
    this.cy = round3(this.cy + dy);
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
      style: { ...this.style },
      rotation: this.rotation,
      className: this.className
    };
  }

  clone(): Ellipse {
    const cloned = new Ellipse(
      generateId(),
      this.cx,
      this.cy,
      this.rx,
      this.ry,
      { ...this.style },
      this.rotation
    );
    cloned.className = this.className;
    return cloned;
  }

  applyTransform(translateX: number, translateY: number, scaleX: number, scaleY: number): void {
    this.cx = round3(this.cx * scaleX + translateX);
    this.cy = round3(this.cy * scaleY + translateY);
    this.rx = round3(this.rx * Math.abs(scaleX));
    this.ry = round3(this.ry * Math.abs(scaleY));
    this.updateElement();
  }

  applyMatrix(matrix: Matrix2D): void {
    const decomposed = decomposeMatrix(matrix);

    // Apply translate and scale
    this.applyTransform(
      decomposed.translateX,
      decomposed.translateY,
      decomposed.scaleX,
      decomposed.scaleY
    );

    // Apply rotation
    if (Math.abs(decomposed.rotation) > 1e-9) {
      this.rotation = normalizeRotation(this.rotation + decomposed.rotation);
    }

    // Warn about skew (axis-aligned shapes don't support skew)
    if (Math.abs(decomposed.skewX) > 1e-9 || Math.abs(decomposed.skewY) > 1e-9) {
      console.warn(`Ellipse "${this.id}" does not support skew transform, skew will be ignored`);
    }

    this.updateElement();
  }
}
