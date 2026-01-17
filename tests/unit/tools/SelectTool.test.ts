import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { SelectTool, SelectToolCallbacks } from '../../../src/renderer/tools/SelectTool';
import { selectionManager } from '../../../src/renderer/core/SelectionManager';
import { Bounds, Point } from '../../../src/shared/types';
import { createTestRectangle, createTestEllipse } from '../../utils/mock-factories';

// Re-implement the utility functions to test their logic
// (These are private in the actual module)
function isContainedIn(inner: Bounds, outer: Bounds): boolean {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.width <= outer.x + outer.width &&
    inner.y + inner.height <= outer.y + outer.height
  );
}

function boundsIntersect(a: Bounds, b: Bounds): boolean {
  return !(
    a.x + a.width < b.x ||
    b.x + b.width < a.x ||
    a.y + a.height < b.y ||
    b.y + b.height < a.y
  );
}

describe('SelectTool utility functions', () => {
  describe('isContainedIn', () => {
    it('should return true when inner is completely inside outer', () => {
      const inner: Bounds = { x: 20, y: 20, width: 60, height: 60 };
      const outer: Bounds = { x: 0, y: 0, width: 100, height: 100 };
      expect(isContainedIn(inner, outer)).toBe(true);
    });

    it('should return true when inner equals outer', () => {
      const bounds: Bounds = { x: 10, y: 10, width: 50, height: 50 };
      expect(isContainedIn(bounds, bounds)).toBe(true);
    });

    it('should return false when inner extends left', () => {
      const inner: Bounds = { x: -10, y: 20, width: 60, height: 60 };
      const outer: Bounds = { x: 0, y: 0, width: 100, height: 100 };
      expect(isContainedIn(inner, outer)).toBe(false);
    });

    it('should return false when inner extends right', () => {
      const inner: Bounds = { x: 50, y: 20, width: 60, height: 60 };
      const outer: Bounds = { x: 0, y: 0, width: 100, height: 100 };
      expect(isContainedIn(inner, outer)).toBe(false);
    });

    it('should return false when inner extends top', () => {
      const inner: Bounds = { x: 20, y: -10, width: 60, height: 60 };
      const outer: Bounds = { x: 0, y: 0, width: 100, height: 100 };
      expect(isContainedIn(inner, outer)).toBe(false);
    });

    it('should return false when inner extends bottom', () => {
      const inner: Bounds = { x: 20, y: 50, width: 60, height: 60 };
      const outer: Bounds = { x: 0, y: 0, width: 100, height: 100 };
      expect(isContainedIn(inner, outer)).toBe(false);
    });

    it('should return true when inner touches inner edge of outer', () => {
      const inner: Bounds = { x: 0, y: 0, width: 100, height: 100 };
      const outer: Bounds = { x: 0, y: 0, width: 100, height: 100 };
      expect(isContainedIn(inner, outer)).toBe(true);
    });

    it('should return false when inner is completely outside', () => {
      const inner: Bounds = { x: 200, y: 200, width: 50, height: 50 };
      const outer: Bounds = { x: 0, y: 0, width: 100, height: 100 };
      expect(isContainedIn(inner, outer)).toBe(false);
    });
  });

  describe('boundsIntersect', () => {
    it('should return true when bounds overlap', () => {
      const a: Bounds = { x: 0, y: 0, width: 100, height: 100 };
      const b: Bounds = { x: 50, y: 50, width: 100, height: 100 };
      expect(boundsIntersect(a, b)).toBe(true);
    });

    it('should return true when one contains the other', () => {
      const outer: Bounds = { x: 0, y: 0, width: 100, height: 100 };
      const inner: Bounds = { x: 20, y: 20, width: 60, height: 60 };
      expect(boundsIntersect(outer, inner)).toBe(true);
      expect(boundsIntersect(inner, outer)).toBe(true);
    });

    it('should return true when bounds are equal', () => {
      const bounds: Bounds = { x: 10, y: 10, width: 50, height: 50 };
      expect(boundsIntersect(bounds, bounds)).toBe(true);
    });

    it('should return true when bounds touch edges', () => {
      const a: Bounds = { x: 0, y: 0, width: 100, height: 100 };
      const b: Bounds = { x: 100, y: 0, width: 100, height: 100 }; // touching at x=100
      expect(boundsIntersect(a, b)).toBe(true);
    });

    it('should return false when bounds are separated horizontally', () => {
      const a: Bounds = { x: 0, y: 0, width: 100, height: 100 };
      const b: Bounds = { x: 200, y: 0, width: 100, height: 100 };
      expect(boundsIntersect(a, b)).toBe(false);
    });

    it('should return false when bounds are separated vertically', () => {
      const a: Bounds = { x: 0, y: 0, width: 100, height: 100 };
      const b: Bounds = { x: 0, y: 200, width: 100, height: 100 };
      expect(boundsIntersect(a, b)).toBe(false);
    });

    it('should return false when bounds are diagonally separated', () => {
      const a: Bounds = { x: 0, y: 0, width: 50, height: 50 };
      const b: Bounds = { x: 100, y: 100, width: 50, height: 50 };
      expect(boundsIntersect(a, b)).toBe(false);
    });

    it('should handle zero-width bounds', () => {
      const a: Bounds = { x: 50, y: 0, width: 0, height: 100 };
      const b: Bounds = { x: 0, y: 0, width: 100, height: 100 };
      expect(boundsIntersect(a, b)).toBe(true);
    });

    it('should handle zero-height bounds', () => {
      const a: Bounds = { x: 0, y: 50, width: 100, height: 0 };
      const b: Bounds = { x: 0, y: 0, width: 100, height: 100 };
      expect(boundsIntersect(a, b)).toBe(true);
    });
  });
});

