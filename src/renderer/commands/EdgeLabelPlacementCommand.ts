import { Command } from './Command';
import { Edge } from '../shapes/Edge';
import { EdgeLabelPlacement } from '../../shared/types';

/**
 * Command for changing edge label placement
 */
export class EdgeLabelPlacementCommand implements Command {
  private beforeState: EdgeLabelPlacement;
  private afterState: EdgeLabelPlacement;

  constructor(
    private edge: Edge,
    newPlacement: EdgeLabelPlacement
  ) {
    // Capture before state
    this.beforeState = { ...edge.labelPlacement };
    // Set after state
    this.afterState = { ...newPlacement };
  }

  execute(): void {
    this.edge.labelPlacement = { ...this.afterState };
    this.edge.updateElement();
  }

  undo(): void {
    this.edge.labelPlacement = { ...this.beforeState };
    this.edge.updateElement();
  }

  getDescription(): string {
    return `Change edge label placement`;
  }
}
