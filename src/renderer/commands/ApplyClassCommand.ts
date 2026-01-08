import { Command } from './Command';
import { Shape } from '../shapes/Shape';
import { ShapeStyle } from '../../shared/types';

/**
 * State saved before applying class
 */
interface ShapeState {
  className?: string;
  style: ShapeStyle;
}

/**
 * Command to apply or remove a style class from shapes
 */
export class ApplyClassCommand implements Command {
  private beforeStates: ShapeState[] = [];

  constructor(
    private shapes: Shape[],
    private newClassName: string | undefined,
    private newStyle: ShapeStyle
  ) {
    // Save state before applying
    this.beforeStates = shapes.map(shape => ({
      className: shape.className,
      style: { ...shape.style }
    }));
  }

  execute(): void {
    for (const shape of this.shapes) {
      shape.className = this.newClassName;
      Object.assign(shape.style, this.newStyle);
      shape.updateElement();
    }
  }

  undo(): void {
    for (let i = 0; i < this.shapes.length; i++) {
      const shape = this.shapes[i];
      const state = this.beforeStates[i];
      shape.className = state.className;
      Object.assign(shape.style, state.style);
      shape.updateElement();
    }
  }
}
