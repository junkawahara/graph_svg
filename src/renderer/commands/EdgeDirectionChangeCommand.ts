import { Command } from './Command';
import { Edge } from '../shapes/Edge';
import { EdgeDirection } from '../../shared/types';
import { getGraphManager } from '../core/GraphManager';

/**
 * Command for changing edge direction
 */
export class EdgeDirectionChangeCommand implements Command {
  private beforeDirection: EdgeDirection;

  constructor(
    private edge: Edge,
    private newDirection: EdgeDirection
  ) {
    this.beforeDirection = edge.direction;
  }

  execute(): void {
    this.edge.direction = this.newDirection;
    this.edge.updateElement();
  }

  undo(): void {
    this.edge.direction = this.beforeDirection;
    this.edge.updateElement();
  }

  getDescription(): string {
    const gm = getGraphManager();
    const sourceNode = gm.getNodeShape(this.edge.sourceNodeId);
    const targetNode = gm.getNodeShape(this.edge.targetNodeId);
    const sourceLabel = sourceNode?.label || this.edge.sourceNodeId;
    const targetLabel = targetNode?.label || this.edge.targetNodeId;
    return `Change edge "${sourceLabel}" → "${targetLabel}" direction`;
  }
}
