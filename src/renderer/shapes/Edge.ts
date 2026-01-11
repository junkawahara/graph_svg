import { Point, Bounds, ShapeStyle, EdgeData, EdgeDirection, generateId } from '../../shared/types';
import { Shape, applyStyle } from './Shape';
import { getGraphManager } from '../core/GraphManager';
import { Node } from './Node';

/**
 * Graph Edge shape - connects two nodes
 * Note: Edges do not support rotation as they follow their connected nodes
 */
export class Edge implements Shape {
  readonly type = 'edge';
  element: SVGGElement | null = null;  // Changed to group element to contain path and label
  private pathElement: SVGPathElement | null = null;
  private labelElement: SVGTextElement | null = null;
  private labelBgElement: SVGRectElement | null = null;
  rotation: number = 0;  // Always 0 - edges don't rotate
  className?: string;

  constructor(
    public readonly id: string,
    public sourceNodeId: string,
    public targetNodeId: string,
    public direction: EdgeDirection,
    public curveOffset: number,
    public isSelfLoop: boolean,
    public selfLoopAngle: number,
    public style: ShapeStyle,
    public label?: string
  ) {}

  /**
   * Create edge between two nodes
   */
  static create(
    sourceNodeId: string,
    targetNodeId: string,
    direction: EdgeDirection,
    style: ShapeStyle,
    label?: string
  ): Edge {
    const isSelfLoop = sourceNodeId === targetNodeId;
    const gm = getGraphManager();

    // Calculate offset for parallel edges
    const curveOffset = isSelfLoop ? 0 : gm.calculateParallelOffset(sourceNodeId, targetNodeId);

    // Calculate angle for self-loops
    const selfLoopAngle = isSelfLoop ? gm.getNextSelfLoopAngle(sourceNodeId) : 0;

    return new Edge(
      generateId(),
      sourceNodeId,
      targetNodeId,
      direction,
      curveOffset,
      isSelfLoop,
      selfLoopAngle,
      style,
      label
    );
  }

  /**
   * Create edge from SVG element (group or path)
   */
  static fromElement(el: SVGElement, style: ShapeStyle): Edge | null {
    // Handle both group elements (new format) and path elements (legacy format)
    let pathEl: SVGPathElement | null = null;
    let label: string | undefined;

    if (el.tagName === 'g') {
      pathEl = el.querySelector('path');
      const textEl = el.querySelector('text');
      if (textEl) {
        label = textEl.textContent || undefined;
      }
    } else if (el.tagName === 'path') {
      pathEl = el as SVGPathElement;
    }

    if (!pathEl) return null;

    const sourceNodeId = pathEl.getAttribute('data-source-id') || el.getAttribute('data-source-id');
    const targetNodeId = pathEl.getAttribute('data-target-id') || el.getAttribute('data-target-id');

    if (!sourceNodeId || !targetNodeId) return null;

    const direction = (pathEl.getAttribute('data-direction') || el.getAttribute('data-direction') || 'none') as EdgeDirection;
    const curveOffset = parseFloat(pathEl.getAttribute('data-curve-offset') || el.getAttribute('data-curve-offset') || '0');
    const isSelfLoop = pathEl.getAttribute('data-is-self-loop') === 'true' || el.getAttribute('data-is-self-loop') === 'true' || sourceNodeId === targetNodeId;
    const selfLoopAngle = parseFloat(pathEl.getAttribute('data-self-loop-angle') || el.getAttribute('data-self-loop-angle') || '0');

    // Get label from data attribute if not found in text element
    if (!label) {
      label = el.getAttribute('data-label') || undefined;
    }

    return new Edge(
      el.id || generateId(),
      sourceNodeId,
      targetNodeId,
      direction,
      curveOffset,
      isSelfLoop,
      selfLoopAngle,
      style,
      label
    );
  }

