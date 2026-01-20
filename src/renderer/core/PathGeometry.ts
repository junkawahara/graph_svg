/**
 * Path geometry utilities for segment detection and curve splitting
 */

import { Point, PathCommand } from '../../shared/types';
import { round3 } from './MathUtils';

/**
 * Result of segment hit detection
 */
export interface SegmentHitResult {
  commandIndex: number;  // Index of the command that defines this segment's endpoint
  t: number;             // Parameter [0,1] along the segment where hit occurred
  point: Point;          // The exact point on the segment
  segmentType: 'L' | 'C' | 'Q' | 'A';
}

/**
 * Result of splitting a cubic bezier curve
 */
export interface SplitCubicResult {
  first: {
    cp1: Point;
    cp2: Point;
    end: Point;
  };
  second: {
    cp1: Point;
    cp2: Point;
    end: Point;
  };
}

/**
 * Result of splitting a quadratic bezier curve
 */
export interface SplitQuadraticResult {
  first: {
    cp: Point;
    end: Point;
  };
  second: {
    cp: Point;
    end: Point;
  };
}

/**
 * Linear interpolation between two points
 */
function lerp(a: Point, b: Point, t: number): Point {
  return {
    x: a.x + t * (b.x - a.x),
    y: a.y + t * (b.y - a.y)
  };
}

/**
 * Calculate distance between two points
 */
function distance(a: Point, b: Point): number {
  return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
}

/**
 * Calculate point on a cubic bezier curve at parameter t
 */
export function cubicBezierPoint(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const mt3 = mt2 * mt;
  const t2 = t * t;
  const t3 = t2 * t;

  return {
    x: mt3 * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t3 * p3.x,
    y: mt3 * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t3 * p3.y
  };
}

/**
 * Calculate point on a quadratic bezier curve at parameter t
 */
export function quadraticBezierPoint(p0: Point, p1: Point, p2: Point, t: number): Point {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const t2 = t * t;

  return {
    x: mt2 * p0.x + 2 * mt * t * p1.x + t2 * p2.x,
    y: mt2 * p0.y + 2 * mt * t * p1.y + t2 * p2.y
  };
}

/**
 * Split a cubic bezier curve at parameter t using De Casteljau's algorithm
 */
export function splitCubicBezier(
  p0: Point,
  p1: Point,
  p2: Point,
  p3: Point,
  t: number
): SplitCubicResult {
  // Level 1 interpolations
  const q0 = lerp(p0, p1, t);
  const q1 = lerp(p1, p2, t);
  const q2 = lerp(p2, p3, t);

  // Level 2 interpolations
  const r0 = lerp(q0, q1, t);
  const r1 = lerp(q1, q2, t);

  // Split point
  const s = lerp(r0, r1, t);

  return {
    first: {
      cp1: { x: round3(q0.x), y: round3(q0.y) },
      cp2: { x: round3(r0.x), y: round3(r0.y) },
      end: { x: round3(s.x), y: round3(s.y) }
    },
    second: {
      cp1: { x: round3(r1.x), y: round3(r1.y) },
      cp2: { x: round3(q2.x), y: round3(q2.y) },
      end: { x: round3(p3.x), y: round3(p3.y) }
    }
  };
}

/**
 * Split a quadratic bezier curve at parameter t
 */
export function splitQuadraticBezier(
  p0: Point,
  p1: Point,
  p2: Point,
  t: number
): SplitQuadraticResult {
  // Level 1 interpolations
  const q0 = lerp(p0, p1, t);
  const q1 = lerp(p1, p2, t);

  // Split point
  const s = lerp(q0, q1, t);

  return {
    first: {
      cp: { x: round3(q0.x), y: round3(q0.y) },
      end: { x: round3(s.x), y: round3(s.y) }
    },
    second: {
      cp: { x: round3(q1.x), y: round3(q1.y) },
      end: { x: round3(p2.x), y: round3(p2.y) }
    }
  };
}

/**
 * Split a line segment at parameter t
 */
export function splitLine(start: Point, end: Point, t: number): Point {
  return {
    x: round3(start.x + t * (end.x - start.x)),
    y: round3(start.y + t * (end.y - start.y))
  };
}

/**
 * Find the closest point on a line segment to the given point
 * Returns parameter t [0,1] and distance
 */
