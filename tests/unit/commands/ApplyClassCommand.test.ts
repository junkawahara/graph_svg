import { describe, it, expect } from 'vitest';
import { ApplyClassCommand } from '../../../src/renderer/commands/ApplyClassCommand';
import { createTestRectangle, createTestEllipse, createTestStyle } from '../../utils/mock-factories';
import { DEFAULT_STYLE } from '../../../src/shared/types';

describe('ApplyClassCommand', () => {
  describe('execute()', () => {
    it('should apply class name to shape', () => {
      const shape = createTestRectangle();
      const command = new ApplyClassCommand(
        [shape],
        'my-class',
        createTestStyle({ fill: '#ff0000' })
      );

      command.execute();

      expect(shape.className).toBe('my-class');
    });

    it('should apply style to shape', () => {
      const shape = createTestRectangle();
      shape.style.fill = '#000000';
      const newStyle = createTestStyle({ fill: '#ff0000', stroke: '#00ff00' });
      const command = new ApplyClassCommand([shape], 'my-class', newStyle);

      command.execute();

      expect(shape.style.fill).toBe('#ff0000');
      expect(shape.style.stroke).toBe('#00ff00');
    });

    it('should apply class to multiple shapes', () => {
      const shape1 = createTestRectangle({ id: 'rect-1' });
      const shape2 = createTestEllipse({ id: 'ellipse-1' });
      const newStyle = createTestStyle({ fill: '#ff0000' });
      const command = new ApplyClassCommand([shape1, shape2], 'shared-class', newStyle);

      command.execute();

      expect(shape1.className).toBe('shared-class');
      expect(shape2.className).toBe('shared-class');
      expect(shape1.style.fill).toBe('#ff0000');
      expect(shape2.style.fill).toBe('#ff0000');
    });

    it('should remove class when newClassName is undefined', () => {
      const shape = createTestRectangle();
      shape.className = 'old-class';
      const command = new ApplyClassCommand([shape], undefined, createTestStyle());

      command.execute();

      expect(shape.className).toBeUndefined();
    });
  });

  describe('undo()', () => {
    it('should restore original class name', () => {
      const shape = createTestRectangle();
      shape.className = 'original-class';
      const command = new ApplyClassCommand(
        [shape],
        'new-class',
        createTestStyle({ fill: '#ff0000' })
      );

      command.execute();
      command.undo();

      expect(shape.className).toBe('original-class');
    });

    it('should restore undefined class name', () => {
      const shape = createTestRectangle();
      shape.className = undefined;
      const command = new ApplyClassCommand(
        [shape],
        'new-class',
        createTestStyle({ fill: '#ff0000' })
      );

      command.execute();
      command.undo();

      expect(shape.className).toBeUndefined();
    });

    it('should restore original style', () => {
      const shape = createTestRectangle();
      shape.style.fill = '#0000ff';
      shape.style.stroke = '#000000';
      const command = new ApplyClassCommand(
        [shape],
        'new-class',
        createTestStyle({ fill: '#ff0000', stroke: '#00ff00' })
      );

      command.execute();
      command.undo();

      expect(shape.style.fill).toBe('#0000ff');
      expect(shape.style.stroke).toBe('#000000');
    });

    it('should restore state for multiple shapes', () => {
      const shape1 = createTestRectangle({ id: 'rect-1' });
      const shape2 = createTestEllipse({ id: 'ellipse-1' });
      shape1.className = 'class-1';
      shape1.style.fill = '#111111';
      shape2.className = 'class-2';
      shape2.style.fill = '#222222';

      const command = new ApplyClassCommand(
        [shape1, shape2],
        'shared-class',
        createTestStyle({ fill: '#ff0000' })
      );

      command.execute();
      command.undo();

      expect(shape1.className).toBe('class-1');
      expect(shape1.style.fill).toBe('#111111');
      expect(shape2.className).toBe('class-2');
      expect(shape2.style.fill).toBe('#222222');
    });
  });

  describe('redo (execute after undo)', () => {
    it('should re-apply the class and style', () => {
      const shape = createTestRectangle();
      shape.className = 'original';
      shape.style.fill = '#000000';
      const command = new ApplyClassCommand(
        [shape],
        'new-class',
        createTestStyle({ fill: '#ff0000' })
      );

      command.execute();
      command.undo();
      command.execute();

      expect(shape.className).toBe('new-class');
      expect(shape.style.fill).toBe('#ff0000');
    });
  });

  describe('constructor', () => {
    it('should capture state at construction time', () => {
      const shape = createTestRectangle();
      shape.style.fill = '#111111';
      const command = new ApplyClassCommand(
        [shape],
        'new-class',
        createTestStyle({ fill: '#ff0000' })
      );

      // Modify shape after command creation
      shape.style.fill = '#222222';

      command.execute();
      command.undo();

      // Should restore to state at construction time
      expect(shape.style.fill).toBe('#111111');
    });
  });
});
