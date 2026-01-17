import { describe, it, expect, beforeEach } from 'vitest';
import { EditSvgCommand } from '../../../src/renderer/commands/EditSvgCommand';
import { createTestRectangle, createTestEllipse, createTestLine } from '../../utils/mock-factories';
import { Shape } from '../../../src/renderer/shapes/Shape';

// Mock container for testing
function createMockContainer() {
  const shapes: Shape[] = [];
  return {
    shapes,
    addShape(shape: Shape) {
      shapes.push(shape);
    },
    removeShape(shape: Shape) {
      const idx = shapes.indexOf(shape);
      if (idx !== -1) shapes.splice(idx, 1);
    },
    getShapes() {
      return [...shapes];
    }
  };
}

describe('EditSvgCommand', () => {
  let container: ReturnType<typeof createMockContainer>;

  beforeEach(() => {
    container = createMockContainer();
  });

  describe('execute()', () => {
    it('should replace old shape with new shape', () => {
      const oldShape = createTestRectangle({ id: 'rect-1', x: 10, y: 10, width: 50, height: 50 });
      const newShape = createTestRectangle({ id: 'rect-1', x: 20, y: 20, width: 100, height: 100 });
      container.addShape(oldShape);

      const command = new EditSvgCommand(container, oldShape, newShape);
      command.execute();

      expect(container.shapes).not.toContain(oldShape);
      expect(container.shapes).toContain(newShape);
      expect(container.shapes.length).toBe(1);
    });

    it('should work with different shape types', () => {
      const oldShape = createTestRectangle({ id: 'shape-1' });
      const newShape = createTestEllipse({ id: 'shape-1' });
      container.addShape(oldShape);

      const command = new EditSvgCommand(container, oldShape, newShape);
      command.execute();

      expect(container.shapes).not.toContain(oldShape);
      expect(container.shapes).toContain(newShape);
    });

    it('should preserve other shapes in container', () => {
      const shape1 = createTestRectangle({ id: 'rect-1' });
      const shape2 = createTestEllipse({ id: 'ellipse-1' });
      const shape3 = createTestLine({ id: 'line-1' });
      container.addShape(shape1);
      container.addShape(shape2);
      container.addShape(shape3);

      const newShape2 = createTestEllipse({ id: 'ellipse-1', cx: 200, cy: 200 });
      const command = new EditSvgCommand(container, shape2, newShape2);
      command.execute();

      expect(container.shapes).toContain(shape1);
      expect(container.shapes).toContain(newShape2);
      expect(container.shapes).toContain(shape3);
      expect(container.shapes).not.toContain(shape2);
    });
  });

  describe('undo()', () => {
    it('should restore old shape and remove new shape', () => {
      const oldShape = createTestRectangle({ id: 'rect-1', x: 10, y: 10 });
      const newShape = createTestRectangle({ id: 'rect-1', x: 20, y: 20 });
      container.addShape(oldShape);

      const command = new EditSvgCommand(container, oldShape, newShape);
      command.execute();
      command.undo();

      expect(container.shapes).toContain(oldShape);
      expect(container.shapes).not.toContain(newShape);
      expect(container.shapes.length).toBe(1);
    });

    it('should restore original shape after multiple edits', () => {
      const oldShape = createTestRectangle({ id: 'rect-1', x: 10, y: 10 });
      const newShape = createTestRectangle({ id: 'rect-1', x: 50, y: 50 });
      container.addShape(oldShape);

      const command = new EditSvgCommand(container, oldShape, newShape);
      command.execute();
      command.undo();

      expect(container.shapes[0]).toBe(oldShape);
    });
  });

  describe('redo (execute after undo)', () => {
    it('should re-apply the new shape', () => {
      const oldShape = createTestRectangle({ id: 'rect-1', x: 10, y: 10 });
      const newShape = createTestRectangle({ id: 'rect-1', x: 20, y: 20 });
      container.addShape(oldShape);

      const command = new EditSvgCommand(container, oldShape, newShape);
      command.execute();
      command.undo();
      command.execute();

      expect(container.shapes).toContain(newShape);
      expect(container.shapes).not.toContain(oldShape);
    });
  });

  describe('getDescription()', () => {
    it('should return description with shape type', () => {
      const oldShape = createTestRectangle({ id: 'rect-1' });
      const newShape = createTestRectangle({ id: 'rect-1' });
      const command = new EditSvgCommand(container, oldShape, newShape);

      const description = command.getDescription();

      expect(description).toContain('Edit SVG');
      expect(description).toContain('rectangle');
    });

    it('should include ellipse type in description', () => {
      const oldShape = createTestEllipse({ id: 'ellipse-1' });
      const newShape = createTestEllipse({ id: 'ellipse-1' });
      const command = new EditSvgCommand(container, oldShape, newShape);

      const description = command.getDescription();

      expect(description).toContain('ellipse');
    });
  });
});
