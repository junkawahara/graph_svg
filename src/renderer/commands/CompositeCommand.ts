import { Command } from './Command';

/**
 * A command that executes multiple commands as a single undoable operation
 */
export class CompositeCommand implements Command {
  constructor(
    private commands: Command[],
    private description: string
  ) {}

  execute(): void {
    this.commands.forEach(cmd => cmd.execute());
  }

  undo(): void {
    // Undo in reverse order
    for (let i = this.commands.length - 1; i >= 0; i--) {
      this.commands[i].undo();
    }
  }

  getDescription(): string {
    return this.description;
  }
}
