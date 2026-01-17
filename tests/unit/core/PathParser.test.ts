import { describe, it, expect } from 'vitest';
import {
  parsePath,
  serializePath,
  getPathPoints
} from '../../../src/renderer/core/PathParser';

describe('PathParser', () => {
  describe('parsePath()', () => {
    describe('MoveTo (M/m)', () => {
      it('should parse absolute MoveTo', () => {
        const result = parsePath('M 100 200');

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({ type: 'M', x: 100, y: 200 });
      });

      it('should parse relative moveTo', () => {
        const result = parsePath('M 100 100 m 50 50');

        expect(result).toHaveLength(2);
        expect(result[0]).toEqual({ type: 'M', x: 100, y: 100 });
        expect(result[1]).toEqual({ type: 'M', x: 150, y: 150 });
      });

      it('should convert subsequent M coordinates to LineTo', () => {
        const result = parsePath('M 10 20 30 40 50 60');

        expect(result).toHaveLength(3);
        expect(result[0]).toEqual({ type: 'M', x: 10, y: 20 });
        expect(result[1]).toEqual({ type: 'L', x: 30, y: 40 });
        expect(result[2]).toEqual({ type: 'L', x: 50, y: 60 });
      });
    });

    describe('LineTo (L/l)', () => {
      it('should parse absolute LineTo', () => {
        const result = parsePath('M 0 0 L 100 200');

        expect(result).toHaveLength(2);
        expect(result[1]).toEqual({ type: 'L', x: 100, y: 200 });
      });

      it('should parse relative lineTo', () => {
        const result = parsePath('M 50 50 l 30 40');

        expect(result).toHaveLength(2);
        expect(result[1]).toEqual({ type: 'L', x: 80, y: 90 });
      });

      it('should parse multiple LineTo commands', () => {
        const result = parsePath('M 0 0 L 10 10 20 20 30 30');

        expect(result).toHaveLength(4);
        expect(result[1]).toEqual({ type: 'L', x: 10, y: 10 });
        expect(result[2]).toEqual({ type: 'L', x: 20, y: 20 });
        expect(result[3]).toEqual({ type: 'L', x: 30, y: 30 });
      });
    });

    describe('Horizontal LineTo (H/h)', () => {
      it('should parse absolute Horizontal LineTo', () => {
        const result = parsePath('M 0 50 H 100');

        expect(result).toHaveLength(2);
        expect(result[1]).toEqual({ type: 'L', x: 100, y: 50 });
      });

      it('should parse relative horizontal lineTo', () => {
        const result = parsePath('M 30 50 h 20');

        expect(result).toHaveLength(2);
        expect(result[1]).toEqual({ type: 'L', x: 50, y: 50 });
      });
    });

    describe('Vertical LineTo (V/v)', () => {
      it('should parse absolute Vertical LineTo', () => {
        const result = parsePath('M 50 0 V 100');

        expect(result).toHaveLength(2);
        expect(result[1]).toEqual({ type: 'L', x: 50, y: 100 });
      });

      it('should parse relative vertical lineTo', () => {
        const result = parsePath('M 50 30 v 20');

        expect(result).toHaveLength(2);
        expect(result[1]).toEqual({ type: 'L', x: 50, y: 50 });
      });
    });

    describe('Cubic Bezier (C/c)', () => {
      it('should parse absolute Cubic Bezier', () => {
        const result = parsePath('M 0 0 C 10 20 30 40 50 60');

        expect(result).toHaveLength(2);
        expect(result[1]).toEqual({
          type: 'C',
          cp1x: 10, cp1y: 20,
          cp2x: 30, cp2y: 40,
          x: 50, y: 60
        });
      });

      it('should parse relative cubic bezier', () => {
        const result = parsePath('M 100 100 c 10 20 30 40 50 60');

        expect(result).toHaveLength(2);
        expect(result[1]).toEqual({
          type: 'C',
          cp1x: 110, cp1y: 120,
          cp2x: 130, cp2y: 140,
          x: 150, y: 160
        });
      });
    });

    describe('Smooth Cubic Bezier (S/s)', () => {
      it('should parse S after C command (reflect control point)', () => {
        const result = parsePath('M 0 0 C 10 20 30 40 50 50 S 90 80 100 100');

        expect(result).toHaveLength(3);
        // S reflects the previous cp2 (30, 40) around endpoint (50, 50)
        // Reflected cp1 = 2 * 50 - 30 = 70, 2 * 50 - 40 = 60
        expect(result[2]).toEqual({
          type: 'C',
          cp1x: 70, cp1y: 60,
          cp2x: 90, cp2y: 80,
          x: 100, y: 100
        });
      });
    });

    describe('Quadratic Bezier (Q/q)', () => {
      it('should parse absolute Quadratic Bezier', () => {
        const result = parsePath('M 0 0 Q 50 100 100 0');

        expect(result).toHaveLength(2);
        expect(result[1]).toEqual({
          type: 'Q',
          cpx: 50, cpy: 100,
          x: 100, y: 0
        });
      });

      it('should parse relative quadratic bezier', () => {
        const result = parsePath('M 100 100 q 25 50 50 0');

        expect(result).toHaveLength(2);
        expect(result[1]).toEqual({
          type: 'Q',
          cpx: 125, cpy: 150,
          x: 150, y: 100
        });
      });
    });

    describe('Smooth Quadratic Bezier (T/t)', () => {
      it('should parse T after Q command (reflect control point)', () => {
        const result = parsePath('M 0 0 Q 25 50 50 0 T 100 0');

        expect(result).toHaveLength(3);
        // T reflects the previous cp (25, 50) around endpoint (50, 0)
        // Reflected cp = 2 * 50 - 25 = 75, 2 * 0 - 50 = -50
        expect(result[2]).toEqual({
          type: 'Q',
          cpx: 75, cpy: -50,
          x: 100, y: 0
        });
      });
    });

    describe('Arc (A/a)', () => {
      it('should parse absolute Arc', () => {
        const result = parsePath('M 0 0 A 50 30 0 0 1 100 0');

        expect(result).toHaveLength(2);
        expect(result[1]).toEqual({
          type: 'A',
          rx: 50,
          ry: 30,
          xAxisRotation: 0,
          largeArcFlag: false,
          sweepFlag: true,
          x: 100,
          y: 0
        });
      });

      it('should parse relative arc', () => {
        const result = parsePath('M 50 50 a 25 25 0 1 0 50 0');

        expect(result).toHaveLength(2);
        expect(result[1]).toEqual({
          type: 'A',
          rx: 25,
          ry: 25,
          xAxisRotation: 0,
          largeArcFlag: true,
          sweepFlag: false,
          x: 100,
          y: 50
        });
      });

      it('should convert zero-radius arc to LineTo', () => {
        const result = parsePath('M 0 0 A 0 0 0 0 1 100 100');

        expect(result).toHaveLength(2);
        expect(result[1]).toEqual({ type: 'L', x: 100, y: 100 });
      });
    });

    describe('ClosePath (Z/z)', () => {
      it('should parse ClosePath', () => {
        const result = parsePath('M 0 0 L 100 0 L 100 100 Z');

        expect(result).toHaveLength(4);
        expect(result[3]).toEqual({ type: 'Z' });
      });

      it('should parse lowercase closePath', () => {
        const result = parsePath('M 0 0 L 100 0 L 100 100 z');

        expect(result).toHaveLength(4);
        expect(result[3]).toEqual({ type: 'Z' });
      });

      it('should reset current position to subpath start after Z', () => {
        const result = parsePath('M 10 20 L 100 100 Z L 50 50');

        expect(result).toHaveLength(4);
        // After Z, current position is back to (10, 20)
        // The following L 50 50 is absolute, so it's not affected
        expect(result[3]).toEqual({ type: 'L', x: 50, y: 50 });
      });
    });

    describe('mixed commands', () => {
      it('should parse complex path with multiple command types', () => {
        const result = parsePath('M 10 20 L 50 60 C 70 80 90 100 110 120 Z');

        expect(result).toHaveLength(4);
        expect(result[0].type).toBe('M');
        expect(result[1].type).toBe('L');
        expect(result[2].type).toBe('C');
        expect(result[3].type).toBe('Z');
      });

      it('should handle comma-separated values', () => {
        const result = parsePath('M10,20L50,60');

        expect(result).toHaveLength(2);
        expect(result[0]).toEqual({ type: 'M', x: 10, y: 20 });
        expect(result[1]).toEqual({ type: 'L', x: 50, y: 60 });
      });

      it('should handle negative values', () => {
        const result = parsePath('M -10 -20 L -50 -60');

        expect(result).toHaveLength(2);
        expect(result[0]).toEqual({ type: 'M', x: -10, y: -20 });
        expect(result[1]).toEqual({ type: 'L', x: -50, y: -60 });
      });

      it('should handle decimal values', () => {
        const result = parsePath('M 10.5 20.75 L 50.123 60.456');

        expect(result).toHaveLength(2);
        expect(result[0]).toEqual({ type: 'M', x: 10.5, y: 20.75 });
        expect(result[1]).toEqual({ type: 'L', x: 50.123, y: 60.456 });
      });

      it('should handle scientific notation', () => {
        const result = parsePath('M 1e2 2e-1');

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({ type: 'M', x: 100, y: 0.2 });
      });
    });
  });

  describe('serializePath()', () => {
    it('should serialize MoveTo command', () => {
      const result = serializePath([{ type: 'M', x: 100, y: 200 }]);
      expect(result).toBe('M 100 200');
    });

    it('should serialize LineTo command', () => {
      const result = serializePath([
        { type: 'M', x: 0, y: 0 },
        { type: 'L', x: 100, y: 200 }
      ]);
      expect(result).toBe('M 0 0 L 100 200');
    });

    it('should serialize Cubic Bezier command', () => {
      const result = serializePath([
        { type: 'M', x: 0, y: 0 },
        { type: 'C', cp1x: 10, cp1y: 20, cp2x: 30, cp2y: 40, x: 50, y: 60 }
      ]);
      expect(result).toBe('M 0 0 C 10 20 30 40 50 60');
    });

    it('should serialize Quadratic Bezier command', () => {
      const result = serializePath([
        { type: 'M', x: 0, y: 0 },
        { type: 'Q', cpx: 50, cpy: 100, x: 100, y: 0 }
      ]);
      expect(result).toBe('M 0 0 Q 50 100 100 0');
    });

    it('should serialize Arc command', () => {
      const result = serializePath([
        { type: 'M', x: 0, y: 0 },
        { type: 'A', rx: 50, ry: 30, xAxisRotation: 0, largeArcFlag: false, sweepFlag: true, x: 100, y: 0 }
      ]);
      expect(result).toBe('M 0 0 A 50 30 0 0 1 100 0');
    });

    it('should serialize ClosePath command', () => {
      const result = serializePath([
        { type: 'M', x: 0, y: 0 },
        { type: 'L', x: 100, y: 0 },
        { type: 'L', x: 100, y: 100 },
        { type: 'Z' }
      ]);
      expect(result).toBe('M 0 0 L 100 0 L 100 100 Z');
    });

    it('should round values to 3 decimal places', () => {
      const result = serializePath([{ type: 'M', x: 10.12345, y: 20.56789 }]);
      expect(result).toBe('M 10.123 20.568');
    });
  });

  describe('getPathPoints()', () => {
    it('should return points for MoveTo command', () => {
      const commands = parsePath('M 100 200');
      const points = getPathPoints(commands);

      expect(points).toHaveLength(1);
      expect(points[0]).toEqual({ x: 100, y: 200 });
    });

    it('should return points for LineTo commands', () => {
      const commands = parsePath('M 0 0 L 50 50 L 100 100');
      const points = getPathPoints(commands);

      expect(points).toHaveLength(3);
      expect(points[0]).toEqual({ x: 0, y: 0 });
      expect(points[1]).toEqual({ x: 50, y: 50 });
      expect(points[2]).toEqual({ x: 100, y: 100 });
    });

    it('should return control points and endpoint for Cubic Bezier', () => {
      const commands = parsePath('M 0 0 C 10 20 30 40 50 60');
      const points = getPathPoints(commands);

      expect(points).toHaveLength(4);
      expect(points[0]).toEqual({ x: 0, y: 0 });
      expect(points[1]).toEqual({ x: 10, y: 20 });
      expect(points[2]).toEqual({ x: 30, y: 40 });
      expect(points[3]).toEqual({ x: 50, y: 60 });
    });

    it('should return control point and endpoint for Quadratic Bezier', () => {
      const commands = parsePath('M 0 0 Q 50 100 100 0');
      const points = getPathPoints(commands);

      expect(points).toHaveLength(3);
      expect(points[0]).toEqual({ x: 0, y: 0 });
      expect(points[1]).toEqual({ x: 50, y: 100 });
      expect(points[2]).toEqual({ x: 100, y: 0 });
    });

    it('should not add points for ClosePath', () => {
      const commands = parsePath('M 0 0 L 100 0 L 100 100 Z');
      const points = getPathPoints(commands);

      expect(points).toHaveLength(3);
    });
  });

  describe('roundtrip (parse -> serialize)', () => {
    it('should roundtrip simple path', () => {
      const original = 'M 10 20 L 50 60 L 100 100 Z';
      const commands = parsePath(original);
      const serialized = serializePath(commands);

      expect(serialized).toBe(original);
    });

    it('should roundtrip path with curves', () => {
      const original = 'M 0 0 C 10 20 30 40 50 60 Q 75 80 100 100';
      const commands = parsePath(original);
      const serialized = serializePath(commands);

      expect(serialized).toBe(original);
    });

    it('should roundtrip closed path', () => {
      const original = 'M 0 0 L 100 0 L 100 100 L 0 100 Z';
      const commands = parsePath(original);
      const serialized = serializePath(commands);

      expect(serialized).toBe(original);
    });
  });
});
