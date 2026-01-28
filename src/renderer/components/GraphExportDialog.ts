/**
 * Graph Export Dialog
 *
 * Modal dialog for graph export options:
 * - Format selection (Edge List / DIMACS)
 * - Export scope (All / Selection only)
 * - Warning display for problematic labels
 */

import { GraphExportFormat, GraphExportScope, LabelWarning, formatWarningMessage } from '../core/GraphFileExporter';

/**
 * Options returned from the export dialog
 */
export interface GraphExportOptions {
  format: GraphExportFormat;
  scope: GraphExportScope;
}

/**
 * Dialog configuration
 */
export interface GraphExportDialogConfig {
  hasSelection: boolean;
  warnings: LabelWarning[];
}

/**
 * Modal dialog for graph export options
 */
export class GraphExportDialog {
  private overlay: HTMLDivElement | null = null;
  private dialog: HTMLDivElement | null = null;
  private resolvePromise: ((result: GraphExportOptions | null) => void) | null = null;

  /**
   * Show the dialog and return user options
   */
  show(config: GraphExportDialogConfig): Promise<GraphExportOptions | null> {
    return new Promise((resolve) => {
      this.resolvePromise = resolve;
      this.createDialog(config);
    });
  }

  private createDialog(config: GraphExportDialogConfig): void {
    // Create overlay
    this.overlay = document.createElement('div');
    this.overlay.className = 'dialog-overlay';
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.close(null);
      }
    });

    // Create dialog
    this.dialog = document.createElement('div');
    this.dialog.className = 'dialog';

    // Build warning section HTML
    let warningHtml = '';
    if (config.warnings.length > 0) {
      const warningMessage = formatWarningMessage(config.warnings);
      warningHtml = `
        <div class="dialog-field">
          <div style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 4px; padding: 12px; margin-bottom: 8px;">
            <div style="color: #856404; font-size: 13px; white-space: pre-wrap;">${this.escapeHtml(warningMessage)}</div>
            <div style="color: #856404; font-size: 12px; margin-top: 8px;">続行すると、ラベルはそのまま出力されます。</div>
          </div>
        </div>
      `;
    }

    // Build selection option disabled state
    const selectionDisabled = config.hasSelection ? '' : 'disabled';
    const selectionStyle = config.hasSelection ? '' : 'opacity: 0.5; cursor: not-allowed;';

    this.dialog.innerHTML = `
      <div class="dialog-header">グラフをエクスポート</div>
      <div class="dialog-body">
        ${warningHtml}
        <div class="dialog-field">
          <label>出力形式</label>
          <div style="margin-top: 8px;">
            <label style="display: block; margin-bottom: 8px; cursor: pointer;">
              <input type="radio" name="export-format" value="edgelist" checked style="margin-right: 6px;">
              Edge List形式
              <span style="color: #666; font-size: 12px; margin-left: 8px;">エッジラベルを含む</span>
            </label>
            <label style="display: block; cursor: pointer;">
              <input type="radio" name="export-format" value="dimacs" style="margin-right: 6px;">
              DIMACS形式
              <span style="color: #666; font-size: 12px; margin-left: 8px;">ノード番号対応表をコメントで出力</span>
            </label>
          </div>
        </div>
        <div class="dialog-field">
          <label>エクスポート対象</label>
          <div style="margin-top: 8px;">
            <label style="display: block; margin-bottom: 8px; cursor: pointer;">
              <input type="radio" name="export-scope" value="all" checked style="margin-right: 6px;">
              全て
            </label>
            <label style="display: block; cursor: pointer; ${selectionStyle}">
              <input type="radio" name="export-scope" value="selection" ${selectionDisabled} style="margin-right: 6px;">
              選択のみ
              ${!config.hasSelection ? '<span style="color: #999; font-size: 12px; margin-left: 8px;">（選択がありません）</span>' : ''}
            </label>
          </div>
        </div>
      </div>
      <div class="dialog-footer">
        <button class="dialog-btn dialog-btn-cancel">キャンセル</button>
        <button class="dialog-btn dialog-btn-ok">エクスポート</button>
      </div>
    `;

    this.overlay.appendChild(this.dialog);
    document.body.appendChild(this.overlay);

    // Setup event handlers
    const okBtn = this.dialog.querySelector('.dialog-btn-ok') as HTMLButtonElement;
    const cancelBtn = this.dialog.querySelector('.dialog-btn-cancel') as HTMLButtonElement;

    // Focus OK button
    setTimeout(() => okBtn.focus(), 0);

    // Escape key to cancel
    this.dialog.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        this.close(null);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        this.submitDialog();
      }
    });

    // Button handlers
    okBtn.addEventListener('click', () => {
      this.submitDialog();
    });

    cancelBtn.addEventListener('click', () => {
      this.close(null);
    });
  }

  private submitDialog(): void {
    if (!this.dialog) return;

    const formatRadio = this.dialog.querySelector('input[name="export-format"]:checked') as HTMLInputElement;
    const scopeRadio = this.dialog.querySelector('input[name="export-scope"]:checked') as HTMLInputElement;

    this.close({
      format: formatRadio.value as GraphExportFormat,
      scope: scopeRadio.value as GraphExportScope
    });
  }

  private close(result: GraphExportOptions | null): void {
    if (this.overlay) {
      document.body.removeChild(this.overlay);
      this.overlay = null;
      this.dialog = null;
    }

    if (this.resolvePromise) {
      this.resolvePromise(result);
      this.resolvePromise = null;
    }
  }

  /**
   * Escape HTML special characters
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
