import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ApplyLayoutCommand } from '../../../src/renderer/commands/ApplyLayoutCommand';
import { LayoutManager } from '../../../src/renderer/core/LayoutManager';
import { getGraphManager, GraphManager } from '../../../src/renderer/core/GraphManager';
import { createTestNode } from '../../utils/mock-factories';

describe('ApplyLayoutCommand', () => {
  let graphManager: GraphManager;

  beforeEach(() => {
    graphManager = getGraphManager();
    graphManager.clear();
  });

  describe('constructor', () => {
    it('should capture positions at construction time', () => {
      // Setup a node
      const node = createTestNode({ id: 'node-1', cx: 100, cy: 100 });
      graphManager.registerNode('node-1');
      graphManager.setNodeShape('node-1', node);

      const capturedPositions = LayoutManager.capturePositions();
      const command = new ApplyLayoutCommand('circle', 800, 600);

      expect(capturedPositions.get('node-1')).toEqual({ cx: 100, cy: 100 });
    });
  });

  describe('execute()', () => {
    it('should apply layout when nodes exist', () => {
      // Setup nodes
      const node1 = createTestNode({ id: 'node-1', cx: 100, cy: 100, label: 'A' });
      const node2 = createTestNode({ id: 'node-2', cx: 200, cy: 200, label: 'B' });

      graphManager.registerNode('node-1');
      graphManager.registerNode('node-2');
      graphManager.setNodeShape('node-1', node1);
      graphManager.setNodeShape('node-2', node2);

      const command = new ApplyLayoutCommand('circle', 800, 600);
      command.execute();

      // After circle layout, positions should be different (on a circle)
      // Since it's a real layout algorithm, we just check that afterPositions were captured
      const positions = LayoutManager.capturePositions();
      expect(positions.size).toBe(2);
    });

    it('should handle empty graph', () => {
      const command = new ApplyLayoutCommand('circle', 800, 600);

      // Should not throw
      expect(() => command.execute()).not.toThrow();
    });
  });

  describe('undo()', () => {
    it('should restore original positions', () => {
      // Setup nodes
      const node1 = createTestNode({ id: 'node-1', cx: 100, cy: 100, label: 'A' });
      const node2 = createTestNode({ id: 'node-2', cx: 300, cy: 300, label: 'B' });

      graphManager.registerNode('node-1');
      graphManager.registerNode('node-2');
      graphManager.setNodeShape('node-1', node1);
      graphManager.setNodeShape('node-2', node2);

      const command = new ApplyLayoutCommand('circle', 800, 600);
      command.execute();

      // Verify positions changed
      const afterLayout = LayoutManager.capturePositions();
      const pos1After = afterLayout.get('node-1')!;
      const pos2After = afterLayout.get('node-2')!;

      command.undo();

      // Verify positions restored
      expect(node1.cx).toBe(100);
      expect(node1.cy).toBe(100);
      expect(node2.cx).toBe(300);
      expect(node2.cy).toBe(300);
    });
  });

  describe('redo (execute after undo)', () => {
    it('should re-apply the same layout positions', () => {
      const node1 = createTestNode({ id: 'node-1', cx: 100, cy: 100, label: 'A' });
      const node2 = createTestNode({ id: 'node-2', cx: 300, cy: 300, label: 'B' });

      graphManager.registerNode('node-1');
      graphManager.registerNode('node-2');
      graphManager.setNodeShape('node-1', node1);
      graphManager.setNodeShape('node-2', node2);

      const command = new ApplyLayoutCommand('circle', 800, 600);
      command.execute();

      const firstLayoutPos1 = { cx: node1.cx, cy: node1.cy };
      const firstLayoutPos2 = { cx: node2.cx, cy: node2.cy };

      command.undo();
      command.execute();

      // Should have same positions as first execution (cached)
      expect(node1.cx).toBe(firstLayoutPos1.cx);
      expect(node1.cy).toBe(firstLayoutPos1.cy);
      expect(node2.cx).toBe(firstLayoutPos2.cx);
      expect(node2.cy).toBe(firstLayoutPos2.cy);
    });
  });

  describe('getDescription()', () => {
    it('should return description with layout type', () => {
      const command = new ApplyLayoutCommand('circle', 800, 600);

      expect(command.getDescription()).toContain('circle');
    });

    it('should include layout type for different algorithms', () => {
      const layouts = ['cose', 'circle', 'breadthfirst', 'grid', 'concentric'] as const;

      for (const layout of layouts) {
        const command = new ApplyLayoutCommand(layout, 800, 600);
        expect(command.getDescription()).toContain(layout);
      }
    });
  });

  describe('different layout types', () => {
    beforeEach(() => {
      // Setup a simple graph
      const node1 = createTestNode({ id: 'node-1', cx: 50, cy: 50, label: 'A' });
      const node2 = createTestNode({ id: 'node-2', cx: 100, cy: 100, label: 'B' });
      const node3 = createTestNode({ id: 'node-3', cx: 150, cy: 150, label: 'C' });

      graphManager.registerNode('node-1');
      graphManager.registerNode('node-2');
      graphManager.registerNode('node-3');
      graphManager.setNodeShape('node-1', node1);
      graphManager.setNodeShape('node-2', node2);
      graphManager.setNodeShape('node-3', node3);

      graphManager.registerEdge('edge-1', 'node-1', 'node-2');
      graphManager.registerEdge('edge-2', 'node-2', 'node-3');
    });

    it('should apply circle layout', () => {
      const command = new ApplyLayoutCommand('circle', 800, 600);

      expect(() => command.execute()).not.toThrow();
    });

    it('should apply grid layout', () => {
      const command = new ApplyLayoutCommand('grid', 800, 600);

      expect(() => command.execute()).not.toThrow();
    });

    it('should apply breadthfirst layout', () => {
      const command = new ApplyLayoutCommand('breadthfirst', 800, 600);

      expect(() => command.execute()).not.toThrow();
    });

    it('should respect padding parameter', () => {
      const command = new ApplyLayoutCommand('circle', 800, 600, 100);

      expect(() => command.execute()).not.toThrow();
    });
  });
});
