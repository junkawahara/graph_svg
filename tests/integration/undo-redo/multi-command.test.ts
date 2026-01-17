import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { HistoryManager } from '../../../src/renderer/core/HistoryManager';
import { AddShapeCommand } from '../../../src/renderer/commands/AddShapeCommand';
import { DeleteShapeCommand } from '../../../src/renderer/commands/DeleteShapeCommand';
import { MoveShapeCommand } from '../../../src/renderer/commands/MoveShapeCommand';
import { StyleChangeCommand } from '../../../src/renderer/commands/StyleChangeCommand';
import { AddNodeCommand } from '../../../src/renderer/commands/AddNodeCommand';
import { AddEdgeCommand } from '../../../src/renderer/commands/AddEdgeCommand';
import { DeleteNodeCommand } from '../../../src/renderer/commands/DeleteNodeCommand';
import { eventBus } from '../../../src/renderer/core/EventBus';
import { getGraphManager } from '../../../src/renderer/core/GraphManager';
import {
  createTestRectangle,
  createTestEllipse,
  createTestNode,
  createTestEdge
} from '../../utils/mock-factories';
import {
  createMockContainer,
  expectShapeInContainer,
  expectShapeNotInContainer,
  expectContainerLength
} from '../../utils/test-helpers';
import { expectClose } from '../../utils/shape-comparators';

