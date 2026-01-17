import { describe, it, expect, beforeEach } from 'vitest';
import {
  createTestRectangle,
  createTestEllipse,
  createTestLine,
  createTestText,
  createTestGroup
} from '../../utils/mock-factories';
import { SelectionManager } from '../../../src/renderer/core/SelectionManager';
import { Shape } from '../../../src/renderer/shapes/Shape';
import { Bounds } from '../../../src/shared/types';

/**
 * Check if shape bounds are fully contained in selection rect
 */
function isFullyContained(shapeBounds: Bounds, selectionRect: Bounds): boolean {
  return (
    shapeBounds.x >= selectionRect.x &&
    shapeBounds.y >= selectionRect.y &&
    shapeBounds.x + shapeBounds.width <= selectionRect.x + selectionRect.width &&
    shapeBounds.y + shapeBounds.height <= selectionRect.y + selectionRect.height
  );
}

/**
 * Check if shape bounds intersect with selection rect
 */
function boundsIntersect(shapeBounds: Bounds, selectionRect: Bounds): boolean {
  return !(
    shapeBounds.x + shapeBounds.width < selectionRect.x ||
    selectionRect.x + selectionRect.width < shapeBounds.x ||
    shapeBounds.y + shapeBounds.height < selectionRect.y ||
    selectionRect.y + selectionRect.height < shapeBounds.y
  );
}

/**
 * Get shapes that are fully contained in selection rect
 */
function getShapesInRect(shapes: Shape[], selectionRect: Bounds): Shape[] {
  return shapes.filter(shape => isFullyContained(shape.getBounds(), selectionRect));
}

/**
 * Get shapes that intersect with selection rect (crossing mode)
 */
function getShapesIntersectingRect(shapes: Shape[], selectionRect: Bounds): Shape[] {
  return shapes.filter(shape => boundsIntersect(shape.getBounds(), selectionRect));
}

