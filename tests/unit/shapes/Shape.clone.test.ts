import { describe, it, expect } from 'vitest';
import {
  createTestRectangle,
  createTestEllipse,
  createTestLine,
  createTestPolygon,
  createTestPolyline,
  createTestPath,
  createTestText,
  createTestNode,
  createTestImage,
  createTestGroup,
  createTestStyle
} from '../../utils/mock-factories';
import { expectClose } from '../../utils/shape-comparators';

describe('Shape.clone()', () => {
  describe('Rectangle', () => {
    it('should create new instance with different id', () => {
      const original = createTestRectangle({ id: 'original-rect' });

      const cloned = original.clone();

      expect(cloned.id).not.toBe(original.id);
    });

    it('should preserve coordinates and dimensions', () => {
      const original = createTestRectangle({ x: 100, y: 200, width: 50, height: 30 });

      const cloned = original.clone();

      expectClose(cloned.x, 100);
      expectClose(cloned.y, 200);
      expect(cloned.width).toBe(50);
      expect(cloned.height).toBe(30);
    });

    it('should preserve style', () => {
      const style = createTestStyle({ fill: '#ff0000', stroke: '#00ff00', strokeWidth: 3 });
      const original = createTestRectangle({ style });

      const cloned = original.clone();

      expect(cloned.style.fill).toBe('#ff0000');
      expect(cloned.style.stroke).toBe('#00ff00');
      expect(cloned.style.strokeWidth).toBe(3);
    });

    it('should preserve rotation', () => {
      const original = createTestRectangle({ rotation: 45 });

      const cloned = original.clone();

      expectClose(cloned.rotation, 45);
    });

    it('should be independent of original', () => {
      const original = createTestRectangle({ x: 100, y: 100 });

      const cloned = original.clone();
      original.move(50, 50);

      expectClose(cloned.x, 100);
      expectClose(cloned.y, 100);
    });

    it('should have independent style object', () => {
      const original = createTestRectangle();

      const cloned = original.clone();
      original.style.fill = '#123456';

      expect(cloned.style.fill).not.toBe('#123456');
    });
  });

  describe('Ellipse', () => {
    it('should create new instance with different id', () => {
      const original = createTestEllipse({ id: 'original-ellipse' });

      const cloned = original.clone();

      expect(cloned.id).not.toBe(original.id);
    });

    it('should preserve center and radii', () => {
      const original = createTestEllipse({ cx: 150, cy: 200, rx: 40, ry: 30 });

      const cloned = original.clone();

      expectClose(cloned.cx, 150);
      expectClose(cloned.cy, 200);
      expect(cloned.rx).toBe(40);
      expect(cloned.ry).toBe(30);
    });

    it('should preserve rotation', () => {
      const original = createTestEllipse({ rotation: 30 });

      const cloned = original.clone();

      expectClose(cloned.rotation, 30);
    });

    it('should be independent of original', () => {
      const original = createTestEllipse({ cx: 100, cy: 100 });

      const cloned = original.clone();
      original.move(50, 50);

      expectClose(cloned.cx, 100);
      expectClose(cloned.cy, 100);
    });
  });

  describe('Line', () => {
    it('should create new instance with different id', () => {
      const original = createTestLine({ id: 'original-line' });

      const cloned = original.clone();

      expect(cloned.id).not.toBe(original.id);
    });

    it('should preserve endpoints', () => {
      const original = createTestLine({ x1: 10, y1: 20, x2: 100, y2: 80 });

      const cloned = original.clone();

      expectClose(cloned.x1, 10);
      expectClose(cloned.y1, 20);
      expectClose(cloned.x2, 100);
      expectClose(cloned.y2, 80);
    });

    it('should preserve markers', () => {
      const original = createTestLine({ markerStart: 'arrow-medium', markerEnd: 'triangle-large' });

      const cloned = original.clone();

      expect(cloned.markerStart).toBe('arrow-medium');
      expect(cloned.markerEnd).toBe('triangle-large');
    });

    it('should be independent of original', () => {
      const original = createTestLine({ x1: 0, y1: 0, x2: 100, y2: 100 });

      const cloned = original.clone();
      original.move(50, 50);

      expectClose(cloned.x1, 0);
      expectClose(cloned.y1, 0);
    });
  });

  describe('Polygon', () => {
    it('should create new instance with different id', () => {
      const original = createTestPolygon({ id: 'original-polygon' });

      const cloned = original.clone();

      expect(cloned.id).not.toBe(original.id);
    });

    it('should preserve all vertices', () => {
      const original = createTestPolygon({
        points: [
          { x: 0, y: 0 },
          { x: 100, y: 0 },
          { x: 50, y: 100 }
        ]
      });

      const cloned = original.clone();

      expect(cloned.points).toHaveLength(3);
      expectClose(cloned.points[0].x, 0);
      expectClose(cloned.points[0].y, 0);
      expectClose(cloned.points[1].x, 100);
      expectClose(cloned.points[1].y, 0);
      expectClose(cloned.points[2].x, 50);
      expectClose(cloned.points[2].y, 100);
    });

    it('should have independent points array', () => {
      const original = createTestPolygon({
        points: [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 50, y: 100 }]
      });

      const cloned = original.clone();
      original.points[0].x = 999;

      expectClose(cloned.points[0].x, 0);
    });
  });

  describe('Polyline', () => {
    it('should create new instance with different id', () => {
      const original = createTestPolyline({ id: 'original-polyline' });

      const cloned = original.clone();

      expect(cloned.id).not.toBe(original.id);
    });

    it('should preserve all points', () => {
      const original = createTestPolyline({
        points: [
          { x: 0, y: 0 },
          { x: 50, y: 50 },
          { x: 100, y: 0 }
        ]
      });

      const cloned = original.clone();

      expect(cloned.points).toHaveLength(3);
      expectClose(cloned.points[1].x, 50);
      expectClose(cloned.points[1].y, 50);
    });

    it('should have independent points array', () => {
      const original = createTestPolyline({
        points: [{ x: 0, y: 0 }, { x: 50, y: 50 }, { x: 100, y: 0 }]
      });

      const cloned = original.clone();
      original.points[0].x = 999;

      expectClose(cloned.points[0].x, 0);
    });
  });

  describe('Path', () => {
    it('should create new instance with different id', () => {
      const original = createTestPath({ id: 'original-path' });

      const cloned = original.clone();

      expect(cloned.id).not.toBe(original.id);
    });

    it('should preserve all commands', () => {
      const original = createTestPath({
        commands: [
          { type: 'M', x: 0, y: 0 },
          { type: 'L', x: 100, y: 100 },
          { type: 'Z' }
        ]
      });

      const cloned = original.clone();

      expect(cloned.commands).toHaveLength(3);
      expect(cloned.commands[0].type).toBe('M');
      expect(cloned.commands[1].type).toBe('L');
      expect(cloned.commands[2].type).toBe('Z');
    });

    it('should have independent commands array', () => {
      const original = createTestPath({
        commands: [
          { type: 'M', x: 0, y: 0 },
          { type: 'L', x: 100, y: 100 }
        ]
      });

      const cloned = original.clone();
      (original.commands[0] as any).x = 999;

      expectClose((cloned.commands[0] as any).x, 0);
    });

    it('should preserve markers', () => {
      const original = createTestPath({ markerStart: 'arrow-small', markerEnd: 'arrow-large' });

      const cloned = original.clone();

      expect(cloned.markerStart).toBe('arrow-small');
      expect(cloned.markerEnd).toBe('arrow-large');
    });
  });

  describe('Text', () => {
    it('should create new instance with different id', () => {
      const original = createTestText({ id: 'original-text' });

      const cloned = original.clone();

      expect(cloned.id).not.toBe(original.id);
    });

    it('should preserve position', () => {
      const original = createTestText({ x: 150, y: 200 });

      const cloned = original.clone();

      expectClose(cloned.x, 150);
      expectClose(cloned.y, 200);
    });

    it('should preserve content', () => {
      const original = createTestText({ content: 'Hello World' });

      const cloned = original.clone();

      expect(cloned.content).toBe('Hello World');
    });

    it('should preserve font properties', () => {
      const original = createTestText({
        fontSize: 24,
        fontFamily: 'Courier',
        fontWeight: 'bold'
      });

      const cloned = original.clone();

      expect(cloned.fontSize).toBe(24);
      expect(cloned.fontFamily).toBe('Courier');
      expect(cloned.fontWeight).toBe('bold');
    });

    it('should be independent of original', () => {
      const original = createTestText({ content: 'Original' });

      const cloned = original.clone();
      original.content = 'Modified';

      expect(cloned.content).toBe('Original');
    });
  });

  describe('Node', () => {
    it('should create new instance with different id', () => {
      const original = createTestNode({ id: 'original-node' });

      const cloned = original.clone();

      expect(cloned.id).not.toBe(original.id);
    });

    it('should preserve center and radii', () => {
      const original = createTestNode({ cx: 150, cy: 200, rx: 40, ry: 30 });

      const cloned = original.clone();

      expectClose(cloned.cx, 150);
      expectClose(cloned.cy, 200);
      expect(cloned.rx).toBe(40);
      expect(cloned.ry).toBe(30);
    });

    it('should preserve label', () => {
      const original = createTestNode({ label: 'TestNode' });

      const cloned = original.clone();

      expect(cloned.label).toBe('TestNode');
    });

    it('should preserve font properties', () => {
      const original = createTestNode({ fontSize: 18 });

      const cloned = original.clone();

      expect(cloned.fontSize).toBe(18);
    });

    it('should be independent of original', () => {
      const original = createTestNode({ label: 'Original' });

      const cloned = original.clone();
      original.label = 'Modified';

      expect(cloned.label).toBe('Original');
    });
  });

  describe('Image', () => {
    it('should create new instance with different id', () => {
      const original = createTestImage({ id: 'original-image' });

      const cloned = original.clone();

      expect(cloned.id).not.toBe(original.id);
    });

    it('should preserve position and dimensions', () => {
      const original = createTestImage({ x: 100, y: 150, width: 200, height: 150 });

      const cloned = original.clone();

      expectClose(cloned.x, 100);
      expectClose(cloned.y, 150);
      expect(cloned.width).toBe(200);
      expect(cloned.height).toBe(150);
    });

    it('should preserve href', () => {
      const original = createTestImage({ href: 'data:image/png;base64,test' });

      const cloned = original.clone();

      expect(cloned.href).toBe('data:image/png;base64,test');
    });
  });

  describe('Group', () => {
    it('should create new instance with different id', () => {
      const rect = createTestRectangle();
      const original = createTestGroup([rect], { id: 'original-group' });

      const cloned = original.clone();

      expect(cloned.id).not.toBe(original.id);
    });

    it('should clone all children with new ids', () => {
      const rect = createTestRectangle({ id: 'rect-1' });
      const ellipse = createTestEllipse({ id: 'ellipse-1' });
      const original = createTestGroup([rect, ellipse]);

      const cloned = original.clone();

      expect(cloned.children).toHaveLength(2);
      expect(cloned.children[0].id).not.toBe(rect.id);
      expect(cloned.children[1].id).not.toBe(ellipse.id);
    });

    it('should preserve children properties', () => {
      const rect = createTestRectangle({ x: 10, y: 20, width: 30, height: 40 });
      const original = createTestGroup([rect]);

      const cloned = original.clone();

      const clonedRect = cloned.children[0] as any;
      expectClose(clonedRect.x, 10);
      expectClose(clonedRect.y, 20);
      expect(clonedRect.width).toBe(30);
      expect(clonedRect.height).toBe(40);
    });

    it('should have independent children', () => {
      const rect = createTestRectangle({ x: 100, y: 100 });
      const original = createTestGroup([rect]);

      const cloned = original.clone();
      rect.move(50, 50);

      const clonedRect = cloned.children[0] as any;
      expectClose(clonedRect.x, 100);
      expectClose(clonedRect.y, 100);
    });

    it('should clone nested groups', () => {
      const innerRect = createTestRectangle({ id: 'innerRect' });
      const innerGroup = createTestGroup([innerRect], { id: 'innerGroup' });
      const outerGroup = createTestGroup([innerGroup], { id: 'outerGroup' });

      const cloned = outerGroup.clone();

      expect(cloned.children).toHaveLength(1);
      expect(cloned.children[0].type).toBe('group');
      const clonedInnerGroup = cloned.children[0] as any;
      expect(clonedInnerGroup.children).toHaveLength(1);
      expect(clonedInnerGroup.children[0].type).toBe('rectangle');
    });
  });

  describe('Edge', () => {
    it('should create new instance with different id', () => {
      const original = createTestEdge('node-a', 'node-b');

      const cloned = original.clone();

      expect(cloned.id).not.toBe(original.id);
    });

    it('should preserve node connections', () => {
      const original = createTestEdge('node-a', 'node-b');

      const cloned = original.clone();

      expect(cloned.sourceNodeId).toBe('node-a');
      expect(cloned.targetNodeId).toBe('node-b');
    });

    it('should preserve direction', () => {
      const original = createTestEdge('node-a', 'node-b', { direction: 'forward' });

      const cloned = original.clone();

      expect(cloned.direction).toBe('forward');
    });

    it('should preserve curve offset', () => {
      const original = createTestEdge('node-a', 'node-b', { curveOffset: 30 });

      const cloned = original.clone();

      expect(cloned.curveOffset).toBe(30);
    });

    it('should preserve self-loop properties', () => {
      const original = createTestEdge('node-a', 'node-a', { isSelfLoop: true, selfLoopAngle: Math.PI / 2 });

      const cloned = original.clone();

      expect(cloned.isSelfLoop).toBe(true);
      expect(cloned.selfLoopAngle).toBe(Math.PI / 2);
    });

    it('should preserve label', () => {
      const original = createTestEdge('node-a', 'node-b', { label: 'weight' });

      const cloned = original.clone();

      expect(cloned.label).toBe('weight');
    });
  });
});

// Import Edge factory
import { createTestEdge } from '../../utils/mock-factories';
