import { Command } from './Command';
import { Shape } from '../shapes/Shape';

export type ZOrderOperation = 'bringToFront' | 'sendToBack' | 'bringForward' | 'sendBackward';

interface ShapeOrderInfo {
  shape: Shape;
  originalIndex: number;
}

/**
 * Command for changing shape z-order (supports undo/redo)
 */
export class ZOrderCommand implements Command {
  private orderInfos: ShapeOrderInfo[] = [];
  private operation: ZOrderOperation;
  private getShapes: () => Shape[];
  private reorderShapes: (newOrder: Shape[]) => void;

  constructor(
    shapes: Shape[],
    operation: ZOrderOperation,
    getShapes: () => Shape[],
    reorderShapes: (newOrder: Shape[]) => void
  ) {
    this.operation = operation;
    this.getShapes = getShapes;
    this.reorderShapes = reorderShapes;

    // Capture original indices
    const allShapes = getShapes();
    shapes.forEach(shape => {
      const index = allShapes.indexOf(shape);
      if (index !== -1) {
        this.orderInfos.push({ shape, originalIndex: index });
      }
    });

    // Sort by original index for consistent processing
    this.orderInfos.sort((a, b) => a.originalIndex - b.originalIndex);
  }

  execute(): void {
    const allShapes = [...this.getShapes()];
    const shapes = this.orderInfos.map(info => info.shape);

    switch (this.operation) {
      case 'bringToFront':
        this.bringToFront(allShapes, shapes);
        break;
      case 'sendToBack':
        this.sendToBack(allShapes, shapes);
        break;
      case 'bringForward':
        this.bringForward(allShapes, shapes);
        break;
      case 'sendBackward':
        this.sendBackward(allShapes, shapes);
        break;
    }

    this.reorderShapes(allShapes);
  }

  undo(): void {
    const allShapes = [...this.getShapes()];

    // Remove all affected shapes
    this.orderInfos.forEach(info => {
      const index = allShapes.indexOf(info.shape);
      if (index !== -1) {
        allShapes.splice(index, 1);
      }
    });

    // Re-insert at original positions (in order)
    const sortedInfos = [...this.orderInfos].sort((a, b) => a.originalIndex - b.originalIndex);
    sortedInfos.forEach(info => {
      allShapes.splice(info.originalIndex, 0, info.shape);
    });

    this.reorderShapes(allShapes);
  }

  private bringToFront(allShapes: Shape[], shapes: Shape[]): void {
    // Remove shapes from current positions
    shapes.forEach(shape => {
      const index = allShapes.indexOf(shape);
      if (index !== -1) {
        allShapes.splice(index, 1);
      }
    });
    // Add to end (top)
    allShapes.push(...shapes);
  }

  private sendToBack(allShapes: Shape[], shapes: Shape[]): void {
    // Remove shapes from current positions
    shapes.forEach(shape => {
      const index = allShapes.indexOf(shape);
      if (index !== -1) {
        allShapes.splice(index, 1);
      }
    });
    // Add to beginning (bottom) - reverse to maintain relative order
    allShapes.unshift(...shapes.reverse());
  }

  private bringForward(allShapes: Shape[], shapes: Shape[]): void {
    // Process from end to avoid index shifting issues
    const indices = shapes.map(s => allShapes.indexOf(s)).filter(i => i !== -1);
    indices.sort((a, b) => b - a); // Descending

    indices.forEach(index => {
      if (index < allShapes.length - 1) {
        // Swap with next element
        [allShapes[index], allShapes[index + 1]] = [allShapes[index + 1], allShapes[index]];
      }
    });
  }

  private sendBackward(allShapes: Shape[], shapes: Shape[]): void {
    // Process from beginning to avoid index shifting issues
    const indices = shapes.map(s => allShapes.indexOf(s)).filter(i => i !== -1);
    indices.sort((a, b) => a - b); // Ascending

    indices.forEach(index => {
      if (index > 0) {
        // Swap with previous element
        [allShapes[index], allShapes[index - 1]] = [allShapes[index - 1], allShapes[index]];
      }
    });
  }

  getDescription(): string {
    const opNames: Record<ZOrderOperation, string> = {
      bringToFront: 'Bring to Front',
      sendToBack: 'Send to Back',
      bringForward: 'Bring Forward',
      sendBackward: 'Send Backward'
    };
    return opNames[this.operation];
  }
}
