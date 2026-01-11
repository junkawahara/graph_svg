import { PathCommand } from '../../shared/types';
import { round3 } from './MathUtils';

/**
 * Parse SVG path d attribute and convert to normalized PathCommand array
 * All relative commands are converted to absolute coordinates
 */
export function parsePath(d: string): PathCommand[] {
  const commands: PathCommand[] = [];
  const tokens = tokenize(d);

  let currentX = 0;
  let currentY = 0;
  let startX = 0;  // Start of current subpath (for Z command)
  let startY = 0;

  let i = 0;
  while (i < tokens.length) {
    const token = tokens[i];

    if (typeof token !== 'string') {
      i++;
      continue;
    }

    const cmd = token;
    const isRelative = cmd === cmd.toLowerCase();
    const cmdUpper = cmd.toUpperCase();

    i++; // Move past command

    switch (cmdUpper) {
      case 'M': {
        // MoveTo - can have multiple coordinate pairs (subsequent become LineTo)
        let first = true;
        while (i < tokens.length && typeof tokens[i] === 'number') {
          let x = tokens[i] as number;
          let y = tokens[i + 1] as number;
          i += 2;

          if (isRelative) {
            x += currentX;
            y += currentY;
          }

          if (first) {
            commands.push({ type: 'M', x, y });
            startX = x;
            startY = y;
            first = false;
          } else {
            // Subsequent coordinates are implicit LineTo
            commands.push({ type: 'L', x, y });
          }

          currentX = x;
          currentY = y;
        }
        break;
      }

      case 'L': {
        // LineTo
        while (i < tokens.length && typeof tokens[i] === 'number') {
          let x = tokens[i] as number;
          let y = tokens[i + 1] as number;
          i += 2;

          if (isRelative) {
            x += currentX;
            y += currentY;
          }

          commands.push({ type: 'L', x, y });
          currentX = x;
          currentY = y;
        }
        break;
      }

      case 'H': {
        // Horizontal LineTo
        while (i < tokens.length && typeof tokens[i] === 'number') {
          let x = tokens[i] as number;
          i++;

          if (isRelative) {
            x += currentX;
          }

          commands.push({ type: 'L', x, y: currentY });
          currentX = x;
        }
        break;
      }

      case 'V': {
        // Vertical LineTo
        while (i < tokens.length && typeof tokens[i] === 'number') {
          let y = tokens[i] as number;
          i++;

          if (isRelative) {
            y += currentY;
          }

          commands.push({ type: 'L', x: currentX, y });
          currentY = y;
        }
        break;
      }

      case 'C': {
        // Cubic Bezier
        while (i + 5 < tokens.length && typeof tokens[i] === 'number') {
          let cp1x = tokens[i] as number;
          let cp1y = tokens[i + 1] as number;
          let cp2x = tokens[i + 2] as number;
          let cp2y = tokens[i + 3] as number;
          let x = tokens[i + 4] as number;
          let y = tokens[i + 5] as number;
          i += 6;

          if (isRelative) {
            cp1x += currentX;
            cp1y += currentY;
            cp2x += currentX;
            cp2y += currentY;
            x += currentX;
            y += currentY;
          }

          commands.push({ type: 'C', cp1x, cp1y, cp2x, cp2y, x, y });
          currentX = x;
          currentY = y;
        }
        break;
      }

      case 'S': {
        // Smooth Cubic Bezier - reflect previous control point
        while (i + 3 < tokens.length && typeof tokens[i] === 'number') {
          let cp2x = tokens[i] as number;
          let cp2y = tokens[i + 1] as number;
          let x = tokens[i + 2] as number;
          let y = tokens[i + 3] as number;
          i += 4;

          if (isRelative) {
            cp2x += currentX;
            cp2y += currentY;
            x += currentX;
            y += currentY;
          }

          // Reflect previous control point
          let cp1x = currentX;
          let cp1y = currentY;
          const prevCmd = commands[commands.length - 1];
          if (prevCmd && prevCmd.type === 'C') {
            cp1x = 2 * currentX - prevCmd.cp2x;
            cp1y = 2 * currentY - prevCmd.cp2y;
          }

          commands.push({ type: 'C', cp1x, cp1y, cp2x, cp2y, x, y });
          currentX = x;
          currentY = y;
        }
        break;
      }

      case 'Q': {
        // Quadratic Bezier
        while (i + 3 < tokens.length && typeof tokens[i] === 'number') {
          let cpx = tokens[i] as number;
          let cpy = tokens[i + 1] as number;
          let x = tokens[i + 2] as number;
          let y = tokens[i + 3] as number;
          i += 4;

          if (isRelative) {
            cpx += currentX;
            cpy += currentY;
            x += currentX;
            y += currentY;
          }

          commands.push({ type: 'Q', cpx, cpy, x, y });
          currentX = x;
          currentY = y;
        }
        break;
      }

      case 'T': {
        // Smooth Quadratic Bezier - reflect previous control point
        while (i + 1 < tokens.length && typeof tokens[i] === 'number') {
          let x = tokens[i] as number;
          let y = tokens[i + 1] as number;
          i += 2;

          if (isRelative) {
            x += currentX;
            y += currentY;
          }

          // Reflect previous control point
          let cpx = currentX;
          let cpy = currentY;
          const prevCmd = commands[commands.length - 1];
          if (prevCmd && prevCmd.type === 'Q') {
            cpx = 2 * currentX - prevCmd.cpx;
            cpy = 2 * currentY - prevCmd.cpy;
          }

          commands.push({ type: 'Q', cpx, cpy, x, y });
          currentX = x;
          currentY = y;
        }
        break;
      }

      case 'A': {
        // Arc command: rx ry x-axis-rotation large-arc-flag sweep-flag x y
        while (i + 6 < tokens.length && typeof tokens[i] === 'number') {
          const rx = Math.abs(tokens[i] as number);
          const ry = Math.abs(tokens[i + 1] as number);
          const xAxisRotation = tokens[i + 2] as number;
          const largeArcFlag = (tokens[i + 3] as number) !== 0;
          const sweepFlag = (tokens[i + 4] as number) !== 0;
          let x = tokens[i + 5] as number;
          let y = tokens[i + 6] as number;
          i += 7;

          if (isRelative) {
            x += currentX;
            y += currentY;
          }

          // If radii are 0, treat as line
          if (rx === 0 || ry === 0) {
            commands.push({ type: 'L', x, y });
          } else {
            commands.push({
              type: 'A',
              rx,
              ry,
              xAxisRotation,
              largeArcFlag,
              sweepFlag,
              x,
              y
            });
          }
          currentX = x;
          currentY = y;
        }
        break;
      }

      case 'Z': {
        commands.push({ type: 'Z' });
        currentX = startX;
        currentY = startY;
        break;
      }

      default:
        console.warn(`PathParser: Unknown command "${cmd}", skipping`);
    }
  }

  return commands;
}

