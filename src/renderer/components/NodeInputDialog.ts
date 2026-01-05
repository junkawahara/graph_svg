import { Point } from '../../shared/types';

export interface NodeInputResult {
  label: string;
}

/**
 * Modal dialog for node label input
 */
export class NodeInputDialog {
  private overlay: HTMLDivElement | null = null;
  private dialog: HTMLDivElement | null = null;
  private resolvePromise: ((result: NodeInputResult | null) => void) | null = null;

  /**
   * Show the dialog and return user input
   */
  show(position: Point): Promise<NodeInputResult | null> {
    return new Promise((resolve) => {
      this.resolvePromise = resolve;
      this.createDialog(position);
    });
  }

  private createDialog(position: Point): void {
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
      <div class="dialog-header">ノードラベル</div>
      <div class="dialog-body">
        <div class="dialog-field">
          <label for="node-label">ラベル</label>
          <input type="text" id="node-label" placeholder="ラベルを入力..." autofocus>
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
    const labelInput = this.dialog.querySelector('#node-label') as HTMLInputElement;
    const okBtn = this.dialog.querySelector('.dialog-btn-ok') as HTMLButtonElement;
    const cancelBtn = this.dialog.querySelector('.dialog-btn-cancel') as HTMLButtonElement;

    // Focus text input
    setTimeout(() => labelInput.focus(), 0);

    // Enter key to confirm
    labelInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.submitDialog(labelInput);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        this.close(null);
      }
    });

    // Escape key to cancel (on dialog)
    this.dialog.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        this.close(null);
      }
    });

    // Button handlers
    okBtn.addEventListener('click', () => {
      this.submitDialog(labelInput);
    });

    cancelBtn.addEventListener('click', () => {
      this.close(null);
    });
  }

  private submitDialog(labelInput: HTMLInputElement): void {
    const label = labelInput.value.trim();
    // Allow empty labels - they just won't display text
    const result: NodeInputResult = { label };
    this.close(result);
  }

  private close(result: NodeInputResult | null): void {
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
