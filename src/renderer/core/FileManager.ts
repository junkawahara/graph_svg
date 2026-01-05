import { ShapeStyle, DEFAULT_STYLE, StrokeLinecap, MarkerType, EdgeDirection, CanvasSize, DEFAULT_CANVAS_SIZE } from '../../shared/types';
import { Shape } from '../shapes/Shape';
import { Line } from '../shapes/Line';
import { Ellipse } from '../shapes/Ellipse';
import { Rectangle } from '../shapes/Rectangle';
import { Text } from '../shapes/Text';
import { Node } from '../shapes/Node';
import { Edge } from '../shapes/Edge';
import { getGraphManager } from './GraphManager';

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

    // Collect all used markers
    shapes.forEach(shape => {
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
    });

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
      const escapedContent = this.escapeXml(shape.content);
      return `  <text id="${shape.id}" x="${shape.x}" y="${shape.y}" font-size="${shape.fontSize}" font-family="${shape.fontFamily}" font-weight="${shape.fontWeight}" dominant-baseline="hanging" ${style}>${escapedContent}</text>`;
    } else if (shape instanceof Node) {
      return this.nodeToSvgElement(shape);
    } else if (shape instanceof Edge) {
      return this.edgeToSvgElement(shape);
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
    attrs.push(`stroke-width="${style.strokeWidth}"`);

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

    // Parse line elements (excluding edges)
    const lines = svg.querySelectorAll('line');
    lines.forEach(el => {
      const style = this.parseStyleFromElement(el);
      const markerStart = this.parseMarkerType(el.getAttribute('marker-start'));
      const markerEnd = this.parseMarkerType(el.getAttribute('marker-end'));
      const line = Line.fromElement(el, style, markerStart, markerEnd);
      shapes.push(line);
    });

    // Parse ellipse elements (excluding those inside nodes)
    const ellipses = svg.querySelectorAll('ellipse');
    ellipses.forEach(el => {
      // Skip ellipses that are part of nodes
      if (el.parentElement?.getAttribute('data-graph-type') === 'node') return;

      const style = this.parseStyleFromElement(el);
      const ellipse = Ellipse.fromElement(el, style);
      shapes.push(ellipse);
    });

    // Parse circle elements (convert to ellipse)
    const circles = svg.querySelectorAll('circle');
    circles.forEach(el => {
      const style = this.parseStyleFromElement(el);
      const cx = parseFloat(el.getAttribute('cx') || '0');
      const cy = parseFloat(el.getAttribute('cy') || '0');
      const r = parseFloat(el.getAttribute('r') || '0');
      const ellipse = Ellipse.fromCenter({ x: cx, y: cy }, r, r, style);
      shapes.push(ellipse);
    });

    // Parse rect elements
    const rects = svg.querySelectorAll('rect');
    rects.forEach(el => {
      const style = this.parseStyleFromElement(el);
      const rectangle = Rectangle.fromElement(el, style);
      shapes.push(rectangle);
    });

    // Parse text elements (excluding those inside nodes)
    const texts = svg.querySelectorAll('text');
    texts.forEach(el => {
      // Skip text elements that are part of nodes
      if (el.parentElement?.getAttribute('data-graph-type') === 'node') return;

      const style = this.parseStyleFromElement(el);
      const text = Text.fromElement(el, style);
      shapes.push(text);
    });

    return { shapes, canvasSize };
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
}
