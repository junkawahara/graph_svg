import { ToolType } from '../../shared/types';
import { eventBus } from '../core/EventBus';
import { editorState } from '../core/EditorState';

/**
 * Toolbar component - handles tool selection
 */
export class Toolbar {
  private toolButtons: Map<ToolType, HTMLButtonElement> = new Map();

  constructor() {
    this.setupToolButtons();
    this.setupEventListeners();
  }

  /**
   * Initialize tool buttons
   */
  private setupToolButtons(): void {
    const tools: { id: string; type: ToolType }[] = [
      { id: 'tool-select', type: 'select' },
      { id: 'tool-line', type: 'line' },
      { id: 'tool-ellipse', type: 'ellipse' }
    ];

    tools.forEach(({ id, type }) => {
      const button = document.getElementById(id) as HTMLButtonElement;
      if (button) {
        this.toolButtons.set(type, button);
        button.addEventListener('click', () => {
          editorState.setTool(type);
        });
      }
    });
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Update button states when tool changes
    eventBus.on('tool:changed', (tool: ToolType) => {
      this.updateActiveButton(tool);
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Don't handle shortcuts if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'v':
          editorState.setTool('select');
          break;
        case 'l':
          editorState.setTool('line');
          break;
        case 'e':
          editorState.setTool('ellipse');
          break;
      }
    });
  }

  /**
   * Update active button visual state
   */
  private updateActiveButton(activeTool: ToolType): void {
    this.toolButtons.forEach((button, tool) => {
      if (tool === activeTool) {
        button.classList.add('active');
      } else {
        button.classList.remove('active');
      }
    });
  }
}
