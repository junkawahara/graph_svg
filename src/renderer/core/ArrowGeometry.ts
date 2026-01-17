import { MarkerType, PathCommand } from '../../shared/types';
import { round3 } from './MathUtils';

/**
 * Arrow geometry calculation result
 */
export interface ArrowGeometry {
  /** SVG path d attribute */
  path: string;
  /** Whether the arrow is filled (true) or stroked (false) */
  filled: boolean;
  /** Stroke width for unfilled arrows */
  strokeWidth?: number;
  /** How far back the line should be shortened */
  shortenDistance: number;
}

/**
 * Arrow shape definitions
 * Coordinates are defined with arrow pointing right (angle = 0)
 * Origin (0, 0) is at the arrow tip
 */
interface ArrowShapeDef {
  /** Whether the shape is filled or stroked */
  filled: boolean;
  /** Stroke width for unfilled shapes */
  strokeWidth?: number;
  /**
   * Get the path points for the shape
   * @param size - The arrow size (based on marker size * stroke width)
   * @returns Array of {x, y} points relative to tip at (0, 0)
   */
  getPath: (size: number) => string;
  /**
   * Get the shorten distance (how far back to pull the line endpoint)
   * @param size - The arrow size
   */
  getShortenDistance: (size: number) => number;
}

// Arrow shape definitions
const ARROW_SHAPES: Record<'arrow' | 'triangle' | 'circle' | 'diamond', ArrowShapeDef> = {
  // Open arrow: >
  arrow: {
    filled: false,
    strokeWidth: 1.5,
    getPath: (size: number) => {
      // Arrow shape: two separate lines from tip going back
      // Tip at origin, arms go back and up/down
      const armLength = size * 0.8;
      const armSpread = size * 0.5;
      // Two separate lines: center to upper-left, center to lower-left
      return `M 0 0 L ${round3(-armLength)} ${round3(-armSpread)} M 0 0 L ${round3(-armLength)} ${round3(armSpread)}`;
    },
    getShortenDistance: (size: number) => 0 // Arrow tip is at endpoint, line is not shortened
  },

  // Filled triangle: |>
  triangle: {
    filled: true,
    getPath: (size: number) => {
      // Equilateral-ish triangle pointing right
      const length = size;
      const halfWidth = size * 0.5;
      return `M 0 0 L ${round3(-length)} ${round3(-halfWidth)} L ${round3(-length)} ${round3(halfWidth)} Z`;
    },
    getShortenDistance: (size: number) => size * 0.5 // Shorten by half the triangle length
  },

  // Filled circle: o
  circle: {
    filled: true,
    getPath: (size: number) => {
      // Circle centered slightly back from the tip
      const radius = size * 0.4;
      const cx = -radius; // Center the circle so edge touches the line endpoint
      // Draw circle using cubic bezier curves (4 curves approximation)
      // Magic number for bezier circle approximation: 0.5522847498
      const k = 0.5522847498 * radius;
      return `M ${round3(cx + radius)} 0 ` +
        `C ${round3(cx + radius)} ${round3(-k)} ${round3(cx + k)} ${round3(-radius)} ${round3(cx)} ${round3(-radius)} ` +
        `C ${round3(cx - k)} ${round3(-radius)} ${round3(cx - radius)} ${round3(-k)} ${round3(cx - radius)} 0 ` +
        `C ${round3(cx - radius)} ${round3(k)} ${round3(cx - k)} ${round3(radius)} ${round3(cx)} ${round3(radius)} ` +
        `C ${round3(cx + k)} ${round3(radius)} ${round3(cx + radius)} ${round3(k)} ${round3(cx + radius)} 0 Z`;
    },
    getShortenDistance: (size: number) => size * 0.4 // Shorten by radius
  },

  // Filled diamond: <>
  diamond: {
    filled: true,
    getPath: (size: number) => {
      // Diamond shape centered at tip
      const halfLength = size * 0.5;
      const halfWidth = size * 0.35;
      return `M 0 0 L ${round3(-halfLength)} ${round3(-halfWidth)} L ${round3(-size)} 0 L ${round3(-halfLength)} ${round3(halfWidth)} Z`;
    },
    getShortenDistance: (size: number) => size * 0.5 // Shorten by half
  }
};

