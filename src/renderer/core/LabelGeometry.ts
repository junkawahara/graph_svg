/**
 * Label positioning utilities for TikZ-style label placement
 */

import { Point, NodeLabelPosition, EdgeLabelPos, EdgeLabelSide, NodeLabelPlacement, EdgeLabelPlacement, PathCommand, DEFAULT_NODE_LABEL_PLACEMENT, DEFAULT_EDGE_LABEL_PLACEMENT } from '../../shared/types';
import { round3 } from './MathUtils';

/**
 * Text anchor values for horizontal alignment
 */
export type TextAnchorValue = 'start' | 'middle' | 'end';

/**
 * Result of node label position calculation
 */
export interface NodeLabelPositionResult {
  x: number;
  y: number;
  textAnchor: TextAnchorValue;
  dominantBaseline: string;
}

/**
 * Result of edge label position calculation
 */
export interface EdgeLabelPositionResult {
  x: number;
  y: number;
  rotation: number;  // Rotation angle in degrees
}

/**
 * Normalize angle to 0-360 range
 */
export function normalizeAngle(angle: number): number {
  while (angle < 0) angle += 360;
  while (angle >= 360) angle -= 360;
  return angle;
}

/**
 * Clamp position value to 0-1 range
 */
export function clampPos(pos: number): number {
  return Math.max(0, Math.min(1, pos));
}

/**
 * Convert EdgeLabelPos to numeric value (0-1)
 */
export function labelPosToNumber(pos: EdgeLabelPos): number {
  if (typeof pos === 'number') {
    return clampPos(pos);
  }
  switch (pos) {
    case 'auto':
    case 'midway':
      return 0.5;
    case 'near start':
      return 0.25;
    case 'near end':
      return 0.75;
    default:
      return 0.5;
  }
}

/**
 * Convert NodeLabelPosition keyword to angle in degrees
 * 0=right, 90=above, 180=left, 270=below
 */
function positionToAngle(position: NodeLabelPosition): number {
  if (typeof position === 'number') {
    return normalizeAngle(position);
  }
  switch (position) {
    case 'right': return 0;
    case 'above right': return 45;
    case 'above':
    case 'auto': return 90;
    case 'above left': return 135;
    case 'left': return 180;
    case 'below left': return 225;
    case 'below': return 270;
    case 'below right': return 315;
    default: return 90;  // Default to above
  }
}

/**
 * Calculate text-anchor based on angle
 * Uses sectors: right (315-45) = start, top/bottom (45-135, 225-315) = middle, left (135-225) = end
 */
function getTextAnchorForAngle(angleDeg: number): TextAnchorValue {
  const angle = normalizeAngle(angleDeg);
  // Right sector: -45 to 45 (315-360, 0-45)
  if (angle >= 315 || angle < 45) return 'start';
  // Top sector: 45 to 135
  if (angle >= 45 && angle < 135) return 'middle';
  // Left sector: 135 to 225
  if (angle >= 135 && angle < 225) return 'end';
  // Bottom sector: 225 to 315
  return 'middle';
}

/**
 * Calculate dominant-baseline based on angle
 */
function getDominantBaselineForAngle(angleDeg: number): string {
  const angle = normalizeAngle(angleDeg);
  // Top sector: 45 to 135 -> text below anchor (auto/hanging behavior varies)
  if (angle >= 45 && angle < 135) return 'auto';  // Text hangs below
  // Bottom sector: 225 to 315 -> text above anchor
  if (angle >= 225 && angle < 315) return 'hanging';  // Text goes up
  // Left/Right sectors: center vertically
  return 'middle';
}

/**
 * Calculate node label position
 * @param cx Node center X
 * @param cy Node center Y
 * @param rx Node X radius
 * @param ry Node Y radius
 * @param placement Label placement configuration
 * @returns Position and text alignment
 */
export function calculateNodeLabelPosition(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  placement: NodeLabelPlacement = DEFAULT_NODE_LABEL_PLACEMENT
): NodeLabelPositionResult {
  // Center position - inside the node
  if (placement.position === 'center') {
    return {
      x: cx,
      y: cy,
      textAnchor: 'middle',
      dominantBaseline: 'middle'
    };
  }

  // Calculate angle and distance
  const angleDeg = positionToAngle(placement.position);
  const angleRad = (angleDeg * Math.PI) / 180;
  const distance = placement.distance;

  // Point on ellipse boundary
  const boundaryX = rx * Math.cos(angleRad);
  const boundaryY = -ry * Math.sin(angleRad);  // Negative because SVG Y is inverted

  // Unit vector from center towards the boundary point
  const len = Math.sqrt(boundaryX * boundaryX + boundaryY * boundaryY);
  const unitX = len > 0 ? boundaryX / len : 0;
  const unitY = len > 0 ? boundaryY / len : -1;

  // Position outside the boundary
  const x = round3(cx + boundaryX + unitX * distance);
  const y = round3(cy + boundaryY + unitY * distance);

  return {
    x,
    y,
    textAnchor: getTextAnchorForAngle(angleDeg),
    dominantBaseline: getDominantBaselineForAngle(angleDeg)
  };
}

