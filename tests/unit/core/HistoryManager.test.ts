import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { HistoryManager } from '../../../src/renderer/core/HistoryManager';
import { eventBus } from '../../../src/renderer/core/EventBus';
import { createMockCommand, createMockCommands } from '../../utils/test-helpers';

describe('HistoryManager', () => {
  let historyManager: HistoryManager;
  let emitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    historyManager = new HistoryManager();
    emitSpy = vi.spyOn(eventBus, 'emit');
  });

  afterEach(() => {
    emitSpy.mockRestore();
  });

  describe('execute()', () => {
    it('should call command.execute()', () => {
      const command = createMockCommand();
      historyManager.execute(command);
      expect(command.execute).toHaveBeenCalledTimes(1);
    });

    it('should add command to undo stack', () => {
      const command = createMockCommand();
      historyManager.execute(command);
      expect(historyManager.canUndo()).toBe(true);
    });

    it('should clear redo stack when new command is executed', () => {
      const command1 = createMockCommand();
      const command2 = createMockCommand();

      historyManager.execute(command1);
      historyManager.undo();
      expect(historyManager.canRedo()).toBe(true);

      historyManager.execute(command2);
      expect(historyManager.canRedo()).toBe(false);
    });

    it('should emit history:changed event', () => {
      const command = createMockCommand();
      historyManager.execute(command);

      expect(emitSpy).toHaveBeenCalledWith('history:changed', {
        canUndo: true,
        canRedo: false
      });
    });
  });

  describe('undo()', () => {
    it('should call command.undo()', () => {
      const command = createMockCommand();
      historyManager.execute(command);
      historyManager.undo();
      expect(command.undo).toHaveBeenCalledTimes(1);
    });

    it('should move command to redo stack', () => {
      const command = createMockCommand();
      historyManager.execute(command);
      historyManager.undo();

      expect(historyManager.canUndo()).toBe(false);
      expect(historyManager.canRedo()).toBe(true);
    });

    it('should do nothing when undo stack is empty', () => {
      // Should not throw
      expect(() => historyManager.undo()).not.toThrow();
      expect(historyManager.canUndo()).toBe(false);
      expect(historyManager.canRedo()).toBe(false);
    });

    it('should emit history:changed event', () => {
      const command = createMockCommand();
      historyManager.execute(command);
      emitSpy.mockClear();

      historyManager.undo();

      expect(emitSpy).toHaveBeenCalledWith('history:changed', {
        canUndo: false,
        canRedo: true
      });
    });
  });

  describe('redo()', () => {
    it('should call command.execute()', () => {
      const command = createMockCommand();
      historyManager.execute(command);
      historyManager.undo();

      // Clear the mock to count only redo's execute call
      (command.execute as ReturnType<typeof vi.fn>).mockClear();

      historyManager.redo();
      expect(command.execute).toHaveBeenCalledTimes(1);
    });

    it('should move command back to undo stack', () => {
      const command = createMockCommand();
      historyManager.execute(command);
      historyManager.undo();
      historyManager.redo();

      expect(historyManager.canUndo()).toBe(true);
      expect(historyManager.canRedo()).toBe(false);
    });

    it('should do nothing when redo stack is empty', () => {
      // Should not throw
      expect(() => historyManager.redo()).not.toThrow();
      expect(historyManager.canUndo()).toBe(false);
      expect(historyManager.canRedo()).toBe(false);
    });

    it('should emit history:changed event', () => {
      const command = createMockCommand();
      historyManager.execute(command);
      historyManager.undo();
      emitSpy.mockClear();

      historyManager.redo();

      expect(emitSpy).toHaveBeenCalledWith('history:changed', {
        canUndo: true,
        canRedo: false
      });
    });
  });

  describe('canUndo()', () => {
    it('should return false when undo stack is empty', () => {
      expect(historyManager.canUndo()).toBe(false);
    });

    it('should return true when undo stack has items', () => {
      historyManager.execute(createMockCommand());
      expect(historyManager.canUndo()).toBe(true);
    });
  });

  describe('canRedo()', () => {
    it('should return false when redo stack is empty', () => {
      expect(historyManager.canRedo()).toBe(false);
    });

    it('should return true when redo stack has items', () => {
      historyManager.execute(createMockCommand());
      historyManager.undo();
      expect(historyManager.canRedo()).toBe(true);
    });
  });

  describe('clear()', () => {
    it('should empty both stacks', () => {
      historyManager.execute(createMockCommand());
      historyManager.execute(createMockCommand());
      historyManager.undo();

      expect(historyManager.canUndo()).toBe(true);
      expect(historyManager.canRedo()).toBe(true);

      historyManager.clear();

      expect(historyManager.canUndo()).toBe(false);
      expect(historyManager.canRedo()).toBe(false);
    });

    it('should emit history:changed event', () => {
      historyManager.execute(createMockCommand());
      emitSpy.mockClear();

      historyManager.clear();

      expect(emitSpy).toHaveBeenCalledWith('history:changed', {
        canUndo: false,
        canRedo: false
      });
    });
  });

  describe('History Limit', () => {
    it('should limit undo stack to 100 commands', () => {
      const commands = createMockCommands(105);

      commands.forEach(cmd => historyManager.execute(cmd));

      // After executing 105 commands, only 100 should remain
      // We verify by undoing 100 times
      let undoCount = 0;
      while (historyManager.canUndo()) {
        historyManager.undo();
        undoCount++;
      }

      expect(undoCount).toBe(100);
    });

    it('should remove oldest commands when exceeding limit', () => {
      const commands = createMockCommands(101);

      commands.forEach(cmd => historyManager.execute(cmd));

      // Undo all commands
      while (historyManager.canUndo()) {
        historyManager.undo();
      }

      // The first command (index 0) should not have been undone
      // because it was shifted out when the 101st command was added
      expect(commands[0].undo).not.toHaveBeenCalled();

      // The second command (index 1) should have been undone
      expect(commands[1].undo).toHaveBeenCalled();
    });
  });

  describe('Multiple Operations', () => {
    it('should handle multiple undos correctly', () => {
      const commands = createMockCommands(5);

      commands.forEach(cmd => historyManager.execute(cmd));

      historyManager.undo();
      historyManager.undo();
      historyManager.undo();

      expect(commands[4].undo).toHaveBeenCalled();
      expect(commands[3].undo).toHaveBeenCalled();
      expect(commands[2].undo).toHaveBeenCalled();
      expect(commands[1].undo).not.toHaveBeenCalled();
      expect(commands[0].undo).not.toHaveBeenCalled();
    });

    it('should handle multiple redos correctly', () => {
      const commands = createMockCommands(3);

      commands.forEach(cmd => historyManager.execute(cmd));

      // Undo all
      historyManager.undo();
      historyManager.undo();
      historyManager.undo();

      // Clear execute mock calls from initial execution
      commands.forEach(cmd => (cmd.execute as ReturnType<typeof vi.fn>).mockClear());

      // Redo all
      historyManager.redo();
      historyManager.redo();
      historyManager.redo();

      expect(commands[0].execute).toHaveBeenCalledTimes(1);
      expect(commands[1].execute).toHaveBeenCalledTimes(1);
      expect(commands[2].execute).toHaveBeenCalledTimes(1);
    });

    it('should handle interleaved undo/redo correctly', () => {
      const commands = createMockCommands(3);

      commands.forEach(cmd => historyManager.execute(cmd));

      historyManager.undo(); // undo cmd3
      historyManager.undo(); // undo cmd2
      historyManager.redo(); // redo cmd2
      historyManager.undo(); // undo cmd2 again

      expect(commands[2].undo).toHaveBeenCalledTimes(1);
      expect(commands[1].undo).toHaveBeenCalledTimes(2);
      expect(commands[0].undo).not.toHaveBeenCalled();
    });

    it('should restore state after undo followed by redo', () => {
      const command = createMockCommand();

      historyManager.execute(command);
      historyManager.undo();
      historyManager.redo();

      // execute called twice: once on initial execute, once on redo
      expect(command.execute).toHaveBeenCalledTimes(2);
      expect(command.undo).toHaveBeenCalledTimes(1);
      expect(historyManager.canUndo()).toBe(true);
      expect(historyManager.canRedo()).toBe(false);
    });
  });

  describe('Event Payload', () => {
    it('should include correct canUndo and canRedo in payload after execute', () => {
      historyManager.execute(createMockCommand());

      expect(emitSpy).toHaveBeenLastCalledWith('history:changed', {
        canUndo: true,
        canRedo: false
      });
    });

    it('should include correct canUndo and canRedo in payload after undo', () => {
      historyManager.execute(createMockCommand());
      historyManager.execute(createMockCommand());
      historyManager.undo();

      expect(emitSpy).toHaveBeenLastCalledWith('history:changed', {
        canUndo: true,
        canRedo: true
      });
    });

    it('should include correct canUndo and canRedo in payload after all undos', () => {
      historyManager.execute(createMockCommand());
      historyManager.undo();

      expect(emitSpy).toHaveBeenLastCalledWith('history:changed', {
        canUndo: false,
        canRedo: true
      });
    });
  });
});