// Size multipliers (same as MarkerManager)
const BASE_SIZES: Record<string, number> = {
  small: 3,
  medium: 4,
  large: 6
};

// Arrow-specific sizes (2x larger for visibility)
const ARROW_SPECIFIC_SIZES: Record<string, number> = {
  small: 6,
  medium: 8,
  large: 12
};

/**
 * Parse marker type into shape and size
 */
function parseMarkerType(type: MarkerType): { shape: 'arrow' | 'triangle' | 'circle' | 'diamond'; size: 'small' | 'medium' | 'large' } | null {
  if (type === 'none') return null;

  const match = type.match(/^(arrow|triangle|circle|diamond)-(small|medium|large)$/);
  if (!match) return null;

  return {
    shape: match[1] as 'arrow' | 'triangle' | 'circle' | 'diamond',
    size: match[2] as 'small' | 'medium' | 'large'
  };
}

/**
 * Get the actual arrow size based on marker type and stroke width
 */
function getArrowSize(type: MarkerType, strokeWidth: number): number {
  const parsed = parseMarkerType(type);
  if (!parsed) return 0;

  const sizeMultiplier = parsed.shape === 'arrow'
    ? ARROW_SPECIFIC_SIZES[parsed.size]
    : BASE_SIZES[parsed.size];

  return sizeMultiplier * strokeWidth;
}

/**
 * Transform a point by rotating and translating
 */
function transformPoint(x: number, y: number, cos: number, sin: number, tx: number, ty: number): { x: number; y: number } {
  return {
    x: x * cos - y * sin + tx,
    y: x * sin + y * cos + ty
  };
}

/**
 * Transform a path string by rotating and translating
 * Supports M, L, C, Q, Z commands
 * @param pathD - Original path d attribute
 * @param angle - Rotation angle in radians
 * @param tx - Translation x
 * @param ty - Translation y
 */
function transformPath(pathD: string, angle: number, tx: number, ty: number): string {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  const result: string[] = [];

  // Tokenize the path: split into commands and numbers
  const tokens = pathD.match(/[MLCQZ]|[-\d.]+/gi) || [];
  let i = 0;

  while (i < tokens.length) {
    const cmd = tokens[i];

    if (cmd.toUpperCase() === 'M' || cmd.toUpperCase() === 'L') {
      // M x y or L x y
      const x = parseFloat(tokens[++i] || '0');
      const y = parseFloat(tokens[++i] || '0');
      const p = transformPoint(x, y, cos, sin, tx, ty);
      result.push(`${cmd} ${round3(p.x)} ${round3(p.y)}`);
    } else if (cmd.toUpperCase() === 'C') {
      // C x1 y1 x2 y2 x y (cubic bezier)
      const x1 = parseFloat(tokens[++i] || '0');
      const y1 = parseFloat(tokens[++i] || '0');
      const x2 = parseFloat(tokens[++i] || '0');
      const y2 = parseFloat(tokens[++i] || '0');
      const x = parseFloat(tokens[++i] || '0');
      const y = parseFloat(tokens[++i] || '0');
      const p1 = transformPoint(x1, y1, cos, sin, tx, ty);
      const p2 = transformPoint(x2, y2, cos, sin, tx, ty);
      const p = transformPoint(x, y, cos, sin, tx, ty);
      result.push(`C ${round3(p1.x)} ${round3(p1.y)} ${round3(p2.x)} ${round3(p2.y)} ${round3(p.x)} ${round3(p.y)}`);
    } else if (cmd.toUpperCase() === 'Q') {
      // Q x1 y1 x y (quadratic bezier)
      const x1 = parseFloat(tokens[++i] || '0');
      const y1 = parseFloat(tokens[++i] || '0');
      const x = parseFloat(tokens[++i] || '0');
      const y = parseFloat(tokens[++i] || '0');
      const p1 = transformPoint(x1, y1, cos, sin, tx, ty);
      const p = transformPoint(x, y, cos, sin, tx, ty);
      result.push(`Q ${round3(p1.x)} ${round3(p1.y)} ${round3(p.x)} ${round3(p.y)}`);
    } else if (cmd.toUpperCase() === 'Z') {
      result.push('Z');
    }

    i++;
  }

  return result.join(' ');
}

