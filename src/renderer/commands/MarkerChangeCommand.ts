import { Command } from './Command';
import { Line } from '../shapes/Line';
import { Path } from '../shapes/Path';
import { MarkerType } from '../../shared/types';

export interface MarkerUpdates {
  markerStart?: MarkerType;
  markerEnd?: MarkerType;
}

interface MarkerState {
  markerStart: MarkerType;
  markerEnd: MarkerType;
}

// Type for shapes that support markers
type MarkerShape = Line | Path;

/**
 * Command for changing markers on Line or Path shapes (supports undo/redo)
 */
export class MarkerChangeCommand implements Command {
  private beforeState: MarkerState;
  private afterUpdates: MarkerUpdates;

  constructor(
    private shape: MarkerShape,
    markerUpdates: MarkerUpdates
  ) {
    // Capture before state
    this.beforeState = {
      markerStart: shape.markerStart,
      markerEnd: shape.markerEnd
    };

    this.afterUpdates = markerUpdates;
  }

  execute(): void {
    if (this.afterUpdates.markerStart !== undefined) {
      this.shape.markerStart = this.afterUpdates.markerStart;
    }
    if (this.afterUpdates.markerEnd !== undefined) {
      this.shape.markerEnd = this.afterUpdates.markerEnd;
    }
    this.shape.updateElement();
  }

  undo(): void {
    this.shape.markerStart = this.beforeState.markerStart;
    this.shape.markerEnd = this.beforeState.markerEnd;
    this.shape.updateElement();
  }

  getDescription(): string {
    const props = Object.keys(this.afterUpdates).join(', ');
    return `Change marker: ${props}`;
  }
}
