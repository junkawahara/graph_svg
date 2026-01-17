import { describe, it, expect } from 'vitest';
import { DistributeShapesCommand } from '../../../src/renderer/commands/DistributeShapesCommand';
import { createTestRectangle } from '../../utils/mock-factories';

describe('DistributeShapesCommand', () => {
  describe('execute() - horizontal distribution', () => {
    it('should distribute shapes evenly horizontally', () => {
      // Three shapes of equal width (40)
      // Total width: 3 * 40 = 120
      // Total space: 200 - 0 = 200
      // Gap: (200 - 120) / 2 = 40
      const shape1 = createTestRectangle({ id: 'rect-1', x: 0, y: 100, width: 40, height: 30 });
      const shape2 = createTestRectangle({ id: 'rect-2', x: 100, y: 100, width: 40, height: 30 }); // middle
      const shape3 = createTestRectangle({ id: 'rect-3', x: 160, y: 100, width: 40, height: 30 }); // rightmost

      const command = new DistributeShapesCommand([shape1, shape2, shape3], 'horizontal');
      command.execute();

      // After distribution: x=0, x=80, x=160 (evenly spaced)
      const bounds1 = shape1.getBounds();
      const bounds2 = shape2.getBounds();
      const bounds3 = shape3.getBounds();

      expect(bounds1.x).toBe(0);
      expect(bounds3.x).toBe(160); // Rightmost stays

      // Check spacing is even
      const gap1 = bounds2.x - (bounds1.x + bounds1.width);
      const gap2 = bounds3.x - (bounds2.x + bounds2.width);
      expect(gap1).toBeCloseTo(gap2, 1);
    });

    it('should preserve leftmost and rightmost positions', () => {
      const shape1 = createTestRectangle({ id: 'rect-1', x: 10, y: 100, width: 30, height: 30 });
      const shape2 = createTestRectangle({ id: 'rect-2', x: 50, y: 100, width: 30, height: 30 });
      const shape3 = createTestRectangle({ id: 'rect-3', x: 200, y: 100, width: 30, height: 30 });

      const command = new DistributeShapesCommand([shape1, shape2, shape3], 'horizontal');
      command.execute();

      expect(shape1.getBounds().x).toBe(10); // Leftmost preserved
      expect(shape3.getBounds().x).toBe(200); // Rightmost preserved
    });
  });

  describe('execute() - vertical distribution', () => {
    it('should distribute shapes evenly vertically', () => {
      const shape1 = createTestRectangle({ id: 'rect-1', x: 100, y: 0, width: 40, height: 30 });
      const shape2 = createTestRectangle({ id: 'rect-2', x: 100, y: 50, width: 40, height: 30 });
      const shape3 = createTestRectangle({ id: 'rect-3', x: 100, y: 170, width: 40, height: 30 });

      const command = new DistributeShapesCommand([shape1, shape2, shape3], 'vertical');
      command.execute();

      const bounds1 = shape1.getBounds();
      const bounds2 = shape2.getBounds();
      const bounds3 = shape3.getBounds();

      expect(bounds1.y).toBe(0); // Topmost preserved
      expect(bounds3.y).toBe(170); // Bottommost preserved

      // Check spacing is even
      const gap1 = bounds2.y - (bounds1.y + bounds1.height);
      const gap2 = bounds3.y - (bounds2.y + bounds2.height);
      expect(gap1).toBeCloseTo(gap2, 1);
    });

    it('should preserve topmost and bottommost positions', () => {
      const shape1 = createTestRectangle({ id: 'rect-1', x: 100, y: 10, width: 30, height: 20 });
      const shape2 = createTestRectangle({ id: 'rect-2', x: 100, y: 60, width: 30, height: 20 });
      const shape3 = createTestRectangle({ id: 'rect-3', x: 100, y: 200, width: 30, height: 20 });

      const command = new DistributeShapesCommand([shape1, shape2, shape3], 'vertical');
      command.execute();

      expect(shape1.getBounds().y).toBe(10); // Topmost preserved
      expect(shape3.getBounds().y).toBe(200); // Bottommost preserved
    });
  });

  describe('undo()', () => {
    it('should restore original positions after horizontal distribution', () => {
      const shape1 = createTestRectangle({ id: 'rect-1', x: 0, y: 100, width: 40, height: 30 });
      const shape2 = createTestRectangle({ id: 'rect-2', x: 50, y: 100, width: 40, height: 30 });
      const shape3 = createTestRectangle({ id: 'rect-3', x: 200, y: 100, width: 40, height: 30 });

      const command = new DistributeShapesCommand([shape1, shape2, shape3], 'horizontal');
      command.execute();
      command.undo();

      expect(shape1.getBounds().x).toBe(0);
      expect(shape2.getBounds().x).toBe(50);
      expect(shape3.getBounds().x).toBe(200);
    });

    it('should restore original positions after vertical distribution', () => {
      const shape1 = createTestRectangle({ id: 'rect-1', x: 100, y: 0, width: 40, height: 30 });
      const shape2 = createTestRectangle({ id: 'rect-2', x: 100, y: 50, width: 40, height: 30 });
      const shape3 = createTestRectangle({ id: 'rect-3', x: 100, y: 200, width: 40, height: 30 });

      const command = new DistributeShapesCommand([shape1, shape2, shape3], 'vertical');
      command.execute();
      command.undo();

      expect(shape1.getBounds().y).toBe(0);
      expect(shape2.getBounds().y).toBe(50);
      expect(shape3.getBounds().y).toBe(200);
    });
  });

  describe('redo (execute after undo)', () => {
    it('should re-apply distribution', () => {
      const shape1 = createTestRectangle({ id: 'rect-1', x: 0, y: 100, width: 40, height: 30 });
      const shape2 = createTestRectangle({ id: 'rect-2', x: 50, y: 100, width: 40, height: 30 });
      const shape3 = createTestRectangle({ id: 'rect-3', x: 200, y: 100, width: 40, height: 30 });

      const command = new DistributeShapesCommand([shape1, shape2, shape3], 'horizontal');
      command.execute();
      const distributedX2 = shape2.getBounds().x;

      command.undo();
      command.execute();

      expect(shape2.getBounds().x).toBe(distributedX2);
    });
  });

  describe('edge cases', () => {
    it('should do nothing with less than 3 shapes', () => {
      const shape1 = createTestRectangle({ id: 'rect-1', x: 0, y: 100, width: 40, height: 30 });
      const shape2 = createTestRectangle({ id: 'rect-2', x: 100, y: 100, width: 40, height: 30 });

      const command = new DistributeShapesCommand([shape1, shape2], 'horizontal');
      command.execute();

      expect(shape1.getBounds().x).toBe(0);
      expect(shape2.getBounds().x).toBe(100);
    });

    it('should handle shapes that are already evenly distributed', () => {
      // Shapes at x=0, 60, 120 with width=40 each -> gap of 20 between each
      const shape1 = createTestRectangle({ id: 'rect-1', x: 0, y: 100, width: 40, height: 30 });
      const shape2 = createTestRectangle({ id: 'rect-2', x: 60, y: 100, width: 40, height: 30 });
      const shape3 = createTestRectangle({ id: 'rect-3', x: 120, y: 100, width: 40, height: 30 });

      const command = new DistributeShapesCommand([shape1, shape2, shape3], 'horizontal');
      command.execute();

      // Should stay the same or very close
      expect(shape1.getBounds().x).toBe(0);
      expect(shape3.getBounds().x).toBe(120);
    });

    it('should handle shapes with different sizes', () => {
      const shape1 = createTestRectangle({ id: 'rect-1', x: 0, y: 100, width: 20, height: 30 });
      const shape2 = createTestRectangle({ id: 'rect-2', x: 50, y: 100, width: 60, height: 30 });
      const shape3 = createTestRectangle({ id: 'rect-3', x: 150, y: 100, width: 30, height: 30 });

      const command = new DistributeShapesCommand([shape1, shape2, shape3], 'horizontal');
      command.execute();

      const bounds1 = shape1.getBounds();
      const bounds2 = shape2.getBounds();
      const bounds3 = shape3.getBounds();

      // Check spacing is even
      const gap1 = bounds2.x - (bounds1.x + bounds1.width);
      const gap2 = bounds3.x - (bounds2.x + bounds2.width);
      expect(gap1).toBeCloseTo(gap2, 1);
    });
  });

  describe('getDescription()', () => {
    it('should return description for horizontal distribution', () => {
      const shapes = [
        createTestRectangle({ id: 'rect-1' }),
        createTestRectangle({ id: 'rect-2' }),
        createTestRectangle({ id: 'rect-3' })
      ];
      const command = new DistributeShapesCommand(shapes, 'horizontal');

      expect(command.getDescription()).toContain('Horizontal');
    });

    it('should return description for vertical distribution', () => {
      const shapes = [
        createTestRectangle({ id: 'rect-1' }),
        createTestRectangle({ id: 'rect-2' }),
        createTestRectangle({ id: 'rect-3' })
      ];
      const command = new DistributeShapesCommand(shapes, 'vertical');

      expect(command.getDescription()).toContain('Vertical');
    });
  });
});
