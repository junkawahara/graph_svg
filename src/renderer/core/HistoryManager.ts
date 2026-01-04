import { Command } from '../commands/Command';
import { eventBus } from './EventBus';

/**
 * Manages command history for Undo/Redo functionality
 */
export class HistoryManager {
  private undoStack: Command[] = [];
  private redoStack: Command[] = [];
  private maxHistory: number = 100;

  /**
   * Execute a command and add it to history
   */
  execute(command: Command): void {
    command.execute();
    this.undoStack.push(command);

    // Clear redo stack when new command is executed
    this.redoStack = [];

    // Limit history size
    if (this.undoStack.length > this.maxHistory) {
      this.undoStack.shift();
    }

    this.emitChange();
  }

  /**
   * Undo the last command
   */
  undo(): void {
    const command = this.undoStack.pop();
    if (command) {
      command.undo();
      this.redoStack.push(command);
      this.emitChange();
    }
  }

  /**
   * Redo the last undone command
   */
  redo(): void {
    const command = this.redoStack.pop();
    if (command) {
      command.execute();
      this.undoStack.push(command);
      this.emitChange();
    }
  }

  /**
   * Check if undo is available
   */
  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  /**
   * Check if redo is available
   */
  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /**
   * Clear all history
   */
  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.emitChange();
  }

  /**
   * Emit history change event
   */
  private emitChange(): void {
    eventBus.emit('history:changed', {
      canUndo: this.canUndo(),
      canRedo: this.canRedo()
    });
  }
}

// Global history manager instance
export const historyManager = new HistoryManager();
