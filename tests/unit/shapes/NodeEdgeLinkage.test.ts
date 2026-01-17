import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createTestNode, createTestStyle } from '../../utils/mock-factories';
import { getGraphManager } from '../../../src/renderer/core/GraphManager';
import { Edge } from '../../../src/renderer/shapes/Edge';

describe('Node-Edge Position Linkage', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    getGraphManager().clear();

    // Mock getBBox for SVGTextElement (not available in jsdom)
    if (!SVGElement.prototype.getBBox) {
      (SVGElement.prototype as any).getBBox = function() {
        return { x: 0, y: 0, width: 50, height: 16 };
      };
    }
  });

  afterEach(() => {
    vi.runAllTimers();
    vi.useRealTimers();
    getGraphManager().clear();
  });

  describe('single edge updates when source node moves', () => {
    it('should update edge path start point when source node moves', () => {
      const gm = getGraphManager();
      const nodeA = createTestNode({ id: 'node-a', cx: 100, cy: 100, rx: 30, ry: 30 });
      const nodeB = createTestNode({ id: 'node-b', cx: 300, cy: 100, rx: 30, ry: 30 });

      gm.registerNode(nodeA.id);
      gm.registerNode(nodeB.id);
      gm.setNodeShape(nodeA.id, nodeA);
      gm.setNodeShape(nodeB.id, nodeB);

      const edge = new Edge(
        'edge-1',
        'node-a',
        'node-b',
        'none',
        0,
        false,
        0,
        createTestStyle()
      );

      const element = edge.render();
      const pathEl = element.querySelector('path');
      const originalD = pathEl?.getAttribute('d') || '';

      // Move node A
      nodeA.cx = 150;
      nodeA.cy = 150;
      gm.setNodeShape(nodeA.id, nodeA);

      // Update the edge
      edge.updateElement();

      const newD = pathEl?.getAttribute('d') || '';

      // Path should have changed
      expect(newD).not.toBe(originalD);

      // Parse new start point
      const match = newD.match(/M\s+([\d.]+)\s+([\d.]+)/);
      expect(match).not.toBeNull();

      const startX = parseFloat(match![1]);
      const startY = parseFloat(match![2]);

      // Start should be near node A's new position (150, 150)
      expect(startX).toBeGreaterThan(130);
      expect(startY).toBeGreaterThan(130);
    });

    it('should update edge path when source node radius changes', () => {
      const gm = getGraphManager();
      const nodeA = createTestNode({ id: 'node-a', cx: 100, cy: 100, rx: 30, ry: 30 });
      const nodeB = createTestNode({ id: 'node-b', cx: 300, cy: 100, rx: 30, ry: 30 });

      gm.registerNode(nodeA.id);
      gm.registerNode(nodeB.id);
      gm.setNodeShape(nodeA.id, nodeA);
      gm.setNodeShape(nodeB.id, nodeB);

      const edge = new Edge(
        'edge-1',
        'node-a',
        'node-b',
        'none',
        0,
        false,
        0,
        createTestStyle()
      );

      const element = edge.render();
      const pathEl = element.querySelector('path');
      const originalD = pathEl?.getAttribute('d') || '';

      // Parse original start point
      const origMatch = originalD.match(/M\s+([\d.]+)\s+([\d.]+)/);
      const origStartX = parseFloat(origMatch![1]);

      // Change node A's radius
      nodeA.rx = 50;
      gm.setNodeShape(nodeA.id, nodeA);

      edge.updateElement();

      const newD = pathEl?.getAttribute('d') || '';
      const newMatch = newD.match(/M\s+([\d.]+)\s+([\d.]+)/);
      const newStartX = parseFloat(newMatch![1]);

      // Start point should be further from center due to larger radius
      expect(newStartX).toBeGreaterThan(origStartX);
    });
  });

  describe('single edge updates when target node moves', () => {
    it('should update edge path end point when target node moves', () => {
      const gm = getGraphManager();
      const nodeA = createTestNode({ id: 'node-a', cx: 100, cy: 100, rx: 30, ry: 30 });
      const nodeB = createTestNode({ id: 'node-b', cx: 300, cy: 100, rx: 30, ry: 30 });

      gm.registerNode(nodeA.id);
      gm.registerNode(nodeB.id);
      gm.setNodeShape(nodeA.id, nodeA);
      gm.setNodeShape(nodeB.id, nodeB);

      const edge = new Edge(
        'edge-1',
        'node-a',
        'node-b',
        'none',
        0,
        false,
        0,
        createTestStyle()
      );

      const element = edge.render();
      const pathEl = element.querySelector('path');
      const originalD = pathEl?.getAttribute('d') || '';

      // Move node B
      nodeB.cx = 400;
      nodeB.cy = 200;
      gm.setNodeShape(nodeB.id, nodeB);

      // Update the edge
      edge.updateElement();

      const newD = pathEl?.getAttribute('d') || '';

      // Path should have changed
      expect(newD).not.toBe(originalD);

      // Parse new end point from L command
      const match = newD.match(/L\s+([\d.]+)\s+([\d.]+)/);
      expect(match).not.toBeNull();

      const endX = parseFloat(match![1]);
      const endY = parseFloat(match![2]);

      // End should be near node B's new position (400, 200)
      expect(endX).toBeGreaterThan(350);
      expect(endY).toBeGreaterThan(150);
    });
  });

  describe('both nodes move', () => {
    it('should update edge path when both nodes move', () => {
      const gm = getGraphManager();
      const nodeA = createTestNode({ id: 'node-a', cx: 100, cy: 100, rx: 30, ry: 30 });
      const nodeB = createTestNode({ id: 'node-b', cx: 300, cy: 100, rx: 30, ry: 30 });

      gm.registerNode(nodeA.id);
      gm.registerNode(nodeB.id);
      gm.setNodeShape(nodeA.id, nodeA);
      gm.setNodeShape(nodeB.id, nodeB);

      const edge = new Edge(
        'edge-1',
        'node-a',
        'node-b',
        'none',
        0,
        false,
        0,
        createTestStyle()
      );

      const element = edge.render();
      const pathEl = element.querySelector('path');
      const originalD = pathEl?.getAttribute('d') || '';

      // Move both nodes
      nodeA.cx = 50;
      nodeA.cy = 50;
      nodeB.cx = 250;
      nodeB.cy = 250;
      gm.setNodeShape(nodeA.id, nodeA);
      gm.setNodeShape(nodeB.id, nodeB);

      edge.updateElement();

      const newD = pathEl?.getAttribute('d') || '';
      expect(newD).not.toBe(originalD);

      // Parse start and end points
      const startMatch = newD.match(/M\s+([\d.]+)\s+([\d.]+)/);
      const endMatch = newD.match(/L\s+([\d.]+)\s+([\d.]+)/);

      expect(startMatch).not.toBeNull();
      expect(endMatch).not.toBeNull();

      const startX = parseFloat(startMatch![1]);
      const startY = parseFloat(startMatch![2]);
      const endX = parseFloat(endMatch![1]);
      const endY = parseFloat(endMatch![2]);

      // Verify diagonal direction (both x and y increasing)
      expect(endX).toBeGreaterThan(startX);
      expect(endY).toBeGreaterThan(startY);
    });
  });

  describe('multiple edges connected to same node', () => {
    it('should update all edges when shared node moves', () => {
      const gm = getGraphManager();
      const nodeA = createTestNode({ id: 'node-a', cx: 200, cy: 200, rx: 30, ry: 30 });
      const nodeB = createTestNode({ id: 'node-b', cx: 100, cy: 100, rx: 30, ry: 30 });
      const nodeC = createTestNode({ id: 'node-c', cx: 300, cy: 100, rx: 30, ry: 30 });
      const nodeD = createTestNode({ id: 'node-d', cx: 200, cy: 350, rx: 30, ry: 30 });

      gm.registerNode(nodeA.id);
      gm.registerNode(nodeB.id);
      gm.registerNode(nodeC.id);
      gm.registerNode(nodeD.id);
      gm.setNodeShape(nodeA.id, nodeA);
      gm.setNodeShape(nodeB.id, nodeB);
      gm.setNodeShape(nodeC.id, nodeC);
      gm.setNodeShape(nodeD.id, nodeD);

      // Create edges: B->A, A->C, A->D
      const edgeBA = new Edge('edge-ba', 'node-b', 'node-a', 'none', 0, false, 0, createTestStyle());
      const edgeAC = new Edge('edge-ac', 'node-a', 'node-c', 'none', 0, false, 0, createTestStyle());
      const edgeAD = new Edge('edge-ad', 'node-a', 'node-d', 'none', 0, false, 0, createTestStyle());

      const elBA = edgeBA.render();
      const elAC = edgeAC.render();
      const elAD = edgeAD.render();

      const pathBA = elBA.querySelector('path');
      const pathAC = elAC.querySelector('path');
      const pathAD = elAD.querySelector('path');

      const origBA = pathBA?.getAttribute('d') || '';
      const origAC = pathAC?.getAttribute('d') || '';
      const origAD = pathAD?.getAttribute('d') || '';

      // Move node A (connected to all edges)
      nodeA.cx = 250;
      nodeA.cy = 250;
      gm.setNodeShape(nodeA.id, nodeA);

      edgeBA.updateElement();
      edgeAC.updateElement();
      edgeAD.updateElement();

      const newBA = pathBA?.getAttribute('d') || '';
      const newAC = pathAC?.getAttribute('d') || '';
      const newAD = pathAD?.getAttribute('d') || '';

      // All edges should have changed
      expect(newBA).not.toBe(origBA);
      expect(newAC).not.toBe(origAC);
      expect(newAD).not.toBe(origAD);
    });
  });

  describe('curved edge updates', () => {
    it('should update curve control point when node moves', () => {
      const gm = getGraphManager();
      const nodeA = createTestNode({ id: 'node-a', cx: 100, cy: 100, rx: 30, ry: 30 });
      const nodeB = createTestNode({ id: 'node-b', cx: 300, cy: 100, rx: 30, ry: 30 });

      gm.registerNode(nodeA.id);
      gm.registerNode(nodeB.id);
      gm.setNodeShape(nodeA.id, nodeA);
      gm.setNodeShape(nodeB.id, nodeB);

      // Create curved edge
      const edge = new Edge(
        'edge-1',
        'node-a',
        'node-b',
        'none',
        50,  // curveOffset for curved edge
        false,
        0,
        createTestStyle()
      );

      const element = edge.render();
      const pathEl = element.querySelector('path');
      const originalD = pathEl?.getAttribute('d') || '';

      // Parse original control point
      const origMatch = originalD.match(/Q\s+([\d.-]+)\s+([\d.-]+)/);
      expect(origMatch).not.toBeNull();
      const origCtrlX = parseFloat(origMatch![1]);
      const origCtrlY = parseFloat(origMatch![2]);

      // Move node B
      nodeB.cy = 200;
      gm.setNodeShape(nodeB.id, nodeB);

      edge.updateElement();

      const newD = pathEl?.getAttribute('d') || '';
      const newMatch = newD.match(/Q\s+([\d.-]+)\s+([\d.-]+)/);
      expect(newMatch).not.toBeNull();

      const newCtrlX = parseFloat(newMatch![1]);
      const newCtrlY = parseFloat(newMatch![2]);

      // Control point should have moved
      expect(newCtrlX).not.toBe(origCtrlX);
      expect(newCtrlY).not.toBe(origCtrlY);
    });
  });

  describe('self-loop edge updates', () => {
    it('should update self-loop when node moves', () => {
      const gm = getGraphManager();
      const nodeA = createTestNode({ id: 'node-a', cx: 200, cy: 200, rx: 30, ry: 30 });

      gm.registerNode(nodeA.id);
      gm.setNodeShape(nodeA.id, nodeA);

      const edge = new Edge(
        'edge-1',
        'node-a',
        'node-a',
        'none',
        0,
        true,  // isSelfLoop
        0,
        createTestStyle()
      );

      const element = edge.render();
      const pathEl = element.querySelector('path');
      const originalD = pathEl?.getAttribute('d') || '';

      // Parse original start
      const origMatch = originalD.match(/M\s+([\d.-]+)\s+([\d.-]+)/);
      const origStartX = parseFloat(origMatch![1]);
      const origStartY = parseFloat(origMatch![2]);

      // Move the node
      nodeA.cx = 300;
      nodeA.cy = 300;
      gm.setNodeShape(nodeA.id, nodeA);

      edge.updateElement();

      const newD = pathEl?.getAttribute('d') || '';
      const newMatch = newD.match(/M\s+([\d.-]+)\s+([\d.-]+)/);
      const newStartX = parseFloat(newMatch![1]);
      const newStartY = parseFloat(newMatch![2]);

      // Self-loop start should have moved with the node
      expect(newStartX).toBeGreaterThan(origStartX);
      expect(newStartY).toBeGreaterThan(origStartY);
    });

    it('should update self-loop when node radius changes', () => {
      const gm = getGraphManager();
      const nodeA = createTestNode({ id: 'node-a', cx: 200, cy: 200, rx: 30, ry: 30 });

      gm.registerNode(nodeA.id);
      gm.setNodeShape(nodeA.id, nodeA);

      const edge = new Edge(
        'edge-1',
        'node-a',
        'node-a',
        'none',
        0,
        true,
        0,
        createTestStyle()
      );

      const element = edge.render();
      const pathEl = element.querySelector('path');
      const originalD = pathEl?.getAttribute('d') || '';

      // Change the node radius
      nodeA.rx = 50;
      nodeA.ry = 50;
      gm.setNodeShape(nodeA.id, nodeA);

      edge.updateElement();

      const newD = pathEl?.getAttribute('d') || '';

      // Path should have changed due to different boundary intersection
      expect(newD).not.toBe(originalD);
    });
  });

  describe('edge label position updates', () => {
    it('should update label position when nodes move', () => {
      const gm = getGraphManager();
      const nodeA = createTestNode({ id: 'node-a', cx: 100, cy: 100, rx: 30, ry: 30 });
      const nodeB = createTestNode({ id: 'node-b', cx: 300, cy: 100, rx: 30, ry: 30 });

      gm.registerNode(nodeA.id);
      gm.registerNode(nodeB.id);
      gm.setNodeShape(nodeA.id, nodeA);
      gm.setNodeShape(nodeB.id, nodeB);

      const edge = new Edge(
        'edge-1',
        'node-a',
        'node-b',
        'none',
        0,
        false,
        0,
        createTestStyle(),
        'weight'  // label
      );

      const element = edge.render();
      vi.runAllTimers();  // Run setTimeout for label background update

      const textEl = element.querySelector('text');
      const origX = parseFloat(textEl?.getAttribute('x') || '0');

      // Move both nodes to the right
      nodeA.cx = 200;
      nodeB.cx = 400;
      gm.setNodeShape(nodeA.id, nodeA);
      gm.setNodeShape(nodeB.id, nodeB);

      edge.updateElement();
      vi.runAllTimers();

      const newX = parseFloat(textEl?.getAttribute('x') || '0');

      // Label should have moved to the right with the nodes
      expect(newX).toBeGreaterThan(origX);
    });
  });

  describe('direction marker updates', () => {
    it('should maintain marker orientation when edge angle changes', () => {
      const gm = getGraphManager();
      const nodeA = createTestNode({ id: 'node-a', cx: 100, cy: 100, rx: 30, ry: 30 });
      const nodeB = createTestNode({ id: 'node-b', cx: 300, cy: 100, rx: 30, ry: 30 });

      gm.registerNode(nodeA.id);
      gm.registerNode(nodeB.id);
      gm.setNodeShape(nodeA.id, nodeA);
      gm.setNodeShape(nodeB.id, nodeB);

      const edge = new Edge(
        'edge-1',
        'node-a',
        'node-b',
        'forward',  // directed edge
        0,
        false,
        0,
        createTestStyle({ stroke: '#000000' })
      );

      const element = edge.render();
      const pathEl = element.querySelector('path');

      // Verify marker exists
      expect(pathEl?.getAttribute('marker-end')).toContain('url(#marker-');

      // Move node B to create vertical edge
      nodeB.cx = 100;
      nodeB.cy = 300;
      gm.setNodeShape(nodeB.id, nodeB);

      edge.updateElement();

      // Marker should still exist after angle change
      expect(pathEl?.getAttribute('marker-end')).toContain('url(#marker-');

      // Path should now be vertical
      const d = pathEl?.getAttribute('d') || '';
      const startMatch = d.match(/M\s+([\d.]+)\s+([\d.]+)/);
      const endMatch = d.match(/L\s+([\d.]+)\s+([\d.]+)/);

      // X coordinates should be close (vertical line)
      const startX = parseFloat(startMatch![1]);
      const endX = parseFloat(endMatch![1]);
      expect(Math.abs(endX - startX)).toBeLessThan(10);
    });
  });
});
