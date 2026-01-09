import { Command } from './Command';
import { Node } from '../shapes/Node';
import { Edge } from '../shapes/Edge';
import { Shape } from '../shapes/Shape';
import { ShapeStyle, EdgeDirection, Point } from '../../shared/types';
import { getGraphManager } from '../core/GraphManager';

/**
 * Data required for importing a graph
 */
export interface GraphImportData {
  nodeLabels: string[];
  edges: Array<{ source: string; target: string; label?: string }>;
  direction: EdgeDirection;
  canvasWidth: number;
  canvasHeight: number;
}

/**
 * Interface for canvas operations needed by this command
 */
export interface CanvasContainer {
  addShape(shape: Shape): void;
  removeShape(shape: Shape): void;
  clearAll(): void;
  loadShapes(shapes: Shape[]): void;
  getShapes(): Shape[];
}

/**
 * Command to import a graph from a file
 * Supports undo/redo as a single operation
 */
export class ImportGraphCommand implements Command {
  private createdNodes: Node[] = [];
  private createdEdges: Edge[] = [];
  private previousShapes: Shape[] = [];
  private clearCanvas: boolean;

  constructor(
    private container: CanvasContainer,
    private data: GraphImportData,
    private style: ShapeStyle,
    private nodeSize: { rx: number; ry: number },
    clearCanvas: boolean = false
  ) {
    this.clearCanvas = clearCanvas;

    // Save previous state if clearing
    if (clearCanvas) {
      this.previousShapes = container.getShapes().map(s => s.clone());
    }
  }

  execute(): void {
    const gm = getGraphManager();

    // Clear canvas if requested
    if (this.clearCanvas) {
      gm.clear();
      this.container.clearAll();
    }

    // Calculate node positions (circular layout)
    const positions = this.calculateCircularLayout(
      this.data.nodeLabels.length,
      this.data.canvasWidth,
      this.data.canvasHeight
    );

    // Create node label -> Node map for edge creation
    const nodeMap = new Map<string, Node>();

    // Create nodes
    this.data.nodeLabels.forEach((label, index) => {
      const pos = positions[index];
      const node = Node.fromCenter(
        pos,
        label,
        { ...this.style },
        this.nodeSize.rx,
        this.nodeSize.ry
      );
      this.createdNodes.push(node);
      nodeMap.set(label, node);
      this.container.addShape(node);
    });

    // Create edges
    this.data.edges.forEach(edgeData => {
      const sourceNode = nodeMap.get(edgeData.source);
      const targetNode = nodeMap.get(edgeData.target);

      if (sourceNode && targetNode) {
        const edge = Edge.create(
          sourceNode.id,
          targetNode.id,
          this.data.direction,
          { ...this.style, fill: 'none' },
          edgeData.label
        );
        this.createdEdges.push(edge);
        this.container.addShape(edge);
      }
    });
  }

  undo(): void {
    const gm = getGraphManager();

    // Remove created edges first (order matters for GraphManager)
    this.createdEdges.forEach(edge => {
      this.container.removeShape(edge);
      gm.unregisterEdge(edge.id);
    });

    // Remove created nodes
    this.createdNodes.forEach(node => {
      this.container.removeShape(node);
      gm.unregisterNode(node.id);
    });

    // Restore previous shapes if canvas was cleared
    if (this.clearCanvas && this.previousShapes.length > 0) {
      this.container.loadShapes(this.previousShapes);
    }

    // Clear created lists for potential redo
    this.createdNodes = [];
    this.createdEdges = [];
  }

  getDescription(): string {
    return `Import graph (${this.data.nodeLabels.length} nodes, ${this.data.edges.length} edges)`;
  }

  /**
   * Calculate circular layout positions for nodes
   */
  private calculateCircularLayout(nodeCount: number, canvasWidth: number, canvasHeight: number): Point[] {
    const positions: Point[] = [];
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;
    const radius = Math.min(canvasWidth, canvasHeight) * 0.35;

    if (nodeCount === 0) {
      return positions;
    }

    if (nodeCount === 1) {
      positions.push({ x: centerX, y: centerY });
    } else {
      for (let i = 0; i < nodeCount; i++) {
        // Start from top (-PI/2) and go clockwise
        const angle = (2 * Math.PI * i) / nodeCount - Math.PI / 2;
        positions.push({
          x: centerX + radius * Math.cos(angle),
          y: centerY + radius * Math.sin(angle)
        });
      }
    }

    return positions;
  }
}
