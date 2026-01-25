import { Point, Bounds, ShapeStyle, TextData, TextAnchor, DominantBaseline, TextRun, TextRunStyle, generateId } from '../../shared/types';
import { Shape, applyStyle, applyRotation, normalizeRotation, rotatePoint, getRotatedBounds } from './Shape';
import { round3 } from '../core/MathUtils';
import { Matrix2D, decomposeMatrix } from '../core/TransformParser';
import { plainTextToRuns, runsToPlainText, cloneRuns, hasRichStyles, normalizeRuns } from '../core/TextRunUtils';

/**
 * Text shape implementation
 */
export class Text implements Shape {
  readonly type = 'text';
  element: SVGTextElement | null = null;
  rotation: number = 0;
  className?: string;

  /**
   * Rich text runs: array of lines, each line is array of styled text fragments.
   * null = plain text mode (uses content property only)
   */
  runs: TextRun[][] | null = null;

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
    public dominantBaseline: DominantBaseline = 'auto',
    public fontStyle: 'normal' | 'italic' = 'normal',
    public textUnderline: boolean = false,
    public textStrikethrough: boolean = false,
    public lineHeight: number = 1.2,
    rotation: number = 0,
    runs: TextRun[][] | null = null
  ) {
    this.rotation = normalizeRotation(rotation);
    this.runs = runs;
  }

  /**
   * Create text from SVG element
   */
  static fromElement(el: SVGTextElement, style: ShapeStyle): Text {
    // Parse text-decoration
    const textDecoration = el.getAttribute('text-decoration') || '';
    const textUnderline = textDecoration.includes('underline');
    const textStrikethrough = textDecoration.includes('line-through');

    // Get direct child tspans (line-level)
    const lineTspans = Array.from(el.children).filter(
      child => child.tagName.toLowerCase() === 'tspan'
    ) as SVGTSpanElement[];

    let content = '';
    let runs: TextRun[][] | null = null;
    let lineHeight = 1.2;

    if (lineTspans.length > 0) {
      // Check if we have nested tspans (rich text)
      const hasNestedTspans = lineTspans.some(
        lineTspan => lineTspan.querySelector('tspan') !== null
      );

      if (hasNestedTspans) {
        // Parse rich text with nested tspans
        const parsedRuns = Text.parseRichTextFromElement(lineTspans);
        runs = parsedRuns.runs;
        content = runsToPlainText(runs);
      } else {
        // Simple multi-line text without rich styling
        content = lineTspans.map(t => t.textContent || '').join('\n');
      }

      // Parse line-height from second line tspan
      if (lineTspans.length > 1) {
        const dy = parseFloat(lineTspans[1].getAttribute('dy') || '0');
        const fontSize = parseFloat(el.getAttribute('font-size') || '24');
        if (dy > 0 && fontSize > 0) {
          lineHeight = dy / fontSize;
        }
      }
    } else {
      // No tspans - simple single-line text
      content = el.textContent || '';
    }

    const text = new Text(
      el.id || generateId(),
      parseFloat(el.getAttribute('x') || '0'),
      parseFloat(el.getAttribute('y') || '0'),
      content,
      parseFloat(el.getAttribute('font-size') || '24'),
      el.getAttribute('font-family') || 'Arial',
      (el.getAttribute('font-weight') === 'bold' ? 'bold' : 'normal'),
      style,
      (el.getAttribute('text-anchor') as TextAnchor) || 'start',
      (el.getAttribute('dominant-baseline') as DominantBaseline) || 'auto',
      (el.getAttribute('font-style') === 'italic' ? 'italic' : 'normal'),
      textUnderline,
      textStrikethrough,
      lineHeight,
      0,
      runs
    );

    return text;
  }

  /**
   * Parse rich text from nested tspan elements
   */
  private static parseRichTextFromElement(lineTspans: SVGTSpanElement[]): { runs: TextRun[][] } {
    const runs: TextRun[][] = [];

    for (const lineTspan of lineTspans) {
      const lineRuns: TextRun[] = [];
      const nestedTspans = lineTspan.querySelectorAll('tspan');

      if (nestedTspans.length > 0) {
        // Parse each nested tspan as a run
        nestedTspans.forEach(runTspan => {
          const run: TextRun = {
            text: runTspan.textContent || '',
            style: Text.parseRunStyleFromElement(runTspan)
          };
          lineRuns.push(run);
        });
      } else {
        // No nested tspans - treat as single run
        lineRuns.push({
          text: lineTspan.textContent || '',
          style: Text.parseRunStyleFromElement(lineTspan)
        });
      }

      runs.push(lineRuns.length > 0 ? lineRuns : [{ text: '' }]);
    }

    return { runs: normalizeRuns(runs) };
  }

  /**
   * Parse TextRunStyle from a tspan element
   */
  private static parseRunStyleFromElement(tspan: SVGTSpanElement): TextRunStyle | undefined {
    const style: TextRunStyle = {};
    let hasStyle = false;

    const fontWeight = tspan.getAttribute('font-weight');
    if (fontWeight === 'bold' || fontWeight === 'normal') {
      style.fontWeight = fontWeight;
      hasStyle = true;
    }

    const fontStyle = tspan.getAttribute('font-style');
    if (fontStyle === 'italic' || fontStyle === 'normal') {
      style.fontStyle = fontStyle;
      hasStyle = true;
    }

    const fill = tspan.getAttribute('fill');
    if (fill) {
      style.fill = fill;
      hasStyle = true;
    }

    const textDecoration = tspan.getAttribute('text-decoration') || '';
    if (textDecoration.includes('underline')) {
      style.textUnderline = true;
      hasStyle = true;
    }
    if (textDecoration.includes('line-through')) {
      style.textStrikethrough = true;
      hasStyle = true;
    }

    return hasStyle ? style : undefined;
  }

  /**
   * Render content to text element (handles multi-line and rich text)
   */
  private renderContent(textElement: SVGTextElement): void {
    // Clear existing content
    textElement.innerHTML = '';

    // Check if we have rich text runs
    if (this.runs && hasRichStyles(this.runs)) {
      this.renderRichContent(textElement);
    } else {
      this.renderPlainContent(textElement);
    }
  }

  /**
   * Render plain text content (no rich styling)
   */
  private renderPlainContent(textElement: SVGTextElement): void {
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
   * Render rich text content with nested tspans for styling
   */
  private renderRichContent(textElement: SVGTextElement): void {
    if (!this.runs) return;

    this.runs.forEach((lineRuns, lineIndex) => {
      // Create line tspan
      const lineTspan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
      lineTspan.setAttribute('x', String(this.x));

      if (lineIndex === 0) {
        lineTspan.setAttribute('dy', '0');
      } else {
        lineTspan.setAttribute('dy', String(this.fontSize * this.lineHeight));
      }

      // Check if all runs have no style (plain line)
      const hasStyledRuns = lineRuns.some(run => run.style && Object.keys(run.style).length > 0);

      if (!hasStyledRuns) {
        // No styled runs - just set text content
        const lineText = lineRuns.map(run => run.text).join('');
        lineTspan.textContent = lineText || ' ';
      } else {
        // Create nested tspans for each run
        lineRuns.forEach(run => {
          if (!run.style || Object.keys(run.style).length === 0) {
            // No style - add text directly or as simple tspan
            const runTspan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
            runTspan.textContent = run.text;
            lineTspan.appendChild(runTspan);
          } else {
            // Has style - create styled tspan
            const runTspan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
            runTspan.textContent = run.text;
            this.applyRunStyle(runTspan, run.style);
            lineTspan.appendChild(runTspan);
          }
        });

        // Handle empty lines
        if (lineTspan.childNodes.length === 0) {
          lineTspan.textContent = ' ';
        }
      }

      textElement.appendChild(lineTspan);
    });
  }

  /**
   * Apply TextRunStyle to a tspan element
   */
  private applyRunStyle(tspan: SVGTSpanElement, style: TextRunStyle): void {
    if (style.fontWeight) {
      tspan.setAttribute('font-weight', style.fontWeight);
    }
    if (style.fontStyle) {
      tspan.setAttribute('font-style', style.fontStyle);
    }
    if (style.fill) {
      tspan.setAttribute('fill', style.fill);
    }

    // Build text-decoration
    const decorations: string[] = [];
    if (style.textUnderline) decorations.push('underline');
    if (style.textStrikethrough) decorations.push('line-through');
    if (decorations.length > 0) {
      tspan.setAttribute('text-decoration', decorations.join(' '));
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

  /**
   * Set content and sync runs if needed
   * When content changes, reset runs to match new content
   */
  setContent(newContent: string): void {
    if (this.content === newContent) return;

    this.content = newContent;

    // If we have runs, rebuild them from new content
    // This preserves the runs structure but updates the text
    if (this.runs) {
      this.runs = plainTextToRuns(newContent);
    }
  }

  /**
   * Set runs and sync content
   */
  setRuns(newRuns: TextRun[][] | null): void {
    this.runs = newRuns;
    if (newRuns) {
      this.content = runsToPlainText(newRuns);
    }
  }

  /**
   * Get runs, creating from content if necessary
   * This allows applying rich text styles to plain text
   */
  getOrCreateRuns(): TextRun[][] {
    if (!this.runs) {
      this.runs = plainTextToRuns(this.content);
    }
    return this.runs;
  }

  /**
   * Check if this text has rich styling
   */
  hasRichText(): boolean {
    return this.runs !== null && hasRichStyles(this.runs);
  }

  render(): SVGTextElement {
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.id = this.id;
    text.setAttribute('x', String(this.x));
    text.setAttribute('y', String(this.y));
    text.setAttribute('font-size', String(this.fontSize));
    text.setAttribute('font-family', this.fontFamily);
    text.setAttribute('font-weight', this.fontWeight);
    text.setAttribute('dominant-baseline', this.dominantBaseline);
    text.setAttribute('text-anchor', this.textAnchor);
    text.setAttribute('font-style', this.fontStyle);
    text.setAttribute('text-decoration', this.getTextDecoration());

    // Render content (handles multi-line)
    this.renderContent(text);

    applyStyle(text, this.style);

    // Apply rotation
    const center = this.getRotationCenter();
    applyRotation(text, this.rotation, center.x, center.y);

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
    this.element.setAttribute('dominant-baseline', this.dominantBaseline);
    this.element.setAttribute('text-anchor', this.textAnchor);
    this.element.setAttribute('font-style', this.fontStyle);
    this.element.setAttribute('text-decoration', this.getTextDecoration());

    // Re-render content (handles multi-line updates)
    this.renderContent(this.element);

    applyStyle(this.element, this.style);

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

    const bounds = this.getBaseBounds();
    return testPoint.x >= bounds.x - tolerance &&
           testPoint.x <= bounds.x + bounds.width + tolerance &&
           testPoint.y >= bounds.y - tolerance &&
           testPoint.y <= bounds.y + bounds.height + tolerance;
  }

  /**
   * Get base bounds (without rotation)
   */
  private getBaseBounds(): Bounds {
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

  getBounds(): Bounds {
    return getRotatedBounds(this.getBaseBounds(), this.rotation);
  }

  getRotationCenter(): Point {
    const bounds = this.getBaseBounds();
    return {
      x: bounds.x + bounds.width / 2,
      y: bounds.y + bounds.height / 2
    };
  }

  setRotation(angle: number): void {
    this.rotation = normalizeRotation(angle);
    this.updateElement();
  }

  move(dx: number, dy: number): void {
    this.x = round3(this.x + dx);
    this.y = round3(this.y + dy);
    this.updateElement();
  }

  serialize(): TextData {
    const data: TextData = {
      id: this.id,
      type: 'text',
      content: this.content,
      x: this.x,
      y: this.y,
      fontSize: this.fontSize,
      fontFamily: this.fontFamily,
      fontWeight: this.fontWeight,
      textAnchor: this.textAnchor,
      dominantBaseline: this.dominantBaseline,
      fontStyle: this.fontStyle,
      textUnderline: this.textUnderline,
      textStrikethrough: this.textStrikethrough,
      lineHeight: this.lineHeight,
      style: { ...this.style },
      rotation: this.rotation,
      className: this.className
    };

    // Include runs only if there are rich styles
    if (this.runs && hasRichStyles(this.runs)) {
      data.runs = cloneRuns(this.runs);
    }

    return data;
  }

  clone(): Text {
    const cloned = new Text(
      generateId(),
      this.x,
      this.y,
      this.content,
      this.fontSize,
      this.fontFamily,
      this.fontWeight,
      { ...this.style },
      this.textAnchor,
      this.dominantBaseline,
      this.fontStyle,
      this.textUnderline,
      this.textStrikethrough,
      this.lineHeight,
      this.rotation,
      this.runs ? cloneRuns(this.runs) : null
    );
    cloned.className = this.className;
    return cloned;
  }

  applyTransform(translateX: number, translateY: number, scaleX: number, scaleY: number): void {
    this.x = round3(this.x * scaleX + translateX);
    this.y = round3(this.y * scaleY + translateY);
    // Scale font size by average scale factor
    const avgScale = (Math.abs(scaleX) + Math.abs(scaleY)) / 2;
    this.fontSize = round3(this.fontSize * avgScale);
    this.updateElement();
  }

  applyMatrix(matrix: Matrix2D): void {
    const decomposed = decomposeMatrix(matrix);

    // Apply translate and scale
    this.applyTransform(
      decomposed.translateX,
      decomposed.translateY,
      decomposed.scaleX,
      decomposed.scaleY
    );

    // Apply rotation
    if (Math.abs(decomposed.rotation) > 1e-9) {
      this.rotation = normalizeRotation(this.rotation + decomposed.rotation);
    }

    // Warn about skew (text doesn't support skew)
    if (Math.abs(decomposed.skewX) > 1e-9 || Math.abs(decomposed.skewY) > 1e-9) {
      console.warn(`Text "${this.id}" does not support skew transform, skew will be ignored`);
    }

    this.updateElement();
  }
}
