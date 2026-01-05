import { Point } from '../../shared/types';
import { Tool } from './Tool';
import { Node } from '../shapes/Node';
import { NodeInputDialog } from '../components/NodeInputDialog';
import { editorState } from '../core/EditorState';
import { eventBus } from '../core/EventBus';

/**
 * Tool for placing graph nodes
 */
export class NodeTool implements Tool {
  readonly name = 'node';

  private placementPoint: Point | null = null;
  private dialog: NodeInputDialog;
  private isDialogOpen = false;

  constructor() {
    this.dialog = new NodeInputDialog();
  }

  onMouseDown(point: Point, _event: MouseEvent): void {
    // Snap point if enabled
    this.placementPoint = editorState.snapPoint(point);
  }

  onMouseMove(_point: Point, _event: MouseEvent): void {
    // No preview for node tool
  }

  async onMouseUp(_point: Point, _event: MouseEvent): Promise<void> {
    if (!this.placementPoint) return;
    if (this.isDialogOpen) return;

    // Use the original click point
    const placement = this.placementPoint;
    this.placementPoint = null;

    // Show dialog for label input
    this.isDialogOpen = true;
    const result = await this.dialog.show(placement);
    this.isDialogOpen = false;

    if (result !== null) {
      // Create node shape
      const node = Node.fromCenter(
        placement,
        result.label,
        { ...editorState.currentStyle }
      );

      eventBus.emit('shape:added', node);
    }
  }

  onMouseLeave(): void {
    this.placementPoint = null;
  }

  onDeactivate(): void {
    this.placementPoint = null;
  }
}
