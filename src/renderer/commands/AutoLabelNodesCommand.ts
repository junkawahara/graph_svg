import { Command } from './Command';
import { Node } from '../shapes/Node';

interface NodeLabelState {
  node: Node;
  oldLabel: string;
  newLabel: string;
}

/**
 * Command for auto-labeling all nodes sequentially
 */
export class AutoLabelNodesCommand implements Command {
  private labelStates: NodeLabelState[] = [];

  constructor(
    private nodes: Node[],
    private prefix: string,
    private startNumber: number
  ) {
    // Capture current labels and calculate new labels
    this.nodes.forEach((node, index) => {
      this.labelStates.push({
        node,
        oldLabel: node.label,
        newLabel: `${this.prefix}${this.startNumber + index}`
      });
    });
  }

  execute(): void {
    this.labelStates.forEach(state => {
      state.node.label = state.newLabel;
      state.node.updateElement();
    });
  }

  undo(): void {
    this.labelStates.forEach(state => {
      state.node.label = state.oldLabel;
      state.node.updateElement();
    });
  }

  getDescription(): string {
    return `Auto label ${this.nodes.length} nodes`;
  }
}
