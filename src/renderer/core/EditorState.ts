import { ToolType, ShapeStyle, DEFAULT_STYLE } from '../../shared/types';
import { eventBus } from './EventBus';

/**
 * Central state management for the editor
 */
export class EditorState {
  private _currentTool: ToolType = 'select';
  private _currentStyle: ShapeStyle = { ...DEFAULT_STYLE };

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
}

// Global editor state instance
export const editorState = new EditorState();
