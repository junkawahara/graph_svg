import { describe, it, expect, beforeEach } from 'vitest';
import { AddShapeCommand } from '../../../src/renderer/commands/AddShapeCommand';
import {
  createTestLine,
  createTestRectangle,
  createTestEllipse,
  createTestPolygon,
  createTestText
} from '../../utils/mock-factories';
import {
  createMockContainer,
  expectShapeInContainer,
  expectShapeNotInContainer,
  expectContainerLength
} from '../../utils/test-helpers';

describe('AddShapeCommand', () => {
  describe('execute()', () => {
    it('should add shape to container', () => {
      const container = createMockContainer();
      const shape = createTestRectangle();
      const command = new AddShapeCommand(container, shape);

      command.execute();

      expectShapeInContainer(container, shape);
      expectContainerLength(container, 1);
    });

    it('should work with Line shape', () => {
      const container = createMockContainer();
      const line = createTestLine();
      const command = new AddShapeCommand(container, line);

      command.execute();

      expectShapeInContainer(container, line);
    });

    it('should work with Ellipse shape', () => {
      const container = createMockContainer();
      const ellipse = createTestEllipse();
      const command = new AddShapeCommand(container, ellipse);

      command.execute();

      expectShapeInContainer(container, ellipse);
    });

    it('should work with Polygon shape', () => {
      const container = createMockContainer();
      const polygon = createTestPolygon();
      const command = new AddShapeCommand(container, polygon);

      command.execute();

      expectShapeInContainer(container, polygon);
    });

    it('should work with Text shape', () => {
      const container = createMockContainer();
      const text = createTestText();
      const command = new AddShapeCommand(container, text);

      command.execute();

      expectShapeInContainer(container, text);
    });
  });

  describe('undo()', () => {
    it('should remove shape from container', () => {
      const container = createMockContainer();
      const shape = createTestRectangle();
      const command = new AddShapeCommand(container, shape);

      command.execute();
      command.undo();

      expectShapeNotInContainer(container, shape);
      expectContainerLength(container, 0);
    });

    it('should only remove the specific shape', () => {
      const container = createMockContainer();
      const shape1 = createTestRectangle({ id: 'rect-1' });
      const shape2 = createTestRectangle({ id: 'rect-2' });
      const command = new AddShapeCommand(container, shape1);

      // Add shape2 separately (not through command)
      container.addShape(shape2);

      command.execute();
      expectContainerLength(container, 2);

      command.undo();
      expectContainerLength(container, 1);
      expectShapeNotInContainer(container, shape1);
      expectShapeInContainer(container, shape2);
    });
  });

  describe('execute() after undo()', () => {
    it('should re-add shape to container (redo behavior)', () => {
      const container = createMockContainer();
      const shape = createTestRectangle();
      const command = new AddShapeCommand(container, shape);

      command.execute();
      command.undo();
      command.execute();

      expectShapeInContainer(container, shape);
      expectContainerLength(container, 1);
    });

    it('should preserve same shape instance through undo/redo cycle', () => {
      const container = createMockContainer();
      const shape = createTestRectangle({ x: 100, y: 200 });
      const command = new AddShapeCommand(container, shape);

      command.execute();
      command.undo();
      command.execute();

      const restoredShape = container.getShapes()[0];
      expect(restoredShape).toBe(shape); // Same reference
      expect(restoredShape.type).toBe('rectangle');
    });
  });

  describe('getDescription()', () => {
    it('should return meaningful description for rectangle', () => {
      const container = createMockContainer();
      const shape = createTestRectangle();
      const command = new AddShapeCommand(container, shape);

      expect(command.getDescription()).toBe('Add rectangle');
    });

    it('should return meaningful description for line', () => {
      const container = createMockContainer();
      const shape = createTestLine();
      const command = new AddShapeCommand(container, shape);

      expect(command.getDescription()).toBe('Add line');
    });

    it('should return meaningful description for ellipse', () => {
      const container = createMockContainer();
      const shape = createTestEllipse();
      const command = new AddShapeCommand(container, shape);

      expect(command.getDescription()).toBe('Add ellipse');
    });
  });
});
