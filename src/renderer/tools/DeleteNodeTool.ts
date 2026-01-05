import { Point } from '../../shared/types';
import { Tool } from './Tool';
import { Node } from '../shapes/Node';
import { eventBus } from '../core/EventBus';

/**
 * Tool for deleting graph nodes (and their connected edges)
 */
export class DeleteNodeTool implements Tool {
  readonly name = 'delete-node';

  private findNodeAt: ((point: Point) => Node | null) | null = null;
  private hoveredNode: Node | null = null;

  constructor(options: {
    findNodeAt: (point: Point) => Node | null;
  }) {
    this.findNodeAt = options.findNodeAt;
  }

  onMouseDown(_point: Point, _event: MouseEvent): void {
    // No action on mouse down
  }

  onMouseMove(point: Point, _event: MouseEvent): void {
    if (!this.findNodeAt) return;

    const node = this.findNodeAt(point);

    // Update hover highlight
    if (node !== this.hoveredNode) {
      if (this.hoveredNode?.element) {
        this.hoveredNode.element.classList.remove('node-delete-hover');
      }
      if (node?.element) {
        node.element.classList.add('node-delete-hover');
      }
      this.hoveredNode = node;
    }
  }

  onMouseUp(point: Point, _event: MouseEvent): void {
    if (!this.findNodeAt) return;

    const node = this.findNodeAt(point);
    if (node) {
      eventBus.emit('node:delete', node);
    }
  }

  onMouseLeave(): void {
    if (this.hoveredNode?.element) {
      this.hoveredNode.element.classList.remove('node-delete-hover');
    }
    this.hoveredNode = null;
  }

  onDeactivate(): void {
    this.onMouseLeave();
  }
}
