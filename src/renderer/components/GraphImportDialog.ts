/**
 * Options for graph import
 */
export interface GraphImportOptions {
  directed: boolean;       // true = 'forward', false = 'none'
  clearCanvas: boolean;    // true = create new, false = add to existing
}

/**
 * Modal dialog for graph import options
 */
export class GraphImportDialog {
  private overlay: HTMLDivElement | null = null;
  private dialog: HTMLDivElement | null = null;
  private resolvePromise: ((result: GraphImportOptions | null) => void) | null = null;

  /**
   * Show the dialog and return user options
   */
  show(detectedFormat: string, nodeCount: number, edgeCount: number): Promise<GraphImportOptions | null> {
    return new Promise((resolve) => {
      this.resolvePromise = resolve;
      this.createDialog(detectedFormat, nodeCount, edgeCount);
    });
  }

  private createDialog(detectedFormat: string, nodeCount: number, edgeCount: number): void {
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
    this.dialog.innerHTML = `
      <div class="dialog-header">グラフファイルのインポート</div>
      <div class="dialog-body">
        <div class="dialog-field">
          <p style="margin: 0 0 12px 0; color: #666; font-size: 13px;">
            形式: ${detectedFormat}<br>
            頂点数: ${nodeCount}, 辺数: ${edgeCount}
          </p>
        </div>
        <div class="dialog-field">
          <label>グラフの種類</label>
          <div style="margin-top: 8px;">
            <label style="display: inline-flex; align-items: center; margin-right: 20px; cursor: pointer;">
              <input type="radio" name="graph-type" value="undirected" checked style="margin-right: 6px;">
              無向グラフ
            </label>
            <label style="display: inline-flex; align-items: center; cursor: pointer;">
              <input type="radio" name="graph-type" value="directed" style="margin-right: 6px;">
              有向グラフ
            </label>
          </div>
        </div>
        <div class="dialog-field">
          <label>インポート方法</label>
          <div style="margin-top: 8px;">
            <label style="display: block; margin-bottom: 8px; cursor: pointer;">
              <input type="radio" name="import-mode" value="add" checked style="margin-right: 6px;">
              既存のグラフに追加
            </label>
            <label style="display: block; cursor: pointer;">
              <input type="radio" name="import-mode" value="new" style="margin-right: 6px;">
              新規グラフ（キャンバスをクリア）
            </label>
          </div>
        </div>
      </div>
      <div class="dialog-footer">
        <button class="dialog-btn dialog-btn-cancel">キャンセル</button>
        <button class="dialog-btn dialog-btn-ok">インポート</button>
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

    const directedRadio = this.dialog.querySelector('input[name="graph-type"][value="directed"]') as HTMLInputElement;
    const newModeRadio = this.dialog.querySelector('input[name="import-mode"][value="new"]') as HTMLInputElement;

    this.close({
      directed: directedRadio.checked,
      clearCanvas: newModeRadio.checked
    });
  }

  private close(result: GraphImportOptions | null): void {
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
}
