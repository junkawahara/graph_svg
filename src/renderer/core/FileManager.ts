import { ShapeStyle, StyleClass, DEFAULT_STYLE, StrokeLinecap, MarkerType, EdgeDirection, CanvasSize, DEFAULT_CANVAS_SIZE, Point } from '../../shared/types';
import { Shape } from '../shapes/Shape';
import { Line } from '../shapes/Line';
import { Ellipse } from '../shapes/Ellipse';
import { Rectangle } from '../shapes/Rectangle';
import { Text } from '../shapes/Text';
import { Node } from '../shapes/Node';
import { Edge } from '../shapes/Edge';
import { Polygon } from '../shapes/Polygon';
import { Polyline } from '../shapes/Polyline';
import { Path } from '../shapes/Path';
import { Image } from '../shapes/Image';
import { Group } from '../shapes/Group';
import { getGraphManager } from './GraphManager';
import { parseTransform, combineTransforms, ParsedTransform, IDENTITY_TRANSFORM, isIdentityTransform, hasRotation, hasSkew } from './TransformParser';
import { serializePath } from './PathParser';
import { styleClassManager } from './StyleClassManager';
import { round3 } from './MathUtils';

// Marker shape definitions for SVG export
interface MarkerShapeDef {
  viewBox: string;
  refX: number;
  refY: number;
  path: string;
  filled: boolean;
  strokeWidth?: number;
}

const MARKER_SHAPES: Record<string, MarkerShapeDef> = {
  arrow: { viewBox: '0 0 12 10', refX: 12, refY: 5, path: 'M 0 1 L 8 5 L 0 9', filled: false, strokeWidth: 1.5 },
  triangle: { viewBox: '0 0 10 10', refX: 9, refY: 5, path: 'M 0 0 L 10 5 L 0 10 Z', filled: true },
  circle: { viewBox: '0 0 10 10', refX: 5, refY: 5, path: 'M 5 0 A 5 5 0 1 1 5 10 A 5 5 0 1 1 5 0 Z', filled: true },
  diamond: { viewBox: '0 0 10 10', refX: 5, refY: 5, path: 'M 5 0 L 10 5 L 5 10 L 0 5 Z', filled: true }
};

// Size multipliers for markers
const MARKER_SIZES: Record<string, number> = {
  small: 3,
  medium: 4,
  large: 6
};

/**
 * Manages file save/load operations for SVG files
 */
export class FileManager {
  /**
   * Serialize shapes to SVG string
   */
  static serialize(shapes: Shape[], width: number, height: number): string {
    const svgLines: string[] = [
      `<?xml version="1.0" encoding="UTF-8"?>`,
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
      `  <!-- Created with DrawSVG -->`
    ];

    // Collect used class names
    const usedClasses = this.collectUsedClasses(shapes);

    // Generate defs section (markers and style classes)
    const hasDefs = usedClasses.size > 0;
    const markerDefs = this.generateMarkerDefs(shapes);

    if (hasDefs || markerDefs) {
      svgLines.push('  <defs>');

      // Add style block for used classes
      if (usedClasses.size > 0) {
        svgLines.push('    <style>');
        usedClasses.forEach(className => {
          const styleClass = styleClassManager.getClass(className);
          if (styleClass) {
            svgLines.push(`      .${className} { ${this.styleToCSS(styleClass.style)} }`);
          }
        });
        svgLines.push('    </style>');
      }

      // Add marker definitions (without outer <defs> wrapper)
      if (markerDefs) {
        // Extract inner content from markerDefs (it already has <defs> wrapper)
        const innerMarkerDefs = markerDefs.replace(/^\s*<defs>\n?/, '').replace(/\n?\s*<\/defs>\s*$/, '');
        svgLines.push(innerMarkerDefs);
      }

      svgLines.push('  </defs>');
    }

    shapes.forEach(shape => {
      svgLines.push(this.shapeToSvgElement(shape));
    });

    svgLines.push('</svg>');
    return svgLines.join('\n');
  }

  /**
   * Collect all used class names from shapes recursively
   */
  private static collectUsedClasses(shapes: Shape[]): Set<string> {
    const usedClasses = new Set<string>();

    const collect = (shapeList: Shape[]) => {
      for (const shape of shapeList) {
        if (shape.className) {
          usedClasses.add(shape.className);
        }
        if (shape instanceof Group) {
          collect(shape.children);
        }
      }
    };

    collect(shapes);
    return usedClasses;
  }

  /**
   * Convert ShapeStyle to CSS string
   */
  private static styleToCSS(style: ShapeStyle): string {
    const props: string[] = [];

    if (style.fillNone) {
      props.push('fill: none');
    } else {
      props.push(`fill: ${style.fill}`);
    }

    if (style.strokeWidth > 0) {
      props.push(`stroke: ${style.stroke}`);
      props.push(`stroke-width: ${style.strokeWidth}`);
      if (style.strokeDasharray) {
        props.push(`stroke-dasharray: ${style.strokeDasharray}`);
      }
      if (style.strokeLinecap !== 'butt') {
        props.push(`stroke-linecap: ${style.strokeLinecap}`);
      }
    } else {
      props.push('stroke: none');
    }

    if (style.opacity !== 1) {
      props.push(`opacity: ${style.opacity}`);
    }

    return props.join('; ');
  }

