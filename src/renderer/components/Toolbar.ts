import { ToolType } from '../../shared/types';
import { eventBus } from '../core/EventBus';
import { editorState } from '../core/EditorState';
import { historyManager } from '../core/HistoryManager';
import { selectionManager } from '../core/SelectionManager';
import { clipboardManager } from '../core/ClipboardManager';
import { Shape } from '../shapes/Shape';

/**
 * Toolbar component - handles tool selection, undo/redo, and delete
 */
export class Toolbar {
  private toolButtons: Map<ToolType, HTMLButtonElement> = new Map();
  private undoButton: HTMLButtonElement | null = null;
  private redoButton: HTMLButtonElement | null = null;
  private deleteButton: HTMLButtonElement | null = null;

  constructor() {
    this.setupToolButtons();
    this.setupUndoRedoButtons();
    this.setupDeleteButton();
    this.setupFileButtons();
    this.setupEventListeners();
  }

  /**
   * Initialize tool buttons
   */
  private setupToolButtons(): void {
    const tools: { id: string; type: ToolType }[] = [
      { id: 'tool-select', type: 'select' },
      { id: 'tool-line', type: 'line' },
      { id: 'tool-ellipse', type: 'ellipse' },
      { id: 'tool-rectangle', type: 'rectangle' }
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
   * Setup Delete button
   */
  private setupDeleteButton(): void {
    this.deleteButton = document.getElementById('btn-delete') as HTMLButtonElement;

    if (this.deleteButton) {
      this.deleteButton.addEventListener('click', () => {
        this.deleteSelectedShapes();
      });
    }

    // Initial state
    this.updateDeleteButton(false);
  }

  /**
   * Setup Open/Save buttons
   */
  private setupFileButtons(): void {
    const openButton = document.getElementById('btn-open') as HTMLButtonElement;
    const saveButton = document.getElementById('btn-save') as HTMLButtonElement;

    if (openButton) {
      openButton.addEventListener('click', () => {
        eventBus.emit('file:open', null);
      });
    }

    if (saveButton) {
      saveButton.addEventListener('click', () => {
        eventBus.emit('file:save', null);
      });
    }
  }

  /**
   * Delete currently selected shapes
   */
  private deleteSelectedShapes(): void {
    const selectedShapes = selectionManager.getSelection();
    if (selectedShapes.length > 0) {
      eventBus.emit('shapes:delete', selectedShapes);
      selectionManager.clearSelection();
    }
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

    // Update delete button when selection changes
    eventBus.on('selection:changed', (shapes: Shape[]) => {
      this.updateDeleteButton(shapes.length > 0);
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

      // Delete: Delete or Backspace
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        this.deleteSelectedShapes();
        return;
      }

      // Save: Ctrl+S
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        eventBus.emit('file:save', null);
        return;
      }

      // Open: Ctrl+O
      if (e.ctrlKey && e.key === 'o') {
        e.preventDefault();
        eventBus.emit('file:open', null);
        return;
      }

      // Copy: Ctrl+C
      if (e.ctrlKey && e.key === 'c') {
        e.preventDefault();
        this.copySelectedShapes();
        return;
      }

      // Paste: Ctrl+V
      if (e.ctrlKey && e.key === 'v') {
        e.preventDefault();
        this.pasteShapes();
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
        case 'r':
          editorState.setTool('rectangle');
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

  /**
   * Update Delete button state
   */
  private updateDeleteButton(hasSelection: boolean): void {
    if (this.deleteButton) {
      this.deleteButton.disabled = !hasSelection;
    }
  }

  /**
   * Copy selected shapes to clipboard
   */
  private copySelectedShapes(): void {
    const selectedShapes = selectionManager.getSelection();
    if (selectedShapes.length > 0) {
      clipboardManager.copy(selectedShapes);
      console.log(`Copied ${selectedShapes.length} shape(s) to clipboard`);
    }
  }

  /**
   * Paste shapes from clipboard
   */
  private pasteShapes(): void {
    if (clipboardManager.hasContent()) {
      eventBus.emit('shapes:paste', null);
    }
  }
}