/**
 * Calculate arrow geometry for a line endpoint
 * @param x - Endpoint x coordinate
 * @param y - Endpoint y coordinate
 * @param angle - Direction angle in radians (0 = pointing right)
 * @param type - Marker type
 * @param strokeWidth - Line stroke width
 * @param position - 'start' or 'end'
 */
export function calculateArrowGeometry(
  x: number,
  y: number,
  angle: number,
  type: MarkerType,
  strokeWidth: number,
  position: 'start' | 'end'
): ArrowGeometry | null {
  if (type === 'none') return null;

  const parsed = parseMarkerType(type);
  if (!parsed) return null;

  const shapeDef = ARROW_SHAPES[parsed.shape];
  const arrowSize = getArrowSize(type, strokeWidth);

  // Get base path
  const basePath = shapeDef.getPath(arrowSize);

  // angle already contains the correct direction from getLineDirection()
  // No need to flip for start position here
  const transformedPath = transformPath(basePath, angle, x, y);

  return {
    path: transformedPath,
    filled: shapeDef.filled,
    strokeWidth: shapeDef.strokeWidth,
    shortenDistance: shapeDef.getShortenDistance(arrowSize)
  };
}

/**
 * Calculate the direction angle for a line endpoint
 * @param x1 - Start point x
 * @param y1 - Start point y
 * @param x2 - End point x
 * @param y2 - End point y
 * @param position - 'start' or 'end'
 * @returns Angle in radians (0 = pointing right, positive = clockwise)
 */
export function getLineDirection(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  position: 'start' | 'end'
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;

  // Angle from start to end
  const angle = Math.atan2(dy, dx);

  // For end position, arrow points in the direction of the line
  // For start position, arrow points opposite to the line direction
  return position === 'end' ? angle : angle + Math.PI;
}

/**
 * Calculate shortened line coordinates based on arrow geometry
 * @param x1 - Original start x
 * @param y1 - Original start y
 * @param x2 - Original end x
 * @param y2 - Original end y
 * @param startShortenDist - How much to shorten from start
 * @param endShortenDist - How much to shorten from end
 * @returns Shortened coordinates
 */
export function getShortenedLineCoords(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  startShortenDist: number,
  endShortenDist: number
): { x1: number; y1: number; x2: number; y2: number } {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.sqrt(dx * dx + dy * dy);

  if (length === 0) {
    return { x1, y1, x2, y2 };
  }

  // Unit vector in line direction
  const ux = dx / length;
  const uy = dy / length;

  // Shorten from start (move start point toward end)
  const newX1 = x1 + ux * startShortenDist;
  const newY1 = y1 + uy * startShortenDist;

  // Shorten from end (move end point toward start)
  const newX2 = x2 - ux * endShortenDist;
  const newY2 = y2 - uy * endShortenDist;

  return {
    x1: round3(newX1),
    y1: round3(newY1),
    x2: round3(newX2),
    y2: round3(newY2)
  };
}

/**
 * Get the shorten distance for a marker type
 */
export function getMarkerShortenDistance(type: MarkerType, strokeWidth: number): number {
  if (type === 'none') return 0;

  const parsed = parseMarkerType(type);
  if (!parsed) return 0;

  const shapeDef = ARROW_SHAPES[parsed.shape];
  const arrowSize = getArrowSize(type, strokeWidth);

  return shapeDef.getShortenDistance(arrowSize);
}

/**
 * Get direction at path endpoint
 * @param commands - Path commands
 * @param position - 'start' or 'end'
 * @returns Object with endpoint coordinates and angle in radians
 */
