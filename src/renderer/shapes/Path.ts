import { Point, Bounds, ShapeStyle, PathData, PathCommand, MarkerType, generateId } from '../../shared/types';
import { Shape, applyStyle, applyRotation, normalizeRotation, rotatePoint, getRotatedBounds } from './Shape';
import { parsePath, serializePath, getPathPoints, sampleArc } from '../core/PathParser';
import {
  calculateArrowGeometry,
  getPathEndDirection,
  getShortenedPathCommands,
  getMarkerShortenDistance
} from '../core/ArrowGeometry';
import { round3 } from '../core/MathUtils';

/**
 * Path shape implementation - standard SVG path with multiple command types
 */
export class Path implements Shape {
  readonly type = 'path';
  element: SVGElement | null = null;
  rotation: number = 0;
  className?: string;

  // Sub-elements when rendering as a group with markers
  private pathElement: SVGPathElement | null = null;
  private startMarkerElement: SVGPathElement | null = null;
  private endMarkerElement: SVGPathElement | null = null;

  constructor(
    public readonly id: string,
    public commands: PathCommand[],
    public style: ShapeStyle,
    public markerStart: MarkerType = 'none',
    public markerEnd: MarkerType = 'none',
    rotation: number = 0
  ) {
    this.rotation = normalizeRotation(rotation);
  }

  /**
   * Create path from d attribute string
   */
  static fromPathData(d: string, style: ShapeStyle, markerStart: MarkerType = 'none', markerEnd: MarkerType = 'none'): Path {
    const commands = parsePath(d);
    return new Path(generateId(), commands, style, markerStart, markerEnd);
  }

  /**
   * Create path from anchor points (for drawing tool - creates L commands)
   */
  static fromPoints(points: Point[], closed: boolean, style: ShapeStyle): Path {
    if (points.length < 2) {
      throw new Error('Path requires at least 2 points');
    }

    const commands: PathCommand[] = [];
    commands.push({ type: 'M', x: Math.round(points[0].x), y: Math.round(points[0].y) });

    for (let i = 1; i < points.length; i++) {
      commands.push({ type: 'L', x: Math.round(points[i].x), y: Math.round(points[i].y) });
    }

    if (closed) {
      commands.push({ type: 'Z' });
    }

    return new Path(generateId(), commands, style, 'none', 'none');
  }

  /**
   * Build SVG path d attribute string
   */
  buildPathData(): string {
    return serializePath(this.commands);
  }

  /**
   * Check if this path has any markers
   */
  private hasMarkers(): boolean {
    return this.markerStart !== 'none' || this.markerEnd !== 'none';
  }

  render(): SVGElement {
    if (this.hasMarkers()) {
      return this.renderAsGroup();
    }
    return this.renderAsPath();
  }

  /**
   * Render as a simple path element (when no markers)
   */
  private renderAsPath(): SVGPathElement {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.id = this.id;
    path.setAttribute('d', this.buildPathData());
    applyStyle(path, this.style);

    // Apply rotation
    const center = this.getRotationCenter();
    applyRotation(path, this.rotation, center.x, center.y);

    this.element = path;
    this.pathElement = path;
    this.startMarkerElement = null;
    this.endMarkerElement = null;
    return path;
  }

