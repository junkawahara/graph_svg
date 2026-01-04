import { ShapeStyle, DEFAULT_STYLE, StrokeLinecap, MarkerType } from '../../shared/types';
import { Shape } from '../shapes/Shape';
import { Line } from '../shapes/Line';
import { Ellipse } from '../shapes/Ellipse';
import { Rectangle } from '../shapes/Rectangle';
import { Text } from '../shapes/Text';

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
   * Generate marker definitions for lines that use them
   */
  private static generateMarkerDefs(shapes: Shape[]): string | null {
    const usedMarkers = new Set<string>();

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
    });

    if (usedMarkers.size === 0) return null;

    const defsLines: string[] = ['  <defs>'];

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
    }

    return '';
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
   * Parse SVG string and return shapes
   */
  static parse(svgContent: string): Shape[] {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgContent, 'image/svg+xml');
    const svg = doc.querySelector('svg');

    if (!svg) {
      console.error('No SVG element found in file');
      return [];
    }

    const shapes: Shape[] = [];

    // Parse line elements
    const lines = svg.querySelectorAll('line');
    lines.forEach(el => {
      const style = this.parseStyleFromElement(el);
      const markerStart = this.parseMarkerType(el.getAttribute('marker-start'));
      const markerEnd = this.parseMarkerType(el.getAttribute('marker-end'));
      const line = Line.fromElement(el, style, markerStart, markerEnd);
      shapes.push(line);
    });

    // Parse ellipse elements
    const ellipses = svg.querySelectorAll('ellipse');
    ellipses.forEach(el => {
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

    // Parse text elements
    const texts = svg.querySelectorAll('text');
    texts.forEach(el => {
      const style = this.parseStyleFromElement(el);
      const text = Text.fromElement(el, style);
      shapes.push(text);
    });

    return shapes;
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