/**
 * Serialize PathCommand array to SVG path d attribute string
 */
export function serializePath(commands: PathCommand[]): string {
  const parts: string[] = [];

  for (const cmd of commands) {
    switch (cmd.type) {
      case 'M':
        parts.push(`M ${round3(cmd.x)} ${round3(cmd.y)}`);
        break;
      case 'L':
        parts.push(`L ${round3(cmd.x)} ${round3(cmd.y)}`);
        break;
      case 'C':
        parts.push(`C ${round3(cmd.cp1x)} ${round3(cmd.cp1y)} ${round3(cmd.cp2x)} ${round3(cmd.cp2y)} ${round3(cmd.x)} ${round3(cmd.y)}`);
        break;
      case 'Q':
        parts.push(`Q ${round3(cmd.cpx)} ${round3(cmd.cpy)} ${round3(cmd.x)} ${round3(cmd.y)}`);
        break;
      case 'A':
        parts.push(`A ${round3(cmd.rx)} ${round3(cmd.ry)} ${round3(cmd.xAxisRotation)} ${cmd.largeArcFlag ? 1 : 0} ${cmd.sweepFlag ? 1 : 0} ${round3(cmd.x)} ${round3(cmd.y)}`);
        break;
      case 'Z':
        parts.push('Z');
        break;
    }
  }

  return parts.join(' ');
}

/**
 * Tokenize SVG path d attribute into commands and numbers
 */
function tokenize(d: string): (string | number)[] {
  const tokens: (string | number)[] = [];

  // Match command letters and numbers (including negative and decimal)
  const regex = /([MmLlHhVvCcSsQqTtAaZz])|(-?\d*\.?\d+(?:[eE][+-]?\d+)?)/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(d)) !== null) {
    if (match[1]) {
      // Command letter
      tokens.push(match[1]);
    } else if (match[2]) {
      // Number
      tokens.push(parseFloat(match[2]));
    }
  }

  return tokens;
}

/**
 * Get all points from path commands (for bounding box calculation)
 */
export function getPathPoints(commands: PathCommand[]): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];
  let currentX = 0;
  let currentY = 0;

  for (const cmd of commands) {
    switch (cmd.type) {
      case 'M':
      case 'L':
        points.push({ x: cmd.x, y: cmd.y });
        currentX = cmd.x;
        currentY = cmd.y;
        break;
      case 'C':
        points.push({ x: cmd.cp1x, y: cmd.cp1y });
        points.push({ x: cmd.cp2x, y: cmd.cp2y });
        points.push({ x: cmd.x, y: cmd.y });
        currentX = cmd.x;
        currentY = cmd.y;
        break;
      case 'Q':
        points.push({ x: cmd.cpx, y: cmd.cpy });
        points.push({ x: cmd.x, y: cmd.y });
        currentX = cmd.x;
        currentY = cmd.y;
        break;
      case 'A':
        // Sample arc points for accurate bounding box
        const arcPoints = sampleArc(currentX, currentY, cmd);
        points.push(...arcPoints);
        points.push({ x: cmd.x, y: cmd.y });
        currentX = cmd.x;
        currentY = cmd.y;
        break;
      // Z has no additional points
    }
  }

  return points;
}

/**
 * Sample points along an arc for bounding box and hit testing
 */
