import { Point } from '../../shared/types';
import { round3 } from './MathUtils';

/**
 * Parsed transform result
 */
export interface ParsedTransform {
  translateX: number;
  translateY: number;
  scaleX: number;
  scaleY: number;
  rotation: number;  // Rotation angle in degrees
  rotationCenterX: number;  // Rotation center X (for rotate(angle, cx, cy))
  rotationCenterY: number;  // Rotation center Y (for rotate(angle, cx, cy))
  skewX: number;  // Skew angle along X axis in degrees
  skewY: number;  // Skew angle along Y axis in degrees
}

/**
 * Identity transform (no change)
 */
export const IDENTITY_TRANSFORM: ParsedTransform = {
  translateX: 0,
  translateY: 0,
  scaleX: 1,
  scaleY: 1,
  rotation: 0,
  rotationCenterX: 0,
  rotationCenterY: 0,
  skewX: 0,
  skewY: 0
};

/**
 * Decompose a 2D transformation matrix into translate, scale, rotation, and skew.
 * Matrix format: matrix(a, b, c, d, e, f) represents:
 * | a c e |
 * | b d f |
 * | 0 0 1 |
 *
 * The decomposition assumes: Translate * Rotate * Skew * Scale
 * Returns: { translateX, translateY, scaleX, scaleY, rotation, skewX, skewY }
 */
function decomposeMatrix(a: number, b: number, c: number, d: number, e: number, f: number): {
  translateX: number;
  translateY: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  skewX: number;
  skewY: number;
} {
  // Translation is directly from e, f
  const translateX = e;
  const translateY = f;

  // Calculate scale and rotation from the 2x2 matrix [a, c; b, d]
  // Scale X is the length of the first column vector [a, b]
  let scaleX = Math.sqrt(a * a + b * b);

  // Rotation angle from the first column vector
  let rotation = Math.atan2(b, a) * (180 / Math.PI);

  // Normalize: prefer -90° to +90° range for rotation by flipping scaleX if needed
  // This correctly handles horizontal flip (matrix(-1,0,0,1,...)) as scaleX=-1, rotation=0
  // instead of scaleX=1, rotation=180°
  if (Math.abs(rotation) > 90) {
    scaleX = -scaleX;
    rotation = rotation > 0 ? rotation - 180 : rotation + 180;
  }

  // Scale Y is derived from the determinant divided by scaleX
  // Determinant = a*d - b*c
  // This preserves the sign for reflection/flip
  const det = a * d - b * c;
  const scaleY = scaleX !== 0 ? det / scaleX : Math.sqrt(c * c + d * d);

  // Extract skew by removing rotation from the matrix
  // After removing rotation, skew can be calculated from the shear component
  let skewX = 0;
  let skewY = 0;

  if (scaleX !== 0) {
    // Calculate the skew angle from the dot product of the two column vectors
    // divided by the product of their lengths
    const cosR = Math.cos(-rotation * Math.PI / 180);
    const sinR = Math.sin(-rotation * Math.PI / 180);

    // Remove rotation to get the skew+scale matrix
    const a2 = a * cosR - b * sinR;
    const b2 = a * sinR + b * cosR;
    const c2 = c * cosR - d * sinR;
    const d2 = c * sinR + d * cosR;

    // After removing rotation: [scaleX, skewX*scaleY; skewY*scaleX, scaleY]
    // skewX angle from c2/d2 (if scaleY != 0)
    if (Math.abs(scaleY) > 1e-10) {
      skewX = Math.atan2(c2, d2) * (180 / Math.PI);
    }
  }

  return { translateX, translateY, scaleX, scaleY, rotation, skewX, skewY };
}

/**
 * Parse SVG transform attribute string
 * Supports: translate(x, y), scale(sx, sy), rotate(angle), skewX(angle), skewY(angle), matrix(a,b,c,d,e,f)
 */
