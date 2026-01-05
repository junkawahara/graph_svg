import { Command } from './Command';
import { Text } from '../shapes/Text';
import { TextAnchor } from '../../shared/types';

export interface TextPropertyUpdates {
  content?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: 'normal' | 'bold';
  textAnchor?: TextAnchor;
  fontStyle?: 'normal' | 'italic';
  textUnderline?: boolean;
  textStrikethrough?: boolean;
  lineHeight?: number;
}

/**
 * Command for changing text-specific properties (supports undo/redo)
 */
export class TextPropertyChangeCommand implements Command {
  private oldValues: TextPropertyUpdates;

  constructor(
    private text: Text,
    private newValues: TextPropertyUpdates
  ) {
    // Store old values for undo
    this.oldValues = {};
    if (newValues.content !== undefined) {
      this.oldValues.content = text.content;
    }
    if (newValues.fontSize !== undefined) {
      this.oldValues.fontSize = text.fontSize;
    }
    if (newValues.fontFamily !== undefined) {
      this.oldValues.fontFamily = text.fontFamily;
    }
    if (newValues.fontWeight !== undefined) {
      this.oldValues.fontWeight = text.fontWeight;
    }
    if (newValues.textAnchor !== undefined) {
      this.oldValues.textAnchor = text.textAnchor;
    }
    if (newValues.fontStyle !== undefined) {
      this.oldValues.fontStyle = text.fontStyle;
    }
    if (newValues.textUnderline !== undefined) {
      this.oldValues.textUnderline = text.textUnderline;
    }
    if (newValues.textStrikethrough !== undefined) {
      this.oldValues.textStrikethrough = text.textStrikethrough;
    }
    if (newValues.lineHeight !== undefined) {
      this.oldValues.lineHeight = text.lineHeight;
    }
  }

  execute(): void {
    this.applyValues(this.newValues);
  }

  undo(): void {
    this.applyValues(this.oldValues);
  }

  private applyValues(values: TextPropertyUpdates): void {
    if (values.content !== undefined) {
      this.text.content = values.content;
    }
    if (values.fontSize !== undefined) {
      this.text.fontSize = values.fontSize;
    }
    if (values.fontFamily !== undefined) {
      this.text.fontFamily = values.fontFamily;
    }
    if (values.fontWeight !== undefined) {
      this.text.fontWeight = values.fontWeight;
    }
    if (values.textAnchor !== undefined) {
      this.text.textAnchor = values.textAnchor;
    }
    if (values.fontStyle !== undefined) {
      this.text.fontStyle = values.fontStyle;
    }
    if (values.textUnderline !== undefined) {
      this.text.textUnderline = values.textUnderline;
    }
    if (values.textStrikethrough !== undefined) {
      this.text.textStrikethrough = values.textStrikethrough;
    }
    if (values.lineHeight !== undefined) {
      this.text.lineHeight = values.lineHeight;
    }
    this.text.updateElement();
  }

  getDescription(): string {
    const props = Object.keys(this.newValues).join(', ');
    return `Change text ${props}`;
  }
}
