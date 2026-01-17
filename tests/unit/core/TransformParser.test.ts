import { describe, it, expect } from 'vitest';
import {
  parseTransform,
  combineTransforms,
  applyTransformToPoint,
  isIdentityTransform,
  hasRotation,
  hasSkew,
  IDENTITY_TRANSFORM,
  ParsedTransform
} from '../../../src/renderer/core/TransformParser';

describe('TransformParser', () => {
  describe('parseTransform()', () => {
    describe('translate', () => {
      it('should parse translate(x, y)', () => {
        const result = parseTransform('translate(100, 50)');

        expect(result.translateX).toBe(100);
        expect(result.translateY).toBe(50);
      });

      it('should parse translate(x) with single parameter', () => {
        const result = parseTransform('translate(100)');

        expect(result.translateX).toBe(100);
        expect(result.translateY).toBe(0);
      });

      it('should parse negative translate values', () => {
        const result = parseTransform('translate(-50, -30)');

        expect(result.translateX).toBe(-50);
        expect(result.translateY).toBe(-30);
      });

      it('should parse translate with decimal values', () => {
        const result = parseTransform('translate(10.5, 20.75)');

        expect(result.translateX).toBe(10.5);
        expect(result.translateY).toBe(20.75);
      });
    });

    describe('scale', () => {
      it('should parse scale(sx, sy)', () => {
        const result = parseTransform('scale(2, 3)');

        expect(result.scaleX).toBe(2);
        expect(result.scaleY).toBe(3);
      });

      it('should parse scale(s) with single parameter (uniform scale)', () => {
        const result = parseTransform('scale(2)');

        expect(result.scaleX).toBe(2);
        expect(result.scaleY).toBe(2);
      });

      it('should parse scale with decimal values', () => {
        const result = parseTransform('scale(1.5, 0.5)');

        expect(result.scaleX).toBe(1.5);
        expect(result.scaleY).toBe(0.5);
      });

      it('should parse negative scale (flip)', () => {
        const result = parseTransform('scale(-1, 1)');

        expect(result.scaleX).toBe(-1);
        expect(result.scaleY).toBe(1);
      });
    });

    describe('rotate', () => {
      it('should parse rotate(angle)', () => {
        const result = parseTransform('rotate(45)');

        expect(result.rotation).toBe(45);
      });

      it('should parse rotate(angle, cx, cy)', () => {
        const result = parseTransform('rotate(90, 50, 50)');

        expect(result.rotation).toBe(90);
        expect(result.rotationCenterX).toBe(50);
        expect(result.rotationCenterY).toBe(50);
      });

      it('should parse negative rotation', () => {
        const result = parseTransform('rotate(-30)');

        expect(result.rotation).toBe(-30);
      });
    });

    describe('skew', () => {
      it('should parse skewX(angle)', () => {
        const result = parseTransform('skewX(30)');

        expect(result.skewX).toBe(30);
        expect(result.skewY).toBe(0);
      });

      it('should parse skewY(angle)', () => {
        const result = parseTransform('skewY(15)');

        expect(result.skewX).toBe(0);
        expect(result.skewY).toBe(15);
      });

      it('should parse both skewX and skewY', () => {
        const result = parseTransform('skewX(20) skewY(10)');

        expect(result.skewX).toBe(20);
        expect(result.skewY).toBe(10);
      });
    });

    describe('matrix', () => {
      it('should parse identity matrix', () => {
        const result = parseTransform('matrix(1, 0, 0, 1, 0, 0)');

        expect(result.translateX).toBeCloseTo(0, 5);
        expect(result.translateY).toBeCloseTo(0, 5);
        expect(result.scaleX).toBeCloseTo(1, 5);
        expect(result.scaleY).toBeCloseTo(1, 5);
        expect(result.rotation).toBeCloseTo(0, 5);
      });

      it('should parse matrix with translation', () => {
        const result = parseTransform('matrix(1, 0, 0, 1, 100, 50)');

        expect(result.translateX).toBeCloseTo(100, 5);
        expect(result.translateY).toBeCloseTo(50, 5);
        expect(result.scaleX).toBeCloseTo(1, 5);
        expect(result.scaleY).toBeCloseTo(1, 5);
      });

      it('should parse matrix with scale', () => {
        const result = parseTransform('matrix(2, 0, 0, 3, 0, 0)');

        expect(result.scaleX).toBeCloseTo(2, 5);
        expect(result.scaleY).toBeCloseTo(3, 5);
      });
    });

    describe('multiple transforms', () => {
      it('should parse multiple transforms', () => {
        const result = parseTransform('translate(100, 50) scale(2)');

        expect(result.translateX).toBe(200); // 100 * 2 (scale affects translate)
        expect(result.translateY).toBe(100); // 50 * 2
        expect(result.scaleX).toBe(2);
        expect(result.scaleY).toBe(2);
      });

      it('should accumulate translations', () => {
        const result = parseTransform('translate(10, 20) translate(30, 40)');

        expect(result.translateX).toBe(40);
        expect(result.translateY).toBe(60);
      });

      it('should accumulate rotations', () => {
        const result = parseTransform('rotate(30) rotate(15)');

        expect(result.rotation).toBe(45);
      });
    });

    describe('edge cases', () => {
      it('should return identity for null input', () => {
        const result = parseTransform(null);

        expect(result).toEqual(IDENTITY_TRANSFORM);
      });

      it('should return identity for empty string', () => {
        const result = parseTransform('');

        expect(result).toEqual(IDENTITY_TRANSFORM);
      });

      it('should handle comma-separated parameters', () => {
        const result = parseTransform('translate(100,50)');

        expect(result.translateX).toBe(100);
        expect(result.translateY).toBe(50);
      });

      it('should handle space-separated parameters', () => {
        const result = parseTransform('translate(100 50)');

        expect(result.translateX).toBe(100);
        expect(result.translateY).toBe(50);
      });
    });
  });

  describe('combineTransforms()', () => {
    it('should combine translations', () => {
      const parent: ParsedTransform = {
        ...IDENTITY_TRANSFORM,
        translateX: 100,
        translateY: 50
      };
      const child: ParsedTransform = {
        ...IDENTITY_TRANSFORM,
        translateX: 20,
        translateY: 10
      };

      const result = combineTransforms(parent, child);

      expect(result.translateX).toBe(120);
      expect(result.translateY).toBe(60);
    });

    it('should multiply scales', () => {
      const parent: ParsedTransform = {
        ...IDENTITY_TRANSFORM,
        scaleX: 2,
        scaleY: 3
      };
      const child: ParsedTransform = {
        ...IDENTITY_TRANSFORM,
        scaleX: 1.5,
        scaleY: 2
      };

      const result = combineTransforms(parent, child);

      expect(result.scaleX).toBe(3);
      expect(result.scaleY).toBe(6);
    });

    it('should add rotations', () => {
      const parent: ParsedTransform = {
        ...IDENTITY_TRANSFORM,
        rotation: 30
      };
      const child: ParsedTransform = {
        ...IDENTITY_TRANSFORM,
        rotation: 15
      };

      const result = combineTransforms(parent, child);

      expect(result.rotation).toBe(45);
    });

    it('should apply parent scale to child translation', () => {
      const parent: ParsedTransform = {
        ...IDENTITY_TRANSFORM,
        scaleX: 2,
        scaleY: 2
      };
      const child: ParsedTransform = {
        ...IDENTITY_TRANSFORM,
        translateX: 50,
        translateY: 25
      };

      const result = combineTransforms(parent, child);

      expect(result.translateX).toBe(100); // 50 * 2
      expect(result.translateY).toBe(50);  // 25 * 2
    });

    it('should combine parent translation and child translation with scale', () => {
      const parent: ParsedTransform = {
        ...IDENTITY_TRANSFORM,
        translateX: 100,
        translateY: 50,
        scaleX: 2,
        scaleY: 2
      };
      const child: ParsedTransform = {
        ...IDENTITY_TRANSFORM,
        translateX: 10,
        translateY: 5
      };

      const result = combineTransforms(parent, child);

      expect(result.translateX).toBe(120); // 2 * 10 + 100
      expect(result.translateY).toBe(60);  // 2 * 5 + 50
    });
  });

  describe('applyTransformToPoint()', () => {
    it('should apply translation to point', () => {
      const transform: ParsedTransform = {
        ...IDENTITY_TRANSFORM,
        translateX: 100,
        translateY: 50
      };

      const result = applyTransformToPoint({ x: 10, y: 20 }, transform);

      expect(result.x).toBe(110);
      expect(result.y).toBe(70);
    });

    it('should apply scale to point', () => {
      const transform: ParsedTransform = {
        ...IDENTITY_TRANSFORM,
        scaleX: 2,
        scaleY: 3
      };

      const result = applyTransformToPoint({ x: 10, y: 20 }, transform);

      expect(result.x).toBe(20);
      expect(result.y).toBe(60);
    });

    it('should apply combined transform to point', () => {
      const transform: ParsedTransform = {
        ...IDENTITY_TRANSFORM,
        translateX: 10,
        translateY: 5,
        scaleX: 2,
        scaleY: 2
      };

      const result = applyTransformToPoint({ x: 5, y: 10 }, transform);

      expect(result.x).toBe(20); // 5 * 2 + 10
      expect(result.y).toBe(25); // 10 * 2 + 5
    });

    it('should round result to 3 decimal places', () => {
      const transform: ParsedTransform = {
        ...IDENTITY_TRANSFORM,
        translateX: 0.1234567,
        translateY: 0
      };

      const result = applyTransformToPoint({ x: 0, y: 0 }, transform);

      expect(result.x).toBe(0.123);
    });
  });

  describe('isIdentityTransform()', () => {
    it('should return true for identity transform', () => {
      expect(isIdentityTransform(IDENTITY_TRANSFORM)).toBe(true);
    });

    it('should return false if translateX is non-zero', () => {
      const transform = { ...IDENTITY_TRANSFORM, translateX: 10 };
      expect(isIdentityTransform(transform)).toBe(false);
    });

    it('should return false if scaleX is not 1', () => {
      const transform = { ...IDENTITY_TRANSFORM, scaleX: 2 };
      expect(isIdentityTransform(transform)).toBe(false);
    });

    it('should return false if rotation is non-zero', () => {
      const transform = { ...IDENTITY_TRANSFORM, rotation: 45 };
      expect(isIdentityTransform(transform)).toBe(false);
    });

    it('should return false if skewX is non-zero', () => {
      const transform = { ...IDENTITY_TRANSFORM, skewX: 30 };
      expect(isIdentityTransform(transform)).toBe(false);
    });
  });

  describe('hasRotation()', () => {
    it('should return false for zero rotation', () => {
      expect(hasRotation(IDENTITY_TRANSFORM)).toBe(false);
    });

    it('should return true for non-zero rotation', () => {
      const transform = { ...IDENTITY_TRANSFORM, rotation: 45 };
      expect(hasRotation(transform)).toBe(true);
    });

    it('should return true for negative rotation', () => {
      const transform = { ...IDENTITY_TRANSFORM, rotation: -30 };
      expect(hasRotation(transform)).toBe(true);
    });
  });

  describe('hasSkew()', () => {
    it('should return false for no skew', () => {
      expect(hasSkew(IDENTITY_TRANSFORM)).toBe(false);
    });

    it('should return true for skewX', () => {
      const transform = { ...IDENTITY_TRANSFORM, skewX: 30 };
      expect(hasSkew(transform)).toBe(true);
    });

    it('should return true for skewY', () => {
      const transform = { ...IDENTITY_TRANSFORM, skewY: 15 };
      expect(hasSkew(transform)).toBe(true);
    });

    it('should return true for both skewX and skewY', () => {
      const transform = { ...IDENTITY_TRANSFORM, skewX: 20, skewY: 10 };
      expect(hasSkew(transform)).toBe(true);
    });
  });
});
