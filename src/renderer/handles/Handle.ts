import { Point } from '../../shared/types';
import { Shape } from '../shapes/Shape';

export type HandleType = 'corner' | 'edge' | 'endpoint' | 'rotate';
export type HandlePosition = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'start' | 'end' | 'rotate';

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
  onDrag(point: Point, event?: MouseEvent): void;
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
    case 'rotate':
      return 'crosshair';
    default:
      return 'pointer';
  }
}

/**
 * Create a rotation handle element (circle with rotation icon appearance)
 */
export function createRotationHandleElement(x: number, y: number): SVGGElement {
  const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  group.classList.add('rotation-handle');
  group.style.cursor = 'crosshair';

  // Circle background
  const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  circle.setAttribute('cx', String(x));
  circle.setAttribute('cy', String(y));
  circle.setAttribute('r', '6');
  circle.setAttribute('fill', '#ffffff');
  circle.setAttribute('stroke', '#0e639c');
  circle.setAttribute('stroke-width', '1.5');
  group.appendChild(circle);

  // Rotation arrow icon (simplified arc with arrow)
  const arc = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  const r = 3;
  const cx = x;
  const cy = y;
  // Draw a small arc with an arrow tip
  arc.setAttribute('d', `M ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx} ${cy - r}`);
  arc.setAttribute('fill', 'none');
  arc.setAttribute('stroke', '#0e639c');
  arc.setAttribute('stroke-width', '1.2');
  arc.setAttribute('stroke-linecap', 'round');
  group.appendChild(arc);

  // Arrow tip
  const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  arrow.setAttribute('d', `M ${cx - 1} ${cy - r - 2} L ${cx} ${cy - r} L ${cx + 2} ${cy - r - 1}`);
  arrow.setAttribute('fill', 'none');
  arrow.setAttribute('stroke', '#0e639c');
  arrow.setAttribute('stroke-width', '1.2');
  arrow.setAttribute('stroke-linecap', 'round');
  arrow.setAttribute('stroke-linejoin', 'round');
  group.appendChild(arrow);

  return group;
}

/**
 * Create a rotation guide line from shape center to rotation handle
 */
export function createRotationGuideLine(x1: number, y1: number, x2: number, y2: number): SVGLineElement {
  const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  line.setAttribute('x1', String(x1));
  line.setAttribute('y1', String(y1));
  line.setAttribute('x2', String(x2));
  line.setAttribute('y2', String(y2));
  line.setAttribute('stroke', '#0e639c');
  line.setAttribute('stroke-width', '1');
  line.setAttribute('stroke-dasharray', '3,3');
  line.classList.add('rotation-guide-line');
  return line;
}

/**
 * Result of aspect ratio constrained resize calculation
 */
export interface ConstrainedResizeResult {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Calculate constrained resize to maintain aspect ratio
 * @param originalBounds Original bounds before resize
 * @param newWidth Proposed new width
 * @param newHeight Proposed new height
 * @param newX Proposed new X position
 * @param newY Proposed new Y position
 * @param position Handle position (nw, ne, se, sw)
 * @param minSize Minimum allowed size
 * @returns Constrained bounds that maintain original aspect ratio
 */
export function constrainAspectRatio(
  originalBounds: { x: number; y: number; width: number; height: number },
  newWidth: number,
  newHeight: number,
  newX: number,
  newY: number,
  position: HandlePosition,
  minSize: number = 6
): ConstrainedResizeResult {
  const aspectRatio = originalBounds.width / originalBounds.height;

  // Determine which dimension changed more (proportionally)
  const widthChange = Math.abs(newWidth - originalBounds.width) / originalBounds.width;
  const heightChange = Math.abs(newHeight - originalBounds.height) / originalBounds.height;

  let constrainedWidth: number;
  let constrainedHeight: number;

  if (widthChange >= heightChange) {
    // Width changed more, adjust height to maintain aspect ratio
    constrainedWidth = Math.max(newWidth, minSize);
    constrainedHeight = constrainedWidth / aspectRatio;
  } else {
    // Height changed more, adjust width to maintain aspect ratio
    constrainedHeight = Math.max(newHeight, minSize);
    constrainedWidth = constrainedHeight * aspectRatio;
  }

  // Ensure minimum size
  if (constrainedWidth < minSize) {
    constrainedWidth = minSize;
    constrainedHeight = constrainedWidth / aspectRatio;
  }
  if (constrainedHeight < minSize) {
    constrainedHeight = minSize;
    constrainedWidth = constrainedHeight * aspectRatio;
  }

  // Calculate position based on which corner is anchored (opposite corner)
  let constrainedX = newX;
  let constrainedY = newY;

  switch (position) {
    case 'nw':
      // SE corner is anchored
      constrainedX = originalBounds.x + originalBounds.width - constrainedWidth;
      constrainedY = originalBounds.y + originalBounds.height - constrainedHeight;
      break;
    case 'ne':
      // SW corner is anchored
      constrainedX = originalBounds.x;
      constrainedY = originalBounds.y + originalBounds.height - constrainedHeight;
      break;
    case 'se':
      // NW corner is anchored
      constrainedX = originalBounds.x;
      constrainedY = originalBounds.y;
      break;
    case 'sw':
      // NE corner is anchored
      constrainedX = originalBounds.x + originalBounds.width - constrainedWidth;
      constrainedY = originalBounds.y;
      break;
  }

  return {
    x: constrainedX,
    y: constrainedY,
    width: constrainedWidth,
    height: constrainedHeight
  };
}
