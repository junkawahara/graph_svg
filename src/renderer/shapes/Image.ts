import { Point, Bounds, ShapeStyle, ImageData, generateId } from '../../shared/types';
import { Shape, applyRotation, normalizeRotation, rotatePoint, getRotatedBounds } from './Shape';

/**
 * Image shape implementation
 * Supports embedded (base64) and external URL images
 */
export class Image implements Shape {
  readonly type = 'image';
  element: SVGImageElement | null = null;
  rotation: number = 0;
  className?: string;

  constructor(
    public readonly id: string,
    public x: number,
    public y: number,
    public width: number,
    public height: number,
    public href: string,
    public preserveAspectRatio: string,
    public style: ShapeStyle,
    rotation: number = 0
  ) {
    this.rotation = normalizeRotation(rotation);
  }

  /**
   * Create image from SVG element
   */
  static fromElement(el: SVGImageElement, style: ShapeStyle): Image {
    // SVG 2 uses href, SVG 1.1 uses xlink:href
    const href = el.getAttribute('href') || el.getAttributeNS('http://www.w3.org/1999/xlink', 'href') || '';
    const preserveAspectRatio = el.getAttribute('preserveAspectRatio') || 'xMidYMid meet';

    return new Image(
      el.id || generateId(),
      parseFloat(el.getAttribute('x') || '0'),
      parseFloat(el.getAttribute('y') || '0'),
      parseFloat(el.getAttribute('width') || '0'),
      parseFloat(el.getAttribute('height') || '0'),
      href,
      preserveAspectRatio,
      style
    );
  }

  render(): SVGImageElement {
    const image = document.createElementNS('http://www.w3.org/2000/svg', 'image');
    image.id = this.id;
    image.setAttribute('x', String(this.x));
    image.setAttribute('y', String(this.y));
    image.setAttribute('width', String(this.width));
    image.setAttribute('height', String(this.height));
    image.setAttribute('href', this.href);
    image.setAttribute('preserveAspectRatio', this.preserveAspectRatio);

    // Apply opacity from style
    if (this.style.opacity < 1) {
      image.setAttribute('opacity', String(this.style.opacity));
    }

    // Apply rotation
    const center = this.getRotationCenter();
    applyRotation(image, this.rotation, center.x, center.y);

    this.element = image;
    return image;
  }

  updateElement(): void {
    if (!this.element) return;

    this.element.setAttribute('x', String(this.x));
    this.element.setAttribute('y', String(this.y));
    this.element.setAttribute('width', String(this.width));
    this.element.setAttribute('height', String(this.height));
    this.element.setAttribute('href', this.href);
    this.element.setAttribute('preserveAspectRatio', this.preserveAspectRatio);

    // Apply opacity from style
    if (this.style.opacity < 1) {
      this.element.setAttribute('opacity', String(this.style.opacity));
    } else {
      this.element.removeAttribute('opacity');
    }

    // Apply rotation
    const center = this.getRotationCenter();
    applyRotation(this.element, this.rotation, center.x, center.y);
  }

  hitTest(point: Point, tolerance: number = 5): boolean {
    // If rotated, transform the test point to the shape's local coordinate system
    let testPoint = point;
    if (this.rotation !== 0) {
      const center = this.getRotationCenter();
      testPoint = rotatePoint(point, center, -this.rotation);
    }

    // Check if point is within image bounds + tolerance
    return testPoint.x >= this.x - tolerance &&
           testPoint.x <= this.x + this.width + tolerance &&
           testPoint.y >= this.y - tolerance &&
           testPoint.y <= this.y + this.height + tolerance;
  }

  getBounds(): Bounds {
    const baseBounds = {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height
    };
    return getRotatedBounds(baseBounds, this.rotation);
  }

  getRotationCenter(): Point {
    return {
      x: this.x + this.width / 2,
      y: this.y + this.height / 2
    };
  }

  setRotation(angle: number): void {
    this.rotation = normalizeRotation(angle);
    this.updateElement();
  }

  move(dx: number, dy: number): void {
    this.x += dx;
    this.y += dy;
    this.updateElement();
  }

  serialize(): ImageData {
    return {
      id: this.id,
      type: 'image',
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      href: this.href,
      preserveAspectRatio: this.preserveAspectRatio,
      style: { ...this.style },
      rotation: this.rotation,
      className: this.className
    };
  }

  clone(): Image {
    const cloned = new Image(
      generateId(),
      this.x,
      this.y,
      this.width,
      this.height,
      this.href,
      this.preserveAspectRatio,
      { ...this.style },
      this.rotation
    );
    cloned.className = this.className;
    return cloned;
  }

  applyTransform(translateX: number, translateY: number, scaleX: number, scaleY: number): void {
    this.x = this.x * scaleX + translateX;
    this.y = this.y * scaleY + translateY;
    this.width = this.width * Math.abs(scaleX);
    this.height = this.height * Math.abs(scaleY);
    // Handle negative scale (flip)
    if (scaleX < 0) {
      this.x -= this.width;
    }
    if (scaleY < 0) {
      this.y -= this.height;
    }
    this.updateElement();
  }

  /**
   * Check if the image uses an embedded data URI
   */
  isEmbedded(): boolean {
    return this.href.startsWith('data:');
  }

  /**
   * Get the MIME type of an embedded image
   */
  getMimeType(): string | null {
    if (!this.isEmbedded()) return null;
    const match = this.href.match(/^data:([^;,]+)/);
    return match ? match[1] : null;
  }
}
