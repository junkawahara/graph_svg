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
      label: 'ファイル',
      submenu: [
        {
          label: '新規作成',
          accelerator: 'CmdOrCtrl+N',
          click: () => mainWindow?.webContents.send('menu:new')
        },
        {
          label: '開く...',
          accelerator: 'CmdOrCtrl+O',
          click: () => mainWindow?.webContents.send('menu:open')
        },
        {
          label: '保存',
          accelerator: 'CmdOrCtrl+S',
          click: () => mainWindow?.webContents.send('menu:save')
        },
        {
          label: '別名で保存...',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => mainWindow?.webContents.send('menu:saveAs')
        },
        { type: 'separator' },
        {
          label: 'コンテンツにフィットしてエクスポート...',
          click: () => mainWindow?.webContents.send('menu:exportFitToContent')
        },
        { type: 'separator' },
        {
          label: '終了',
          role: 'quit'
        }
      ]
    },
    {
      label: '編集',
      submenu: [
        {
          label: '元に戻す',
          accelerator: 'CmdOrCtrl+Z',
          click: () => mainWindow?.webContents.send('menu:undo')
        },
        {
          label: 'やり直し',
          accelerator: 'CmdOrCtrl+Y',
          click: () => mainWindow?.webContents.send('menu:redo')
        },
        { type: 'separator' },
        {
          label: '切り取り',
          role: 'cut'
        },
        {
          label: 'コピー',
          role: 'copy'
        },
        {
          label: '貼り付け',
          role: 'paste'
        },
        {
          label: '削除',
          accelerator: 'Delete',
          click: () => mainWindow?.webContents.send('menu:delete')
        },
        { type: 'separator' },
        {
          label: 'グループ化',
          accelerator: 'CmdOrCtrl+G',
          click: () => mainWindow?.webContents.send('menu:group')
        },
        {
          label: 'グループ解除',
          accelerator: 'CmdOrCtrl+Shift+G',
          click: () => mainWindow?.webContents.send('menu:ungroup')
        },
        { type: 'separator' },
        {
          label: '設定...',
          click: () => mainWindow?.webContents.send('open-settings')
        }
      ]
    },
    {
      label: '表示',
      submenu: [
        {
          label: 'ズームリセット',
          accelerator: 'CmdOrCtrl+0',
          click: () => mainWindow?.webContents.send('menu:zoomReset')
        },
        {
          label: '拡大',
          role: 'zoomIn'
        },
        {
          label: '縮小',
          role: 'zoomOut'
        },
        { type: 'separator' },
        {
          label: 'グリッドスナップ',
          accelerator: 'G',
          click: () => mainWindow?.webContents.send('menu:toggleSnap')
        },
        { type: 'separator' },
        {
          label: 'キャンバスをコンテンツにフィット',
          click: () => mainWindow?.webContents.send('menu:fitCanvasToContent')
        },
        { type: 'separator' },
        {
          label: '再読み込み',
          role: 'reload'
        },
        {
          label: '強制再読み込み',
          role: 'forceReload'
        },
        {
          label: '開発者ツール',
          role: 'toggleDevTools'
        },
        { type: 'separator' },
        {
          label: 'フルスクリーン',
          role: 'togglefullscreen'
        }
      ]
    },
    {
      label: 'ツール',
      submenu: [
        {
          label: '選択',
          accelerator: 'V',
          click: () => mainWindow?.webContents.send('menu:tool', 'select')
        },
        {
          label: 'パン',
          accelerator: 'H',
          click: () => mainWindow?.webContents.send('menu:tool', 'pan')
        },
        {
          label: 'ズーム',
          accelerator: 'Z',
          click: () => mainWindow?.webContents.send('menu:tool', 'zoom')
        },
        { type: 'separator' },
        {
          label: '直線',
          accelerator: 'L',
          click: () => mainWindow?.webContents.send('menu:tool', 'line')
        },
        {
          label: '楕円',
          accelerator: 'E',
          click: () => mainWindow?.webContents.send('menu:tool', 'ellipse')
        },
        {
          label: '長方形',
          accelerator: 'R',
          click: () => mainWindow?.webContents.send('menu:tool', 'rectangle')
        },
        {
          label: '多角形',
          accelerator: 'P',
          click: () => mainWindow?.webContents.send('menu:tool', 'polygon')
        },
        {
          label: 'ポリライン',
          accelerator: 'Y',
          click: () => mainWindow?.webContents.send('menu:tool', 'polyline')
        },
        {
          label: 'パス',
          accelerator: 'B',
          click: () => mainWindow?.webContents.send('menu:tool', 'path')
        },
        {
          label: 'テキスト',
          accelerator: 'T',
          click: () => mainWindow?.webContents.send('menu:tool', 'text')
        },
        { type: 'separator' },
        {
          label: 'ノード',
          accelerator: 'N',
          click: () => mainWindow?.webContents.send('menu:tool', 'node')
        },
        {
          label: 'エッジ',
          accelerator: 'W',
          click: () => mainWindow?.webContents.send('menu:tool', 'edge')
        },
        {
          label: 'ノードを削除',
          click: () => mainWindow?.webContents.send('menu:tool', 'delete-node')
        },
        {
          label: 'エッジを削除',
          click: () => mainWindow?.webContents.send('menu:tool', 'delete-edge')
        }
      ]
    },
    {
      label: '配置',
      submenu: [
        {
          label: '最前面に移動',
          accelerator: 'CmdOrCtrl+Shift+]',
          click: () => mainWindow?.webContents.send('menu:zorder', 'bringToFront')
        },
        {
          label: '1つ前面へ',
          accelerator: 'CmdOrCtrl+]',
          click: () => mainWindow?.webContents.send('menu:zorder', 'bringForward')
        },
        {
          label: '1つ背面へ',
          accelerator: 'CmdOrCtrl+[',
          click: () => mainWindow?.webContents.send('menu:zorder', 'sendBackward')
        },
        {
          label: '最背面に移動',
          accelerator: 'CmdOrCtrl+Shift+[',
          click: () => mainWindow?.webContents.send('menu:zorder', 'sendToBack')
        },
        { type: 'separator' },
        {
          label: '整列',
          submenu: [
            {
              label: '左揃え',
              accelerator: 'CmdOrCtrl+Shift+Left',
              click: () => mainWindow?.webContents.send('menu:align', 'left')
            },
            {
              label: '右揃え',
              accelerator: 'CmdOrCtrl+Shift+Right',
              click: () => mainWindow?.webContents.send('menu:align', 'right')
            },
            {
              label: '上揃え',
              accelerator: 'CmdOrCtrl+Shift+Up',
              click: () => mainWindow?.webContents.send('menu:align', 'top')
            },
            {
              label: '下揃え',
              accelerator: 'CmdOrCtrl+Shift+Down',
              click: () => mainWindow?.webContents.send('menu:align', 'bottom')
            },
            { type: 'separator' },
            {
              label: '水平方向中央揃え',
              click: () => mainWindow?.webContents.send('menu:align', 'horizontalCenter')
            },
            {
              label: '垂直方向中央揃え',
              click: () => mainWindow?.webContents.send('menu:align', 'verticalCenter')
            }
          ]
        },
        {
          label: '均等配置',
          submenu: [
            {
              label: '水平方向に均等配置',
              click: () => mainWindow?.webContents.send('menu:distribute', 'horizontal')
            },
            {
              label: '垂直方向に均等配置',
              click: () => mainWindow?.webContents.send('menu:distribute', 'vertical')
            }
          ]
        },
        { type: 'separator' },
        {
          label: '自動レイアウト',
          click: () => mainWindow?.webContents.send('menu:autoLayout')
        },
        {
          label: '有向エッジ切替',
          click: () => mainWindow?.webContents.send('menu:toggleDirectedEdge')
        }
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