  /**
   * Get the path data for the edge
   */
  private getPathData(sourceNode: Node, targetNode: Node): string {
    if (this.isSelfLoop) {
      return this.getSelfLoopPath(sourceNode);
    }

    // Get connection points on node boundaries
    const start = sourceNode.getConnectionPoint(targetNode.cx, targetNode.cy);
    const end = targetNode.getConnectionPoint(sourceNode.cx, sourceNode.cy);

    if (this.curveOffset === 0) {
      // Straight line
      return `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
    } else {
      // Curved line for parallel edges
      return this.getCurvedPath(start, end, sourceNode, targetNode);
    }
  }

  /**
   * Get curved path for parallel edges
   */
  private getCurvedPath(start: Point, end: Point, sourceNode: Node, targetNode: Node): string {
    // Calculate midpoint
    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2;

    // Calculate perpendicular offset
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const len = Math.sqrt(dx * dx + dy * dy);

    if (len === 0) return `M ${start.x} ${start.y} L ${end.x} ${end.y}`;

    // Perpendicular unit vector
    const perpX = -dy / len;
    const perpY = dx / len;

    // Control point with offset
    const ctrlX = midX + perpX * this.curveOffset;
    const ctrlY = midY + perpY * this.curveOffset;

    // Recalculate start and end points for the curved path
    // to connect to node boundaries at the appropriate angle
    const newStart = sourceNode.getConnectionPoint(ctrlX, ctrlY);
    const newEnd = targetNode.getConnectionPoint(ctrlX, ctrlY);

    return `M ${newStart.x} ${newStart.y} Q ${ctrlX} ${ctrlY} ${newEnd.x} ${newEnd.y}`;
  }

  /**
   * Get self-loop path
   */
  private getSelfLoopPath(node: Node): string {
    const angle = this.selfLoopAngle;
    const loopSize = Math.max(node.rx, node.ry) * 1.5;

    // Start point on node boundary
    const startAngle = angle - Math.PI / 6;
    const endAngle = angle + Math.PI / 6;

    const startX = node.cx + node.rx * Math.cos(startAngle);
    const startY = node.cy + node.ry * Math.sin(startAngle);
    const endX = node.cx + node.rx * Math.cos(endAngle);
    const endY = node.cy + node.ry * Math.sin(endAngle);

    // Control points for cubic bezier
    const ctrl1X = node.cx + (node.rx + loopSize) * Math.cos(startAngle);
    const ctrl1Y = node.cy + (node.ry + loopSize) * Math.sin(startAngle);
    const ctrl2X = node.cx + (node.rx + loopSize) * Math.cos(endAngle);
    const ctrl2Y = node.cy + (node.ry + loopSize) * Math.sin(endAngle);

    return `M ${startX} ${startY} C ${ctrl1X} ${ctrl1Y} ${ctrl2X} ${ctrl2Y} ${endX} ${endY}`;
  }

  /**
   * Render the edge
   */
  render(): SVGGElement {
    const gm = getGraphManager();
    const sourceNode = gm.getNodeShape(this.sourceNodeId);
    const targetNode = gm.getNodeShape(this.targetNodeId);

    // Create group element to contain path and label
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.id = this.id;
    group.setAttribute('data-graph-type', 'edge');
    group.setAttribute('data-source-id', this.sourceNodeId);
    group.setAttribute('data-target-id', this.targetNodeId);
    group.setAttribute('data-direction', this.direction);
    group.setAttribute('data-curve-offset', String(this.curveOffset));
    if (this.isSelfLoop) {
      group.setAttribute('data-is-self-loop', 'true');
      group.setAttribute('data-self-loop-angle', String(this.selfLoopAngle));
    }
    if (this.label) {
      group.setAttribute('data-label', this.label);
    }

    // Create path element
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');

    if (sourceNode && targetNode) {
      path.setAttribute('d', this.getPathData(sourceNode, targetNode));
    }

    // Apply style to path
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', this.style.stroke);
    path.setAttribute('stroke-width', String(this.style.strokeWidth));
    if (this.style.opacity !== undefined) {
      path.setAttribute('opacity', String(this.style.opacity));
    }
    if (this.style.strokeDasharray) {
      path.setAttribute('stroke-dasharray', this.style.strokeDasharray);
    }
    if (this.style.strokeLinecap) {
      path.setAttribute('stroke-linecap', this.style.strokeLinecap);
    }

    // Add arrow markers based on direction
    if (this.direction === 'forward' || this.direction === 'backward') {
      const markerColor = this.style.stroke.replace('#', '');
      if (this.direction === 'forward') {
        path.setAttribute('marker-end', `url(#marker-triangle-${markerColor})`);
      } else {
        path.setAttribute('marker-start', `url(#marker-triangle-${markerColor})`);
      }
    }

    group.appendChild(path);
    this.pathElement = path;

    // Add label if exists
    if (this.label && sourceNode && targetNode) {
      const midpoint = this.getPathMidpoint(sourceNode, targetNode);

      // Create background rect for label
      const labelBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      labelBg.setAttribute('fill', 'white');
      labelBg.setAttribute('stroke', 'none');
      labelBg.setAttribute('rx', '2');
      labelBg.setAttribute('ry', '2');
      group.appendChild(labelBg);
      this.labelBgElement = labelBg;

      // Create text element
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', String(midpoint.x));
      text.setAttribute('y', String(midpoint.y));
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('dominant-baseline', 'middle');
      text.setAttribute('font-size', '12');
      text.setAttribute('font-family', 'Arial');
      text.setAttribute('fill', this.style.stroke);
      text.setAttribute('pointer-events', 'none');
      text.textContent = this.label;
      group.appendChild(text);
      this.labelElement = text;

      // Update background rect size after text is rendered
      setTimeout(() => this.updateLabelBackground(), 0);
    }

    this.element = group;

    // Register with GraphManager
    gm.registerEdge(this.id, this.sourceNodeId, this.targetNodeId);

    return group;
  }

