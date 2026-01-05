import { Point, Bounds, ShapeStyle, NodeData, generateId } from '../../shared/types';
import { Shape, applyStyle } from './Shape';
import { getGraphManager } from '../core/GraphManager';

/**
 * Graph Node shape - a composite shape with ellipse and label
 */
export class Node implements Shape {
  readonly type = 'node';
  element: SVGGElement | null = null;
  private ellipseElement: SVGEllipseElement | null = null;
  private textElement: SVGTextElement | null = null;

  constructor(
    public readonly id: string,
    public cx: number,
    public cy: number,
    public rx: number,
    public ry: number,
    public label: string,
    public fontSize: number,
    public fontFamily: string,
    public style: ShapeStyle
  ) {}

  /**
   * Create node from center point with default size
   */
  static fromCenter(center: Point, label: string, style: ShapeStyle): Node {
    return new Node(
      generateId(),
      center.x,
      center.y,
      30,  // default rx
      30,  // default ry
      label,
      14,  // default fontSize
      'Arial',  // default fontFamily
      style
    );
  }

  /**
   * Create node from SVG group element
   */
  static fromElement(el: SVGGElement, style: ShapeStyle): Node | null {
    const ellipse = el.querySelector('ellipse');
    const text = el.querySelector('text');

    if (!ellipse) return null;

    const label = text?.textContent || '';
    const fontSize = text ? parseFloat(text.getAttribute('font-size') || '14') : 14;
    const fontFamily = text?.getAttribute('font-family') || 'Arial';

    return new Node(
      el.id || generateId(),
      parseFloat(ellipse.getAttribute('cx') || '0'),
      parseFloat(ellipse.getAttribute('cy') || '0'),
      parseFloat(ellipse.getAttribute('rx') || '30'),
      parseFloat(ellipse.getAttribute('ry') || '30'),
      label,
      fontSize,
      fontFamily,
      style
    );
  }

  render(): SVGGElement {
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.id = this.id;
    group.setAttribute('data-graph-type', 'node');
    group.setAttribute('data-label', this.label);

    // Create ellipse
    const ellipse = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
    ellipse.setAttribute('cx', String(this.cx));
    ellipse.setAttribute('cy', String(this.cy));
    ellipse.setAttribute('rx', String(this.rx));
    ellipse.setAttribute('ry', String(this.ry));
    applyStyle(ellipse, this.style);
    group.appendChild(ellipse);
    this.ellipseElement = ellipse;

    // Create text label
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', String(this.cx));
    text.setAttribute('y', String(this.cy));
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('dominant-baseline', 'middle');
    text.setAttribute('font-size', String(this.fontSize));
    text.setAttribute('font-family', this.fontFamily);
    text.setAttribute('fill', this.style.stroke);  // Use stroke color for text
    text.setAttribute('pointer-events', 'none');  // Don't interfere with hit testing
    text.textContent = this.label;
    group.appendChild(text);
    this.textElement = text;

    this.element = group;

    // Register with GraphManager
    const gm = getGraphManager();
    gm.registerNode(this.id);
    gm.setNodeShape(this.id, this);

    return group;
  }

  updateElement(): void {
    if (!this.ellipseElement || !this.textElement) return;

    // Update ellipse
    this.ellipseElement.setAttribute('cx', String(this.cx));
    this.ellipseElement.setAttribute('cy', String(this.cy));
    this.ellipseElement.setAttribute('rx', String(this.rx));
    this.ellipseElement.setAttribute('ry', String(this.ry));
    applyStyle(this.ellipseElement, this.style);

    // Update text
    this.textElement.setAttribute('x', String(this.cx));
    this.textElement.setAttribute('y', String(this.cy));
    this.textElement.setAttribute('font-size', String(this.fontSize));
    this.textElement.setAttribute('font-family', this.fontFamily);
    this.textElement.setAttribute('fill', this.style.stroke);
    this.textElement.textContent = this.label;

    // Update group data attribute
    if (this.element) {
      this.element.setAttribute('data-label', this.label);
    }
  }

  hitTest(point: Point, tolerance: number = 5): boolean {
    // Check if point is within ellipse + tolerance
    const dx = point.x - this.cx;
    const dy = point.y - this.cy;

    const outerRx = this.rx + tolerance;
    const outerRy = this.ry + tolerance;
    const outerValue = (dx * dx) / (outerRx * outerRx) + (dy * dy) / (outerRy * outerRy);

    return outerValue <= 1;
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

  serialize(): NodeData {
    return {
      id: this.id,
      type: 'node',
      cx: this.cx,
      cy: this.cy,
      rx: this.rx,
      ry: this.ry,
      label: this.label,
      fontSize: this.fontSize,
      fontFamily: this.fontFamily,
      style: { ...this.style }
    };
  }

  clone(): Node {
    return new Node(
      generateId(),
      this.cx,
      this.cy,
      this.rx,
      this.ry,
      this.label,
      this.fontSize,
      this.fontFamily,
      { ...this.style }
    );
  }

  /**
   * Get the connection point on the node boundary for an edge
   * @param targetX Target point X (where the edge is going)
   * @param targetY Target point Y (where the edge is going)
   * @returns Point on the ellipse boundary
   */
  getConnectionPoint(targetX: number, targetY: number): Point {
    const dx = targetX - this.cx;
    const dy = targetY - this.cy;
    const angle = Math.atan2(dy, dx);

    return {
      x: this.cx + this.rx * Math.cos(angle),
      y: this.cy + this.ry * Math.sin(angle)
    };
  }

  /**
   * Set the label text
   */
  setLabel(label: string): void {
    this.label = label;
    this.updateElement();
  }
}
