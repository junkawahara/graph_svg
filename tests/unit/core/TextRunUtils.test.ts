import { describe, it, expect } from 'vitest';
import {
  stylesEqual,
  mergeStyles,
  hasStyle,
  plainTextToRuns,
  runsToPlainText,
  cloneRuns,
  normalizeRuns,
  findRunAtPosition,
  applyStyleToRange,
  globalIndexToLineChar,
  lineCharToGlobalIndex,
  hasRichStyles
} from '../../../src/renderer/core/TextRunUtils';
import { TextRun, TextRunStyle } from '../../../src/shared/types';

describe('TextRunUtils', () => {
  describe('stylesEqual()', () => {
    it('should return true for both undefined', () => {
      expect(stylesEqual(undefined, undefined)).toBe(true);
    });

    it('should return true for same style reference', () => {
      const style: TextRunStyle = { fontWeight: 'bold' };
      expect(stylesEqual(style, style)).toBe(true);
    });

    it('should return false when one is undefined', () => {
      const style: TextRunStyle = { fontWeight: 'bold' };
      expect(stylesEqual(style, undefined)).toBe(false);
      expect(stylesEqual(undefined, style)).toBe(false);
    });

    it('should return true for equal styles', () => {
      const style1: TextRunStyle = { fontWeight: 'bold', fontStyle: 'italic' };
      const style2: TextRunStyle = { fontWeight: 'bold', fontStyle: 'italic' };
      expect(stylesEqual(style1, style2)).toBe(true);
    });

    it('should return false for different styles', () => {
      const style1: TextRunStyle = { fontWeight: 'bold' };
      const style2: TextRunStyle = { fontWeight: 'normal' };
      expect(stylesEqual(style1, style2)).toBe(false);
    });

    it('should compare baselineShift', () => {
      const style1: TextRunStyle = { baselineShift: 'super' };
      const style2: TextRunStyle = { baselineShift: 'super' };
      const style3: TextRunStyle = { baselineShift: 'sub' };
      expect(stylesEqual(style1, style2)).toBe(true);
      expect(stylesEqual(style1, style3)).toBe(false);
    });
  });

  describe('mergeStyles()', () => {
    it('should return base if override is undefined', () => {
      const base: TextRunStyle = { fontWeight: 'bold' };
      expect(mergeStyles(base, undefined)).toEqual(base);
    });

    it('should return override if base is undefined', () => {
      const override: TextRunStyle = { fontStyle: 'italic' };
      expect(mergeStyles(undefined, override)).toEqual(override);
    });

    it('should merge styles with override taking precedence', () => {
      const base: TextRunStyle = { fontWeight: 'bold', fontStyle: 'normal' };
      const override: TextRunStyle = { fontStyle: 'italic' };
      const result = mergeStyles(base, override);

      expect(result?.fontWeight).toBe('bold');
      expect(result?.fontStyle).toBe('italic');
    });

    it('should merge baselineShift', () => {
      const base: TextRunStyle = { fontWeight: 'bold' };
      const override: TextRunStyle = { baselineShift: 'super' };
      const result = mergeStyles(base, override);

      expect(result?.fontWeight).toBe('bold');
      expect(result?.baselineShift).toBe('super');
    });
  });

  describe('hasStyle()', () => {
    it('should return false for undefined', () => {
      expect(hasStyle(undefined)).toBe(false);
    });

    it('should return false for empty style', () => {
      expect(hasStyle({})).toBe(false);
    });

    it('should return true for style with fontWeight', () => {
      expect(hasStyle({ fontWeight: 'bold' })).toBe(true);
    });

    it('should return true for style with fontStyle', () => {
      expect(hasStyle({ fontStyle: 'italic' })).toBe(true);
    });

    it('should return true for style with textUnderline', () => {
      expect(hasStyle({ textUnderline: true })).toBe(true);
    });

    it('should return true for style with textStrikethrough', () => {
      expect(hasStyle({ textStrikethrough: true })).toBe(true);
    });

    it('should return true for style with fill', () => {
      expect(hasStyle({ fill: '#ff0000' })).toBe(true);
    });

    it('should return true for style with baselineShift', () => {
      expect(hasStyle({ baselineShift: 'super' })).toBe(true);
    });
  });

  describe('plainTextToRuns()', () => {
    it('should convert single line text', () => {
      const runs = plainTextToRuns('Hello');
      expect(runs).toHaveLength(1);
      expect(runs[0]).toHaveLength(1);
      expect(runs[0][0].text).toBe('Hello');
    });

    it('should convert multi-line text', () => {
      const runs = plainTextToRuns('Line 1\nLine 2\nLine 3');
      expect(runs).toHaveLength(3);
      expect(runs[0][0].text).toBe('Line 1');
      expect(runs[1][0].text).toBe('Line 2');
      expect(runs[2][0].text).toBe('Line 3');
    });

    it('should handle empty text', () => {
      const runs = plainTextToRuns('');
      expect(runs).toHaveLength(1);
      expect(runs[0][0].text).toBe('');
    });
  });

  describe('runsToPlainText()', () => {
    it('should convert single line runs', () => {
      const runs: TextRun[][] = [[{ text: 'Hello' }]];
      expect(runsToPlainText(runs)).toBe('Hello');
    });

    it('should convert multi-line runs', () => {
      const runs: TextRun[][] = [
        [{ text: 'Line 1' }],
        [{ text: 'Line 2' }]
      ];
      expect(runsToPlainText(runs)).toBe('Line 1\nLine 2');
    });

    it('should combine multiple runs in a line', () => {
      const runs: TextRun[][] = [
        [{ text: 'Hello' }, { text: ' ' }, { text: 'World' }]
      ];
      expect(runsToPlainText(runs)).toBe('Hello World');
    });
  });

  describe('cloneRuns()', () => {
    it('should create a deep copy', () => {
      const original: TextRun[][] = [
        [{ text: 'Bold', style: { fontWeight: 'bold' } }]
      ];
      const cloned = cloneRuns(original);

      expect(cloned).toEqual(original);
      expect(cloned).not.toBe(original);
      expect(cloned[0]).not.toBe(original[0]);
      expect(cloned[0][0]).not.toBe(original[0][0]);
      expect(cloned[0][0].style).not.toBe(original[0][0].style);
    });

    it('should preserve styles', () => {
      const original: TextRun[][] = [
        [{ text: 'Styled', style: { fontWeight: 'bold', baselineShift: 'super' } }]
      ];
      const cloned = cloneRuns(original);

      expect(cloned[0][0].style?.fontWeight).toBe('bold');
      expect(cloned[0][0].style?.baselineShift).toBe('super');
    });
  });

  describe('normalizeRuns()', () => {
    it('should merge adjacent runs with same style', () => {
      const runs: TextRun[][] = [
        [{ text: 'Hello' }, { text: ' World' }]
      ];
      const normalized = normalizeRuns(runs);

      expect(normalized[0]).toHaveLength(1);
      expect(normalized[0][0].text).toBe('Hello World');
    });

    it('should not merge runs with different styles', () => {
      const runs: TextRun[][] = [
        [
          { text: 'Bold', style: { fontWeight: 'bold' } },
          { text: 'Normal' }
        ]
      ];
      const normalized = normalizeRuns(runs);

      expect(normalized[0]).toHaveLength(2);
    });

    it('should remove empty runs (except when only one)', () => {
      const runs: TextRun[][] = [
        [{ text: 'Hello' }, { text: '' }, { text: 'World' }]
      ];
      const normalized = normalizeRuns(runs);

      expect(normalized[0]).toHaveLength(1);
      expect(normalized[0][0].text).toBe('HelloWorld');
    });

    it('should ensure at least one run per line', () => {
      const runs: TextRun[][] = [[]];
      const normalized = normalizeRuns(runs);

      expect(normalized[0]).toHaveLength(1);
      expect(normalized[0][0].text).toBe('');
    });
  });

  describe('findRunAtPosition()', () => {
    it('should find run at start of line', () => {
      const line: TextRun[] = [
        { text: 'Hello' },
        { text: ' World' }
      ];
      const result = findRunAtPosition(line, 0);

      expect(result.runIndex).toBe(0);
      expect(result.offsetInRun).toBe(0);
    });

    it('should find run in middle', () => {
      const line: TextRun[] = [
        { text: 'Hello' },
        { text: ' World' }
      ];
      const result = findRunAtPosition(line, 2);

      expect(result.runIndex).toBe(0);
      expect(result.offsetInRun).toBe(2);
    });

    it('should find second run', () => {
      const line: TextRun[] = [
        { text: 'Hello' },
        { text: ' World' }
      ];
      const result = findRunAtPosition(line, 6);

      expect(result.runIndex).toBe(1);
      expect(result.offsetInRun).toBe(1);
    });

    it('should return end of last run for position at end', () => {
      const line: TextRun[] = [
        { text: 'Hello' },
        { text: ' World' }
      ];
      const result = findRunAtPosition(line, 11);

      expect(result.runIndex).toBe(1);
      expect(result.offsetInRun).toBe(6);
    });
  });

  describe('applyStyleToRange()', () => {
    it('should apply style to entire single line', () => {
      const runs: TextRun[][] = [[{ text: 'Hello' }]];
      const result = applyStyleToRange(runs, 0, 0, 0, 5, { fontWeight: 'bold' });

      expect(result[0][0].style?.fontWeight).toBe('bold');
    });

    it('should apply style to part of a line', () => {
      const runs: TextRun[][] = [[{ text: 'Hello World' }]];
      const result = applyStyleToRange(runs, 0, 0, 0, 5, { fontWeight: 'bold' });

      expect(result[0]).toHaveLength(2);
      expect(result[0][0].text).toBe('Hello');
      expect(result[0][0].style?.fontWeight).toBe('bold');
      expect(result[0][1].text).toBe(' World');
      expect(result[0][1].style?.fontWeight).toBeUndefined();
    });

    it('should apply style to middle of a line', () => {
      const runs: TextRun[][] = [[{ text: 'Hello World' }]];
      const result = applyStyleToRange(runs, 0, 2, 0, 8, { fontStyle: 'italic' });

      expect(result[0]).toHaveLength(3);
      expect(result[0][0].text).toBe('He');
      expect(result[0][1].text).toBe('llo Wo');
      expect(result[0][1].style?.fontStyle).toBe('italic');
      expect(result[0][2].text).toBe('rld');
    });

    it('should apply superscript style', () => {
      const runs: TextRun[][] = [[{ text: 'H2O' }]];
      const result = applyStyleToRange(runs, 0, 1, 0, 2, { baselineShift: 'sub' });

      expect(result[0]).toHaveLength(3);
      expect(result[0][1].text).toBe('2');
      expect(result[0][1].style?.baselineShift).toBe('sub');
    });

    it('should apply subscript style', () => {
      const runs: TextRun[][] = [[{ text: 'X2' }]];
      const result = applyStyleToRange(runs, 0, 1, 0, 2, { baselineShift: 'super' });

      expect(result[0]).toHaveLength(2);
      expect(result[0][1].text).toBe('2');
      expect(result[0][1].style?.baselineShift).toBe('super');
    });

    it('should apply style across multiple lines', () => {
      const runs: TextRun[][] = [
        [{ text: 'Line 1' }],
        [{ text: 'Line 2' }]
      ];
      const result = applyStyleToRange(runs, 0, 3, 1, 3, { fontWeight: 'bold' });

      // Line 1: "Lin" normal, "e 1" bold
      expect(result[0][0].text).toBe('Lin');
      expect(result[0][1].text).toBe('e 1');
      expect(result[0][1].style?.fontWeight).toBe('bold');

      // Line 2: "Lin" bold, "e 2" normal
      expect(result[1][0].text).toBe('Lin');
      expect(result[1][0].style?.fontWeight).toBe('bold');
      expect(result[1][1].text).toBe('e 2');
    });

    it('should return unchanged runs for invalid range', () => {
      const runs: TextRun[][] = [[{ text: 'Hello' }]];
      const result = applyStyleToRange(runs, 0, 5, 0, 3, { fontWeight: 'bold' }); // Invalid: start > end

      expect(result[0][0].text).toBe('Hello');
      expect(result[0][0].style?.fontWeight).toBeUndefined();
    });
  });

  describe('globalIndexToLineChar()', () => {
    it('should convert index on first line', () => {
      const runs: TextRun[][] = [[{ text: 'Hello' }]];
      const result = globalIndexToLineChar(runs, 2);

      expect(result.lineIndex).toBe(0);
      expect(result.charIndex).toBe(2);
    });

    it('should convert index on second line', () => {
      const runs: TextRun[][] = [
        [{ text: 'Hello' }],
        [{ text: 'World' }]
      ];
      // Index 6 = after "Hello\n" = start of second line
      const result = globalIndexToLineChar(runs, 6);

      expect(result.lineIndex).toBe(1);
      expect(result.charIndex).toBe(0);
    });

    it('should handle index at end', () => {
      const runs: TextRun[][] = [[{ text: 'Hello' }]];
      const result = globalIndexToLineChar(runs, 100);

      expect(result.lineIndex).toBe(0);
      expect(result.charIndex).toBe(5);
    });
  });

  describe('lineCharToGlobalIndex()', () => {
    it('should convert first line position', () => {
      const runs: TextRun[][] = [[{ text: 'Hello' }]];
      const result = lineCharToGlobalIndex(runs, 0, 2);

      expect(result).toBe(2);
    });

    it('should convert second line position', () => {
      const runs: TextRun[][] = [
        [{ text: 'Hello' }],
        [{ text: 'World' }]
      ];
      // Line 1, char 0 = after "Hello\n" = index 6
      const result = lineCharToGlobalIndex(runs, 1, 0);

      expect(result).toBe(6);
    });

    it('should handle middle of second line', () => {
      const runs: TextRun[][] = [
        [{ text: 'Hello' }],
        [{ text: 'World' }]
      ];
      // Line 1, char 2 = "Hello\nWo" = index 8
      const result = lineCharToGlobalIndex(runs, 1, 2);

      expect(result).toBe(8);
    });
  });

  describe('hasRichStyles()', () => {
    it('should return false for plain text runs', () => {
      const runs: TextRun[][] = [[{ text: 'Hello' }]];
      expect(hasRichStyles(runs)).toBe(false);
    });

    it('should return true if any run has style', () => {
      const runs: TextRun[][] = [
        [{ text: 'Normal' }, { text: 'Bold', style: { fontWeight: 'bold' } }]
      ];
      expect(hasRichStyles(runs)).toBe(true);
    });

    it('should return true for subscript/superscript styles', () => {
      const runs: TextRun[][] = [
        [{ text: 'X', style: { baselineShift: 'super' } }]
      ];
      expect(hasRichStyles(runs)).toBe(true);
    });

    it('should return false for runs with empty style objects', () => {
      const runs: TextRun[][] = [[{ text: 'Hello', style: {} }]];
      expect(hasRichStyles(runs)).toBe(false);
    });
  });
});
