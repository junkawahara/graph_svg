import { describe, it, expect } from 'vitest';
import { DeleteShapeCommand } from '../../../src/renderer/commands/DeleteShapeCommand';
import {
  createTestLine,
  createTestRectangle,
  createTestEllipse
} from '../../utils/mock-factories';
import {
  createMockContainer,
  expectShapeInContainer,
  expectShapeNotInContainer,
  expectContainerLength
} from '../../utils/test-helpers';

describe('DeleteShapeCommand', () => {
  describe('execute()', () => {
    it('should remove single shape from container', () => {
      const container = createMockContainer();
      const shape = createTestRectangle();
      container.addShape(shape);
      const command = new DeleteShapeCommand(container, [shape]);

      command.execute();

      expectShapeNotInContainer(container, shape);
      expectContainerLength(container, 0);
    });

    it('should remove multiple shapes from container', () => {
      const container = createMockContainer();
      const shape1 = createTestRectangle({ id: 'rect-1' });
      const shape2 = createTestEllipse({ id: 'ellipse-1' });
      const shape3 = createTestLine({ id: 'line-1' });
      container.addShape(shape1);
      container.addShape(shape2);
      container.addShape(shape3);

      const command = new DeleteShapeCommand(container, [shape1, shape2]);

      command.execute();

      expectShapeNotInContainer(container, shape1);
      expectShapeNotInContainer(container, shape2);
      expectShapeInContainer(container, shape3);
      expectContainerLength(container, 1);
    });

    it('should not affect other shapes', () => {
      const container = createMockContainer();
      const shape1 = createTestRectangle({ id: 'rect-1' });
      const shape2 = createTestRectangle({ id: 'rect-2' });
      container.addShape(shape1);
      container.addShape(shape2);

      const command = new DeleteShapeCommand(container, [shape1]);

      command.execute();

      expectShapeInContainer(container, shape2);
    });
  });

  describe('undo()', () => {
    it('should restore single deleted shape', () => {
      const container = createMockContainer();
      const shape = createTestRectangle();
      container.addShape(shape);
      const command = new DeleteShapeCommand(container, [shape]);

      command.execute();
      command.undo();

      expectShapeInContainer(container, shape);
      expectContainerLength(container, 1);
    });

    it('should restore multiple deleted shapes', () => {
      const container = createMockContainer();
      const shape1 = createTestRectangle({ id: 'rect-1' });
      const shape2 = createTestEllipse({ id: 'ellipse-1' });
      container.addShape(shape1);
      container.addShape(shape2);

      const command = new DeleteShapeCommand(container, [shape1, shape2]);

      command.execute();
      expectContainerLength(container, 0);

      command.undo();

      expectShapeInContainer(container, shape1);
      expectShapeInContainer(container, shape2);
      expectContainerLength(container, 2);
    });

    it('should preserve same shape instance through undo', () => {
      const container = createMockContainer();
      const shape = createTestRectangle({ x: 100, y: 200 });
      container.addShape(shape);
      const command = new DeleteShapeCommand(container, [shape]);

      command.execute();
      command.undo();

      const restoredShape = container.getShapes()[0];
      expect(restoredShape).toBe(shape);
    });
  });

  describe('execute() after undo()', () => {
    it('should re-delete shape (redo behavior)', () => {
      const container = createMockContainer();
      const shape = createTestRectangle();
      container.addShape(shape);
      const command = new DeleteShapeCommand(container, [shape]);

      command.execute();
      command.undo();
      command.execute();

      expectShapeNotInContainer(container, shape);
      expectContainerLength(container, 0);
    });
  });

  describe('getDescription()', () => {
    it('should return singular description for one shape', () => {
      const container = createMockContainer();
      const shape = createTestRectangle();
      const command = new DeleteShapeCommand(container, [shape]);

      expect(command.getDescription()).toBe('Delete rectangle');
    });

    it('should return plural description for multiple shapes', () => {
      const container = createMockContainer();
      const shapes = [createTestRectangle(), createTestEllipse()];
      const command = new DeleteShapeCommand(container, shapes);

      expect(command.getDescription()).toBe('Delete 2 shapes');
    });

    it('should return plural description for three shapes', () => {
      const container = createMockContainer();
      const shapes = [createTestRectangle(), createTestEllipse(), createTestLine()];
      const command = new DeleteShapeCommand(container, shapes);

      expect(command.getDescription()).toBe('Delete 3 shapes');
    });
  });
});