  /**
   * Render as a group containing path and arrow markers
   */
  private renderAsGroup(): SVGGElement {
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.id = this.id;
    group.setAttribute('data-shape-type', 'path-with-markers');
    group.setAttribute('data-marker-start', this.markerStart);
    group.setAttribute('data-marker-end', this.markerEnd);

    const strokeWidth = this.style.strokeWidth || 1;

    // Get original endpoints for markers
    const startDir = getPathEndDirection(this.commands, 'start');
    const endDir = getPathEndDirection(this.commands, 'end');

    // Calculate shortened path
    const startShortenDist = getMarkerShortenDistance(this.markerStart, strokeWidth);
    const endShortenDist = getMarkerShortenDistance(this.markerEnd, strokeWidth);
    const shortenedCommands = getShortenedPathCommands(this.commands, startShortenDist, endShortenDist);

    // Create path element
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('data-role', 'main');
    path.setAttribute('d', serializePath(shortenedCommands));
    applyStyle(path, this.style);
    group.appendChild(path);
    this.pathElement = path;

    // Create start marker if needed
    if (this.markerStart !== 'none' && startDir) {
      const startArrow = calculateArrowGeometry(
        startDir.x, startDir.y, startDir.angle, this.markerStart, strokeWidth, 'start'
      );
      if (startArrow) {
        const startPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        startPath.setAttribute('data-role', 'marker-start');
        startPath.setAttribute('d', startArrow.path);
        if (startArrow.filled) {
          startPath.setAttribute('fill', this.style.stroke);
          startPath.setAttribute('stroke', 'none');
        } else {
          startPath.setAttribute('fill', 'none');
          startPath.setAttribute('stroke', this.style.stroke);
          startPath.setAttribute('stroke-width', String(startArrow.strokeWidth || 1));
          startPath.setAttribute('stroke-linecap', 'round');
          startPath.setAttribute('stroke-linejoin', 'round');
        }
        group.appendChild(startPath);
        this.startMarkerElement = startPath;
      }
    } else {
      this.startMarkerElement = null;
    }

    // Create end marker if needed
    if (this.markerEnd !== 'none' && endDir) {
      const endArrow = calculateArrowGeometry(
        endDir.x, endDir.y, endDir.angle, this.markerEnd, strokeWidth, 'end'
      );
      if (endArrow) {
        const endPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        endPath.setAttribute('data-role', 'marker-end');
        endPath.setAttribute('d', endArrow.path);
        if (endArrow.filled) {
          endPath.setAttribute('fill', this.style.stroke);
          endPath.setAttribute('stroke', 'none');
        } else {
          endPath.setAttribute('fill', 'none');
          endPath.setAttribute('stroke', this.style.stroke);
          endPath.setAttribute('stroke-width', String(endArrow.strokeWidth || 1));
          endPath.setAttribute('stroke-linecap', 'round');
          endPath.setAttribute('stroke-linejoin', 'round');
        }
        group.appendChild(endPath);
        this.endMarkerElement = endPath;
      }
    } else {
      this.endMarkerElement = null;
    }

    // Apply rotation to the entire group
    const center = this.getRotationCenter();
    applyRotation(group, this.rotation, center.x, center.y);

    this.element = group;
    return group;
  }

  updateElement(): void {
    if (!this.element) return;

    // Check if we need to switch between group and simple path
    const isGroup = this.element.tagName.toLowerCase() === 'g';
    const needsGroup = this.hasMarkers();

    if (isGroup !== needsGroup) {
      // Need to re-render with different structure
      const parent = this.element.parentNode;
      const oldElement = this.element;  // Save old element before render() updates this.element
      if (parent) {
        const newElement = this.render();
        parent.replaceChild(newElement, oldElement);
      }
      return;
    }

    if (isGroup) {
      // Update group structure
      this.updateGroupElement();
    } else {
      // Update simple path
      this.updatePathElement();
    }
  }

  /**
   * Update a simple path element
   */
  private updatePathElement(): void {
    if (!this.pathElement) return;

    this.pathElement.setAttribute('d', this.buildPathData());
    applyStyle(this.pathElement, this.style);

    // Apply rotation
    const center = this.getRotationCenter();
    applyRotation(this.pathElement, this.rotation, center.x, center.y);
  }

