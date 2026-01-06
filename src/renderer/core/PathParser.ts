import { PathCommand } from '../../shared/types';

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
        // Arc - convert to line approximation (simplified)
        console.warn('PathParser: Arc (A) command is not fully supported, converting to line');
        while (i + 6 < tokens.length && typeof tokens[i] === 'number') {
          // Skip arc parameters: rx, ry, x-axis-rotation, large-arc-flag, sweep-flag
          let x = tokens[i + 5] as number;
          let y = tokens[i + 6] as number;
          i += 7;

          if (isRelative) {
            x += currentX;
            y += currentY;
          }

          // Simplified: just draw a line to the endpoint
          commands.push({ type: 'L', x, y });
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

  for (const cmd of commands) {
    switch (cmd.type) {
      case 'M':
      case 'L':
        points.push({ x: cmd.x, y: cmd.y });
        break;
      case 'C':
        points.push({ x: cmd.cp1x, y: cmd.cp1y });
        points.push({ x: cmd.cp2x, y: cmd.cp2y });
        points.push({ x: cmd.x, y: cmd.y });
        break;
      case 'Q':
        points.push({ x: cmd.cpx, y: cmd.cpy });
        points.push({ x: cmd.x, y: cmd.y });
        break;
      // Z has no additional points
    }
  }

  return points;
}
