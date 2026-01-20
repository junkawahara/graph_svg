import { Point } from '../../shared/types';
import { round3 } from './MathUtils';

/**
 * 2D Transformation Matrix (3x3 homogeneous matrix, stored as 6 values)
 * | a c e |
 * | b d f |
 * | 0 0 1 |
 */
export interface Matrix2D {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
}

/**
 * Identity matrix
 */
export const IDENTITY_MATRIX: Matrix2D = {
  a: 1, b: 0, c: 0, d: 1, e: 0, f: 0
};

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
 * Multiply two 2D matrices: result = m1 * m2
 * This applies m2 first, then m1.
 */
function multiplyMatrices(m1: Matrix2D, m2: Matrix2D): Matrix2D {
  return {
    a: m1.a * m2.a + m1.c * m2.b,
    b: m1.b * m2.a + m1.d * m2.b,
    c: m1.a * m2.c + m1.c * m2.d,
    d: m1.b * m2.c + m1.d * m2.d,
    e: m1.a * m2.e + m1.c * m2.f + m1.e,
    f: m1.b * m2.e + m1.d * m2.f + m1.f
  };
}

/**
 * Create a translation matrix
 */
function translateMatrix(tx: number, ty: number): Matrix2D {
  return { a: 1, b: 0, c: 0, d: 1, e: tx, f: ty };
}

/**
 * Create a scale matrix
 */
function scaleMatrix(sx: number, sy: number): Matrix2D {
  return { a: sx, b: 0, c: 0, d: sy, e: 0, f: 0 };
}

/**
 * Create a rotation matrix (angle in degrees)
 */
function rotateMatrix(angleDeg: number): Matrix2D {
  const rad = angleDeg * Math.PI / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return { a: cos, b: sin, c: -sin, d: cos, e: 0, f: 0 };
}

/**
 * Create a skewX matrix (angle in degrees)
 */
function skewXMatrix(angleDeg: number): Matrix2D {
  const tan = Math.tan(angleDeg * Math.PI / 180);
  return { a: 1, b: 0, c: tan, d: 1, e: 0, f: 0 };
}

/**
 * Create a skewY matrix (angle in degrees)
 */
function skewYMatrix(angleDeg: number): Matrix2D {
  const tan = Math.tan(angleDeg * Math.PI / 180);
  return { a: 1, b: tan, c: 0, d: 1, e: 0, f: 0 };
}

/**
 * Safe number parsing helper - returns fallback if value is NaN, null, or undefined
 */
function safeNumber(value: number | undefined, fallback: number): number {
  return (value !== undefined && Number.isFinite(value)) ? value : fallback;
}

/**
 * Decompose a 2D transformation matrix into translate, scale, rotation, and skew.
 * Matrix format: matrix(a, b, c, d, e, f) represents:
 * | a c e |
 * | b d f |
 * | 0 0 1 |
 *
 * The decomposition uses QR decomposition approach:
 * M = T * R * Skew * S
 * Where T is translation, R is rotation, Skew is shear, S is scale.
 */
function decomposeMatrix(m: Matrix2D): {
  translateX: number;
  translateY: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  skewX: number;
  skewY: number;
} {
  const { a, b, c, d, e, f } = m;

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
  let skewX = 0;
  let skewY = 0;

  if (Math.abs(scaleX) > 1e-10 && Math.abs(scaleY) > 1e-10) {
    const cosR = Math.cos(-rotation * Math.PI / 180);
    const sinR = Math.sin(-rotation * Math.PI / 180);

    // Remove rotation to get the skew+scale matrix
    // M_without_rotation = R(-θ) * M_2x2
    const c2 = c * cosR - d * sinR;
    const d2 = c * sinR + d * cosR;

    // After removing rotation, the matrix is [scaleX, skewX*scaleY; 0, scaleY] (ideally)
    // skewX = c2 / scaleY
    skewX = Math.atan2(c2, d2) * (180 / Math.PI);

    // For skewY, we need to check the b component after removing rotation
    const a2 = a * cosR - b * sinR;
    const b2 = a * sinR + b * cosR;

    // If there's a skewY component, it would show up in b2
    // After removing rotation and skewX, b2 should be skewY * scaleX
    // But since we extracted scaleX from the first column, skewY would be in the residual
    if (Math.abs(scaleX) > 1e-10) {
      // Check if there's residual shear in the y direction
      const expectedB2 = 0; // In pure scale+skewX, b2 should be 0
      if (Math.abs(b2 - expectedB2) > 1e-10) {
        // There's a skewY component - but this is complex to extract accurately
        // For now, we prioritize skewX extraction
        skewY = Math.atan2(b2 - expectedB2, a2) * (180 / Math.PI);
      }
    }
  }

  return { translateX, translateY, scaleX, scaleY, rotation, skewX, skewY };
}

