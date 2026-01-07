import { ShapeStyle, DEFAULT_STYLE, StrokeLinecap, MarkerType, EdgeDirection, CanvasSize, DEFAULT_CANVAS_SIZE, Point } from '../../shared/types';
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

// Marker definitions for SVG export
const MARKER_SVG_DEFS: Record<Exclude<MarkerType, 'none'>, { path: string; filled: boolean; strokeWidth?: number }> = {
  'triangle': { path: 'M 0 0 L 10 5 L 0 10 Z', filled: true },
  'triangle-open': { path: 'M 0 1 L 8 5 L 0 9', filled: false, strokeWidth: 1.5 },
  'circle': { path: 'M 5 0 A 5 5 0 1 1 5 10 A 5 5 0 1 1 5 0 Z', filled: true },
  'diamond': { path: 'M 5 0 L 10 5 L 5 10 L 0 5 Z', filled: true }
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

    // Add marker defs if any lines use markers
    const markerDefs = this.generateMarkerDefs(shapes);
    if (markerDefs) {
      svgLines.push(markerDefs);
    }

    shapes.forEach(shape => {
      svgLines.push(this.shapeToSvgElement(shape));
    });

    svgLines.push('</svg>');
    return svgLines.join('\n');
  }

  /**
   * Generate marker definitions for lines and edges that use them
   */
  private static generateMarkerDefs(shapes: Shape[]): string | null {
    const usedMarkers = new Set<string>();
    const usedEdgeColors = new Set<string>();

    // Recursively collect markers from shapes
    const collectMarkers = (shapeList: Shape[]) => {
      shapeList.forEach(shape => {
        if (shape instanceof Line) {
          if (shape.markerStart !== 'none') {
            usedMarkers.add(`${shape.markerStart}-start`);
          }
          if (shape.markerEnd !== 'none') {
            usedMarkers.add(`${shape.markerEnd}-end`);
          }
        }
        // Collect edge arrow colors
        if (shape instanceof Edge) {
          if (shape.direction === 'forward' || shape.direction === 'backward') {
            usedEdgeColors.add(shape.style.stroke.replace('#', ''));
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

    // Line markers
    usedMarkers.forEach(markerKey => {
      const [type, position] = markerKey.split('-') as [Exclude<MarkerType, 'none'>, string];
      const def = MARKER_SVG_DEFS[type];
      if (!def) return;

      const orient = position === 'start' ? 'auto-start-reverse' : 'auto';
      const refX = type === 'circle' || type === 'diamond' ? 5 : 9;
      const refY = 5;

      const fillAttr = def.filled
        ? 'fill="currentColor" stroke="none"'
        : `fill="none" stroke="currentColor" stroke-width="${def.strokeWidth || 1}" stroke-linecap="round" stroke-linejoin="round"`;

      defsLines.push(`    <marker id="marker-${type}-${position}" viewBox="0 0 10 10" refX="${refX}" refY="${refY}" markerWidth="4" markerHeight="4" markerUnits="strokeWidth" orient="${orient}">`);
      defsLines.push(`      <path d="${def.path}" ${fillAttr}/>`);
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
    const style = this.styleToAttributes(shape.style);

    if (shape instanceof Line) {
      let markerAttrs = '';
      if (shape.markerStart !== 'none') {
        markerAttrs += ` marker-start="url(#marker-${shape.markerStart}-start)"`;
      }
      if (shape.markerEnd !== 'none') {
        markerAttrs += ` marker-end="url(#marker-${shape.markerEnd}-end)"`;
      }
      return `  <line id="${shape.id}" x1="${shape.x1}" y1="${shape.y1}" x2="${shape.x2}" y2="${shape.y2}" ${style}${markerAttrs}/>`;
    } else if (shape instanceof Ellipse) {
      return `  <ellipse id="${shape.id}" cx="${shape.cx}" cy="${shape.cy}" rx="${shape.rx}" ry="${shape.ry}" ${style}/>`;
    } else if (shape instanceof Rectangle) {
      return `  <rect id="${shape.id}" x="${shape.x}" y="${shape.y}" width="${shape.width}" height="${shape.height}" ${style}/>`;
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
        return `  <text id="${shape.id}" x="${shape.x}" y="${shape.y}" font-size="${shape.fontSize}" font-family="${shape.fontFamily}" font-weight="${shape.fontWeight}" text-anchor="${shape.textAnchor}"${fontStyleAttr}${textDecorationAttr} dominant-baseline="hanging" ${style}>${escapedContent}</text>`;
      } else {
        // Multi-line with tspans
        const tspanLines = lines.map((line, index) => {
          const dy = index === 0 ? 0 : shape.fontSize * shape.lineHeight;
          const escapedLine = this.escapeXml(line) || ' ';
          return `    <tspan x="${shape.x}" dy="${dy}">${escapedLine}</tspan>`;
        }).join('\n');

        return `  <text id="${shape.id}" x="${shape.x}" y="${shape.y}" font-size="${shape.fontSize}" font-family="${shape.fontFamily}" font-weight="${shape.fontWeight}" text-anchor="${shape.textAnchor}"${fontStyleAttr}${textDecorationAttr} dominant-baseline="hanging" ${style}>\n${tspanLines}\n  </text>`;
      }
    } else if (shape instanceof Node) {
      return this.nodeToSvgElement(shape);
    } else if (shape instanceof Edge) {
      return this.edgeToSvgElement(shape);
    } else if (shape instanceof Polygon) {
      const points = shape.points.map(p => `${p.x},${p.y}`).join(' ');
      return `  <polygon id="${shape.id}" points="${points}" ${style}/>`;
    } else if (shape instanceof Polyline) {
      const points = shape.points.map(p => `${p.x},${p.y}`).join(' ');
      return `  <polyline id="${shape.id}" points="${points}" ${style}/>`;
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
   * Convert a Node to SVG element string
   */
  private static nodeToSvgElement(node: Node): string {
    const style = this.styleToAttributes(node.style);
    const escapedLabel = this.escapeXml(node.label);
    const lines: string[] = [];

    lines.push(`  <g id="${node.id}" data-graph-type="node" data-label="${escapedLabel}">`);
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

    // Build data attributes
    let dataAttrs = `data-graph-type="edge" data-source-id="${edge.sourceNodeId}" data-target-id="${edge.targetNodeId}" data-direction="${edge.direction}" data-curve-offset="${edge.curveOffset}"`;
    if (edge.isSelfLoop) {
      dataAttrs += ` data-is-self-loop="true" data-self-loop-angle="${edge.selfLoopAngle}"`;
    }

    // Build style attributes
    const attrs: string[] = [];
    attrs.push('fill="none"');
    attrs.push(`stroke="${edge.style.stroke}"`);
    attrs.push(`stroke-width="${edge.style.strokeWidth}"`);
    if (edge.style.opacity !== 1) {
      attrs.push(`opacity="${edge.style.opacity}"`);
    }
    if (edge.style.strokeDasharray) {
      attrs.push(`stroke-dasharray="${edge.style.strokeDasharray}"`);
    }
    if (edge.style.strokeLinecap !== 'butt') {
      attrs.push(`stroke-linecap="${edge.style.strokeLinecap}"`);
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

    return `  <path id="${edge.id}" ${dataAttrs} d="${pathData}" ${attrs.join(' ')}${markerAttrs}/>`;
  }

  /**
   * Convert a Path to SVG element string
   */
  private static pathToSvgElement(path: Path): string {
    const style = this.styleToAttributes(path.style);
    const pathData = serializePath(path.commands);
    return `  <path id="${path.id}" d="${pathData}" ${style}/>`;
  }

  /**
   * Convert an Image to SVG element string
   */
  private static imageToSvgElement(image: Image): string {
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

    return `  <image ${attrs.join(' ')}/>`;
  }

  /**
   * Calculate edge path data
   */
  private static calculateEdgePath(edge: Edge, sourceNode: Node, targetNode: Node): string {
    if (edge.isSelfLoop) {
      return this.calculateSelfLoopPath(edge, sourceNode);
    }

    const start = sourceNode.getConnectionPoint(targetNode.cx, targetNode.cy);
    const end = targetNode.getConnectionPoint(sourceNode.cx, sourceNode.cy);

    if (edge.curveOffset === 0) {
      return `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
    }

    // Curved path for parallel edges
    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2;
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const len = Math.sqrt(dx * dx + dy * dy);

    if (len === 0) return `M ${start.x} ${start.y} L ${end.x} ${end.y}`;

    const perpX = -dy / len;
    const perpY = dx / len;
    const ctrlX = midX + perpX * edge.curveOffset;
    const ctrlY = midY + perpY * edge.curveOffset;

    const newStart = sourceNode.getConnectionPoint(ctrlX, ctrlY);
    const newEnd = targetNode.getConnectionPoint(ctrlX, ctrlY);

    return `M ${newStart.x} ${newStart.y} Q ${ctrlX} ${ctrlY} ${newEnd.x} ${newEnd.y}`;
  }

  /**
   * Calculate self-loop path data
   */
  private static calculateSelfLoopPath(edge: Edge, node: Node): string {
    const angle = edge.selfLoopAngle;
    const loopSize = Math.max(node.rx, node.ry) * 1.5;

    const startAngle = angle - Math.PI / 6;
    const endAngle = angle + Math.PI / 6;

    const startX = node.cx + node.rx * Math.cos(startAngle);
    const startY = node.cy + node.ry * Math.sin(startAngle);
    const endX = node.cx + node.rx * Math.cos(endAngle);
    const endY = node.cy + node.ry * Math.sin(endAngle);

    const ctrl1X = node.cx + (node.rx + loopSize) * Math.cos(startAngle);
    const ctrl1Y = node.cy + (node.ry + loopSize) * Math.sin(startAngle);
    const ctrl2X = node.cx + (node.rx + loopSize) * Math.cos(endAngle);
    const ctrl2Y = node.cy + (node.ry + loopSize) * Math.sin(endAngle);

    return `M ${startX} ${startY} C ${ctrl1X} ${ctrl1Y} ${ctrl2X} ${ctrl2Y} ${endX} ${endY}`;
  }

  /**
   * Convert a Group to SVG element string
   */
  private static groupToSvgElement(group: Group, indent: string = '  '): string {
    const lines: string[] = [];

    lines.push(`${indent}<g id="${group.id}" data-group-type="group">`);

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

    attrs.push(`stroke="${style.stroke}"`);
    // Only output stroke-width if > 0
    if (style.strokeWidth > 0) {
      attrs.push(`stroke-width="${style.strokeWidth}"`);
    }

    if (style.opacity !== 1) {
      attrs.push(`opacity="${style.opacity}"`);
    }

    if (style.strokeDasharray) {
      attrs.push(`stroke-dasharray="${style.strokeDasharray}"`);
    }

    if (style.strokeLinecap !== 'butt') {
      attrs.push(`stroke-linecap="${style.strokeLinecap}"`);
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

    const shapes: Shape[] = [];
    const gm = getGraphManager();

    // First, parse nodes to register them with GraphManager
    const nodeElements = svg.querySelectorAll('g[data-graph-type="node"]');
    nodeElements.forEach(el => {
      const ellipse = el.querySelector('ellipse');
      if (ellipse) {
        const style = this.parseStyleFromElement(ellipse);
        const node = Node.fromElement(el as SVGGElement, style);
        if (node) {
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
    const edgeElements = svg.querySelectorAll('path[data-graph-type="edge"]');
    edgeElements.forEach(el => {
      const style = this.parseEdgeStyleFromElement(el as SVGPathElement);
      const edge = Edge.fromElement(el as SVGPathElement, style);
      if (edge) {
        shapes.push(edge);
        // Register with GraphManager
        gm.registerEdge(edge.id, edge.sourceNodeId, edge.targetNodeId);
      }
    });

    // Helper function to check if element is inside a group or node
    const isInsideGroupOrNode = (el: Element): boolean => {
      let parent: Element | null = el.parentElement;
      while (parent && parent !== (svg as Element)) {
        if (parent.getAttribute('data-group-type') === 'group' ||
            parent.getAttribute('data-graph-type') === 'node') {
          return true;
        }
        parent = parent.parentElement;
      }
      return false;
    };

    // Parse line elements (excluding edges and those inside groups)
    const lines = svg.querySelectorAll('line');
    lines.forEach(el => {
      if (isInsideGroupOrNode(el)) return;

      const style = this.parseStyleFromElement(el);
      const markerStart = this.parseMarkerType(el.getAttribute('marker-start'));
      const markerEnd = this.parseMarkerType(el.getAttribute('marker-end'));
      const line = Line.fromElement(el, style, markerStart, markerEnd);
      const transform = parseTransform(el.getAttribute('transform'));
      this.applyTransformToShape(line, transform);
      shapes.push(line);
    });

    // Parse ellipse elements (excluding those inside nodes or groups)
    const ellipses = svg.querySelectorAll('ellipse');
    ellipses.forEach(el => {
      if (isInsideGroupOrNode(el)) return;

      const style = this.parseStyleFromElement(el);
      const ellipse = Ellipse.fromElement(el, style);
      const transform = parseTransform(el.getAttribute('transform'));
      this.applyTransformToShape(ellipse, transform);
      shapes.push(ellipse);
    });

    // Parse circle elements (convert to ellipse, excluding those inside groups)
    const circles = svg.querySelectorAll('circle');
    circles.forEach(el => {
      if (isInsideGroupOrNode(el)) return;

      const style = this.parseStyleFromElement(el);
      const cx = parseFloat(el.getAttribute('cx') || '0');
      const cy = parseFloat(el.getAttribute('cy') || '0');
      const r = parseFloat(el.getAttribute('r') || '0');
      const ellipse = Ellipse.fromCenter({ x: cx, y: cy }, r, r, style);
      const transform = parseTransform(el.getAttribute('transform'));
      this.applyTransformToShape(ellipse, transform);
      shapes.push(ellipse);
    });

    // Parse rect elements (excluding those inside groups)
    const rects = svg.querySelectorAll('rect');
    rects.forEach(el => {
      if (isInsideGroupOrNode(el)) return;

      const style = this.parseStyleFromElement(el);
      const rectangle = Rectangle.fromElement(el, style);
      const transform = parseTransform(el.getAttribute('transform'));
      this.applyTransformToShape(rectangle, transform);
      shapes.push(rectangle);
    });

    // Parse text elements (excluding those inside nodes or groups)
    const texts = svg.querySelectorAll('text');
    texts.forEach(el => {
      if (isInsideGroupOrNode(el)) return;

      const style = this.parseStyleFromElement(el);
      const text = Text.fromElement(el, style);
      const transform = parseTransform(el.getAttribute('transform'));
      this.applyTransformToShape(text, transform);
      shapes.push(text);
    });

    // Parse polygon elements (excluding those inside groups)
    const polygons = svg.querySelectorAll('polygon');
    polygons.forEach(el => {
      if (isInsideGroupOrNode(el)) return;

      const style = this.parseStyleFromElement(el);
      const polygon = Polygon.fromElement(el, style);
      const transform = parseTransform(el.getAttribute('transform'));
      this.applyTransformToShape(polygon, transform);
      shapes.push(polygon);
    });

    // Parse polyline elements (excluding those inside groups)
    const polylines = svg.querySelectorAll('polyline');
    polylines.forEach(el => {
      if (isInsideGroupOrNode(el)) return;

      const style = this.parseStyleFromElement(el);
      const polyline = Polyline.fromElement(el, style);
      const transform = parseTransform(el.getAttribute('transform'));
      this.applyTransformToShape(polyline, transform);
      shapes.push(polyline);
    });

    // Parse image elements (excluding those inside groups)
    const images = svg.querySelectorAll('image');
    images.forEach(el => {
      if (isInsideGroupOrNode(el)) return;

      const style = this.parseStyleFromElement(el);
      const image = Image.fromElement(el as SVGImageElement, style);
      const transform = parseTransform(el.getAttribute('transform'));
      this.applyTransformToShape(image, transform);
      shapes.push(image);
    });

    // Parse path elements (excluding those inside groups and edges)
    const allPaths = svg.querySelectorAll('path');
    allPaths.forEach(el => {
      if (isInsideGroupOrNode(el)) return;
      // Skip if it's an edge
      if (el.getAttribute('data-graph-type') === 'edge') return;

      const dAttr = el.getAttribute('d');
      if (!dAttr) return;

      const style = this.parseStyleFromElement(el as SVGElement);
      const path = Path.fromPathData(dAttr, style);
      if (path.commands.length > 0) {
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

    return new Group(id, children, { ...DEFAULT_STYLE });
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
          const style = this.parseStyleFromElement(ellipse);
          const node = Node.fromElement(el as SVGGElement, style);
          if (node) {
            this.applyTransformToShape(node, combinedTransform);
            gm.registerNode(node.id);
            gm.setNodeShape(node.id, node);
            return node;
          }
        }
      }
      return null;
    }

    const style = this.parseStyleFromElement(el);
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
            const path = Path.fromPathData(dAttr, style);
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

    // Apply combined transform to the shape
    if (shape) {
      this.applyTransformToShape(shape, combinedTransform);
    }

    return shape;
  }

  /**
   * Parse style attributes from edge path element
   */
  private static parseEdgeStyleFromElement(el: SVGPathElement): ShapeStyle {
    return {
      fill: DEFAULT_STYLE.fill,
      fillNone: true,
      stroke: el.getAttribute('stroke') || DEFAULT_STYLE.stroke,
      strokeWidth: parseFloat(el.getAttribute('stroke-width') || String(DEFAULT_STYLE.strokeWidth)),
      opacity: parseFloat(el.getAttribute('opacity') || '1'),
      strokeDasharray: el.getAttribute('stroke-dasharray') || '',
      strokeLinecap: (el.getAttribute('stroke-linecap') as StrokeLinecap) || DEFAULT_STYLE.strokeLinecap
    };
  }

  /**
   * Parse style attributes from SVG element
   */
  private static parseStyleFromElement(el: SVGElement): ShapeStyle {
    const fill = el.getAttribute('fill') || DEFAULT_STYLE.fill;
    const fillNone = fill === 'none';

    return {
      fill: fillNone ? DEFAULT_STYLE.fill : fill,
      fillNone,
      stroke: el.getAttribute('stroke') || DEFAULT_STYLE.stroke,
      strokeWidth: parseFloat(el.getAttribute('stroke-width') || String(DEFAULT_STYLE.strokeWidth)),
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

    // Extract marker type from url(#marker-{type}-{position})
    const match = markerAttr.match(/url\(#marker-([^-]+(?:-open)?)-(?:start|end)\)/);
    if (match) {
      const type = match[1];
      if (type === 'triangle' || type === 'triangle-open' || type === 'circle' || type === 'diamond') {
        return type;
      }
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
}
