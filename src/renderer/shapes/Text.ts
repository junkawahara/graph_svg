import { Point, Bounds, ShapeStyle, TextData, generateId } from '../../shared/types';
import { Shape, applyStyle } from './Shape';

/**
 * Text shape implementation
 */
export class Text implements Shape {
  readonly type = 'text';
  element: SVGTextElement | null = null;

  constructor(
    public readonly id: string,
    public x: number,
    public y: number,
    public content: string,
    public fontSize: number,
    public fontFamily: string,
    public fontWeight: 'normal' | 'bold',
    public style: ShapeStyle
  ) {}

  /**
   * Create text from SVG element
   */
  static fromElement(el: SVGTextElement, style: ShapeStyle): Text {
    return new Text(
      el.id || generateId(),
      parseFloat(el.getAttribute('x') || '0'),
      parseFloat(el.getAttribute('y') || '0'),
      el.textContent || '',
      parseFloat(el.getAttribute('font-size') || '24'),
      el.getAttribute('font-family') || 'Arial',
      (el.getAttribute('font-weight') === 'bold' ? 'bold' : 'normal'),
      style
    );
  }

  render(): SVGTextElement {
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.id = this.id;
    text.setAttribute('x', String(this.x));
    text.setAttribute('y', String(this.y));
    text.setAttribute('font-size', String(this.fontSize));
    text.setAttribute('font-family', this.fontFamily);
    text.setAttribute('font-weight', this.fontWeight);
    text.setAttribute('dominant-baseline', 'hanging');
    text.textContent = this.content;
    applyStyle(text, this.style);

    this.element = text;
    return text;
  }

  updateElement(): void {
    if (!this.element) return;

    this.element.setAttribute('x', String(this.x));
    this.element.setAttribute('y', String(this.y));
    this.element.setAttribute('font-size', String(this.fontSize));
    this.element.setAttribute('font-family', this.fontFamily);
    this.element.setAttribute('font-weight', this.fontWeight);
    this.element.textContent = this.content;
    applyStyle(this.element, this.style);
  }

  hitTest(point: Point, tolerance: number = 5): boolean {
    const bounds = this.getBounds();
    return point.x >= bounds.x - tolerance &&
           point.x <= bounds.x + bounds.width + tolerance &&
           point.y >= bounds.y - tolerance &&
           point.y <= bounds.y + bounds.height + tolerance;
  }

  getBounds(): Bounds {
    // If element exists in DOM, use actual measurements
    if (this.element) {
      const bbox = this.element.getBBox();
      return {
        x: bbox.x,
        y: bbox.y,
        width: bbox.width,
        height: bbox.height
      };
    }

    // Approximate bounds based on font size and content length
    const approxWidth = this.content.length * this.fontSize * 0.6;
    const approxHeight = this.fontSize;
    return {
      x: this.x,
      y: this.y,
      width: approxWidth,
      height: approxHeight
    };
  }

  move(dx: number, dy: number): void {
    this.x += dx;
    this.y += dy;
    this.updateElement();
  }

  serialize(): TextData {
    return {
      id: this.id,
      type: 'text',
      content: this.content,
      x: this.x,
      y: this.y,
      fontSize: this.fontSize,
      fontFamily: this.fontFamily,
      fontWeight: this.fontWeight,
      style: { ...this.style }
    };
  }

  clone(): Text {
    return new Text(
      generateId(),
      this.x,
      this.y,
      this.content,
      this.fontSize,
      this.fontFamily,
      this.fontWeight,
      { ...this.style }
    );
  }
}
