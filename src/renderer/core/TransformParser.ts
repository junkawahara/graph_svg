import { Point } from '../../shared/types';

/**
 * Parsed transform result
 */
export interface ParsedTransform {
  translateX: number;
  translateY: number;
  scaleX: number;
  scaleY: number;
}

/**
 * Identity transform (no change)
 */
export const IDENTITY_TRANSFORM: ParsedTransform = {
  translateX: 0,
  translateY: 0,
  scaleX: 1,
  scaleY: 1
};

/**
 * Parse SVG transform attribute string
 * Supports: translate(x, y), scale(sx, sy)
 * Ignores: rotate, skewX, skewY, matrix (logs warning)
 */
export function parseTransform(transformStr: string | null): ParsedTransform {
  if (!transformStr) {
    return { ...IDENTITY_TRANSFORM };
  }

  let translateX = 0;
  let translateY = 0;
  let scaleX = 1;
  let scaleY = 1;

  // Match transform functions: name(params)
  const transformRegex = /(\w+)\s*\(([^)]+)\)/g;
  let match: RegExpExecArray | null;

  while ((match = transformRegex.exec(transformStr)) !== null) {
    const funcName = match[1].toLowerCase();
    const params = match[2].split(/[\s,]+/).map(s => parseFloat(s.trim()));

    switch (funcName) {
      case 'translate':
        translateX += params[0] || 0;
        translateY += params[1] ?? params[0] ?? 0; // If only one param, use it for both or 0
        if (params.length === 1) {
          translateY = 0; // translate(x) means translate(x, 0)
        }
        break;

      case 'scale':
        const sx = params[0] ?? 1;
        const sy = params[1] ?? sx; // If only one param, uniform scale
        // Scale is multiplicative
        scaleX *= sx;
        scaleY *= sy;
        // Scale also affects translation (scale happens at origin)
        translateX *= sx;
        translateY *= sy;
        break;

      case 'rotate':
      case 'skewx':
      case 'skewy':
      case 'matrix':
        console.warn(`Transform "${funcName}" is not supported and will be ignored`);
        break;

      default:
        console.warn(`Unknown transform function "${funcName}" ignored`);
    }
  }

  return { translateX, translateY, scaleX, scaleY };
}

/**
 * Combine two transforms (apply child transform after parent)
 * Result = parent transform followed by child transform
 */
export function combineTransforms(parent: ParsedTransform, child: ParsedTransform): ParsedTransform {
  // Child scale applies to child translate
  // Combined: first parent, then child
  // T_combined = T_parent * T_child
  // For point P: P' = scale_parent * (scale_child * P + translate_child) + translate_parent
  //            = scale_parent * scale_child * P + scale_parent * translate_child + translate_parent

  return {
    scaleX: parent.scaleX * child.scaleX,
    scaleY: parent.scaleY * child.scaleY,
    translateX: parent.scaleX * child.translateX + parent.translateX,
    translateY: parent.scaleY * child.translateY + parent.translateY
  };
}

/**
 * Apply transform to a point
 */
export function applyTransformToPoint(point: Point, transform: ParsedTransform): Point {
  return {
    x: point.x * transform.scaleX + transform.translateX,
    y: point.y * transform.scaleY + transform.translateY
  };
}

/**
 * Check if transform is identity (no change)
 */
export function isIdentityTransform(transform: ParsedTransform): boolean {
  return transform.translateX === 0 &&
         transform.translateY === 0 &&
         transform.scaleX === 1 &&
         transform.scaleY === 1;
}