  /**
   * Get the midpoint of the path for label positioning
   */
  private getPathMidpoint(sourceNode: Node, targetNode: Node): Point {
    if (this.isSelfLoop) {
      // For self-loops, position label at the top of the loop
      const angle = this.selfLoopAngle;
      const loopSize = Math.max(sourceNode.rx, sourceNode.ry) * 1.5;
      return {
        x: sourceNode.cx + (sourceNode.rx + loopSize * 0.7) * Math.cos(angle),
        y: sourceNode.cy + (sourceNode.ry + loopSize * 0.7) * Math.sin(angle)
      };
    }

    const start = sourceNode.getConnectionPoint(targetNode.cx, targetNode.cy);
    const end = targetNode.getConnectionPoint(sourceNode.cx, sourceNode.cy);

    if (this.curveOffset === 0) {
      // Straight line - return midpoint
      return {
        x: (start.x + end.x) / 2,
        y: (start.y + end.y) / 2
      };
    } else {
      // Curved line - calculate point on quadratic bezier at t=0.5
      const midX = (start.x + end.x) / 2;
      const midY = (start.y + end.y) / 2;
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const len = Math.sqrt(dx * dx + dy * dy);

      if (len === 0) return { x: midX, y: midY };

      const perpX = -dy / len;
      const perpY = dx / len;
      const ctrlX = midX + perpX * this.curveOffset;
      const ctrlY = midY + perpY * this.curveOffset;

      const newStart = sourceNode.getConnectionPoint(ctrlX, ctrlY);
      const newEnd = targetNode.getConnectionPoint(ctrlX, ctrlY);

      // Quadratic bezier at t=0.5
      return this.quadraticBezierPoint(newStart, { x: ctrlX, y: ctrlY }, newEnd, 0.5);
    }
  }

  /**
   * Update the label background rect size
   */
  private updateLabelBackground(): void {
    if (!this.labelElement || !this.labelBgElement) return;

    const bbox = this.labelElement.getBBox();
    const padding = 2;
    this.labelBgElement.setAttribute('x', String(bbox.x - padding));
    this.labelBgElement.setAttribute('y', String(bbox.y - padding));
    this.labelBgElement.setAttribute('width', String(bbox.width + padding * 2));
    this.labelBgElement.setAttribute('height', String(bbox.height + padding * 2));
  }

