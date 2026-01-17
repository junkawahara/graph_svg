import { describe, it, expect, beforeEach } from 'vitest';
import {
  createTestRectangle,
  createTestEllipse,
  createTestLine,
  createTestGroup,
  createTestStyle
} from '../../utils/mock-factories';
import { ClipboardManager } from '../../../src/renderer/core/ClipboardManager';
import { SelectionManager } from '../../../src/renderer/core/SelectionManager';
import { createShapeFromData } from '../../../src/renderer/shapes/ShapeFactory';
import { Shape } from '../../../src/renderer/shapes/Shape';

describe('Copy/Paste Integration', () => {
  let clipboardManager: ClipboardManager;
  let selectionManager: SelectionManager;

  beforeEach(() => {
    clipboardManager = new ClipboardManager();
    selectionManager = new SelectionManager();
  });

  describe('basic copy/paste workflow', () => {
    it('should copy selected shape to clipboard', () => {
      const rect = createTestRectangle({ id: 'rect-1', x: 100, y: 100 });

      // Select and copy
      selectionManager.select(rect);
      clipboardManager.copy(selectionManager.getSelection());

      expect(clipboardManager.hasContent()).toBe(true);

      const content = clipboardManager.getContent();
      expect(content).toHaveLength(1);
      expect(content[0].type).toBe('rectangle');
    });

    it('should paste shape with position offset', () => {
      const rect = createTestRectangle({ id: 'rect-1', x: 100, y: 100, width: 50, height: 30 });

      // Copy
      clipboardManager.copy([rect]);

      // Paste
      const content = clipboardManager.getContent();
      const offset = clipboardManager.getPasteOffset();

      const pastedShapes: Shape[] = content.map(data => {
        const shape = createShapeFromData(data);
        shape.move(offset, offset);
        return shape;
      });

      expect(pastedShapes).toHaveLength(1);
      const pastedRect = pastedShapes[0] as any;

      // Position should be offset by paste offset (default 20)
      expect(pastedRect.x).toBe(120);  // 100 + 20
      expect(pastedRect.y).toBe(120);  // 100 + 20
    });

    it('should create shape with new ID on paste', () => {
      const rect = createTestRectangle({ id: 'original-id', x: 100, y: 100 });

      clipboardManager.copy([rect]);

      const content = clipboardManager.getContent();
      const pastedShape = createShapeFromData(content[0]);

      // Pasted shape should have different ID
      expect(pastedShape.id).not.toBe('original-id');
    });

    it('should preserve shape properties after paste', () => {
      const style = createTestStyle({
        fill: '#ff0000',
        stroke: '#00ff00',
        strokeWidth: 3,
        opacity: 0.8
      });
      const rect = createTestRectangle({
        id: 'rect-1',
        x: 50,
        y: 60,
        width: 150,
        height: 80,
        style,
        rotation: 45
      });

      clipboardManager.copy([rect]);

      const content = clipboardManager.getContent();
      const pastedRect = createShapeFromData(content[0]) as any;

      // Properties should be preserved
      expect(pastedRect.width).toBe(150);
      expect(pastedRect.height).toBe(80);
      expect(pastedRect.style.fill).toBe('#ff0000');
      expect(pastedRect.style.stroke).toBe('#00ff00');
      expect(pastedRect.style.strokeWidth).toBe(3);
      expect(pastedRect.style.opacity).toBe(0.8);
      expect(pastedRect.rotation).toBe(45);
    });
  });

  describe('multiple shapes copy/paste', () => {
    it('should copy multiple selected shapes', () => {
      const rect = createTestRectangle({ id: 'rect-1', x: 100, y: 100 });
      const ellipse = createTestEllipse({ id: 'ellipse-1', cx: 200, cy: 200 });
      const line = createTestLine({ id: 'line-1', x1: 0, y1: 0, x2: 50, y2: 50 });

      selectionManager.select(rect);
      selectionManager.addToSelection(ellipse);
      selectionManager.addToSelection(line);

      clipboardManager.copy(selectionManager.getSelection());

      const content = clipboardManager.getContent();
      expect(content).toHaveLength(3);

      const types = content.map(c => c.type);
      expect(types).toContain('rectangle');
      expect(types).toContain('ellipse');
      expect(types).toContain('line');
    });

    it('should paste multiple shapes with same offset', () => {
      const rect = createTestRectangle({ id: 'rect-1', x: 100, y: 100 });
      const ellipse = createTestEllipse({ id: 'ellipse-1', cx: 200, cy: 150 });

      clipboardManager.copy([rect, ellipse]);

      const content = clipboardManager.getContent();
      const offset = clipboardManager.getPasteOffset();

      const pastedShapes = content.map(data => {
        const shape = createShapeFromData(data);
        shape.move(offset, offset);
        return shape;
      });

      expect(pastedShapes).toHaveLength(2);

      // Both shapes should have same offset applied
      const pastedRect = pastedShapes.find(s => s.type === 'rectangle') as any;
      const pastedEllipse = pastedShapes.find(s => s.type === 'ellipse') as any;

      expect(pastedRect.x).toBe(120);  // 100 + 20
      expect(pastedRect.y).toBe(120);  // 100 + 20
      expect(pastedEllipse.cx).toBe(220);  // 200 + 20
      expect(pastedEllipse.cy).toBe(170);  // 150 + 20
    });

    it('should maintain relative positions of multiple shapes', () => {
      const rect = createTestRectangle({ id: 'rect-1', x: 100, y: 100 });
      const ellipse = createTestEllipse({ id: 'ellipse-1', cx: 200, cy: 200 });

      // Original relative distance
      const origDeltaX = 200 - 100;  // ellipse.cx - rect.x = 100
      const origDeltaY = 200 - 100;  // ellipse.cy - rect.y = 100

      clipboardManager.copy([rect, ellipse]);

      const content = clipboardManager.getContent();
      const offset = clipboardManager.getPasteOffset();

      const pastedShapes = content.map(data => {
        const shape = createShapeFromData(data);
        shape.move(offset, offset);
        return shape;
      });

      const pastedRect = pastedShapes.find(s => s.type === 'rectangle') as any;
      const pastedEllipse = pastedShapes.find(s => s.type === 'ellipse') as any;

      // Relative distance should be same
      const newDeltaX = pastedEllipse.cx - pastedRect.x;
      const newDeltaY = pastedEllipse.cy - pastedRect.y;

      expect(newDeltaX).toBe(origDeltaX);
      expect(newDeltaY).toBe(origDeltaY);
    });
  });

  describe('group copy/paste', () => {
    it('should copy group with all children', () => {
      const rect = createTestRectangle({ id: 'rect-1', x: 10, y: 10 });
      const ellipse = createTestEllipse({ id: 'ellipse-1', cx: 50, cy: 50 });
      const group = createTestGroup([rect, ellipse], { id: 'group-1' });

      clipboardManager.copy([group]);

      const content = clipboardManager.getContent();
      expect(content).toHaveLength(1);
      expect(content[0].type).toBe('group');
      expect((content[0] as any).children).toHaveLength(2);
    });

    it('should paste group with new IDs for group and children', () => {
      const rect = createTestRectangle({ id: 'original-rect', x: 10, y: 10 });
      const ellipse = createTestEllipse({ id: 'original-ellipse', cx: 50, cy: 50 });
      const group = createTestGroup([rect, ellipse], { id: 'original-group' });

      clipboardManager.copy([group]);

      const content = clipboardManager.getContent();
      const pastedGroup = createShapeFromData(content[0]) as any;

      // Group and all children should have new IDs
      expect(pastedGroup.id).not.toBe('original-group');
      expect(pastedGroup.children[0].id).not.toBe('original-rect');
      expect(pastedGroup.children[1].id).not.toBe('original-ellipse');
    });

    it('should preserve group children positions on paste', () => {
      const rect = createTestRectangle({ id: 'rect-1', x: 10, y: 20 });
      const ellipse = createTestEllipse({ id: 'ellipse-1', cx: 60, cy: 70 });
      const group = createTestGroup([rect, ellipse], { id: 'group-1' });

      clipboardManager.copy([group]);

      const content = clipboardManager.getContent();
      const pastedGroup = createShapeFromData(content[0]) as any;

      // Children positions should be preserved (before offset)
      expect(pastedGroup.children[0].x).toBe(10);
      expect(pastedGroup.children[0].y).toBe(20);
      expect(pastedGroup.children[1].cx).toBe(60);
      expect(pastedGroup.children[1].cy).toBe(70);
    });
  });

  describe('clipboard state', () => {
    it('should allow multiple pastes from same copy', () => {
      const rect = createTestRectangle({ id: 'rect-1', x: 100, y: 100 });

      clipboardManager.copy([rect]);

      // First paste
      const content1 = clipboardManager.getContent();
      const pasted1 = createShapeFromData(content1[0]);

      // Second paste
      const content2 = clipboardManager.getContent();
      const pasted2 = createShapeFromData(content2[0]);

      // Both pastes should work
      expect(pasted1).toBeDefined();
      expect(pasted2).toBeDefined();

      // And have different IDs
      expect(pasted1.id).not.toBe(pasted2.id);
    });

    it('should replace clipboard content on new copy', () => {
      const rect = createTestRectangle({ id: 'rect-1' });
      const ellipse = createTestEllipse({ id: 'ellipse-1' });

      // First copy
      clipboardManager.copy([rect]);
      expect(clipboardManager.getContent()).toHaveLength(1);
      expect(clipboardManager.getContent()[0].type).toBe('rectangle');

      // Second copy replaces
      clipboardManager.copy([ellipse]);
      expect(clipboardManager.getContent()).toHaveLength(1);
      expect(clipboardManager.getContent()[0].type).toBe('ellipse');
    });

    it('should clear clipboard', () => {
      const rect = createTestRectangle({ id: 'rect-1' });

      clipboardManager.copy([rect]);
      expect(clipboardManager.hasContent()).toBe(true);

      clipboardManager.clear();
      expect(clipboardManager.hasContent()).toBe(false);
      expect(clipboardManager.getContent()).toHaveLength(0);
    });
  });

  describe('selection and copy interaction', () => {
    it('should not affect selection after copy', () => {
      const rect = createTestRectangle({ id: 'rect-1' });
      const ellipse = createTestEllipse({ id: 'ellipse-1' });

      selectionManager.select(rect);
      selectionManager.addToSelection(ellipse);

      const selectedBefore = selectionManager.getSelection().length;

      clipboardManager.copy(selectionManager.getSelection());

      const selectedAfter = selectionManager.getSelection().length;

      // Selection should remain unchanged
      expect(selectedAfter).toBe(selectedBefore);
      expect(selectionManager.isSelected(rect)).toBe(true);
      expect(selectionManager.isSelected(ellipse)).toBe(true);
    });

    it('should copy only currently selected shapes', () => {
      const rect1 = createTestRectangle({ id: 'rect-1' });
      const rect2 = createTestRectangle({ id: 'rect-2' });
      const ellipse = createTestEllipse({ id: 'ellipse-1' });

      // Select only rect1 and ellipse
      selectionManager.select(rect1);
      selectionManager.addToSelection(ellipse);
      // rect2 is not selected

      clipboardManager.copy(selectionManager.getSelection());

      const content = clipboardManager.getContent();
      expect(content).toHaveLength(2);

      const ids = content.map(c => c.id);
      expect(ids).toContain('rect-1');
      expect(ids).toContain('ellipse-1');
      expect(ids).not.toContain('rect-2');
    });
  });

  describe('edge cases', () => {
    it('should handle copy with empty selection', () => {
      clipboardManager.copy([]);

      expect(clipboardManager.hasContent()).toBe(false);
      expect(clipboardManager.getContent()).toHaveLength(0);
    });

    it('should handle paste from empty clipboard', () => {
      const content = clipboardManager.getContent();

      expect(content).toHaveLength(0);
    });

    it('should preserve shape type-specific properties', () => {
      const line = createTestLine({
        id: 'line-1',
        x1: 10,
        y1: 20,
        x2: 100,
        y2: 80,
        markerStart: 'arrow-medium',
        markerEnd: 'triangle-large'
      });

      clipboardManager.copy([line]);

      const content = clipboardManager.getContent();
      const pastedLine = createShapeFromData(content[0]) as any;

      // Line-specific properties should be preserved
      expect(pastedLine.x1).toBe(10);
      expect(pastedLine.y1).toBe(20);
      expect(pastedLine.x2).toBe(100);
      expect(pastedLine.y2).toBe(80);
      expect(pastedLine.markerStart).toBe('arrow-medium');
      expect(pastedLine.markerEnd).toBe('triangle-large');
    });
  });
});
