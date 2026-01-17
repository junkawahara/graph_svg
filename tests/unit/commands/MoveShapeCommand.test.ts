import { describe, it, expect, vi } from 'vitest';
import { MoveShapeCommand } from '../../../src/renderer/commands/MoveShapeCommand';
import {
  createTestLine,
  createTestRectangle,
  createTestEllipse,
  createTestPolygon
} from '../../utils/mock-factories';
import { expectClose } from '../../utils/shape-comparators';

describe('MoveShapeCommand', () => {
  describe('execute()', () => {
    it('should move rectangle by (dx, dy)', () => {
      const shape = createTestRectangle({ x: 100, y: 100 });
      const command = new MoveShapeCommand([shape], 50, 30);

      command.execute();

      expectClose(shape.x, 150);
      expectClose(shape.y, 130);
    });

    it('should move ellipse by (dx, dy)', () => {
      const shape = createTestEllipse({ cx: 200, cy: 200 });
      const command = new MoveShapeCommand([shape], -20, 40);

      command.execute();

      expectClose(shape.cx, 180);
      expectClose(shape.cy, 240);
    });

    it('should move line by (dx, dy)', () => {
      const shape = createTestLine({ x1: 0, y1: 0, x2: 100, y2: 100 });
      const command = new MoveShapeCommand([shape], 10, 20);

      command.execute();

      expectClose(shape.x1, 10);
      expectClose(shape.y1, 20);
      expectClose(shape.x2, 110);
      expectClose(shape.y2, 120);
    });

    it('should move multiple shapes simultaneously', () => {
      const rect = createTestRectangle({ id: 'rect', x: 0, y: 0 });
      const ellipse = createTestEllipse({ id: 'ellipse', cx: 100, cy: 100 });
      const command = new MoveShapeCommand([rect, ellipse], 25, 25);

      command.execute();

      expectClose(rect.x, 25);
      expectClose(rect.y, 25);
      expectClose(ellipse.cx, 125);
      expectClose(ellipse.cy, 125);
    });

    it('should handle negative movement', () => {
      const shape = createTestRectangle({ x: 100, y: 100 });
      const command = new MoveShapeCommand([shape], -50, -75);

      command.execute();

      expectClose(shape.x, 50);
      expectClose(shape.y, 25);
    });

    it('should handle zero movement', () => {
      const shape = createTestRectangle({ x: 100, y: 100 });
      const command = new MoveShapeCommand([shape], 0, 0);

      command.execute();

      expectClose(shape.x, 100);
      expectClose(shape.y, 100);
    });
  });

  describe('undo()', () => {
    it('should move shape back by (-dx, -dy)', () => {
      const shape = createTestRectangle({ x: 100, y: 100 });
      const command = new MoveShapeCommand([shape], 50, 30);

      command.execute();
      command.undo();

      expectClose(shape.x, 100);
      expectClose(shape.y, 100);
    });

    it('should restore multiple shapes to original positions', () => {
      const rect = createTestRectangle({ id: 'rect', x: 0, y: 0 });
      const ellipse = createTestEllipse({ id: 'ellipse', cx: 100, cy: 100 });
      const command = new MoveShapeCommand([rect, ellipse], 25, 25);

      command.execute();
      command.undo();

      expectClose(rect.x, 0);
      expectClose(rect.y, 0);
      expectClose(ellipse.cx, 100);
      expectClose(ellipse.cy, 100);
    });

    it('should handle undo of negative movement', () => {
      const shape = createTestRectangle({ x: 100, y: 100 });
      const command = new MoveShapeCommand([shape], -50, -75);

      command.execute();
      command.undo();

      expectClose(shape.x, 100);
      expectClose(shape.y, 100);
    });
  });

  describe('execute() after undo()', () => {
    it('should re-apply movement (redo behavior)', () => {
      const shape = createTestRectangle({ x: 100, y: 100 });
      const command = new MoveShapeCommand([shape], 50, 30);

      command.execute();
      command.undo();
      command.execute();

      expectClose(shape.x, 150);
      expectClose(shape.y, 130);
    });

    it('should handle multiple undo/redo cycles', () => {
      const shape = createTestRectangle({ x: 100, y: 100 });
      const command = new MoveShapeCommand([shape], 50, 30);

      command.execute();
      expectClose(shape.x, 150);

      command.undo();
      expectClose(shape.x, 100);

      command.execute();
      expectClose(shape.x, 150);

      command.undo();
      expectClose(shape.x, 100);

      command.execute();
      expectClose(shape.x, 150);
    });
  });

  describe('getDescription()', () => {
    it('should return description for single shape', () => {
      const shape = createTestRectangle();
      const command = new MoveShapeCommand([shape], 10, 20);

      expect(command.getDescription()).toBe('Move 1 shape(s)');
    });

    it('should return description for multiple shapes', () => {
      const shapes = [createTestRectangle(), createTestEllipse()];
      const command = new MoveShapeCommand(shapes, 10, 20);

      expect(command.getDescription()).toBe('Move 2 shape(s)');
    });
  });
});
