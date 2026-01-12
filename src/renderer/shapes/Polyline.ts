import { Point, Bounds, ShapeStyle, PolylineData, generateId } from '../../shared/types';
import { Shape, applyStyle, applyRotation, normalizeRotation, rotatePoint, getRotatedBounds } from './Shape';
import { round3 } from '../core/MathUtils';

/**
 * Polyline shape implementation - open shape with multiple vertices
 */
export class Polyline implements Shape {
  readonly type = 'polyline';
  element: SVGPolylineElement | null = null;
  rotation: number = 0;
  className?: string;

  constructor(
    public readonly id: string,
    public points: Point[],
    public style: ShapeStyle,
    rotation: number = 0
  ) {
    this.rotation = normalizeRotation(rotation);
  }

  /**
   * Create polyline from points array
   */
  static fromPoints(points: Point[], style: ShapeStyle): Polyline {
    return new Polyline(generateId(), points.map(p => ({ x: round3(p.x), y: round3(p.y) })), style);
  }

  /**
   * Create polyline from SVG element
   */
  static fromElement(el: SVGPolylineElement, style: ShapeStyle): Polyline {
    const pointsAttr = el.getAttribute('points') || '';
    const points = Polyline.parsePointsAttribute(pointsAttr);
    return new Polyline(el.id || generateId(), points, style);
  }

  /**
   * Parse SVG points attribute string to Point array
   */
  static parsePointsAttribute(pointsStr: string): Point[] {
    const points: Point[] = [];
    const trimmed = pointsStr.trim();
    if (!trimmed) return points;

    // Handle both comma and space separated formats
    const parts = trimmed.split(/[\s,]+/);
    for (let i = 0; i < parts.length - 1; i += 2) {
      const x = parseFloat(parts[i]);
      const y = parseFloat(parts[i + 1]);
      if (!isNaN(x) && !isNaN(y)) {
        points.push({ x, y });
      }
    }
    return points;
  }

  /**
   * Convert points to SVG points attribute string
   */
  private pointsToString(): string {
    return this.points.map(p => `${p.x},${p.y}`).join(' ');
  }

  render(): SVGPolylineElement {
    const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    polyline.id = this.id;
    polyline.setAttribute('points', this.pointsToString());
    // Polyline should have no fill by default
    const styleWithNoFill = { ...this.style, fillNone: true };
    applyStyle(polyline, styleWithNoFill);

    // Apply rotation
    const center = this.getRotationCenter();
    applyRotation(polyline, this.rotation, center.x, center.y);

    this.element = polyline;
    return polyline;
  }

  updateElement(): void {
    if (!this.element) return;

    this.element.setAttribute('points', this.pointsToString());
    // Polyline should have no fill
    const styleWithNoFill = { ...this.style, fillNone: true };
    applyStyle(this.element, styleWithNoFill);

    // Apply rotation
    const center = this.getRotationCenter();
    applyRotation(this.element, this.rotation, center.x, center.y);
  }

  hitTest(point: Point, tolerance: number = 5): boolean {
    if (this.points.length < 2) return false;

    // If rotated, transform the test point to the shape's local coordinate system
    let testPoint = point;
    if (this.rotation !== 0) {
      const center = this.getRotationCenter();
      testPoint = rotatePoint(point, center, -this.rotation);
    }

    // Check if point is near any segment
    for (let i = 0; i < this.points.length - 1; i++) {
      const p1 = this.points[i];
      const p2 = this.points[i + 1];
      if (this.pointToLineDistance(testPoint, p1, p2) <= tolerance) {
        return true;
      }
    }

    return false;
  }

  /**
   * Calculate distance from point to line segment
   */
  private pointToLineDistance(point: Point, p1: Point, p2: Point): number {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const lengthSq = dx * dx + dy * dy;

    if (lengthSq === 0) {
      return Math.sqrt((point.x - p1.x) ** 2 + (point.y - p1.y) ** 2);
    }

    let t = ((point.x - p1.x) * dx + (point.y - p1.y) * dy) / lengthSq;
    t = Math.max(0, Math.min(1, t));

    const projX = p1.x + t * dx;
    const projY = p1.y + t * dy;

    return Math.sqrt((point.x - projX) ** 2 + (point.y - projY) ** 2);
  }

  private getBaseBounds(): Bounds {
    if (this.points.length === 0) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }

    let minX = this.points[0].x;
    let minY = this.points[0].y;
    let maxX = this.points[0].x;
    let maxY = this.points[0].y;

    for (const p of this.points) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  }

  getBounds(): Bounds {
    return getRotatedBounds(this.getBaseBounds(), this.rotation);
  }

  getRotationCenter(): Point {
    const bounds = this.getBaseBounds();
    return {
      x: bounds.x + bounds.width / 2,
      y: bounds.y + bounds.height / 2
    };
  }

  setRotation(angle: number): void {
    this.rotation = normalizeRotation(angle);
    this.updateElement();
  }

  move(dx: number, dy: number): void {
    for (const p of this.points) {
      p.x = round3(p.x + dx);
      p.y = round3(p.y + dy);
    }
    this.updateElement();
  }

  serialize(): PolylineData {
    return {
      id: this.id,
      type: 'polyline',
      points: this.points.map(p => ({ ...p })),
      style: { ...this.style },
      rotation: this.rotation,
      className: this.className
    };
  }

  clone(): Polyline {
    const cloned = new Polyline(
      generateId(),
      this.points.map(p => ({ ...p })),
      { ...this.style },
      this.rotation
    );
    cloned.className = this.className;
    return cloned;
  }

  applyTransform(translateX: number, translateY: number, scaleX: number, scaleY: number): void {
    for (const point of this.points) {
      point.x = round3(point.x * scaleX + translateX);
      point.y = round3(point.y * scaleY + translateY);
    }
    this.updateElement();
  }

  applySkew(skewX: number, skewY: number): void {
    const tanX = Math.tan(skewX * Math.PI / 180);
    const tanY = Math.tan(skewY * Math.PI / 180);

    for (const point of this.points) {
      const newX = point.x + point.y * tanX;
      const newY = point.y + point.x * tanY;
      point.x = round3(newX);
      point.y = round3(newY);
    }
    this.updateElement();
  }

  /**
   * Set a specific vertex position
   */
  setVertex(index: number, point: Point): void {
    if (index >= 0 && index < this.points.length) {
      this.points[index] = { x: round3(point.x), y: round3(point.y) };
      this.updateElement();
    }
  }

  /**
   * Add a vertex at the end
   */
  addVertex(point: Point): void {
    this.points.push({ ...point });
    this.updateElement();
  }

  /**
   * Insert a vertex at a specific index
   */
  insertVertex(index: number, point: Point): void {
    if (index >= 0 && index <= this.points.length) {
      this.points.splice(index, 0, { ...point });
      this.updateElement();
    }
  }

  /**
   * Remove a vertex at a specific index (minimum 2 vertices for polyline)
   */
  removeVertex(index: number): boolean {
    if (this.points.length > 2 && index >= 0 && index < this.points.length) {
      this.points.splice(index, 1);
      this.updateElement();
      return true;
    }
    return false;
  }
}
