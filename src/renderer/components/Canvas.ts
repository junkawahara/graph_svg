import { Point, ToolType } from '../../shared/types';
import { eventBus } from '../core/EventBus';
import { editorState } from '../core/EditorState';
import { Tool } from '../tools/Tool';
import { SelectTool } from '../tools/SelectTool';
import { LineTool } from '../tools/LineTool';
import { EllipseTool } from '../tools/EllipseTool';
import { Shape } from '../shapes/Shape';

/**
 * Canvas component - manages SVG element, tools, and shapes
 */
export class Canvas {
  private svg: SVGSVGElement;
  private container: HTMLElement;
  private tools: Map<ToolType, Tool> = new Map();
  private currentTool: Tool | null = null;
  private shapes: Shape[] = [];

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
      this.addShape(shape);
    });
  }

  /**
   * Initialize available tools
   */
  private initializeTools(): void {
    console.log('Canvas: Initializing tools');
    this.tools.set('select', new SelectTool((point) => this.findShapeAt(point)));
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

    // Activate new tool
    this.currentTool = this.tools.get(toolType) || null;
    console.log(`Canvas: currentTool is now`, this.currentTool);
    if (this.currentTool?.onActivate) {
      this.currentTool.onActivate();
    }
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
