/**
 * Context menu component for right-click actions
 */
export interface ContextMenuItem {
  label: string;
  action: () => void;
  disabled?: boolean;
}

export class ContextMenu {
  private menu: HTMLDivElement | null = null;
  private closeHandler: ((e: MouseEvent) => void) | null = null;

  /**
   * Show context menu at the specified position
   */
  show(x: number, y: number, items: ContextMenuItem[]): void {
    // Close any existing menu
    this.close();

    // Create menu element
    this.menu = document.createElement('div');
    this.menu.className = 'context-menu';

    // Add menu items
    items.forEach((item) => {
      const menuItem = document.createElement('div');
      menuItem.className = 'context-menu-item';
      if (item.disabled) {
        menuItem.classList.add('disabled');
      }
      menuItem.textContent = item.label;

      if (!item.disabled) {
        menuItem.addEventListener('click', (e) => {
          e.stopPropagation();
          this.close();
          item.action();
        });
      }

      this.menu!.appendChild(menuItem);
    });

    // Position the menu
    this.menu.style.left = `${x}px`;
    this.menu.style.top = `${y}px`;

    document.body.appendChild(this.menu);

    // Adjust position if menu goes off screen
    const rect = this.menu.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
      this.menu.style.left = `${window.innerWidth - rect.width - 5}px`;
    }
    if (rect.bottom > window.innerHeight) {
      this.menu.style.top = `${window.innerHeight - rect.height - 5}px`;
    }

    // Close menu when clicking outside
    this.closeHandler = (e: MouseEvent) => {
      if (this.menu && !this.menu.contains(e.target as Node)) {
        this.close();
      }
    };
    // Use setTimeout to avoid immediate close from the same click
    setTimeout(() => {
      document.addEventListener('click', this.closeHandler!);
      document.addEventListener('contextmenu', this.closeHandler!);
    }, 0);
  }

  /**
   * Close the context menu
   */
  close(): void {
    if (this.menu) {
      document.body.removeChild(this.menu);
      this.menu = null;
    }
    if (this.closeHandler) {
      document.removeEventListener('click', this.closeHandler);
      document.removeEventListener('contextmenu', this.closeHandler);
      this.closeHandler = null;
    }
  }
}
