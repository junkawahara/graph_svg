/**
 * Command for adding a point to a path segment
 * Works with both Path shapes and Edge shapes (lineType='path')
 */

import { Command } from './Command';
import { Path } from '../shapes/Path';
import { Edge } from '../shapes/Edge';
import { Shape } from '../shapes/Shape';
import { Point, PathCommand } from '../../shared/types';
import {
  splitCubicBezier,
  splitQuadraticBezier,
  splitLine,
  generateSmoothControlPoints
} from '../core/PathGeometry';
import { round3 } from '../core/MathUtils';

/**
 * Interface for shapes that support path point operations
 */
interface PathPointEditable {
  insertCommand(index: number, command: PathCommand): void;
  replaceCommand(index: number, command: PathCommand): void;
  removeCommand(index: number): PathCommand | null;
  getCommand(index: number): PathCommand | null;
  getCommandStart(cmdIndex: number): Point;
}

/**
 * Get shape as PathPointEditable
 */
function asPathPointEditable(shape: Shape): PathPointEditable | null {
  if (shape.type === 'path') {
    return shape as Path;
  } else if (shape.type === 'edge') {
    const edge = shape as Edge;
    if (edge.lineType === 'path') {
      return edge;
    }
  }
  return null;
}

export class AddPathPointCommand implements Command {
  private shape: Shape;
  private commandIndex: number;
  private t: number;
  private insertPoint: Point;
  private useBezier: boolean;

  // State for undo
  private originalCommand: PathCommand | null = null;
  private insertedCommandCount: number = 0;

  constructor(
    shape: Shape,
    commandIndex: number,
    t: number,
    insertPoint: Point,
    useBezier: boolean
  ) {
    this.shape = shape;
    this.commandIndex = commandIndex;
    this.t = t;
    this.insertPoint = insertPoint;
    this.useBezier = useBezier;
  }

  execute(): void {
    const editable = asPathPointEditable(this.shape);
    if (!editable) return;

    const cmd = editable.getCommand(this.commandIndex);
    if (!cmd) return;

    // Store original command for undo
    this.originalCommand = { ...cmd } as PathCommand;

    // Get the start point of this segment
    const startPoint = editable.getCommandStart(this.commandIndex);

    switch (cmd.type) {
      case 'L':
        this.splitLineSegment(editable, startPoint, cmd);
        break;
      case 'C':
        this.splitCubicSegment(editable, startPoint, cmd);
        break;
      case 'Q':
        this.splitQuadraticSegment(editable, startPoint, cmd);
        break;
      case 'Z':
        this.splitClosingSegment(editable, startPoint);
        break;
      default:
        console.warn(`Cannot split segment of type ${cmd.type}`);
    }
  }

  private splitLineSegment(
    editable: PathPointEditable,
    start: Point,
    cmd: { type: 'L'; x: number; y: number }
  ): void {
    const midPoint = this.insertPoint;
    const endPoint = { x: cmd.x, y: cmd.y };

    if (this.useBezier) {
      // Convert L to two C commands with smooth control points
      const controlPoints = generateSmoothControlPoints(start, midPoint, endPoint);

      const firstC: PathCommand = {
        type: 'C',
        cp1x: controlPoints.first.cp1.x,
        cp1y: controlPoints.first.cp1.y,
        cp2x: controlPoints.first.cp2.x,
        cp2y: controlPoints.first.cp2.y,
        x: round3(midPoint.x),
        y: round3(midPoint.y)
      };
      const secondC: PathCommand = {
        type: 'C',
        cp1x: controlPoints.second.cp1.x,
        cp1y: controlPoints.second.cp1.y,
        cp2x: controlPoints.second.cp2.x,
        cp2y: controlPoints.second.cp2.y,
        x: round3(endPoint.x),
        y: round3(endPoint.y)
      };

      editable.replaceCommand(this.commandIndex, firstC);
      editable.insertCommand(this.commandIndex + 1, secondC);
      this.insertedCommandCount = 1;
    } else {
      // Split L into two L commands
      const firstL: PathCommand = {
        type: 'L',
        x: round3(midPoint.x),
        y: round3(midPoint.y)
      };
      const secondL: PathCommand = {
        type: 'L',
        x: round3(endPoint.x),
        y: round3(endPoint.y)
      };

      editable.replaceCommand(this.commandIndex, firstL);
      editable.insertCommand(this.commandIndex + 1, secondL);
      this.insertedCommandCount = 1;
    }
  }

