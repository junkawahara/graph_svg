import { describe, it, expect, beforeEach } from 'vitest';
import { EdgeDirectionChangeCommand } from '../../../../src/renderer/commands/EdgeDirectionChangeCommand';
import { createTestNode, createTestEdge } from '../../../utils/mock-factories';
import { getGraphManager } from '../../../../src/renderer/core/GraphManager';

describe('EdgeDirectionChangeCommand', () => {
  beforeEach(() => {
    getGraphManager().clear();
  });

  describe('execute()', () => {
    it('should change direction from none to forward', () => {
      const edge = createTestEdge('node-a', 'node-b', { direction: 'none' });
      const command = new EdgeDirectionChangeCommand(edge, 'forward');

      command.execute();

      expect(edge.direction).toBe('forward');
    });

    it('should change direction from none to backward', () => {
      const edge = createTestEdge('node-a', 'node-b', { direction: 'none' });
      const command = new EdgeDirectionChangeCommand(edge, 'backward');

      command.execute();

      expect(edge.direction).toBe('backward');
    });

    it('should change direction from forward to none', () => {
      const edge = createTestEdge('node-a', 'node-b', { direction: 'forward' });
      const command = new EdgeDirectionChangeCommand(edge, 'none');

      command.execute();

      expect(edge.direction).toBe('none');
    });

    it('should change direction from forward to backward', () => {
      const edge = createTestEdge('node-a', 'node-b', { direction: 'forward' });
      const command = new EdgeDirectionChangeCommand(edge, 'backward');

      command.execute();

      expect(edge.direction).toBe('backward');
    });

    it('should change direction from backward to forward', () => {
      const edge = createTestEdge('node-a', 'node-b', { direction: 'backward' });
      const command = new EdgeDirectionChangeCommand(edge, 'forward');

      command.execute();

      expect(edge.direction).toBe('forward');
    });

    it('should handle self-loop edge', () => {
      const edge = createTestEdge('node-a', 'node-a', { direction: 'none', isSelfLoop: true });
      const command = new EdgeDirectionChangeCommand(edge, 'forward');

      command.execute();

      expect(edge.direction).toBe('forward');
    });
  });

  describe('undo()', () => {
    it('should restore original direction from forward', () => {
      const edge = createTestEdge('node-a', 'node-b', { direction: 'none' });
      const command = new EdgeDirectionChangeCommand(edge, 'forward');

      command.execute();
      command.undo();

      expect(edge.direction).toBe('none');
    });

    it('should restore original direction from backward', () => {
      const edge = createTestEdge('node-a', 'node-b', { direction: 'forward' });
      const command = new EdgeDirectionChangeCommand(edge, 'backward');

      command.execute();
      command.undo();

      expect(edge.direction).toBe('forward');
    });

    it('should restore original direction to none', () => {
      const edge = createTestEdge('node-a', 'node-b', { direction: 'backward' });
      const command = new EdgeDirectionChangeCommand(edge, 'none');

      command.execute();
      command.undo();

      expect(edge.direction).toBe('backward');
    });
  });

  describe('execute() after undo()', () => {
    it('should re-apply direction change (redo behavior)', () => {
      const edge = createTestEdge('node-a', 'node-b', { direction: 'none' });
      const command = new EdgeDirectionChangeCommand(edge, 'forward');

      command.execute();
      command.undo();
      command.execute();

      expect(edge.direction).toBe('forward');
    });

    it('should handle multiple undo/redo cycles', () => {
      const edge = createTestEdge('node-a', 'node-b', { direction: 'none' });
      const command = new EdgeDirectionChangeCommand(edge, 'forward');

      command.execute();
      expect(edge.direction).toBe('forward');

      command.undo();
      expect(edge.direction).toBe('none');

      command.execute();
      expect(edge.direction).toBe('forward');

      command.undo();
      expect(edge.direction).toBe('none');
    });

    it('should handle cycling through all directions', () => {
      const edge = createTestEdge('node-a', 'node-b', { direction: 'none' });

      const cmd1 = new EdgeDirectionChangeCommand(edge, 'forward');
      cmd1.execute();
      expect(edge.direction).toBe('forward');

      const cmd2 = new EdgeDirectionChangeCommand(edge, 'backward');
      cmd2.execute();
      expect(edge.direction).toBe('backward');

      const cmd3 = new EdgeDirectionChangeCommand(edge, 'none');
      cmd3.execute();
      expect(edge.direction).toBe('none');

      // Undo all
      cmd3.undo();
      expect(edge.direction).toBe('backward');

      cmd2.undo();
      expect(edge.direction).toBe('forward');

      cmd1.undo();
      expect(edge.direction).toBe('none');
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

      const edge = createTestEdge('node-a', 'node-b', { direction: 'none' });
      const command = new EdgeDirectionChangeCommand(edge, 'forward');

      expect(command.getDescription()).toBe('Change edge "Start" → "End" direction');
    });

    it('should fallback to node ID if labels not available', () => {
      const edge = createTestEdge('node-a', 'node-b', { direction: 'none' });
      const command = new EdgeDirectionChangeCommand(edge, 'forward');

      expect(command.getDescription()).toBe('Change edge "node-a" → "node-b" direction');
    });
  });
});
