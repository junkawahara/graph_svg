import { Point, ToolType } from '../../shared/types';
import { eventBus } from '../core/EventBus';
import { editorState } from '../core/EditorState';
import { selectionManager } from '../core/SelectionManager';
import { historyManager } from '../core/HistoryManager';
import { Tool } from '../tools/Tool';
import { SelectTool } from '../tools/SelectTool';
import { LineTool } from '../tools/LineTool';
import { EllipseTool } from '../tools/EllipseTool';
import { Shape } from '../shapes/Shape';
import { Line } from '../shapes/Line';
import { Ellipse } from '../shapes/Ellipse';
import { Handle, HandleSet } from '../handles/Handle';
import { LineHandles } from '../handles/LineHandles';
import { EllipseHandles } from '../handles/EllipseHandles';
import { AddShapeCommand } from '../commands/AddShapeCommand';

/**
 * Canvas component - manages SVG element, tools, shapes, and handles
 */
export class Canvas {
  private svg: SVGSVGElement;
  private container: HTMLElement;
  private tools: Map<ToolType, Tool> = new Map();
  private currentTool: Tool | null = null;
  private shapes: Shape[] = [];
  private handleSets: Map<Shape, HandleSet> = new Map();

  constructor(svgElement: SVGSVGElement, containerElement: HTMLElement) {
    this.svg = svgElement;
    this.container = containerElement;

    this.initializeTools();
    this.setupEventListeners();
    this.updateSize();
    this.updateCursor();

    // Listen for tool changes
    eventBus.on('tool:changed', (tool: ToolType) => {
      console.log(`Canvas: Received tool:changed event for ${tool}`);
      this.switchTool(tool);
      this.updateCursor();
    });

    // Listen for shape additions
    eventBus.on('shape:added', (shape: Shape) => {
      const command = new AddShapeCommand(this, shape);
      historyManager.execute(command);
    });

    // Listen for selection changes
    eventBus.on('selection:changed', (shapes: Shape[]) => {
      this.updateHandlesForSelection(shapes);
    });
  }

  /**
   * Initialize available tools
   */
  private initializeTools(): void {
    console.log('Canvas: Initializing tools');
    this.tools.set('select', new SelectTool({
      findShapeAt: (point) => this.findShapeAt(point),
      findHandleAt: (point) => this.findHandleAt(point),
      updateHandles: () => this.updateHandles()
    }));
    this.tools.set('line', new LineTool(this.svg));
    this.tools.set('ellipse', new EllipseTool(this.svg));
    console.log('Canvas: All tools registered');

    // Set initial tool
    console.log(`Canvas: Setting initial tool to ${editorState.currentTool}`);
    this.switchTool(editorState.currentTool);
  }

  /**
   * Switch to a different tool
   */
  private switchTool(toolType: ToolType): void {
    console.log(`Canvas: switchTool to ${toolType}`);
    // Deactivate current tool
    if (this.currentTool?.onDeactivate) {
      this.currentTool.onDeactivate();
    }

    // Clear handles when switching away from select tool
    if (toolType !== 'select') {
      this.clearHandles();
    }

    // Activate new tool
    this.currentTool = this.tools.get(toolType) || null;
    console.log(`Canvas: currentTool is now`, this.currentTool);
    if (this.currentTool?.onActivate) {
      this.currentTool.onActivate();
    }
  }

  /**
   * Update handles for current selection
   */
  private updateHandlesForSelection(shapes: Shape[]): void {
    // Clear existing handles
    this.clearHandles();

    // Create handles for selected shapes (only in select mode)
    if (editorState.currentTool !== 'select') return;

    shapes.forEach(shape => {
      const handleSet = this.createHandleSet(shape);
      if (handleSet) {
        handleSet.render(this.svg);
        this.handleSets.set(shape, handleSet);
      }
    });
  }

  /**
   * Create appropriate handle set for shape
   */
  private createHandleSet(shape: Shape): HandleSet | null {
    if (shape instanceof Line) {
      return new LineHandles(shape);
    } else if (shape instanceof Ellipse) {
      return new EllipseHandles(shape);
    }
    return null;
  }

  /**
   * Find handle at point
   */
  findHandleAt(point: Point): Handle | null {
    for (const handleSet of this.handleSets.values()) {
      const handle = handleSet.findHandleAt(point);
      if (handle) return handle;
    }
    return null;
  }

  /**
   * Update all handle positions
   */
  updateHandles(): void {
    this.handleSets.forEach(handleSet => handleSet.update());
  }

  /**
   * Clear all handles
   */
  private clearHandles(): void {
    this.handleSets.forEach(handleSet => handleSet.remove());
    this.handleSets.clear();
  }

  /**
   * Add a shape to the canvas
   */
  addShape(shape: Shape): void {
    this.shapes.push(shape);
    const element = shape.render();
    this.svg.appendChild(element);
  }

  /**
   * Remove a shape from the canvas
   */
  removeShape(shape: Shape): void {
    const index = this.shapes.indexOf(shape);
    if (index !== -1) {
      this.shapes.splice(index, 1);
      shape.element?.remove();
      // Remove handles for this shape
      const handleSet = this.handleSets.get(shape);
      if (handleSet) {
        handleSet.remove();
        this.handleSets.delete(shape);
      }
    }
  }

  /**
   * Get all shapes
   */
  getShapes(): Shape[] {
    return [...this.shapes];
  }

  /**
   * Find shape at point
   */
  findShapeAt(point: Point): Shape | null {
    // Search in reverse order (top-most first)
    for (let i = this.shapes.length - 1; i >= 0; i--) {
      if (this.shapes[i].hitTest(point)) {
        return this.shapes[i];
      }
    }
    return null;
  }

  /**
   * Get SVG element
   */
  getSvgElement(): SVGSVGElement {
    return this.svg;
  }

  /**
   * Get canvas dimensions
   */
  getSize(): { width: number; height: number } {
    return {
      width: this.svg.clientWidth,
      height: this.svg.clientHeight
    };
  }

  /**
   * Update canvas size to match container
   */
  updateSize(): void {
    const rect = this.container.getBoundingClientRect();
    this.svg.setAttribute('width', String(rect.width));
    this.svg.setAttribute('height', String(rect.height));
  }

  /**
   * Convert mouse event to SVG coordinates
   */
  private getPointFromEvent(event: MouseEvent): Point {
    const rect = this.svg.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  }

  /**
   * Update cursor based on current tool
   */
  private updateCursor(): void {
    const tool = editorState.currentTool;
    switch (tool) {
      case 'select':
        this.svg.style.cursor = 'default';
        break;
      case 'line':
      case 'ellipse':
        this.svg.style.cursor = 'crosshair';
        break;
      default:
        this.svg.style.cursor = 'default';
    }
  }

  /**
   * Setup mouse event listeners
   */
  private setupEventListeners(): void {
    this.svg.addEventListener('mousedown', (e) => {
      const point = this.getPointFromEvent(e);
      console.log(`Canvas: mousedown at (${point.x}, ${point.y}), currentTool:`, this.currentTool);
      this.currentTool?.onMouseDown(point, e);
    });

    this.svg.addEventListener('mousemove', (e) => {
      const point = this.getPointFromEvent(e);
      this.currentTool?.onMouseMove(point, e);
    });

    this.svg.addEventListener('mouseup', (e) => {
      const point = this.getPointFromEvent(e);
      this.currentTool?.onMouseUp(point, e);
    });

    this.svg.addEventListener('mouseleave', () => {
      this.currentTool?.onMouseLeave();
    });

    // Handle window resize
    window.addEventListener('resize', () => this.updateSize());
  }
}
