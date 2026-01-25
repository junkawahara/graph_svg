import { TextRun, TextRunStyle } from '../../shared/types';

/**
 * Utility functions for working with TextRun arrays (rich text)
 */

/**
 * Check if two TextRunStyle objects are equal
 */
export function stylesEqual(a?: TextRunStyle, b?: TextRunStyle): boolean {
  if (a === b) return true;
  if (!a && !b) return true;
  if (!a || !b) return false;

  return (
    a.fontWeight === b.fontWeight &&
    a.fontStyle === b.fontStyle &&
    a.textUnderline === b.textUnderline &&
    a.textStrikethrough === b.textStrikethrough &&
    a.fill === b.fill
  );
}

/**
 * Merge two TextRunStyle objects (second overrides first)
 */
export function mergeStyles(base?: TextRunStyle, override?: TextRunStyle): TextRunStyle | undefined {
  if (!override) return base;
  if (!base) return override;

  const merged: TextRunStyle = { ...base };

  if (override.fontWeight !== undefined) merged.fontWeight = override.fontWeight;
  if (override.fontStyle !== undefined) merged.fontStyle = override.fontStyle;
  if (override.textUnderline !== undefined) merged.textUnderline = override.textUnderline;
  if (override.textStrikethrough !== undefined) merged.textStrikethrough = override.textStrikethrough;
  if (override.fill !== undefined) merged.fill = override.fill;

  return merged;
}

/**
 * Check if a style has any non-default values
 */
export function hasStyle(style?: TextRunStyle): boolean {
  if (!style) return false;
  return (
    style.fontWeight !== undefined ||
    style.fontStyle !== undefined ||
    style.textUnderline !== undefined ||
    style.textStrikethrough !== undefined ||
    style.fill !== undefined
  );
}

/**
 * Convert plain text to TextRun array (one run per line)
 */
export function plainTextToRuns(text: string): TextRun[][] {
  const lines = text.split('\n');
  return lines.map(line => [{ text: line }]);
}

/**
 * Convert TextRun array to plain text
 */
export function runsToPlainText(runs: TextRun[][]): string {
  return runs.map(line => line.map(run => run.text).join('')).join('\n');
}

/**
 * Deep clone a TextRun array
 */
export function cloneRuns(runs: TextRun[][]): TextRun[][] {
  return runs.map(line =>
    line.map(run => ({
      text: run.text,
      style: run.style ? { ...run.style } : undefined
    }))
  );
}

/**
 * Normalize runs by merging adjacent runs with identical styles
 * and removing empty runs
 */
export function normalizeRuns(runs: TextRun[][]): TextRun[][] {
  return runs.map(line => {
    const normalized: TextRun[] = [];

    for (const run of line) {
      // Skip empty runs (unless it's the only one in the line)
      if (run.text === '' && line.length > 1) continue;

      if (normalized.length === 0) {
        normalized.push({ text: run.text, style: run.style ? { ...run.style } : undefined });
      } else {
        const last = normalized[normalized.length - 1];
        if (stylesEqual(last.style, run.style)) {
          // Merge with previous run
          last.text += run.text;
        } else {
          normalized.push({ text: run.text, style: run.style ? { ...run.style } : undefined });
        }
      }
    }

    // Ensure at least one run per line
    if (normalized.length === 0) {
      normalized.push({ text: '' });
    }

    return normalized;
  });
}

/**
 * Find the run containing a specific character position in a line
 * Returns { runIndex, offsetInRun }
 */
export function findRunAtPosition(
  line: TextRun[],
  charIndex: number
): { runIndex: number; offsetInRun: number } {
  let currentPos = 0;

  for (let i = 0; i < line.length; i++) {
    const runLength = line[i].text.length;
    if (charIndex < currentPos + runLength) {
      return { runIndex: i, offsetInRun: charIndex - currentPos };
    }
    currentPos += runLength;
  }

  // Position is at the end
  const lastIndex = line.length - 1;
  return { runIndex: lastIndex, offsetInRun: line[lastIndex].text.length };
}

/**
 * Split a run at a given offset
 * Returns [before, after] runs
 */
function splitRun(run: TextRun, offset: number): [TextRun, TextRun] {
  const before: TextRun = {
    text: run.text.substring(0, offset),
    style: run.style ? { ...run.style } : undefined
  };
  const after: TextRun = {
    text: run.text.substring(offset),
    style: run.style ? { ...run.style } : undefined
  };
  return [before, after];
}

/**
 * Apply a style to a range within the runs
 * @param runs The current runs
 * @param startLine Line index to start (0-based)
 * @param startChar Character index within start line (0-based)
 * @param endLine Line index to end (0-based)
 * @param endChar Character index within end line (exclusive)
 * @param style The style to apply
 * @returns New runs with style applied
 */
