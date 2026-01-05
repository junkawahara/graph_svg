import { Point } from '../../shared/types';
import { Tool } from './Tool';
import { Edge } from '../shapes/Edge';
import { eventBus } from '../core/EventBus';

/**
 * Tool for deleting graph edges
 */
export class DeleteEdgeTool implements Tool {
  readonly name = 'delete-edge';

  private findEdgeAt: ((point: Point) => Edge | null) | null = null;
  private hoveredEdge: Edge | null = null;

  constructor(options: {
    findEdgeAt: (point: Point) => Edge | null;
  }) {
    this.findEdgeAt = options.findEdgeAt;
  }

  onMouseDown(_point: Point, _event: MouseEvent): void {
    // No action on mouse down
  }

  onMouseMove(point: Point, _event: MouseEvent): void {
    if (!this.findEdgeAt) return;

    const edge = this.findEdgeAt(point);

    // Update hover highlight
    if (edge !== this.hoveredEdge) {
      if (this.hoveredEdge?.element) {
        this.hoveredEdge.element.classList.remove('edge-delete-hover');
      }
      if (edge?.element) {
        edge.element.classList.add('edge-delete-hover');
      }
      this.hoveredEdge = edge;
    }
  }

  onMouseUp(point: Point, _event: MouseEvent): void {
    if (!this.findEdgeAt) return;

    const edge = this.findEdgeAt(point);
    if (edge) {
      eventBus.emit('edge:delete', edge);
    }
  }

  onMouseLeave(): void {
    if (this.hoveredEdge?.element) {
      this.hoveredEdge.element.classList.remove('edge-delete-hover');
    }
    this.hoveredEdge = null;
  }

  onDeactivate(): void {
    this.onMouseLeave();
  }
}
