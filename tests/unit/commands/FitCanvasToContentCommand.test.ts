import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { FitCanvasToContentCommand } from '../../../src/renderer/commands/FitCanvasToContentCommand';
import { editorState } from '../../../src/renderer/core/EditorState';
import {
  createTestRectangle,
  createTestEllipse
} from '../../utils/mock-factories';
import { expectClose } from '../../utils/shape-comparators';

describe('FitCanvasToContentCommand', () => {
  let setCanvasSizeSpy: ReturnType<typeof vi.spyOn>;
  let markDirtySpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    setCanvasSizeSpy = vi.spyOn(editorState, 'setCanvasSize').mockImplementation(() => {});
    markDirtySpy = vi.spyOn(editorState, 'markDirty').mockImplementation(() => {});
  });

  afterEach(() => {
    setCanvasSizeSpy.mockRestore();
    markDirtySpy.mockRestore();
  });

  describe('execute()', () => {
    it('should move shapes by offset', () => {
      const rect = createTestRectangle({ x: 100, y: 100 });
      const shapes = [rect];
      const command = new FitCanvasToContentCommand(
        shapes,
        { width: 800, height: 600 },
        { width: 200, height: 150 },
        -80, // offsetX
        -80  // offsetY
      );

      command.execute();

      expectClose(rect.x, 20); // 100 + (-80) = 20
      expectClose(rect.y, 20); // 100 + (-80) = 20
    });

    it('should move multiple shapes by same offset', () => {
      const rect = createTestRectangle({ id: 'rect', x: 100, y: 100 });
      const ellipse = createTestEllipse({ id: 'ellipse', cx: 200, cy: 200 });
      const shapes = [rect, ellipse];
      const command = new FitCanvasToContentCommand(
        shapes,
        { width: 800, height: 600 },
        { width: 300, height: 250 },
        -50,
        -50
      );

      command.execute();

      expectClose(rect.x, 50);
      expectClose(rect.y, 50);
      expectClose(ellipse.cx, 150);
      expectClose(ellipse.cy, 150);
    });

    it('should call setCanvasSize with afterSize', () => {
      const rect = createTestRectangle();
      const command = new FitCanvasToContentCommand(
        [rect],
        { width: 800, height: 600 },
        { width: 200, height: 150 },
        -50,
        -50
      );

      command.execute();

      expect(setCanvasSizeSpy).toHaveBeenCalledWith(200, 150);
    });

    it('should mark editor as dirty', () => {
      const rect = createTestRectangle();
      const command = new FitCanvasToContentCommand(
        [rect],
        { width: 800, height: 600 },
        { width: 200, height: 150 },
        0,
        0
      );

      command.execute();

      expect(markDirtySpy).toHaveBeenCalled();
    });

    it('should handle positive offset (moving shapes down-right)', () => {
      const rect = createTestRectangle({ x: 10, y: 10 });
      const command = new FitCanvasToContentCommand(
        [rect],
        { width: 800, height: 600 },
        { width: 900, height: 700 },
        20,
        30
      );

      command.execute();

      expectClose(rect.x, 30); // 10 + 20
      expectClose(rect.y, 40); // 10 + 30
    });
  });

  describe('undo()', () => {
    it('should move shapes back by negative offset', () => {
      const rect = createTestRectangle({ x: 100, y: 100 });
      const command = new FitCanvasToContentCommand(
        [rect],
        { width: 800, height: 600 },
        { width: 200, height: 150 },
        -80,
        -80
      );

      command.execute();
      command.undo();

      expectClose(rect.x, 100);
      expectClose(rect.y, 100);
    });

    it('should restore original canvas size', () => {
      const rect = createTestRectangle();
      const command = new FitCanvasToContentCommand(
        [rect],
        { width: 800, height: 600 },
        { width: 200, height: 150 },
        -50,
        -50
      );

      command.execute();
      setCanvasSizeSpy.mockClear();
      command.undo();

      expect(setCanvasSizeSpy).toHaveBeenCalledWith(800, 600);
    });

    it('should restore multiple shapes to original positions', () => {
      const rect = createTestRectangle({ id: 'rect', x: 100, y: 100 });
      const ellipse = createTestEllipse({ id: 'ellipse', cx: 200, cy: 200 });
      const shapes = [rect, ellipse];
      const command = new FitCanvasToContentCommand(
        shapes,
        { width: 800, height: 600 },
        { width: 300, height: 250 },
        -50,
        -50
      );

      command.execute();
      command.undo();

      expectClose(rect.x, 100);
      expectClose(rect.y, 100);
      expectClose(ellipse.cx, 200);
      expectClose(ellipse.cy, 200);
    });
  });

  describe('execute() after undo()', () => {
    it('should re-apply fit (redo behavior)', () => {
      const rect = createTestRectangle({ x: 100, y: 100 });
      const command = new FitCanvasToContentCommand(
        [rect],
        { width: 800, height: 600 },
        { width: 200, height: 150 },
        -80,
        -80
      );

      command.execute();
      command.undo();
      command.execute();

      expectClose(rect.x, 20);
      expectClose(rect.y, 20);
    });

    it('should handle multiple undo/redo cycles', () => {
      const rect = createTestRectangle({ x: 100, y: 100 });
      const command = new FitCanvasToContentCommand(
        [rect],
        { width: 800, height: 600 },
        { width: 200, height: 150 },
        -80,
        -80
      );

      command.execute();
      expectClose(rect.x, 20);

      command.undo();
      expectClose(rect.x, 100);

      command.execute();
      expectClose(rect.x, 20);

      command.undo();
      expectClose(rect.x, 100);
    });
  });

  describe('getDescription()', () => {
    it('should include after canvas size in description', () => {
      const rect = createTestRectangle();
      const command = new FitCanvasToContentCommand(
        [rect],
        { width: 800, height: 600 },
        { width: 200, height: 150 },
        0,
        0
      );

      expect(command.getDescription()).toBe('Fit canvas to content (200x150)');
    });

    it('should show different sizes', () => {
      const rect = createTestRectangle();
      const command = new FitCanvasToContentCommand(
        [rect],
        { width: 1000, height: 800 },
        { width: 500, height: 400 },
        0,
        0
      );

      expect(command.getDescription()).toBe('Fit canvas to content (500x400)');
    });
  });
});
