import { describe, it, expect } from 'vitest';
import { Polygon } from '../../../src/renderer/shapes/Polygon';
import { Polyline } from '../../../src/renderer/shapes/Polyline';
import { Path } from '../../../src/renderer/shapes/Path';
import { PathCommand } from '../../../src/shared/types';
import {
  createTestPolygon,
  createTestPolyline,
  createTestPath,
  createTestStyle,
  roundTrip
} from '../../utils/mock-factories';
import {
  expectPolygonEqual,
  expectPolylineEqual,
  expectPathEqual,
  expectClose
} from '../../utils/shape-comparators';

describe('Complex Shapes Round-Trip', () => {
  describe('Polygon', () => {
    it('should preserve triangle points', () => {
      const original = createTestPolygon({
        points: [
          { x: 100, y: 0 },
          { x: 200, y: 173 },
          { x: 0, y: 173 }
        ]
      });

      const { shapes } = roundTrip([original]);

      expect(shapes).toHaveLength(1);
      const restored = shapes[0] as Polygon;
      expectPolygonEqual(restored, original);
    });

    it('should preserve quadrilateral points', () => {
      const original = createTestPolygon({
        points: [
          { x: 50, y: 50 },
          { x: 150, y: 50 },
          { x: 150, y: 150 },
          { x: 50, y: 150 }
        ]
      });

      const { shapes } = roundTrip([original]);

      expect(shapes).toHaveLength(1);
      const restored = shapes[0] as Polygon;
      expectPolygonEqual(restored, original);
    });

    it('should preserve complex polygon with many vertices', () => {
      const points = [];
      for (let i = 0; i < 10; i++) {
        const angle = (i / 10) * Math.PI * 2;
        points.push({
          x: Math.round(100 + 50 * Math.cos(angle) * 1000) / 1000,
          y: Math.round(100 + 50 * Math.sin(angle) * 1000) / 1000
        });
      }
      const original = createTestPolygon({ points });

      const { shapes } = roundTrip([original]);

      expect(shapes).toHaveLength(1);
      const restored = shapes[0] as Polygon;
      expectPolygonEqual(restored, original);
    });

    it('should preserve decimal coordinates', () => {
      const original = createTestPolygon({
        points: [
          { x: 10.123, y: 20.456 },
          { x: 100.789, y: 20.012 },
          { x: 55.555, y: 80.888 }
        ]
      });

      const { shapes } = roundTrip([original]);

      expect(shapes).toHaveLength(1);
      const restored = shapes[0] as Polygon;
      expectPolygonEqual(restored, original);
    });

    it('should preserve negative coordinates', () => {
      const original = createTestPolygon({
        points: [
          { x: -50, y: -50 },
          { x: 50, y: -50 },
          { x: 0, y: 50 }
        ]
      });

      const { shapes } = roundTrip([original]);

      expect(shapes).toHaveLength(1);
      const restored = shapes[0] as Polygon;
      expectPolygonEqual(restored, original);
    });
  });

  describe('Polyline', () => {
    it('should preserve points', () => {
      const original = createTestPolyline({
        points: [
          { x: 10, y: 10 },
          { x: 50, y: 30 },
          { x: 90, y: 10 },
          { x: 130, y: 30 }
        ]
      });

      const { shapes } = roundTrip([original]);

      expect(shapes).toHaveLength(1);
      const restored = shapes[0] as Polyline;
      expectPolylineEqual(restored, original);
    });

    it('should preserve two-point polyline', () => {
      const original = createTestPolyline({
        points: [
          { x: 0, y: 0 },
          { x: 100, y: 100 }
        ]
      });

      const { shapes } = roundTrip([original]);

      expect(shapes).toHaveLength(1);
      const restored = shapes[0] as Polyline;
      expectPolylineEqual(restored, original);
    });

    it('should preserve zigzag pattern', () => {
      const original = createTestPolyline({
        points: [
          { x: 0, y: 0 },
          { x: 25, y: 50 },
          { x: 50, y: 0 },
          { x: 75, y: 50 },
          { x: 100, y: 0 }
        ]
      });

      const { shapes } = roundTrip([original]);

      expect(shapes).toHaveLength(1);
      const restored = shapes[0] as Polyline;
      expectPolylineEqual(restored, original);
    });

    it('should preserve decimal coordinates', () => {
      const original = createTestPolyline({
        points: [
          { x: 10.111, y: 20.222 },
          { x: 30.333, y: 40.444 },
          { x: 50.555, y: 60.666 }
        ]
      });

      const { shapes } = roundTrip([original]);

      expect(shapes).toHaveLength(1);
      const restored = shapes[0] as Polyline;
      expectPolylineEqual(restored, original);
    });
  });

  describe('Path', () => {
    describe('Move and Line commands', () => {
      it('should preserve M L path', () => {
        const commands: PathCommand[] = [
          { type: 'M', x: 10, y: 10 },
          { type: 'L', x: 100, y: 10 },
          { type: 'L', x: 100, y: 100 }
        ];
        const original = createTestPath({ commands });

        const { shapes } = roundTrip([original]);

        expect(shapes).toHaveLength(1);
        const restored = shapes[0] as Path;
        expectPathEqual(restored, original);
      });

      it('should preserve closed path with Z', () => {
        const commands: PathCommand[] = [
          { type: 'M', x: 10, y: 10 },
          { type: 'L', x: 100, y: 10 },
          { type: 'L', x: 100, y: 100 },
          { type: 'L', x: 10, y: 100 },
          { type: 'Z' }
        ];
        const original = createTestPath({ commands });

        const { shapes } = roundTrip([original]);

        expect(shapes).toHaveLength(1);
        const restored = shapes[0] as Path;
        expectPathEqual(restored, original);
      });

      it('should preserve triangle path', () => {
        const commands: PathCommand[] = [
          { type: 'M', x: 50, y: 0 },
          { type: 'L', x: 100, y: 86.6 },
          { type: 'L', x: 0, y: 86.6 },
          { type: 'Z' }
        ];
        const original = createTestPath({ commands });

        const { shapes } = roundTrip([original]);

        expect(shapes).toHaveLength(1);
        const restored = shapes[0] as Path;
        expectPathEqual(restored, original);
      });
    });

    describe('Cubic Bezier (C) command', () => {
      it('should preserve cubic bezier curve', () => {
        const commands: PathCommand[] = [
          { type: 'M', x: 10, y: 80 },
          { type: 'C', cp1x: 40, cp1y: 10, cp2x: 65, cp2y: 10, x: 95, y: 80 }
        ];
        const original = createTestPath({ commands });

        const { shapes } = roundTrip([original]);

        expect(shapes).toHaveLength(1);
        const restored = shapes[0] as Path;
        expectPathEqual(restored, original);
      });

      it('should preserve multiple cubic bezier curves', () => {
        const commands: PathCommand[] = [
          { type: 'M', x: 10, y: 80 },
          { type: 'C', cp1x: 40, cp1y: 10, cp2x: 65, cp2y: 10, x: 95, y: 80 },
          { type: 'C', cp1x: 125, cp1y: 150, cp2x: 150, cp2y: 150, x: 180, y: 80 }
        ];
        const original = createTestPath({ commands });

        const { shapes } = roundTrip([original]);

        expect(shapes).toHaveLength(1);
        const restored = shapes[0] as Path;
        expectPathEqual(restored, original);
      });

      it('should preserve S-curve with cubic beziers', () => {
        const commands: PathCommand[] = [
          { type: 'M', x: 0, y: 50 },
          { type: 'C', cp1x: 20, cp1y: 0, cp2x: 40, cp2y: 0, x: 50, y: 50 },
          { type: 'C', cp1x: 60, cp1y: 100, cp2x: 80, cp2y: 100, x: 100, y: 50 }
        ];
        const original = createTestPath({ commands });

        const { shapes } = roundTrip([original]);

        expect(shapes).toHaveLength(1);
        const restored = shapes[0] as Path;
        expectPathEqual(restored, original);
      });
    });

    describe('Quadratic Bezier (Q) command', () => {
      it('should preserve quadratic bezier curve', () => {
        const commands: PathCommand[] = [
          { type: 'M', x: 10, y: 80 },
          { type: 'Q', cpx: 52.5, cpy: 10, x: 95, y: 80 }
        ];
        const original = createTestPath({ commands });

        const { shapes } = roundTrip([original]);

        expect(shapes).toHaveLength(1);
        const restored = shapes[0] as Path;
        expectPathEqual(restored, original);
      });

      it('should preserve multiple quadratic bezier curves', () => {
        const commands: PathCommand[] = [
          { type: 'M', x: 10, y: 80 },
          { type: 'Q', cpx: 50, cpy: 10, x: 90, y: 80 },
          { type: 'Q', cpx: 130, cpy: 150, x: 170, y: 80 }
        ];
        const original = createTestPath({ commands });

        const { shapes } = roundTrip([original]);

        expect(shapes).toHaveLength(1);
        const restored = shapes[0] as Path;
        expectPathEqual(restored, original);
      });
    });

    describe('Arc (A) command', () => {
      it('should preserve simple arc', () => {
        const commands: PathCommand[] = [
          { type: 'M', x: 10, y: 80 },
          { type: 'A', rx: 45, ry: 45, xAxisRotation: 0, largeArcFlag: false, sweepFlag: false, x: 125, y: 125 }
        ];
        const original = createTestPath({ commands });

        const { shapes } = roundTrip([original]);

        expect(shapes).toHaveLength(1);
        const restored = shapes[0] as Path;
        expectPathEqual(restored, original);
      });

      it('should preserve arc with large arc flag', () => {
        const commands: PathCommand[] = [
          { type: 'M', x: 10, y: 80 },
          { type: 'A', rx: 45, ry: 45, xAxisRotation: 0, largeArcFlag: true, sweepFlag: false, x: 125, y: 125 }
        ];
        const original = createTestPath({ commands });

        const { shapes } = roundTrip([original]);

        expect(shapes).toHaveLength(1);
        const restored = shapes[0] as Path;
        expectPathEqual(restored, original);
      });

      it('should preserve arc with sweep flag', () => {
        const commands: PathCommand[] = [
          { type: 'M', x: 10, y: 80 },
          { type: 'A', rx: 45, ry: 45, xAxisRotation: 0, largeArcFlag: false, sweepFlag: true, x: 125, y: 125 }
        ];
        const original = createTestPath({ commands });

        const { shapes } = roundTrip([original]);

        expect(shapes).toHaveLength(1);
        const restored = shapes[0] as Path;
        expectPathEqual(restored, original);
      });

      it('should preserve elliptical arc with rotation', () => {
        const commands: PathCommand[] = [
          { type: 'M', x: 10, y: 80 },
          { type: 'A', rx: 60, ry: 30, xAxisRotation: 45, largeArcFlag: false, sweepFlag: true, x: 125, y: 125 }
        ];
        const original = createTestPath({ commands });

        const { shapes } = roundTrip([original]);

        expect(shapes).toHaveLength(1);
        const restored = shapes[0] as Path;
        expectPathEqual(restored, original);
      });
    });

    describe('Mixed commands', () => {
      it('should preserve path with L and C commands', () => {
        const commands: PathCommand[] = [
          { type: 'M', x: 10, y: 10 },
          { type: 'L', x: 50, y: 10 },
          { type: 'C', cp1x: 80, cp1y: 10, cp2x: 80, cp2y: 50, x: 80, y: 80 },
          { type: 'L', x: 10, y: 80 },
          { type: 'Z' }
        ];
        const original = createTestPath({ commands });

        const { shapes } = roundTrip([original]);

        expect(shapes).toHaveLength(1);
        const restored = shapes[0] as Path;
        expectPathEqual(restored, original);
      });

      it('should preserve complex path with all command types', () => {
        const commands: PathCommand[] = [
          { type: 'M', x: 10, y: 50 },
          { type: 'L', x: 30, y: 50 },
          { type: 'Q', cpx: 50, cpy: 10, x: 70, y: 50 },
          { type: 'C', cp1x: 90, cp1y: 90, cp2x: 110, cp2y: 90, x: 130, y: 50 },
          { type: 'A', rx: 20, ry: 20, xAxisRotation: 0, largeArcFlag: false, sweepFlag: true, x: 170, y: 50 },
          { type: 'L', x: 190, y: 50 }
        ];
        const original = createTestPath({ commands });

        const { shapes } = roundTrip([original]);

        expect(shapes).toHaveLength(1);
        const restored = shapes[0] as Path;
        expectPathEqual(restored, original);
      });
    });

    describe('Path with markers', () => {
      it('should preserve path with arrow marker on end', () => {
        const commands: PathCommand[] = [
          { type: 'M', x: 10, y: 50 },
          { type: 'L', x: 100, y: 50 }
        ];
        const original = createTestPath({
          commands,
          markerEnd: 'arrow-medium'
        });

        const { shapes } = roundTrip([original]);

        expect(shapes).toHaveLength(1);
        const restored = shapes[0] as Path;
        expect(restored.markerEnd).toBe('arrow-medium');
      });

      it('should preserve path with markers on both ends', () => {
        const commands: PathCommand[] = [
          { type: 'M', x: 10, y: 50 },
          { type: 'C', cp1x: 50, cp1y: 10, cp2x: 150, cp2y: 90, x: 190, y: 50 }
        ];
        const original = createTestPath({
          commands,
          markerStart: 'circle-small',
          markerEnd: 'triangle-large'
        });

        const { shapes } = roundTrip([original]);

        expect(shapes).toHaveLength(1);
        const restored = shapes[0] as Path;
        expect(restored.markerStart).toBe('circle-small');
        expect(restored.markerEnd).toBe('triangle-large');
      });
    });
  });

  describe('Multiple Complex Shapes', () => {
    it('should preserve multiple polygons and paths', () => {
      const polygon = createTestPolygon({
        id: 'polygon-1',
        points: [
          { x: 10, y: 10 },
          { x: 50, y: 10 },
          { x: 30, y: 50 }
        ]
      });
      const polyline = createTestPolyline({
        id: 'polyline-1',
        points: [
          { x: 100, y: 10 },
          { x: 150, y: 30 },
          { x: 200, y: 10 }
        ]
      });
      const path = createTestPath({
        id: 'path-1',
        commands: [
          { type: 'M', x: 250, y: 10 },
          { type: 'C', cp1x: 280, cp1y: 50, cp2x: 320, cp2y: 50, x: 350, y: 10 }
        ]
      });

      const { shapes } = roundTrip([polygon, polyline, path]);

      expect(shapes).toHaveLength(3);

      const restoredPolygon = shapes.find(s => s.type === 'polygon') as Polygon;
      const restoredPolyline = shapes.find(s => s.type === 'polyline') as Polyline;
      const restoredPath = shapes.find(s => s.type === 'path') as Path;

      expect(restoredPolygon).toBeDefined();
      expect(restoredPolyline).toBeDefined();
      expect(restoredPath).toBeDefined();

      expectPolygonEqual(restoredPolygon, polygon);
      expectPolylineEqual(restoredPolyline, polyline);
      expectPathEqual(restoredPath, path);
    });
  });
});
