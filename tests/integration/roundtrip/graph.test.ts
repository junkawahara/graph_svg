import { describe, it, expect, beforeEach } from 'vitest';
import { Node } from '../../../src/renderer/shapes/Node';
import { Edge } from '../../../src/renderer/shapes/Edge';
import { Rectangle } from '../../../src/renderer/shapes/Rectangle';
import { getGraphManager } from '../../../src/renderer/core/GraphManager';
import {
  createTestNode,
  createTestEdge,
  createTestRectangle,
  createTestStyle,
  roundTrip
} from '../../utils/mock-factories';
import {
  expectNodeEqual,
  expectEdgeEqual,
  expectClose,
  expectStyleEqual
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

  describe('Node Styles', () => {
    it('should preserve node fill color', () => {
      const style = createTestStyle({ fill: '#ff0000' });
      const node = createTestNode({ id: 'node-1', style });

      const gm = getGraphManager();
      gm.registerNode(node.id);
      gm.setNodeShape(node.id, node);

      const { shapes } = roundTrip([node]);

      const restored = shapes[0] as Node;
      expect(restored.style.fill).toBe('#ff0000');
    });

    it('should preserve node stroke color', () => {
      const style = createTestStyle({ stroke: '#0000ff', strokeWidth: 3 });
      const node = createTestNode({ id: 'node-1', style });

      const gm = getGraphManager();
      gm.registerNode(node.id);
      gm.setNodeShape(node.id, node);

      const { shapes } = roundTrip([node]);

      const restored = shapes[0] as Node;
      expect(restored.style.stroke).toBe('#0000ff');
      expectClose(restored.style.strokeWidth, 3);
    });

    it('should preserve node opacity', () => {
      const style = createTestStyle({ opacity: 0.5 });
      const node = createTestNode({ id: 'node-1', style });

      const gm = getGraphManager();
      gm.registerNode(node.id);
      gm.setNodeShape(node.id, node);

      const { shapes } = roundTrip([node]);

      const restored = shapes[0] as Node;
      expectClose(restored.style.opacity, 0.5);
    });

    it('should preserve node with fillNone', () => {
      const style = createTestStyle({ fillNone: true, stroke: '#000000', strokeWidth: 2 });
      const node = createTestNode({ id: 'node-1', style });

      const gm = getGraphManager();
      gm.registerNode(node.id);
      gm.setNodeShape(node.id, node);

      const { shapes } = roundTrip([node]);

      const restored = shapes[0] as Node;
      expect(restored.style.fillNone).toBe(true);
    });

    it('should preserve multiple nodes with different styles', () => {
      const style1 = createTestStyle({ fill: '#ff0000', strokeWidth: 1 });
      const style2 = createTestStyle({ fill: '#00ff00', strokeWidth: 2 });
      const style3 = createTestStyle({ fill: '#0000ff', strokeWidth: 3 });

      const node1 = createTestNode({ id: 'node-1', cx: 100, cy: 100, style: style1 });
      const node2 = createTestNode({ id: 'node-2', cx: 200, cy: 100, style: style2 });
      const node3 = createTestNode({ id: 'node-3', cx: 300, cy: 100, style: style3 });

      const gm = getGraphManager();
      [node1, node2, node3].forEach(n => {
        gm.registerNode(n.id);
        gm.setNodeShape(n.id, n);
      });

      const { shapes } = roundTrip([node1, node2, node3]);

      const nodes = shapes.filter(s => s.type === 'node') as Node[];
      expect(nodes).toHaveLength(3);

      // Sort by x position to ensure consistent order
      const sorted = nodes.sort((a, b) => a.cx - b.cx);
      expect(sorted[0].style.fill).toBe('#ff0000');
      expect(sorted[1].style.fill).toBe('#00ff00');
      expect(sorted[2].style.fill).toBe('#0000ff');
    });
  });

  describe('Edge Styles', () => {
    it('should preserve edge stroke color', () => {
      const node1 = createTestNode({ id: 'node-1', cx: 100, cy: 100 });
      const node2 = createTestNode({ id: 'node-2', cx: 200, cy: 100 });

      const gm = getGraphManager();
      gm.registerNode(node1.id);
      gm.setNodeShape(node1.id, node1);
      gm.registerNode(node2.id);
      gm.setNodeShape(node2.id, node2);

      const style = createTestStyle({ fillNone: true, stroke: '#ff0000', strokeWidth: 2 });
      const edge = createTestEdge(node1.id, node2.id, { style });
      gm.registerEdge(edge.id, node1.id, node2.id);

      const { shapes } = roundTrip([node1, node2, edge]);

      const restoredEdge = shapes.find(s => s.type === 'edge') as Edge;
      expect(restoredEdge.style.stroke).toBe('#ff0000');
    });

    it('should preserve edge stroke width', () => {
      const node1 = createTestNode({ id: 'node-1', cx: 100, cy: 100 });
      const node2 = createTestNode({ id: 'node-2', cx: 200, cy: 100 });

      const gm = getGraphManager();
      gm.registerNode(node1.id);
      gm.setNodeShape(node1.id, node1);
      gm.registerNode(node2.id);
      gm.setNodeShape(node2.id, node2);

      const style = createTestStyle({ fillNone: true, strokeWidth: 5 });
      const edge = createTestEdge(node1.id, node2.id, { style });
      gm.registerEdge(edge.id, node1.id, node2.id);

      const { shapes } = roundTrip([node1, node2, edge]);

      const restoredEdge = shapes.find(s => s.type === 'edge') as Edge;
      expectClose(restoredEdge.style.strokeWidth, 5);
    });

    it('should preserve edge dasharray (dashed edge)', () => {
      const node1 = createTestNode({ id: 'node-1', cx: 100, cy: 100 });
      const node2 = createTestNode({ id: 'node-2', cx: 200, cy: 100 });

      const gm = getGraphManager();
      gm.registerNode(node1.id);
      gm.setNodeShape(node1.id, node1);
      gm.registerNode(node2.id);
      gm.setNodeShape(node2.id, node2);

      const style = createTestStyle({ fillNone: true, strokeDasharray: '5,5' });
      const edge = createTestEdge(node1.id, node2.id, { style });
      gm.registerEdge(edge.id, node1.id, node2.id);

      const { shapes } = roundTrip([node1, node2, edge]);

      const restoredEdge = shapes.find(s => s.type === 'edge') as Edge;
      expect(restoredEdge.style.strokeDasharray).toBe('5,5');
    });

    it('should preserve edge opacity', () => {
      const node1 = createTestNode({ id: 'node-1', cx: 100, cy: 100 });
      const node2 = createTestNode({ id: 'node-2', cx: 200, cy: 100 });

      const gm = getGraphManager();
      gm.registerNode(node1.id);
      gm.setNodeShape(node1.id, node1);
      gm.registerNode(node2.id);
      gm.setNodeShape(node2.id, node2);

      const style = createTestStyle({ fillNone: true, opacity: 0.7 });
      const edge = createTestEdge(node1.id, node2.id, { style });
      gm.registerEdge(edge.id, node1.id, node2.id);

      const { shapes } = roundTrip([node1, node2, edge]);

      const restoredEdge = shapes.find(s => s.type === 'edge') as Edge;
      expectClose(restoredEdge.style.opacity, 0.7);
    });
  });

  describe('Complex Graph Structures', () => {
    it('should preserve complete graph K5 (5 nodes, 10 edges)', () => {
      const gm = getGraphManager();
      const nodes: Node[] = [];
      const edges: Edge[] = [];

      // Create 5 nodes in a circle
      for (let i = 0; i < 5; i++) {
        const angle = (2 * Math.PI * i) / 5;
        const node = createTestNode({
          id: `node-${i}`,
          cx: 200 + 100 * Math.cos(angle),
          cy: 200 + 100 * Math.sin(angle),
          label: String.fromCharCode(65 + i) // A, B, C, D, E
        });
        gm.registerNode(node.id);
        gm.setNodeShape(node.id, node);
        nodes.push(node);
      }

      // Create edges for complete graph (every pair connected)
      let edgeCount = 0;
      for (let i = 0; i < 5; i++) {
        for (let j = i + 1; j < 5; j++) {
          const edge = createTestEdge(nodes[i].id, nodes[j].id, {
            id: `edge-${edgeCount++}`
          });
          gm.registerEdge(edge.id, nodes[i].id, nodes[j].id);
          edges.push(edge);
        }
      }

      const { shapes } = roundTrip([...nodes, ...edges]);

      const restoredNodes = shapes.filter(s => s.type === 'node') as Node[];
      const restoredEdges = shapes.filter(s => s.type === 'edge') as Edge[];

      expect(restoredNodes).toHaveLength(5);
      expect(restoredEdges).toHaveLength(10);

      // Verify all node labels
      const labels = restoredNodes.map(n => n.label).sort();
      expect(labels).toEqual(['A', 'B', 'C', 'D', 'E']);
    });

    it('should preserve graph with 4 parallel edges between same nodes', () => {
      const node1 = createTestNode({ id: 'node-1', cx: 100, cy: 100, label: 'A' });
      const node2 = createTestNode({ id: 'node-2', cx: 300, cy: 100, label: 'B' });

      const gm = getGraphManager();
      gm.registerNode(node1.id);
      gm.setNodeShape(node1.id, node1);
      gm.registerNode(node2.id);
      gm.setNodeShape(node2.id, node2);

      const offsets = [-45, -15, 15, 45];
      const edges = offsets.map((offset, i) => {
        const edge = createTestEdge(node1.id, node2.id, {
          id: `edge-${i}`,
          curveOffset: offset
        });
        gm.registerEdge(edge.id, node1.id, node2.id);
        return edge;
      });

      const { shapes } = roundTrip([node1, node2, ...edges]);

      const restoredEdges = shapes.filter(s => s.type === 'edge') as Edge[];
      expect(restoredEdges).toHaveLength(4);

      const restoredOffsets = restoredEdges.map(e => e.curveOffset).sort((a, b) => a - b);
      expect(restoredOffsets[0]).toBeCloseTo(-45, 1);
      expect(restoredOffsets[1]).toBeCloseTo(-15, 1);
      expect(restoredOffsets[2]).toBeCloseTo(15, 1);
      expect(restoredOffsets[3]).toBeCloseTo(45, 1);
    });

    it('should preserve tree structure (parent-child relationships)', () => {
      const gm = getGraphManager();

      // Create a simple tree: root -> [child1, child2], child1 -> [grandchild]
      const root = createTestNode({ id: 'root', cx: 200, cy: 50, label: 'Root' });
      const child1 = createTestNode({ id: 'child1', cx: 100, cy: 150, label: 'C1' });
      const child2 = createTestNode({ id: 'child2', cx: 300, cy: 150, label: 'C2' });
      const grandchild = createTestNode({ id: 'grandchild', cx: 100, cy: 250, label: 'GC' });

      [root, child1, child2, grandchild].forEach(n => {
        gm.registerNode(n.id);
        gm.setNodeShape(n.id, n);
      });

      const edge1 = createTestEdge(root.id, child1.id, { id: 'e1', direction: 'forward' });
      const edge2 = createTestEdge(root.id, child2.id, { id: 'e2', direction: 'forward' });
      const edge3 = createTestEdge(child1.id, grandchild.id, { id: 'e3', direction: 'forward' });

      [edge1, edge2, edge3].forEach(e => {
        gm.registerEdge(e.id, e.sourceNodeId, e.targetNodeId);
      });

      const { shapes } = roundTrip([root, child1, child2, grandchild, edge1, edge2, edge3]);

      const nodes = shapes.filter(s => s.type === 'node') as Node[];
      const edges = shapes.filter(s => s.type === 'edge') as Edge[];

      expect(nodes).toHaveLength(4);
      expect(edges).toHaveLength(3);

      // All edges should be forward directed
      edges.forEach(e => {
        expect(e.direction).toBe('forward');
      });
    });
  });

  describe('Self-Loop Variations', () => {
    it('should preserve self-loop at 0 degrees (top)', () => {
      const node = createTestNode({ id: 'node-1', cx: 100, cy: 100 });

      const gm = getGraphManager();
      gm.registerNode(node.id);
      gm.setNodeShape(node.id, node);

      const edge = createTestEdge(node.id, node.id, {
        isSelfLoop: true,
        selfLoopAngle: 0
      });
      gm.registerEdge(edge.id, node.id, node.id);

      const { shapes } = roundTrip([node, edge]);

      const restoredEdge = shapes.find(s => s.type === 'edge') as Edge;
      expect(restoredEdge.isSelfLoop).toBe(true);
      expectClose(restoredEdge.selfLoopAngle, 0);
    });

    it('should preserve self-loop at various angles', () => {
      const angles = [0, Math.PI / 4, Math.PI / 2, Math.PI, 3 * Math.PI / 2];

      for (const angle of angles) {
        const gm = getGraphManager();
        gm.clear();

        const node = createTestNode({ id: 'node-1', cx: 100, cy: 100 });
        gm.registerNode(node.id);
        gm.setNodeShape(node.id, node);

        const edge = createTestEdge(node.id, node.id, {
          isSelfLoop: true,
          selfLoopAngle: angle
        });
        gm.registerEdge(edge.id, node.id, node.id);

        const { shapes } = roundTrip([node, edge]);

        const restoredEdge = shapes.find(s => s.type === 'edge') as Edge;
        expect(restoredEdge.isSelfLoop).toBe(true);
        expectClose(restoredEdge.selfLoopAngle, angle);
      }
    });

    it('should preserve multiple self-loops on same node', () => {
      const node = createTestNode({ id: 'node-1', cx: 100, cy: 100 });

      const gm = getGraphManager();
      gm.registerNode(node.id);
      gm.setNodeShape(node.id, node);

      const edge1 = createTestEdge(node.id, node.id, {
        id: 'edge-1',
        isSelfLoop: true,
        selfLoopAngle: 0
      });
      const edge2 = createTestEdge(node.id, node.id, {
        id: 'edge-2',
        isSelfLoop: true,
        selfLoopAngle: Math.PI
      });

      gm.registerEdge(edge1.id, node.id, node.id);
      gm.registerEdge(edge2.id, node.id, node.id);

      const { shapes } = roundTrip([node, edge1, edge2]);

      const edges = shapes.filter(s => s.type === 'edge') as Edge[];
      expect(edges).toHaveLength(2);

      edges.forEach(e => {
        expect(e.isSelfLoop).toBe(true);
      });

      const angles = edges.map(e => e.selfLoopAngle).sort((a, b) => a - b);
      expectClose(angles[0], 0);
      expectClose(angles[1], Math.PI);
    });

    it('should preserve directed self-loop', () => {
      const node = createTestNode({ id: 'node-1', cx: 100, cy: 100 });

      const gm = getGraphManager();
      gm.registerNode(node.id);
      gm.setNodeShape(node.id, node);

      const edge = createTestEdge(node.id, node.id, {
        isSelfLoop: true,
        selfLoopAngle: Math.PI / 2,
        direction: 'forward'
      });
      gm.registerEdge(edge.id, node.id, node.id);

      const { shapes } = roundTrip([node, edge]);

      const restoredEdge = shapes.find(s => s.type === 'edge') as Edge;
      expect(restoredEdge.isSelfLoop).toBe(true);
      expect(restoredEdge.direction).toBe('forward');
    });
  });

  describe('Edge Cases', () => {
    it('should preserve node with very long label', () => {
      const longLabel = 'This is a very long node label that spans multiple characters';
      const node = createTestNode({ id: 'node-1', label: longLabel });

      const gm = getGraphManager();
      gm.registerNode(node.id);
      gm.setNodeShape(node.id, node);

      const { shapes } = roundTrip([node]);

      const restored = shapes[0] as Node;
      expect(restored.label).toBe(longLabel);
    });

    it('should preserve node with empty label', () => {
      const node = createTestNode({ id: 'node-1', label: '' });

      const gm = getGraphManager();
      gm.registerNode(node.id);
      gm.setNodeShape(node.id, node);

      const { shapes } = roundTrip([node]);

      const restored = shapes[0] as Node;
      expect(restored.label).toBe('');
    });

    it('should preserve edge with special characters in label', () => {
      const node1 = createTestNode({ id: 'node-1', cx: 100, cy: 100 });
      const node2 = createTestNode({ id: 'node-2', cx: 200, cy: 100 });

      const gm = getGraphManager();
      gm.registerNode(node1.id);
      gm.setNodeShape(node1.id, node1);
      gm.registerNode(node2.id);
      gm.setNodeShape(node2.id, node2);

      const edge = createTestEdge(node1.id, node2.id, {
        label: 'weight < 10 & > 5'
      });
      gm.registerEdge(edge.id, node1.id, node2.id);

      const { shapes } = roundTrip([node1, node2, edge]);

      const restoredEdge = shapes.find(s => s.type === 'edge') as Edge;
      expect(restoredEdge.label).toBe('weight < 10 & > 5');
    });

    it('should preserve edge with unicode label', () => {
      const node1 = createTestNode({ id: 'node-1', cx: 100, cy: 100 });
      const node2 = createTestNode({ id: 'node-2', cx: 200, cy: 100 });

      const gm = getGraphManager();
      gm.registerNode(node1.id);
      gm.setNodeShape(node1.id, node1);
      gm.registerNode(node2.id);
      gm.setNodeShape(node2.id, node2);

      const edge = createTestEdge(node1.id, node2.id, {
        label: '重み：５'
      });
      gm.registerEdge(edge.id, node1.id, node2.id);

      const { shapes } = roundTrip([node1, node2, edge]);

      const restoredEdge = shapes.find(s => s.type === 'edge') as Edge;
      expect(restoredEdge.label).toBe('重み：５');
    });

    it('should preserve edge with empty label', () => {
      const node1 = createTestNode({ id: 'node-1', cx: 100, cy: 100 });
      const node2 = createTestNode({ id: 'node-2', cx: 200, cy: 100 });

      const gm = getGraphManager();
      gm.registerNode(node1.id);
      gm.setNodeShape(node1.id, node1);
      gm.registerNode(node2.id);
      gm.setNodeShape(node2.id, node2);

      const edge = createTestEdge(node1.id, node2.id, {
        label: ''
      });
      gm.registerEdge(edge.id, node1.id, node2.id);

      const { shapes } = roundTrip([node1, node2, edge]);

      const restoredEdge = shapes.find(s => s.type === 'edge') as Edge;
      // Empty label should be undefined or empty string
      expect(restoredEdge.label === undefined || restoredEdge.label === '').toBe(true);
    });

    it('should preserve node at boundary position (0, 0)', () => {
      const node = createTestNode({ id: 'node-1', cx: 0, cy: 0 });

      const gm = getGraphManager();
      gm.registerNode(node.id);
      gm.setNodeShape(node.id, node);

      const { shapes } = roundTrip([node]);

      const restored = shapes[0] as Node;
      expectClose(restored.cx, 0);
      expectClose(restored.cy, 0);
    });

    it('should preserve node with very small size', () => {
      const node = createTestNode({ id: 'node-1', rx: 5, ry: 5 });

      const gm = getGraphManager();
      gm.registerNode(node.id);
      gm.setNodeShape(node.id, node);

      const { shapes } = roundTrip([node]);

      const restored = shapes[0] as Node;
      expectClose(restored.rx, 5);
      expectClose(restored.ry, 5);
    });

    it('should preserve node with very large size', () => {
      const node = createTestNode({ id: 'node-1', rx: 200, ry: 150 });

      const gm = getGraphManager();
      gm.registerNode(node.id);
      gm.setNodeShape(node.id, node);

      const { shapes } = roundTrip([node]);

      const restored = shapes[0] as Node;
      expectClose(restored.rx, 200);
      expectClose(restored.ry, 150);
    });
  });

  describe('Mixed Scenarios', () => {
    it('should preserve graph with regular shapes', () => {
      const node1 = createTestNode({ id: 'node-1', cx: 100, cy: 100, label: 'A' });
      const node2 = createTestNode({ id: 'node-2', cx: 200, cy: 100, label: 'B' });
      const rect = createTestRectangle({ id: 'rect-1', x: 300, y: 50, width: 80, height: 60 });

      const gm = getGraphManager();
      gm.registerNode(node1.id);
      gm.setNodeShape(node1.id, node1);
      gm.registerNode(node2.id);
      gm.setNodeShape(node2.id, node2);

      const edge = createTestEdge(node1.id, node2.id, { id: 'edge-1' });
      gm.registerEdge(edge.id, node1.id, node2.id);

      const { shapes } = roundTrip([node1, node2, edge, rect]);

      const nodes = shapes.filter(s => s.type === 'node') as Node[];
      const edges = shapes.filter(s => s.type === 'edge') as Edge[];
      const rectangles = shapes.filter(s => s.type === 'rectangle') as Rectangle[];

      expect(nodes).toHaveLength(2);
      expect(edges).toHaveLength(1);
      expect(rectangles).toHaveLength(1);
    });

    it('should preserve multiple graphs (disconnected components)', () => {
      const gm = getGraphManager();

      // First graph component
      const nodeA1 = createTestNode({ id: 'a1', cx: 50, cy: 100, label: 'A1' });
      const nodeA2 = createTestNode({ id: 'a2', cx: 150, cy: 100, label: 'A2' });
      gm.registerNode(nodeA1.id);
      gm.setNodeShape(nodeA1.id, nodeA1);
      gm.registerNode(nodeA2.id);
      gm.setNodeShape(nodeA2.id, nodeA2);
      const edgeA = createTestEdge(nodeA1.id, nodeA2.id, { id: 'ea' });
      gm.registerEdge(edgeA.id, nodeA1.id, nodeA2.id);

      // Second graph component (disconnected)
      const nodeB1 = createTestNode({ id: 'b1', cx: 300, cy: 100, label: 'B1' });
      const nodeB2 = createTestNode({ id: 'b2', cx: 400, cy: 100, label: 'B2' });
      gm.registerNode(nodeB1.id);
      gm.setNodeShape(nodeB1.id, nodeB1);
      gm.registerNode(nodeB2.id);
      gm.setNodeShape(nodeB2.id, nodeB2);
      const edgeB = createTestEdge(nodeB1.id, nodeB2.id, { id: 'eb' });
      gm.registerEdge(edgeB.id, nodeB1.id, nodeB2.id);

      const { shapes } = roundTrip([nodeA1, nodeA2, edgeA, nodeB1, nodeB2, edgeB]);

      const nodes = shapes.filter(s => s.type === 'node') as Node[];
      const edges = shapes.filter(s => s.type === 'edge') as Edge[];

      expect(nodes).toHaveLength(4);
      expect(edges).toHaveLength(2);

      // Verify labels
      const labels = nodes.map(n => n.label).sort();
      expect(labels).toEqual(['A1', 'A2', 'B1', 'B2']);
    });

    it('should preserve edge connections after round-trip', () => {
      const node1 = createTestNode({ id: 'node-1', cx: 100, cy: 100, label: 'Start' });
      const node2 = createTestNode({ id: 'node-2', cx: 200, cy: 100, label: 'End' });

      const gm = getGraphManager();
      gm.registerNode(node1.id);
      gm.setNodeShape(node1.id, node1);
      gm.registerNode(node2.id);
      gm.setNodeShape(node2.id, node2);

      const edge = createTestEdge(node1.id, node2.id, { id: 'edge-1', direction: 'forward' });
      gm.registerEdge(edge.id, node1.id, node2.id);

      const { shapes } = roundTrip([node1, node2, edge]);

      const restoredEdge = shapes.find(s => s.type === 'edge') as Edge;
      const restoredNodes = shapes.filter(s => s.type === 'node') as Node[];

      // Verify edge still references correct node IDs
      expect(restoredEdge.sourceNodeId).toBe('node-1');
      expect(restoredEdge.targetNodeId).toBe('node-2');

      // Verify nodes exist with those IDs
      const sourceNode = restoredNodes.find(n => n.id === restoredEdge.sourceNodeId);
      const targetNode = restoredNodes.find(n => n.id === restoredEdge.targetNodeId);

      expect(sourceNode).toBeDefined();
      expect(targetNode).toBeDefined();
      expect(sourceNode!.label).toBe('Start');
      expect(targetNode!.label).toBe('End');
    });
  });
});