describe('SelectTool', () => {
  let tool: SelectTool;
  let mockSvg: SVGSVGElement;
  let shapes: any[];
  let callbacks: SelectToolCallbacks;

  beforeEach(() => {
    mockSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    shapes = [
      createTestRectangle({ id: 'rect-1', x: 50, y: 50, width: 100, height: 80 }),
      createTestEllipse({ id: 'ellipse-1', cx: 300, cy: 300, rx: 40, ry: 30 })
    ];

    callbacks = {
      findShapeAt: vi.fn((point: Point) => {
        for (const shape of shapes) {
          if (shape.hitTest(point)) {
            return shape;
          }
        }
        return null;
      }),
      findHandleAt: vi.fn().mockReturnValue(null),
      updateHandles: vi.fn(),
      getShapes: vi.fn().mockReturnValue(shapes),
      getSvgElement: vi.fn().mockReturnValue(mockSvg)
    };

    tool = new SelectTool(callbacks);
    selectionManager.clearSelection();
  });

  afterEach(() => {
    selectionManager.clearSelection();
  });

  describe('constructor', () => {
    it('should have name "select"', () => {
      expect(tool.name).toBe('select');
    });
  });

  describe('onMouseDown on shape', () => {
    it('should select shape when clicking on unselected shape', () => {
      const mockEvent = { shiftKey: false } as MouseEvent;
      (callbacks.findShapeAt as any).mockReturnValue(shapes[0]);

      tool.onMouseDown({ x: 100, y: 100 }, mockEvent);

      expect(selectionManager.isSelected(shapes[0])).toBe(true);
    });

    it('should add to selection with shift key', () => {
      selectionManager.select(shapes[0]);
      const mockEvent = { shiftKey: true } as MouseEvent;
      (callbacks.findShapeAt as any).mockReturnValue(shapes[1]);

      tool.onMouseDown({ x: 300, y: 300 }, mockEvent);

      expect(selectionManager.isSelected(shapes[0])).toBe(true);
      expect(selectionManager.isSelected(shapes[1])).toBe(true);
    });
  });

  describe('onMouseDown on empty area', () => {
    it('should clear selection when clicking empty area without shift', () => {
      selectionManager.select(shapes[0]);
      const mockEvent = { shiftKey: false } as MouseEvent;
      (callbacks.findShapeAt as any).mockReturnValue(null);

      tool.onMouseDown({ x: 10, y: 10 }, mockEvent);

      expect(selectionManager.getSelection().length).toBe(0);
    });

    it('should preserve selection when clicking empty area with shift', () => {
      selectionManager.select(shapes[0]);
      const mockEvent = { shiftKey: true } as MouseEvent;
      (callbacks.findShapeAt as any).mockReturnValue(null);

      tool.onMouseDown({ x: 10, y: 10 }, mockEvent);

      expect(selectionManager.isSelected(shapes[0])).toBe(true);
    });

    it('should start marquee selection on empty area', () => {
      const mockEvent = { shiftKey: false } as MouseEvent;
      (callbacks.findShapeAt as any).mockReturnValue(null);

      tool.onMouseDown({ x: 10, y: 10 }, mockEvent);

      // Marquee rect should be created
      const marqueeRect = mockSvg.querySelector('.marquee-selection');
      expect(marqueeRect).not.toBeNull();
    });
  });

  describe('onMouseLeave', () => {
    it('should reset tool state', () => {
      const mockEvent = { shiftKey: false } as MouseEvent;
      (callbacks.findShapeAt as any).mockReturnValue(null);

      // Start marquee selection
      tool.onMouseDown({ x: 10, y: 10 }, mockEvent);
      expect(mockSvg.querySelector('.marquee-selection')).not.toBeNull();

      // Leave canvas
      tool.onMouseLeave();

      // Marquee should be removed
      expect(mockSvg.querySelector('.marquee-selection')).toBeNull();
    });
  });

  describe('onDeactivate', () => {
    it('should clean up state when deactivated', () => {
      const mockEvent = { shiftKey: false } as MouseEvent;
      (callbacks.findShapeAt as any).mockReturnValue(null);

      // Start marquee selection
      tool.onMouseDown({ x: 10, y: 10 }, mockEvent);
      expect(mockSvg.querySelector('.marquee-selection')).not.toBeNull();

      // Deactivate tool
      tool.onDeactivate();

      // Marquee should be removed
      expect(mockSvg.querySelector('.marquee-selection')).toBeNull();
    });
  });
});
