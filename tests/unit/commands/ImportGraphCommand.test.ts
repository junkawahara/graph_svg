import { describe, it, expect, beforeEach } from 'vitest';
import { ImportGraphCommand, GraphImportData, CanvasContainer } from '../../../src/renderer/commands/ImportGraphCommand';
import { getGraphManager, GraphManager } from '../../../src/renderer/core/GraphManager';
import { Shape } from '../../../src/renderer/shapes/Shape';
import { Node } from '../../../src/renderer/shapes/Node';
import { Edge } from '../../../src/renderer/shapes/Edge';
import { createTestStyle, createTestNode, createTestRectangle } from '../../utils/mock-factories';

// Mock canvas container for testing
function createMockCanvasContainer(): CanvasContainer & { shapes: Shape[] } {
  const shapes: Shape[] = [];
  return {
    shapes,
    addShape(shape: Shape) {
      shapes.push(shape);
    },
    removeShape(shape: Shape) {
      const idx = shapes.indexOf(shape);
      if (idx !== -1) shapes.splice(idx, 1);
    },
    clearAll() {
      shapes.length = 0;
    },
    loadShapes(newShapes: Shape[]) {
      shapes.length = 0;
      shapes.push(...newShapes);
    },
    getShapes() {
      return [...shapes];
    }
  };
}

