import { describe, it, expect, beforeEach } from 'vitest';
import { DeleteNodeCommand } from '../../../../src/renderer/commands/DeleteNodeCommand';
import { createTestNode, createTestEdge } from '../../../utils/mock-factories';
import { getGraphManager } from '../../../../src/renderer/core/GraphManager';
import {
  createMockContainer,
  expectShapeInContainer,
  expectShapeNotInContainer,
  expectContainerLength
} from '../../../utils/test-helpers';
import { Node } from '../../../../src/renderer/shapes/Node';
import { Edge } from '../../../../src/renderer/shapes/Edge';

describe('DeleteNodeCommand', () => {
  beforeEach(() => {
    getGraphManager().clear();
  });

  describe('execute()', () => {
    it('should remove node from container', () => {
      const container = createMockContainer();
      const gm = getGraphManager();

      const node = createTestNode({ id: 'node-1', label: 'A' });
      container.addShape(node);
      gm.registerNode(node.id);
      gm.setNodeShape(node.id, node);

      const command = new DeleteNodeCommand(container, node);

      command.execute();

      expectShapeNotInContainer(container, node);
      expectContainerLength(container, 0);
    });

    it('should unregister node from GraphManager', () => {
      const container = createMockContainer();
      const gm = getGraphManager();

      const node = createTestNode({ id: 'node-1', label: 'A' });
      container.addShape(node);
      gm.registerNode(node.id);
      gm.setNodeShape(node.id, node);

      const command = new DeleteNodeCommand(container, node);
      command.execute();

      expect(gm.getAllNodeIds()).not.toContain('node-1');
    });

    it('should also delete connected edges', () => {
      const container = createMockContainer();
      const gm = getGraphManager();

      const nodeA = createTestNode({ id: 'node-a', label: 'A' });
      const nodeB = createTestNode({ id: 'node-b', label: 'B' });
      const edge = createTestEdge('node-a', 'node-b', { id: 'edge-1' });

      container.addShape(nodeA);
      container.addShape(nodeB);
      container.addShape(edge);

      gm.registerNode(nodeA.id);
      gm.registerNode(nodeB.id);
      gm.setNodeShape(nodeA.id, nodeA);
      gm.setNodeShape(nodeB.id, nodeB);
      gm.registerEdge(edge.id, edge.sourceNodeId, edge.targetNodeId);

      const command = new DeleteNodeCommand(container, nodeA);

      command.execute();

      expectShapeNotInContainer(container, nodeA);
      expectShapeNotInContainer(container, edge);
      expectShapeInContainer(container, nodeB);
      expectContainerLength(container, 1);
    });

    it('should delete multiple connected edges', () => {
      const container = createMockContainer();
      const gm = getGraphManager();

      const nodeA = createTestNode({ id: 'node-a', label: 'A' });
      const nodeB = createTestNode({ id: 'node-b', label: 'B' });
      const nodeC = createTestNode({ id: 'node-c', label: 'C' });
      const edge1 = createTestEdge('node-a', 'node-b', { id: 'edge-1' });
      const edge2 = createTestEdge('node-a', 'node-c', { id: 'edge-2' });
      const edge3 = createTestEdge('node-b', 'node-c', { id: 'edge-3' }); // Not connected to A

      container.addShape(nodeA);
      container.addShape(nodeB);
      container.addShape(nodeC);
      container.addShape(edge1);
      container.addShape(edge2);
      container.addShape(edge3);

      gm.registerNode(nodeA.id);
      gm.registerNode(nodeB.id);
      gm.registerNode(nodeC.id);
      gm.setNodeShape(nodeA.id, nodeA);
      gm.setNodeShape(nodeB.id, nodeB);
      gm.setNodeShape(nodeC.id, nodeC);
      gm.registerEdge(edge1.id, edge1.sourceNodeId, edge1.targetNodeId);
      gm.registerEdge(edge2.id, edge2.sourceNodeId, edge2.targetNodeId);
      gm.registerEdge(edge3.id, edge3.sourceNodeId, edge3.targetNodeId);

      const command = new DeleteNodeCommand(container, nodeA);

      command.execute();

      expectShapeNotInContainer(container, nodeA);
      expectShapeNotInContainer(container, edge1);
      expectShapeNotInContainer(container, edge2);
      expectShapeInContainer(container, nodeB);
      expectShapeInContainer(container, nodeC);
      expectShapeInContainer(container, edge3);
      expectContainerLength(container, 3);
    });

    it('should delete self-loop edge', () => {
      const container = createMockContainer();
      const gm = getGraphManager();

      const node = createTestNode({ id: 'node-1', label: 'A' });
      const selfLoop = createTestEdge('node-1', 'node-1', { id: 'edge-1', isSelfLoop: true });

      container.addShape(node);
      container.addShape(selfLoop);

      gm.registerNode(node.id);
      gm.setNodeShape(node.id, node);
      gm.registerEdge(selfLoop.id, selfLoop.sourceNodeId, selfLoop.targetNodeId);

      const command = new DeleteNodeCommand(container, node);

      command.execute();

      expectShapeNotInContainer(container, node);
      expectShapeNotInContainer(container, selfLoop);
      expectContainerLength(container, 0);
    });
  });

  describe('undo()', () => {
    it('should restore node to container', () => {
      const container = createMockContainer();
      const gm = getGraphManager();

      const node = createTestNode({ id: 'node-1', label: 'A' });
      container.addShape(node);
      gm.registerNode(node.id);
      gm.setNodeShape(node.id, node);

      const command = new DeleteNodeCommand(container, node);

      command.execute();
      command.undo();

      expectShapeInContainer(container, node);
      expectContainerLength(container, 1);
    });

    it('should re-register node in GraphManager', () => {
      const container = createMockContainer();
      const gm = getGraphManager();

      const node = createTestNode({ id: 'node-1', label: 'A' });
      container.addShape(node);
      gm.registerNode(node.id);
      gm.setNodeShape(node.id, node);

      const command = new DeleteNodeCommand(container, node);

      command.execute();
      command.undo();

      expect(gm.getAllNodeIds()).toContain('node-1');
      expect(gm.getNodeShape('node-1')).toBe(node);
    });

    it('should restore connected edges', () => {
      const container = createMockContainer();
      const gm = getGraphManager();

      const nodeA = createTestNode({ id: 'node-a', label: 'A' });
      const nodeB = createTestNode({ id: 'node-b', label: 'B' });
      const edge = createTestEdge('node-a', 'node-b', { id: 'edge-1' });

      container.addShape(nodeA);
      container.addShape(nodeB);
      container.addShape(edge);

      gm.registerNode(nodeA.id);
      gm.registerNode(nodeB.id);
      gm.setNodeShape(nodeA.id, nodeA);
      gm.setNodeShape(nodeB.id, nodeB);
      gm.registerEdge(edge.id, edge.sourceNodeId, edge.targetNodeId);

      const command = new DeleteNodeCommand(container, nodeA);

      command.execute();
      command.undo();

      expectShapeInContainer(container, nodeA);
      expectShapeInContainer(container, nodeB);
      expectShapeInContainer(container, edge);
      expectContainerLength(container, 3);
    });

    it('should restore multiple connected edges', () => {
      const container = createMockContainer();
      const gm = getGraphManager();

      const nodeA = createTestNode({ id: 'node-a', label: 'A' });
      const nodeB = createTestNode({ id: 'node-b', label: 'B' });
      const nodeC = createTestNode({ id: 'node-c', label: 'C' });
      const edge1 = createTestEdge('node-a', 'node-b', { id: 'edge-1' });
      const edge2 = createTestEdge('node-a', 'node-c', { id: 'edge-2' });

      container.addShape(nodeA);
      container.addShape(nodeB);
      container.addShape(nodeC);
      container.addShape(edge1);
      container.addShape(edge2);

      gm.registerNode(nodeA.id);
      gm.registerNode(nodeB.id);
      gm.registerNode(nodeC.id);
      gm.setNodeShape(nodeA.id, nodeA);
      gm.setNodeShape(nodeB.id, nodeB);
      gm.setNodeShape(nodeC.id, nodeC);
      gm.registerEdge(edge1.id, edge1.sourceNodeId, edge1.targetNodeId);
      gm.registerEdge(edge2.id, edge2.sourceNodeId, edge2.targetNodeId);

      const command = new DeleteNodeCommand(container, nodeA);

      command.execute();
      command.undo();

      expectShapeInContainer(container, nodeA);
      expectShapeInContainer(container, edge1);
      expectShapeInContainer(container, edge2);
      expectContainerLength(container, 5);
    });

    it('should preserve same edge instances through undo', () => {
      const container = createMockContainer();
      const gm = getGraphManager();

      const nodeA = createTestNode({ id: 'node-a', label: 'A' });
      const nodeB = createTestNode({ id: 'node-b', label: 'B' });
      const edge = createTestEdge('node-a', 'node-b', { id: 'edge-1', direction: 'forward' });

      container.addShape(nodeA);
      container.addShape(nodeB);
      container.addShape(edge);

      gm.registerNode(nodeA.id);
      gm.registerNode(nodeB.id);
      gm.setNodeShape(nodeA.id, nodeA);
      gm.setNodeShape(nodeB.id, nodeB);
      gm.registerEdge(edge.id, edge.sourceNodeId, edge.targetNodeId);

      const command = new DeleteNodeCommand(container, nodeA);

      command.execute();
      command.undo();

      const shapes = container.getShapes();
      const restoredEdge = shapes.find(s => s.id === 'edge-1') as Edge;
      expect(restoredEdge).toBe(edge);
      expect(restoredEdge.direction).toBe('forward');
    });
  });

  describe('execute() after undo()', () => {
    it('should re-delete node and edges (redo behavior)', () => {
      const container = createMockContainer();
      const gm = getGraphManager();

      const nodeA = createTestNode({ id: 'node-a', label: 'A' });
      const nodeB = createTestNode({ id: 'node-b', label: 'B' });
      const edge = createTestEdge('node-a', 'node-b', { id: 'edge-1' });

      container.addShape(nodeA);
      container.addShape(nodeB);
      container.addShape(edge);

      gm.registerNode(nodeA.id);
      gm.registerNode(nodeB.id);
      gm.setNodeShape(nodeA.id, nodeA);
      gm.setNodeShape(nodeB.id, nodeB);
      gm.registerEdge(edge.id, edge.sourceNodeId, edge.targetNodeId);

      const command = new DeleteNodeCommand(container, nodeA);

      command.execute();
      command.undo();
      command.execute();

      expectShapeNotInContainer(container, nodeA);
      expectShapeNotInContainer(container, edge);
      expectShapeInContainer(container, nodeB);
      expectContainerLength(container, 1);
    });
  });

  describe('getDescription()', () => {
    it('should describe node deletion without edges', () => {
      const container = createMockContainer();
      const gm = getGraphManager();

      const node = createTestNode({ id: 'node-1', label: 'TestNode' });
      container.addShape(node);
      gm.registerNode(node.id);
      gm.setNodeShape(node.id, node);

      const command = new DeleteNodeCommand(container, node);

      expect(command.getDescription()).toBe('Delete node "TestNode"');
    });

    it('should describe node deletion with one edge', () => {
      const container = createMockContainer();
      const gm = getGraphManager();

      const nodeA = createTestNode({ id: 'node-a', label: 'A' });
      const nodeB = createTestNode({ id: 'node-b', label: 'B' });
      const edge = createTestEdge('node-a', 'node-b', { id: 'edge-1' });

      container.addShape(nodeA);
      container.addShape(nodeB);
      container.addShape(edge);

      gm.registerNode(nodeA.id);
      gm.registerNode(nodeB.id);
      gm.setNodeShape(nodeA.id, nodeA);
      gm.setNodeShape(nodeB.id, nodeB);
      gm.registerEdge(edge.id, edge.sourceNodeId, edge.targetNodeId);

      const command = new DeleteNodeCommand(container, nodeA);

      expect(command.getDescription()).toBe('Delete node "A" and 1 edge(s)');
    });

    it('should describe node deletion with multiple edges', () => {
      const container = createMockContainer();
      const gm = getGraphManager();

      const nodeA = createTestNode({ id: 'node-a', label: 'A' });
      const nodeB = createTestNode({ id: 'node-b', label: 'B' });
      const nodeC = createTestNode({ id: 'node-c', label: 'C' });
      const edge1 = createTestEdge('node-a', 'node-b', { id: 'edge-1' });
      const edge2 = createTestEdge('node-a', 'node-c', { id: 'edge-2' });

      container.addShape(nodeA);
      container.addShape(nodeB);
      container.addShape(nodeC);
      container.addShape(edge1);
      container.addShape(edge2);

      gm.registerNode(nodeA.id);
      gm.registerNode(nodeB.id);
      gm.registerNode(nodeC.id);
      gm.setNodeShape(nodeA.id, nodeA);
      gm.setNodeShape(nodeB.id, nodeB);
      gm.setNodeShape(nodeC.id, nodeC);
      gm.registerEdge(edge1.id, edge1.sourceNodeId, edge1.targetNodeId);
      gm.registerEdge(edge2.id, edge2.sourceNodeId, edge2.targetNodeId);

      const command = new DeleteNodeCommand(container, nodeA);

      expect(command.getDescription()).toBe('Delete node "A" and 2 edge(s)');
    });
  });
});
