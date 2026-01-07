/**
 * Tool types available in the editor
 */
export type ToolType = 'select' | 'line' | 'ellipse' | 'rectangle' | 'text' | 'pan'
  | 'node' | 'edge' | 'delete-node' | 'delete-edge' | 'polygon' | 'polyline' | 'path' | 'rotate';

/**
 * Shape types that can be created
 */
export type ShapeType = 'line' | 'ellipse' | 'rectangle' | 'text' | 'node' | 'edge' | 'polygon' | 'polyline' | 'group' | 'path';

/**
 * Edge direction for graph edges
 */
export type EdgeDirection = 'none' | 'forward' | 'backward';

/**
 * Text anchor for horizontal alignment
 */
export type TextAnchor = 'start' | 'middle' | 'end';

/**
 * 2D point coordinate
 */
export interface Point {
  x: number;
  y: number;
}

/**
 * Bounding box rectangle
 */
export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Canvas size
 */
export interface CanvasSize {
  width: number;
  height: number;
}

/**
 * Default canvas size
 */
export const DEFAULT_CANVAS_SIZE: CanvasSize = {
  width: 800,
  height: 600
};

/**
 * Line cap style
 */
export type StrokeLinecap = 'butt' | 'round' | 'square';

/**
 * Marker/arrow types for line endpoints
 */
export type MarkerType = 'none' | 'triangle' | 'triangle-open' | 'circle' | 'diamond';

/**
 * Style properties for shapes
 */
export interface ShapeStyle {
  fill: string;
  fillNone: boolean;
  stroke: string;
  strokeWidth: number;
  opacity: number;
  strokeDasharray: string;
  strokeLinecap: StrokeLinecap;
}

/**
 * Default style for new shapes
 */
export const DEFAULT_STYLE: ShapeStyle = {
  fill: '#ffffff',
  fillNone: false,
  stroke: '#000000',
  strokeWidth: 2,
  opacity: 1,
  strokeDasharray: '',
  strokeLinecap: 'butt'
};

/**
 * Base shape data for serialization
 */
export interface BaseShapeData {
  id: string;
  type: ShapeType;
  style: ShapeStyle;
  rotation?: number;  // Rotation angle in degrees (0-360)
}

/**
 * Line shape data
 */
export interface LineData extends BaseShapeData {
  type: 'line';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  markerStart: MarkerType;
  markerEnd: MarkerType;
}

/**
 * Ellipse shape data
 */
export interface EllipseData extends BaseShapeData {
  type: 'ellipse';
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

/**
 * Rectangle shape data
 */
export interface RectangleData extends BaseShapeData {
  type: 'rectangle';
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Text shape data
 */
export interface TextData extends BaseShapeData {
  type: 'text';
  content: string;
  x: number;
  y: number;
  fontSize: number;
  fontFamily: string;
  fontWeight: 'normal' | 'bold';
  textAnchor: TextAnchor;
  fontStyle: 'normal' | 'italic';
  textUnderline: boolean;
  textStrikethrough: boolean;
  lineHeight: number;
}

/**
 * Graph node data
 */
export interface NodeData extends BaseShapeData {
  type: 'node';
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  label: string;
  fontSize: number;
  fontFamily: string;
}

/**
 * Graph edge data
 */
export interface EdgeData extends BaseShapeData {
  type: 'edge';
  sourceNodeId: string;
  targetNodeId: string;
  direction: EdgeDirection;
  curveOffset: number;
  isSelfLoop: boolean;
  selfLoopAngle: number;
}

/**
 * Polygon shape data
 */
export interface PolygonData extends BaseShapeData {
  type: 'polygon';
  points: Point[];
}

/**
 * Polyline shape data
 */
export interface PolylineData extends BaseShapeData {
  type: 'polyline';
  points: Point[];
}

/**
 * SVG Path command types (normalized to absolute coordinates)
 */
export type PathCommand =
  | { type: 'M'; x: number; y: number }
  | { type: 'L'; x: number; y: number }
  | { type: 'C'; cp1x: number; cp1y: number; cp2x: number; cp2y: number; x: number; y: number }
  | { type: 'Q'; cpx: number; cpy: number; x: number; y: number }
  | { type: 'Z' };

/**
 * Path shape data (standard SVG path)
 */
export interface PathData extends BaseShapeData {
  type: 'path';
  commands: PathCommand[];
}

/**
 * Group shape data (contains other shapes)
 */
export interface GroupData {
  id: string;
  type: 'group';
  style: ShapeStyle;
  children: ShapeData[];
  rotation?: number;  // Rotation angle in degrees (0-360)
}

/**
 * Union type for all shape data
 */
export type ShapeData = LineData | EllipseData | RectangleData | TextData | NodeData | EdgeData | PolygonData | PolylineData | PathData | GroupData;

/**
 * Event names used in EventBus
 */
export type EventName =
  | 'tool:changed'
  | 'style:changed'
  | 'shape:added'
  | 'shape:removed'
  | 'shape:updated'
  | 'shapes:delete'
  | 'shapes:paste'
  | 'shapes:zorder'
  | 'selection:changed'
  | 'history:changed'
  | 'canvas:render'
  | 'canvas:zoomChanged'
  | 'canvas:zoomReset'
  | 'canvas:mouseMove'
  | 'canvas:sizeChanged'
  | 'snap:changed'
  | 'grid:sizeChanged'
  | 'edge:added'
  | 'node:delete'
  | 'edge:delete'
  | 'edgeDirection:changed'
  | 'graph:nodeAdded'
  | 'graph:nodeRemoved'
  | 'graph:edgeAdded'
  | 'graph:edgeRemoved'
  | 'graph:edgeDirectionChanged'
  | 'graph:autoLayout'
  | 'shapes:group'
  | 'shapes:ungroup'
  | 'file:new'
  | 'file:save'
  | 'file:saveAs'
  | 'file:open'
  | 'file:exportFitToContent'
  | 'file:dirtyChanged'
  | 'canvas:fitToContent'
  | 'app:beforeClose';

/**
 * Generate unique ID
 */
export function generateId(): string {
  return `shape-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
