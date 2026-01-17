import { describe, it, expect, beforeEach } from 'vitest';
import { AddEdgeCommand } from '../../../../src/renderer/commands/AddEdgeCommand';
import { createTestNode, createTestEdge } from '../../../utils/mock-factories';
import { getGraphManager } from '../../../../src/renderer/core/GraphManager';
import {
  createMockContainer,
  expectShapeInContainer,
  expectShapeNotInContainer,
  expectContainerLength
} from '../../../utils/test-helpers';
import { Edge } from '../../../../src/renderer/shapes/Edge';

describe('AddEdgeCommand', () => {
  beforeEach(() => {
    getGraphManager().clear();
  });

  describe('execute()', () => {
    it('should add edge to container', () => {
      const container = createMockContainer();
      const gm = getGraphManager();

      // Setup nodes in GraphManager
      const nodeA = createTestNode({ id: 'node-a', label: 'A' });
      const nodeB = createTestNode({ id: 'node-b', label: 'B' });
      gm.registerNode(nodeA.id);
      gm.registerNode(nodeB.id);
      gm.setNodeShape(nodeA.id, nodeA);
      gm.setNodeShape(nodeB.id, nodeB);

      const edge = createTestEdge('node-a', 'node-b', { id: 'edge-1' });
      const command = new AddEdgeCommand(container, edge);

      command.execute();

      expectShapeInContainer(container, edge);
      expectContainerLength(container, 1);
    });

    it('should work with directed edge', () => {
      const container = createMockContainer();
      const gm = getGraphManager();

      const nodeA = createTestNode({ id: 'node-a', label: 'A' });
      const nodeB = createTestNode({ id: 'node-b', label: 'B' });
      gm.registerNode(nodeA.id);
      gm.registerNode(nodeB.id);
      gm.setNodeShape(nodeA.id, nodeA);
      gm.setNodeShape(nodeB.id, nodeB);

      const edge = createTestEdge('node-a', 'node-b', { id: 'edge-1', direction: 'forward' });
      const command = new AddEdgeCommand(container, edge);

      command.execute();

      expectShapeInContainer(container, edge);
      expect((container.getShapes()[0] as Edge).direction).toBe('forward');
    });

    it('should work with self-loop', () => {
      const container = createMockContainer();
      const gm = getGraphManager();

      const nodeA = createTestNode({ id: 'node-a', label: 'A' });
      gm.registerNode(nodeA.id);
      gm.setNodeShape(nodeA.id, nodeA);

      const edge = createTestEdge('node-a', 'node-a', { id: 'edge-1', isSelfLoop: true });
      const command = new AddEdgeCommand(container, edge);

      command.execute();

      expectShapeInContainer(container, edge);
      expect((container.getShapes()[0] as Edge).isSelfLoop).toBe(true);
    });
  });

  describe('undo()', () => {
    it('should remove edge from container', () => {
      const container = createMockContainer();
      const gm = getGraphManager();

      const nodeA = createTestNode({ id: 'node-a', label: 'A' });
      const nodeB = createTestNode({ id: 'node-b', label: 'B' });
      gm.registerNode(nodeA.id);
      gm.registerNode(nodeB.id);
      gm.setNodeShape(nodeA.id, nodeA);
      gm.setNodeShape(nodeB.id, nodeB);

      const edge = createTestEdge('node-a', 'node-b', { id: 'edge-1' });

      // Register edge in GraphManager
      gm.registerEdge(edge.id, edge.sourceNodeId, edge.targetNodeId);

      const command = new AddEdgeCommand(container, edge);

      command.execute();
      command.undo();

      expectShapeNotInContainer(container, edge);
      expectContainerLength(container, 0);
    });

    it('should unregister edge from GraphManager', () => {
      const container = createMockContainer();
      const gm = getGraphManager();

      const nodeA = createTestNode({ id: 'node-a', label: 'A' });
      const nodeB = createTestNode({ id: 'node-b', label: 'B' });
      gm.registerNode(nodeA.id);
      gm.registerNode(nodeB.id);
      gm.setNodeShape(nodeA.id, nodeA);
      gm.setNodeShape(nodeB.id, nodeB);

      const edge = createTestEdge('node-a', 'node-b', { id: 'edge-1' });
      gm.registerEdge(edge.id, edge.sourceNodeId, edge.targetNodeId);

      const command = new AddEdgeCommand(container, edge);
      command.execute();
      command.undo();

      expect(gm.getEdgeIdsForNode('node-a')).not.toContain('edge-1');
    });
  });

  describe('execute() after undo()', () => {
    it('should re-add edge (redo behavior)', () => {
      const container = createMockContainer();
      const gm = getGraphManager();

      const nodeA = createTestNode({ id: 'node-a', label: 'A' });
      const nodeB = createTestNode({ id: 'node-b', label: 'B' });
      gm.registerNode(nodeA.id);
      gm.registerNode(nodeB.id);
      gm.setNodeShape(nodeA.id, nodeA);
      gm.setNodeShape(nodeB.id, nodeB);

      const edge = createTestEdge('node-a', 'node-b', { id: 'edge-1' });
      gm.registerEdge(edge.id, edge.sourceNodeId, edge.targetNodeId);

      const command = new AddEdgeCommand(container, edge);

      command.execute();
      command.undo();
      command.execute();

      expectShapeInContainer(container, edge);
      expectContainerLength(container, 1);
    });

    it('should preserve same edge instance', () => {
      const container = createMockContainer();
      const gm = getGraphManager();

      const nodeA = createTestNode({ id: 'node-a', label: 'A' });
      const nodeB = createTestNode({ id: 'node-b', label: 'B' });
      gm.registerNode(nodeA.id);
      gm.registerNode(nodeB.id);
      gm.setNodeShape(nodeA.id, nodeA);
      gm.setNodeShape(nodeB.id, nodeB);

      const edge = createTestEdge('node-a', 'node-b', { id: 'edge-1', direction: 'forward' });
      gm.registerEdge(edge.id, edge.sourceNodeId, edge.targetNodeId);

      const command = new AddEdgeCommand(container, edge);

      command.execute();
      command.undo();
      command.execute();

      const restoredEdge = container.getShapes()[0] as Edge;
      expect(restoredEdge).toBe(edge);
      expect(restoredEdge.direction).toBe('forward');
    });
  });

  describe('getDescription()', () => {
    it('should include node labels in description', () => {
      const container = createMockContainer();
      const gm = getGraphManager();

      const nodeA = createTestNode({ id: 'node-a', label: 'Start' });
      const nodeB = createTestNode({ id: 'node-b', label: 'End' });
      gm.registerNode(nodeA.id);
      gm.registerNode(nodeB.id);
      gm.setNodeShape(nodeA.id, nodeA);
      gm.setNodeShape(nodeB.id, nodeB);

      const edge = createTestEdge('node-a', 'node-b', { id: 'edge-1' });
      const command = new AddEdgeCommand(container, edge);

      expect(command.getDescription()).toBe('Add edge "Start" → "End"');
    });

    it('should fallback to node ID if label not available', () => {
      const container = createMockContainer();
      const gm = getGraphManager();

      // Don't register nodes in GraphManager
      const edge = createTestEdge('node-a', 'node-b', { id: 'edge-1' });
      const command = new AddEdgeCommand(container, edge);

      expect(command.getDescription()).toBe('Add edge "node-a" → "node-b"');
    });
  });
});
