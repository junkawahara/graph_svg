/**
 * Result from confirmation dialog
 */
export type ConfirmResult = 'save' | 'discard' | 'cancel';

/**
 * Options for confirmation dialog
 */
export interface ConfirmDialogOptions {
  title: string;
  message: string;
  saveButtonText?: string;
  discardButtonText?: string;
  cancelButtonText?: string;
}

/**
 * Modal dialog for confirming unsaved changes
 */
export class ConfirmDialog {
  private overlay: HTMLDivElement | null = null;
  private dialog: HTMLDivElement | null = null;
  private resolvePromise: ((result: ConfirmResult) => void) | null = null;

  /**
   * Show the dialog and return user choice
   */
  show(options: ConfirmDialogOptions): Promise<ConfirmResult> {
    return new Promise((resolve) => {
      this.resolvePromise = resolve;
      this.createDialog(options);
    });
  }

  private createDialog(options: ConfirmDialogOptions): void {
    const {
      title,
      message,
      saveButtonText = '保存',
      discardButtonText = '保存しない',
      cancelButtonText = 'キャンセル'
    } = options;

    // Create overlay
    this.overlay = document.createElement('div');
    this.overlay.className = 'dialog-overlay';
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.close('cancel');
      }
    });

    // Create dialog
    this.dialog = document.createElement('div');
    this.dialog.className = 'dialog confirm-dialog';
    this.dialog.innerHTML = `
      <div class="dialog-header">${title}</div>
      <div class="dialog-body">
        <p class="confirm-message">${message}</p>
      </div>
      <div class="dialog-footer dialog-footer-confirm">
        <button class="dialog-btn dialog-btn-cancel">${cancelButtonText}</button>
        <button class="dialog-btn dialog-btn-discard">${discardButtonText}</button>
        <button class="dialog-btn dialog-btn-save">${saveButtonText}</button>
      </div>
    `;

    this.overlay.appendChild(this.dialog);
    document.body.appendChild(this.overlay);

    // Setup event handlers
    const saveBtn = this.dialog.querySelector('.dialog-btn-save') as HTMLButtonElement;
    const discardBtn = this.dialog.querySelector('.dialog-btn-discard') as HTMLButtonElement;
    const cancelBtn = this.dialog.querySelector('.dialog-btn-cancel') as HTMLButtonElement;

    // Focus save button
    setTimeout(() => saveBtn.focus(), 0);

    // Escape key to cancel
    this.dialog.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        this.close('cancel');
      }
    });

    // Button handlers
    saveBtn.addEventListener('click', () => {
      this.close('save');
    });

    discardBtn.addEventListener('click', () => {
      this.close('discard');
    });

    cancelBtn.addEventListener('click', () => {
      this.close('cancel');
    });
  }

  private close(result: ConfirmResult): void {
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
