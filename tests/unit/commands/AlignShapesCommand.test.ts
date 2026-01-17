import { describe, it, expect } from 'vitest';
import { AlignShapesCommand, AlignmentType } from '../../../src/renderer/commands/AlignShapesCommand';
import { createTestRectangle } from '../../utils/mock-factories';

describe('AlignShapesCommand', () => {
  describe('execute() - left alignment', () => {
    it('should align shapes to the leftmost edge', () => {
      const shape1 = createTestRectangle({ id: 'rect-1', x: 50, y: 100, width: 40, height: 30 });
      const shape2 = createTestRectangle({ id: 'rect-2', x: 100, y: 100, width: 40, height: 30 });
      const shape3 = createTestRectangle({ id: 'rect-3', x: 150, y: 100, width: 40, height: 30 });

      const command = new AlignShapesCommand([shape1, shape2, shape3], 'left');
      command.execute();

      expect(shape1.getBounds().x).toBe(50); // leftmost, unchanged
      expect(shape2.getBounds().x).toBe(50);
      expect(shape3.getBounds().x).toBe(50);
    });
  });

  describe('execute() - right alignment', () => {
    it('should align shapes to the rightmost edge', () => {
      const shape1 = createTestRectangle({ id: 'rect-1', x: 50, y: 100, width: 40, height: 30 });
      const shape2 = createTestRectangle({ id: 'rect-2', x: 100, y: 100, width: 40, height: 30 });
      const shape3 = createTestRectangle({ id: 'rect-3', x: 150, y: 100, width: 40, height: 30 });

      const command = new AlignShapesCommand([shape1, shape2, shape3], 'right');
      command.execute();

      // Rightmost edge is 150 + 40 = 190
      const bounds1 = shape1.getBounds();
      const bounds2 = shape2.getBounds();
      const bounds3 = shape3.getBounds();

      expect(bounds1.x + bounds1.width).toBe(190);
      expect(bounds2.x + bounds2.width).toBe(190);
      expect(bounds3.x + bounds3.width).toBe(190);
    });
  });

  describe('execute() - top alignment', () => {
    it('should align shapes to the topmost edge', () => {
      const shape1 = createTestRectangle({ id: 'rect-1', x: 100, y: 50, width: 40, height: 30 });
      const shape2 = createTestRectangle({ id: 'rect-2', x: 100, y: 100, width: 40, height: 30 });
      const shape3 = createTestRectangle({ id: 'rect-3', x: 100, y: 150, width: 40, height: 30 });

      const command = new AlignShapesCommand([shape1, shape2, shape3], 'top');
      command.execute();

      expect(shape1.getBounds().y).toBe(50); // topmost, unchanged
      expect(shape2.getBounds().y).toBe(50);
      expect(shape3.getBounds().y).toBe(50);
    });
  });

  describe('execute() - bottom alignment', () => {
    it('should align shapes to the bottommost edge', () => {
      const shape1 = createTestRectangle({ id: 'rect-1', x: 100, y: 50, width: 40, height: 30 });
      const shape2 = createTestRectangle({ id: 'rect-2', x: 100, y: 100, width: 40, height: 30 });
      const shape3 = createTestRectangle({ id: 'rect-3', x: 100, y: 150, width: 40, height: 30 });

      const command = new AlignShapesCommand([shape1, shape2, shape3], 'bottom');
      command.execute();

      // Bottommost edge is 150 + 30 = 180
      const bounds1 = shape1.getBounds();
      const bounds2 = shape2.getBounds();
      const bounds3 = shape3.getBounds();

      expect(bounds1.y + bounds1.height).toBe(180);
      expect(bounds2.y + bounds2.height).toBe(180);
      expect(bounds3.y + bounds3.height).toBe(180);
    });
  });

  describe('execute() - horizontal center alignment', () => {
    it('should align shapes to the average horizontal center', () => {
      const shape1 = createTestRectangle({ id: 'rect-1', x: 0, y: 100, width: 40, height: 30 });
      const shape2 = createTestRectangle({ id: 'rect-2', x: 100, y: 100, width: 40, height: 30 });
      const shape3 = createTestRectangle({ id: 'rect-3', x: 200, y: 100, width: 40, height: 30 });

      const command = new AlignShapesCommand([shape1, shape2, shape3], 'horizontalCenter');
      command.execute();

      // Centers: (0+20)=20, (100+20)=120, (200+20)=220
      // Average center: (20+120+220)/3 = 120
      const bounds1 = shape1.getBounds();
      const bounds2 = shape2.getBounds();
      const bounds3 = shape3.getBounds();

      expect(bounds1.x + bounds1.width / 2).toBe(120);
      expect(bounds2.x + bounds2.width / 2).toBe(120);
      expect(bounds3.x + bounds3.width / 2).toBe(120);
    });
  });

  describe('execute() - vertical center alignment', () => {
    it('should align shapes to the average vertical center', () => {
      const shape1 = createTestRectangle({ id: 'rect-1', x: 100, y: 0, width: 40, height: 30 });
      const shape2 = createTestRectangle({ id: 'rect-2', x: 100, y: 100, width: 40, height: 30 });
      const shape3 = createTestRectangle({ id: 'rect-3', x: 100, y: 200, width: 40, height: 30 });

      const command = new AlignShapesCommand([shape1, shape2, shape3], 'verticalCenter');
      command.execute();

      // Centers: (0+15)=15, (100+15)=115, (200+15)=215
      // Average center: (15+115+215)/3 = 115
      const bounds1 = shape1.getBounds();
      const bounds2 = shape2.getBounds();
      const bounds3 = shape3.getBounds();

      expect(bounds1.y + bounds1.height / 2).toBe(115);
      expect(bounds2.y + bounds2.height / 2).toBe(115);
      expect(bounds3.y + bounds3.height / 2).toBe(115);
    });
  });

  describe('undo()', () => {
    it('should restore original positions after left alignment', () => {
      const shape1 = createTestRectangle({ id: 'rect-1', x: 50, y: 100, width: 40, height: 30 });
      const shape2 = createTestRectangle({ id: 'rect-2', x: 100, y: 100, width: 40, height: 30 });

      const command = new AlignShapesCommand([shape1, shape2], 'left');
      command.execute();
      command.undo();

      expect(shape1.getBounds().x).toBe(50);
      expect(shape2.getBounds().x).toBe(100);
    });

    it('should restore original positions after horizontal center alignment', () => {
      const shape1 = createTestRectangle({ id: 'rect-1', x: 0, y: 100, width: 40, height: 30 });
      const shape2 = createTestRectangle({ id: 'rect-2', x: 200, y: 100, width: 40, height: 30 });

      const command = new AlignShapesCommand([shape1, shape2], 'horizontalCenter');
      command.execute();
      command.undo();

      expect(shape1.getBounds().x).toBe(0);
      expect(shape2.getBounds().x).toBe(200);
    });
  });

  describe('redo (execute after undo)', () => {
    it('should re-apply alignment', () => {
      const shape1 = createTestRectangle({ id: 'rect-1', x: 50, y: 100, width: 40, height: 30 });
      const shape2 = createTestRectangle({ id: 'rect-2', x: 100, y: 100, width: 40, height: 30 });

      const command = new AlignShapesCommand([shape1, shape2], 'left');
      command.execute();
      command.undo();
      command.execute();

      expect(shape1.getBounds().x).toBe(50);
      expect(shape2.getBounds().x).toBe(50);
    });
  });

  describe('edge cases', () => {
    it('should do nothing with less than 2 shapes', () => {
      const shape = createTestRectangle({ id: 'rect-1', x: 50, y: 100, width: 40, height: 30 });

      const command = new AlignShapesCommand([shape], 'left');
      command.execute();

      expect(shape.getBounds().x).toBe(50);
    });

    it('should handle shapes that are already aligned', () => {
      const shape1 = createTestRectangle({ id: 'rect-1', x: 50, y: 100, width: 40, height: 30 });
      const shape2 = createTestRectangle({ id: 'rect-2', x: 50, y: 150, width: 40, height: 30 });

      const command = new AlignShapesCommand([shape1, shape2], 'left');
      command.execute();

      expect(shape1.getBounds().x).toBe(50);
      expect(shape2.getBounds().x).toBe(50);
    });
  });

  describe('getDescription()', () => {
    it('should return appropriate description for each alignment type', () => {
      const shape1 = createTestRectangle({ id: 'rect-1' });
      const shape2 = createTestRectangle({ id: 'rect-2' });

      const alignments: AlignmentType[] = ['left', 'right', 'top', 'bottom', 'horizontalCenter', 'verticalCenter'];

      for (const alignment of alignments) {
        const command = new AlignShapesCommand([shape1, shape2], alignment);
        const description = command.getDescription();
        expect(description).toContain('Align');
      }
    });
  });
});
