import { Point } from '../../shared/types';
import { Tool } from './Tool';
import { Shape } from '../shapes/Shape';
import { selectionManager } from '../core/SelectionManager';

/**
 * Tool for selecting and moving shapes
 */
export class SelectTool implements Tool {
  readonly name = 'select';

  private isDragging = false;
  private dragStartPoint: Point | null = null;
  private draggedShape: Shape | null = null;
  private findShapeAt: (point: Point) => Shape | null;

  constructor(findShapeAt: (point: Point) => Shape | null) {
    this.findShapeAt = findShapeAt;
  }

  onMouseDown(point: Point, event: MouseEvent): void {
    const shape = this.findShapeAt(point);

    if (shape) {
      // Check if clicking on already selected shape
      if (selectionManager.isSelected(shape)) {
        // Start dragging
        this.isDragging = true;
        this.dragStartPoint = point;
        this.draggedShape = shape;
      } else {
        // Select the shape
        if (event.shiftKey) {
          // Multi-select with shift
          selectionManager.addToSelection(shape);
        } else {
          selectionManager.select(shape);
        }
        // Start dragging immediately
        this.isDragging = true;
        this.dragStartPoint = point;
        this.draggedShape = shape;
      }
    } else {
      // Clicked on empty area - clear selection
      selectionManager.clearSelection();
    }
  }

  onMouseMove(point: Point, _event: MouseEvent): void {
    if (!this.isDragging || !this.dragStartPoint || !this.draggedShape) return;

    // Calculate delta
    const dx = point.x - this.dragStartPoint.x;
    const dy = point.y - this.dragStartPoint.y;

    // Move all selected shapes
    const selectedShapes = selectionManager.getSelection();
    selectedShapes.forEach(shape => {
      shape.move(dx, dy);
    });

    // Update drag start point for next move
    this.dragStartPoint = point;
  }

  onMouseUp(_point: Point, _event: MouseEvent): void {
    this.isDragging = false;
    this.dragStartPoint = null;
    this.draggedShape = null;
  }

  onMouseLeave(): void {
    this.isDragging = false;
    this.dragStartPoint = null;
    this.draggedShape = null;
  }

  onDeactivate(): void {
    this.isDragging = false;
    this.dragStartPoint = null;
    this.draggedShape = null;
  }
}
