import { Shape } from '../shapes/Shape';
import { Bounds } from '../../shared/types';

/**
 * Extended bounds with isEmpty flag
 */
export interface ContentBounds extends Bounds {
  isEmpty: boolean;
}

/**
 * Calculate the combined bounding box of all shapes
 * @param shapes Array of shapes to calculate bounds for
 * @returns ContentBounds with isEmpty flag
 */
export function calculateContentBounds(shapes: Shape[]): ContentBounds {
  if (shapes.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0, isEmpty: true };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const shape of shapes) {
    const bounds = shape.getBounds();
    minX = Math.min(minX, bounds.x);
    minY = Math.min(minY, bounds.y);
    maxX = Math.max(maxX, bounds.x + bounds.width);
    maxY = Math.max(maxY, bounds.y + bounds.height);
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
    isEmpty: false
  };
}

/**
 * Calculate the fitted canvas size and offset for shapes
 * @param shapes Array of shapes
 * @param margin Margin to add around content
 * @returns Object with newWidth, newHeight, offsetX, offsetY
 */
export function calculateFitToContent(
  shapes: Shape[],
  margin: number
): { newWidth: number; newHeight: number; offsetX: number; offsetY: number } | null {
  const bounds = calculateContentBounds(shapes);

  if (bounds.isEmpty) {
    return null;
  }

  // Calculate offset to move shapes to origin + margin
  const offsetX = margin - bounds.x;
  const offsetY = margin - bounds.y;

  // Calculate new canvas size
  const newWidth = Math.max(100, Math.ceil(bounds.width + margin * 2));
  const newHeight = Math.max(100, Math.ceil(bounds.height + margin * 2));

  return { newWidth, newHeight, offsetX, offsetY };
}
