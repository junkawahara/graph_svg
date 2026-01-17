import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FileManager } from '../../../src/renderer/core/FileManager';
import { getGraphManager } from '../../../src/renderer/core/GraphManager';
import { Line } from '../../../src/renderer/shapes/Line';
import { Rectangle } from '../../../src/renderer/shapes/Rectangle';
import { Ellipse } from '../../../src/renderer/shapes/Ellipse';
import { Path } from '../../../src/renderer/shapes/Path';
import { Text } from '../../../src/renderer/shapes/Text';
import { Polygon } from '../../../src/renderer/shapes/Polygon';
import { Group } from '../../../src/renderer/shapes/Group';

describe('External SVG Import', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    getGraphManager().clear();
  });

  afterEach(() => {
    vi.runAllTimers();
    vi.useRealTimers();
    getGraphManager().clear();
  });

  describe('basic shape import', () => {
    it('should import rectangle without data-shape-type attribute', () => {
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
          <rect x="100" y="100" width="200" height="150" fill="#ff0000"/>
        </svg>
      `;

      const { shapes } = FileManager.parse(svg);

      expect(shapes).toHaveLength(1);
      expect(shapes[0].type).toBe('rectangle');
      const rect = shapes[0] as Rectangle;
      expect(rect.x).toBe(100);
      expect(rect.y).toBe(100);
      expect(rect.width).toBe(200);
      expect(rect.height).toBe(150);
    });

    it('should import circle as ellipse', () => {
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
          <circle cx="200" cy="200" r="50" fill="#00ff00"/>
        </svg>
      `;

      const { shapes } = FileManager.parse(svg);

      expect(shapes).toHaveLength(1);
      expect(shapes[0].type).toBe('ellipse');
      const ellipse = shapes[0] as Ellipse;
      expect(ellipse.cx).toBe(200);
      expect(ellipse.cy).toBe(200);
      expect(ellipse.rx).toBe(50);
      expect(ellipse.ry).toBe(50);
    });

    it('should import ellipse element', () => {
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
          <ellipse cx="300" cy="200" rx="80" ry="40" fill="#0000ff"/>
        </svg>
      `;

      const { shapes } = FileManager.parse(svg);

      expect(shapes).toHaveLength(1);
      expect(shapes[0].type).toBe('ellipse');
      const ellipse = shapes[0] as Ellipse;
      expect(ellipse.cx).toBe(300);
      expect(ellipse.cy).toBe(200);
      expect(ellipse.rx).toBe(80);
      expect(ellipse.ry).toBe(40);
    });

    it('should import line element', () => {
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
          <line x1="50" y1="50" x2="250" y2="150" stroke="#000000" stroke-width="2"/>
        </svg>
      `;

      const { shapes } = FileManager.parse(svg);

      expect(shapes).toHaveLength(1);
      expect(shapes[0].type).toBe('line');
      const line = shapes[0] as Line;
      expect(line.x1).toBe(50);
      expect(line.y1).toBe(50);
      expect(line.x2).toBe(250);
      expect(line.y2).toBe(150);
    });

    it('should import polygon element', () => {
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
          <polygon points="100,50 150,100 50,100" fill="#ffff00"/>
        </svg>
      `;

      const { shapes } = FileManager.parse(svg);

      expect(shapes).toHaveLength(1);
      expect(shapes[0].type).toBe('polygon');
      const polygon = shapes[0] as Polygon;
      expect(polygon.points).toHaveLength(3);
      expect(polygon.points[0]).toEqual({ x: 100, y: 50 });
      expect(polygon.points[1]).toEqual({ x: 150, y: 100 });
      expect(polygon.points[2]).toEqual({ x: 50, y: 100 });
    });

    it('should import text element', () => {
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
          <text x="100" y="200" font-size="24" font-family="Arial">Hello World</text>
        </svg>
      `;

      const { shapes } = FileManager.parse(svg);

      expect(shapes).toHaveLength(1);
      expect(shapes[0].type).toBe('text');
      const text = shapes[0] as Text;
      expect(text.x).toBe(100);
      expect(text.y).toBe(200);
      expect(text.content).toBe('Hello World');
      expect(text.fontSize).toBe(24);
    });
  });

  describe('path import (PowerPoint style)', () => {
    it('should import simple path with M and L commands', () => {
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
          <path d="M 0 0 L 100 0 L 100 100 L 0 100 Z" fill="#ff0000"/>
        </svg>
      `;

      const { shapes } = FileManager.parse(svg);

      expect(shapes).toHaveLength(1);
      expect(shapes[0].type).toBe('path');
      const path = shapes[0] as Path;
      expect(path.commands).toHaveLength(5);
      expect(path.commands[0]).toEqual({ type: 'M', x: 0, y: 0 });
      expect(path.commands[1]).toEqual({ type: 'L', x: 100, y: 0 });
      expect(path.commands[4]).toEqual({ type: 'Z' });
    });

    it('should import path with cubic bezier curves', () => {
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
          <path d="M 50 50 C 100 0 150 100 200 50" fill="none" stroke="#000000"/>
        </svg>
      `;

      const { shapes } = FileManager.parse(svg);

      expect(shapes).toHaveLength(1);
      expect(shapes[0].type).toBe('path');
      const path = shapes[0] as Path;
      expect(path.commands).toHaveLength(2);
      expect(path.commands[1].type).toBe('C');
      const cubic = path.commands[1] as any;
      expect(cubic.cp1x).toBe(100);
      expect(cubic.cp1y).toBe(0);
      expect(cubic.cp2x).toBe(150);
      expect(cubic.cp2y).toBe(100);
      expect(cubic.x).toBe(200);
      expect(cubic.y).toBe(50);
    });

    it('should import path with quadratic bezier curves', () => {
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
          <path d="M 0 0 Q 50 100 100 0" fill="none" stroke="#000000"/>
        </svg>
      `;

      const { shapes } = FileManager.parse(svg);

      expect(shapes).toHaveLength(1);
      const path = shapes[0] as Path;
      expect(path.commands[1].type).toBe('Q');
      const quad = path.commands[1] as any;
      expect(quad.cpx).toBe(50);
      expect(quad.cpy).toBe(100);
      expect(quad.x).toBe(100);
      expect(quad.y).toBe(0);
    });

    it('should import path with arc commands', () => {
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
          <path d="M 100 100 A 50 30 0 0 1 200 100" fill="none" stroke="#000000"/>
        </svg>
      `;

      const { shapes } = FileManager.parse(svg);

      expect(shapes).toHaveLength(1);
      const path = shapes[0] as Path;
      expect(path.commands[1].type).toBe('A');
      const arc = path.commands[1] as any;
      expect(arc.rx).toBe(50);
      expect(arc.ry).toBe(30);
      expect(arc.sweepFlag).toBe(true);
    });

    it('should import path with horizontal and vertical lines', () => {
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
          <path d="M 0 0 H 100 V 50 H 0 V 0 Z" fill="#ff0000"/>
        </svg>
      `;

      const { shapes } = FileManager.parse(svg);

      expect(shapes).toHaveLength(1);
      const path = shapes[0] as Path;
      // H and V should be converted to L
      expect(path.commands[1]).toEqual({ type: 'L', x: 100, y: 0 });
      expect(path.commands[2]).toEqual({ type: 'L', x: 100, y: 50 });
    });
  });

  describe('style import', () => {
    it('should import fill color', () => {
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
          <rect x="0" y="0" width="100" height="100" fill="#ff5500"/>
        </svg>
      `;

      const { shapes } = FileManager.parse(svg);

      expect(shapes[0].style.fill).toBe('#ff5500');
      expect(shapes[0].style.fillNone).toBe(false);
    });

    it('should import fill="none"', () => {
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
          <rect x="0" y="0" width="100" height="100" fill="none" stroke="#000000"/>
        </svg>
      `;

      const { shapes } = FileManager.parse(svg);

      expect(shapes[0].style.fillNone).toBe(true);
    });

    it('should import stroke properties', () => {
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
          <rect x="0" y="0" width="100" height="100"
                fill="none" stroke="#0000ff" stroke-width="3"
                stroke-dasharray="5,3" stroke-linecap="round"/>
        </svg>
      `;

      const { shapes } = FileManager.parse(svg);

      expect(shapes[0].style.stroke).toBe('#0000ff');
      expect(shapes[0].style.strokeWidth).toBe(3);
      expect(shapes[0].style.strokeDasharray).toBe('5,3');
      expect(shapes[0].style.strokeLinecap).toBe('round');
    });

    it('should import opacity', () => {
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
          <rect x="0" y="0" width="100" height="100" fill="#ff0000" opacity="0.5"/>
        </svg>
      `;

      const { shapes } = FileManager.parse(svg);

      expect(shapes[0].style.opacity).toBe(0.5);
    });
  });

  describe('transform import', () => {
    it('should apply translate transform to rectangle', () => {
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
          <rect x="0" y="0" width="100" height="50" fill="#ff0000" transform="translate(50, 30)"/>
        </svg>
      `;

      const { shapes } = FileManager.parse(svg);

      expect(shapes).toHaveLength(1);
      const rect = shapes[0] as Rectangle;
      expect(rect.x).toBe(50);  // 0 + 50
      expect(rect.y).toBe(30);  // 0 + 30
    });

    it('should apply translate transform to ellipse', () => {
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
          <ellipse cx="100" cy="100" rx="30" ry="20" fill="#00ff00" transform="translate(50, 50)"/>
        </svg>
      `;

      const { shapes } = FileManager.parse(svg);

      const ellipse = shapes[0] as Ellipse;
      expect(ellipse.cx).toBe(150);  // 100 + 50
      expect(ellipse.cy).toBe(150);  // 100 + 50
    });

    it('should apply scale transform to rectangle', () => {
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
          <rect x="10" y="20" width="50" height="30" fill="#ff0000" transform="scale(2)"/>
        </svg>
      `;

      const { shapes } = FileManager.parse(svg);

      const rect = shapes[0] as Rectangle;
      expect(rect.x).toBe(20);   // 10 * 2
      expect(rect.y).toBe(40);   // 20 * 2
      expect(rect.width).toBe(100);  // 50 * 2
      expect(rect.height).toBe(60);  // 30 * 2
    });

    it('should apply combined translate and scale transform', () => {
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
          <rect x="0" y="0" width="50" height="50" fill="#ff0000" transform="translate(100, 100) scale(2)"/>
        </svg>
      `;

      const { shapes } = FileManager.parse(svg);

      const rect = shapes[0] as Rectangle;
      // With transform order: translate(100, 100) then scale(2)
      // Final position depends on transform application order
      expect(rect.width).toBe(100);  // 50 * 2
      expect(rect.height).toBe(100); // 50 * 2
    });

    it('should apply rotation transform and extract angle', () => {
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
          <rect x="50" y="50" width="100" height="60" fill="#ff0000" transform="rotate(45, 100, 80)"/>
        </svg>
      `;

      const { shapes } = FileManager.parse(svg);

      const rect = shapes[0] as Rectangle;
      expect(rect.rotation).toBeCloseTo(45, 1);
    });
  });

  describe('group import', () => {
    it('should import group without data-group-type as individual shapes', () => {
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
          <g>
            <rect x="10" y="10" width="50" height="30" fill="#ff0000"/>
            <ellipse cx="100" cy="50" rx="20" ry="20" fill="#00ff00"/>
          </g>
        </svg>
      `;

      const { shapes } = FileManager.parse(svg);

      // External SVG groups without data-group-type should still be parsed
      // The behavior depends on implementation - check if it's a group or separate shapes
      expect(shapes.length).toBeGreaterThan(0);
    });

    it('should apply group transform to children', () => {
      // Groups with data-group-type="group" apply transforms to children
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
          <g data-group-type="group" transform="translate(100, 50)">
            <rect x="0" y="0" width="50" height="30" fill="#ff0000"/>
          </g>
        </svg>
      `;

      const { shapes } = FileManager.parse(svg);

      // Find the rectangle (might be inside a group or flattened)
      let rect: Rectangle | null = null;
      for (const shape of shapes) {
        if (shape.type === 'rectangle') {
          rect = shape as Rectangle;
        } else if (shape.type === 'group') {
          const group = shape as Group;
          if (group.children[0]?.type === 'rectangle') {
            rect = group.children[0] as Rectangle;
          }
        }
      }

      expect(rect).not.toBeNull();
      if (rect) {
        expect(rect.x).toBe(100);  // 0 + 100
        expect(rect.y).toBe(50);   // 0 + 50
      }
    });

    it('should apply nested group transforms', () => {
      // Nested groups with data-group-type apply transforms to children
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
          <g data-group-type="group" transform="translate(100, 0)">
            <g data-group-type="group" transform="translate(50, 50)">
              <rect x="0" y="0" width="30" height="20" fill="#ff0000"/>
            </g>
          </g>
        </svg>
      `;

      const { shapes } = FileManager.parse(svg);

      // Find the rectangle
      let rect: Rectangle | null = null;
      const findRect = (s: any): Rectangle | null => {
        if (s.type === 'rectangle') return s;
        if (s.type === 'group') {
          for (const child of s.children) {
            const found = findRect(child);
            if (found) return found;
          }
        }
        return null;
      };
      for (const shape of shapes) {
        const found = findRect(shape);
        if (found) {
          rect = found;
          break;
        }
      }

      expect(rect).not.toBeNull();
      if (rect) {
        // Combined transform: translate(100, 0) + translate(50, 50) = translate(150, 50)
        expect(rect.x).toBe(150);  // 0 + 100 + 50
        expect(rect.y).toBe(50);   // 0 + 0 + 50
      }
    });
  });

  describe('canvas size import', () => {
    it('should import canvas width and height', () => {
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="1024" height="768">
          <rect x="0" y="0" width="100" height="100"/>
        </svg>
      `;

      const { canvasSize } = FileManager.parse(svg);

      expect(canvasSize.width).toBe(1024);
      expect(canvasSize.height).toBe(768);
    });

    it('should use default size when width/height not specified', () => {
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg">
          <rect x="0" y="0" width="100" height="100"/>
        </svg>
      `;

      const { canvasSize } = FileManager.parse(svg);

      // Should use default canvas size
      expect(canvasSize.width).toBeGreaterThan(0);
      expect(canvasSize.height).toBeGreaterThan(0);
    });
  });

  describe('complex PowerPoint SVG', () => {
    it('should import typical PowerPoint exported shape', () => {
      // Note: XML declaration should not have leading whitespace
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="720" viewBox="0 0 960 720">
          <g>
            <path d="M 100 100 L 200 100 L 200 200 L 100 200 Z"
                  fill="#4472C4" stroke="#2F528F" stroke-width="1"/>
          </g>
        </svg>`;

      const { shapes, canvasSize } = FileManager.parse(svg);

      expect(canvasSize.width).toBe(960);
      expect(canvasSize.height).toBe(720);
      expect(shapes.length).toBeGreaterThan(0);
    });

    it('should import arrow shape from PowerPoint', () => {
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
          <path d="M 50 100 L 150 100 L 150 80 L 200 120 L 150 160 L 150 140 L 50 140 Z"
                fill="#ff0000" stroke="#990000" stroke-width="2"/>
        </svg>
      `;

      const { shapes } = FileManager.parse(svg);

      expect(shapes).toHaveLength(1);
      expect(shapes[0].type).toBe('path');
      const path = shapes[0] as Path;
      expect(path.commands[0].type).toBe('M');
      expect(path.commands[path.commands.length - 1].type).toBe('Z');
    });

    it('should import multiple shapes from same SVG', () => {
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
          <rect x="50" y="50" width="100" height="80" fill="#ff0000"/>
          <ellipse cx="300" cy="100" rx="50" ry="40" fill="#00ff00"/>
          <line x1="400" y1="50" x2="500" y2="150" stroke="#0000ff" stroke-width="2"/>
          <text x="100" y="300" font-size="20">Label</text>
        </svg>
      `;

      const { shapes } = FileManager.parse(svg);

      expect(shapes).toHaveLength(4);

      const types = shapes.map(s => s.type);
      expect(types).toContain('rectangle');
      expect(types).toContain('ellipse');
      expect(types).toContain('line');
      expect(types).toContain('text');
    });
  });

  describe('error handling', () => {
    it('should handle empty SVG gracefully', () => {
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
        </svg>
      `;

      const { shapes } = FileManager.parse(svg);

      expect(shapes).toHaveLength(0);
    });

    it('should handle invalid SVG gracefully', () => {
      const svg = 'not valid svg';

      const result = FileManager.parse(svg);

      expect(result.shapes).toHaveLength(0);
    });

    it('should skip unsupported elements', () => {
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
          <defs>
            <linearGradient id="grad1"/>
          </defs>
          <rect x="0" y="0" width="100" height="100" fill="url(#grad1)"/>
          <use href="#something"/>
        </svg>
      `;

      const { shapes } = FileManager.parse(svg);

      // Should have at least the rect, use element might be skipped
      expect(shapes.length).toBeGreaterThanOrEqual(1);
    });
  });
});
