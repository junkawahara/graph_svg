import { describe, it, expect } from 'vitest';
import { Group } from '../../../src/renderer/shapes/Group';
import { Line } from '../../../src/renderer/shapes/Line';
import { Rectangle } from '../../../src/renderer/shapes/Rectangle';
import { Ellipse } from '../../../src/renderer/shapes/Ellipse';
import { Text } from '../../../src/renderer/shapes/Text';
import { Polygon } from '../../../src/renderer/shapes/Polygon';
import {
  createTestLine,
  createTestRectangle,
  createTestEllipse,
  createTestText,
  createTestPolygon,
  createTestGroup,
  roundTrip
} from '../../utils/mock-factories';
import {
  expectGroupEqual,
  expectLineEqual,
  expectRectangleEqual,
  expectEllipseEqual,
  expectClose
} from '../../utils/shape-comparators';

describe('Group Round-Trip', () => {
  describe('Basic Group', () => {
    it('should preserve group with two rectangles', () => {
      const rect1 = createTestRectangle({ id: 'rect-1', x: 10, y: 10, width: 50, height: 30 });
      const rect2 = createTestRectangle({ id: 'rect-2', x: 70, y: 10, width: 50, height: 30 });
      const group = createTestGroup([rect1, rect2], { id: 'group-1' });

      const { shapes } = roundTrip([group]);

      expect(shapes).toHaveLength(1);
      const restored = shapes[0] as Group;
      expect(restored.type).toBe('group');

      const children = restored.getChildren();
      expect(children).toHaveLength(2);
      expect(children[0].type).toBe('rectangle');
      expect(children[1].type).toBe('rectangle');
    });

    it('should preserve group with different shape types', () => {
      const line = createTestLine({ id: 'line-1' });
      const rect = createTestRectangle({ id: 'rect-1' });
      const ellipse = createTestEllipse({ id: 'ellipse-1' });
      const group = createTestGroup([line, rect, ellipse], { id: 'group-1' });

      const { shapes } = roundTrip([group]);

      expect(shapes).toHaveLength(1);
      const restored = shapes[0] as Group;

      const children = restored.getChildren();
      expect(children).toHaveLength(3);

      const types = children.map(c => c.type).sort();
      expect(types).toEqual(['ellipse', 'line', 'rectangle']);
    });

    it('should preserve group with text', () => {
      const text = createTestText({ id: 'text-1', content: 'Hello', x: 50, y: 50 });
      const rect = createTestRectangle({ id: 'rect-1', x: 40, y: 30, width: 100, height: 40 });
      const group = createTestGroup([rect, text], { id: 'group-1' });

      const { shapes } = roundTrip([group]);

      expect(shapes).toHaveLength(1);
      const restored = shapes[0] as Group;

      const children = restored.getChildren();
      expect(children).toHaveLength(2);

      const textChild = children.find(c => c.type === 'text') as Text;
      expect(textChild).toBeDefined();
      expect(textChild.content).toBe('Hello');
    });

    it('should preserve group with polygon', () => {
      const polygon = createTestPolygon({
        id: 'polygon-1',
        points: [
          { x: 50, y: 0 },
          { x: 100, y: 86.6 },
          { x: 0, y: 86.6 }
        ]
      });
      const group = createTestGroup([polygon], { id: 'group-1' });

      const { shapes } = roundTrip([group]);

      expect(shapes).toHaveLength(1);
      const restored = shapes[0] as Group;

      const children = restored.getChildren();
      expect(children).toHaveLength(1);
      expect(children[0].type).toBe('polygon');

      const restoredPolygon = children[0] as Polygon;
      expect(restoredPolygon.points).toHaveLength(3);
    });
  });

  describe('Nested Groups', () => {
    it('should preserve single nested group', () => {
      const rect1 = createTestRectangle({ id: 'rect-1', x: 10, y: 10 });
      const rect2 = createTestRectangle({ id: 'rect-2', x: 70, y: 10 });
      const innerGroup = createTestGroup([rect1, rect2], { id: 'inner-group' });
      const outerGroup = createTestGroup([innerGroup], { id: 'outer-group' });

      const { shapes } = roundTrip([outerGroup]);

      expect(shapes).toHaveLength(1);
      const restored = shapes[0] as Group;
      expect(restored.type).toBe('group');

      const outerChildren = restored.getChildren();
      expect(outerChildren).toHaveLength(1);
      expect(outerChildren[0].type).toBe('group');

      const innerChildren = (outerChildren[0] as Group).getChildren();
      expect(innerChildren).toHaveLength(2);
    });

    it('should preserve deeply nested groups (3 levels)', () => {
      const line = createTestLine({ id: 'line-1' });
      const level3 = createTestGroup([line], { id: 'level-3' });
      const level2 = createTestGroup([level3], { id: 'level-2' });
      const level1 = createTestGroup([level2], { id: 'level-1' });

      const { shapes } = roundTrip([level1]);

      expect(shapes).toHaveLength(1);

      let current: Group = shapes[0] as Group;
      expect(current.type).toBe('group');

      current = current.getChildren()[0] as Group;
      expect(current.type).toBe('group');

      current = current.getChildren()[0] as Group;
      expect(current.type).toBe('group');

      const deepLine = current.getChildren()[0];
      expect(deepLine.type).toBe('line');
    });

    it('should preserve mixed nested and non-nested children', () => {
      const rect1 = createTestRectangle({ id: 'rect-1', x: 10, y: 10 });
      const rect2 = createTestRectangle({ id: 'rect-2', x: 70, y: 10 });
      const innerGroup = createTestGroup([rect1], { id: 'inner-group' });
      const outerGroup = createTestGroup([innerGroup, rect2], { id: 'outer-group' });

      const { shapes } = roundTrip([outerGroup]);

      expect(shapes).toHaveLength(1);
      const restored = shapes[0] as Group;

      const children = restored.getChildren();
      expect(children).toHaveLength(2);

      // One should be a group, one should be a rectangle
      const types = children.map(c => c.type).sort();
      expect(types).toEqual(['group', 'rectangle']);
    });
  });

  describe('Multiple Top-Level Groups', () => {
    it('should preserve multiple independent groups', () => {
      const rect1 = createTestRectangle({ id: 'rect-1', x: 10, y: 10 });
      const rect2 = createTestRectangle({ id: 'rect-2', x: 70, y: 10 });
      const group1 = createTestGroup([rect1], { id: 'group-1' });
      const group2 = createTestGroup([rect2], { id: 'group-2' });

      const { shapes } = roundTrip([group1, group2]);

      expect(shapes).toHaveLength(2);
      expect(shapes[0].type).toBe('group');
      expect(shapes[1].type).toBe('group');
    });

    it('should preserve groups and standalone shapes', () => {
      const rect1 = createTestRectangle({ id: 'rect-1', x: 10, y: 10 });
      const rect2 = createTestRectangle({ id: 'rect-2', x: 70, y: 10 });
      const standaloneRect = createTestRectangle({ id: 'rect-3', x: 130, y: 10 });
      const group = createTestGroup([rect1, rect2], { id: 'group-1' });

      const { shapes } = roundTrip([group, standaloneRect]);

      expect(shapes).toHaveLength(2);

      const groupShape = shapes.find(s => s.type === 'group') as Group;
      const rectShape = shapes.find(s => s.type === 'rectangle');

      expect(groupShape).toBeDefined();
      expect(rectShape).toBeDefined();

      expect(groupShape.getChildren()).toHaveLength(2);
    });
  });

  describe('Group Child Properties', () => {
    it('should preserve child coordinates', () => {
      const rect = createTestRectangle({
        id: 'rect-1',
        x: 123.456,
        y: 78.901,
        width: 200,
        height: 150
      });
      const group = createTestGroup([rect], { id: 'group-1' });

      const { shapes } = roundTrip([group]);

      const restored = shapes[0] as Group;
      const restoredRect = restored.getChildren()[0] as Rectangle;

      expectClose(restoredRect.x, 123.456);
      expectClose(restoredRect.y, 78.901);
      expectClose(restoredRect.width, 200);
      expectClose(restoredRect.height, 150);
    });

    it('should preserve child line endpoints', () => {
      const line = createTestLine({
        id: 'line-1',
        x1: 10.5,
        y1: 20.5,
        x2: 100.5,
        y2: 80.5
      });
      const group = createTestGroup([line], { id: 'group-1' });

      const { shapes } = roundTrip([group]);

      const restored = shapes[0] as Group;
      const restoredLine = restored.getChildren()[0] as Line;

      expectClose(restoredLine.x1, 10.5);
      expectClose(restoredLine.y1, 20.5);
      expectClose(restoredLine.x2, 100.5);
      expectClose(restoredLine.y2, 80.5);
    });

    it('should preserve child ellipse properties', () => {
      const ellipse = createTestEllipse({
        id: 'ellipse-1',
        cx: 150,
        cy: 100,
        rx: 75,
        ry: 50
      });
      const group = createTestGroup([ellipse], { id: 'group-1' });

      const { shapes } = roundTrip([group]);

      const restored = shapes[0] as Group;
      const restoredEllipse = restored.getChildren()[0] as Ellipse;

      expectClose(restoredEllipse.cx, 150);
      expectClose(restoredEllipse.cy, 100);
      expectClose(restoredEllipse.rx, 75);
      expectClose(restoredEllipse.ry, 50);
    });
  });

  describe('Complex Group Scenarios', () => {
    it('should preserve group with many children', () => {
      const children = [];
      for (let i = 0; i < 10; i++) {
        children.push(createTestRectangle({
          id: `rect-${i}`,
          x: i * 60,
          y: 10,
          width: 50,
          height: 30
        }));
      }
      const group = createTestGroup(children, { id: 'big-group' });

      const { shapes } = roundTrip([group]);

      expect(shapes).toHaveLength(1);
      const restored = shapes[0] as Group;
      expect(restored.getChildren()).toHaveLength(10);
    });

    it('should preserve group with single child', () => {
      const rect = createTestRectangle({ id: 'single-rect' });
      const group = createTestGroup([rect], { id: 'single-child-group' });

      const { shapes } = roundTrip([group]);

      expect(shapes).toHaveLength(1);
      const restored = shapes[0] as Group;
      expect(restored.getChildren()).toHaveLength(1);
    });
  });
});
