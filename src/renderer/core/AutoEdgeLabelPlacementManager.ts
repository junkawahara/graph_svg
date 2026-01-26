/**
 * Auto edge label placement manager
 * Calculates optimal label positions to avoid overlaps with other objects
 */

import { Bounds, EdgeLabelSide, EdgeLabelPlacement, Point, PathCommand } from '../../shared/types';
import { Shape } from '../shapes/Shape';
import { Node } from '../shapes/Node';
import { Edge } from '../shapes/Edge';
import { getGraphManager } from './GraphManager';
import { round3 } from './MathUtils';

/**
 * Result of auto edge label placement calculation
 */
export interface AutoEdgePlacementResult {
  pos: number;           // 0-1 position along edge
  side: EdgeLabelSide;   // 'above' | 'below'
  distance: number;      // Distance from edge in px
  overlapCount: number;  // Number of overlapping objects
}

/**
 * Interface for canvas operations needed by the manager
 */
export interface CanvasInterface {
  getShapes(): Shape[];
}

/**
 * Manager for auto label placement of edges
 */
class AutoEdgeLabelPlacementManager {
  private canvas: CanvasInterface | null = null;
  private recalculationScheduled = false;

  // Trial positions along the edge (center to ends)
  private readonly POS_TRIALS = [0.5, 0.4, 0.6, 0.3, 0.7, 0.25, 0.75];
  // Trial sides
  private readonly SIDE_TRIALS: EdgeLabelSide[] = ['above', 'below'];
  // Distance increments (added to base distance)
  private readonly DISTANCE_INCREMENTS = [0, 3, 6, 9];

  /**
   * Set the canvas reference
   */
  setCanvas(canvas: CanvasInterface): void {
    this.canvas = canvas;
  }

  /**
   * Schedule a recalculation (debounced to avoid multiple rapid calls)
   */
  scheduleRecalculation(): void {
    if (this.recalculationScheduled || !this.canvas) return;

    this.recalculationScheduled = true;
    requestAnimationFrame(() => {
      this.performRecalculation();
      this.recalculationScheduled = false;
    });
  }

  /**
   * Force immediate recalculation
   */
  recalculateNow(): void {
    if (!this.canvas) return;
    this.performRecalculation();
  }

  /**
   * Calculate the optimal auto placement for a single edge
   */
  calculateAutoPlacement(edge: Edge, allShapes: Shape[]): AutoEdgePlacementResult {
    const obstacles = this.getAllObstacleBounds(allShapes, edge);
    const baseDistance = edge.labelPlacement.distance;

    let best: AutoEdgePlacementResult = {
      pos: 0.5,
      side: 'above',
      distance: baseDistance,
      overlapCount: Infinity
    };

    // Triple nested loop: pos → side → distance
    for (const pos of this.POS_TRIALS) {
      for (const side of this.SIDE_TRIALS) {
        for (const distIncrement of this.DISTANCE_INCREMENTS) {
          const dist = baseDistance + distIncrement;
          const bounds = this.getLabelBoundsAtPosition(edge, pos, side, dist);
          if (!bounds) continue;

          const count = this.checkOverlaps(bounds, obstacles);
          if (count === 0) {
            return { pos, side, distance: dist, overlapCount: 0 };
          }
          if (count < best.overlapCount) {
            best = { pos, side, distance: dist, overlapCount: count };
          }
        }
      }
    }

    return best;
  }

  /**
   * Perform recalculation for all auto-placed edges
   */
  private performRecalculation(): void {
    if (!this.canvas) return;

    const shapes = this.canvas.getShapes();

    // Filter to edges with auto placement and label, sorted by ID for deterministic order
    const autoEdges = shapes
      .filter((s): s is Edge => s instanceof Edge)
      .filter(e => e.label && e.labelPlacement.pos === 'auto')
      .sort((a, b) => a.id.localeCompare(b.id));

    // Calculate and apply optimal placement for each edge
    for (const edge of autoEdges) {
      const result = this.calculateAutoPlacement(edge, shapes);
      edge.setResolvedAutoPlacement(result.pos, result.side, result.distance);
    }
  }

