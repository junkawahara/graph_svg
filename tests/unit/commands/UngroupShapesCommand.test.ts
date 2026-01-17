import { describe, it, expect, beforeEach } from 'vitest';
import { UngroupShapesCommand } from '../../../src/renderer/commands/UngroupShapesCommand';
import { selectionManager } from '../../../src/renderer/core/SelectionManager';
import {
  createTestRectangle,
  createTestEllipse,
  createTestLine,
  createTestGroup
} from '../../utils/mock-factories';
import {
  createMockContainer,
  expectShapeInContainer,
  expectShapeNotInContainer,
  expectContainerLength
} from '../../utils/test-helpers';
import { Group } from '../../../src/renderer/shapes/Group';

describe('UngroupShapesCommand', () => {
  beforeEach(() => {
    selectionManager.clearSelection();
  });

  describe('execute()', () => {
    it('should remove group from container', () => {
      const container = createMockContainer();
      const rect = createTestRectangle({ id: 'rect-1' });
      const ellipse = createTestEllipse({ id: 'ellipse-1' });
      const group = createTestGroup([rect, ellipse], { id: 'group-1' });
      container.addShape(group);

      const command = new UngroupShapesCommand(container, group);

      command.execute();

      expectShapeNotInContainer(container, group);
    });

    it('should add child shapes to container', () => {
      const container = createMockContainer();
      const rect = createTestRectangle({ id: 'rect-1' });
      const ellipse = createTestEllipse({ id: 'ellipse-1' });
      const group = createTestGroup([rect, ellipse], { id: 'group-1' });
      container.addShape(group);

      const command = new UngroupShapesCommand(container, group);

      command.execute();

      expectShapeInContainer(container, rect);
      expectShapeInContainer(container, ellipse);
      expectContainerLength(container, 2);
    });

    it('should work with three child shapes', () => {
      const container = createMockContainer();
      const rect = createTestRectangle({ id: 'rect-1' });
      const ellipse = createTestEllipse({ id: 'ellipse-1' });
      const line = createTestLine({ id: 'line-1' });
      const group = createTestGroup([rect, ellipse, line], { id: 'group-1' });
      container.addShape(group);

      const command = new UngroupShapesCommand(container, group);

      command.execute();

      expectShapeInContainer(container, rect);
      expectShapeInContainer(container, ellipse);
      expectShapeInContainer(container, line);
      expectContainerLength(container, 3);
    });

    it('should select ungrouped children', () => {
      const container = createMockContainer();
      const rect = createTestRectangle({ id: 'rect-1' });
      const ellipse = createTestEllipse({ id: 'ellipse-1' });
      const group = createTestGroup([rect, ellipse], { id: 'group-1' });
      container.addShape(group);

      const command = new UngroupShapesCommand(container, group);

      command.execute();

      const selection = selectionManager.getSelection();
      expect(selection).toContain(rect);
      expect(selection).toContain(ellipse);
      expect(selection.length).toBe(2);
    });
  });

  describe('undo()', () => {
    it('should remove child shapes from container', () => {
      const container = createMockContainer();
      const rect = createTestRectangle({ id: 'rect-1' });
      const ellipse = createTestEllipse({ id: 'ellipse-1' });
      const group = createTestGroup([rect, ellipse], { id: 'group-1' });
      container.addShape(group);

      const command = new UngroupShapesCommand(container, group);

      command.execute();
      command.undo();

      expectShapeNotInContainer(container, rect);
      expectShapeNotInContainer(container, ellipse);
    });

    it('should restore group to container', () => {
      const container = createMockContainer();
      const rect = createTestRectangle({ id: 'rect-1' });
      const ellipse = createTestEllipse({ id: 'ellipse-1' });
      const group = createTestGroup([rect, ellipse], { id: 'group-1' });
      container.addShape(group);

      const command = new UngroupShapesCommand(container, group);

      command.execute();
      command.undo();

      expectShapeInContainer(container, group);
      expectContainerLength(container, 1);
    });

    it('should preserve same group instance', () => {
      const container = createMockContainer();
      const rect = createTestRectangle({ id: 'rect-1' });
      const ellipse = createTestEllipse({ id: 'ellipse-1' });
      const group = createTestGroup([rect, ellipse], { id: 'group-1' });
      container.addShape(group);

      const command = new UngroupShapesCommand(container, group);

      command.execute();
      command.undo();

      const restoredGroup = container.getShapes()[0] as Group;
      expect(restoredGroup).toBe(group);
      expect(restoredGroup.children).toContain(rect);
      expect(restoredGroup.children).toContain(ellipse);
    });

    it('should select the restored group', () => {
      const container = createMockContainer();
      const rect = createTestRectangle({ id: 'rect-1' });
      const ellipse = createTestEllipse({ id: 'ellipse-1' });
      const group = createTestGroup([rect, ellipse], { id: 'group-1' });
      container.addShape(group);

      const command = new UngroupShapesCommand(container, group);

      command.execute();
      command.undo();

      const selection = selectionManager.getSelection();
      expect(selection).toContain(group);
      expect(selection.length).toBe(1);
    });
  });

  describe('execute() after undo()', () => {
    it('should re-ungroup shapes (redo behavior)', () => {
      const container = createMockContainer();
      const rect = createTestRectangle({ id: 'rect-1' });
      const ellipse = createTestEllipse({ id: 'ellipse-1' });
      const group = createTestGroup([rect, ellipse], { id: 'group-1' });
      container.addShape(group);

      const command = new UngroupShapesCommand(container, group);

      command.execute();
      command.undo();
      command.execute();

      expectShapeNotInContainer(container, group);
      expectShapeInContainer(container, rect);
      expectShapeInContainer(container, ellipse);
      expectContainerLength(container, 2);
    });

    it('should handle multiple undo/redo cycles', () => {
      const container = createMockContainer();
      const rect = createTestRectangle({ id: 'rect-1' });
      const ellipse = createTestEllipse({ id: 'ellipse-1' });
      const group = createTestGroup([rect, ellipse], { id: 'group-1' });
      container.addShape(group);

      const command = new UngroupShapesCommand(container, group);

      command.execute();
      expectContainerLength(container, 2);

      command.undo();
      expectContainerLength(container, 1);

      command.execute();
      expectContainerLength(container, 2);

      command.undo();
      expectContainerLength(container, 1);
    });
  });

  describe('getDescription()', () => {
    it('should describe ungrouping with child count', () => {
      const container = createMockContainer();
      const rect = createTestRectangle({ id: 'rect-1' });
      const ellipse = createTestEllipse({ id: 'ellipse-1' });
      const group = createTestGroup([rect, ellipse], { id: 'group-1' });
      container.addShape(group);

      const command = new UngroupShapesCommand(container, group);

      expect(command.getDescription()).toBe('Ungroup 2 shapes');
    });

    it('should describe ungrouping with three shapes', () => {
      const container = createMockContainer();
      const shapes = [
        createTestRectangle({ id: 'rect-1' }),
        createTestEllipse({ id: 'ellipse-1' }),
        createTestLine({ id: 'line-1' })
      ];
      const group = createTestGroup(shapes, { id: 'group-1' });
      container.addShape(group);

      const command = new UngroupShapesCommand(container, group);

      expect(command.getDescription()).toBe('Ungroup 3 shapes');
    });
  });
});
