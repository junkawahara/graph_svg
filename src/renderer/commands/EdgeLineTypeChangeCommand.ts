import { Command } from './Command';
import { Edge } from '../shapes/Edge';
import { EdgeLineType, PathCommand } from '../../shared/types';
import { getGraphManager } from '../core/GraphManager';
import { eventBus } from '../core/EventBus';
import { selectionManager } from '../core/SelectionManager';

/**
 * Command for changing edge line type
 */
export class EdgeLineTypeChangeCommand implements Command {
  private beforeLineType: EdgeLineType;
  private beforePathCommands: PathCommand[];

  constructor(
    private edge: Edge,
    private newLineType: EdgeLineType
  ) {
    this.beforeLineType = edge.lineType;
    this.beforePathCommands = [...edge.pathCommands];
  }

  execute(): void {
    // When switching to 'path' type, initialize path commands from current geometry
    if (this.newLineType === 'path' && this.edge.pathCommands.length === 0) {
      this.edge.initializePathFromCurrentGeometry();
    }

    this.edge.setLineType(this.newLineType);

    // Trigger selection changed to update handles
    eventBus.emit('selection:changed', selectionManager.getSelection());
  }

  undo(): void {
    this.edge.lineType = this.beforeLineType;
    this.edge.pathCommands = [...this.beforePathCommands];
    this.edge.updateElement();

    // Trigger selection changed to update handles
    eventBus.emit('selection:changed', selectionManager.getSelection());
  }

  getDescription(): string {
    const gm = getGraphManager();
    const sourceNode = gm.getNodeShape(this.edge.sourceNodeId);
    const targetNode = gm.getNodeShape(this.edge.targetNodeId);
    const sourceLabel = sourceNode?.label || this.edge.sourceNodeId;
    const targetLabel = targetNode?.label || this.edge.targetNodeId;
    return `Change edge "${sourceLabel}" → "${targetLabel}" line type to ${this.newLineType}`;
  }
}