export function parseTransform(transformStr: string | null): ParsedTransform {
  if (!transformStr) {
    return { ...IDENTITY_TRANSFORM };
  }

  let translateX = 0;
  let translateY = 0;
  let scaleX = 1;
  let scaleY = 1;
  let rotation = 0;
  let rotationCenterX = 0;
  let rotationCenterY = 0;
  let skewX = 0;
  let skewY = 0;

  // Match transform functions: name(params)
  const transformRegex = /(\w+)\s*\(([^)]+)\)/g;
  let match: RegExpExecArray | null;

  while ((match = transformRegex.exec(transformStr)) !== null) {
    const funcName = match[1].toLowerCase();
    const params = match[2].split(/[\s,]+/).map(s => parseFloat(s.trim()));

    switch (funcName) {
      case 'translate':
        translateX += params[0] || 0;
        // translate(x) means translate(x, 0), so Y is 0 if not specified
        translateY += params[1] ?? 0;
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
        // rotate(angle) or rotate(angle, cx, cy)
        const angle = params[0] || 0;
        rotation += angle;
        if (params.length >= 3) {
          // rotate(angle, cx, cy) - rotation around a point
          rotationCenterX = params[1];
          rotationCenterY = params[2];
        }
        break;

      case 'skewx':
        // skewX(angle) - skew along X axis
        skewX += params[0] || 0;
        break;

      case 'skewy':
        // skewY(angle) - skew along Y axis
        skewY += params[0] || 0;
        break;

      case 'matrix':
        // matrix(a, b, c, d, e, f)
        if (params.length >= 6) {
          const [a, b, c, d, me, mf] = params;
          const decomposed = decomposeMatrix(a, b, c, d, me, mf);

          // Apply the decomposed matrix components
          // Translation is additive
          translateX += decomposed.translateX;
          translateY += decomposed.translateY;
          // Scale is multiplicative
          scaleX *= decomposed.scaleX;
          scaleY *= decomposed.scaleY;
          // Rotation is additive
          rotation += decomposed.rotation;
          // Skew is additive
          skewX += decomposed.skewX;
          skewY += decomposed.skewY;
        } else {
          console.warn('matrix() transform requires 6 parameters');
        }
        break;

      default:
        console.warn(`Unknown transform function "${funcName}" ignored`);
    }
  }

  return { translateX, translateY, scaleX, scaleY, rotation, rotationCenterX, rotationCenterY, skewX, skewY };
}

/**
 * Combine two transforms (apply child transform after parent)
 * Result = parent transform followed by child transform
 * Note: Rotation and skew combining is simplified - we add angles, but this may not be
 * perfectly accurate for complex transform combinations with different rotation centers.
 */
export function combineTransforms(parent: ParsedTransform, child: ParsedTransform): ParsedTransform {
  // Child scale applies to child translate
  // Combined: first parent, then child
  // T_combined = T_parent * T_child
  // For point P: P' = scale_parent * (scale_child * P + translate_child) + translate_parent
  //            = scale_parent * scale_child * P + scale_parent * translate_child + translate_parent

  // For rotation and skew, we add angles (simplified approach)
  // In complex cases with different rotation centers, this may need matrix math

  return {
    scaleX: parent.scaleX * child.scaleX,
    scaleY: parent.scaleY * child.scaleY,
    translateX: parent.scaleX * child.translateX + parent.translateX,
    translateY: parent.scaleY * child.translateY + parent.translateY,
    rotation: parent.rotation + child.rotation,
    // Use child's rotation center if specified, otherwise parent's
    rotationCenterX: child.rotationCenterX || parent.rotationCenterX,
    rotationCenterY: child.rotationCenterY || parent.rotationCenterY,
    // Skew is additive (simplified)
    skewX: parent.skewX + child.skewX,
    skewY: parent.skewY + child.skewY
  };
}

/**
 * Apply transform to a point
 */
export function applyTransformToPoint(point: Point, transform: ParsedTransform): Point {
  return {
    x: round3(point.x * transform.scaleX + transform.translateX),
    y: round3(point.y * transform.scaleY + transform.translateY)
  };
}

/**
 * Check if transform is identity (no change)
 */
export function isIdentityTransform(transform: ParsedTransform): boolean {
  return transform.translateX === 0 &&
         transform.translateY === 0 &&
         transform.scaleX === 1 &&
         transform.scaleY === 1 &&
         transform.rotation === 0 &&
         transform.skewX === 0 &&
         transform.skewY === 0;
}

/**
 * Check if transform has rotation
 */
export function hasRotation(transform: ParsedTransform): boolean {
  return transform.rotation !== 0;
}

/**
 * Check if transform has skew
 */
export function hasSkew(transform: ParsedTransform): boolean {
  return transform.skewX !== 0 || transform.skewY !== 0;
}