/**
 * Convert ParsedTransform to a Matrix2D
 */
export function transformToMatrix(t: ParsedTransform): Matrix2D {
  let m: Matrix2D = { ...IDENTITY_MATRIX };

  // Apply in order: translate, rotate (around center), skew, scale
  // But we need to handle rotation center specially

  // First, apply translation
  if (t.translateX !== 0 || t.translateY !== 0) {
    m = multiplyMatrices(m, translateMatrix(t.translateX, t.translateY));
  }

  // Handle rotation with center
  if (t.rotation !== 0) {
    if (t.rotationCenterX !== 0 || t.rotationCenterY !== 0) {
      // rotate(angle, cx, cy) = translate(cx, cy) * rotate(angle) * translate(-cx, -cy)
      m = multiplyMatrices(m, translateMatrix(t.rotationCenterX, t.rotationCenterY));
      m = multiplyMatrices(m, rotateMatrix(t.rotation));
      m = multiplyMatrices(m, translateMatrix(-t.rotationCenterX, -t.rotationCenterY));
    } else {
      m = multiplyMatrices(m, rotateMatrix(t.rotation));
    }
  }

  // Apply skew
  if (t.skewX !== 0) {
    m = multiplyMatrices(m, skewXMatrix(t.skewX));
  }
  if (t.skewY !== 0) {
    m = multiplyMatrices(m, skewYMatrix(t.skewY));
  }

  // Apply scale
  if (t.scaleX !== 1 || t.scaleY !== 1) {
    m = multiplyMatrices(m, scaleMatrix(t.scaleX, t.scaleY));
  }

  return m;
}

/**
 * Parse SVG transform attribute string
 * Supports: translate(x, y), scale(sx, sy), rotate(angle), skewX(angle), skewY(angle), matrix(a,b,c,d,e,f)
 *
 * Uses matrix multiplication to correctly handle transform ordering.
 * SVG transforms are applied left-to-right in the string, which means
 * the rightmost transform is applied first to the coordinates.
 */
export function parseTransform(transformStr: string | null): ParsedTransform {
  if (!transformStr) {
    return { ...IDENTITY_TRANSFORM };
  }

  // Accumulated matrix - start with identity
  let matrix: Matrix2D = { ...IDENTITY_MATRIX };

  // Track rotation center from the last rotate(angle, cx, cy) call
  let lastRotationCenterX = 0;
  let lastRotationCenterY = 0;
  let hasRotationCenter = false;

  // Match transform functions: name(params)
  const transformRegex = /(\w+)\s*\(([^)]+)\)/g;
  let match: RegExpExecArray | null;

  while ((match = transformRegex.exec(transformStr)) !== null) {
    const funcName = match[1].toLowerCase();
    const params = match[2].split(/[\s,]+/).map(s => parseFloat(s.trim()));

    switch (funcName) {
      case 'translate': {
        const tx = safeNumber(params[0], 0);
        const ty = safeNumber(params[1], 0);
        matrix = multiplyMatrices(matrix, translateMatrix(tx, ty));
        break;
      }

      case 'scale': {
        const sx = safeNumber(params[0], 1);
        const sy = safeNumber(params[1], sx);
        matrix = multiplyMatrices(matrix, scaleMatrix(sx, sy));
        break;
      }

      case 'rotate': {
        const angle = safeNumber(params[0], 0);
        if (params.length >= 3) {
          // rotate(angle, cx, cy) = translate(cx, cy) * rotate(angle) * translate(-cx, -cy)
          const cx = safeNumber(params[1], 0);
          const cy = safeNumber(params[2], 0);
          matrix = multiplyMatrices(matrix, translateMatrix(cx, cy));
          matrix = multiplyMatrices(matrix, rotateMatrix(angle));
          matrix = multiplyMatrices(matrix, translateMatrix(-cx, -cy));
          lastRotationCenterX = cx;
          lastRotationCenterY = cy;
          hasRotationCenter = true;
        } else {
          matrix = multiplyMatrices(matrix, rotateMatrix(angle));
        }
        break;
      }

      case 'skewx': {
        const angle = safeNumber(params[0], 0);
        matrix = multiplyMatrices(matrix, skewXMatrix(angle));
        break;
      }

      case 'skewy': {
        const angle = safeNumber(params[0], 0);
        matrix = multiplyMatrices(matrix, skewYMatrix(angle));
        break;
      }

      case 'matrix': {
        if (params.length >= 6) {
          const a = safeNumber(params[0], 1);
          const b = safeNumber(params[1], 0);
          const c = safeNumber(params[2], 0);
          const d = safeNumber(params[3], 1);
          const e = safeNumber(params[4], 0);
          const f = safeNumber(params[5], 0);
          matrix = multiplyMatrices(matrix, { a, b, c, d, e, f });
        } else {
          console.warn('matrix() transform requires 6 parameters');
        }
        break;
      }

      default:
        console.warn(`Unknown transform function "${funcName}" ignored`);
    }
  }

  // Decompose the final matrix
  const decomposed = decomposeMatrix(matrix);

  return {
    translateX: decomposed.translateX,
    translateY: decomposed.translateY,
    scaleX: decomposed.scaleX,
    scaleY: decomposed.scaleY,
    rotation: decomposed.rotation,
    rotationCenterX: hasRotationCenter ? lastRotationCenterX : 0,
    rotationCenterY: hasRotationCenter ? lastRotationCenterY : 0,
    skewX: decomposed.skewX,
    skewY: decomposed.skewY
  };
}

