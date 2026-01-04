import { Point } from '../../shared/types';
import { eventBus } from '../core/EventBus';
import { editorState } from '../core/EditorState';

/**
 * Canvas component - manages SVG element and mouse events
 */
export class Canvas {
  private svg: SVGSVGElement;
  private container: HTMLElement;

  constructor(svgElement: SVGSVGElement, containerElement: HTMLElement) {
    this.svg = svgElement;
    this.container = containerElement;

    this.setupEventListeners();
    this.updateSize();
    this.updateCursor();

    // Listen for tool changes to update cursor
    eventBus.on('tool:changed', () => this.updateCursor());
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
      console.log(`Canvas mousedown at (${point.x}, ${point.y}), tool: ${editorState.currentTool}`);
      // Tool handling will be added in Phase 3
    });

    this.svg.addEventListener('mousemove', (e) => {
      const point = this.getPointFromEvent(e);
      // Tool handling will be added in Phase 3
    });

    this.svg.addEventListener('mouseup', (e) => {
      const point = this.getPointFromEvent(e);
      console.log(`Canvas mouseup at (${point.x}, ${point.y})`);
      // Tool handling will be added in Phase 3
    });

    this.svg.addEventListener('mouseleave', () => {
      // Tool handling will be added in Phase 3
    });

    // Handle window resize
    window.addEventListener('resize', () => this.updateSize());
  }
}
