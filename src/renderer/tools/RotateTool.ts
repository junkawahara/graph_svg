import { Point } from '../../shared/types';
import { Tool } from './Tool';
import { Shape, normalizeRotation } from '../shapes/Shape';
import { selectionManager } from '../core/SelectionManager';
import { historyManager } from '../core/HistoryManager';
import { editorState } from '../core/EditorState';
import { eventBus } from '../core/EventBus';
import { RotateShapeCommand } from '../commands/RotateShapeCommand';
import { createRotationHandleElement, createRotationGuideLine } from '../handles/Handle';

export interface RotateToolCallbacks {
  findShapeAt: (point: Point) => Shape | null;
  getShapes: () => Shape[];
  getSvgElement: () => SVGSVGElement;
  updateHandles: () => void;
}

/**
 * Tool for rotating shapes
 */
export class RotateTool implements Tool {
  readonly name = 'rotate';

  private isRotating = false;
  private rotatingShape: Shape | null = null;
  private rotationCenter: Point | null = null;
  private startAngle: number = 0;
  private beforeRotation: number = 0;
  private callbacks: RotateToolCallbacks;

  // Rotation handle elements
  private rotationHandleGroup: SVGGElement | null = null;
  private rotationHandle: SVGGElement | null = null;
  private guideLine: SVGLineElement | null = null;
  private handleDistance = 30; // Distance from shape bounds to rotation handle

  constructor(callbacks: RotateToolCallbacks) {
    this.callbacks = callbacks;
  }

  onActivate(): void {
    this.showRotationHandles();
  }

  onDeactivate(): void {
    this.removeRotationHandles();
    this.resetState();
  }

  onMouseDown(point: Point, event: MouseEvent): void {
    // Check if clicking on rotation handle
    if (this.isClickOnRotationHandle(point)) {
      const selectedShapes = selectionManager.getSelection();
      if (selectedShapes.length === 1 && selectedShapes[0].type !== 'edge') {
        this.isRotating = true;
        this.rotatingShape = selectedShapes[0];
        this.rotationCenter = this.rotatingShape.getRotationCenter();
        this.beforeRotation = this.rotatingShape.rotation;

        // Calculate starting angle from center to mouse
        this.startAngle = this.calculateAngle(this.rotationCenter, point);
        return;
      }
    }

    // Otherwise, try to select a shape
    const shape = this.callbacks.findShapeAt(point);

    if (shape && shape.type !== 'edge') {
      if (event.shiftKey) {
        selectionManager.addToSelection(shape);
      } else {
        selectionManager.select(shape);
      }
      this.showRotationHandles();
    } else if (!event.shiftKey) {
      selectionManager.clearSelection();
      this.removeRotationHandles();
    }
  }

  onMouseMove(point: Point, event: MouseEvent): void {
    if (!this.isRotating || !this.rotatingShape || !this.rotationCenter) return;

    // Calculate current angle
    const currentAngle = this.calculateAngle(this.rotationCenter, point);
    let deltaAngle = currentAngle - this.startAngle;

    // Apply snap if Shift is held (45 degree increments)
    if (event.shiftKey) {
      const totalAngle = this.beforeRotation + deltaAngle;
      const snappedAngle = Math.round(totalAngle / 45) * 45;
      deltaAngle = snappedAngle - this.beforeRotation;
    }

    // Calculate new rotation
    const newRotation = normalizeRotation(this.beforeRotation + deltaAngle);

    // Update shape rotation
    this.rotatingShape.setRotation(newRotation);

    // Update rotation handle position
    this.updateRotationHandlePosition();

    // Emit update event for sidebar
    eventBus.emit('shape:updated', this.rotatingShape);
  }

  onMouseUp(_point: Point, _event: MouseEvent): void {
    if (this.isRotating && this.rotatingShape) {
      const afterRotation = this.rotatingShape.rotation;

      // Only create command if rotation actually changed
      if (Math.abs(afterRotation - this.beforeRotation) > 0.1) {
        // Undo visual change first
        this.rotatingShape.setRotation(this.beforeRotation);

        // Create and execute command
        const command = new RotateShapeCommand(
          this.rotatingShape,
          this.beforeRotation,
          afterRotation
        );
        historyManager.execute(command);

        // Update handles
        this.showRotationHandles();
      }
    }

    this.resetState();
  }

