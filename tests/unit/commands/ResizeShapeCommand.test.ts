import { describe, it, expect } from 'vitest';
import { ResizeShapeCommand } from '../../../src/renderer/commands/ResizeShapeCommand';
import {
  createTestLine,
  createTestRectangle,
  createTestEllipse,
  createTestPolygon
} from '../../utils/mock-factories';
import { expectClose } from '../../utils/shape-comparators';

describe('ResizeShapeCommand', () => {
  describe('captureState()', () => {
    it('should capture line state', () => {
      const line = createTestLine({ x1: 0, y1: 0, x2: 100, y2: 100 });
      const state = ResizeShapeCommand.captureState(line);

      expect(state).toEqual({
        x1: 0,
        y1: 0,
        x2: 100,
        y2: 100
      });
    });

    it('should capture rectangle state', () => {
      const rect = createTestRectangle({ x: 10, y: 20, width: 100, height: 50 });
      const state = ResizeShapeCommand.captureState(rect);

      expect(state).toEqual({
        x: 10,
        y: 20,
        width: 100,
        height: 50
      });
    });

    it('should capture ellipse state', () => {
      const ellipse = createTestEllipse({ cx: 100, cy: 100, rx: 50, ry: 30 });
      const state = ResizeShapeCommand.captureState(ellipse);

      expect(state).toEqual({
        cx: 100,
        cy: 100,
        rx: 50,
        ry: 30
      });
    });

    it('should capture polygon state', () => {
      const polygon = createTestPolygon({
        points: [
          { x: 0, y: 0 },
          { x: 100, y: 0 },
          { x: 50, y: 100 }
        ]
      });
      const state = ResizeShapeCommand.captureState(polygon);

      expect(state).toEqual({
        points: [
          { x: 0, y: 0 },
          { x: 100, y: 0 },
          { x: 50, y: 100 }
        ]
      });
    });
  });

  describe('execute()', () => {
    it('should apply afterState to rectangle', () => {
      const rect = createTestRectangle({ x: 10, y: 20, width: 100, height: 50 });
      const beforeState = { x: 10, y: 20, width: 100, height: 50 };
      const afterState = { x: 0, y: 0, width: 200, height: 100 };
      const command = new ResizeShapeCommand(rect, beforeState, afterState);

      command.execute();

      expectClose(rect.x, 0);
      expectClose(rect.y, 0);
      expectClose(rect.width, 200);
      expectClose(rect.height, 100);
    });

    it('should apply afterState to ellipse', () => {
      const ellipse = createTestEllipse({ cx: 100, cy: 100, rx: 50, ry: 30 });
      const beforeState = { cx: 100, cy: 100, rx: 50, ry: 30 };
      const afterState = { cx: 150, cy: 150, rx: 75, ry: 45 };
      const command = new ResizeShapeCommand(ellipse, beforeState, afterState);

      command.execute();

      expectClose(ellipse.cx, 150);
      expectClose(ellipse.cy, 150);
      expectClose(ellipse.rx, 75);
      expectClose(ellipse.ry, 45);
    });

    it('should apply afterState to line', () => {
      const line = createTestLine({ x1: 0, y1: 0, x2: 100, y2: 100 });
      const beforeState = { x1: 0, y1: 0, x2: 100, y2: 100 };
      const afterState = { x1: 50, y1: 50, x2: 200, y2: 200 };
      const command = new ResizeShapeCommand(line, beforeState, afterState);

      command.execute();

      expectClose(line.x1, 50);
      expectClose(line.y1, 50);
      expectClose(line.x2, 200);
      expectClose(line.y2, 200);
    });

    it('should apply afterState to polygon', () => {
      const polygon = createTestPolygon({
        points: [
          { x: 0, y: 0 },
          { x: 100, y: 0 },
          { x: 50, y: 100 }
        ]
      });
      const beforeState = {
        points: [
          { x: 0, y: 0 },
          { x: 100, y: 0 },
          { x: 50, y: 100 }
        ]
      };
      const afterState = {
        points: [
          { x: 10, y: 10 },
          { x: 200, y: 10 },
          { x: 100, y: 200 }
        ]
      };
      const command = new ResizeShapeCommand(polygon, beforeState, afterState);

      command.execute();

      expect(polygon.points).toEqual([
        { x: 10, y: 10 },
        { x: 200, y: 10 },
        { x: 100, y: 200 }
      ]);
    });
  });

  describe('undo()', () => {
    it('should restore beforeState for rectangle', () => {
      const rect = createTestRectangle({ x: 10, y: 20, width: 100, height: 50 });
      const beforeState = { x: 10, y: 20, width: 100, height: 50 };
      const afterState = { x: 0, y: 0, width: 200, height: 100 };
      const command = new ResizeShapeCommand(rect, beforeState, afterState);

      command.execute();
      command.undo();

      expectClose(rect.x, 10);
      expectClose(rect.y, 20);
      expectClose(rect.width, 100);
      expectClose(rect.height, 50);
    });

    it('should restore beforeState for ellipse', () => {
      const ellipse = createTestEllipse({ cx: 100, cy: 100, rx: 50, ry: 30 });
      const beforeState = { cx: 100, cy: 100, rx: 50, ry: 30 };
      const afterState = { cx: 150, cy: 150, rx: 75, ry: 45 };
      const command = new ResizeShapeCommand(ellipse, beforeState, afterState);

      command.execute();
      command.undo();

      expectClose(ellipse.cx, 100);
      expectClose(ellipse.cy, 100);
      expectClose(ellipse.rx, 50);
      expectClose(ellipse.ry, 30);
    });

    it('should restore beforeState for line', () => {
      const line = createTestLine({ x1: 0, y1: 0, x2: 100, y2: 100 });
      const beforeState = { x1: 0, y1: 0, x2: 100, y2: 100 };
      const afterState = { x1: 50, y1: 50, x2: 200, y2: 200 };
      const command = new ResizeShapeCommand(line, beforeState, afterState);

      command.execute();
      command.undo();

      expectClose(line.x1, 0);
      expectClose(line.y1, 0);
      expectClose(line.x2, 100);
      expectClose(line.y2, 100);
    });

    it('should restore beforeState for polygon', () => {
      const polygon = createTestPolygon({
        points: [
          { x: 0, y: 0 },
          { x: 100, y: 0 },
          { x: 50, y: 100 }
        ]
      });
      const beforeState = {
        points: [
          { x: 0, y: 0 },
          { x: 100, y: 0 },
          { x: 50, y: 100 }
        ]
      };
      const afterState = {
        points: [
          { x: 10, y: 10 },
          { x: 200, y: 10 },
          { x: 100, y: 200 }
        ]
      };
      const command = new ResizeShapeCommand(polygon, beforeState, afterState);

      command.execute();
      command.undo();

      expect(polygon.points).toEqual([
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 50, y: 100 }
      ]);
    });
  });

  describe('execute() after undo()', () => {
    it('should re-apply afterState (redo behavior)', () => {
      const rect = createTestRectangle({ x: 10, y: 20, width: 100, height: 50 });
      const beforeState = { x: 10, y: 20, width: 100, height: 50 };
      const afterState = { x: 0, y: 0, width: 200, height: 100 };
      const command = new ResizeShapeCommand(rect, beforeState, afterState);

      command.execute();
      command.undo();
      command.execute();

      expectClose(rect.x, 0);
      expectClose(rect.y, 0);
      expectClose(rect.width, 200);
      expectClose(rect.height, 100);
    });

    it('should handle multiple undo/redo cycles', () => {
      const rect = createTestRectangle({ x: 10, y: 20, width: 100, height: 50 });
      const beforeState = { x: 10, y: 20, width: 100, height: 50 };
      const afterState = { x: 0, y: 0, width: 200, height: 100 };
      const command = new ResizeShapeCommand(rect, beforeState, afterState);

      command.execute();
      expectClose(rect.width, 200);

      command.undo();
      expectClose(rect.width, 100);

      command.execute();
      expectClose(rect.width, 200);

      command.undo();
      expectClose(rect.width, 100);
    });
  });

  describe('getDescription()', () => {
    it('should return description for rectangle', () => {
      const rect = createTestRectangle();
      const command = new ResizeShapeCommand(rect, { x: 0, y: 0, width: 100, height: 100 }, { x: 0, y: 0, width: 200, height: 200 });

      expect(command.getDescription()).toBe('Resize rectangle');
    });

    it('should return description for ellipse', () => {
      const ellipse = createTestEllipse();
      const command = new ResizeShapeCommand(ellipse, { cx: 0, cy: 0, rx: 50, ry: 50 }, { cx: 0, cy: 0, rx: 100, ry: 100 });

      expect(command.getDescription()).toBe('Resize ellipse');
    });

    it('should return description for line', () => {
      const line = createTestLine();
      const command = new ResizeShapeCommand(line, { x1: 0, y1: 0, x2: 100, y2: 100 }, { x1: 0, y1: 0, x2: 200, y2: 200 });

      expect(command.getDescription()).toBe('Resize line');
    });
  });
});
