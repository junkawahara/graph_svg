import { Point, Bounds, ShapeStyle, GroupData, ShapeData, generateId, DEFAULT_STYLE } from '../../shared/types';
import { Shape } from './Shape';

/**
 * Group shape implementation - contains multiple shapes as children
 */
export class Group implements Shape {
  readonly type = 'group';
  element: SVGGElement | null = null;
  children: Shape[];

  constructor(
    public readonly id: string,
    children: Shape[],
    public style: ShapeStyle
  ) {
    this.children = [...children];
  }

  /**
   * Create a group from an array of shapes
   */
  static fromShapes(shapes: Shape[]): Group {
    return new Group(generateId(), shapes, { ...DEFAULT_STYLE });
  }

  render(): SVGGElement {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.id = this.id;
    g.setAttribute('data-group-type', 'group');

    // Render all children and append to group
    for (const child of this.children) {
      const childElement = child.render();
      g.appendChild(childElement);
    }

    this.element = g;
    return g;
  }

  updateElement(): void {
    if (!this.element) return;

    // Update all children
    for (const child of this.children) {
      child.updateElement();
    }
  }

  hitTest(point: Point, tolerance: number = 5): boolean {
    // Check if point is within the group's bounding box
    const bounds = this.getBounds();

    const inBounds = point.x >= bounds.x - tolerance &&
                     point.x <= bounds.x + bounds.width + tolerance &&
                     point.y >= bounds.y - tolerance &&
                     point.y <= bounds.y + bounds.height + tolerance;

    if (!inBounds) {
      return false;
    }

    // Also check if any child is hit (for more precise hit testing)
    for (const child of this.children) {
      if (child.hitTest(point, tolerance)) {
        return true;
      }
    }

    return false;
  }

  getBounds(): Bounds {
    if (this.children.length === 0) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const child of this.children) {
      const bounds = child.getBounds();
      minX = Math.min(minX, bounds.x);
      minY = Math.min(minY, bounds.y);
      maxX = Math.max(maxX, bounds.x + bounds.width);
      maxY = Math.max(maxY, bounds.y + bounds.height);
    }

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  }

  move(dx: number, dy: number): void {
    for (const child of this.children) {
      child.move(dx, dy);
    }
    this.updateElement();
  }

  /**
   * Scale the group from a specific origin point
   */
  scale(sx: number, sy: number, origin: Point): void {
    for (const child of this.children) {
      const bounds = child.getBounds();

      // Calculate new position relative to origin
      const newX = origin.x + (bounds.x - origin.x) * sx;
      const newY = origin.y + (bounds.y - origin.y) * sy;

      // Move to new position
      const dx = newX - bounds.x;
      const dy = newY - bounds.y;
      child.move(dx, dy);

      // Scale the child if it has scalable dimensions
      this.scaleChild(child, sx, sy);
    }
    this.updateElement();
  }

  /**
   * Scale a child shape's dimensions
   */
  private scaleChild(child: Shape, sx: number, sy: number): void {
    // Handle different shape types
    switch (child.type) {
      case 'rectangle': {
        const rect = child as any;
        rect.width *= sx;
        rect.height *= sy;
        break;
      }
      case 'ellipse':
      case 'node': {
        const ellipse = child as any;
        ellipse.rx *= sx;
        ellipse.ry *= sy;
        break;
      }
      case 'line': {
        const line = child as any;
        // For lines, adjust the endpoint relative to start
        const dx = (line.x2 - line.x1) * (sx - 1);
        const dy = (line.y2 - line.y1) * (sy - 1);
        line.x2 += dx;
        line.y2 += dy;
        break;
      }
      case 'polygon':
      case 'polyline': {
        const poly = child as any;
        if (poly.points && poly.points.length > 0) {
          const firstPoint = poly.points[0];
          for (const point of poly.points) {
            point.x = firstPoint.x + (point.x - firstPoint.x) * sx;
            point.y = firstPoint.y + (point.y - firstPoint.y) * sy;
          }
        }
        break;
      }
      case 'group': {
        // Recursively scale nested groups
        const group = child as Group;
        const childBounds = group.getBounds();
        const childOrigin = { x: childBounds.x, y: childBounds.y };
        group.scale(sx, sy, childOrigin);
        break;
      }
      // text doesn't scale dimensions
    }
    child.updateElement();
  }

  serialize(): GroupData {
    return {
      id: this.id,
      type: 'group',
      style: { ...this.style },
      children: this.children.map(child => child.serialize())
    };
  }

  clone(): Group {
    // Deep clone all children
    const clonedChildren = this.children.map(child => child.clone());
    return new Group(generateId(), clonedChildren, { ...this.style });
  }

  /**
   * Get all child shapes (for ungrouping)
   */
  getChildren(): Shape[] {
    return [...this.children];
  }

  /**
   * Find a child shape by ID
   */
  findChildById(id: string): Shape | null {
    for (const child of this.children) {
      if (child.id === id) {
        return child;
      }
      // Recursively search nested groups
      if (child.type === 'group') {
        const found = (child as Group).findChildById(id);
        if (found) return found;
      }
    }
    return null;
  }
}