describe('Range Selection Integration', () => {
  let selectionManager: SelectionManager;

  beforeEach(() => {
    selectionManager = new SelectionManager();
  });

  describe('fully contained selection (default mode)', () => {
    it('should select shapes fully inside selection rectangle', () => {
      const rect1 = createTestRectangle({ id: 'rect-1', x: 50, y: 50, width: 30, height: 20 });
      const rect2 = createTestRectangle({ id: 'rect-2', x: 100, y: 100, width: 30, height: 20 });
      const shapes = [rect1, rect2];

      // Selection rect that contains only rect1
      const selectionRect: Bounds = { x: 40, y: 40, width: 50, height: 40 };

      const selected = getShapesInRect(shapes, selectionRect);

      expect(selected).toHaveLength(1);
      expect(selected[0].id).toBe('rect-1');
    });

    it('should select multiple shapes fully inside selection rectangle', () => {
      const rect1 = createTestRectangle({ id: 'rect-1', x: 50, y: 50, width: 30, height: 20 });
      const rect2 = createTestRectangle({ id: 'rect-2', x: 100, y: 50, width: 30, height: 20 });
      const rect3 = createTestRectangle({ id: 'rect-3', x: 200, y: 200, width: 30, height: 20 });
      const shapes = [rect1, rect2, rect3];

      // Selection rect that contains rect1 and rect2
      const selectionRect: Bounds = { x: 40, y: 40, width: 100, height: 50 };

      const selected = getShapesInRect(shapes, selectionRect);

      expect(selected).toHaveLength(2);
      const ids = selected.map(s => s.id);
      expect(ids).toContain('rect-1');
      expect(ids).toContain('rect-2');
      expect(ids).not.toContain('rect-3');
    });

    it('should not select shapes partially inside selection rectangle', () => {
      const rect = createTestRectangle({ id: 'rect-1', x: 50, y: 50, width: 100, height: 100 });
      const shapes = [rect];

      // Selection rect that only partially overlaps rect
      const selectionRect: Bounds = { x: 0, y: 0, width: 80, height: 80 };

      const selected = getShapesInRect(shapes, selectionRect);

      expect(selected).toHaveLength(0);
    });

    it('should not select shapes completely outside selection rectangle', () => {
      const rect = createTestRectangle({ id: 'rect-1', x: 200, y: 200, width: 50, height: 50 });
      const shapes = [rect];

      const selectionRect: Bounds = { x: 0, y: 0, width: 100, height: 100 };

      const selected = getShapesInRect(shapes, selectionRect);

      expect(selected).toHaveLength(0);
    });
  });

  describe('intersection selection (crossing mode)', () => {
    it('should select shapes that intersect selection rectangle', () => {
      const rect = createTestRectangle({ id: 'rect-1', x: 50, y: 50, width: 100, height: 100 });
      const shapes = [rect];

      // Selection rect that partially overlaps rect
      const selectionRect: Bounds = { x: 0, y: 0, width: 80, height: 80 };

      const selected = getShapesIntersectingRect(shapes, selectionRect);

      expect(selected).toHaveLength(1);
      expect(selected[0].id).toBe('rect-1');
    });

    it('should select multiple intersecting shapes', () => {
      const rect1 = createTestRectangle({ id: 'rect-1', x: 0, y: 0, width: 60, height: 60 });
      const rect2 = createTestRectangle({ id: 'rect-2', x: 40, y: 40, width: 60, height: 60 });
      const rect3 = createTestRectangle({ id: 'rect-3', x: 200, y: 200, width: 60, height: 60 });
      const shapes = [rect1, rect2, rect3];

      // Selection rect at center, intersecting rect1 and rect2
      const selectionRect: Bounds = { x: 30, y: 30, width: 40, height: 40 };

      const selected = getShapesIntersectingRect(shapes, selectionRect);

      expect(selected).toHaveLength(2);
      const ids = selected.map(s => s.id);
      expect(ids).toContain('rect-1');
      expect(ids).toContain('rect-2');
      expect(ids).not.toContain('rect-3');
    });

    it('should not select shapes that do not intersect', () => {
      const rect = createTestRectangle({ id: 'rect-1', x: 200, y: 200, width: 50, height: 50 });
      const shapes = [rect];

      const selectionRect: Bounds = { x: 0, y: 0, width: 100, height: 100 };

      const selected = getShapesIntersectingRect(shapes, selectionRect);

      expect(selected).toHaveLength(0);
    });

    it('should select shape when selection rect is fully inside shape', () => {
      const rect = createTestRectangle({ id: 'rect-1', x: 0, y: 0, width: 200, height: 200 });
      const shapes = [rect];

      // Small selection rect inside the shape
      const selectionRect: Bounds = { x: 50, y: 50, width: 30, height: 30 };

      const selected = getShapesIntersectingRect(shapes, selectionRect);

      expect(selected).toHaveLength(1);
      expect(selected[0].id).toBe('rect-1');
    });
  });

  describe('different shape types', () => {
    it('should handle ellipse bounds correctly', () => {
      const ellipse = createTestEllipse({ id: 'ellipse-1', cx: 100, cy: 100, rx: 30, ry: 20 });
      const shapes = [ellipse];

      // Selection rect that contains the ellipse bounds
      // Ellipse bounds: x=70, y=80, width=60, height=40
      const selectionRect: Bounds = { x: 60, y: 70, width: 80, height: 60 };

      const selected = getShapesInRect(shapes, selectionRect);

      expect(selected).toHaveLength(1);
      expect(selected[0].id).toBe('ellipse-1');
    });

    it('should handle line bounds correctly', () => {
      const line = createTestLine({ id: 'line-1', x1: 50, y1: 50, x2: 150, y2: 100 });
      const shapes = [line];

      // Line bounds: x=50, y=50, width=100, height=50
      const selectionRect: Bounds = { x: 40, y: 40, width: 120, height: 70 };

      const selected = getShapesInRect(shapes, selectionRect);

      expect(selected).toHaveLength(1);
      expect(selected[0].id).toBe('line-1');
    });

    it('should handle text bounds correctly', () => {
      const text = createTestText({ id: 'text-1', x: 100, y: 100, content: 'Test' });
      const shapes = [text];
      const bounds = text.getBounds();

      // Selection rect that contains text
      const selectionRect: Bounds = {
        x: bounds.x - 10,
        y: bounds.y - 10,
        width: bounds.width + 20,
        height: bounds.height + 20
      };

      const selected = getShapesInRect(shapes, selectionRect);

      expect(selected).toHaveLength(1);
      expect(selected[0].id).toBe('text-1');
    });

    it('should handle mixed shape types', () => {
      const rect = createTestRectangle({ id: 'rect-1', x: 20, y: 20, width: 40, height: 40 });
      const ellipse = createTestEllipse({ id: 'ellipse-1', cx: 150, cy: 50, rx: 20, ry: 20 });
      const line = createTestLine({ id: 'line-1', x1: 200, y1: 20, x2: 250, y2: 80 });
      const shapes = [rect, ellipse, line];

      // Selection rect containing rect and ellipse
      const selectionRect: Bounds = { x: 10, y: 10, width: 180, height: 80 };

      const selected = getShapesInRect(shapes, selectionRect);

      expect(selected).toHaveLength(2);
      const ids = selected.map(s => s.id);
      expect(ids).toContain('rect-1');
      expect(ids).toContain('ellipse-1');
      expect(ids).not.toContain('line-1');
    });
  });

  describe('group selection', () => {
    it('should select group when group bounds are fully contained', () => {
      const rect = createTestRectangle({ id: 'rect-1', x: 50, y: 50, width: 30, height: 30 });
      const ellipse = createTestEllipse({ id: 'ellipse-1', cx: 100, cy: 65, rx: 15, ry: 15 });
      const group = createTestGroup([rect, ellipse], { id: 'group-1' });
      const shapes = [group];

      // Group bounds span from rect to ellipse
      const groupBounds = group.getBounds();
      const selectionRect: Bounds = {
        x: groupBounds.x - 10,
        y: groupBounds.y - 10,
        width: groupBounds.width + 20,
        height: groupBounds.height + 20
      };

      const selected = getShapesInRect(shapes, selectionRect);

      expect(selected).toHaveLength(1);
      expect(selected[0].id).toBe('group-1');
    });

    it('should not select group when only part of group is contained', () => {
      const rect = createTestRectangle({ id: 'rect-1', x: 50, y: 50, width: 30, height: 30 });
      const ellipse = createTestEllipse({ id: 'ellipse-1', cx: 200, cy: 200, rx: 20, ry: 20 });
      const group = createTestGroup([rect, ellipse], { id: 'group-1' });
      const shapes = [group];

      // Selection rect that only contains rect, not the full group
      const selectionRect: Bounds = { x: 40, y: 40, width: 50, height: 50 };

      const selected = getShapesInRect(shapes, selectionRect);

      expect(selected).toHaveLength(0);
    });
  });

  describe('selection manager integration', () => {
    it('should add range-selected shapes to selection manager', () => {
      const rect1 = createTestRectangle({ id: 'rect-1', x: 50, y: 50, width: 30, height: 20 });
      const rect2 = createTestRectangle({ id: 'rect-2', x: 100, y: 50, width: 30, height: 20 });
      const shapes = [rect1, rect2];

      const selectionRect: Bounds = { x: 40, y: 40, width: 100, height: 40 };
      const selected = getShapesInRect(shapes, selectionRect);

      // Add to selection manager
      selected.forEach(shape => selectionManager.addToSelection(shape));

      expect(selectionManager.getSelectionCount()).toBe(2);
      expect(selectionManager.isSelected(rect1)).toBe(true);
      expect(selectionManager.isSelected(rect2)).toBe(true);
    });

    it('should replace selection with new range selection', () => {
      const rect1 = createTestRectangle({ id: 'rect-1', x: 50, y: 50, width: 30, height: 20 });
      const rect2 = createTestRectangle({ id: 'rect-2', x: 200, y: 200, width: 30, height: 20 });
      const shapes = [rect1, rect2];

      // First, select rect1
      selectionManager.select(rect1);
      expect(selectionManager.isSelected(rect1)).toBe(true);

      // Then do range selection that only contains rect2
      selectionManager.clearSelection();
      const selectionRect: Bounds = { x: 190, y: 190, width: 50, height: 40 };
      const selected = getShapesInRect(shapes, selectionRect);
      selected.forEach(shape => selectionManager.addToSelection(shape));

      expect(selectionManager.getSelectionCount()).toBe(1);
      expect(selectionManager.isSelected(rect1)).toBe(false);
      expect(selectionManager.isSelected(rect2)).toBe(true);
    });

    it('should add to existing selection with shift modifier simulation', () => {
      const rect1 = createTestRectangle({ id: 'rect-1', x: 50, y: 50, width: 30, height: 20 });
      const rect2 = createTestRectangle({ id: 'rect-2', x: 200, y: 200, width: 30, height: 20 });
      const shapes = [rect1, rect2];

      // First select rect1
      selectionManager.select(rect1);
      expect(selectionManager.getSelectionCount()).toBe(1);

      // Then add rect2 via range selection (simulating Shift key)
      const selectionRect: Bounds = { x: 190, y: 190, width: 50, height: 40 };
      const selected = getShapesInRect(shapes, selectionRect);
      selected.forEach(shape => selectionManager.addToSelection(shape));

      // Both should be selected
      expect(selectionManager.getSelectionCount()).toBe(2);
      expect(selectionManager.isSelected(rect1)).toBe(true);
      expect(selectionManager.isSelected(rect2)).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle empty shapes array', () => {
      const shapes: Shape[] = [];
      const selectionRect: Bounds = { x: 0, y: 0, width: 100, height: 100 };

      const selected = getShapesInRect(shapes, selectionRect);

      expect(selected).toHaveLength(0);
    });

    it('should handle zero-size selection rectangle', () => {
      const rect = createTestRectangle({ id: 'rect-1', x: 50, y: 50, width: 30, height: 20 });
      const shapes = [rect];

      const selectionRect: Bounds = { x: 60, y: 60, width: 0, height: 0 };

      const selected = getShapesInRect(shapes, selectionRect);

      expect(selected).toHaveLength(0);
    });

    it('should handle negative selection coordinates', () => {
      const rect = createTestRectangle({ id: 'rect-1', x: -50, y: -30, width: 40, height: 30 });
      const shapes = [rect];

      const selectionRect: Bounds = { x: -60, y: -40, width: 60, height: 50 };

      const selected = getShapesInRect(shapes, selectionRect);

      expect(selected).toHaveLength(1);
      expect(selected[0].id).toBe('rect-1');
    });

    it('should handle selection rect not reaching shape', () => {
      const rect = createTestRectangle({ id: 'rect-1', x: 101, y: 101, width: 50, height: 50 });
      const shapes = [rect];

      // Selection rect ends just before shape starts - no intersection
      const selectionRect: Bounds = { x: 0, y: 0, width: 100, height: 100 };

      const selected = getShapesIntersectingRect(shapes, selectionRect);

      // Shapes that are not reached should not be selected
      expect(selected).toHaveLength(0);
    });
  });

  describe('selection direction', () => {
    it('should handle selection from top-left to bottom-right', () => {
      const rect = createTestRectangle({ id: 'rect-1', x: 50, y: 50, width: 30, height: 20 });
      const shapes = [rect];

      // Normal selection direction
      const selectionRect: Bounds = { x: 40, y: 40, width: 50, height: 40 };

      const selected = getShapesInRect(shapes, selectionRect);

      expect(selected).toHaveLength(1);
    });

    it('should normalize inverted selection rectangle', () => {
      const rect = createTestRectangle({ id: 'rect-1', x: 50, y: 50, width: 30, height: 20 });
      const shapes = [rect];

      // Inverted rectangle (negative dimensions would be converted to positive)
      // Start at bottom-right (90, 80), drag to top-left (40, 40)
      // Normalized: x=40, y=40, width=50, height=40
      const startX = 90;
      const startY = 80;
      const endX = 40;
      const endY = 40;

      const normalizedRect: Bounds = {
        x: Math.min(startX, endX),
        y: Math.min(startY, endY),
        width: Math.abs(endX - startX),
        height: Math.abs(endY - startY)
      };

      const selected = getShapesInRect(shapes, normalizedRect);

      expect(selected).toHaveLength(1);
    });
  });
});
