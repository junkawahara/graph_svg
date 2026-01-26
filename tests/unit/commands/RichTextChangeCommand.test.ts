import { describe, it, expect } from 'vitest';
import { RichTextChangeCommand, ClearRichTextCommand } from '../../../src/renderer/commands/RichTextChangeCommand';
import { createTestText } from '../../utils/mock-factories';
import { TextRun, TextRunStyle } from '../../../src/shared/types';

describe('RichTextChangeCommand', () => {
  describe('execute()', () => {
    it('should apply bold style to range', () => {
      const text = createTestText({ content: 'Hello World' });
      const style: TextRunStyle = { fontWeight: 'bold' };
      const command = new RichTextChangeCommand(text, 0, 0, 0, 5, style);

      command.execute();

      expect(text.runs).toBeDefined();
      expect(text.runs![0][0].text).toBe('Hello');
      expect(text.runs![0][0].style?.fontWeight).toBe('bold');
    });

    it('should apply italic style to range', () => {
      const text = createTestText({ content: 'Hello World' });
      const style: TextRunStyle = { fontStyle: 'italic' };
      const command = new RichTextChangeCommand(text, 0, 6, 0, 11, style);

      command.execute();

      expect(text.runs).toBeDefined();
      // Should have 2 runs: "Hello " and "World"
      const lastRun = text.runs![0][text.runs![0].length - 1];
      expect(lastRun.text).toBe('World');
      expect(lastRun.style?.fontStyle).toBe('italic');
    });

    it('should apply underline style to range', () => {
      const text = createTestText({ content: 'Hello' });
      const style: TextRunStyle = { textUnderline: true };
      const command = new RichTextChangeCommand(text, 0, 0, 0, 5, style);

      command.execute();

      expect(text.runs![0][0].style?.textUnderline).toBe(true);
    });

    it('should apply strikethrough style to range', () => {
      const text = createTestText({ content: 'Hello' });
      const style: TextRunStyle = { textStrikethrough: true };
      const command = new RichTextChangeCommand(text, 0, 0, 0, 5, style);

      command.execute();

      expect(text.runs![0][0].style?.textStrikethrough).toBe(true);
    });

    it('should apply fill color to range', () => {
      const text = createTestText({ content: 'Hello' });
      const style: TextRunStyle = { fill: '#ff0000' };
      const command = new RichTextChangeCommand(text, 0, 0, 0, 5, style);

      command.execute();

      expect(text.runs![0][0].style?.fill).toBe('#ff0000');
    });

    it('should apply superscript (baseline-shift: super) to range', () => {
      const text = createTestText({ content: 'X2' });
      const style: TextRunStyle = { baselineShift: 'super' };
      const command = new RichTextChangeCommand(text, 0, 1, 0, 2, style);

      command.execute();

      expect(text.runs).toBeDefined();
      // Find the run with "2"
      const superRun = text.runs![0].find(r => r.text === '2');
      expect(superRun).toBeDefined();
      expect(superRun!.style?.baselineShift).toBe('super');
    });

    it('should apply subscript (baseline-shift: sub) to range', () => {
      const text = createTestText({ content: 'H2O' });
      const style: TextRunStyle = { baselineShift: 'sub' };
      const command = new RichTextChangeCommand(text, 0, 1, 0, 2, style);

      command.execute();

      expect(text.runs).toBeDefined();
      // Find the run with "2"
      const subRun = text.runs![0].find(r => r.text === '2');
      expect(subRun).toBeDefined();
      expect(subRun!.style?.baselineShift).toBe('sub');
    });

    it('should apply style to part of existing rich text', () => {
      const text = createTestText({ content: 'Hello' });
      // First apply bold
      const boldCommand = new RichTextChangeCommand(text, 0, 0, 0, 5, { fontWeight: 'bold' });
      boldCommand.execute();

      // Then apply italic to first 2 characters
      const italicCommand = new RichTextChangeCommand(text, 0, 0, 0, 2, { fontStyle: 'italic' });
      italicCommand.execute();

      expect(text.runs).toBeDefined();
      // Should have "He" with bold+italic and "llo" with just bold
      const firstRun = text.runs![0][0];
      expect(firstRun.text).toBe('He');
      expect(firstRun.style?.fontWeight).toBe('bold');
      expect(firstRun.style?.fontStyle).toBe('italic');
    });
  });

  describe('undo()', () => {
    it('should restore original plain text (no runs)', () => {
      const text = createTestText({ content: 'Hello' });
      const originalRuns = text.runs;

      const command = new RichTextChangeCommand(text, 0, 0, 0, 5, { fontWeight: 'bold' });
      command.execute();
      command.undo();

      expect(text.runs).toBe(originalRuns);
    });

    it('should restore original runs state', () => {
      const text = createTestText({ content: 'Hello World' });

      // First apply bold
      const command1 = new RichTextChangeCommand(text, 0, 0, 0, 5, { fontWeight: 'bold' });
      command1.execute();

      // Then apply italic
      const command2 = new RichTextChangeCommand(text, 0, 6, 0, 11, { fontStyle: 'italic' });
      command2.execute();

      // Undo italic
      command2.undo();

      // Should still have bold but no italic
      const worldRun = text.runs![0].find(r => r.text.includes('World'));
      expect(worldRun?.style?.fontStyle).toBeUndefined();
    });
  });

  describe('execute() after undo()', () => {
    it('should re-apply style (redo behavior)', () => {
      const text = createTestText({ content: 'Hello' });
      const command = new RichTextChangeCommand(text, 0, 0, 0, 5, { fontWeight: 'bold' });

      command.execute();
      command.undo();
      command.execute();

      expect(text.runs![0][0].style?.fontWeight).toBe('bold');
    });

    it('should handle multiple undo/redo cycles', () => {
      const text = createTestText({ content: 'Hello' });
      const command = new RichTextChangeCommand(text, 0, 0, 0, 5, { fontWeight: 'bold' });

      command.execute();
      expect(text.runs![0][0].style?.fontWeight).toBe('bold');

      command.undo();
      expect(text.runs).toBeNull();

      command.execute();
      expect(text.runs![0][0].style?.fontWeight).toBe('bold');
    });
  });

  describe('getDescription()', () => {
    it('should describe applied style', () => {
      const text = createTestText({ content: 'Hello' });
      const command = new RichTextChangeCommand(text, 0, 0, 0, 5, { fontWeight: 'bold' });

      expect(command.getDescription()).toContain('fontWeight');
    });

    it('should include multiple style properties', () => {
      const text = createTestText({ content: 'Hello' });
      const command = new RichTextChangeCommand(text, 0, 0, 0, 5, {
        fontWeight: 'bold',
        fontStyle: 'italic'
      });

      const desc = command.getDescription();
      expect(desc).toContain('fontWeight');
      expect(desc).toContain('fontStyle');
    });
  });

  describe('multi-line text', () => {
    it('should apply style across multiple lines', () => {
      const text = createTestText({ content: 'Line 1\nLine 2' });
      const command = new RichTextChangeCommand(text, 0, 3, 1, 3, { fontWeight: 'bold' });

      command.execute();

      expect(text.runs).toBeDefined();
      expect(text.runs!.length).toBe(2);
    });
  });
});

