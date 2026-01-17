import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AddNodeCommand } from '../../../../src/renderer/commands/AddNodeCommand';
import { createTestNode } from '../../../utils/mock-factories';
import { getGraphManager } from '../../../../src/renderer/core/GraphManager';
import {
  createMockContainer,
  expectShapeInContainer,
  expectShapeNotInContainer,
  expectContainerLength
} from '../../../utils/test-helpers';
import { Node } from '../../../../src/renderer/shapes/Node';

describe('AddNodeCommand', () => {
  beforeEach(() => {
    getGraphManager().clear();
  });

  describe('execute()', () => {
    it('should add node to container', () => {
      const container = createMockContainer();
      const node = createTestNode({ id: 'node-1', label: 'A' });
      const command = new AddNodeCommand(container, node);

      command.execute();

      expectShapeInContainer(container, node);
      expectContainerLength(container, 1);
    });

    it('should work with different labels', () => {
      const container = createMockContainer();
      const nodeA = createTestNode({ id: 'node-a', label: 'NodeA' });
      const nodeB = createTestNode({ id: 'node-b', label: 'NodeB' });

      const commandA = new AddNodeCommand(container, nodeA);
      const commandB = new AddNodeCommand(container, nodeB);

      commandA.execute();
      commandB.execute();

      expectShapeInContainer(container, nodeA);
      expectShapeInContainer(container, nodeB);
      expectContainerLength(container, 2);
    });
  });

  describe('undo()', () => {
    it('should remove node from container', () => {
      const container = createMockContainer();
      const node = createTestNode({ id: 'node-1', label: 'A' });
      const command = new AddNodeCommand(container, node);

      command.execute();
      command.undo();

      expectShapeNotInContainer(container, node);
      expectContainerLength(container, 0);
    });

    it('should unregister node from GraphManager', () => {
      const container = createMockContainer();
      const node = createTestNode({ id: 'node-1', label: 'A' });

      // Register node in GraphManager (simulating what render() does)
      const gm = getGraphManager();
      gm.registerNode(node.id);
      gm.setNodeShape(node.id, node);

      const command = new AddNodeCommand(container, node);
      command.execute();
      command.undo();

      // Verify node is unregistered
      expect(gm.getAllNodeIds()).not.toContain('node-1');
    });

    it('should only remove specific node', () => {
      const container = createMockContainer();
      const node1 = createTestNode({ id: 'node-1', label: 'A' });
      const node2 = createTestNode({ id: 'node-2', label: 'B' });

      const command1 = new AddNodeCommand(container, node1);
      const command2 = new AddNodeCommand(container, node2);

      command1.execute();
      command2.execute();
      command1.undo();

      expectShapeNotInContainer(container, node1);
      expectShapeInContainer(container, node2);
      expectContainerLength(container, 1);
    });
  });

  describe('execute() after undo()', () => {
    it('should re-add node (redo behavior)', () => {
      const container = createMockContainer();
      const node = createTestNode({ id: 'node-1', label: 'A' });
      const command = new AddNodeCommand(container, node);

      command.execute();
      command.undo();
      command.execute();

      expectShapeInContainer(container, node);
      expectContainerLength(container, 1);
    });

    it('should preserve same node instance through undo/redo', () => {
      const container = createMockContainer();
      const node = createTestNode({ id: 'node-1', label: 'A', cx: 150, cy: 200 });
      const command = new AddNodeCommand(container, node);

      command.execute();
      command.undo();
      command.execute();

      const restoredNode = container.getShapes()[0] as Node;
      expect(restoredNode).toBe(node);
      expect(restoredNode.label).toBe('A');
      expect(restoredNode.cx).toBe(150);
      expect(restoredNode.cy).toBe(200);
    });
  });

  describe('getDescription()', () => {
    it('should include node label in description', () => {
      const container = createMockContainer();
      const node = createTestNode({ label: 'TestNode' });
      const command = new AddNodeCommand(container, node);

      expect(command.getDescription()).toBe('Add node "TestNode"');
    });

    it('should handle empty label', () => {
      const container = createMockContainer();
      const node = createTestNode({ label: '' });
      const command = new AddNodeCommand(container, node);

      expect(command.getDescription()).toBe('Add node ""');
    });
  });
});
