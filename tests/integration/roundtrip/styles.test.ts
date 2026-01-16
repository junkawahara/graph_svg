import { describe, it, expect } from 'vitest';
import { Rectangle } from '../../../src/renderer/shapes/Rectangle';
import { Line } from '../../../src/renderer/shapes/Line';
import { Ellipse } from '../../../src/renderer/shapes/Ellipse';
import {
  createTestRectangle,
  createTestLine,
  createTestEllipse,
  createTestStyle,
  roundTrip
} from '../../utils/mock-factories';
import { expectClose, expectStyleEqual } from '../../utils/shape-comparators';

describe('Styles Round-Trip', () => {
  describe('Fill', () => {
    it('should preserve fill color', () => {
      const style = createTestStyle({ fill: '#ff0000' });
      const rect = createTestRectangle({ style });

      const { shapes } = roundTrip([rect]);

      const restored = shapes[0] as Rectangle;
      expect(restored.style.fill).toBe('#ff0000');
    });

    it('should preserve various fill colors', () => {
      const colors = ['#000000', '#ffffff', '#123456', '#abcdef', '#FF00FF'];

      for (const color of colors) {
        const style = createTestStyle({ fill: color.toLowerCase() });
        const rect = createTestRectangle({ id: `rect-${color}`, style });

        const { shapes } = roundTrip([rect]);
        const restored = shapes[0] as Rectangle;
        expect(restored.style.fill.toLowerCase()).toBe(color.toLowerCase());
      }
    });

    it('should preserve fillNone = true', () => {
      const style = createTestStyle({ fillNone: true });
      const rect = createTestRectangle({ style });

      const { shapes } = roundTrip([rect]);

      const restored = shapes[0] as Rectangle;
      expect(restored.style.fillNone).toBe(true);
    });

    it('should preserve fillNone = false', () => {
      const style = createTestStyle({ fillNone: false, fill: '#00ff00' });
      const rect = createTestRectangle({ style });

      const { shapes } = roundTrip([rect]);

      const restored = shapes[0] as Rectangle;
      expect(restored.style.fillNone).toBe(false);
      expect(restored.style.fill).toBe('#00ff00');
    });
  });

  describe('Stroke', () => {
    it('should preserve stroke color', () => {
      const style = createTestStyle({ stroke: '#0000ff' });
      const rect = createTestRectangle({ style });

      const { shapes } = roundTrip([rect]);

      const restored = shapes[0] as Rectangle;
      expect(restored.style.stroke).toBe('#0000ff');
    });

    it('should preserve various stroke colors', () => {
      const colors = ['#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff'];

      for (const color of colors) {
        const style = createTestStyle({ stroke: color });
        const line = createTestLine({ id: `line-${color}`, style });

        const { shapes } = roundTrip([line]);
        const restored = shapes[0] as Line;
        expect(restored.style.stroke).toBe(color);
      }
    });
  });

  describe('Stroke Width', () => {
    it('should preserve integer stroke width', () => {
      const style = createTestStyle({ strokeWidth: 5 });
      const rect = createTestRectangle({ style });

      const { shapes } = roundTrip([rect]);

      const restored = shapes[0] as Rectangle;
      expectClose(restored.style.strokeWidth, 5);
    });

    it('should preserve decimal stroke width', () => {
      const style = createTestStyle({ strokeWidth: 2.5 });
      const rect = createTestRectangle({ style });

      const { shapes } = roundTrip([rect]);

      const restored = shapes[0] as Rectangle;
      expectClose(restored.style.strokeWidth, 2.5);
    });

    it('should preserve various stroke widths', () => {
      const widths = [0.5, 1, 2, 3.5, 5, 10];

      for (const width of widths) {
        const style = createTestStyle({ strokeWidth: width });
        const line = createTestLine({ id: `line-${width}`, style });

        const { shapes } = roundTrip([line]);
        const restored = shapes[0] as Line;
        expectClose(restored.style.strokeWidth, width);
      }
    });

    it('should preserve zero stroke width', () => {
      const style = createTestStyle({ strokeWidth: 0 });
      const rect = createTestRectangle({ style });

      const { shapes } = roundTrip([rect]);

      const restored = shapes[0] as Rectangle;
      expectClose(restored.style.strokeWidth, 0);
    });
  });

  describe('Opacity', () => {
    it('should preserve full opacity', () => {
      const style = createTestStyle({ opacity: 1 });
      const rect = createTestRectangle({ style });

      const { shapes } = roundTrip([rect]);

      const restored = shapes[0] as Rectangle;
      expectClose(restored.style.opacity, 1);
    });

    it('should preserve half opacity', () => {
      const style = createTestStyle({ opacity: 0.5 });
      const rect = createTestRectangle({ style });

      const { shapes } = roundTrip([rect]);

      const restored = shapes[0] as Rectangle;
      expectClose(restored.style.opacity, 0.5);
    });

    it('should preserve various opacity levels', () => {
      const opacities = [0.1, 0.25, 0.5, 0.75, 0.9, 1];

      for (const opacity of opacities) {
        const style = createTestStyle({ opacity });
        const rect = createTestRectangle({ id: `rect-${opacity}`, style });

        const { shapes } = roundTrip([rect]);
        const restored = shapes[0] as Rectangle;
        expectClose(restored.style.opacity, opacity);
      }
    });

    it('should preserve zero opacity', () => {
      const style = createTestStyle({ opacity: 0 });
      const rect = createTestRectangle({ style });

      const { shapes } = roundTrip([rect]);

      const restored = shapes[0] as Rectangle;
      expectClose(restored.style.opacity, 0);
    });
  });

  describe('Stroke Dasharray', () => {
    it('should preserve simple dasharray', () => {
      const style = createTestStyle({ strokeDasharray: '5,5' });
      const line = createTestLine({ style });

      const { shapes } = roundTrip([line]);

      const restored = shapes[0] as Line;
      expect(restored.style.strokeDasharray).toBe('5,5');
    });

    it('should preserve complex dasharray', () => {
      const style = createTestStyle({ strokeDasharray: '10,5,2,5' });
      const line = createTestLine({ style });

      const { shapes } = roundTrip([line]);

      const restored = shapes[0] as Line;
      expect(restored.style.strokeDasharray).toBe('10,5,2,5');
    });

    it('should preserve empty dasharray (solid line)', () => {
      const style = createTestStyle({ strokeDasharray: '' });
      const line = createTestLine({ style });

      const { shapes } = roundTrip([line]);

      const restored = shapes[0] as Line;
      expect(restored.style.strokeDasharray).toBe('');
    });

    it('should preserve dotted pattern', () => {
      const style = createTestStyle({ strokeDasharray: '2,2' });
      const line = createTestLine({ style });

      const { shapes } = roundTrip([line]);

      const restored = shapes[0] as Line;
      expect(restored.style.strokeDasharray).toBe('2,2');
    });
  });

  describe('Stroke Linecap', () => {
    it('should preserve butt linecap', () => {
      const style = createTestStyle({ strokeLinecap: 'butt' });
      const line = createTestLine({ style });

      const { shapes } = roundTrip([line]);

      const restored = shapes[0] as Line;
      expect(restored.style.strokeLinecap).toBe('butt');
    });

    it('should preserve round linecap', () => {
      const style = createTestStyle({ strokeLinecap: 'round' });
      const line = createTestLine({ style });

      const { shapes } = roundTrip([line]);

      const restored = shapes[0] as Line;
      expect(restored.style.strokeLinecap).toBe('round');
    });

    it('should preserve square linecap', () => {
      const style = createTestStyle({ strokeLinecap: 'square' });
      const line = createTestLine({ style });

      const { shapes } = roundTrip([line]);

      const restored = shapes[0] as Line;
      expect(restored.style.strokeLinecap).toBe('square');
    });
  });

  describe('Combined Styles', () => {
    it('should preserve all style properties together', () => {
      const style = createTestStyle({
        fill: '#ff5500',
        fillNone: false,
        stroke: '#0055ff',
        strokeWidth: 3.5,
        opacity: 0.8,
        strokeDasharray: '5,3',
        strokeLinecap: 'round'
      });
      const rect = createTestRectangle({ style });

      const { shapes } = roundTrip([rect]);

      const restored = shapes[0] as Rectangle;
      expectStyleEqual(restored.style, style);
    });

    it('should preserve fill none with stroke', () => {
      const style = createTestStyle({
        fillNone: true,
        stroke: '#000000',
        strokeWidth: 2,
        strokeDasharray: '10,5'
      });
      const rect = createTestRectangle({ style });

      const { shapes } = roundTrip([rect]);

      const restored = shapes[0] as Rectangle;
      expect(restored.style.fillNone).toBe(true);
      expect(restored.style.stroke).toBe('#000000');
      expectClose(restored.style.strokeWidth, 2);
      expect(restored.style.strokeDasharray).toBe('10,5');
    });

    it('should preserve transparent stroke (zero width)', () => {
      const style = createTestStyle({
        fill: '#ffffff',
        strokeWidth: 0
      });
      const rect = createTestRectangle({ style });

      const { shapes } = roundTrip([rect]);

      const restored = shapes[0] as Rectangle;
      expect(restored.style.fill).toBe('#ffffff');
      expectClose(restored.style.strokeWidth, 0);
    });
  });

  describe('Styles on Different Shape Types', () => {
    it('should preserve styles on line', () => {
      const style = createTestStyle({
        stroke: '#ff0000',
        strokeWidth: 4,
        opacity: 0.75,
        strokeDasharray: '8,4',
        strokeLinecap: 'square'
      });
      const line = createTestLine({ style });

      const { shapes } = roundTrip([line]);

      const restored = shapes[0] as Line;
      expect(restored.style.stroke).toBe('#ff0000');
      expectClose(restored.style.strokeWidth, 4);
      expectClose(restored.style.opacity, 0.75);
      expect(restored.style.strokeDasharray).toBe('8,4');
      expect(restored.style.strokeLinecap).toBe('square');
    });

    it('should preserve styles on ellipse', () => {
      const style = createTestStyle({
        fill: '#00ff00',
        stroke: '#0000ff',
        strokeWidth: 2.5,
        opacity: 0.9
      });
      const ellipse = createTestEllipse({ style });

      const { shapes } = roundTrip([ellipse]);

      const restored = shapes[0] as Ellipse;
      expect(restored.style.fill).toBe('#00ff00');
      expect(restored.style.stroke).toBe('#0000ff');
      expectClose(restored.style.strokeWidth, 2.5);
      expectClose(restored.style.opacity, 0.9);
    });

    it('should preserve different styles on multiple shapes', () => {
      const style1 = createTestStyle({ fill: '#ff0000', strokeWidth: 1 });
      const style2 = createTestStyle({ fill: '#00ff00', strokeWidth: 2 });
      const style3 = createTestStyle({ fill: '#0000ff', strokeWidth: 3 });

      const rect1 = createTestRectangle({ id: 'rect-1', x: 10, style: style1 });
      const rect2 = createTestRectangle({ id: 'rect-2', x: 120, style: style2 });
      const rect3 = createTestRectangle({ id: 'rect-3', x: 230, style: style3 });

      const { shapes } = roundTrip([rect1, rect2, rect3]);

      expect(shapes).toHaveLength(3);

      // Find shapes by their x position since order may vary
      const rects = shapes as Rectangle[];
      const sorted = rects.sort((a, b) => a.x - b.x);

      expect(sorted[0].style.fill).toBe('#ff0000');
      expect(sorted[1].style.fill).toBe('#00ff00');
      expect(sorted[2].style.fill).toBe('#0000ff');

      expectClose(sorted[0].style.strokeWidth, 1);
      expectClose(sorted[1].style.strokeWidth, 2);
      expectClose(sorted[2].style.strokeWidth, 3);
    });
  });
});
