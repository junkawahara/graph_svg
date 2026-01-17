import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { LineTool } from '../../../src/renderer/tools/LineTool';
import { editorState } from '../../../src/renderer/core/EditorState';
import { eventBus } from '../../../src/renderer/core/EventBus';
import { Line } from '../../../src/renderer/shapes/Line';
import { DEFAULT_STYLE } from '../../../src/shared/types';

describe('LineTool', () => {
  let tool: LineTool;
  let mockSvg: SVGSVGElement;

  beforeEach(() => {
    mockSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    tool = new LineTool(mockSvg);

    // Reset editor state
    editorState.setSnapEnabled(false);
    editorState.setStyle(DEFAULT_STYLE);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should have name "line"', () => {
      expect(tool.name).toBe('line');
    });
  });

  describe('onMouseDown', () => {
    it('should create preview line element', () => {
      const mockEvent = {} as MouseEvent;

      tool.onMouseDown({ x: 100, y: 100 }, mockEvent);

      const preview = mockSvg.querySelector('.preview-shape');
      expect(preview).not.toBeNull();
      expect(preview?.tagName.toLowerCase()).toBe('line');
    });

    it('should set preview line start position', () => {
      const mockEvent = {} as MouseEvent;

      tool.onMouseDown({ x: 100, y: 150 }, mockEvent);

      const preview = mockSvg.querySelector('.preview-shape');
      expect(preview?.getAttribute('x1')).toBe('100');
      expect(preview?.getAttribute('y1')).toBe('150');
    });

    it('should set preview line end position same as start initially', () => {
      const mockEvent = {} as MouseEvent;

      tool.onMouseDown({ x: 100, y: 150 }, mockEvent);

      const preview = mockSvg.querySelector('.preview-shape');
      expect(preview?.getAttribute('x2')).toBe('100');
      expect(preview?.getAttribute('y2')).toBe('150');
    });

    it('should apply current style to preview', () => {
      editorState.setStyle({ ...DEFAULT_STYLE, stroke: '#ff0000', strokeWidth: 5 });
      const mockEvent = {} as MouseEvent;

      tool.onMouseDown({ x: 100, y: 100 }, mockEvent);

      const preview = mockSvg.querySelector('.preview-shape');
      expect(preview?.getAttribute('stroke')).toBe('#ff0000');
      expect(preview?.getAttribute('stroke-width')).toBe('5');
    });

    it('should use dashed stroke for preview', () => {
      const mockEvent = {} as MouseEvent;

      tool.onMouseDown({ x: 100, y: 100 }, mockEvent);

      const preview = mockSvg.querySelector('.preview-shape');
      expect(preview?.getAttribute('stroke-dasharray')).toBe('5,5');
    });

    it('should apply snap when enabled', () => {
      editorState.setSnapEnabled(true);
      editorState.setGridSize(10);
      const mockEvent = {} as MouseEvent;

      tool.onMouseDown({ x: 103, y: 147 }, mockEvent);

      const preview = mockSvg.querySelector('.preview-shape');
      expect(preview?.getAttribute('x1')).toBe('100');
      expect(preview?.getAttribute('y1')).toBe('150');
    });
  });

  describe('onMouseMove', () => {
    it('should update preview line end position', () => {
      const mockEvent = {} as MouseEvent;

      tool.onMouseDown({ x: 100, y: 100 }, mockEvent);
      tool.onMouseMove({ x: 200, y: 150 }, mockEvent);

      const preview = mockSvg.querySelector('.preview-shape');
      expect(preview?.getAttribute('x2')).toBe('200');
      expect(preview?.getAttribute('y2')).toBe('150');
    });

    it('should do nothing if not drawing', () => {
      const mockEvent = {} as MouseEvent;

      // No onMouseDown - not drawing
      tool.onMouseMove({ x: 200, y: 150 }, mockEvent);

      const preview = mockSvg.querySelector('.preview-shape');
      expect(preview).toBeNull();
    });

    it('should apply snap when enabled', () => {
      editorState.setSnapEnabled(true);
      editorState.setGridSize(10);
      const mockEvent = {} as MouseEvent;

      tool.onMouseDown({ x: 100, y: 100 }, mockEvent);
      tool.onMouseMove({ x: 203, y: 147 }, mockEvent);

      const preview = mockSvg.querySelector('.preview-shape');
      expect(preview?.getAttribute('x2')).toBe('200');
      expect(preview?.getAttribute('y2')).toBe('150');
    });
  });

  describe('onMouseUp', () => {
    it('should remove preview line', () => {
      const mockEvent = {} as MouseEvent;

      tool.onMouseDown({ x: 100, y: 100 }, mockEvent);
      expect(mockSvg.querySelector('.preview-shape')).not.toBeNull();

      tool.onMouseUp({ x: 200, y: 200 }, mockEvent);
      expect(mockSvg.querySelector('.preview-shape')).toBeNull();
    });

    it('should emit shape:added event with Line', () => {
      const callback = vi.fn();
      eventBus.on('shape:added', callback);
      const mockEvent = {} as MouseEvent;

      tool.onMouseDown({ x: 100, y: 100 }, mockEvent);
      tool.onMouseUp({ x: 200, y: 200 }, mockEvent);

      expect(callback).toHaveBeenCalled();
      const addedShape = callback.mock.calls[0][0];
      expect(addedShape).toBeInstanceOf(Line);

      eventBus.off('shape:added', callback);
    });

    it('should create line with correct start and end points', () => {
      const callback = vi.fn();
      eventBus.on('shape:added', callback);
      const mockEvent = {} as MouseEvent;

      tool.onMouseDown({ x: 100, y: 150 }, mockEvent);
      tool.onMouseUp({ x: 250, y: 300 }, mockEvent);

      const line = callback.mock.calls[0][0] as Line;
      expect(line.x1).toBe(100);
      expect(line.y1).toBe(150);
      expect(line.x2).toBe(250);
      expect(line.y2).toBe(300);

      eventBus.off('shape:added', callback);
    });

    it('should not create line if too short (< 5px)', () => {
      const callback = vi.fn();
      eventBus.on('shape:added', callback);
      const mockEvent = {} as MouseEvent;

      tool.onMouseDown({ x: 100, y: 100 }, mockEvent);
      tool.onMouseUp({ x: 102, y: 102 }, mockEvent);

      expect(callback).not.toHaveBeenCalled();

      eventBus.off('shape:added', callback);
    });

    it('should create line if exactly 5px', () => {
      const callback = vi.fn();
      eventBus.on('shape:added', callback);
      const mockEvent = {} as MouseEvent;

      // 3^2 + 4^2 = 5^2, so (100,100) to (103,104) is exactly 5px
      tool.onMouseDown({ x: 100, y: 100 }, mockEvent);
      tool.onMouseUp({ x: 103, y: 104 }, mockEvent);

      expect(callback).toHaveBeenCalled();

      eventBus.off('shape:added', callback);
    });

    it('should do nothing if not drawing', () => {
      const callback = vi.fn();
      eventBus.on('shape:added', callback);
      const mockEvent = {} as MouseEvent;

      // No onMouseDown
      tool.onMouseUp({ x: 200, y: 200 }, mockEvent);

      expect(callback).not.toHaveBeenCalled();

      eventBus.off('shape:added', callback);
    });
  });

  describe('onMouseLeave', () => {
    it('should cancel drawing and remove preview', () => {
      const mockEvent = {} as MouseEvent;

      tool.onMouseDown({ x: 100, y: 100 }, mockEvent);
      expect(mockSvg.querySelector('.preview-shape')).not.toBeNull();

      tool.onMouseLeave();
      expect(mockSvg.querySelector('.preview-shape')).toBeNull();
    });

    it('should prevent line creation after leaving', () => {
      const callback = vi.fn();
      eventBus.on('shape:added', callback);
      const mockEvent = {} as MouseEvent;

      tool.onMouseDown({ x: 100, y: 100 }, mockEvent);
      tool.onMouseLeave();
      tool.onMouseUp({ x: 200, y: 200 }, mockEvent);

      expect(callback).not.toHaveBeenCalled();

      eventBus.off('shape:added', callback);
    });
  });

  describe('onDeactivate', () => {
    it('should clean up preview when tool is deactivated', () => {
      const mockEvent = {} as MouseEvent;

      tool.onMouseDown({ x: 100, y: 100 }, mockEvent);
      expect(mockSvg.querySelector('.preview-shape')).not.toBeNull();

      tool.onDeactivate();
      expect(mockSvg.querySelector('.preview-shape')).toBeNull();
    });

    it('should reset drawing state', () => {
      const callback = vi.fn();
      eventBus.on('shape:added', callback);
      const mockEvent = {} as MouseEvent;

      tool.onMouseDown({ x: 100, y: 100 }, mockEvent);
      tool.onDeactivate();
      tool.onMouseUp({ x: 200, y: 200 }, mockEvent);

      expect(callback).not.toHaveBeenCalled();

      eventBus.off('shape:added', callback);
    });
  });
});
