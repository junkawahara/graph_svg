import { Command } from './Command';
import { Shape } from '../shapes/Shape';
import { Node } from '../shapes/Node';
import { getGraphManager } from '../core/GraphManager';

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
    const gm = getGraphManager();
    this.shapes.forEach(shape => {
      shape.move(this.dx, this.dy);
      if (shape instanceof Node) {
        gm.updateEdgesForNode(shape.id);
      }
    });
  }

  undo(): void {
    const gm = getGraphManager();
    this.shapes.forEach(shape => {
      shape.move(-this.dx, -this.dy);
      if (shape instanceof Node) {
        gm.updateEdgesForNode(shape.id);
      }
    });
  }

  getDescription(): string {
    return `Move ${this.shapes.length} shape(s)`;
  }
}
