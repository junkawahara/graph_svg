import { expect } from 'vitest';
import { Shape } from '../../src/renderer/shapes/Shape';
import { Line } from '../../src/renderer/shapes/Line';
import { Rectangle } from '../../src/renderer/shapes/Rectangle';
import { Ellipse } from '../../src/renderer/shapes/Ellipse';
import { Text } from '../../src/renderer/shapes/Text';
import { Polygon } from '../../src/renderer/shapes/Polygon';
import { Polyline } from '../../src/renderer/shapes/Polyline';
import { Path } from '../../src/renderer/shapes/Path';
import { Image } from '../../src/renderer/shapes/Image';
import { Node } from '../../src/renderer/shapes/Node';
import { Edge } from '../../src/renderer/shapes/Edge';
import { Group } from '../../src/renderer/shapes/Group';
import { ShapeStyle, Point, PathCommand } from '../../src/shared/types';

/**
 * Compare two numbers with 3 decimal precision tolerance
 */
export function expectClose(actual: number, expected: number, decimals: number = 3): void {
  expect(actual).toBeCloseTo(expected, decimals);
}

/**
 * Compare two ShapeStyle objects
 */
export function expectStyleEqual(actual: ShapeStyle, expected: ShapeStyle): void {
  expect(actual.fillNone).toBe(expected.fillNone);
  // Only compare fill color if fillNone is false
  if (!expected.fillNone) {
    expect(actual.fill).toBe(expected.fill);
  }
  expect(actual.stroke).toBe(expected.stroke);
  expectClose(actual.strokeWidth, expected.strokeWidth);
  expectClose(actual.opacity, expected.opacity);
  expect(actual.strokeDasharray).toBe(expected.strokeDasharray);
  expect(actual.strokeLinecap).toBe(expected.strokeLinecap);
}

/**
 * Compare two Point arrays
 */
export function expectPointsEqual(actual: Point[], expected: Point[]): void {
  expect(actual.length).toBe(expected.length);
  for (let i = 0; i < expected.length; i++) {
    expectClose(actual[i].x, expected[i].x);
    expectClose(actual[i].y, expected[i].y);
  }
}

/**
 * Compare two PathCommand arrays
 */
export function expectPathCommandsEqual(actual: PathCommand[], expected: PathCommand[]): void {
  expect(actual.length).toBe(expected.length);
  for (let i = 0; i < expected.length; i++) {
    expect(actual[i].type).toBe(expected[i].type);

    const a = actual[i];
    const e = expected[i];

    if (a.type === 'M' || a.type === 'L') {
      if (e.type === 'M' || e.type === 'L') {
        expectClose(a.x, e.x);
        expectClose(a.y, e.y);
      }
    } else if (a.type === 'C') {
      if (e.type === 'C') {
        expectClose(a.cp1x, e.cp1x);
        expectClose(a.cp1y, e.cp1y);
        expectClose(a.cp2x, e.cp2x);
        expectClose(a.cp2y, e.cp2y);
        expectClose(a.x, e.x);
        expectClose(a.y, e.y);
      }
    } else if (a.type === 'Q') {
      if (e.type === 'Q') {
        expectClose(a.cpx, e.cpx);
        expectClose(a.cpy, e.cpy);
        expectClose(a.x, e.x);
        expectClose(a.y, e.y);
      }
    } else if (a.type === 'A') {
      if (e.type === 'A') {
        expectClose(a.rx, e.rx);
        expectClose(a.ry, e.ry);
        expectClose(a.xAxisRotation, e.xAxisRotation);
        expect(a.largeArcFlag).toBe(e.largeArcFlag);
        expect(a.sweepFlag).toBe(e.sweepFlag);
        expectClose(a.x, e.x);
        expectClose(a.y, e.y);
      }
    }
    // 'Z' has no additional properties
  }
}

/**
 * Compare Line shapes
 */
export function expectLineEqual(actual: Line, expected: Line): void {
  expect(actual.type).toBe('line');
  expectClose(actual.x1, expected.x1);
  expectClose(actual.y1, expected.y1);
  expectClose(actual.x2, expected.x2);
  expectClose(actual.y2, expected.y2);
  expect(actual.markerStart).toBe(expected.markerStart);
  expect(actual.markerEnd).toBe(expected.markerEnd);
  expectClose(actual.rotation, expected.rotation);
  expectStyleEqual(actual.style, expected.style);
}

/**
 * Compare Rectangle shapes
 */
export function expectRectangleEqual(actual: Rectangle, expected: Rectangle): void {
  expect(actual.type).toBe('rectangle');
  expectClose(actual.x, expected.x);
  expectClose(actual.y, expected.y);
  expectClose(actual.width, expected.width);
  expectClose(actual.height, expected.height);
  expectClose(actual.rotation, expected.rotation);
  expectStyleEqual(actual.style, expected.style);
}

/**
 * Compare Ellipse shapes
 */
export function expectEllipseEqual(actual: Ellipse, expected: Ellipse): void {
  expect(actual.type).toBe('ellipse');
  expectClose(actual.cx, expected.cx);
  expectClose(actual.cy, expected.cy);
  expectClose(actual.rx, expected.rx);
  expectClose(actual.ry, expected.ry);
  expectClose(actual.rotation, expected.rotation);
  expectStyleEqual(actual.style, expected.style);
}

/**
 * Compare Text shapes
 */
