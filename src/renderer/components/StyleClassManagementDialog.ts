import { StyleClass, ShapeStyle } from '../../shared/types';
import { styleClassManager } from '../core/StyleClassManager';

/**
 * Dialog for managing style classes (edit, delete, rename)
 */
export class StyleClassManagementDialog {
  private overlay: HTMLDivElement | null = null;
  private dialog: HTMLDivElement | null = null;
  private listContainer: HTMLDivElement | null = null;
  private resolvePromise: ((changed: boolean) => void) | null = null;
  private hasChanges = false;

  /**
   * Show the dialog
   * @returns true if any changes were made
   */
  show(): Promise<boolean> {
    return new Promise((resolve) => {
      this.resolvePromise = resolve;
      this.hasChanges = false;
      this.createDialog();
    });
  }

  private createDialog(): void {
    // Create overlay
    this.overlay = document.createElement('div');
    this.overlay.className = 'dialog-overlay';
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.close();
      }
    });

    // Create dialog
    this.dialog = document.createElement('div');
    this.dialog.className = 'dialog class-management-dialog';
    this.dialog.innerHTML = `
      <div class="dialog-header">Manage Style Classes</div>
      <div class="dialog-body">
        <div class="class-list"></div>
      </div>
      <div class="dialog-footer">
        <button class="dialog-btn dialog-btn-ok">Close</button>
      </div>
    `;

    this.overlay.appendChild(this.dialog);
    document.body.appendChild(this.overlay);

    this.listContainer = this.dialog.querySelector('.class-list') as HTMLDivElement;
    this.renderClassList();

    // Close button
    const closeBtn = this.dialog.querySelector('.dialog-btn-ok') as HTMLButtonElement;
    closeBtn.addEventListener('click', () => this.close());

    // Escape key
    this.dialog.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        this.close();
      }
    });
  }

  private renderClassList(): void {
    if (!this.listContainer) return;

    const classes = styleClassManager.getAllClasses();
    this.listContainer.innerHTML = '';

    // Separate built-in and custom classes
    const builtinClasses = classes.filter(c => c.isBuiltin);
    const customClasses = classes.filter(c => !c.isBuiltin);

    // Render built-in classes
    if (builtinClasses.length > 0) {
      const builtinSection = document.createElement('div');
      builtinSection.className = 'class-section';
      builtinSection.innerHTML = '<div class="class-section-header">Built-in Classes</div>';
      builtinClasses.forEach(cls => {
        builtinSection.appendChild(this.createClassItem(cls));
      });
      this.listContainer.appendChild(builtinSection);
    }

    // Render custom classes
    const customSection = document.createElement('div');
    customSection.className = 'class-section';
    customSection.innerHTML = '<div class="class-section-header">Custom Classes</div>';

    if (customClasses.length > 0) {
      customClasses.forEach(cls => {
        customSection.appendChild(this.createClassItem(cls));
      });
    } else {
      const emptyMsg = document.createElement('div');
      emptyMsg.className = 'class-empty-message';
      emptyMsg.textContent = 'No custom classes. Use the "+" button to create one.';
      customSection.appendChild(emptyMsg);
    }
    this.listContainer.appendChild(customSection);
  }

  private createClassItem(cls: StyleClass): HTMLDivElement {
    const item = document.createElement('div');
    item.className = 'class-item';
    item.dataset.classId = cls.id;

    // Style preview
    const preview = document.createElement('div');
    preview.className = 'class-preview';
    preview.style.backgroundColor = cls.style.fill === 'none' ? 'transparent' : cls.style.fill;
    preview.style.borderColor = cls.style.stroke;
    preview.style.borderWidth = `${Math.min(cls.style.strokeWidth, 3)}px`;
    preview.style.borderStyle = cls.style.strokeDasharray ? 'dashed' : 'solid';
    preview.style.opacity = String(cls.style.opacity);

    // Name
    const name = document.createElement('div');
    name.className = 'class-name';
    name.textContent = cls.name;

    // Actions
    const actions = document.createElement('div');
    actions.className = 'class-actions';

    if (cls.isBuiltin) {
      const badge = document.createElement('span');
      badge.className = 'class-badge';
      badge.textContent = 'Built-in';
      actions.appendChild(badge);
    } else {
      // Edit button
      const editBtn = document.createElement('button');
      editBtn.className = 'class-action-btn';
      editBtn.innerHTML = '✎';
      editBtn.title = 'Edit';
      editBtn.addEventListener('click', () => this.editClass(cls));
      actions.appendChild(editBtn);

      // Delete button
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'class-action-btn class-action-delete';
      deleteBtn.innerHTML = '✕';
      deleteBtn.title = 'Delete';
      deleteBtn.addEventListener('click', () => this.deleteClass(cls));
      actions.appendChild(deleteBtn);
    }

    item.appendChild(preview);
    item.appendChild(name);
    item.appendChild(actions);

    return item;
  }

  private async editClass(cls: StyleClass): Promise<void> {
    // Show edit dialog
    const editDialog = new StyleClassEditDialog();
    const result = await editDialog.show(cls);

    if (result) {
      try {
        await styleClassManager.updateClass(cls.id, {
          name: result.name,
          style: result.style
        });
        this.hasChanges = true;
        this.renderClassList();
      } catch (error) {
        console.error('Failed to update class:', error);
      }
    }
  }

  private async deleteClass(cls: StyleClass): Promise<void> {
    const confirmed = confirm(`Delete style class "${cls.name}"?`);
    if (!confirmed) return;

    try {
      await styleClassManager.deleteClass(cls.id);
      this.hasChanges = true;
      this.renderClassList();
    } catch (error) {
      console.error('Failed to delete class:', error);
    }
  }

  private close(): void {
    if (this.overlay) {
      document.body.removeChild(this.overlay);
      this.overlay = null;
      this.dialog = null;
      this.listContainer = null;
    }

    if (this.resolvePromise) {
      this.resolvePromise(this.hasChanges);
      this.resolvePromise = null;
    }
  }
}

