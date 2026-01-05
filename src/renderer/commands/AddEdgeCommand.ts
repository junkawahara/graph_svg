import { Command } from './Command';
import { Edge } from '../shapes/Edge';
import { getGraphManager } from '../core/GraphManager';

export interface EdgeContainer {
  addShape(shape: Edge): void;
  removeShape(shape: Edge): void;
}

/**
 * Command for adding a graph edge to the canvas
 * Handles GraphManager registration/unregistration for undo/redo
 */
export class AddEdgeCommand implements Command {
  constructor(
    private container: EdgeContainer,
    private edge: Edge
  ) {}

  execute(): void {
    this.container.addShape(this.edge);
    // Edge registers itself with GraphManager in render()
  }

  undo(): void {
    this.container.removeShape(this.edge);
    // Unregister from GraphManager
    getGraphManager().unregisterEdge(this.edge.id);
  }

  getDescription(): string {
    const gm = getGraphManager();
    const sourceNode = gm.getNodeShape(this.edge.sourceNodeId);
    const targetNode = gm.getNodeShape(this.edge.targetNodeId);
    const sourceLabel = sourceNode?.label || this.edge.sourceNodeId;
    const targetLabel = targetNode?.label || this.edge.targetNodeId;
    return `Add edge "${sourceLabel}" → "${targetLabel}"`;
  }
}
