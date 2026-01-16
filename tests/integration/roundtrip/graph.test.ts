import { describe, it, expect, beforeEach } from 'vitest';
import { Node } from '../../../src/renderer/shapes/Node';
import { Edge } from '../../../src/renderer/shapes/Edge';
import { getGraphManager } from '../../../src/renderer/core/GraphManager';
import {
  createTestNode,
  createTestEdge,
  createTestStyle,
  roundTrip
} from '../../utils/mock-factories';
import {
  expectNodeEqual,
  expectEdgeEqual,
  expectClose
} from '../../utils/shape-comparators';

describe('Graph Round-Trip', () => {
  beforeEach(() => {
    // Clear graph manager before each test
    getGraphManager().clear();
  });

  describe('Node', () => {
    it('should preserve node position and size', () => {
      const original = createTestNode({
        cx: 100,
        cy: 150,
        rx: 40,
        ry: 30
      });

      // Register node with GraphManager (required for serialization)
      const gm = getGraphManager();
      gm.registerNode(original.id);
      gm.setNodeShape(original.id, original);

      const { shapes } = roundTrip([original]);

      expect(shapes).toHaveLength(1);
      const restored = shapes[0] as Node;
      expectNodeEqual(restored, original);
    });

    it('should preserve node label', () => {
      const original = createTestNode({
        label: 'NodeA'
      });

      const gm = getGraphManager();
      gm.registerNode(original.id);
      gm.setNodeShape(original.id, original);

      const { shapes } = roundTrip([original]);

      expect(shapes).toHaveLength(1);
      const restored = shapes[0] as Node;
      expect(restored.label).toBe('NodeA');
    });

    it('should preserve node with unicode label', () => {
      const original = createTestNode({
        label: '日本語ノード'
      });

      const gm = getGraphManager();
      gm.registerNode(original.id);
      gm.setNodeShape(original.id, original);

      const { shapes } = roundTrip([original]);

      expect(shapes).toHaveLength(1);
      const restored = shapes[0] as Node;
      expect(restored.label).toBe('日本語ノード');
    });

    it('should preserve node with special characters in label', () => {
      const original = createTestNode({
        label: 'A & B < C'
      });

      const gm = getGraphManager();
      gm.registerNode(original.id);
      gm.setNodeShape(original.id, original);

      const { shapes } = roundTrip([original]);

      expect(shapes).toHaveLength(1);
      const restored = shapes[0] as Node;
      expect(restored.label).toBe('A & B < C');
    });

    it('should preserve node fontSize', () => {
      const original = createTestNode({
        fontSize: 20
      });

      const gm = getGraphManager();
      gm.registerNode(original.id);
      gm.setNodeShape(original.id, original);

      const { shapes } = roundTrip([original]);

      expect(shapes).toHaveLength(1);
      const restored = shapes[0] as Node;
      expect(restored.fontSize).toBe(20);
    });

    it('should preserve circular node (rx === ry)', () => {
      const original = createTestNode({
        rx: 50,
        ry: 50
      });

      const gm = getGraphManager();
      gm.registerNode(original.id);
      gm.setNodeShape(original.id, original);

      const { shapes } = roundTrip([original]);

      expect(shapes).toHaveLength(1);
      const restored = shapes[0] as Node;
      expectClose(restored.rx, 50);
      expectClose(restored.ry, 50);
    });

    it('should preserve elliptical node (rx !== ry)', () => {
      const original = createTestNode({
        rx: 60,
        ry: 30
      });

      const gm = getGraphManager();
      gm.registerNode(original.id);
      gm.setNodeShape(original.id, original);

      const { shapes } = roundTrip([original]);

      expect(shapes).toHaveLength(1);
      const restored = shapes[0] as Node;
      expectClose(restored.rx, 60);
      expectClose(restored.ry, 30);
    });
  });

  describe('Edge', () => {
    it('should preserve undirected edge', () => {
      // Create two nodes first
      const node1 = createTestNode({ id: 'node-1', cx: 100, cy: 100 });
      const node2 = createTestNode({ id: 'node-2', cx: 200, cy: 100 });

      const gm = getGraphManager();
      gm.registerNode(node1.id);
      gm.setNodeShape(node1.id, node1);
      gm.registerNode(node2.id);
      gm.setNodeShape(node2.id, node2);

      const edge = createTestEdge(node1.id, node2.id, {
        direction: 'none'
      });
      gm.registerEdge(edge.id, node1.id, node2.id);

      const { shapes } = roundTrip([node1, node2, edge]);

      const restoredEdge = shapes.find(s => s.type === 'edge') as Edge;
      expect(restoredEdge).toBeDefined();
      expect(restoredEdge.direction).toBe('none');
      expect(restoredEdge.sourceNodeId).toBe(node1.id);
      expect(restoredEdge.targetNodeId).toBe(node2.id);
    });

    it('should preserve forward directed edge', () => {
      const node1 = createTestNode({ id: 'node-1', cx: 100, cy: 100 });
      const node2 = createTestNode({ id: 'node-2', cx: 200, cy: 100 });

      const gm = getGraphManager();
      gm.registerNode(node1.id);
      gm.setNodeShape(node1.id, node1);
      gm.registerNode(node2.id);
      gm.setNodeShape(node2.id, node2);

      const edge = createTestEdge(node1.id, node2.id, {
        direction: 'forward'
      });
      gm.registerEdge(edge.id, node1.id, node2.id);

      const { shapes } = roundTrip([node1, node2, edge]);

      const restoredEdge = shapes.find(s => s.type === 'edge') as Edge;
      expect(restoredEdge).toBeDefined();
      expect(restoredEdge.direction).toBe('forward');
    });

    it('should preserve backward directed edge', () => {
      const node1 = createTestNode({ id: 'node-1', cx: 100, cy: 100 });
      const node2 = createTestNode({ id: 'node-2', cx: 200, cy: 100 });

      const gm = getGraphManager();
      gm.registerNode(node1.id);
      gm.setNodeShape(node1.id, node1);
      gm.registerNode(node2.id);
      gm.setNodeShape(node2.id, node2);

      const edge = createTestEdge(node1.id, node2.id, {
        direction: 'backward'
      });
      gm.registerEdge(edge.id, node1.id, node2.id);

      const { shapes } = roundTrip([node1, node2, edge]);

      const restoredEdge = shapes.find(s => s.type === 'edge') as Edge;
      expect(restoredEdge).toBeDefined();
      expect(restoredEdge.direction).toBe('backward');
    });

    it('should preserve edge with label', () => {
      const node1 = createTestNode({ id: 'node-1', cx: 100, cy: 100 });
      const node2 = createTestNode({ id: 'node-2', cx: 200, cy: 100 });

      const gm = getGraphManager();
      gm.registerNode(node1.id);
      gm.setNodeShape(node1.id, node1);
      gm.registerNode(node2.id);
      gm.setNodeShape(node2.id, node2);

      const edge = createTestEdge(node1.id, node2.id, {
        label: 'weight'
      });
      gm.registerEdge(edge.id, node1.id, node2.id);

      const { shapes } = roundTrip([node1, node2, edge]);

      const restoredEdge = shapes.find(s => s.type === 'edge') as Edge;
      expect(restoredEdge).toBeDefined();
      expect(restoredEdge.label).toBe('weight');
    });

    it('should preserve curved edge with offset', () => {
      const node1 = createTestNode({ id: 'node-1', cx: 100, cy: 100 });
      const node2 = createTestNode({ id: 'node-2', cx: 200, cy: 100 });

      const gm = getGraphManager();
      gm.registerNode(node1.id);
      gm.setNodeShape(node1.id, node1);
      gm.registerNode(node2.id);
      gm.setNodeShape(node2.id, node2);

      const edge = createTestEdge(node1.id, node2.id, {
        curveOffset: 30
      });
      gm.registerEdge(edge.id, node1.id, node2.id);

      const { shapes } = roundTrip([node1, node2, edge]);

      const restoredEdge = shapes.find(s => s.type === 'edge') as Edge;
      expect(restoredEdge).toBeDefined();
      expectClose(restoredEdge.curveOffset, 30);
    });

    it('should preserve self-loop edge', () => {
      const node = createTestNode({ id: 'node-1', cx: 100, cy: 100 });

      const gm = getGraphManager();
      gm.registerNode(node.id);
      gm.setNodeShape(node.id, node);

      const edge = createTestEdge(node.id, node.id, {
        isSelfLoop: true,
        selfLoopAngle: Math.PI / 2  // 90 degrees
      });
      gm.registerEdge(edge.id, node.id, node.id);

      const { shapes } = roundTrip([node, edge]);

      const restoredEdge = shapes.find(s => s.type === 'edge') as Edge;
      expect(restoredEdge).toBeDefined();
      expect(restoredEdge.isSelfLoop).toBe(true);
      expectClose(restoredEdge.selfLoopAngle, Math.PI / 2);
    });
  });

  describe('Complete Graph', () => {
    it('should preserve multiple nodes', () => {
      const node1 = createTestNode({ id: 'node-1', cx: 100, cy: 100, label: 'A' });
      const node2 = createTestNode({ id: 'node-2', cx: 200, cy: 100, label: 'B' });
      const node3 = createTestNode({ id: 'node-3', cx: 150, cy: 200, label: 'C' });

      const gm = getGraphManager();
      gm.registerNode(node1.id);
      gm.setNodeShape(node1.id, node1);
      gm.registerNode(node2.id);
      gm.setNodeShape(node2.id, node2);
      gm.registerNode(node3.id);
      gm.setNodeShape(node3.id, node3);

      const { shapes } = roundTrip([node1, node2, node3]);

      const nodes = shapes.filter(s => s.type === 'node') as Node[];
      expect(nodes).toHaveLength(3);

      const labels = nodes.map(n => n.label).sort();
      expect(labels).toEqual(['A', 'B', 'C']);
    });

    it('should preserve graph with nodes and edges', () => {
      const node1 = createTestNode({ id: 'node-1', cx: 100, cy: 100, label: 'A' });
      const node2 = createTestNode({ id: 'node-2', cx: 200, cy: 100, label: 'B' });
      const node3 = createTestNode({ id: 'node-3', cx: 150, cy: 200, label: 'C' });

      const gm = getGraphManager();
      gm.registerNode(node1.id);
      gm.setNodeShape(node1.id, node1);
      gm.registerNode(node2.id);
      gm.setNodeShape(node2.id, node2);
      gm.registerNode(node3.id);
      gm.setNodeShape(node3.id, node3);

      const edge1 = createTestEdge(node1.id, node2.id, { id: 'edge-1', direction: 'forward' });
      const edge2 = createTestEdge(node2.id, node3.id, { id: 'edge-2', direction: 'forward' });
      const edge3 = createTestEdge(node3.id, node1.id, { id: 'edge-3', direction: 'forward' });

      gm.registerEdge(edge1.id, node1.id, node2.id);
      gm.registerEdge(edge2.id, node2.id, node3.id);
      gm.registerEdge(edge3.id, node3.id, node1.id);

      const { shapes } = roundTrip([node1, node2, node3, edge1, edge2, edge3]);

      const nodes = shapes.filter(s => s.type === 'node') as Node[];
      const edges = shapes.filter(s => s.type === 'edge') as Edge[];

      expect(nodes).toHaveLength(3);
      expect(edges).toHaveLength(3);

      // Verify all edges have forward direction
      edges.forEach(e => {
        expect(e.direction).toBe('forward');
      });
    });

    it('should preserve parallel edges with different offsets', () => {
      const node1 = createTestNode({ id: 'node-1', cx: 100, cy: 100, label: 'A' });
      const node2 = createTestNode({ id: 'node-2', cx: 200, cy: 100, label: 'B' });

      const gm = getGraphManager();
      gm.registerNode(node1.id);
      gm.setNodeShape(node1.id, node1);
      gm.registerNode(node2.id);
      gm.setNodeShape(node2.id, node2);

      const edge1 = createTestEdge(node1.id, node2.id, { id: 'edge-1', curveOffset: 0 });
      const edge2 = createTestEdge(node1.id, node2.id, { id: 'edge-2', curveOffset: 30 });
      const edge3 = createTestEdge(node1.id, node2.id, { id: 'edge-3', curveOffset: -30 });

      gm.registerEdge(edge1.id, node1.id, node2.id);
      gm.registerEdge(edge2.id, node1.id, node2.id);
      gm.registerEdge(edge3.id, node1.id, node2.id);

      const { shapes } = roundTrip([node1, node2, edge1, edge2, edge3]);

      const edges = shapes.filter(s => s.type === 'edge') as Edge[];
      expect(edges).toHaveLength(3);

      const offsets = edges.map(e => e.curveOffset).sort((a, b) => a - b);
      expect(offsets[0]).toBeCloseTo(-30, 1);
      expect(offsets[1]).toBeCloseTo(0, 1);
      expect(offsets[2]).toBeCloseTo(30, 1);
    });
  });
});