/**
 * Combine two transforms using matrix multiplication.
 * Result = parent transform followed by child transform
 *
 * For a point P, the combined transform applies as:
 * P' = Parent * Child * P
 * (Child is applied first, then Parent)
 */
export function combineTransforms(parent: ParsedTransform, child: ParsedTransform): ParsedTransform {
  // Convert both to matrices
  const parentMatrix = transformToMatrix(parent);
  const childMatrix = transformToMatrix(child);

  // Multiply: parent * child (child applied first)
  const combined = multiplyMatrices(parentMatrix, childMatrix);

  // Decompose the result
  const decomposed = decomposeMatrix(combined);

  // Handle rotation center: use child's if explicitly set (non-zero), otherwise parent's
  // We need to track whether the center was explicitly set vs just being 0
  const childHasCenter = child.rotationCenterX !== 0 || child.rotationCenterY !== 0;
  const parentHasCenter = parent.rotationCenterX !== 0 || parent.rotationCenterY !== 0;

  let rotationCenterX = 0;
  let rotationCenterY = 0;

  if (childHasCenter) {
    // Transform child's rotation center by parent transform
    const transformedCenter = applyMatrixToPoint(
      { x: child.rotationCenterX, y: child.rotationCenterY },
      parentMatrix
    );
    rotationCenterX = transformedCenter.x;
    rotationCenterY = transformedCenter.y;
  } else if (parentHasCenter) {
    rotationCenterX = parent.rotationCenterX;
    rotationCenterY = parent.rotationCenterY;
  }

  return {
    translateX: decomposed.translateX,
    translateY: decomposed.translateY,
    scaleX: decomposed.scaleX,
    scaleY: decomposed.scaleY,
    rotation: decomposed.rotation,
    rotationCenterX,
    rotationCenterY,
    skewX: decomposed.skewX,
    skewY: decomposed.skewY
  };
}

/**
 * Apply a matrix to a point
 */
function applyMatrixToPoint(point: Point, m: Matrix2D): Point {
  return {
    x: round3(m.a * point.x + m.c * point.y + m.e),
    y: round3(m.b * point.x + m.d * point.y + m.f)
  };
}

/**
 * Apply transform to a point
 * Correctly handles translation, scale, rotation, and skew.
 */
export function applyTransformToPoint(point: Point, transform: ParsedTransform): Point {
  const matrix = transformToMatrix(transform);
  return applyMatrixToPoint(point, matrix);
}

/**
 * Check if transform is identity (no change)
 * Uses small epsilon for floating point comparison
 */
export function isIdentityTransform(transform: ParsedTransform): boolean {
  const epsilon = 1e-9;
  return Math.abs(transform.translateX) < epsilon &&
         Math.abs(transform.translateY) < epsilon &&
         Math.abs(transform.scaleX - 1) < epsilon &&
         Math.abs(transform.scaleY - 1) < epsilon &&
         Math.abs(transform.rotation) < epsilon &&
         Math.abs(transform.skewX) < epsilon &&
         Math.abs(transform.skewY) < epsilon;
}

/**
 * Check if transform has rotation
 * Uses small epsilon for floating point comparison
 */
export function hasRotation(transform: ParsedTransform): boolean {
  const epsilon = 1e-9;
  return Math.abs(transform.rotation) >= epsilon;
}

/**
 * Check if transform has skew
 * Uses small epsilon for floating point comparison
 */
export function hasSkew(transform: ParsedTransform): boolean {
  const epsilon = 1e-9;
  return Math.abs(transform.skewX) >= epsilon || Math.abs(transform.skewY) >= epsilon;
}

/**
 * Get the transformation matrix from a ParsedTransform
 */
export function getTransformMatrix(transform: ParsedTransform): Matrix2D {
  return transformToMatrix(transform);
}