/**
 * Get point on a quadratic bezier curve at parameter t
 */
function quadraticBezierPoint(p0: Point, p1: Point, p2: Point, t: number): Point {
  const mt = 1 - t;
  return {
    x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
    y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y
  };
}

/**
 * Get point on a cubic bezier curve at parameter t
 */
function cubicBezierPoint(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const mt = 1 - t;
  return {
    x: mt * mt * mt * p0.x + 3 * mt * mt * t * p1.x + 3 * mt * t * t * p2.x + t * t * t * p3.x,
    y: mt * mt * mt * p0.y + 3 * mt * mt * t * p1.y + 3 * mt * t * t * p2.y + t * t * t * p3.y
  };
}

/**
 * Get tangent angle on a quadratic bezier curve at parameter t
 * Returns angle in degrees
 */
function quadraticBezierTangent(p0: Point, p1: Point, p2: Point, t: number): number {
  const mt = 1 - t;
  // Derivative: 2(1-t)(p1-p0) + 2t(p2-p1)
  const dx = 2 * mt * (p1.x - p0.x) + 2 * t * (p2.x - p1.x);
  const dy = 2 * mt * (p1.y - p0.y) + 2 * t * (p2.y - p1.y);
  return Math.atan2(dy, dx) * 180 / Math.PI;
}

/**
 * Get tangent angle on a cubic bezier curve at parameter t
 * Returns angle in degrees
 */
function cubicBezierTangent(p0: Point, p1: Point, p2: Point, p3: Point, t: number): number {
  const mt = 1 - t;
  // Derivative: 3(1-t)^2(p1-p0) + 6(1-t)t(p2-p1) + 3t^2(p3-p2)
  const dx = 3 * mt * mt * (p1.x - p0.x) + 6 * mt * t * (p2.x - p1.x) + 3 * t * t * (p3.x - p2.x);
  const dy = 3 * mt * mt * (p1.y - p0.y) + 6 * mt * t * (p2.y - p1.y) + 3 * t * t * (p3.y - p2.y);
  return Math.atan2(dy, dx) * 180 / Math.PI;
}

/**
 * Get tangent angle on a line
 * Returns angle in degrees
 */
function lineTangent(p0: Point, p1: Point): number {
  return Math.atan2(p1.y - p0.y, p1.x - p0.x) * 180 / Math.PI;
}

/**
 * Normalize rotation angle so text is always readable (not upside down)
 * Keeps angle in -90 to 90 range
 */
export function normalizeTextRotation(angle: number): number {
  let normalized = normalizeAngle(angle);
  // If angle is in bottom half (90-270), flip by 180 to keep text readable
  if (normalized > 90 && normalized <= 270) {
    normalized -= 180;
  }
  return normalized;
}

/**
 * Calculate perpendicular offset direction
 * @param tangentAngle Tangent angle in degrees
 * @param side 'above' or 'below'
 * @returns Perpendicular unit vector
 */
function getPerpendicularOffset(tangentAngle: number, side: EdgeLabelSide): Point {
  const angleRad = (tangentAngle * Math.PI) / 180;
  // Perpendicular is 90 degrees rotated
  const perpAngle = side === 'above' ? angleRad - Math.PI / 2 : angleRad + Math.PI / 2;
  return {
    x: Math.cos(perpAngle),
    y: Math.sin(perpAngle)
  };
}

/**
 * Calculate position and tangent angle on a path at parameter t
 */
export interface PathPointAndTangent {
  point: Point;
  tangentAngle: number;  // In degrees
}

/**
 * Get point and tangent on path commands at position t (0-1)
 * Approximates by distributing t across segments proportionally
 */
