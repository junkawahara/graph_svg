import { Command } from './Command';
import { Edge } from '../shapes/Edge';
import { getGraphManager } from '../core/GraphManager';

/**
 * Command for changing edge curve amount
 */
export class EdgeCurveAmountChangeCommand implements Command {
  private beforeCurveAmount: number;

  constructor(
    private edge: Edge,
    private newCurveAmount: number
  ) {
    this.beforeCurveAmount = edge.curveAmount;
  }

  execute(): void {
    this.edge.setCurveAmount(this.newCurveAmount);
  }

  undo(): void {
    this.edge.setCurveAmount(this.beforeCurveAmount);
  }

  getDescription(): string {
    const gm = getGraphManager();
    const sourceNode = gm.getNodeShape(this.edge.sourceNodeId);
    const targetNode = gm.getNodeShape(this.edge.targetNodeId);
    const sourceLabel = sourceNode?.label || this.edge.sourceNodeId;
    const targetLabel = targetNode?.label || this.edge.targetNodeId;
    return `Change edge "${sourceLabel}" → "${targetLabel}" curve amount to ${this.newCurveAmount}`;
  }
}
