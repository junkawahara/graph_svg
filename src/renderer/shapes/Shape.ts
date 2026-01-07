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

  /** Rotation angle in degrees (0-360) */
  rotation: number;

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
   * Get bounding box (axis-aligned, accounting for rotation)
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

  /**
   * Get the rotation center point of the shape
   */
  getRotationCenter(): Point;

  /**
   * Set the rotation angle in degrees
   */
  setRotation(angle: number): void;
}

/**
 * Apply rotation transform to SVG element
 * @param element SVG element to rotate
 * @param rotation Rotation angle in degrees
 * @param centerX Rotation center X coordinate
 * @param centerY Rotation center Y coordinate
 */
export function applyRotation(element: SVGElement, rotation: number, centerX: number, centerY: number): void {
  if (rotation === 0) {
    element.removeAttribute('transform');
  } else {
    element.setAttribute('transform', `rotate(${rotation} ${centerX} ${centerY})`);
  }
}

/**
 * Normalize rotation angle to 0-360 range
 */
export function normalizeRotation(angle: number): number {
  angle = angle % 360;
  if (angle < 0) angle += 360;
  return angle;
}

/**
 * Rotate a point around a center point
 */
export function rotatePoint(point: Point, center: Point, angleDegrees: number): Point {
  const angleRad = angleDegrees * Math.PI / 180;
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  return {
    x: center.x + dx * cos - dy * sin,
    y: center.y + dx * sin + dy * cos
  };
}

/**
 * Calculate axis-aligned bounding box for a rotated rectangle
 */
export function getRotatedBounds(bounds: Bounds, rotation: number): Bounds {
  if (rotation === 0) {
    return bounds;
  }

  const center = {
    x: bounds.x + bounds.width / 2,
    y: bounds.y + bounds.height / 2
  };

  // Get the four corners of the original bounds
  const corners: Point[] = [
    { x: bounds.x, y: bounds.y },
    { x: bounds.x + bounds.width, y: bounds.y },
    { x: bounds.x + bounds.width, y: bounds.y + bounds.height },
    { x: bounds.x, y: bounds.y + bounds.height }
  ];

  // Rotate all corners
  const rotatedCorners = corners.map(c => rotatePoint(c, center, rotation));

  // Find min/max to get axis-aligned bounds
  let minX = rotatedCorners[0].x;
  let minY = rotatedCorners[0].y;
  let maxX = rotatedCorners[0].x;
  let maxY = rotatedCorners[0].y;

  for (const p of rotatedCorners) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  };
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
