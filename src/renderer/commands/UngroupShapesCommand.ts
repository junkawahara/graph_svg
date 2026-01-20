import { Command } from './Command';
import { ShapeContainer } from './AddShapeCommand';
import { Shape } from '../shapes/Shape';
import { Group } from '../shapes/Group';

/**
 * Extended shape container interface with shape ordering support
 */
export interface ShapeContainerWithOrder extends ShapeContainer {
  getShapes(): Shape[];
  reorderShapes?(newOrder: Shape[]): void;
}

/**
 * Command for ungrouping a group back into individual shapes
 */
export class UngroupShapesCommand implements Command {
  private children: Shape[] = [];
  private groupIndex: number = -1;

  constructor(
    private container: ShapeContainerWithOrder,
    private group: Group,
    private onSelectionChange?: (shapes: Shape[]) => void
  ) {
    // Store children before ungrouping
    this.children = [...group.getChildren()];
    // Record the group's position in the shapes array
    const allShapes = container.getShapes();
    this.groupIndex = allShapes.indexOf(group);
  }

  execute(): void {
    // Remove the group from canvas
    this.container.removeShape(this.group);

    // Add child shapes to canvas
    for (const child of this.children) {
      this.container.addShape(child);
    }

    // Restore z-order: place children where the group was
    if (this.container.reorderShapes && this.groupIndex >= 0) {
      const allShapes = [...this.container.getShapes()];

      // Remove children from end (they were just added)
      this.children.forEach(child => {
        const idx = allShapes.indexOf(child);
        if (idx !== -1) {
          allShapes.splice(idx, 1);
        }
      });

      // Insert children at group's original position
      const insertIdx = Math.min(this.groupIndex, allShapes.length);
      allShapes.splice(insertIdx, 0, ...this.children);
      this.container.reorderShapes(allShapes);
    }

    // Notify selection change via callback
    this.onSelectionChange?.(this.children);
  }

  undo(): void {
    // Remove child shapes from canvas
    for (const child of this.children) {
      this.container.removeShape(child);
    }

    // Re-add the group
    this.container.addShape(this.group);

    // Restore z-order if possible
    if (this.container.reorderShapes && this.groupIndex >= 0) {
      const allShapes = this.container.getShapes();
      // Move the group to its original position
      const currentIndex = allShapes.indexOf(this.group);
      if (currentIndex !== -1 && currentIndex !== this.groupIndex) {
        allShapes.splice(currentIndex, 1);
        allShapes.splice(Math.min(this.groupIndex, allShapes.length), 0, this.group);
        this.container.reorderShapes(allShapes);
      }
    }

    // Notify selection change via callback
    this.onSelectionChange?.([this.group]);
  }

  getDescription(): string {
    return `Ungroup ${this.children.length} shapes`;
  }
}
