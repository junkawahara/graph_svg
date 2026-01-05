import { Command } from './Command';
import { Node } from '../shapes/Node';
import { getGraphManager } from '../core/GraphManager';

export interface NodeContainer {
  addShape(shape: Node): void;
  removeShape(shape: Node): void;
}

/**
 * Command for adding a graph node to the canvas
 * Handles GraphManager registration/unregistration for undo/redo
 */
export class AddNodeCommand implements Command {
  constructor(
    private container: NodeContainer,
    private node: Node
  ) {}

  execute(): void {
    this.container.addShape(this.node);
    // Node registers itself with GraphManager in render()
  }

  undo(): void {
    this.container.removeShape(this.node);
    // Unregister from GraphManager
    getGraphManager().unregisterNode(this.node.id);
  }

  getDescription(): string {
    return `Add node "${this.node.label}"`;
  }
}
