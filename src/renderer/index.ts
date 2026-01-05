import './styles/main.css';
import './styles/toolbar.css';
import './styles/sidebar.css';
import './styles/canvas.css';
import './styles/dialog.css';

import { Canvas } from './components/Canvas';
import { Toolbar } from './components/Toolbar';
import { Sidebar } from './components/Sidebar';
import { SettingsDialog } from './components/SettingsDialog';
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

  // File save handler
  eventBus.on('file:save', async () => {
    const shapes = canvas.getShapes();
    const size = canvas.getSize();
    const svgContent = FileManager.serialize(shapes, size.width, size.height);

    const filePath = await window.electronAPI.saveFile(svgContent);
    if (filePath) {
      console.log('File saved:', filePath);
    }
  });

  // File open handler
  eventBus.on('file:open', async () => {
    const result = await window.electronAPI.openFile();
    if (result) {
      const shapes = FileManager.parse(result.content);
      canvas.loadShapes(shapes);
      // Clear history when loading a new file
      historyManager.clear();
      console.log('File loaded:', result.path, `(${shapes.length} shapes)`);
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

  console.log('Components initialized:', { canvas, toolbar, sidebar });

  // Initialize settings
  initializeSettings();

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

  // Menu: Open
  window.electronAPI.onMenuOpen(() => {
    eventBus.emit('file:open', null);
  });

  // Menu: Save
  window.electronAPI.onMenuSave(() => {
    eventBus.emit('file:save', null);
  });

  // Menu: Undo
  window.electronAPI.onMenuUndo(() => {
    historyManager.undo();
  });

  // Menu: Redo
  window.electronAPI.onMenuRedo(() => {
    historyManager.redo();
  });
}
