import { Point, PathCommand, generateId } from '../../shared/types';
import { Tool } from './Tool';
import { Path } from '../shapes/Path';
import { editorState } from '../core/EditorState';
import { eventBus } from '../core/EventBus';

/**
 * Tool for drawing SVG paths with multiple command types
 * - Click to add L (line) commands
 * - Shift+Click to add C (cubic bezier) commands
 * - Double-click or Enter to finish (open path)
 * - Click near starting point to close path (Z command)
 * - Escape to cancel
 */
export class PathTool implements Tool {
  readonly name = 'path';

  private commands: PathCommand[] = [];
  private previewPath: SVGPathElement | null = null;
  private previewLine: SVGLineElement | null = null;
  private startMarker: SVGCircleElement | null = null;
  private svgElement: SVGSVGElement;
  private keyHandler: ((e: KeyboardEvent) => void) | null = null;
  private pendingBezier: boolean = false;
  private bezierControlPoint1: Point | null = null;

  private static CLOSE_DISTANCE = 15;

  constructor(svgElement: SVGSVGElement) {
    this.svgElement = svgElement;
  }

  onActivate(): void {
    this.keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this.cancelDrawing();
      } else if (e.key === 'Enter' && this.commands.length >= 2) {
        this.finishPath(false);
      }
    };
    document.addEventListener('keydown', this.keyHandler);
  }

  onDeactivate(): void {
    this.cleanup();
    if (this.keyHandler) {
      document.removeEventListener('keydown', this.keyHandler);
      this.keyHandler = null;
    }
  }

  onMouseDown(point: Point, event: MouseEvent): void {
    const snappedPoint = editorState.snapPoint(point);

    // Check for double-click to finish (open path)
    if (event.detail === 2 && this.commands.length >= 2) {
      this.finishPath(false);
      return;
    }

    // Check if clicking near the starting point to close
    if (this.commands.length >= 3) {
      const startCmd = this.commands[0];
      if (startCmd.type === 'M') {
        const dist = Math.sqrt(
          (snappedPoint.x - startCmd.x) ** 2 + (snappedPoint.y - startCmd.y) ** 2
        );
        if (dist <= PathTool.CLOSE_DISTANCE) {
          this.finishPath(true);
          return;
        }
      }
    }

    // First point: add M command
    if (this.commands.length === 0) {
      this.commands.push({ type: 'M', x: snappedPoint.x, y: snappedPoint.y });
      this.updatePreview(snappedPoint);
      return;
    }

    // Shift+Click: start bezier mode
    if (event.shiftKey) {
      this.pendingBezier = true;
      this.bezierControlPoint1 = { x: snappedPoint.x, y: snappedPoint.y };
      return;
    }

    // Normal click: add L command
    this.commands.push({ type: 'L', x: snappedPoint.x, y: snappedPoint.y });
    this.updatePreview(snappedPoint);
  }

  onMouseMove(point: Point, _event: MouseEvent): void {
    if (this.commands.length === 0) return;

    const snappedPoint = editorState.snapPoint(point);

    // Update the preview line from last point to current mouse position
    if (this.previewLine) {
      const lastPos = this.getLastPosition();
      this.previewLine.setAttribute('x1', String(lastPos.x));
      this.previewLine.setAttribute('y1', String(lastPos.y));
      this.previewLine.setAttribute('x2', String(snappedPoint.x));
      this.previewLine.setAttribute('y2', String(snappedPoint.y));
    }

    // Update the preview path
    if (this.previewPath) {
      const previewCommands = [...this.commands];
      previewCommands.push({ type: 'L', x: snappedPoint.x, y: snappedPoint.y });
      const pathData = this.buildPathData(previewCommands);
      this.previewPath.setAttribute('d', pathData);
    }

    // Highlight start marker when near first point
    if (this.startMarker && this.commands.length >= 3) {
      const startCmd = this.commands[0];
      if (startCmd.type === 'M') {
        const dist = Math.sqrt(
          (snappedPoint.x - startCmd.x) ** 2 + (snappedPoint.y - startCmd.y) ** 2
        );
        if (dist <= PathTool.CLOSE_DISTANCE) {
          this.startMarker.setAttribute('fill', '#00ff00');
          this.startMarker.setAttribute('r', '8');
        } else {
          this.startMarker.setAttribute('fill', '#ff0000');
          this.startMarker.setAttribute('r', '5');
        }
      }
    }
  }

  onMouseUp(point: Point, event: MouseEvent): void {
    if (!this.pendingBezier || !this.bezierControlPoint1) return;

    const snappedPoint = editorState.snapPoint(point);
    const lastPos = this.getLastPosition();

    // Calculate cp2 as reflection of drag direction from endpoint
    const cp1 = this.bezierControlPoint1;
    const cp2 = {
      x: snappedPoint.x - (snappedPoint.x - lastPos.x) * 0.3,
      y: snappedPoint.y - (snappedPoint.y - lastPos.y) * 0.3
    };

    // Add C command
    this.commands.push({
      type: 'C',
      cp1x: cp1.x,
      cp1y: cp1.y,
      cp2x: cp2.x,
      cp2y: cp2.y,
      x: snappedPoint.x,
      y: snappedPoint.y
    });

    this.pendingBezier = false;
    this.bezierControlPoint1 = null;
    this.updatePreview(snappedPoint);
  }

  onMouseLeave(): void {
    // Don't cancel on mouse leave
  }

  /**
   * Get the last position from commands
   */
  private getLastPosition(): Point {
    for (let i = this.commands.length - 1; i >= 0; i--) {
      const cmd = this.commands[i];
      if (cmd.type === 'M' || cmd.type === 'L' || cmd.type === 'C' || cmd.type === 'Q') {
        return { x: cmd.x, y: cmd.y };
      }
    }
    return { x: 0, y: 0 };
  }

  /**
   * Build SVG path data from commands
   */
  private buildPathData(commands: PathCommand[]): string {
    const parts: string[] = [];
    for (const cmd of commands) {
      switch (cmd.type) {
        case 'M':
          parts.push(`M ${cmd.x} ${cmd.y}`);
          break;
        case 'L':
          parts.push(`L ${cmd.x} ${cmd.y}`);
          break;
        case 'C':
          parts.push(`C ${cmd.cp1x} ${cmd.cp1y} ${cmd.cp2x} ${cmd.cp2y} ${cmd.x} ${cmd.y}`);
          break;
        case 'Q':
          parts.push(`Q ${cmd.cpx} ${cmd.cpy} ${cmd.x} ${cmd.y}`);
          break;
        case 'Z':
          parts.push('Z');
          break;
      }
    }
    return parts.join(' ');
  }

  private updatePreview(currentPoint: Point): void {
    const style = editorState.currentStyle;

    // Create preview path if needed
    if (!this.previewPath) {
      this.previewPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      this.previewPath.setAttribute('fill', style.fillNone ? 'none' : style.fill);
      this.previewPath.setAttribute('stroke', style.stroke);
      this.previewPath.setAttribute('stroke-width', String(style.strokeWidth));
      this.previewPath.setAttribute('stroke-dasharray', '5,5');
      this.previewPath.setAttribute('opacity', '0.5');
      this.previewPath.classList.add('preview-shape');
      this.svgElement.appendChild(this.previewPath);
    }

    // Create preview line if needed
    if (!this.previewLine) {
      this.previewLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      this.previewLine.setAttribute('stroke', style.stroke);
      this.previewLine.setAttribute('stroke-width', String(style.strokeWidth));
      this.previewLine.setAttribute('stroke-dasharray', '5,5');
      this.previewLine.setAttribute('opacity', '0.7');
      this.previewLine.classList.add('preview-shape');
      this.svgElement.appendChild(this.previewLine);
    }

    // Create start marker for first point
    if (this.commands.length === 1 && !this.startMarker) {
      const startCmd = this.commands[0];
      if (startCmd.type === 'M') {
        this.startMarker = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        this.startMarker.setAttribute('cx', String(startCmd.x));
        this.startMarker.setAttribute('cy', String(startCmd.y));
        this.startMarker.setAttribute('r', '5');
        this.startMarker.setAttribute('fill', '#ff0000');
        this.startMarker.setAttribute('stroke', '#ffffff');
        this.startMarker.setAttribute('stroke-width', '2');
        this.startMarker.classList.add('preview-shape');
        this.svgElement.appendChild(this.startMarker);
      }
    }

    // Update path
    const pathData = this.buildPathData(this.commands);
    this.previewPath.setAttribute('d', pathData);

    // Update preview line
    this.previewLine.setAttribute('x1', String(currentPoint.x));
    this.previewLine.setAttribute('y1', String(currentPoint.y));
    this.previewLine.setAttribute('x2', String(currentPoint.x));
    this.previewLine.setAttribute('y2', String(currentPoint.y));
  }

  private finishPath(closed: boolean): void {
    if (this.commands.length < 2) {
      this.cancelDrawing();
      return;
    }

    // Add Z command if closing
    const finalCommands = [...this.commands];
    if (closed) {
      finalCommands.push({ type: 'Z' });
    }

    // Create the path shape
    const path = new Path(
      generateId(),
      finalCommands,
      { ...editorState.currentStyle }
    );
    eventBus.emit('shape:added', path);

    // Reset for next path
    this.cleanup();
  }

  private cancelDrawing(): void {
    this.cleanup();
  }

  private cleanup(): void {
    if (this.previewPath) {
      this.previewPath.remove();
      this.previewPath = null;
    }
    if (this.previewLine) {
      this.previewLine.remove();
      this.previewLine = null;
    }
    if (this.startMarker) {
      this.startMarker.remove();
      this.startMarker = null;
    }
    this.commands = [];
    this.pendingBezier = false;
    this.bezierControlPoint1 = null;
  }
}
