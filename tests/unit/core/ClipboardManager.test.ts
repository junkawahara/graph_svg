import { describe, it, expect, beforeEach } from 'vitest';
import { ClipboardManager } from '../../../src/renderer/core/ClipboardManager';
import { createTestRectangle, createTestEllipse, createTestLine, createTestStyle } from '../../utils/mock-factories';

describe('ClipboardManager', () => {
  let clipboardManager: ClipboardManager;

  beforeEach(() => {
    clipboardManager = new ClipboardManager();
  });

  describe('copy()', () => {
    it('should copy single shape to clipboard', () => {
      const rect = createTestRectangle({ id: 'rect-1', x: 10, y: 20 });

      clipboardManager.copy([rect]);

      expect(clipboardManager.hasContent()).toBe(true);
      const content = clipboardManager.getContent();
      expect(content).toHaveLength(1);
      expect(content[0].id).toBe('rect-1');
    });

    it('should copy multiple shapes to clipboard', () => {
      const rect = createTestRectangle({ id: 'rect-1' });
      const ellipse = createTestEllipse({ id: 'ellipse-1' });
      const line = createTestLine({ id: 'line-1' });

      clipboardManager.copy([rect, ellipse, line]);

      expect(clipboardManager.hasContent()).toBe(true);
      const content = clipboardManager.getContent();
      expect(content).toHaveLength(3);
    });

    it('should serialize shape data', () => {
      const rect = createTestRectangle({
        id: 'rect-1',
        x: 100,
        y: 200,
        width: 50,
        height: 30,
        style: createTestStyle({
          fill: '#ff0000',
          stroke: '#000000',
          strokeWidth: 2
        })
      });

      clipboardManager.copy([rect]);

      const content = clipboardManager.getContent();
      expect(content[0].x).toBe(100);
      expect(content[0].y).toBe(200);
      expect(content[0].width).toBe(50);
      expect(content[0].height).toBe(30);
      expect(content[0].style?.fill).toBe('#ff0000');
    });

    it('should overwrite previous clipboard content', () => {
      const rect1 = createTestRectangle({ id: 'rect-1' });
      const rect2 = createTestRectangle({ id: 'rect-2' });

      clipboardManager.copy([rect1]);
      clipboardManager.copy([rect2]);

      const content = clipboardManager.getContent();
      expect(content).toHaveLength(1);
      expect(content[0].id).toBe('rect-2');
    });

    it('should handle empty array', () => {
      clipboardManager.copy([]);

      expect(clipboardManager.hasContent()).toBe(false);
      expect(clipboardManager.getContent()).toHaveLength(0);
    });
  });

  describe('hasContent()', () => {
    it('should return false when clipboard is empty', () => {
      expect(clipboardManager.hasContent()).toBe(false);
    });

    it('should return true when clipboard has content', () => {
      const rect = createTestRectangle();
      clipboardManager.copy([rect]);

      expect(clipboardManager.hasContent()).toBe(true);
    });

    it('should return false after clear()', () => {
      const rect = createTestRectangle();
      clipboardManager.copy([rect]);
      clipboardManager.clear();

      expect(clipboardManager.hasContent()).toBe(false);
    });
  });

  describe('getContent()', () => {
    it('should return empty array when clipboard is empty', () => {
      expect(clipboardManager.getContent()).toEqual([]);
    });

    it('should return serialized shape data', () => {
      const rect = createTestRectangle({ id: 'rect-1', x: 50, y: 60 });
      clipboardManager.copy([rect]);

      const content = clipboardManager.getContent();
      expect(content[0].id).toBe('rect-1');
      expect(content[0].x).toBe(50);
      expect(content[0].y).toBe(60);
    });

    it('should preserve all shapes in order', () => {
      const shapes = [
        createTestRectangle({ id: 'rect-1' }),
        createTestEllipse({ id: 'ellipse-1' }),
        createTestLine({ id: 'line-1' })
      ];
      clipboardManager.copy(shapes);

      const content = clipboardManager.getContent();
      expect(content[0].id).toBe('rect-1');
      expect(content[1].id).toBe('ellipse-1');
      expect(content[2].id).toBe('line-1');
    });
  });

  describe('getPasteOffset()', () => {
    it('should return paste offset value', () => {
      const offset = clipboardManager.getPasteOffset();
      expect(offset).toBe(20);
    });
  });

  describe('clear()', () => {
    it('should clear clipboard content', () => {
      const rect = createTestRectangle();
      clipboardManager.copy([rect]);

      clipboardManager.clear();

      expect(clipboardManager.hasContent()).toBe(false);
      expect(clipboardManager.getContent()).toEqual([]);
    });

    it('should handle clearing empty clipboard', () => {
      // Should not throw
      expect(() => clipboardManager.clear()).not.toThrow();
      expect(clipboardManager.hasContent()).toBe(false);
    });
  });

  describe('copy/paste workflow', () => {
    it('should simulate copy/paste workflow', () => {
      // Create original shapes
      const shapes = [
        createTestRectangle({ id: 'rect', x: 100, y: 100, width: 50, height: 30 }),
        createTestEllipse({ id: 'ellipse', cx: 200, cy: 150, rx: 40, ry: 30 })
      ];

      // Copy
      clipboardManager.copy(shapes);
      expect(clipboardManager.hasContent()).toBe(true);

      // Get content for paste
      const content = clipboardManager.getContent();
      const offset = clipboardManager.getPasteOffset();

      // Verify paste data would have correct offset
      expect(content).toHaveLength(2);
      expect(offset).toBe(20);

      // Content still available for subsequent pastes
      expect(clipboardManager.hasContent()).toBe(true);
    });
  });
});
