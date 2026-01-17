import { describe, it, expect } from 'vitest';
import { PasteShapesCommand } from '../../../src/renderer/commands/PasteShapesCommand';
import {
  createTestRectangle,
  createTestEllipse,
  createTestLine,
  createTestText
} from '../../utils/mock-factories';
import {
  createMockContainer,
  expectShapeInContainer,
  expectShapeNotInContainer,
  expectContainerLength
} from '../../utils/test-helpers';

describe('PasteShapesCommand', () => {
  describe('execute()', () => {
    it('should add single shape to container', () => {
      const container = createMockContainer();
      const shape = createTestRectangle();
      const command = new PasteShapesCommand(container, [shape]);

      command.execute();

      expectShapeInContainer(container, shape);
      expectContainerLength(container, 1);
    });

    it('should add multiple shapes to container', () => {
      const container = createMockContainer();
      const rect = createTestRectangle({ id: 'rect-1' });
      const ellipse = createTestEllipse({ id: 'ellipse-1' });
      const line = createTestLine({ id: 'line-1' });
      const command = new PasteShapesCommand(container, [rect, ellipse, line]);

      command.execute();

      expectShapeInContainer(container, rect);
      expectShapeInContainer(container, ellipse);
      expectShapeInContainer(container, line);
      expectContainerLength(container, 3);
    });

    it('should preserve shape properties', () => {
      const container = createMockContainer();
      const rect = createTestRectangle({ id: 'pasted-rect', x: 150, y: 200, width: 75, height: 50 });
      const command = new PasteShapesCommand(container, [rect]);

      command.execute();

      const pasted = container.getShapes()[0];
      expect(pasted.id).toBe('pasted-rect');
      expect((pasted as any).x).toBe(150);
      expect((pasted as any).y).toBe(200);
      expect((pasted as any).width).toBe(75);
      expect((pasted as any).height).toBe(50);
    });
  });

  describe('undo()', () => {
    it('should remove single pasted shape', () => {
      const container = createMockContainer();
      const shape = createTestRectangle();
      const command = new PasteShapesCommand(container, [shape]);

      command.execute();
      command.undo();

      expectShapeNotInContainer(container, shape);
      expectContainerLength(container, 0);
    });

    it('should remove all pasted shapes', () => {
      const container = createMockContainer();
      const rect = createTestRectangle({ id: 'rect-1' });
      const ellipse = createTestEllipse({ id: 'ellipse-1' });
      const command = new PasteShapesCommand(container, [rect, ellipse]);

      command.execute();
      command.undo();

      expectShapeNotInContainer(container, rect);
      expectShapeNotInContainer(container, ellipse);
      expectContainerLength(container, 0);
    });

    it('should not affect existing shapes', () => {
      const container = createMockContainer();
      const existing = createTestRectangle({ id: 'existing' });
      container.addShape(existing);

      const pasted = createTestEllipse({ id: 'pasted' });
      const command = new PasteShapesCommand(container, [pasted]);

      command.execute();
      expectContainerLength(container, 2);

      command.undo();
      expectShapeInContainer(container, existing);
      expectShapeNotInContainer(container, pasted);
      expectContainerLength(container, 1);
    });
  });

  describe('execute() after undo()', () => {
    it('should re-add shapes (redo behavior)', () => {
      const container = createMockContainer();
      const shape = createTestRectangle();
      const command = new PasteShapesCommand(container, [shape]);

      command.execute();
      command.undo();
      command.execute();

      expectShapeInContainer(container, shape);
      expectContainerLength(container, 1);
    });

    it('should handle multiple undo/redo cycles', () => {
      const container = createMockContainer();
      const shapes = [
        createTestRectangle({ id: 'rect-1' }),
        createTestEllipse({ id: 'ellipse-1' })
      ];
      const command = new PasteShapesCommand(container, shapes);

      command.execute();
      expectContainerLength(container, 2);

      command.undo();
      expectContainerLength(container, 0);

      command.execute();
      expectContainerLength(container, 2);

      command.undo();
      expectContainerLength(container, 0);
    });

    it('should preserve same shape instances', () => {
      const container = createMockContainer();
      const rect = createTestRectangle({ id: 'rect-1', x: 100, y: 200 });
      const command = new PasteShapesCommand(container, [rect]);

      command.execute();
      command.undo();
      command.execute();

      const restoredShape = container.getShapes()[0];
      expect(restoredShape).toBe(rect);
    });
  });

  describe('getDescription()', () => {
    it('should return singular description for one shape', () => {
      const container = createMockContainer();
      const rect = createTestRectangle();
      const command = new PasteShapesCommand(container, [rect]);

      expect(command.getDescription()).toBe('Paste rectangle');
    });

    it('should return singular description for one ellipse', () => {
      const container = createMockContainer();
      const ellipse = createTestEllipse();
      const command = new PasteShapesCommand(container, [ellipse]);

      expect(command.getDescription()).toBe('Paste ellipse');
    });

    it('should return plural description for multiple shapes', () => {
      const container = createMockContainer();
      const shapes = [createTestRectangle(), createTestEllipse()];
      const command = new PasteShapesCommand(container, shapes);

      expect(command.getDescription()).toBe('Paste 2 shapes');
    });

    it('should return plural description for three shapes', () => {
      const container = createMockContainer();
      const shapes = [createTestRectangle(), createTestEllipse(), createTestLine()];
      const command = new PasteShapesCommand(container, shapes);

      expect(command.getDescription()).toBe('Paste 3 shapes');
    });
  });
});
