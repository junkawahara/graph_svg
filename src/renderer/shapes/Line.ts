import { Point, Bounds, ShapeStyle, LineData, MarkerType, generateId } from '../../shared/types';
import { Shape, applyStyle, applyRotation, normalizeRotation, rotatePoint, getRotatedBounds } from './Shape';
import {
  calculateArrowGeometry,
  getLineDirection,
  getShortenedLineCoords,
  getMarkerShortenDistance
} from '../core/ArrowGeometry';
import { round3 } from '../core/MathUtils';

/**
 * Line shape implementation
 */
export class Line implements Shape {
  readonly type = 'line';
  element: SVGElement | null = null;
  rotation: number = 0;
  className?: string;

  // Sub-elements when rendering as a group with markers
  private lineElement: SVGLineElement | null = null;
  private startMarkerElement: SVGPathElement | null = null;
  private endMarkerElement: SVGPathElement | null = null;

  constructor(
    public readonly id: string,
    public x1: number,
    public y1: number,
    public x2: number,
    public y2: number,
    public markerStart: MarkerType,
    public markerEnd: MarkerType,
    public style: ShapeStyle,
    rotation: number = 0
  ) {
    this.rotation = normalizeRotation(rotation);
  }

  /**
   * Create line from two points
   */
  static fromPoints(start: Point, end: Point, style: ShapeStyle): Line {
    return new Line(generateId(), Math.round(start.x), Math.round(start.y), Math.round(end.x), Math.round(end.y), 'none', 'none', style);
  }

  /**
   * Create line from SVG element
   */
  static fromElement(el: SVGLineElement, style: ShapeStyle, markerStart: MarkerType = 'none', markerEnd: MarkerType = 'none'): Line {
    return new Line(
      el.id || generateId(),
      parseFloat(el.getAttribute('x1') || '0'),
      parseFloat(el.getAttribute('y1') || '0'),
      parseFloat(el.getAttribute('x2') || '0'),
      parseFloat(el.getAttribute('y2') || '0'),
      markerStart,
      markerEnd,
      style
    );
  }

  /**
   * Check if this line has any markers
   */
  private hasMarkers(): boolean {
    return this.markerStart !== 'none' || this.markerEnd !== 'none';
  }

  render(): SVGElement {
    if (this.hasMarkers()) {
      return this.renderAsGroup();
    }
    return this.renderAsLine();
  }

  /**
   * Render as a simple line element (when no markers)
   */
  private renderAsLine(): SVGLineElement {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.id = this.id;
    line.setAttribute('x1', String(this.x1));
    line.setAttribute('y1', String(this.y1));
    line.setAttribute('x2', String(this.x2));
    line.setAttribute('y2', String(this.y2));
    applyStyle(line, this.style);

    // Apply rotation
    const center = this.getRotationCenter();
    applyRotation(line, this.rotation, center.x, center.y);

    this.element = line;
    this.lineElement = line;
    this.startMarkerElement = null;
    this.endMarkerElement = null;
    return line;
  }

