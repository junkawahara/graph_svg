import { describe, it, expect } from 'vitest';
import { Text } from '../../../src/renderer/shapes/Text';
import {
  createTestText,
  createTestStyle,
  roundTrip
} from '../../utils/mock-factories';
import { expectTextEqual } from '../../utils/shape-comparators';

describe('Text Round-Trip', () => {
  describe('Basic Text', () => {
    it('should preserve simple text content', () => {
      const original = createTestText({
        content: 'Hello World',
        x: 100,
        y: 100
      });

      const { shapes } = roundTrip([original]);

      expect(shapes).toHaveLength(1);
      const restored = shapes[0] as Text;
      expectTextEqual(restored, original);
    });

    it('should preserve position coordinates', () => {
      const original = createTestText({
        content: 'Test',
        x: 250.5,
        y: 150.75
      });

      const { shapes } = roundTrip([original]);

      expect(shapes).toHaveLength(1);
      const restored = shapes[0] as Text;
      expectTextEqual(restored, original);
    });

    it('should preserve negative coordinates', () => {
      const original = createTestText({
        content: 'Negative',
        x: -50,
        y: -25
      });

      const { shapes } = roundTrip([original]);

      expect(shapes).toHaveLength(1);
      const restored = shapes[0] as Text;
      expectTextEqual(restored, original);
    });
  });

  describe('Font Properties', () => {
    it('should preserve fontSize', () => {
      const original = createTestText({
        content: 'Big Text',
        fontSize: 32
      });

      const { shapes } = roundTrip([original]);

      expect(shapes).toHaveLength(1);
      const restored = shapes[0] as Text;
      expect(restored.fontSize).toBe(32);
    });

    it('should preserve fontFamily', () => {
      const original = createTestText({
        content: 'Custom Font',
        fontFamily: 'Times New Roman'
      });

      const { shapes } = roundTrip([original]);

      expect(shapes).toHaveLength(1);
      const restored = shapes[0] as Text;
      expect(restored.fontFamily).toBe('Times New Roman');
    });

    it('should preserve bold fontWeight', () => {
      const original = createTestText({
        content: 'Bold Text',
        fontWeight: 'bold'
      });

      const { shapes } = roundTrip([original]);

      expect(shapes).toHaveLength(1);
      const restored = shapes[0] as Text;
      expect(restored.fontWeight).toBe('bold');
    });

    it('should preserve normal fontWeight', () => {
      const original = createTestText({
        content: 'Normal Text',
        fontWeight: 'normal'
      });

      const { shapes } = roundTrip([original]);

      expect(shapes).toHaveLength(1);
      const restored = shapes[0] as Text;
      expect(restored.fontWeight).toBe('normal');
    });

    it('should preserve italic fontStyle', () => {
      const original = createTestText({
        content: 'Italic Text',
        fontStyle: 'italic'
      });

      const { shapes } = roundTrip([original]);

      expect(shapes).toHaveLength(1);
      const restored = shapes[0] as Text;
      expect(restored.fontStyle).toBe('italic');
    });
  });

  describe('Text Anchor', () => {
    it('should preserve textAnchor start', () => {
      const original = createTestText({
        content: 'Left Aligned',
        textAnchor: 'start'
      });

      const { shapes } = roundTrip([original]);

      expect(shapes).toHaveLength(1);
      const restored = shapes[0] as Text;
      expect(restored.textAnchor).toBe('start');
    });

    it('should preserve textAnchor middle', () => {
      const original = createTestText({
        content: 'Center Aligned',
        textAnchor: 'middle'
      });

      const { shapes } = roundTrip([original]);

      expect(shapes).toHaveLength(1);
      const restored = shapes[0] as Text;
      expect(restored.textAnchor).toBe('middle');
    });

    it('should preserve textAnchor end', () => {
      const original = createTestText({
        content: 'Right Aligned',
        textAnchor: 'end'
      });

      const { shapes } = roundTrip([original]);

      expect(shapes).toHaveLength(1);
      const restored = shapes[0] as Text;
      expect(restored.textAnchor).toBe('end');
    });
  });

  describe('Text Decoration', () => {
    it('should preserve underline', () => {
      const original = createTestText({
        content: 'Underlined',
        textUnderline: true
      });

      const { shapes } = roundTrip([original]);

      expect(shapes).toHaveLength(1);
      const restored = shapes[0] as Text;
      expect(restored.textUnderline).toBe(true);
    });

    it('should preserve strikethrough', () => {
      const original = createTestText({
        content: 'Strikethrough',
        textStrikethrough: true
      });

      const { shapes } = roundTrip([original]);

      expect(shapes).toHaveLength(1);
      const restored = shapes[0] as Text;
      expect(restored.textStrikethrough).toBe(true);
    });

    it('should preserve both underline and strikethrough', () => {
      const original = createTestText({
        content: 'Both Decorations',
        textUnderline: true,
        textStrikethrough: true
      });

      const { shapes } = roundTrip([original]);

      expect(shapes).toHaveLength(1);
      const restored = shapes[0] as Text;
      expect(restored.textUnderline).toBe(true);
      expect(restored.textStrikethrough).toBe(true);
    });
  });

  describe('Multi-line Text', () => {
    it('should preserve two-line text', () => {
      const original = createTestText({
        content: 'Line 1\nLine 2'
      });

      const { shapes } = roundTrip([original]);

      expect(shapes).toHaveLength(1);
      const restored = shapes[0] as Text;
      expect(restored.content).toBe('Line 1\nLine 2');
    });

    it('should preserve multiple lines', () => {
      const original = createTestText({
        content: 'First\nSecond\nThird\nFourth'
      });

      const { shapes } = roundTrip([original]);

      expect(shapes).toHaveLength(1);
      const restored = shapes[0] as Text;
      expect(restored.content).toBe('First\nSecond\nThird\nFourth');
    });

    it('should preserve empty lines in multiline (converted to space)', () => {
      const original = createTestText({
        content: 'Before\n\nAfter'
      });

      const { shapes } = roundTrip([original]);

      expect(shapes).toHaveLength(1);
      const restored = shapes[0] as Text;
      // Empty lines are converted to single space in SVG tspan
      expect(restored.content).toBe('Before\n \nAfter');
    });
  });

  describe('Special Characters', () => {
    it('should preserve ampersand', () => {
      const original = createTestText({
        content: 'Tom & Jerry'
      });

      const { shapes } = roundTrip([original]);

      expect(shapes).toHaveLength(1);
      const restored = shapes[0] as Text;
      expect(restored.content).toBe('Tom & Jerry');
    });

    it('should preserve less than and greater than', () => {
      const original = createTestText({
        content: 'a < b > c'
      });

      const { shapes } = roundTrip([original]);

      expect(shapes).toHaveLength(1);
      const restored = shapes[0] as Text;
      expect(restored.content).toBe('a < b > c');
    });

    it('should preserve quotes', () => {
      const original = createTestText({
        content: 'Say "Hello"'
      });

      const { shapes } = roundTrip([original]);

      expect(shapes).toHaveLength(1);
      const restored = shapes[0] as Text;
      expect(restored.content).toBe('Say "Hello"');
    });

    it('should preserve apostrophe', () => {
      const original = createTestText({
        content: "It's working"
      });

      const { shapes } = roundTrip([original]);

      expect(shapes).toHaveLength(1);
      const restored = shapes[0] as Text;
      expect(restored.content).toBe("It's working");
    });

    it('should preserve unicode characters', () => {
      const original = createTestText({
        content: '日本語テキスト'
      });

      const { shapes } = roundTrip([original]);

      expect(shapes).toHaveLength(1);
      const restored = shapes[0] as Text;
      expect(restored.content).toBe('日本語テキスト');
    });

    it('should preserve emoji', () => {
      const original = createTestText({
        content: 'Hello 🌍 World'
      });

      const { shapes } = roundTrip([original]);

      expect(shapes).toHaveLength(1);
      const restored = shapes[0] as Text;
      expect(restored.content).toBe('Hello 🌍 World');
    });
  });

  describe('Dominant Baseline', () => {
    it('should preserve auto baseline', () => {
      const original = createTestText({
        content: 'Auto Baseline',
        dominantBaseline: 'auto'
      });

      const { shapes } = roundTrip([original]);

      expect(shapes).toHaveLength(1);
      const restored = shapes[0] as Text;
      expect(restored.dominantBaseline).toBe('auto');
    });

    it('should preserve middle baseline', () => {
      const original = createTestText({
        content: 'Middle Baseline',
        dominantBaseline: 'middle'
      });

      const { shapes } = roundTrip([original]);

      expect(shapes).toHaveLength(1);
      const restored = shapes[0] as Text;
      expect(restored.dominantBaseline).toBe('middle');
    });

    it('should preserve hanging baseline', () => {
      const original = createTestText({
        content: 'Hanging Baseline',
        dominantBaseline: 'hanging'
      });

      const { shapes } = roundTrip([original]);

      expect(shapes).toHaveLength(1);
      const restored = shapes[0] as Text;
      expect(restored.dominantBaseline).toBe('hanging');
    });
  });

  describe('Combined Properties', () => {
    it('should preserve all text properties', () => {
      const original = createTestText({
        content: 'Full Featured Text',
        x: 200,
        y: 150,
        fontSize: 24,
        fontFamily: 'Georgia',
        fontWeight: 'bold',
        fontStyle: 'italic',
        textAnchor: 'middle',
        dominantBaseline: 'middle',
        textUnderline: true
      });

      const { shapes } = roundTrip([original]);

      expect(shapes).toHaveLength(1);
      const restored = shapes[0] as Text;
      expectTextEqual(restored, original);
    });
  });

  describe('Multiple Text Elements', () => {
    it('should preserve multiple text elements', () => {
      const text1 = createTestText({ id: 'text-1', content: 'First', x: 100, y: 100 });
      const text2 = createTestText({ id: 'text-2', content: 'Second', x: 200, y: 100 });
      const text3 = createTestText({ id: 'text-3', content: 'Third', x: 300, y: 100 });

      const { shapes } = roundTrip([text1, text2, text3]);

      expect(shapes).toHaveLength(3);
      const texts = shapes.filter(s => s.type === 'text') as Text[];
      expect(texts).toHaveLength(3);

      // Verify each text is present (order may vary)
      const contents = texts.map(t => t.content).sort();
      expect(contents).toEqual(['First', 'Second', 'Third']);
    });
  });
});
