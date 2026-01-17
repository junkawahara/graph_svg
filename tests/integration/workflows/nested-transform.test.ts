import { describe, it, expect } from 'vitest';
import {
  parseTransform,
  combineTransforms,
  applyTransformToPoint,
  isIdentityTransform,
  hasRotation,
  hasSkew,
  ParsedTransform,
  IDENTITY_TRANSFORM
} from '../../../src/renderer/core/TransformParser';
import { FileManager } from '../../../src/renderer/core/FileManager';

describe('Nested Transform Integration', () => {

  describe('parseTransform', () => {
    it('should parse translate transform', () => {
      const result = parseTransform('translate(100, 50)');

      expect(result.translateX).toBe(100);
      expect(result.translateY).toBe(50);
      expect(result.scaleX).toBe(1);
      expect(result.scaleY).toBe(1);
    });

    it('should parse translate with single value', () => {
      const result = parseTransform('translate(100)');

      expect(result.translateX).toBe(100);
      expect(result.translateY).toBe(0);
    });

    it('should parse scale transform', () => {
      const result = parseTransform('scale(2, 1.5)');

      expect(result.scaleX).toBe(2);
      expect(result.scaleY).toBe(1.5);
    });

    it('should parse uniform scale', () => {
      const result = parseTransform('scale(2)');

      expect(result.scaleX).toBe(2);
      expect(result.scaleY).toBe(2);
    });

    it('should parse rotate transform', () => {
      const result = parseTransform('rotate(45)');

      expect(result.rotation).toBe(45);
    });

    it('should parse rotate with center', () => {
      const result = parseTransform('rotate(90, 50, 50)');

      expect(result.rotation).toBe(90);
      expect(result.rotationCenterX).toBe(50);
      expect(result.rotationCenterY).toBe(50);
    });

    it('should parse skewX transform', () => {
      const result = parseTransform('skewX(30)');

      expect(result.skewX).toBe(30);
      expect(result.skewY).toBe(0);
    });

    it('should parse skewY transform', () => {
      const result = parseTransform('skewY(15)');

      expect(result.skewX).toBe(0);
      expect(result.skewY).toBe(15);
    });

    it('should parse matrix transform', () => {
      // matrix(1, 0, 0, 1, 100, 50) is equivalent to translate(100, 50)
      const result = parseTransform('matrix(1, 0, 0, 1, 100, 50)');

      expect(result.translateX).toBe(100);
      expect(result.translateY).toBe(50);
      expect(result.scaleX).toBeCloseTo(1, 5);
      expect(result.scaleY).toBeCloseTo(1, 5);
    });

    it('should parse multiple transforms', () => {
      const result = parseTransform('translate(100, 50) scale(2)');

      expect(result.translateX).toBe(200);  // translate is affected by scale
      expect(result.translateY).toBe(100);
      expect(result.scaleX).toBe(2);
      expect(result.scaleY).toBe(2);
    });

    it('should return identity for null input', () => {
      const result = parseTransform(null);

      expect(isIdentityTransform(result)).toBe(true);
    });

    it('should return identity for empty string', () => {
      const result = parseTransform('');

      expect(isIdentityTransform(result)).toBe(true);
    });
  });

  describe('combineTransforms', () => {
    it('should combine two translate transforms', () => {
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

      expect(result.translateX).toBe(120);  // 100 + 20
      expect(result.translateY).toBe(60);   // 50 + 10
    });

    it('should combine parent scale with child translate', () => {
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

      // Child translate is multiplied by parent scale
      expect(result.translateX).toBe(100);  // 2 * 50
      expect(result.translateY).toBe(50);   // 2 * 25
      expect(result.scaleX).toBe(2);
      expect(result.scaleY).toBe(2);
    });

    it('should combine two scale transforms', () => {
      const parent: ParsedTransform = {
        ...IDENTITY_TRANSFORM,
        scaleX: 2,
        scaleY: 3
      };
      const child: ParsedTransform = {
        ...IDENTITY_TRANSFORM,
        scaleX: 1.5,
        scaleY: 0.5
      };

      const result = combineTransforms(parent, child);

      expect(result.scaleX).toBe(3);    // 2 * 1.5
      expect(result.scaleY).toBe(1.5);  // 3 * 0.5
    });

    it('should combine rotation transforms additively', () => {
      const parent: ParsedTransform = {
        ...IDENTITY_TRANSFORM,
        rotation: 30
      };
      const child: ParsedTransform = {
        ...IDENTITY_TRANSFORM,
        rotation: 15
      };

      const result = combineTransforms(parent, child);

      expect(result.rotation).toBe(45);  // 30 + 15
    });

    it('should combine skew transforms additively', () => {
      const parent: ParsedTransform = {
        ...IDENTITY_TRANSFORM,
        skewX: 10,
        skewY: 5
      };
      const child: ParsedTransform = {
        ...IDENTITY_TRANSFORM,
        skewX: 5,
        skewY: 10
      };

      const result = combineTransforms(parent, child);

      expect(result.skewX).toBe(15);  // 10 + 5
      expect(result.skewY).toBe(15);  // 5 + 10
    });

    it('should combine complex transforms', () => {
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
        translateY: 5,
        rotation: 45
      };

      const result = combineTransforms(parent, child);

      // Parent scale affects child translate
      expect(result.translateX).toBe(120);  // 2 * 10 + 100
      expect(result.translateY).toBe(60);   // 2 * 5 + 50
      expect(result.scaleX).toBe(2);
      expect(result.scaleY).toBe(2);
      expect(result.rotation).toBe(45);
    });
  });

  describe('applyTransformToPoint', () => {
    it('should apply translate to point', () => {
      const point = { x: 10, y: 20 };
      const transform: ParsedTransform = {
        ...IDENTITY_TRANSFORM,
        translateX: 100,
        translateY: 50
      };

      const result = applyTransformToPoint(point, transform);

      expect(result.x).toBe(110);  // 10 + 100
      expect(result.y).toBe(70);   // 20 + 50
    });

    it('should apply scale to point', () => {
      const point = { x: 10, y: 20 };
      const transform: ParsedTransform = {
        ...IDENTITY_TRANSFORM,
        scaleX: 2,
        scaleY: 3
      };

      const result = applyTransformToPoint(point, transform);

      expect(result.x).toBe(20);  // 10 * 2
      expect(result.y).toBe(60);  // 20 * 3
    });

    it('should apply combined transform to point', () => {
      const point = { x: 10, y: 20 };
      const transform: ParsedTransform = {
        ...IDENTITY_TRANSFORM,
        translateX: 50,
        translateY: 25,
        scaleX: 2,
        scaleY: 2
      };

      const result = applyTransformToPoint(point, transform);

      expect(result.x).toBe(70);   // 10 * 2 + 50
      expect(result.y).toBe(65);   // 20 * 2 + 25
    });
  });

  describe('utility functions', () => {
    it('should detect identity transform', () => {
      expect(isIdentityTransform(IDENTITY_TRANSFORM)).toBe(true);

      const nonIdentity: ParsedTransform = {
        ...IDENTITY_TRANSFORM,
        translateX: 1
      };
      expect(isIdentityTransform(nonIdentity)).toBe(false);
    });

    it('should detect rotation', () => {
      expect(hasRotation(IDENTITY_TRANSFORM)).toBe(false);

      const rotated: ParsedTransform = {
        ...IDENTITY_TRANSFORM,
        rotation: 45
      };
      expect(hasRotation(rotated)).toBe(true);
    });

    it('should detect skew', () => {
      expect(hasSkew(IDENTITY_TRANSFORM)).toBe(false);

      const skewedX: ParsedTransform = {
        ...IDENTITY_TRANSFORM,
        skewX: 10
      };
      expect(hasSkew(skewedX)).toBe(true);

      const skewedY: ParsedTransform = {
        ...IDENTITY_TRANSFORM,
        skewY: 10
      };
      expect(hasSkew(skewedY)).toBe(true);
    });
  });

  describe('nested group transforms in SVG', () => {
    it('should apply single level group transform', () => {
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
          <g data-group-type="group" transform="translate(100, 50)">
            <rect x="0" y="0" width="50" height="30" fill="#ff0000"/>
          </g>
        </svg>
      `;

      const { shapes } = FileManager.parse(svg);

      expect(shapes).toHaveLength(1);
      const group = shapes[0] as any;
      expect(group.children).toHaveLength(1);

      const rect = group.children[0] as any;
      // Rectangle position should be translated
      expect(rect.x).toBe(100);
      expect(rect.y).toBe(50);
    });

    it('should apply two level nested transforms', () => {
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
          <g data-group-type="group" transform="translate(100, 0)">
            <g data-group-type="group" transform="translate(50, 25)">
              <rect x="0" y="0" width="50" height="30" fill="#ff0000"/>
            </g>
          </g>
        </svg>
      `;

      const { shapes } = FileManager.parse(svg);

      expect(shapes).toHaveLength(1);
      const outerGroup = shapes[0] as any;
      const innerGroup = outerGroup.children[0] as any;
      const rect = innerGroup.children[0] as any;

      // Combined translate: 100 + 50 = 150, 0 + 25 = 25
      expect(rect.x).toBe(150);
      expect(rect.y).toBe(25);
    });

    it('should apply three level nested transforms', () => {
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
          <g data-group-type="group" transform="translate(100, 100)">
            <g data-group-type="group" transform="translate(50, 50)">
              <g data-group-type="group" transform="translate(25, 25)">
                <rect x="0" y="0" width="50" height="30" fill="#ff0000"/>
              </g>
            </g>
          </g>
        </svg>
      `;

      const { shapes } = FileManager.parse(svg);

      const level1 = shapes[0] as any;
      const level2 = level1.children[0] as any;
      const level3 = level2.children[0] as any;
      const rect = level3.children[0] as any;

      // Combined translate: 100 + 50 + 25 = 175
      expect(rect.x).toBe(175);
      expect(rect.y).toBe(175);
    });

    it('should apply scale transform to nested children', () => {
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
          <g data-group-type="group" transform="scale(2)">
            <rect x="10" y="10" width="50" height="30" fill="#ff0000"/>
          </g>
        </svg>
      `;

      const { shapes } = FileManager.parse(svg);

      const group = shapes[0] as any;
      const rect = group.children[0] as any;

      // Scale 2x: position and size are doubled
      expect(rect.x).toBe(20);      // 10 * 2
      expect(rect.y).toBe(20);      // 10 * 2
      expect(rect.width).toBe(100); // 50 * 2
      expect(rect.height).toBe(60); // 30 * 2
    });

    it('should apply combined translate and scale', () => {
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
          <g data-group-type="group" transform="translate(100, 50) scale(2)">
            <rect x="10" y="10" width="50" height="30" fill="#ff0000"/>
          </g>
        </svg>
      `;

      const { shapes } = FileManager.parse(svg);

      const group = shapes[0] as any;
      const rect = group.children[0] as any;

      // Scale affects position: 10 * 2 = 20
      // Translate is also scaled: 100 * 2 = 200, 50 * 2 = 100
      // Final: x = 20 + 200 = 220, y = 20 + 100 = 120
      expect(rect.x).toBe(220);
      expect(rect.y).toBe(120);
      expect(rect.width).toBe(100);  // 50 * 2
      expect(rect.height).toBe(60);  // 30 * 2
    });

    it('should apply nested scale transforms', () => {
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
          <g data-group-type="group" transform="scale(2)">
            <g data-group-type="group" transform="scale(1.5)">
              <rect x="10" y="10" width="20" height="20" fill="#ff0000"/>
            </g>
          </g>
        </svg>
      `;

      const { shapes } = FileManager.parse(svg);

      const outer = shapes[0] as any;
      const inner = outer.children[0] as any;
      const rect = inner.children[0] as any;

      // Combined scale: 2 * 1.5 = 3
      expect(rect.x).toBe(30);       // 10 * 3
      expect(rect.y).toBe(30);       // 10 * 3
      expect(rect.width).toBe(60);   // 20 * 3
      expect(rect.height).toBe(60);  // 20 * 3
    });

    it('should apply parent translate with child scale', () => {
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
          <g data-group-type="group" transform="translate(100, 50)">
            <g data-group-type="group" transform="scale(2)">
              <rect x="10" y="10" width="20" height="20" fill="#ff0000"/>
            </g>
          </g>
        </svg>
      `;

      const { shapes } = FileManager.parse(svg);

      const outer = shapes[0] as any;
      const inner = outer.children[0] as any;
      const rect = inner.children[0] as any;

      // Child scale affects position: 10 * 2 = 20
      // Then parent translate: 20 + 100 = 120
      expect(rect.x).toBe(120);
      expect(rect.y).toBe(70);       // 10 * 2 + 50
      expect(rect.width).toBe(40);   // 20 * 2
      expect(rect.height).toBe(40);  // 20 * 2
    });

    it('should apply parent scale with child translate', () => {
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
          <g data-group-type="group" transform="scale(2)">
            <g data-group-type="group" transform="translate(50, 25)">
              <rect x="10" y="10" width="20" height="20" fill="#ff0000"/>
            </g>
          </g>
        </svg>
      `;

      const { shapes } = FileManager.parse(svg);

      const outer = shapes[0] as any;
      const inner = outer.children[0] as any;
      const rect = inner.children[0] as any;

      // Child translate is scaled by parent: 50 * 2 = 100, 25 * 2 = 50
      // Position: (10 + 50) * 2 = 120
      expect(rect.x).toBe(120);      // (10 + 50) * 2
      expect(rect.y).toBe(70);       // (10 + 25) * 2
      expect(rect.width).toBe(40);   // 20 * 2
      expect(rect.height).toBe(40);  // 20 * 2
    });

    it('should apply transform to ellipse', () => {
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
          <g data-group-type="group" transform="translate(100, 50) scale(2)">
            <ellipse cx="50" cy="50" rx="30" ry="20" fill="#ff0000"/>
          </g>
        </svg>
      `;

      const { shapes } = FileManager.parse(svg);

      const group = shapes[0] as any;
      const ellipse = group.children[0] as any;

      // Scale 2x, then translate (which was also scaled)
      expect(ellipse.rx).toBe(60);    // 30 * 2
      expect(ellipse.ry).toBe(40);    // 20 * 2
    });

    it('should apply transform to line', () => {
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
          <g data-group-type="group" transform="translate(100, 50)">
            <line x1="0" y1="0" x2="50" y2="50" stroke="#000000"/>
          </g>
        </svg>
      `;

      const { shapes } = FileManager.parse(svg);

      const group = shapes[0] as any;
      const line = group.children[0] as any;

      expect(line.x1).toBe(100);      // 0 + 100
      expect(line.y1).toBe(50);       // 0 + 50
      expect(line.x2).toBe(150);      // 50 + 100
      expect(line.y2).toBe(100);      // 50 + 50
    });

    it('should apply transform to polygon', () => {
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
          <g data-group-type="group" transform="translate(100, 100)">
            <polygon points="0,0 50,0 50,50 0,50" fill="#ff0000"/>
          </g>
        </svg>
      `;

      const { shapes } = FileManager.parse(svg);

      const group = shapes[0] as any;
      const polygon = group.children[0] as any;

      // All points should be translated
      expect(polygon.points[0]).toEqual({ x: 100, y: 100 });
      expect(polygon.points[1]).toEqual({ x: 150, y: 100 });
      expect(polygon.points[2]).toEqual({ x: 150, y: 150 });
      expect(polygon.points[3]).toEqual({ x: 100, y: 150 });
    });

    it('should apply transform to path', () => {
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
          <g data-group-type="group" transform="translate(100, 50)">
            <path d="M 0 0 L 50 50" fill="none" stroke="#000000"/>
          </g>
        </svg>
      `;

      const { shapes } = FileManager.parse(svg);

      const group = shapes[0] as any;
      const path = group.children[0] as any;

      // Path should exist and be translated
      expect(path).toBeDefined();
      expect(path.type).toBe('path');

      // Check bounding box is translated correctly
      const bounds = path.getBounds();
      expect(bounds.x).toBeCloseTo(100, 0);  // 0 + 100
      expect(bounds.y).toBeCloseTo(50, 0);   // 0 + 50
    });

    it('should apply rotation transform', () => {
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
          <g data-group-type="group" transform="rotate(45)">
            <rect x="0" y="0" width="100" height="50" fill="#ff0000"/>
          </g>
        </svg>
      `;

      const { shapes } = FileManager.parse(svg);

      const group = shapes[0] as any;
      const rect = group.children[0] as any;

      // Rectangle should have rotation applied
      expect(rect.rotation).toBe(45);
    });

    it('should combine rotation from nested groups', () => {
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
          <g data-group-type="group" transform="rotate(30)">
            <g data-group-type="group" transform="rotate(15)">
              <rect x="0" y="0" width="100" height="50" fill="#ff0000"/>
            </g>
          </g>
        </svg>
      `;

      const { shapes } = FileManager.parse(svg);

      const outer = shapes[0] as any;
      const inner = outer.children[0] as any;
      const rect = inner.children[0] as any;

      // Rotations should be combined
      expect(rect.rotation).toBe(45);  // 30 + 15
    });

    it('should handle multiple shapes in nested groups', () => {
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
          <g data-group-type="group" transform="translate(100, 100)">
            <rect x="0" y="0" width="50" height="30" fill="#ff0000"/>
            <g data-group-type="group" transform="translate(100, 0)">
              <rect x="0" y="0" width="50" height="30" fill="#00ff00"/>
              <ellipse cx="100" cy="15" rx="20" ry="15" fill="#0000ff"/>
            </g>
          </g>
        </svg>
      `;

      const { shapes } = FileManager.parse(svg);

      const outerGroup = shapes[0] as any;
      expect(outerGroup.children).toHaveLength(2);

      // First rect: only outer translate
      const rect1 = outerGroup.children[0] as any;
      expect(rect1.x).toBe(100);
      expect(rect1.y).toBe(100);

      // Inner group
      const innerGroup = outerGroup.children[1] as any;
      expect(innerGroup.children).toHaveLength(2);

      // Second rect: both translates combined
      const rect2 = innerGroup.children[0] as any;
      expect(rect2.x).toBe(200);  // 100 + 100
      expect(rect2.y).toBe(100);  // 100 + 0

      // Ellipse: both translates combined
      const ellipse = innerGroup.children[1] as any;
      expect(ellipse.cx).toBe(300);  // 100 + 100 + 100
      expect(ellipse.cy).toBe(115);  // 100 + 0 + 15
    });

    it('should handle matrix transform', () => {
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
          <g data-group-type="group" transform="matrix(1, 0, 0, 1, 100, 50)">
            <rect x="0" y="0" width="50" height="30" fill="#ff0000"/>
          </g>
        </svg>
      `;

      const { shapes } = FileManager.parse(svg);

      const group = shapes[0] as any;
      const rect = group.children[0] as any;

      // matrix(1,0,0,1,100,50) is equivalent to translate(100,50)
      expect(rect.x).toBe(100);
      expect(rect.y).toBe(50);
    });

    it('should handle scale matrix transform', () => {
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
          <g data-group-type="group" transform="matrix(2, 0, 0, 2, 0, 0)">
            <rect x="10" y="10" width="50" height="30" fill="#ff0000"/>
          </g>
        </svg>
      `;

      const { shapes } = FileManager.parse(svg);

      const group = shapes[0] as any;
      const rect = group.children[0] as any;

      // matrix(2,0,0,2,0,0) is equivalent to scale(2)
      expect(rect.x).toBe(20);       // 10 * 2
      expect(rect.y).toBe(20);       // 10 * 2
      expect(rect.width).toBe(100);  // 50 * 2
      expect(rect.height).toBe(60);  // 30 * 2
    });
  });

  describe('edge cases', () => {
    it('should handle negative scale', () => {
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
          <g data-group-type="group" transform="scale(-1, 1)">
            <rect x="10" y="10" width="50" height="30" fill="#ff0000"/>
          </g>
        </svg>
      `;

      const { shapes } = FileManager.parse(svg);

      const group = shapes[0] as any;
      const rect = group.children[0] as any;

      // Horizontal flip - x is negated and adjusted for width
      // The implementation normalizes negative widths
      expect(rect.x).toBe(-60);    // Adjusted x position for flipped rectangle
      expect(rect.width).toBe(50); // Width is kept positive (normalized)
      expect(rect.y).toBe(10);     // Y is unchanged
      expect(rect.height).toBe(30); // Height is unchanged
    });

    it('should handle zero scale gracefully', () => {
      const transform = parseTransform('scale(0)');

      expect(transform.scaleX).toBe(0);
      expect(transform.scaleY).toBe(0);
    });

    it('should handle very small scale', () => {
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
          <g data-group-type="group" transform="scale(0.1)">
            <rect x="100" y="100" width="100" height="100" fill="#ff0000"/>
          </g>
        </svg>
      `;

      const { shapes } = FileManager.parse(svg);

      const group = shapes[0] as any;
      const rect = group.children[0] as any;

      expect(rect.x).toBe(10);       // 100 * 0.1
      expect(rect.y).toBe(10);       // 100 * 0.1
      expect(rect.width).toBe(10);   // 100 * 0.1
      expect(rect.height).toBe(10);  // 100 * 0.1
    });

    it('should handle large translate values', () => {
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="10000" height="10000">
          <g data-group-type="group" transform="translate(5000, 5000)">
            <rect x="0" y="0" width="50" height="30" fill="#ff0000"/>
          </g>
        </svg>
      `;

      const { shapes } = FileManager.parse(svg);

      const group = shapes[0] as any;
      const rect = group.children[0] as any;

      expect(rect.x).toBe(5000);
      expect(rect.y).toBe(5000);
    });

    it('should preserve shapes without transform', () => {
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
          <g data-group-type="group">
            <rect x="50" y="60" width="100" height="80" fill="#ff0000"/>
          </g>
        </svg>
      `;

      const { shapes } = FileManager.parse(svg);

      const group = shapes[0] as any;
      const rect = group.children[0] as any;

      // No transform, values should be preserved
      expect(rect.x).toBe(50);
      expect(rect.y).toBe(60);
      expect(rect.width).toBe(100);
      expect(rect.height).toBe(80);
    });

    it('should handle comma-separated transform values', () => {
      const transform = parseTransform('translate(100,50) scale(2,3)');

      expect(transform.scaleX).toBe(2);
      expect(transform.scaleY).toBe(3);
      // translate is affected by scale
      expect(transform.translateX).toBe(200);  // 100 * 2
      expect(transform.translateY).toBe(150);  // 50 * 3
    });

    it('should handle space-separated transform values', () => {
      const transform = parseTransform('translate(100 50) scale(2 3)');

      expect(transform.scaleX).toBe(2);
      expect(transform.scaleY).toBe(3);
      expect(transform.translateX).toBe(200);
      expect(transform.translateY).toBe(150);
    });
  });
});
