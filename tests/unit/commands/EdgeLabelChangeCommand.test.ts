import { describe, it, expect, beforeEach } from 'vitest';
import { EdgeLabelChangeCommand } from '../../../src/renderer/commands/EdgeLabelChangeCommand';
import { createTestEdge, createTestNode } from '../../utils/mock-factories';
import { getGraphManager, GraphManager } from '../../../src/renderer/core/GraphManager';

describe('EdgeLabelChangeCommand', () => {
  let graphManager: GraphManager;

  beforeEach(() => {
    graphManager = getGraphManager();
    graphManager.clear();
  });

  describe('execute()', () => {
    it('should set label on edge', () => {
      const edge = createTestEdge('node-1', 'node-2', { id: 'edge-1' });
      const command = new EdgeLabelChangeCommand(edge, 'weight: 5');

      command.execute();

      expect(edge.label).toBe('weight: 5');
    });

    it('should change existing label', () => {
      const edge = createTestEdge('node-1', 'node-2', { id: 'edge-1', label: 'old label' });
      const command = new EdgeLabelChangeCommand(edge, 'new label');

      command.execute();

      expect(edge.label).toBe('new label');
    });

    it('should set label to undefined (remove label)', () => {
      const edge = createTestEdge('node-1', 'node-2', { id: 'edge-1', label: 'has label' });
      const command = new EdgeLabelChangeCommand(edge, undefined);

      command.execute();

      expect(edge.label).toBeUndefined();
    });

    it('should set label to empty string', () => {
      const edge = createTestEdge('node-1', 'node-2', { id: 'edge-1', label: 'has label' });
      const command = new EdgeLabelChangeCommand(edge, '');

      command.execute();

      expect(edge.label).toBe('');
    });
  });

  describe('undo()', () => {
    it('should restore original label', () => {
      const edge = createTestEdge('node-1', 'node-2', { id: 'edge-1', label: 'original' });
      const command = new EdgeLabelChangeCommand(edge, 'changed');

      command.execute();
      command.undo();

      expect(edge.label).toBe('original');
    });

    it('should restore undefined label', () => {
      const edge = createTestEdge('node-1', 'node-2', { id: 'edge-1' });
      const command = new EdgeLabelChangeCommand(edge, 'new label');

      command.execute();
      command.undo();

      expect(edge.label).toBeUndefined();
    });

    it('should restore empty string label', () => {
      const edge = createTestEdge('node-1', 'node-2', { id: 'edge-1', label: '' });
      const command = new EdgeLabelChangeCommand(edge, 'new label');

      command.execute();
      command.undo();

      expect(edge.label).toBe('');
    });
  });

  describe('redo (execute after undo)', () => {
    it('should re-apply the new label', () => {
      const edge = createTestEdge('node-1', 'node-2', { id: 'edge-1', label: 'original' });
      const command = new EdgeLabelChangeCommand(edge, 'changed');

      command.execute();
      command.undo();
      command.execute();

      expect(edge.label).toBe('changed');
    });
  });

  describe('getDescription()', () => {
    it('should return description with edge info', () => {
      // Setup nodes in GraphManager so description can find labels
      const sourceNode = createTestNode({ id: 'node-1', label: 'A' });
      const targetNode = createTestNode({ id: 'node-2', label: 'B' });
      graphManager.registerNode('node-1');
      graphManager.registerNode('node-2');
      graphManager.setNodeShape('node-1', sourceNode);
      graphManager.setNodeShape('node-2', targetNode);

      const edge = createTestEdge('node-1', 'node-2', { id: 'edge-1' });
      const command = new EdgeLabelChangeCommand(edge, 'label');

      const description = command.getDescription();

      expect(description).toContain('edge');
      expect(description).toContain('A');
      expect(description).toContain('B');
    });
  });
});
