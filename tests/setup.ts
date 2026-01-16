import { vi, beforeEach, afterEach } from 'vitest';
import { JSDOM } from 'jsdom';

// Setup jsdom environment
const dom = new JSDOM('<!DOCTYPE html><html><body><svg id="test-svg"></svg></body></html>', {
  url: 'http://localhost',
  pretendToBeVisual: true
});

// Set globals
global.window = dom.window as unknown as Window & typeof globalThis;
global.document = dom.window.document;
global.DOMParser = dom.window.DOMParser;
global.SVGElement = dom.window.SVGElement;
global.Element = dom.window.Element;
global.Node = dom.window.Node as unknown as typeof Node;

// Mock window.electronAPI for StyleClassManager
(global.window as any).electronAPI = {
  readSettings: vi.fn().mockResolvedValue({
    snapOnStartup: false,
    gridSize: 10,
    fitToContentMargin: 20,
    autoLayoutPadding: 50,
    styleClasses: []
  }),
  writeSettings: vi.fn().mockResolvedValue(undefined),
  saveFile: vi.fn().mockResolvedValue(true),
  saveFileAs: vi.fn().mockResolvedValue('/path/to/file.svg'),
  openFile: vi.fn().mockResolvedValue(null),
  showConfirmDialog: vi.fn().mockResolvedValue(true),
  setTitle: vi.fn()
};

// GraphManager cleanup helper
let graphManagerModule: typeof import('../src/renderer/core/GraphManager') | null = null;

beforeEach(async () => {
  // Reset GraphManager state before each test
  if (!graphManagerModule) {
    graphManagerModule = await import('../src/renderer/core/GraphManager');
  }
  graphManagerModule.getGraphManager().clear();
});

afterEach(() => {
  // Clear any leftover state
  vi.clearAllMocks();
});
