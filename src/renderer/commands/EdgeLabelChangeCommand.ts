import { Command } from './Command';
import { Edge } from '../shapes/Edge';
import { getGraphManager } from '../core/GraphManager';

/**
 * Command for changing edge label
 */
export class EdgeLabelChangeCommand implements Command {
  private beforeLabel: string | undefined;

  constructor(
    private edge: Edge,
    private newLabel: string | undefined
  ) {
    this.beforeLabel = edge.label;
  }

  execute(): void {
    this.edge.setLabel(this.newLabel);
  }

  undo(): void {
    this.edge.setLabel(this.beforeLabel);
  }

  getDescription(): string {
    const gm = getGraphManager();
    const sourceNode = gm.getNodeShape(this.edge.sourceNodeId);
    const targetNode = gm.getNodeShape(this.edge.targetNodeId);
    const sourceLabel = sourceNode?.label || this.edge.sourceNodeId;
    const targetLabel = targetNode?.label || this.edge.targetNodeId;
    return `Change edge "${sourceLabel}" → "${targetLabel}" label`;
  }
}
