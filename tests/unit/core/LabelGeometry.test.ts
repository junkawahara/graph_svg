import { describe, it, expect } from 'vitest';
import {
  normalizeAngle,
  clampPos,
  labelPosToNumber,
  normalizeTextRotation,
  calculateNodeLabelPosition,
  calculateStraightEdgeLabelPosition,
  calculateQuadraticEdgeLabelPosition,
  calculateCubicEdgeLabelPosition,
  calculatePathEdgeLabelPosition,
  getPathPointAndTangent
} from '../../../src/renderer/core/LabelGeometry';
import { NodeLabelPlacement, EdgeLabelPlacement, PathCommand, DEFAULT_NODE_LABEL_PLACEMENT, DEFAULT_EDGE_LABEL_PLACEMENT } from '../../../src/shared/types';
import { expectClose } from '../../utils/shape-comparators';

describe('LabelGeometry', () => {
  describe('normalizeAngle()', () => {
    it('should return angle unchanged if already in 0-360 range', () => {
      expect(normalizeAngle(0)).toBe(0);
      expect(normalizeAngle(90)).toBe(90);
      expect(normalizeAngle(180)).toBe(180);
      expect(normalizeAngle(270)).toBe(270);
      expect(normalizeAngle(359)).toBe(359);
    });

    it('should normalize negative angles', () => {
      expect(normalizeAngle(-90)).toBe(270);
      expect(normalizeAngle(-180)).toBe(180);
      expect(normalizeAngle(-270)).toBe(90);
      expect(normalizeAngle(-360)).toBe(0);
      expect(normalizeAngle(-450)).toBe(270);
    });

    it('should normalize angles >= 360', () => {
      expect(normalizeAngle(360)).toBe(0);
      expect(normalizeAngle(450)).toBe(90);
      expect(normalizeAngle(720)).toBe(0);
      expect(normalizeAngle(810)).toBe(90);
    });
  });

  describe('clampPos()', () => {
    it('should return value unchanged if in 0-1 range', () => {
      expect(clampPos(0)).toBe(0);
      expect(clampPos(0.5)).toBe(0.5);
      expect(clampPos(1)).toBe(1);
      expect(clampPos(0.25)).toBe(0.25);
      expect(clampPos(0.75)).toBe(0.75);
    });

    it('should clamp values below 0', () => {
      expect(clampPos(-0.1)).toBe(0);
      expect(clampPos(-1)).toBe(0);
      expect(clampPos(-100)).toBe(0);
    });

    it('should clamp values above 1', () => {
      expect(clampPos(1.1)).toBe(1);
      expect(clampPos(2)).toBe(1);
      expect(clampPos(100)).toBe(1);
    });
  });

  describe('labelPosToNumber()', () => {
    it('should return 0.5 for "auto"', () => {
      expect(labelPosToNumber('auto')).toBe(0.5);
    });

    it('should return 0.5 for "midway"', () => {
      expect(labelPosToNumber('midway')).toBe(0.5);
    });

    it('should return 0.25 for "near start"', () => {
      expect(labelPosToNumber('near start')).toBe(0.25);
    });

    it('should return 0.75 for "near end"', () => {
      expect(labelPosToNumber('near end')).toBe(0.75);
    });

    it('should return numeric value unchanged (within 0-1)', () => {
      expect(labelPosToNumber(0)).toBe(0);
      expect(labelPosToNumber(0.3)).toBe(0.3);
      expect(labelPosToNumber(0.5)).toBe(0.5);
      expect(labelPosToNumber(1)).toBe(1);
    });

    it('should clamp numeric values outside 0-1', () => {
      expect(labelPosToNumber(-0.5)).toBe(0);
      expect(labelPosToNumber(1.5)).toBe(1);
    });
  });

  describe('normalizeTextRotation()', () => {
    it('should keep angles in readable range', () => {
      expect(normalizeTextRotation(0)).toBe(0);
      expect(normalizeTextRotation(45)).toBe(45);
      expect(normalizeTextRotation(90)).toBe(90);
      // -45 is normalized to 315 first, which is not flipped
      expect(normalizeTextRotation(-45)).toBe(315);
    });

    it('should flip angles in bottom half (90-270) to keep text readable', () => {
      // 91-270 degrees should flip by 180
      expectClose(normalizeTextRotation(100), -80, 1);
      expectClose(normalizeTextRotation(135), -45, 1);
      expectClose(normalizeTextRotation(180), 0, 1);
      expectClose(normalizeTextRotation(225), 45, 1);
      expectClose(normalizeTextRotation(270), 90, 1);
    });

    it('should not flip angles just above 270 or below 90', () => {
      expectClose(normalizeTextRotation(280), 280, 1);
      expectClose(normalizeTextRotation(350), 350, 1);
    });
  });

  describe('calculateNodeLabelPosition()', () => {
    const cx = 100;
    const cy = 100;
    const rx = 30;
    const ry = 20;

    it('should return center position for "center" placement', () => {
      const placement: NodeLabelPlacement = { position: 'center', distance: 5 };
      const result = calculateNodeLabelPosition(cx, cy, rx, ry, placement);

      expect(result.x).toBe(100);
      expect(result.y).toBe(100);
      expect(result.textAnchor).toBe('middle');
      expect(result.dominantBaseline).toBe('middle');
    });

    it('should position label above node for "above" placement', () => {
      const placement: NodeLabelPlacement = { position: 'above', distance: 5 };
      const result = calculateNodeLabelPosition(cx, cy, rx, ry, placement);

      // Above means y should be less than center
      expect(result.y).toBeLessThan(cy - ry);
      expect(result.x).toBeCloseTo(cx, 1);
      expect(result.textAnchor).toBe('middle');
    });

    it('should position label below node for "below" placement', () => {
      const placement: NodeLabelPlacement = { position: 'below', distance: 5 };
      const result = calculateNodeLabelPosition(cx, cy, rx, ry, placement);

      // Below means y should be greater than center
      expect(result.y).toBeGreaterThan(cy + ry);
      expect(result.x).toBeCloseTo(cx, 1);
      expect(result.textAnchor).toBe('middle');
    });

    it('should position label to the left for "left" placement', () => {
      const placement: NodeLabelPlacement = { position: 'left', distance: 5 };
      const result = calculateNodeLabelPosition(cx, cy, rx, ry, placement);

      // Left means x should be less than center
      expect(result.x).toBeLessThan(cx - rx);
      expect(result.y).toBeCloseTo(cy, 1);
      expect(result.textAnchor).toBe('end');
    });

    it('should position label to the right for "right" placement', () => {
      const placement: NodeLabelPlacement = { position: 'right', distance: 5 };
      const result = calculateNodeLabelPosition(cx, cy, rx, ry, placement);

      // Right means x should be greater than center
      expect(result.x).toBeGreaterThan(cx + rx);
      expect(result.y).toBeCloseTo(cy, 1);
      expect(result.textAnchor).toBe('start');
    });

    it('should position label at diagonal for "above left" placement', () => {
      const placement: NodeLabelPlacement = { position: 'above left', distance: 5 };
      const result = calculateNodeLabelPosition(cx, cy, rx, ry, placement);

      expect(result.x).toBeLessThan(cx);
      expect(result.y).toBeLessThan(cy);
    });

    it('should position label at diagonal for "above right" placement', () => {
      const placement: NodeLabelPlacement = { position: 'above right', distance: 5 };
      const result = calculateNodeLabelPosition(cx, cy, rx, ry, placement);

      expect(result.x).toBeGreaterThan(cx);
      expect(result.y).toBeLessThan(cy);
    });

    it('should position label at diagonal for "below left" placement', () => {
      const placement: NodeLabelPlacement = { position: 'below left', distance: 5 };
      const result = calculateNodeLabelPosition(cx, cy, rx, ry, placement);

      expect(result.x).toBeLessThan(cx);
      expect(result.y).toBeGreaterThan(cy);
    });

    it('should position label at diagonal for "below right" placement', () => {
      const placement: NodeLabelPlacement = { position: 'below right', distance: 5 };
      const result = calculateNodeLabelPosition(cx, cy, rx, ry, placement);

      expect(result.x).toBeGreaterThan(cx);
      expect(result.y).toBeGreaterThan(cy);
    });

    it('should handle numeric angle (0 = right)', () => {
      const placement: NodeLabelPlacement = { position: 0, distance: 5 };
      const result = calculateNodeLabelPosition(cx, cy, rx, ry, placement);

      expect(result.x).toBeGreaterThan(cx + rx);
      expect(result.y).toBeCloseTo(cy, 1);
    });

    it('should handle numeric angle (90 = above)', () => {
      const placement: NodeLabelPlacement = { position: 90, distance: 5 };
      const result = calculateNodeLabelPosition(cx, cy, rx, ry, placement);

      expect(result.x).toBeCloseTo(cx, 1);
      expect(result.y).toBeLessThan(cy - ry);
    });

    it('should handle numeric angle (180 = left)', () => {
      const placement: NodeLabelPlacement = { position: 180, distance: 5 };
      const result = calculateNodeLabelPosition(cx, cy, rx, ry, placement);

      expect(result.x).toBeLessThan(cx - rx);
      expect(result.y).toBeCloseTo(cy, 1);
    });

    it('should handle numeric angle (270 = below)', () => {
      const placement: NodeLabelPlacement = { position: 270, distance: 5 };
      const result = calculateNodeLabelPosition(cx, cy, rx, ry, placement);

      expect(result.x).toBeCloseTo(cx, 1);
      expect(result.y).toBeGreaterThan(cy + ry);
    });

    it('should respect distance parameter', () => {
      const placement1: NodeLabelPlacement = { position: 'above', distance: 5 };
      const placement2: NodeLabelPlacement = { position: 'above', distance: 20 };

      const result1 = calculateNodeLabelPosition(cx, cy, rx, ry, placement1);
      const result2 = calculateNodeLabelPosition(cx, cy, rx, ry, placement2);

      // Larger distance should result in smaller y (further above)
      expect(result2.y).toBeLessThan(result1.y);
    });

    it('should use default placement if not provided', () => {
      const result = calculateNodeLabelPosition(cx, cy, rx, ry);
      expect(result).toBeDefined();
      expect(result.x).toBe(cx);
      expect(result.y).toBe(cy);
    });
  });

  describe('calculateStraightEdgeLabelPosition()', () => {
    const start = { x: 0, y: 0 };
    const end = { x: 100, y: 0 };

    it('should position label at midway by default', () => {
      const result = calculateStraightEdgeLabelPosition(start, end);

      expectClose(result.x, 50, 1);
      expect(result.rotation).toBe(0);
    });

    it('should position label at "near start"', () => {
      const placement: EdgeLabelPlacement = { pos: 'near start', side: 'above', sloped: false, distance: 5 };
      const result = calculateStraightEdgeLabelPosition(start, end, placement);

      expectClose(result.x, 25, 1);
    });

    it('should position label at "near end"', () => {
      const placement: EdgeLabelPlacement = { pos: 'near end', side: 'above', sloped: false, distance: 5 };
      const result = calculateStraightEdgeLabelPosition(start, end, placement);

      expectClose(result.x, 75, 1);
    });

    it('should position label at custom pos value', () => {
      const placement: EdgeLabelPlacement = { pos: 0.3, side: 'above', sloped: false, distance: 5 };
      const result = calculateStraightEdgeLabelPosition(start, end, placement);

      expectClose(result.x, 30, 1);
    });

    it('should offset label above the edge', () => {
      const placement: EdgeLabelPlacement = { pos: 'midway', side: 'above', sloped: false, distance: 10 };
      const result = calculateStraightEdgeLabelPosition(start, end, placement);

      // For horizontal line, "above" means negative y
      expectClose(result.y, -10, 1);
    });

    it('should offset label below the edge', () => {
      const placement: EdgeLabelPlacement = { pos: 'midway', side: 'below', sloped: false, distance: 10 };
      const result = calculateStraightEdgeLabelPosition(start, end, placement);

      // For horizontal line, "below" means positive y
      expectClose(result.y, 10, 1);
    });

    it('should not rotate when sloped is false', () => {
      const placement: EdgeLabelPlacement = { pos: 'midway', side: 'above', sloped: false, distance: 5 };
      const result = calculateStraightEdgeLabelPosition(start, end, placement);

      expect(result.rotation).toBe(0);
    });

    it('should rotate when sloped is true for horizontal line', () => {
      const placement: EdgeLabelPlacement = { pos: 'midway', side: 'above', sloped: true, distance: 5 };
      const result = calculateStraightEdgeLabelPosition(start, end, placement);

      // Horizontal line has 0 degree tangent
      expect(result.rotation).toBe(0);
    });

    it('should rotate when sloped is true for diagonal line', () => {
      const diagonalEnd = { x: 100, y: 100 };
      const placement: EdgeLabelPlacement = { pos: 'midway', side: 'above', sloped: true, distance: 5 };
      const result = calculateStraightEdgeLabelPosition(start, diagonalEnd, placement);

      // 45 degree line
      expectClose(result.rotation, 45, 1);
    });

    it('should keep text readable for steep angles (normalize rotation)', () => {
      const steepEnd = { x: -100, y: 50 };
      const placement: EdgeLabelPlacement = { pos: 'midway', side: 'above', sloped: true, distance: 5 };
      const result = calculateStraightEdgeLabelPosition(start, steepEnd, placement);

      // Should be normalized to readable range
      expect(result.rotation).toBeGreaterThanOrEqual(-90);
      expect(result.rotation).toBeLessThanOrEqual(90);
    });
  });

  describe('calculateQuadraticEdgeLabelPosition()', () => {
    const start = { x: 0, y: 0 };
    const control = { x: 50, y: -50 };
    const end = { x: 100, y: 0 };

    it('should position label at midway on curve', () => {
      const result = calculateQuadraticEdgeLabelPosition(start, control, end);

      // At t=0.5, point should be around x=50
      expectClose(result.x, 50, 5);
    });

    it('should position label at "near start"', () => {
      const placement: EdgeLabelPlacement = { pos: 'near start', side: 'above', sloped: false, distance: 5 };
      const result = calculateQuadraticEdgeLabelPosition(start, control, end, placement);

      // At t=0.25, point should be closer to start
      expect(result.x).toBeLessThan(50);
    });

    it('should position label at "near end"', () => {
      const placement: EdgeLabelPlacement = { pos: 'near end', side: 'above', sloped: false, distance: 5 };
      const result = calculateQuadraticEdgeLabelPosition(start, control, end, placement);

      // At t=0.75, point should be closer to end
      expect(result.x).toBeGreaterThan(50);
    });

    it('should apply rotation when sloped is true', () => {
      const placement: EdgeLabelPlacement = { pos: 'midway', side: 'above', sloped: true, distance: 5 };
      const result = calculateQuadraticEdgeLabelPosition(start, control, end, placement);

      // At midpoint of symmetric curve, tangent should be horizontal
      expectClose(result.rotation, 0, 5);
    });
  });

  describe('calculateCubicEdgeLabelPosition()', () => {
    const start = { x: 0, y: 0 };
    const ctrl1 = { x: 30, y: -50 };
    const ctrl2 = { x: 70, y: -50 };
    const end = { x: 100, y: 0 };

    it('should position label at midway on curve', () => {
      const result = calculateCubicEdgeLabelPosition(start, ctrl1, ctrl2, end);

      // At t=0.5, point should be around x=50
      expectClose(result.x, 50, 5);
    });

    it('should position label at "near start"', () => {
      const placement: EdgeLabelPlacement = { pos: 'near start', side: 'above', sloped: false, distance: 5 };
      const result = calculateCubicEdgeLabelPosition(start, ctrl1, ctrl2, end, placement);

      expect(result.x).toBeLessThan(50);
    });

    it('should position label at "near end"', () => {
      const placement: EdgeLabelPlacement = { pos: 'near end', side: 'above', sloped: false, distance: 5 };
      const result = calculateCubicEdgeLabelPosition(start, ctrl1, ctrl2, end, placement);

      expect(result.x).toBeGreaterThan(50);
    });

    it('should apply rotation when sloped is true', () => {
      const placement: EdgeLabelPlacement = { pos: 'midway', side: 'above', sloped: true, distance: 5 };
      const result = calculateCubicEdgeLabelPosition(start, ctrl1, ctrl2, end, placement);

      // Should have some rotation value
      expect(typeof result.rotation).toBe('number');
    });
  });

  describe('calculatePathEdgeLabelPosition()', () => {
    it('should return null for empty path', () => {
      const commands: PathCommand[] = [];
      const result = calculatePathEdgeLabelPosition(commands);

      expect(result).toBeNull();
    });

    it('should return null for path with only M command', () => {
      const commands: PathCommand[] = [
        { type: 'M', x: 0, y: 0 }
      ];
      const result = calculatePathEdgeLabelPosition(commands);

      expect(result).toBeNull();
    });

    it('should calculate position for simple line path', () => {
      const commands: PathCommand[] = [
        { type: 'M', x: 0, y: 0 },
        { type: 'L', x: 100, y: 0 }
      ];
      const result = calculatePathEdgeLabelPosition(commands);

      expect(result).not.toBeNull();
      expectClose(result!.x, 50, 5);
    });

    it('should calculate position for path with quadratic curve', () => {
      const commands: PathCommand[] = [
        { type: 'M', x: 0, y: 0 },
        { type: 'Q', cpx: 50, cpy: -50, x: 100, y: 0 }
      ];
      const result = calculatePathEdgeLabelPosition(commands);

      expect(result).not.toBeNull();
    });

    it('should calculate position for path with cubic curve', () => {
      const commands: PathCommand[] = [
        { type: 'M', x: 0, y: 0 },
        { type: 'C', cp1x: 30, cp1y: -50, cp2x: 70, cp2y: -50, x: 100, y: 0 }
      ];
      const result = calculatePathEdgeLabelPosition(commands);

      expect(result).not.toBeNull();
    });

    it('should handle multi-segment path', () => {
      const commands: PathCommand[] = [
        { type: 'M', x: 0, y: 0 },
        { type: 'L', x: 50, y: 0 },
        { type: 'L', x: 100, y: 0 }
      ];
      const result = calculatePathEdgeLabelPosition(commands);

      expect(result).not.toBeNull();
    });
  });

  describe('getPathPointAndTangent()', () => {
    it('should return null for path with less than 2 commands', () => {
      const result = getPathPointAndTangent([{ type: 'M', x: 0, y: 0 }], 0.5);
      expect(result).toBeNull();
    });

    it('should return point and tangent for simple line', () => {
      const commands: PathCommand[] = [
        { type: 'M', x: 0, y: 0 },
        { type: 'L', x: 100, y: 0 }
      ];
      const result = getPathPointAndTangent(commands, 0.5);

      expect(result).not.toBeNull();
      expectClose(result!.point.x, 50, 1);
      expectClose(result!.point.y, 0, 1);
      expectClose(result!.tangentAngle, 0, 1);
    });

    it('should return point at t=0 (start)', () => {
      const commands: PathCommand[] = [
        { type: 'M', x: 0, y: 0 },
        { type: 'L', x: 100, y: 0 }
      ];
      const result = getPathPointAndTangent(commands, 0);

      expect(result).not.toBeNull();
      expectClose(result!.point.x, 0, 1);
      expectClose(result!.point.y, 0, 1);
    });

    it('should return point at t=1 (end)', () => {
      const commands: PathCommand[] = [
        { type: 'M', x: 0, y: 0 },
        { type: 'L', x: 100, y: 0 }
      ];
      const result = getPathPointAndTangent(commands, 1);

      expect(result).not.toBeNull();
      expectClose(result!.point.x, 100, 1);
      expectClose(result!.point.y, 0, 1);
    });

    it('should calculate tangent for diagonal line', () => {
      const commands: PathCommand[] = [
        { type: 'M', x: 0, y: 0 },
        { type: 'L', x: 100, y: 100 }
      ];
      const result = getPathPointAndTangent(commands, 0.5);

      expect(result).not.toBeNull();
      expectClose(result!.tangentAngle, 45, 1);
    });
  });
});
