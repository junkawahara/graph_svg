import { ShapeStyle, DEFAULT_STYLE, PathCommand, Point } from '../../src/shared/types';
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
import { Shape } from '../../src/renderer/shapes/Shape';
import { FileManager } from '../../src/renderer/core/FileManager';

/**
 * Create a test style with optional overrides
 */
export function createTestStyle(overrides: Partial<ShapeStyle> = {}): ShapeStyle {
  return {
    ...DEFAULT_STYLE,
    ...overrides
  };
}

/**
 * Create a test Line
 */
export function createTestLine(overrides: {
  id?: string;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  markerStart?: string;
  markerEnd?: string;
  style?: ShapeStyle;
  rotation?: number;
} = {}): Line {
  return new Line(
    overrides.id ?? 'test-line-1',
    overrides.x1 ?? 10,
    overrides.y1 ?? 20,
    overrides.x2 ?? 100,
    overrides.y2 ?? 80,
    (overrides.markerStart ?? 'none') as any,
    (overrides.markerEnd ?? 'none') as any,
    overrides.style ?? createTestStyle(),
    overrides.rotation ?? 0
  );
}

/**
 * Create a test Rectangle
 */
export function createTestRectangle(overrides: {
  id?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  style?: ShapeStyle;
  rotation?: number;
} = {}): Rectangle {
  return new Rectangle(
    overrides.id ?? 'test-rect-1',
    overrides.x ?? 50,
    overrides.y ?? 50,
    overrides.width ?? 100,
    overrides.height ?? 60,
    overrides.style ?? createTestStyle(),
    overrides.rotation ?? 0
  );
}

/**
 * Create a test Ellipse
 */
export function createTestEllipse(overrides: {
  id?: string;
  cx?: number;
  cy?: number;
  rx?: number;
  ry?: number;
  style?: ShapeStyle;
  rotation?: number;
} = {}): Ellipse {
  return new Ellipse(
    overrides.id ?? 'test-ellipse-1',
    overrides.cx ?? 100,
    overrides.cy ?? 100,
    overrides.rx ?? 50,
    overrides.ry ?? 30,
    overrides.style ?? createTestStyle(),
    overrides.rotation ?? 0
  );
}

/**
 * Create a test Text
 */
export function createTestText(overrides: {
  id?: string;
  content?: string;
  x?: number;
  y?: number;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
  textAnchor?: 'start' | 'middle' | 'end';
  dominantBaseline?: string;
  textUnderline?: boolean;
  textStrikethrough?: boolean;
  lineHeight?: number;
  style?: ShapeStyle;
  rotation?: number;
} = {}): Text {
  // Text constructor: id, x, y, content, fontSize, fontFamily, fontWeight, style, textAnchor, dominantBaseline, fontStyle, textUnderline, textStrikethrough, lineHeight, rotation
  return new Text(
    overrides.id ?? 'test-text-1',
    overrides.x ?? 100,
    overrides.y ?? 100,
    overrides.content ?? 'Test Text',
    overrides.fontSize ?? 16,
    overrides.fontFamily ?? 'Arial',
    overrides.fontWeight ?? 'normal',
    overrides.style ?? createTestStyle({ fill: '#000000', strokeWidth: 0 }),
    overrides.textAnchor ?? 'start',
    (overrides.dominantBaseline ?? 'auto') as any,
    overrides.fontStyle ?? 'normal',
    overrides.textUnderline ?? false,
    overrides.textStrikethrough ?? false,
    overrides.lineHeight ?? 1.2,
    overrides.rotation ?? 0
  );
}

/**
 * Create a test Polygon
 */
export function createTestPolygon(overrides: {
  id?: string;
  points?: Point[];
  style?: ShapeStyle;
  rotation?: number;
} = {}): Polygon {
  const defaultPoints: Point[] = [
    { x: 100, y: 50 },
    { x: 150, y: 100 },
    { x: 100, y: 150 },
    { x: 50, y: 100 }
  ];
  return new Polygon(
    overrides.id ?? 'test-polygon-1',
    overrides.points ?? defaultPoints,
    overrides.style ?? createTestStyle(),
    overrides.rotation ?? 0
  );
}

/**
 * Create a test Polyline
 */
