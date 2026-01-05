import { ToolType, ShapeStyle, EdgeDirection, DEFAULT_STYLE } from '../../shared/types';
import { eventBus } from './EventBus';

/**
 * Central state management for the editor
 */
export class EditorState {
  private _currentTool: ToolType = 'select';
  private _currentStyle: ShapeStyle = { ...DEFAULT_STYLE };
  private _snapEnabled: boolean = false;
  private _gridSize: number = 10;
  private _edgeDirection: EdgeDirection = 'none';

  /**
   * Get current tool
   */
  get currentTool(): ToolType {
    return this._currentTool;
  }

  /**
   * Set current tool and emit event
   */
  setTool(tool: ToolType): void {
    console.log(`EditorState: setTool called with ${tool}, current is ${this._currentTool}`);
    if (this._currentTool !== tool) {
      this._currentTool = tool;
      console.log(`EditorState: Emitting tool:changed event`);
      eventBus.emit('tool:changed', tool);
    }
  }

  /**
   * Get current style
   */
  get currentStyle(): ShapeStyle {
    return { ...this._currentStyle };
  }

  /**
   * Update style properties and emit event
   */
  updateStyle(updates: Partial<ShapeStyle>): void {
    this._currentStyle = { ...this._currentStyle, ...updates };
    eventBus.emit('style:changed', this._currentStyle);
  }

  /**
   * Set entire style
   */
  setStyle(style: ShapeStyle): void {
    this._currentStyle = { ...style };
    eventBus.emit('style:changed', this._currentStyle);
  }

  /**
   * Get snap enabled state
   */
  get snapEnabled(): boolean {
    return this._snapEnabled;
  }

  /**
   * Get grid size
   */
  get gridSize(): number {
    return this._gridSize;
  }

  /**
   * Toggle snap enabled state
   */
  toggleSnap(): void {
    this._snapEnabled = !this._snapEnabled;
    eventBus.emit('snap:changed', this._snapEnabled);
  }

  /**
   * Set snap enabled state
   */
  setSnapEnabled(enabled: boolean): void {
    if (this._snapEnabled !== enabled) {
      this._snapEnabled = enabled;
      eventBus.emit('snap:changed', this._snapEnabled);
    }
  }

  /**
   * Snap a value to the grid
   */
  snapValue(value: number): number {
    if (!this._snapEnabled) return value;
    return Math.round(value / this._gridSize) * this._gridSize;
  }

  /**
   * Snap a point to the grid
   */
  snapPoint(point: { x: number; y: number }): { x: number; y: number } {
    if (!this._snapEnabled) return point;
    return {
      x: Math.round(point.x / this._gridSize) * this._gridSize,
      y: Math.round(point.y / this._gridSize) * this._gridSize
    };
  }

  /**
   * Get current edge direction for new edges
   */
  get edgeDirection(): EdgeDirection {
    return this._edgeDirection;
  }

  /**
   * Set edge direction for new edges
   */
  setEdgeDirection(direction: EdgeDirection): void {
    if (this._edgeDirection !== direction) {
      this._edgeDirection = direction;
      eventBus.emit('edgeDirection:changed', direction);
    }
  }

  /**
   * Toggle edge direction (none -> forward -> none)
   */
  toggleEdgeDirection(): void {
    this._edgeDirection = this._edgeDirection === 'none' ? 'forward' : 'none';
    eventBus.emit('edgeDirection:changed', this._edgeDirection);
  }
}

// Global editor state instance
export const editorState = new EditorState();
