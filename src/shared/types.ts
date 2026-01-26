/**
 * Tool types available in the editor
 */
export type ToolType = 'select' | 'line' | 'ellipse' | 'rectangle' | 'text' | 'pan' | 'zoom'
  | 'node' | 'edge' | 'delete-node' | 'delete-edge' | 'polygon' | 'polyline' | 'path' | 'rotate'
  | 'add-path-point' | 'delete-path-point';

/**
 * Shape types that can be created
 */
export type ShapeType = 'line' | 'ellipse' | 'rectangle' | 'text' | 'node' | 'edge' | 'polygon' | 'polyline' | 'group' | 'path' | 'image';

/**
 * Edge direction for graph edges
 */
export type EdgeDirection = 'none' | 'forward' | 'backward';

/**
 * Edge line type for graph edges
 * - straight: Direct line between nodes (default for first edge)
 * - curve: Curved line with adjustable curve amount (default for parallel edges)
 * - path: Custom SVG path with editable control points
 */
export type EdgeLineType = 'straight' | 'curve' | 'path';

/**
 * Text anchor for horizontal alignment
 */
export type TextAnchor = 'start' | 'middle' | 'end';

/**
 * SVG dominant-baseline values
 */
export type DominantBaseline = 'auto' | 'hanging' | 'middle' | 'central' | 'text-bottom' | 'text-top' | 'alphabetic';

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
 * Marker/arrow types for line and path endpoints
 * Format: {shape}-{size} where shape is arrow/triangle/circle/diamond and size is small/medium/large
 */
export type MarkerType = 'none'
  | 'arrow-small' | 'arrow-medium' | 'arrow-large'
  | 'triangle-small' | 'triangle-medium' | 'triangle-large'
  | 'circle-small' | 'circle-medium' | 'circle-large'
  | 'diamond-small' | 'diamond-medium' | 'diamond-large';

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
 * Style class definition for CSS-based styling
 */
export interface StyleClass {
  id: string;
  name: string;        // CSS class name (without dot, e.g., "thick-blue")
  style: ShapeStyle;
  isBuiltin: boolean;
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
  className?: string; // Applied CSS class name
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
 * Baseline shift for superscript/subscript
 */
export type BaselineShift = 'super' | 'sub' | 'baseline';

/**
 * Partial style that can be applied to a text run (portion of text)
 * undefined means inherit from parent Text element
 */
export interface TextRunStyle {
  fontWeight?: 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
  textUnderline?: boolean;
  textStrikethrough?: boolean;
  fill?: string;           // Text color (overrides parent fill)
  fontSize?: number;       // Font size (absolute value or percentage of parent)
  baselineShift?: BaselineShift;  // Superscript/subscript
}

/**
 * A styled text fragment within a Text element
 */
export interface TextRun {
  text: string;
  style?: TextRunStyle;    // undefined = inherit parent style
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
  dominantBaseline: DominantBaseline;
  fontStyle: 'normal' | 'italic';
  textUnderline: boolean;
  textStrikethrough: boolean;
  lineHeight: number;
  runs?: TextRun[][];      // Rich text: array of lines, each line is array of runs. undefined = plain text
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
  labelPlacement?: NodeLabelPlacement;
}

/**
 * Graph edge data
 */
export interface EdgeData extends BaseShapeData {
  type: 'edge';
  sourceNodeId: string;
  targetNodeId: string;
  direction: EdgeDirection;
  curveOffset: number;           // Auto-calculated offset for parallel edges between same nodes
  isSelfLoop: boolean;
  selfLoopAngle: number;
  label?: string;
  lineType: EdgeLineType;        // Line type (straight/curve/path)
  curveAmount?: number;          // Curve amount for 'curve' type (-100 to 100)
  pathCommands?: PathCommand[];  // Path commands for 'path' type
  sourceConnectionAngle?: number | null;  // Manual source connection angle (null = auto)
  targetConnectionAngle?: number | null;  // Manual target connection angle (null = auto)
  labelPlacement?: EdgeLabelPlacement;
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
  | { type: 'A'; rx: number; ry: number; xAxisRotation: number; largeArcFlag: boolean; sweepFlag: boolean; x: number; y: number }
  | { type: 'Z' };

/**
 * Path shape data (standard SVG path)
 */
export interface PathData extends BaseShapeData {
  type: 'path';
  commands: PathCommand[];
  markerStart: MarkerType;
  markerEnd: MarkerType;
}

/**
 * Image shape data
 */
export interface ImageData extends BaseShapeData {
  type: 'image';
  x: number;
  y: number;
  width: number;
  height: number;
  href: string;  // URL or data URI (base64)
  preserveAspectRatio: string;
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
  className?: string; // Applied CSS class name
}

/**
 * Union type for all shape data
 */
export type ShapeData = LineData | EllipseData | RectangleData | TextData | NodeData | EdgeData | PolygonData | PolylineData | PathData | ImageData | GroupData;

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
  | 'handles:refresh'
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
  | 'edgeLineType:changed'
  | 'edgeCurveAmount:changed'
  | 'graph:nodeAdded'
  | 'graph:nodeRemoved'
  | 'graph:edgeAdded'
  | 'graph:edgeRemoved'
  | 'graph:edgeDirectionChanged'
  | 'graph:autoLayout'
  | 'shapes:group'
  | 'shapes:ungroup'
  | 'shapes:align'
  | 'shapes:distribute'
  | 'file:new'
  | 'file:save'
  | 'file:saveAs'
  | 'file:open'
  | 'file:exportFitToContent'
  | 'file:dirtyChanged'
  | 'canvas:fitToContent'
  | 'app:beforeClose';

/**
 * Node label position options (TikZ-style)
 * - 'auto' = default ('above')
 * - 'center' = inside the ellipse (current behavior)
 * - direction keywords = outside the ellipse
 * - number = angle in degrees (0=right, 90=up, 180=left, 270=down)
 */
export type NodeLabelPosition =
  | 'auto' | 'center'
  | 'above' | 'below' | 'left' | 'right'
  | 'above left' | 'above right' | 'below left' | 'below right'
  | number;

/**
 * Edge label position along the edge (TikZ-style)
 * - 'auto' = default ('midway')
 * - 'midway' = 0.5 (center)
 * - 'near start' = 0.25
 * - 'near end' = 0.75
 * - number = position from 0 (start) to 1 (end)
 */
export type EdgeLabelPos = 'auto' | 'midway' | 'near start' | 'near end' | number;

/**
 * Edge label side (which side of the edge)
 */
export type EdgeLabelSide = 'above' | 'below';

/**
 * Node label placement configuration
 */
export interface NodeLabelPlacement {
  position: NodeLabelPosition;
  distance: number;  // Distance from node boundary (px), default: 5
}

/**
 * Edge label placement configuration
 */
export interface EdgeLabelPlacement {
  pos: EdgeLabelPos;        // Position along edge (0-1)
  side: EdgeLabelSide;      // Above or below the edge
  sloped: boolean;          // Rotate with edge tangent
  distance: number;         // Distance from edge (px), default: 5
}

/**
 * Default node label placement
 */
export const DEFAULT_NODE_LABEL_PLACEMENT: NodeLabelPlacement = {
  position: 'center',
  distance: 5
};

/**
 * Default edge label placement
 */
export const DEFAULT_EDGE_LABEL_PLACEMENT: EdgeLabelPlacement = {
  pos: 'auto',
  side: 'above',
  sloped: false,
  distance: 5
};

/**
 * Generate unique ID
 */
export function generateId(): string {
  return `shape-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