export function sampleArc(
  startX: number,
  startY: number,
  arc: { rx: number; ry: number; xAxisRotation: number; largeArcFlag: boolean; sweepFlag: boolean; x: number; y: number },
  numSamples: number = 16
): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];

  // Convert arc parameters to center parameterization
  const centerParams = arcEndpointToCenter(
    startX, startY,
    arc.rx, arc.ry,
    arc.xAxisRotation,
    arc.largeArcFlag,
    arc.sweepFlag,
    arc.x, arc.y
  );

  if (!centerParams) {
    // Degenerate arc, just return endpoint
    return [{ x: arc.x, y: arc.y }];
  }

  const { cx, cy, rx, ry, theta1, dTheta, phi } = centerParams;
  const cosPhi = Math.cos(phi);
  const sinPhi = Math.sin(phi);

  // Sample points along the arc
  for (let i = 1; i <= numSamples; i++) {
    const t = i / numSamples;
    const theta = theta1 + dTheta * t;
    const cosTheta = Math.cos(theta);
    const sinTheta = Math.sin(theta);

    // Point on the ellipse before rotation
    const px = rx * cosTheta;
    const py = ry * sinTheta;

    // Apply rotation and translation
    const x = cosPhi * px - sinPhi * py + cx;
    const y = sinPhi * px + cosPhi * py + cy;

    points.push({ x, y });
  }

  return points;
}

/**
 * Convert arc endpoint parameterization to center parameterization
 * Based on SVG spec: https://www.w3.org/TR/SVG/implnote.html#ArcConversionEndpointToCenter
 */
export function arcEndpointToCenter(
  x1: number, y1: number,
  rx: number, ry: number,
  xAxisRotation: number,
  largeArcFlag: boolean,
  sweepFlag: boolean,
  x2: number, y2: number
): { cx: number; cy: number; rx: number; ry: number; theta1: number; dTheta: number; phi: number } | null {
  // Convert rotation to radians
  const phi = (xAxisRotation * Math.PI) / 180;
  const cosPhi = Math.cos(phi);
  const sinPhi = Math.sin(phi);

  // Step 1: Compute (x1', y1') - transformed coordinates
  const dx = (x1 - x2) / 2;
  const dy = (y1 - y2) / 2;
  const x1p = cosPhi * dx + sinPhi * dy;
  const y1p = -sinPhi * dx + cosPhi * dy;

  // Check for degenerate case
  if (x1 === x2 && y1 === y2) {
    return null;
  }

  // Ensure radii are large enough
  let rxSq = rx * rx;
  let rySq = ry * ry;
  const x1pSq = x1p * x1p;
  const y1pSq = y1p * y1p;

  // Adjust radii if necessary (SVG spec F.6.6)
  const lambda = x1pSq / rxSq + y1pSq / rySq;
  if (lambda > 1) {
    const sqrtLambda = Math.sqrt(lambda);
    rx = sqrtLambda * rx;
    ry = sqrtLambda * ry;
    rxSq = rx * rx;
    rySq = ry * ry;
  }

  // Step 2: Compute (cx', cy')
  const sign = largeArcFlag === sweepFlag ? -1 : 1;
  let sq = (rxSq * rySq - rxSq * y1pSq - rySq * x1pSq) / (rxSq * y1pSq + rySq * x1pSq);
  sq = Math.max(0, sq); // Clamp to avoid sqrt of negative due to floating point
  const coef = sign * Math.sqrt(sq);
  const cxp = coef * (rx * y1p / ry);
  const cyp = coef * (-ry * x1p / rx);

  // Step 3: Compute (cx, cy) from (cx', cy')
  const cx = cosPhi * cxp - sinPhi * cyp + (x1 + x2) / 2;
  const cy = sinPhi * cxp + cosPhi * cyp + (y1 + y2) / 2;

  // Step 4: Compute theta1 and dTheta
  const ux = (x1p - cxp) / rx;
  const uy = (y1p - cyp) / ry;
  const vx = (-x1p - cxp) / rx;
  const vy = (-y1p - cyp) / ry;

  // Angle between (1, 0) and (ux, uy)
  const theta1 = vectorAngle(1, 0, ux, uy);

  // Angle between (ux, uy) and (vx, vy)
  let dTheta = vectorAngle(ux, uy, vx, vy);

  // Adjust dTheta based on sweep flag
  if (!sweepFlag && dTheta > 0) {
    dTheta -= 2 * Math.PI;
  } else if (sweepFlag && dTheta < 0) {
    dTheta += 2 * Math.PI;
  }

  return { cx, cy, rx, ry, theta1, dTheta, phi };
}

/**
 * Calculate angle between two vectors
 */
function vectorAngle(ux: number, uy: number, vx: number, vy: number): number {
  const dot = ux * vx + uy * vy;
  const len = Math.sqrt(ux * ux + uy * uy) * Math.sqrt(vx * vx + vy * vy);
  let angle = Math.acos(Math.max(-1, Math.min(1, dot / len)));

  // Determine sign
  if (ux * vy - uy * vx < 0) {
    angle = -angle;
  }

  return angle;
}
