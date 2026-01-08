import { Command } from './Command';
import { Shape } from '../shapes/Shape';

/**
 * Alignment types for shapes
 */
export type AlignmentType = 'left' | 'right' | 'top' | 'bottom' | 'horizontalCenter' | 'verticalCenter';

/**
 * Command for aligning shapes
 */
export class AlignShapesCommand implements Command {
  private moves: Map<Shape, { dx: number; dy: number }> = new Map();

  constructor(
    private shapes: Shape[],
    private alignment: AlignmentType
  ) {
    this.calculateMoves();
  }

  private calculateMoves(): void {
    if (this.shapes.length < 2) return;

    const bounds = this.shapes.map(s => s.getBounds());

    switch (this.alignment) {
      case 'left': {
        const minX = Math.min(...bounds.map(b => b.x));
        this.shapes.forEach((shape, i) => {
          this.moves.set(shape, { dx: minX - bounds[i].x, dy: 0 });
        });
        break;
      }
      case 'right': {
        const maxX = Math.max(...bounds.map(b => b.x + b.width));
        this.shapes.forEach((shape, i) => {
          this.moves.set(shape, { dx: maxX - (bounds[i].x + bounds[i].width), dy: 0 });
        });
        break;
      }
      case 'top': {
        const minY = Math.min(...bounds.map(b => b.y));
        this.shapes.forEach((shape, i) => {
          this.moves.set(shape, { dx: 0, dy: minY - bounds[i].y });
        });
        break;
      }
      case 'bottom': {
        const maxY = Math.max(...bounds.map(b => b.y + b.height));
        this.shapes.forEach((shape, i) => {
          this.moves.set(shape, { dx: 0, dy: maxY - (bounds[i].y + bounds[i].height) });
        });
        break;
      }
      case 'horizontalCenter': {
        const avgCenterX = bounds.reduce((sum, b) => sum + b.x + b.width / 2, 0) / bounds.length;
        this.shapes.forEach((shape, i) => {
          this.moves.set(shape, { dx: avgCenterX - (bounds[i].x + bounds[i].width / 2), dy: 0 });
        });
        break;
      }
      case 'verticalCenter': {
        const avgCenterY = bounds.reduce((sum, b) => sum + b.y + b.height / 2, 0) / bounds.length;
        this.shapes.forEach((shape, i) => {
          this.moves.set(shape, { dx: 0, dy: avgCenterY - (bounds[i].y + bounds[i].height / 2) });
        });
        break;
      }
    }
  }

  execute(): void {
    this.moves.forEach((move, shape) => {
      shape.move(move.dx, move.dy);
    });
  }

  undo(): void {
    this.moves.forEach((move, shape) => {
      shape.move(-move.dx, -move.dy);
    });
  }

  getDescription(): string {
    const alignNames: Record<AlignmentType, string> = {
      left: 'Align Left',
      right: 'Align Right',
      top: 'Align Top',
      bottom: 'Align Bottom',
      horizontalCenter: 'Align Horizontal Center',
      verticalCenter: 'Align Vertical Center'
    };
    return alignNames[this.alignment];
  }
}