export function getPathEndDirection(
  commands: PathCommand[],
  position: 'start' | 'end'
): { x: number; y: number; angle: number } | null {
  if (commands.length === 0) return { x: 0, y: 0, angle: 0 };

  if (position === 'start') {
    // For start, find the first M command and the direction from M to next command
    const firstCmd = commands[0];
    if (firstCmd.type !== 'M') return null;

    const startX = firstCmd.x;
    const startY = firstCmd.y;

    // Find direction to next point
    if (commands.length < 2) {
      return { x: startX, y: startY, angle: 0 };
    }

    const nextCmd = commands[1];
    let nextX: number, nextY: number;

    switch (nextCmd.type) {
      case 'L':
        nextX = nextCmd.x;
        nextY = nextCmd.y;
        break;
      case 'C':
        // For cubic bezier, direction is toward first control point
        nextX = nextCmd.cp1x;
        nextY = nextCmd.cp1y;
        break;
      case 'Q':
        // For quadratic bezier, direction is toward control point
        nextX = nextCmd.cpx;
        nextY = nextCmd.cpy;
        break;
      case 'A':
        // For arc, approximate with endpoint
        nextX = nextCmd.x;
        nextY = nextCmd.y;
        break;
      default:
        return { x: startX, y: startY, angle: 0 };
    }

    const angle = Math.atan2(nextY - startY, nextX - startX);
    return { x: startX, y: startY, angle: angle + Math.PI }; // Arrow points opposite to path direction
  } else {
    // For end, find the last command with coordinates
    let lastCmdWithCoords: PathCommand | null = null;
    let prevCmdWithCoords: PathCommand | null = null;

    for (let i = commands.length - 1; i >= 0; i--) {
      const cmd = commands[i];
      if (cmd.type === 'Z') continue;
      if (cmd.type === 'M' || cmd.type === 'L' || cmd.type === 'C' || cmd.type === 'Q' || cmd.type === 'A') {
        if (!lastCmdWithCoords) {
          lastCmdWithCoords = cmd;
        } else if (!prevCmdWithCoords) {
          prevCmdWithCoords = cmd;
          break;
        }
      }
    }

    if (!lastCmdWithCoords) return null;

    const endX = lastCmdWithCoords.x;
    const endY = lastCmdWithCoords.y;

    // Calculate direction based on last command type
    let fromX: number, fromY: number;

    switch (lastCmdWithCoords.type) {
      case 'C':
        // Direction from second control point to endpoint
        fromX = lastCmdWithCoords.cp2x;
        fromY = lastCmdWithCoords.cp2y;
        break;
      case 'Q':
        // Direction from control point to endpoint
        fromX = lastCmdWithCoords.cpx;
        fromY = lastCmdWithCoords.cpy;
        break;
      case 'L':
      case 'A':
      case 'M':
        // Direction from previous point to endpoint
        if (prevCmdWithCoords) {
          fromX = prevCmdWithCoords.x;
          fromY = prevCmdWithCoords.y;
        } else {
          // Only one point
          return { x: endX, y: endY, angle: 0 };
        }
        break;
      default:
        return { x: endX, y: endY, angle: 0 };
    }

    const angle = Math.atan2(endY - fromY, endX - fromX);
    return { x: endX, y: endY, angle };
  }
}

/**
 * Get shortened path commands based on marker shorten distances
 * For simplicity, this only shortens the first M->L/C/Q and last segment
 * @param commands - Original path commands
 * @param startShortenDist - Distance to shorten from start
 * @param endShortenDist - Distance to shorten from end
 * @returns Modified path commands
 */
