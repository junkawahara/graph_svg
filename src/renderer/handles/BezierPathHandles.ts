import { Point } from '../../shared/types';
import { BezierPath } from '../shapes/BezierPath';
import { Handle, HandleSet, HandlePosition } from './Handle';

/**
 * Create an anchor point handle element (square shape)
 */
function createAnchorHandleElement(x: number, y: number): SVGRectElement {
  const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  const size = 8;
  rect.setAttribute('x', String(x - size / 2));
  rect.setAttribute('y', String(y - size / 2));
  rect.setAttribute('width', String(size));
  rect.setAttribute('height', String(size));
  rect.setAttribute('fill', '#ffffff');
  rect.setAttribute('stroke', '#0e639c');
  rect.setAttribute('stroke-width', '1.5');
  rect.style.cursor = 'move';
  rect.classList.add('resize-handle', 'anchor-handle');
  return rect;
}

/**
 * Create a control point handle element (circle shape, smaller)
 */
function createControlPointHandleElement(x: number, y: number): SVGCircleElement {
  const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  circle.setAttribute('cx', String(x));
  circle.setAttribute('cy', String(y));
  circle.setAttribute('r', '4');
  circle.setAttribute('fill', '#ffffff');
  circle.setAttribute('stroke', '#888888');
  circle.setAttribute('stroke-width', '1');
  circle.style.cursor = 'move';
  circle.classList.add('resize-handle', 'control-point-handle');
  return circle;
}

/**
 * Create a control line element (dashed line from anchor to control point)
 */
function createControlLineElement(x1: number, y1: number, x2: number, y2: number): SVGLineElement {
  const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  line.setAttribute('x1', String(x1));
  line.setAttribute('y1', String(y1));
  line.setAttribute('x2', String(x2));
  line.setAttribute('y2', String(y2));
  line.setAttribute('stroke', '#888888');
  line.setAttribute('stroke-width', '1');
  line.setAttribute('stroke-dasharray', '3,3');
  line.classList.add('control-line');
  return line;
}

/**
 * Handle for bezier path anchor point (start point or segment end point)
 */
class AnchorHandle implements Handle {
  type = 'corner' as const;
  position: HandlePosition;
  private handleElement: SVGRectElement | null = null;

  constructor(
    private anchorIndex: number,  // 0 = start, 1+ = segment end points
    private shape: BezierPath
  ) {
    this.position = anchorIndex === 0 ? 'start' : 'end';
  }

  getPosition(): Point {
    if (this.anchorIndex === 0) {
      return { ...this.shape.start };
    } else {
      return { ...this.shape.segments[this.anchorIndex - 1].end };
    }
  }

  hitTest(point: Point, tolerance: number = 8): boolean {
    const pos = this.getPosition();
    const dx = point.x - pos.x;
    const dy = point.y - pos.y;
    return Math.sqrt(dx * dx + dy * dy) <= tolerance;
  }

  onDrag(point: Point): void {
    this.shape.setAnchorPoint(this.anchorIndex, point);
  }

  setElement(el: SVGRectElement): void {
    this.handleElement = el;
  }

  updateElement(): void {
    if (!this.handleElement) return;
    const pos = this.getPosition();
    const size = 8;
    this.handleElement.setAttribute('x', String(pos.x - size / 2));
    this.handleElement.setAttribute('y', String(pos.y - size / 2));
  }

  getAnchorIndex(): number {
    return this.anchorIndex;
  }
}

/**
 * Handle for bezier path control point
 */
class ControlPointHandle implements Handle {
  type = 'edge' as const;
  position: HandlePosition = 'e';  // Use 'e' as generic position
  private handleElement: SVGCircleElement | null = null;

  constructor(
    private segmentIndex: number,
    private cpIndex: 0 | 1,  // 0 = cp1, 1 = cp2
    private shape: BezierPath
  ) {}

  getPosition(): Point {
    const segment = this.shape.segments[this.segmentIndex];
    return this.cpIndex === 0 ? { ...segment.cp1 } : { ...segment.cp2 };
  }

  hitTest(point: Point, tolerance: number = 6): boolean {
    const pos = this.getPosition();
    const dx = point.x - pos.x;
    const dy = point.y - pos.y;
    return Math.sqrt(dx * dx + dy * dy) <= tolerance;
  }

  onDrag(point: Point): void {
    this.shape.setControlPoint(this.segmentIndex, this.cpIndex, point);
  }

  setElement(el: SVGCircleElement): void {
    this.handleElement = el;
  }

  updateElement(): void {
    if (!this.handleElement) return;
    const pos = this.getPosition();
    this.handleElement.setAttribute('cx', String(pos.x));
    this.handleElement.setAttribute('cy', String(pos.y));
  }

  getSegmentIndex(): number {
    return this.segmentIndex;
  }

  getCpIndex(): 0 | 1 {
    return this.cpIndex;
  }
}

/**
 * Control line info for rendering
 */
interface ControlLineInfo {
  element: SVGLineElement;
  anchorIndex: number;
  segmentIndex: number;
  cpIndex: 0 | 1;
}

