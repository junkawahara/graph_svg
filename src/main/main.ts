import { app, BrowserWindow, ipcMain, dialog, Menu } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import Store from 'electron-store';
import { AppSettings, WindowState, DEFAULT_SETTINGS, DEFAULT_WINDOW_STATE, StoreSchema } from '../shared/settings';

let mainWindow: BrowserWindow | null = null;
let isQuitting = false;

// Initialize store
const store = new Store<StoreSchema>({
  defaults: {
    settings: DEFAULT_SETTINGS,
    windowState: DEFAULT_WINDOW_STATE
  }
});

/**
 * Get saved window state
 */
function getWindowState(): WindowState {
  return store.get('windowState', DEFAULT_WINDOW_STATE);
}

/**
 * Save current window state
 */
function saveWindowState(): void {
  if (!mainWindow) return;

  const isMaximized = mainWindow.isMaximized();

  // Only save bounds if not maximized
  if (!isMaximized) {
    const bounds = mainWindow.getBounds();
    store.set('windowState', {
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      isMaximized: false
    });
  } else {
    // Keep existing position/size but mark as maximized
    const current = store.get('windowState', DEFAULT_WINDOW_STATE);
    store.set('windowState', {
      ...current,
      isMaximized: true
    });
  }
}

/**
 * Create application menu
 */
function createMenu(): void {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New',
          accelerator: 'CmdOrCtrl+N',
          click: () => mainWindow?.webContents.send('menu:new')
        },
        {
          label: 'Open...',
          accelerator: 'CmdOrCtrl+O',
          click: () => mainWindow?.webContents.send('menu:open')
        },
        {
          label: 'Save',
          accelerator: 'CmdOrCtrl+S',
          click: () => mainWindow?.webContents.send('menu:save')
        },
        {
          label: 'Save As...',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => mainWindow?.webContents.send('menu:saveAs')
        },
        { type: 'separator' },
        {
          label: 'Export Fit to Content...',
          click: () => mainWindow?.webContents.send('menu:exportFitToContent')
        },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        {
          label: 'Undo',
          accelerator: 'CmdOrCtrl+Z',
          click: () => mainWindow?.webContents.send('menu:undo')
        },
        {
          label: 'Redo',
          accelerator: 'CmdOrCtrl+Y',
          click: () => mainWindow?.webContents.send('menu:redo')
        },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { type: 'separator' },
        {
          label: 'Settings...',
          click: () => mainWindow?.webContents.send('open-settings')
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        {
          label: 'Fit Canvas to Content',
          click: () => mainWindow?.webContents.send('menu:fitCanvasToContent')
        },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function createWindow(): void {
  const windowState = getWindowState();

  // Use app.getAppPath() for reliable icon path resolution on Linux
  const iconPath = path.join(app.getAppPath(), 'assets/icon-512.png');
  console.log('Icon path:', iconPath);

  mainWindow = new BrowserWindow({
    x: windowState.x,
    y: windowState.y,
    width: windowState.width,
    height: windowState.height,
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  // Restore maximized state
  if (windowState.isMaximized) {
    mainWindow.maximize();
  }

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  // Open DevTools in development
  mainWindow.webContents.openDevTools();

  // Handle close event - check for unsaved changes
  mainWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault();
      mainWindow?.webContents.send('app:beforeClose');
    } else {
      saveWindowState();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC Handlers for file operations
// Save to existing file path
ipcMain.handle('file:saveToPath', async (_event, filePath: string, content: string): Promise<boolean> => {
  try {
    fs.writeFileSync(filePath, content, 'utf-8');
    return true;
  } catch (error) {
    console.error('Failed to save file:', error);
    return false;
  }
});

// Save As - always show dialog
ipcMain.handle('file:saveAs', async (_event, content: string, defaultPath?: string): Promise<string | null> => {
  if (!mainWindow) return null;

  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Save SVG File',
    defaultPath: defaultPath || 'drawing.svg',
    filters: [
      { name: 'SVG Files', extensions: ['svg'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  if (result.canceled || !result.filePath) {
    return null;
  }

  try {
    fs.writeFileSync(result.filePath, content, 'utf-8');
    return result.filePath;
  } catch (error) {
    console.error('Failed to save file:', error);
    return null;
  }
});

ipcMain.handle('file:save', async (_event, content: string): Promise<string | null> => {
  if (!mainWindow) return null;

  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Save SVG File',
    defaultPath: 'drawing.svg',
    filters: [
      { name: 'SVG Files', extensions: ['svg'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  if (result.canceled || !result.filePath) {
    return null;
  }

  try {
    fs.writeFileSync(result.filePath, content, 'utf-8');
    return result.filePath;
  } catch (error) {
    console.error('Failed to save file:', error);
    return null;
  }
});

ipcMain.handle('file:open', async (): Promise<{ path: string; content: string } | null> => {
  if (!mainWindow) return null;

  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Open SVG File',
    filters: [
      { name: 'SVG Files', extensions: ['svg'] },
      { name: 'All Files', extensions: ['*'] }
    ],
    properties: ['openFile']
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  try {
    const filePath = result.filePaths[0];
    const content = fs.readFileSync(filePath, 'utf-8');
    return { path: filePath, content };
  } catch (error) {
    console.error('Failed to open file:', error);
    return null;
  }
});

// Set window title
ipcMain.handle('window:setTitle', (_event, title: string): void => {
  if (mainWindow) {
    mainWindow.setTitle(title);
  }
});

// Allow app to close (called after user confirms or chooses to discard)
ipcMain.handle('app:allowClose', (): void => {
  isQuitting = true;
  if (mainWindow) {
    mainWindow.close();
  }
});

// IPC Handlers for settings
ipcMain.handle('settings:read', (): AppSettings => {
  return store.get('settings', DEFAULT_SETTINGS);
});

ipcMain.handle('settings:write', (_event, settings: Partial<AppSettings>): AppSettings => {
  const current = store.get('settings', DEFAULT_SETTINGS);
  const updated = { ...current, ...settings };
  store.set('settings', updated);
  return updated;
});

app.whenReady().then(() => {
  createMenu();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
