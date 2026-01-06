import './styles/main.css';
import './styles/toolbar.css';
import './styles/sidebar.css';
import './styles/canvas.css';
import './styles/dialog.css';

import { Canvas } from './components/Canvas';
import { Toolbar } from './components/Toolbar';
import { Sidebar } from './components/Sidebar';
import { StatusBar } from './components/StatusBar';
import { SettingsDialog } from './components/SettingsDialog';
import { ConfirmDialog, ConfirmResult } from './components/ConfirmDialog';
import { eventBus } from './core/EventBus';
import { historyManager } from './core/HistoryManager';
import { FileManager } from './core/FileManager';
import { clipboardManager } from './core/ClipboardManager';
import { selectionManager } from './core/SelectionManager';
import { editorState } from './core/EditorState';
import { createShapeFromData } from './shapes/ShapeFactory';
import { PasteShapesCommand } from './commands/PasteShapesCommand';
import { FitCanvasToContentCommand } from './commands/FitCanvasToContentCommand';
import { Shape } from './shapes/Shape';
import { Group } from './shapes/Group';
import { ToolType } from '../shared/types';
import { ZOrderOperation } from './commands/ZOrderCommand';
import { calculateFitToContent, calculateContentBounds } from './core/BoundsCalculator';

document.addEventListener('DOMContentLoaded', () => {
  console.log('DrawSVG initialized');

  // Get DOM elements
  const svgElement = document.getElementById('canvas') as unknown as SVGSVGElement;
  const canvasContainer = document.getElementById('canvas-container')!;

  // Initialize components
  const canvas = new Canvas(svgElement, canvasContainer);
  const toolbar = new Toolbar();
  const sidebar = new Sidebar();
  const statusBar = new StatusBar();

  /**
   * Helper function to check for unsaved changes and show confirmation dialog
   * Returns true if it's okay to proceed, false if cancelled
   */
  async function checkUnsavedChanges(): Promise<boolean> {
    if (!editorState.isDirty) {
      return true;
    }

    const dialog = new ConfirmDialog();
    const result = await dialog.show({
      title: '未保存の変更',
      message: '現在の図に未保存の変更があります。保存しますか？',
      saveButtonText: '保存',
      discardButtonText: '保存しない',
      cancelButtonText: 'キャンセル'
    });

    if (result === 'cancel') {
      return false;
    }

    if (result === 'save') {
      // Save the file first
      const shapes = canvas.getShapes();
      const canvasSize = editorState.canvasSize;
      const svgContent = FileManager.serialize(shapes, canvasSize.width, canvasSize.height);

      const currentPath = editorState.currentFilePath;
      if (currentPath) {
        const success = await window.electronAPI.saveFileToPath(currentPath, svgContent);
        if (!success) {
          return false;
        }
      } else {
        const filePath = await window.electronAPI.saveFileAs(svgContent);
        if (!filePath) {
          return false;
        }
        editorState.setCurrentFilePath(filePath);
      }
      editorState.markClean();
    }

    return true;
  }

  // File new handler
  eventBus.on('file:new', async () => {
    const canProceed = await checkUnsavedChanges();
    if (!canProceed) return;

    // Clear the canvas
    canvas.clearAll();
    historyManager.clear();
    editorState.resetFileState();
    console.log('New file created');
  });

  // File save handler (save to existing path or show dialog for new file)
  eventBus.on('file:save', async () => {
    const shapes = canvas.getShapes();
    const canvasSize = editorState.canvasSize;
    const svgContent = FileManager.serialize(shapes, canvasSize.width, canvasSize.height);

    const currentPath = editorState.currentFilePath;

    if (currentPath) {
      // Save to existing path
      const success = await window.electronAPI.saveFileToPath(currentPath, svgContent);
      if (success) {
        editorState.markClean();
        console.log('File saved:', currentPath);
      }
    } else {
      // No existing path, show save dialog
      const filePath = await window.electronAPI.saveFileAs(svgContent);
      if (filePath) {
        editorState.setCurrentFilePath(filePath);
        editorState.markClean();
        console.log('File saved:', filePath);
      }
    }
  });

  // File save as handler (always show dialog)
  eventBus.on('file:saveAs', async () => {
    const shapes = canvas.getShapes();
    const canvasSize = editorState.canvasSize;
    const svgContent = FileManager.serialize(shapes, canvasSize.width, canvasSize.height);

    const currentPath = editorState.currentFilePath;
    const filePath = await window.electronAPI.saveFileAs(svgContent, currentPath || undefined);
    if (filePath) {
      editorState.setCurrentFilePath(filePath);
      editorState.markClean();
      console.log('File saved as:', filePath);
    }
  });

  // File open handler
  eventBus.on('file:open', async () => {
    const canProceed = await checkUnsavedChanges();
    if (!canProceed) return;

    const result = await window.electronAPI.openFile();
    if (result) {
      const { shapes, canvasSize } = FileManager.parse(result.content);
      // Set canvas size before loading shapes
      editorState.setCanvasSize(canvasSize.width, canvasSize.height);
      canvas.loadShapes(shapes);
      // Clear history when loading a new file
      historyManager.clear();
      // Set file path and mark as clean
      editorState.setCurrentFilePath(result.path);
      editorState.markClean();
      console.log('File loaded:', result.path, `(${shapes.length} shapes, ${canvasSize.width}x${canvasSize.height})`);
    }
  });

  // Mark as dirty when history changes (undo/redo stack modified)
  eventBus.on('history:changed', () => {
    // If there's any history (can undo), mark as dirty
    if (historyManager.canUndo()) {
      editorState.markDirty();
    }
  });

  // Paste handler
  eventBus.on('shapes:paste', () => {
    const clipboardContent = clipboardManager.getContent();
    if (clipboardContent.length === 0) return;

    const offset = clipboardManager.getPasteOffset();
    const newShapes: Shape[] = [];

    clipboardContent.forEach(data => {
      const shape = createShapeFromData(data, offset, offset);
      if (shape) {
        newShapes.push(shape);
      }
    });

    if (newShapes.length > 0) {
      // Execute paste command
      const command = new PasteShapesCommand(canvas, newShapes);
      historyManager.execute(command);

      // Select the pasted shapes
      selectionManager.clearSelection();
      newShapes.forEach((shape, index) => {
        if (index === 0) {
          selectionManager.select(shape);
        } else {
          selectionManager.addToSelection(shape);
        }
      });

      console.log(`Pasted ${newShapes.length} shape(s)`);
    }
  });

  // Fit Canvas to Content handler
  eventBus.on('canvas:fitToContent', async () => {
    const shapes = canvas.getShapes();
    if (shapes.length === 0) {
      console.log('No shapes to fit');
      return;
    }

    const settings = await window.electronAPI.readSettings();
    const margin = settings.fitToContentMargin ?? 20; // Default to 20 if not set
    const fitResult = calculateFitToContent(shapes, margin);

    if (!fitResult) {
      console.log('No content bounds to fit');
      return;
    }

    const { newWidth, newHeight, offsetX, offsetY } = fitResult;
    const beforeSize = editorState.canvasSize;

    // Only execute if there's a change
    if (beforeSize.width === newWidth && beforeSize.height === newHeight && offsetX === 0 && offsetY === 0) {
      console.log('Canvas already fits content');
      return;
    }

    const command = new FitCanvasToContentCommand(
      shapes,
      beforeSize,
      { width: newWidth, height: newHeight },
      offsetX,
      offsetY
    );
    historyManager.execute(command);
    console.log(`Canvas fitted to content: ${newWidth}x${newHeight} (offset: ${offsetX}, ${offsetY})`);
  });

  // Export Fit to Content handler
  eventBus.on('file:exportFitToContent', async () => {
    const shapes = canvas.getShapes();
    if (shapes.length === 0) {
      console.log('No shapes to export');
      return;
    }

    const settings = await window.electronAPI.readSettings();
    const margin = settings.fitToContentMargin ?? 20; // Default to 20 if not set
    const bounds = calculateContentBounds(shapes);

    if (bounds.isEmpty) {
      console.log('No content bounds to export');
      return;
    }

    // Calculate offset and new size
    const offsetX = margin - bounds.x;
    const offsetY = margin - bounds.y;
    const fittedWidth = Math.max(100, Math.ceil(bounds.width + margin * 2));
    const fittedHeight = Math.max(100, Math.ceil(bounds.height + margin * 2));

    // Clone shapes and apply offset for export (don't modify originals)
    const exportShapes: Shape[] = shapes.map(shape => {
      const cloned = shape.clone();
      cloned.move(offsetX, offsetY);
      return cloned;
    });

    // Serialize with fitted dimensions
    const svgContent = FileManager.serialize(exportShapes, fittedWidth, fittedHeight);

    // Show save dialog
    const currentPath = editorState.currentFilePath;
    const defaultPath = currentPath
      ? currentPath.replace(/\.svg$/i, '-fitted.svg')
      : 'drawing-fitted.svg';

    const filePath = await window.electronAPI.saveFileAs(svgContent, defaultPath);
    if (filePath) {
      console.log('Exported fit to content:', filePath, `(${fittedWidth}x${fittedHeight})`);
    }
  });

  console.log('Components initialized:', { canvas, toolbar, sidebar, statusBar });

  // Initialize settings
  initializeSettings();

  // Initialize window title
  editorState.resetFileState();

  // Setup menu event listeners
  setupMenuListeners(canvas);
});

