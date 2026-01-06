import { Point, Bounds, ShapeStyle, BezierPathData, BezierSegment, generateId } from '../../shared/types';
import { Shape, applyStyle } from './Shape';

/**
 * BezierPath shape implementation - cubic bezier curve path
 */
export class BezierPath implements Shape {
  readonly type = 'bezierPath';
  element: SVGPathElement | null = null;

  constructor(
    public readonly id: string,
    public start: Point,
    public segments: BezierSegment[],
    public closed: boolean,
    public style: ShapeStyle
  ) {}

  /**
   * Create bezier path from anchor points with default control points
   */
  static fromAnchorPoints(points: Point[], closed: boolean, style: ShapeStyle): BezierPath {
    if (points.length < 2) {
      throw new Error('BezierPath requires at least 2 anchor points');
    }

    const segments: BezierSegment[] = [];
    const numSegments = closed ? points.length : points.length - 1;

    for (let i = 0; i < numSegments; i++) {
      const startPt = points[i];
      const endPt = points[(i + 1) % points.length];

      // Default control points at 1/3 and 2/3 along the line (creates straight line initially)
      const cp1: Point = {
        x: startPt.x + (endPt.x - startPt.x) / 3,
        y: startPt.y + (endPt.y - startPt.y) / 3
      };
      const cp2: Point = {
        x: startPt.x + (endPt.x - startPt.x) * 2 / 3,
        y: startPt.y + (endPt.y - startPt.y) * 2 / 3
      };

      segments.push({ cp1, cp2, end: { ...endPt } });
    }

    return new BezierPath(generateId(), { ...points[0] }, segments, closed, style);
  }

  /**
   * Build SVG path data string
   */
  buildPathData(): string {
    if (this.segments.length === 0) {
      return `M ${this.start.x} ${this.start.y}`;
    }

    let d = `M ${this.start.x} ${this.start.y}`;
    for (const seg of this.segments) {
      d += ` C ${seg.cp1.x} ${seg.cp1.y} ${seg.cp2.x} ${seg.cp2.y} ${seg.end.x} ${seg.end.y}`;
    }
    if (this.closed) {
      d += ' Z';
    }
    return d;
  }

  render(): SVGPathElement {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.id = this.id;
    path.setAttribute('d', this.buildPathData());
    applyStyle(path, this.style);

    this.element = path;
    return path;
  }

  updateElement(): void {
    if (!this.element) return;

    this.element.setAttribute('d', this.buildPathData());
    applyStyle(this.element, this.style);
  }