/**
 * Dialog for editing a single style class
 */
class StyleClassEditDialog {
  private overlay: HTMLDivElement | null = null;
  private dialog: HTMLDivElement | null = null;
  private resolvePromise: ((result: { name: string; style: ShapeStyle } | null) => void) | null = null;

  show(cls: StyleClass): Promise<{ name: string; style: ShapeStyle } | null> {
    return new Promise((resolve) => {
      this.resolvePromise = resolve;
      this.createDialog(cls);
    });
  }

  private createDialog(cls: StyleClass): void {
    this.overlay = document.createElement('div');
    this.overlay.className = 'dialog-overlay';
    this.overlay.style.zIndex = '1001';
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.close(null);
      }
    });

    this.dialog = document.createElement('div');
    this.dialog.className = 'dialog class-edit-dialog';
    this.dialog.innerHTML = `
      <div class="dialog-header">Edit Style Class</div>
      <div class="dialog-body">
        <div class="dialog-field">
          <label for="edit-class-name">Name</label>
          <input type="text" id="edit-class-name" value="${cls.name}">
        </div>
        <div class="dialog-row">
          <div class="dialog-field">
            <label for="edit-fill">Fill</label>
            <div class="color-input-row">
              <input type="checkbox" id="edit-fill-enabled" ${cls.style.fill !== 'none' ? 'checked' : ''}>
              <input type="color" id="edit-fill" value="${cls.style.fill === 'none' ? '#ffffff' : cls.style.fill}">
            </div>
          </div>
          <div class="dialog-field">
            <label for="edit-stroke">Stroke</label>
            <input type="color" id="edit-stroke" value="${cls.style.stroke}">
          </div>
        </div>
        <div class="dialog-row">
          <div class="dialog-field">
            <label for="edit-stroke-width">Stroke Width</label>
            <input type="number" id="edit-stroke-width" value="${cls.style.strokeWidth}" min="0" max="50" step="0.5">
          </div>
          <div class="dialog-field">
            <label for="edit-opacity">Opacity</label>
            <input type="number" id="edit-opacity" value="${cls.style.opacity}" min="0" max="1" step="0.1">
          </div>
        </div>
        <div class="dialog-field">
          <label for="edit-dasharray">Stroke Dasharray</label>
          <input type="text" id="edit-dasharray" value="${cls.style.strokeDasharray || ''}" placeholder="e.g., 5,5 or empty for solid">
        </div>
        <div class="dialog-field">
          <label for="edit-linecap">Line Cap</label>
          <select id="edit-linecap">
            <option value="butt" ${cls.style.strokeLinecap === 'butt' ? 'selected' : ''}>Butt</option>
            <option value="round" ${cls.style.strokeLinecap === 'round' ? 'selected' : ''}>Round</option>
            <option value="square" ${cls.style.strokeLinecap === 'square' ? 'selected' : ''}>Square</option>
          </select>
        </div>
      </div>
      <div class="dialog-footer">
        <button class="dialog-btn dialog-btn-cancel">Cancel</button>
        <button class="dialog-btn dialog-btn-ok">Save</button>
      </div>
    `;

    this.overlay.appendChild(this.dialog);
    document.body.appendChild(this.overlay);

    const nameInput = this.dialog.querySelector('#edit-class-name') as HTMLInputElement;
    const fillEnabled = this.dialog.querySelector('#edit-fill-enabled') as HTMLInputElement;
    const fillInput = this.dialog.querySelector('#edit-fill') as HTMLInputElement;
    const strokeInput = this.dialog.querySelector('#edit-stroke') as HTMLInputElement;
    const strokeWidthInput = this.dialog.querySelector('#edit-stroke-width') as HTMLInputElement;
    const opacityInput = this.dialog.querySelector('#edit-opacity') as HTMLInputElement;
    const dasharrayInput = this.dialog.querySelector('#edit-dasharray') as HTMLInputElement;
    const linecapSelect = this.dialog.querySelector('#edit-linecap') as HTMLSelectElement;
    const okBtn = this.dialog.querySelector('.dialog-btn-ok') as HTMLButtonElement;
    const cancelBtn = this.dialog.querySelector('.dialog-btn-cancel') as HTMLButtonElement;

    // Update fill input state based on checkbox
    fillInput.disabled = !fillEnabled.checked;
    fillEnabled.addEventListener('change', () => {
      fillInput.disabled = !fillEnabled.checked;
    });

    nameInput.focus();
    nameInput.select();

    okBtn.addEventListener('click', () => {
      const name = nameInput.value.trim();
      if (!name || !/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(name)) {
        nameInput.style.borderColor = '#f44336';
        nameInput.focus();
        return;
      }

      const style: ShapeStyle = {
        fill: fillEnabled.checked ? fillInput.value : 'none',
        fillNone: !fillEnabled.checked,
        stroke: strokeInput.value,
        strokeWidth: parseFloat(strokeWidthInput.value) || 1,
        opacity: parseFloat(opacityInput.value) || 1,
        strokeDasharray: dasharrayInput.value.trim(),
        strokeLinecap: linecapSelect.value as 'butt' | 'round' | 'square'
      };

      this.close({ name, style });
    });

    cancelBtn.addEventListener('click', () => this.close(null));

    this.dialog.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        this.close(null);
      }
    });
  }

  private close(result: { name: string; style: ShapeStyle } | null): void {
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
