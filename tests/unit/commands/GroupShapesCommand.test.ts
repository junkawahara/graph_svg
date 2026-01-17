import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GroupShapesCommand } from '../../../src/renderer/commands/GroupShapesCommand';
import { selectionManager } from '../../../src/renderer/core/SelectionManager';
import {
  createTestRectangle,
  createTestEllipse,
  createTestLine
} from '../../utils/mock-factories';
import {
  createMockContainer,
  expectShapeInContainer,
  expectShapeNotInContainer,
  expectContainerLength
} from '../../utils/test-helpers';
import { Group } from '../../../src/renderer/shapes/Group';
import { Shape } from '../../../src/renderer/shapes/Shape';

describe('GroupShapesCommand', () => {
  beforeEach(() => {
    selectionManager.clearSelection();
  });

  describe('execute()', () => {
    it('should remove individual shapes from container', () => {
      const container = createMockContainer();
      const rect = createTestRectangle({ id: 'rect-1' });
      const ellipse = createTestEllipse({ id: 'ellipse-1' });
      container.addShape(rect);
      container.addShape(ellipse);

      const command = new GroupShapesCommand(container, [rect, ellipse]);

      command.execute();

      expectShapeNotInContainer(container, rect);
      expectShapeNotInContainer(container, ellipse);
    });

    it('should add group to container', () => {
      const container = createMockContainer();
      const rect = createTestRectangle({ id: 'rect-1' });
      const ellipse = createTestEllipse({ id: 'ellipse-1' });
      container.addShape(rect);
      container.addShape(ellipse);

      const command = new GroupShapesCommand(container, [rect, ellipse]);

      command.execute();

      const shapes = container.getShapes();
      expect(shapes.length).toBe(1);
      expect(shapes[0].type).toBe('group');
    });

    it('should create group containing the original shapes', () => {
      const container = createMockContainer();
      const rect = createTestRectangle({ id: 'rect-1' });
      const ellipse = createTestEllipse({ id: 'ellipse-1' });
      container.addShape(rect);
      container.addShape(ellipse);

      const command = new GroupShapesCommand(container, [rect, ellipse]);

      command.execute();

      const group = container.getShapes()[0] as Group;
      expect(group.children).toContain(rect);
      expect(group.children).toContain(ellipse);
      expect(group.children.length).toBe(2);
    });

    it('should select the new group', () => {
      const container = createMockContainer();
      const rect = createTestRectangle({ id: 'rect-1' });
      const ellipse = createTestEllipse({ id: 'ellipse-1' });
      container.addShape(rect);
      container.addShape(ellipse);

      const command = new GroupShapesCommand(container, [rect, ellipse]);

      command.execute();

      const selection = selectionManager.getSelection();
      expect(selection.length).toBe(1);
      expect(selection[0].type).toBe('group');
    });

    it('should work with three shapes', () => {
      const container = createMockContainer();
      const rect = createTestRectangle({ id: 'rect-1' });
      const ellipse = createTestEllipse({ id: 'ellipse-1' });
      const line = createTestLine({ id: 'line-1' });
      container.addShape(rect);
      container.addShape(ellipse);
      container.addShape(line);

      const command = new GroupShapesCommand(container, [rect, ellipse, line]);

      command.execute();

      const group = container.getShapes()[0] as Group;
      expect(group.children.length).toBe(3);
    });
  });

  describe('undo()', () => {
    it('should remove group from container', () => {
      const container = createMockContainer();
      const rect = createTestRectangle({ id: 'rect-1' });
      const ellipse = createTestEllipse({ id: 'ellipse-1' });
      container.addShape(rect);
      container.addShape(ellipse);

      const command = new GroupShapesCommand(container, [rect, ellipse]);

      command.execute();
      const group = container.getShapes()[0];
      command.undo();

      expectShapeNotInContainer(container, group);
    });

    it('should restore individual shapes to container', () => {
      const container = createMockContainer();
      const rect = createTestRectangle({ id: 'rect-1' });
      const ellipse = createTestEllipse({ id: 'ellipse-1' });
      container.addShape(rect);
      container.addShape(ellipse);

      const command = new GroupShapesCommand(container, [rect, ellipse]);

      command.execute();
      command.undo();

      expectShapeInContainer(container, rect);
      expectShapeInContainer(container, ellipse);
      expectContainerLength(container, 2);
    });

    it('should preserve same shape instances', () => {
      const container = createMockContainer();
      const rect = createTestRectangle({ id: 'rect-1', x: 100, y: 200 });
      const ellipse = createTestEllipse({ id: 'ellipse-1', cx: 300, cy: 400 });
      container.addShape(rect);
      container.addShape(ellipse);

      const command = new GroupShapesCommand(container, [rect, ellipse]);

      command.execute();
      command.undo();

      const shapes = container.getShapes();
      const restoredRect = shapes.find(s => s.id === 'rect-1');
      const restoredEllipse = shapes.find(s => s.id === 'ellipse-1');

      expect(restoredRect).toBe(rect);
      expect(restoredEllipse).toBe(ellipse);
    });

    it('should restore selection to original shapes', () => {
      const container = createMockContainer();
      const rect = createTestRectangle({ id: 'rect-1' });
      const ellipse = createTestEllipse({ id: 'ellipse-1' });
      container.addShape(rect);
      container.addShape(ellipse);

      const command = new GroupShapesCommand(container, [rect, ellipse]);

      command.execute();
      command.undo();

      const selection = selectionManager.getSelection();
      expect(selection).toContain(rect);
      expect(selection).toContain(ellipse);
    });
  });

  describe('execute() after undo()', () => {
    it('should re-group shapes (redo behavior)', () => {
      const container = createMockContainer();
      const rect = createTestRectangle({ id: 'rect-1' });
      const ellipse = createTestEllipse({ id: 'ellipse-1' });
      container.addShape(rect);
      container.addShape(ellipse);

      const command = new GroupShapesCommand(container, [rect, ellipse]);

      command.execute();
      command.undo();
      command.execute();

      const shapes = container.getShapes();
      expect(shapes.length).toBe(1);
      expect(shapes[0].type).toBe('group');
    });

    it('should preserve same shapes through undo/redo', () => {
      const container = createMockContainer();
      const rect = createTestRectangle({ id: 'rect-1' });
      const ellipse = createTestEllipse({ id: 'ellipse-1' });
      container.addShape(rect);
      container.addShape(ellipse);

      const command = new GroupShapesCommand(container, [rect, ellipse]);

      command.execute();
      command.undo();
      command.execute();

      const group = container.getShapes()[0] as Group;
      expect(group.children).toContain(rect);
      expect(group.children).toContain(ellipse);
    });
  });

  describe('getDescription()', () => {
    it('should describe grouping with shape count', () => {
      const container = createMockContainer();
      const rect = createTestRectangle();
      const ellipse = createTestEllipse();
      container.addShape(rect);
      container.addShape(ellipse);

      const command = new GroupShapesCommand(container, [rect, ellipse]);

      expect(command.getDescription()).toBe('Group 2 shapes');
    });

    it('should describe grouping with three shapes', () => {
      const container = createMockContainer();
      const shapes = [
        createTestRectangle({ id: 'rect-1' }),
        createTestEllipse({ id: 'ellipse-1' }),
        createTestLine({ id: 'line-1' })
      ];
      shapes.forEach(s => container.addShape(s));

      const command = new GroupShapesCommand(container, shapes);

      expect(command.getDescription()).toBe('Group 3 shapes');
    });
  });
});
