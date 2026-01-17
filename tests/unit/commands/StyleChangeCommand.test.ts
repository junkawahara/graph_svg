import { describe, it, expect } from 'vitest';
import { StyleChangeCommand } from '../../../src/renderer/commands/StyleChangeCommand';
import {
  createTestRectangle,
  createTestEllipse,
  createTestLine
} from '../../utils/mock-factories';

describe('StyleChangeCommand', () => {
  describe('execute()', () => {
    it('should apply fill color change', () => {
      const shape = createTestRectangle();
      shape.style.fill = '#ff0000';
      const command = new StyleChangeCommand([shape], { fill: '#00ff00' });

      command.execute();

      expect(shape.style.fill).toBe('#00ff00');
    });

    it('should apply stroke color change', () => {
      const shape = createTestRectangle();
      shape.style.stroke = '#000000';
      const command = new StyleChangeCommand([shape], { stroke: '#0000ff' });

      command.execute();

      expect(shape.style.stroke).toBe('#0000ff');
    });

    it('should apply strokeWidth change', () => {
      const shape = createTestRectangle();
      shape.style.strokeWidth = 1;
      const command = new StyleChangeCommand([shape], { strokeWidth: 5 });

      command.execute();

      expect(shape.style.strokeWidth).toBe(5);
    });

    it('should apply opacity change', () => {
      const shape = createTestRectangle();
      shape.style.opacity = 1;
      const command = new StyleChangeCommand([shape], { opacity: 0.5 });

      command.execute();

      expect(shape.style.opacity).toBe(0.5);
    });

    it('should apply multiple style changes at once', () => {
      const shape = createTestRectangle();
      shape.style.fill = '#ff0000';
      shape.style.stroke = '#000000';
      shape.style.strokeWidth = 1;

      const command = new StyleChangeCommand([shape], {
        fill: '#00ff00',
        stroke: '#0000ff',
        strokeWidth: 3
      });

      command.execute();

      expect(shape.style.fill).toBe('#00ff00');
      expect(shape.style.stroke).toBe('#0000ff');
      expect(shape.style.strokeWidth).toBe(3);
    });

    it('should apply style changes to multiple shapes', () => {
      const shape1 = createTestRectangle({ id: 'rect-1' });
      const shape2 = createTestEllipse({ id: 'ellipse-1' });
      shape1.style.fill = '#ff0000';
      shape2.style.fill = '#0000ff';

      const command = new StyleChangeCommand([shape1, shape2], { fill: '#00ff00' });

      command.execute();

      expect(shape1.style.fill).toBe('#00ff00');
      expect(shape2.style.fill).toBe('#00ff00');
    });

    it('should preserve other style properties', () => {
      const shape = createTestRectangle();
      shape.style.fill = '#ff0000';
      shape.style.stroke = '#000000';
      shape.style.strokeWidth = 2;
      shape.style.opacity = 0.8;

      const command = new StyleChangeCommand([shape], { fill: '#00ff00' });

      command.execute();

      expect(shape.style.fill).toBe('#00ff00');
      expect(shape.style.stroke).toBe('#000000');
      expect(shape.style.strokeWidth).toBe(2);
      expect(shape.style.opacity).toBe(0.8);
    });
  });

  describe('undo()', () => {
    it('should restore original fill color', () => {
      const shape = createTestRectangle();
      shape.style.fill = '#ff0000';
      const command = new StyleChangeCommand([shape], { fill: '#00ff00' });

      command.execute();
      command.undo();

      expect(shape.style.fill).toBe('#ff0000');
    });

    it('should restore original stroke color', () => {
      const shape = createTestRectangle();
      shape.style.stroke = '#000000';
      const command = new StyleChangeCommand([shape], { stroke: '#0000ff' });

      command.execute();
      command.undo();

      expect(shape.style.stroke).toBe('#000000');
    });

    it('should restore multiple style properties', () => {
      const shape = createTestRectangle();
      shape.style.fill = '#ff0000';
      shape.style.stroke = '#000000';
      shape.style.strokeWidth = 1;

      const command = new StyleChangeCommand([shape], {
        fill: '#00ff00',
        stroke: '#0000ff',
        strokeWidth: 3
      });

      command.execute();
      command.undo();

      expect(shape.style.fill).toBe('#ff0000');
      expect(shape.style.stroke).toBe('#000000');
      expect(shape.style.strokeWidth).toBe(1);
    });

    it('should restore each shape\'s original style independently', () => {
      const shape1 = createTestRectangle({ id: 'rect-1' });
      const shape2 = createTestEllipse({ id: 'ellipse-1' });
      shape1.style.fill = '#ff0000';
      shape2.style.fill = '#0000ff';

      const command = new StyleChangeCommand([shape1, shape2], { fill: '#00ff00' });

      command.execute();
      command.undo();

      expect(shape1.style.fill).toBe('#ff0000');
      expect(shape2.style.fill).toBe('#0000ff');
    });
  });

  describe('execute() after undo()', () => {
    it('should re-apply style changes (redo behavior)', () => {
      const shape = createTestRectangle();
      shape.style.fill = '#ff0000';
      const command = new StyleChangeCommand([shape], { fill: '#00ff00' });

      command.execute();
      command.undo();
      command.execute();

      expect(shape.style.fill).toBe('#00ff00');
    });

    it('should handle multiple undo/redo cycles', () => {
      const shape = createTestRectangle();
      shape.style.fill = '#ff0000';
      const command = new StyleChangeCommand([shape], { fill: '#00ff00' });

      command.execute();
      expect(shape.style.fill).toBe('#00ff00');

      command.undo();
      expect(shape.style.fill).toBe('#ff0000');

      command.execute();
      expect(shape.style.fill).toBe('#00ff00');

      command.undo();
      expect(shape.style.fill).toBe('#ff0000');
    });
  });

  describe('getDescription()', () => {
    it('should describe single property change', () => {
      const shape = createTestRectangle();
      const command = new StyleChangeCommand([shape], { fill: '#00ff00' });

      expect(command.getDescription()).toBe('Change style: fill');
    });

    it('should describe multiple property changes', () => {
      const shape = createTestRectangle();
      const command = new StyleChangeCommand([shape], { fill: '#00ff00', stroke: '#0000ff' });

      expect(command.getDescription()).toContain('fill');
      expect(command.getDescription()).toContain('stroke');
    });

    it('should describe strokeWidth change', () => {
      const shape = createTestRectangle();
      const command = new StyleChangeCommand([shape], { strokeWidth: 5 });

      expect(command.getDescription()).toBe('Change style: strokeWidth');
    });
  });
});
