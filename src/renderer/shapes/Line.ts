import { Point, Bounds, ShapeStyle, LineData, MarkerType, generateId } from '../../shared/types';
import { Shape, applyStyle } from './Shape';
import { getMarkerManager } from '../core/MarkerManager';

/**
 * Line shape implementation
 */
export class Line implements Shape {
  readonly type = 'line';
  element: SVGLineElement | null = null;

  constructor(
    public readonly id: string,
    public x1: number,
    public y1: number,
    public x2: number,
    public y2: number,
    public markerStart: MarkerType,
    public markerEnd: MarkerType,
    public style: ShapeStyle
  ) {}

  /**
   * Create line from two points
   */
  static fromPoints(start: Point, end: Point, style: ShapeStyle): Line {
    return new Line(generateId(), start.x, start.y, end.x, end.y, 'none', 'none', style);
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

  render(): SVGLineElement {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.id = this.id;
    line.setAttribute('x1', String(this.x1));
    line.setAttribute('y1', String(this.y1));
    line.setAttribute('x2', String(this.x2));
    line.setAttribute('y2', String(this.y2));
    applyStyle(line, this.style);
    this.applyMarkers(line);

    this.element = line;
    return line;
  }

  /**
   * Apply marker attributes to line element
   */
  private applyMarkers(line: SVGLineElement): void {
    const manager = getMarkerManager();
    if (!manager) return;

    if (this.markerStart !== 'none') {
      line.setAttribute('marker-start', manager.getMarkerUrl(this.markerStart, 'start'));
    } else {
      line.removeAttribute('marker-start');
    }

    if (this.markerEnd !== 'none') {
      line.setAttribute('marker-end', manager.getMarkerUrl(this.markerEnd, 'end'));
    } else {
      line.removeAttribute('marker-end');
    }
  }

  updateElement(): void {
    if (!this.element) return;

    this.element.setAttribute('x1', String(this.x1));
    this.element.setAttribute('y1', String(this.y1));
    this.element.setAttribute('x2', String(this.x2));
    this.element.setAttribute('y2', String(this.y2));
    applyStyle(this.element, this.style);
    this.applyMarkers(this.element);
  }

  hitTest(point: Point, tolerance: number = 5): boolean {
    // Calculate distance from point to line segment
    const dx = this.x2 - this.x1;
    const dy = this.y2 - this.y1;
    const lengthSq = dx * dx + dy * dy;

    if (lengthSq === 0) {
      // Line is a point
      const dist = Math.sqrt(
        (point.x - this.x1) ** 2 + (point.y - this.y1) ** 2
      );
      return dist <= tolerance;
    }

    // Project point onto line
    let t = ((point.x - this.x1) * dx + (point.y - this.y1) * dy) / lengthSq;
    t = Math.max(0, Math.min(1, t));

    const projX = this.x1 + t * dx;
    const projY = this.y1 + t * dy;

    const dist = Math.sqrt(
      (point.x - projX) ** 2 + (point.y - projY) ** 2
    );

    return dist <= tolerance;
  }

  getBounds(): Bounds {
    const minX = Math.min(this.x1, this.x2);
    const minY = Math.min(this.y1, this.y2);
    const maxX = Math.max(this.x1, this.x2);
    const maxY = Math.max(this.y1, this.y2);

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  }

  move(dx: number, dy: number): void {
    this.x1 += dx;
    this.y1 += dy;
    this.x2 += dx;
    this.y2 += dy;
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
      style: { ...this.style }
    };
  }

  clone(): Line {
    return new Line(
      generateId(),
      this.x1,
      this.y1,
      this.x2,
      this.y2,
      this.markerStart,
      this.markerEnd,
      { ...this.style }
    );
  }

  applyTransform(translateX: number, translateY: number, scaleX: number, scaleY: number): void {
    this.x1 = this.x1 * scaleX + translateX;
    this.y1 = this.y1 * scaleY + translateY;
    this.x2 = this.x2 * scaleX + translateX;
    this.y2 = this.y2 * scaleY + translateY;
    this.updateElement();
  }
}