  /**
   * Update the edge element (e.g., when nodes move)
   */
  updateElement(): void {
    // Get path element from DOM to ensure we're updating the correct element
    const pathElement = this.element?.querySelector('path') as SVGPathElement | null;
    if (!pathElement) return;
    this.pathElement = pathElement;

    const gm = getGraphManager();
    const sourceNode = gm.getNodeShape(this.sourceNodeId);
    const targetNode = gm.getNodeShape(this.targetNodeId);

    if (sourceNode && targetNode) {
      this.pathElement.setAttribute('d', this.getPathData(sourceNode, targetNode));

      // Update label position
      if (this.labelElement && this.label) {
        const midpoint = this.getPathMidpoint(sourceNode, targetNode);
        this.labelElement.setAttribute('x', String(midpoint.x));
        this.labelElement.setAttribute('y', String(midpoint.y));
        this.labelElement.setAttribute('fill', this.style.stroke);
        this.updateLabelBackground();
      }
    }

    // Update style
    this.pathElement.setAttribute('stroke', this.style.stroke);
    this.pathElement.setAttribute('stroke-width', String(this.style.strokeWidth));
    if (this.style.opacity !== undefined) {
      this.pathElement.setAttribute('opacity', String(this.style.opacity));
    }
    if (this.style.strokeDasharray) {
      this.pathElement.setAttribute('stroke-dasharray', this.style.strokeDasharray);
    } else {
      this.pathElement.removeAttribute('stroke-dasharray');
    }
    if (this.style.strokeLinecap) {
      this.pathElement.setAttribute('stroke-linecap', this.style.strokeLinecap);
    }

    // Update data-label attribute
    if (this.element) {
      if (this.label) {
        this.element.setAttribute('data-label', this.label);
      } else {
        this.element.removeAttribute('data-label');
      }
    }
  }

  /**
   * Hit test for edge selection
   */
  hitTest(point: Point, tolerance: number = 5): boolean {
    if (!this.element) return false;

    const gm = getGraphManager();
    const sourceNode = gm.getNodeShape(this.sourceNodeId);
    const targetNode = gm.getNodeShape(this.targetNodeId);

    if (!sourceNode || !targetNode) return false;

    if (this.isSelfLoop) {
      return this.hitTestSelfLoop(point, sourceNode, tolerance);
    }

    const start = sourceNode.getConnectionPoint(targetNode.cx, targetNode.cy);
    const end = targetNode.getConnectionPoint(sourceNode.cx, sourceNode.cy);

    if (this.curveOffset === 0) {
      // Straight line hit test
      return this.distanceToSegment(point, start, end) <= tolerance;
    } else {
      // Curved line hit test (approximate with segments)
      return this.hitTestCurve(point, start, end, sourceNode, targetNode, tolerance);
    }
  }

  /**
   * Distance from point to line segment
   */
  private distanceToSegment(point: Point, start: Point, end: Point): number {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const lenSq = dx * dx + dy * dy;

    if (lenSq === 0) {
      return Math.sqrt((point.x - start.x) ** 2 + (point.y - start.y) ** 2);
    }

    let t = ((point.x - start.x) * dx + (point.y - start.y) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));

    const projX = start.x + t * dx;
    const projY = start.y + t * dy;