  /**
   * Generate marker definitions for lines, paths, and edges that use them
   * Markers are color-specific to work correctly in all SVG viewers
   */
  private static generateMarkerDefs(shapes: Shape[]): string | null {
    // Map: "type-color-position" -> { type, color, position }
    const usedMarkers = new Map<string, { type: string; color: string; position: string }>();
    const usedEdgeColors = new Set<string>();

    // Recursively collect markers from shapes
    const collectMarkers = (shapeList: Shape[]) => {
      shapeList.forEach(shape => {
        // Collect markers from Line (with color)
        if (shape instanceof Line) {
          const colorHex = shape.style.stroke.replace('#', '').toLowerCase();
          if (shape.markerStart !== 'none') {
            const key = `${shape.markerStart}-${colorHex}-start`;
            usedMarkers.set(key, { type: shape.markerStart, color: colorHex, position: 'start' });
          }
          if (shape.markerEnd !== 'none') {
            const key = `${shape.markerEnd}-${colorHex}-end`;
            usedMarkers.set(key, { type: shape.markerEnd, color: colorHex, position: 'end' });
          }
        }
        // Collect markers from Path (with color)
        if (shape instanceof Path) {
          const colorHex = shape.style.stroke.replace('#', '').toLowerCase();
          if (shape.markerStart !== 'none') {
            const key = `${shape.markerStart}-${colorHex}-start`;
            usedMarkers.set(key, { type: shape.markerStart, color: colorHex, position: 'start' });
          }
          if (shape.markerEnd !== 'none') {
            const key = `${shape.markerEnd}-${colorHex}-end`;
            usedMarkers.set(key, { type: shape.markerEnd, color: colorHex, position: 'end' });
          }
        }
        // Collect edge arrow colors
        if (shape instanceof Edge) {
          if (shape.direction === 'forward' || shape.direction === 'backward') {
            usedEdgeColors.add(shape.style.stroke.replace('#', '').toLowerCase());
          }
        }
        // Recursively check group children
        if (shape instanceof Group) {
          collectMarkers(shape.children);
        }
      });
    };

    collectMarkers(shapes);

    if (usedMarkers.size === 0 && usedEdgeColors.size === 0) return null;

    const defsLines: string[] = ['  <defs>'];

    // Line/Path markers (color-specific)
    usedMarkers.forEach(({ type, color, position }) => {
      // Parse type: e.g., 'arrow-small' -> shape='arrow', size='small'
      const typeDashIndex = type.lastIndexOf('-');
      const shapeType = type.substring(0, typeDashIndex); // e.g., 'arrow'
      const sizeStr = type.substring(typeDashIndex + 1); // e.g., 'small'

      const shapeDef = MARKER_SHAPES[shapeType];
      if (!shapeDef) return;

      const markerSize = MARKER_SIZES[sizeStr] || 4;
      const orient = position === 'start' ? 'auto-start-reverse' : 'auto';
      const markerId = `marker-${type}-${color}-${position}`;

      const fillAttr = shapeDef.filled
        ? `fill="#${color}" stroke="none"`
        : `fill="none" stroke="#${color}" stroke-width="${shapeDef.strokeWidth || 1}" stroke-linecap="round" stroke-linejoin="round"`;

      defsLines.push(`    <marker id="${markerId}" viewBox="${shapeDef.viewBox}" refX="${shapeDef.refX}" refY="${shapeDef.refY}" markerWidth="${markerSize}" markerHeight="${markerSize}" markerUnits="strokeWidth" orient="${orient}">`);
      defsLines.push(`      <path d="${shapeDef.path}" ${fillAttr}/>`);
      defsLines.push(`    </marker>`);
    });

    // Edge arrow markers (color-specific)
    usedEdgeColors.forEach(colorHex => {
      defsLines.push(`    <marker id="marker-triangle-${colorHex}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="4" markerHeight="4" markerUnits="strokeWidth" orient="auto">`);
      defsLines.push(`      <path d="M 0 0 L 10 5 L 0 10 Z" fill="#${colorHex}" stroke="none"/>`);
      defsLines.push(`    </marker>`);
    });

    defsLines.push('  </defs>');
    return defsLines.join('\n');
  }

  /**
   * Convert a shape to SVG element string
   */
  private static shapeToSvgElement(shape: Shape): string {
    // Get style attributes (either full style or diff from class)
    const style = this.getShapeStyleAttributes(shape);
    const classAttr = shape.className ? `class="${shape.className}" ` : '';

    if (shape instanceof Line) {
      let markerAttrs = '';
      const colorHex = shape.style.stroke.replace('#', '').toLowerCase();
      if (shape.markerStart !== 'none') {
        markerAttrs += ` marker-start="url(#marker-${shape.markerStart}-${colorHex}-start)"`;
      }
      if (shape.markerEnd !== 'none') {
        markerAttrs += ` marker-end="url(#marker-${shape.markerEnd}-${colorHex}-end)"`;
      }
      return `  <line id="${shape.id}" ${classAttr}x1="${shape.x1}" y1="${shape.y1}" x2="${shape.x2}" y2="${shape.y2}" ${style}${markerAttrs}/>`;
    } else if (shape instanceof Ellipse) {
      return `  <ellipse id="${shape.id}" ${classAttr}cx="${shape.cx}" cy="${shape.cy}" rx="${shape.rx}" ry="${shape.ry}" ${style}/>`;
    } else if (shape instanceof Rectangle) {
      return `  <rect id="${shape.id}" ${classAttr}x="${shape.x}" y="${shape.y}" width="${shape.width}" height="${shape.height}" ${style}/>`;
    } else if (shape instanceof Text) {
      // Build text-decoration attribute
      const decorations: string[] = [];
      if (shape.textUnderline) decorations.push('underline');
      if (shape.textStrikethrough) decorations.push('line-through');
      const textDecorationAttr = decorations.length > 0
        ? ` text-decoration="${decorations.join(' ')}"`
        : '';

      // Build font-style attribute
      const fontStyleAttr = shape.fontStyle === 'italic' ? ' font-style="italic"' : '';

      // Handle multi-line content
      const lines = shape.content.split('\n');

      if (lines.length === 1) {
        // Single line
        const escapedContent = this.escapeXml(shape.content);
        return `  <text id="${shape.id}" ${classAttr}x="${shape.x}" y="${shape.y}" font-size="${shape.fontSize}" font-family="${shape.fontFamily}" font-weight="${shape.fontWeight}" text-anchor="${shape.textAnchor}"${fontStyleAttr}${textDecorationAttr} dominant-baseline="${shape.dominantBaseline}" ${style}>${escapedContent}</text>`;
      } else {
        // Multi-line with tspans
        const tspanLines = lines.map((line, index) => {
          const dy = index === 0 ? 0 : shape.fontSize * shape.lineHeight;
          const escapedLine = this.escapeXml(line) || ' ';
          return `    <tspan x="${shape.x}" dy="${dy}">${escapedLine}</tspan>`;
        }).join('\n');

        return `  <text id="${shape.id}" ${classAttr}x="${shape.x}" y="${shape.y}" font-size="${shape.fontSize}" font-family="${shape.fontFamily}" font-weight="${shape.fontWeight}" text-anchor="${shape.textAnchor}"${fontStyleAttr}${textDecorationAttr} dominant-baseline="${shape.dominantBaseline}" ${style}>\n${tspanLines}\n  </text>`;
      }
    } else if (shape instanceof Node) {
      return this.nodeToSvgElement(shape);
    } else if (shape instanceof Edge) {
      return this.edgeToSvgElement(shape);
    } else if (shape instanceof Polygon) {
      const points = shape.points.map(p => `${p.x},${p.y}`).join(' ');
      return `  <polygon id="${shape.id}" ${classAttr}points="${points}" ${style}/>`;
    } else if (shape instanceof Polyline) {
      const points = shape.points.map(p => `${p.x},${p.y}`).join(' ');
      return `  <polyline id="${shape.id}" ${classAttr}points="${points}" ${style}/>`;
    } else if (shape instanceof Path) {
      return this.pathToSvgElement(shape);
    } else if (shape instanceof Image) {
      return this.imageToSvgElement(shape);
    } else if (shape instanceof Group) {
      return this.groupToSvgElement(shape);
    }

    return '';
  }