  /**
   * Get all obstacle bounds (things the label should not overlap)
   */
  private getAllObstacleBounds(allShapes: Shape[], excludeEdge: Edge): Bounds[] {
    const obstacles: Bounds[] = [];

    for (const shape of allShapes) {
      if (shape instanceof Node) {
        // Add node's ellipse bounds
        obstacles.push({
          x: shape.cx - shape.rx,
          y: shape.cy - shape.ry,
          width: shape.rx * 2,
          height: shape.ry * 2
        });

        // Add node's label bounds
        const labelBounds = shape.getLabelBounds();
        if (labelBounds) {
          obstacles.push(labelBounds);
        }
      } else if (shape instanceof Edge) {
        // Add edge's bounds (line or curve)
        const edgeBounds = shape.getBounds();
        obstacles.push(edgeBounds);

        // Add edge's label bounds (if not the edge we're placing)
        if (shape !== excludeEdge) {
          const labelBounds = shape.getLabelBounds();
          if (labelBounds) {
            obstacles.push(labelBounds);
          }
        }
      } else {
        // Add general shape bounds
        obstacles.push(shape.getBounds());
      }
    }

    return obstacles;
  }

  /**
   * Get label bounds at a specific position
   */
  private getLabelBoundsAtPosition(
    edge: Edge,
    pos: number,
    side: EdgeLabelSide,
    distance: number
  ): Bounds | null {
    const gm = getGraphManager();
    const sourceNode = gm.getNodeShape(edge.sourceNodeId);
    const targetNode = gm.getNodeShape(edge.targetNodeId);

    if (!sourceNode || !targetNode || !edge.label) return null;

    // Create temporary placement for calculation
    const tempPlacement: EdgeLabelPlacement = {
      pos,
      side,
      sloped: edge.labelPlacement.sloped,
      distance
    };

    // Calculate label position using edge's internal calculation
    const labelPos = this.calculateLabelPositionWithPlacement(edge, sourceNode, targetNode, tempPlacement);
    if (!labelPos) return null;

    // Estimate label dimensions
    const labelWidth = this.estimateLabelWidth(edge.label);
    const labelHeight = 12 * 1.2; // Font size 12 * line height factor

    // Adjust for center anchor
    const x = labelPos.x - labelWidth / 2;
    const y = labelPos.y - labelHeight / 2;

    return {
      x,
      y,
      width: labelWidth,
      height: labelHeight
    };
  }

  /**
   * Calculate label position with given placement
   * Adapted from Edge.calculateLabelPosition but with custom placement
   */
  private calculateLabelPositionWithPlacement(
    edge: Edge,
    sourceNode: Node,
    targetNode: Node,
    placement: EdgeLabelPlacement
  ): Point | null {
    // Handle self-loop
    if (edge.isSelfLoop) {
      return this.calculateSelfLoopLabelPosition(edge, sourceNode, placement);
    }

    // Handle path type with pathCommands
    if (edge.lineType === 'path' && edge.pathCommands.length >= 2) {
      return this.calculatePathLabelPosition(edge.pathCommands, placement);
    }

    // Get start and end points
    const start = sourceNode.getConnectionPoint(targetNode.cx, targetNode.cy);
    const end = targetNode.getConnectionPoint(sourceNode.cx, sourceNode.cy);

    // Use curveAmount if set, otherwise fall back to curveOffset
    const effectiveOffset = edge.lineType === 'curve' && edge.curveAmount !== 0
      ? edge.curveAmount
      : edge.curveOffset;

    if (effectiveOffset === 0) {
      // Straight line
      return this.calculateStraightLabelPosition(start, end, placement);
    } else {
      // Curved line (quadratic bezier)
      const midX = (start.x + end.x) / 2;
      const midY = (start.y + end.y) / 2;
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const len = Math.sqrt(dx * dx + dy * dy);

      if (len === 0) {
        return { x: midX, y: midY };
      }

      const perpX = -dy / len;
      const perpY = dx / len;
      const ctrlX = midX + perpX * effectiveOffset;
      const ctrlY = midY + perpY * effectiveOffset;

      const newStart = sourceNode.getConnectionPoint(ctrlX, ctrlY);
      const newEnd = targetNode.getConnectionPoint(ctrlX, ctrlY);

      return this.calculateQuadraticLabelPosition(
        newStart,
        { x: ctrlX, y: ctrlY },
        newEnd,
        placement
      );
    }
  }

