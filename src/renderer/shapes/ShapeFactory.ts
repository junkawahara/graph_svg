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
import { Path } from './Path';
import { Image } from './Image';
import { Group } from './Group';

/**
 * Create a shape from serialized data
 */
export function createShapeFromData(data: ShapeData, offsetX: number = 0, offsetY: number = 0): Shape | null {
  const newId = generateId();

  switch (data.type) {
    case 'line': {
      const line = new Line(
        newId,
        data.x1 + offsetX,
        data.y1 + offsetY,
        data.x2 + offsetX,
        data.y2 + offsetY,
        data.markerStart || 'none',
        data.markerEnd || 'none',
        { ...data.style },
        data.rotation || 0
      );
      line.className = data.className;
      return line;
    }

    case 'ellipse': {
      const ellipse = new Ellipse(
        newId,
        data.cx + offsetX,
        data.cy + offsetY,
        data.rx,
        data.ry,
        { ...data.style },
        data.rotation || 0
      );
      ellipse.className = data.className;
      return ellipse;
    }

    case 'rectangle': {
      const rectangle = new Rectangle(
        newId,
        data.x + offsetX,
        data.y + offsetY,
        data.width,
        data.height,
        { ...data.style },
        data.rotation || 0
      );
      rectangle.className = data.className;
      return rectangle;
    }

    case 'text': {
      const text = new Text(
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
        data.dominantBaseline || 'auto',
        data.fontStyle || 'normal',
        data.textUnderline || false,
        data.textStrikethrough || false,
        data.lineHeight || 1.2,
        data.rotation || 0
      );
      text.className = data.className;
      return text;
    }

    case 'node': {
      const node = new Node(
        newId,
        data.cx + offsetX,
        data.cy + offsetY,
        data.rx,
        data.ry,
        data.label,
        data.fontSize,
        data.fontFamily,
        { ...data.style },
        data.rotation || 0
      );
      node.className = data.className;
      return node;
    }

    case 'edge': {
      // Edge doesn't support rotation
      const edge = new Edge(
        newId,
        data.sourceNodeId,
        data.targetNodeId,
        data.direction,
        data.curveOffset,
        data.isSelfLoop,
        data.selfLoopAngle,
        { ...data.style }
      );
      edge.className = data.className;
      return edge;
    }

    case 'polygon': {
      const polygon = new Polygon(
        newId,
        data.points.map(p => ({ x: p.x + offsetX, y: p.y + offsetY })),
        { ...data.style },
        data.rotation || 0
      );
      polygon.className = data.className;
      return polygon;
    }

    case 'polyline': {
      const polyline = new Polyline(
        newId,
        data.points.map(p => ({ x: p.x + offsetX, y: p.y + offsetY })),
        { ...data.style },
        data.rotation || 0
      );
      polyline.className = data.className;
      return polyline;
    }

    case 'path': {
      // Apply offset to all command coordinates
      const offsetCommands = data.commands.map(cmd => {
        switch (cmd.type) {
          case 'M':
          case 'L':
            return { ...cmd, x: cmd.x + offsetX, y: cmd.y + offsetY };
          case 'C':
            return {
              ...cmd,
              cp1x: cmd.cp1x + offsetX,
              cp1y: cmd.cp1y + offsetY,
              cp2x: cmd.cp2x + offsetX,
              cp2y: cmd.cp2y + offsetY,
              x: cmd.x + offsetX,
              y: cmd.y + offsetY
            };
          case 'Q':
            return {
              ...cmd,
              cpx: cmd.cpx + offsetX,
              cpy: cmd.cpy + offsetY,
              x: cmd.x + offsetX,
              y: cmd.y + offsetY
            };
          case 'A':
            return {
              ...cmd,
              x: cmd.x + offsetX,
              y: cmd.y + offsetY
            };
          case 'Z':
            return { ...cmd };
        }
      });
      const path = new Path(newId, offsetCommands, { ...data.style }, data.rotation || 0);
      path.className = data.className;
      return path;
    }

    case 'image': {
      const image = new Image(
        newId,
        data.x + offsetX,
        data.y + offsetY,
        data.width,
        data.height,
        data.href,
        data.preserveAspectRatio,
        { ...data.style },
        data.rotation || 0
      );
      image.className = data.className;
      return image;
    }

    case 'group': {
      // Recursively create child shapes
      const children = data.children
        .map(childData => createShapeFromData(childData, offsetX, offsetY))
        .filter((child): child is Shape => child !== null);

      if (children.length === 0) {
        return null;
      }

      const group = new Group(newId, children, { ...data.style }, data.rotation || 0);
      group.className = data.className;
      return group;
    }

    default:
      console.warn('Unknown shape type:', (data as any).type);
      return null;
  }
}
