import { Point, Bounds, ShapeStyle, EdgeData, EdgeDirection, EdgeLineType, PathCommand, EdgeLabelPlacement, EdgeLabelSide, DEFAULT_EDGE_LABEL_PLACEMENT, generateId } from '../../shared/types';
import { Shape, applyStyle } from './Shape';
import { getGraphManager } from '../core/GraphManager';
import { Node } from './Node';
import { calculateArrowGeometry, getMarkerShortenDistance } from '../core/ArrowGeometry';
import { round3 } from '../core/MathUtils';
import {
  calculateStraightEdgeLabelPosition,
  calculateQuadraticEdgeLabelPosition,
  calculateCubicEdgeLabelPosition,
  calculatePathEdgeLabelPosition,
  labelPosToNumber,
  normalizeTextRotation
} from '../core/LabelGeometry';

/**
 * Graph Edge shape - connects two nodes
 * Note: Edges do not support rotation as they follow their connected nodes
 */
export class Edge implements Shape {
  readonly type = 'edge';
  element: SVGGElement | null = null;  // Changed to group element to contain path and label
  private pathElement: SVGPathElement | null = null;
  private arrowElement: SVGPathElement | null = null;  // Custom arrow path element
  private labelElement: SVGTextElement | null = null;
  private labelBgElement: SVGRectElement | null = null;
  rotation: number = 0;  // Always 0 - edges don't rotate
  className?: string;

  // Connection angles for path type edges (null = auto, number = fixed angle in radians)
  // Allows user to manually position where the edge connects to nodes
  sourceConnectionAngle: number | null = null;
  targetConnectionAngle: number | null = null;

  // Label placement configuration (TikZ-style)
  labelPlacement: EdgeLabelPlacement;

  // Resolved auto placement values (used when labelPlacement.pos === 'auto')
  private resolvedLabelPos: number = 0.5;
  private resolvedLabelSide: EdgeLabelSide = 'above';
  private resolvedLabelDistance: number = 5;

  constructor(
    public readonly id: string,
    public sourceNodeId: string,
    public targetNodeId: string,
    public direction: EdgeDirection,
    public curveOffset: number,
    public isSelfLoop: boolean,
    public selfLoopAngle: number,
    public style: ShapeStyle,
    public label?: string,
    public lineType: EdgeLineType = 'straight',
    public curveAmount: number = 0,
    public pathCommands: PathCommand[] = [],
    sourceConnectionAngle: number | null = null,
    targetConnectionAngle: number | null = null,
    labelPlacement: EdgeLabelPlacement = { ...DEFAULT_EDGE_LABEL_PLACEMENT }
  ) {
    this.sourceConnectionAngle = sourceConnectionAngle;
    this.targetConnectionAngle = targetConnectionAngle;
    this.labelPlacement = labelPlacement;
  }

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

    // Determine default line type:
    // - Self-loop: 'curve' (straight not allowed)
    // - First edge between nodes: 'straight'
    // - Parallel edges (2nd+): 'curve'
    let lineType: EdgeLineType = 'straight';
    if (isSelfLoop) {
      lineType = 'curve';
    } else if (curveOffset !== 0) {
      lineType = 'curve';
    }

    // Default curveAmount based on curveOffset (for backward compatibility)
    const curveAmount = curveOffset;

    return new Edge(
      generateId(),
      sourceNodeId,
      targetNodeId,
      direction,
      curveOffset,
      isSelfLoop,
      selfLoopAngle,
      style,
      label,
      lineType,
      curveAmount,
      [],  // Empty path commands
      null,  // Auto source connection angle
      null   // Auto target connection angle
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

    // Parse new line type attributes
    const lineTypeAttr = el.getAttribute('data-line-type');
    let lineType: EdgeLineType = 'straight';
    if (lineTypeAttr === 'curve' || lineTypeAttr === 'path') {
      lineType = lineTypeAttr;
    } else if (isSelfLoop || curveOffset !== 0) {
      // Legacy: infer line type from existing data
      lineType = 'curve';
    }

    const curveAmount = parseFloat(el.getAttribute('data-curve-amount') || String(curveOffset));

    // Parse path commands for 'path' type (will be implemented in FileManager)
    const pathCommands: PathCommand[] = [];

    // Parse connection angles (null if not set = auto mode)
    const sourceAngleAttr = el.getAttribute('data-source-connection-angle');
    const targetAngleAttr = el.getAttribute('data-target-connection-angle');
    const sourceConnectionAngle = sourceAngleAttr !== null ? parseFloat(sourceAngleAttr) : null;
    const targetConnectionAngle = targetAngleAttr !== null ? parseFloat(targetAngleAttr) : null;

    // Parse label placement attributes
    const labelPlacement: EdgeLabelPlacement = { ...DEFAULT_EDGE_LABEL_PLACEMENT };
    const labelPosAttr = el.getAttribute('data-label-position');
    if (labelPosAttr) {
      const numValue = parseFloat(labelPosAttr);
      if (!isNaN(numValue)) {
        labelPlacement.pos = numValue;
      } else {
        labelPlacement.pos = labelPosAttr as EdgeLabelPlacement['pos'];
      }
    }
    const labelSideAttr = el.getAttribute('data-label-side');
    if (labelSideAttr === 'above' || labelSideAttr === 'below') {
      labelPlacement.side = labelSideAttr;
    }
    const labelSlopedAttr = el.getAttribute('data-label-sloped');
    if (labelSlopedAttr === 'true') {
      labelPlacement.sloped = true;
    }
    const labelDistAttr = el.getAttribute('data-label-distance');
    if (labelDistAttr) {
      labelPlacement.distance = parseFloat(labelDistAttr);
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
      label,
      lineType,
      curveAmount,
      pathCommands,
      sourceConnectionAngle,
      targetConnectionAngle,
      labelPlacement
    );
  }

  /**
   * Get the path data for the edge
   */
  private getPathData(sourceNode: Node, targetNode: Node): string {
    // Self-loop handling
    if (this.isSelfLoop) {
      if (this.lineType === 'path' && this.pathCommands.length > 0) {
        return this.getPathTypeData(sourceNode, targetNode);
      }
      return this.getSelfLoopPath(sourceNode);
    }

    // Branch by line type
    switch (this.lineType) {
      case 'straight':
        return this.getStraightPath(sourceNode, targetNode);
      case 'curve':
        return this.getCurvePath(sourceNode, targetNode);
      case 'path':
        return this.getPathTypeData(sourceNode, targetNode);
      default:
        return this.getStraightPath(sourceNode, targetNode);
    }
  }

