import { Command } from './Command';
import { LayoutManager, LayoutType } from '../core/LayoutManager';

/**
 * Command for applying automatic graph layout with Undo/Redo support
 */
export class ApplyLayoutCommand implements Command {
  private beforePositions: Map<string, { cx: number; cy: number }>;
  private afterPositions: Map<string, { cx: number; cy: number }> | null = null;

  constructor(
    private layoutType: LayoutType,
    private canvasWidth: number,
    private canvasHeight: number,
    private padding: number = 50
  ) {
    // Capture positions before layout
    this.beforePositions = LayoutManager.capturePositions();
  }

  execute(): void {
    if (this.afterPositions) {
      // Re-executing (redo) - just apply saved positions
      LayoutManager.applyPositions(this.afterPositions);
    } else {
      // First execution - run the layout algorithm
      LayoutManager.applyLayout(this.layoutType, this.canvasWidth, this.canvasHeight, this.padding);
      // Capture positions after layout
      this.afterPositions = LayoutManager.capturePositions();
    }
  }

  undo(): void {
    LayoutManager.applyPositions(this.beforePositions);
  }

  getDescription(): string {
    return `Apply ${this.layoutType} layout`;
  }
}
