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
  show(currentSettings: AppSettings): Promise<AppSettings | null> {
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
        this.submitDialog(snapOnStartupCheckbox, gridSizeInput);
      }
    });

    // Button handlers
    okBtn.addEventListener('click', () => {
      this.submitDialog(snapOnStartupCheckbox, gridSizeInput);
    });

    cancelBtn.addEventListener('click', () => {
      this.close(null);
    });
  }

  private submitDialog(snapOnStartupCheckbox: HTMLInputElement, gridSizeInput: HTMLInputElement): void {
    const gridSize = Math.max(5, Math.min(100, parseInt(gridSizeInput.value, 10) || 10));
    const result: AppSettings = {
      snapOnStartup: snapOnStartupCheckbox.checked,
      gridSize
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