export function createTestPolyline(overrides: {
  id?: string;
  points?: Point[];
  style?: ShapeStyle;
  rotation?: number;
} = {}): Polyline {
  const defaultPoints: Point[] = [
    { x: 10, y: 10 },
    { x: 50, y: 30 },
    { x: 90, y: 10 },
    { x: 130, y: 30 }
  ];
  return new Polyline(
    overrides.id ?? 'test-polyline-1',
    overrides.points ?? defaultPoints,
    overrides.style ?? createTestStyle({ fillNone: true }),
    overrides.rotation ?? 0
  );
}

/**
 * Create a test Path
 */
export function createTestPath(overrides: {
  id?: string;
  commands?: PathCommand[];
  markerStart?: string;
  markerEnd?: string;
  style?: ShapeStyle;
  rotation?: number;
} = {}): Path {
  const defaultCommands: PathCommand[] = [
    { type: 'M', x: 10, y: 10 },
    { type: 'L', x: 50, y: 50 },
    { type: 'L', x: 90, y: 10 }
  ];
  return new Path(
    overrides.id ?? 'test-path-1',
    overrides.commands ?? defaultCommands,
    overrides.style ?? createTestStyle({ fillNone: true }),
    (overrides.markerStart ?? 'none') as any,
    (overrides.markerEnd ?? 'none') as any,
    overrides.rotation ?? 0
  );
}

/**
 * Create a test Image
 */
export function createTestImage(overrides: {
  id?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  href?: string;
  preserveAspectRatio?: string;
  style?: ShapeStyle;
  rotation?: number;
} = {}): Image {
  return new Image(
    overrides.id ?? 'test-image-1',
    overrides.x ?? 50,
    overrides.y ?? 50,
    overrides.width ?? 100,
    overrides.height ?? 100,
    overrides.href ?? 'data:image/png;base64,iVBORw0KGgo=',
    overrides.preserveAspectRatio ?? 'xMidYMid meet',
    overrides.style ?? createTestStyle(),
    overrides.rotation ?? 0
  );
}

/**
 * Create a test Node (for graph)
 */
export function createTestNode(overrides: {
  id?: string;
  cx?: number;
  cy?: number;
  rx?: number;
  ry?: number;
  label?: string;
  fontSize?: number;
  fontFamily?: string;
  style?: ShapeStyle;
} = {}): Node {
  return new Node(
    overrides.id ?? 'test-node-1',
    overrides.cx ?? 100,
    overrides.cy ?? 100,
    overrides.rx ?? 30,
    overrides.ry ?? 30,
    overrides.label ?? 'A',
    overrides.fontSize ?? 14,
    overrides.fontFamily ?? 'Arial',
    overrides.style ?? createTestStyle()
  );
}

/**
 * Create a test Edge (for graph)
 */
export function createTestEdge(
  sourceNodeId: string,
  targetNodeId: string,
  overrides: {
    id?: string;
    direction?: 'none' | 'forward' | 'backward';
    curveOffset?: number;
    isSelfLoop?: boolean;
    selfLoopAngle?: number;
    label?: string;
    style?: ShapeStyle;
    lineType?: 'straight' | 'curve' | 'path';
    curveAmount?: number;
    pathCommands?: PathCommand[];
  } = {}
): Edge {
  // Edge constructor: id, sourceNodeId, targetNodeId, direction, curveOffset, isSelfLoop, selfLoopAngle, style, label, lineType, curveAmount, pathCommands
  return new Edge(
    overrides.id ?? 'test-edge-1',
    sourceNodeId,
    targetNodeId,
    overrides.direction ?? 'none',
    overrides.curveOffset ?? 0,
    overrides.isSelfLoop ?? sourceNodeId === targetNodeId,
    overrides.selfLoopAngle ?? 0,
    overrides.style ?? createTestStyle({ fillNone: true }),
    overrides.label,
    overrides.lineType ?? 'straight',
    overrides.curveAmount ?? 0,
    overrides.pathCommands ?? []
  );
}

/**
 * Create a test Group
 */
export function createTestGroup(
  children: Shape[],
  overrides: {
    id?: string;
    style?: ShapeStyle;
  } = {}
): Group {
  return new Group(
    overrides.id ?? 'test-group-1',
    children,
    overrides.style ?? createTestStyle()
  );
}

/**
 * Perform a round-trip test: serialize and parse
 */
export function roundTrip(
  shapes: Shape[],
  canvasWidth: number = 800,
  canvasHeight: number = 600
): { shapes: Shape[]; canvasSize: { width: number; height: number } } {
  const svgString = FileManager.serialize(shapes, canvasWidth, canvasHeight);
  return FileManager.parse(svgString);
}
