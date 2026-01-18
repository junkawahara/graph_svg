import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createTestNode, createTestEdge, createTestStyle } from '../../utils/mock-factories';
import { getGraphManager } from '../../../src/renderer/core/GraphManager';
import { Edge } from '../../../src/renderer/shapes/Edge';

describe('Edge lineType functionality', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    getGraphManager().clear();

    // Mock getBBox for SVGTextElement
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

  describe('straight lineType', () => {
    it('should render straight line path', () => {
      const gm = getGraphManager();
      const nodeA = createTestNode({ id: 'node-a', cx: 100, cy: 100, rx: 30, ry: 30 });
      const nodeB = createTestNode({ id: 'node-b', cx: 300, cy: 100, rx: 30, ry: 30 });
      gm.registerNode(nodeA.id);
      gm.registerNode(nodeB.id);
      gm.setNodeShape(nodeA.id, nodeA);
      gm.setNodeShape(nodeB.id, nodeB);

      const edge = createTestEdge('node-a', 'node-b', { lineType: 'straight' });
      const element = edge.render();
      const pathEl = element.querySelector('path');
      const d = pathEl?.getAttribute('d') || '';

      expect(d).toContain('M');
      expect(d).toContain('L');
      expect(d).not.toContain('Q');
      expect(d).not.toContain('C');
    });

    it('should ignore curveAmount when lineType is straight', () => {
      const gm = getGraphManager();
      const nodeA = createTestNode({ id: 'node-a', cx: 100, cy: 100, rx: 30, ry: 30 });
      const nodeB = createTestNode({ id: 'node-b', cx: 300, cy: 100, rx: 30, ry: 30 });
      gm.registerNode(nodeA.id);
      gm.registerNode(nodeB.id);
      gm.setNodeShape(nodeA.id, nodeA);
      gm.setNodeShape(nodeB.id, nodeB);

      const edge = createTestEdge('node-a', 'node-b', { lineType: 'straight', curveAmount: 50 });
      const element = edge.render();
      const pathEl = element.querySelector('path');
      const d = pathEl?.getAttribute('d') || '';

      // Should still be straight line, not curved
      expect(d).toContain('L');
      expect(d).not.toContain('Q');
    });
  });

  describe('curve lineType', () => {
    it('should render quadratic bezier path', () => {
      const gm = getGraphManager();
      const nodeA = createTestNode({ id: 'node-a', cx: 100, cy: 100, rx: 30, ry: 30 });
      const nodeB = createTestNode({ id: 'node-b', cx: 300, cy: 100, rx: 30, ry: 30 });
      gm.registerNode(nodeA.id);
      gm.registerNode(nodeB.id);
      gm.setNodeShape(nodeA.id, nodeA);
      gm.setNodeShape(nodeB.id, nodeB);

      const edge = createTestEdge('node-a', 'node-b', { lineType: 'curve', curveAmount: 50 });
      const element = edge.render();
      const pathEl = element.querySelector('path');
      const d = pathEl?.getAttribute('d') || '';

      expect(d).toContain('Q');
    });

    it('should render straight line when curveAmount is 0', () => {
      const gm = getGraphManager();
      const nodeA = createTestNode({ id: 'node-a', cx: 100, cy: 100, rx: 30, ry: 30 });
      const nodeB = createTestNode({ id: 'node-b', cx: 300, cy: 100, rx: 30, ry: 30 });
      gm.registerNode(nodeA.id);
      gm.registerNode(nodeB.id);
      gm.setNodeShape(nodeA.id, nodeA);
      gm.setNodeShape(nodeB.id, nodeB);

      const edge = createTestEdge('node-a', 'node-b', { lineType: 'curve', curveAmount: 0, curveOffset: 0 });
      const element = edge.render();
      const pathEl = element.querySelector('path');
      const d = pathEl?.getAttribute('d') || '';

      expect(d).toContain('L');
      expect(d).not.toContain('Q');
    });

    it('should curve in opposite directions for positive/negative curveAmount', () => {
      const gm = getGraphManager();
      const nodeA = createTestNode({ id: 'node-a', cx: 100, cy: 100, rx: 30, ry: 30 });
      const nodeB = createTestNode({ id: 'node-b', cx: 300, cy: 100, rx: 30, ry: 30 });
      gm.registerNode(nodeA.id);
      gm.registerNode(nodeB.id);
      gm.setNodeShape(nodeA.id, nodeA);
      gm.setNodeShape(nodeB.id, nodeB);

      const edgePos = createTestEdge('node-a', 'node-b', { id: 'edge-pos', lineType: 'curve', curveAmount: 50 });
      const edgeNeg = createTestEdge('node-a', 'node-b', { id: 'edge-neg', lineType: 'curve', curveAmount: -50 });

      const elementPos = edgePos.render();
      const elementNeg = edgeNeg.render();

      const dPos = elementPos.querySelector('path')?.getAttribute('d') || '';
      const dNeg = elementNeg.querySelector('path')?.getAttribute('d') || '';

      // Extract control point Y from Q command
      const matchPos = dPos.match(/Q\s+([\d.-]+)\s+([\d.-]+)/);
      const matchNeg = dNeg.match(/Q\s+([\d.-]+)\s+([\d.-]+)/);

      expect(matchPos).not.toBeNull();
      expect(matchNeg).not.toBeNull();

      const ctrlYPos = parseFloat(matchPos![2]);
      const ctrlYNeg = parseFloat(matchNeg![2]);

      // Control points should be on opposite sides
      expect(ctrlYPos).not.toEqual(ctrlYNeg);
    });
  });

  describe('path lineType', () => {
    it('should render custom path from pathCommands', () => {
      const gm = getGraphManager();
      const nodeA = createTestNode({ id: 'node-a', cx: 100, cy: 100, rx: 30, ry: 30 });
      const nodeB = createTestNode({ id: 'node-b', cx: 300, cy: 100, rx: 30, ry: 30 });
      gm.registerNode(nodeA.id);
      gm.registerNode(nodeB.id);
      gm.setNodeShape(nodeA.id, nodeA);
      gm.setNodeShape(nodeB.id, nodeB);

      const edge = createTestEdge('node-a', 'node-b', {
        lineType: 'path',
        pathCommands: [
          { type: 'M', x: 130, y: 100 },
          { type: 'Q', cpx: 200, cpy: 50, x: 270, y: 100 }
        ]
      });
      const element = edge.render();
      const pathEl = element.querySelector('path');
      const d = pathEl?.getAttribute('d') || '';

      expect(d).toContain('M 130 100');
      expect(d).toContain('Q 200 50 270 100');
    });

    it('should render cubic bezier path commands', () => {
      const gm = getGraphManager();
      const nodeA = createTestNode({ id: 'node-a', cx: 100, cy: 100, rx: 30, ry: 30 });
      const nodeB = createTestNode({ id: 'node-b', cx: 300, cy: 100, rx: 30, ry: 30 });
      gm.registerNode(nodeA.id);
      gm.registerNode(nodeB.id);
      gm.setNodeShape(nodeA.id, nodeA);
      gm.setNodeShape(nodeB.id, nodeB);

      const edge = createTestEdge('node-a', 'node-b', {
        lineType: 'path',
        pathCommands: [
          { type: 'M', x: 130, y: 100 },
          { type: 'C', cp1x: 160, cp1y: 50, cp2x: 240, cp2y: 150, x: 270, y: 100 }
        ]
      });
      const element = edge.render();
      const pathEl = element.querySelector('path');
      const d = pathEl?.getAttribute('d') || '';

      expect(d).toContain('C 160 50 240 150 270 100');
    });

    it('should fall back to curve when pathCommands is empty', () => {
      const gm = getGraphManager();
      const nodeA = createTestNode({ id: 'node-a', cx: 100, cy: 100, rx: 30, ry: 30 });
      const nodeB = createTestNode({ id: 'node-b', cx: 300, cy: 100, rx: 30, ry: 30 });
      gm.registerNode(nodeA.id);
      gm.registerNode(nodeB.id);
      gm.setNodeShape(nodeA.id, nodeA);
      gm.setNodeShape(nodeB.id, nodeB);

      const edge = createTestEdge('node-a', 'node-b', {
        lineType: 'path',
        pathCommands: [],
        curveAmount: 50
      });
      const element = edge.render();
      const pathEl = element.querySelector('path');
      const d = pathEl?.getAttribute('d') || '';

      // Should use curve rendering as fallback
      expect(d).toContain('Q');
    });
  });

  describe('setLineType()', () => {
    it('should change line type', () => {
      const edge = createTestEdge('node-a', 'node-b', { lineType: 'straight' });

      edge.setLineType('curve');

      expect(edge.lineType).toBe('curve');
    });

    it('should not allow straight for self-loops', () => {
      const edge = createTestEdge('node-a', 'node-a', {
        isSelfLoop: true,
        lineType: 'curve'
      });

      edge.setLineType('straight');

      // Should remain curve
      expect(edge.lineType).toBe('curve');
    });

    it('should allow curve for self-loops', () => {
      const edge = createTestEdge('node-a', 'node-a', {
        isSelfLoop: true,
        lineType: 'curve'
      });

      edge.setLineType('path');
      expect(edge.lineType).toBe('path');

      edge.setLineType('curve');
      expect(edge.lineType).toBe('curve');
    });
  });

  describe('setCurveAmount()', () => {
    it('should set curve amount', () => {
      const edge = createTestEdge('node-a', 'node-b', { lineType: 'curve', curveAmount: 0 });

      edge.setCurveAmount(75);

      expect(edge.curveAmount).toBe(75);
    });

    it('should handle negative curve amount', () => {
      const edge = createTestEdge('node-a', 'node-b', { lineType: 'curve', curveAmount: 0 });

      edge.setCurveAmount(-50);

      expect(edge.curveAmount).toBe(-50);
    });
  });

  describe('initializePathFromCurrentGeometry()', () => {
    it('should initialize path commands from straight line', () => {
      const gm = getGraphManager();
      const nodeA = createTestNode({ id: 'node-a', cx: 100, cy: 100, rx: 30, ry: 30 });
      const nodeB = createTestNode({ id: 'node-b', cx: 300, cy: 100, rx: 30, ry: 30 });
      gm.registerNode(nodeA.id);
      gm.registerNode(nodeB.id);
      gm.setNodeShape(nodeA.id, nodeA);
      gm.setNodeShape(nodeB.id, nodeB);

      const edge = createTestEdge('node-a', 'node-b', { lineType: 'straight' });
      edge.initializePathFromCurrentGeometry();

      expect(edge.pathCommands.length).toBe(2);
      expect(edge.pathCommands[0].type).toBe('M');
      // Straight lines are converted to Q (quadratic bezier) for editability
      expect(edge.pathCommands[1].type).toBe('Q');
    });

    it('should initialize path commands from curved line', () => {
      const gm = getGraphManager();
      const nodeA = createTestNode({ id: 'node-a', cx: 100, cy: 100, rx: 30, ry: 30 });
      const nodeB = createTestNode({ id: 'node-b', cx: 300, cy: 100, rx: 30, ry: 30 });
      gm.registerNode(nodeA.id);
      gm.registerNode(nodeB.id);
      gm.setNodeShape(nodeA.id, nodeA);
      gm.setNodeShape(nodeB.id, nodeB);

      const edge = createTestEdge('node-a', 'node-b', { lineType: 'curve', curveAmount: 50 });
      edge.initializePathFromCurrentGeometry();

      expect(edge.pathCommands.length).toBe(2);
      expect(edge.pathCommands[0].type).toBe('M');
      expect(edge.pathCommands[1].type).toBe('Q');
    });

    it('should initialize path commands from self-loop', () => {
      const gm = getGraphManager();
      const nodeA = createTestNode({ id: 'node-a', cx: 100, cy: 100, rx: 30, ry: 30 });
      gm.registerNode(nodeA.id);
      gm.setNodeShape(nodeA.id, nodeA);

      const edge = createTestEdge('node-a', 'node-a', {
        isSelfLoop: true,
        lineType: 'curve'
      });
      edge.initializePathFromCurrentGeometry();

      expect(edge.pathCommands.length).toBe(2);
      expect(edge.pathCommands[0].type).toBe('M');
      expect(edge.pathCommands[1].type).toBe('C');
    });
  });

  describe('path endpoint updates on node move', () => {
    it('should update path endpoints when source node moves', () => {
      const gm = getGraphManager();
      const nodeA = createTestNode({ id: 'node-a', cx: 100, cy: 100, rx: 30, ry: 30 });
      const nodeB = createTestNode({ id: 'node-b', cx: 300, cy: 100, rx: 30, ry: 30 });
      gm.registerNode(nodeA.id);
      gm.registerNode(nodeB.id);
      gm.setNodeShape(nodeA.id, nodeA);
      gm.setNodeShape(nodeB.id, nodeB);

      const edge = createTestEdge('node-a', 'node-b', {
        lineType: 'path',
        pathCommands: [
          { type: 'M', x: 130, y: 100 },
          { type: 'L', x: 270, y: 100 }
        ]
      });
      edge.render();

      const originalStartX = edge.pathCommands[0].x;

      // Move source node
      nodeA.cx = 150;
      nodeA.cy = 150;
      gm.setNodeShape(nodeA.id, nodeA);

      edge.updateElement();

      // Start point should be updated
      expect(edge.pathCommands[0].x).not.toBe(originalStartX);
    });

    it('should update path endpoints when target node moves', () => {
      const gm = getGraphManager();
      const nodeA = createTestNode({ id: 'node-a', cx: 100, cy: 100, rx: 30, ry: 30 });
      const nodeB = createTestNode({ id: 'node-b', cx: 300, cy: 100, rx: 30, ry: 30 });
      gm.registerNode(nodeA.id);
      gm.registerNode(nodeB.id);
      gm.setNodeShape(nodeA.id, nodeA);
      gm.setNodeShape(nodeB.id, nodeB);

      const edge = createTestEdge('node-a', 'node-b', {
        lineType: 'path',
        pathCommands: [
          { type: 'M', x: 130, y: 100 },
          { type: 'L', x: 270, y: 100 }
        ]
      });
      edge.render();

      const originalEndX = edge.pathCommands[1].x;

      // Move target node
      nodeB.cx = 400;
      nodeB.cy = 200;
      gm.setNodeShape(nodeB.id, nodeB);

      edge.updateElement();

      // End point should be updated
      expect(edge.pathCommands[1].x).not.toBe(originalEndX);
    });

    it('should keep intermediate control points fixed when nodes move', () => {
      const gm = getGraphManager();
      const nodeA = createTestNode({ id: 'node-a', cx: 100, cy: 100, rx: 30, ry: 30 });
      const nodeB = createTestNode({ id: 'node-b', cx: 300, cy: 100, rx: 30, ry: 30 });
      gm.registerNode(nodeA.id);
      gm.registerNode(nodeB.id);
      gm.setNodeShape(nodeA.id, nodeA);
      gm.setNodeShape(nodeB.id, nodeB);

      const edge = createTestEdge('node-a', 'node-b', {
        lineType: 'path',
        pathCommands: [
          { type: 'M', x: 130, y: 100 },
          { type: 'Q', cpx: 200, cpy: 50, x: 270, y: 100 }
        ]
      });
      edge.render();

      const originalCpx = (edge.pathCommands[1] as any).cpx;
      const originalCpy = (edge.pathCommands[1] as any).cpy;

      // Move source node
      nodeA.cx = 150;
      nodeA.cy = 150;
      gm.setNodeShape(nodeA.id, nodeA);

      edge.updateElement();

      // Control point should remain fixed
      expect((edge.pathCommands[1] as any).cpx).toBe(originalCpx);
      expect((edge.pathCommands[1] as any).cpy).toBe(originalCpy);
    });
  });

  describe('serialize()', () => {
    it('should serialize lineType', () => {
      const edge = createTestEdge('node-a', 'node-b', { lineType: 'curve' });
      const data = edge.serialize();

      expect(data.lineType).toBe('curve');
    });

    it('should serialize curveAmount', () => {
      const edge = createTestEdge('node-a', 'node-b', { lineType: 'curve', curveAmount: 75 });
      const data = edge.serialize();

      expect(data.curveAmount).toBe(75);
    });

    it('should serialize pathCommands', () => {
      const pathCommands = [
        { type: 'M' as const, x: 130, y: 100 },
        { type: 'Q' as const, cpx: 200, cpy: 50, x: 270, y: 100 }
      ];
      const edge = createTestEdge('node-a', 'node-b', {
        lineType: 'path',
        pathCommands
      });
      const data = edge.serialize();

      expect(data.pathCommands).toBeDefined();
      expect(data.pathCommands!.length).toBe(2);
    });

    it('should not serialize pathCommands when empty', () => {
      const edge = createTestEdge('node-a', 'node-b', { lineType: 'straight' });
      const data = edge.serialize();

      expect(data.pathCommands).toBeUndefined();
    });
  });

  describe('clone()', () => {
    it('should clone lineType', () => {
      const edge = createTestEdge('node-a', 'node-b', { lineType: 'curve' });
      const cloned = edge.clone();

      expect(cloned.lineType).toBe('curve');
    });

    it('should clone curveAmount', () => {
      const edge = createTestEdge('node-a', 'node-b', { lineType: 'curve', curveAmount: 75 });
      const cloned = edge.clone();

      expect(cloned.curveAmount).toBe(75);
    });

    it('should clone pathCommands', () => {
      const pathCommands = [
        { type: 'M' as const, x: 130, y: 100 },
        { type: 'Q' as const, cpx: 200, cpy: 50, x: 270, y: 100 }
      ];
      const edge = createTestEdge('node-a', 'node-b', {
        lineType: 'path',
        pathCommands
      });
      const cloned = edge.clone();

      expect(cloned.pathCommands.length).toBe(2);
      expect(cloned.pathCommands[0].type).toBe('M');
      expect(cloned.pathCommands[1].type).toBe('Q');
    });

    it('should create independent copy of pathCommands', () => {
      const pathCommands = [
        { type: 'M' as const, x: 130, y: 100 },
        { type: 'L' as const, x: 270, y: 100 }
      ];
      const edge = createTestEdge('node-a', 'node-b', {
        lineType: 'path',
        pathCommands
      });
      const cloned = edge.clone();

      // Modify original
      edge.pathCommands[0].x = 999;

      // Clone should not be affected
      expect(cloned.pathCommands[0].x).toBe(130);
    });
  });
});
