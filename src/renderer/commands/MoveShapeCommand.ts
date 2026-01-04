import { Command } from './Command';
import { Shape } from '../shapes/Shape';

/**
 * Command for moving shapes
 */
export class MoveShapeCommand implements Command {
  constructor(
    private shapes: Shape[],
    private dx: number,
    private dy: number
  ) {}

  execute(): void {
    this.shapes.forEach(shape => {
      shape.move(this.dx, this.dy);
    });
  }

  undo(): void {
    this.shapes.forEach(shape => {
      shape.move(-this.dx, -this.dy);
    });
  }

  getDescription(): string {
    return `Move ${this.shapes.length} shape(s)`;
  }
}
