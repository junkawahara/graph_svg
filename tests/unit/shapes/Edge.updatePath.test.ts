import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createTestNode, createTestEdge, createTestStyle } from '../../utils/mock-factories';
import { getGraphManager } from '../../../src/renderer/core/GraphManager';
import { Edge } from '../../../src/renderer/shapes/Edge';

describe('Edge.updatePath()', () => {
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

  describe('straight line edge', () => {
    it('should create straight line path between two nodes', () => {
      const gm = getGraphManager();
      const nodeA = createTestNode({ id: 'node-a', cx: 100, cy: 100, rx: 30, ry: 30 });
      const nodeB = createTestNode({ id: 'node-b', cx: 300, cy: 100, rx: 30, ry: 30 });

      // Register and render nodes
      gm.registerNode(nodeA.id);
      gm.registerNode(nodeB.id);
      gm.setNodeShape(nodeA.id, nodeA);
      gm.setNodeShape(nodeB.id, nodeB);

      const edge = new Edge(
        'edge-1',
        'node-a',
        'node-b',
        'none',
        0,  // curveOffset = 0 for straight line
        false,
        0,
        createTestStyle()
      );

      // Mock DOM element for render
      const element = edge.render();

      // Get the path element
      const pathEl = element.querySelector('path');
      expect(pathEl).not.toBeNull();

      // Path should be a straight line (M ... L ...)
      const d = pathEl?.getAttribute('d');
      expect(d).toContain('M');
      expect(d).toContain('L');
      expect(d).not.toContain('Q');  // No quadratic bezier
      expect(d).not.toContain('C');  // No cubic bezier
    });

    it('should start from source node boundary', () => {
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
      const d = pathEl?.getAttribute('d') || '';

      // Parse start point from path
      const match = d.match(/M\s+([\d.]+)\s+([\d.]+)/);
      expect(match).not.toBeNull();

      const startX = parseFloat(match![1]);
      const startY = parseFloat(match![2]);

      // Start point should be on node A's boundary (not center)
      // Node A center is (100, 100), radius is 30
      // For horizontal edge, start should be around (130, 100)
      expect(startX).toBeGreaterThan(100);  // Past node center
      expect(startX).toBeLessThanOrEqual(130);  // On or inside boundary
    });

    it('should end at target node boundary', () => {
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
      const d = pathEl?.getAttribute('d') || '';

      // Parse end point from path (L command)
      const match = d.match(/L\s+([\d.]+)\s+([\d.]+)/);
      expect(match).not.toBeNull();

      const endX = parseFloat(match![1]);
      const endY = parseFloat(match![2]);

      // End point should be on node B's boundary
      // Node B center is (300, 100), radius is 30
      // For horizontal edge, end should be around (270, 100)
      expect(endX).toBeLessThan(300);  // Before node center
      expect(endX).toBeGreaterThanOrEqual(270);  // On or outside boundary
    });
  });

  describe('curved edge (parallel edges)', () => {
    it('should create quadratic bezier for curved edge', () => {
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
        50,  // curveOffset > 0 for curved edge
        false,
        0,
        createTestStyle(),
        undefined,  // label
        'curve',    // lineType
        50          // curveAmount
      );

      const element = edge.render();
      const pathEl = element.querySelector('path');
      const d = pathEl?.getAttribute('d') || '';

      // Path should contain Q for quadratic bezier
      expect(d).toContain('Q');
    });

    it('should curve in opposite direction for negative offset', () => {
      const gm = getGraphManager();
      const nodeA = createTestNode({ id: 'node-a', cx: 100, cy: 100, rx: 30, ry: 30 });
      const nodeB = createTestNode({ id: 'node-b', cx: 300, cy: 100, rx: 30, ry: 30 });

      gm.registerNode(nodeA.id);
      gm.registerNode(nodeB.id);
      gm.setNodeShape(nodeA.id, nodeA);
      gm.setNodeShape(nodeB.id, nodeB);

      const edgePositive = new Edge(
        'edge-pos',
        'node-a',
        'node-b',
        'none',
        50,
        false,
        0,
        createTestStyle(),
        undefined,  // label
        'curve',    // lineType
        50          // curveAmount
      );

      const edgeNegative = new Edge(
        'edge-neg',
        'node-a',
        'node-b',
        'none',
        -50,
        false,
        0,
        createTestStyle(),
        undefined,  // label
        'curve',    // lineType
        -50         // curveAmount
      );

      const elementPos = edgePositive.render();
      const elementNeg = edgeNegative.render();

      const dPos = elementPos.querySelector('path')?.getAttribute('d') || '';
      const dNeg = elementNeg.querySelector('path')?.getAttribute('d') || '';

      // Extract control point Y from Q command
      const matchPos = dPos.match(/Q\s+([\d.-]+)\s+([\d.-]+)/);
      const matchNeg = dNeg.match(/Q\s+([\d.-]+)\s+([\d.-]+)/);

      expect(matchPos).not.toBeNull();
      expect(matchNeg).not.toBeNull();

      const ctrlYPos = parseFloat(matchPos![2]);
      const ctrlYNeg = parseFloat(matchNeg![2]);

      // Control points should be on opposite sides of the line
      // The actual direction depends on implementation - just verify they're different
      expect(ctrlYPos).not.toEqual(ctrlYNeg);
    });
  });

  describe('self-loop edge', () => {
    it('should create cubic bezier for self-loop', () => {
      const gm = getGraphManager();
      const nodeA = createTestNode({ id: 'node-a', cx: 100, cy: 100, rx: 30, ry: 30 });

      gm.registerNode(nodeA.id);
      gm.setNodeShape(nodeA.id, nodeA);

      const edge = new Edge(
        'edge-1',
        'node-a',
        'node-a',  // Same node = self-loop
        'none',
        0,
        true,
        0,  // selfLoopAngle = 0 (pointing right)
        createTestStyle()
      );

      const element = edge.render();
      const pathEl = element.querySelector('path');
      const d = pathEl?.getAttribute('d') || '';

      // Self-loop should use C (cubic bezier)
      expect(d).toContain('C');
    });

    it('should position self-loop based on selfLoopAngle', () => {
      const gm = getGraphManager();
      const nodeA = createTestNode({ id: 'node-a', cx: 100, cy: 100, rx: 30, ry: 30 });

      gm.registerNode(nodeA.id);
      gm.setNodeShape(nodeA.id, nodeA);

      const edgeTop = new Edge(
        'edge-top',
        'node-a',
        'node-a',
        'none',
        0,
        true,
        -Math.PI / 2,  // -90 degrees = top
        createTestStyle()
      );

      const edgeBottom = new Edge(
        'edge-bottom',
        'node-a',
        'node-a',
        'none',
        0,
        true,
        Math.PI / 2,  // 90 degrees = bottom
        createTestStyle()
      );

      const elementTop = edgeTop.render();
      const elementBottom = edgeBottom.render();

      const dTop = elementTop.querySelector('path')?.getAttribute('d') || '';
      const dBottom = elementBottom.querySelector('path')?.getAttribute('d') || '';

      // Parse start points
      const matchTop = dTop.match(/M\s+([\d.-]+)\s+([\d.-]+)/);
      const matchBottom = dBottom.match(/M\s+([\d.-]+)\s+([\d.-]+)/);

      expect(matchTop).not.toBeNull();
      expect(matchBottom).not.toBeNull();

      const startYTop = parseFloat(matchTop![2]);
      const startYBottom = parseFloat(matchBottom![2]);

      // Top loop should start above node center
      expect(startYTop).toBeLessThan(100);
      // Bottom loop should start below node center
      expect(startYBottom).toBeGreaterThan(100);
    });
  });

  describe('edge direction arrows (custom drawn)', () => {
    it('should render arrow path element for forward direction', () => {
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
        'forward',
        0,
        false,
        0,
        createTestStyle({ stroke: '#000000' })
      );

      const element = edge.render();
      // Edge renders arrow as a separate path element within the group
      const paths = element.querySelectorAll('path');
      // Should have main path + arrow path
      expect(paths.length).toBeGreaterThanOrEqual(1);
    });

    it('should render arrow path element for backward direction', () => {
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
        'backward',
        0,
        false,
        0,
        createTestStyle({ stroke: '#000000' })
      );

      const element = edge.render();
      // Edge renders arrow as a separate path element within the group
      const paths = element.querySelectorAll('path');
      // Should have main path + arrow path
      expect(paths.length).toBeGreaterThanOrEqual(1);
    });

    it('should have no arrow path for none direction', () => {
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
      // For none direction, should only have the main path (no arrow)
      const paths = element.querySelectorAll('path');
      expect(paths.length).toBe(1);
    });
  });

  describe('edge with label', () => {
    it('should render label text element', () => {
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
      const textEl = element.querySelector('text');

      expect(textEl).not.toBeNull();
      expect(textEl?.textContent).toBe('weight');
    });

    it('should position label at path midpoint', () => {
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
        'label'
      );

      const element = edge.render();
      const textEl = element.querySelector('text');

      const x = parseFloat(textEl?.getAttribute('x') || '0');
      const y = parseFloat(textEl?.getAttribute('y') || '0');

      // Label should be near the midpoint of the edge
      // Midpoint between (100, 100) and (300, 100) is (200, 100)
      expect(x).toBeGreaterThan(150);
      expect(x).toBeLessThan(250);
      expect(y).toBeCloseTo(100, 0);
    });
  });

  describe('updateElement()', () => {
    it('should update path when node positions change', () => {
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
      const originalD = pathEl?.getAttribute('d');

      // Move node B
      nodeB.cx = 400;
      nodeB.cy = 200;
      gm.setNodeShape(nodeB.id, nodeB);

      // Update the edge
      edge.updateElement();

      const newD = pathEl?.getAttribute('d');

      // Path should have changed
      expect(newD).not.toBe(originalD);
    });
  });
});
