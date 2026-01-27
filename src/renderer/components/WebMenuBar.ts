/**
 * Web Menu Bar Component
 *
 * HTML/CSS-based menu bar for Web environment.
 * Provides File, Edit, View, Tools, and Arrange menus.
 */

import { getPlatformAdapter, WebAdapter } from '../platform';
import { MenuEventType, MenuEventWithArg } from '../../shared/platform';

interface MenuItem {
  label: string;
  event?: MenuEventType;
  eventWithArg?: { event: MenuEventWithArg; arg: string };
  shortcut?: string;
  separator?: boolean;
  submenu?: MenuItem[];
}

interface Menu {
  label: string;
  items: MenuItem[];
}

const MENUS: Menu[] = [
  {
    label: 'File',
    items: [
      { label: 'New', event: 'new', shortcut: 'Ctrl+N' },
      { label: 'Open...', event: 'open', shortcut: 'Ctrl+O' },
      { separator: true, label: '' },
      { label: 'Save', event: 'save', shortcut: 'Ctrl+S' },
      { label: 'Save As...', event: 'saveAs', shortcut: 'Ctrl+Shift+S' },
      { separator: true, label: '' },
      { label: 'Export Fit to Content...', event: 'exportFitToContent' }
    ]
  },
  {
    label: 'Edit',
    items: [
      { label: 'Undo', event: 'undo', shortcut: 'Ctrl+Z' },
      { label: 'Redo', event: 'redo', shortcut: 'Ctrl+Y' },
      { separator: true, label: '' },
      { label: 'Delete', event: 'delete', shortcut: 'Delete' },
      { separator: true, label: '' },
      { label: 'Group', event: 'group', shortcut: 'Ctrl+G' },
      { label: 'Ungroup', event: 'ungroup', shortcut: 'Ctrl+Shift+G' },
      { separator: true, label: '' },
      { label: 'Settings...', event: 'openSettings' }
    ]
  },
  {
    label: 'View',
    items: [
      { label: 'Zoom Reset', event: 'zoomReset', shortcut: 'Ctrl+0' },
      { separator: true, label: '' },
      { label: 'Toggle Grid Snap', event: 'toggleSnap', shortcut: 'G' },
      { separator: true, label: '' },
      { label: 'Fit Canvas to Content', event: 'fitCanvasToContent' }
    ]
  },
  {
    label: 'Graph',
    items: [
      { label: 'Import Graph File...', event: 'importGraph' },
      { separator: true, label: '' },
      { label: 'Auto Layout', event: 'autoLayout' },
      { label: 'Auto Label Nodes', event: 'autoLabelNodes' },
      { separator: true, label: '' },
      { label: 'Toggle Directed Edge', event: 'toggleDirectedEdge' }
    ]
  },
  {
    label: 'Tools',
    items: [
      { label: 'Select', eventWithArg: { event: 'tool', arg: 'select' }, shortcut: 'V' },
      { label: 'Line', eventWithArg: { event: 'tool', arg: 'line' }, shortcut: 'L' },
      { label: 'Ellipse', eventWithArg: { event: 'tool', arg: 'ellipse' }, shortcut: 'E' },
      { label: 'Rectangle', eventWithArg: { event: 'tool', arg: 'rectangle' }, shortcut: 'R' },
      { label: 'Polygon', eventWithArg: { event: 'tool', arg: 'polygon' }, shortcut: '5' },
      { label: 'Polyline', eventWithArg: { event: 'tool', arg: 'polyline' }, shortcut: 'Y' },
      { label: 'Path', eventWithArg: { event: 'tool', arg: 'path' }, shortcut: 'P' },
      { label: 'Text', eventWithArg: { event: 'tool', arg: 'text' }, shortcut: 'T' },
      { separator: true, label: '' },
      { label: 'Node', eventWithArg: { event: 'tool', arg: 'node' }, shortcut: 'N' },
      { label: 'Edge', eventWithArg: { event: 'tool', arg: 'edge' }, shortcut: 'W' },
      { separator: true, label: '' },
      { label: 'Rotate', eventWithArg: { event: 'tool', arg: 'rotate' }, shortcut: 'O' }
    ]
  },
  {
    label: 'Arrange',
    items: [
      { label: 'Bring Forward', eventWithArg: { event: 'zorder', arg: 'bringForward' }, shortcut: 'Ctrl+]' },
      { label: 'Send Backward', eventWithArg: { event: 'zorder', arg: 'sendBackward' }, shortcut: 'Ctrl+[' },
      { label: 'Bring to Front', eventWithArg: { event: 'zorder', arg: 'bringToFront' }, shortcut: 'Ctrl+Shift+]' },
      { label: 'Send to Back', eventWithArg: { event: 'zorder', arg: 'sendToBack' }, shortcut: 'Ctrl+Shift+[' },
      { separator: true, label: '' },
      { label: 'Align Left', eventWithArg: { event: 'align', arg: 'left' } },
      { label: 'Align Center', eventWithArg: { event: 'align', arg: 'center' } },
      { label: 'Align Right', eventWithArg: { event: 'align', arg: 'right' } },
      { label: 'Align Top', eventWithArg: { event: 'align', arg: 'top' } },
      { label: 'Align Middle', eventWithArg: { event: 'align', arg: 'middle' } },
      { label: 'Align Bottom', eventWithArg: { event: 'align', arg: 'bottom' } },
      { separator: true, label: '' },
      { label: 'Distribute Horizontally', eventWithArg: { event: 'distribute', arg: 'horizontal' } },
      { label: 'Distribute Vertically', eventWithArg: { event: 'distribute', arg: 'vertical' } }
    ]
  }
];