  hitTest(point: Point, tolerance: number = 5): boolean {
    // Check if point is near any segment of the bezier curve
    let prevPoint = this.start;
    for (const seg of this.segments) {
      if (this.isPointNearBezierSegment(point, prevPoint, seg, tolerance)) {
        return true;
      }
      prevPoint = seg.end;
    }

    // For closed paths, also check the fill area
    if (this.closed && !this.style.fillNone) {
      if (this.isPointInsidePath(point)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if point is near a cubic bezier segment using sampling
   */
  private isPointNearBezierSegment(
    point: Point,
    start: Point,
    seg: BezierSegment,
    tolerance: number
  ): boolean {
    // Sample the bezier curve and check distance
    const samples = 50;
    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      const bezierPoint = this.evaluateBezier(start, seg, t);
      const dx = point.x - bezierPoint.x;
      const dy = point.y - bezierPoint.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= tolerance) {
        return true;
      }
    }
    return false;
  }

  /**
   * Evaluate cubic bezier at parameter t
   * B(t) = (1-t)³P0 + 3(1-t)²tP1 + 3(1-t)t²P2 + t³P3
   */
  private evaluateBezier(start: Point, seg: BezierSegment, t: number): Point {
    const mt = 1 - t;
    const mt2 = mt * mt;
    const mt3 = mt2 * mt;
    const t2 = t * t;
    const t3 = t2 * t;

    return {
      x: mt3 * start.x + 3 * mt2 * t * seg.cp1.x + 3 * mt * t2 * seg.cp2.x + t3 * seg.end.x,
      y: mt3 * start.y + 3 * mt2 * t * seg.cp1.y + 3 * mt * t2 * seg.cp2.y + t3 * seg.end.y
    };
  }

  /**
   * Check if point is inside the closed path using ray casting
   * This is an approximation using sampled points
   */
  private isPointInsidePath(point: Point): boolean {
    if (!this.closed) return false;

    // Sample the path to create a polygon approximation
    const polygonPoints: Point[] = [];
    let prevPoint = this.start;

    for (const seg of this.segments) {
      const samples = 10;
      for (let i = 0; i < samples; i++) {
        const t = i / samples;
        polygonPoints.push(this.evaluateBezier(prevPoint, seg, t));
      }
      prevPoint = seg.end;
    }

    // Ray casting algorithm
    let inside = false;
    const n = polygonPoints.length;
    for (let i = 0, j = n - 1; i < n; j = i++) {
      const xi = polygonPoints[i].x, yi = polygonPoints[i].y;
      const xj = polygonPoints[j].x, yj = polygonPoints[j].y;

      if (((yi > point.y) !== (yj > point.y)) &&
          (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }

    return inside;
  }

  getBounds(): Bounds {
    // Collect all control points and anchor points
    const allPoints: Point[] = [this.start];

    for (const seg of this.segments) {
      allPoints.push(seg.cp1, seg.cp2, seg.end);
    }

    if (allPoints.length === 0) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }

    let minX = allPoints[0].x;
    let minY = allPoints[0].y;
    let maxX = allPoints[0].x;
    let maxY = allPoints[0].y;

    for (const p of allPoints) {
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

  move(dx: number, dy: number): void {
    this.start.x += dx;
    this.start.y += dy;

    for (const seg of this.segments) {
      seg.cp1.x += dx;
      seg.cp1.y += dy;
      seg.cp2.x += dx;
      seg.cp2.y += dy;
      seg.end.x += dx;
      seg.end.y += dy;
    }

    this.updateElement();
  }

  serialize(): BezierPathData {
    return {
      id: this.id,
      type: 'bezierPath',
      start: { ...this.start },
      segments: this.segments.map(seg => ({
        cp1: { ...seg.cp1 },
        cp2: { ...seg.cp2 },
        end: { ...seg.end }
      })),
      closed: this.closed,
      style: { ...this.style }
    };
  }

  clone(): BezierPath {
    return new BezierPath(
      generateId(),
      { ...this.start },
      this.segments.map(seg => ({
        cp1: { ...seg.cp1 },
        cp2: { ...seg.cp2 },
        end: { ...seg.end }
      })),
      this.closed,
      { ...this.style }
    );
  }

  applyTransform(translateX: number, translateY: number, scaleX: number, scaleY: number): void {
    // Transform start point
    this.start.x = this.start.x * scaleX + translateX;
    this.start.y = this.start.y * scaleY + translateY;

    // Transform all segment points
    for (const seg of this.segments) {
      seg.cp1.x = seg.cp1.x * scaleX + translateX;
      seg.cp1.y = seg.cp1.y * scaleY + translateY;
      seg.cp2.x = seg.cp2.x * scaleX + translateX;
      seg.cp2.y = seg.cp2.y * scaleY + translateY;
      seg.end.x = seg.end.x * scaleX + translateX;
      seg.end.y = seg.end.y * scaleY + translateY;
    }

    this.updateElement();
  }

  /**
   * Get all anchor points (start + all segment end points)
   */
  getAnchorPoints(): Point[] {
    const points: Point[] = [{ ...this.start }];
    for (const seg of this.segments) {
      points.push({ ...seg.end });
    }
    return points;
  }

  /**
   * Set anchor point position
   * @param index 0 for start, 1+ for segment end points
   */
  setAnchorPoint(index: number, point: Point): void {
    if (index === 0) {
      this.start = { ...point };
    } else if (index > 0 && index <= this.segments.length) {
      this.segments[index - 1].end = { ...point };
    }
    this.updateElement();
  }

  /**
   * Set control point position
   * @param segIndex segment index
   * @param cpIndex 0 for cp1, 1 for cp2
   */
  setControlPoint(segIndex: number, cpIndex: 0 | 1, point: Point): void {
    if (segIndex >= 0 && segIndex < this.segments.length) {
      if (cpIndex === 0) {
        this.segments[segIndex].cp1 = { ...point };
      } else {
        this.segments[segIndex].cp2 = { ...point };
      }
      this.updateElement();
    }
  }

  /**
   * Get the start point of a segment
   */
  getSegmentStart(segIndex: number): Point {
    if (segIndex === 0) {
      return { ...this.start };
    } else if (segIndex > 0 && segIndex < this.segments.length) {
      return { ...this.segments[segIndex - 1].end };
    }
    return { ...this.start };
  }
}