function findClosestPointOnLine(
  point: Point,
  start: Point,
  end: Point
): { t: number; dist: number; closestPoint: Point } {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSq = dx * dx + dy * dy;

  if (lengthSq === 0) {
    return {
      t: 0,
      dist: distance(point, start),
      closestPoint: start
    };
  }

  const t = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSq));
  const closestPoint = {
    x: start.x + t * dx,
    y: start.y + t * dy
  };

  return {
    t,
    dist: distance(point, closestPoint),
    closestPoint
  };
}

/**
 * Find the closest point on a cubic bezier curve to the given point
 * Uses sampling with refinement for accuracy
 */
function findClosestPointOnCubicBezier(
  point: Point,
  p0: Point,
  p1: Point,
  p2: Point,
  p3: Point,
  samples: number = 50
): { t: number; dist: number; closestPoint: Point } {
  let minDist = Infinity;
  let bestT = 0;
  let bestPoint = p0;

  // Initial sampling
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const pt = cubicBezierPoint(p0, p1, p2, p3, t);
    const dist = distance(point, pt);

    if (dist < minDist) {
      minDist = dist;
      bestT = t;
      bestPoint = pt;
    }
  }

  // Refinement with binary search around bestT
  let low = Math.max(0, bestT - 1 / samples);
  let high = Math.min(1, bestT + 1 / samples);

  for (let iter = 0; iter < 10; iter++) {
    const mid1 = low + (high - low) / 3;
    const mid2 = low + 2 * (high - low) / 3;

    const pt1 = cubicBezierPoint(p0, p1, p2, p3, mid1);
    const pt2 = cubicBezierPoint(p0, p1, p2, p3, mid2);
    const dist1 = distance(point, pt1);
    const dist2 = distance(point, pt2);

    if (dist1 < dist2) {
      high = mid2;
      if (dist1 < minDist) {
        minDist = dist1;
        bestT = mid1;
        bestPoint = pt1;
      }
    } else {
      low = mid1;
      if (dist2 < minDist) {
        minDist = dist2;
        bestT = mid2;
        bestPoint = pt2;
      }
    }
  }

  return { t: bestT, dist: minDist, closestPoint: bestPoint };
}

/**
 * Find the closest point on a quadratic bezier curve to the given point
 */
function findClosestPointOnQuadraticBezier(
  point: Point,
  p0: Point,
  p1: Point,
  p2: Point,
  samples: number = 50
): { t: number; dist: number; closestPoint: Point } {
  let minDist = Infinity;
  let bestT = 0;
  let bestPoint = p0;

  // Initial sampling
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const pt = quadraticBezierPoint(p0, p1, p2, t);
    const dist = distance(point, pt);

    if (dist < minDist) {
      minDist = dist;
      bestT = t;
      bestPoint = pt;
    }
  }

  // Refinement
  let low = Math.max(0, bestT - 1 / samples);
  let high = Math.min(1, bestT + 1 / samples);

  for (let iter = 0; iter < 10; iter++) {
    const mid1 = low + (high - low) / 3;
    const mid2 = low + 2 * (high - low) / 3;

    const pt1 = quadraticBezierPoint(p0, p1, p2, mid1);
    const pt2 = quadraticBezierPoint(p0, p1, p2, mid2);
    const dist1 = distance(point, pt1);
    const dist2 = distance(point, pt2);

    if (dist1 < dist2) {
      high = mid2;
      if (dist1 < minDist) {
        minDist = dist1;
        bestT = mid1;
        bestPoint = pt1;
      }
    } else {
      low = mid1;
      if (dist2 < minDist) {
        minDist = dist2;
        bestT = mid2;
        bestPoint = pt2;
      }
    }
  }

  return { t: bestT, dist: minDist, closestPoint: bestPoint };
}

/**
 * Find which segment of a path was hit at the given point
 * Returns null if no segment is within tolerance
 */
