import { Point, ToolType } from '../../shared/types';
import { eventBus } from '../core/EventBus';
import { editorState } from '../core/EditorState';
import { selectionManager } from '../core/SelectionManager';
import { historyManager } from '../core/HistoryManager';
import { Tool } from '../tools/Tool';
import { SelectTool } from '../tools/SelectTool';
import { LineTool } from '../tools/LineTool';
import { EllipseTool } from '../tools/EllipseTool';
import { RectangleTool } from '../tools/RectangleTool';
import { TextTool } from '../tools/TextTool';
import { NodeTool } from '../tools/NodeTool';
import { Shape } from '../shapes/Shape';
import { Line } from '../shapes/Line';
import { Ellipse } from '../shapes/Ellipse';
import { Rectangle } from '../shapes/Rectangle';
import { Text } from '../shapes/Text';
import { Node } from '../shapes/Node';
import { Handle, HandleSet } from '../handles/Handle';
import { LineHandles } from '../handles/LineHandles';
import { EllipseHandles } from '../handles/EllipseHandles';
import { RectangleHandles } from '../handles/RectangleHandles';
import { TextHandles } from '../handles/TextHandles';
import { NodeHandles } from '../handles/NodeHandles';
import { AddShapeCommand } from '../commands/AddShapeCommand';
import { AddNodeCommand } from '../commands/AddNodeCommand';
import { DeleteShapeCommand } from '../commands/DeleteShapeCommand';
import { ZOrderCommand, ZOrderOperation } from '../commands/ZOrderCommand';
import { initMarkerManager } from '../core/MarkerManager';

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

  // Zoom/Pan state
  private scale: number = 1;
  private panX: number = 0;
  private panY: number = 0;
  private isPanning: boolean = false;
  private isSpacePressed: boolean = false;
  private lastPanPoint: Point | null = null;

  // Zoom constraints
  private readonly MIN_SCALE = 0.1;
  private readonly MAX_SCALE = 10;
  private readonly ZOOM_FACTOR = 0.1;

  // Grid element
  private gridGroup: SVGGElement | null = null;

  constructor(svgElement: SVGSVGElement, containerElement: HTMLElement) {
    this.svg = svgElement;
    this.container = containerElement;

    // Initialize marker manager for arrow heads
    initMarkerManager(this.svg);

    // Initialize grid
    this.initializeGrid();

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
      if (shape instanceof Node) {
        const command = new AddNodeCommand(this, shape);
        historyManager.execute(command);
      } else {
        const command = new AddShapeCommand(this, shape);
        historyManager.execute(command);
      }
    });

    // Listen for selection changes
    eventBus.on('selection:changed', (shapes: Shape[]) => {
      this.updateHandlesForSelection(shapes);
    });

    // Listen for delete requests
    eventBus.on('shapes:delete', (shapes: Shape[]) => {
      const command = new DeleteShapeCommand(this, [...shapes]);
      historyManager.execute(command);
    });

    // Listen for z-order requests
    eventBus.on('shapes:zorder', (data: { shapes: Shape[]; operation: ZOrderOperation }) => {
      const command = new ZOrderCommand(
        data.shapes,
        data.operation,
        () => this.getShapes(),
        (newOrder) => this.reorderShapes(newOrder)
      );
      historyManager.execute(command);
    });

    // Listen for zoom reset requests
    eventBus.on('canvas:zoomReset', () => {
      this.resetZoom();
    });

    // Listen for snap state changes
    eventBus.on('snap:changed', (enabled: boolean) => {
      this.updateGridVisibility(enabled);
    });
  }

  /**
   * Initialize the grid pattern and group
   */
  private initializeGrid(): void {
    const gridSize = editorState.gridSize;

    // Get or create defs element
    let defs = this.svg.querySelector('defs');
    if (!defs) {
      defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
      this.svg.insertBefore(defs, this.svg.firstChild);
    }

    // Create grid pattern
    const pattern = document.createElementNS('http://www.w3.org/2000/svg', 'pattern');
    pattern.setAttribute('id', 'grid-pattern');
    pattern.setAttribute('width', String(gridSize));
    pattern.setAttribute('height', String(gridSize));
    pattern.setAttribute('patternUnits', 'userSpaceOnUse');

    // Create grid lines
    const pathD = `M ${gridSize} 0 L 0 0 0 ${gridSize}`;
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', pathD);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', '#cccccc');
    path.setAttribute('stroke-width', '0.5');
    pattern.appendChild(path);

    defs.appendChild(pattern);

    // Create grid group with background rect
    this.gridGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    this.gridGroup.setAttribute('id', 'grid-layer');
    this.gridGroup.style.display = 'none';

    const gridRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    gridRect.setAttribute('width', '10000');
    gridRect.setAttribute('height', '10000');
    gridRect.setAttribute('x', '-5000');
    gridRect.setAttribute('y', '-5000');
    gridRect.setAttribute('fill', 'url(#grid-pattern)');
    this.gridGroup.appendChild(gridRect);

    // Insert grid after defs, before shapes
    this.svg.insertBefore(this.gridGroup, defs.nextSibling);
  }

  /**
   * Update grid visibility
   */
  private updateGridVisibility(visible: boolean): void {
    if (this.gridGroup) {
      this.gridGroup.style.display = visible ? 'block' : 'none';
    }
  }

  /**
   * Initialize available tools
   */
  private initializeTools(): void {
    console.log('Canvas: Initializing tools');
    this.tools.set('select', new SelectTool({
      findShapeAt: (point) => this.findShapeAt(point),
      findHandleAt: (point) => this.findHandleAt(point),
      updateHandles: () => this.updateHandles(),
      getShapes: () => this.getShapes(),
      getSvgElement: () => this.svg
    }));
    this.tools.set('line', new LineTool(this.svg));
    this.tools.set('ellipse', new EllipseTool(this.svg));
    this.tools.set('rectangle', new RectangleTool(this.svg));
    this.tools.set('text', new TextTool());
    this.tools.set('node', new NodeTool());
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
    } else if (shape instanceof Rectangle) {
      return new RectangleHandles(shape);
    } else if (shape instanceof Text) {
      return new TextHandles(shape);
    } else if (shape instanceof Node) {
      return new NodeHandles(shape);
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
   * Reorder shapes (for z-order operations)
   */
  reorderShapes(newOrder: Shape[]): void {
    this.shapes = newOrder;

    // Reorder SVG elements to match new order
    // Get the defs element (marker definitions) to insert shapes after it
    const defs = this.svg.querySelector('defs');

    newOrder.forEach(shape => {
      if (shape.element) {
        // Re-append in order (moves element to end)
        this.svg.appendChild(shape.element);
      }
    });

    // Re-append handles on top
    this.handleSets.forEach(handleSet => {
      if (handleSet.element) {
        this.svg.appendChild(handleSet.element);
      }
    });
  }

  /**
   * Get all shapes
   */
  getShapes(): Shape[] {
    return [...this.shapes];
  }

  /**
   * Clear all shapes from the canvas
   */
  clearAll(): void {
    // Clear selection first
    selectionManager.clearSelection();

    // Remove all shapes
    this.shapes.forEach(shape => {
      shape.element?.remove();
    });
    this.shapes = [];

    // Clear handles
    this.clearHandles();
  }

  /**
   * Load shapes into canvas (replaces existing shapes)
   */
  loadShapes(shapes: Shape[]): void {
    // Clear existing shapes
    this.clearAll();

    // Add new shapes
    shapes.forEach(shape => {
      this.shapes.push(shape);
      const element = shape.render();
      this.svg.appendChild(element);
    });
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

    // Update viewBox to reflect current zoom/pan state
    this.updateViewBox();
  }

  /**
   * Convert mouse event to SVG coordinates (accounting for zoom/pan)
   */
  private getPointFromEvent(event: MouseEvent): Point {
    const rect = this.svg.getBoundingClientRect();
    const screenX = event.clientX - rect.left;
    const screenY = event.clientY - rect.top;

    // Convert screen coordinates to SVG coordinates
    return {
      x: screenX / this.scale + this.panX,
      y: screenY / this.scale + this.panY
    };
  }

  /**
   * Convert screen coordinates to SVG coordinates
   */
  screenToSvg(screenX: number, screenY: number): Point {
    return {
      x: screenX / this.scale + this.panX,
      y: screenY / this.scale + this.panY
    };
  }

  /**
   * Update the SVG viewBox based on current zoom/pan state
   */
  private updateViewBox(): void {
    const rect = this.container.getBoundingClientRect();
    const viewWidth = rect.width / this.scale;
    const viewHeight = rect.height / this.scale;
    this.svg.setAttribute('viewBox', `${this.panX} ${this.panY} ${viewWidth} ${viewHeight}`);

    // Emit zoom changed event
    eventBus.emit('canvas:zoomChanged', { scale: this.scale, panX: this.panX, panY: this.panY });
  }

  /**
   * Zoom at a specific point (keeps that point stationary)
   */
  private zoomAt(screenX: number, screenY: number, delta: number): void {
    const oldScale = this.scale;
    const newScale = Math.min(this.MAX_SCALE, Math.max(this.MIN_SCALE, this.scale * (1 + delta)));

    if (newScale === oldScale) return;

    // Calculate the SVG point under the cursor before zoom
    const svgX = screenX / oldScale + this.panX;
    const svgY = screenY / oldScale + this.panY;

    // Update scale
    this.scale = newScale;

    // Adjust pan so the point under cursor stays in the same place
    this.panX = svgX - screenX / newScale;
    this.panY = svgY - screenY / newScale;

    this.updateViewBox();
  }

  /**
   * Reset zoom and pan to default
   */
  resetZoom(): void {
    this.scale = 1;
    this.panX = 0;
    this.panY = 0;
    this.updateViewBox();
  }

  /**
   * Get current zoom level
   */
  getZoom(): number {
    return this.scale;
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
      case 'rectangle':
        this.svg.style.cursor = 'crosshair';
        break;
      case 'text':
        this.svg.style.cursor = 'text';
        break;
      case 'node':
        this.svg.style.cursor = 'crosshair';
        break;
      case 'pan':
        this.svg.style.cursor = 'grab';
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
      // Handle panning with space+drag or pan tool
      if (this.isSpacePressed || editorState.currentTool === 'pan') {
        e.preventDefault();
        this.isPanning = true;
        this.lastPanPoint = { x: e.clientX, y: e.clientY };
        this.svg.style.cursor = 'grabbing';
        return;
      }

      const point = this.getPointFromEvent(e);
      this.currentTool?.onMouseDown(point, e);
    });

    this.svg.addEventListener('mousemove', (e) => {
      // Handle panning
      if (this.isPanning && this.lastPanPoint) {
        const dx = (e.clientX - this.lastPanPoint.x) / this.scale;
        const dy = (e.clientY - this.lastPanPoint.y) / this.scale;
        this.panX -= dx;
        this.panY -= dy;
        this.lastPanPoint = { x: e.clientX, y: e.clientY };
        this.updateViewBox();
        return;
      }

      const point = this.getPointFromEvent(e);
      this.currentTool?.onMouseMove(point, e);
    });

    this.svg.addEventListener('mouseup', (e) => {
      if (this.isPanning) {
        this.isPanning = false;
        this.lastPanPoint = null;
        if (this.isSpacePressed || editorState.currentTool === 'pan') {
          this.svg.style.cursor = 'grab';
        }
        return;
      }

      const point = this.getPointFromEvent(e);
      this.currentTool?.onMouseUp(point, e);
    });

    this.svg.addEventListener('mouseleave', () => {
      if (this.isPanning) {
        this.isPanning = false;
        this.lastPanPoint = null;
        return;
      }
      this.currentTool?.onMouseLeave();
    });

    // Mouse wheel for zooming
    this.svg.addEventListener('wheel', (e) => {
      e.preventDefault();
      const rect = this.svg.getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;

      // Zoom in/out based on wheel direction
      const delta = e.deltaY < 0 ? this.ZOOM_FACTOR : -this.ZOOM_FACTOR;
      this.zoomAt(screenX, screenY, delta);
    }, { passive: false });

    // Keyboard events for space key (panning)
    document.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && !this.isSpacePressed) {
        // Don't intercept if user is typing in an input
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement || e.target instanceof HTMLTextAreaElement) {
          return;
        }
        e.preventDefault();
        this.isSpacePressed = true;
        this.svg.style.cursor = 'grab';
      }
    });

    document.addEventListener('keyup', (e) => {
      if (e.code === 'Space') {
        this.isSpacePressed = false;
        this.isPanning = false;
        this.lastPanPoint = null;
        this.updateCursor();
      }
    });

    // Handle window resize
    window.addEventListener('resize', () => {
      this.updateSize();
      this.updateViewBox();
    });
  }
}
