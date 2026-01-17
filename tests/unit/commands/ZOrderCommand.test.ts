import { describe, it, expect } from 'vitest';
import { ZOrderCommand, ZOrderOperation } from '../../../src/renderer/commands/ZOrderCommand';
import {
  createTestRectangle,
  createTestEllipse,
  createTestLine
} from '../../utils/mock-factories';
import { Shape } from '../../../src/renderer/shapes/Shape';

/**
 * Helper to create a test environment for z-order commands
 */
function createZOrderTestEnv() {
  let shapes: Shape[] = [];

  return {
    shapes,
    getShapes: () => shapes,
    reorderShapes: (newOrder: Shape[]) => { shapes = newOrder; },
    addShape: (shape: Shape) => { shapes.push(shape); },
    getShapeIds: () => shapes.map(s => s.id)
  };
}

describe('ZOrderCommand', () => {
  describe('bringToFront', () => {
    it('should move shape to end of array', () => {
      const env = createZOrderTestEnv();
      const rect = createTestRectangle({ id: 'rect' });
      const ellipse = createTestEllipse({ id: 'ellipse' });
      const line = createTestLine({ id: 'line' });
      env.addShape(rect);
      env.addShape(ellipse);
      env.addShape(line);

      const command = new ZOrderCommand([rect], 'bringToFront', env.getShapes, env.reorderShapes);

      command.execute();

      expect(env.getShapeIds()).toEqual(['ellipse', 'line', 'rect']);
    });

    it('should handle shape already at front', () => {
      const env = createZOrderTestEnv();
      const rect = createTestRectangle({ id: 'rect' });
      const ellipse = createTestEllipse({ id: 'ellipse' });
      env.addShape(rect);
      env.addShape(ellipse);

      const command = new ZOrderCommand([ellipse], 'bringToFront', env.getShapes, env.reorderShapes);

      command.execute();

      expect(env.getShapeIds()).toEqual(['rect', 'ellipse']);
    });

    it('should handle multiple shapes', () => {
      const env = createZOrderTestEnv();
      const rect = createTestRectangle({ id: 'rect' });
      const ellipse = createTestEllipse({ id: 'ellipse' });
      const line = createTestLine({ id: 'line' });
      env.addShape(rect);
      env.addShape(ellipse);
      env.addShape(line);

      const command = new ZOrderCommand([rect, ellipse], 'bringToFront', env.getShapes, env.reorderShapes);

      command.execute();

      expect(env.getShapeIds()).toEqual(['line', 'rect', 'ellipse']);
    });
  });

  describe('sendToBack', () => {
    it('should move shape to beginning of array', () => {
      const env = createZOrderTestEnv();
      const rect = createTestRectangle({ id: 'rect' });
      const ellipse = createTestEllipse({ id: 'ellipse' });
      const line = createTestLine({ id: 'line' });
      env.addShape(rect);
      env.addShape(ellipse);
      env.addShape(line);

      const command = new ZOrderCommand([line], 'sendToBack', env.getShapes, env.reorderShapes);

      command.execute();

      expect(env.getShapeIds()).toEqual(['line', 'rect', 'ellipse']);
    });

    it('should handle shape already at back', () => {
      const env = createZOrderTestEnv();
      const rect = createTestRectangle({ id: 'rect' });
      const ellipse = createTestEllipse({ id: 'ellipse' });
      env.addShape(rect);
      env.addShape(ellipse);

      const command = new ZOrderCommand([rect], 'sendToBack', env.getShapes, env.reorderShapes);

      command.execute();

      expect(env.getShapeIds()).toEqual(['rect', 'ellipse']);
    });

    it('should handle multiple shapes maintaining relative order', () => {
      const env = createZOrderTestEnv();
      const rect = createTestRectangle({ id: 'rect' });
      const ellipse = createTestEllipse({ id: 'ellipse' });
      const line = createTestLine({ id: 'line' });
      env.addShape(rect);
      env.addShape(ellipse);
      env.addShape(line);

      const command = new ZOrderCommand([ellipse, line], 'sendToBack', env.getShapes, env.reorderShapes);

      command.execute();

      // line comes before ellipse due to reverse in sendToBack
      expect(env.getShapeIds()).toEqual(['line', 'ellipse', 'rect']);
    });
  });

  describe('bringForward', () => {
    it('should swap shape with next element', () => {
      const env = createZOrderTestEnv();
      const rect = createTestRectangle({ id: 'rect' });
      const ellipse = createTestEllipse({ id: 'ellipse' });
      const line = createTestLine({ id: 'line' });
      env.addShape(rect);
      env.addShape(ellipse);
      env.addShape(line);

      const command = new ZOrderCommand([rect], 'bringForward', env.getShapes, env.reorderShapes);

      command.execute();

      expect(env.getShapeIds()).toEqual(['ellipse', 'rect', 'line']);
    });

    it('should not move shape already at front', () => {
      const env = createZOrderTestEnv();
      const rect = createTestRectangle({ id: 'rect' });
      const ellipse = createTestEllipse({ id: 'ellipse' });
      env.addShape(rect);
      env.addShape(ellipse);

      const command = new ZOrderCommand([ellipse], 'bringForward', env.getShapes, env.reorderShapes);

      command.execute();

      expect(env.getShapeIds()).toEqual(['rect', 'ellipse']);
    });
  });

  describe('sendBackward', () => {
    it('should swap shape with previous element', () => {
      const env = createZOrderTestEnv();
      const rect = createTestRectangle({ id: 'rect' });
      const ellipse = createTestEllipse({ id: 'ellipse' });
      const line = createTestLine({ id: 'line' });
      env.addShape(rect);
      env.addShape(ellipse);
      env.addShape(line);

      const command = new ZOrderCommand([line], 'sendBackward', env.getShapes, env.reorderShapes);

      command.execute();

      expect(env.getShapeIds()).toEqual(['rect', 'line', 'ellipse']);
    });

    it('should not move shape already at back', () => {
      const env = createZOrderTestEnv();
      const rect = createTestRectangle({ id: 'rect' });
      const ellipse = createTestEllipse({ id: 'ellipse' });
      env.addShape(rect);
      env.addShape(ellipse);

      const command = new ZOrderCommand([rect], 'sendBackward', env.getShapes, env.reorderShapes);

      command.execute();

      expect(env.getShapeIds()).toEqual(['rect', 'ellipse']);
    });
  });

  describe('undo()', () => {
    it('should restore original order after bringToFront', () => {
      const env = createZOrderTestEnv();
      const rect = createTestRectangle({ id: 'rect' });
      const ellipse = createTestEllipse({ id: 'ellipse' });
      const line = createTestLine({ id: 'line' });
      env.addShape(rect);
      env.addShape(ellipse);
      env.addShape(line);

      const command = new ZOrderCommand([rect], 'bringToFront', env.getShapes, env.reorderShapes);

      command.execute();
      expect(env.getShapeIds()).toEqual(['ellipse', 'line', 'rect']);

      command.undo();
      expect(env.getShapeIds()).toEqual(['rect', 'ellipse', 'line']);
    });

    it('should restore original order after sendToBack', () => {
      const env = createZOrderTestEnv();
      const rect = createTestRectangle({ id: 'rect' });
      const ellipse = createTestEllipse({ id: 'ellipse' });
      const line = createTestLine({ id: 'line' });
      env.addShape(rect);
      env.addShape(ellipse);
      env.addShape(line);

      const command = new ZOrderCommand([line], 'sendToBack', env.getShapes, env.reorderShapes);

      command.execute();
      command.undo();

      expect(env.getShapeIds()).toEqual(['rect', 'ellipse', 'line']);
    });

    it('should restore original order after bringForward', () => {
      const env = createZOrderTestEnv();
      const rect = createTestRectangle({ id: 'rect' });
      const ellipse = createTestEllipse({ id: 'ellipse' });
      const line = createTestLine({ id: 'line' });
      env.addShape(rect);
      env.addShape(ellipse);
      env.addShape(line);

      const command = new ZOrderCommand([rect], 'bringForward', env.getShapes, env.reorderShapes);

      command.execute();
      command.undo();

      expect(env.getShapeIds()).toEqual(['rect', 'ellipse', 'line']);
    });

    it('should restore original order after sendBackward', () => {
      const env = createZOrderTestEnv();
      const rect = createTestRectangle({ id: 'rect' });
      const ellipse = createTestEllipse({ id: 'ellipse' });
      const line = createTestLine({ id: 'line' });
      env.addShape(rect);
      env.addShape(ellipse);
      env.addShape(line);

      const command = new ZOrderCommand([line], 'sendBackward', env.getShapes, env.reorderShapes);

      command.execute();
      command.undo();

      expect(env.getShapeIds()).toEqual(['rect', 'ellipse', 'line']);
    });

    it('should restore original order with multiple shapes', () => {
      const env = createZOrderTestEnv();
      const rect = createTestRectangle({ id: 'rect' });
      const ellipse = createTestEllipse({ id: 'ellipse' });
      const line = createTestLine({ id: 'line' });
      env.addShape(rect);
      env.addShape(ellipse);
      env.addShape(line);

      const command = new ZOrderCommand([rect, ellipse], 'bringToFront', env.getShapes, env.reorderShapes);

      command.execute();
      command.undo();

      expect(env.getShapeIds()).toEqual(['rect', 'ellipse', 'line']);
    });
  });

  describe('execute() after undo()', () => {
    it('should re-apply operation (redo behavior)', () => {
      const env = createZOrderTestEnv();
      const rect = createTestRectangle({ id: 'rect' });
      const ellipse = createTestEllipse({ id: 'ellipse' });
      const line = createTestLine({ id: 'line' });
      env.addShape(rect);
      env.addShape(ellipse);
      env.addShape(line);

      const command = new ZOrderCommand([rect], 'bringToFront', env.getShapes, env.reorderShapes);

      command.execute();
      command.undo();
      command.execute();

      expect(env.getShapeIds()).toEqual(['ellipse', 'line', 'rect']);
    });

    it('should handle multiple undo/redo cycles', () => {
      const env = createZOrderTestEnv();
      const rect = createTestRectangle({ id: 'rect' });
      const ellipse = createTestEllipse({ id: 'ellipse' });
      env.addShape(rect);
      env.addShape(ellipse);

      const command = new ZOrderCommand([rect], 'bringToFront', env.getShapes, env.reorderShapes);

      command.execute();
      expect(env.getShapeIds()).toEqual(['ellipse', 'rect']);

      command.undo();
      expect(env.getShapeIds()).toEqual(['rect', 'ellipse']);

      command.execute();
      expect(env.getShapeIds()).toEqual(['ellipse', 'rect']);

      command.undo();
      expect(env.getShapeIds()).toEqual(['rect', 'ellipse']);
    });
  });

  describe('getDescription()', () => {
    it('should return "Bring to Front" for bringToFront', () => {
      const env = createZOrderTestEnv();
      const rect = createTestRectangle({ id: 'rect' });
      env.addShape(rect);

      const command = new ZOrderCommand([rect], 'bringToFront', env.getShapes, env.reorderShapes);

      expect(command.getDescription()).toBe('Bring to Front');
    });

    it('should return "Send to Back" for sendToBack', () => {
      const env = createZOrderTestEnv();
      const rect = createTestRectangle({ id: 'rect' });
      env.addShape(rect);

      const command = new ZOrderCommand([rect], 'sendToBack', env.getShapes, env.reorderShapes);

      expect(command.getDescription()).toBe('Send to Back');
    });

    it('should return "Bring Forward" for bringForward', () => {
      const env = createZOrderTestEnv();
      const rect = createTestRectangle({ id: 'rect' });
      env.addShape(rect);

      const command = new ZOrderCommand([rect], 'bringForward', env.getShapes, env.reorderShapes);

      expect(command.getDescription()).toBe('Bring Forward');
    });

    it('should return "Send Backward" for sendBackward', () => {
      const env = createZOrderTestEnv();
      const rect = createTestRectangle({ id: 'rect' });
      env.addShape(rect);

      const command = new ZOrderCommand([rect], 'sendBackward', env.getShapes, env.reorderShapes);

      expect(command.getDescription()).toBe('Send Backward');
    });
  });
});