describe('ClearRichTextCommand', () => {
  describe('execute()', () => {
    it('should clear all rich text formatting', () => {
      const text = createTestText({ content: 'Hello' });

      // First apply some formatting
      const richCommand = new RichTextChangeCommand(text, 0, 0, 0, 5, { fontWeight: 'bold' });
      richCommand.execute();
      expect(text.runs).toBeDefined();

      // Then clear it
      const clearCommand = new ClearRichTextCommand(text);
      clearCommand.execute();

      expect(text.runs).toBeNull();
    });

    it('should do nothing if text has no runs', () => {
      const text = createTestText({ content: 'Hello' });
      expect(text.runs).toBeNull();

      const clearCommand = new ClearRichTextCommand(text);
      clearCommand.execute();

      expect(text.runs).toBeNull();
    });
  });

  describe('undo()', () => {
    it('should restore rich text formatting', () => {
      const text = createTestText({ content: 'Hello' });

      // Apply formatting
      const richCommand = new RichTextChangeCommand(text, 0, 0, 0, 5, { fontWeight: 'bold' });
      richCommand.execute();

      // Clear and undo
      const clearCommand = new ClearRichTextCommand(text);
      clearCommand.execute();
      clearCommand.undo();

      expect(text.runs).toBeDefined();
      expect(text.runs![0][0].style?.fontWeight).toBe('bold');
    });

    it('should restore null runs if originally plain text', () => {
      const text = createTestText({ content: 'Hello' });

      const clearCommand = new ClearRichTextCommand(text);
      clearCommand.execute();
      clearCommand.undo();

      expect(text.runs).toBeNull();
    });
  });

  describe('execute() after undo()', () => {
    it('should clear formatting again (redo behavior)', () => {
      const text = createTestText({ content: 'Hello' });

      // Apply formatting
      const richCommand = new RichTextChangeCommand(text, 0, 0, 0, 5, { fontWeight: 'bold' });
      richCommand.execute();

      // Clear, undo, redo
      const clearCommand = new ClearRichTextCommand(text);
      clearCommand.execute();
      clearCommand.undo();
      clearCommand.execute();

      expect(text.runs).toBeNull();
    });
  });

  describe('getDescription()', () => {
    it('should return descriptive message', () => {
      const text = createTestText({ content: 'Hello' });
      const command = new ClearRichTextCommand(text);

      expect(command.getDescription()).toBe('Clear text formatting');
    });
  });
});
