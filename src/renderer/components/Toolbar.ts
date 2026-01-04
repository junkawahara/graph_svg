import { ToolType } from '../../shared/types';
import { eventBus } from '../core/EventBus';
import { editorState } from '../core/EditorState';
import { historyManager } from '../core/HistoryManager';

/**
 * Toolbar component - handles tool selection and undo/redo
 */
export class Toolbar {
  private toolButtons: Map<ToolType, HTMLButtonElement> = new Map();
  private undoButton: HTMLButtonElement | null = null;
  private redoButton: HTMLButtonElement | null = null;

  constructor() {
    this.setupToolButtons();
    this.setupUndoRedoButtons();
    this.setupEventListeners();
  }

  /**
   * Initialize tool buttons
   */
  private setupToolButtons(): void {
    const tools: { id: string; type: ToolType }[] = [
      { id: 'tool-select', type: 'select' },
      { id: 'tool-line', type: 'line' },
      { id: 'tool-ellipse', type: 'ellipse' }
    ];

    tools.forEach(({ id, type }) => {
      const button = document.getElementById(id) as HTMLButtonElement;
      console.log(`Toolbar: Looking for button #${id}:`, button);
      if (button) {
        this.toolButtons.set(type, button);
        button.addEventListener('click', () => {
          console.log(`Toolbar: Button clicked, setting tool to ${type}`);
          editorState.setTool(type);
        });
      }
    });
  }

  /**
   * Setup Undo/Redo buttons
   */
  private setupUndoRedoButtons(): void {
    this.undoButton = document.getElementById('btn-undo') as HTMLButtonElement;
    this.redoButton = document.getElementById('btn-redo') as HTMLButtonElement;

    if (this.undoButton) {
      this.undoButton.addEventListener('click', () => {
        historyManager.undo();
      });
    }

    if (this.redoButton) {
      this.redoButton.addEventListener('click', () => {
        historyManager.redo();
      });
    }

    // Initial state
    this.updateUndoRedoButtons({ canUndo: false, canRedo: false });
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Update button states when tool changes
    eventBus.on('tool:changed', (tool: ToolType) => {
      this.updateActiveButton(tool);
    });

    // Update undo/redo buttons when history changes
    eventBus.on('history:changed', (state: { canUndo: boolean; canRedo: boolean }) => {
      this.updateUndoRedoButtons(state);
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Don't handle shortcuts if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) {
        return;
      }

      // Undo: Ctrl+Z
      if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        historyManager.undo();
        return;
      }

      // Redo: Ctrl+Y or Ctrl+Shift+Z
      if ((e.ctrlKey && e.key === 'y') || (e.ctrlKey && e.shiftKey && e.key === 'z')) {
        e.preventDefault();
        historyManager.redo();
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'v':
          editorState.setTool('select');
          break;
        case 'l':
          editorState.setTool('line');
          break;
        case 'e':
          editorState.setTool('ellipse');
          break;
      }
    });
  }

  /**
   * Update active button visual state
   */
  private updateActiveButton(activeTool: ToolType): void {
    this.toolButtons.forEach((button, tool) => {
      if (tool === activeTool) {
        button.classList.add('active');
      } else {
        button.classList.remove('active');
      }
    });
  }

  /**
   * Update Undo/Redo button states
   */
  private updateUndoRedoButtons(state: { canUndo: boolean; canRedo: boolean }): void {
    if (this.undoButton) {
      this.undoButton.disabled = !state.canUndo;
    }
    if (this.redoButton) {
      this.redoButton.disabled = !state.canRedo;
    }
  }
}