  /**
   * Get straight path between nodes
   */
  private getStraightPath(sourceNode: Node, targetNode: Node): string {
    const start = sourceNode.getConnectionPoint(targetNode.cx, targetNode.cy);
    const end = targetNode.getConnectionPoint(sourceNode.cx, sourceNode.cy);
    return `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
  }

  /**
   * Get curved path using curveAmount
   */
  private getCurvePath(sourceNode: Node, targetNode: Node): string {
    const start = sourceNode.getConnectionPoint(targetNode.cx, targetNode.cy);
    const end = targetNode.getConnectionPoint(sourceNode.cx, sourceNode.cy);

    // Use curveAmount if set, otherwise fall back to curveOffset
    const offset = this.curveAmount !== 0 ? this.curveAmount : this.curveOffset;

    if (offset === 0) {
      // No curve - draw straight line
      return `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
    }

    return this.getCurvedPath(start, end, sourceNode, targetNode, offset);
  }

  /**
   * Get path data for 'path' type (custom editable path)
   */
  private getPathTypeData(sourceNode: Node, targetNode: Node): string {
    if (this.pathCommands.length === 0) {
      // No path commands yet - fall back to curve
      return this.getCurvePath(sourceNode, targetNode);
    }

    // Generate SVG path string from commands
    // Endpoints are connected to node boundaries
    const parts: string[] = [];
    for (const cmd of this.pathCommands) {
      switch (cmd.type) {
        case 'M':
          parts.push(`M ${cmd.x} ${cmd.y}`);
          break;
        case 'L':
          parts.push(`L ${cmd.x} ${cmd.y}`);
          break;
        case 'C':
          parts.push(`C ${cmd.cp1x} ${cmd.cp1y} ${cmd.cp2x} ${cmd.cp2y} ${cmd.x} ${cmd.y}`);
          break;
        case 'Q':
          parts.push(`Q ${cmd.cpx} ${cmd.cpy} ${cmd.x} ${cmd.y}`);
          break;
        case 'A':
          parts.push(`A ${cmd.rx} ${cmd.ry} ${cmd.xAxisRotation} ${cmd.largeArcFlag ? 1 : 0} ${cmd.sweepFlag ? 1 : 0} ${cmd.x} ${cmd.y}`);
          break;
        case 'Z':
          parts.push('Z');
          break;
      }
    }
    return parts.join(' ');
  }

  /**
   * Get curved path for parallel edges
   * @param offset - Optional curve offset (defaults to this.curveOffset)
   */
  private getCurvedPath(start: Point, end: Point, sourceNode: Node, targetNode: Node, offset?: number): string {
    const curveOffset = offset !== undefined ? offset : this.curveOffset;

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
    const ctrlX = midX + perpX * curveOffset;
    const ctrlY = midY + perpY * curveOffset;

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
   * Get arrow position and angle for the edge
   * Returns the position and direction angle for the arrow based on edge direction
   */
  getArrowPositionAndAngle(sourceNode: Node, targetNode: Node): { x: number; y: number; angle: number } | null {
    if (this.direction === 'none') return null;

    if (this.isSelfLoop) {
      return this.getSelfLoopArrowInfo(sourceNode);
    }

    // Handle path type with pathCommands
    if (this.lineType === 'path' && this.pathCommands.length >= 2) {
      return this.getPathArrowInfo();
    }

    // Use curveAmount if set, otherwise fall back to curveOffset (same logic as getCurvePath)
    const effectiveOffset = this.lineType === 'curve' && this.curveAmount !== 0
      ? this.curveAmount
      : this.curveOffset;

    const start = sourceNode.getConnectionPoint(targetNode.cx, targetNode.cy);
    const end = targetNode.getConnectionPoint(sourceNode.cx, sourceNode.cy);

    if (effectiveOffset === 0) {
      // Straight line
      const angle = Math.atan2(end.y - start.y, end.x - start.x);
      if (this.direction === 'forward') {
        return { x: end.x, y: end.y, angle };
      } else {
        return { x: start.x, y: start.y, angle: angle + Math.PI };
      }
    } else {
      // Curved line
      return this.getCurvedArrowInfo(start, end, sourceNode, targetNode, effectiveOffset);
    }
  }

  /**
   * Get arrow info for path type edges
   */
  private getPathArrowInfo(): { x: number; y: number; angle: number } | null {
    if (this.pathCommands.length < 2) return null;

    const firstCmd = this.pathCommands[0];
    if (firstCmd.type !== 'M') return null;

    const lastIdx = this.pathCommands.length - 1;
    const lastCmd = this.pathCommands[lastIdx];

    if (this.direction === 'forward') {
      // Arrow at end - calculate tangent at end point
      if (lastCmd.type === 'L') {
        const prevCmd = this.pathCommands[lastIdx - 1];
        const prevX = prevCmd.type !== 'Z' && prevCmd.type !== 'M' ? prevCmd.x : firstCmd.x;
        const prevY = prevCmd.type !== 'Z' && prevCmd.type !== 'M' ? prevCmd.y : firstCmd.y;
        const angle = Math.atan2(lastCmd.y - prevY, lastCmd.x - prevX);
        return { x: lastCmd.x, y: lastCmd.y, angle };
      } else if (lastCmd.type === 'C') {
        // Tangent from cp2 to endpoint
        const angle = Math.atan2(lastCmd.y - lastCmd.cp2y, lastCmd.x - lastCmd.cp2x);
        return { x: lastCmd.x, y: lastCmd.y, angle };
      } else if (lastCmd.type === 'Q') {
        // Tangent from control point to endpoint
        const angle = Math.atan2(lastCmd.y - lastCmd.cpy, lastCmd.x - lastCmd.cpx);
        return { x: lastCmd.x, y: lastCmd.y, angle };
      }
    } else {
      // Arrow at start - calculate tangent at start point
      const secondCmd = this.pathCommands[1];

      if (secondCmd.type === 'L') {
        const angle = Math.atan2(firstCmd.y - secondCmd.y, firstCmd.x - secondCmd.x);
        return { x: firstCmd.x, y: firstCmd.y, angle };
      } else if (secondCmd.type === 'C') {
        // Tangent from cp1 to start (reversed)
        const angle = Math.atan2(firstCmd.y - secondCmd.cp1y, firstCmd.x - secondCmd.cp1x);
        return { x: firstCmd.x, y: firstCmd.y, angle };
      } else if (secondCmd.type === 'Q') {
        // Tangent from control point to start (reversed)
        const angle = Math.atan2(firstCmd.y - secondCmd.cpy, firstCmd.x - secondCmd.cpx);
        return { x: firstCmd.x, y: firstCmd.y, angle };
      }
    }

    return null;
  }

  /**
   * Get arrow info for curved edges
   * @param offset - The curve offset to use (curveAmount or curveOffset)
   */
  private getCurvedArrowInfo(start: Point, end: Point, sourceNode: Node, targetNode: Node, offset: number): { x: number; y: number; angle: number } | null {
    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2;
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const len = Math.sqrt(dx * dx + dy * dy);

    if (len === 0) return null;

    const perpX = -dy / len;
    const perpY = dx / len;
    const ctrlX = midX + perpX * offset;
    const ctrlY = midY + perpY * offset;

    const newStart = sourceNode.getConnectionPoint(ctrlX, ctrlY);
    const newEnd = targetNode.getConnectionPoint(ctrlX, ctrlY);

    if (this.direction === 'forward') {
      // Arrow at end - tangent from control point to end
      const angle = Math.atan2(newEnd.y - ctrlY, newEnd.x - ctrlX);
      return { x: newEnd.x, y: newEnd.y, angle };
    } else {
      // Arrow at start - tangent from control point to start (reversed)
      const angle = Math.atan2(newStart.y - ctrlY, newStart.x - ctrlX);
      return { x: newStart.x, y: newStart.y, angle };
    }
  }

  /**
   * Get arrow info for self-loop edges
   */
  private getSelfLoopArrowInfo(node: Node): { x: number; y: number; angle: number } | null {
    const angle = this.selfLoopAngle;
    const loopSize = Math.max(node.rx, node.ry) * 1.5;

    const startAngle = angle - Math.PI / 6;
    const endAngle = angle + Math.PI / 6;

    if (this.direction === 'forward') {
      // Arrow at end of self-loop
      const endX = node.cx + node.rx * Math.cos(endAngle);
      const endY = node.cy + node.ry * Math.sin(endAngle);
      // Tangent from ctrl2 to end
      const ctrl2X = node.cx + (node.rx + loopSize) * Math.cos(endAngle);
      const ctrl2Y = node.cy + (node.ry + loopSize) * Math.sin(endAngle);
      const arrowAngle = Math.atan2(endY - ctrl2Y, endX - ctrl2X);
      return { x: endX, y: endY, angle: arrowAngle };
    } else {
      // Arrow at start of self-loop
      const startX = node.cx + node.rx * Math.cos(startAngle);
      const startY = node.cy + node.ry * Math.sin(startAngle);
      // Tangent from ctrl1 to start (reversed)
      const ctrl1X = node.cx + (node.rx + loopSize) * Math.cos(startAngle);
      const ctrl1Y = node.cy + (node.ry + loopSize) * Math.sin(startAngle);
      const arrowAngle = Math.atan2(startY - ctrl1Y, startX - ctrl1X);
      return { x: startX, y: startY, angle: arrowAngle };
    }
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
    group.setAttribute('data-line-type', this.lineType);
    if (this.lineType === 'curve') {
      group.setAttribute('data-curve-amount', String(this.curveAmount));
    }
    if (this.isSelfLoop) {
      group.setAttribute('data-is-self-loop', 'true');
      group.setAttribute('data-self-loop-angle', String(this.selfLoopAngle));
    }
    // Save connection angles if manually set
    if (this.sourceConnectionAngle !== null) {
      group.setAttribute('data-source-connection-angle', String(this.sourceConnectionAngle));
    }
    if (this.targetConnectionAngle !== null) {
      group.setAttribute('data-target-connection-angle', String(this.targetConnectionAngle));
    }
    if (this.label) {
      group.setAttribute('data-label', this.label);
      // Add label placement attributes
      const posValue = typeof this.labelPlacement.pos === 'number'
        ? String(this.labelPlacement.pos)
        : this.labelPlacement.pos;
      group.setAttribute('data-label-position', posValue);
      if (this.labelPlacement.side !== 'above') {
        group.setAttribute('data-label-side', this.labelPlacement.side);
      }
      if (this.labelPlacement.sloped) {
        group.setAttribute('data-label-sloped', 'true');
      }
      if (this.labelPlacement.distance !== 5) {
        group.setAttribute('data-label-distance', String(this.labelPlacement.distance));
      }
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

    group.appendChild(path);
    this.pathElement = path;

    // Add custom arrow based on direction
    if (this.direction !== 'none' && sourceNode && targetNode) {
      const arrowInfo = this.getArrowPositionAndAngle(sourceNode, targetNode);
      if (arrowInfo) {
        const strokeWidth = this.style.strokeWidth || 1;
        const position = this.direction === 'forward' ? 'end' : 'start';
        const arrowGeom = calculateArrowGeometry(
          arrowInfo.x, arrowInfo.y, arrowInfo.angle,
          'triangle-medium', strokeWidth, position
        );
        if (arrowGeom) {
          const arrowPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          arrowPath.setAttribute('data-role', 'arrow');
          arrowPath.setAttribute('d', arrowGeom.path);
          arrowPath.setAttribute('fill', this.style.stroke);
          arrowPath.setAttribute('stroke', 'none');
          group.appendChild(arrowPath);
          this.arrowElement = arrowPath;
        }
      }
    } else {
      this.arrowElement = null;
    }

    // Add label if exists
    if (this.label && sourceNode && targetNode) {
      const labelPos = this.calculateLabelPosition(sourceNode, targetNode);

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
      text.setAttribute('x', String(labelPos.x));
      text.setAttribute('y', String(labelPos.y));
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('dominant-baseline', 'middle');
      text.setAttribute('font-size', '12');
      text.setAttribute('font-family', 'Arial');
      text.setAttribute('fill', this.style.stroke);
      text.setAttribute('pointer-events', 'none');
      if (labelPos.rotation !== 0) {
        text.setAttribute('transform', `rotate(${labelPos.rotation}, ${labelPos.x}, ${labelPos.y})`);
      }
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
   * Get the midpoint of the path for label positioning (legacy, kept for compatibility)
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
   * Calculate label position using TikZ-style placement
   */
  private calculateLabelPosition(sourceNode: Node, targetNode: Node): { x: number; y: number; rotation: number } {
    // Determine effective placement: use resolved values for auto mode
    let effectivePlacement: EdgeLabelPlacement;
    if (this.labelPlacement.pos === 'auto') {
      effectivePlacement = {
        pos: this.resolvedLabelPos,
        side: this.resolvedLabelSide,
        sloped: this.labelPlacement.sloped,  // sloped is user-controlled
        distance: this.resolvedLabelDistance
      };
    } else {
      effectivePlacement = this.labelPlacement;
    }

    // Handle self-loop
    if (this.isSelfLoop) {
      return this.calculateSelfLoopLabelPosition(sourceNode, effectivePlacement);
    }

    // Handle path type with pathCommands
    if (this.lineType === 'path' && this.pathCommands.length >= 2) {
      const result = calculatePathEdgeLabelPosition(this.pathCommands, effectivePlacement);
      if (result) return result;
      // Fallback to midpoint if calculation fails
      const midpoint = this.getPathMidpoint(sourceNode, targetNode);
      return { ...midpoint, rotation: 0 };
    }

    // Get start and end points
    const start = sourceNode.getConnectionPoint(targetNode.cx, targetNode.cy);
    const end = targetNode.getConnectionPoint(sourceNode.cx, sourceNode.cy);

    // Use curveAmount if set, otherwise fall back to curveOffset
    const effectiveOffset = this.lineType === 'curve' && this.curveAmount !== 0
      ? this.curveAmount
      : this.curveOffset;

    if (effectiveOffset === 0) {
      // Straight line
      return calculateStraightEdgeLabelPosition(start, end, effectivePlacement);
    } else {
      // Curved line (quadratic bezier)
      const midX = (start.x + end.x) / 2;
      const midY = (start.y + end.y) / 2;
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const len = Math.sqrt(dx * dx + dy * dy);

      if (len === 0) {
        return { x: midX, y: midY, rotation: 0 };
      }

      const perpX = -dy / len;
      const perpY = dx / len;
      const ctrlX = midX + perpX * effectiveOffset;
      const ctrlY = midY + perpY * effectiveOffset;

      const newStart = sourceNode.getConnectionPoint(ctrlX, ctrlY);
      const newEnd = targetNode.getConnectionPoint(ctrlX, ctrlY);

      return calculateQuadraticEdgeLabelPosition(
        newStart,
        { x: ctrlX, y: ctrlY },
        newEnd,
        effectivePlacement
      );
    }
  }

  /**
   * Calculate label position for self-loop edges
   */
  private calculateSelfLoopLabelPosition(node: Node, placement: EdgeLabelPlacement): { x: number; y: number; rotation: number } {
    const angle = this.selfLoopAngle;
    const loopSize = Math.max(node.rx, node.ry) * 1.5;
    const startAngle = angle - Math.PI / 6;
    const endAngle = angle + Math.PI / 6;

    // Self-loop control points
    const startX = node.cx + node.rx * Math.cos(startAngle);
    const startY = node.cy + node.ry * Math.sin(startAngle);
    const endX = node.cx + node.rx * Math.cos(endAngle);
    const endY = node.cy + node.ry * Math.sin(endAngle);
    const ctrl1 = { x: node.cx + (node.rx + loopSize) * Math.cos(startAngle), y: node.cy + (node.ry + loopSize) * Math.sin(startAngle) };
    const ctrl2 = { x: node.cx + (node.rx + loopSize) * Math.cos(endAngle), y: node.cy + (node.ry + loopSize) * Math.sin(endAngle) };

    return calculateCubicEdgeLabelPosition(
      { x: startX, y: startY },
      ctrl1,
      ctrl2,
      { x: endX, y: endY },
      placement
    );
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
   * Update path endpoints when nodes move (for path type edges)
   * Start point reconnects to source node boundary
   * End point reconnects to target node boundary
   * Intermediate control points remain fixed
   * If connection angles are set, uses those angles for consistent positioning
   */
  private updatePathEndpoints(sourceNode: Node, targetNode: Node): void {
    if (this.lineType !== 'path' || this.pathCommands.length < 2) return;

    const firstCmd = this.pathCommands[0];
    const lastIdx = this.pathCommands.length - 1;
    const lastCmd = this.pathCommands[lastIdx];

    if (firstCmd.type !== 'M' || lastCmd.type === 'Z') return;

    // Calculate new start point on source node boundary
    let newStart: Point;
    if (this.sourceConnectionAngle !== null) {
      // Use stored connection angle
      newStart = {
        x: sourceNode.cx + sourceNode.rx * Math.cos(this.sourceConnectionAngle),
        y: sourceNode.cy + sourceNode.ry * Math.sin(this.sourceConnectionAngle)
      };
    } else {
      // Auto mode: determine direction based on next point
      let nextPoint: Point;
      const secondCmd = this.pathCommands[1];
      if (secondCmd.type === 'C') {
        nextPoint = { x: secondCmd.cp1x, y: secondCmd.cp1y };
      } else if (secondCmd.type === 'Q') {
        nextPoint = { x: secondCmd.cpx, y: secondCmd.cpy };
      } else if (secondCmd.type !== 'Z') {
        nextPoint = { x: secondCmd.x, y: secondCmd.y };
      } else {
        nextPoint = { x: sourceNode.cx, y: sourceNode.cy };
      }
      newStart = sourceNode.getConnectionPoint(nextPoint.x, nextPoint.y);
    }
    this.pathCommands[0] = { type: 'M', x: round3(newStart.x), y: round3(newStart.y) };

    // Calculate new end point on target node boundary
    let newEnd: Point;
    if (this.targetConnectionAngle !== null) {
      // Use stored connection angle
      newEnd = {
        x: targetNode.cx + targetNode.rx * Math.cos(this.targetConnectionAngle),
        y: targetNode.cy + targetNode.ry * Math.sin(this.targetConnectionAngle)
      };
    } else {
      // Auto mode: determine direction based on previous point
      let prevPoint: Point;
      if (lastCmd.type === 'C') {
        prevPoint = { x: lastCmd.cp2x, y: lastCmd.cp2y };
      } else if (lastCmd.type === 'Q') {
        prevPoint = { x: lastCmd.cpx, y: lastCmd.cpy };
      } else {
        const prevCmd = this.pathCommands[lastIdx - 1];
        if (prevCmd && prevCmd.type !== 'Z') {
          prevPoint = { x: prevCmd.x, y: prevCmd.y };
        } else {
          prevPoint = { x: targetNode.cx, y: targetNode.cy };
        }
      }
      newEnd = targetNode.getConnectionPoint(prevPoint.x, prevPoint.y);
    }

    // Update the last command's endpoint
    if (lastCmd.type === 'L') {
      this.pathCommands[lastIdx] = { type: 'L', x: round3(newEnd.x), y: round3(newEnd.y) };
    } else if (lastCmd.type === 'C') {
      this.pathCommands[lastIdx] = {
        ...lastCmd,
        x: round3(newEnd.x),
        y: round3(newEnd.y)
      };
    } else if (lastCmd.type === 'Q') {
      this.pathCommands[lastIdx] = {
        ...lastCmd,
        x: round3(newEnd.x),
        y: round3(newEnd.y)
      };
    }
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
      // Update path endpoints for path type edges
      this.updatePathEndpoints(sourceNode, targetNode);

      this.pathElement.setAttribute('d', this.getPathData(sourceNode, targetNode));

      // Update label position
      if (this.labelElement && this.label) {
        const labelPos = this.calculateLabelPosition(sourceNode, targetNode);
        this.labelElement.setAttribute('x', String(labelPos.x));
        this.labelElement.setAttribute('y', String(labelPos.y));
        this.labelElement.setAttribute('fill', this.style.stroke);
        if (labelPos.rotation !== 0) {
          this.labelElement.setAttribute('transform', `rotate(${labelPos.rotation}, ${labelPos.x}, ${labelPos.y})`);
        } else {
          this.labelElement.removeAttribute('transform');
        }
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

    // Update arrow
    if (this.direction !== 'none' && sourceNode && targetNode) {
      const arrowInfo = this.getArrowPositionAndAngle(sourceNode, targetNode);
      if (arrowInfo) {
        const strokeWidth = this.style.strokeWidth || 1;
        const position = this.direction === 'forward' ? 'end' : 'start';
        const arrowGeom = calculateArrowGeometry(
          arrowInfo.x, arrowInfo.y, arrowInfo.angle,
          'triangle-medium', strokeWidth, position
        );
        if (arrowGeom) {
          if (!this.arrowElement) {
            const arrowPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            arrowPath.setAttribute('data-role', 'arrow');
            this.element?.appendChild(arrowPath);
            this.arrowElement = arrowPath;
          }
          this.arrowElement.setAttribute('d', arrowGeom.path);
          this.arrowElement.setAttribute('fill', this.style.stroke);
          this.arrowElement.setAttribute('stroke', 'none');
        }
      }
    } else if (this.arrowElement) {
      this.arrowElement.remove();
      this.arrowElement = null;
    }

    // Update data-label attribute and label placement attributes
    if (this.element) {
      if (this.label) {
        this.element.setAttribute('data-label', this.label);
        // Update label placement attributes
        const posValue = typeof this.labelPlacement.pos === 'number'
          ? String(this.labelPlacement.pos)
          : this.labelPlacement.pos;
        this.element.setAttribute('data-label-position', posValue);
        if (this.labelPlacement.side !== 'above') {
          this.element.setAttribute('data-label-side', this.labelPlacement.side);
        } else {
          this.element.removeAttribute('data-label-side');
        }
        if (this.labelPlacement.sloped) {
          this.element.setAttribute('data-label-sloped', 'true');
        } else {
          this.element.removeAttribute('data-label-sloped');
        }
        if (this.labelPlacement.distance !== 5) {
          this.element.setAttribute('data-label-distance', String(this.labelPlacement.distance));
        } else {
          this.element.removeAttribute('data-label-distance');
        }
      } else {
        this.element.removeAttribute('data-label');
        this.element.removeAttribute('data-label-position');
        this.element.removeAttribute('data-label-side');
        this.element.removeAttribute('data-label-sloped');
        this.element.removeAttribute('data-label-distance');
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

    // Handle path type with pathCommands
    if (this.lineType === 'path' && this.pathCommands.length >= 2) {
      return this.hitTestPath(point, tolerance);
    }

    // Use curveAmount if set, otherwise fall back to curveOffset (same logic as getCurvePath)
    const effectiveOffset = this.lineType === 'curve' && this.curveAmount !== 0
      ? this.curveAmount
      : this.curveOffset;

    const start = sourceNode.getConnectionPoint(targetNode.cx, targetNode.cy);
    const end = targetNode.getConnectionPoint(sourceNode.cx, sourceNode.cy);

    if (effectiveOffset === 0) {
      // Straight line hit test
      return this.distanceToSegment(point, start, end) <= tolerance;
    } else {
      // Curved line hit test (approximate with segments)
      return this.hitTestCurve(point, start, end, sourceNode, targetNode, tolerance, effectiveOffset);
    }
  }

  /**
   * Hit test for path type edges
   */
  private hitTestPath(point: Point, tolerance: number): boolean {
    if (this.pathCommands.length < 2) return false;

    let currentX = 0;
    let currentY = 0;
    let subpathStartX = 0;
    let subpathStartY = 0;

    for (let i = 0; i < this.pathCommands.length; i++) {
      const cmd = this.pathCommands[i];

      if (cmd.type === 'M') {
        currentX = cmd.x;
        currentY = cmd.y;
        subpathStartX = cmd.x;
        subpathStartY = cmd.y;
      } else if (cmd.type === 'L') {
        // Line segment hit test
        const start = { x: currentX, y: currentY };
        const end = { x: cmd.x, y: cmd.y };
        if (this.distanceToSegment(point, start, end) <= tolerance) {
          return true;
        }
        currentX = cmd.x;
        currentY = cmd.y;
      } else if (cmd.type === 'C') {
        // Cubic bezier hit test (sample along curve)
        const start = { x: currentX, y: currentY };
        const ctrl1 = { x: cmd.cp1x, y: cmd.cp1y };
        const ctrl2 = { x: cmd.cp2x, y: cmd.cp2y };
        const end = { x: cmd.x, y: cmd.y };

        const steps = 20;
        for (let j = 0; j < steps; j++) {
          const t1 = j / steps;
          const t2 = (j + 1) / steps;
          const p1 = this.cubicBezierPoint(start, ctrl1, ctrl2, end, t1);
          const p2 = this.cubicBezierPoint(start, ctrl1, ctrl2, end, t2);
          if (this.distanceToSegment(point, p1, p2) <= tolerance) {
            return true;
          }
        }
        currentX = cmd.x;
        currentY = cmd.y;
      } else if (cmd.type === 'Q') {
        // Quadratic bezier hit test (sample along curve)
        const start = { x: currentX, y: currentY };
        const ctrl = { x: cmd.cpx, y: cmd.cpy };
        const end = { x: cmd.x, y: cmd.y };

        const steps = 20;
        for (let j = 0; j < steps; j++) {
          const t1 = j / steps;
          const t2 = (j + 1) / steps;
          const p1 = this.quadraticBezierPoint(start, ctrl, end, t1);
          const p2 = this.quadraticBezierPoint(start, ctrl, end, t2);
          if (this.distanceToSegment(point, p1, p2) <= tolerance) {
            return true;
          }
        }
        currentX = cmd.x;
        currentY = cmd.y;
      } else if (cmd.type === 'A') {
        // Arc hit test (approximate with line segment for simplicity)
        const start = { x: currentX, y: currentY };
        const end = { x: cmd.x, y: cmd.y };
        if (this.distanceToSegment(point, start, end) <= tolerance) {
          return true;
        }
        currentX = cmd.x;
        currentY = cmd.y;
      } else if (cmd.type === 'Z') {
        // Close path - line from current to subpath start
        const start = { x: currentX, y: currentY };
        const end = { x: subpathStartX, y: subpathStartY };
        if (this.distanceToSegment(point, start, end) <= tolerance) {
          return true;
        }
        currentX = subpathStartX;
        currentY = subpathStartY;
      }
    }

    return false;
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
   * @param offset - The curve offset to use (curveAmount or curveOffset)
   */
  private hitTestCurve(point: Point, start: Point, end: Point, sourceNode: Node, targetNode: Node, tolerance: number, offset: number): boolean {
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
    const ctrlX = midX + perpX * offset;
    const ctrlY = midY + perpY * offset;

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

    // Path type: calculate bounds from all path commands
    if (this.lineType === 'path' && this.pathCommands.length > 0) {
      return this.getPathBounds();
    }

    // Self-loop: include control points
    if (this.isSelfLoop) {
      return this.getSelfLoopBounds(sourceNode);
    }

    // Curved edge: include control point
    const effectiveOffset = this.lineType === 'curve' && this.curveAmount !== 0
      ? this.curveAmount : this.curveOffset;
    if (effectiveOffset !== 0) {
      return this.getCurveBounds(sourceNode, targetNode, effectiveOffset);
    }

    // Straight edge: just start and end points
    const start = sourceNode.getConnectionPoint(targetNode.cx, targetNode.cy);
    const end = targetNode.getConnectionPoint(sourceNode.cx, sourceNode.cy);
    return this.pointsToBounds([start, end]);
  }

  /**
   * Calculate bounds for path type edges
   */
  private getPathBounds(): Bounds {
    const points: Point[] = [];
    for (const cmd of this.pathCommands) {
      if (cmd.type === 'M' || cmd.type === 'L') {
        points.push({ x: cmd.x, y: cmd.y });
      } else if (cmd.type === 'C') {
        points.push({ x: cmd.cp1x, y: cmd.cp1y });
        points.push({ x: cmd.cp2x, y: cmd.cp2y });
        points.push({ x: cmd.x, y: cmd.y });
      } else if (cmd.type === 'Q') {
        points.push({ x: cmd.cpx, y: cmd.cpy });
        points.push({ x: cmd.x, y: cmd.y });
      } else if (cmd.type === 'A') {
        points.push({ x: cmd.x, y: cmd.y });
      }
    }
    return this.pointsToBounds(points);
  }

  /**
   * Calculate bounds for self-loop edges
   */
  private getSelfLoopBounds(node: Node): Bounds {
    const angle = this.selfLoopAngle;
    const loopSize = Math.max(node.rx, node.ry) * 1.5;
    const startAngle = angle - Math.PI / 6;
    const endAngle = angle + Math.PI / 6;

    const points: Point[] = [
      { x: node.cx + node.rx * Math.cos(startAngle), y: node.cy + node.ry * Math.sin(startAngle) },
      { x: node.cx + node.rx * Math.cos(endAngle), y: node.cy + node.ry * Math.sin(endAngle) },
      { x: node.cx + (node.rx + loopSize) * Math.cos(startAngle), y: node.cy + (node.ry + loopSize) * Math.sin(startAngle) },
      { x: node.cx + (node.rx + loopSize) * Math.cos(endAngle), y: node.cy + (node.ry + loopSize) * Math.sin(endAngle) }
    ];
    return this.pointsToBounds(points);
  }

  /**
   * Calculate bounds for curved edges
   */
  private getCurveBounds(sourceNode: Node, targetNode: Node, offset: number): Bounds {
    const start = sourceNode.getConnectionPoint(targetNode.cx, targetNode.cy);
    const end = targetNode.getConnectionPoint(sourceNode.cx, sourceNode.cy);
    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2;
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) return this.pointsToBounds([start, end]);

    const perpX = -dy / len;
    const perpY = dx / len;
    const ctrl = { x: midX + perpX * offset, y: midY + perpY * offset };
    return this.pointsToBounds([start, end, ctrl]);
  }

  /**
   * Convert an array of points to a bounding box
   */
  private pointsToBounds(points: Point[]): Bounds {
    if (points.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of points) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
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
    const data: EdgeData = {
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
      label: this.label,
      lineType: this.lineType,
      curveAmount: this.curveAmount,
      pathCommands: this.pathCommands.length > 0 ? this.pathCommands.map(cmd => ({ ...cmd })) : undefined,
      sourceConnectionAngle: this.sourceConnectionAngle,
      targetConnectionAngle: this.targetConnectionAngle
    };

    // Include labelPlacement if not default
    const lp = this.labelPlacement;
    if (lp.pos !== 'auto' || lp.side !== 'above' || lp.sloped || lp.distance !== 5) {
      data.labelPlacement = { ...lp };
    }

    return data;
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
      this.label,
      this.lineType,
      this.curveAmount,
      this.pathCommands.length > 0 ? this.pathCommands.map(cmd => ({ ...cmd })) : [],
      this.sourceConnectionAngle,
      this.targetConnectionAngle,
      { ...this.labelPlacement }
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

  /**
   * Set resolved auto placement values (called by AutoEdgeLabelPlacementManager)
   */
  setResolvedAutoPlacement(pos: number, side: EdgeLabelSide, distance: number): void {
    this.resolvedLabelPos = pos;
    this.resolvedLabelSide = side;
    this.resolvedLabelDistance = distance;
    this.updateElement();
  }

  /**
   * Get resolved auto placement values
   */
  getResolvedAutoPlacement(): { pos: number; side: EdgeLabelSide; distance: number } {
    return {
      pos: this.resolvedLabelPos,
      side: this.resolvedLabelSide,
      distance: this.resolvedLabelDistance
    };
  }

  /**
   * Get the label's bounding box (for overlap detection)
   * Returns null if label is empty or not rendered
   */
  getLabelBounds(): Bounds | null {
    if (!this.label || !this.labelElement) {
      return null;
    }

    try {
      const bbox = this.labelElement.getBBox();
      return {
        x: bbox.x,
        y: bbox.y,
        width: bbox.width,
        height: bbox.height
      };
    } catch (e) {
      // getBBox may fail if element is not in DOM
      return null;
    }
  }

  /**
   * Set the line type
   */
  setLineType(lineType: EdgeLineType): void {
    // Self-loops cannot be straight
    if (this.isSelfLoop && lineType === 'straight') {
      console.warn('Self-loop edges cannot use straight line type');
      return;
    }
    this.lineType = lineType;

    // Initialize pathCommands when switching to path type
    if (lineType === 'path' && this.pathCommands.length === 0) {
      this.initializePathFromCurrentGeometry();
    }

    this.updateElement();
  }

  /**
   * Set the curve amount for 'curve' line type
   */
  setCurveAmount(amount: number): void {
    this.curveAmount = amount;
    if (this.lineType === 'curve') {
      this.updateElement();
    }
  }

  /**
   * Set the path commands for 'path' line type
   */
  setPathCommands(commands: PathCommand[]): void {
    this.pathCommands = [...commands];
    if (this.lineType === 'path') {
      this.updateElement();
    }
  }

  /**
   * Get anchor points from pathCommands (for handle display)
   */
  getAnchorPoints(): Point[] {
    const anchors: Point[] = [];
    for (const cmd of this.pathCommands) {
      if (cmd.type !== 'Z') {
        anchors.push({ x: cmd.x, y: cmd.y });
      }
    }
    return anchors;
  }

  /**
   * Set anchor point at given index
   */
  setAnchorPoint(anchorIndex: number, point: Point): void {
    let currentAnchor = 0;
    for (let i = 0; i < this.pathCommands.length; i++) {
      const cmd = this.pathCommands[i];
      if (cmd.type !== 'Z') {
        if (currentAnchor === anchorIndex) {
          this.pathCommands[i] = { ...cmd, x: round3(point.x), y: round3(point.y) };
          this.updateElement();
          return;
        }
        currentAnchor++;
      }
    }
  }

  /**
   * Set endpoint with connection angle (for manual positioning on node boundary)
   * This stores the angle so it persists when nodes move
   * @param isStart - true for start endpoint, false for end endpoint
   * @param point - The point on the node boundary
   * @param node - The node the endpoint connects to
   */
  setEndpointWithAngle(isStart: boolean, point: Point, node: Node): void {
    // Calculate angle from node center to point
    const angle = Math.atan2(point.y - node.cy, point.x - node.cx);

    if (isStart) {
      this.sourceConnectionAngle = angle;
      // Update the M command (first command)
      if (this.pathCommands.length > 0 && this.pathCommands[0].type === 'M') {
        this.pathCommands[0] = { type: 'M', x: round3(point.x), y: round3(point.y) };
      }
    } else {
      this.targetConnectionAngle = angle;
      // Update the last command's endpoint
      const lastIdx = this.pathCommands.length - 1;
      if (lastIdx >= 0) {
        const lastCmd = this.pathCommands[lastIdx];
        if (lastCmd.type === 'L') {
          this.pathCommands[lastIdx] = { type: 'L', x: round3(point.x), y: round3(point.y) };
        } else if (lastCmd.type === 'C') {
          this.pathCommands[lastIdx] = { ...lastCmd, x: round3(point.x), y: round3(point.y) };
        } else if (lastCmd.type === 'Q') {
          this.pathCommands[lastIdx] = { ...lastCmd, x: round3(point.x), y: round3(point.y) };
        }
      }
    }

    this.updateElement();
  }

  /**
   * Reset connection angle to auto mode
   * @param isStart - true for start endpoint, false for end endpoint
   */
  resetConnectionAngle(isStart: boolean): void {
    if (isStart) {
      this.sourceConnectionAngle = null;
    } else {
      this.targetConnectionAngle = null;
    }
    this.updateElement();
  }

  /**
   * Set control point for a command
   * @param cmdIndex - Command index
   * @param cpIndex - Control point index (0 = cp1/cpx, 1 = cp2 for cubic)
   * @param point - New control point position
   */
  setControlPoint(cmdIndex: number, cpIndex: 0 | 1, point: Point): void {
    const cmd = this.pathCommands[cmdIndex];
    if (!cmd) return;

    if (cmd.type === 'C') {
      if (cpIndex === 0) {
        this.pathCommands[cmdIndex] = { ...cmd, cp1x: round3(point.x), cp1y: round3(point.y) };
      } else {
        this.pathCommands[cmdIndex] = { ...cmd, cp2x: round3(point.x), cp2y: round3(point.y) };
      }
    } else if (cmd.type === 'Q') {
      this.pathCommands[cmdIndex] = { ...cmd, cpx: round3(point.x), cpy: round3(point.y) };
    }

    this.updateElement();
  }

  /**
   * Get start point for a command (endpoint of previous command)
   */
  getCommandStart(cmdIndex: number): Point {
    if (cmdIndex === 0) {
      return { x: 0, y: 0 };
    }
    const prevCmd = this.pathCommands[cmdIndex - 1];
    if (prevCmd) {
      if (prevCmd.type === 'Z') {
        // After Z, find the most recent M (subpath start)
        for (let i = cmdIndex - 2; i >= 0; i--) {
          const cmd = this.pathCommands[i];
          if (cmd.type === 'M') {
            return { x: cmd.x, y: cmd.y };
          }
        }
        return { x: 0, y: 0 };
      }
      // For all other commands (M, L, C, Q, A), return their endpoint
      return { x: prevCmd.x, y: prevCmd.y };
    }
    return { x: 0, y: 0 };
  }

  /**
   * Insert a new command at the specified index
   */
  insertCommand(index: number, command: PathCommand): void {
    this.pathCommands.splice(index, 0, command);
    this.updateElement();
  }

  /**
   * Replace a command at the specified index
   */
  replaceCommand(index: number, command: PathCommand): void {
    if (index >= 0 && index < this.pathCommands.length) {
      this.pathCommands[index] = command;
      this.updateElement();
    }
  }

  /**
   * Remove a command at the specified index
   * Returns the removed command for undo purposes
   */
  removeCommand(index: number): PathCommand | null {
    if (index >= 0 && index < this.pathCommands.length) {
      const removed = this.pathCommands.splice(index, 1)[0];
      this.updateElement();
      return removed;
    }
    return null;
  }

  /**
   * Check if removing a command at index would leave the path valid
   * For Edge, we need at least M + one segment (2 commands minimum)
   */
  canRemoveCommand(index: number): boolean {
    // Cannot remove M command (index 0)
    if (index === 0) return false;

    // Cannot remove if it would leave less than M + one segment
    if (this.pathCommands.length <= 2) return false;

    // Cannot remove Z command
    const cmd = this.pathCommands[index];
    if (cmd && cmd.type === 'Z') return false;

    return true;
  }

  /**
   * Get the number of commands
   */
  getCommandCount(): number {
    return this.pathCommands.length;
  }

  /**
   * Get command at index
   */
  getCommand(index: number): PathCommand | null {
    return this.pathCommands[index] || null;
  }

  /**
   * Initialize path commands from current edge geometry
   * Used when converting from straight/curve to path type
   */
  initializePathFromCurrentGeometry(): void {
    const gm = getGraphManager();
    const sourceNode = gm.getNodeShape(this.sourceNodeId);
    const targetNode = gm.getNodeShape(this.targetNodeId);

    if (!sourceNode || !targetNode) return;

    if (this.isSelfLoop) {
      // Generate path commands from self-loop
      const angle = this.selfLoopAngle;
      const loopSize = Math.max(sourceNode.rx, sourceNode.ry) * 1.5;
      const startAngle = angle - Math.PI / 6;
      const endAngle = angle + Math.PI / 6;

      const startX = round3(sourceNode.cx + sourceNode.rx * Math.cos(startAngle));
      const startY = round3(sourceNode.cy + sourceNode.ry * Math.sin(startAngle));
      const endX = round3(sourceNode.cx + sourceNode.rx * Math.cos(endAngle));
      const endY = round3(sourceNode.cy + sourceNode.ry * Math.sin(endAngle));
      const ctrl1X = round3(sourceNode.cx + (sourceNode.rx + loopSize) * Math.cos(startAngle));
      const ctrl1Y = round3(sourceNode.cy + (sourceNode.ry + loopSize) * Math.sin(startAngle));
      const ctrl2X = round3(sourceNode.cx + (sourceNode.rx + loopSize) * Math.cos(endAngle));
      const ctrl2Y = round3(sourceNode.cy + (sourceNode.ry + loopSize) * Math.sin(endAngle));

      this.pathCommands = [
        { type: 'M', x: startX, y: startY },
        { type: 'C', cp1x: ctrl1X, cp1y: ctrl1Y, cp2x: ctrl2X, cp2y: ctrl2Y, x: endX, y: endY }
      ];
    } else if (this.lineType === 'curve' || this.curveAmount !== 0 || this.curveOffset !== 0) {
      // Generate path commands from curve
      const start = sourceNode.getConnectionPoint(targetNode.cx, targetNode.cy);
      const end = targetNode.getConnectionPoint(sourceNode.cx, sourceNode.cy);
      const offset = this.curveAmount !== 0 ? this.curveAmount : this.curveOffset;

      const midX = (start.x + end.x) / 2;
      const midY = (start.y + end.y) / 2;
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const len = Math.sqrt(dx * dx + dy * dy);

      if (len > 0 && offset !== 0) {
        const perpX = -dy / len;
        const perpY = dx / len;
        const ctrlX = round3(midX + perpX * offset);
        const ctrlY = round3(midY + perpY * offset);
        const newStart = sourceNode.getConnectionPoint(ctrlX, ctrlY);
        const newEnd = targetNode.getConnectionPoint(ctrlX, ctrlY);

        this.pathCommands = [
          { type: 'M', x: round3(newStart.x), y: round3(newStart.y) },
          { type: 'Q', cpx: ctrlX, cpy: ctrlY, x: round3(newEnd.x), y: round3(newEnd.y) }
        ];
      } else {
        // No offset - create Q command with control point at midpoint (for editing)
        this.pathCommands = [
          { type: 'M', x: round3(start.x), y: round3(start.y) },
          { type: 'Q', cpx: round3(midX), cpy: round3(midY), x: round3(end.x), y: round3(end.y) }
        ];
      }
    } else {
      // Generate path commands from straight line as Q command (for editing with control point)
      const start = sourceNode.getConnectionPoint(targetNode.cx, targetNode.cy);
      const end = targetNode.getConnectionPoint(sourceNode.cx, sourceNode.cy);
      const midX = round3((start.x + end.x) / 2);
      const midY = round3((start.y + end.y) / 2);

      this.pathCommands = [
        { type: 'M', x: round3(start.x), y: round3(start.y) },
        { type: 'Q', cpx: midX, cpy: midY, x: round3(end.x), y: round3(end.y) }
      ];
    }
  }
}