  /**
   * Render as a group containing line and arrow markers
   */
  private renderAsGroup(): SVGGElement {
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.id = this.id;
    group.setAttribute('data-shape-type', 'line-with-markers');
    group.setAttribute('data-marker-start', this.markerStart);
    group.setAttribute('data-marker-end', this.markerEnd);

    // Calculate shortened line coordinates
    const strokeWidth = this.style.strokeWidth || 1;
    const startShortenDist = getMarkerShortenDistance(this.markerStart, strokeWidth);
    const endShortenDist = getMarkerShortenDistance(this.markerEnd, strokeWidth);
    const shortened = getShortenedLineCoords(
      this.x1, this.y1, this.x2, this.y2,
      startShortenDist, endShortenDist
    );

    // Create line element
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('data-role', 'main');
    line.setAttribute('x1', String(shortened.x1));
    line.setAttribute('y1', String(shortened.y1));
    line.setAttribute('x2', String(shortened.x2));
    line.setAttribute('y2', String(shortened.y2));
    applyStyle(line, this.style);
    group.appendChild(line);
    this.lineElement = line;

    // Create start marker if needed
    if (this.markerStart !== 'none') {
      const startAngle = getLineDirection(this.x1, this.y1, this.x2, this.y2, 'start');
      const startArrow = calculateArrowGeometry(
        this.x1, this.y1, startAngle, this.markerStart, strokeWidth, 'start'
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
    if (this.markerEnd !== 'none') {
      const endAngle = getLineDirection(this.x1, this.y1, this.x2, this.y2, 'end');
      const endArrow = calculateArrowGeometry(
        this.x2, this.y2, endAngle, this.markerEnd, strokeWidth, 'end'
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

    // Check if we need to switch between group and simple line
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
      // Update simple line
      this.updateLineElement();
    }
  }

  /**
   * Update a simple line element
   */
  private updateLineElement(): void {
    if (!this.lineElement) return;

    this.lineElement.setAttribute('x1', String(this.x1));
    this.lineElement.setAttribute('y1', String(this.y1));
    this.lineElement.setAttribute('x2', String(this.x2));
    this.lineElement.setAttribute('y2', String(this.y2));
    applyStyle(this.lineElement, this.style);

    // Apply rotation
    const center = this.getRotationCenter();
    applyRotation(this.lineElement, this.rotation, center.x, center.y);
  }

  /**
   * Update a group element with markers
   */
  private updateGroupElement(): void {
    if (!this.element || !this.lineElement) return;

    const group = this.element as SVGGElement;
    group.setAttribute('data-marker-start', this.markerStart);
    group.setAttribute('data-marker-end', this.markerEnd);

    const strokeWidth = this.style.strokeWidth || 1;
    const startShortenDist = getMarkerShortenDistance(this.markerStart, strokeWidth);
    const endShortenDist = getMarkerShortenDistance(this.markerEnd, strokeWidth);
    const shortened = getShortenedLineCoords(
      this.x1, this.y1, this.x2, this.y2,
      startShortenDist, endShortenDist
    );

    // Update line element
    this.lineElement.setAttribute('x1', String(shortened.x1));
    this.lineElement.setAttribute('y1', String(shortened.y1));
    this.lineElement.setAttribute('x2', String(shortened.x2));
    this.lineElement.setAttribute('y2', String(shortened.y2));
    applyStyle(this.lineElement, this.style);

    // Update or create start marker
    if (this.markerStart !== 'none') {
      const startAngle = getLineDirection(this.x1, this.y1, this.x2, this.y2, 'start');
      const startArrow = calculateArrowGeometry(
        this.x1, this.y1, startAngle, this.markerStart, strokeWidth, 'start'
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
    if (this.markerEnd !== 'none') {
      const endAngle = getLineDirection(this.x1, this.y1, this.x2, this.y2, 'end');
      const endArrow = calculateArrowGeometry(
        this.x2, this.y2, endAngle, this.markerEnd, strokeWidth, 'end'
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

    // Calculate distance from point to line segment
    const dx = this.x2 - this.x1;
    const dy = this.y2 - this.y1;
    const lengthSq = dx * dx + dy * dy;

    if (lengthSq === 0) {
      // Line is a point
      const dist = Math.sqrt(
        (testPoint.x - this.x1) ** 2 + (testPoint.y - this.y1) ** 2
      );
      return dist <= tolerance;
    }

    // Project point onto line
    let t = ((testPoint.x - this.x1) * dx + (testPoint.y - this.y1) * dy) / lengthSq;
    t = Math.max(0, Math.min(1, t));

    const projX = this.x1 + t * dx;
    const projY = this.y1 + t * dy;

    const dist = Math.sqrt(
      (testPoint.x - projX) ** 2 + (testPoint.y - projY) ** 2
    );

    return dist <= tolerance;
  }

  getBounds(): Bounds {
    const minX = Math.min(this.x1, this.x2);
    const minY = Math.min(this.y1, this.y2);
    const maxX = Math.max(this.x1, this.x2);
    const maxY = Math.max(this.y1, this.y2);

    const baseBounds = {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
    return getRotatedBounds(baseBounds, this.rotation);
  }

  getRotationCenter(): Point {
    return {
      x: (this.x1 + this.x2) / 2,
      y: (this.y1 + this.y2) / 2
    };
  }

  setRotation(angle: number): void {
    this.rotation = normalizeRotation(angle);
    this.updateElement();
  }

  move(dx: number, dy: number): void {
    this.x1 = round3(this.x1 + dx);
    this.y1 = round3(this.y1 + dy);
    this.x2 = round3(this.x2 + dx);
    this.y2 = round3(this.y2 + dy);
    this.updateElement();
  }

  serialize(): LineData {
    return {
      id: this.id,
      type: 'line',
      x1: this.x1,
      y1: this.y1,
      x2: this.x2,
      y2: this.y2,
      markerStart: this.markerStart,
      markerEnd: this.markerEnd,
      style: { ...this.style },
      rotation: this.rotation,
      className: this.className
    };
  }

  clone(): Line {
    const cloned = new Line(
      generateId(),
      this.x1,
      this.y1,
      this.x2,
      this.y2,
      this.markerStart,
      this.markerEnd,
      { ...this.style },
      this.rotation
    );
    cloned.className = this.className;
    return cloned;
  }

  applyTransform(translateX: number, translateY: number, scaleX: number, scaleY: number): void {
    this.x1 = round3(this.x1 * scaleX + translateX);
    this.y1 = round3(this.y1 * scaleY + translateY);
    this.x2 = round3(this.x2 * scaleX + translateX);
    this.y2 = round3(this.y2 * scaleY + translateY);
    this.updateElement();
  }

  applySkew(skewX: number, skewY: number): void {
    const tanX = Math.tan(skewX * Math.PI / 180);
    const tanY = Math.tan(skewY * Math.PI / 180);

    // Apply skew: skewX shifts x by y*tan(angle), skewY shifts y by x*tan(angle)
    this.x1 = round3(this.x1 + this.y1 * tanX);
    this.y1 = round3(this.y1 + this.x1 * tanY);
    this.x2 = round3(this.x2 + this.y2 * tanX);
    this.y2 = round3(this.y2 + this.x2 * tanY);
    this.updateElement();
  }
}
