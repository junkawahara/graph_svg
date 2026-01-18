import { Point } from '../../shared/types';
import { Edge } from '../shapes/Edge';
import { Handle, HandleSet, HandlePosition } from './Handle';
import { getGraphManager } from '../core/GraphManager';

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
 * Handle for edge anchor point (endpoint of M, L, C, Q commands)
 * Start/end points are constrained to node boundaries
 */
class EdgeAnchorHandle implements Handle {
  type = 'corner' as const;
  position: HandlePosition;
  private handleElement: SVGRectElement | null = null;

  constructor(
    private anchorIndex: number,  // Index in anchor points array
    private totalAnchors: number, // Total number of anchor points
    private shape: Edge
  ) {
    this.position = anchorIndex === 0 ? 'nw' : 'se';
  }

  getPosition(): Point {
    const anchors = this.shape.getAnchorPoints();
    return anchors[this.anchorIndex] || { x: 0, y: 0 };
  }

  hitTest(point: Point, tolerance: number = 8): boolean {
    const pos = this.getPosition();
    const dx = point.x - pos.x;
    const dy = point.y - pos.y;
    return Math.sqrt(dx * dx + dy * dy) <= tolerance;
  }

  onDrag(point: Point, _event?: MouseEvent): void {
    const gm = getGraphManager();
    const isStartPoint = this.anchorIndex === 0;
    const isEndPoint = this.anchorIndex === this.totalAnchors - 1;

    if (isStartPoint) {
      // Constrain to source node boundary and store connection angle
      const sourceNode = gm.getNodeShape(this.shape.sourceNodeId);
      if (sourceNode) {
        // Find closest point on node boundary
        const boundaryPoint = sourceNode.getConnectionPoint(point.x, point.y);
        // Use setEndpointWithAngle to store the angle for persistence
        this.shape.setEndpointWithAngle(true, boundaryPoint, sourceNode);
        return;
      }
    } else if (isEndPoint) {
      // Constrain to target node boundary and store connection angle
      const targetNode = gm.getNodeShape(this.shape.targetNodeId);
      if (targetNode) {
        // Find closest point on node boundary
        const boundaryPoint = targetNode.getConnectionPoint(point.x, point.y);
        // Use setEndpointWithAngle to store the angle for persistence
        this.shape.setEndpointWithAngle(false, boundaryPoint, targetNode);
        return;
      }
    }

    // Intermediate points can move freely
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

  isStartPoint(): boolean {
    return this.anchorIndex === 0;
  }

  isEndPoint(): boolean {
    return this.anchorIndex === this.totalAnchors - 1;
  }
}

/**
 * Handle for edge control point (cp1/cp2 for C, cp for Q)
 */
class EdgeControlPointHandle implements Handle {
  type = 'edge' as const;
  position: HandlePosition = 'e';
  private handleElement: SVGCircleElement | null = null;

  constructor(
    private cmdIndex: number,  // Command index in commands array
    private cpIndex: 0 | 1,    // 0 = cp1/cpx, 1 = cp2 (only for C)
    private shape: Edge
  ) {}

  getPosition(): Point {
    const cmd = this.shape.pathCommands[this.cmdIndex];
    if (cmd.type === 'C') {
      return this.cpIndex === 0
        ? { x: cmd.cp1x, y: cmd.cp1y }
        : { x: cmd.cp2x, y: cmd.cp2y };
    } else if (cmd.type === 'Q') {
      return { x: cmd.cpx, y: cmd.cpy };
    }
    return { x: 0, y: 0 };
  }

  hitTest(point: Point, tolerance: number = 6): boolean {
    const pos = this.getPosition();
    const dx = point.x - pos.x;
    const dy = point.y - pos.y;
    return Math.sqrt(dx * dx + dy * dy) <= tolerance;
  }

