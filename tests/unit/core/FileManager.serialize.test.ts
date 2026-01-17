import { describe, it, expect } from 'vitest';
import { FileManager } from '../../../src/renderer/core/FileManager';
import {
  createTestLine,
  createTestRectangle,
  createTestEllipse,
  createTestText,
  createTestPolygon,
  createTestPolyline,
  createTestPath,
  createTestGroup,
  createTestStyle
} from '../../utils/mock-factories';
import { DEFAULT_STYLE } from '../../../src/shared/types';

describe('FileManager.serialize', () => {
  describe('basic SVG structure', () => {
    it('should generate valid SVG with XML declaration', () => {
      const svg = FileManager.serialize([], 800, 600);

      expect(svg).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(svg).toContain('<svg xmlns="http://www.w3.org/2000/svg"');
    });

    it('should include canvas dimensions', () => {
      const svg = FileManager.serialize([], 800, 600);

      expect(svg).toContain('width="800"');
      expect(svg).toContain('height="600"');
      expect(svg).toContain('viewBox="0 0 800 600"');
    });

    it('should include DrawSVG comment', () => {
      const svg = FileManager.serialize([], 800, 600);

      expect(svg).toContain('<!-- Created with DrawSVG -->');
    });

    it('should close SVG tag properly', () => {
      const svg = FileManager.serialize([], 800, 600);

      expect(svg).toContain('</svg>');
    });
  });

  describe('Line serialization', () => {
    it('should serialize line with coordinates', () => {
      const line = createTestLine({ id: 'line-1', x1: 10, y1: 20, x2: 100, y2: 200 });
      const svg = FileManager.serialize([line], 800, 600);

      expect(svg).toContain('id="line-1"');
      expect(svg).toContain('x1="10"');
      expect(svg).toContain('y1="20"');
      expect(svg).toContain('x2="100"');
      expect(svg).toContain('y2="200"');
    });

    it('should serialize line with style', () => {
      const line = createTestLine({
        id: 'line-1',
        style: createTestStyle({ stroke: '#ff0000', strokeWidth: 3 })
      });
      const svg = FileManager.serialize([line], 800, 600);

      expect(svg).toContain('stroke="#ff0000"');
      expect(svg).toContain('stroke-width="3"');
    });

    it('should serialize line with markers', () => {
      const line = createTestLine({
        id: 'line-1',
        markerEnd: 'arrow-medium'
      });
      const svg = FileManager.serialize([line], 800, 600);

      expect(svg).toContain('marker-end="url(#marker-arrow-medium-');
      expect(svg).toContain('<defs>');
      expect(svg).toContain('<marker id="marker-arrow-medium-');
    });
  });

  describe('Rectangle serialization', () => {
    it('should serialize rectangle with position and size', () => {
      const rect = createTestRectangle({ id: 'rect-1', x: 50, y: 60, width: 100, height: 80 });
      const svg = FileManager.serialize([rect], 800, 600);

      expect(svg).toContain('<rect');
      expect(svg).toContain('id="rect-1"');
      expect(svg).toContain('x="50"');
      expect(svg).toContain('y="60"');
      expect(svg).toContain('width="100"');
      expect(svg).toContain('height="80"');
    });

    it('should serialize rectangle with fill', () => {
      const rect = createTestRectangle({
        id: 'rect-1',
        style: createTestStyle({ fill: '#00ff00', fillNone: false })
      });
      const svg = FileManager.serialize([rect], 800, 600);

      expect(svg).toContain('fill="#00ff00"');
    });

    it('should serialize rectangle with no fill', () => {
      const rect = createTestRectangle({
        id: 'rect-1',
        style: createTestStyle({ fillNone: true })
      });
      const svg = FileManager.serialize([rect], 800, 600);

      expect(svg).toContain('fill="none"');
    });
  });

  describe('Ellipse serialization', () => {
    it('should serialize ellipse with center and radii', () => {
      const ellipse = createTestEllipse({ id: 'ellipse-1', cx: 100, cy: 150, rx: 50, ry: 30 });
      const svg = FileManager.serialize([ellipse], 800, 600);

      expect(svg).toContain('<ellipse');
      expect(svg).toContain('id="ellipse-1"');
      expect(svg).toContain('cx="100"');
      expect(svg).toContain('cy="150"');
      expect(svg).toContain('rx="50"');
      expect(svg).toContain('ry="30"');
    });
  });

  describe('Text serialization', () => {
    it('should serialize text with content', () => {
      const text = createTestText({ id: 'text-1', x: 100, y: 100, content: 'Hello World' });
      const svg = FileManager.serialize([text], 800, 600);

      expect(svg).toContain('<text');
      expect(svg).toContain('id="text-1"');
      expect(svg).toContain('x="100"');
      expect(svg).toContain('y="100"');
      expect(svg).toContain('>Hello World</text>');
    });

    it('should serialize text with font properties', () => {
      const text = createTestText({
        id: 'text-1',
        content: 'Test',
        fontSize: 24,
        fontFamily: 'Arial',
        fontWeight: 'bold'
      });
      const svg = FileManager.serialize([text], 800, 600);

      expect(svg).toContain('font-size="24"');
      expect(svg).toContain('font-family="Arial"');
      expect(svg).toContain('font-weight="bold"');
    });

    it('should escape special characters in text', () => {
      const text = createTestText({ id: 'text-1', content: '<test> & "value"' });
      const svg = FileManager.serialize([text], 800, 600);

      expect(svg).toContain('&lt;test&gt;');
      expect(svg).toContain('&amp;');
      expect(svg).toContain('&quot;value&quot;');
    });

    it('should serialize multi-line text with tspans', () => {
      const text = createTestText({ id: 'text-1', x: 100, y: 100, content: 'Line 1\nLine 2' });
      const svg = FileManager.serialize([text], 800, 600);

      expect(svg).toContain('<tspan');
      expect(svg).toContain('Line 1</tspan>');
      expect(svg).toContain('Line 2</tspan>');
    });
  });

  describe('Polygon serialization', () => {
    it('should serialize polygon with points', () => {
      const points = [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 50, y: 100 }
      ];
      const polygon = createTestPolygon({ id: 'polygon-1', points });
      const svg = FileManager.serialize([polygon], 800, 600);

      expect(svg).toContain('<polygon');
      expect(svg).toContain('id="polygon-1"');
      expect(svg).toContain('points="0,0 100,0 50,100"');
    });
  });

  describe('Polyline serialization', () => {
    it('should serialize polyline with points', () => {
      const points = [
        { x: 0, y: 0 },
        { x: 50, y: 50 },
        { x: 100, y: 0 }
      ];
      const polyline = createTestPolyline({ id: 'polyline-1', points });
      const svg = FileManager.serialize([polyline], 800, 600);

      expect(svg).toContain('<polyline');
      expect(svg).toContain('id="polyline-1"');
      expect(svg).toContain('points="0,0 50,50 100,0"');
    });
  });

  describe('Path serialization', () => {
    it('should serialize path with commands', () => {
      const commands = [
        { type: 'M' as const, x: 0, y: 0 },
        { type: 'L' as const, x: 100, y: 100 }
      ];
      const path = createTestPath({ id: 'path-1', commands });
      const svg = FileManager.serialize([path], 800, 600);

      expect(svg).toContain('<path');
      expect(svg).toContain('id="path-1"');
      expect(svg).toContain('d="M 0 0 L 100 100"');
    });

    it('should serialize path with curve commands', () => {
      const commands = [
        { type: 'M' as const, x: 0, y: 0 },
        { type: 'C' as const, cp1x: 25, cp1y: 50, cp2x: 75, cp2y: 50, x: 100, y: 0 }
      ];
      const path = createTestPath({ id: 'path-1', commands });
      const svg = FileManager.serialize([path], 800, 600);

      expect(svg).toContain('C 25 50 75 50 100 0');
    });

    it('should serialize closed path', () => {
      const commands = [
        { type: 'M' as const, x: 0, y: 0 },
        { type: 'L' as const, x: 100, y: 0 },
        { type: 'L' as const, x: 50, y: 100 },
        { type: 'Z' as const }
      ];
      const path = createTestPath({ id: 'path-1', commands });
      const svg = FileManager.serialize([path], 800, 600);

      expect(svg).toContain('Z');
    });
  });

  describe('Group serialization', () => {
    it('should serialize group with children', () => {
      const rect = createTestRectangle({ id: 'rect-1', x: 10, y: 10, width: 50, height: 30 });
      const ellipse = createTestEllipse({ id: 'ellipse-1', cx: 100, cy: 100, rx: 20, ry: 20 });
      const group = createTestGroup([rect, ellipse], { id: 'group-1' });

      const svg = FileManager.serialize([group], 800, 600);

      expect(svg).toContain('<g id="group-1"');
      expect(svg).toContain('data-group-type="group"');
      expect(svg).toContain('<rect id="rect-1"');
      expect(svg).toContain('<ellipse id="ellipse-1"');
      expect(svg).toContain('</g>');
    });

    it('should serialize nested groups', () => {
      const rect = createTestRectangle({ id: 'rect-1' });
      const innerGroup = createTestGroup([rect], { id: 'inner-group' });
      const outerGroup = createTestGroup([innerGroup], { id: 'outer-group' });

      const svg = FileManager.serialize([outerGroup], 800, 600);

      expect(svg).toContain('id="outer-group"');
      expect(svg).toContain('id="inner-group"');
      expect(svg).toContain('id="rect-1"');
    });
  });

  describe('style attributes', () => {
    it('should serialize stroke properties', () => {
      const line = createTestLine({
        id: 'line-1',
        style: createTestStyle({
          stroke: '#0000ff',
          strokeWidth: 5,
          strokeDasharray: '5,5',
          strokeLinecap: 'round'
        })
      });
      const svg = FileManager.serialize([line], 800, 600);

      expect(svg).toContain('stroke="#0000ff"');
      expect(svg).toContain('stroke-width="5"');
      expect(svg).toContain('stroke-dasharray="5,5"');
      expect(svg).toContain('stroke-linecap="round"');
    });

    it('should serialize opacity', () => {
      const rect = createTestRectangle({
        id: 'rect-1',
        style: createTestStyle({ opacity: 0.5 })
      });
      const svg = FileManager.serialize([rect], 800, 600);

      expect(svg).toContain('opacity="0.5"');
    });

    it('should not include default linecap (butt)', () => {
      const line = createTestLine({
        id: 'line-1',
        style: createTestStyle({ strokeLinecap: 'butt' })
      });
      const svg = FileManager.serialize([line], 800, 600);

      expect(svg).not.toContain('stroke-linecap="butt"');
    });
  });

  describe('multiple shapes', () => {
    it('should serialize multiple shapes', () => {
      const line = createTestLine({ id: 'line-1' });
      const rect = createTestRectangle({ id: 'rect-1' });
      const ellipse = createTestEllipse({ id: 'ellipse-1' });

      const svg = FileManager.serialize([line, rect, ellipse], 800, 600);

      expect(svg).toContain('id="line-1"');
      expect(svg).toContain('id="rect-1"');
      expect(svg).toContain('id="ellipse-1"');
    });

    it('should preserve shape order', () => {
      const rect1 = createTestRectangle({ id: 'rect-1' });
      const rect2 = createTestRectangle({ id: 'rect-2' });
      const rect3 = createTestRectangle({ id: 'rect-3' });

      const svg = FileManager.serialize([rect1, rect2, rect3], 800, 600);

      const idx1 = svg.indexOf('id="rect-1"');
      const idx2 = svg.indexOf('id="rect-2"');
      const idx3 = svg.indexOf('id="rect-3"');

      expect(idx1).toBeLessThan(idx2);
      expect(idx2).toBeLessThan(idx3);
    });
  });

  describe('empty canvas', () => {
    it('should serialize empty canvas', () => {
      const svg = FileManager.serialize([], 800, 600);

      expect(svg).toContain('<svg');
      expect(svg).toContain('</svg>');
    });
  });

  describe('marker definitions', () => {
    it('should generate marker defs for line with markers', () => {
      const line = createTestLine({
        id: 'line-1',
        markerStart: 'triangle-small',
        markerEnd: 'arrow-large'
      });

      const svg = FileManager.serialize([line], 800, 600);

      expect(svg).toContain('<defs>');
      expect(svg).toContain('</defs>');
      expect(svg).toContain('<marker id="marker-triangle-small-');
      expect(svg).toContain('<marker id="marker-arrow-large-');
    });

    it('should not include defs when no markers used', () => {
      const rect = createTestRectangle({ id: 'rect-1' });
      const svg = FileManager.serialize([rect], 800, 600);

      // Should not have defs (no markers, no classes)
      expect(svg).not.toContain('<defs>');
    });

    it('should generate color-specific markers', () => {
      const line1 = createTestLine({
        id: 'line-1',
        markerEnd: 'arrow-medium',
        style: createTestStyle({ stroke: '#ff0000' })
      });

      const line2 = createTestLine({
        id: 'line-2',
        markerEnd: 'arrow-medium',
        style: createTestStyle({ stroke: '#0000ff' })
      });

      const svg = FileManager.serialize([line1, line2], 800, 600);

      // Should have separate markers for each color
      expect(svg).toContain('marker-arrow-medium-ff0000');
      expect(svg).toContain('marker-arrow-medium-0000ff');
    });
  });

  describe('canvas size variations', () => {
    it('should handle small canvas', () => {
      const svg = FileManager.serialize([], 100, 100);

      expect(svg).toContain('width="100"');
      expect(svg).toContain('height="100"');
    });

    it('should handle large canvas', () => {
      const svg = FileManager.serialize([], 10000, 10000);

      expect(svg).toContain('width="10000"');
      expect(svg).toContain('height="10000"');
    });

    it('should handle non-square canvas', () => {
      const svg = FileManager.serialize([], 1920, 1080);

      expect(svg).toContain('width="1920"');
      expect(svg).toContain('height="1080"');
      expect(svg).toContain('viewBox="0 0 1920 1080"');
    });
  });
});