  /**
   * Update a group element with markers
   */
  private updateGroupElement(): void {
    if (!this.element || !this.pathElement) return;

    const group = this.element as SVGGElement;
    group.setAttribute('data-marker-start', this.markerStart);
    group.setAttribute('data-marker-end', this.markerEnd);

    const strokeWidth = this.style.strokeWidth || 1;

    // Get original endpoints for markers
    const startDir = getPathEndDirection(this.commands, 'start');
    const endDir = getPathEndDirection(this.commands, 'end');

    // Calculate shortened path
    const startShortenDist = getMarkerShortenDistance(this.markerStart, strokeWidth);
    const endShortenDist = getMarkerShortenDistance(this.markerEnd, strokeWidth);
    const shortenedCommands = getShortenedPathCommands(this.commands, startShortenDist, endShortenDist);

    // Update path element
    this.pathElement.setAttribute('d', serializePath(shortenedCommands));
    applyStyle(this.pathElement, this.style);

    // Update or create start marker
    if (this.markerStart !== 'none' && startDir) {
      const startArrow = calculateArrowGeometry(
        startDir.x, startDir.y, startDir.angle, this.markerStart, strokeWidth, 'start'
      );
      if (startArrow) {
        if (!this.startMarkerElement) {
          const startPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          startPath.setAttribute('data-role', 'marker-start');
          group.appendChild(startPath);
          this.startMarkerElement = startPath;
        }
        this.startMarkerElement.setAttribute('d', startArrow.path);
        if (startArrow.filled) {
          this.startMarkerElement.setAttribute('fill', this.style.stroke);
          this.startMarkerElement.setAttribute('stroke', 'none');
        } else {
          this.startMarkerElement.setAttribute('fill', 'none');
          this.startMarkerElement.setAttribute('stroke', this.style.stroke);
          this.startMarkerElement.setAttribute('stroke-width', String(startArrow.strokeWidth || 1));
          this.startMarkerElement.setAttribute('stroke-linecap', 'round');
          this.startMarkerElement.setAttribute('stroke-linejoin', 'round');
        }
      }
    } else if (this.startMarkerElement) {
      this.startMarkerElement.remove();
      this.startMarkerElement = null;
    }

    // Update or create end marker
    if (this.markerEnd !== 'none' && endDir) {
      const endArrow = calculateArrowGeometry(
        endDir.x, endDir.y, endDir.angle, this.markerEnd, strokeWidth, 'end'
      );
      if (endArrow) {
        if (!this.endMarkerElement) {
          const endPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          endPath.setAttribute('data-role', 'marker-end');
          group.appendChild(endPath);
          this.endMarkerElement = endPath;
        }
        this.endMarkerElement.setAttribute('d', endArrow.path);
        if (endArrow.filled) {
          this.endMarkerElement.setAttribute('fill', this.style.stroke);
          this.endMarkerElement.setAttribute('stroke', 'none');
        } else {
          this.endMarkerElement.setAttribute('fill', 'none');
          this.endMarkerElement.setAttribute('stroke', this.style.stroke);
          this.endMarkerElement.setAttribute('stroke-width', String(endArrow.strokeWidth || 1));
          this.endMarkerElement.setAttribute('stroke-linecap', 'round');
          this.endMarkerElement.setAttribute('stroke-linejoin', 'round');
        }
      }
    } else if (this.endMarkerElement) {
      this.endMarkerElement.remove();
      this.endMarkerElement = null;
    }

    // Apply rotation to the entire group
    const center = this.getRotationCenter();
    applyRotation(group, this.rotation, center.x, center.y);
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

    // For paths with fill, check if point is inside
    // SVG fills open paths by connecting start and end points
    if (!this.style.fillNone && this.style.fill !== 'none') {
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
          cmd.x = round3(cmd.x + dx);
          cmd.y = round3(cmd.y + dy);
          break;
        case 'C':
          cmd.cp1x = round3(cmd.cp1x + dx);
          cmd.cp1y = round3(cmd.cp1y + dy);
          cmd.cp2x = round3(cmd.cp2x + dx);
          cmd.cp2y = round3(cmd.cp2y + dy);
          cmd.x = round3(cmd.x + dx);
          cmd.y = round3(cmd.y + dy);
          break;
        case 'Q':
          cmd.cpx = round3(cmd.cpx + dx);
          cmd.cpy = round3(cmd.cpy + dy);
          cmd.x = round3(cmd.x + dx);
          cmd.y = round3(cmd.y + dy);
          break;
        case 'A':
          // Arc: only move endpoint (radii and flags remain unchanged)
          cmd.x = round3(cmd.x + dx);
          cmd.y = round3(cmd.y + dy);
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
      markerStart: this.markerStart,
      markerEnd: this.markerEnd,
      rotation: this.rotation,
      className: this.className
    };
  }

