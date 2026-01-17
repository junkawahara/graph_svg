import { describe, it, expect } from 'vitest';
import {
  ArrowGeometry,
  calculateArrowGeometry,
  getLineDirection,
  getShortenedLineCoords,
  getMarkerShortenDistance,
  getPathEndDirection,
  getShortenedPathCommands,
  ALL_MARKER_TYPES
} from '../../../src/renderer/core/ArrowGeometry';
import { MarkerType, PathCommand } from '../../../src/shared/types';

describe('ArrowGeometry', () => {
  describe('ALL_MARKER_TYPES', () => {
    it('should contain 12 marker types', () => {
      expect(ALL_MARKER_TYPES).toHaveLength(12);
    });

    it('should not include none', () => {
      expect(ALL_MARKER_TYPES).not.toContain('none');
    });

    it('should include all shapes and sizes', () => {
      const shapes = ['arrow', 'triangle', 'circle', 'diamond'];
      const sizes = ['small', 'medium', 'large'];

      for (const shape of shapes) {
        for (const size of sizes) {
          expect(ALL_MARKER_TYPES).toContain(`${shape}-${size}`);
        }
      }
    });
  });

  describe('getLineDirection', () => {
    it('should return 0 for horizontal line pointing right (end position)', () => {
      const angle = getLineDirection(0, 0, 100, 0, 'end');
      expect(angle).toBeCloseTo(0, 5);
    });

    it('should return PI for horizontal line pointing right (start position)', () => {
      const angle = getLineDirection(0, 0, 100, 0, 'start');
      expect(angle).toBeCloseTo(Math.PI, 5);
    });

    it('should return PI/2 for vertical line pointing down (end position)', () => {
      const angle = getLineDirection(0, 0, 0, 100, 'end');
      expect(angle).toBeCloseTo(Math.PI / 2, 5);
    });

    it('should return -PI/2 for vertical line pointing up (end position)', () => {
      const angle = getLineDirection(0, 100, 0, 0, 'end');
      expect(angle).toBeCloseTo(-Math.PI / 2, 5);
    });

    it('should return PI/4 for 45-degree diagonal (end position)', () => {
      const angle = getLineDirection(0, 0, 100, 100, 'end');
      expect(angle).toBeCloseTo(Math.PI / 4, 5);
    });

    it('should return 5*PI/4 (or equivalent -3*PI/4) for 45-degree diagonal (start position)', () => {
      const angle = getLineDirection(0, 0, 100, 100, 'start');
      // angle = atan2(100, 100) + PI = PI/4 + PI = 5*PI/4
      // This is equivalent to -3*PI/4 (same direction, different representation)
      expect(angle).toBeCloseTo(5 * Math.PI / 4, 5);
    });
  });

  describe('getShortenedLineCoords', () => {
    it('should not shorten when distances are 0', () => {
      const result = getShortenedLineCoords(0, 0, 100, 0, 0, 0);
      expect(result.x1).toBe(0);
      expect(result.y1).toBe(0);
      expect(result.x2).toBe(100);
      expect(result.y2).toBe(0);
    });

    it('should shorten from start only', () => {
      const result = getShortenedLineCoords(0, 0, 100, 0, 10, 0);
      expect(result.x1).toBeCloseTo(10, 5);
      expect(result.y1).toBe(0);
      expect(result.x2).toBe(100);
      expect(result.y2).toBe(0);
    });

    it('should shorten from end only', () => {
      const result = getShortenedLineCoords(0, 0, 100, 0, 0, 10);
      expect(result.x1).toBe(0);
      expect(result.y1).toBe(0);
      expect(result.x2).toBeCloseTo(90, 5);
      expect(result.y2).toBe(0);
    });

    it('should shorten from both ends', () => {
      const result = getShortenedLineCoords(0, 0, 100, 0, 10, 20);
      expect(result.x1).toBeCloseTo(10, 5);
      expect(result.y1).toBe(0);
      expect(result.x2).toBeCloseTo(80, 5);
      expect(result.y2).toBe(0);
    });

    it('should handle diagonal lines', () => {
      // 45-degree line from (0,0) to (100,100), length = ~141.42
      const result = getShortenedLineCoords(0, 0, 100, 100, 14.142, 14.142);
      expect(result.x1).toBeCloseTo(10, 1);
      expect(result.y1).toBeCloseTo(10, 1);
      expect(result.x2).toBeCloseTo(90, 1);
      expect(result.y2).toBeCloseTo(90, 1);
    });

    it('should handle zero-length line', () => {
      const result = getShortenedLineCoords(50, 50, 50, 50, 10, 10);
      expect(result.x1).toBe(50);
      expect(result.y1).toBe(50);
      expect(result.x2).toBe(50);
      expect(result.y2).toBe(50);
    });
  });

  describe('getMarkerShortenDistance', () => {
    it('should return 0 for none marker', () => {
      expect(getMarkerShortenDistance('none', 2)).toBe(0);
    });

    it('should return 0 for arrow markers (no shortening)', () => {
      expect(getMarkerShortenDistance('arrow-small', 2)).toBe(0);
      expect(getMarkerShortenDistance('arrow-medium', 2)).toBe(0);
      expect(getMarkerShortenDistance('arrow-large', 2)).toBe(0);
    });

    it('should return positive value for triangle markers', () => {
      const dist = getMarkerShortenDistance('triangle-medium', 2);
      expect(dist).toBeGreaterThan(0);
    });

    it('should return positive value for circle markers', () => {
      const dist = getMarkerShortenDistance('circle-medium', 2);
      expect(dist).toBeGreaterThan(0);
    });

    it('should return positive value for diamond markers', () => {
      const dist = getMarkerShortenDistance('diamond-medium', 2);
      expect(dist).toBeGreaterThan(0);
    });

    it('should scale with stroke width', () => {
      const dist1 = getMarkerShortenDistance('triangle-medium', 1);
      const dist2 = getMarkerShortenDistance('triangle-medium', 2);
      expect(dist2).toBeCloseTo(dist1 * 2, 5);
    });

    it('should scale with size', () => {
      const distSmall = getMarkerShortenDistance('triangle-small', 2);
      const distMedium = getMarkerShortenDistance('triangle-medium', 2);
      const distLarge = getMarkerShortenDistance('triangle-large', 2);
      expect(distSmall).toBeLessThan(distMedium);
      expect(distMedium).toBeLessThan(distLarge);
    });
  });

  describe('calculateArrowGeometry', () => {
    it('should return null for none type', () => {
      const result = calculateArrowGeometry(100, 100, 0, 'none', 2, 'end');
      expect(result).toBeNull();
    });

    it('should return ArrowGeometry for valid marker type', () => {
      const result = calculateArrowGeometry(100, 100, 0, 'arrow-medium', 2, 'end');
      expect(result).not.toBeNull();
      expect(result!.path).toBeDefined();
      expect(typeof result!.filled).toBe('boolean');
      expect(typeof result!.shortenDistance).toBe('number');
    });

    it('should return unfilled geometry for arrow type', () => {
      const result = calculateArrowGeometry(100, 100, 0, 'arrow-medium', 2, 'end');
      expect(result!.filled).toBe(false);
      expect(result!.strokeWidth).toBeDefined();
    });

    it('should return filled geometry for triangle type', () => {
      const result = calculateArrowGeometry(100, 100, 0, 'triangle-medium', 2, 'end');
      expect(result!.filled).toBe(true);
    });

    it('should return filled geometry for circle type', () => {
      const result = calculateArrowGeometry(100, 100, 0, 'circle-medium', 2, 'end');
      expect(result!.filled).toBe(true);
    });

    it('should return filled geometry for diamond type', () => {
      const result = calculateArrowGeometry(100, 100, 0, 'diamond-medium', 2, 'end');
      expect(result!.filled).toBe(true);
    });

    it('should generate valid SVG path string', () => {
      const result = calculateArrowGeometry(100, 100, 0, 'triangle-medium', 2, 'end');
      expect(result!.path).toMatch(/^M\s/);
      expect(result!.path).toContain('L');
    });

    it('should position arrow at specified coordinates', () => {
      const result = calculateArrowGeometry(200, 150, 0, 'triangle-medium', 2, 'end');
      // The path should contain coordinates near the specified point
      expect(result!.path).toContain('200');
      expect(result!.path).toContain('150');
    });

    it('should rotate arrow based on angle', () => {
      const result0 = calculateArrowGeometry(100, 100, 0, 'triangle-medium', 2, 'end');
      const result90 = calculateArrowGeometry(100, 100, Math.PI / 2, 'triangle-medium', 2, 'end');
      // Different angles should produce different paths
      expect(result0!.path).not.toBe(result90!.path);
    });

    it('should handle start vs end position correctly', () => {
      // When using getLineDirection, start position returns angle + PI
      // So for a line from (0,0) to (100,0), end angle is 0, start angle is PI
      const resultEnd = calculateArrowGeometry(100, 100, 0, 'triangle-medium', 2, 'end');
      const resultStart = calculateArrowGeometry(100, 100, Math.PI, 'triangle-medium', 2, 'start');
      // Start and end should produce different orientations (180 degree difference)
      expect(resultEnd!.path).not.toBe(resultStart!.path);
    });

    describe('arrow shape (two separate lines)', () => {
      it('should generate path with two M commands for arrow', () => {
        const result = calculateArrowGeometry(100, 100, 0, 'arrow-medium', 2, 'end');
        // Arrow is rendered as two separate lines: M...L... M...L...
        const mCount = (result!.path.match(/M\s/g) || []).length;
        expect(mCount).toBe(2);
      });
    });

    describe('circle shape (bezier curves)', () => {
      it('should generate path with C commands for circle', () => {
        const result = calculateArrowGeometry(100, 100, 0, 'circle-medium', 2, 'end');
        // Circle is rendered as 4 cubic bezier curves
        expect(result!.path).toContain('C');
      });
    });
  });

  describe('getPathEndDirection', () => {
    it('should calculate direction for simple L command at end', () => {
      const commands: PathCommand[] = [
        { type: 'M', x: 0, y: 0 },
        { type: 'L', x: 100, y: 0 }
      ];
      const result = getPathEndDirection(commands, 'end');
      expect(result.x).toBe(100);
      expect(result.y).toBe(0);
      expect(result.angle).toBeCloseTo(0, 5);
    });

    it('should calculate direction for simple L command at start', () => {
      const commands: PathCommand[] = [
        { type: 'M', x: 0, y: 0 },
        { type: 'L', x: 100, y: 0 }
      ];
      const result = getPathEndDirection(commands, 'start');
      expect(result.x).toBe(0);
      expect(result.y).toBe(0);
      expect(result.angle).toBeCloseTo(Math.PI, 5);
    });

    it('should calculate direction for diagonal L command', () => {
      const commands: PathCommand[] = [
        { type: 'M', x: 0, y: 0 },
        { type: 'L', x: 100, y: 100 }
      ];
      const result = getPathEndDirection(commands, 'end');
      expect(result.angle).toBeCloseTo(Math.PI / 4, 5);
    });

    it('should use tangent direction for cubic bezier at end', () => {
      const commands: PathCommand[] = [
        { type: 'M', x: 0, y: 0 },
        { type: 'C', cp1x: 50, cp1y: 0, cp2x: 50, cp2y: 100, x: 100, y: 100 }
      ];
      const result = getPathEndDirection(commands, 'end')!;
      expect(result.x).toBe(100);
      expect(result.y).toBe(100);
      // Tangent at end: from control point (50, 100) to (100, 100)
      expect(result.angle).toBeCloseTo(0, 5); // Pointing right
    });

    it('should use tangent direction for quadratic bezier at end', () => {
      const commands: PathCommand[] = [
        { type: 'M', x: 0, y: 0 },
        { type: 'Q', cpx: 50, cpy: 100, x: 100, y: 0 }
      ];
      const result = getPathEndDirection(commands, 'end')!;
      expect(result.x).toBe(100);
      expect(result.y).toBe(0);
      // Tangent at end: from control point (50, 100) to (100, 0)
      const expectedAngle = Math.atan2(0 - 100, 100 - 50);
      expect(result.angle).toBeCloseTo(expectedAngle, 5);
    });

    it('should handle multiple segments', () => {
      const commands: PathCommand[] = [
        { type: 'M', x: 0, y: 0 },
        { type: 'L', x: 50, y: 0 },
        { type: 'L', x: 50, y: 50 },
        { type: 'L', x: 100, y: 50 }
      ];
      const result = getPathEndDirection(commands, 'end');
      expect(result.x).toBe(100);
      expect(result.y).toBe(50);
      expect(result.angle).toBeCloseTo(0, 5); // Last segment goes right
    });

    it('should return fallback for empty commands', () => {
      const commands: PathCommand[] = [];
      const result = getPathEndDirection(commands, 'end');
      expect(result.x).toBe(0);
      expect(result.y).toBe(0);
      expect(result.angle).toBe(0);
    });
  });

  describe('getShortenedPathCommands', () => {
    it('should not modify path when distances are 0', () => {
      const commands: PathCommand[] = [
        { type: 'M', x: 0, y: 0 },
        { type: 'L', x: 100, y: 0 }
      ];
      const result = getShortenedPathCommands(commands, 0, 0);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ type: 'M', x: 0, y: 0 });
      expect(result[1]).toEqual({ type: 'L', x: 100, y: 0 });
    });

    it('should shorten L command from end', () => {
      const commands: PathCommand[] = [
        { type: 'M', x: 0, y: 0 },
        { type: 'L', x: 100, y: 0 }
      ];
      const result = getShortenedPathCommands(commands, 0, 10);
      expect(result).toHaveLength(2);
      expect(result[1].x).toBeCloseTo(90, 5);
      expect(result[1].y).toBe(0);
    });

    it('should shorten M command from start', () => {
      const commands: PathCommand[] = [
        { type: 'M', x: 0, y: 0 },
        { type: 'L', x: 100, y: 0 }
      ];
      const result = getShortenedPathCommands(commands, 10, 0);
      expect(result).toHaveLength(2);
      expect(result[0].x).toBeCloseTo(10, 5);
      expect(result[0].y).toBe(0);
    });

    it('should shorten from both ends', () => {
      const commands: PathCommand[] = [
        { type: 'M', x: 0, y: 0 },
        { type: 'L', x: 100, y: 0 }
      ];
      const result = getShortenedPathCommands(commands, 10, 20);
      expect(result[0].x).toBeCloseTo(10, 5);
      expect(result[1].x).toBeCloseTo(80, 5);
    });

    it('should handle diagonal paths', () => {
      const commands: PathCommand[] = [
        { type: 'M', x: 0, y: 0 },
        { type: 'L', x: 100, y: 100 }
      ];
      const result = getShortenedPathCommands(commands, 0, 14.142);
      expect(result[1].x).toBeCloseTo(90, 1);
      expect(result[1].y).toBeCloseTo(90, 1);
    });

    it('should preserve Z command', () => {
      const commands: PathCommand[] = [
        { type: 'M', x: 0, y: 0 },
        { type: 'L', x: 100, y: 0 },
        { type: 'L', x: 100, y: 100 },
        { type: 'Z' }
      ];
      const result = getShortenedPathCommands(commands, 0, 0);
      expect(result[result.length - 1].type).toBe('Z');
    });

    it('should handle cubic bezier commands', () => {
      const commands: PathCommand[] = [
        { type: 'M', x: 0, y: 0 },
        { type: 'C', cp1x: 33, cp1y: 0, cp2x: 66, cp2y: 100, x: 100, y: 100 }
      ];
      const result = getShortenedPathCommands(commands, 0, 10);
      expect(result).toHaveLength(2);
      // End should be shortened along the tangent
      const cCmd = result[1] as { type: 'C', x: number, y: number };
      expect(cCmd.type).toBe('C');
    });

    it('should handle quadratic bezier commands', () => {
      const commands: PathCommand[] = [
        { type: 'M', x: 0, y: 0 },
        { type: 'Q', cpx: 50, cpy: 100, x: 100, y: 0 }
      ];
      const result = getShortenedPathCommands(commands, 0, 10);
      expect(result).toHaveLength(2);
      const qCmd = result[1] as { type: 'Q', x: number, y: number };
      expect(qCmd.type).toBe('Q');
    });
  });

  describe('integration: all marker types generate valid geometry', () => {
    const positions: ('start' | 'end')[] = ['start', 'end'];
    const angles = [0, Math.PI / 4, Math.PI / 2, Math.PI, -Math.PI / 2];

    for (const markerType of ALL_MARKER_TYPES) {
      for (const position of positions) {
        for (const angle of angles) {
          it(`should generate valid geometry for ${markerType} at ${position} with angle ${angle.toFixed(2)}`, () => {
            const result = calculateArrowGeometry(100, 100, angle, markerType, 2, position);
            expect(result).not.toBeNull();
            expect(result!.path).toBeTruthy();
            expect(result!.path.length).toBeGreaterThan(0);
            // Path should start with M command
            expect(result!.path.trim()).toMatch(/^M\s/);
          });
        }
      }
    }
  });
});
