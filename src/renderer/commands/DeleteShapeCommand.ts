import { Command } from './Command';
import { Shape } from '../shapes/Shape';
import { ShapeContainer } from './AddShapeCommand';

/**
 * Command for deleting shapes from the canvas (supports undo/redo)
 */
export class DeleteShapeCommand implements Command {
  constructor(
    private container: ShapeContainer,
    private shapes: Shape[]
  ) {}

  execute(): void {
    this.shapes.forEach(shape => {
      this.container.removeShape(shape);
    });
  }

  undo(): void {
    this.shapes.forEach(shape => {
      this.container.addShape(shape);
    });
  }

  getDescription(): string {
    if (this.shapes.length === 1) {
      return `Delete ${this.shapes[0].type}`;
    }
    return `Delete ${this.shapes.length} shapes`;
  }
}
