import { describe, it, expect, beforeEach } from 'vitest';
import { Line } from '../../../src/renderer/shapes/Line';
import { Rectangle } from '../../../src/renderer/shapes/Rectangle';
import { Ellipse } from '../../../src/renderer/shapes/Ellipse';
import { Polygon } from '../../../src/renderer/shapes/Polygon';
import { Polyline } from '../../../src/renderer/shapes/Polyline';
import { Text } from '../../../src/renderer/shapes/Text';
import { Path } from '../../../src/renderer/shapes/Path';
import { Group } from '../../../src/renderer/shapes/Group';
import { PathCommand } from '../../../src/shared/types';
import { createTestStyle } from '../../utils/mock-factories';

describe('Shape.applyTransform', () => {
  const defaultStyle = createTestStyle();

  describe('Line', () => {
    let line: Line;

    beforeEach(() => {
      line = new Line('line-1', 100, 100, 200, 200, 'none', 'none', defaultStyle);
    });

    it('should apply translate transform', () => {
      line.applyTransform(50, 30, 1, 1);
      expect(line.x1).toBe(150);
      expect(line.y1).toBe(130);
      expect(line.x2).toBe(250);
      expect(line.y2).toBe(230);
    });

    it('should apply scale transform', () => {
      line.applyTransform(0, 0, 2, 2);
      expect(line.x1).toBe(200);
      expect(line.y1).toBe(200);
      expect(line.x2).toBe(400);
      expect(line.y2).toBe(400);
    });

    it('should apply combined translate and scale', () => {
      // First scale by 2, then translate by 50
      line.applyTransform(50, 50, 2, 2);
      expect(line.x1).toBe(250); // 100 * 2 + 50
      expect(line.y1).toBe(250);
      expect(line.x2).toBe(450); // 200 * 2 + 50
      expect(line.y2).toBe(450);
    });

    it('should round values to 3 decimal places', () => {
      line = new Line('line-2', 100.1234, 100.5678, 200.9999, 200.0001, 'none', 'none', defaultStyle);
      line.applyTransform(0.1111, 0.2222, 1, 1);
      // 100.1234 + 0.1111 = 100.2345 -> rounded to 100.235
      expect(line.x1).toBe(100.235);
      // 100.5678 + 0.2222 = 100.79 -> rounded to 100.79
      expect(line.y1).toBe(100.79);
      // 200.9999 + 0.1111 = 201.111 -> rounded to 201.111
      expect(line.x2).toBe(201.111);
      // 200.0001 + 0.2222 = 200.2223 -> rounded to 200.222
      expect(line.y2).toBe(200.222);
    });

    it('should handle negative scale (flip)', () => {
      line.applyTransform(0, 0, -1, -1);
      expect(line.x1).toBe(-100);
      expect(line.y1).toBe(-100);
      expect(line.x2).toBe(-200);
      expect(line.y2).toBe(-200);
    });

    describe('move()', () => {
      it('should move line by delta', () => {
        line.move(10, 20);
        expect(line.x1).toBe(110);
        expect(line.y1).toBe(120);
        expect(line.x2).toBe(210);
        expect(line.y2).toBe(220);
      });

      it('should round moved values to 3 decimal places', () => {
        line.move(10.1234567, 20.9876543);
        expect(line.x1).toBe(110.123);
        expect(line.y1).toBe(120.988);
      });
    });

    describe('applySkew()', () => {
      it('should apply skewX transform', () => {
        // At 45 degrees, tan(45) = 1, so x += y
        line = new Line('line-3', 0, 100, 0, 200, 'none', 'none', defaultStyle);
        line.applySkew(45, 0);
        expect(line.x1).toBe(100);  // 0 + 100 * 1
        expect(line.x2).toBe(200);  // 0 + 200 * 1
      });

      it('should apply skewY transform', () => {
        line = new Line('line-4', 100, 0, 200, 0, 'none', 'none', defaultStyle);
        line.applySkew(0, 45);
        expect(line.y1).toBe(100);  // 0 + 100 * 1
        expect(line.y2).toBe(200);  // 0 + 200 * 1
      });
    });
  });

  describe('Rectangle', () => {
    let rect: Rectangle;

    beforeEach(() => {
      rect = new Rectangle('rect-1', 100, 100, 50, 30, defaultStyle);
    });

    it('should apply translate transform', () => {
      rect.applyTransform(20, 30, 1, 1);
      expect(rect.x).toBe(120);
      expect(rect.y).toBe(130);
      expect(rect.width).toBe(50);
      expect(rect.height).toBe(30);
    });

    it('should apply scale transform', () => {
      rect.applyTransform(0, 0, 2, 2);
      expect(rect.x).toBe(200);
      expect(rect.y).toBe(200);
      expect(rect.width).toBe(100);
      expect(rect.height).toBe(60);
    });

    it('should handle negative scale (flip) in X', () => {
      rect.applyTransform(0, 0, -1, 1);
      expect(rect.x).toBe(-150); // -100 - 50
      expect(rect.y).toBe(100);
      expect(rect.width).toBe(50);
      expect(rect.height).toBe(30);
    });

    it('should handle negative scale (flip) in Y', () => {
      rect.applyTransform(0, 0, 1, -1);
      expect(rect.x).toBe(100);
      expect(rect.y).toBe(-130); // -100 - 30
      expect(rect.width).toBe(50);
      expect(rect.height).toBe(30);
    });

    it('should handle negative scale (flip) in both axes', () => {
      rect.applyTransform(0, 0, -1, -1);
      expect(rect.x).toBe(-150);
      expect(rect.y).toBe(-130);
      expect(rect.width).toBe(50);
      expect(rect.height).toBe(30);
    });

    it('should use absolute scale for width/height', () => {
      rect.applyTransform(0, 0, -2, -3);
      expect(rect.width).toBe(100); // 50 * |-2|
      expect(rect.height).toBe(90); // 30 * |-3|
    });

    describe('move()', () => {
      it('should move rectangle by delta', () => {
        rect.move(15, 25);
        expect(rect.x).toBe(115);
        expect(rect.y).toBe(125);
        expect(rect.width).toBe(50);
        expect(rect.height).toBe(30);
      });
    });
  });

  describe('Ellipse', () => {
    let ellipse: Ellipse;

    beforeEach(() => {
      ellipse = new Ellipse('ellipse-1', 100, 100, 50, 30, defaultStyle);
    });

    it('should apply translate transform', () => {
      ellipse.applyTransform(20, 30, 1, 1);
      expect(ellipse.cx).toBe(120);
      expect(ellipse.cy).toBe(130);
      expect(ellipse.rx).toBe(50);
      expect(ellipse.ry).toBe(30);
    });

    it('should apply scale transform', () => {
      ellipse.applyTransform(0, 0, 2, 2);
      expect(ellipse.cx).toBe(200);
      expect(ellipse.cy).toBe(200);
      expect(ellipse.rx).toBe(100);
      expect(ellipse.ry).toBe(60);
    });

    it('should use absolute scale for radii', () => {
      ellipse.applyTransform(0, 0, -2, -3);
      expect(ellipse.rx).toBe(100); // 50 * |-2|
      expect(ellipse.ry).toBe(90);  // 30 * |-3|
    });

    describe('move()', () => {
      it('should move ellipse by delta', () => {
        ellipse.move(10, 20);
        expect(ellipse.cx).toBe(110);
        expect(ellipse.cy).toBe(120);
      });
    });
  });

  describe('Polygon', () => {
    let polygon: Polygon;

    beforeEach(() => {
      polygon = new Polygon('polygon-1', [
        { x: 100, y: 100 },
        { x: 200, y: 100 },
        { x: 150, y: 200 }
      ], defaultStyle);
    });

    it('should apply translate transform to all points', () => {
      polygon.applyTransform(50, 30, 1, 1);
      expect(polygon.points[0]).toEqual({ x: 150, y: 130 });
      expect(polygon.points[1]).toEqual({ x: 250, y: 130 });
      expect(polygon.points[2]).toEqual({ x: 200, y: 230 });
    });

    it('should apply scale transform to all points', () => {
      polygon.applyTransform(0, 0, 2, 2);
      expect(polygon.points[0]).toEqual({ x: 200, y: 200 });
      expect(polygon.points[1]).toEqual({ x: 400, y: 200 });
      expect(polygon.points[2]).toEqual({ x: 300, y: 400 });
    });

    it('should apply combined transform', () => {
      polygon.applyTransform(10, 20, 2, 0.5);
      expect(polygon.points[0]).toEqual({ x: 210, y: 70 }); // 100*2+10, 100*0.5+20
      expect(polygon.points[1]).toEqual({ x: 410, y: 70 }); // 200*2+10, 100*0.5+20
      expect(polygon.points[2]).toEqual({ x: 310, y: 120 }); // 150*2+10, 200*0.5+20
    });

    describe('move()', () => {
      it('should move all points by delta', () => {
        polygon.move(5, 10);
        expect(polygon.points[0]).toEqual({ x: 105, y: 110 });
        expect(polygon.points[1]).toEqual({ x: 205, y: 110 });
        expect(polygon.points[2]).toEqual({ x: 155, y: 210 });
      });
    });

    describe('applySkew()', () => {
      it('should apply skew to all points', () => {
        polygon = new Polygon('polygon-2', [
          { x: 0, y: 100 },
          { x: 100, y: 100 },
          { x: 50, y: 0 }
        ], defaultStyle);
        polygon.applySkew(45, 0); // tan(45) = 1
        expect(polygon.points[0].x).toBe(100);  // 0 + 100*1
        expect(polygon.points[1].x).toBe(200);  // 100 + 100*1
        expect(polygon.points[2].x).toBe(50);   // 50 + 0*1
      });
    });

    describe('setVertex()', () => {
      it('should update a specific vertex', () => {
        polygon.setVertex(1, { x: 250, y: 150 });
        expect(polygon.points[1]).toEqual({ x: 250, y: 150 });
      });

      it('should round vertex coordinates', () => {
        polygon.setVertex(0, { x: 100.12345, y: 100.98765 });
        expect(polygon.points[0]).toEqual({ x: 100.123, y: 100.988 });
      });
    });
  });

  describe('Polyline', () => {
    let polyline: Polyline;

    beforeEach(() => {
      polyline = new Polyline('polyline-1', [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 }
      ], 'none', 'none', defaultStyle);
    });

    it('should apply transform to all points', () => {
      polyline.applyTransform(10, 20, 2, 3);
      expect(polyline.points[0]).toEqual({ x: 10, y: 20 });
      expect(polyline.points[1]).toEqual({ x: 210, y: 20 });
      expect(polyline.points[2]).toEqual({ x: 210, y: 320 });
    });
  });

  describe('Text', () => {
    let text: Text;

    beforeEach(() => {
      text = new Text('text-1', 100, 100, 'Hello', 24, 'Arial', 'normal', defaultStyle);
    });

    it('should apply translate transform', () => {
      text.applyTransform(50, 30, 1, 1);
      expect(text.x).toBe(150);
      expect(text.y).toBe(130);
      expect(text.fontSize).toBe(24); // unchanged when scale is 1
    });

    it('should apply scale transform and scale font size', () => {
      text.applyTransform(0, 0, 2, 2);
      expect(text.x).toBe(200);
      expect(text.y).toBe(200);
      expect(text.fontSize).toBe(48); // 24 * 2
    });

    it('should scale font size by average of scaleX and scaleY', () => {
      text.applyTransform(0, 0, 2, 4);
      expect(text.fontSize).toBe(72); // 24 * (2+4)/2 = 24 * 3
    });

    it('should use absolute values for font size scaling', () => {
      text.applyTransform(0, 0, -2, -2);
      expect(text.fontSize).toBe(48); // 24 * (|-2|+|-2|)/2
    });

    describe('move()', () => {
      it('should move text by delta', () => {
        text.move(10, 20);
        expect(text.x).toBe(110);
        expect(text.y).toBe(120);
      });
    });
  });

  describe('Path', () => {
    describe('with M and L commands', () => {
      let path: Path;

      beforeEach(() => {
        path = new Path('path-1', [
          { type: 'M', x: 100, y: 100 },
          { type: 'L', x: 200, y: 100 },
          { type: 'L', x: 200, y: 200 },
          { type: 'Z' }
        ], defaultStyle);
      });

      it('should apply translate transform', () => {
        path.applyTransform(50, 30, 1, 1);
        expect(path.commands[0]).toMatchObject({ x: 150, y: 130 });
        expect(path.commands[1]).toMatchObject({ x: 250, y: 130 });
        expect(path.commands[2]).toMatchObject({ x: 250, y: 230 });
      });

      it('should apply scale transform', () => {
        path.applyTransform(0, 0, 2, 2);
        expect(path.commands[0]).toMatchObject({ x: 200, y: 200 });
        expect(path.commands[1]).toMatchObject({ x: 400, y: 200 });
        expect(path.commands[2]).toMatchObject({ x: 400, y: 400 });
      });
    });

    describe('with C (cubic bezier) commands', () => {
      let path: Path;

      beforeEach(() => {
        path = new Path('path-2', [
          { type: 'M', x: 100, y: 100 },
          { type: 'C', cp1x: 150, cp1y: 50, cp2x: 200, cp2y: 50, x: 250, y: 100 }
        ], defaultStyle);
      });

      it('should transform all points including control points', () => {
        path.applyTransform(10, 20, 2, 2);
        expect(path.commands[0]).toMatchObject({ x: 210, y: 220 });
        const cubic = path.commands[1] as any;
        expect(cubic.cp1x).toBe(310);
        expect(cubic.cp1y).toBe(120);
        expect(cubic.cp2x).toBe(410);
        expect(cubic.cp2y).toBe(120);
        expect(cubic.x).toBe(510);
        expect(cubic.y).toBe(220);
      });
    });

    describe('with Q (quadratic bezier) commands', () => {
      let path: Path;

      beforeEach(() => {
        path = new Path('path-3', [
          { type: 'M', x: 100, y: 100 },
          { type: 'Q', cpx: 150, cpy: 50, x: 200, y: 100 }
        ], defaultStyle);
      });

      it('should transform all points including control point', () => {
        path.applyTransform(0, 0, 2, 2);
        const quad = path.commands[1] as any;
        expect(quad.cpx).toBe(300);
        expect(quad.cpy).toBe(100);
        expect(quad.x).toBe(400);
        expect(quad.y).toBe(200);
      });
    });

    describe('with A (arc) commands', () => {
      let path: Path;

      beforeEach(() => {
        path = new Path('path-4', [
          { type: 'M', x: 100, y: 100 },
          { type: 'A', rx: 50, ry: 30, xAxisRotation: 0, largeArcFlag: false, sweepFlag: true, x: 200, y: 100 }
        ], defaultStyle);
      });

      it('should scale radii and endpoint', () => {
        path.applyTransform(0, 0, 2, 2);
        const arc = path.commands[1] as any;
        expect(arc.rx).toBe(100);  // 50 * 2
        expect(arc.ry).toBe(60);   // 30 * 2
        expect(arc.x).toBe(400);
        expect(arc.y).toBe(200);
      });

      it('should use absolute values for radii with negative scale', () => {
        path.applyTransform(0, 0, -2, -2);
        const arc = path.commands[1] as any;
        expect(arc.rx).toBe(100);  // 50 * |-2|
        expect(arc.ry).toBe(60);   // 30 * |-2|
      });
    });

    describe('move()', () => {
      it('should move all anchor points', () => {
        const path = new Path('path-5', [
          { type: 'M', x: 100, y: 100 },
          { type: 'C', cp1x: 150, cp1y: 50, cp2x: 200, cp2y: 50, x: 250, y: 100 }
        ], defaultStyle);
        path.move(10, 20);
        expect(path.commands[0]).toMatchObject({ x: 110, y: 120 });
        const cubic = path.commands[1] as any;
        expect(cubic.cp1x).toBe(160);
        expect(cubic.cp1y).toBe(70);
        expect(cubic.cp2x).toBe(210);
        expect(cubic.cp2y).toBe(70);
        expect(cubic.x).toBe(260);
        expect(cubic.y).toBe(120);
      });
    });

    describe('applySkew()', () => {
      it('should skew M and L commands', () => {
        const path = new Path('path-6', [
          { type: 'M', x: 0, y: 100 },
          { type: 'L', x: 100, y: 100 }
        ], defaultStyle);
        path.applySkew(45, 0);
        expect(path.commands[0]).toMatchObject({ x: 100, y: 100 });
        expect(path.commands[1]).toMatchObject({ x: 200, y: 100 });
      });

      it('should skew control points in C commands', () => {
        const path = new Path('path-7', [
          { type: 'M', x: 0, y: 0 },
          { type: 'C', cp1x: 0, cp1y: 50, cp2x: 100, cp2y: 50, x: 100, y: 0 }
        ], defaultStyle);
        path.applySkew(45, 0);
        const cubic = path.commands[1] as any;
        expect(cubic.cp1x).toBe(50);  // 0 + 50*1
        expect(cubic.cp2x).toBe(150); // 100 + 50*1
      });
    });
  });

  describe('Group', () => {
    let rect: Rectangle;
    let ellipse: Ellipse;
    let group: Group;

    beforeEach(() => {
      rect = new Rectangle('rect-1', 100, 100, 50, 30, defaultStyle);
      ellipse = new Ellipse('ellipse-1', 200, 200, 20, 20, defaultStyle);
      group = new Group('group-1', [rect, ellipse], defaultStyle);
    });

    it('should apply transform recursively to all children', () => {
      group.applyTransform(10, 20, 2, 2);

      // Rectangle
      expect(rect.x).toBe(210);  // 100*2 + 10
      expect(rect.y).toBe(220);  // 100*2 + 20
      expect(rect.width).toBe(100); // 50*2
      expect(rect.height).toBe(60); // 30*2

      // Ellipse
      expect(ellipse.cx).toBe(410);  // 200*2 + 10
      expect(ellipse.cy).toBe(420);  // 200*2 + 20
      expect(ellipse.rx).toBe(40);   // 20*2
      expect(ellipse.ry).toBe(40);   // 20*2
    });

    describe('nested groups', () => {
      it('should apply transform to nested groups', () => {
        const innerRect = new Rectangle('inner-rect', 50, 50, 20, 20, defaultStyle);
        const innerGroup = new Group('inner-group', [innerRect], defaultStyle);
        const outerGroup = new Group('outer-group', [innerGroup], defaultStyle);

        outerGroup.applyTransform(0, 0, 2, 2);

        expect(innerRect.x).toBe(100);
        expect(innerRect.y).toBe(100);
        expect(innerRect.width).toBe(40);
        expect(innerRect.height).toBe(40);
      });
    });

    describe('move()', () => {
      it('should move all children', () => {
        group.move(10, 20);
        expect(rect.x).toBe(110);
        expect(rect.y).toBe(120);
        expect(ellipse.cx).toBe(210);
        expect(ellipse.cy).toBe(220);
      });
    });

    describe('scale()', () => {
      it('should scale children from origin', () => {
        const origin = { x: 100, y: 100 };
        group.scale(2, 2, origin);

        // Rectangle bounds: x=100, y=100, width=50, height=30
        // newX = 100 + (100 - 100) * 2 = 100
        // dx = 100 - 100 = 0, so rect.x stays at 100
        // Size doubles: width=100, height=60
        expect(rect.x).toBe(100);
        expect(rect.y).toBe(100);
        expect(rect.width).toBe(100);
        expect(rect.height).toBe(60);

        // Ellipse bounds: x=180 (cx-rx), y=180 (cy-ry), width=40, height=40
        // newX = 100 + (180 - 100) * 2 = 100 + 160 = 260
        // dx = 260 - 180 = 80, so ellipse.cx = 200 + 80 = 280
        expect(ellipse.cx).toBe(280);
        expect(ellipse.cy).toBe(280);
        expect(ellipse.rx).toBe(40);
        expect(ellipse.ry).toBe(40);
      });

      it('should scale positions only when positionOnly is true', () => {
        const origin = { x: 100, y: 100 };
        group.scale(2, 2, origin, true);

        // Rectangle position scales, but size stays the same
        expect(rect.x).toBe(100);
        expect(rect.y).toBe(100);
        expect(rect.width).toBe(50); // unchanged
        expect(rect.height).toBe(30); // unchanged

        // Ellipse position scales (using bounds.x = 180), but size stays the same
        // dx = 260 - 180 = 80, so ellipse.cx = 200 + 80 = 280
        expect(ellipse.cx).toBe(280);
        expect(ellipse.cy).toBe(280);
        expect(ellipse.rx).toBe(20); // unchanged
        expect(ellipse.ry).toBe(20); // unchanged
      });
    });

    describe('applySkew()', () => {
      it('should apply skew to children that support it', () => {
        const line = new Line('line-1', 0, 100, 100, 100, 'none', 'none', defaultStyle);
        const skewGroup = new Group('skew-group', [line], defaultStyle);

        skewGroup.applySkew(45, 0);

        expect(line.x1).toBe(100);  // 0 + 100*1
        expect(line.x2).toBe(200);  // 100 + 100*1
      });
    });
  });

  describe('Edge cases', () => {
    it('should handle zero scale', () => {
      const rect = new Rectangle('rect-zero', 100, 100, 50, 30, defaultStyle);
      rect.applyTransform(0, 0, 0, 0);
      expect(rect.x).toBe(0);
      expect(rect.y).toBe(0);
      expect(rect.width).toBe(0);
      expect(rect.height).toBe(0);
    });

    it('should handle very small scale', () => {
      const rect = new Rectangle('rect-small', 1000, 1000, 100, 100, defaultStyle);
      rect.applyTransform(0, 0, 0.001, 0.001);
      expect(rect.x).toBe(1);
      expect(rect.y).toBe(1);
      expect(rect.width).toBe(0.1);
      expect(rect.height).toBe(0.1);
    });

    it('should handle very large scale', () => {
      const rect = new Rectangle('rect-large', 1, 1, 1, 1, defaultStyle);
      rect.applyTransform(0, 0, 1000, 1000);
      expect(rect.x).toBe(1000);
      expect(rect.y).toBe(1000);
      expect(rect.width).toBe(1000);
      expect(rect.height).toBe(1000);
    });

    it('should handle non-uniform scale', () => {
      const ellipse = new Ellipse('ellipse-nonuniform', 100, 100, 50, 50, defaultStyle);
      ellipse.applyTransform(0, 0, 2, 0.5);
      expect(ellipse.cx).toBe(200);
      expect(ellipse.cy).toBe(50);
      expect(ellipse.rx).toBe(100);
      expect(ellipse.ry).toBe(25);
    });

    it('should handle empty polygon', () => {
      const polygon = new Polygon('poly-empty', [], defaultStyle);
      polygon.applyTransform(10, 20, 2, 2);
      expect(polygon.points).toEqual([]);
    });

    it('should handle path with only M command', () => {
      const path = new Path('path-m-only', [
        { type: 'M', x: 100, y: 100 }
      ], defaultStyle);
      path.applyTransform(10, 20, 2, 2);
      expect(path.commands[0]).toMatchObject({ x: 210, y: 220 });
    });
  });
});
