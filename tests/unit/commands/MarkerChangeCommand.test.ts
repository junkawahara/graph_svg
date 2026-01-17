import { describe, it, expect } from 'vitest';
import { MarkerChangeCommand } from '../../../src/renderer/commands/MarkerChangeCommand';
import { createTestLine, createTestPath } from '../../utils/mock-factories';

describe('MarkerChangeCommand', () => {
  describe('execute() with Line', () => {
    it('should change markerStart', () => {
      const line = createTestLine({ markerStart: 'none', markerEnd: 'none' });
      const command = new MarkerChangeCommand(line, { markerStart: 'arrow-medium' });

      command.execute();

      expect(line.markerStart).toBe('arrow-medium');
    });

    it('should change markerEnd', () => {
      const line = createTestLine({ markerStart: 'none', markerEnd: 'none' });
      const command = new MarkerChangeCommand(line, { markerEnd: 'triangle-large' });

      command.execute();

      expect(line.markerEnd).toBe('triangle-large');
    });

    it('should change both markers', () => {
      const line = createTestLine({ markerStart: 'none', markerEnd: 'none' });
      const command = new MarkerChangeCommand(line, {
        markerStart: 'circle-small',
        markerEnd: 'diamond-medium'
      });

      command.execute();

      expect(line.markerStart).toBe('circle-small');
      expect(line.markerEnd).toBe('diamond-medium');
    });

    it('should preserve unchanged marker', () => {
      const line = createTestLine({ markerStart: 'arrow-small', markerEnd: 'triangle-large' });
      const command = new MarkerChangeCommand(line, { markerEnd: 'circle-medium' });

      command.execute();

      expect(line.markerStart).toBe('arrow-small');
      expect(line.markerEnd).toBe('circle-medium');
    });

    it('should set marker to none', () => {
      const line = createTestLine({ markerStart: 'arrow-medium', markerEnd: 'arrow-medium' });
      const command = new MarkerChangeCommand(line, { markerStart: 'none', markerEnd: 'none' });

      command.execute();

      expect(line.markerStart).toBe('none');
      expect(line.markerEnd).toBe('none');
    });
  });

  describe('execute() with Path', () => {
    it('should change markerStart on path', () => {
      const path = createTestPath({ markerStart: 'none', markerEnd: 'none' });
      const command = new MarkerChangeCommand(path, { markerStart: 'arrow-large' });

      command.execute();

      expect(path.markerStart).toBe('arrow-large');
    });

    it('should change markerEnd on path', () => {
      const path = createTestPath({ markerStart: 'none', markerEnd: 'none' });
      const command = new MarkerChangeCommand(path, { markerEnd: 'triangle-small' });

      command.execute();

      expect(path.markerEnd).toBe('triangle-small');
    });
  });

  describe('undo()', () => {
    it('should restore original markerStart', () => {
      const line = createTestLine({ markerStart: 'arrow-small', markerEnd: 'none' });
      const command = new MarkerChangeCommand(line, { markerStart: 'circle-large' });

      command.execute();
      command.undo();

      expect(line.markerStart).toBe('arrow-small');
    });

    it('should restore original markerEnd', () => {
      const line = createTestLine({ markerStart: 'none', markerEnd: 'triangle-medium' });
      const command = new MarkerChangeCommand(line, { markerEnd: 'diamond-small' });

      command.execute();
      command.undo();

      expect(line.markerEnd).toBe('triangle-medium');
    });

    it('should restore both markers', () => {
      const line = createTestLine({ markerStart: 'arrow-small', markerEnd: 'triangle-large' });
      const command = new MarkerChangeCommand(line, {
        markerStart: 'circle-medium',
        markerEnd: 'diamond-medium'
      });

      command.execute();
      command.undo();

      expect(line.markerStart).toBe('arrow-small');
      expect(line.markerEnd).toBe('triangle-large');
    });

    it('should restore none marker', () => {
      const line = createTestLine({ markerStart: 'none', markerEnd: 'none' });
      const command = new MarkerChangeCommand(line, {
        markerStart: 'arrow-medium',
        markerEnd: 'arrow-medium'
      });

      command.execute();
      command.undo();

      expect(line.markerStart).toBe('none');
      expect(line.markerEnd).toBe('none');
    });
  });

  describe('execute() after undo()', () => {
    it('should re-apply marker changes (redo behavior)', () => {
      const line = createTestLine({ markerStart: 'none', markerEnd: 'none' });
      const command = new MarkerChangeCommand(line, {
        markerStart: 'arrow-medium',
        markerEnd: 'triangle-large'
      });

      command.execute();
      command.undo();
      command.execute();

      expect(line.markerStart).toBe('arrow-medium');
      expect(line.markerEnd).toBe('triangle-large');
    });

    it('should handle multiple undo/redo cycles', () => {
      const line = createTestLine({ markerStart: 'none', markerEnd: 'none' });
      const command = new MarkerChangeCommand(line, { markerEnd: 'arrow-medium' });

      command.execute();
      expect(line.markerEnd).toBe('arrow-medium');

      command.undo();
      expect(line.markerEnd).toBe('none');

      command.execute();
      expect(line.markerEnd).toBe('arrow-medium');

      command.undo();
      expect(line.markerEnd).toBe('none');
    });
  });

  describe('getDescription()', () => {
    it('should describe markerStart change', () => {
      const line = createTestLine();
      const command = new MarkerChangeCommand(line, { markerStart: 'arrow-medium' });

      expect(command.getDescription()).toBe('Change marker: markerStart');
    });

    it('should describe markerEnd change', () => {
      const line = createTestLine();
      const command = new MarkerChangeCommand(line, { markerEnd: 'arrow-medium' });

      expect(command.getDescription()).toBe('Change marker: markerEnd');
    });

    it('should describe both marker changes', () => {
      const line = createTestLine();
      const command = new MarkerChangeCommand(line, {
        markerStart: 'arrow-small',
        markerEnd: 'arrow-large'
      });

      const desc = command.getDescription();
      expect(desc).toContain('markerStart');
      expect(desc).toContain('markerEnd');
    });
  });
});
