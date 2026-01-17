import { describe, it, expect, beforeEach } from 'vitest';
import {
  createTestRectangle,
  createTestEllipse,
  createTestLine,
  createTestStyle
} from '../../utils/mock-factories';
import { HistoryManager } from '../../../src/renderer/core/HistoryManager';
import { SelectionManager } from '../../../src/renderer/core/SelectionManager';
import { ClipboardManager } from '../../../src/renderer/core/ClipboardManager';
import { AddShapeCommand, ShapeContainer } from '../../../src/renderer/commands/AddShapeCommand';
import { DeleteShapeCommand } from '../../../src/renderer/commands/DeleteShapeCommand';
import { MoveShapeCommand } from '../../../src/renderer/commands/MoveShapeCommand';
import { createShapeFromData } from '../../../src/renderer/shapes/ShapeFactory';
import { Shape } from '../../../src/renderer/shapes/Shape';

/**
 * Mock container for shapes that implements ShapeContainer interface
 */
interface MockContainer extends ShapeContainer {
  shapes: Shape[];
  getShapes(): Shape[];
}

function createMockContainer(): MockContainer {
  return {
    shapes: [],
    addShape(shape: Shape) {
      this.shapes.push(shape);
    },
    removeShape(shape: Shape) {
      const index = this.shapes.indexOf(shape);
      if (index !== -1) {
        this.shapes.splice(index, 1);
      }
    },
    getShapes() {
      return [...this.shapes];
    }
  };
}