    return Math.sqrt((point.x - projX) ** 2 + (point.y - projY) ** 2);
  }

  /**
   * Hit test for curved edge
   */
  private hitTestCurve(point: Point, start: Point, end: Point, sourceNode: Node, targetNode: Node, tolerance: number): boolean {
    // Sample points along the curve and check distance
    const steps = 20;

    // Get control point
    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2;
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const len = Math.sqrt(dx * dx + dy * dy);

    if (len === 0) return false;

    const perpX = -dy / len;
    const perpY = dx / len;
    const ctrlX = midX + perpX * this.curveOffset;
    const ctrlY = midY + perpY * this.curveOffset;

    const newStart = sourceNode.getConnectionPoint(ctrlX, ctrlY);
    const newEnd = targetNode.getConnectionPoint(ctrlX, ctrlY);

    for (let i = 0; i < steps; i++) {
      const t1 = i / steps;
      const t2 = (i + 1) / steps;

      const p1 = this.quadraticBezierPoint(newStart, { x: ctrlX, y: ctrlY }, newEnd, t1);
      const p2 = this.quadraticBezierPoint(newStart, { x: ctrlX, y: ctrlY }, newEnd, t2);

      if (this.distanceToSegment(point, p1, p2) <= tolerance) {
        return true;
      }
    }

    return false;
  }

  /**
   * Hit test for self-loop
   */
  private hitTestSelfLoop(point: Point, node: Node, tolerance: number): boolean {
    // Sample points along the self-loop bezier curve
    const steps = 20;
    const angle = this.selfLoopAngle;
    const loopSize = Math.max(node.rx, node.ry) * 1.5;

    const startAngle = angle - Math.PI / 6;
    const endAngle = angle + Math.PI / 6;

    const start = {
      x: node.cx + node.rx * Math.cos(startAngle),
      y: node.cy + node.ry * Math.sin(startAngle)
    };
    const end = {
      x: node.cx + node.rx * Math.cos(endAngle),
      y: node.cy + node.ry * Math.sin(endAngle)
    };
    const ctrl1 = {
      x: node.cx + (node.rx + loopSize) * Math.cos(startAngle),
      y: node.cy + (node.ry + loopSize) * Math.sin(startAngle)
    };
    const ctrl2 = {
      x: node.cx + (node.rx + loopSize) * Math.cos(endAngle),
      y: node.cy + (node.ry + loopSize) * Math.sin(endAngle)
    };

    for (let i = 0; i < steps; i++) {
      const t1 = i / steps;
      const t2 = (i + 1) / steps;

      const p1 = this.cubicBezierPoint(start, ctrl1, ctrl2, end, t1);
      const p2 = this.cubicBezierPoint(start, ctrl1, ctrl2, end, t2);

      if (this.distanceToSegment(point, p1, p2) <= tolerance) {
        return true;
      }
    }

    return false;
  }

  /**
   * Quadratic bezier point at t
   */
  private quadraticBezierPoint(start: Point, ctrl: Point, end: Point, t: number): Point {
    const mt = 1 - t;
    return {
      x: mt * mt * start.x + 2 * mt * t * ctrl.x + t * t * end.x,
      y: mt * mt * start.y + 2 * mt * t * ctrl.y + t * t * end.y
    };
  }

  /**
   * Cubic bezier point at t
   */
  private cubicBezierPoint(start: Point, ctrl1: Point, ctrl2: Point, end: Point, t: number): Point {
    const mt = 1 - t;
    return {
      x: mt * mt * mt * start.x + 3 * mt * mt * t * ctrl1.x + 3 * mt * t * t * ctrl2.x + t * t * t * end.x,
      y: mt * mt * mt * start.y + 3 * mt * mt * t * ctrl1.y + 3 * mt * t * t * ctrl2.y + t * t * t * end.y
    };
  }

  getBounds(): Bounds {
    const gm = getGraphManager();
    const sourceNode = gm.getNodeShape(this.sourceNodeId);
    const targetNode = gm.getNodeShape(this.targetNodeId);

    if (!sourceNode || !targetNode) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }

    const start = sourceNode.getConnectionPoint(targetNode.cx, targetNode.cy);
    const end = targetNode.getConnectionPoint(sourceNode.cx, sourceNode.cy);

    const minX = Math.min(start.x, end.x);
    const minY = Math.min(start.y, end.y);
    const maxX = Math.max(start.x, end.x);
    const maxY = Math.max(start.y, end.y);

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  }

  getRotationCenter(): Point {
    // Return center of the edge bounds
    const bounds = this.getBounds();
    return {
      x: bounds.x + bounds.width / 2,
      y: bounds.y + bounds.height / 2
    };
  }

  setRotation(_angle: number): void {
    // Edges do not support rotation - they follow their connected nodes
    // No-op
  }

  move(_dx: number, _dy: number): void {
    // Edges cannot be moved directly - they follow their connected nodes
  }

  serialize(): EdgeData {
    return {
      id: this.id,
      type: 'edge',
      sourceNodeId: this.sourceNodeId,
      targetNodeId: this.targetNodeId,
      direction: this.direction,
      curveOffset: this.curveOffset,
      isSelfLoop: this.isSelfLoop,
      selfLoopAngle: this.selfLoopAngle,
      style: { ...this.style },
      className: this.className,
      label: this.label
    };
  }

  clone(): Edge {
    const cloned = new Edge(
      generateId(),
      this.sourceNodeId,
      this.targetNodeId,
      this.direction,
      this.curveOffset,
      this.isSelfLoop,
      this.selfLoopAngle,
      { ...this.style },
      this.label
    );
    cloned.className = this.className;
    return cloned;
  }

  /**
   * Set the label text
   */
  setLabel(label: string | undefined): void {
    this.label = label;
    this.updateElement();
  }
}