export function expectTextEqual(actual: Text, expected: Text): void {
  expect(actual.type).toBe('text');
  expectClose(actual.x, expected.x);
  expectClose(actual.y, expected.y);
  expect(actual.content).toBe(expected.content);
  expectClose(actual.fontSize, expected.fontSize);
  expect(actual.fontFamily).toBe(expected.fontFamily);
  expect(actual.fontWeight).toBe(expected.fontWeight);
  expect(actual.fontStyle).toBe(expected.fontStyle);
  expect(actual.textAnchor).toBe(expected.textAnchor);
  expect(actual.dominantBaseline).toBe(expected.dominantBaseline);
  expect(actual.textUnderline).toBe(expected.textUnderline);
  expect(actual.textStrikethrough).toBe(expected.textStrikethrough);
  expectClose(actual.rotation, expected.rotation);
  expectStyleEqual(actual.style, expected.style);
}

/**
 * Compare Polygon shapes
 */
export function expectPolygonEqual(actual: Polygon, expected: Polygon): void {
  expect(actual.type).toBe('polygon');
  expectPointsEqual(actual.points, expected.points);
  expectClose(actual.rotation, expected.rotation);
  expectStyleEqual(actual.style, expected.style);
}

/**
 * Compare Polyline shapes
 */
export function expectPolylineEqual(actual: Polyline, expected: Polyline): void {
  expect(actual.type).toBe('polyline');
  expectPointsEqual(actual.points, expected.points);
  expectClose(actual.rotation, expected.rotation);
  expectStyleEqual(actual.style, expected.style);
}

/**
 * Compare Path shapes
 */
export function expectPathEqual(actual: Path, expected: Path): void {
  expect(actual.type).toBe('path');
  expectPathCommandsEqual(actual.commands, expected.commands);
  expect(actual.markerStart).toBe(expected.markerStart);
  expect(actual.markerEnd).toBe(expected.markerEnd);
  expectClose(actual.rotation, expected.rotation);
  expectStyleEqual(actual.style, expected.style);
}

/**
 * Compare Image shapes
 */
export function expectImageEqual(actual: Image, expected: Image): void {
  expect(actual.type).toBe('image');
  expectClose(actual.x, expected.x);
  expectClose(actual.y, expected.y);
  expectClose(actual.width, expected.width);
  expectClose(actual.height, expected.height);
  expect(actual.href).toBe(expected.href);
  expect(actual.preserveAspectRatio).toBe(expected.preserveAspectRatio);
  expectClose(actual.rotation, expected.rotation);
}

/**
 * Compare Node shapes
 */
export function expectNodeEqual(actual: Node, expected: Node): void {
  expect(actual.type).toBe('node');
  expectClose(actual.cx, expected.cx);
  expectClose(actual.cy, expected.cy);
  expectClose(actual.rx, expected.rx);
  expectClose(actual.ry, expected.ry);
  expect(actual.label).toBe(expected.label);
  expectClose(actual.fontSize, expected.fontSize);
  expect(actual.fontFamily).toBe(expected.fontFamily);
  expectStyleEqual(actual.style, expected.style);
}

/**
 * Compare Edge shapes (without node references validation)
 */
export function expectEdgeEqual(actual: Edge, expected: Edge): void {
  expect(actual.type).toBe('edge');
  expect(actual.sourceNodeId).toBe(expected.sourceNodeId);
  expect(actual.targetNodeId).toBe(expected.targetNodeId);
  expect(actual.direction).toBe(expected.direction);
  expectClose(actual.curveOffset, expected.curveOffset);
  expect(actual.isSelfLoop).toBe(expected.isSelfLoop);
  if (expected.isSelfLoop) {
    expectClose(actual.selfLoopAngle, expected.selfLoopAngle);
  }
  expect(actual.label).toBe(expected.label);
  expectStyleEqual(actual.style, expected.style);
}

/**
 * Compare Group shapes (recursive)
 */
export function expectGroupEqual(actual: Group, expected: Group): void {
  expect(actual.type).toBe('group');
  const actualChildren = actual.getChildren();
  const expectedChildren = expected.getChildren();
  expect(actualChildren.length).toBe(expectedChildren.length);

  for (let i = 0; i < expectedChildren.length; i++) {
    expectShapeEqual(actualChildren[i], expectedChildren[i]);
  }
}

/**
 * Generic shape comparison dispatcher
 */
export function expectShapeEqual(actual: Shape, expected: Shape): void {
  expect(actual.type).toBe(expected.type);

  switch (expected.type) {
    case 'line':
      expectLineEqual(actual as Line, expected as Line);
      break;
    case 'rectangle':
      expectRectangleEqual(actual as Rectangle, expected as Rectangle);
      break;
    case 'ellipse':
      expectEllipseEqual(actual as Ellipse, expected as Ellipse);
      break;
    case 'text':
      expectTextEqual(actual as Text, expected as Text);
      break;
    case 'polygon':
      expectPolygonEqual(actual as Polygon, expected as Polygon);
      break;
    case 'polyline':
      expectPolylineEqual(actual as Polyline, expected as Polyline);
      break;
    case 'path':
      expectPathEqual(actual as Path, expected as Path);
      break;
    case 'image':
      expectImageEqual(actual as Image, expected as Image);
      break;
    case 'node':
      expectNodeEqual(actual as Node, expected as Node);
      break;
    case 'edge':
      expectEdgeEqual(actual as Edge, expected as Edge);
      break;
    case 'group':
      expectGroupEqual(actual as Group, expected as Group);
      break;
    default:
      throw new Error(`Unknown shape type: ${expected.type}`);
  }
}
