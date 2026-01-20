import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RotateShapeCommand } from '../../../src/renderer/commands/RotateShapeCommand';
import { eventBus } from '../../../src/renderer/core/EventBus';
import {
  createTestRectangle,
  createTestEllipse,
  createTestLine
} from '../../utils/mock-factories';
import { expectClose } from '../../utils/shape-comparators';

describe('RotateShapeCommand', () => {
  let emitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    emitSpy = vi.spyOn(eventBus, 'emit');
  });

  afterEach(() => {
    emitSpy.mockRestore();
  });

  describe('execute()', () => {
    it('should set rotation to afterAngle', () => {
      const rect = createTestRectangle({ rotation: 0 });
      const command = new RotateShapeCommand(rect, 0, 45);

      command.execute();

      expectClose(rect.rotation, 45);
    });

    it('should rotate to negative angle (normalized to 0-360)', () => {
      const rect = createTestRectangle({ rotation: 0 });
      const command = new RotateShapeCommand(rect, 0, -30);

      command.execute();

      // -30 is normalized to 330 (360 - 30)
      expectClose(rect.rotation, 330);
    });

    it('should rotate from non-zero angle', () => {
      const rect = createTestRectangle({ rotation: 45 });
      const command = new RotateShapeCommand(rect, 45, 90);

      command.execute();

      expectClose(rect.rotation, 90);
    });

    it('should rotate to 360 degrees (normalized to 0)', () => {
      const rect = createTestRectangle({ rotation: 0 });
      const command = new RotateShapeCommand(rect, 0, 360);

      command.execute();

      // 360 is normalized to 0
      expectClose(rect.rotation, 0);
    });

    it('should rotate ellipse', () => {
      const ellipse = createTestEllipse({ rotation: 0 });
      const command = new RotateShapeCommand(ellipse, 0, 60);

      command.execute();

      expectClose(ellipse.rotation, 60);
    });

    it('should rotate line', () => {
      const line = createTestLine({ rotation: 0 });
      const command = new RotateShapeCommand(line, 0, 120);

      command.execute();

      expectClose(line.rotation, 120);
    });

    it('should emit shape:updated event', () => {
      const rect = createTestRectangle();
      const command = new RotateShapeCommand(rect, 0, 45);

      command.execute();

      expect(emitSpy).toHaveBeenCalledWith('shape:updated', rect);
    });
  });

  describe('undo()', () => {
    it('should restore rotation to beforeAngle', () => {
      const rect = createTestRectangle({ rotation: 0 });
      const command = new RotateShapeCommand(rect, 0, 45);

      command.execute();
      command.undo();

      expectClose(rect.rotation, 0);
    });

    it('should restore negative angle (normalized)', () => {
      // Start with 330 (equivalent to -30)
      const rect = createTestRectangle({ rotation: 330 });
      const command = new RotateShapeCommand(rect, 330, 60);

      command.execute();
      command.undo();

      expectClose(rect.rotation, 330);
    });

    it('should restore non-zero angle', () => {
      const rect = createTestRectangle({ rotation: 45 });
      const command = new RotateShapeCommand(rect, 45, 90);

      command.execute();
      command.undo();

      expectClose(rect.rotation, 45);
    });

    it('should emit shape:updated event on undo', () => {
      const rect = createTestRectangle();
      const command = new RotateShapeCommand(rect, 0, 45);

      command.execute();
      emitSpy.mockClear();
      command.undo();

      expect(emitSpy).toHaveBeenCalledWith('shape:updated', rect);
    });
  });

  describe('execute() after undo()', () => {
    it('should re-apply rotation (redo behavior)', () => {
      const rect = createTestRectangle({ rotation: 0 });
      const command = new RotateShapeCommand(rect, 0, 45);

      command.execute();
      command.undo();
      command.execute();

      expectClose(rect.rotation, 45);
    });

    it('should handle multiple undo/redo cycles', () => {
      const rect = createTestRectangle({ rotation: 0 });
      const command = new RotateShapeCommand(rect, 0, 90);

      command.execute();
      expectClose(rect.rotation, 90);

      command.undo();
      expectClose(rect.rotation, 0);

      command.execute();
      expectClose(rect.rotation, 90);

      command.undo();
      expectClose(rect.rotation, 0);
    });

    it('should handle sequential rotations', () => {
      const rect = createTestRectangle({ rotation: 0 });

      const cmd1 = new RotateShapeCommand(rect, 0, 30);
      cmd1.execute();
      expectClose(rect.rotation, 30);

      const cmd2 = new RotateShapeCommand(rect, 30, 60);
      cmd2.execute();
      expectClose(rect.rotation, 60);

      const cmd3 = new RotateShapeCommand(rect, 60, 90);
      cmd3.execute();
      expectClose(rect.rotation, 90);

      // Undo all
      cmd3.undo();
      expectClose(rect.rotation, 60);

      cmd2.undo();
      expectClose(rect.rotation, 30);

      cmd1.undo();
      expectClose(rect.rotation, 0);
    });
  });

  describe('getDescription()', () => {
    it('should describe rotation from 0 to 45', () => {
      const rect = createTestRectangle();
      const command = new RotateShapeCommand(rect, 0, 45);

      expect(command.getDescription()).toBe('Rotate shape from 0° to 45°');
    });

    it('should describe rotation with negative angles', () => {
      const rect = createTestRectangle();
      const command = new RotateShapeCommand(rect, -30, 60);

      expect(command.getDescription()).toBe('Rotate shape from -30° to 60°');
    });

    it('should describe rotation from non-zero angle', () => {
      const rect = createTestRectangle();
      const command = new RotateShapeCommand(rect, 45, 90);

      expect(command.getDescription()).toBe('Rotate shape from 45° to 90°');
    });
  });
});