describe('ImportGraphCommand', () => {
  let graphManager: GraphManager;
  let container: ReturnType<typeof createMockCanvasContainer>;
  let defaultStyle = createTestStyle();

  beforeEach(() => {
    graphManager = getGraphManager();
    graphManager.clear();
    container = createMockCanvasContainer();
  });

  describe('execute()', () => {
    it('should create nodes from import data', () => {
      const importData: GraphImportData = {
        nodeLabels: ['A', 'B', 'C'],
        edges: [],
        direction: 'none',
        canvasWidth: 800,
        canvasHeight: 600
      };

      const command = new ImportGraphCommand(
        container,
        importData,
        defaultStyle,
        { rx: 30, ry: 30 }
      );

      command.execute();

      // Should have 3 nodes
      const nodes = container.shapes.filter(s => s instanceof Node);
      expect(nodes).toHaveLength(3);

      // Check labels
      const labels = nodes.map(n => (n as Node).label);
      expect(labels).toContain('A');
      expect(labels).toContain('B');
      expect(labels).toContain('C');
    });

    it('should create edges from import data', () => {
      const importData: GraphImportData = {
        nodeLabels: ['A', 'B', 'C'],
        edges: [
          { source: 'A', target: 'B' },
          { source: 'B', target: 'C' }
        ],
        direction: 'forward',
        canvasWidth: 800,
        canvasHeight: 600
      };

      const command = new ImportGraphCommand(
        container,
        importData,
        defaultStyle,
        { rx: 30, ry: 30 }
      );

      command.execute();

      // Should have 3 nodes and 2 edges
      const nodes = container.shapes.filter(s => s instanceof Node);
      const edges = container.shapes.filter(s => s instanceof Edge);
      expect(nodes).toHaveLength(3);
      expect(edges).toHaveLength(2);
    });

    it('should create edges with labels', () => {
      const importData: GraphImportData = {
        nodeLabels: ['A', 'B'],
        edges: [
          { source: 'A', target: 'B', label: 'weight: 5' }
        ],
        direction: 'none',
        canvasWidth: 800,
        canvasHeight: 600
      };

      const command = new ImportGraphCommand(
        container,
        importData,
        defaultStyle,
        { rx: 30, ry: 30 }
      );

      command.execute();

      const edge = container.shapes.find(s => s instanceof Edge) as Edge;
      expect(edge.label).toBe('weight: 5');
    });

    it('should use specified direction for edges', () => {
      const importData: GraphImportData = {
        nodeLabels: ['A', 'B'],
        edges: [{ source: 'A', target: 'B' }],
        direction: 'forward',
        canvasWidth: 800,
        canvasHeight: 600
      };

      const command = new ImportGraphCommand(
        container,
        importData,
        defaultStyle,
        { rx: 30, ry: 30 }
      );

      command.execute();

      const edge = container.shapes.find(s => s instanceof Edge) as Edge;
      expect(edge.direction).toBe('forward');
    });

    it('should clear canvas when clearCanvas is true', () => {
      // Add existing shape
      const existingRect = createTestRectangle({ id: 'existing-rect' });
      container.addShape(existingRect);

      const importData: GraphImportData = {
        nodeLabels: ['A'],
        edges: [],
        direction: 'none',
        canvasWidth: 800,
        canvasHeight: 600
      };

      const command = new ImportGraphCommand(
        container,
        importData,
        defaultStyle,
        { rx: 30, ry: 30 },
        true // clearCanvas
      );

      command.execute();

      // Should only have the imported node, existing rect should be gone
      expect(container.shapes).not.toContain(existingRect);
      expect(container.shapes.filter(s => s instanceof Node)).toHaveLength(1);
    });

    it('should add to existing canvas when clearCanvas is false', () => {
      // Add existing shape
      const existingRect = createTestRectangle({ id: 'existing-rect' });
      container.addShape(existingRect);

      const importData: GraphImportData = {
        nodeLabels: ['A'],
        edges: [],
        direction: 'none',
        canvasWidth: 800,
        canvasHeight: 600
      };

      const command = new ImportGraphCommand(
        container,
        importData,
        defaultStyle,
        { rx: 30, ry: 30 },
        false // don't clear canvas
      );

      command.execute();

      // Should have both existing rect and new node
      expect(container.shapes).toContain(existingRect);
      expect(container.shapes.filter(s => s instanceof Node)).toHaveLength(1);
    });

    it('should use circular layout for positioning', () => {
      const importData: GraphImportData = {
        nodeLabels: ['A', 'B', 'C', 'D'],
        edges: [],
        direction: 'none',
        canvasWidth: 800,
        canvasHeight: 600
      };

      const command = new ImportGraphCommand(
        container,
        importData,
        defaultStyle,
        { rx: 30, ry: 30 }
      );

      command.execute();

      const nodes = container.shapes.filter(s => s instanceof Node) as Node[];

      // All nodes should have positions within the canvas
      for (const node of nodes) {
        expect(node.cx).toBeGreaterThan(0);
        expect(node.cx).toBeLessThan(800);
        expect(node.cy).toBeGreaterThan(0);
        expect(node.cy).toBeLessThan(600);
      }
    });
  });

  describe('undo()', () => {
    it('should remove imported nodes and edges', () => {
      const importData: GraphImportData = {
        nodeLabels: ['A', 'B'],
        edges: [{ source: 'A', target: 'B' }],
        direction: 'none',
        canvasWidth: 800,
        canvasHeight: 600
      };

      const command = new ImportGraphCommand(
        container,
        importData,
        defaultStyle,
        { rx: 30, ry: 30 }
      );

      command.execute();
      command.undo();

      expect(container.shapes).toHaveLength(0);
    });

    it('should restore cleared shapes when clearCanvas was true', () => {
      // Add existing shape
      const existingRect = createTestRectangle({ id: 'existing-rect' });
      container.addShape(existingRect);

      const importData: GraphImportData = {
        nodeLabels: ['A'],
        edges: [],
        direction: 'none',
        canvasWidth: 800,
        canvasHeight: 600
      };

      const command = new ImportGraphCommand(
        container,
        importData,
        defaultStyle,
        { rx: 30, ry: 30 },
        true // clearCanvas
      );

      command.execute();
      command.undo();

      // Original shape should be restored
      expect(container.shapes.length).toBe(1);
    });

    it('should remove all imported shapes from container', () => {
      const importData: GraphImportData = {
        nodeLabels: ['A', 'B'],
        edges: [{ source: 'A', target: 'B' }],
        direction: 'none',
        canvasWidth: 800,
        canvasHeight: 600
      };

      const command = new ImportGraphCommand(
        container,
        importData,
        defaultStyle,
        { rx: 30, ry: 30 }
      );

      command.execute();

      // Should have 2 nodes and 1 edge
      const nodesAfterExecute = container.shapes.filter(s => s instanceof Node);
      const edgesAfterExecute = container.shapes.filter(s => s instanceof Edge);
      expect(nodesAfterExecute.length).toBe(2);
      expect(edgesAfterExecute.length).toBe(1);

      command.undo();

      // All should be removed
      expect(container.shapes).toHaveLength(0);
    });
  });

  describe('getDescription()', () => {
    it('should return description with node and edge counts', () => {
      const importData: GraphImportData = {
        nodeLabels: ['A', 'B', 'C'],
        edges: [
          { source: 'A', target: 'B' },
          { source: 'B', target: 'C' }
        ],
        direction: 'none',
        canvasWidth: 800,
        canvasHeight: 600
      };

      const command = new ImportGraphCommand(
        container,
        importData,
        defaultStyle,
        { rx: 30, ry: 30 }
      );

      const description = command.getDescription();

      expect(description).toContain('3');
      expect(description).toContain('2');
      expect(description).toContain('nodes');
      expect(description).toContain('edges');
    });
  });

  describe('edge cases', () => {
    it('should handle empty graph', () => {
      const importData: GraphImportData = {
        nodeLabels: [],
        edges: [],
        direction: 'none',
        canvasWidth: 800,
        canvasHeight: 600
      };

      const command = new ImportGraphCommand(
        container,
        importData,
        defaultStyle,
        { rx: 30, ry: 30 }
      );

      expect(() => command.execute()).not.toThrow();
      expect(container.shapes).toHaveLength(0);
    });

    it('should handle single node', () => {
      const importData: GraphImportData = {
        nodeLabels: ['A'],
        edges: [],
        direction: 'none',
        canvasWidth: 800,
        canvasHeight: 600
      };

      const command = new ImportGraphCommand(
        container,
        importData,
        defaultStyle,
        { rx: 30, ry: 30 }
      );

      command.execute();

      const nodes = container.shapes.filter(s => s instanceof Node) as Node[];
      expect(nodes).toHaveLength(1);

      // Single node should be at center
      const node = nodes[0];
      expect(node.cx).toBe(400); // canvasWidth / 2
      expect(node.cy).toBe(300); // canvasHeight / 2
    });

    it('should handle self-loop edges', () => {
      const importData: GraphImportData = {
        nodeLabels: ['A'],
        edges: [{ source: 'A', target: 'A' }],
        direction: 'none',
        canvasWidth: 800,
        canvasHeight: 600
      };

      const command = new ImportGraphCommand(
        container,
        importData,
        defaultStyle,
        { rx: 30, ry: 30 }
      );

      command.execute();

      const edges = container.shapes.filter(s => s instanceof Edge) as Edge[];
      expect(edges).toHaveLength(1);
      expect(edges[0].sourceNodeId).toBe(edges[0].targetNodeId);
    });
  });
});
