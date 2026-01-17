import { describe, it, expect, beforeEach } from 'vitest';
import { DeleteEdgeCommand } from '../../../../src/renderer/commands/DeleteEdgeCommand';
import { createTestNode, createTestEdge } from '../../../utils/mock-factories';
import { getGraphManager } from '../../../../src/renderer/core/GraphManager';
import {
  createMockContainer,
  expectShapeInContainer,
  expectShapeNotInContainer,
  expectContainerLength
} from '../../../utils/test-helpers';
import { Edge } from '../../../../src/renderer/shapes/Edge';

describe('DeleteEdgeCommand', () => {
  beforeEach(() => {
    getGraphManager().clear();
  });

  describe('execute()', () => {
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
      container.addShape(edge);
      gm.registerEdge(edge.id, edge.sourceNodeId, edge.targetNodeId);

      const command = new DeleteEdgeCommand(container, edge);

      command.execute();

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
      container.addShape(edge);
      gm.registerEdge(edge.id, edge.sourceNodeId, edge.targetNodeId);

      const command = new DeleteEdgeCommand(container, edge);

      command.execute();

      expect(gm.getEdgeIdsForNode('node-a')).not.toContain('edge-1');
      expect(gm.getEdgeIdsForNode('node-b')).not.toContain('edge-1');
    });

    it('should handle self-loop edge', () => {
      const container = createMockContainer();
      const gm = getGraphManager();

      const node = createTestNode({ id: 'node-1', label: 'A' });
      gm.registerNode(node.id);
      gm.setNodeShape(node.id, node);

      const edge = createTestEdge('node-1', 'node-1', { id: 'edge-1', isSelfLoop: true });
      container.addShape(edge);
      gm.registerEdge(edge.id, edge.sourceNodeId, edge.targetNodeId);

      const command = new DeleteEdgeCommand(container, edge);

      command.execute();

      expectShapeNotInContainer(container, edge);
      expect(gm.getEdgeIdsForNode('node-1')).not.toContain('edge-1');
    });
  });

  describe('undo()', () => {
    it('should restore edge to container', () => {
      const container = createMockContainer();
      const gm = getGraphManager();

      const nodeA = createTestNode({ id: 'node-a', label: 'A' });
      const nodeB = createTestNode({ id: 'node-b', label: 'B' });
      gm.registerNode(nodeA.id);
      gm.registerNode(nodeB.id);
      gm.setNodeShape(nodeA.id, nodeA);
      gm.setNodeShape(nodeB.id, nodeB);

      const edge = createTestEdge('node-a', 'node-b', { id: 'edge-1' });
      container.addShape(edge);
      gm.registerEdge(edge.id, edge.sourceNodeId, edge.targetNodeId);

      const command = new DeleteEdgeCommand(container, edge);

      command.execute();
      command.undo();

      expectShapeInContainer(container, edge);
      expectContainerLength(container, 1);
    });

    it('should re-register edge in GraphManager', () => {
      const container = createMockContainer();
      const gm = getGraphManager();

      const nodeA = createTestNode({ id: 'node-a', label: 'A' });
      const nodeB = createTestNode({ id: 'node-b', label: 'B' });
      gm.registerNode(nodeA.id);
      gm.registerNode(nodeB.id);
      gm.setNodeShape(nodeA.id, nodeA);
      gm.setNodeShape(nodeB.id, nodeB);

      const edge = createTestEdge('node-a', 'node-b', { id: 'edge-1' });
      container.addShape(edge);
      gm.registerEdge(edge.id, edge.sourceNodeId, edge.targetNodeId);

      const command = new DeleteEdgeCommand(container, edge);

      command.execute();
      command.undo();

      expect(gm.getEdgeIdsForNode('node-a')).toContain('edge-1');
      expect(gm.getEdgeIdsForNode('node-b')).toContain('edge-1');
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
      container.addShape(edge);
      gm.registerEdge(edge.id, edge.sourceNodeId, edge.targetNodeId);

      const command = new DeleteEdgeCommand(container, edge);

      command.execute();
      command.undo();

      const restoredEdge = container.getShapes()[0] as Edge;
      expect(restoredEdge).toBe(edge);
      expect(restoredEdge.direction).toBe('forward');
    });
  });

  describe('execute() after undo()', () => {
    it('should re-delete edge (redo behavior)', () => {
      const container = createMockContainer();
      const gm = getGraphManager();

      const nodeA = createTestNode({ id: 'node-a', label: 'A' });
      const nodeB = createTestNode({ id: 'node-b', label: 'B' });
      gm.registerNode(nodeA.id);
      gm.registerNode(nodeB.id);
      gm.setNodeShape(nodeA.id, nodeA);
      gm.setNodeShape(nodeB.id, nodeB);

      const edge = createTestEdge('node-a', 'node-b', { id: 'edge-1' });
      container.addShape(edge);
      gm.registerEdge(edge.id, edge.sourceNodeId, edge.targetNodeId);

      const command = new DeleteEdgeCommand(container, edge);

      command.execute();
      command.undo();
      command.execute();

      expectShapeNotInContainer(container, edge);
      expectContainerLength(container, 0);
    });

    it('should handle multiple undo/redo cycles', () => {
      const container = createMockContainer();
      const gm = getGraphManager();

      const nodeA = createTestNode({ id: 'node-a', label: 'A' });
      const nodeB = createTestNode({ id: 'node-b', label: 'B' });
      gm.registerNode(nodeA.id);
      gm.registerNode(nodeB.id);
      gm.setNodeShape(nodeA.id, nodeA);
      gm.setNodeShape(nodeB.id, nodeB);

      const edge = createTestEdge('node-a', 'node-b', { id: 'edge-1' });
      container.addShape(edge);
      gm.registerEdge(edge.id, edge.sourceNodeId, edge.targetNodeId);

      const command = new DeleteEdgeCommand(container, edge);

      command.execute();
      expectContainerLength(container, 0);

      command.undo();
      expectContainerLength(container, 1);

      command.execute();
      expectContainerLength(container, 0);

      command.undo();
      expectContainerLength(container, 1);
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
      container.addShape(edge);

      const command = new DeleteEdgeCommand(container, edge);

      expect(command.getDescription()).toBe('Delete edge "Start" → "End"');
    });

    it('should fallback to node ID if label not available', () => {
      const container = createMockContainer();
      const gm = getGraphManager();

      // Don't set node shapes in GraphManager
      const edge = createTestEdge('node-a', 'node-b', { id: 'edge-1' });
      container.addShape(edge);

      const command = new DeleteEdgeCommand(container, edge);

      expect(command.getDescription()).toBe('Delete edge "node-a" → "node-b"');
    });
  });
});
