import { Point, Bounds, ShapeStyle, NodeData, NodeLabelPlacement, DEFAULT_NODE_LABEL_PLACEMENT, generateId } from '../../shared/types';
import { Shape, applyStyle, applyRotation, normalizeRotation, rotatePoint, getRotatedBounds } from './Shape';
import { getGraphManager } from '../core/GraphManager';
import { round3 } from '../core/MathUtils';
import { Matrix2D, decomposeMatrix } from '../core/TransformParser';
import { calculateNodeLabelPosition, calculateLabelPositionForAngle } from '../core/LabelGeometry';

/**
 * Graph Node shape - a composite shape with ellipse and label
 */
export class Node implements Shape {
  readonly type = 'node';
  element: SVGGElement | null = null;
  private ellipseElement: SVGEllipseElement | null = null;
  private textElement: SVGTextElement | null = null;
  rotation: number = 0;
  className?: string;
  labelPlacement: NodeLabelPlacement;

  // Auto placement resolved position (internal state)
  private resolvedLabelAngle: number = 90;  // Default: above
  private resolvedLabelDistance: number = 5;

  constructor(
    public readonly id: string,
    public cx: number,
    public cy: number,
    public rx: number,
    public ry: number,
    public label: string,
    public fontSize: number,
    public fontFamily: string,
    public style: ShapeStyle,
    rotation: number = 0,
    labelPlacement: NodeLabelPlacement = { ...DEFAULT_NODE_LABEL_PLACEMENT }
  ) {
    this.rotation = normalizeRotation(rotation);
    this.labelPlacement = labelPlacement;
  }

