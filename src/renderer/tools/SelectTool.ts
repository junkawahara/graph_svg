import { Point, Bounds } from '../../shared/types';
import { Tool } from './Tool';
import { Shape } from '../shapes/Shape';
import { Node } from '../shapes/Node';
import { Handle } from '../handles/Handle';
import { selectionManager } from '../core/SelectionManager';
import { historyManager } from '../core/HistoryManager';
import { editorState } from '../core/EditorState';
import { eventBus } from '../core/EventBus';
import { getGraphManager } from '../core/GraphManager';
import { MoveShapeCommand } from '../commands/MoveShapeCommand';
import { ResizeShapeCommand } from '../commands/ResizeShapeCommand';

export interface SelectToolCallbacks {
  findShapeAt: (point: Point) => Shape | null;
  findHandleAt: (point: Point) => Handle | null;
  updateHandles: () => void;
  getShapes: () => Shape[];
  getSvgElement: () => SVGSVGElement;
}

/**
 * Check if bounds1 is completely contained within bounds2
 */
function isContainedIn(inner: Bounds, outer: Bounds): boolean {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.width <= outer.x + outer.width &&
    inner.y + inner.height <= outer.y + outer.height
  );
}

/**
 * Check if two bounds intersect
 */
function boundsIntersect(a: Bounds, b: Bounds): boolean {
  return !(
    a.x + a.width < b.x ||
    b.x + b.width < a.x ||
    a.y + a.height < b.y ||
    b.y + b.height < a.y
  );
}

/**
 * Tool for selecting, moving, and resizing shapes
 */
export class SelectTool implements Tool {
  readonly name = 'select';

