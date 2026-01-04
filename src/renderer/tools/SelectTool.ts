import { Point } from '../../shared/types';
import { Tool } from './Tool';
import { Shape } from '../shapes/Shape';
import { Handle } from '../handles/Handle';
import { selectionManager } from '../core/SelectionManager';
import { eventBus } from '../core/EventBus';

export interface SelectToolCallbacks {
  findShapeAt: (point: Point) => Shape | null;
  findHandleAt: (point: Point) => Handle | null;
  updateHandles: () => void;
}

/**
 * Tool for selecting, moving, and resizing shapes
 */
export class SelectTool implements Tool {
  readonly name = 'select';

  private isDragging = false;
  private isResizing = false;
  private dragStartPoint: Point | null = null;
  private draggedShape: Shape | null = null;
  private activeHandle: Handle | null = null;
  private callbacks: SelectToolCallbacks;

  constructor(callbacks: SelectToolCallbacks) {
    this.callbacks = callbacks;
  }

  onMouseDown(point: Point, event: MouseEvent): void {
    // First, check if clicking on a handle
    const handle = this.callbacks.findHandleAt(point);
    if (handle) {
      this.isResizing = true;
      this.activeHandle = handle;
      this.dragStartPoint = point;
      return;
    }

    const shape = this.callbacks.findShapeAt(point);

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
    // Handle resizing
    if (this.isResizing && this.activeHandle) {
      this.activeHandle.onDrag(point);
      this.callbacks.updateHandles();
      return;
    }

    // Handle dragging
    if (!this.isDragging || !this.dragStartPoint || !this.draggedShape) return;

    // Calculate delta
    const dx = point.x - this.dragStartPoint.x;
    const dy = point.y - this.dragStartPoint.y;

    // Move all selected shapes
    const selectedShapes = selectionManager.getSelection();
    selectedShapes.forEach(shape => {
      shape.move(dx, dy);
    });

    // Update handles
    this.callbacks.updateHandles();

    // Update drag start point for next move
    this.dragStartPoint = point;
  }

  onMouseUp(_point: Point, _event: MouseEvent): void {
    this.isDragging = false;
    this.isResizing = false;
    this.dragStartPoint = null;
    this.draggedShape = null;
    this.activeHandle = null;
  }

  onMouseLeave(): void {
    this.isDragging = false;
    this.isResizing = false;
    this.dragStartPoint = null;
    this.draggedShape = null;
    this.activeHandle = null;
  }

  onDeactivate(): void {
    this.isDragging = false;
    this.isResizing = false;
    this.dragStartPoint = null;
    this.draggedShape = null;
    this.activeHandle = null;
  }
}
