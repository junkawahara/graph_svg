/**
 * Command for deleting a point from a path
 * Works with both Path shapes and Edge shapes (lineType='path')
 */

import { Command } from './Command';
import { Path } from '../shapes/Path';
import { Edge } from '../shapes/Edge';
import { Shape } from '../shapes/Shape';
import { PathCommand } from '../../shared/types';

/**
 * Interface for shapes that support path point operations
 */
interface PathPointEditable {
  insertCommand(index: number, command: PathCommand): void;
  removeCommand(index: number): PathCommand | null;
  canRemoveCommand(index: number): boolean;
  getCommand(index: number): PathCommand | null;
}

/**
 * Get shape as PathPointEditable
 */
function asPathPointEditable(shape: Shape): PathPointEditable | null {
  if (shape.type === 'path') {
    return shape as Path;
  } else if (shape.type === 'edge') {
    const edge = shape as Edge;
    if (edge.lineType === 'path') {
      return edge;
    }
  }
  return null;
}

export class DeletePathPointCommand implements Command {
  private shape: Shape;
  private commandIndex: number;

  // State for undo
  private removedCommand: PathCommand | null = null;

  constructor(shape: Shape, commandIndex: number) {
    this.shape = shape;
    this.commandIndex = commandIndex;
  }

  execute(): void {
    const editable = asPathPointEditable(this.shape);
    if (!editable) return;

    // Check if we can remove this command
    if (!editable.canRemoveCommand(this.commandIndex)) {
      console.warn('Cannot remove command at index', this.commandIndex);
      return;
    }

    // Store the removed command for undo
    const cmd = editable.getCommand(this.commandIndex);
    if (cmd) {
      this.removedCommand = { ...cmd } as PathCommand;
    }

    // Remove the command
    editable.removeCommand(this.commandIndex);
  }

  undo(): void {
    if (!this.removedCommand) return;

    const editable = asPathPointEditable(this.shape);
    if (!editable) return;

    // Re-insert the removed command
    editable.insertCommand(this.commandIndex, this.removedCommand);
  }

  getDescription(): string {
    return 'Delete path point';
  }
}
