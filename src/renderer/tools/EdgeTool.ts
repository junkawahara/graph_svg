import { Point } from '../../shared/types';
import { Tool } from './Tool';
import { Edge } from '../shapes/Edge';
import { Node } from '../shapes/Node';
import { getGraphManager } from '../core/GraphManager';
import { editorState } from '../core/EditorState';
import { eventBus } from '../core/EventBus';

/**
 * Tool for creating edges between graph nodes
 */
export class EdgeTool implements Tool {
  readonly name = 'edge';

  private sourceNode: Node | null = null;
  private previewLine: SVGLineElement | null = null;
  private hoveredNode: Node | null = null;
  private isDragging: boolean = false;
  private svg: SVGSVGElement | null = null;

  // Callbacks for finding nodes
  private findNodeAt: ((point: Point) => Node | null) | null = null;

  constructor(options: {
    svg: SVGSVGElement;
    findNodeAt: (point: Point) => Node | null;
  }) {
    this.svg = options.svg;
    this.findNodeAt = options.findNodeAt;
  }

  onMouseDown(point: Point, _event: MouseEvent): void {
    if (!this.findNodeAt) return;

    const node = this.findNodeAt(point);
    if (node) {
      this.sourceNode = node;
      this.isDragging = true;
      this.createPreviewLine(node.cx, node.cy, point.x, point.y);
    }
  }

  onMouseMove(point: Point, _event: MouseEvent): void {
    if (!this.findNodeAt || !this.svg) return;

    // Update hovered node for highlighting
    const node = this.findNodeAt(point);
    if (node !== this.hoveredNode) {
      // Remove highlight from previous node
      if (this.hoveredNode?.element) {
        this.hoveredNode.element.classList.remove('node-hover');
      }
      // Add highlight to new node
      if (node?.element) {
        node.element.classList.add('node-hover');
      }
      this.hoveredNode = node;
    }

    // Update preview line if dragging
    if (this.isDragging && this.sourceNode && this.previewLine) {
      const startX = this.sourceNode.cx;
      const startY = this.sourceNode.cy;
      this.previewLine.setAttribute('x2', String(point.x));
      this.previewLine.setAttribute('y2', String(point.y));
    }
  }

  onMouseUp(point: Point, _event: MouseEvent): void {
    if (!this.findNodeAt) return;

    const targetNode = this.findNodeAt(point);

    if (this.isDragging && this.sourceNode && targetNode) {
      // Create edge between source and target
      this.createEdge(this.sourceNode, targetNode);
    } else if (!this.isDragging && targetNode) {
      // Click mode: first click selects source, second click selects target
      if (!this.sourceNode) {
        this.sourceNode = targetNode;
        // Highlight the selected source node
        if (targetNode.element) {
          targetNode.element.classList.add('node-selected-source');
        }
        return; // Don't reset state yet
      } else {
        // Second click - create edge
        this.createEdge(this.sourceNode, targetNode);
      }
    }

    this.resetState();
  }

  onMouseLeave(): void {
    // Remove preview but keep source node for click mode
    this.removePreviewLine();
    this.isDragging = false;
  }

  onDeactivate(): void {
    this.resetState();
  }

  private createEdge(sourceNode: Node, targetNode: Node): void {
    const direction = editorState.edgeDirection;
    const edge = Edge.create(
      sourceNode.id,
      targetNode.id,
      direction,
      { ...editorState.currentStyle }
    );

    eventBus.emit('edge:added', edge);
  }

  private createPreviewLine(x1: number, y1: number, x2: number, y2: number): void {
    if (!this.svg) return;

    this.removePreviewLine();

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', String(x1));
    line.setAttribute('y1', String(y1));
    line.setAttribute('x2', String(x2));
    line.setAttribute('y2', String(y2));
    line.setAttribute('stroke', editorState.currentStyle.stroke);
    line.setAttribute('stroke-width', '2');
    line.setAttribute('stroke-dasharray', '5,5');
    line.classList.add('edge-preview');

    this.svg.appendChild(line);
    this.previewLine = line;
  }

  private removePreviewLine(): void {
    if (this.previewLine) {
      this.previewLine.remove();
      this.previewLine = null;
    }
  }

  private resetState(): void {
    // Remove source node highlight
    if (this.sourceNode?.element) {
      this.sourceNode.element.classList.remove('node-selected-source');
    }
    // Remove hover highlight
    if (this.hoveredNode?.element) {
      this.hoveredNode.element.classList.remove('node-hover');
    }

    this.sourceNode = null;
    this.hoveredNode = null;
    this.isDragging = false;
    this.removePreviewLine();
  }
}
