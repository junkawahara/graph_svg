import { describe, it, expect, beforeEach } from 'vitest';
import { EdgeCurveAmountChangeCommand } from '../../../../src/renderer/commands/EdgeCurveAmountChangeCommand';
import { createTestNode, createTestEdge } from '../../../utils/mock-factories';
import { getGraphManager } from '../../../../src/renderer/core/GraphManager';

describe('EdgeCurveAmountChangeCommand', () => {
  beforeEach(() => {
    getGraphManager().clear();
  });

  describe('execute()', () => {
    it('should change curve amount from 0 to positive', () => {
      const edge = createTestEdge('node-a', 'node-b', { lineType: 'curve', curveAmount: 0 });
      const command = new EdgeCurveAmountChangeCommand(edge, 50);

      command.execute();

      expect(edge.curveAmount).toBe(50);
    });

    it('should change curve amount from 0 to negative', () => {
      const edge = createTestEdge('node-a', 'node-b', { lineType: 'curve', curveAmount: 0 });
      const command = new EdgeCurveAmountChangeCommand(edge, -50);

      command.execute();

      expect(edge.curveAmount).toBe(-50);
    });

    it('should change curve amount from positive to negative', () => {
      const edge = createTestEdge('node-a', 'node-b', { lineType: 'curve', curveAmount: 50 });
      const command = new EdgeCurveAmountChangeCommand(edge, -30);

      command.execute();

      expect(edge.curveAmount).toBe(-30);
    });

    it('should change curve amount to maximum (100)', () => {
      const edge = createTestEdge('node-a', 'node-b', { lineType: 'curve', curveAmount: 0 });
      const command = new EdgeCurveAmountChangeCommand(edge, 100);

      command.execute();

      expect(edge.curveAmount).toBe(100);
    });

    it('should change curve amount to minimum (-100)', () => {
      const edge = createTestEdge('node-a', 'node-b', { lineType: 'curve', curveAmount: 0 });
      const command = new EdgeCurveAmountChangeCommand(edge, -100);

      command.execute();

      expect(edge.curveAmount).toBe(-100);
    });

    it('should work for straight line type', () => {
      const edge = createTestEdge('node-a', 'node-b', { lineType: 'straight', curveAmount: 0 });
      const command = new EdgeCurveAmountChangeCommand(edge, 50);

      command.execute();

      expect(edge.curveAmount).toBe(50);
    });

    it('should work for self-loop edges', () => {
      const edge = createTestEdge('node-a', 'node-a', {
        isSelfLoop: true,
        lineType: 'curve',
        curveAmount: 0
      });
      const command = new EdgeCurveAmountChangeCommand(edge, 75);

      command.execute();

      expect(edge.curveAmount).toBe(75);
    });
  });

  describe('undo()', () => {
    it('should restore original curve amount from positive', () => {
      const edge = createTestEdge('node-a', 'node-b', { lineType: 'curve', curveAmount: 0 });
      const command = new EdgeCurveAmountChangeCommand(edge, 50);

      command.execute();
      command.undo();

      expect(edge.curveAmount).toBe(0);
    });

    it('should restore original curve amount from negative', () => {
      const edge = createTestEdge('node-a', 'node-b', { lineType: 'curve', curveAmount: 30 });
      const command = new EdgeCurveAmountChangeCommand(edge, -50);

      command.execute();
      command.undo();

      expect(edge.curveAmount).toBe(30);
    });

    it('should restore original positive curve amount', () => {
      const edge = createTestEdge('node-a', 'node-b', { lineType: 'curve', curveAmount: 75 });
      const command = new EdgeCurveAmountChangeCommand(edge, 25);

      command.execute();
      command.undo();

      expect(edge.curveAmount).toBe(75);
    });
  });

  describe('execute() after undo() (redo)', () => {
    it('should re-apply curve amount change', () => {
      const edge = createTestEdge('node-a', 'node-b', { lineType: 'curve', curveAmount: 0 });
      const command = new EdgeCurveAmountChangeCommand(edge, 50);

      command.execute();
      command.undo();
      command.execute();

      expect(edge.curveAmount).toBe(50);
    });

    it('should handle multiple undo/redo cycles', () => {
      const edge = createTestEdge('node-a', 'node-b', { lineType: 'curve', curveAmount: 0 });
      const command = new EdgeCurveAmountChangeCommand(edge, 75);

      command.execute();
      expect(edge.curveAmount).toBe(75);

      command.undo();
      expect(edge.curveAmount).toBe(0);

      command.execute();
      expect(edge.curveAmount).toBe(75);

      command.undo();
      expect(edge.curveAmount).toBe(0);
    });

    it('should handle sequence of curve amount changes', () => {
      const edge = createTestEdge('node-a', 'node-b', { lineType: 'curve', curveAmount: 0 });

      const cmd1 = new EdgeCurveAmountChangeCommand(edge, 25);
      cmd1.execute();
      expect(edge.curveAmount).toBe(25);

      const cmd2 = new EdgeCurveAmountChangeCommand(edge, 50);
      cmd2.execute();
      expect(edge.curveAmount).toBe(50);

      const cmd3 = new EdgeCurveAmountChangeCommand(edge, -25);
      cmd3.execute();
      expect(edge.curveAmount).toBe(-25);

      // Undo all
      cmd3.undo();
      expect(edge.curveAmount).toBe(50);

      cmd2.undo();
      expect(edge.curveAmount).toBe(25);

      cmd1.undo();
      expect(edge.curveAmount).toBe(0);
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

      const edge = createTestEdge('node-a', 'node-b', { lineType: 'curve', curveAmount: 0 });
      const command = new EdgeCurveAmountChangeCommand(edge, 50);

      expect(command.getDescription()).toBe('Change edge "Start" → "End" curve amount to 50');
    });

    it('should fallback to node ID if labels not available', () => {
      const edge = createTestEdge('node-a', 'node-b', { lineType: 'curve', curveAmount: 0 });
      const command = new EdgeCurveAmountChangeCommand(edge, -75);

      expect(command.getDescription()).toBe('Change edge "node-a" → "node-b" curve amount to -75');
    });

    it('should show correct curve amount value', () => {
      const edge = createTestEdge('node-a', 'node-b', { lineType: 'curve', curveAmount: 0 });
      const command = new EdgeCurveAmountChangeCommand(edge, 100);

      expect(command.getDescription()).toContain('100');
    });
  });
});
