/**
 * Modal dialog for editing SVG source code
 */
export class SvgEditDialog {
  private overlay: HTMLDivElement | null = null;
  private dialog: HTMLDivElement | null = null;
  private resolvePromise: ((result: string | null) => void) | null = null;

  /**
   * Show the dialog with SVG source and return edited result
   */
  show(svgSource: string): Promise<string | null> {
    return new Promise((resolve) => {
      this.resolvePromise = resolve;
      this.createDialog(svgSource);
    });
  }

  private createDialog(svgSource: string): void {
    // Create overlay
    this.overlay = document.createElement('div');
    this.overlay.className = 'dialog-overlay';
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.close(null);
      }
    });

    // Format SVG for better readability
    const formattedSvg = this.formatSvg(svgSource);

    // Create dialog
    this.dialog = document.createElement('div');
    this.dialog.className = 'dialog svg-edit-dialog';
    this.dialog.innerHTML = `
      <div class="dialog-header">SVG Source</div>
      <div class="dialog-body">
        <div class="dialog-field">
          <textarea id="svg-source" rows="12" spellcheck="false">${this.escapeHtml(formattedSvg)}</textarea>
        </div>
      </div>
      <div class="dialog-footer">
        <button class="dialog-btn dialog-btn-cancel">Cancel</button>
        <button class="dialog-btn dialog-btn-ok">OK</button>
      </div>
    `;

    // Add custom styles for SVG edit dialog
    this.dialog.style.minWidth = '500px';
    this.dialog.style.maxWidth = '80vw';

    const textarea = this.dialog.querySelector('#svg-source') as HTMLTextAreaElement;
    textarea.style.fontFamily = 'monospace';
    textarea.style.fontSize = '12px';
    textarea.style.width = '100%';
    textarea.style.minHeight = '200px';
    textarea.style.resize = 'both';
    textarea.style.whiteSpace = 'pre-wrap';
    textarea.style.overflowWrap = 'break-word';
    textarea.style.wordBreak = 'break-all';

    this.overlay.appendChild(this.dialog);
    document.body.appendChild(this.overlay);

    // Setup event handlers
    const okBtn = this.dialog.querySelector('.dialog-btn-ok') as HTMLButtonElement;
    const cancelBtn = this.dialog.querySelector('.dialog-btn-cancel') as HTMLButtonElement;

    // Focus textarea and select all
    setTimeout(() => {
      textarea.focus();
      textarea.select();
    }, 0);

    // Escape key to cancel
    this.dialog.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        this.close(null);
      }
      // Ctrl+Enter to confirm
      if (e.key === 'Enter' && e.ctrlKey) {
        e.preventDefault();
        this.submitDialog(textarea);
      }
    });

    // Button handlers
    okBtn.addEventListener('click', () => {
      this.submitDialog(textarea);
    });

    cancelBtn.addEventListener('click', () => {
      this.close(null);
    });
  }

  private submitDialog(textarea: HTMLTextAreaElement): void {
    const svgSource = textarea.value.trim();
    if (!svgSource) {
      this.close(null);
      return;
    }

    // Validate that it's valid XML
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(svgSource, 'image/svg+xml');
      const parseError = doc.querySelector('parsererror');
      if (parseError) {
        alert('Invalid SVG syntax:\n' + parseError.textContent);
        return;
      }
    } catch (e) {
      alert('Invalid SVG syntax');
      return;
    }

    this.close(svgSource);
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

  /**
   * Format SVG string for better readability
   */
  private formatSvg(svg: string): string {
    // Simple formatting: add newlines after > for readability
    return svg
      .replace(/></g, '>\n<')
      .replace(/(\s+)>/g, '>')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  /**
   * Escape HTML special characters for display in textarea
   */
  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
}
