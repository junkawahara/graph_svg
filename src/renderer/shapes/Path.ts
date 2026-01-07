import { Point, Bounds, ShapeStyle, PathData, PathCommand, generateId } from '../../shared/types';
import { Shape, applyStyle, applyRotation, normalizeRotation, rotatePoint, getRotatedBounds } from './Shape';
import { parsePath, serializePath, getPathPoints, sampleArc } from '../core/PathParser';

/**
 * Path shape implementation - standard SVG path with multiple command types
 */
export class Path implements Shape {
  readonly type = 'path';
  element: SVGPathElement | null = null;
  rotation: number = 0;

  constructor(
    public readonly id: string,
    public commands: PathCommand[],
    public style: ShapeStyle,
    rotation: number = 0
  ) {
    this.rotation = normalizeRotation(rotation);
  }

  /**
   * Create path from d attribute string
   */
  static fromPathData(d: string, style: ShapeStyle): Path {
    const commands = parsePath(d);
    return new Path(generateId(), commands, style);
  }

  /**
   * Create path from anchor points (for drawing tool - creates L commands)
   */
  static fromPoints(points: Point[], closed: boolean, style: ShapeStyle): Path {
    if (points.length < 2) {
      throw new Error('Path requires at least 2 points');
    }

    const commands: PathCommand[] = [];
    commands.push({ type: 'M', x: points[0].x, y: points[0].y });

    for (let i = 1; i < points.length; i++) {
      commands.push({ type: 'L', x: points[i].x, y: points[i].y });
    }

    if (closed) {
      commands.push({ type: 'Z' });
    }

    return new Path(generateId(), commands, style);
  }

  /**
   * Build SVG path d attribute string
   */
  buildPathData(): string {
    return serializePath(this.commands);
  }

  render(): SVGPathElement {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.id = this.id;
    path.setAttribute('d', this.buildPathData());
    applyStyle(path, this.style);

    // Apply rotation
    const center = this.getRotationCenter();
    applyRotation(path, this.rotation, center.x, center.y);

    this.element = path;
    return path;
  }

  updateElement(): void {
    if (!this.element) return;

    this.element.setAttribute('d', this.buildPathData());
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
      testPoint = rotatePoint(point, center, -this.rotation);
    }

    // Check if point is near any segment of the path
    let prevX = 0;
    let prevY = 0;

    for (const cmd of this.commands) {
      switch (cmd.type) {
        case 'M':
          prevX = cmd.x;
          prevY = cmd.y;
          break;

        case 'L':
          if (this.isPointNearLine(testPoint, prevX, prevY, cmd.x, cmd.y, tolerance)) {
            return true;
          }
          prevX = cmd.x;
          prevY = cmd.y;
          break;

        case 'C':
          if (this.isPointNearCubicBezier(testPoint, prevX, prevY, cmd, tolerance)) {
            return true;
          }
          prevX = cmd.x;
          prevY = cmd.y;
          break;

        case 'Q':
          if (this.isPointNearQuadraticBezier(testPoint, prevX, prevY, cmd, tolerance)) {
            return true;
          }
          prevX = cmd.x;
          prevY = cmd.y;
          break;

        case 'A':
          if (this.isPointNearArc(testPoint, prevX, prevY, cmd, tolerance)) {
            return true;
          }
          prevX = cmd.x;
          prevY = cmd.y;
          break;

        case 'Z':
          // Check line back to start
          const startCmd = this.commands.find(c => c.type === 'M');
          if (startCmd && startCmd.type === 'M') {
            if (this.isPointNearLine(testPoint, prevX, prevY, startCmd.x, startCmd.y, tolerance)) {
              return true;
            }
          }
          break;
      }
    }

    // For closed paths with fill, check if point is inside
    if (this.isClosed() && !this.style.fillNone) {
      if (this.isPointInsidePath(testPoint)) {
        return true;
      }
    }

