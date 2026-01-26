/**
 * Auto label placement manager for nodes
 * Calculates optimal label positions to avoid overlaps with other objects
 */

import { Bounds } from '../../shared/types';
import { Shape } from '../shapes/Shape';
import { Node } from '../shapes/Node';
import { Edge } from '../shapes/Edge';
import {
  AUTO_LABEL_TRIAL_POSITIONS,
  AUTO_LABEL_DISTANCE_INCREMENTS,
  AUTO_LABEL_ANGLE_INCREMENT,
  positionToAngle,
  calculateLabelPositionForAngle
} from './LabelGeometry';

/**
 * Result of auto placement calculation
 */
export interface AutoPlacementResult {
  angle: number;       // Angle in degrees
  distance: number;    // Distance from node boundary
  overlapCount: number; // Number of overlapping objects
}

/**
 * Interface for canvas operations needed by the manager
 */
export interface CanvasInterface {
  getShapes(): Shape[];
}

/**
 * Manager for auto label placement of nodes
 */
class AutoLabelPlacementManager {
  private canvas: CanvasInterface | null = null;
  private recalculationScheduled = false;

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
   * Calculate the optimal auto placement for a single node
   */
  calculateAutoPlacement(node: Node, allShapes: Shape[]): AutoPlacementResult {
    const obstacles = this.getAllObstacleBounds(allShapes, node);
    const baseDistance = node.labelPlacement.distance;

    let best: AutoPlacementResult = {
      angle: 90,  // Default to 'above'
      distance: baseDistance,
      overlapCount: Infinity
    };

    // Phase 1: Try 8 directions at base distance
    for (const pos of AUTO_LABEL_TRIAL_POSITIONS) {
      const angle = positionToAngle(pos);
      const labelBounds = this.getLabelBoundsAtPosition(node, angle, baseDistance);
      const count = this.checkOverlaps(labelBounds, obstacles);

      if (count === 0) {
        return { angle, distance: baseDistance, overlapCount: 0 };
      }
      if (count < best.overlapCount) {
        best = { angle, distance: baseDistance, overlapCount: count };
      }
    }

    // Phase 2: Try 24 angles at distance + 5px
    const dist5 = baseDistance + AUTO_LABEL_DISTANCE_INCREMENTS[1];
    for (let a = 0; a < 360; a += AUTO_LABEL_ANGLE_INCREMENT) {
      const labelBounds = this.getLabelBoundsAtPosition(node, a, dist5);
      const count = this.checkOverlaps(labelBounds, obstacles);

      if (count === 0) {
        return { angle: a, distance: dist5, overlapCount: 0 };
      }
      if (count < best.overlapCount) {
        best = { angle: a, distance: dist5, overlapCount: count };
      }
    }

    // Phase 3: Try 24 angles at distance + 10px
    const dist10 = baseDistance + AUTO_LABEL_DISTANCE_INCREMENTS[2];
    for (let a = 0; a < 360; a += AUTO_LABEL_ANGLE_INCREMENT) {
      const labelBounds = this.getLabelBoundsAtPosition(node, a, dist10);
      const count = this.checkOverlaps(labelBounds, obstacles);

      if (count === 0) {
        return { angle: a, distance: dist10, overlapCount: 0 };
      }
      if (count < best.overlapCount) {
        best = { angle: a, distance: dist10, overlapCount: count };
      }
    }

    // Return best found (may have overlaps)
    return best;
  }

  /**
   * Perform recalculation for all auto-placed nodes
   */
  private performRecalculation(): void {
    if (!this.canvas) return;

    const shapes = this.canvas.getShapes();

    // Filter to nodes with auto placement, sorted by ID for deterministic order
    const autoNodes = shapes
      .filter((s): s is Node => s instanceof Node)
      .filter(n => n.labelPlacement.position === 'auto')
      .sort((a, b) => a.id.localeCompare(b.id));

    // Calculate and apply optimal placement for each node
    for (const node of autoNodes) {
      const result = this.calculateAutoPlacement(node, shapes);
      node.setResolvedAutoPosition(result.angle, result.distance);
    }
  }

  /**
   * Get all obstacle bounds (things the label should not overlap)
   */
  private getAllObstacleBounds(allShapes: Shape[], excludeNode: Node): Bounds[] {
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

        // Add node's label bounds (if not the node we're placing)
        if (shape !== excludeNode) {
          const labelBounds = shape.getLabelBounds();
          if (labelBounds) {
            obstacles.push(labelBounds);
          }
        }
      } else if (shape instanceof Edge) {
        // Add edge's bounds (line or curve)
        const edgeBounds = shape.getBounds();
        obstacles.push(edgeBounds);

        // Add edge's label bounds if present
        const labelBounds = shape.getLabelBounds();
        if (labelBounds) {
          obstacles.push(labelBounds);
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
  private getLabelBoundsAtPosition(node: Node, angle: number, distance: number): Bounds {
    // Calculate label position
    const labelPos = calculateLabelPositionForAngle(
      node.cx, node.cy, node.rx, node.ry, angle, distance
    );

    // Estimate label dimensions based on text content
    const labelWidth = this.estimateLabelWidth(node);
    const labelHeight = node.fontSize * 1.2;

    // Adjust based on text anchor
    let x = labelPos.x;
    if (labelPos.textAnchor === 'middle') {
      x -= labelWidth / 2;
    } else if (labelPos.textAnchor === 'end') {
      x -= labelWidth;
    }

    // Adjust based on dominant baseline
    let y = labelPos.y;
    if (labelPos.dominantBaseline === 'middle') {
      y -= labelHeight / 2;
    } else if (labelPos.dominantBaseline === 'hanging') {
      // y is already at top
    } else {
      // 'auto' - text hangs below
      y -= labelHeight;
    }

    return {
      x,
      y,
      width: labelWidth,
      height: labelHeight
    };
  }

  /**
   * Estimate label width based on text content and font
   */
  private estimateLabelWidth(node: Node): number {
    // Approximate character width as 0.6 of font size for most fonts
    const charWidth = node.fontSize * 0.6;
    return node.label.length * charWidth;
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
let instance: AutoLabelPlacementManager | null = null;

/**
 * Get the singleton AutoLabelPlacementManager instance
 */
export function getAutoLabelPlacementManager(): AutoLabelPlacementManager {
  if (!instance) {
    instance = new AutoLabelPlacementManager();
  }
  return instance;
}
