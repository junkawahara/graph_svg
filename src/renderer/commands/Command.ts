/**
 * Command interface for Undo/Redo pattern
 */
export interface Command {
  /** Execute the command */
  execute(): void;

  /** Undo the command */
  undo(): void;

  /** Optional: Get description for debugging/display */
  getDescription?(): string;
}
