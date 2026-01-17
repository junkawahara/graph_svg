import { describe, it, expect, beforeEach } from 'vitest';
import { FileManager } from '../../../src/renderer/core/FileManager';
import { getGraphManager, GraphManager } from '../../../src/renderer/core/GraphManager';
import { Line } from '../../../src/renderer/shapes/Line';
import { Rectangle } from '../../../src/renderer/shapes/Rectangle';
import { Ellipse } from '../../../src/renderer/shapes/Ellipse';
import { Text } from '../../../src/renderer/shapes/Text';
import { Polygon } from '../../../src/renderer/shapes/Polygon';
import { Polyline } from '../../../src/renderer/shapes/Polyline';
import { Path } from '../../../src/renderer/shapes/Path';
import { Image } from '../../../src/renderer/shapes/Image';
import { Node } from '../../../src/renderer/shapes/Node';
import { Edge } from '../../../src/renderer/shapes/Edge';
import { Group } from '../../../src/renderer/shapes/Group';
import { DEFAULT_CANVAS_SIZE } from '../../../src/shared/types';

describe('FileManager.parse', () => {
  let graphManager: GraphManager;

  beforeEach(() => {
    graphManager = getGraphManager();
    graphManager.clear();
  });

  describe('canvas size parsing', () => {
    it('should parse canvas dimensions from SVG width and height', () => {
      const svg = `<?xml version="1.0" encoding="UTF-8"?>
        <svg xmlns="http://www.w3.org/2000/svg" width="1024" height="768" viewBox="0 0 1024 768">
        </svg>`;

      const result = FileManager.parse(svg);

      expect(result.canvasSize.width).toBe(1024);
      expect(result.canvasSize.height).toBe(768);
    });

    it('should use default size when width/height missing', () => {
      const svg = `<?xml version="1.0" encoding="UTF-8"?>
        <svg xmlns="http://www.w3.org/2000/svg">
        </svg>`;

      const result = FileManager.parse(svg);

      expect(result.canvasSize.width).toBe(DEFAULT_CANVAS_SIZE.width);
      expect(result.canvasSize.height).toBe(DEFAULT_CANVAS_SIZE.height);
    });

    it('should use default size for invalid dimensions', () => {
      const svg = `<?xml version="1.0" encoding="UTF-8"?>
        <svg xmlns="http://www.w3.org/2000/svg" width="abc" height="-100">
        </svg>`;

      const result = FileManager.parse(svg);

      expect(result.canvasSize.width).toBe(DEFAULT_CANVAS_SIZE.width);
      expect(result.canvasSize.height).toBe(DEFAULT_CANVAS_SIZE.height);
    });
  });

  describe('error handling', () => {
    it('should return empty shapes for invalid SVG', () => {
      const result = FileManager.parse('not valid svg');

      expect(result.shapes).toHaveLength(0);
      expect(result.canvasSize).toEqual(DEFAULT_CANVAS_SIZE);
    });

    it('should return empty shapes for HTML without SVG', () => {
      const html = '<html><body><div>Hello</div></body></html>';

      const result = FileManager.parse(html);

      expect(result.shapes).toHaveLength(0);
    });

    it('should handle empty string', () => {
      const result = FileManager.parse('');

      expect(result.shapes).toHaveLength(0);
    });
  });

  describe('Line parsing', () => {
    it('should parse basic line element', () => {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
        <line id="line-1" x1="10" y1="20" x2="100" y2="200" stroke="#000000" stroke-width="2" fill="none"/>
      </svg>`;

      const result = FileManager.parse(svg);

      expect(result.shapes).toHaveLength(1);
      const line = result.shapes[0] as Line;
      expect(line).toBeInstanceOf(Line);
      expect(line.id).toBe('line-1');
      expect(line.x1).toBe(10);
      expect(line.y1).toBe(20);
      expect(line.x2).toBe(100);
      expect(line.y2).toBe(200);
    });

    it('should parse line with style attributes', () => {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
        <line id="line-1" x1="0" y1="0" x2="100" y2="100"
              stroke="#ff0000" stroke-width="5" stroke-dasharray="5,5" stroke-linecap="round" opacity="0.5"/>
      </svg>`;

      const result = FileManager.parse(svg);
      const line = result.shapes[0] as Line;

      expect(line.style.stroke).toBe('#ff0000');
      expect(line.style.strokeWidth).toBe(5);
      expect(line.style.strokeDasharray).toBe('5,5');
      expect(line.style.strokeLinecap).toBe('round');
      expect(line.style.opacity).toBe(0.5);
    });

    it('should parse line with markers (legacy format with marker-* attributes)', () => {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
        <defs>
          <marker id="marker-arrow-medium-000000-end"/>
        </defs>
        <line id="line-1" x1="0" y1="0" x2="100" y2="100"
              stroke="#000000" marker-end="url(#marker-arrow-medium-000000-end)"/>
      </svg>`;

      const result = FileManager.parse(svg);
      const line = result.shapes[0] as Line;

      expect(line.markerEnd).toBe('arrow-medium');
    });

    it('should parse line with markers (new group format)', () => {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
        <g id="line-1" data-shape-type="line-with-markers" data-marker-start="triangle-small" data-marker-end="arrow-large">
          <line data-role="main" x1="10" y1="20" x2="100" y2="200" stroke="#ff0000" stroke-width="2"/>
        </g>
      </svg>`;

      const result = FileManager.parse(svg);
      const line = result.shapes[0] as Line;

      expect(line.type).toBe('line');
      expect(line.x1).toBe(10);
      expect(line.y1).toBe(20);
      expect(line.x2).toBe(100);
      expect(line.y2).toBe(200);
      expect(line.markerStart).toBe('triangle-small');
      expect(line.markerEnd).toBe('arrow-large');
      expect(line.style.stroke).toBe('#ff0000');
      expect(line.style.strokeWidth).toBe(2);
    });

    it('should parse line group with only end marker', () => {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
        <g id="line-1" data-shape-type="line-with-markers" data-marker-start="none" data-marker-end="circle-medium">
          <line data-role="main" x1="0" y1="0" x2="50" y2="50" stroke="#000000" stroke-width="1"/>
        </g>
      </svg>`;

      const result = FileManager.parse(svg);
      const line = result.shapes[0] as Line;

      expect(line.markerStart).toBe('none');
      expect(line.markerEnd).toBe('circle-medium');
    });
  });

  describe('Rectangle parsing', () => {
    it('should parse basic rectangle element', () => {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
        <rect id="rect-1" x="50" y="60" width="100" height="80" fill="#00ff00" stroke="#000000" stroke-width="1"/>
      </svg>`;

      const result = FileManager.parse(svg);

      expect(result.shapes).toHaveLength(1);
      const rect = result.shapes[0] as Rectangle;
      expect(rect).toBeInstanceOf(Rectangle);
      expect(rect.id).toBe('rect-1');
      expect(rect.x).toBe(50);
      expect(rect.y).toBe(60);
      expect(rect.width).toBe(100);
      expect(rect.height).toBe(80);
    });

    it('should parse rectangle with fill="none"', () => {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
        <rect id="rect-1" x="0" y="0" width="100" height="100" fill="none" stroke="#000000"/>
      </svg>`;

      const result = FileManager.parse(svg);
      const rect = result.shapes[0] as Rectangle;

      expect(rect.style.fillNone).toBe(true);
    });
  });

  describe('Ellipse parsing', () => {
    it('should parse basic ellipse element', () => {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
        <ellipse id="ellipse-1" cx="100" cy="150" rx="50" ry="30" fill="#0000ff" stroke="#000000"/>
      </svg>`;

      const result = FileManager.parse(svg);

      expect(result.shapes).toHaveLength(1);
      const ellipse = result.shapes[0] as Ellipse;
      expect(ellipse).toBeInstanceOf(Ellipse);
      expect(ellipse.cx).toBe(100);
      expect(ellipse.cy).toBe(150);
      expect(ellipse.rx).toBe(50);
      expect(ellipse.ry).toBe(30);
    });

    it('should parse circle element as ellipse', () => {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
        <circle cx="100" cy="100" r="50" fill="#ff0000"/>
      </svg>`;

      const result = FileManager.parse(svg);

      expect(result.shapes).toHaveLength(1);
      const ellipse = result.shapes[0] as Ellipse;
      expect(ellipse).toBeInstanceOf(Ellipse);
      expect(ellipse.cx).toBe(100);
      expect(ellipse.cy).toBe(100);
      expect(ellipse.rx).toBe(50);
      expect(ellipse.ry).toBe(50);
    });
  });

  describe('Text parsing', () => {
    it('should parse basic text element', () => {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
        <text id="text-1" x="100" y="100" font-size="16" font-family="Arial">Hello World</text>
      </svg>`;

      const result = FileManager.parse(svg);

      expect(result.shapes).toHaveLength(1);
      const text = result.shapes[0] as Text;
      expect(text).toBeInstanceOf(Text);
      expect(text.x).toBe(100);
      expect(text.y).toBe(100);
      expect(text.content).toBe('Hello World');
      expect(text.fontSize).toBe(16);
      expect(text.fontFamily).toBe('Arial');
    });

    it('should parse text with font properties', () => {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
        <text id="text-1" x="0" y="0" font-size="24" font-family="Times New Roman" font-weight="bold" font-style="italic">Styled</text>
      </svg>`;

      const result = FileManager.parse(svg);
      const text = result.shapes[0] as Text;

      expect(text.fontSize).toBe(24);
      expect(text.fontFamily).toBe('Times New Roman');
      expect(text.fontWeight).toBe('bold');
      expect(text.fontStyle).toBe('italic');
    });

    it('should parse text with tspan elements (multi-line)', () => {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
        <text id="text-1" x="100" y="100" font-size="16">
          <tspan x="100" dy="0">Line 1</tspan>
          <tspan x="100" dy="20">Line 2</tspan>
        </text>
      </svg>`;

      const result = FileManager.parse(svg);
      const text = result.shapes[0] as Text;

      expect(text.content).toContain('Line 1');
      expect(text.content).toContain('Line 2');
    });

    it('should parse text with text-decoration', () => {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
        <text id="text-1" x="0" y="0" text-decoration="underline line-through">Decorated</text>
      </svg>`;

      const result = FileManager.parse(svg);
      const text = result.shapes[0] as Text;

      expect(text.textUnderline).toBe(true);
      expect(text.textStrikethrough).toBe(true);
    });
  });

  describe('Polygon parsing', () => {
    it('should parse polygon element', () => {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
        <polygon id="polygon-1" points="0,0 100,0 50,100" fill="#ff0000" stroke="#000000"/>
      </svg>`;

      const result = FileManager.parse(svg);

      expect(result.shapes).toHaveLength(1);
      const polygon = result.shapes[0] as Polygon;
      expect(polygon).toBeInstanceOf(Polygon);
      expect(polygon.points).toHaveLength(3);
      expect(polygon.points[0]).toEqual({ x: 0, y: 0 });
      expect(polygon.points[1]).toEqual({ x: 100, y: 0 });
      expect(polygon.points[2]).toEqual({ x: 50, y: 100 });
    });
  });

  describe('Polyline parsing', () => {
    it('should parse polyline element', () => {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
        <polyline id="polyline-1" points="0,0 50,50 100,0" fill="none" stroke="#000000"/>
      </svg>`;

      const result = FileManager.parse(svg);

      expect(result.shapes).toHaveLength(1);
      const polyline = result.shapes[0] as Polyline;
      expect(polyline).toBeInstanceOf(Polyline);
      expect(polyline.points).toHaveLength(3);
    });
  });

  describe('Path parsing', () => {
    it('should parse path with line commands', () => {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
        <path id="path-1" d="M 0 0 L 100 100 L 200 0" fill="none" stroke="#000000"/>
      </svg>`;

      const result = FileManager.parse(svg);

      expect(result.shapes).toHaveLength(1);
      const path = result.shapes[0] as Path;
      expect(path).toBeInstanceOf(Path);
      expect(path.commands.length).toBeGreaterThan(0);
    });

    it('should parse path with curve commands', () => {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
        <path id="path-1" d="M 0 0 C 25 50 75 50 100 0" fill="none" stroke="#000000"/>
      </svg>`;

      const result = FileManager.parse(svg);
      const path = result.shapes[0] as Path;

      expect(path.commands.some(c => c.type === 'C')).toBe(true);
    });

    it('should parse closed path', () => {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
        <path id="path-1" d="M 0 0 L 100 0 L 50 100 Z" fill="#ff0000" stroke="#000000"/>
      </svg>`;

      const result = FileManager.parse(svg);
      const path = result.shapes[0] as Path;

      expect(path.commands.some(c => c.type === 'Z')).toBe(true);
    });

    it('should parse path with markers (legacy format with marker-* attributes)', () => {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
        <defs>
          <marker id="marker-triangle-large-ff0000-start"/>
          <marker id="marker-arrow-medium-ff0000-end"/>
        </defs>
        <path id="path-1" d="M 0 0 L 100 100"
              stroke="#ff0000" marker-start="url(#marker-triangle-large-ff0000-start)" marker-end="url(#marker-arrow-medium-ff0000-end)"/>
      </svg>`;

      const result = FileManager.parse(svg);
      const path = result.shapes[0] as Path;

      expect(path.markerStart).toBe('triangle-large');
      expect(path.markerEnd).toBe('arrow-medium');
    });

    it('should parse path with markers (new group format)', () => {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
        <g id="path-1" data-shape-type="path-with-markers" data-marker-start="diamond-small" data-marker-end="arrow-medium">
          <path data-role="main" d="M 10 20 L 50 80 C 60 90 70 100 80 110" fill="none" stroke="#0000ff" stroke-width="3"/>
        </g>
      </svg>`;

      const result = FileManager.parse(svg);
      const path = result.shapes[0] as Path;

      expect(path.type).toBe('path');
      expect(path.commands.length).toBeGreaterThan(0);
      expect(path.markerStart).toBe('diamond-small');
      expect(path.markerEnd).toBe('arrow-medium');
      expect(path.style.stroke).toBe('#0000ff');
      expect(path.style.strokeWidth).toBe(3);
    });

    it('should parse path group with only start marker', () => {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
        <g id="path-1" data-shape-type="path-with-markers" data-marker-start="circle-large" data-marker-end="none">
          <path data-role="main" d="M 0 0 L 100 100" fill="none" stroke="#000000" stroke-width="1"/>
        </g>
      </svg>`;

      const result = FileManager.parse(svg);
      const path = result.shapes[0] as Path;

      expect(path.markerStart).toBe('circle-large');
      expect(path.markerEnd).toBe('none');
    });

    it('should skip path elements without d attribute', () => {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
        <path id="path-1" fill="none" stroke="#000000"/>
      </svg>`;

      const result = FileManager.parse(svg);

      expect(result.shapes).toHaveLength(0);
    });
  });

  describe('Image parsing', () => {
    it('should parse image element', () => {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
        <image id="image-1" x="50" y="50" width="200" height="150" href="data:image/png;base64,ABC123"/>
      </svg>`;

      const result = FileManager.parse(svg);

      expect(result.shapes).toHaveLength(1);
      const image = result.shapes[0] as Image;
      expect(image).toBeInstanceOf(Image);
      expect(image.x).toBe(50);
      expect(image.y).toBe(50);
      expect(image.width).toBe(200);
      expect(image.height).toBe(150);
    });
  });

  describe('Node parsing', () => {
    it('should parse graph node element', () => {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
        <g id="node-1" data-graph-type="node" data-label="A">
          <ellipse cx="100" cy="100" rx="30" ry="30" fill="#ffffff" stroke="#000000"/>
          <text x="100" y="100" text-anchor="middle">A</text>
        </g>
      </svg>`;

      const result = FileManager.parse(svg);

      expect(result.shapes).toHaveLength(1);
      const node = result.shapes[0] as Node;
      expect(node).toBeInstanceOf(Node);
      expect(node.id).toBe('node-1');
      expect(node.label).toBe('A');
      expect(node.cx).toBe(100);
      expect(node.cy).toBe(100);
    });

    it('should register node with GraphManager', () => {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
        <g id="node-1" data-graph-type="node" data-label="A">
          <ellipse cx="100" cy="100" rx="30" ry="30"/>
        </g>
      </svg>`;

      FileManager.parse(svg);

      expect(graphManager.hasNode('node-1')).toBe(true);
    });
  });

  describe('Edge parsing', () => {
    it('should parse graph edge element', () => {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
        <g id="node-1" data-graph-type="node" data-label="A">
          <ellipse cx="100" cy="100" rx="30" ry="30"/>
        </g>
        <g id="node-2" data-graph-type="node" data-label="B">
          <ellipse cx="200" cy="100" rx="30" ry="30"/>
        </g>
        <g id="edge-1" data-graph-type="edge" data-source-id="node-1" data-target-id="node-2" data-direction="forward">
          <path d="M 130 100 L 170 100" fill="none" stroke="#000000"/>
        </g>
      </svg>`;

      const result = FileManager.parse(svg);

      const edges = result.shapes.filter(s => s instanceof Edge);
      expect(edges).toHaveLength(1);
      const edge = edges[0] as Edge;
      expect(edge.sourceNodeId).toBe('node-1');
      expect(edge.targetNodeId).toBe('node-2');
      expect(edge.direction).toBe('forward');
    });

    it('should parse edge with label', () => {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
        <g id="node-1" data-graph-type="node" data-label="A">
          <ellipse cx="100" cy="100" rx="30" ry="30"/>
        </g>
        <g id="node-2" data-graph-type="node" data-label="B">
          <ellipse cx="200" cy="100" rx="30" ry="30"/>
        </g>
        <g id="edge-1" data-graph-type="edge" data-source-id="node-1" data-target-id="node-2" data-direction="none" data-label="weight">
          <path d="M 130 100 L 170 100" fill="none" stroke="#000000"/>
          <text x="150" y="90">weight</text>
        </g>
      </svg>`;

      const result = FileManager.parse(svg);
      const edge = result.shapes.find(s => s instanceof Edge) as Edge;

      expect(edge.label).toBe('weight');
    });

    it('should register edge with GraphManager', () => {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
        <g id="node-1" data-graph-type="node" data-label="A">
          <ellipse cx="100" cy="100" rx="30" ry="30"/>
        </g>
        <g id="node-2" data-graph-type="node" data-label="B">
          <ellipse cx="200" cy="100" rx="30" ry="30"/>
        </g>
        <g id="edge-1" data-graph-type="edge" data-source-id="node-1" data-target-id="node-2">
          <path d="M 130 100 L 170 100"/>
        </g>
      </svg>`;

      FileManager.parse(svg);

      expect(graphManager.hasEdge('edge-1')).toBe(true);
    });
  });

  describe('Group parsing', () => {
    it('should parse group element with children', () => {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
        <g id="group-1" data-group-type="group">
          <rect id="rect-1" x="10" y="10" width="50" height="30" fill="#ff0000"/>
          <ellipse id="ellipse-1" cx="100" cy="50" rx="20" ry="20" fill="#00ff00"/>
        </g>
      </svg>`;

      const result = FileManager.parse(svg);

      expect(result.shapes).toHaveLength(1);
      const group = result.shapes[0] as Group;
      expect(group).toBeInstanceOf(Group);
      expect(group.id).toBe('group-1');
      expect(group.children).toHaveLength(2);
    });

    it('should parse nested groups', () => {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
        <g id="outer-group" data-group-type="group">
          <g id="inner-group" data-group-type="group">
            <rect id="rect-1" x="0" y="0" width="50" height="50"/>
          </g>
        </g>
      </svg>`;

      const result = FileManager.parse(svg);

      const outerGroup = result.shapes[0] as Group;
      expect(outerGroup.id).toBe('outer-group');
      expect(outerGroup.children).toHaveLength(1);

      const innerGroup = outerGroup.children[0] as Group;
      expect(innerGroup).toBeInstanceOf(Group);
      expect(innerGroup.id).toBe('inner-group');
    });
  });

  describe('transform parsing', () => {
    it('should apply translate transform to shapes', () => {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
        <rect id="rect-1" x="0" y="0" width="100" height="50" transform="translate(50, 100)"/>
      </svg>`;

      const result = FileManager.parse(svg);
      const rect = result.shapes[0] as Rectangle;

      expect(rect.x).toBe(50);
      expect(rect.y).toBe(100);
    });

    it('should apply scale transform to shapes', () => {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
        <rect id="rect-1" x="0" y="0" width="100" height="50" transform="scale(2)"/>
      </svg>`;

      const result = FileManager.parse(svg);
      const rect = result.shapes[0] as Rectangle;

      expect(rect.width).toBe(200);
      expect(rect.height).toBe(100);
    });
  });

  describe('multiple shapes', () => {
    it('should parse multiple shapes', () => {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
        <line id="line-1" x1="0" y1="0" x2="100" y2="100" stroke="#000000"/>
        <rect id="rect-1" x="50" y="50" width="100" height="100" fill="#ff0000"/>
        <ellipse id="ellipse-1" cx="200" cy="200" rx="50" ry="30" fill="#00ff00"/>
        <text id="text-1" x="300" y="300">Hello</text>
      </svg>`;

      const result = FileManager.parse(svg);

      expect(result.shapes).toHaveLength(4);
      expect(result.shapes.some(s => s instanceof Line)).toBe(true);
      expect(result.shapes.some(s => s instanceof Rectangle)).toBe(true);
      expect(result.shapes.some(s => s instanceof Ellipse)).toBe(true);
      expect(result.shapes.some(s => s instanceof Text)).toBe(true);
    });
  });

  describe('elements inside groups/nodes should be excluded', () => {
    it('should not parse shapes inside node elements separately', () => {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
        <g id="node-1" data-graph-type="node" data-label="A">
          <ellipse cx="100" cy="100" rx="30" ry="30"/>
          <text x="100" y="100">A</text>
        </g>
      </svg>`;

      const result = FileManager.parse(svg);

      // Should only have the node, not separate ellipse and text
      expect(result.shapes).toHaveLength(1);
      expect(result.shapes[0]).toBeInstanceOf(Node);
    });

    it('should not parse shapes inside group elements separately', () => {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
        <g id="group-1" data-group-type="group">
          <rect x="0" y="0" width="100" height="100"/>
        </g>
        <rect id="standalone" x="200" y="200" width="50" height="50"/>
      </svg>`;

      const result = FileManager.parse(svg);

      // Should have 2 shapes: the group and the standalone rect
      expect(result.shapes).toHaveLength(2);
      expect(result.shapes.some(s => s instanceof Group)).toBe(true);
      expect(result.shapes.some(s => s instanceof Rectangle && s.id === 'standalone')).toBe(true);
    });
  });

  describe('style parsing', () => {
    it('should parse fill color', () => {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
        <rect x="0" y="0" width="100" height="100" fill="#ff0000"/>
      </svg>`;

      const result = FileManager.parse(svg);
      const rect = result.shapes[0] as Rectangle;

      expect(rect.style.fill).toBe('#ff0000');
      expect(rect.style.fillNone).toBe(false);
    });

    it('should parse stroke properties', () => {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
        <line x1="0" y1="0" x2="100" y2="100" stroke="#0000ff" stroke-width="3"/>
      </svg>`;

      const result = FileManager.parse(svg);
      const line = result.shapes[0] as Line;

      expect(line.style.stroke).toBe('#0000ff');
      expect(line.style.strokeWidth).toBe(3);
    });

    it('should parse opacity', () => {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
        <rect x="0" y="0" width="100" height="100" opacity="0.5"/>
      </svg>`;

      const result = FileManager.parse(svg);
      const rect = result.shapes[0] as Rectangle;

      expect(rect.style.opacity).toBe(0.5);
    });

    it('should parse stroke-dasharray', () => {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
        <line x1="0" y1="0" x2="100" y2="100" stroke="#000000" stroke-dasharray="5,10,5"/>
      </svg>`;

      const result = FileManager.parse(svg);
      const line = result.shapes[0] as Line;

      expect(line.style.strokeDasharray).toBe('5,10,5');
    });

    it('should parse stroke-linecap', () => {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
        <line x1="0" y1="0" x2="100" y2="100" stroke="#000000" stroke-linecap="round"/>
      </svg>`;

      const result = FileManager.parse(svg);
      const line = result.shapes[0] as Line;

      expect(line.style.strokeLinecap).toBe('round');
    });
  });

  describe('class attribute parsing', () => {
    it('should preserve class attribute on shapes', () => {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
        <rect id="rect-1" class="my-style" x="0" y="0" width="100" height="100"/>
      </svg>`;

      const result = FileManager.parse(svg);
      const rect = result.shapes[0] as Rectangle;

      expect(rect.className).toBe('my-style');
    });
  });

  describe('defs elements should be excluded', () => {
    it('should not parse elements inside defs', () => {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
        <defs>
          <rect id="template" x="0" y="0" width="100" height="100"/>
          <marker id="arrow">
            <path d="M 0 0 L 10 5 L 0 10"/>
          </marker>
        </defs>
        <rect id="actual" x="50" y="50" width="50" height="50"/>
      </svg>`;

      const result = FileManager.parse(svg);

      // Should only have the actual rect, not the template
      expect(result.shapes).toHaveLength(1);
      expect((result.shapes[0] as Rectangle).id).toBe('actual');
    });
  });
});