  /**
   * Create node from center point with specified size
   */
  static fromCenter(center: Point, label: string, style: ShapeStyle, rx: number = 30, ry: number = 30): Node {
    return new Node(
      generateId(),
      round3(center.x),
      round3(center.y),
      round3(rx),
      round3(ry),
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

    // Parse label placement attributes
    const labelPlacement: NodeLabelPlacement = { ...DEFAULT_NODE_LABEL_PLACEMENT };
    const posAttr = el.getAttribute('data-label-position');
    if (posAttr) {
      // Check if it's a number (angle)
      const numValue = parseFloat(posAttr);
      if (!isNaN(numValue)) {
        labelPlacement.position = numValue;
      } else {
        labelPlacement.position = posAttr as NodeLabelPlacement['position'];
      }
    }
    const distAttr = el.getAttribute('data-label-distance');
    if (distAttr) {
      labelPlacement.distance = parseFloat(distAttr);
    }

    return new Node(
      el.id || generateId(),
      parseFloat(ellipse.getAttribute('cx') || '0'),
      parseFloat(ellipse.getAttribute('cy') || '0'),
      parseFloat(ellipse.getAttribute('rx') || '30'),
      parseFloat(ellipse.getAttribute('ry') || '30'),
      label,
      fontSize,
      fontFamily,
      style,
      0,  // rotation
      labelPlacement
    );
  }

  render(): SVGGElement {
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.id = this.id;
    group.setAttribute('data-graph-type', 'node');
    group.setAttribute('data-label', this.label);

    // Add label placement attributes if not default
    if (this.labelPlacement.position !== 'center') {
      const posValue = typeof this.labelPlacement.position === 'number'
        ? String(this.labelPlacement.position)
        : this.labelPlacement.position;
      group.setAttribute('data-label-position', posValue);
    }
    if (this.labelPlacement.distance !== 5) {
      group.setAttribute('data-label-distance', String(this.labelPlacement.distance));
    }

    // Create ellipse
    const ellipse = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
    ellipse.setAttribute('cx', String(this.cx));
    ellipse.setAttribute('cy', String(this.cy));
    ellipse.setAttribute('rx', String(this.rx));
    ellipse.setAttribute('ry', String(this.ry));
    applyStyle(ellipse, this.style);
    group.appendChild(ellipse);
    this.ellipseElement = ellipse;

    // Calculate label position
    let labelPos;
    if (this.labelPlacement.position === 'auto') {
      // Use resolved auto position
      labelPos = calculateLabelPositionForAngle(
        this.cx, this.cy, this.rx, this.ry,
        this.resolvedLabelAngle, this.resolvedLabelDistance
      );
    } else {
      labelPos = calculateNodeLabelPosition(
        this.cx, this.cy, this.rx, this.ry, this.labelPlacement
      );
    }

    // Create text label
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', String(labelPos.x));
    text.setAttribute('y', String(labelPos.y));
    text.setAttribute('text-anchor', labelPos.textAnchor);
    text.setAttribute('dominant-baseline', labelPos.dominantBaseline);
    text.setAttribute('font-size', String(this.fontSize));
    text.setAttribute('font-family', this.fontFamily);
    text.setAttribute('fill', this.style.stroke);  // Use stroke color for text
    text.setAttribute('pointer-events', 'none');  // Don't interfere with hit testing
    text.textContent = this.label;
    group.appendChild(text);
    this.textElement = text;

    // Apply rotation
    applyRotation(group, this.rotation, this.cx, this.cy);

    this.element = group;

    // Register with GraphManager
    const gm = getGraphManager();
    gm.registerNode(this.id);
    gm.setNodeShape(this.id, this);

    // Adjust text vertical position after rendering (requires DOM)
    // Only for center position which needs getBBox adjustment
    if (this.labelPlacement.position === 'center') {
      requestAnimationFrame(() => this.adjustTextVerticalCenter());
    }

    return group;
  }

  /**
   * Adjust text vertical position to be exactly centered using getBBox
   */
  private adjustTextVerticalCenter(): void {
    if (!this.textElement || !this.label) return;

    try {
      const bbox = this.textElement.getBBox();
      // Calculate the actual center of the text bounding box
      const textCenterY = bbox.y + bbox.height / 2;
      // Calculate offset from node center
      const offset = this.cy - textCenterY;
      // Adjust y position
      const currentY = parseFloat(this.textElement.getAttribute('y') || String(this.cy));
      this.textElement.setAttribute('y', String(round3(currentY + offset)));
    } catch (e) {
      // getBBox may fail if element is not in DOM yet
    }
  }

  updateElement(): void {
    if (!this.ellipseElement || !this.textElement) return;

    // Update ellipse
    this.ellipseElement.setAttribute('cx', String(this.cx));
    this.ellipseElement.setAttribute('cy', String(this.cy));
    this.ellipseElement.setAttribute('rx', String(this.rx));
    this.ellipseElement.setAttribute('ry', String(this.ry));
    applyStyle(this.ellipseElement, this.style);

    // Calculate label position
    let labelPos;
    if (this.labelPlacement.position === 'auto') {
      // Use resolved auto position
      labelPos = calculateLabelPositionForAngle(
        this.cx, this.cy, this.rx, this.ry,
        this.resolvedLabelAngle, this.resolvedLabelDistance
      );
    } else {
      labelPos = calculateNodeLabelPosition(
        this.cx, this.cy, this.rx, this.ry, this.labelPlacement
      );
    }

    // Update text
    this.textElement.setAttribute('x', String(labelPos.x));
    this.textElement.setAttribute('y', String(labelPos.y));
    this.textElement.setAttribute('text-anchor', labelPos.textAnchor);
    this.textElement.setAttribute('dominant-baseline', labelPos.dominantBaseline);
    this.textElement.setAttribute('font-size', String(this.fontSize));
    this.textElement.setAttribute('font-family', this.fontFamily);
    this.textElement.setAttribute('fill', this.style.stroke);
    this.textElement.textContent = this.label;

    // Update group data attributes
    if (this.element) {
      this.element.setAttribute('data-label', this.label);

      // Update label placement attributes
      if (this.labelPlacement.position !== 'center') {
        const posValue = typeof this.labelPlacement.position === 'number'
          ? String(this.labelPlacement.position)
          : this.labelPlacement.position;
        this.element.setAttribute('data-label-position', posValue);
      } else {
        this.element.removeAttribute('data-label-position');
      }
      if (this.labelPlacement.distance !== 5) {
        this.element.setAttribute('data-label-distance', String(this.labelPlacement.distance));
      } else {
        this.element.removeAttribute('data-label-distance');
      }

      // Apply rotation
      applyRotation(this.element, this.rotation, this.cx, this.cy);
    }

    // Adjust text vertical position (only for center position)
    if (this.labelPlacement.position === 'center') {
      this.adjustTextVerticalCenter();
    }
  }

  hitTest(point: Point, tolerance: number = 5): boolean {
    // If rotated, transform the test point to the shape's local coordinate system
    let testPoint = point;
    if (this.rotation !== 0) {
      const center = this.getRotationCenter();
      testPoint = rotatePoint(point, center, -this.rotation);
    }

    // Check if point is within ellipse + tolerance
    const dx = testPoint.x - this.cx;
    const dy = testPoint.y - this.cy;

    const outerRx = this.rx + tolerance;
    const outerRy = this.ry + tolerance;
    const outerValue = (dx * dx) / (outerRx * outerRx) + (dy * dy) / (outerRy * outerRy);

    return outerValue <= 1;
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

  serialize(): NodeData {
    const data: NodeData = {
      id: this.id,
      type: 'node',
      cx: this.cx,
      cy: this.cy,
      rx: this.rx,
      ry: this.ry,
      label: this.label,
      fontSize: this.fontSize,
      fontFamily: this.fontFamily,
      style: { ...this.style },
      rotation: this.rotation,
      className: this.className
    };

    // Include labelPlacement if not default
    if (this.labelPlacement.position !== 'center' || this.labelPlacement.distance !== 5) {
      data.labelPlacement = { ...this.labelPlacement };
    }

    return data;
  }

  clone(): Node {
    const cloned = new Node(
      generateId(),
      this.cx,
      this.cy,
      this.rx,
      this.ry,
      this.label,
      this.fontSize,
      this.fontFamily,
      { ...this.style },
      this.rotation,
      { ...this.labelPlacement }
    );
    cloned.className = this.className;
    return cloned;
  }

  applyTransform(translateX: number, translateY: number, scaleX: number, scaleY: number): void {
    this.cx = round3(this.cx * scaleX + translateX);
    this.cy = round3(this.cy * scaleY + translateY);
    this.rx = round3(this.rx * Math.abs(scaleX));
    this.ry = round3(this.ry * Math.abs(scaleY));
    // Scale font size by average scale factor
    const avgScale = (Math.abs(scaleX) + Math.abs(scaleY)) / 2;
    this.fontSize = round3(this.fontSize * avgScale);
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

    // Warn about skew (node doesn't support skew)
    if (Math.abs(decomposed.skewX) > 1e-9 || Math.abs(decomposed.skewY) > 1e-9) {
      console.warn(`Node "${this.id}" does not support skew transform, skew will be ignored`);
    }

    this.updateElement();
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

  /**
   * Set the resolved auto position (called by AutoLabelPlacementManager)
   * @param angle Angle in degrees (0=right, 90=up, 180=left, 270=down)
   * @param distance Distance from node boundary
   */
  setResolvedAutoPosition(angle: number, distance: number): void {
    this.resolvedLabelAngle = angle;
    this.resolvedLabelDistance = distance;
    this.updateElement();
  }

  /**
   * Get the resolved auto position
   */
  getResolvedAutoPosition(): { angle: number; distance: number } {
    return {
      angle: this.resolvedLabelAngle,
      distance: this.resolvedLabelDistance
    };
  }

  /**
   * Get the label's bounding box (for overlap detection)
   * Returns null if label is empty or not rendered
   */
  getLabelBounds(): Bounds | null {
    if (!this.label || !this.textElement) {
      return null;
    }

    try {
      const bbox = this.textElement.getBBox();
      return {
        x: bbox.x,
        y: bbox.y,
        width: bbox.width,
        height: bbox.height
      };
    } catch (e) {
      // getBBox may fail if element is not in DOM
      // Estimate based on font size and text length
      const charWidth = this.fontSize * 0.6;
      const width = this.label.length * charWidth;
      const height = this.fontSize * 1.2;

      // Get label position
      let labelPos;
      if (this.labelPlacement.position === 'auto') {
        labelPos = calculateLabelPositionForAngle(
          this.cx, this.cy, this.rx, this.ry,
          this.resolvedLabelAngle, this.resolvedLabelDistance
        );
      } else {
        labelPos = calculateNodeLabelPosition(
          this.cx, this.cy, this.rx, this.ry, this.labelPlacement
        );
      }

      // Adjust for text anchor
      let x = labelPos.x;
      if (labelPos.textAnchor === 'middle') {
        x -= width / 2;
      } else if (labelPos.textAnchor === 'end') {
        x -= width;
      }

      return {
        x,
        y: labelPos.y - height / 2,
        width,
        height
      };
    }
  }
}
