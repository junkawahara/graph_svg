import { Point, generateId } from '../../shared/types';
import { Tool } from './Tool';
import { Text } from '../shapes/Text';
import { TextInputDialog } from '../components/TextInputDialog';
import { editorState } from '../core/EditorState';
import { eventBus } from '../core/EventBus';

/**
 * Tool for placing text
 */
export class TextTool implements Tool {
  readonly name = 'text';

  private placementPoint: Point | null = null;
  private dialog: TextInputDialog;
  private isDialogOpen = false;

  constructor() {
    this.dialog = new TextInputDialog();
  }

  onMouseDown(point: Point, _event: MouseEvent): void {
    this.placementPoint = editorState.snapPoint(point);
  }

  onMouseMove(_point: Point, _event: MouseEvent): void {
    // No preview for text tool
  }

  async onMouseUp(point: Point, _event: MouseEvent): Promise<void> {
    if (!this.placementPoint) return;
    if (this.isDialogOpen) return;

    // Use the original click point
    const placement = this.placementPoint;
    this.placementPoint = null;

    // Show dialog
    this.isDialogOpen = true;
    const result = await this.dialog.show(placement);
    this.isDialogOpen = false;

    if (result) {
      // Create text shape with text-specific defaults (black fill, no stroke)
      const text = new Text(
        generateId(),
        placement.x,
        placement.y,
        result.content,
        result.fontSize,
        result.fontFamily,
        result.fontWeight,
        { ...editorState.currentStyle, fill: '#000000', fillNone: false, strokeWidth: 0 }
      );

      eventBus.emit('shape:added', text);
    }
  }

  onMouseLeave(): void {
    this.placementPoint = null;
  }

  onDeactivate(): void {
    this.placementPoint = null;
  }
}
