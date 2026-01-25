import { Command } from './Command';
import { Text } from '../shapes/Text';
import { TextRun, TextRunStyle } from '../../shared/types';
import { applyStyleToRange, cloneRuns, plainTextToRuns } from '../core/TextRunUtils';

/**
 * Command for applying rich text styles to a range within a Text shape
 * Supports undo/redo
 */
export class RichTextChangeCommand implements Command {
  private oldRuns: TextRun[][] | null;
  private newRuns: TextRun[][];

  constructor(
    private text: Text,
    private startLine: number,
    private startChar: number,
    private endLine: number,
    private endChar: number,
    private style: TextRunStyle
  ) {
    // Store old runs state for undo
    this.oldRuns = text.runs ? cloneRuns(text.runs) : null;

    // Calculate new runs with style applied
    const currentRuns = text.runs ? cloneRuns(text.runs) : plainTextToRuns(text.content);
    this.newRuns = applyStyleToRange(
      currentRuns,
      startLine,
      startChar,
      endLine,
      endChar,
      style
    );
  }

  execute(): void {
    this.text.setRuns(this.newRuns);
    this.text.updateElement();
  }

  undo(): void {
    this.text.setRuns(this.oldRuns);
    this.text.updateElement();
  }

  getDescription(): string {
    const styleProps = Object.keys(this.style).join(', ');
    return `Apply ${styleProps} to text range`;
  }
}

/**
 * Command for clearing all rich text styles from a Text shape
 * Returns text to plain text mode
 */
export class ClearRichTextCommand implements Command {
  private oldRuns: TextRun[][] | null;

  constructor(private text: Text) {
    // Store old runs state for undo
    this.oldRuns = text.runs ? cloneRuns(text.runs) : null;
  }

  execute(): void {
    this.text.runs = null;
    this.text.updateElement();
  }

  undo(): void {
    this.text.setRuns(this.oldRuns);
    this.text.updateElement();
  }

  getDescription(): string {
    return 'Clear text formatting';
  }
}