  /**
   * Calculate label position for straight line
   */
  private calculateStraightLabelPosition(
    start: Point,
    end: Point,
    placement: EdgeLabelPlacement
  ): Point {
    const t = placement.pos as number;

    // Position along the line
    const point = {
      x: start.x + (end.x - start.x) * t,
      y: start.y + (end.y - start.y) * t
    };

    // Tangent angle
    const tangentAngle = Math.atan2(end.y - start.y, end.x - start.x);

    // Perpendicular offset
    const perpAngle = placement.side === 'above' ? tangentAngle - Math.PI / 2 : tangentAngle + Math.PI / 2;
    const x = round3(point.x + Math.cos(perpAngle) * placement.distance);
    const y = round3(point.y + Math.sin(perpAngle) * placement.distance);

    return { x, y };
  }

  /**
   * Calculate label position for quadratic bezier
   */
  private calculateQuadraticLabelPosition(
    start: Point,
    control: Point,
    end: Point,
    placement: EdgeLabelPlacement
  ): Point {
    const t = placement.pos as number;
    const mt = 1 - t;

    // Position on curve
    const point = {
      x: mt * mt * start.x + 2 * mt * t * control.x + t * t * end.x,
      y: mt * mt * start.y + 2 * mt * t * control.y + t * t * end.y
    };

    // Tangent angle (derivative)
    const dx = 2 * mt * (control.x - start.x) + 2 * t * (end.x - control.x);
    const dy = 2 * mt * (control.y - start.y) + 2 * t * (end.y - control.y);
    const tangentAngle = Math.atan2(dy, dx);

    // Perpendicular offset
    const perpAngle = placement.side === 'above' ? tangentAngle - Math.PI / 2 : tangentAngle + Math.PI / 2;
    const x = round3(point.x + Math.cos(perpAngle) * placement.distance);
    const y = round3(point.y + Math.sin(perpAngle) * placement.distance);

    return { x, y };
  }

  /**
   * Calculate label position for self-loop
   */
  private calculateSelfLoopLabelPosition(
    edge: Edge,
    node: Node,
    placement: EdgeLabelPlacement
  ): Point {
    const angle = edge.selfLoopAngle;
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

    return this.calculateCubicLabelPosition(
      { x: startX, y: startY },
      ctrl1,
      ctrl2,
      { x: endX, y: endY },
      placement
    );
  }

  /**
   * Calculate label position for cubic bezier
   */
  private calculateCubicLabelPosition(
    start: Point,
    ctrl1: Point,
    ctrl2: Point,
    end: Point,
    placement: EdgeLabelPlacement
  ): Point {
    const t = placement.pos as number;
    const mt = 1 - t;

    // Position on curve
    const point = {
      x: mt * mt * mt * start.x + 3 * mt * mt * t * ctrl1.x + 3 * mt * t * t * ctrl2.x + t * t * t * end.x,
      y: mt * mt * mt * start.y + 3 * mt * mt * t * ctrl1.y + 3 * mt * t * t * ctrl2.y + t * t * t * end.y
    };

    // Tangent angle (derivative)
    const dx = 3 * mt * mt * (ctrl1.x - start.x) + 6 * mt * t * (ctrl2.x - ctrl1.x) + 3 * t * t * (end.x - ctrl2.x);
    const dy = 3 * mt * mt * (ctrl1.y - start.y) + 6 * mt * t * (ctrl2.y - ctrl1.y) + 3 * t * t * (end.y - ctrl2.y);
    const tangentAngle = Math.atan2(dy, dx);

    // Perpendicular offset
    const perpAngle = placement.side === 'above' ? tangentAngle - Math.PI / 2 : tangentAngle + Math.PI / 2;
    const x = round3(point.x + Math.cos(perpAngle) * placement.distance);
    const y = round3(point.y + Math.sin(perpAngle) * placement.distance);

    return { x, y };
  }

