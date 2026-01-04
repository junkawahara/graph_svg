import { Point } from '../../shared/types';
import { Shape } from '../shapes/Shape';

export type HandleType = 'corner' | 'edge' | 'endpoint';
export type HandlePosition = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'start' | 'end';

/**
 * Resize handle interface
 */
export interface Handle {
  /** Handle position identifier */
  position: HandlePosition;

  /** Handle type */
  type: HandleType;

  /** Get current position */
  getPosition(): Point;

  /** Check if point hits this handle */
  hitTest(point: Point, tolerance?: number): boolean;

  /** Handle drag operation - returns updated shape properties */
  onDrag(point: Point): void;
}

/**
 * Handle collection for a shape
 */
export interface HandleSet {
  /** The shape these handles belong to */
  shape: Shape;

  /** All handles for this shape */
  handles: Handle[];

  /** SVG group element containing handle visuals */
  element: SVGGElement | null;

  /** Render handles to SVG */
  render(svg: SVGSVGElement): SVGGElement;

  /** Update handle positions */
  update(): void;

  /** Remove handles from SVG */
  remove(): void;

  /** Find handle at point */
  findHandleAt(point: Point): Handle | null;
}

/**
 * Create a handle circle element
 */
export function createHandleElement(x: number, y: number, cursor: string): SVGCircleElement {
  const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  circle.setAttribute('cx', String(x));
  circle.setAttribute('cy', String(y));
  circle.setAttribute('r', '5');
  circle.setAttribute('fill', '#ffffff');
  circle.setAttribute('stroke', '#0e639c');
  circle.setAttribute('stroke-width', '1.5');
  circle.style.cursor = cursor;
  circle.classList.add('resize-handle');
  return circle;
}

/**
 * Get cursor style for handle position
 */
export function getCursorForHandle(position: HandlePosition): string {
  switch (position) {
    case 'nw':
    case 'se':
      return 'nwse-resize';
    case 'ne':
    case 'sw':
      return 'nesw-resize';
    case 'n':
    case 's':
      return 'ns-resize';
    case 'e':
    case 'w':
      return 'ew-resize';
    case 'start':
    case 'end':
      return 'move';
    default:
      return 'pointer';
  }
}
