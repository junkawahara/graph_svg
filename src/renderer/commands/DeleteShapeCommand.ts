import { Command } from './Command';
import { Shape } from '../shapes/Shape';
import { ShapeContainerWithOrder } from './UngroupShapesCommand';

interface ShapeWithIndex {
  shape: Shape;
  originalIndex: number;
}

/**
 * Command for deleting shapes from the canvas (supports undo/redo)
 */
export class DeleteShapeCommand implements Command {
  private shapeInfos: ShapeWithIndex[] = [];

  constructor(
    private container: ShapeContainerWithOrder,
    shapes: Shape[]
  ) {
    // Capture original indices for z-order preservation
    const allShapes = container.getShapes();
    shapes.forEach(shape => {
      const index = allShapes.indexOf(shape);
      if (index !== -1) {
        this.shapeInfos.push({ shape, originalIndex: index });
      }
    });
    // Sort by original index for consistent processing
    this.shapeInfos.sort((a, b) => a.originalIndex - b.originalIndex);
  }

  execute(): void {
    this.shapeInfos.forEach(info => {
      this.container.removeShape(info.shape);
    });
  }

  undo(): void {
    // Add all shapes back
    this.shapeInfos.forEach(info => {
      this.container.addShape(info.shape);
    });

    // Restore z-order if reorderShapes is available
    if (this.container.reorderShapes) {
      const allShapes = [...this.container.getShapes()];

      // Remove the shapes we just added (they're at the end)
      this.shapeInfos.forEach(info => {
        const idx = allShapes.indexOf(info.shape);
        if (idx !== -1) {
          allShapes.splice(idx, 1);
        }
      });

      // Re-insert at original positions (in order of originalIndex)
      const sortedInfos = [...this.shapeInfos].sort((a, b) => a.originalIndex - b.originalIndex);
      sortedInfos.forEach(info => {
        // Clamp index to valid range
        const insertIdx = Math.min(info.originalIndex, allShapes.length);
        allShapes.splice(insertIdx, 0, info.shape);
      });

      this.container.reorderShapes(allShapes);
    }
  }

  getDescription(): string {
    if (this.shapeInfos.length === 1) {
      return `Delete ${this.shapeInfos[0].shape.type}`;
    }
    return `Delete ${this.shapeInfos.length} shapes`;
  }
}
