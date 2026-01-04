import { Point } from '../../shared/types';
import { Tool } from './Tool';
import { Shape } from '../shapes/Shape';
import { Handle } from '../handles/Handle';
import { selectionManager } from '../core/SelectionManager';
import { historyManager } from '../core/HistoryManager';
import { MoveShapeCommand } from '../commands/MoveShapeCommand';
import { ResizeShapeCommand } from '../commands/ResizeShapeCommand';

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
  private dragOriginPoint: Point | null = null;  // Original start for total delta
  private draggedShape: Shape | null = null;
  private activeHandle: Handle | null = null;
  private resizeShape: Shape | null = null;
  private resizeBeforeState: any = null;
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

      // Get the shape being resized and save its state
      const selectedShapes = selectionManager.getSelection();
      if (selectedShapes.length === 1) {
        this.resizeShape = selectedShapes[0];
        this.resizeBeforeState = ResizeShapeCommand.captureState(this.resizeShape);
      }
      return;
    }

    const shape = this.callbacks.findShapeAt(point);

    if (shape) {
      // Check if clicking on already selected shape
      if (selectionManager.isSelected(shape)) {
        // Start dragging
        this.isDragging = true;
        this.dragStartPoint = point;
        this.dragOriginPoint = point;
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
        this.dragOriginPoint = point;
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

    // Calculate delta from last position
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

  onMouseUp(point: Point, _event: MouseEvent): void {
    // Create move command if we were dragging
    if (this.isDragging && this.dragOriginPoint) {
      const totalDx = point.x - this.dragOriginPoint.x;
      const totalDy = point.y - this.dragOriginPoint.y;

      // Only create command if actually moved
      if (Math.abs(totalDx) > 1 || Math.abs(totalDy) > 1) {
        const selectedShapes = selectionManager.getSelection();
        if (selectedShapes.length > 0) {
          // Undo the visual move first (shapes already moved during drag)
          selectedShapes.forEach(shape => {
            shape.move(-totalDx, -totalDy);
          });

          // Create and execute command (this will redo the move via execute)
          const command = new MoveShapeCommand([...selectedShapes], totalDx, totalDy);
          historyManager.execute(command);

          // Update handles
          this.callbacks.updateHandles();
        }
      }
    }

    // Create resize command if we were resizing
    if (this.isResizing && this.resizeShape && this.resizeBeforeState) {
      const afterState = ResizeShapeCommand.captureState(this.resizeShape);

      // Check if actually changed
      const hasChanged = JSON.stringify(this.resizeBeforeState) !== JSON.stringify(afterState);
      if (hasChanged) {
        // Undo the visual resize first
        const tempCommand = new ResizeShapeCommand(
          this.resizeShape,
          afterState,
          this.resizeBeforeState
        );
        tempCommand.execute(); // This restores to before state

        // Create and execute the actual command
        const command = new ResizeShapeCommand(
          this.resizeShape,
          this.resizeBeforeState,
          afterState
        );
        historyManager.execute(command);

        // Update handles
        this.callbacks.updateHandles();
      }
    }

    this.resetState();
  }

  onMouseLeave(): void {
    this.resetState();
  }

  onDeactivate(): void {
    this.resetState();
  }

  private resetState(): void {
    this.isDragging = false;
    this.isResizing = false;
    this.dragStartPoint = null;
    this.dragOriginPoint = null;
    this.draggedShape = null;
    this.activeHandle = null;
    this.resizeShape = null;
    this.resizeBeforeState = null;
  }
}