  /**
   * Get style attributes for a shape
   * If shape has className, returns only diff from class style
   * Otherwise returns full style attributes
   */
  private static getShapeStyleAttributes(shape: Shape): string {
    if (shape.className) {
      // Get diff from class style
      const diff = styleClassManager.computeStyleDiff(shape.className, shape.style);
      return this.partialStyleToAttributes(diff);
    } else {
      // No class, output full style
      return this.styleToAttributes(shape.style);
    }
  }

  /**
   * Convert partial style to SVG attributes string
   */
  private static partialStyleToAttributes(style: Partial<ShapeStyle>): string {
    const attrs: string[] = [];

    if (style.fillNone !== undefined) {
      if (style.fillNone) {
        attrs.push('fill="none"');
      } else if (style.fill) {
        attrs.push(`fill="${style.fill}"`);
      }
    } else if (style.fill !== undefined) {
      attrs.push(`fill="${style.fill}"`);
    }

    if (style.strokeWidth !== undefined) {
      if (style.strokeWidth > 0) {
        if (style.stroke !== undefined) {
          attrs.push(`stroke="${style.stroke}"`);
        }
        attrs.push(`stroke-width="${style.strokeWidth}"`);
      } else {
        attrs.push('stroke="none"');
      }
    } else if (style.stroke !== undefined) {
      attrs.push(`stroke="${style.stroke}"`);
    }

    if (style.strokeDasharray !== undefined && style.strokeDasharray) {
      attrs.push(`stroke-dasharray="${style.strokeDasharray}"`);
    }

    if (style.strokeLinecap !== undefined && style.strokeLinecap !== 'butt') {
      attrs.push(`stroke-linecap="${style.strokeLinecap}"`);
    }

    if (style.opacity !== undefined && style.opacity !== 1) {
      attrs.push(`opacity="${style.opacity}"`);
    }

    return attrs.join(' ');
  }

  /**
   * Convert a Node to SVG element string
   */
  private static nodeToSvgElement(node: Node): string {
    const style = this.getShapeStyleAttributes(node);
    const classAttr = node.className ? `class="${node.className}" ` : '';
    const escapedLabel = this.escapeXml(node.label);
    const lines: string[] = [];

    lines.push(`  <g id="${node.id}" ${classAttr}data-graph-type="node" data-label="${escapedLabel}">`);
    lines.push(`    <ellipse cx="${node.cx}" cy="${node.cy}" rx="${node.rx}" ry="${node.ry}" ${style}/>`);
    lines.push(`    <text x="${node.cx}" y="${node.cy}" text-anchor="middle" dominant-baseline="middle" font-size="${node.fontSize}" font-family="${node.fontFamily}" fill="${node.style.stroke}" pointer-events="none">${escapedLabel}</text>`);
    lines.push(`  </g>`);

    return lines.join('\n');
  }

  /**
   * Convert an Edge to SVG element string
   */
  private static edgeToSvgElement(edge: Edge): string {
    const gm = getGraphManager();
    const sourceNode = gm.getNodeShape(edge.sourceNodeId);
    const targetNode = gm.getNodeShape(edge.targetNodeId);

    // Build data attributes for group
    let groupDataAttrs = `data-graph-type="edge" data-source-id="${edge.sourceNodeId}" data-target-id="${edge.targetNodeId}" data-direction="${edge.direction}" data-curve-offset="${edge.curveOffset}"`;
    if (edge.isSelfLoop) {
      groupDataAttrs += ` data-is-self-loop="true" data-self-loop-angle="${edge.selfLoopAngle}"`;
    }
    if (edge.label) {
      groupDataAttrs += ` data-label="${this.escapeXml(edge.label)}"`;
    }

    // Build style attributes for path
    const pathAttrs: string[] = [];
    pathAttrs.push('fill="none"');
    pathAttrs.push(`stroke="${edge.style.stroke}"`);
    pathAttrs.push(`stroke-width="${edge.style.strokeWidth}"`);
    if (edge.style.opacity !== 1) {
      pathAttrs.push(`opacity="${edge.style.opacity}"`);
    }
    if (edge.style.strokeDasharray) {
      pathAttrs.push(`stroke-dasharray="${edge.style.strokeDasharray}"`);
    }
    if (edge.style.strokeLinecap !== 'butt') {
      pathAttrs.push(`stroke-linecap="${edge.style.strokeLinecap}"`);
    }

    // Build marker attributes
    let markerAttrs = '';
    if (edge.direction === 'forward') {
      const colorHex = edge.style.stroke.replace('#', '');
      markerAttrs = ` marker-end="url(#marker-triangle-${colorHex})"`;
    } else if (edge.direction === 'backward') {
      const colorHex = edge.style.stroke.replace('#', '');
      markerAttrs = ` marker-start="url(#marker-triangle-${colorHex})"`;
    }

    // Calculate path data
    let pathData = '';
    if (sourceNode && targetNode) {
      pathData = this.calculateEdgePath(edge, sourceNode, targetNode);
    }

    // Build path element
    const pathElement = `<path d="${pathData}" ${pathAttrs.join(' ')}${markerAttrs}/>`;

    // If edge has a label, wrap in group with label elements
    if (edge.label && sourceNode && targetNode) {
      const midpoint = this.calculateEdgeMidpoint(edge, sourceNode, targetNode);
      const labelBg = `<rect fill="white" stroke="none" rx="2" ry="2" x="${midpoint.x - 10}" y="${midpoint.y - 8}" width="20" height="16"/>`;
      const labelText = `<text x="${midpoint.x}" y="${midpoint.y}" text-anchor="middle" dominant-baseline="middle" font-size="12" font-family="Arial" fill="${edge.style.stroke}" pointer-events="none">${this.escapeXml(edge.label)}</text>`;
      return `  <g id="${edge.id}" ${groupDataAttrs}>
    ${pathElement}
    ${labelBg}
    ${labelText}
  </g>`;
    }

    // No label - return simple group with path
    return `  <g id="${edge.id}" ${groupDataAttrs}>
    ${pathElement}
  </g>`;
  }

