/**
 * Tool types available in the editor
 */
export type ToolType = 'select' | 'line' | 'ellipse' | 'rectangle' | 'text' | 'pan';

/**
 * Shape types that can be created
 */
export type ShapeType = 'line' | 'ellipse' | 'rectangle' | 'text';

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
}

/**
 * Union type for all shape data
 */
export type ShapeData = LineData | EllipseData | RectangleData | TextData;

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
  | 'snap:changed'
  | 'file:save'
  | 'file:open';

/**
 * Generate unique ID
 */
export function generateId(): string {
  return `shape-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
