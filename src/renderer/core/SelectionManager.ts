import { Shape } from '../shapes/Shape';
import { eventBus } from './EventBus';

/**
 * Manages shape selection state
 */
export class SelectionManager {
  private selectedShapes: Set<Shape> = new Set();

  /**
   * Select a single shape (clears previous selection)
   */
  select(shape: Shape): void {
    this.clearSelection();
    this.selectedShapes.add(shape);
    this.updateVisuals();
    eventBus.emit('selection:changed', this.getSelection());
  }

  /**
   * Add shape to selection (multi-select)
   */
  addToSelection(shape: Shape): void {
    this.selectedShapes.add(shape);
    this.updateVisuals();
    eventBus.emit('selection:changed', this.getSelection());
  }

  /**
   * Remove shape from selection
   */
  removeFromSelection(shape: Shape): void {
    this.selectedShapes.delete(shape);
    this.updateVisuals();
    eventBus.emit('selection:changed', this.getSelection());
  }

  /**
   * Toggle shape selection
   */
  toggleSelection(shape: Shape): void {
    if (this.selectedShapes.has(shape)) {
      this.selectedShapes.delete(shape);
    } else {
      this.selectedShapes.add(shape);
    }
    this.updateVisuals();
    eventBus.emit('selection:changed', this.getSelection());
  }

  /**
   * Clear all selection
   */
  clearSelection(): void {
    if (this.selectedShapes.size === 0) return;

    // Remove visual indicators
    this.selectedShapes.forEach(shape => {
      shape.element?.classList.remove('selected');
    });

    this.selectedShapes.clear();
    eventBus.emit('selection:changed', this.getSelection());
  }

  /**
   * Check if shape is selected
   */
  isSelected(shape: Shape): boolean {
    return this.selectedShapes.has(shape);
  }

  /**
   * Get all selected shapes
   */
  getSelection(): Shape[] {
    return Array.from(this.selectedShapes);
  }

  /**
   * Check if there is any selection
   */
  hasSelection(): boolean {
    return this.selectedShapes.size > 0;
  }

  /**
   * Get selection count
   */
  getSelectionCount(): number {
    return this.selectedShapes.size;
  }

  /**
   * Update visual indicators for selected shapes
   */
  private updateVisuals(): void {
    this.selectedShapes.forEach(shape => {
      shape.element?.classList.add('selected');
    });
  }
}

// Global selection manager instance
export const selectionManager = new SelectionManager();
