import { Command } from './Command';
import { Node } from '../shapes/Node';

export interface NodePropertyUpdates {
  label?: string;
  fontSize?: number;
  rx?: number;
  ry?: number;
}

/**
 * Command for changing node properties
 */
export class NodeLabelChangeCommand implements Command {
  private beforeState: NodePropertyUpdates;
  private afterState: NodePropertyUpdates;

  constructor(
    private node: Node,
    updates: NodePropertyUpdates
  ) {
    // Capture before state
    this.beforeState = {
      label: node.label,
      fontSize: node.fontSize,
      rx: node.rx,
      ry: node.ry
    };

    // Calculate after state
    this.afterState = { ...this.beforeState, ...updates };
  }

  execute(): void {
    this.applyState(this.afterState);
  }

  undo(): void {
    this.applyState(this.beforeState);
  }

  private applyState(state: NodePropertyUpdates): void {
    if (state.label !== undefined) this.node.label = state.label;
    if (state.fontSize !== undefined) this.node.fontSize = state.fontSize;
    if (state.rx !== undefined) this.node.rx = state.rx;
    if (state.ry !== undefined) this.node.ry = state.ry;
    this.node.updateElement();
  }

  getDescription(): string {
    return `Change node "${this.node.label}" properties`;
  }
}
