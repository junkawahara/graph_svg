import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CanvasResizeCommand } from '../../../src/renderer/commands/CanvasResizeCommand';
import { editorState } from '../../../src/renderer/core/EditorState';

describe('CanvasResizeCommand', () => {
  // Store original canvas size to restore after tests
  let originalSize: { width: number; height: number };

  beforeEach(() => {
    originalSize = editorState.canvasSize;
    // Set a known starting size
    editorState.setCanvasSize(800, 600);
  });

  afterEach(() => {
    // Restore original size
    editorState.setCanvasSize(originalSize.width, originalSize.height);
  });

  describe('execute()', () => {
    it('should resize canvas to new dimensions', () => {
      const command = new CanvasResizeCommand(
        { width: 800, height: 600 },
        { width: 1024, height: 768 }
      );

      command.execute();

      expect(editorState.canvasSize.width).toBe(1024);
      expect(editorState.canvasSize.height).toBe(768);
    });

    it('should handle increasing canvas size', () => {
      const command = new CanvasResizeCommand(
        { width: 800, height: 600 },
        { width: 1920, height: 1080 }
      );

      command.execute();

      expect(editorState.canvasSize.width).toBe(1920);
      expect(editorState.canvasSize.height).toBe(1080);
    });

    it('should handle decreasing canvas size', () => {
      const command = new CanvasResizeCommand(
        { width: 800, height: 600 },
        { width: 400, height: 300 }
      );

      command.execute();

      expect(editorState.canvasSize.width).toBe(400);
      expect(editorState.canvasSize.height).toBe(300);
    });

    it('should handle changing only width', () => {
      const command = new CanvasResizeCommand(
        { width: 800, height: 600 },
        { width: 1000, height: 600 }
      );

      command.execute();

      expect(editorState.canvasSize.width).toBe(1000);
      expect(editorState.canvasSize.height).toBe(600);
    });

    it('should handle changing only height', () => {
      const command = new CanvasResizeCommand(
        { width: 800, height: 600 },
        { width: 800, height: 900 }
      );

      command.execute();

      expect(editorState.canvasSize.width).toBe(800);
      expect(editorState.canvasSize.height).toBe(900);
    });
  });

  describe('undo()', () => {
    it('should restore original canvas size', () => {
      const command = new CanvasResizeCommand(
        { width: 800, height: 600 },
        { width: 1024, height: 768 }
      );

      command.execute();
      command.undo();

      expect(editorState.canvasSize.width).toBe(800);
      expect(editorState.canvasSize.height).toBe(600);
    });

    it('should restore to different original size', () => {
      editorState.setCanvasSize(500, 400);
      const command = new CanvasResizeCommand(
        { width: 500, height: 400 },
        { width: 1000, height: 800 }
      );

      command.execute();
      command.undo();

      expect(editorState.canvasSize.width).toBe(500);
      expect(editorState.canvasSize.height).toBe(400);
    });
  });

  describe('redo (execute after undo)', () => {
    it('should re-apply the new canvas size', () => {
      const command = new CanvasResizeCommand(
        { width: 800, height: 600 },
        { width: 1024, height: 768 }
      );

      command.execute();
      command.undo();
      command.execute();

      expect(editorState.canvasSize.width).toBe(1024);
      expect(editorState.canvasSize.height).toBe(768);
    });
  });

  describe('getDescription()', () => {
    it('should return description with dimensions', () => {
      const command = new CanvasResizeCommand(
        { width: 800, height: 600 },
        { width: 1024, height: 768 }
      );

      const description = command.getDescription();

      expect(description).toContain('800');
      expect(description).toContain('600');
      expect(description).toContain('1024');
      expect(description).toContain('768');
    });
  });

  describe('constructor', () => {
    it('should create copies of size objects', () => {
      const beforeSize = { width: 800, height: 600 };
      const afterSize = { width: 1024, height: 768 };
      const command = new CanvasResizeCommand(beforeSize, afterSize);

      // Modify original objects
      beforeSize.width = 100;
      afterSize.width = 200;

      // Execute should use the original values
      command.execute();

      expect(editorState.canvasSize.width).toBe(1024); // Not 200
    });
  });
});