export class WebMenuBar {
  private container: HTMLElement;
  private activeMenu: HTMLElement | null = null;

  constructor() {
    this.container = this.createMenuBar();
    this.setupGlobalClickHandler();
  }

  private createMenuBar(): HTMLElement {
    const menuBar = document.createElement('div');
    menuBar.className = 'web-menu-bar';

    MENUS.forEach(menu => {
      const menuItem = this.createMenuButton(menu);
      menuBar.appendChild(menuItem);
    });

    return menuBar;
  }

  private createMenuButton(menu: Menu): HTMLElement {
    const button = document.createElement('div');
    button.className = 'web-menu-button';
    button.textContent = menu.label;

    const dropdown = this.createDropdown(menu.items);
    button.appendChild(dropdown);

    button.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleMenu(dropdown);
    });

    button.addEventListener('mouseenter', () => {
      if (this.activeMenu && this.activeMenu !== dropdown) {
        this.closeActiveMenu();
        this.openMenu(dropdown);
      }
    });

    return button;
  }

  private createDropdown(items: MenuItem[]): HTMLElement {
    const dropdown = document.createElement('div');
    dropdown.className = 'web-menu-dropdown';

    items.forEach(item => {
      if (item.separator) {
        const separator = document.createElement('div');
        separator.className = 'web-menu-separator';
        dropdown.appendChild(separator);
      } else {
        const menuItem = this.createMenuItem(item);
        dropdown.appendChild(menuItem);
      }
    });

    return dropdown;
  }

  private createMenuItem(item: MenuItem): HTMLElement {
    const menuItem = document.createElement('div');
    menuItem.className = 'web-menu-item';

    const label = document.createElement('span');
    label.className = 'web-menu-item-label';
    label.textContent = item.label;
    menuItem.appendChild(label);

    if (item.shortcut) {
      const shortcut = document.createElement('span');
      shortcut.className = 'web-menu-item-shortcut';
      shortcut.textContent = item.shortcut;
      menuItem.appendChild(shortcut);
    }

    menuItem.addEventListener('click', (e) => {
      e.stopPropagation();
      this.closeActiveMenu();
      this.handleMenuItemClick(item);
    });

    return menuItem;
  }

  private handleMenuItemClick(item: MenuItem): void {
    const adapter = getPlatformAdapter();
    if (!adapter.isWeb) return;

    const webAdapter = adapter as WebAdapter;

    if (item.event) {
      webAdapter.emitMenuEvent(item.event);
    } else if (item.eventWithArg) {
      webAdapter.emitMenuEventWithArg(item.eventWithArg.event, item.eventWithArg.arg);
    }
  }

  private toggleMenu(dropdown: HTMLElement): void {
    if (this.activeMenu === dropdown) {
      this.closeActiveMenu();
    } else {
      this.closeActiveMenu();
      this.openMenu(dropdown);
    }
  }

  private openMenu(dropdown: HTMLElement): void {
    dropdown.classList.add('open');
    this.activeMenu = dropdown;
  }

  private closeActiveMenu(): void {
    if (this.activeMenu) {
      this.activeMenu.classList.remove('open');
      this.activeMenu = null;
    }
  }

  private setupGlobalClickHandler(): void {
    document.addEventListener('click', () => {
      this.closeActiveMenu();
    });
  }

  public mount(parent: HTMLElement): void {
    parent.insertBefore(this.container, parent.firstChild);
  }
}
