import { Command } from './Command';
import { Shape } from '../shapes/Shape';
import { eventBus } from '../core/EventBus';

/**
 * Command to rotate a shape
 */
export class RotateShapeCommand implements Command {
  constructor(
    private shape: Shape,
    private beforeAngle: number,
    private afterAngle: number
  ) {}

  execute(): void {
    this.shape.setRotation(this.afterAngle);
    // shape:updated for sidebar sync (canvas:render removed - setRotation handles rendering)
    eventBus.emit('shape:updated', this.shape);
  }

  undo(): void {
    this.shape.setRotation(this.beforeAngle);
    eventBus.emit('shape:updated', this.shape);
  }

  getDescription(): string {
    return `Rotate shape from ${this.beforeAngle}° to ${this.afterAngle}°`;
  }
}
