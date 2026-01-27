import { AppSettings } from '../../shared/settings';

/**
 * Modal dialog for application settings
 */
export class SettingsDialog {
  private overlay: HTMLDivElement | null = null;
  private dialog: HTMLDivElement | null = null;
  private resolvePromise: ((result: AppSettings | null) => void) | null = null;

  /**
   * Show the settings dialog
   */
  private currentStyleClasses: AppSettings['styleClasses'] = [];

  show(currentSettings: AppSettings): Promise<AppSettings | null> {
    // Store styleClasses to preserve them on save
    this.currentStyleClasses = currentSettings.styleClasses || [];
    return new Promise((resolve) => {
      this.resolvePromise = resolve;
      this.createDialog(currentSettings);
    });
  }

  private createDialog(currentSettings: AppSettings): void {
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
      <div class="dialog-header">設定</div>
      <div class="dialog-body">
        <div class="dialog-field dialog-checkbox">
          <input type="checkbox" id="snap-on-startup" ${currentSettings.snapOnStartup ? 'checked' : ''}>
          <label for="snap-on-startup">起動時にスナップをONにする</label>
        </div>
        <div class="dialog-field">
          <label for="grid-size">グリッド間隔 (px)</label>
          <input type="number" id="grid-size" value="${currentSettings.gridSize}" min="5" max="100" step="5">
        </div>
        <div class="dialog-field">
          <label for="fit-margin">Fit to Content 余白 (px)</label>
          <input type="number" id="fit-margin" value="${currentSettings.fitToContentMargin}" min="0" max="100" step="5">
        </div>
        <div class="dialog-field">
          <label for="auto-layout-padding">自動レイアウト 余白 (px)</label>
          <input type="number" id="auto-layout-padding" value="${currentSettings.autoLayoutPadding ?? 50}" min="0" step="10">
        </div>
        <div class="dialog-field">
          <label for="auto-node-label-prefix">Auto Node Label Prefix</label>
          <input type="text" id="auto-node-label-prefix" value="${currentSettings.autoNodeLabelPrefix ?? 'v'}">
        </div>
        <div class="dialog-field">
          <label for="auto-node-label-start">Auto Node Label Start Number</label>
          <input type="number" id="auto-node-label-start" value="${currentSettings.autoNodeLabelStartNumber ?? 0}" step="1">
        </div>
        <div class="dialog-field">
          <label for="auto-edge-label-prefix">Auto Edge Label Prefix</label>
          <input type="text" id="auto-edge-label-prefix" value="${currentSettings.autoEdgeLabelPrefix ?? 'e'}">
        </div>
        <div class="dialog-field">
          <label for="auto-edge-label-start">Auto Edge Label Start Number</label>
          <input type="number" id="auto-edge-label-start" value="${currentSettings.autoEdgeLabelStartNumber ?? 0}" step="1">
        </div>
      </div>
      <div class="dialog-footer">
        <button class="dialog-btn dialog-btn-cancel">キャンセル</button>
        <button class="dialog-btn dialog-btn-ok">OK</button>
      </div>
    `;

    this.overlay.appendChild(this.dialog);
    document.body.appendChild(this.overlay);

    // Setup event handlers
    const snapOnStartupCheckbox = this.dialog.querySelector('#snap-on-startup') as HTMLInputElement;
    const gridSizeInput = this.dialog.querySelector('#grid-size') as HTMLInputElement;
    const fitMarginInput = this.dialog.querySelector('#fit-margin') as HTMLInputElement;
    const autoLayoutPaddingInput = this.dialog.querySelector('#auto-layout-padding') as HTMLInputElement;
    const autoNodeLabelPrefixInput = this.dialog.querySelector('#auto-node-label-prefix') as HTMLInputElement;
    const autoNodeLabelStartInput = this.dialog.querySelector('#auto-node-label-start') as HTMLInputElement;
    const autoEdgeLabelPrefixInput = this.dialog.querySelector('#auto-edge-label-prefix') as HTMLInputElement;
    const autoEdgeLabelStartInput = this.dialog.querySelector('#auto-edge-label-start') as HTMLInputElement;
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
        this.submitDialog(snapOnStartupCheckbox, gridSizeInput, fitMarginInput, autoLayoutPaddingInput, autoNodeLabelPrefixInput, autoNodeLabelStartInput, autoEdgeLabelPrefixInput, autoEdgeLabelStartInput);
      }
    });

    // Button handlers
    okBtn.addEventListener('click', () => {
      this.submitDialog(snapOnStartupCheckbox, gridSizeInput, fitMarginInput, autoLayoutPaddingInput, autoNodeLabelPrefixInput, autoNodeLabelStartInput, autoEdgeLabelPrefixInput, autoEdgeLabelStartInput);
    });

    cancelBtn.addEventListener('click', () => {
      this.close(null);
    });
  }

  private submitDialog(
    snapOnStartupCheckbox: HTMLInputElement,
    gridSizeInput: HTMLInputElement,
    fitMarginInput: HTMLInputElement,
    autoLayoutPaddingInput: HTMLInputElement,
    autoNodeLabelPrefixInput: HTMLInputElement,
    autoNodeLabelStartInput: HTMLInputElement,
    autoEdgeLabelPrefixInput: HTMLInputElement,
    autoEdgeLabelStartInput: HTMLInputElement
  ): void {
    const gridSize = Math.max(5, Math.min(100, parseInt(gridSizeInput.value, 10) || 10));
    const fitToContentMargin = Math.max(0, Math.min(100, parseInt(fitMarginInput.value, 10) || 20));
    const autoLayoutPadding = Math.max(0, parseInt(autoLayoutPaddingInput.value, 10) || 50);
    const autoNodeLabelPrefix = autoNodeLabelPrefixInput.value;
    const autoNodeLabelStartNumber = parseInt(autoNodeLabelStartInput.value, 10) || 0;
    const autoEdgeLabelPrefix = autoEdgeLabelPrefixInput.value;
    const autoEdgeLabelStartNumber = parseInt(autoEdgeLabelStartInput.value, 10) || 0;
    const result: AppSettings = {
      snapOnStartup: snapOnStartupCheckbox.checked,
      gridSize,
      fitToContentMargin,
      autoLayoutPadding,
      autoNodeLabelPrefix,
      autoNodeLabelStartNumber,
      autoEdgeLabelPrefix,
      autoEdgeLabelStartNumber,
      styleClasses: this.currentStyleClasses
    };

    this.close(result);
  }

  private close(result: AppSettings | null): void {
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
