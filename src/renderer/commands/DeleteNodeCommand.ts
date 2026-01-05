import { Command } from './Command';
import { Shape } from '../shapes/Shape';
import { Node } from '../shapes/Node';
import { Edge } from '../shapes/Edge';
import { getGraphManager } from '../core/GraphManager';

export interface NodeEdgeContainer {
  addShape(shape: Shape): void;
  removeShape(shape: Shape): void;
  getShapes(): Shape[];
}

/**
 * Command for deleting a graph node and its connected edges
 */
export class DeleteNodeCommand implements Command {
  private connectedEdges: Edge[] = [];

  constructor(
    private container: NodeEdgeContainer,
    private node: Node
  ) {
    // Find and store connected edges before deletion
    this.captureConnectedEdges();
  }

  private captureConnectedEdges(): void {
    const gm = getGraphManager();
    const edgeIds = gm.getEdgeIdsForNode(this.node.id);
    const shapes = this.container.getShapes();

    this.connectedEdges = shapes.filter(
      (s): s is Edge => s.type === 'edge' && edgeIds.includes(s.id)
    );
  }

  execute(): void {
    const gm = getGraphManager();

    // Remove connected edges first
    this.connectedEdges.forEach(edge => {
      this.container.removeShape(edge);
      gm.unregisterEdge(edge.id);
    });

    // Remove the node
    this.container.removeShape(this.node);
    gm.unregisterNode(this.node.id);
  }

  undo(): void {
    const gm = getGraphManager();

    // Re-add the node first
    this.container.addShape(this.node);
    gm.registerNode(this.node.id);
    gm.setNodeShape(this.node.id, this.node);

    // Re-add connected edges
    this.connectedEdges.forEach(edge => {
      this.container.addShape(edge);
      gm.registerEdge(edge.id, edge.sourceNodeId, edge.targetNodeId);
    });
  }

  getDescription(): string {
    const edgeCount = this.connectedEdges.length;
    if (edgeCount > 0) {
      return `Delete node "${this.node.label}" and ${edgeCount} edge(s)`;
    }
    return `Delete node "${this.node.label}"`;
  }
}
