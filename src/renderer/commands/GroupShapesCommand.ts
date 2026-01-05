import { Command } from './Command';
import { ShapeContainer } from './AddShapeCommand';
import { Shape } from '../shapes/Shape';
import { Group } from '../shapes/Group';
import { selectionManager } from '../core/SelectionManager';
import { generateId, DEFAULT_STYLE } from '../../shared/types';

/**
 * Extended shape container interface with shape ordering support
 */
export interface ShapeContainerWithOrder extends ShapeContainer {
  getShapes(): Shape[];
  reorderShapes?(newOrder: Shape[]): void;
}

/**
 * Command for grouping multiple shapes into a single group
 */
export class GroupShapesCommand implements Command {
  private group: Group | null = null;
  private originalIndices: Map<Shape, number> = new Map();

  constructor(
    private container: ShapeContainerWithOrder,
    private shapes: Shape[]
  ) {
    // Record the original index of each shape
    const allShapes = container.getShapes();
    shapes.forEach(shape => {
      this.originalIndices.set(shape, allShapes.indexOf(shape));
    });
  }

  execute(): void {
    // Create a new group containing the shapes
    this.group = new Group(generateId(), this.shapes, { ...DEFAULT_STYLE });

    // Remove original shapes from canvas (in reverse order to maintain indices)
    const sortedByIndex = [...this.shapes].sort((a, b) =>
      (this.originalIndices.get(b) || 0) - (this.originalIndices.get(a) || 0)
    );

    for (const shape of sortedByIndex) {
      this.container.removeShape(shape);
    }

    // Add the group to the canvas
    this.container.addShape(this.group);

    // Select the new group
    selectionManager.clearSelection();
    selectionManager.select(this.group);
  }

  undo(): void {
    if (!this.group) return;

    // Remove the group from canvas
    this.container.removeShape(this.group);

    // Re-add original shapes in their original order
    const allShapes = this.container.getShapes();
    const sortedByOriginalIndex = [...this.shapes].sort((a, b) =>
      (this.originalIndices.get(a) || 0) - (this.originalIndices.get(b) || 0)
    );

    for (const shape of sortedByOriginalIndex) {
      this.container.addShape(shape);
    }

    // Restore z-order if possible
    if (this.container.reorderShapes) {
      const newAllShapes = this.container.getShapes();
      // Sort to restore original relative positions
      newAllShapes.sort((a, b) => {
        const indexA = this.originalIndices.get(a);
        const indexB = this.originalIndices.get(b);
        if (indexA !== undefined && indexB !== undefined) {
          return indexA - indexB;
        }
        return 0;
      });
      this.container.reorderShapes(newAllShapes);
    }

    // Restore selection
    selectionManager.clearSelection();
    this.shapes.forEach(shape => selectionManager.addToSelection(shape));
  }

  getDescription(): string {
    return `Group ${this.shapes.length} shapes`;
  }
}
