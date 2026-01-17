import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EdgeHandles } from '../../../src/renderer/handles/EdgeHandles';
import { createTestNode, createTestEdge } from '../../utils/mock-factories';
import { getGraphManager } from '../../../src/renderer/core/GraphManager';

describe('EdgeHandles', () => {
  let svg: SVGSVGElement;

  beforeEach(() => {
    vi.useFakeTimers();
    getGraphManager().clear();

    // Create mock SVG element
    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    document.body.appendChild(svg);

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
    svg.remove();
  });

  describe('constructor', () => {
    it('should create handles for path type edge', () => {
      const edge = createTestEdge('node-a', 'node-b', {
        lineType: 'path',
        pathCommands: [
          { type: 'M', x: 130, y: 100 },
          { type: 'L', x: 270, y: 100 }
        ]
      });

      const handles = new EdgeHandles(edge);

      expect(handles.handles.length).toBeGreaterThan(0);
    });

    it('should not create handles for straight type edge', () => {
      const edge = createTestEdge('node-a', 'node-b', { lineType: 'straight' });

      const handles = new EdgeHandles(edge);

      expect(handles.handles.length).toBe(0);
    });

    it('should not create handles for curve type edge', () => {
      const edge = createTestEdge('node-a', 'node-b', { lineType: 'curve', curveAmount: 50 });

      const handles = new EdgeHandles(edge);

      expect(handles.handles.length).toBe(0);
    });

    it('should not create handles for path type edge with empty pathCommands', () => {
      const edge = createTestEdge('node-a', 'node-b', {
        lineType: 'path',
        pathCommands: []
      });

      const handles = new EdgeHandles(edge);

      expect(handles.handles.length).toBe(0);
    });
  });

  describe('anchor handles', () => {
    it('should create anchor handles for M and L commands', () => {
      const edge = createTestEdge('node-a', 'node-b', {
        lineType: 'path',
        pathCommands: [
          { type: 'M', x: 130, y: 100 },
          { type: 'L', x: 200, y: 150 },
          { type: 'L', x: 270, y: 100 }
        ]
      });

      const handles = new EdgeHandles(edge);

      // 3 anchor handles (M, L, L)
      const anchorHandles = handles.handles.filter(h => h.type === 'corner');
      expect(anchorHandles.length).toBe(3);
    });

    it('should create anchor handles for Q command endpoint', () => {
      const edge = createTestEdge('node-a', 'node-b', {
        lineType: 'path',
        pathCommands: [
          { type: 'M', x: 130, y: 100 },
          { type: 'Q', cpx: 200, cpy: 50, x: 270, y: 100 }
        ]
      });

      const handles = new EdgeHandles(edge);

      // 2 anchor handles (M, Q endpoint)
      const anchorHandles = handles.handles.filter(h => h.type === 'corner');
      expect(anchorHandles.length).toBe(2);
    });

    it('should create anchor handles for C command endpoint', () => {
      const edge = createTestEdge('node-a', 'node-b', {
        lineType: 'path',
        pathCommands: [
          { type: 'M', x: 130, y: 100 },
          { type: 'C', cp1x: 160, cp1y: 50, cp2x: 240, cp2y: 150, x: 270, y: 100 }
        ]
      });

      const handles = new EdgeHandles(edge);

      // 2 anchor handles (M, C endpoint)
      const anchorHandles = handles.handles.filter(h => h.type === 'corner');
      expect(anchorHandles.length).toBe(2);
    });
  });

  describe('control point handles', () => {
    it('should create 1 control point handle for Q command', () => {
      const edge = createTestEdge('node-a', 'node-b', {
        lineType: 'path',
        pathCommands: [
          { type: 'M', x: 130, y: 100 },
          { type: 'Q', cpx: 200, cpy: 50, x: 270, y: 100 }
        ]
      });

      const handles = new EdgeHandles(edge);

      // 1 control point handle for Q
      const cpHandles = handles.handles.filter(h => h.type === 'edge');
      expect(cpHandles.length).toBe(1);
    });

    it('should create 2 control point handles for C command', () => {
      const edge = createTestEdge('node-a', 'node-b', {
        lineType: 'path',
        pathCommands: [
          { type: 'M', x: 130, y: 100 },
          { type: 'C', cp1x: 160, cp1y: 50, cp2x: 240, cp2y: 150, x: 270, y: 100 }
        ]
      });

      const handles = new EdgeHandles(edge);

      // 2 control point handles for C (cp1 and cp2)
      const cpHandles = handles.handles.filter(h => h.type === 'edge');
      expect(cpHandles.length).toBe(2);
    });

    it('should not create control point handles for L command', () => {
      const edge = createTestEdge('node-a', 'node-b', {
        lineType: 'path',
        pathCommands: [
          { type: 'M', x: 130, y: 100 },
          { type: 'L', x: 270, y: 100 }
        ]
      });

      const handles = new EdgeHandles(edge);

      const cpHandles = handles.handles.filter(h => h.type === 'edge');
      expect(cpHandles.length).toBe(0);
    });
  });

  describe('render()', () => {
    it('should render handle group to SVG', () => {
      const edge = createTestEdge('node-a', 'node-b', {
        lineType: 'path',
        pathCommands: [
          { type: 'M', x: 130, y: 100 },
          { type: 'L', x: 270, y: 100 }
        ]
      });

      const handles = new EdgeHandles(edge);
      const group = handles.render(svg);

      expect(group).not.toBeNull();
      expect(group.classList.contains('handle-group')).toBe(true);
      expect(group.classList.contains('edge-handle-group')).toBe(true);
    });

    it('should render anchor handles as rectangles', () => {
      const edge = createTestEdge('node-a', 'node-b', {
        lineType: 'path',
        pathCommands: [
          { type: 'M', x: 130, y: 100 },
          { type: 'L', x: 270, y: 100 }
        ]
      });

      const handles = new EdgeHandles(edge);
      handles.render(svg);

      const rects = handles.element?.querySelectorAll('rect.anchor-handle');
      expect(rects?.length).toBe(2);
    });

    it('should render control point handles as circles', () => {
      const edge = createTestEdge('node-a', 'node-b', {
        lineType: 'path',
        pathCommands: [
          { type: 'M', x: 130, y: 100 },
          { type: 'Q', cpx: 200, cpy: 50, x: 270, y: 100 }
        ]
      });

      const handles = new EdgeHandles(edge);
      handles.render(svg);

      const circles = handles.element?.querySelectorAll('circle.control-point-handle');
      expect(circles?.length).toBe(1);
    });

    it('should render control lines for bezier curves', () => {
      const edge = createTestEdge('node-a', 'node-b', {
        lineType: 'path',
        pathCommands: [
          { type: 'M', x: 130, y: 100 },
          { type: 'Q', cpx: 200, cpy: 50, x: 270, y: 100 }
        ]
      });

      const handles = new EdgeHandles(edge);
      handles.render(svg);

      const lines = handles.element?.querySelectorAll('line.control-line');
      // Q command has 2 control lines (start-cp, cp-end)
      expect(lines?.length).toBe(2);
    });

    it('should render 4 control lines for C command', () => {
      const edge = createTestEdge('node-a', 'node-b', {
        lineType: 'path',
        pathCommands: [
          { type: 'M', x: 130, y: 100 },
          { type: 'C', cp1x: 160, cp1y: 50, cp2x: 240, cp2y: 150, x: 270, y: 100 }
        ]
      });

      const handles = new EdgeHandles(edge);
      handles.render(svg);

      const lines = handles.element?.querySelectorAll('line.control-line');
      // C command has 2 control lines (start-cp1, cp2-end)
      expect(lines?.length).toBe(2);
    });

    it('should render empty group for non-path type', () => {
      const edge = createTestEdge('node-a', 'node-b', { lineType: 'straight' });

      const handles = new EdgeHandles(edge);
      handles.render(svg);

      expect(handles.element).not.toBeNull();
      expect(handles.element?.children.length).toBe(0);
    });
  });

  describe('findHandleAt()', () => {
    it('should find anchor handle at position', () => {
      const edge = createTestEdge('node-a', 'node-b', {
        lineType: 'path',
        pathCommands: [
          { type: 'M', x: 130, y: 100 },
          { type: 'L', x: 270, y: 100 }
        ]
      });

      const handles = new EdgeHandles(edge);
      handles.render(svg);

      const handle = handles.findHandleAt({ x: 130, y: 100 });
      expect(handle).not.toBeNull();
      expect(handle?.type).toBe('corner');
    });

    it('should find control point handle at position', () => {
      const edge = createTestEdge('node-a', 'node-b', {
        lineType: 'path',
        pathCommands: [
          { type: 'M', x: 130, y: 100 },
          { type: 'Q', cpx: 200, cpy: 50, x: 270, y: 100 }
        ]
      });

      const handles = new EdgeHandles(edge);
      handles.render(svg);

      const handle = handles.findHandleAt({ x: 200, y: 50 });
      expect(handle).not.toBeNull();
      expect(handle?.type).toBe('edge');
    });

    it('should return null when no handle at position', () => {
      const edge = createTestEdge('node-a', 'node-b', {
        lineType: 'path',
        pathCommands: [
          { type: 'M', x: 130, y: 100 },
          { type: 'L', x: 270, y: 100 }
        ]
      });

      const handles = new EdgeHandles(edge);
      handles.render(svg);

      const handle = handles.findHandleAt({ x: 500, y: 500 });
      expect(handle).toBeNull();
    });

    it('should prioritize control point handles over anchor handles', () => {
      const edge = createTestEdge('node-a', 'node-b', {
        lineType: 'path',
        pathCommands: [
          { type: 'M', x: 130, y: 100 },
          { type: 'Q', cpx: 135, cpy: 100, x: 270, y: 100 }  // cp close to start
        ]
      });

      const handles = new EdgeHandles(edge);
      handles.render(svg);

      // Position close to both anchor (130,100) and control point (135,100)
      const handle = handles.findHandleAt({ x: 133, y: 100 });
      // Should find control point first (smaller tolerance, higher priority)
      expect(handle).not.toBeNull();
    });
  });

  describe('anchor handle drag constraints', () => {
    it('should constrain start point to source node boundary', () => {
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

      const handles = new EdgeHandles(edge);
      handles.render(svg);

      // Find start point handle
      const startHandle = handles.findHandleAt({ x: 130, y: 100 });
      expect(startHandle).not.toBeNull();

      // Drag to a point outside node boundary
      startHandle!.onDrag({ x: 200, y: 200 });

      // Start point should be on source node boundary, not at (200, 200)
      expect(edge.pathCommands[0].x).not.toBe(200);
      expect(edge.pathCommands[0].y).not.toBe(200);

      // Should be on or near node A's boundary
      const dx = edge.pathCommands[0].x - nodeA.cx;
      const dy = edge.pathCommands[0].y - nodeA.cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      // Should be close to the node radius (30)
      expect(dist).toBeCloseTo(30, 0);
    });

    it('should constrain end point to target node boundary', () => {
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

      const handles = new EdgeHandles(edge);
      handles.render(svg);

      // Find end point handle
      const endHandle = handles.findHandleAt({ x: 270, y: 100 });
      expect(endHandle).not.toBeNull();

      // Drag to a point outside node boundary
      endHandle!.onDrag({ x: 200, y: 200 });

      // End point should be on target node boundary, not at (200, 200)
      expect(edge.pathCommands[1].x).not.toBe(200);
      expect(edge.pathCommands[1].y).not.toBe(200);

      // Should be on or near node B's boundary
      const dx = edge.pathCommands[1].x - nodeB.cx;
      const dy = edge.pathCommands[1].y - nodeB.cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      // Should be close to the node radius (30)
      expect(dist).toBeCloseTo(30, 0);
    });

    it('should allow intermediate anchor points to move freely', () => {
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
          { type: 'L', x: 200, y: 150 },  // Intermediate point
          { type: 'L', x: 270, y: 100 }
        ]
      });

      const handles = new EdgeHandles(edge);
      handles.render(svg);

      // Find intermediate point handle
      const midHandle = handles.findHandleAt({ x: 200, y: 150 });
      expect(midHandle).not.toBeNull();

      // Drag to any position
      midHandle!.onDrag({ x: 250, y: 200 });

      // Intermediate point should move to the exact position
      expect(edge.pathCommands[1].x).toBeCloseTo(250, 0);
      expect(edge.pathCommands[1].y).toBeCloseTo(200, 0);
    });
  });

  describe('control point handle drag', () => {
    it('should update control point position on drag', () => {
      const edge = createTestEdge('node-a', 'node-b', {
        lineType: 'path',
        pathCommands: [
          { type: 'M', x: 130, y: 100 },
          { type: 'Q', cpx: 200, cpy: 50, x: 270, y: 100 }
        ]
      });

      const handles = new EdgeHandles(edge);
      handles.render(svg);

      // Find control point handle
      const cpHandle = handles.findHandleAt({ x: 200, y: 50 });
      expect(cpHandle).not.toBeNull();

      // Drag control point
      cpHandle!.onDrag({ x: 220, y: 30 });

      // Control point should be updated
      const qCmd = edge.pathCommands[1] as any;
      expect(qCmd.cpx).toBeCloseTo(220, 0);
      expect(qCmd.cpy).toBeCloseTo(30, 0);
    });

    it('should update cp1 of C command on drag', () => {
      const edge = createTestEdge('node-a', 'node-b', {
        lineType: 'path',
        pathCommands: [
          { type: 'M', x: 130, y: 100 },
          { type: 'C', cp1x: 160, cp1y: 50, cp2x: 240, cp2y: 150, x: 270, y: 100 }
        ]
      });

      const handles = new EdgeHandles(edge);
      handles.render(svg);

      // Find cp1 handle
      const cp1Handle = handles.findHandleAt({ x: 160, y: 50 });
      expect(cp1Handle).not.toBeNull();

      // Drag cp1
      cp1Handle!.onDrag({ x: 180, y: 30 });

      // cp1 should be updated
      const cCmd = edge.pathCommands[1] as any;
      expect(cCmd.cp1x).toBeCloseTo(180, 0);
      expect(cCmd.cp1y).toBeCloseTo(30, 0);
      // cp2 should remain unchanged
      expect(cCmd.cp2x).toBe(240);
      expect(cCmd.cp2y).toBe(150);
    });

    it('should update cp2 of C command on drag', () => {
      const edge = createTestEdge('node-a', 'node-b', {
        lineType: 'path',
        pathCommands: [
          { type: 'M', x: 130, y: 100 },
          { type: 'C', cp1x: 160, cp1y: 50, cp2x: 240, cp2y: 150, x: 270, y: 100 }
        ]
      });

      const handles = new EdgeHandles(edge);
      handles.render(svg);

      // Find cp2 handle
      const cp2Handle = handles.findHandleAt({ x: 240, y: 150 });
      expect(cp2Handle).not.toBeNull();

      // Drag cp2
      cp2Handle!.onDrag({ x: 250, y: 170 });

      // cp2 should be updated
      const cCmd = edge.pathCommands[1] as any;
      expect(cCmd.cp1x).toBe(160);  // unchanged
      expect(cCmd.cp1y).toBe(50);   // unchanged
      expect(cCmd.cp2x).toBeCloseTo(250, 0);
      expect(cCmd.cp2y).toBeCloseTo(170, 0);
    });
  });

  describe('remove()', () => {
    it('should remove handle group from SVG', () => {
      const edge = createTestEdge('node-a', 'node-b', {
        lineType: 'path',
        pathCommands: [
          { type: 'M', x: 130, y: 100 },
          { type: 'L', x: 270, y: 100 }
        ]
      });

      const handles = new EdgeHandles(edge);
      handles.render(svg);

      expect(svg.querySelector('.edge-handle-group')).not.toBeNull();

      handles.remove();

      expect(svg.querySelector('.edge-handle-group')).toBeNull();
      expect(handles.element).toBeNull();
    });
  });

  describe('update()', () => {
    it('should update handle positions', () => {
      const edge = createTestEdge('node-a', 'node-b', {
        lineType: 'path',
        pathCommands: [
          { type: 'M', x: 130, y: 100 },
          { type: 'Q', cpx: 200, cpy: 50, x: 270, y: 100 }
        ]
      });

      const handles = new EdgeHandles(edge);
      handles.render(svg);

      // Manually update path commands
      edge.pathCommands[0].x = 140;
      edge.pathCommands[0].y = 110;

      // Update handles
      handles.update();

      // Check that anchor handle element was updated
      const rects = handles.element?.querySelectorAll('rect.anchor-handle');
      if (rects && rects.length > 0) {
        const firstRect = rects[0];
        const x = parseFloat(firstRect.getAttribute('x') || '0');
        const y = parseFloat(firstRect.getAttribute('y') || '0');
        // Handle position should be centered on (140, 110), so x should be around 136 (140 - 4)
        expect(x).toBeCloseTo(136, 0);
        expect(y).toBeCloseTo(106, 0);
      }
    });
  });
});
