import { Command } from './Command';
import { Edge } from '../shapes/Edge';

interface EdgeLabelState {
  edge: Edge;
  oldLabel: string | undefined;
  newLabel: string;
}

/**
 * Command for auto-labeling all edges sequentially
 */
export class AutoLabelEdgesCommand implements Command {
  private labelStates: EdgeLabelState[] = [];

  constructor(
    private edges: Edge[],
    private prefix: string,
    private startNumber: number
  ) {
    // Capture current labels and calculate new labels
    this.edges.forEach((edge, index) => {
      this.labelStates.push({
        edge,
        oldLabel: edge.label,
        newLabel: `${this.prefix}${this.startNumber + index}`
      });
    });
  }

  execute(): void {
    this.labelStates.forEach(state => {
      state.edge.setLabel(state.newLabel);
    });
  }

  undo(): void {
    this.labelStates.forEach(state => {
      state.edge.setLabel(state.oldLabel);
    });
  }

  getDescription(): string {
    return `Auto label ${this.edges.length} edges`;
  }
}
