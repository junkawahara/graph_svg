import { Command } from './Command';
import { Shape } from '../shapes/Shape';
import { Bounds } from '../../shared/types';

/**
 * Distribution types for shapes
 */
export type DistributionType = 'horizontal' | 'vertical';

/**
 * Command for distributing shapes evenly
 */
export class DistributeShapesCommand implements Command {
  private moves: Map<Shape, { dx: number; dy: number }> = new Map();

  constructor(
    private shapes: Shape[],
    private distribution: DistributionType
  ) {
    this.calculateMoves();
  }

  private calculateMoves(): void {
    if (this.shapes.length < 3) return;

    const bounds = this.shapes.map(s => s.getBounds());

    if (this.distribution === 'horizontal') {
      // Sort shapes by X position (left to right)
      const indexed = this.shapes.map((shape, i) => ({ shape, bounds: bounds[i] }));
      indexed.sort((a, b) => a.bounds.x - b.bounds.x);

      // Calculate total width of all shapes
      const totalWidth = indexed.reduce((sum, item) => sum + item.bounds.width, 0);

      // Calculate available space (from leftmost left edge to rightmost right edge)
      const leftmost = indexed[0].bounds.x;
      const rightmost = indexed[indexed.length - 1].bounds.x + indexed[indexed.length - 1].bounds.width;
      const totalSpace = rightmost - leftmost;

      // Calculate gap between shapes
      const gap = (totalSpace - totalWidth) / (indexed.length - 1);

      // Distribute shapes
      let currentX = leftmost;
      indexed.forEach((item) => {
        const dx = currentX - item.bounds.x;
        this.moves.set(item.shape, { dx, dy: 0 });
        currentX += item.bounds.width + gap;
      });
    } else {
      // Sort shapes by Y position (top to bottom)
      const indexed = this.shapes.map((shape, i) => ({ shape, bounds: bounds[i] }));
      indexed.sort((a, b) => a.bounds.y - b.bounds.y);

      // Calculate total height of all shapes
      const totalHeight = indexed.reduce((sum, item) => sum + item.bounds.height, 0);

      // Calculate available space (from topmost top edge to bottommost bottom edge)
      const topmost = indexed[0].bounds.y;
      const bottommost = indexed[indexed.length - 1].bounds.y + indexed[indexed.length - 1].bounds.height;
      const totalSpace = bottommost - topmost;

      // Calculate gap between shapes
      const gap = (totalSpace - totalHeight) / (indexed.length - 1);

      // Distribute shapes
      let currentY = topmost;
      indexed.forEach((item) => {
        const dy = currentY - item.bounds.y;
        this.moves.set(item.shape, { dx: 0, dy });
        currentY += item.bounds.height + gap;
      });
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
    return this.distribution === 'horizontal'
      ? 'Distribute Horizontally'
      : 'Distribute Vertically';
  }
}