  /**
   * Calculate label position for path commands
   */
  private calculatePathLabelPosition(
    commands: PathCommand[],
    placement: EdgeLabelPlacement
  ): Point | null {
    if (commands.length < 2) return null;

    const t = placement.pos as number;

    // Simple approximation: assume each segment has equal weight
    const segments: { type: string; startIdx: number }[] = [];
    let currentX = 0, currentY = 0;

    for (let i = 0; i < commands.length; i++) {
      const cmd = commands[i];
      if (cmd.type === 'M') {
        currentX = cmd.x;
        currentY = cmd.y;
      } else if (cmd.type !== 'Z') {
        segments.push({ type: cmd.type, startIdx: i });
        if (cmd.type === 'L' || cmd.type === 'C' || cmd.type === 'Q' || cmd.type === 'A') {
          currentX = cmd.x;
          currentY = cmd.y;
        }
      }
    }

    if (segments.length === 0) return null;

    // Find which segment t falls into
    const segmentT = t * segments.length;
    const segmentIndex = Math.min(Math.floor(segmentT), segments.length - 1);
    const localT = segmentT - segmentIndex;

    const segmentInfo = segments[segmentIndex];
    const cmd = commands[segmentInfo.startIdx];

    // Find start point (previous command's endpoint)
    let startPoint: Point = { x: 0, y: 0 };
    for (let i = segmentInfo.startIdx - 1; i >= 0; i--) {
      const prevCmd = commands[i];
      if (prevCmd.type === 'M' || prevCmd.type === 'L' || prevCmd.type === 'C' || prevCmd.type === 'Q' || prevCmd.type === 'A') {
        startPoint = { x: prevCmd.x, y: prevCmd.y };
        break;
      }
    }

    if (cmd.type === 'L') {
      const endPoint = { x: cmd.x, y: cmd.y };
      return this.calculateStraightLabelPosition(startPoint, endPoint, {
        ...placement,
        pos: localT
      });
    }

    if (cmd.type === 'Q') {
      const ctrl = { x: cmd.cpx, y: cmd.cpy };
      const endPoint = { x: cmd.x, y: cmd.y };
      return this.calculateQuadraticLabelPosition(startPoint, ctrl, endPoint, {
        ...placement,
        pos: localT
      });
    }

    if (cmd.type === 'C') {
      const ctrl1 = { x: cmd.cp1x, y: cmd.cp1y };
      const ctrl2 = { x: cmd.cp2x, y: cmd.cp2y };
      const endPoint = { x: cmd.x, y: cmd.y };
      return this.calculateCubicLabelPosition(startPoint, ctrl1, ctrl2, endPoint, {
        ...placement,
        pos: localT
      });
    }

    // Fallback for A or other: linear interpolation
    if (cmd.type === 'A') {
      const endPoint = { x: cmd.x, y: cmd.y };
      return this.calculateStraightLabelPosition(startPoint, endPoint, {
        ...placement,
        pos: localT
      });
    }

    return null;
  }

  /**
   * Estimate label width based on text content
   */
  private estimateLabelWidth(label: string): number {
    // Approximate character width as 0.6 of font size (12)
    const charWidth = 12 * 0.6;
    return label.length * charWidth;
  }

  /**
   * Check how many obstacles overlap with the given bounds
   */
  private checkOverlaps(bounds: Bounds, obstacles: Bounds[]): number {
    let count = 0;
    for (const obs of obstacles) {
      if (this.boundsIntersect(bounds, obs)) {
        count++;
      }
    }
    return count;
  }

  /**
   * Check if two bounds intersect
   */
  private boundsIntersect(a: Bounds, b: Bounds): boolean {
    return !(
      a.x + a.width < b.x ||
      b.x + b.width < a.x ||
      a.y + a.height < b.y ||
      b.y + b.height < a.y
    );
  }
}

// Singleton instance
let instance: AutoEdgeLabelPlacementManager | null = null;

/**
 * Get the singleton AutoEdgeLabelPlacementManager instance
 */
export function getAutoEdgeLabelPlacementManager(): AutoEdgeLabelPlacementManager {
  if (!instance) {
    instance = new AutoEdgeLabelPlacementManager();
  }
  return instance;
}
