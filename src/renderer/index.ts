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
import { Shape } from './shapes/Shape';

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
      const size = canvas.getSize();
      const svgContent = FileManager.serialize(shapes, size.width, size.height);

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
    const size = canvas.getSize();
    const svgContent = FileManager.serialize(shapes, size.width, size.height);

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
    const size = canvas.getSize();
    const svgContent = FileManager.serialize(shapes, size.width, size.height);

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
      const shapes = FileManager.parse(result.content);
      canvas.loadShapes(shapes);
      // Clear history when loading a new file
      historyManager.clear();
      // Set file path and mark as clean
      editorState.setCurrentFilePath(result.path);
      editorState.markClean();
      console.log('File loaded:', result.path, `(${shapes.length} shapes)`);
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
      const size = canvas.getSize();
      const svgContent = FileManager.serialize(shapes, size.width, size.height);

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
}