export function applyStyleToRange(
  runs: TextRun[][],
  startLine: number,
  startChar: number,
  endLine: number,
  endChar: number,
  style: TextRunStyle
): TextRun[][] {
  // Clone runs to avoid mutation
  const result = cloneRuns(runs);

  // Ensure valid range
  if (startLine > endLine || (startLine === endLine && startChar >= endChar)) {
    return result;
  }

  // Clamp to valid ranges
  startLine = Math.max(0, Math.min(startLine, result.length - 1));
  endLine = Math.max(0, Math.min(endLine, result.length - 1));

  // Process each line in the range
  for (let lineIdx = startLine; lineIdx <= endLine; lineIdx++) {
    const line = result[lineIdx];
    const lineLength = line.reduce((sum, run) => sum + run.text.length, 0);

    // Determine the range within this line
    let lineStart = (lineIdx === startLine) ? startChar : 0;
    let lineEnd = (lineIdx === endLine) ? endChar : lineLength;

    // Clamp to line length
    lineStart = Math.max(0, Math.min(lineStart, lineLength));
    lineEnd = Math.max(0, Math.min(lineEnd, lineLength));

    if (lineStart >= lineEnd) continue;

    // Apply style to the range within this line
    result[lineIdx] = applyStyleToLineRange(line, lineStart, lineEnd, style);
  }

  return normalizeRuns(result);
}

/**
 * Apply a style to a range within a single line of runs
 */
function applyStyleToLineRange(
  line: TextRun[],
  startChar: number,
  endChar: number,
  style: TextRunStyle
): TextRun[] {
  const result: TextRun[] = [];
  let currentPos = 0;

  for (const run of line) {
    const runStart = currentPos;
    const runEnd = currentPos + run.text.length;

    // Case 1: Run is completely before the range
    if (runEnd <= startChar) {
      result.push({ text: run.text, style: run.style ? { ...run.style } : undefined });
    }
    // Case 2: Run is completely after the range
    else if (runStart >= endChar) {
      result.push({ text: run.text, style: run.style ? { ...run.style } : undefined });
    }
    // Case 3: Run is completely within the range
    else if (runStart >= startChar && runEnd <= endChar) {
      result.push({ text: run.text, style: mergeStyles(run.style, style) });
    }
    // Case 4: Range is completely within the run
    else if (runStart < startChar && runEnd > endChar) {
      // Split into three parts: before, styled, after
      const beforeText = run.text.substring(0, startChar - runStart);
      const styledText = run.text.substring(startChar - runStart, endChar - runStart);
      const afterText = run.text.substring(endChar - runStart);

      if (beforeText) {
        result.push({ text: beforeText, style: run.style ? { ...run.style } : undefined });
      }
      if (styledText) {
        result.push({ text: styledText, style: mergeStyles(run.style, style) });
      }
      if (afterText) {
        result.push({ text: afterText, style: run.style ? { ...run.style } : undefined });
      }
    }
    // Case 5: Range starts within the run
    else if (runStart < startChar && runEnd <= endChar) {
      const beforeText = run.text.substring(0, startChar - runStart);
      const styledText = run.text.substring(startChar - runStart);

      if (beforeText) {
        result.push({ text: beforeText, style: run.style ? { ...run.style } : undefined });
      }
      if (styledText) {
        result.push({ text: styledText, style: mergeStyles(run.style, style) });
      }
    }
    // Case 6: Range ends within the run
    else if (runStart >= startChar && runEnd > endChar) {
      const styledText = run.text.substring(0, endChar - runStart);
      const afterText = run.text.substring(endChar - runStart);

      if (styledText) {
        result.push({ text: styledText, style: mergeStyles(run.style, style) });
      }
      if (afterText) {
        result.push({ text: afterText, style: run.style ? { ...run.style } : undefined });
      }
    }

    currentPos = runEnd;
  }

  return result;
}

/**
 * Convert a global character index (across all lines) to line/char coordinates
 */
export function globalIndexToLineChar(
  runs: TextRun[][],
  globalIndex: number
): { lineIndex: number; charIndex: number } {
  let remaining = globalIndex;

  for (let lineIdx = 0; lineIdx < runs.length; lineIdx++) {
    const lineLength = runs[lineIdx].reduce((sum, run) => sum + run.text.length, 0);

    if (remaining <= lineLength) {
      return { lineIndex: lineIdx, charIndex: remaining };
    }

    // Account for the newline character between lines
    remaining -= lineLength + 1;
  }

  // Past the end - return end of last line
  const lastLine = runs.length - 1;
  const lastLineLength = runs[lastLine].reduce((sum, run) => sum + run.text.length, 0);
  return { lineIndex: lastLine, charIndex: lastLineLength };
}

/**
 * Convert line/char coordinates to a global character index
 */
export function lineCharToGlobalIndex(
  runs: TextRun[][],
  lineIndex: number,
  charIndex: number
): number {
  let globalIndex = 0;

  for (let i = 0; i < lineIndex && i < runs.length; i++) {
    const lineLength = runs[i].reduce((sum, run) => sum + run.text.length, 0);
    globalIndex += lineLength + 1; // +1 for newline
  }

  if (lineIndex < runs.length) {
    const lineLength = runs[lineIndex].reduce((sum, run) => sum + run.text.length, 0);
    globalIndex += Math.min(charIndex, lineLength);
  }

  return globalIndex;
}

/**
 * Check if runs have any non-default styles (i.e., is it rich text)
 */
export function hasRichStyles(runs: TextRun[][]): boolean {
  for (const line of runs) {
    for (const run of line) {
      if (hasStyle(run.style)) {
        return true;
      }
    }
  }
  return false;
}
