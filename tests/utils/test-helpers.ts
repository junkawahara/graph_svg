import { vi } from 'vitest';
import { Shape } from '../../src/renderer/shapes/Shape';
import { Command } from '../../src/renderer/commands/Command';

/**
 * Interface for mock shape container used in command tests
 */
export interface MockShapeContainer {
  shapes: Shape[];
  addShape(shape: Shape): void;
  removeShape(shape: Shape): void;
  getShapes(): Shape[];
  reorderShapes?(newOrder: Shape[]): void;
}

/**
 * Create a mock container for testing AddShape/DeleteShape commands
 */
export function createMockContainer(): MockShapeContainer {
  return {
    shapes: [],
    addShape(shape: Shape) {
      this.shapes.push(shape);
    },
    removeShape(shape: Shape) {
      const index = this.shapes.indexOf(shape);
      if (index !== -1) {
        this.shapes.splice(index, 1);
      }
    },
    getShapes() {
      return [...this.shapes];
    },
    reorderShapes(newOrder: Shape[]) {
      this.shapes = [...newOrder];
    }
  };
}

/**
 * Create a mock command for testing HistoryManager
 */
export function createMockCommand(): Command {
  return {
    execute: vi.fn(),
    undo: vi.fn(),
    getDescription: vi.fn(() => 'Mock Command')
  };
}

/**
 * Create multiple mock commands
 */
export function createMockCommands(count: number): Command[] {
  return Array.from({ length: count }, (_, i) => ({
    execute: vi.fn(),
    undo: vi.fn(),
    getDescription: vi.fn(() => `Mock Command ${i + 1}`)
  }));
}

/**
 * Helper to verify a shape is in the container
 */
export function expectShapeInContainer(container: MockShapeContainer, shape: Shape): void {
  expect(container.shapes).toContain(shape);
}

/**
 * Helper to verify a shape is NOT in the container
 */
export function expectShapeNotInContainer(container: MockShapeContainer, shape: Shape): void {
  expect(container.shapes).not.toContain(shape);
}

/**
 * Helper to verify container has specific number of shapes
 */
export function expectContainerLength(container: MockShapeContainer, length: number): void {
  expect(container.shapes).toHaveLength(length);
}
