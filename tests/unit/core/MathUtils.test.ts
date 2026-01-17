import { describe, it, expect } from 'vitest';
import { round3, roundPoint } from '../../../src/renderer/core/MathUtils';

describe('MathUtils', () => {
  describe('round3', () => {
    it('should round to 3 decimal places', () => {
      expect(round3(1.23456789)).toBe(1.235);
      expect(round3(1.2341)).toBe(1.234);
      expect(round3(1.2345)).toBe(1.235);  // round up at .5
    });

    it('should handle integers', () => {
      expect(round3(5)).toBe(5);
      expect(round3(100)).toBe(100);
      expect(round3(0)).toBe(0);
    });

    it('should handle negative numbers', () => {
      expect(round3(-1.23456)).toBe(-1.235);
      expect(round3(-1.2344)).toBe(-1.234);
      expect(round3(-100.9999)).toBe(-101);
    });

    it('should handle very small numbers', () => {
      expect(round3(0.0001)).toBe(0);
      expect(round3(0.0005)).toBe(0.001);
      expect(round3(0.0004)).toBe(0);
    });

    it('should handle very large numbers', () => {
      expect(round3(123456.789123)).toBe(123456.789);
      expect(round3(999999.9999)).toBe(1000000);
    });

    it('should preserve existing precision', () => {
      expect(round3(1.5)).toBe(1.5);
      expect(round3(1.25)).toBe(1.25);
      expect(round3(1.125)).toBe(1.125);
    });

    it('should handle edge cases', () => {
      expect(round3(0.999)).toBe(0.999);
      expect(round3(0.9999)).toBe(1);
      expect(round3(0.9995)).toBe(1);
      expect(round3(0.9994)).toBe(0.999);
    });

    it('should handle floating point precision issues', () => {
      // 0.1 + 0.2 = 0.30000000000000004 in JavaScript
      expect(round3(0.1 + 0.2)).toBe(0.3);

      // Similar floating point issues
      expect(round3(0.7 + 0.1)).toBe(0.8);
      expect(round3(1.1 + 2.2)).toBe(3.3);
    });

    it('should round using standard rounding (half up)', () => {
      // Test boundary cases for rounding
      expect(round3(1.2344)).toBe(1.234);
      expect(round3(1.2345)).toBe(1.235);  // Half rounds up
      expect(round3(1.2346)).toBe(1.235);
    });
  });

  describe('roundPoint', () => {
    it('should round both x and y coordinates', () => {
      const point = { x: 1.23456, y: 7.89123 };
      const result = roundPoint(point);

      expect(result.x).toBe(1.235);
      expect(result.y).toBe(7.891);
    });

    it('should return a new object', () => {
      const point = { x: 1.5, y: 2.5 };
      const result = roundPoint(point);

      expect(result).not.toBe(point);
      expect(result).toEqual({ x: 1.5, y: 2.5 });
    });

    it('should handle integer coordinates', () => {
      const point = { x: 100, y: 200 };
      const result = roundPoint(point);

      expect(result).toEqual({ x: 100, y: 200 });
    });

    it('should handle negative coordinates', () => {
      const point = { x: -50.12345, y: -100.98765 };
      const result = roundPoint(point);

      expect(result.x).toBe(-50.123);
      expect(result.y).toBe(-100.988);
    });

    it('should handle zero coordinates', () => {
      const point = { x: 0, y: 0 };
      const result = roundPoint(point);

      expect(result).toEqual({ x: 0, y: 0 });
    });

    it('should handle mixed positive and negative', () => {
      const point = { x: -10.5556, y: 20.4444 };
      const result = roundPoint(point);

      expect(result.x).toBe(-10.556);
      expect(result.y).toBe(20.444);
    });

    it('should handle very small coordinates', () => {
      const point = { x: 0.0001, y: 0.0009 };
      const result = roundPoint(point);

      expect(result.x).toBe(0);
      expect(result.y).toBe(0.001);
    });

    it('should handle floating point precision issues in coordinates', () => {
      const point = { x: 0.1 + 0.2, y: 0.7 + 0.1 };
      const result = roundPoint(point);

      expect(result.x).toBe(0.3);
      expect(result.y).toBe(0.8);
    });

    it('should not modify original point', () => {
      const point = { x: 1.99999, y: 2.99999 };
      roundPoint(point);

      expect(point.x).toBe(1.99999);
      expect(point.y).toBe(2.99999);
    });
  });
});