  /**
   * Calculate edge midpoint for label positioning
   */
  private static calculateEdgeMidpoint(edge: Edge, sourceNode: Node, targetNode: Node): Point {
    if (edge.isSelfLoop) {
      const angle = edge.selfLoopAngle;
      const loopSize = Math.max(sourceNode.rx, sourceNode.ry) * 1.5;
      return {
        x: round3(sourceNode.cx + (sourceNode.rx + loopSize * 0.7) * Math.cos(angle)),
        y: round3(sourceNode.cy + (sourceNode.ry + loopSize * 0.7) * Math.sin(angle))
      };
    }

    const start = sourceNode.getConnectionPoint(targetNode.cx, targetNode.cy);
    const end = targetNode.getConnectionPoint(sourceNode.cx, sourceNode.cy);

    if (edge.curveOffset === 0) {
      return {
        x: round3((start.x + end.x) / 2),
        y: round3((start.y + end.y) / 2)
      };
    }

    // Curved line - calculate point on quadratic bezier at t=0.5
    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2;
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const len = Math.sqrt(dx * dx + dy * dy);

    if (len === 0) return { x: round3(midX), y: round3(midY) };

    const perpX = -dy / len;
    const perpY = dx / len;
    const ctrlX = midX + perpX * edge.curveOffset;
    const ctrlY = midY + perpY * edge.curveOffset;

    const newStart = sourceNode.getConnectionPoint(ctrlX, ctrlY);
    const newEnd = targetNode.getConnectionPoint(ctrlX, ctrlY);

    // Quadratic bezier at t=0.5
    const t = 0.5;
    const mt = 1 - t;
    return {
      x: round3(mt * mt * newStart.x + 2 * mt * t * ctrlX + t * t * newEnd.x),
      y: round3(mt * mt * newStart.y + 2 * mt * t * ctrlY + t * t * newEnd.y)
    };
  }

  /**
   * Convert a Path to SVG element string
   */
  private static pathToSvgElement(path: Path): string {
    const style = this.getShapeStyleAttributes(path);
    const classAttr = path.className ? `class="${path.className}" ` : '';
    const pathData = serializePath(path.commands);
    let markerAttrs = '';
    const colorHex = path.style.stroke.replace('#', '').toLowerCase();
    if (path.markerStart !== 'none') {
      markerAttrs += ` marker-start="url(#marker-${path.markerStart}-${colorHex}-start)"`;
    }
    if (path.markerEnd !== 'none') {
      markerAttrs += ` marker-end="url(#marker-${path.markerEnd}-${colorHex}-end)"`;
    }
    return `  <path id="${path.id}" ${classAttr}d="${pathData}" ${style}${markerAttrs}/>`;
  }

  /**
   * Convert an Image to SVG element string
   */
  private static imageToSvgElement(image: Image): string {
    const classAttr = image.className ? `class="${image.className}" ` : '';
    const attrs: string[] = [
      `id="${image.id}"`,
      `x="${image.x}"`,
      `y="${image.y}"`,
      `width="${image.width}"`,
      `height="${image.height}"`,
      `href="${image.href}"`,
      `preserveAspectRatio="${image.preserveAspectRatio}"`
    ];

    if (image.style.opacity !== 1) {
      attrs.push(`opacity="${image.style.opacity}"`);
    }

    return `  <image ${classAttr}${attrs.join(' ')}/>`;
  }

  /**
   * Get arrow marker offset (markerWidth=4, markerUnits="strokeWidth")
   * Limit offset to maxDistance to prevent path from crossing through small nodes
   */
  private static getArrowOffset(edge: Edge, maxDistance: number): number {
    const baseOffset = edge.style.strokeWidth * 4;
    // Limit offset to 30% of the available distance
    return Math.min(baseOffset, maxDistance * 0.3);
  }

