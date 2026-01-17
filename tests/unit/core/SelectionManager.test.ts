import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SelectionManager } from '../../../src/renderer/core/SelectionManager';
import { eventBus } from '../../../src/renderer/core/EventBus';
import { createTestRectangle, createTestEllipse, createTestLine } from '../../utils/mock-factories';

describe('SelectionManager', () => {
  let selectionManager: SelectionManager;
  let emitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    selectionManager = new SelectionManager();
    emitSpy = vi.spyOn(eventBus, 'emit');
  });

  afterEach(() => {
    emitSpy.mockRestore();
  });

  describe('select()', () => {
    it('should select a single shape', () => {
      const rect = createTestRectangle();

      selectionManager.select(rect);

      expect(selectionManager.isSelected(rect)).toBe(true);
      expect(selectionManager.getSelectionCount()).toBe(1);
    });

    it('should clear previous selection when selecting new shape', () => {
      const rect1 = createTestRectangle({ id: 'rect1' });
      const rect2 = createTestRectangle({ id: 'rect2' });

      selectionManager.select(rect1);
      selectionManager.select(rect2);

      expect(selectionManager.isSelected(rect1)).toBe(false);
      expect(selectionManager.isSelected(rect2)).toBe(true);
      expect(selectionManager.getSelectionCount()).toBe(1);
    });

    it('should emit selection:changed event', () => {
      const rect = createTestRectangle();

      selectionManager.select(rect);

      expect(emitSpy).toHaveBeenCalledWith('selection:changed', [rect]);
    });
  });

  describe('addToSelection()', () => {
    it('should add shape to existing selection', () => {
      const rect = createTestRectangle({ id: 'rect' });
      const ellipse = createTestEllipse({ id: 'ellipse' });

      selectionManager.select(rect);
      selectionManager.addToSelection(ellipse);

      expect(selectionManager.isSelected(rect)).toBe(true);
      expect(selectionManager.isSelected(ellipse)).toBe(true);
      expect(selectionManager.getSelectionCount()).toBe(2);
    });

    it('should not duplicate shape if already selected', () => {
      const rect = createTestRectangle();

      selectionManager.select(rect);
      selectionManager.addToSelection(rect);

      expect(selectionManager.getSelectionCount()).toBe(1);
    });

    it('should emit selection:changed event', () => {
      const rect = createTestRectangle();

      selectionManager.addToSelection(rect);

      expect(emitSpy).toHaveBeenCalledWith('selection:changed', [rect]);
    });
  });

  describe('removeFromSelection()', () => {
    it('should remove shape from selection', () => {
      const rect = createTestRectangle({ id: 'rect' });
      const ellipse = createTestEllipse({ id: 'ellipse' });

      selectionManager.select(rect);
      selectionManager.addToSelection(ellipse);
      selectionManager.removeFromSelection(rect);

      expect(selectionManager.isSelected(rect)).toBe(false);
      expect(selectionManager.isSelected(ellipse)).toBe(true);
      expect(selectionManager.getSelectionCount()).toBe(1);
    });

    it('should handle removing non-selected shape', () => {
      const rect = createTestRectangle({ id: 'rect' });
      const ellipse = createTestEllipse({ id: 'ellipse' });

      selectionManager.select(rect);
      selectionManager.removeFromSelection(ellipse);

      expect(selectionManager.isSelected(rect)).toBe(true);
      expect(selectionManager.getSelectionCount()).toBe(1);
    });

    it('should emit selection:changed event', () => {
      const rect = createTestRectangle();
      selectionManager.select(rect);
      emitSpy.mockClear();

      selectionManager.removeFromSelection(rect);

      expect(emitSpy).toHaveBeenCalledWith('selection:changed', []);
    });
  });

  describe('toggleSelection()', () => {
    it('should add shape if not selected', () => {
      const rect = createTestRectangle();

      selectionManager.toggleSelection(rect);

      expect(selectionManager.isSelected(rect)).toBe(true);
    });

    it('should remove shape if already selected', () => {
      const rect = createTestRectangle();

      selectionManager.toggleSelection(rect);
      selectionManager.toggleSelection(rect);

      expect(selectionManager.isSelected(rect)).toBe(false);
    });

    it('should not affect other selections', () => {
      const rect = createTestRectangle({ id: 'rect' });
      const ellipse = createTestEllipse({ id: 'ellipse' });

      selectionManager.select(rect);
      selectionManager.addToSelection(ellipse);
      selectionManager.toggleSelection(rect);

      expect(selectionManager.isSelected(rect)).toBe(false);
      expect(selectionManager.isSelected(ellipse)).toBe(true);
    });

    it('should emit selection:changed event', () => {
      const rect = createTestRectangle();

      selectionManager.toggleSelection(rect);

      expect(emitSpy).toHaveBeenCalledWith('selection:changed', [rect]);
    });
  });

  describe('clearSelection()', () => {
    it('should clear all selections', () => {
      const rect = createTestRectangle({ id: 'rect' });
      const ellipse = createTestEllipse({ id: 'ellipse' });
      const line = createTestLine({ id: 'line' });

      selectionManager.select(rect);
      selectionManager.addToSelection(ellipse);
      selectionManager.addToSelection(line);
      selectionManager.clearSelection();

      expect(selectionManager.hasSelection()).toBe(false);
      expect(selectionManager.getSelectionCount()).toBe(0);
    });

    it('should not emit event if already empty', () => {
      selectionManager.clearSelection();

      // First clear on empty shouldn't emit
      expect(emitSpy).not.toHaveBeenCalled();
    });

    it('should emit selection:changed event when clearing non-empty selection', () => {
      const rect = createTestRectangle();
      selectionManager.select(rect);
      emitSpy.mockClear();

      selectionManager.clearSelection();

      expect(emitSpy).toHaveBeenCalledWith('selection:changed', []);
    });
  });

  describe('isSelected()', () => {
    it('should return true for selected shape', () => {
      const rect = createTestRectangle();
      selectionManager.select(rect);

      expect(selectionManager.isSelected(rect)).toBe(true);
    });

    it('should return false for non-selected shape', () => {
      const rect = createTestRectangle({ id: 'rect' });
      const ellipse = createTestEllipse({ id: 'ellipse' });
      selectionManager.select(rect);

      expect(selectionManager.isSelected(ellipse)).toBe(false);
    });
  });

  describe('getSelection()', () => {
    it('should return empty array when no selection', () => {
      expect(selectionManager.getSelection()).toEqual([]);
    });

    it('should return array of all selected shapes', () => {
      const rect = createTestRectangle({ id: 'rect' });
      const ellipse = createTestEllipse({ id: 'ellipse' });

      selectionManager.select(rect);
      selectionManager.addToSelection(ellipse);

      const selection = selectionManager.getSelection();
      expect(selection).toContain(rect);
      expect(selection).toContain(ellipse);
      expect(selection).toHaveLength(2);
    });

    it('should return a copy of the selection array', () => {
      const rect = createTestRectangle();
      selectionManager.select(rect);

      const selection1 = selectionManager.getSelection();
      const selection2 = selectionManager.getSelection();

      expect(selection1).not.toBe(selection2);
    });
  });

  describe('hasSelection()', () => {
    it('should return false when no selection', () => {
      expect(selectionManager.hasSelection()).toBe(false);
    });

    it('should return true when has selection', () => {
      const rect = createTestRectangle();
      selectionManager.select(rect);

      expect(selectionManager.hasSelection()).toBe(true);
    });
  });

  describe('getSelectionCount()', () => {
    it('should return 0 when no selection', () => {
      expect(selectionManager.getSelectionCount()).toBe(0);
    });

    it('should return correct count for single selection', () => {
      const rect = createTestRectangle();
      selectionManager.select(rect);

      expect(selectionManager.getSelectionCount()).toBe(1);
    });

    it('should return correct count for multiple selections', () => {
      const rect = createTestRectangle({ id: 'rect' });
      const ellipse = createTestEllipse({ id: 'ellipse' });
      const line = createTestLine({ id: 'line' });

      selectionManager.select(rect);
      selectionManager.addToSelection(ellipse);
      selectionManager.addToSelection(line);

      expect(selectionManager.getSelectionCount()).toBe(3);
    });
  });

  describe('multi-select workflow', () => {
    it('should handle typical multi-select workflow', () => {
      const shapes = [
        createTestRectangle({ id: 'rect' }),
        createTestEllipse({ id: 'ellipse' }),
        createTestLine({ id: 'line' })
      ];

      // Select first
      selectionManager.select(shapes[0]);
      expect(selectionManager.getSelectionCount()).toBe(1);

      // Shift+click to add second
      selectionManager.addToSelection(shapes[1]);
      expect(selectionManager.getSelectionCount()).toBe(2);

      // Shift+click to add third
      selectionManager.addToSelection(shapes[2]);
      expect(selectionManager.getSelectionCount()).toBe(3);

      // Shift+click on selected to deselect
      selectionManager.toggleSelection(shapes[1]);
      expect(selectionManager.getSelectionCount()).toBe(2);
      expect(selectionManager.isSelected(shapes[1])).toBe(false);

      // Click elsewhere to clear
      selectionManager.clearSelection();
      expect(selectionManager.hasSelection()).toBe(false);
    });
  });
});
