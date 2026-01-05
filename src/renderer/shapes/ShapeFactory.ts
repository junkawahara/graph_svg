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
import { Group } from './Group';

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
        { ...data.style },
        // New properties with defaults for backward compatibility
        data.textAnchor || 'start',
        data.fontStyle || 'normal',
        data.textUnderline || false,
        data.textStrikethrough || false,
        data.lineHeight || 1.2
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

    case 'group':
      // Recursively create child shapes
      const children = data.children
        .map(childData => createShapeFromData(childData, offsetX, offsetY))
        .filter((child): child is Shape => child !== null);

      if (children.length === 0) {
        return null;
      }

      return new Group(newId, children, { ...data.style });

    default:
      console.warn('Unknown shape type:', (data as any).type);
      return null;
  }
}
