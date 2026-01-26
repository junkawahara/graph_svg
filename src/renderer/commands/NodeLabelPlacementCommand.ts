import { Command } from './Command';
import { Node } from '../shapes/Node';
import { NodeLabelPlacement } from '../../shared/types';

/**
 * Command for changing node label placement
 */
export class NodeLabelPlacementCommand implements Command {
  private beforeState: NodeLabelPlacement;
  private afterState: NodeLabelPlacement;

  constructor(
    private node: Node,
    newPlacement: NodeLabelPlacement
  ) {
    // Capture before state
    this.beforeState = { ...node.labelPlacement };
    // Set after state
    this.afterState = { ...newPlacement };
  }

  execute(): void {
    this.node.labelPlacement = { ...this.afterState };
    this.node.updateElement();
  }

  undo(): void {
    this.node.labelPlacement = { ...this.beforeState };
    this.node.updateElement();
  }

  getDescription(): string {
    return `Change node "${this.node.label}" label placement`;
  }
}
