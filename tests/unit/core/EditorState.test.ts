import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EditorState, editorState } from '../../../src/renderer/core/EditorState';
import { eventBus } from '../../../src/renderer/core/EventBus';
import { DEFAULT_STYLE, DEFAULT_CANVAS_SIZE } from '../../../src/shared/types';

describe('EditorState', () => {
  let state: EditorState;

  beforeEach(() => {
    // Create fresh instance for isolated testing
    state = new EditorState();
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clear event listeners to prevent cross-test interference
    eventBus.off('tool:changed', () => {});
    eventBus.off('style:changed', () => {});
    eventBus.off('snap:changed', () => {});
    eventBus.off('grid:sizeChanged', () => {});
    eventBus.off('edgeDirection:changed', () => {});
    eventBus.off('canvas:sizeChanged', () => {});
    eventBus.off('file:dirtyChanged', () => {});
  });

  describe('tool management', () => {
    it('should have select as default tool', () => {
      expect(state.currentTool).toBe('select');
    });

    it('should set tool and emit event', () => {
      const callback = vi.fn();
      eventBus.on('tool:changed', callback);

      state.setTool('line');

      expect(state.currentTool).toBe('line');
      expect(callback).toHaveBeenCalledWith('line');
    });

    it('should not emit event when setting same tool', () => {
      state.setTool('ellipse');

      const callback = vi.fn();
      eventBus.on('tool:changed', callback);

      state.setTool('ellipse'); // same tool

      expect(callback).not.toHaveBeenCalled();
    });

    it('should support all tool types', () => {
      const tools = ['select', 'line', 'ellipse', 'rectangle', 'polygon', 'polyline',
                     'path', 'text', 'node', 'edge', 'deleteNode', 'deleteEdge',
                     'pan', 'zoom', 'rotate'] as const;

      for (const tool of tools) {
        state.setTool(tool);
        expect(state.currentTool).toBe(tool);
      }
    });
  });

  describe('style management', () => {
    it('should have default style initially', () => {
      expect(state.currentStyle).toEqual(DEFAULT_STYLE);
    });

    it('should return copy of style (not reference)', () => {
      const style1 = state.currentStyle;
      const style2 = state.currentStyle;
      expect(style1).not.toBe(style2);
      expect(style1).toEqual(style2);
    });

    it('should update style partially', () => {
      state.updateStyle({ fill: '#ff0000' });

      expect(state.currentStyle.fill).toBe('#ff0000');
      expect(state.currentStyle.stroke).toBe(DEFAULT_STYLE.stroke);
    });

    it('should emit event when style updated', () => {
      const callback = vi.fn();
      eventBus.on('style:changed', callback);

      state.updateStyle({ strokeWidth: 5 });

      expect(callback).toHaveBeenCalled();
      const emittedStyle = callback.mock.calls[0][0];
      expect(emittedStyle.strokeWidth).toBe(5);
    });

    it('should set entire style', () => {
      const newStyle = {
        fill: '#123456',
        fillNone: true,
        stroke: '#654321',
        strokeWidth: 10,
        opacity: 0.5,
        strokeDasharray: '5 5',
        strokeLinecap: 'round' as const
      };

      state.setStyle(newStyle);

      expect(state.currentStyle).toEqual(newStyle);
    });

    it('should emit event when style set', () => {
      const callback = vi.fn();
      eventBus.on('style:changed', callback);

      const newStyle = { ...DEFAULT_STYLE, fill: '#abcdef' };
      state.setStyle(newStyle);

      expect(callback).toHaveBeenCalled();
    });
  });

  describe('snap management', () => {
    it('should have snap disabled by default', () => {
      expect(state.snapEnabled).toBe(false);
    });

    it('should toggle snap', () => {
      state.toggleSnap();
      expect(state.snapEnabled).toBe(true);

      state.toggleSnap();
      expect(state.snapEnabled).toBe(false);
    });

    it('should emit event when snap toggled', () => {
      const callback = vi.fn();
      eventBus.on('snap:changed', callback);

      state.toggleSnap();

      expect(callback).toHaveBeenCalledWith(true);
    });

    it('should set snap enabled directly', () => {
      state.setSnapEnabled(true);
      expect(state.snapEnabled).toBe(true);

      state.setSnapEnabled(false);
      expect(state.snapEnabled).toBe(false);
    });

    it('should not emit event when setting same snap state', () => {
      const callback = vi.fn();
      eventBus.on('snap:changed', callback);

      state.setSnapEnabled(false); // same as default

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('grid size management', () => {
    it('should have default grid size of 10', () => {
      expect(state.gridSize).toBe(10);
    });

    it('should set grid size', () => {
      state.setGridSize(20);
      expect(state.gridSize).toBe(20);
    });

    it('should emit event when grid size changed', () => {
      const callback = vi.fn();
      eventBus.on('grid:sizeChanged', callback);

      state.setGridSize(25);

      expect(callback).toHaveBeenCalledWith(25);
    });

    it('should not emit event when setting same grid size', () => {
      const callback = vi.fn();
      eventBus.on('grid:sizeChanged', callback);

      state.setGridSize(10); // same as default

      expect(callback).not.toHaveBeenCalled();
    });

    it('should enforce minimum grid size of 5', () => {
      state.setGridSize(3);
      expect(state.gridSize).toBe(5);

      state.setGridSize(0);
      expect(state.gridSize).toBe(5);

      state.setGridSize(-10);
      expect(state.gridSize).toBe(5);
    });

    it('should enforce maximum grid size of 100', () => {
      state.setGridSize(150);
      expect(state.gridSize).toBe(100);

      state.setGridSize(1000);
      expect(state.gridSize).toBe(100);
    });

    it('should round grid size to integer', () => {
      state.setGridSize(15.7);
      expect(state.gridSize).toBe(16);

      state.setGridSize(22.3);
      expect(state.gridSize).toBe(22);
    });
  });

  describe('snap calculations', () => {
    it('should return rounded value when snap disabled', () => {
      state.setSnapEnabled(false);

      // Always rounds to integer to avoid decimal coordinates from zoom
      expect(state.snapValue(123)).toBe(123);
      expect(state.snapValue(45.7)).toBe(46);
      expect(state.snapValue(45.4)).toBe(45);
    });

    it('should snap value to grid when enabled', () => {
      state.setSnapEnabled(true);
      state.setGridSize(10);

      expect(state.snapValue(13)).toBe(10);
      expect(state.snapValue(17)).toBe(20);
      expect(state.snapValue(25)).toBe(30);
    });

    it('should snap point when enabled', () => {
      state.setSnapEnabled(true);
      state.setGridSize(10);

      expect(state.snapPoint({ x: 13, y: 27 })).toEqual({ x: 10, y: 30 });
      expect(state.snapPoint({ x: 45, y: 54 })).toEqual({ x: 50, y: 50 });
    });

    it('should return rounded point when snap disabled', () => {
      state.setSnapEnabled(false);

      // Always rounds to integer to avoid decimal coordinates from zoom
      const point = { x: 123.456, y: 789.012 };
      expect(state.snapPoint(point)).toEqual({ x: 123, y: 789 });
    });

    it('should work with different grid sizes', () => {
      state.setSnapEnabled(true);
      state.setGridSize(25);

      expect(state.snapValue(30)).toBe(25);
      expect(state.snapValue(40)).toBe(50);
      // 62/25 = 2.48 -> round to 2 -> 50
      // 88/25 = 3.52 -> round to 4 -> 100
      expect(state.snapPoint({ x: 62, y: 88 })).toEqual({ x: 50, y: 100 });
    });
  });

  describe('edge direction management', () => {
    it('should have none as default edge direction', () => {
      expect(state.edgeDirection).toBe('none');
    });

    it('should set edge direction', () => {
      state.setEdgeDirection('forward');
      expect(state.edgeDirection).toBe('forward');

      state.setEdgeDirection('backward');
      expect(state.edgeDirection).toBe('backward');
    });

    it('should emit event when edge direction changed', () => {
      const callback = vi.fn();
      eventBus.on('edgeDirection:changed', callback);

      state.setEdgeDirection('forward');

      expect(callback).toHaveBeenCalledWith('forward');
    });

    it('should not emit event when setting same direction', () => {
      const callback = vi.fn();
      eventBus.on('edgeDirection:changed', callback);

      state.setEdgeDirection('none'); // same as default

      expect(callback).not.toHaveBeenCalled();
    });

    it('should toggle edge direction between none and forward', () => {
      expect(state.edgeDirection).toBe('none');

      state.toggleEdgeDirection();
      expect(state.edgeDirection).toBe('forward');

      state.toggleEdgeDirection();
      expect(state.edgeDirection).toBe('none');
    });

    it('should emit event when toggling', () => {
      const callback = vi.fn();
      eventBus.on('edgeDirection:changed', callback);

      state.toggleEdgeDirection();

      expect(callback).toHaveBeenCalledWith('forward');
    });
  });

  describe('default node size management', () => {
    it('should have default node size of 20x20', () => {
      expect(state.defaultNodeSize).toEqual({ rx: 20, ry: 20 });
    });

    it('should return copy of node size (not reference)', () => {
      const size1 = state.defaultNodeSize;
      const size2 = state.defaultNodeSize;
      expect(size1).not.toBe(size2);
      expect(size1).toEqual(size2);
    });

    it('should set default node size', () => {
      state.setDefaultNodeSize(30, 25);
      expect(state.defaultNodeSize).toEqual({ rx: 30, ry: 25 });
    });

    it('should enforce minimum node size of 5', () => {
      state.setDefaultNodeSize(3, 2);
      expect(state.defaultNodeSize).toEqual({ rx: 5, ry: 5 });
    });

    it('should round node size to integer', () => {
      state.setDefaultNodeSize(15.7, 22.3);
      expect(state.defaultNodeSize).toEqual({ rx: 16, ry: 22 });
    });
  });

  describe('canvas size management', () => {
    it('should have default canvas size', () => {
      expect(state.canvasSize).toEqual(DEFAULT_CANVAS_SIZE);
    });

    it('should return copy of canvas size (not reference)', () => {
      const size1 = state.canvasSize;
      const size2 = state.canvasSize;
      expect(size1).not.toBe(size2);
      expect(size1).toEqual(size2);
    });

    it('should set canvas size', () => {
      state.setCanvasSize(1024, 768);
      expect(state.canvasSize).toEqual({ width: 1024, height: 768 });
    });

    it('should emit event when canvas size changed', () => {
      const callback = vi.fn();
      eventBus.on('canvas:sizeChanged', callback);

      state.setCanvasSize(1920, 1080);

      expect(callback).toHaveBeenCalledWith({ width: 1920, height: 1080 });
    });

    it('should not emit event when setting same size', () => {
      const callback = vi.fn();
      eventBus.on('canvas:sizeChanged', callback);

      state.setCanvasSize(DEFAULT_CANVAS_SIZE.width, DEFAULT_CANVAS_SIZE.height);

      expect(callback).not.toHaveBeenCalled();
    });

    it('should enforce minimum canvas size of 100x100', () => {
      state.setCanvasSize(50, 50);
      expect(state.canvasSize).toEqual({ width: 100, height: 100 });

      state.setCanvasSize(200, 30);
      expect(state.canvasSize).toEqual({ width: 200, height: 100 });
    });

    it('should round canvas size to integer', () => {
      state.setCanvasSize(1024.7, 768.3);
      expect(state.canvasSize).toEqual({ width: 1025, height: 768 });
    });
  });

  describe('file path management', () => {
    it('should have null file path initially', () => {
      expect(state.currentFilePath).toBeNull();
    });

    it('should set file path', () => {
      state.setCurrentFilePath('/path/to/file.svg');
      expect(state.currentFilePath).toBe('/path/to/file.svg');
    });

    it('should clear file path with null', () => {
      state.setCurrentFilePath('/path/to/file.svg');
      state.setCurrentFilePath(null);
      expect(state.currentFilePath).toBeNull();
    });
  });

  describe('dirty state management', () => {
    it('should not be dirty initially', () => {
      expect(state.isDirty).toBe(false);
    });

    it('should set dirty state', () => {
      state.setDirty(true);
      expect(state.isDirty).toBe(true);

      state.setDirty(false);
      expect(state.isDirty).toBe(false);
    });

    it('should emit event when dirty state changed', () => {
      const callback = vi.fn();
      eventBus.on('file:dirtyChanged', callback);

      state.setDirty(true);

      expect(callback).toHaveBeenCalledWith(true);
    });

    it('should not emit event when setting same dirty state', () => {
      const callback = vi.fn();
      eventBus.on('file:dirtyChanged', callback);

      state.setDirty(false); // same as default

      expect(callback).not.toHaveBeenCalled();
    });

    it('should mark dirty', () => {
      state.markDirty();
      expect(state.isDirty).toBe(true);
    });

    it('should mark clean', () => {
      state.setDirty(true);
      state.markClean();
      expect(state.isDirty).toBe(false);
    });
  });

  describe('reset file state', () => {
    it('should reset all file-related state', () => {
      // Setup dirty state
      state.setCurrentFilePath('/path/to/file.svg');
      state.setDirty(true);
      state.setCanvasSize(1920, 1080);

      state.resetFileState();

      expect(state.currentFilePath).toBeNull();
      expect(state.isDirty).toBe(false);
      expect(state.canvasSize).toEqual(DEFAULT_CANVAS_SIZE);
    });

    it('should emit canvas:sizeChanged event', () => {
      state.setCanvasSize(1920, 1080);

      const callback = vi.fn();
      eventBus.on('canvas:sizeChanged', callback);

      state.resetFileState();

      expect(callback).toHaveBeenCalledWith(DEFAULT_CANVAS_SIZE);
    });
  });

  describe('global editorState instance', () => {
    it('should be an EditorState instance', () => {
      expect(editorState).toBeInstanceOf(EditorState);
    });

    it('should persist state across accesses', () => {
      editorState.setTool('rectangle');
      expect(editorState.currentTool).toBe('rectangle');

      // Reset for other tests
      editorState.setTool('select');
    });
  });
});