describe('Keyboard Shortcuts Integration', () => {
  let historyManager: HistoryManager;
  let selectionManager: SelectionManager;
  let clipboardManager: ClipboardManager;
  let container: MockContainer;

  beforeEach(() => {
    historyManager = new HistoryManager();
    selectionManager = new SelectionManager();
    clipboardManager = new ClipboardManager();
    container = createMockContainer();
  });

  describe('Ctrl+Z (Undo)', () => {
    it('should undo last add operation', () => {
      const rect = createTestRectangle({ id: 'rect-1' });

      const command = new AddShapeCommand(container, rect);
      historyManager.execute(command);

      expect(container.shapes).toHaveLength(1);

      // Ctrl+Z: Undo
      historyManager.undo();

      expect(container.shapes).toHaveLength(0);
    });

    it('should undo last move operation', () => {
      const rect = createTestRectangle({ id: 'rect-1', x: 100, y: 100 });
      container.addShape(rect);

      const command = new MoveShapeCommand([rect], 50, 50);
      historyManager.execute(command);

      expect(rect.x).toBe(150);
      expect(rect.y).toBe(150);

      // Ctrl+Z: Undo
      historyManager.undo();

      expect(rect.x).toBe(100);
      expect(rect.y).toBe(100);
    });

    it('should undo last delete operation', () => {
      const rect = createTestRectangle({ id: 'rect-1' });
      container.addShape(rect);

      const command = new DeleteShapeCommand(container, [rect]);
      historyManager.execute(command);

      expect(container.shapes).toHaveLength(0);

      // Ctrl+Z: Undo
      historyManager.undo();

      expect(container.shapes).toHaveLength(1);
    });

    it('should do nothing when undo stack is empty', () => {
      historyManager.clear();
      expect(historyManager.canUndo()).toBe(false);

      // Ctrl+Z: Undo (should not throw)
      historyManager.undo();

      expect(historyManager.canUndo()).toBe(false);
    });
  });

  describe('Ctrl+Y / Ctrl+Shift+Z (Redo)', () => {
    it('should redo last undone operation', () => {
      const rect = createTestRectangle({ id: 'rect-1' });

      const command = new AddShapeCommand(container, rect);
      historyManager.execute(command);
      historyManager.undo();

      expect(container.shapes).toHaveLength(0);

      // Ctrl+Y: Redo
      historyManager.redo();

      expect(container.shapes).toHaveLength(1);
    });

    it('should redo multiple operations', () => {
      const rect1 = createTestRectangle({ id: 'rect-1' });
      const rect2 = createTestRectangle({ id: 'rect-2' });

      historyManager.execute(new AddShapeCommand(container, rect1));
      historyManager.execute(new AddShapeCommand(container, rect2));

      historyManager.undo();
      historyManager.undo();

      expect(container.shapes).toHaveLength(0);

      // Ctrl+Y twice
      historyManager.redo();
      historyManager.redo();

      expect(container.shapes).toHaveLength(2);
    });

    it('should do nothing when redo stack is empty', () => {
      expect(historyManager.canRedo()).toBe(false);

      // Ctrl+Y: Redo (should not throw)
      historyManager.redo();

      expect(historyManager.canRedo()).toBe(false);
    });

    it('should clear redo stack on new operation', () => {
      const rect1 = createTestRectangle({ id: 'rect-1' });
      const rect2 = createTestRectangle({ id: 'rect-2' });

      historyManager.execute(new AddShapeCommand(container, rect1));
      historyManager.undo();

      expect(historyManager.canRedo()).toBe(true);

      // New operation clears redo stack
      historyManager.execute(new AddShapeCommand(container, rect2));

      expect(historyManager.canRedo()).toBe(false);
    });
  });

  describe('Delete / Backspace', () => {
    it('should delete selected shape', () => {
      const rect = createTestRectangle({ id: 'rect-1' });
      container.addShape(rect);
      selectionManager.select(rect);

      // Delete key
      const selected = selectionManager.getSelection();
      const command = new DeleteShapeCommand(container, selected);
      historyManager.execute(command);
      selectionManager.clearSelection();

      expect(container.shapes).toHaveLength(0);
      expect(selectionManager.hasSelection()).toBe(false);
    });

    it('should delete multiple selected shapes', () => {
      const rect = createTestRectangle({ id: 'rect-1' });
      const ellipse = createTestEllipse({ id: 'ellipse-1' });
      container.addShape(rect);
      container.addShape(ellipse);

      selectionManager.select(rect);
      selectionManager.addToSelection(ellipse);

      // Delete key
      const selected = selectionManager.getSelection();
      historyManager.execute(new DeleteShapeCommand(container, selected));
      selectionManager.clearSelection();

      expect(container.shapes).toHaveLength(0);
    });

    it('should do nothing when no selection', () => {
      const rect = createTestRectangle({ id: 'rect-1' });
      container.addShape(rect);

      // Delete key with no selection
      const selected = selectionManager.getSelection();
      expect(selected).toHaveLength(0);

      expect(container.shapes).toHaveLength(1);
    });

    it('should allow undo after delete', () => {
      const rect = createTestRectangle({ id: 'rect-1' });
      container.addShape(rect);
      selectionManager.select(rect);

      // Delete
      historyManager.execute(new DeleteShapeCommand(container, [rect]));
      selectionManager.clearSelection();

      expect(container.shapes).toHaveLength(0);

      // Ctrl+Z to undo delete
      historyManager.undo();

      expect(container.shapes).toHaveLength(1);
    });
  });

  describe('Ctrl+C / Ctrl+V (Copy/Paste)', () => {
    it('should copy and paste selected shape', () => {
      const rect = createTestRectangle({ id: 'rect-1', x: 100, y: 100 });
      container.addShape(rect);
      selectionManager.select(rect);

      // Ctrl+C: Copy
      clipboardManager.copy(selectionManager.getSelection());

      expect(clipboardManager.hasContent()).toBe(true);

      // Ctrl+V: Paste
      const content = clipboardManager.getContent();
      const offset = clipboardManager.getPasteOffset();

      content.forEach(data => {
        const newShape = createShapeFromData(data, offset, offset);
        if (newShape) {
          container.addShape(newShape);
        }
      });

      expect(container.shapes).toHaveLength(2);

      // Pasted shape should be offset
      const pastedShape = container.shapes[1] as any;
      expect(pastedShape.x).toBe(120);  // 100 + 20
      expect(pastedShape.y).toBe(120);
    });

    it('should copy and paste multiple shapes', () => {
      const rect = createTestRectangle({ id: 'rect-1' });
      const ellipse = createTestEllipse({ id: 'ellipse-1' });
      container.addShape(rect);
      container.addShape(ellipse);

      selectionManager.select(rect);
      selectionManager.addToSelection(ellipse);

      // Ctrl+C
      clipboardManager.copy(selectionManager.getSelection());

      // Ctrl+V
      const content = clipboardManager.getContent();
      const offset = clipboardManager.getPasteOffset();
      content.forEach(data => {
        const newShape = createShapeFromData(data, offset, offset);
        if (newShape) {
          container.addShape(newShape);
        }
      });

      expect(container.shapes).toHaveLength(4);
    });

    it('should allow multiple pastes', () => {
      const rect = createTestRectangle({ id: 'rect-1', x: 100, y: 100 });
      container.addShape(rect);
      selectionManager.select(rect);

      // Ctrl+C
      clipboardManager.copy(selectionManager.getSelection());

      // Ctrl+V three times
      for (let i = 0; i < 3; i++) {
        const content = clipboardManager.getContent();
        const offset = clipboardManager.getPasteOffset() * (i + 1);
        content.forEach(data => {
          const newShape = createShapeFromData(data, offset, offset);
          if (newShape) {
            container.addShape(newShape);
          }
        });
      }

      expect(container.shapes).toHaveLength(4);  // 1 original + 3 pastes
    });

    it('should do nothing on paste with empty clipboard', () => {
      clipboardManager.clear();

      // Ctrl+V with empty clipboard
      const content = clipboardManager.getContent();
      content.forEach(data => {
        const newShape = createShapeFromData(data);
        if (newShape) {
          container.addShape(newShape);
        }
      });

      expect(container.shapes).toHaveLength(0);
    });
  });

  describe('combined operations', () => {
    it('should support cut workflow (Ctrl+C, Delete, Ctrl+V)', () => {
      const rect = createTestRectangle({ id: 'rect-1', x: 50, y: 50 });
      container.addShape(rect);
      selectionManager.select(rect);

      // Ctrl+C: Copy
      clipboardManager.copy(selectionManager.getSelection());

      // Delete
      historyManager.execute(new DeleteShapeCommand(container, [rect]));
      selectionManager.clearSelection();

      expect(container.shapes).toHaveLength(0);

      // Ctrl+V: Paste
      const content = clipboardManager.getContent();
      const offset = clipboardManager.getPasteOffset();
      content.forEach(data => {
        const newShape = createShapeFromData(data, offset, offset);
        if (newShape) {
          container.addShape(newShape);
        }
      });

      expect(container.shapes).toHaveLength(1);
      const pastedShape = container.shapes[0] as any;
      expect(pastedShape.x).toBe(70);  // 50 + 20
    });

    it('should support undo after paste', () => {
      const rect = createTestRectangle({ id: 'rect-1' });
      container.addShape(rect);
      selectionManager.select(rect);

      // Copy
      clipboardManager.copy(selectionManager.getSelection());

      // Paste via command
      const content = clipboardManager.getContent();
      const offset = clipboardManager.getPasteOffset();
      content.forEach(data => {
        const newShape = createShapeFromData(data, offset, offset);
        if (newShape) {
          historyManager.execute(new AddShapeCommand(container, newShape));
        }
      });

      expect(container.shapes).toHaveLength(2);

      // Undo paste
      historyManager.undo();

      expect(container.shapes).toHaveLength(1);
    });

    it('should handle complex undo/redo sequence', () => {
      // Add shapes
      const rect = createTestRectangle({ id: 'rect-1', x: 0, y: 0 });
      historyManager.execute(new AddShapeCommand(container, rect));

      // Move
      historyManager.execute(new MoveShapeCommand([rect], 100, 100));

      // Delete
      historyManager.execute(new DeleteShapeCommand(container, [rect]));

      expect(container.shapes).toHaveLength(0);

      // Undo delete
      historyManager.undo();
      expect(container.shapes).toHaveLength(1);
      expect((container.shapes[0] as any).x).toBe(100);

      // Undo move
      historyManager.undo();
      expect((container.shapes[0] as any).x).toBe(0);

      // Redo move
      historyManager.redo();
      expect((container.shapes[0] as any).x).toBe(100);

      // Redo delete
      historyManager.redo();
      expect(container.shapes).toHaveLength(0);
    });
  });

  describe('keyboard shortcut state checks', () => {
    it('should report correct canUndo state', () => {
      expect(historyManager.canUndo()).toBe(false);

      const rect = createTestRectangle({ id: 'rect-1' });
      historyManager.execute(new AddShapeCommand(container, rect));

      expect(historyManager.canUndo()).toBe(true);

      historyManager.undo();

      expect(historyManager.canUndo()).toBe(false);
    });

    it('should report correct canRedo state', () => {
      expect(historyManager.canRedo()).toBe(false);

      const rect = createTestRectangle({ id: 'rect-1' });
      historyManager.execute(new AddShapeCommand(container, rect));

      expect(historyManager.canRedo()).toBe(false);

      historyManager.undo();

      expect(historyManager.canRedo()).toBe(true);
    });

    it('should report correct hasSelection state for delete', () => {
      expect(selectionManager.hasSelection()).toBe(false);

      const rect = createTestRectangle({ id: 'rect-1' });
      container.addShape(rect);
      selectionManager.select(rect);

      expect(selectionManager.hasSelection()).toBe(true);

      selectionManager.clearSelection();

      expect(selectionManager.hasSelection()).toBe(false);
    });

    it('should report correct hasContent state for paste', () => {
      expect(clipboardManager.hasContent()).toBe(false);

      const rect = createTestRectangle({ id: 'rect-1' });
      clipboardManager.copy([rect]);

      expect(clipboardManager.hasContent()).toBe(true);

      clipboardManager.clear();

      expect(clipboardManager.hasContent()).toBe(false);
    });
  });
});
