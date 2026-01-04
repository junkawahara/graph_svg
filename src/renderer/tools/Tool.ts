import { Point } from '../../shared/types';

/**
 * Base interface for all tools
 */
export interface Tool {
  /** Tool name */
  readonly name: string;

  /**
   * Called when mouse button is pressed
   */
  onMouseDown(point: Point, event: MouseEvent): void;

  /**
   * Called when mouse moves
   */
  onMouseMove(point: Point, event: MouseEvent): void;

  /**
   * Called when mouse button is released
   */
  onMouseUp(point: Point, event: MouseEvent): void;

  /**
   * Called when mouse leaves canvas
   */
  onMouseLeave(): void;

  /**
   * Called when tool becomes active
   */
  onActivate?(): void;

  /**
   * Called when tool becomes inactive
   */
  onDeactivate?(): void;
}
