import { Command } from './Command';
import { Text } from '../shapes/Text';

export interface TextPropertyUpdates {
  content?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: 'normal' | 'bold';
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
    this.text.updateElement();
  }

  getDescription(): string {
    const props = Object.keys(this.newValues).join(', ');
    return `Change text ${props}`;
  }
}
