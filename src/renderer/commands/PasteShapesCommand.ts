import { Command } from './Command';
import { Shape } from '../shapes/Shape';
import { ShapeContainer } from './AddShapeCommand';

/**
 * Command for pasting shapes (supports undo/redo)
 */
export class PasteShapesCommand implements Command {
  constructor(
    private container: ShapeContainer,
    private shapes: Shape[]
  ) {}

  execute(): void {
    this.shapes.forEach(shape => {
      this.container.addShape(shape);
    });
  }

  undo(): void {
    this.shapes.forEach(shape => {
      this.container.removeShape(shape);
    });
  }

  getDescription(): string {
    if (this.shapes.length === 1) {
      return `Paste ${this.shapes[0].type}`;
    }
    return `Paste ${this.shapes.length} shapes`;
  }
}
