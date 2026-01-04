import { Command } from './Command';
import { Line } from '../shapes/Line';
import { MarkerType } from '../../shared/types';

export interface MarkerUpdates {
  markerStart?: MarkerType;
  markerEnd?: MarkerType;
}

interface MarkerState {
  markerStart: MarkerType;
  markerEnd: MarkerType;
}

/**
 * Command for changing line markers (supports undo/redo)
 */
export class MarkerChangeCommand implements Command {
  private beforeState: MarkerState;
  private afterUpdates: MarkerUpdates;

  constructor(
    private line: Line,
    markerUpdates: MarkerUpdates
  ) {
    // Capture before state
    this.beforeState = {
      markerStart: line.markerStart,
      markerEnd: line.markerEnd
    };

    this.afterUpdates = markerUpdates;
  }

  execute(): void {
    if (this.afterUpdates.markerStart !== undefined) {
      this.line.markerStart = this.afterUpdates.markerStart;
    }
    if (this.afterUpdates.markerEnd !== undefined) {
      this.line.markerEnd = this.afterUpdates.markerEnd;
    }
    this.line.updateElement();
  }

  undo(): void {
    this.line.markerStart = this.beforeState.markerStart;
    this.line.markerEnd = this.beforeState.markerEnd;
    this.line.updateElement();
  }

  getDescription(): string {
    const props = Object.keys(this.afterUpdates).join(', ');
    return `Change marker: ${props}`;
  }
}
