import { ToolType, ShapeStyle, EdgeDirection, CanvasSize, DEFAULT_STYLE, DEFAULT_CANVAS_SIZE } from '../../shared/types';
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
  private _currentFilePath: string | null = null;
  private _isDirty: boolean = false;
  private _canvasSize: CanvasSize = { ...DEFAULT_CANVAS_SIZE };

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
   * Set grid size
   */
  setGridSize(size: number): void {
    const newSize = Math.max(5, Math.min(100, Math.round(size)));
    if (this._gridSize !== newSize) {
      this._gridSize = newSize;
      eventBus.emit('grid:sizeChanged', newSize);
    }
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

  /**
   * Get canvas size
   */
  get canvasSize(): CanvasSize {
    return { ...this._canvasSize };
  }

  /**
   * Set canvas size
   */
  setCanvasSize(width: number, height: number): void {
    // Enforce minimum size
    const newWidth = Math.max(100, Math.round(width));
    const newHeight = Math.max(100, Math.round(height));

    if (this._canvasSize.width !== newWidth || this._canvasSize.height !== newHeight) {
      this._canvasSize = { width: newWidth, height: newHeight };
      eventBus.emit('canvas:sizeChanged', this._canvasSize);
    }
  }

  /**
   * Get current file path
   */
  get currentFilePath(): string | null {
    return this._currentFilePath;
  }

  /**
   * Set current file path
   */
  setCurrentFilePath(path: string | null): void {
    this._currentFilePath = path;
    this.updateWindowTitle();
  }

  /**
   * Get dirty state
   */
  get isDirty(): boolean {
    return this._isDirty;
  }

  /**
   * Set dirty state
   */
  setDirty(dirty: boolean): void {
    if (this._isDirty !== dirty) {
      this._isDirty = dirty;
      this.updateWindowTitle();
      eventBus.emit('file:dirtyChanged', dirty);
    }
  }

  /**
   * Mark as dirty (called when content changes)
   */
  markDirty(): void {
    this.setDirty(true);
  }

  /**
   * Mark as clean (called after save)
   */
  markClean(): void {
    this.setDirty(false);
  }

  /**
   * Update window title based on current state
   */
  private updateWindowTitle(): void {
    const appName = 'DrawSVG';
    let title = appName;

    if (this._currentFilePath) {
      const fileName = this._currentFilePath.split('/').pop() || this._currentFilePath.split('\\').pop() || this._currentFilePath;
      title = `${this._isDirty ? '* ' : ''}${fileName} - ${appName}`;
    } else if (this._isDirty) {
      title = `* Untitled - ${appName}`;
    } else {
      title = `Untitled - ${appName}`;
    }

    window.electronAPI.setWindowTitle(title);
  }

  /**
   * Reset file state (for new document)
   */
  resetFileState(): void {
    this._currentFilePath = null;
    this._isDirty = false;
    this._canvasSize = { ...DEFAULT_CANVAS_SIZE };
    this.updateWindowTitle();
    eventBus.emit('canvas:sizeChanged', this._canvasSize);
  }
}

// Global editor state instance
export const editorState = new EditorState();
