import { Point, Bounds, ShapeStyle, TextData, TextAnchor, generateId } from '../../shared/types';
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
    public style: ShapeStyle,
    public textAnchor: TextAnchor = 'start',
    public fontStyle: 'normal' | 'italic' = 'normal',
    public textUnderline: boolean = false,
    public textStrikethrough: boolean = false,
    public lineHeight: number = 1.2
  ) {}

  /**
   * Create text from SVG element
   */
  static fromElement(el: SVGTextElement, style: ShapeStyle): Text {
    // Parse text-decoration
    const textDecoration = el.getAttribute('text-decoration') || '';
    const textUnderline = textDecoration.includes('underline');
    const textStrikethrough = textDecoration.includes('line-through');

    // Parse content - handle tspan elements for multi-line
    let content = '';
    const tspans = el.querySelectorAll('tspan');
    if (tspans.length > 0) {
      content = Array.from(tspans).map(t => t.textContent || '').join('\n');
    } else {
      content = el.textContent || '';
    }

    // Parse line-height (from dy attribute of second tspan or default)
    let lineHeight = 1.2;
    if (tspans.length > 1) {
      const dy = parseFloat(tspans[1].getAttribute('dy') || '0');
      const fontSize = parseFloat(el.getAttribute('font-size') || '24');
      if (dy > 0 && fontSize > 0) {
        lineHeight = dy / fontSize;
      }
    }

    return new Text(
      el.id || generateId(),
      parseFloat(el.getAttribute('x') || '0'),
      parseFloat(el.getAttribute('y') || '0'),
      content,
      parseFloat(el.getAttribute('font-size') || '24'),
      el.getAttribute('font-family') || 'Arial',
      (el.getAttribute('font-weight') === 'bold' ? 'bold' : 'normal'),
      style,
      (el.getAttribute('text-anchor') as TextAnchor) || 'start',
      (el.getAttribute('font-style') === 'italic' ? 'italic' : 'normal'),
      textUnderline,
      textStrikethrough,
      lineHeight
    );
  }

  /**
   * Render content to text element (handles multi-line)
   */
  private renderContent(textElement: SVGTextElement): void {
    // Clear existing content
    textElement.innerHTML = '';

    const lines = this.content.split('\n');

    if (lines.length === 1) {
      // Single line - use textContent directly
      textElement.textContent = this.content;
    } else {
      // Multi-line - use tspan elements
      lines.forEach((line, index) => {
        const tspan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
        tspan.setAttribute('x', String(this.x));

        if (index === 0) {
          // First line - no dy offset
          tspan.setAttribute('dy', '0');
        } else {
          // Subsequent lines - offset by lineHeight * fontSize
          tspan.setAttribute('dy', String(this.fontSize * this.lineHeight));
        }

        tspan.textContent = line || ' '; // Empty line needs at least a space
        textElement.appendChild(tspan);
      });
    }
  }

  /**
   * Build text-decoration attribute value
   */
  private getTextDecoration(): string {
    const decorations: string[] = [];
    if (this.textUnderline) decorations.push('underline');
    if (this.textStrikethrough) decorations.push('line-through');
    return decorations.length > 0 ? decorations.join(' ') : 'none';
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
    text.setAttribute('text-anchor', this.textAnchor);
    text.setAttribute('font-style', this.fontStyle);
    text.setAttribute('text-decoration', this.getTextDecoration());

    // Render content (handles multi-line)
    this.renderContent(text);

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
    this.element.setAttribute('text-anchor', this.textAnchor);
    this.element.setAttribute('font-style', this.fontStyle);
    this.element.setAttribute('text-decoration', this.getTextDecoration());

    // Re-render content (handles multi-line updates)
    this.renderContent(this.element);

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

    // Approximate bounds based on font size, content, and anchor
    const lines = this.content.split('\n');
    const maxLineLength = Math.max(...lines.map(l => l.length));
    const approxWidth = maxLineLength * this.fontSize * 0.6;
    const approxHeight = lines.length * this.fontSize * this.lineHeight;

    // Adjust x based on anchor
    let adjustedX = this.x;
    if (this.textAnchor === 'middle') {
      adjustedX = this.x - approxWidth / 2;
    } else if (this.textAnchor === 'end') {
      adjustedX = this.x - approxWidth;
    }

    return {
      x: adjustedX,
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
      textAnchor: this.textAnchor,
      fontStyle: this.fontStyle,
      textUnderline: this.textUnderline,
      textStrikethrough: this.textStrikethrough,
      lineHeight: this.lineHeight,
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
      { ...this.style },
      this.textAnchor,
      this.fontStyle,
      this.textUnderline,
      this.textStrikethrough,
      this.lineHeight
    );
  }
}
