import { Command } from './Command';
import { Shape } from '../shapes/Shape';
import { ShapeContainer } from './AddShapeCommand';

/**
 * Command for editing a shape's SVG source (replace old shape with new)
 */
export class EditSvgCommand implements Command {
  constructor(
    private container: ShapeContainer,
    private oldShape: Shape,
    private newShape: Shape
  ) {}

  execute(): void {
    this.container.removeShape(this.oldShape);
    this.container.addShape(this.newShape);
  }

  undo(): void {
    this.container.removeShape(this.newShape);
    this.container.addShape(this.oldShape);
  }

  getDescription(): string {
    return `Edit SVG ${this.oldShape.type}`;
  }
}
