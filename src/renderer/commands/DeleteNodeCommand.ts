import { Command } from './Command';
import { Shape } from '../shapes/Shape';
import { Node } from '../shapes/Node';
import { Edge } from '../shapes/Edge';
import { getGraphManager } from '../core/GraphManager';

export interface NodeEdgeContainer {
  addShape(shape: Shape): void;
  removeShape(shape: Shape): void;
  getShapes(): Shape[];
  reorderShapes?(newOrder: Shape[]): void;
}

interface ShapeWithIndex {
  shape: Shape;
  originalIndex: number;
}

/**
 * Command for deleting a graph node and its connected edges
 */
export class DeleteNodeCommand implements Command {
  private connectedEdges: Edge[] = [];
  private nodeInfo: ShapeWithIndex | null = null;
  private edgeInfos: ShapeWithIndex[] = [];

  constructor(
    private container: NodeEdgeContainer,
    private node: Node
  ) {
    // Find and store connected edges and their indices before deletion
    this.captureConnectedEdges();
    this.captureOriginalIndices();
  }

  private captureConnectedEdges(): void {
    const gm = getGraphManager();
    const edgeIds = gm.getEdgeIdsForNode(this.node.id);
    const shapes = this.container.getShapes();

    this.connectedEdges = shapes.filter(
      (s): s is Edge => s.type === 'edge' && edgeIds.includes(s.id)
    );
  }

  private captureOriginalIndices(): void {
    const allShapes = this.container.getShapes();

    // Capture node index
    const nodeIndex = allShapes.indexOf(this.node);
    if (nodeIndex !== -1) {
      this.nodeInfo = { shape: this.node, originalIndex: nodeIndex };
    }

    // Capture edge indices
    this.connectedEdges.forEach(edge => {
      const index = allShapes.indexOf(edge);
      if (index !== -1) {
        this.edgeInfos.push({ shape: edge, originalIndex: index });
      }
    });

    // Sort by original index
    this.edgeInfos.sort((a, b) => a.originalIndex - b.originalIndex);
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

    // Restore z-order if reorderShapes is available
    if (this.container.reorderShapes) {
      const allShapes = [...this.container.getShapes()];

      // Collect all shapes we need to reposition
      const allInfos: ShapeWithIndex[] = [];
      if (this.nodeInfo) {
        allInfos.push(this.nodeInfo);
      }
      allInfos.push(...this.edgeInfos);

      // Remove the shapes we just added (they're at the end)
      allInfos.forEach(info => {
        const idx = allShapes.indexOf(info.shape);
        if (idx !== -1) {
          allShapes.splice(idx, 1);
        }
      });

      // Re-insert at original positions (sorted by originalIndex)
      const sortedInfos = [...allInfos].sort((a, b) => a.originalIndex - b.originalIndex);
      sortedInfos.forEach(info => {
        // Clamp index to valid range
        const insertIdx = Math.min(info.originalIndex, allShapes.length);
        allShapes.splice(insertIdx, 0, info.shape);
      });

      this.container.reorderShapes(allShapes);
    }
  }

  getDescription(): string {
    const edgeCount = this.connectedEdges.length;
    if (edgeCount > 0) {
      return `Delete node "${this.node.label}" and ${edgeCount} edge(s)`;
    }
    return `Delete node "${this.node.label}"`;
  }
}
