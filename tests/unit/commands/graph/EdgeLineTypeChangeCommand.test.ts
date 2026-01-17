import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EdgeLineTypeChangeCommand } from '../../../../src/renderer/commands/EdgeLineTypeChangeCommand';
import { createTestNode, createTestEdge, createTestStyle } from '../../../utils/mock-factories';
import { getGraphManager } from '../../../../src/renderer/core/GraphManager';

describe('EdgeLineTypeChangeCommand', () => {
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

  describe('execute()', () => {
    it('should change line type from straight to curve', () => {
      const edge = createTestEdge('node-a', 'node-b', { lineType: 'straight' });
      const command = new EdgeLineTypeChangeCommand(edge, 'curve');

      command.execute();

      expect(edge.lineType).toBe('curve');
    });

    it('should change line type from straight to path', () => {
      const gm = getGraphManager();
      const nodeA = createTestNode({ id: 'node-a', cx: 100, cy: 100 });
      const nodeB = createTestNode({ id: 'node-b', cx: 300, cy: 100 });
      gm.registerNode(nodeA.id);
      gm.registerNode(nodeB.id);
      gm.setNodeShape(nodeA.id, nodeA);
      gm.setNodeShape(nodeB.id, nodeB);

      const edge = createTestEdge('node-a', 'node-b', { lineType: 'straight' });
      const command = new EdgeLineTypeChangeCommand(edge, 'path');

      command.execute();

      expect(edge.lineType).toBe('path');
      // Path commands should be initialized
      expect(edge.pathCommands.length).toBeGreaterThan(0);
    });

    it('should change line type from curve to straight', () => {
      const edge = createTestEdge('node-a', 'node-b', { lineType: 'curve', curveAmount: 50 });
      const command = new EdgeLineTypeChangeCommand(edge, 'straight');

      command.execute();

      expect(edge.lineType).toBe('straight');
    });

    it('should change line type from curve to path', () => {
      const gm = getGraphManager();
      const nodeA = createTestNode({ id: 'node-a', cx: 100, cy: 100 });
      const nodeB = createTestNode({ id: 'node-b', cx: 300, cy: 100 });
      gm.registerNode(nodeA.id);
      gm.registerNode(nodeB.id);
      gm.setNodeShape(nodeA.id, nodeA);
      gm.setNodeShape(nodeB.id, nodeB);

      const edge = createTestEdge('node-a', 'node-b', { lineType: 'curve', curveAmount: 50 });
      const command = new EdgeLineTypeChangeCommand(edge, 'path');

      command.execute();

      expect(edge.lineType).toBe('path');
      expect(edge.pathCommands.length).toBeGreaterThan(0);
    });

    it('should change line type from path to straight', () => {
      const edge = createTestEdge('node-a', 'node-b', {
        lineType: 'path',
        pathCommands: [
          { type: 'M', x: 130, y: 100 },
          { type: 'L', x: 270, y: 100 }
        ]
      });
      const command = new EdgeLineTypeChangeCommand(edge, 'straight');

      command.execute();

      expect(edge.lineType).toBe('straight');
    });

    it('should change line type from path to curve', () => {
      const edge = createTestEdge('node-a', 'node-b', {
        lineType: 'path',
        pathCommands: [
          { type: 'M', x: 130, y: 100 },
          { type: 'Q', cpx: 200, cpy: 50, x: 270, y: 100 }
        ]
      });
      const command = new EdgeLineTypeChangeCommand(edge, 'curve');

      command.execute();

      expect(edge.lineType).toBe('curve');
    });

    it('should not allow straight for self-loop edges', () => {
      const edge = createTestEdge('node-a', 'node-a', {
        isSelfLoop: true,
        lineType: 'curve'
      });
      const command = new EdgeLineTypeChangeCommand(edge, 'straight');

      command.execute();

      // Should remain curve because straight is not allowed for self-loops
      expect(edge.lineType).toBe('curve');
    });
  });

  describe('undo()', () => {
    it('should restore original line type from curve', () => {
      const edge = createTestEdge('node-a', 'node-b', { lineType: 'straight' });
      const command = new EdgeLineTypeChangeCommand(edge, 'curve');

      command.execute();
      command.undo();

      expect(edge.lineType).toBe('straight');
    });

    it('should restore original line type from path', () => {
      const gm = getGraphManager();
      const nodeA = createTestNode({ id: 'node-a', cx: 100, cy: 100 });
      const nodeB = createTestNode({ id: 'node-b', cx: 300, cy: 100 });
      gm.registerNode(nodeA.id);
      gm.registerNode(nodeB.id);
      gm.setNodeShape(nodeA.id, nodeA);
      gm.setNodeShape(nodeB.id, nodeB);

      const edge = createTestEdge('node-a', 'node-b', { lineType: 'straight' });
      const command = new EdgeLineTypeChangeCommand(edge, 'path');

      command.execute();
      command.undo();

      expect(edge.lineType).toBe('straight');
    });

    it('should restore original path commands when undoing path to other type', () => {
      const originalPathCommands = [
        { type: 'M' as const, x: 130, y: 100 },
        { type: 'Q' as const, cpx: 200, cpy: 50, x: 270, y: 100 }
      ];
      const edge = createTestEdge('node-a', 'node-b', {
        lineType: 'path',
        pathCommands: originalPathCommands
      });
      const command = new EdgeLineTypeChangeCommand(edge, 'straight');

      command.execute();
      command.undo();

      expect(edge.lineType).toBe('path');
      expect(edge.pathCommands.length).toBe(2);
      expect(edge.pathCommands[0].type).toBe('M');
      expect(edge.pathCommands[1].type).toBe('Q');
    });
  });

  describe('execute() after undo() (redo)', () => {
    it('should re-apply line type change', () => {
      const edge = createTestEdge('node-a', 'node-b', { lineType: 'straight' });
      const command = new EdgeLineTypeChangeCommand(edge, 'curve');

      command.execute();
      command.undo();
      command.execute();

      expect(edge.lineType).toBe('curve');
    });

    it('should handle multiple undo/redo cycles', () => {
      const edge = createTestEdge('node-a', 'node-b', { lineType: 'straight' });
      const command = new EdgeLineTypeChangeCommand(edge, 'curve');

      command.execute();
      expect(edge.lineType).toBe('curve');

      command.undo();
      expect(edge.lineType).toBe('straight');

      command.execute();
      expect(edge.lineType).toBe('curve');

      command.undo();
      expect(edge.lineType).toBe('straight');
    });
  });

  describe('getDescription()', () => {
    it('should include node labels in description', () => {
      const gm = getGraphManager();
      const nodeA = createTestNode({ id: 'node-a', label: 'Start' });
      const nodeB = createTestNode({ id: 'node-b', label: 'End' });
      gm.registerNode(nodeA.id);
      gm.registerNode(nodeB.id);
      gm.setNodeShape(nodeA.id, nodeA);
      gm.setNodeShape(nodeB.id, nodeB);

      const edge = createTestEdge('node-a', 'node-b', { lineType: 'straight' });
      const command = new EdgeLineTypeChangeCommand(edge, 'curve');

      expect(command.getDescription()).toBe('Change edge "Start" → "End" line type to curve');
    });

    it('should fallback to node ID if labels not available', () => {
      const edge = createTestEdge('node-a', 'node-b', { lineType: 'straight' });
      const command = new EdgeLineTypeChangeCommand(edge, 'path');

      expect(command.getDescription()).toBe('Change edge "node-a" → "node-b" line type to path');
    });
  });
});