  private isDragging = false;
  private isResizing = false;
  private isMarqueeSelecting = false;
  private dragStartPoint: Point | null = null;
  private dragOriginPoint: Point | null = null;  // Original start for total delta
  private draggedShape: Shape | null = null;
  private activeHandle: Handle | null = null;
  private resizeShape: Shape | null = null;
  private resizeBeforeState: any = null;
  private marqueeRect: SVGRectElement | null = null;
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
      this.dragStartPoint = editorState.snapPoint(point);

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
      const snappedPoint = editorState.snapPoint(point);
      // Check if clicking on already selected shape
      if (selectionManager.isSelected(shape)) {
        // Start dragging
        this.isDragging = true;
        this.dragStartPoint = snappedPoint;
        this.dragOriginPoint = snappedPoint;
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
        this.dragStartPoint = snappedPoint;
        this.dragOriginPoint = snappedPoint;
        this.draggedShape = shape;
      }
    } else {
      // Clicked on empty area - start marquee selection
      if (!event.shiftKey) {
        selectionManager.clearSelection();
      }
      this.startMarqueeSelection(point);
    }
  }

  onMouseMove(point: Point, event: MouseEvent): void {
    // Handle marquee selection
    if (this.isMarqueeSelecting && this.dragStartPoint) {
      this.updateMarqueeRect(point, event.altKey);
      return;
    }

    // Handle resizing
    if (this.isResizing && this.activeHandle && this.resizeShape) {
      const snappedPoint = editorState.snapPoint(point);
      this.activeHandle.onDrag(snappedPoint);
      this.callbacks.updateHandles();
      // Update connected edges if resizing a graph node
      if (this.resizeShape instanceof Node) {
        getGraphManager().updateEdgesForNode(this.resizeShape.id);
      }
      // Emit shape updated event for sidebar sync
      eventBus.emit('shape:updated', this.resizeShape);
      return;
    }

    // Handle dragging
    if (!this.isDragging || !this.dragStartPoint || !this.draggedShape) return;

    // Apply snap to point
    const snappedPoint = editorState.snapPoint(point);

    // Calculate delta from last position
    const dx = snappedPoint.x - this.dragStartPoint.x;
    const dy = snappedPoint.y - this.dragStartPoint.y;

    // Move all selected shapes
    const selectedShapes = selectionManager.getSelection();
    const gm = getGraphManager();
    selectedShapes.forEach(shape => {
      shape.move(dx, dy);
      // Update connected edges if this is a graph node
      if (shape instanceof Node) {
        gm.updateEdgesForNode(shape.id);
      }
      // Emit shape updated event for sidebar sync
      eventBus.emit('shape:updated', shape);
    });

    // Update handles
    this.callbacks.updateHandles();

    // Update drag start point for next move
    this.dragStartPoint = snappedPoint;
  }

  onMouseUp(point: Point, event: MouseEvent): void {
    // Handle marquee selection completion
    if (this.isMarqueeSelecting && this.dragStartPoint) {
      this.completeMarqueeSelection(point, event.shiftKey, event.altKey);
      this.resetState();
      return;
    }

    // Create move command if we were dragging
    if (this.isDragging && this.dragOriginPoint) {
      const snappedPoint = editorState.snapPoint(point);
      const totalDx = snappedPoint.x - this.dragOriginPoint.x;
      const totalDy = snappedPoint.y - this.dragOriginPoint.y;

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

  /**
   * Start marquee selection
   */
  private startMarqueeSelection(point: Point): void {
    this.isMarqueeSelecting = true;
    this.dragStartPoint = point;

    // Create marquee rectangle
    const svg = this.callbacks.getSvgElement();
    this.marqueeRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    this.marqueeRect.setAttribute('x', String(point.x));
    this.marqueeRect.setAttribute('y', String(point.y));
    this.marqueeRect.setAttribute('width', '0');
    this.marqueeRect.setAttribute('height', '0');
    this.marqueeRect.classList.add('marquee-selection');
    svg.appendChild(this.marqueeRect);
  }

  /**
   * Update marquee rectangle during drag
   */
  private updateMarqueeRect(point: Point, isIntersectionMode: boolean): void {
    if (!this.marqueeRect || !this.dragStartPoint) return;

    const x = Math.min(this.dragStartPoint.x, point.x);
    const y = Math.min(this.dragStartPoint.y, point.y);
    const width = Math.abs(point.x - this.dragStartPoint.x);
    const height = Math.abs(point.y - this.dragStartPoint.y);

    this.marqueeRect.setAttribute('x', String(x));
    this.marqueeRect.setAttribute('y', String(y));
    this.marqueeRect.setAttribute('width', String(width));
    this.marqueeRect.setAttribute('height', String(height));

    // Visual feedback for intersection mode
    if (isIntersectionMode) {
      this.marqueeRect.classList.add('intersection-mode');
    } else {
      this.marqueeRect.classList.remove('intersection-mode');
    }
  }

  /**
   * Complete marquee selection and select shapes
   */
  private completeMarqueeSelection(point: Point, addToSelection: boolean, intersectionMode: boolean): void {
    if (!this.dragStartPoint) return;

    // Calculate selection bounds
    const selectionBounds: Bounds = {
      x: Math.min(this.dragStartPoint.x, point.x),
      y: Math.min(this.dragStartPoint.y, point.y),
      width: Math.abs(point.x - this.dragStartPoint.x),
      height: Math.abs(point.y - this.dragStartPoint.y)
    };

    // Remove marquee rectangle
    if (this.marqueeRect) {
      this.marqueeRect.remove();
      this.marqueeRect = null;
    }

    // Don't select if too small (just a click)
    if (selectionBounds.width < 3 && selectionBounds.height < 3) {
      return;
    }

    // Find shapes within selection
    const shapes = this.callbacks.getShapes();
    const selectedShapes: Shape[] = [];

    shapes.forEach(shape => {
      const shapeBounds = shape.getBounds();

      if (intersectionMode) {
        // Alt key: select if intersecting
        if (boundsIntersect(shapeBounds, selectionBounds)) {
          selectedShapes.push(shape);
        }
      } else {
        // Default: select if completely contained
        if (isContainedIn(shapeBounds, selectionBounds)) {
          selectedShapes.push(shape);
        }
      }
    });

    // Select the shapes
    if (addToSelection) {
      // Add to existing selection
      selectedShapes.forEach(shape => {
        selectionManager.addToSelection(shape);
      });
    } else {
      // Replace selection
      if (selectedShapes.length > 0) {
        selectionManager.select(selectedShapes[0]);
        for (let i = 1; i < selectedShapes.length; i++) {
          selectionManager.addToSelection(selectedShapes[i]);
        }
      }
    }
  }

  private resetState(): void {
    this.isDragging = false;
    this.isResizing = false;
    this.isMarqueeSelecting = false;
    this.dragStartPoint = null;
    this.dragOriginPoint = null;
    this.draggedShape = null;
    this.activeHandle = null;
    this.resizeShape = null;
    this.resizeBeforeState = null;

    // Clean up marquee rect if exists
    if (this.marqueeRect) {
      this.marqueeRect.remove();
      this.marqueeRect = null;
    }
  }
}
