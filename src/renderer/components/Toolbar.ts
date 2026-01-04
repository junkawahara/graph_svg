import { ToolType } from '../../shared/types';
import { eventBus } from '../core/EventBus';
import { editorState } from '../core/EditorState';
import { historyManager } from '../core/HistoryManager';
import { selectionManager } from '../core/SelectionManager';
import { clipboardManager } from '../core/ClipboardManager';
import { Shape } from '../shapes/Shape';
import { ZOrderOperation } from '../commands/ZOrderCommand';

/**
 * Toolbar component - handles tool selection, undo/redo, and delete
 */
export class Toolbar {
  private toolButtons: Map<ToolType, HTMLButtonElement> = new Map();
  private undoButton: HTMLButtonElement | null = null;
  private redoButton: HTMLButtonElement | null = null;
  private deleteButton: HTMLButtonElement | null = null;

  // Z-order buttons
  private bringFrontButton: HTMLButtonElement | null = null;
  private bringForwardButton: HTMLButtonElement | null = null;
  private sendBackwardButton: HTMLButtonElement | null = null;
  private sendBackButton: HTMLButtonElement | null = null;

  // Zoom controls
  private zoomIndicator: HTMLSpanElement | null = null;
  private zoomResetButton: HTMLButtonElement | null = null;

  constructor() {
    this.setupToolButtons();
    this.setupUndoRedoButtons();
    this.setupDeleteButton();
    this.setupZOrderButtons();
    this.setupZoomControls();
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
      { id: 'tool-rectangle', type: 'rectangle' },
      { id: 'tool-text', type: 'text' }
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
   * Setup Z-order buttons
   */
  private setupZOrderButtons(): void {
    this.bringFrontButton = document.getElementById('btn-bring-front') as HTMLButtonElement;
    this.bringForwardButton = document.getElementById('btn-bring-forward') as HTMLButtonElement;
    this.sendBackwardButton = document.getElementById('btn-send-backward') as HTMLButtonElement;
    this.sendBackButton = document.getElementById('btn-send-back') as HTMLButtonElement;

    if (this.bringFrontButton) {
      this.bringFrontButton.addEventListener('click', () => this.changeZOrder('bringToFront'));
    }
    if (this.bringForwardButton) {
      this.bringForwardButton.addEventListener('click', () => this.changeZOrder('bringForward'));
    }
    if (this.sendBackwardButton) {
      this.sendBackwardButton.addEventListener('click', () => this.changeZOrder('sendBackward'));
    }
    if (this.sendBackButton) {
      this.sendBackButton.addEventListener('click', () => this.changeZOrder('sendToBack'));
    }

    // Initial state
    this.updateZOrderButtons(false);
  }

  /**
   * Change z-order of selected shapes
   */
  private changeZOrder(operation: ZOrderOperation): void {
    const selectedShapes = selectionManager.getSelection();
    if (selectedShapes.length > 0) {
      eventBus.emit('shapes:zorder', { shapes: selectedShapes, operation });
    }
  }

  /**
   * Setup zoom controls
   */
  private setupZoomControls(): void {
    this.zoomIndicator = document.getElementById('zoom-indicator') as HTMLSpanElement;
    this.zoomResetButton = document.getElementById('btn-zoom-reset') as HTMLButtonElement;

    if (this.zoomResetButton) {
      this.zoomResetButton.addEventListener('click', () => {
        eventBus.emit('canvas:zoomReset', null);
      });
    }
  }

  /**
   * Update zoom indicator display
   */
  private updateZoomIndicator(scale: number): void {
    if (this.zoomIndicator) {
      this.zoomIndicator.textContent = `${Math.round(scale * 100)}%`;
    }
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

    // Update delete and z-order buttons when selection changes
    eventBus.on('selection:changed', (shapes: Shape[]) => {
      const hasSelection = shapes.length > 0;
      this.updateDeleteButton(hasSelection);
      this.updateZOrderButtons(hasSelection);
    });

    // Update zoom indicator when zoom changes
    eventBus.on('canvas:zoomChanged', (data: { scale: number }) => {
      this.updateZoomIndicator(data.scale);
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

      // Z-order shortcuts
      // Bring to Front: Ctrl+Shift+]
      if (e.ctrlKey && e.shiftKey && e.key === ']') {
        e.preventDefault();
        this.changeZOrder('bringToFront');
        return;
      }

      // Bring Forward: Ctrl+]
      if (e.ctrlKey && !e.shiftKey && e.key === ']') {
        e.preventDefault();
        this.changeZOrder('bringForward');
        return;
      }

      // Send to Back: Ctrl+Shift+[
      if (e.ctrlKey && e.shiftKey && e.key === '[') {
        e.preventDefault();
        this.changeZOrder('sendToBack');
        return;
      }

      // Send Backward: Ctrl+[
      if (e.ctrlKey && !e.shiftKey && e.key === '[') {
        e.preventDefault();
        this.changeZOrder('sendBackward');
        return;
      }

      // Zoom reset: Ctrl+0
      if (e.ctrlKey && e.key === '0') {
        e.preventDefault();
        eventBus.emit('canvas:zoomReset', null);
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
        case 't':
          editorState.setTool('text');
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
   * Update Z-order button states
   */
  private updateZOrderButtons(hasSelection: boolean): void {
    if (this.bringFrontButton) {
      this.bringFrontButton.disabled = !hasSelection;
    }
    if (this.bringForwardButton) {
      this.bringForwardButton.disabled = !hasSelection;
    }
    if (this.sendBackwardButton) {
      this.sendBackwardButton.disabled = !hasSelection;
    }
    if (this.sendBackButton) {
      this.sendBackButton.disabled = !hasSelection;
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
