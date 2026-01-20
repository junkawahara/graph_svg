import './styles/main.css';
import './styles/toolbar.css';
import './styles/sidebar.css';
import './styles/canvas.css';
import './styles/dialog.css';
import './styles/menubar.css';

import { Canvas } from './components/Canvas';
import { Toolbar } from './components/Toolbar';
import { Sidebar } from './components/Sidebar';
import { StatusBar } from './components/StatusBar';
import { SettingsDialog } from './components/SettingsDialog';
import { ConfirmDialog } from './components/ConfirmDialog';
import { WebMenuBar } from './components/WebMenuBar';
import { eventBus } from './core/EventBus';
import { historyManager } from './core/HistoryManager';
import { FileManager } from './core/FileManager';
import { clipboardManager } from './core/ClipboardManager';
import { selectionManager } from './core/SelectionManager';
import { editorState } from './core/EditorState';
import { createShapeFromData } from './shapes/ShapeFactory';
import { PasteShapesCommand } from './commands/PasteShapesCommand';
import { FitCanvasToContentCommand } from './commands/FitCanvasToContentCommand';
import { ImportGraphCommand } from './commands/ImportGraphCommand';
import { GraphFileParser } from './core/GraphFileParser';
import { GraphImportDialog } from './components/GraphImportDialog';
import { Shape } from './shapes/Shape';
import { Group } from './shapes/Group';
import { ToolType } from '../shared/types';
import { ZOrderOperation } from './commands/ZOrderCommand';
import { calculateFitToContent, calculateContentBounds } from './core/BoundsCalculator';
import { getPlatformAdapter } from './platform';

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
      const adapter = getPlatformAdapter();
      if (currentPath) {
        const success = await adapter.saveFileToPath(currentPath, svgContent);
        if (!success) {
          return false;
        }
      } else {
        const saveResult = await adapter.saveFileAs(svgContent);
        if (!saveResult) {
          return false;
        }
        editorState.setCurrentFilePath(saveResult.path);
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
    const adapter = getPlatformAdapter();

    if (currentPath) {
      // Save to existing path
      const success = await adapter.saveFileToPath(currentPath, svgContent);
      if (success) {
        editorState.markClean();
        console.log('File saved:', currentPath);
      }
    } else {
      // No existing path, show save dialog
      const saveResult = await adapter.saveFileAs(svgContent);
      if (saveResult) {
        editorState.setCurrentFilePath(saveResult.path);
        editorState.markClean();
        console.log('File saved:', saveResult.path);
      }
    }
  });

  // File save as handler (always show dialog)
  eventBus.on('file:saveAs', async () => {
    const shapes = canvas.getShapes();
    const canvasSize = editorState.canvasSize;
    const svgContent = FileManager.serialize(shapes, canvasSize.width, canvasSize.height);

    const currentPath = editorState.currentFilePath;
    const adapter = getPlatformAdapter();
    const saveResult = await adapter.saveFileAs(svgContent, currentPath || undefined);
    if (saveResult) {
      editorState.setCurrentFilePath(saveResult.path);
      editorState.markClean();
      console.log('File saved as:', saveResult.path);
    }
  });

  // File open handler
  eventBus.on('file:open', async () => {
    const canProceed = await checkUnsavedChanges();
    if (!canProceed) return;

    const adapter = getPlatformAdapter();
    const result = await adapter.openFile();
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

  // Import graph file handler
  async function handleImportGraph(): Promise<void> {
    // Open graph file
    const adapter = getPlatformAdapter();
    const result = await adapter.openGraphFile();
    if (!result) return;

    // Parse the file
    const parsed = GraphFileParser.parse(result.content, result.path);
    const formatName = parsed.format === 'dimacs' ? 'DIMACS' : 'Edge List';

    // Show options dialog
    const importDialog = new GraphImportDialog();
    const options = await importDialog.show(formatName, parsed.nodeLabels.length, parsed.edges.length);
    if (!options) return;

    // Check unsaved changes if clearing canvas
    if (options.clearCanvas) {
      const canProceed = await checkUnsavedChanges();
      if (!canProceed) return;
    }

    // Get current style and canvas size
    const currentStyle = editorState.currentStyle;
    const canvasSz = editorState.canvasSize;
    const nodeSize = editorState.defaultNodeSize;

    // Create and execute import command
    const command = new ImportGraphCommand(
      canvas,
      {
        nodeLabels: parsed.nodeLabels,
        edges: parsed.edges,
        direction: options.directed ? 'forward' : 'none',
        canvasWidth: canvasSz.width,
        canvasHeight: canvasSz.height
      },
      currentStyle,
      nodeSize,
      options.clearCanvas
    );
    historyManager.execute(command);

    // Clear selection
    selectionManager.clearSelection();

    // Mark dirty if adding to existing
    if (!options.clearCanvas) {
      editorState.markDirty();
    }

    console.log(`Imported graph: ${parsed.nodeLabels.length} nodes, ${parsed.edges.length} edges`);
  }

  // Register import graph menu event
  getPlatformAdapter().onMenuEvent('importGraph', handleImportGraph);

  // Mark as dirty when history changes (undo/redo stack modified)
  eventBus.on('history:changed', () => {
    // If there's any history (can undo), mark as dirty
    // If all changes are undone, mark as clean
    if (historyManager.canUndo()) {
      editorState.markDirty();
    } else {
      editorState.markClean();
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

    const settings = await getPlatformAdapter().readSettings();
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

    const adapter = getPlatformAdapter();
    const settings = await adapter.readSettings();
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

    const saveResult = await adapter.saveFileAs(svgContent, defaultPath);
    if (saveResult) {
      console.log('Exported fit to content:', saveResult.path, `(${fittedWidth}x${fittedHeight})`);
    }
  });

  console.log('Components initialized:', { canvas, toolbar, sidebar, statusBar });

  // Initialize settings
  initializeSettings();

  // Initialize window title
  editorState.resetFileState();

  // Setup menu event listeners
  setupMenuListeners(canvas);

  // Setup Web-specific features
  setupWebFeatures(canvas, checkUnsavedChanges);
});

/**
 * Initialize application settings
 */
async function initializeSettings(): Promise<void> {
  try {
    const settings = await getPlatformAdapter().readSettings();
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
  const adapter = getPlatformAdapter();

  // Settings dialog
  adapter.onMenuEvent('openSettings', async () => {
    const currentSettings = await adapter.readSettings();
    const settingsDialog = new SettingsDialog();
    const result = await settingsDialog.show(currentSettings);

    if (result) {
      await adapter.writeSettings(result);
      // Apply grid size immediately
      editorState.setGridSize(result.gridSize);
      console.log('Settings saved:', result);
    }
  });

  // Menu: New
  adapter.onMenuEvent('new', () => {
    eventBus.emit('file:new', null);
  });

  // Menu: Open
  adapter.onMenuEvent('open', () => {
    eventBus.emit('file:open', null);
  });

  // Menu: Save
  adapter.onMenuEvent('save', () => {
    eventBus.emit('file:save', null);
  });

  // Menu: Save As
  adapter.onMenuEvent('saveAs', () => {
    eventBus.emit('file:saveAs', null);
  });

  // Menu: Undo
  adapter.onMenuEvent('undo', () => {
    historyManager.undo();
  });

  // Menu: Redo
  adapter.onMenuEvent('redo', () => {
    historyManager.redo();
  });

  // Menu: Export Fit to Content
  adapter.onMenuEvent('exportFitToContent', () => {
    eventBus.emit('file:exportFitToContent', null);
  });

  // Menu: Fit Canvas to Content
  adapter.onMenuEvent('fitCanvasToContent', () => {
    eventBus.emit('canvas:fitToContent', null);
  });

  // App: Before Close
  adapter.onBeforeClose(async () => {
    if (!editorState.isDirty) {
      // No unsaved changes, allow close
      adapter.allowClose();
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
        const success = await adapter.saveFileToPath(currentPath, svgContent);
        if (!success) {
          return;
        }
      } else {
        const saveResult = await adapter.saveFileAs(svgContent);
        if (!saveResult) {
          return;
        }
      }
    }

    // Allow close (either saved or discarded)
    adapter.allowClose();
  });

  // Menu: Delete
  adapter.onMenuEvent('delete', () => {
    const selected = selectionManager.getSelection();
    if (selected.length > 0) {
      eventBus.emit('shapes:delete', selected);
    }
  });

  // Menu: Group
  adapter.onMenuEvent('group', () => {
    const selected = selectionManager.getSelection();
    if (selected.length >= 2) {
      eventBus.emit('shapes:group', selected);
    }
  });

  // Menu: Ungroup
  adapter.onMenuEvent('ungroup', () => {
    const selected = selectionManager.getSelection();
    selected.forEach(shape => {
      if (shape instanceof Group) {
        eventBus.emit('shapes:ungroup', shape);
      }
    });
  });

  // Menu: Zoom Reset
  adapter.onMenuEvent('zoomReset', () => {
    eventBus.emit('canvas:zoomReset', null);
  });

  // Menu: Toggle Snap
  adapter.onMenuEvent('toggleSnap', () => {
    editorState.setSnapEnabled(!editorState.snapEnabled);
  });

  // Menu: Tool selection
  adapter.onMenuEventWithArg('tool', (tool: string) => {
    eventBus.emit('tool:changed', tool as ToolType);
  });

  // Menu: Z-order
  adapter.onMenuEventWithArg('zorder', (operation: string) => {
    const selected = selectionManager.getSelection();
    if (selected.length > 0) {
      eventBus.emit('shapes:zorder', { shapes: selected, operation: operation as ZOrderOperation });
    }
  });

  // Menu: Auto Layout
  adapter.onMenuEvent('autoLayout', () => {
    eventBus.emit('graph:autoLayout', null);
  });

  // Menu: Toggle Directed Edge
  adapter.onMenuEvent('toggleDirectedEdge', () => {
    const currentDirection = editorState.edgeDirection;
    const newDirection = currentDirection === 'forward' ? 'none' : 'forward';
    editorState.setEdgeDirection(newDirection);
    eventBus.emit('edgeDirection:changed', newDirection);
  });

  // Menu: Align
  adapter.onMenuEventWithArg('align', (alignment: string) => {
    const selected = selectionManager.getSelection();
    if (selected.length >= 2) {
      eventBus.emit('shapes:align', { shapes: selected, alignment });
    }
  });

  // Menu: Distribute
  adapter.onMenuEventWithArg('distribute', (distribution: string) => {
    const selected = selectionManager.getSelection();
    if (selected.length >= 3) {
      eventBus.emit('shapes:distribute', { shapes: selected, distribution });
    }
  });
}

/**
 * Setup Web-specific features (menu bar, drag & drop)
 */
function setupWebFeatures(canvas: Canvas, checkUnsavedChanges: () => Promise<boolean>): void {
  const adapter = getPlatformAdapter();

  // Only setup for Web environment
  if (!adapter.isWeb) {
    return;
  }

  // Add Web menu bar
  const menuBar = new WebMenuBar();
  menuBar.mount(document.body);

  // Setup drag & drop
  adapter.setupDragDrop({
    // Handle SVG file drop
    onSvgDrop: async (content: string, filename: string) => {
      const canProceed = await checkUnsavedChanges();
      if (!canProceed) return;

      try {
        const { shapes, canvasSize } = FileManager.parse(content);
        editorState.setCanvasSize(canvasSize.width, canvasSize.height);
        canvas.loadShapes(shapes);
        historyManager.clear();
        editorState.setCurrentFilePath(filename);
        editorState.markClean();
        console.log('File loaded via drag & drop:', filename, `(${shapes.length} shapes)`);
      } catch (error) {
        console.error('Failed to load SVG file:', error);
        alert('Failed to load SVG file. The file may be invalid.');
      }
    },

    // Handle graph file drop
    onGraphDrop: async (content: string, filename: string) => {
      try {
        const parsed = GraphFileParser.parse(content, filename);
        const formatName = parsed.format === 'dimacs' ? 'DIMACS' : 'Edge List';

        const importDialog = new GraphImportDialog();
        const options = await importDialog.show(formatName, parsed.nodeLabels.length, parsed.edges.length);
        if (!options) return;

        if (options.clearCanvas) {
          const canProceed = await checkUnsavedChanges();
          if (!canProceed) return;
        }

        const currentStyle = editorState.currentStyle;
        const canvasSz = editorState.canvasSize;
        const nodeSize = editorState.defaultNodeSize;

        const command = new ImportGraphCommand(
          canvas,
          {
            nodeLabels: parsed.nodeLabels,
            edges: parsed.edges,
            direction: options.directed ? 'forward' : 'none',
            canvasWidth: canvasSz.width,
            canvasHeight: canvasSz.height
          },
          currentStyle,
          nodeSize,
          options.clearCanvas
        );
        historyManager.execute(command);
        selectionManager.clearSelection();

        if (!options.clearCanvas) {
          editorState.markDirty();
        }

        console.log(`Imported graph via drag & drop: ${parsed.nodeLabels.length} nodes, ${parsed.edges.length} edges`);
      } catch (error) {
        console.error('Failed to import graph file:', error);
        alert('Failed to import graph file. The file format may be invalid.');
      }
    }
  });

  console.log('Web features initialized');
}