export function findSegmentAt(
  commands: PathCommand[],
  point: Point,
  tolerance: number
): SegmentHitResult | null {
  let prevX = 0;
  let prevY = 0;
  let startX = 0; // Start point of current subpath (for Z command)
  let startY = 0;
  let bestResult: SegmentHitResult | null = null;
  let bestDist = tolerance;

  for (let i = 0; i < commands.length; i++) {
    const cmd = commands[i];

    switch (cmd.type) {
      case 'M':
        prevX = cmd.x;
        prevY = cmd.y;
        startX = cmd.x; // Remember subpath start for Z command
        startY = cmd.y;
        break;

      case 'L': {
        const result = findClosestPointOnLine(
          point,
          { x: prevX, y: prevY },
          { x: cmd.x, y: cmd.y }
        );
        if (result.dist < bestDist) {
          bestDist = result.dist;
          bestResult = {
            commandIndex: i,
            t: result.t,
            point: { x: round3(result.closestPoint.x), y: round3(result.closestPoint.y) },
            segmentType: 'L'
          };
        }
        prevX = cmd.x;
        prevY = cmd.y;
        break;
      }

      case 'C': {
        const result = findClosestPointOnCubicBezier(
          point,
          { x: prevX, y: prevY },
          { x: cmd.cp1x, y: cmd.cp1y },
          { x: cmd.cp2x, y: cmd.cp2y },
          { x: cmd.x, y: cmd.y }
        );
        if (result.dist < bestDist) {
          bestDist = result.dist;
          bestResult = {
            commandIndex: i,
            t: result.t,
            point: { x: round3(result.closestPoint.x), y: round3(result.closestPoint.y) },
            segmentType: 'C'
          };
        }
        prevX = cmd.x;
        prevY = cmd.y;
        break;
      }

      case 'Q': {
        const result = findClosestPointOnQuadraticBezier(
          point,
          { x: prevX, y: prevY },
          { x: cmd.cpx, y: cmd.cpy },
          { x: cmd.x, y: cmd.y }
        );
        if (result.dist < bestDist) {
          bestDist = result.dist;
          bestResult = {
            commandIndex: i,
            t: result.t,
            point: { x: round3(result.closestPoint.x), y: round3(result.closestPoint.y) },
            segmentType: 'Q'
          };
        }
        prevX = cmd.x;
        prevY = cmd.y;
        break;
      }

      case 'A':
        // For arcs, we use a simple sampling approach
        // Arc splitting is complex, so we skip A commands for now
        prevX = cmd.x;
        prevY = cmd.y;
        break;

      case 'Z': {
        // Check the closing segment back to the start of current subpath
        const result = findClosestPointOnLine(
          point,
          { x: prevX, y: prevY },
          { x: startX, y: startY }
        );
        if (result.dist < bestDist) {
          bestDist = result.dist;
          // Note: Z doesn't have its own index for insertion,
          // we treat it as a special case
          bestResult = {
            commandIndex: i,
            t: result.t,
            point: { x: round3(result.closestPoint.x), y: round3(result.closestPoint.y) },
            segmentType: 'L' // Z segment is treated as L for splitting
          };
        }
        break;
      }
    }
  }

  return bestResult;
}

/**
 * Find anchor point near the given point
 * Returns the anchor index and command index, or null if none found
 */
export function findAnchorAt(
  commands: PathCommand[],
  point: Point,
  tolerance: number
): { anchorIndex: number; commandIndex: number } | null {
  let anchorIndex = 0;

  for (let i = 0; i < commands.length; i++) {
    const cmd = commands[i];

    if (cmd.type === 'M' || cmd.type === 'L' || cmd.type === 'C' || cmd.type === 'Q' || cmd.type === 'A') {
      const dist = distance(point, { x: cmd.x, y: cmd.y });
      if (dist <= tolerance) {
        return { anchorIndex, commandIndex: i };
      }
      anchorIndex++;
    }
  }

  return null;
}

/**
 * Generate smooth control points for converting a line segment to bezier
 * when inserting a bezier point on a line
 */
export function generateSmoothControlPoints(
  start: Point,
  mid: Point,
  end: Point
): { first: { cp1: Point; cp2: Point }; second: { cp1: Point; cp2: Point } } {
  // Calculate tangent direction at midpoint (average of directions from both ends)
  const dx1 = mid.x - start.x;
  const dy1 = mid.y - start.y;
  const dx2 = end.x - mid.x;
  const dy2 = end.y - mid.y;

  const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
  const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);

  // Control point distance as fraction of segment length
  const factor = 0.33;

  return {
    first: {
      cp1: {
        x: round3(start.x + dx1 * factor),
        y: round3(start.y + dy1 * factor)
      },
      cp2: {
        x: round3(mid.x - dx1 * factor),
        y: round3(mid.y - dy1 * factor)
      }
    },
    second: {
      cp1: {
        x: round3(mid.x + dx2 * factor),
        y: round3(mid.y + dy2 * factor)
      },
      cp2: {
        x: round3(end.x - dx2 * factor),
        y: round3(end.y - dy2 * factor)
      }
    }
  };
}