  clone(): Path {
    const cloned = new Path(
      generateId(),
      this.commands.map(cmd => ({ ...cmd })),
      { ...this.style },
      this.markerStart,
      this.markerEnd,
      this.rotation
    );
    cloned.className = this.className;
    return cloned;
  }

  applyTransform(translateX: number, translateY: number, scaleX: number, scaleY: number): void {
    for (const cmd of this.commands) {
      switch (cmd.type) {
        case 'M':
        case 'L':
          cmd.x = round3(cmd.x * scaleX + translateX);
          cmd.y = round3(cmd.y * scaleY + translateY);
          break;
        case 'C':
          cmd.cp1x = round3(cmd.cp1x * scaleX + translateX);
          cmd.cp1y = round3(cmd.cp1y * scaleY + translateY);
          cmd.cp2x = round3(cmd.cp2x * scaleX + translateX);
          cmd.cp2y = round3(cmd.cp2y * scaleY + translateY);
          cmd.x = round3(cmd.x * scaleX + translateX);
          cmd.y = round3(cmd.y * scaleY + translateY);
          break;
        case 'Q':
          cmd.cpx = round3(cmd.cpx * scaleX + translateX);
          cmd.cpy = round3(cmd.cpy * scaleY + translateY);
          cmd.x = round3(cmd.x * scaleX + translateX);
          cmd.y = round3(cmd.y * scaleY + translateY);
          break;
        case 'A':
          // Scale radii and endpoint
          cmd.rx = round3(cmd.rx * Math.abs(scaleX));
          cmd.ry = round3(cmd.ry * Math.abs(scaleY));
          cmd.x = round3(cmd.x * scaleX + translateX);
          cmd.y = round3(cmd.y * scaleY + translateY);
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
      x: round3(x + y * tanX),
      y: round3(y + x * tanY)
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
          cmd.x = round3(point.x);
          cmd.y = round3(point.y);
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
        cmd.cp1x = round3(point.x);
        cmd.cp1y = round3(point.y);
      } else {
        cmd.cp2x = round3(point.x);
        cmd.cp2y = round3(point.y);
      }
    } else if (cmd.type === 'Q' && cpIndex === 0) {
      cmd.cpx = round3(point.x);
      cmd.cpy = round3(point.y);
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

  /**
   * Insert a new command at the specified index
   */
  insertCommand(index: number, command: PathCommand): void {
    this.commands.splice(index, 0, command);
    this.updateElement();
  }

  /**
   * Replace a command at the specified index
   */
  replaceCommand(index: number, command: PathCommand): void {
    if (index >= 0 && index < this.commands.length) {
      this.commands[index] = command;
      this.updateElement();
    }
  }

  /**
   * Remove a command at the specified index
   * Returns the removed command for undo purposes
   */
  removeCommand(index: number): PathCommand | null {
    if (index >= 0 && index < this.commands.length) {
      const removed = this.commands.splice(index, 1)[0];
      this.updateElement();
      return removed;
    }
    return null;
  }

  /**
   * Check if removing a command at index would leave the path valid
   */
  canRemoveCommand(index: number): boolean {
    // Cannot remove M command (index 0)
    if (index === 0) return false;

    // Cannot remove if it would leave less than M + one segment
    if (this.commands.length <= 2) return false;

    // Cannot remove Z command directly (use different logic for opening paths)
    const cmd = this.commands[index];
    if (cmd && cmd.type === 'Z') return false;

    return true;
  }

  /**
   * Get the number of commands
   */
  getCommandCount(): number {
    return this.commands.length;
  }

  /**
   * Get command at index
   */
  getCommand(index: number): PathCommand | null {
    return this.commands[index] || null;
  }
}
