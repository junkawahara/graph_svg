/**
 * Modal dialog for class name input
 */
export class ClassNameDialog {
  private overlay: HTMLDivElement | null = null;
  private dialog: HTMLDivElement | null = null;
  private resolvePromise: ((result: string | null) => void) | null = null;

  /**
   * Show the dialog and return user input
   */
  show(): Promise<string | null> {
    return new Promise((resolve) => {
      this.resolvePromise = resolve;
      this.createDialog();
    });
  }

  private createDialog(): void {
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
      <div class="dialog-header">Save Style as Class</div>
      <div class="dialog-body">
        <div class="dialog-field">
          <label for="class-name">Class Name</label>
          <input type="text" id="class-name" placeholder="my-style" autofocus>
          <div class="dialog-hint">Letters, numbers, hyphens, underscores only</div>
        </div>
      </div>
      <div class="dialog-footer">
        <button class="dialog-btn dialog-btn-cancel">Cancel</button>
        <button class="dialog-btn dialog-btn-ok">Save</button>
      </div>
    `;

    this.overlay.appendChild(this.dialog);
    document.body.appendChild(this.overlay);

    // Setup event handlers
    const nameInput = this.dialog.querySelector('#class-name') as HTMLInputElement;
    const okBtn = this.dialog.querySelector('.dialog-btn-ok') as HTMLButtonElement;
    const cancelBtn = this.dialog.querySelector('.dialog-btn-cancel') as HTMLButtonElement;

    // Focus input
    setTimeout(() => nameInput.focus(), 0);

    // Enter key to confirm
    nameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.submitDialog(nameInput);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        this.close(null);
      }
    });

    // Button handlers
    okBtn.addEventListener('click', () => {
      this.submitDialog(nameInput);
    });

    cancelBtn.addEventListener('click', () => {
      this.close(null);
    });
  }

  private submitDialog(nameInput: HTMLInputElement): void {
    const name = nameInput.value.trim();
    if (!name) {
      this.close(null);
      return;
    }

    // Validate class name (letters, numbers, hyphens, underscores)
    if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(name)) {
      nameInput.style.borderColor = '#f44336';
      nameInput.focus();
      return;
    }

    this.close(name);
  }

  private close(result: string | null): void {
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
