import { describe, it, expect, beforeEach } from 'vitest';
import { AlignShapesCommand, AlignmentType } from '../../../src/renderer/commands/AlignShapesCommand';
import { DistributeShapesCommand, DistributionType } from '../../../src/renderer/commands/DistributeShapesCommand';
import { HistoryManager } from '../../../src/renderer/core/HistoryManager';
import { createTestRectangle, createTestEllipse, createTestLine } from '../../utils/mock-factories';

describe('Align and Distribute Integration', () => {
  let historyManager: HistoryManager;

  beforeEach(() => {
    historyManager = new HistoryManager();
  });

  describe('alignment followed by distribution', () => {
    it('should align shapes vertically then distribute horizontally', () => {
      // Create shapes at varying positions
      const shape1 = createTestRectangle({ id: 'rect-1', x: 0, y: 50, width: 40, height: 30 });
      const shape2 = createTestRectangle({ id: 'rect-2', x: 80, y: 100, width: 40, height: 30 });
      const shape3 = createTestRectangle({ id: 'rect-3', x: 200, y: 150, width: 40, height: 30 });

      // Align all shapes to same vertical center
      const alignCmd = new AlignShapesCommand([shape1, shape2, shape3], 'verticalCenter');
      historyManager.execute(alignCmd);

      // All shapes should now have same vertical center
      const avgY = (shape1.getBounds().y + shape2.getBounds().y + shape3.getBounds().y) / 3 +
                   (shape1.getBounds().height) / 2;
      expect(shape1.getBounds().y + shape1.getBounds().height / 2).toBeCloseTo(avgY, 1);
      expect(shape2.getBounds().y + shape2.getBounds().height / 2).toBeCloseTo(avgY, 1);
      expect(shape3.getBounds().y + shape3.getBounds().height / 2).toBeCloseTo(avgY, 1);

      // Then distribute horizontally
      const distributeCmd = new DistributeShapesCommand([shape1, shape2, shape3], 'horizontal');
      historyManager.execute(distributeCmd);

      // Check horizontal spacing is even
      const bounds1 = shape1.getBounds();
      const bounds2 = shape2.getBounds();
      const bounds3 = shape3.getBounds();

      const gap1 = bounds2.x - (bounds1.x + bounds1.width);
      const gap2 = bounds3.x - (bounds2.x + bounds2.width);
      expect(gap1).toBeCloseTo(gap2, 1);
    });

    it('should align shapes horizontally then distribute vertically', () => {
      const shape1 = createTestRectangle({ id: 'rect-1', x: 50, y: 0, width: 40, height: 30 });
      const shape2 = createTestRectangle({ id: 'rect-2', x: 100, y: 100, width: 40, height: 30 });
      const shape3 = createTestRectangle({ id: 'rect-3', x: 150, y: 250, width: 40, height: 30 });

      // Align horizontally
      const alignCmd = new AlignShapesCommand([shape1, shape2, shape3], 'horizontalCenter');
      historyManager.execute(alignCmd);

      // Distribute vertically
      const distributeCmd = new DistributeShapesCommand([shape1, shape2, shape3], 'vertical');
      historyManager.execute(distributeCmd);

      // Check vertical spacing
      const bounds1 = shape1.getBounds();
      const bounds2 = shape2.getBounds();
      const bounds3 = shape3.getBounds();

      const gap1 = bounds2.y - (bounds1.y + bounds1.height);
      const gap2 = bounds3.y - (bounds2.y + bounds2.height);
      expect(gap1).toBeCloseTo(gap2, 1);
    });
  });

  describe('undo/redo workflow', () => {
    it('should undo alignment and distribution in reverse order', () => {
      const shape1 = createTestRectangle({ id: 'rect-1', x: 0, y: 50, width: 40, height: 30 });
      const shape2 = createTestRectangle({ id: 'rect-2', x: 100, y: 100, width: 40, height: 30 });
      const shape3 = createTestRectangle({ id: 'rect-3', x: 200, y: 150, width: 40, height: 30 });

      // Store original positions
      const original1 = { x: shape1.getBounds().x, y: shape1.getBounds().y };
      const original2 = { x: shape2.getBounds().x, y: shape2.getBounds().y };
      const original3 = { x: shape3.getBounds().x, y: shape3.getBounds().y };

      // Align
      historyManager.execute(new AlignShapesCommand([shape1, shape2, shape3], 'left'));
      const afterAlign1 = { x: shape1.getBounds().x, y: shape1.getBounds().y };
      const afterAlign2 = { x: shape2.getBounds().x, y: shape2.getBounds().y };

      // Distribute
      historyManager.execute(new DistributeShapesCommand([shape1, shape2, shape3], 'vertical'));
      const afterDistribute2 = { x: shape2.getBounds().x, y: shape2.getBounds().y };

      // Undo distribution
      historyManager.undo();
      expect(shape2.getBounds().x).toBe(afterAlign2.x);
      expect(shape2.getBounds().y).toBe(afterAlign2.y);

      // Undo alignment
      historyManager.undo();
      expect(shape1.getBounds().x).toBe(original1.x);
      expect(shape2.getBounds().x).toBe(original2.x);
      expect(shape3.getBounds().x).toBe(original3.x);
    });

    it('should redo alignment and distribution in original order', () => {
      const shape1 = createTestRectangle({ id: 'rect-1', x: 0, y: 50, width: 40, height: 30 });
      const shape2 = createTestRectangle({ id: 'rect-2', x: 100, y: 100, width: 40, height: 30 });
      const shape3 = createTestRectangle({ id: 'rect-3', x: 200, y: 150, width: 40, height: 30 });

      // Execute both commands
      historyManager.execute(new AlignShapesCommand([shape1, shape2, shape3], 'top'));
      historyManager.execute(new DistributeShapesCommand([shape1, shape2, shape3], 'horizontal'));

      // Store positions after both commands
      const final1 = { x: shape1.getBounds().x, y: shape1.getBounds().y };
      const final2 = { x: shape2.getBounds().x, y: shape2.getBounds().y };
      const final3 = { x: shape3.getBounds().x, y: shape3.getBounds().y };

      // Undo both
      historyManager.undo();
      historyManager.undo();

      // Redo both
      historyManager.redo();
      historyManager.redo();

      // Should be back to final positions
      expect(shape1.getBounds().x).toBe(final1.x);
      expect(shape1.getBounds().y).toBe(final1.y);
      expect(shape2.getBounds().x).toBe(final2.x);
      expect(shape2.getBounds().y).toBe(final2.y);
      expect(shape3.getBounds().x).toBe(final3.x);
      expect(shape3.getBounds().y).toBe(final3.y);
    });

    it('should clear redo stack when new command is executed after undo', () => {
      const shape1 = createTestRectangle({ id: 'rect-1', x: 0, y: 0, width: 40, height: 30 });
      const shape2 = createTestRectangle({ id: 'rect-2', x: 100, y: 100, width: 40, height: 30 });

      historyManager.execute(new AlignShapesCommand([shape1, shape2], 'left'));
      historyManager.undo();

      expect(historyManager.canRedo()).toBe(true);

      // Execute new command
      historyManager.execute(new AlignShapesCommand([shape1, shape2], 'right'));

      expect(historyManager.canRedo()).toBe(false);
    });
  });

  describe('mixed shape types', () => {
    it('should align mixed shape types correctly', () => {
      const rect = createTestRectangle({ id: 'rect-1', x: 0, y: 100, width: 60, height: 40 });
      const ellipse = createTestEllipse({ id: 'ellipse-1', cx: 150, cy: 80, rx: 30, ry: 20 });
      const line = createTestLine({ id: 'line-1', x1: 250, y1: 50, x2: 300, y2: 120 });

      historyManager.execute(new AlignShapesCommand([rect, ellipse, line], 'top'));

      // All shapes should have same top edge
      const rectBounds = rect.getBounds();
      const ellipseBounds = ellipse.getBounds();
      const lineBounds = line.getBounds();

      const topY = Math.min(rectBounds.y, ellipseBounds.y, lineBounds.y);
      expect(rectBounds.y).toBeCloseTo(topY, 1);
      expect(ellipseBounds.y).toBeCloseTo(topY, 1);
      expect(lineBounds.y).toBeCloseTo(topY, 1);
    });

    it('should distribute mixed shape types correctly', () => {
      const rect = createTestRectangle({ id: 'rect-1', x: 0, y: 100, width: 40, height: 30 });
      const ellipse = createTestEllipse({ id: 'ellipse-1', cx: 100, cy: 115, rx: 30, ry: 20 });
      const line = createTestLine({ id: 'line-1', x1: 200, y1: 100, x2: 240, y2: 130 });

      historyManager.execute(new DistributeShapesCommand([rect, ellipse, line], 'horizontal'));

      const rectBounds = rect.getBounds();
      const ellipseBounds = ellipse.getBounds();
      const lineBounds = line.getBounds();

      // Check spacing
      const gap1 = ellipseBounds.x - (rectBounds.x + rectBounds.width);
      const gap2 = lineBounds.x - (ellipseBounds.x + ellipseBounds.width);
      expect(gap1).toBeCloseTo(gap2, 1);
    });
  });

  describe('all alignment types', () => {
    it('should correctly align left', () => {
      const shape1 = createTestRectangle({ id: 'rect-1', x: 50, y: 100, width: 40, height: 30 });
      const shape2 = createTestRectangle({ id: 'rect-2', x: 100, y: 100, width: 40, height: 30 });

      historyManager.execute(new AlignShapesCommand([shape1, shape2], 'left'));

      expect(shape1.getBounds().x).toBe(50);
      expect(shape2.getBounds().x).toBe(50);
    });

    it('should correctly align right', () => {
      const shape1 = createTestRectangle({ id: 'rect-1', x: 50, y: 100, width: 40, height: 30 });
      const shape2 = createTestRectangle({ id: 'rect-2', x: 100, y: 100, width: 60, height: 30 });

      historyManager.execute(new AlignShapesCommand([shape1, shape2], 'right'));

      const bounds1 = shape1.getBounds();
      const bounds2 = shape2.getBounds();
      expect(bounds1.x + bounds1.width).toBe(160);
      expect(bounds2.x + bounds2.width).toBe(160);
    });

    it('should correctly align top', () => {
      const shape1 = createTestRectangle({ id: 'rect-1', x: 100, y: 50, width: 40, height: 30 });
      const shape2 = createTestRectangle({ id: 'rect-2', x: 100, y: 100, width: 40, height: 30 });

      historyManager.execute(new AlignShapesCommand([shape1, shape2], 'top'));

      expect(shape1.getBounds().y).toBe(50);
      expect(shape2.getBounds().y).toBe(50);
    });

    it('should correctly align bottom', () => {
      const shape1 = createTestRectangle({ id: 'rect-1', x: 100, y: 50, width: 40, height: 30 });
      const shape2 = createTestRectangle({ id: 'rect-2', x: 100, y: 100, width: 40, height: 50 });

      historyManager.execute(new AlignShapesCommand([shape1, shape2], 'bottom'));

      const bounds1 = shape1.getBounds();
      const bounds2 = shape2.getBounds();
      expect(bounds1.y + bounds1.height).toBe(150);
      expect(bounds2.y + bounds2.height).toBe(150);
    });

    it('should correctly align horizontal center', () => {
      const shape1 = createTestRectangle({ id: 'rect-1', x: 0, y: 100, width: 40, height: 30 });
      const shape2 = createTestRectangle({ id: 'rect-2', x: 100, y: 100, width: 60, height: 30 });

      historyManager.execute(new AlignShapesCommand([shape1, shape2], 'horizontalCenter'));

      const bounds1 = shape1.getBounds();
      const bounds2 = shape2.getBounds();
      const center1 = bounds1.x + bounds1.width / 2;
      const center2 = bounds2.x + bounds2.width / 2;
      expect(center1).toBeCloseTo(center2, 1);
    });

    it('should correctly align vertical center', () => {
      const shape1 = createTestRectangle({ id: 'rect-1', x: 100, y: 0, width: 40, height: 30 });
      const shape2 = createTestRectangle({ id: 'rect-2', x: 100, y: 100, width: 40, height: 50 });

      historyManager.execute(new AlignShapesCommand([shape1, shape2], 'verticalCenter'));

      const bounds1 = shape1.getBounds();
      const bounds2 = shape2.getBounds();
      const center1 = bounds1.y + bounds1.height / 2;
      const center2 = bounds2.y + bounds2.height / 2;
      expect(center1).toBeCloseTo(center2, 1);
    });
  });

  describe('edge cases', () => {
    it('should handle alignment with only 2 shapes', () => {
      const shape1 = createTestRectangle({ id: 'rect-1', x: 0, y: 0, width: 40, height: 30 });
      const shape2 = createTestRectangle({ id: 'rect-2', x: 100, y: 100, width: 40, height: 30 });

      historyManager.execute(new AlignShapesCommand([shape1, shape2], 'left'));

      expect(shape1.getBounds().x).toBe(0);
      expect(shape2.getBounds().x).toBe(0);
    });

    it('should handle distribution with exactly 3 shapes', () => {
      const shape1 = createTestRectangle({ id: 'rect-1', x: 0, y: 100, width: 40, height: 30 });
      const shape2 = createTestRectangle({ id: 'rect-2', x: 50, y: 100, width: 40, height: 30 });
      const shape3 = createTestRectangle({ id: 'rect-3', x: 200, y: 100, width: 40, height: 30 });

      historyManager.execute(new DistributeShapesCommand([shape1, shape2, shape3], 'horizontal'));

      const bounds1 = shape1.getBounds();
      const bounds2 = shape2.getBounds();
      const bounds3 = shape3.getBounds();

      const gap1 = bounds2.x - (bounds1.x + bounds1.width);
      const gap2 = bounds3.x - (bounds2.x + bounds2.width);
      expect(gap1).toBeCloseTo(gap2, 1);
    });

    it('should handle many shapes', () => {
      const shapes = [];
      for (let i = 0; i < 10; i++) {
        shapes.push(createTestRectangle({
          id: `rect-${i}`,
          x: i * 50 + Math.random() * 20,
          y: Math.random() * 200,
          width: 30 + Math.random() * 20,
          height: 30
        }));
      }

      // Should not throw
      historyManager.execute(new AlignShapesCommand(shapes, 'top'));
      historyManager.execute(new DistributeShapesCommand(shapes, 'horizontal'));

      // All shapes should have same top
      const topY = shapes[0].getBounds().y;
      for (const shape of shapes) {
        expect(shape.getBounds().y).toBeCloseTo(topY, 1);
      }
    });

    it('should handle shapes with same position', () => {
      const shape1 = createTestRectangle({ id: 'rect-1', x: 100, y: 100, width: 40, height: 30 });
      const shape2 = createTestRectangle({ id: 'rect-2', x: 100, y: 100, width: 40, height: 30 });

      // Should not throw when shapes are already aligned
      historyManager.execute(new AlignShapesCommand([shape1, shape2], 'left'));

      expect(shape1.getBounds().x).toBe(100);
      expect(shape2.getBounds().x).toBe(100);
    });
  });

  describe('complex workflow', () => {
    it('should handle align -> distribute -> align -> undo all', () => {
      const shape1 = createTestRectangle({ id: 'rect-1', x: 0, y: 50, width: 40, height: 30 });
      const shape2 = createTestRectangle({ id: 'rect-2', x: 80, y: 100, width: 40, height: 30 });
      const shape3 = createTestRectangle({ id: 'rect-3', x: 200, y: 150, width: 40, height: 30 });

      // Save original positions
      const originals = [
        { x: shape1.getBounds().x, y: shape1.getBounds().y },
        { x: shape2.getBounds().x, y: shape2.getBounds().y },
        { x: shape3.getBounds().x, y: shape3.getBounds().y }
      ];

      // Align top
      historyManager.execute(new AlignShapesCommand([shape1, shape2, shape3], 'top'));

      // Distribute horizontally
      historyManager.execute(new DistributeShapesCommand([shape1, shape2, shape3], 'horizontal'));

      // Align left again
      historyManager.execute(new AlignShapesCommand([shape1, shape2, shape3], 'left'));

      // Undo all 3 commands
      historyManager.undo();
      historyManager.undo();
      historyManager.undo();

      // Should be back to original positions
      expect(shape1.getBounds().x).toBe(originals[0].x);
      expect(shape1.getBounds().y).toBe(originals[0].y);
      expect(shape2.getBounds().x).toBe(originals[1].x);
      expect(shape2.getBounds().y).toBe(originals[1].y);
      expect(shape3.getBounds().x).toBe(originals[2].x);
      expect(shape3.getBounds().y).toBe(originals[2].y);
    });
  });
});
