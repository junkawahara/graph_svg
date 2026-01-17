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
  createTestGroup
} from '../../utils/mock-factories';
import { expectClose } from '../../utils/shape-comparators';

describe('Shape.move()', () => {
  describe('Rectangle', () => {
    it('should move rectangle by positive delta', () => {
      const rect = createTestRectangle({ x: 100, y: 100, width: 50, height: 30 });

      rect.move(20, 30);

      expectClose(rect.x, 120);
      expectClose(rect.y, 130);
    });

    it('should move rectangle by negative delta', () => {
      const rect = createTestRectangle({ x: 100, y: 100 });

      rect.move(-30, -40);

      expectClose(rect.x, 70);
      expectClose(rect.y, 60);
    });

    it('should preserve width and height after move', () => {
      const rect = createTestRectangle({ x: 100, y: 100, width: 50, height: 30 });

      rect.move(20, 30);

      expect(rect.width).toBe(50);
      expect(rect.height).toBe(30);
    });

    it('should round coordinates to 3 decimal places', () => {
      const rect = createTestRectangle({ x: 100, y: 100 });

      rect.move(0.12345, 0.56789);

      expectClose(rect.x, 100.123);
      expectClose(rect.y, 100.568);
    });
  });

  describe('Ellipse', () => {
    it('should move ellipse center by positive delta', () => {
      const ellipse = createTestEllipse({ cx: 100, cy: 100, rx: 50, ry: 30 });

      ellipse.move(20, 30);

      expectClose(ellipse.cx, 120);
      expectClose(ellipse.cy, 130);
    });

    it('should move ellipse center by negative delta', () => {
      const ellipse = createTestEllipse({ cx: 100, cy: 100 });

      ellipse.move(-30, -40);

      expectClose(ellipse.cx, 70);
      expectClose(ellipse.cy, 60);
    });

    it('should preserve radii after move', () => {
      const ellipse = createTestEllipse({ cx: 100, cy: 100, rx: 50, ry: 30 });

      ellipse.move(20, 30);

      expect(ellipse.rx).toBe(50);
      expect(ellipse.ry).toBe(30);
    });
  });

  describe('Line', () => {
    it('should move both endpoints by positive delta', () => {
      const line = createTestLine({ x1: 10, y1: 20, x2: 100, y2: 80 });

      line.move(30, 40);

      expectClose(line.x1, 40);
      expectClose(line.y1, 60);
      expectClose(line.x2, 130);
      expectClose(line.y2, 120);
    });

    it('should move both endpoints by negative delta', () => {
      const line = createTestLine({ x1: 100, y1: 100, x2: 200, y2: 200 });

      line.move(-50, -60);

      expectClose(line.x1, 50);
      expectClose(line.y1, 40);
      expectClose(line.x2, 150);
      expectClose(line.y2, 140);
    });

    it('should preserve line length after move', () => {
      const line = createTestLine({ x1: 0, y1: 0, x2: 100, y2: 0 });
      const originalLength = Math.sqrt((line.x2 - line.x1) ** 2 + (line.y2 - line.y1) ** 2);

      line.move(50, 50);

      const newLength = Math.sqrt((line.x2 - line.x1) ** 2 + (line.y2 - line.y1) ** 2);
      expectClose(newLength, originalLength);
    });
  });

  describe('Polygon', () => {
    it('should move all vertices by delta', () => {
      const polygon = createTestPolygon({
        points: [
          { x: 0, y: 0 },
          { x: 100, y: 0 },
          { x: 50, y: 100 }
        ]
      });

      polygon.move(20, 30);

      expectClose(polygon.points[0].x, 20);
      expectClose(polygon.points[0].y, 30);
      expectClose(polygon.points[1].x, 120);
      expectClose(polygon.points[1].y, 30);
      expectClose(polygon.points[2].x, 70);
      expectClose(polygon.points[2].y, 130);
    });

    it('should preserve shape after move', () => {
      const polygon = createTestPolygon({
        points: [
          { x: 0, y: 0 },
          { x: 100, y: 0 },
          { x: 50, y: 100 }
        ]
      });
      const originalDistances = [
        Math.sqrt((polygon.points[1].x - polygon.points[0].x) ** 2 + (polygon.points[1].y - polygon.points[0].y) ** 2),
        Math.sqrt((polygon.points[2].x - polygon.points[1].x) ** 2 + (polygon.points[2].y - polygon.points[1].y) ** 2),
        Math.sqrt((polygon.points[0].x - polygon.points[2].x) ** 2 + (polygon.points[0].y - polygon.points[2].y) ** 2)
      ];

      polygon.move(50, 50);

      const newDistances = [
        Math.sqrt((polygon.points[1].x - polygon.points[0].x) ** 2 + (polygon.points[1].y - polygon.points[0].y) ** 2),
        Math.sqrt((polygon.points[2].x - polygon.points[1].x) ** 2 + (polygon.points[2].y - polygon.points[1].y) ** 2),
        Math.sqrt((polygon.points[0].x - polygon.points[2].x) ** 2 + (polygon.points[0].y - polygon.points[2].y) ** 2)
      ];

      expectClose(newDistances[0], originalDistances[0]);
      expectClose(newDistances[1], originalDistances[1]);
      expectClose(newDistances[2], originalDistances[2]);
    });
  });

  describe('Polyline', () => {
    it('should move all points by delta', () => {
      const polyline = createTestPolyline({
        points: [
          { x: 0, y: 0 },
          { x: 50, y: 50 },
          { x: 100, y: 0 }
        ]
      });

      polyline.move(10, 20);

      expectClose(polyline.points[0].x, 10);
      expectClose(polyline.points[0].y, 20);
      expectClose(polyline.points[1].x, 60);
      expectClose(polyline.points[1].y, 70);
      expectClose(polyline.points[2].x, 110);
      expectClose(polyline.points[2].y, 20);
    });
  });

  describe('Path', () => {
    it('should move all path commands by delta', () => {
      const path = createTestPath({
        commands: [
          { type: 'M', x: 0, y: 0 },
          { type: 'L', x: 100, y: 100 }
        ]
      });

      path.move(25, 35);

      expect(path.commands[0].type).toBe('M');
      expectClose((path.commands[0] as any).x, 25);
      expectClose((path.commands[0] as any).y, 35);
      expect(path.commands[1].type).toBe('L');
      expectClose((path.commands[1] as any).x, 125);
      expectClose((path.commands[1] as any).y, 135);
    });

    it('should move bezier control points by delta', () => {
      const path = createTestPath({
        commands: [
          { type: 'M', x: 0, y: 0 },
          { type: 'C', cp1x: 10, cp1y: 20, cp2x: 30, cp2y: 40, x: 50, y: 50 }
        ]
      });

      path.move(5, 10);

      const cubicCmd = path.commands[1] as any;
      expectClose(cubicCmd.cp1x, 15);
      expectClose(cubicCmd.cp1y, 30);
      expectClose(cubicCmd.cp2x, 35);
      expectClose(cubicCmd.cp2y, 50);
      expectClose(cubicCmd.x, 55);
      expectClose(cubicCmd.y, 60);
    });
  });

  describe('Text', () => {
    it('should move text position by delta', () => {
      const text = createTestText({ x: 100, y: 100 });

      text.move(20, 30);

      expectClose(text.x, 120);
      expectClose(text.y, 130);
    });

    it('should preserve text content after move', () => {
      const text = createTestText({ x: 100, y: 100, content: 'Hello World' });

      text.move(20, 30);

      expect(text.content).toBe('Hello World');
    });
  });

  describe('Node', () => {
    it('should move node center by delta', () => {
      const node = createTestNode({ cx: 100, cy: 100, rx: 30, ry: 30 });

      node.move(25, 35);

      expectClose(node.cx, 125);
      expectClose(node.cy, 135);
    });

    it('should preserve node size after move', () => {
      const node = createTestNode({ cx: 100, cy: 100, rx: 40, ry: 30 });

      node.move(25, 35);

      expect(node.rx).toBe(40);
      expect(node.ry).toBe(30);
    });

    it('should preserve label after move', () => {
      const node = createTestNode({ cx: 100, cy: 100, label: 'TestNode' });

      node.move(25, 35);

      expect(node.label).toBe('TestNode');
    });
  });

  describe('Image', () => {
    it('should move image position by delta', () => {
      const image = createTestImage({ x: 100, y: 100, width: 200, height: 150 });

      image.move(30, 40);

      expectClose(image.x, 130);
      expectClose(image.y, 140);
    });

    it('should preserve image dimensions after move', () => {
      const image = createTestImage({ x: 100, y: 100, width: 200, height: 150 });

      image.move(30, 40);

      expect(image.width).toBe(200);
      expect(image.height).toBe(150);
    });
  });

  describe('Group', () => {
    it('should move all children by delta', () => {
      const rect = createTestRectangle({ id: 'rect', x: 10, y: 10, width: 50, height: 30 });
      const ellipse = createTestEllipse({ id: 'ellipse', cx: 100, cy: 100, rx: 20, ry: 20 });
      const group = createTestGroup([rect, ellipse]);

      group.move(15, 25);

      expectClose(rect.x, 25);
      expectClose(rect.y, 35);
      expectClose(ellipse.cx, 115);
      expectClose(ellipse.cy, 125);
    });

    it('should move nested groups', () => {
      const innerRect = createTestRectangle({ id: 'innerRect', x: 0, y: 0, width: 20, height: 20 });
      const innerGroup = createTestGroup([innerRect], { id: 'innerGroup' });
      const outerRect = createTestRectangle({ id: 'outerRect', x: 50, y: 50, width: 30, height: 30 });
      const outerGroup = createTestGroup([innerGroup, outerRect], { id: 'outerGroup' });

      outerGroup.move(10, 20);

      expectClose(innerRect.x, 10);
      expectClose(innerRect.y, 20);
      expectClose(outerRect.x, 60);
      expectClose(outerRect.y, 70);
    });
  });

  describe('cumulative moves', () => {
    it('should accumulate multiple moves correctly', () => {
      const rect = createTestRectangle({ x: 0, y: 0 });

      rect.move(10, 20);
      rect.move(30, 40);
      rect.move(-5, -15);

      expectClose(rect.x, 35);  // 0 + 10 + 30 - 5
      expectClose(rect.y, 45);  // 0 + 20 + 40 - 15
    });
  });
});
