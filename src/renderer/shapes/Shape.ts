import { Point, Bounds, ShapeStyle, ShapeData } from '../../shared/types';

/**
 * Base interface for all shapes
 */
export interface Shape {
  /** Unique identifier */
  readonly id: string;

  /** Shape type */
  readonly type: string;

  /** Visual style */
  style: ShapeStyle;

  /** SVG element for this shape */
  element: SVGElement | null;

  /**
   * Create and return the SVG element
   */
  render(): SVGElement;

  /**
   * Update the SVG element to reflect current state
   */
  updateElement(): void;

  /**
   * Check if point is within shape (for hit testing)
   */
  hitTest(point: Point, tolerance?: number): boolean;

  /**
   * Get bounding box
   */
  getBounds(): Bounds;

  /**
   * Move shape by delta
   */
  move(dx: number, dy: number): void;

  /**
   * Serialize to data object
   */
  serialize(): ShapeData;

  /**
   * Create a deep copy
   */
  clone(): Shape;

  /**
   * Apply transform to shape (modifies coordinates in place)
   * @param translateX X translation
   * @param translateY Y translation
   * @param scaleX X scale factor
   * @param scaleY Y scale factor
   */
  applyTransform?(translateX: number, translateY: number, scaleX: number, scaleY: number): void;
}

/**
 * Apply style to SVG element
 */
export function applyStyle(element: SVGElement, style: ShapeStyle): void {
  if (style.fillNone) {
    element.setAttribute('fill', 'none');
  } else {
    element.setAttribute('fill', style.fill);
  }
  element.setAttribute('stroke', style.stroke);
  element.setAttribute('stroke-width', String(style.strokeWidth));
  element.setAttribute('opacity', String(style.opacity));

  if (style.strokeDasharray) {
    element.setAttribute('stroke-dasharray', style.strokeDasharray);
  } else {
    element.removeAttribute('stroke-dasharray');
  }

  element.setAttribute('stroke-linecap', style.strokeLinecap);
}
