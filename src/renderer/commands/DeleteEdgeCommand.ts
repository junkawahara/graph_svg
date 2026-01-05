import { Command } from './Command';
import { Edge } from '../shapes/Edge';
import { getGraphManager } from '../core/GraphManager';

export interface EdgeContainer {
  addShape(shape: Edge): void;
  removeShape(shape: Edge): void;
}

/**
 * Command for deleting a graph edge
 */
export class DeleteEdgeCommand implements Command {
  constructor(
    private container: EdgeContainer,
    private edge: Edge
  ) {}

  execute(): void {
    this.container.removeShape(this.edge);
    getGraphManager().unregisterEdge(this.edge.id);
  }

  undo(): void {
    this.container.addShape(this.edge);
    getGraphManager().registerEdge(
      this.edge.id,
      this.edge.sourceNodeId,
      this.edge.targetNodeId
    );
  }

  getDescription(): string {
    const gm = getGraphManager();
    const sourceNode = gm.getNodeShape(this.edge.sourceNodeId);
    const targetNode = gm.getNodeShape(this.edge.targetNodeId);
    const sourceLabel = sourceNode?.label || this.edge.sourceNodeId;
    const targetLabel = targetNode?.label || this.edge.targetNodeId;
    return `Delete edge "${sourceLabel}" → "${targetLabel}"`;
  }
}
