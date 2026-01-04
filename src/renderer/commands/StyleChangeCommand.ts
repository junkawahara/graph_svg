import { Command } from './Command';
import { Shape } from '../shapes/Shape';
import { ShapeStyle } from '../../shared/types';

/**
 * Command for changing shape styles (supports undo/redo)
 */
export class StyleChangeCommand implements Command {
  private beforeStyles: Map<Shape, ShapeStyle>;
  private afterStyle: Partial<ShapeStyle>;

  constructor(
    private shapes: Shape[],
    styleUpdates: Partial<ShapeStyle>
  ) {
    // Capture before state
    this.beforeStyles = new Map();
    shapes.forEach(shape => {
      this.beforeStyles.set(shape, { ...shape.style });
    });

    this.afterStyle = styleUpdates;
  }

  execute(): void {
    this.shapes.forEach(shape => {
      shape.style = { ...shape.style, ...this.afterStyle };
      shape.updateElement();
    });
  }

  undo(): void {
    this.shapes.forEach(shape => {
      const beforeStyle = this.beforeStyles.get(shape);
      if (beforeStyle) {
        shape.style = { ...beforeStyle };
        shape.updateElement();
      }
    });
  }

  getDescription(): string {
    const props = Object.keys(this.afterStyle).join(', ');
    return `Change style: ${props}`;
  }
}
