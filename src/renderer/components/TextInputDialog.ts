import { Point } from '../../shared/types';

export interface TextInputResult {
  content: string;
  fontSize: number;
  fontFamily: string;
  fontWeight: 'normal' | 'bold';
}

/**
 * Modal dialog for text input
 */
export class TextInputDialog {
  private overlay: HTMLDivElement | null = null;
  private dialog: HTMLDivElement | null = null;
  private resolvePromise: ((result: TextInputResult | null) => void) | null = null;

  /**
   * Show the dialog and return user input
   */
  show(position: Point): Promise<TextInputResult | null> {
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
      <div class="dialog-header">テキストを入力</div>
      <div class="dialog-body">
        <div class="dialog-field">
          <label for="text-content">テキスト</label>
          <input type="text" id="text-content" placeholder="テキストを入力..." autofocus>
        </div>
        <div class="dialog-row">
          <div class="dialog-field">
            <label for="font-size">サイズ</label>
            <input type="number" id="font-size" value="24" min="8" max="200">
          </div>
          <div class="dialog-field">
            <label for="font-family">フォント</label>
            <select id="font-family">
              <option value="Arial">Arial</option>
              <option value="Times New Roman">Times New Roman</option>
              <option value="Georgia">Georgia</option>
              <option value="Verdana">Verdana</option>
              <option value="Courier New">Courier New</option>
              <option value="serif">Serif</option>
              <option value="sans-serif">Sans-serif</option>
              <option value="monospace">Monospace</option>
            </select>
          </div>
        </div>
        <div class="dialog-field dialog-checkbox">
          <input type="checkbox" id="font-bold">
          <label for="font-bold">太字</label>
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
    const contentInput = this.dialog.querySelector('#text-content') as HTMLInputElement;
    const fontSizeInput = this.dialog.querySelector('#font-size') as HTMLInputElement;
    const fontFamilySelect = this.dialog.querySelector('#font-family') as HTMLSelectElement;
    const fontBoldCheckbox = this.dialog.querySelector('#font-bold') as HTMLInputElement;
    const okBtn = this.dialog.querySelector('.dialog-btn-ok') as HTMLButtonElement;
    const cancelBtn = this.dialog.querySelector('.dialog-btn-cancel') as HTMLButtonElement;

    // Focus text input
    setTimeout(() => contentInput.focus(), 0);

    // Enter key to confirm
    contentInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.submitDialog(contentInput, fontSizeInput, fontFamilySelect, fontBoldCheckbox);
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
      this.submitDialog(contentInput, fontSizeInput, fontFamilySelect, fontBoldCheckbox);
    });

    cancelBtn.addEventListener('click', () => {
      this.close(null);
    });
  }

  private submitDialog(
    contentInput: HTMLInputElement,
    fontSizeInput: HTMLInputElement,
    fontFamilySelect: HTMLSelectElement,
    fontBoldCheckbox: HTMLInputElement
  ): void {
    const content = contentInput.value.trim();
    if (!content) {
      this.close(null);
      return;
    }

    const result: TextInputResult = {
      content,
      fontSize: parseInt(fontSizeInput.value, 10) || 24,
      fontFamily: fontFamilySelect.value,
      fontWeight: fontBoldCheckbox.checked ? 'bold' : 'normal'
    };

    this.close(result);
  }

  private close(result: TextInputResult | null): void {
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