export function getPathPointAndTangent(
  commands: PathCommand[],
  t: number
): PathPointAndTangent | null {
  if (commands.length < 2) return null;

  // Simple approximation: assume each segment has equal weight
  const segments: { type: string; startIdx: number }[] = [];
  let currentX = 0, currentY = 0;
  let subpathStartX = 0, subpathStartY = 0;

  for (let i = 0; i < commands.length; i++) {
    const cmd = commands[i];
    if (cmd.type === 'M') {
      currentX = cmd.x;
      currentY = cmd.y;
      subpathStartX = cmd.x;
      subpathStartY = cmd.y;
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
    const point = {
      x: startPoint.x + (endPoint.x - startPoint.x) * localT,
      y: startPoint.y + (endPoint.y - startPoint.y) * localT
    };
    return { point, tangentAngle: lineTangent(startPoint, endPoint) };
  }

  if (cmd.type === 'Q') {
    const ctrl = { x: cmd.cpx, y: cmd.cpy };
    const endPoint = { x: cmd.x, y: cmd.y };
    return {
      point: quadraticBezierPoint(startPoint, ctrl, endPoint, localT),
      tangentAngle: quadraticBezierTangent(startPoint, ctrl, endPoint, localT)
    };
  }

  if (cmd.type === 'C') {
    const ctrl1 = { x: cmd.cp1x, y: cmd.cp1y };
    const ctrl2 = { x: cmd.cp2x, y: cmd.cp2y };
    const endPoint = { x: cmd.x, y: cmd.y };
    return {
      point: cubicBezierPoint(startPoint, ctrl1, ctrl2, endPoint, localT),
      tangentAngle: cubicBezierTangent(startPoint, ctrl1, ctrl2, endPoint, localT)
    };
  }

  // Fallback for A or other: linear interpolation
  if (cmd.type === 'A') {
    const endPoint = { x: cmd.x, y: cmd.y };
    const point = {
      x: startPoint.x + (endPoint.x - startPoint.x) * localT,
      y: startPoint.y + (endPoint.y - startPoint.y) * localT
    };
    return { point, tangentAngle: lineTangent(startPoint, endPoint) };
  }

  return null;
}

/**
 * Calculate edge label position for a straight line
 */
export function calculateStraightEdgeLabelPosition(
  start: Point,
  end: Point,
  placement: EdgeLabelPlacement = DEFAULT_EDGE_LABEL_PLACEMENT
): EdgeLabelPositionResult {
  const t = labelPosToNumber(placement.pos);

  // Position along the line
  const point = {
    x: start.x + (end.x - start.x) * t,
    y: start.y + (end.y - start.y) * t
  };

  // Tangent angle
  const tangentAngle = lineTangent(start, end);

  // Perpendicular offset
  const perpOffset = getPerpendicularOffset(tangentAngle, placement.side);
  const x = round3(point.x + perpOffset.x * placement.distance);
  const y = round3(point.y + perpOffset.y * placement.distance);

  // Rotation
  const rotation = placement.sloped ? normalizeTextRotation(tangentAngle) : 0;

  return { x, y, rotation };
}

/**
 * Calculate edge label position for a quadratic bezier curve
 */
export function calculateQuadraticEdgeLabelPosition(
  start: Point,
  control: Point,
  end: Point,
  placement: EdgeLabelPlacement = DEFAULT_EDGE_LABEL_PLACEMENT
): EdgeLabelPositionResult {
  const t = labelPosToNumber(placement.pos);

  // Position on curve
  const point = quadraticBezierPoint(start, control, end, t);

  // Tangent angle
  const tangentAngle = quadraticBezierTangent(start, control, end, t);

  // Perpendicular offset
  const perpOffset = getPerpendicularOffset(tangentAngle, placement.side);
  const x = round3(point.x + perpOffset.x * placement.distance);
  const y = round3(point.y + perpOffset.y * placement.distance);

  // Rotation
  const rotation = placement.sloped ? normalizeTextRotation(tangentAngle) : 0;

  return { x, y, rotation };
}

/**
 * Calculate edge label position for a cubic bezier curve
 */
export function calculateCubicEdgeLabelPosition(
  start: Point,
  control1: Point,
  control2: Point,
  end: Point,
  placement: EdgeLabelPlacement = DEFAULT_EDGE_LABEL_PLACEMENT
): EdgeLabelPositionResult {
  const t = labelPosToNumber(placement.pos);

  // Position on curve
  const point = cubicBezierPoint(start, control1, control2, end, t);

  // Tangent angle
  const tangentAngle = cubicBezierTangent(start, control1, control2, end, t);

  // Perpendicular offset
  const perpOffset = getPerpendicularOffset(tangentAngle, placement.side);
  const x = round3(point.x + perpOffset.x * placement.distance);
  const y = round3(point.y + perpOffset.y * placement.distance);

  // Rotation
  const rotation = placement.sloped ? normalizeTextRotation(tangentAngle) : 0;

  return { x, y, rotation };
}

/**
 * Calculate edge label position for path commands
 */
export function calculatePathEdgeLabelPosition(
  commands: PathCommand[],
  placement: EdgeLabelPlacement = DEFAULT_EDGE_LABEL_PLACEMENT
): EdgeLabelPositionResult | null {
  const t = labelPosToNumber(placement.pos);
  const result = getPathPointAndTangent(commands, t);

  if (!result) return null;

  const { point, tangentAngle } = result;

  // Perpendicular offset
  const perpOffset = getPerpendicularOffset(tangentAngle, placement.side);
  const x = round3(point.x + perpOffset.x * placement.distance);
  const y = round3(point.y + perpOffset.y * placement.distance);

  // Rotation
  const rotation = placement.sloped ? normalizeTextRotation(tangentAngle) : 0;

  return { x, y, rotation };
}