    return false;
  }

  private isPointNearLine(point: Point, x1: number, y1: number, x2: number, y2: number, tolerance: number): boolean {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lengthSq = dx * dx + dy * dy;

    if (lengthSq === 0) {
      const dist = Math.sqrt((point.x - x1) ** 2 + (point.y - y1) ** 2);
      return dist <= tolerance;
    }

    const t = Math.max(0, Math.min(1, ((point.x - x1) * dx + (point.y - y1) * dy) / lengthSq));
    const nearestX = x1 + t * dx;
    const nearestY = y1 + t * dy;
    const dist = Math.sqrt((point.x - nearestX) ** 2 + (point.y - nearestY) ** 2);
    return dist <= tolerance;
  }

  private isPointNearCubicBezier(
    point: Point,
    startX: number, startY: number,
    cmd: { cp1x: number; cp1y: number; cp2x: number; cp2y: number; x: number; y: number },
    tolerance: number
  ): boolean {
    // Sample the curve
    const samples = 50;
    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      const mt = 1 - t;
      const mt2 = mt * mt;
      const mt3 = mt2 * mt;
      const t2 = t * t;
      const t3 = t2 * t;

      const x = mt3 * startX + 3 * mt2 * t * cmd.cp1x + 3 * mt * t2 * cmd.cp2x + t3 * cmd.x;
      const y = mt3 * startY + 3 * mt2 * t * cmd.cp1y + 3 * mt * t2 * cmd.cp2y + t3 * cmd.y;

      const dist = Math.sqrt((point.x - x) ** 2 + (point.y - y) ** 2);
      if (dist <= tolerance) {
        return true;
      }
    }
    return false;
  }

  private isPointNearQuadraticBezier(
    point: Point,
    startX: number, startY: number,
    cmd: { cpx: number; cpy: number; x: number; y: number },
    tolerance: number
  ): boolean {
    // Sample the curve
    const samples = 50;
    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      const mt = 1 - t;
      const mt2 = mt * mt;
      const t2 = t * t;

      const x = mt2 * startX + 2 * mt * t * cmd.cpx + t2 * cmd.x;
      const y = mt2 * startY + 2 * mt * t * cmd.cpy + t2 * cmd.y;

      const dist = Math.sqrt((point.x - x) ** 2 + (point.y - y) ** 2);
      if (dist <= tolerance) {
        return true;
      }
    }
    return false;
  }

  private isPointNearArc(
    point: Point,
    startX: number, startY: number,
    cmd: { rx: number; ry: number; xAxisRotation: number; largeArcFlag: boolean; sweepFlag: boolean; x: number; y: number },
    tolerance: number
  ): boolean {
    // Sample the arc and check distance to each sampled point
    const arcPoints = sampleArc(startX, startY, cmd, 50);

    // Check start point
    let prevX = startX;
    let prevY = startY;

    for (const arcPoint of arcPoints) {
      // Check if point is near the line segment between prev and current
      if (this.isPointNearLine(point, prevX, prevY, arcPoint.x, arcPoint.y, tolerance)) {
        return true;
      }
      prevX = arcPoint.x;
      prevY = arcPoint.y;
    }

    return false;
  }

  private isPointInsidePath(point: Point): boolean {
    // Sample the path to create a polygon approximation
    const polygonPoints = this.samplePath();

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

  private samplePath(): Point[] {
    const points: Point[] = [];
    let prevX = 0;
    let prevY = 0;

    for (const cmd of this.commands) {
      switch (cmd.type) {
        case 'M':
          points.push({ x: cmd.x, y: cmd.y });
          prevX = cmd.x;
          prevY = cmd.y;
          break;

        case 'L':
          points.push({ x: cmd.x, y: cmd.y });
          prevX = cmd.x;
          prevY = cmd.y;
          break;

        case 'C': {
          const samples = 10;
          for (let i = 1; i <= samples; i++) {
            const t = i / samples;
            const mt = 1 - t;
            const mt2 = mt * mt;
            const mt3 = mt2 * mt;
            const t2 = t * t;
            const t3 = t2 * t;
            points.push({
              x: mt3 * prevX + 3 * mt2 * t * cmd.cp1x + 3 * mt * t2 * cmd.cp2x + t3 * cmd.x,
              y: mt3 * prevY + 3 * mt2 * t * cmd.cp1y + 3 * mt * t2 * cmd.cp2y + t3 * cmd.y
            });
          }
          prevX = cmd.x;
          prevY = cmd.y;
          break;
        }

        case 'Q': {
          const samples = 10;
          for (let i = 1; i <= samples; i++) {
            const t = i / samples;
            const mt = 1 - t;
            const mt2 = mt * mt;
            const t2 = t * t;
            points.push({
              x: mt2 * prevX + 2 * mt * t * cmd.cpx + t2 * cmd.x,
              y: mt2 * prevY + 2 * mt * t * cmd.cpy + t2 * cmd.y
            });
          }
          prevX = cmd.x;
          prevY = cmd.y;
          break;
        }

        case 'A': {
          const arcPoints = sampleArc(prevX, prevY, cmd, 10);
          points.push(...arcPoints);
          prevX = cmd.x;
          prevY = cmd.y;
          break;
        }
      }
    }

    return points;
  }

  private getBaseBounds(): Bounds {
    const points = getPathPoints(this.commands);

    if (points.length === 0) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }

    let minX = points[0].x;
    let minY = points[0].y;
    let maxX = points[0].x;
    let maxY = points[0].y;

    for (const p of points) {
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
    for (const cmd of this.commands) {
      switch (cmd.type) {
        case 'M':
        case 'L':
          cmd.x += dx;
          cmd.y += dy;
          break;
        case 'C':
          cmd.cp1x += dx;
          cmd.cp1y += dy;
          cmd.cp2x += dx;
          cmd.cp2y += dy;
          cmd.x += dx;
          cmd.y += dy;
          break;
        case 'Q':
          cmd.cpx += dx;
          cmd.cpy += dy;
          cmd.x += dx;
          cmd.y += dy;
          break;
        case 'A':
          // Arc: only move endpoint (radii and flags remain unchanged)
          cmd.x += dx;
          cmd.y += dy;
          break;
      }
    }
    this.updateElement();
  }

  serialize(): PathData {
    return {
      id: this.id,
      type: 'path',
      commands: this.commands.map(cmd => ({ ...cmd })),
      style: { ...this.style },
      rotation: this.rotation
    };
  }

  clone(): Path {
    return new Path(
      generateId(),
      this.commands.map(cmd => ({ ...cmd })),
      { ...this.style },
      this.rotation
    );
  }

  applyTransform(translateX: number, translateY: number, scaleX: number, scaleY: number): void {
    for (const cmd of this.commands) {
      switch (cmd.type) {
        case 'M':
        case 'L':
          cmd.x = cmd.x * scaleX + translateX;
          cmd.y = cmd.y * scaleY + translateY;
          break;
        case 'C':
          cmd.cp1x = cmd.cp1x * scaleX + translateX;
          cmd.cp1y = cmd.cp1y * scaleY + translateY;
          cmd.cp2x = cmd.cp2x * scaleX + translateX;
          cmd.cp2y = cmd.cp2y * scaleY + translateY;
          cmd.x = cmd.x * scaleX + translateX;
          cmd.y = cmd.y * scaleY + translateY;
          break;
        case 'Q':
          cmd.cpx = cmd.cpx * scaleX + translateX;
          cmd.cpy = cmd.cpy * scaleY + translateY;
          cmd.x = cmd.x * scaleX + translateX;
          cmd.y = cmd.y * scaleY + translateY;
          break;
        case 'A':
          // Scale radii and endpoint
          cmd.rx = cmd.rx * Math.abs(scaleX);
          cmd.ry = cmd.ry * Math.abs(scaleY);
          cmd.x = cmd.x * scaleX + translateX;
          cmd.y = cmd.y * scaleY + translateY;
          // Note: xAxisRotation should be adjusted if scaleX and scaleY differ,
          // but this is complex; for now we keep it unchanged
          break;
      }
    }
    this.updateElement();
  }

  applySkew(skewX: number, skewY: number): void {
    const tanX = Math.tan(skewX * Math.PI / 180);
    const tanY = Math.tan(skewY * Math.PI / 180);

    // Helper to apply skew to a point
    const skewPoint = (x: number, y: number): { x: number; y: number } => ({
      x: x + y * tanX,
      y: y + x * tanY
    });

    for (const cmd of this.commands) {
      switch (cmd.type) {
        case 'M':
        case 'L': {
          const skewed = skewPoint(cmd.x, cmd.y);
          cmd.x = skewed.x;
          cmd.y = skewed.y;
          break;
        }
        case 'C': {
          const cp1 = skewPoint(cmd.cp1x, cmd.cp1y);
          const cp2 = skewPoint(cmd.cp2x, cmd.cp2y);
          const end = skewPoint(cmd.x, cmd.y);
          cmd.cp1x = cp1.x;
          cmd.cp1y = cp1.y;
          cmd.cp2x = cp2.x;
          cmd.cp2y = cp2.y;
          cmd.x = end.x;
          cmd.y = end.y;
          break;
        }
        case 'Q': {
          const cp = skewPoint(cmd.cpx, cmd.cpy);
          const end = skewPoint(cmd.x, cmd.y);
          cmd.cpx = cp.x;
          cmd.cpy = cp.y;
          cmd.x = end.x;
          cmd.y = end.y;
          break;
        }
        case 'A': {
          // For arcs, we apply skew to the endpoint
          // Note: This is an approximation - true skew of an arc would convert it to a non-arc curve
          const end = skewPoint(cmd.x, cmd.y);
          cmd.x = end.x;
          cmd.y = end.y;
          // Adjust xAxisRotation by the skew angle (simplified)
          if (skewX !== 0) {
            cmd.xAxisRotation += skewX;
          }
          break;
        }
      }
    }
    this.updateElement();
  }

  /**
   * Check if the path is closed (ends with Z command)
   */
  isClosed(): boolean {
    return this.commands.length > 0 && this.commands[this.commands.length - 1].type === 'Z';
  }

  /**
   * Get anchor point at index
   * Returns points from M, L, C, Q, A commands (not control points)
   */
  getAnchorPoints(): Point[] {
    const points: Point[] = [];
    for (const cmd of this.commands) {
      if (cmd.type === 'M' || cmd.type === 'L' || cmd.type === 'C' || cmd.type === 'Q' || cmd.type === 'A') {
        points.push({ x: cmd.x, y: cmd.y });
      }
    }
    return points;
  }

  /**
   * Set anchor point position by index
   */
  setAnchorPoint(index: number, point: Point): void {
    let anchorIndex = 0;
    for (const cmd of this.commands) {
      if (cmd.type === 'M' || cmd.type === 'L' || cmd.type === 'C' || cmd.type === 'Q' || cmd.type === 'A') {
        if (anchorIndex === index) {
          cmd.x = point.x;
          cmd.y = point.y;
          break;
        }
        anchorIndex++;
      }
    }
    this.updateElement();
  }

  /**
   * Set control point for C or Q command
   */
  setControlPoint(cmdIndex: number, cpIndex: 0 | 1, point: Point): void {
    const cmd = this.commands[cmdIndex];
    if (!cmd) return;

    if (cmd.type === 'C') {
      if (cpIndex === 0) {
        cmd.cp1x = point.x;
        cmd.cp1y = point.y;
      } else {
        cmd.cp2x = point.x;
        cmd.cp2y = point.y;
      }
    } else if (cmd.type === 'Q' && cpIndex === 0) {
      cmd.cpx = point.x;
      cmd.cpy = point.y;
    }
    this.updateElement();
  }

  /**
   * Get the starting point of a command (previous endpoint)
   */
  getCommandStart(cmdIndex: number): Point {
    if (cmdIndex <= 0) {
      const firstCmd = this.commands[0];
      if (firstCmd && firstCmd.type === 'M') {
        return { x: firstCmd.x, y: firstCmd.y };
      }
      return { x: 0, y: 0 };
    }

    // Find the previous command with coordinates
    for (let i = cmdIndex - 1; i >= 0; i--) {
      const cmd = this.commands[i];
      if (cmd.type === 'M' || cmd.type === 'L' || cmd.type === 'C' || cmd.type === 'Q') {
        return { x: cmd.x, y: cmd.y };
      }
    }

    return { x: 0, y: 0 };
  }
}