  private splitCubicSegment(
    editable: PathPointEditable,
    start: Point,
    cmd: { type: 'C'; cp1x: number; cp1y: number; cp2x: number; cp2y: number; x: number; y: number }
  ): void {
    const split = splitCubicBezier(
      start,
      { x: cmd.cp1x, y: cmd.cp1y },
      { x: cmd.cp2x, y: cmd.cp2y },
      { x: cmd.x, y: cmd.y },
      this.t
    );

    const firstC: PathCommand = {
      type: 'C',
      cp1x: split.first.cp1.x,
      cp1y: split.first.cp1.y,
      cp2x: split.first.cp2.x,
      cp2y: split.first.cp2.y,
      x: split.first.end.x,
      y: split.first.end.y
    };
    const secondC: PathCommand = {
      type: 'C',
      cp1x: split.second.cp1.x,
      cp1y: split.second.cp1.y,
      cp2x: split.second.cp2.x,
      cp2y: split.second.cp2.y,
      x: split.second.end.x,
      y: split.second.end.y
    };

    editable.replaceCommand(this.commandIndex, firstC);
    editable.insertCommand(this.commandIndex + 1, secondC);
    this.insertedCommandCount = 1;
  }

  private splitQuadraticSegment(
    editable: PathPointEditable,
    start: Point,
    cmd: { type: 'Q'; cpx: number; cpy: number; x: number; y: number }
  ): void {
    const split = splitQuadraticBezier(
      start,
      { x: cmd.cpx, y: cmd.cpy },
      { x: cmd.x, y: cmd.y },
      this.t
    );

    const firstQ: PathCommand = {
      type: 'Q',
      cpx: split.first.cp.x,
      cpy: split.first.cp.y,
      x: split.first.end.x,
      y: split.first.end.y
    };
    const secondQ: PathCommand = {
      type: 'Q',
      cpx: split.second.cp.x,
      cpy: split.second.cp.y,
      x: split.second.end.x,
      y: split.second.end.y
    };

    editable.replaceCommand(this.commandIndex, firstQ);
    editable.insertCommand(this.commandIndex + 1, secondQ);
    this.insertedCommandCount = 1;
  }

  private splitClosingSegment(editable: PathPointEditable, start: Point): void {
    // For Z command, insert a new L or C command before Z
    if (this.useBezier) {
      // Get start point for control point calculation
      const endPoint = editable.getCommand(0); // M command
      if (endPoint && endPoint.type === 'M') {
        const controlPoints = generateSmoothControlPoints(
          start,
          this.insertPoint,
          { x: endPoint.x, y: endPoint.y }
        );
        const newC: PathCommand = {
          type: 'C',
          cp1x: controlPoints.first.cp1.x,
          cp1y: controlPoints.first.cp1.y,
          cp2x: controlPoints.first.cp2.x,
          cp2y: controlPoints.first.cp2.y,
          x: round3(this.insertPoint.x),
          y: round3(this.insertPoint.y)
        };
        // Insert before Z
        editable.insertCommand(this.commandIndex, newC);
        this.insertedCommandCount = 1;
      }
    } else {
      const newL: PathCommand = {
        type: 'L',
        x: round3(this.insertPoint.x),
        y: round3(this.insertPoint.y)
      };
      // Insert before Z
      editable.insertCommand(this.commandIndex, newL);
      this.insertedCommandCount = 1;
    }
  }

  undo(): void {
    if (!this.originalCommand) return;

    const editable = asPathPointEditable(this.shape);
    if (!editable) return;

    // Remove the inserted command(s)
    for (let i = 0; i < this.insertedCommandCount; i++) {
      editable.removeCommand(this.commandIndex + 1);
    }

    // Restore original command
    editable.replaceCommand(this.commandIndex, this.originalCommand);
  }

  getDescription(): string {
    return this.useBezier ? 'Add bezier point to path' : 'Add point to path';
  }
}
