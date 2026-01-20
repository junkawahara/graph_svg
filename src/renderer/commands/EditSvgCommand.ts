import { Command } from './Command';
import { Shape } from '../shapes/Shape';
import { ShapeContainerWithOrder } from './UngroupShapesCommand';

/**
 * Command for editing a shape's SVG source (replace old shape with new)
 */
export class EditSvgCommand implements Command {
  private originalIndex: number = -1;

  constructor(
    private container: ShapeContainerWithOrder,
    private oldShape: Shape,
    private newShape: Shape
  ) {
    // Capture original index for z-order preservation
    const allShapes = container.getShapes();
    this.originalIndex = allShapes.indexOf(oldShape);
  }

  execute(): void {
    this.container.removeShape(this.oldShape);
    this.container.addShape(this.newShape);
    this.restoreOrder(this.newShape);
  }

  undo(): void {
    this.container.removeShape(this.newShape);
    this.container.addShape(this.oldShape);
    this.restoreOrder(this.oldShape);
  }

  private restoreOrder(shape: Shape): void {
    if (this.container.reorderShapes && this.originalIndex >= 0) {
      const allShapes = [...this.container.getShapes()];
      const currentIdx = allShapes.indexOf(shape);
      if (currentIdx !== -1 && currentIdx !== this.originalIndex) {
        allShapes.splice(currentIdx, 1);
        // Clamp index to valid range
        const insertIdx = Math.min(this.originalIndex, allShapes.length);
        allShapes.splice(insertIdx, 0, shape);
        this.container.reorderShapes(allShapes);
      }
    }
  }

  getDescription(): string {
    return `Edit SVG ${this.oldShape.type}`;
  }
}