describe('Multi-Command Undo/Redo Integration Tests', () => {
  let historyManager: HistoryManager;
  let emitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    historyManager = new HistoryManager();
    emitSpy = vi.spyOn(eventBus, 'emit');
    getGraphManager().clear();
  });

  afterEach(() => {
    emitSpy.mockRestore();
  });

  describe('Shape Operations Sequence', () => {
    it('should handle add → move → undo → verify position', () => {
      const container = createMockContainer();
      const rect = createTestRectangle({ x: 100, y: 100 });

      // Add shape
      const addCmd = new AddShapeCommand(container, rect);
      historyManager.execute(addCmd);
      expectShapeInContainer(container, rect);

      // Move shape
      const moveCmd = new MoveShapeCommand([rect], 50, 50);
      historyManager.execute(moveCmd);
      expectClose(rect.x, 150);
      expectClose(rect.y, 150);

      // Undo move
      historyManager.undo();
      expectClose(rect.x, 100);
      expectClose(rect.y, 100);

      // Shape should still be in container
      expectShapeInContainer(container, rect);
    });

    it('should handle add → delete → undo → verify existence', () => {
      const container = createMockContainer();
      const rect = createTestRectangle();

      // Add shape
      const addCmd = new AddShapeCommand(container, rect);
      historyManager.execute(addCmd);
      expectShapeInContainer(container, rect);

      // Delete shape
      const deleteCmd = new DeleteShapeCommand(container, [rect]);
      historyManager.execute(deleteCmd);
      expectShapeNotInContainer(container, rect);

      // Undo delete
      historyManager.undo();
      expectShapeInContainer(container, rect);
    });

    it('should handle full undo → full redo sequence', () => {
      const container = createMockContainer();
      const rect = createTestRectangle({ x: 0, y: 0 });

      // Add shape
      historyManager.execute(new AddShapeCommand(container, rect));

      // Move three times
      historyManager.execute(new MoveShapeCommand([rect], 10, 10));
      historyManager.execute(new MoveShapeCommand([rect], 20, 20));
      historyManager.execute(new MoveShapeCommand([rect], 30, 30));

      // Verify final position
      expectClose(rect.x, 60);
      expectClose(rect.y, 60);

      // Undo all moves
      historyManager.undo(); // x=30, y=30
      historyManager.undo(); // x=10, y=10
      historyManager.undo(); // x=0, y=0
      expectClose(rect.x, 0);
      expectClose(rect.y, 0);

      // Redo all moves
      historyManager.redo();
      historyManager.redo();
      historyManager.redo();
      expectClose(rect.x, 60);
      expectClose(rect.y, 60);
    });

    it('should clear redo stack when new command is executed after undo', () => {
      const container = createMockContainer();
      const rect = createTestRectangle({ x: 0, y: 0 });

      historyManager.execute(new AddShapeCommand(container, rect));
      historyManager.execute(new MoveShapeCommand([rect], 100, 100));

      // Undo the move
      historyManager.undo();
      expect(historyManager.canRedo()).toBe(true);

      // Execute new command
      historyManager.execute(new MoveShapeCommand([rect], 50, 50));

      // Redo should now be unavailable
      expect(historyManager.canRedo()).toBe(false);
    });

    it('should handle multiple shape operations', () => {
      const container = createMockContainer();
      const rect1 = createTestRectangle({ id: 'rect-1', x: 0, y: 0 });
      const rect2 = createTestRectangle({ id: 'rect-2', x: 100, y: 100 });

      // Add both shapes
      historyManager.execute(new AddShapeCommand(container, rect1));
      historyManager.execute(new AddShapeCommand(container, rect2));

      // Move both shapes together
      historyManager.execute(new MoveShapeCommand([rect1, rect2], 25, 25));
      expectClose(rect1.x, 25);
      expectClose(rect2.x, 125);

      // Undo move
      historyManager.undo();
      expectClose(rect1.x, 0);
      expectClose(rect2.x, 100);

      // Undo add rect2
      historyManager.undo();
      expectShapeNotInContainer(container, rect2);
      expectShapeInContainer(container, rect1);
    });
  });

  describe('Style Changes', () => {
    it('should handle add → style change → undo → verify style', () => {
      const container = createMockContainer();
      const rect = createTestRectangle();
      rect.style.fill = '#ff0000';

      historyManager.execute(new AddShapeCommand(container, rect));
      historyManager.execute(new StyleChangeCommand([rect], { fill: '#00ff00' }));

      expect(rect.style.fill).toBe('#00ff00');

      historyManager.undo();
      expect(rect.style.fill).toBe('#ff0000');
    });

    it('should handle multiple style changes', () => {
      const container = createMockContainer();
      const rect = createTestRectangle();
      rect.style.fill = '#ff0000';
      rect.style.strokeWidth = 1;

      historyManager.execute(new AddShapeCommand(container, rect));
      historyManager.execute(new StyleChangeCommand([rect], { fill: '#00ff00' }));
      historyManager.execute(new StyleChangeCommand([rect], { strokeWidth: 5 }));

      expect(rect.style.fill).toBe('#00ff00');
      expect(rect.style.strokeWidth).toBe(5);

      // Undo strokeWidth change
      historyManager.undo();
      expect(rect.style.strokeWidth).toBe(1);
      expect(rect.style.fill).toBe('#00ff00');

      // Undo fill change
      historyManager.undo();
      expect(rect.style.fill).toBe('#ff0000');
    });
  });

  describe('Graph Operations', () => {
    it('should handle add node → add edge → delete node → undo', () => {
      const container = createMockContainer();
      const gm = getGraphManager();

      const nodeA = createTestNode({ id: 'node-a', label: 'A' });
      const nodeB = createTestNode({ id: 'node-b', label: 'B' });
      const edge = createTestEdge('node-a', 'node-b', { id: 'edge-1' });

      // Add nodes
      historyManager.execute(new AddNodeCommand(container, nodeA));
      gm.registerNode(nodeA.id);
      gm.setNodeShape(nodeA.id, nodeA);

      historyManager.execute(new AddNodeCommand(container, nodeB));
      gm.registerNode(nodeB.id);
      gm.setNodeShape(nodeB.id, nodeB);

      // Add edge
      historyManager.execute(new AddEdgeCommand(container, edge));
      gm.registerEdge(edge.id, edge.sourceNodeId, edge.targetNodeId);

      expectContainerLength(container, 3);

      // Delete node A (should also delete edge)
      historyManager.execute(new DeleteNodeCommand(container, nodeA));

      expectShapeNotInContainer(container, nodeA);
      expectShapeNotInContainer(container, edge);
      expectShapeInContainer(container, nodeB);
      expectContainerLength(container, 1);

      // Undo delete
      historyManager.undo();

      expectShapeInContainer(container, nodeA);
      expectShapeInContainer(container, nodeB);
      expectShapeInContainer(container, edge);
      expectContainerLength(container, 3);
    });

    it('should handle node movement affecting edges', () => {
      const container = createMockContainer();
      const gm = getGraphManager();

      const node = createTestNode({ id: 'node-1', label: 'A', cx: 100, cy: 100 });

      historyManager.execute(new AddNodeCommand(container, node));
      gm.registerNode(node.id);
      gm.setNodeShape(node.id, node);

      // Move node
      historyManager.execute(new MoveShapeCommand([node], 50, 50));

      expectClose(node.cx, 150);
      expectClose(node.cy, 150);

      // Undo move
      historyManager.undo();

      expectClose(node.cx, 100);
      expectClose(node.cy, 100);
    });
  });

  describe('Complex Workflow', () => {
    it('should handle interleaved undo/redo correctly', () => {
      const container = createMockContainer();
      const rect = createTestRectangle({ x: 0, y: 0 });

      historyManager.execute(new AddShapeCommand(container, rect)); // pos: 0,0
      historyManager.execute(new MoveShapeCommand([rect], 10, 0)); // pos: 10,0
      historyManager.execute(new MoveShapeCommand([rect], 10, 0)); // pos: 20,0

      historyManager.undo(); // pos: 10,0
      expectClose(rect.x, 10);

      historyManager.undo(); // pos: 0,0
      expectClose(rect.x, 0);

      historyManager.redo(); // pos: 10,0
      expectClose(rect.x, 10);

      historyManager.undo(); // pos: 0,0
      expectClose(rect.x, 0);

      historyManager.redo(); // pos: 10,0
      historyManager.redo(); // pos: 20,0
      expectClose(rect.x, 20);
    });

    it('should emit history:changed events correctly', () => {
      const container = createMockContainer();
      const rect = createTestRectangle();

      emitSpy.mockClear();

      historyManager.execute(new AddShapeCommand(container, rect));
      expect(emitSpy).toHaveBeenLastCalledWith('history:changed', {
        canUndo: true,
        canRedo: false
      });

      historyManager.undo();
      expect(emitSpy).toHaveBeenLastCalledWith('history:changed', {
        canUndo: false,
        canRedo: true
      });

      historyManager.redo();
      expect(emitSpy).toHaveBeenLastCalledWith('history:changed', {
        canUndo: true,
        canRedo: false
      });
    });

    it('should handle 100+ commands respecting history limit', () => {
      const container = createMockContainer();
      const rect = createTestRectangle({ x: 0, y: 0 });

      historyManager.execute(new AddShapeCommand(container, rect));

      // Execute 105 move commands
      for (let i = 0; i < 105; i++) {
        historyManager.execute(new MoveShapeCommand([rect], 1, 0));
      }

      // Position should be 105 (1 * 105)
      expectClose(rect.x, 105);

      // Undo all - should only undo 100 times (history limit)
      let undoCount = 0;
      while (historyManager.canUndo()) {
        historyManager.undo();
        undoCount++;
      }

      expect(undoCount).toBe(100);
      // Position should be 5 (105 - 100) since oldest commands were dropped
      expectClose(rect.x, 5);
    });
  });

  describe('Add → Move → Delete → Undo All', () => {
    it('should correctly restore initial state through all undos', () => {
      const container = createMockContainer();
      const rect = createTestRectangle({ id: 'rect-1', x: 50, y: 50 });

      // Add
      historyManager.execute(new AddShapeCommand(container, rect));

      // Move
      historyManager.execute(new MoveShapeCommand([rect], 100, 100));
      expectClose(rect.x, 150);

      // Delete
      historyManager.execute(new DeleteShapeCommand(container, [rect]));
      expectShapeNotInContainer(container, rect);

      // Undo delete
      historyManager.undo();
      expectShapeInContainer(container, rect);
      expectClose(rect.x, 150);

      // Undo move
      historyManager.undo();
      expectClose(rect.x, 50);

      // Undo add
      historyManager.undo();
      expectShapeNotInContainer(container, rect);
      expectContainerLength(container, 0);
    });
  });
});