  onMouseLeave(): void {
    this.resetState();
  }

  /**
   * Calculate angle from center to point in degrees
   */
  private calculateAngle(center: Point, point: Point): number {
    const dx = point.x - center.x;
    const dy = point.y - center.y;
    return Math.atan2(dy, dx) * 180 / Math.PI;
  }

  /**
   * Check if point is on the rotation handle
   */
  private isClickOnRotationHandle(point: Point): boolean {
    const selectedShapes = selectionManager.getSelection();
    if (selectedShapes.length !== 1 || selectedShapes[0].type === 'edge') return false;

    const shape = selectedShapes[0];
    const handlePos = this.getRotationHandlePosition(shape);

    const dx = point.x - handlePos.x;
    const dy = point.y - handlePos.y;
    return Math.sqrt(dx * dx + dy * dy) <= 10; // 10px tolerance
  }

  /**
   * Get position for rotation handle (above the shape's center)
   */
  private getRotationHandlePosition(shape: Shape): Point {
    const bounds = shape.getBounds();
    const center = shape.getRotationCenter();

    // Position handle above the top of bounds
    return {
      x: center.x,
      y: bounds.y - this.handleDistance
    };
  }

  /**
   * Show rotation handles for selected shape
   */
  private showRotationHandles(): void {
    this.removeRotationHandles();

    const selectedShapes = selectionManager.getSelection();
    if (selectedShapes.length !== 1 || selectedShapes[0].type === 'edge') return;

    const shape = selectedShapes[0];
    const svg = this.callbacks.getSvgElement();
    const handlePos = this.getRotationHandlePosition(shape);
    const center = shape.getRotationCenter();

    // Create group for rotation handle elements
    this.rotationHandleGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    this.rotationHandleGroup.classList.add('rotation-handle-group');

    // Create guide line from center to handle
    this.guideLine = createRotationGuideLine(center.x, center.y, handlePos.x, handlePos.y);
    this.rotationHandleGroup.appendChild(this.guideLine);

    // Create rotation handle
    this.rotationHandle = createRotationHandleElement(handlePos.x, handlePos.y);
    this.rotationHandleGroup.appendChild(this.rotationHandle);

    svg.appendChild(this.rotationHandleGroup);
  }

  /**
   * Update rotation handle position during rotation
   */
  private updateRotationHandlePosition(): void {
    if (!this.rotationHandleGroup || !this.rotatingShape) return;

    const handlePos = this.getRotationHandlePosition(this.rotatingShape);
    const center = this.rotatingShape.getRotationCenter();

    // Update guide line
    if (this.guideLine) {
      this.guideLine.setAttribute('x1', String(center.x));
      this.guideLine.setAttribute('y1', String(center.y));
      this.guideLine.setAttribute('x2', String(handlePos.x));
      this.guideLine.setAttribute('y2', String(handlePos.y));
    }

    // Update handle position
    if (this.rotationHandle) {
      const circle = this.rotationHandle.querySelector('circle');
      if (circle) {
        circle.setAttribute('cx', String(handlePos.x));
        circle.setAttribute('cy', String(handlePos.y));
      }
      // Update arc and arrow positions (simplified - just recreate)
      this.rotationHandle.remove();
      this.rotationHandle = createRotationHandleElement(handlePos.x, handlePos.y);
      this.rotationHandleGroup!.appendChild(this.rotationHandle);
    }
  }

  /**
   * Remove rotation handles
   */
  private removeRotationHandles(): void {
    if (this.rotationHandleGroup) {
      this.rotationHandleGroup.remove();
      this.rotationHandleGroup = null;
      this.rotationHandle = null;
      this.guideLine = null;
    }
  }

  private resetState(): void {
    this.isRotating = false;
    this.rotatingShape = null;
    this.rotationCenter = null;
    this.startAngle = 0;
    this.beforeRotation = 0;
  }
}