  /**
   * Offset a point along a direction by a given distance
   */
  private static offsetPoint(point: { x: number; y: number }, towardX: number, towardY: number, distance: number): { x: number; y: number } {
    const dx = towardX - point.x;
    const dy = towardY - point.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) return point;
    return {
      x: point.x + (dx / len) * distance,
      y: point.y + (dy / len) * distance
    };
  }

  /**
   * Calculate distance between two points
   */
  private static distanceBetween(p1: { x: number; y: number }, p2: { x: number; y: number }): number {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Calculate edge path data
   */
  private static calculateEdgePath(edge: Edge, sourceNode: Node, targetNode: Node): string {
    if (edge.isSelfLoop) {
      return this.calculateSelfLoopPath(edge, sourceNode);
    }

    let start = sourceNode.getConnectionPoint(targetNode.cx, targetNode.cy);
    let end = targetNode.getConnectionPoint(sourceNode.cx, sourceNode.cy);

    // Calculate distance for offset limiting
    const distance = this.distanceBetween(start, end);

    // Offset endpoints for arrow markers
    const arrowOffset = this.getArrowOffset(edge, distance);
    if (edge.direction === 'backward') {
      start = this.offsetPoint(start, end.x, end.y, arrowOffset);
    } else if (edge.direction === 'forward') {
      end = this.offsetPoint(end, start.x, start.y, arrowOffset);
    }

    if (edge.curveOffset === 0) {
      return `M ${round3(start.x)} ${round3(start.y)} L ${round3(end.x)} ${round3(end.y)}`;
    }

    // Curved path for parallel edges (use original points for control point calculation)
    const origStart = sourceNode.getConnectionPoint(targetNode.cx, targetNode.cy);
    const origEnd = targetNode.getConnectionPoint(sourceNode.cx, sourceNode.cy);
    const midX = (origStart.x + origEnd.x) / 2;
    const midY = (origStart.y + origEnd.y) / 2;
    const dx = origEnd.x - origStart.x;
    const dy = origEnd.y - origStart.y;
    const len = Math.sqrt(dx * dx + dy * dy);

    if (len === 0) return `M ${round3(start.x)} ${round3(start.y)} L ${round3(end.x)} ${round3(end.y)}`;

    const perpX = -dy / len;
    const perpY = dx / len;
    const ctrlX = round3(midX + perpX * edge.curveOffset);
    const ctrlY = round3(midY + perpY * edge.curveOffset);

    let newStart = sourceNode.getConnectionPoint(ctrlX, ctrlY);
    let newEnd = targetNode.getConnectionPoint(ctrlX, ctrlY);

    // Calculate distance for curved path offset limiting
    const curveDistance = this.distanceBetween(newStart, newEnd);
    const curveArrowOffset = this.getArrowOffset(edge, curveDistance);

    // Offset for arrow markers on curved paths
    if (edge.direction === 'backward') {
      newStart = this.offsetPoint(newStart, ctrlX, ctrlY, curveArrowOffset);
    } else if (edge.direction === 'forward') {
      newEnd = this.offsetPoint(newEnd, ctrlX, ctrlY, curveArrowOffset);
    }

    return `M ${round3(newStart.x)} ${round3(newStart.y)} Q ${ctrlX} ${ctrlY} ${round3(newEnd.x)} ${round3(newEnd.y)}`;
  }

  /**
   * Calculate self-loop path data
   */
  private static calculateSelfLoopPath(edge: Edge, node: Node): string {
    const angle = edge.selfLoopAngle;
    const loopSize = Math.max(node.rx, node.ry) * 1.5;

    const startAngle = angle - Math.PI / 6;
    const endAngle = angle + Math.PI / 6;

    let startX = node.cx + node.rx * Math.cos(startAngle);
    let startY = node.cy + node.ry * Math.sin(startAngle);
    let endX = node.cx + node.rx * Math.cos(endAngle);
    let endY = node.cy + node.ry * Math.sin(endAngle);

    const ctrl1X = round3(node.cx + (node.rx + loopSize) * Math.cos(startAngle));
    const ctrl1Y = round3(node.cy + (node.ry + loopSize) * Math.sin(startAngle));
    const ctrl2X = round3(node.cx + (node.rx + loopSize) * Math.cos(endAngle));
    const ctrl2Y = round3(node.cy + (node.ry + loopSize) * Math.sin(endAngle));

    // Offset endpoints for arrow markers (use loopSize as reference distance)
    const arrowOffset = this.getArrowOffset(edge, loopSize);
    if (edge.direction === 'backward') {
      const offset = this.offsetPoint({ x: startX, y: startY }, ctrl1X, ctrl1Y, arrowOffset);
      startX = offset.x;
      startY = offset.y;
    } else if (edge.direction === 'forward') {
      const offset = this.offsetPoint({ x: endX, y: endY }, ctrl2X, ctrl2Y, arrowOffset);
      endX = offset.x;
      endY = offset.y;
    }

    return `M ${round3(startX)} ${round3(startY)} C ${ctrl1X} ${ctrl1Y} ${ctrl2X} ${ctrl2Y} ${round3(endX)} ${round3(endY)}`;
  }

  /**
   * Convert a Group to SVG element string
   */
  private static groupToSvgElement(group: Group, indent: string = '  '): string {
    const classAttr = group.className ? `class="${group.className}" ` : '';
    const lines: string[] = [];

    lines.push(`${indent}<g id="${group.id}" ${classAttr}data-group-type="group">`);

    // Recursively convert children
    for (const child of group.children) {
      if (child instanceof Group) {
        lines.push(this.groupToSvgElement(child, indent + '  '));
      } else {
        // Re-indent the child element
        const childSvg = this.shapeToSvgElement(child);
        lines.push(childSvg.replace(/^  /, indent + '  '));
      }
    }

    lines.push(`${indent}</g>`);

    return lines.join('\n');
  }

  /**
   * Convert style object to SVG attributes string
   */
  private static styleToAttributes(style: ShapeStyle): string {
    const attrs: string[] = [];

    if (style.fillNone) {
      attrs.push('fill="none"');
    } else {
      attrs.push(`fill="${style.fill}"`);
    }

    // Only output stroke attributes if strokeWidth > 0
    if (style.strokeWidth > 0) {
      attrs.push(`stroke="${style.stroke}"`);
      attrs.push(`stroke-width="${style.strokeWidth}"`);

      if (style.strokeDasharray) {
        attrs.push(`stroke-dasharray="${style.strokeDasharray}"`);
      }

      if (style.strokeLinecap !== 'butt') {
        attrs.push(`stroke-linecap="${style.strokeLinecap}"`);
      }
    }

    if (style.opacity !== 1) {
      attrs.push(`opacity="${style.opacity}"`);
    }

    return attrs.join(' ');
  }

  /**
   * Parse result containing shapes and canvas size
   */
  static parseResult: { shapes: Shape[]; canvasSize: CanvasSize } = {
    shapes: [],
    canvasSize: { ...DEFAULT_CANVAS_SIZE }
  };

  /**
   * Parse SVG string and return shapes and canvas size
   */
  static parse(svgContent: string): { shapes: Shape[]; canvasSize: CanvasSize } {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgContent, 'image/svg+xml');
    const svg = doc.querySelector('svg');

    if (!svg) {
      console.error('No SVG element found in file');
      return { shapes: [], canvasSize: { ...DEFAULT_CANVAS_SIZE } };
    }

    // Extract canvas size from SVG width/height attributes
    const width = parseFloat(svg.getAttribute('width') || '');
    const height = parseFloat(svg.getAttribute('height') || '');
    const canvasSize: CanvasSize = {
      width: isNaN(width) || width <= 0 ? DEFAULT_CANVAS_SIZE.width : width,
      height: isNaN(height) || height <= 0 ? DEFAULT_CANVAS_SIZE.height : height
    };

    // Parse <style> block and register temporary classes
    const styleElement = svg.querySelector('style');
    const fileClasses = this.parseStyleBlock(styleElement?.textContent || '');
    if (fileClasses.length > 0) {
      styleClassManager.registerTemporaryClasses(fileClasses);
    }

    const shapes: Shape[] = [];
    const gm = getGraphManager();

    // First, parse nodes to register them with GraphManager
    const nodeElements = svg.querySelectorAll('g[data-graph-type="node"]');
    nodeElements.forEach(el => {
      const ellipse = el.querySelector('ellipse');
      if (ellipse) {
        const className = el.getAttribute('class') || undefined;
        const style = this.parseStyleWithClass(ellipse, className);
        const node = Node.fromElement(el as SVGGElement, style);
        if (node) {
          node.className = className;
          const transform = parseTransform(el.getAttribute('transform'));
          this.applyTransformToShape(node, transform);
          shapes.push(node);
          // Register with GraphManager
          gm.registerNode(node.id);
          gm.setNodeShape(node.id, node);
        }
      }
    });

    // Parse edge elements (after nodes are registered)
    // Support both legacy path format and new group format (for edges with labels)
    const edgeElements = svg.querySelectorAll('path[data-graph-type="edge"], g[data-graph-type="edge"]');
    edgeElements.forEach(el => {
      const style = this.parseEdgeStyleFromElement(el as SVGElement);
      const edge = Edge.fromElement(el as SVGElement, style);
      if (edge) {
        shapes.push(edge);
        // Register with GraphManager
        gm.registerEdge(edge.id, edge.sourceNodeId, edge.targetNodeId);
      }
    });

    // Helper function to check if element is inside a defs, group, node, or edge
    const isInsideGroupOrNodeOrEdge = (el: Element): boolean => {
      let parent: Element | null = el.parentElement;
      while (parent && parent !== (svg as Element)) {
        if (parent.tagName.toLowerCase() === 'defs' ||
            parent.tagName.toLowerCase() === 'marker' ||
            parent.getAttribute('data-group-type') === 'group' ||
            parent.getAttribute('data-graph-type') === 'node' ||
            parent.getAttribute('data-graph-type') === 'edge') {
          return true;
        }
        parent = parent.parentElement;
      }
      return false;
    };

    // Parse line elements (excluding edges and those inside groups)
    const lines = svg.querySelectorAll('line');
    lines.forEach(el => {
      if (isInsideGroupOrNodeOrEdge(el)) return;

      const className = el.getAttribute('class') || undefined;
      const style = this.parseStyleWithClass(el, className);
      const markerStart = this.parseMarkerType(el.getAttribute('marker-start'));
      const markerEnd = this.parseMarkerType(el.getAttribute('marker-end'));
      const line = Line.fromElement(el, style, markerStart, markerEnd);
      line.className = className;
      const transform = parseTransform(el.getAttribute('transform'));
      this.applyTransformToShape(line, transform);
      shapes.push(line);
    });

    // Parse ellipse elements (excluding those inside nodes or groups)
    const ellipses = svg.querySelectorAll('ellipse');
    ellipses.forEach(el => {
      if (isInsideGroupOrNodeOrEdge(el)) return;

      const className = el.getAttribute('class') || undefined;
      const style = this.parseStyleWithClass(el, className);
      const ellipse = Ellipse.fromElement(el, style);
      ellipse.className = className;
      const transform = parseTransform(el.getAttribute('transform'));
      this.applyTransformToShape(ellipse, transform);
      shapes.push(ellipse);
    });

    // Parse circle elements (convert to ellipse, excluding those inside groups)
    const circles = svg.querySelectorAll('circle');
    circles.forEach(el => {
      if (isInsideGroupOrNodeOrEdge(el)) return;

      const className = el.getAttribute('class') || undefined;
      const style = this.parseStyleWithClass(el, className);
      const cx = parseFloat(el.getAttribute('cx') || '0');
      const cy = parseFloat(el.getAttribute('cy') || '0');
      const r = parseFloat(el.getAttribute('r') || '0');
      const ellipse = Ellipse.fromCenter({ x: cx, y: cy }, r, r, style);
      ellipse.className = className;
      const transform = parseTransform(el.getAttribute('transform'));
      this.applyTransformToShape(ellipse, transform);
      shapes.push(ellipse);
    });

    // Parse rect elements (excluding those inside groups)
    const rects = svg.querySelectorAll('rect');
    rects.forEach(el => {
      if (isInsideGroupOrNodeOrEdge(el)) return;

      const className = el.getAttribute('class') || undefined;
      const style = this.parseStyleWithClass(el, className);
      const rectangle = Rectangle.fromElement(el, style);
      rectangle.className = className;
      const transform = parseTransform(el.getAttribute('transform'));
      this.applyTransformToShape(rectangle, transform);
      shapes.push(rectangle);
    });

    // Parse text elements (excluding those inside nodes or groups)
    const texts = svg.querySelectorAll('text');
    texts.forEach(el => {
      if (isInsideGroupOrNodeOrEdge(el)) return;

      const className = el.getAttribute('class') || undefined;
      const style = this.parseTextStyleWithClass(el, className);
      const text = Text.fromElement(el, style);
      text.className = className;
      const transform = parseTransform(el.getAttribute('transform'));
      this.applyTransformToShape(text, transform);
      shapes.push(text);
    });

    // Parse polygon elements (excluding those inside groups)
    const polygons = svg.querySelectorAll('polygon');
    polygons.forEach(el => {
      if (isInsideGroupOrNodeOrEdge(el)) return;

      const className = el.getAttribute('class') || undefined;
      const style = this.parseStyleWithClass(el, className);
      const polygon = Polygon.fromElement(el, style);
      polygon.className = className;
      const transform = parseTransform(el.getAttribute('transform'));
      this.applyTransformToShape(polygon, transform);
      shapes.push(polygon);
    });

    // Parse polyline elements (excluding those inside groups)
    const polylines = svg.querySelectorAll('polyline');
    polylines.forEach(el => {
      if (isInsideGroupOrNodeOrEdge(el)) return;

      const className = el.getAttribute('class') || undefined;
      const style = this.parseStyleWithClass(el, className);
      const polyline = Polyline.fromElement(el, style);
      polyline.className = className;
      const transform = parseTransform(el.getAttribute('transform'));
      this.applyTransformToShape(polyline, transform);
      shapes.push(polyline);
    });

    // Parse image elements (excluding those inside groups)
    const images = svg.querySelectorAll('image');
    images.forEach(el => {
      if (isInsideGroupOrNodeOrEdge(el)) return;

      const className = el.getAttribute('class') || undefined;
      const style = this.parseStyleWithClass(el, className);
      const image = Image.fromElement(el as SVGImageElement, style);
      image.className = className;
      const transform = parseTransform(el.getAttribute('transform'));
      this.applyTransformToShape(image, transform);
      shapes.push(image);
    });

    // Parse path elements (excluding those inside groups and edges)
    const allPaths = svg.querySelectorAll('path');
    allPaths.forEach(el => {
      if (isInsideGroupOrNodeOrEdge(el)) return;
      // Skip if it's an edge
      if (el.getAttribute('data-graph-type') === 'edge') return;

      const dAttr = el.getAttribute('d');
      if (!dAttr) return;

      const className = el.getAttribute('class') || undefined;
      const style = this.parseStyleWithClass(el as SVGElement, className);
      const markerStart = this.parseMarkerType(el.getAttribute('marker-start'));
      const markerEnd = this.parseMarkerType(el.getAttribute('marker-end'));
      const path = Path.fromPathData(dAttr, style, markerStart, markerEnd);
      if (path.commands.length > 0) {
        path.className = className;
        const transform = parseTransform(el.getAttribute('transform'));
        this.applyTransformToShape(path, transform);
        shapes.push(path);
      }
    });

    // Parse top-level group elements
    const groups = svg.querySelectorAll('g[data-group-type="group"]');
    groups.forEach(el => {
      // Only parse top-level groups (not nested)
      if (el.parentElement !== (svg as Element)) return;

      const group = this.parseGroupElement(el as SVGGElement, gm);
      if (group) {
        shapes.push(group);
      }
    });

    return { shapes, canvasSize };
  }

  /**
   * Parse a group element recursively
   */
  private static parseGroupElement(
    groupEl: SVGGElement,
    gm: ReturnType<typeof getGraphManager>,
    parentTransform: ParsedTransform = IDENTITY_TRANSFORM
  ): Group | null {
    const id = groupEl.id || `group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const className = groupEl.getAttribute('class') || undefined;
    const children: Shape[] = [];

    // Parse group's own transform and combine with parent
    const myTransform = parseTransform(groupEl.getAttribute('transform'));
    const combinedTransform = combineTransforms(parentTransform, myTransform);

    // Parse child elements with accumulated transform
    for (const child of Array.from(groupEl.children)) {
      const shape = this.parseChildElement(child as SVGElement, gm, combinedTransform);
      if (shape) {
        children.push(shape);
      }
    }

    if (children.length === 0) {
      return null;
    }

    const group = new Group(id, children, { ...DEFAULT_STYLE });
    group.className = className;
    return group;
  }

  /**
   * Parse a child element within a group
   */
  private static parseChildElement(
    el: SVGElement,
    gm: ReturnType<typeof getGraphManager>,
    parentTransform: ParsedTransform = IDENTITY_TRANSFORM
  ): Shape | null {
    const tagName = el.tagName.toLowerCase();
    const className = el.getAttribute('class') || undefined;

    // Parse element's own transform and combine with parent
    const myTransform = parseTransform(el.getAttribute('transform'));
    const combinedTransform = combineTransforms(parentTransform, myTransform);

    // Handle nested groups
    if (tagName === 'g') {
      if (el.getAttribute('data-group-type') === 'group') {
        return this.parseGroupElement(el as SVGGElement, gm, parentTransform);
      }
      if (el.getAttribute('data-graph-type') === 'node') {
        const ellipse = el.querySelector('ellipse');
        if (ellipse) {
          const nodeClassName = el.getAttribute('class') || undefined;
          const style = this.parseStyleWithClass(ellipse, nodeClassName);
          const node = Node.fromElement(el as SVGGElement, style);
          if (node) {
            node.className = nodeClassName;
            this.applyTransformToShape(node, combinedTransform);
            gm.registerNode(node.id);
            gm.setNodeShape(node.id, node);
            return node;
          }
        }
      }
      return null;
    }

    const style = tagName === 'text'
      ? this.parseTextStyleWithClass(el, className)
      : this.parseStyleWithClass(el, className);
    let shape: Shape | null = null;

    switch (tagName) {
      case 'line':
        const markerStart = this.parseMarkerType(el.getAttribute('marker-start'));
        const markerEnd = this.parseMarkerType(el.getAttribute('marker-end'));
        shape = Line.fromElement(el as SVGLineElement, style, markerStart, markerEnd);
        break;

      case 'ellipse':
        shape = Ellipse.fromElement(el as SVGEllipseElement, style);
        break;

      case 'circle':
        const cx = parseFloat(el.getAttribute('cx') || '0');
        const cy = parseFloat(el.getAttribute('cy') || '0');
        const r = parseFloat(el.getAttribute('r') || '0');
        shape = Ellipse.fromCenter({ x: cx, y: cy }, r, r, style);
        break;

      case 'rect':
        shape = Rectangle.fromElement(el as SVGRectElement, style);
        break;

      case 'text':
        shape = Text.fromElement(el as SVGTextElement, style);
        break;

      case 'polygon':
        shape = Polygon.fromElement(el as SVGPolygonElement, style);
        break;

      case 'polyline':
        shape = Polyline.fromElement(el as SVGPolylineElement, style);
        break;

      case 'path':
        if (el.getAttribute('data-graph-type') === 'edge') {
          const edgeStyle = this.parseEdgeStyleFromElement(el as SVGPathElement);
          const edge = Edge.fromElement(el as SVGPathElement, edgeStyle);
          if (edge) {
            gm.registerEdge(edge.id, edge.sourceNodeId, edge.targetNodeId);
            return edge;  // Edges don't need transform (they reference nodes)
          }
        } else {
          // Parse path element
          const dAttr = el.getAttribute('d');
          if (dAttr) {
            const pathMarkerStart = this.parseMarkerType(el.getAttribute('marker-start'));
            const pathMarkerEnd = this.parseMarkerType(el.getAttribute('marker-end'));
            const path = Path.fromPathData(dAttr, style, pathMarkerStart, pathMarkerEnd);
            if (path.commands.length > 0) {
              shape = path;
            }
          }
        }
        break;

      case 'image':
        shape = Image.fromElement(el as SVGImageElement, style);
        break;

      default:
        return null;
    }

    // Apply combined transform and className to the shape
    if (shape) {
      shape.className = className;
      this.applyTransformToShape(shape, combinedTransform);
    }

    return shape;
  }

  /**
   * Parse style attributes from edge element (path or group)
   */
  private static parseEdgeStyleFromElement(el: SVGElement): ShapeStyle {
    // For group elements, get style from the path child
    let styleEl: SVGElement = el;
    if (el.tagName === 'g') {
      const pathChild = el.querySelector('path');
      if (pathChild) {
        styleEl = pathChild;
      }
    }

    return {
      fill: DEFAULT_STYLE.fill,
      fillNone: true,
      stroke: styleEl.getAttribute('stroke') || DEFAULT_STYLE.stroke,
      strokeWidth: parseFloat(styleEl.getAttribute('stroke-width') || String(DEFAULT_STYLE.strokeWidth)),
      opacity: parseFloat(styleEl.getAttribute('opacity') || '1'),
      strokeDasharray: styleEl.getAttribute('stroke-dasharray') || '',
      strokeLinecap: (styleEl.getAttribute('stroke-linecap') as StrokeLinecap) || DEFAULT_STYLE.strokeLinecap
    };
  }

  /**
   * Parse style attributes from SVG element
   */
  private static parseStyleFromElement(el: SVGElement): ShapeStyle {
    // SVG default for fill is black (#000000), not white
    const fill = el.getAttribute('fill') || '#000000';
    const fillNone = fill === 'none';
    const strokeAttr = el.getAttribute('stroke');
    const strokeWidthAttr = el.getAttribute('stroke-width');

    // If stroke is not specified or is "none", set strokeWidth to 0
    // SVG default for stroke is "none", not a color
    const hasStroke = strokeAttr && strokeAttr !== 'none';
    const strokeWidth = hasStroke
      ? parseFloat(strokeWidthAttr || String(DEFAULT_STYLE.strokeWidth))
      : (strokeWidthAttr ? parseFloat(strokeWidthAttr) : 0);

    return {
      fill: fillNone ? '#000000' : fill,
      fillNone,
      stroke: strokeAttr || DEFAULT_STYLE.stroke,
      strokeWidth,
      opacity: parseFloat(el.getAttribute('opacity') || '1'),
      strokeDasharray: el.getAttribute('stroke-dasharray') || '',
      strokeLinecap: (el.getAttribute('stroke-linecap') as StrokeLinecap) || DEFAULT_STYLE.strokeLinecap
    };
  }

  /**
   * Parse style attributes from SVG text element
   * Text defaults: fill=#000000, strokeWidth=0
   */
  private static parseTextStyleFromElement(el: SVGElement): ShapeStyle {
    const fill = el.getAttribute('fill') || '#000000';
    const fillNone = fill === 'none';
    const strokeWidthAttr = el.getAttribute('stroke-width');

    return {
      fill: fillNone ? '#000000' : fill,
      fillNone,
      stroke: el.getAttribute('stroke') || DEFAULT_STYLE.stroke,
      strokeWidth: strokeWidthAttr ? parseFloat(strokeWidthAttr) : 0,
      opacity: parseFloat(el.getAttribute('opacity') || '1'),
      strokeDasharray: el.getAttribute('stroke-dasharray') || '',
      strokeLinecap: (el.getAttribute('stroke-linecap') as StrokeLinecap) || DEFAULT_STYLE.strokeLinecap
    };
  }

  /**
   * Parse marker type from marker-start/marker-end attribute value
   */
  private static parseMarkerType(markerAttr: string | null): MarkerType {
    if (!markerAttr) return 'none';

    // Extract marker type from url(#marker-{shape}-{size}-{color}-{position})
    // e.g., url(#marker-arrow-small-ff0000-start) -> 'arrow-small'
    // Also support old format without color: url(#marker-arrow-small-start)
    const matchWithColor = markerAttr.match(/url\(#marker-(arrow|triangle|circle|diamond)-(small|medium|large)-[0-9a-fA-F]{6}-(?:start|end)\)/);
    if (matchWithColor) {
      const shape = matchWithColor[1];
      const size = matchWithColor[2];
      const markerType = `${shape}-${size}` as MarkerType;
      return markerType;
    }

    // Fallback to old format without color
    const match = markerAttr.match(/url\(#marker-(arrow|triangle|circle|diamond)-(small|medium|large)-(?:start|end)\)/);
    if (match) {
      const shape = match[1];
      const size = match[2];
      const markerType = `${shape}-${size}` as MarkerType;
      return markerType;
    }
    return 'none';
  }

  /**
   * Escape special XML characters
   */
  private static escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Apply transform to a shape if it has applyTransform method
   */
  private static applyTransformToShape(shape: Shape, transform: ParsedTransform): void {
    if (isIdentityTransform(transform)) return;

    // Apply translate and scale transforms
    if (shape.applyTransform) {
      shape.applyTransform(
        transform.translateX,
        transform.translateY,
        transform.scaleX,
        transform.scaleY
      );
    }

    // Apply skew transform (only for shapes that support it)
    if (hasSkew(transform)) {
      if (shape.applySkew) {
        shape.applySkew(transform.skewX, transform.skewY);
      } else {
        console.warn(`Shape type "${shape.type}" does not support skew transform, skew will be ignored`);
      }
    }

    // Apply rotation transform
    // Note: For rotate(angle, cx, cy), this is a simplification that adds the rotation
    // to the shape's own rotation property. The rotation center may differ from the
    // shape's center, which could cause slight positioning differences.
    if (hasRotation(transform)) {
      const currentRotation = shape.rotation || 0;
      shape.setRotation(currentRotation + transform.rotation);
    }
  }

  /**
   * Parse style from element with class support
   * Merges class style with inline attributes (inline takes precedence)
   */
  private static parseStyleWithClass(el: SVGElement, className: string | undefined): ShapeStyle {
    // Get base style from class if available
    let baseStyle = { ...DEFAULT_STYLE };
    if (className) {
      const styleClass = styleClassManager.getClass(className);
      if (styleClass) {
        baseStyle = { ...styleClass.style };
      }
    }

    // Parse inline attributes and override class style
    const inlineStyle = this.parseStyleFromElement(el);

    // Only override if attribute is explicitly set
    if (el.hasAttribute('fill') || el.getAttribute('fill')) {
      baseStyle.fill = inlineStyle.fill;
      baseStyle.fillNone = inlineStyle.fillNone;
    }
    if (el.hasAttribute('stroke')) {
      baseStyle.stroke = inlineStyle.stroke;
    }
    if (el.hasAttribute('stroke-width')) {
      baseStyle.strokeWidth = inlineStyle.strokeWidth;
    }
    if (el.hasAttribute('stroke-dasharray')) {
      baseStyle.strokeDasharray = inlineStyle.strokeDasharray;
    }
    if (el.hasAttribute('stroke-linecap')) {
      baseStyle.strokeLinecap = inlineStyle.strokeLinecap;
    }
    if (el.hasAttribute('opacity')) {
      baseStyle.opacity = inlineStyle.opacity;
    }

    return baseStyle;
  }

  /**
   * Parse text style from element with class support
   */
  private static parseTextStyleWithClass(el: SVGElement, className: string | undefined): ShapeStyle {
    // Get base style from class if available
    let baseStyle = { ...DEFAULT_STYLE, strokeWidth: 0 }; // Text default: no stroke
    if (className) {
      const styleClass = styleClassManager.getClass(className);
      if (styleClass) {
        baseStyle = { ...styleClass.style };
      }
    }

    // Parse inline attributes
    const inlineStyle = this.parseTextStyleFromElement(el);

    // Only override if attribute is explicitly set
    if (el.hasAttribute('fill') || el.getAttribute('fill')) {
      baseStyle.fill = inlineStyle.fill;
      baseStyle.fillNone = inlineStyle.fillNone;
    }
    if (el.hasAttribute('stroke')) {
      baseStyle.stroke = inlineStyle.stroke;
    }
    if (el.hasAttribute('stroke-width')) {
      baseStyle.strokeWidth = inlineStyle.strokeWidth;
    }
    if (el.hasAttribute('stroke-dasharray')) {
      baseStyle.strokeDasharray = inlineStyle.strokeDasharray;
    }
    if (el.hasAttribute('stroke-linecap')) {
      baseStyle.strokeLinecap = inlineStyle.strokeLinecap;
    }
    if (el.hasAttribute('opacity')) {
      baseStyle.opacity = inlineStyle.opacity;
    }

    return baseStyle;
  }

  /**
   * Parse CSS classes from <style> block content
   * Returns StyleClass objects for each found class definition
   */
  private static parseStyleBlock(cssContent: string): StyleClass[] {
    const classes: StyleClass[] = [];
    if (!cssContent.trim()) return classes;

    // Match CSS class rules: .className { properties }
    const classRegex = /\.([a-zA-Z][a-zA-Z0-9_-]*)\s*\{([^}]*)\}/g;
    let match;

    while ((match = classRegex.exec(cssContent)) !== null) {
      const className = match[1];
      const cssProps = match[2];

      // Parse CSS properties into ShapeStyle
      const style = this.parseCSSProperties(cssProps);

      classes.push({
        id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: className,
        style,
        isBuiltin: false
      });
    }

    return classes;
  }

  /**
   * Parse CSS properties string into ShapeStyle object
   */
  private static parseCSSProperties(cssProps: string): ShapeStyle {
    const style: ShapeStyle = { ...DEFAULT_STYLE };
    const props = cssProps.split(';').map(p => p.trim()).filter(p => p);

    for (const prop of props) {
      const colonIndex = prop.indexOf(':');
      if (colonIndex === -1) continue;

      const name = prop.substring(0, colonIndex).trim();
      const value = prop.substring(colonIndex + 1).trim();

      switch (name) {
        case 'fill':
          if (value === 'none') {
            style.fillNone = true;
          } else {
            style.fill = value;
            style.fillNone = false;
          }
          break;
        case 'stroke':
          if (value !== 'none') {
            style.stroke = value;
          }
          break;
        case 'stroke-width':
          style.strokeWidth = parseFloat(value) || 0;
          break;
        case 'stroke-dasharray':
          style.strokeDasharray = value;
          break;
        case 'stroke-linecap':
          if (value === 'butt' || value === 'round' || value === 'square') {
            style.strokeLinecap = value;
          }
          break;
        case 'opacity':
          style.opacity = parseFloat(value) || 1;
          break;
      }
    }

    return style;
  }
}
