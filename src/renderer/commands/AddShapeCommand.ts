import { Command } from './Command';
import { Shape } from '../shapes/Shape';

export interface ShapeContainer {
  addShape(shape: Shape): void;
  removeShape(shape: Shape): void;
}

/**
 * Command for adding a shape to the canvas
 */
export class AddShapeCommand implements Command {
  constructor(
    private container: ShapeContainer,
    private shape: Shape
  ) {}

  execute(): void {
    this.container.addShape(this.shape);
  }

  undo(): void {
    this.container.removeShape(this.shape);
  }

  getDescription(): string {
    return `Add ${this.shape.type}`;
  }
}
