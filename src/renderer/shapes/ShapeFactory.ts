import { ShapeData, generateId } from '../../shared/types';
import { Shape } from './Shape';
import { Line } from './Line';
import { Ellipse } from './Ellipse';
import { Rectangle } from './Rectangle';
import { Text } from './Text';
import { Node } from './Node';
import { Edge } from './Edge';
import { Polygon } from './Polygon';
import { Polyline } from './Polyline';

/**
 * Create a shape from serialized data
 */
export function createShapeFromData(data: ShapeData, offsetX: number = 0, offsetY: number = 0): Shape | null {
  const newId = generateId();

  switch (data.type) {
    case 'line':
      return new Line(
        newId,
        data.x1 + offsetX,
        data.y1 + offsetY,
        data.x2 + offsetX,
        data.y2 + offsetY,
        data.markerStart || 'none',
        data.markerEnd || 'none',
        { ...data.style }
      );

    case 'ellipse':
      return new Ellipse(
        newId,
        data.cx + offsetX,
        data.cy + offsetY,
        data.rx,
        data.ry,
        { ...data.style }
      );

    case 'rectangle':
      return new Rectangle(
        newId,
        data.x + offsetX,
        data.y + offsetY,
        data.width,
        data.height,
        { ...data.style }
      );

    case 'text':
      return new Text(
        newId,
        data.x + offsetX,
        data.y + offsetY,
        data.content,
        data.fontSize,
        data.fontFamily,
        data.fontWeight,
        { ...data.style }
      );

    case 'node':
      return new Node(
        newId,
        data.cx + offsetX,
        data.cy + offsetY,
        data.rx,
        data.ry,
        data.label,
        data.fontSize,
        data.fontFamily,
        { ...data.style }
      );

    case 'edge':
      return new Edge(
        newId,
        data.sourceNodeId,
        data.targetNodeId,
        data.direction,
        data.curveOffset,
        data.isSelfLoop,
        data.selfLoopAngle,
        { ...data.style }
      );

    case 'polygon':
      return new Polygon(
        newId,
        data.points.map(p => ({ x: p.x + offsetX, y: p.y + offsetY })),
        { ...data.style }
      );

    case 'polyline':
      return new Polyline(
        newId,
        data.points.map(p => ({ x: p.x + offsetX, y: p.y + offsetY })),
        { ...data.style }
      );

    default:
      console.warn('Unknown shape type:', (data as any).type);
      return null;
  }
}
