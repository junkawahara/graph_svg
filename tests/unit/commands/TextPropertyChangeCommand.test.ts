import { describe, it, expect } from 'vitest';
import { TextPropertyChangeCommand } from '../../../src/renderer/commands/TextPropertyChangeCommand';
import { createTestText } from '../../utils/mock-factories';

describe('TextPropertyChangeCommand', () => {
  describe('execute()', () => {
    it('should change text content', () => {
      const text = createTestText({ content: 'Original' });
      const command = new TextPropertyChangeCommand(text, { content: 'Updated' });

      command.execute();

      expect(text.content).toBe('Updated');
    });

    it('should change fontSize', () => {
      const text = createTestText({ fontSize: 16 });
      const command = new TextPropertyChangeCommand(text, { fontSize: 24 });

      command.execute();

      expect(text.fontSize).toBe(24);
    });

    it('should change fontFamily', () => {
      const text = createTestText({ fontFamily: 'Arial' });
      const command = new TextPropertyChangeCommand(text, { fontFamily: 'Times New Roman' });

      command.execute();

      expect(text.fontFamily).toBe('Times New Roman');
    });

    it('should change fontWeight', () => {
      const text = createTestText({ fontWeight: 'normal' });
      const command = new TextPropertyChangeCommand(text, { fontWeight: 'bold' });

      command.execute();

      expect(text.fontWeight).toBe('bold');
    });

    it('should change fontStyle', () => {
      const text = createTestText({ fontStyle: 'normal' });
      const command = new TextPropertyChangeCommand(text, { fontStyle: 'italic' });

      command.execute();

      expect(text.fontStyle).toBe('italic');
    });

    it('should change textAnchor', () => {
      const text = createTestText({ textAnchor: 'start' });
      const command = new TextPropertyChangeCommand(text, { textAnchor: 'middle' });

      command.execute();

      expect(text.textAnchor).toBe('middle');
    });

    it('should change textUnderline', () => {
      const text = createTestText({ textUnderline: false });
      const command = new TextPropertyChangeCommand(text, { textUnderline: true });

      command.execute();

      expect(text.textUnderline).toBe(true);
    });

    it('should change textStrikethrough', () => {
      const text = createTestText({ textStrikethrough: false });
      const command = new TextPropertyChangeCommand(text, { textStrikethrough: true });

      command.execute();

      expect(text.textStrikethrough).toBe(true);
    });

    it('should change lineHeight', () => {
      const text = createTestText({ lineHeight: 1.2 });
      const command = new TextPropertyChangeCommand(text, { lineHeight: 1.5 });

      command.execute();

      expect(text.lineHeight).toBe(1.5);
    });

    it('should change multiple properties at once', () => {
      const text = createTestText({
        content: 'Original',
        fontSize: 16,
        fontWeight: 'normal'
      });
      const command = new TextPropertyChangeCommand(text, {
        content: 'Updated',
        fontSize: 24,
        fontWeight: 'bold'
      });

      command.execute();

      expect(text.content).toBe('Updated');
      expect(text.fontSize).toBe(24);
      expect(text.fontWeight).toBe('bold');
    });

    it('should preserve unchanged properties', () => {
      const text = createTestText({
        content: 'Test',
        fontSize: 16,
        fontFamily: 'Arial',
        fontWeight: 'normal'
      });
      const command = new TextPropertyChangeCommand(text, { fontSize: 24 });

      command.execute();

      expect(text.content).toBe('Test');
      expect(text.fontSize).toBe(24);
      expect(text.fontFamily).toBe('Arial');
      expect(text.fontWeight).toBe('normal');
    });
  });

  describe('undo()', () => {
    it('should restore original content', () => {
      const text = createTestText({ content: 'Original' });
      const command = new TextPropertyChangeCommand(text, { content: 'Updated' });

      command.execute();
      command.undo();

      expect(text.content).toBe('Original');
    });

    it('should restore original fontSize', () => {
      const text = createTestText({ fontSize: 16 });
      const command = new TextPropertyChangeCommand(text, { fontSize: 24 });

      command.execute();
      command.undo();

      expect(text.fontSize).toBe(16);
    });

    it('should restore original fontWeight', () => {
      const text = createTestText({ fontWeight: 'normal' });
      const command = new TextPropertyChangeCommand(text, { fontWeight: 'bold' });

      command.execute();
      command.undo();

      expect(text.fontWeight).toBe('normal');
    });

    it('should restore multiple properties', () => {
      const text = createTestText({
        content: 'Original',
        fontSize: 16,
        fontWeight: 'normal'
      });
      const command = new TextPropertyChangeCommand(text, {
        content: 'Updated',
        fontSize: 24,
        fontWeight: 'bold'
      });

      command.execute();
      command.undo();

      expect(text.content).toBe('Original');
      expect(text.fontSize).toBe(16);
      expect(text.fontWeight).toBe('normal');
    });

    it('should only restore changed properties', () => {
      const text = createTestText({
        content: 'Test',
        fontSize: 16,
        fontFamily: 'Arial'
      });
      const command = new TextPropertyChangeCommand(text, { fontSize: 24 });

      command.execute();
      // Manually change fontFamily (simulating another operation)
      text.fontFamily = 'Times New Roman';

      command.undo();

      expect(text.fontSize).toBe(16);
      // fontFamily should remain changed since it wasn't part of this command
      expect(text.fontFamily).toBe('Times New Roman');
    });
  });

  describe('execute() after undo()', () => {
    it('should re-apply changes (redo behavior)', () => {
      const text = createTestText({ content: 'Original', fontSize: 16 });
      const command = new TextPropertyChangeCommand(text, { content: 'Updated', fontSize: 24 });

      command.execute();
      command.undo();
      command.execute();

      expect(text.content).toBe('Updated');
      expect(text.fontSize).toBe(24);
    });

    it('should handle multiple undo/redo cycles', () => {
      const text = createTestText({ content: 'Original' });
      const command = new TextPropertyChangeCommand(text, { content: 'Updated' });

      command.execute();
      expect(text.content).toBe('Updated');

      command.undo();
      expect(text.content).toBe('Original');

      command.execute();
      expect(text.content).toBe('Updated');

      command.undo();
      expect(text.content).toBe('Original');
    });
  });

  describe('getDescription()', () => {
    it('should list changed property for single change', () => {
      const text = createTestText();
      const command = new TextPropertyChangeCommand(text, { content: 'New' });

      expect(command.getDescription()).toBe('Change text content');
    });

    it('should list changed properties for multiple changes', () => {
      const text = createTestText();
      const command = new TextPropertyChangeCommand(text, { content: 'New', fontSize: 24 });

      const desc = command.getDescription();
      expect(desc).toContain('content');
      expect(desc).toContain('fontSize');
    });

    it('should describe fontSize change', () => {
      const text = createTestText();
      const command = new TextPropertyChangeCommand(text, { fontSize: 24 });

      expect(command.getDescription()).toBe('Change text fontSize');
    });
  });
});
