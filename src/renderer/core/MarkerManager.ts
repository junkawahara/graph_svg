import { MarkerType } from '../../shared/types';

interface MarkerDefinition {
  viewBox: string;
  refX: number;
  refY: number;
  path: string;
  filled: boolean;
  strokeWidth?: number;
}

const MARKER_DEFS: Record<Exclude<MarkerType, 'none'>, MarkerDefinition> = {
  'triangle': {
    viewBox: '0 0 10 10',
    refX: 9,
    refY: 5,
    path: 'M 0 0 L 10 5 L 0 10 Z',
    filled: true
  },
  'triangle-open': {
    viewBox: '0 0 10 10',
    refX: 9,
    refY: 5,
    path: 'M 0 1 L 8 5 L 0 9',
    filled: false,
    strokeWidth: 1.5
  },
  'circle': {
    viewBox: '0 0 10 10',
    refX: 5,
    refY: 5,
    path: 'M 5 0 A 5 5 0 1 1 5 10 A 5 5 0 1 1 5 0 Z',
    filled: true
  },
  'diamond': {
    viewBox: '0 0 10 10',
    refX: 5,
    refY: 5,
    path: 'M 5 0 L 10 5 L 5 10 L 0 5 Z',
    filled: true
  }
};

/**
 * Manages SVG marker definitions for arrow heads
 */
export class MarkerManager {
  private defs: SVGDefsElement;
  private svg: SVGSVGElement;

  constructor(svg: SVGSVGElement) {
    this.svg = svg;
    this.defs = this.createDefs();
    this.registerAllMarkers();
  }

  /**
   * Create and append defs element to SVG
   */
  private createDefs(): SVGDefsElement {
    // Check if defs already exists
    let defs = this.svg.querySelector('defs');
    if (!defs) {
      defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
      this.svg.insertBefore(defs, this.svg.firstChild);
    }
    return defs as SVGDefsElement;
  }

  /**
   * Register all marker definitions
   */
  private registerAllMarkers(): void {
    const markerTypes: Exclude<MarkerType, 'none'>[] = ['triangle', 'triangle-open', 'circle', 'diamond'];

    for (const type of markerTypes) {
      // Create end marker (points forward)
      this.createMarker(type, 'end', 'auto');
      // Create start marker (points backward)
      this.createMarker(type, 'start', 'auto-start-reverse');
    }
  }

  /**
   * Create a single marker element
   */
  private createMarker(type: Exclude<MarkerType, 'none'>, position: 'start' | 'end', orient: string): void {
    const def = MARKER_DEFS[type];
    const id = this.getMarkerId(type, position);

    const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
    marker.setAttribute('id', id);
    marker.setAttribute('viewBox', def.viewBox);
    marker.setAttribute('refX', String(def.refX));
    marker.setAttribute('refY', String(def.refY));
    marker.setAttribute('markerWidth', '4');
    marker.setAttribute('markerHeight', '4');
    marker.setAttribute('markerUnits', 'strokeWidth');
    marker.setAttribute('orient', orient);

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', def.path);

    if (def.filled) {
      path.setAttribute('fill', 'currentColor');
      path.setAttribute('stroke', 'none');
    } else {
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', 'currentColor');
      path.setAttribute('stroke-width', String(def.strokeWidth || 1));
      path.setAttribute('stroke-linecap', 'round');
      path.setAttribute('stroke-linejoin', 'round');
    }

    marker.appendChild(path);
    this.defs.appendChild(marker);
  }

  /**
   * Get marker ID for a given type and position
   */
  getMarkerId(type: MarkerType, position: 'start' | 'end'): string {
    if (type === 'none') return '';
    return `marker-${type}-${position}`;
  }

  /**
   * Get marker URL reference for use in marker-start/marker-end attributes
   */
  getMarkerUrl(type: MarkerType, position: 'start' | 'end'): string {
    if (type === 'none') return '';
    return `url(#${this.getMarkerId(type, position)})`;
  }

  /**
   * Get the defs element (for serialization)
   */
  getDefsElement(): SVGDefsElement {
    return this.defs;
  }
}

// Singleton instance
let markerManagerInstance: MarkerManager | null = null;

/**
 * Initialize the marker manager (call once when canvas is ready)
 */
export function initMarkerManager(svg: SVGSVGElement): MarkerManager {
  markerManagerInstance = new MarkerManager(svg);
  return markerManagerInstance;
}

/**
 * Get the marker manager instance
 */
export function getMarkerManager(): MarkerManager | null {
  return markerManagerInstance;
}
