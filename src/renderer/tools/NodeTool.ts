import { Point } from '../../shared/types';
import { Tool } from './Tool';
import { Node } from '../shapes/Node';
import { editorState } from '../core/EditorState';
import { eventBus } from '../core/EventBus';

/**
 * Tool for placing graph nodes
 */
export class NodeTool implements Tool {
  readonly name = 'node';

  private placementPoint: Point | null = null;

  onMouseDown(point: Point, _event: MouseEvent): void {
    // Snap point if enabled
    this.placementPoint = editorState.snapPoint(point);
  }

  onMouseMove(_point: Point, _event: MouseEvent): void {
    // No preview for node tool
  }

  onMouseUp(_point: Point, _event: MouseEvent): void {
    if (!this.placementPoint) return;

    // Create node with empty label using default node size
    const { rx, ry } = editorState.defaultNodeSize;
    const node = Node.fromCenter(
      this.placementPoint,
      '',
      { ...editorState.currentStyle },
      rx,
      ry
    );

    eventBus.emit('shape:added', node);
    this.placementPoint = null;
  }

  onMouseLeave(): void {
    this.placementPoint = null;
  }

  onDeactivate(): void {
    this.placementPoint = null;
  }
}