export function getShortenedPathCommands(
  commands: PathCommand[],
  startShortenDist: number,
  endShortenDist: number
): PathCommand[] {
  if (commands.length < 2) return [...commands];

  const result: PathCommand[] = commands.map(cmd => ({ ...cmd }));

  // Shorten from start
  if (startShortenDist > 0 && result.length >= 2) {
    const firstCmd = result[0];
    const secondCmd = result[1];

    if (firstCmd.type === 'M') {
      if (secondCmd.type === 'L') {
        // Shorten the line from start
        const dx = secondCmd.x - firstCmd.x;
        const dy = secondCmd.y - firstCmd.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        if (length > startShortenDist) {
          const ratio = startShortenDist / length;
          firstCmd.x = round3(firstCmd.x + dx * ratio);
          firstCmd.y = round3(firstCmd.y + dy * ratio);
        }
      } else if (secondCmd.type === 'C') {
        // For cubic bezier, move M point along the curve tangent
        const dx = secondCmd.cp1x - firstCmd.x;
        const dy = secondCmd.cp1y - firstCmd.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        if (length > 0) {
          const ratio = Math.min(startShortenDist / length, 0.3); // Limit to 30%
          firstCmd.x = round3(firstCmd.x + dx * ratio);
          firstCmd.y = round3(firstCmd.y + dy * ratio);
        }
      } else if (secondCmd.type === 'Q') {
        // For quadratic bezier, move M point along the curve tangent
        const dx = secondCmd.cpx - firstCmd.x;
        const dy = secondCmd.cpy - firstCmd.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        if (length > 0) {
          const ratio = Math.min(startShortenDist / length, 0.3);
          firstCmd.x = round3(firstCmd.x + dx * ratio);
          firstCmd.y = round3(firstCmd.y + dy * ratio);
        }
      }
    }
  }

  // Shorten from end
  if (endShortenDist > 0) {
    // Find last command with coordinates (skip Z)
    let lastIdx = result.length - 1;
    while (lastIdx >= 0 && result[lastIdx].type === 'Z') {
      lastIdx--;
    }

    if (lastIdx >= 1) {
      const lastCmd = result[lastIdx];
      const prevCmd = result[lastIdx - 1];

      if (lastCmd.type === 'L') {
        // Shorten line to endpoint
        const firstCmd = result[0];
        const fromX = prevCmd.type === 'Z' && firstCmd.type === 'M' ? firstCmd.x : (prevCmd as any).x || 0;
        const fromY = prevCmd.type === 'Z' && firstCmd.type === 'M' ? firstCmd.y : (prevCmd as any).y || 0;
        const dx = lastCmd.x - fromX;
        const dy = lastCmd.y - fromY;
        const length = Math.sqrt(dx * dx + dy * dy);
        if (length > endShortenDist) {
          const ratio = endShortenDist / length;
          lastCmd.x = round3(lastCmd.x - dx * ratio);
          lastCmd.y = round3(lastCmd.y - dy * ratio);
        }
      } else if (lastCmd.type === 'C') {
        // For cubic bezier, shorten along the tangent from cp2 to endpoint
        const dx = lastCmd.x - lastCmd.cp2x;
        const dy = lastCmd.y - lastCmd.cp2y;
        const length = Math.sqrt(dx * dx + dy * dy);
        if (length > 0) {
          const ratio = Math.min(endShortenDist / length, 0.3);
          lastCmd.x = round3(lastCmd.x - dx * ratio);
          lastCmd.y = round3(lastCmd.y - dy * ratio);
        }
      } else if (lastCmd.type === 'Q') {
        // For quadratic bezier
        const dx = lastCmd.x - lastCmd.cpx;
        const dy = lastCmd.y - lastCmd.cpy;
        const length = Math.sqrt(dx * dx + dy * dy);
        if (length > 0) {
          const ratio = Math.min(endShortenDist / length, 0.3);
          lastCmd.x = round3(lastCmd.x - dx * ratio);
          lastCmd.y = round3(lastCmd.y - dy * ratio);
        }
      }
    }
  }

  return result;
}

// Re-export marker type info for UI (to replace MarkerManager exports)
export const ALL_MARKER_TYPES: Exclude<MarkerType, 'none'>[] = [
  'arrow-small', 'arrow-medium', 'arrow-large',
  'triangle-small', 'triangle-medium', 'triangle-large',
  'circle-small', 'circle-medium', 'circle-large',
  'diamond-small', 'diamond-medium', 'diamond-large'
];
