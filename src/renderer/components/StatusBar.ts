import { ToolType } from '../../shared/types';
import { eventBus } from '../core/EventBus';
import { editorState } from '../core/EditorState';

/**
 * Tool display names for status bar
 */
const TOOL_NAMES: Record<ToolType, string> = {
  'select': 'Select',
  'line': 'Line',
  'ellipse': 'Ellipse',
  'rectangle': 'Rectangle',
  'polygon': 'Polygon',
  'polyline': 'Polyline',
  'path': 'Path',
  'text': 'Text',
  'node': 'Node',
  'edge': 'Edge',
  'delete-node': 'Delete Node',
  'delete-edge': 'Delete Edge',
  'pan': 'Pan',
  'zoom': 'Zoom',
  'rotate': 'Rotate'
};

/**
 * StatusBar component - displays mouse position and current tool
 */
export class StatusBar {
  private positionDisplay: HTMLSpanElement | null = null;
  private toolDisplay: HTMLSpanElement | null = null;

  constructor() {
    this.setupElements();
    this.setupEventListeners();
    this.updateToolDisplay(editorState.currentTool);
  }

  /**
   * Setup DOM elements
   */
  private setupElements(): void {
    this.positionDisplay = document.getElementById('status-position') as HTMLSpanElement;
    this.toolDisplay = document.getElementById('status-tool') as HTMLSpanElement;
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Update tool display when tool changes
    eventBus.on('tool:changed', (tool: ToolType) => {
      this.updateToolDisplay(tool);
    });

    // Update position display when mouse moves
    eventBus.on('canvas:mouseMove', (pos: { x: number; y: number }) => {
      this.updatePositionDisplay(pos.x, pos.y);
    });
  }

  /**
   * Update position display
   */
  private updatePositionDisplay(x: number, y: number): void {
    if (this.positionDisplay) {
      this.positionDisplay.textContent = `X: ${Math.round(x)}, Y: ${Math.round(y)}`;
    }
  }

  /**
   * Update tool display
   */
  private updateToolDisplay(tool: ToolType): void {
    if (this.toolDisplay) {
      this.toolDisplay.textContent = TOOL_NAMES[tool] || tool;
    }
  }
}