/**
 * Initialize application settings
 */
async function initializeSettings(): Promise<void> {
  try {
    const settings = await window.electronAPI.readSettings();
    if (settings.snapOnStartup) {
      editorState.setSnapEnabled(true);
    }
    if (settings.gridSize) {
      editorState.setGridSize(settings.gridSize);
    }
    console.log('Settings loaded:', settings);
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
}

/**
 * Setup menu event listeners
 */
function setupMenuListeners(canvas: Canvas): void {
  // Settings dialog
  window.electronAPI.onOpenSettings(async () => {
    const currentSettings = await window.electronAPI.readSettings();
    const settingsDialog = new SettingsDialog();
    const result = await settingsDialog.show(currentSettings);

    if (result) {
      await window.electronAPI.writeSettings(result);
      // Apply grid size immediately
      editorState.setGridSize(result.gridSize);
      console.log('Settings saved:', result);
    }
  });

  // Menu: New
  window.electronAPI.onMenuNew(() => {
    eventBus.emit('file:new', null);
  });

  // Menu: Open
  window.electronAPI.onMenuOpen(() => {
    eventBus.emit('file:open', null);
  });

  // Menu: Save
  window.electronAPI.onMenuSave(() => {
    eventBus.emit('file:save', null);
  });

  // Menu: Save As
  window.electronAPI.onMenuSaveAs(() => {
    eventBus.emit('file:saveAs', null);
  });

  // Menu: Undo
  window.electronAPI.onMenuUndo(() => {
    historyManager.undo();
  });

  // Menu: Redo
  window.electronAPI.onMenuRedo(() => {
    historyManager.redo();
  });

  // Menu: Export Fit to Content
  window.electronAPI.onMenuExportFitToContent(() => {
    eventBus.emit('file:exportFitToContent', null);
  });

  // Menu: Fit Canvas to Content
  window.electronAPI.onMenuFitCanvasToContent(() => {
    eventBus.emit('canvas:fitToContent', null);
  });

  // App: Before Close
  window.electronAPI.onBeforeClose(async () => {
    if (!editorState.isDirty) {
      // No unsaved changes, allow close
      await window.electronAPI.allowClose();
      return;
    }

    const dialog = new ConfirmDialog();
    const result = await dialog.show({
      title: 'アプリケーションを終了',
      message: '未保存の変更があります。保存しますか？',
      saveButtonText: '保存',
      discardButtonText: '保存しない',
      cancelButtonText: 'キャンセル'
    });

    if (result === 'cancel') {
      // User cancelled, don't close
      return;
    }

    if (result === 'save') {
      // Save the file first
      const shapes = canvas.getShapes();
      const canvasSize = editorState.canvasSize;
      const svgContent = FileManager.serialize(shapes, canvasSize.width, canvasSize.height);

      const currentPath = editorState.currentFilePath;
      if (currentPath) {
        const success = await window.electronAPI.saveFileToPath(currentPath, svgContent);
        if (!success) {
          return;
        }
      } else {
        const filePath = await window.electronAPI.saveFileAs(svgContent);
        if (!filePath) {
          return;
        }
      }
    }

    // Allow close (either saved or discarded)
    await window.electronAPI.allowClose();
  });

  // Menu: Delete
  window.electronAPI.onMenuDelete(() => {
    const selected = selectionManager.getSelection();
    if (selected.length > 0) {
      eventBus.emit('shapes:delete', selected);
    }
  });

  // Menu: Group
  window.electronAPI.onMenuGroup(() => {
    const selected = selectionManager.getSelection();
    if (selected.length >= 2) {
      eventBus.emit('shapes:group', selected);
    }
  });

  // Menu: Ungroup
  window.electronAPI.onMenuUngroup(() => {
    const selected = selectionManager.getSelection();
    selected.forEach(shape => {
      if (shape instanceof Group) {
        eventBus.emit('shapes:ungroup', shape);
      }
    });
  });

  // Menu: Zoom Reset
  window.electronAPI.onMenuZoomReset(() => {
    eventBus.emit('canvas:zoomReset', null);
  });

  // Menu: Toggle Snap
  window.electronAPI.onMenuToggleSnap(() => {
    editorState.setSnapEnabled(!editorState.snapEnabled);
  });

  // Menu: Tool selection
  window.electronAPI.onMenuTool((tool: string) => {
    eventBus.emit('tool:changed', tool as ToolType);
  });

  // Menu: Z-order
  window.electronAPI.onMenuZorder((operation: string) => {
    const selected = selectionManager.getSelection();
    if (selected.length > 0) {
      eventBus.emit('shapes:zorder', { shapes: selected, operation: operation as ZOrderOperation });
    }
  });

  // Menu: Auto Layout
  window.electronAPI.onMenuAutoLayout(() => {
    eventBus.emit('graph:autoLayout', null);
  });

  // Menu: Toggle Directed Edge
  window.electronAPI.onMenuToggleDirectedEdge(() => {
    const currentDirection = editorState.edgeDirection;
    const newDirection = currentDirection === 'forward' ? 'none' : 'forward';
    editorState.setEdgeDirection(newDirection);
    eventBus.emit('edgeDirection:changed', newDirection);
  });
}
