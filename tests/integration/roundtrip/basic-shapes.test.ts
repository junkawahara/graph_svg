import { describe, it, expect } from 'vitest';
import { Line } from '../../../src/renderer/shapes/Line';
import { Rectangle } from '../../../src/renderer/shapes/Rectangle';
import { Ellipse } from '../../../src/renderer/shapes/Ellipse';
import {
  createTestLine,
  createTestRectangle,
  createTestEllipse,
  createTestStyle,
  roundTrip
} from '../../utils/mock-factories';
import {
  expectLineEqual,
  expectRectangleEqual,
  expectEllipseEqual
} from '../../utils/shape-comparators';

describe('Basic Shapes Round-Trip', () => {
  describe('Line', () => {
    it('should preserve coordinates', () => {
      const original = createTestLine({
        x1: 10,
        y1: 20,
        x2: 100,
        y2: 80
      });

      const { shapes } = roundTrip([original]);

      expect(shapes).toHaveLength(1);
      const restored = shapes[0] as Line;
      expectLineEqual(restored, original);
    });

    it('should preserve decimal coordinates with 3-digit precision', () => {
      const original = createTestLine({
        x1: 10.123,
        y1: 20.456,
        x2: 100.789,
        y2: 80.012
      });

      const { shapes } = roundTrip([original]);

      expect(shapes).toHaveLength(1);
      const restored = shapes[0] as Line;
      expectLineEqual(restored, original);
    });

    it('should preserve arrow-small marker on start', () => {
      const original = createTestLine({
        markerStart: 'arrow-small',
        markerEnd: 'none'
      });

      const { shapes } = roundTrip([original]);

      expect(shapes).toHaveLength(1);
      const restored = shapes[0] as Line;
      expect(restored.markerStart).toBe('arrow-small');
      expect(restored.markerEnd).toBe('none');
    });

    it('should preserve triangle-medium marker on end', () => {
      const original = createTestLine({
        markerStart: 'none',
        markerEnd: 'triangle-medium'
      });

      const { shapes } = roundTrip([original]);

      expect(shapes).toHaveLength(1);
      const restored = shapes[0] as Line;
      expect(restored.markerStart).toBe('none');
      expect(restored.markerEnd).toBe('triangle-medium');
    });

    it('should preserve markers on both ends', () => {
      const original = createTestLine({
        markerStart: 'circle-large',
        markerEnd: 'diamond-small'
      });

      const { shapes } = roundTrip([original]);

      expect(shapes).toHaveLength(1);
      const restored = shapes[0] as Line;
      expect(restored.markerStart).toBe('circle-large');
      expect(restored.markerEnd).toBe('diamond-small');
    });

    it('should handle zero-length line', () => {
      const original = createTestLine({
        x1: 50,
        y1: 50,
        x2: 50,
        y2: 50
      });

      const { shapes } = roundTrip([original]);

      expect(shapes).toHaveLength(1);
      const restored = shapes[0] as Line;
      expectLineEqual(restored, original);
    });

    it('should handle negative coordinates', () => {
      const original = createTestLine({
        x1: -100,
        y1: -50,
        x2: -10,
        y2: -20
      });

      const { shapes } = roundTrip([original]);

      expect(shapes).toHaveLength(1);
      const restored = shapes[0] as Line;
      expectLineEqual(restored, original);
    });
  });

  describe('Rectangle', () => {
    it('should preserve position and size', () => {
      const original = createTestRectangle({
        x: 50,
        y: 30,
        width: 100,
        height: 60
      });

      const { shapes } = roundTrip([original]);

      expect(shapes).toHaveLength(1);
      const restored = shapes[0] as Rectangle;
      expectRectangleEqual(restored, original);
    });

    it('should preserve decimal coordinates', () => {
      const original = createTestRectangle({
        x: 50.123,
        y: 30.456,
        width: 100.789,
        height: 60.012
      });

      const { shapes } = roundTrip([original]);

      expect(shapes).toHaveLength(1);
      const restored = shapes[0] as Rectangle;
      expectRectangleEqual(restored, original);
    });

    it('should handle zero width', () => {
      const original = createTestRectangle({
        x: 50,
        y: 30,
        width: 0,
        height: 60
      });

      const { shapes } = roundTrip([original]);

      expect(shapes).toHaveLength(1);
      const restored = shapes[0] as Rectangle;
      expectRectangleEqual(restored, original);
    });

    it('should handle zero height', () => {
      const original = createTestRectangle({
        x: 50,
        y: 30,
        width: 100,
        height: 0
      });

      const { shapes } = roundTrip([original]);

      expect(shapes).toHaveLength(1);
      const restored = shapes[0] as Rectangle;
      expectRectangleEqual(restored, original);
    });

    it('should handle negative position', () => {
      const original = createTestRectangle({
        x: -50,
        y: -30,
        width: 100,
        height: 60
      });

      const { shapes } = roundTrip([original]);

      expect(shapes).toHaveLength(1);
      const restored = shapes[0] as Rectangle;
      expectRectangleEqual(restored, original);
    });

    it('should preserve large dimensions', () => {
      const original = createTestRectangle({
        x: 0,
        y: 0,
        width: 5000,
        height: 3000
      });

      const { shapes } = roundTrip([original]);

      expect(shapes).toHaveLength(1);
      const restored = shapes[0] as Rectangle;
      expectRectangleEqual(restored, original);
    });
  });

  describe('Ellipse', () => {
    it('should preserve center and radii', () => {
      const original = createTestEllipse({
        cx: 100,
        cy: 100,
        rx: 50,
        ry: 30
      });

      const { shapes } = roundTrip([original]);

      expect(shapes).toHaveLength(1);
      const restored = shapes[0] as Ellipse;
      expectEllipseEqual(restored, original);
    });

    it('should preserve decimal coordinates', () => {
      const original = createTestEllipse({
        cx: 100.123,
        cy: 100.456,
        rx: 50.789,
        ry: 30.012
      });

      const { shapes } = roundTrip([original]);

      expect(shapes).toHaveLength(1);
      const restored = shapes[0] as Ellipse;
      expectEllipseEqual(restored, original);
    });

    it('should handle circle (rx === ry)', () => {
      const original = createTestEllipse({
        cx: 100,
        cy: 100,
        rx: 50,
        ry: 50
      });

      const { shapes } = roundTrip([original]);

      expect(shapes).toHaveLength(1);
      const restored = shapes[0] as Ellipse;
      expectEllipseEqual(restored, original);
    });

    it('should handle horizontal ellipse (rx > ry)', () => {
      const original = createTestEllipse({
        cx: 100,
        cy: 100,
        rx: 80,
        ry: 30
      });

      const { shapes } = roundTrip([original]);

      expect(shapes).toHaveLength(1);
      const restored = shapes[0] as Ellipse;
      expectEllipseEqual(restored, original);
    });

    it('should handle vertical ellipse (rx < ry)', () => {
      const original = createTestEllipse({
        cx: 100,
        cy: 100,
        rx: 30,
        ry: 80
      });

      const { shapes } = roundTrip([original]);

      expect(shapes).toHaveLength(1);
      const restored = shapes[0] as Ellipse;
      expectEllipseEqual(restored, original);
    });

    it('should handle zero radius', () => {
      const original = createTestEllipse({
        cx: 100,
        cy: 100,
        rx: 0,
        ry: 0
      });

      const { shapes } = roundTrip([original]);

      expect(shapes).toHaveLength(1);
      const restored = shapes[0] as Ellipse;
      expectEllipseEqual(restored, original);
    });

    it('should handle negative center position', () => {
      const original = createTestEllipse({
        cx: -100,
        cy: -100,
        rx: 50,
        ry: 30
      });

      const { shapes } = roundTrip([original]);

      expect(shapes).toHaveLength(1);
      const restored = shapes[0] as Ellipse;
      expectEllipseEqual(restored, original);
    });
  });

  describe('Multiple Shapes', () => {
    it('should preserve multiple shapes (order may vary by type)', () => {
      const line = createTestLine({ id: 'line-1', x1: 0, y1: 0, x2: 100, y2: 100 });
      const rect = createTestRectangle({ id: 'rect-1', x: 50, y: 50, width: 80, height: 60 });
      const ellipse = createTestEllipse({ id: 'ellipse-1', cx: 200, cy: 100, rx: 40, ry: 25 });

      const { shapes } = roundTrip([line, rect, ellipse]);

      // FileManager.parse() processes shapes by type, so order may not match original
      expect(shapes).toHaveLength(3);

      const restoredLine = shapes.find(s => s.type === 'line') as Line;
      const restoredRect = shapes.find(s => s.type === 'rectangle') as Rectangle;
      const restoredEllipse = shapes.find(s => s.type === 'ellipse') as Ellipse;

      expect(restoredLine).toBeDefined();
      expect(restoredRect).toBeDefined();
      expect(restoredEllipse).toBeDefined();

      expectLineEqual(restoredLine, line);
      expectRectangleEqual(restoredRect, rect);
      expectEllipseEqual(restoredEllipse, ellipse);
    });

    it('should preserve multiple lines with different markers', () => {
      const line1 = createTestLine({ id: 'line-1', markerEnd: 'arrow-small' });
      const line2 = createTestLine({ id: 'line-2', x1: 50, markerEnd: 'triangle-medium' });
      const line3 = createTestLine({ id: 'line-3', x1: 100, markerStart: 'circle-large' });

      const { shapes } = roundTrip([line1, line2, line3]);

      expect(shapes).toHaveLength(3);
      expect((shapes[0] as Line).markerEnd).toBe('arrow-small');
      expect((shapes[1] as Line).markerEnd).toBe('triangle-medium');
      expect((shapes[2] as Line).markerStart).toBe('circle-large');
    });
  });

  describe('Canvas Size', () => {
    it('should preserve canvas dimensions', () => {
      const line = createTestLine();
      const { canvasSize } = roundTrip([line], 1024, 768);

      expect(canvasSize.width).toBe(1024);
      expect(canvasSize.height).toBe(768);
    });

    it('should use default canvas size for empty shapes', () => {
      const line = createTestLine();
      const { canvasSize } = roundTrip([line]);

      expect(canvasSize.width).toBe(800);
      expect(canvasSize.height).toBe(600);
    });
  });
});