  onDrag(point: Point, _event?: MouseEvent): void {
    this.shape.setControlPoint(this.cmdIndex, this.cpIndex, point);
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

  getCmdIndex(): number {
    return this.cmdIndex;
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
  cmdIndex: number;
  cpIndex: 0 | 1;
  anchorType: 'start' | 'end';  // Which anchor the control point relates to
}

/**
 * Handle set for Edge shape (path type only)
 * Includes anchor handles (square) and control point handles (circle)
 * with dashed lines connecting control points to their anchors
 */
export class EdgeHandles implements HandleSet {
  handles: Handle[] = [];
  element: SVGGElement | null = null;
  private anchorHandles: EdgeAnchorHandle[] = [];
  private controlPointHandles: EdgeControlPointHandle[] = [];
  private controlLines: ControlLineInfo[] = [];

  constructor(public shape: Edge) {
    // Only create handles for path type edges
    if (shape.lineType === 'path' && shape.pathCommands.length > 0) {
      this.createHandles();
    }
  }

  private createHandles(): void {
    this.anchorHandles = [];
    this.controlPointHandles = [];
    this.handles = [];

    const commands = this.shape.pathCommands;

    // Count total anchors first
    let totalAnchors = 0;
    for (const cmd of commands) {
      if (cmd.type !== 'Z') {
        totalAnchors++;
      }
    }

    let anchorIndex = 0;

    for (let cmdIdx = 0; cmdIdx < commands.length; cmdIdx++) {
      const cmd = commands[cmdIdx];

      switch (cmd.type) {
        case 'M':
        case 'L': {
          // Create anchor handle for the endpoint
          const handle = new EdgeAnchorHandle(anchorIndex, totalAnchors, this.shape);
          this.anchorHandles.push(handle);
          this.handles.push(handle);
          anchorIndex++;
          break;
        }

        case 'C': {
          // Create anchor handle for the endpoint
          const anchorHandle = new EdgeAnchorHandle(anchorIndex, totalAnchors, this.shape);
          this.anchorHandles.push(anchorHandle);
          this.handles.push(anchorHandle);
          anchorIndex++;

          // Create control point handles for cp1 and cp2
          const cp1Handle = new EdgeControlPointHandle(cmdIdx, 0, this.shape);
          const cp2Handle = new EdgeControlPointHandle(cmdIdx, 1, this.shape);
          this.controlPointHandles.push(cp1Handle, cp2Handle);
          this.handles.push(cp1Handle, cp2Handle);
          break;
        }

        case 'Q': {
          // Create anchor handle for the endpoint
          const anchorHandle = new EdgeAnchorHandle(anchorIndex, totalAnchors, this.shape);
          this.anchorHandles.push(anchorHandle);
          this.handles.push(anchorHandle);
          anchorIndex++;

          // Create control point handle for cp
          const cpHandle = new EdgeControlPointHandle(cmdIdx, 0, this.shape);
          this.controlPointHandles.push(cpHandle);
          this.handles.push(cpHandle);
          break;
        }

        // Z command has no handles
      }
    }
  }

  render(svg: SVGSVGElement): SVGGElement {
    // Remove existing if any
    this.remove();

    // Only render for path type edges with commands
    if (this.shape.lineType !== 'path' || this.shape.pathCommands.length === 0) {
      const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      group.classList.add('handle-group', 'edge-handle-group');
      svg.appendChild(group);
      this.element = group;
      return group;
    }

    // Recreate handles
    this.createHandles();

    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.classList.add('handle-group', 'edge-handle-group');

    this.controlLines = [];

    // Draw control lines first (so they appear behind handles)
    const commands = this.shape.pathCommands;
    for (let cmdIdx = 0; cmdIdx < commands.length; cmdIdx++) {
      const cmd = commands[cmdIdx];
      const startPos = this.shape.getCommandStart(cmdIdx);

      if (cmd.type === 'C') {
        // Line from start anchor to cp1
        const line1 = createControlLineElement(
          startPos.x, startPos.y,
          cmd.cp1x, cmd.cp1y
        );
        group.appendChild(line1);
        this.controlLines.push({
          element: line1,
          cmdIndex: cmdIdx,
          cpIndex: 0,
          anchorType: 'start'
        });

        // Line from end anchor to cp2
        const line2 = createControlLineElement(
          cmd.x, cmd.y,
          cmd.cp2x, cmd.cp2y
        );
        group.appendChild(line2);
        this.controlLines.push({
          element: line2,
          cmdIndex: cmdIdx,
          cpIndex: 1,
          anchorType: 'end'
        });
      } else if (cmd.type === 'Q') {
        // Line from start anchor to cp
        const line1 = createControlLineElement(
          startPos.x, startPos.y,
          cmd.cpx, cmd.cpy
        );
        group.appendChild(line1);
        this.controlLines.push({
          element: line1,
          cmdIndex: cmdIdx,
          cpIndex: 0,
          anchorType: 'start'
        });

        // Line from end anchor to cp
        const line2 = createControlLineElement(
          cmd.x, cmd.y,
          cmd.cpx, cmd.cpy
        );
        group.appendChild(line2);
        this.controlLines.push({
          element: line2,
          cmdIndex: cmdIdx,
          cpIndex: 0,
          anchorType: 'end'
        });
      }
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
    // Update existing handle positions
    for (const handle of this.anchorHandles) {
      handle.updateElement();
    }

    for (const handle of this.controlPointHandles) {
      handle.updateElement();
    }

    // Update control lines
    for (const lineInfo of this.controlLines) {
      const cmd = this.shape.pathCommands[lineInfo.cmdIndex];
      if (!cmd) continue;

      let anchorPos: Point;
      let cpPos: Point;

      if (cmd.type === 'C') {
        if (lineInfo.anchorType === 'start') {
          anchorPos = this.shape.getCommandStart(lineInfo.cmdIndex);
          cpPos = { x: cmd.cp1x, y: cmd.cp1y };
        } else {
          anchorPos = { x: cmd.x, y: cmd.y };
          cpPos = { x: cmd.cp2x, y: cmd.cp2y };
        }
      } else if (cmd.type === 'Q') {
        if (lineInfo.anchorType === 'start') {
          anchorPos = this.shape.getCommandStart(lineInfo.cmdIndex);
        } else {
          anchorPos = { x: cmd.x, y: cmd.y };
        }
        cpPos = { x: cmd.cpx, y: cmd.cpy };
      } else {
        continue;
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
