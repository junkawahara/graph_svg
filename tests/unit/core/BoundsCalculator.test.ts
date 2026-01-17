import { describe, it, expect } from 'vitest';
import {
  calculateContentBounds,
  calculateFitToContent
} from '../../../src/renderer/core/BoundsCalculator';
import { createTestRectangle, createTestEllipse, createTestLine } from '../../utils/mock-factories';

describe('BoundsCalculator', () => {
  describe('calculateContentBounds()', () => {
    it('should return isEmpty true for empty array', () => {
      const result = calculateContentBounds([]);

      expect(result.isEmpty).toBe(true);
      expect(result.x).toBe(0);
      expect(result.y).toBe(0);
      expect(result.width).toBe(0);
      expect(result.height).toBe(0);
    });

    it('should calculate bounds for single rectangle', () => {
      const rect = createTestRectangle({ x: 50, y: 100, width: 200, height: 150 });

      const result = calculateContentBounds([rect]);

      expect(result.isEmpty).toBe(false);
      expect(result.x).toBe(50);
      expect(result.y).toBe(100);
      expect(result.width).toBe(200);
      expect(result.height).toBe(150);
    });

    it('should calculate bounds for single ellipse', () => {
      const ellipse = createTestEllipse({ cx: 100, cy: 100, rx: 50, ry: 30 });

      const result = calculateContentBounds([ellipse]);

      expect(result.isEmpty).toBe(false);
      expect(result.x).toBe(50);  // cx - rx
      expect(result.y).toBe(70);  // cy - ry
      expect(result.width).toBe(100);  // 2 * rx
      expect(result.height).toBe(60);  // 2 * ry
    });

    it('should calculate bounds for single line', () => {
      const line = createTestLine({ x1: 10, y1: 20, x2: 100, y2: 80 });

      const result = calculateContentBounds([line]);

      expect(result.isEmpty).toBe(false);
      expect(result.x).toBe(10);
      expect(result.y).toBe(20);
      expect(result.width).toBe(90);  // 100 - 10
      expect(result.height).toBe(60); // 80 - 20
    });

    it('should calculate combined bounds for multiple shapes', () => {
      const rect = createTestRectangle({ id: 'rect', x: 0, y: 0, width: 50, height: 50 });
      const ellipse = createTestEllipse({ id: 'ellipse', cx: 150, cy: 150, rx: 50, ry: 50 });

      const result = calculateContentBounds([rect, ellipse]);

      expect(result.isEmpty).toBe(false);
      expect(result.x).toBe(0);    // min x (from rect)
      expect(result.y).toBe(0);    // min y (from rect)
      expect(result.width).toBe(200);  // 200 - 0 (ellipse ends at 200)
      expect(result.height).toBe(200); // 200 - 0 (ellipse ends at 200)
    });

    it('should handle shapes with negative coordinates', () => {
      const rect = createTestRectangle({ x: -50, y: -30, width: 100, height: 80 });

      const result = calculateContentBounds([rect]);

      expect(result.x).toBe(-50);
      expect(result.y).toBe(-30);
      expect(result.width).toBe(100);
      expect(result.height).toBe(80);
    });

    it('should handle overlapping shapes', () => {
      const rect1 = createTestRectangle({ id: 'rect1', x: 10, y: 10, width: 100, height: 100 });
      const rect2 = createTestRectangle({ id: 'rect2', x: 50, y: 50, width: 100, height: 100 });

      const result = calculateContentBounds([rect1, rect2]);

      expect(result.x).toBe(10);   // min x from rect1
      expect(result.y).toBe(10);   // min y from rect1
      expect(result.width).toBe(140);  // 150 - 10 (rect2 ends at 150)
      expect(result.height).toBe(140); // 150 - 10 (rect2 ends at 150)
    });

    it('should handle three or more shapes', () => {
      const shapes = [
        createTestRectangle({ id: 'rect', x: 100, y: 100, width: 50, height: 50 }),
        createTestEllipse({ id: 'ellipse', cx: 50, cy: 50, rx: 20, ry: 20 }),
        createTestLine({ id: 'line', x1: 200, y1: 200, x2: 250, y2: 250 })
      ];

      const result = calculateContentBounds(shapes);

      expect(result.x).toBe(30);   // ellipse starts at 30 (50 - 20)
      expect(result.y).toBe(30);   // ellipse starts at 30 (50 - 20)
      expect(result.width).toBe(220);  // 250 - 30
      expect(result.height).toBe(220); // 250 - 30
    });
  });

  describe('calculateFitToContent()', () => {
    it('should return null for empty array', () => {
      const result = calculateFitToContent([], 20);

      expect(result).toBeNull();
    });

    it('should calculate fit for single shape with margin', () => {
      const rect = createTestRectangle({ x: 100, y: 100, width: 200, height: 150 });

      const result = calculateFitToContent([rect], 20);

      expect(result).not.toBeNull();
      // Offset to move shape to (margin, margin)
      expect(result!.offsetX).toBe(-80);  // 20 - 100
      expect(result!.offsetY).toBe(-80);  // 20 - 100
      // Canvas size = content size + 2 * margin (min 100)
      expect(result!.newWidth).toBe(240);  // 200 + 40
      expect(result!.newHeight).toBe(190); // 150 + 40
    });

    it('should ensure minimum canvas size of 100', () => {
      const rect = createTestRectangle({ x: 0, y: 0, width: 10, height: 10 });

      const result = calculateFitToContent([rect], 10);

      expect(result!.newWidth).toBe(100);  // min 100
      expect(result!.newHeight).toBe(100); // min 100
    });

    it('should handle zero margin', () => {
      const rect = createTestRectangle({ x: 50, y: 50, width: 100, height: 80 });

      const result = calculateFitToContent([rect], 0);

      expect(result!.offsetX).toBe(-50);  // 0 - 50
      expect(result!.offsetY).toBe(-50);  // 0 - 50
      expect(result!.newWidth).toBe(100);
      expect(result!.newHeight).toBe(100); // min 100
    });

    it('should calculate fit for multiple shapes', () => {
      const shapes = [
        createTestRectangle({ id: 'rect1', x: 100, y: 100, width: 50, height: 50 }),
        createTestRectangle({ id: 'rect2', x: 200, y: 200, width: 50, height: 50 })
      ];

      const result = calculateFitToContent(shapes, 20);

      // Combined bounds: x=100, y=100, width=150 (250-100), height=150 (250-100)
      expect(result!.offsetX).toBe(-80);  // 20 - 100
      expect(result!.offsetY).toBe(-80);  // 20 - 100
      expect(result!.newWidth).toBe(190);  // 150 + 40
      expect(result!.newHeight).toBe(190); // 150 + 40
    });

    it('should handle shapes at origin', () => {
      const rect = createTestRectangle({ x: 0, y: 0, width: 100, height: 100 });

      const result = calculateFitToContent([rect], 10);

      expect(result!.offsetX).toBe(10);  // 10 - 0
      expect(result!.offsetY).toBe(10);  // 10 - 0
      expect(result!.newWidth).toBe(120); // 100 + 20
      expect(result!.newHeight).toBe(120);
    });

    it('should handle shapes with negative coordinates', () => {
      const rect = createTestRectangle({ x: -50, y: -30, width: 100, height: 80 });

      const result = calculateFitToContent([rect], 20);

      expect(result!.offsetX).toBe(70);  // 20 - (-50)
      expect(result!.offsetY).toBe(50);  // 20 - (-30)
      expect(result!.newWidth).toBe(140); // 100 + 40
      expect(result!.newHeight).toBe(120); // 80 + 40
    });

    it('should handle large margin', () => {
      const rect = createTestRectangle({ x: 0, y: 0, width: 50, height: 50 });

      const result = calculateFitToContent([rect], 100);

      expect(result!.offsetX).toBe(100);
      expect(result!.offsetY).toBe(100);
      expect(result!.newWidth).toBe(250); // 50 + 200
      expect(result!.newHeight).toBe(250);
    });
  });
});