/**
 * Handle set for BezierPath shape
 * Includes anchor handles (square) and control point handles (circle)
 * with dashed lines connecting control points to their anchors
 */
export class BezierPathHandles implements HandleSet {
  handles: Handle[] = [];
  element: SVGGElement | null = null;
  private anchorHandles: AnchorHandle[] = [];
  private controlPointHandles: ControlPointHandle[] = [];
  private controlLines: ControlLineInfo[] = [];

  constructor(public shape: BezierPath) {
    this.createHandles();
  }

  private createHandles(): void {
    this.anchorHandles = [];
    this.controlPointHandles = [];
    this.handles = [];

    // Create anchor handles
    const numAnchors = this.shape.segments.length + 1;
    for (let i = 0; i < numAnchors; i++) {
      // Skip the last anchor if path is closed (it's the same as start)
      if (this.shape.closed && i === numAnchors - 1) continue;

      const handle = new AnchorHandle(i, this.shape);
      this.anchorHandles.push(handle);
      this.handles.push(handle);
    }

    // Create control point handles
    for (let i = 0; i < this.shape.segments.length; i++) {
      const cp1Handle = new ControlPointHandle(i, 0, this.shape);
      const cp2Handle = new ControlPointHandle(i, 1, this.shape);
      this.controlPointHandles.push(cp1Handle, cp2Handle);
      this.handles.push(cp1Handle, cp2Handle);
    }
  }

  render(svg: SVGSVGElement): SVGGElement {
    // Remove existing if any
    this.remove();

    // Recreate handles
    this.createHandles();

    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.classList.add('handle-group', 'bezier-handle-group');

    this.controlLines = [];

    // Draw control lines first (so they appear behind handles)
    for (let segIdx = 0; segIdx < this.shape.segments.length; segIdx++) {
      const segment = this.shape.segments[segIdx];
      const startAnchor = this.shape.getSegmentStart(segIdx);
      const endAnchor = segment.end;

      // Line from start anchor to cp1
      const line1 = createControlLineElement(
        startAnchor.x, startAnchor.y,
        segment.cp1.x, segment.cp1.y
      );
      group.appendChild(line1);
      this.controlLines.push({
        element: line1,
        anchorIndex: segIdx,
        segmentIndex: segIdx,
        cpIndex: 0
      });

      // Line from end anchor to cp2
      const line2 = createControlLineElement(
        endAnchor.x, endAnchor.y,
        segment.cp2.x, segment.cp2.y
      );
      group.appendChild(line2);
      this.controlLines.push({
        element: line2,
        anchorIndex: segIdx + 1,
        segmentIndex: segIdx,
        cpIndex: 1
      });
    }

    // Draw control point handles
    for (const handle of this.controlPointHandles) {
      const pos = handle.getPosition();
      const el = createControlPointHandleElement(pos.x, pos.y);
      handle.setElement(el);
      group.appendChild(el);
    }

    // Draw anchor handles (on top)
    for (const handle of this.anchorHandles) {
      const pos = handle.getPosition();
      const el = createAnchorHandleElement(pos.x, pos.y);
      handle.setElement(el);
      group.appendChild(el);
    }

    svg.appendChild(group);
    this.element = group;
    return group;
  }

  update(): void {
    // Check if structure changed
    const expectedAnchors = this.shape.closed
      ? this.shape.segments.length
      : this.shape.segments.length + 1;
    const expectedCps = this.shape.segments.length * 2;

    if (this.anchorHandles.length !== expectedAnchors ||
        this.controlPointHandles.length !== expectedCps) {
      // Re-render if structure changed
      if (this.element) {
        const svg = this.element.ownerSVGElement;
        if (svg) {
          this.render(svg);
        }
      }
      return;
    }

    // Update existing handle positions
    for (const handle of this.anchorHandles) {
      handle.updateElement();
    }

    for (const handle of this.controlPointHandles) {
      handle.updateElement();
    }

    // Update control lines
    for (const lineInfo of this.controlLines) {
      const segment = this.shape.segments[lineInfo.segmentIndex];
      let anchorPos: Point;
      let cpPos: Point;

      if (lineInfo.cpIndex === 0) {
        anchorPos = this.shape.getSegmentStart(lineInfo.segmentIndex);
        cpPos = segment.cp1;
      } else {
        anchorPos = segment.end;
        cpPos = segment.cp2;
      }

      lineInfo.element.setAttribute('x1', String(anchorPos.x));
      lineInfo.element.setAttribute('y1', String(anchorPos.y));
      lineInfo.element.setAttribute('x2', String(cpPos.x));
      lineInfo.element.setAttribute('y2', String(cpPos.y));
    }
  }

  remove(): void {
    if (this.element) {
      this.element.remove();
      this.element = null;
    }
    this.controlLines = [];
  }

  findHandleAt(point: Point): Handle | null {
    // Check control points first (smaller, need higher priority)
    for (const handle of this.controlPointHandles) {
      if (handle.hitTest(point)) {
        return handle;
      }
    }

    // Then check anchor points
    for (const handle of this.anchorHandles) {
      if (handle.hitTest(point)) {
        return handle;
      }
    }

    return null;
  }
}
