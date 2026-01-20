import { Point, Bounds, ShapeStyle, PolygonData, generateId } from '../../shared/types';
import { Shape, applyStyle, applyRotation, normalizeRotation, rotatePoint, getRotatedBounds } from './Shape';
import { round3 } from '../core/MathUtils';
import { Matrix2D, applyMatrixToPoint } from '../core/TransformParser';

/**
 * Polygon shape implementation - closed shape with multiple vertices
 */
export class Polygon implements Shape {
  readonly type = 'polygon';
  element: SVGPolygonElement | null = null;
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
   * Create polygon from points array
   */
  static fromPoints(points: Point[], style: ShapeStyle): Polygon {
    return new Polygon(generateId(), points.map(p => ({ x: round3(p.x), y: round3(p.y) })), style);
  }

  /**
   * Create polygon from SVG element
   */
  static fromElement(el: SVGPolygonElement, style: ShapeStyle): Polygon {
    const pointsAttr = el.getAttribute('points') || '';
    const points = Polygon.parsePointsAttribute(pointsAttr);
    return new Polygon(el.id || generateId(), points, style);
  }

  /**
   * Parse SVG points attribute string to Point array
   */
  static parsePointsAttribute(pointsStr: string): Point[] {
    const points: Point[] = [];
    const trimmed = pointsStr.trim();
    if (!trimmed) return points;

    // Handle both comma and space separated formats
    // "x1,y1 x2,y2 x3,y3" or "x1 y1 x2 y2 x3 y3"
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

  render(): SVGPolygonElement {
    const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    polygon.id = this.id;
    polygon.setAttribute('points', this.pointsToString());
    applyStyle(polygon, this.style);

    // Apply rotation
    const center = this.getRotationCenter();
    applyRotation(polygon, this.rotation, center.x, center.y);

    this.element = polygon;
    return polygon;
  }

  updateElement(): void {
    if (!this.element) return;

    this.element.setAttribute('points', this.pointsToString());
    applyStyle(this.element, this.style);

    // Apply rotation
    const center = this.getRotationCenter();
    applyRotation(this.element, this.rotation, center.x, center.y);
  }

  hitTest(point: Point, tolerance: number = 5): boolean {
    if (this.points.length < 3) return false;

    // If rotated, transform the test point to the shape's local coordinate system
    let testPoint = point;
    if (this.rotation !== 0) {
      const center = this.getRotationCenter();
      testPoint = rotatePoint(point, center, -this.rotation);
    }

    // Check if point is inside polygon (only if filled)
    if (!this.style.fillNone && this.style.fill !== 'none') {
      if (this.isPointInside(testPoint)) return true;
    }

    // Check if point is near any edge
    for (let i = 0; i < this.points.length; i++) {
      const p1 = this.points[i];
      const p2 = this.points[(i + 1) % this.points.length];
      if (this.pointToLineDistance(testPoint, p1, p2) <= tolerance) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if point is inside polygon using ray casting
   */
  private isPointInside(point: Point): boolean {
    let inside = false;
    const n = this.points.length;

    for (let i = 0, j = n - 1; i < n; j = i++) {
      const xi = this.points[i].x, yi = this.points[i].y;
      const xj = this.points[j].x, yj = this.points[j].y;

      if (((yi > point.y) !== (yj > point.y)) &&
          (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }

    return inside;
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

  serialize(): PolygonData {
    return {
      id: this.id,
      type: 'polygon',
      points: this.points.map(p => ({ ...p })),
      style: { ...this.style },
      rotation: this.rotation,
      className: this.className
    };
  }

  clone(): Polygon {
    const cloned = new Polygon(
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

  applyMatrix(matrix: Matrix2D): void {
    for (const point of this.points) {
      const transformed = applyMatrixToPoint(point, matrix);
      point.x = transformed.x;
      point.y = transformed.y;
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
   * Remove a vertex at a specific index (minimum 3 vertices for polygon)
   */
  removeVertex(index: number): boolean {
    if (this.points.length > 3 && index >= 0 && index < this.points.length) {
      this.points.splice(index, 1);
      this.updateElement();
      return true;
    }
    return false;
  }
}
