import { ShapeStyle, StrokeLinecap } from '../../shared/types';
import { eventBus } from '../core/EventBus';
import { editorState } from '../core/EditorState';
import { selectionManager } from '../core/SelectionManager';
import { historyManager } from '../core/HistoryManager';
import { Shape } from '../shapes/Shape';
import { StyleChangeCommand } from '../commands/StyleChangeCommand';

/**
 * Sidebar component - handles style property editing
 */
export class Sidebar {
  private fillColor: HTMLInputElement;
  private fillNone: HTMLInputElement;
  private strokeColor: HTMLInputElement;
  private strokeWidth: HTMLInputElement;
  private opacity: HTMLInputElement;
  private opacityValue: HTMLSpanElement;
  private strokeDasharray: HTMLSelectElement;
  private strokeLinecap: HTMLSelectElement;

  private isUpdatingUI = false; // Prevent feedback loop

  constructor() {
    // Get DOM elements
    this.fillColor = document.getElementById('prop-fill') as HTMLInputElement;
    this.fillNone = document.getElementById('prop-fill-none') as HTMLInputElement;
    this.strokeColor = document.getElementById('prop-stroke') as HTMLInputElement;
    this.strokeWidth = document.getElementById('prop-stroke-width') as HTMLInputElement;
    this.opacity = document.getElementById('prop-opacity') as HTMLInputElement;
    this.opacityValue = document.getElementById('prop-opacity-value') as HTMLSpanElement;
    this.strokeDasharray = document.getElementById('prop-stroke-dasharray') as HTMLSelectElement;
    this.strokeLinecap = document.getElementById('prop-stroke-linecap') as HTMLSelectElement;

    this.setupInputListeners();
    this.setupEventListeners();

    // Initialize with default style
    this.updateUIFromStyle(editorState.currentStyle);
  }

  /**
   * Setup input change listeners
   */
  private setupInputListeners(): void {
    this.fillColor.addEventListener('change', () => {
      if (this.isUpdatingUI) return;
      this.applyStyleChange({ fill: this.fillColor.value });
    });

    this.fillNone.addEventListener('change', () => {
      if (this.isUpdatingUI) return;
      this.applyStyleChange({ fillNone: this.fillNone.checked });
    });

    this.strokeColor.addEventListener('change', () => {
      if (this.isUpdatingUI) return;
      this.applyStyleChange({ stroke: this.strokeColor.value });
    });

    this.strokeWidth.addEventListener('change', () => {
      if (this.isUpdatingUI) return;
      this.applyStyleChange({ strokeWidth: parseFloat(this.strokeWidth.value) || 1 });
    });

    this.opacity.addEventListener('change', () => {
      if (this.isUpdatingUI) return;
      const value = parseInt(this.opacity.value) / 100;
      this.applyStyleChange({ opacity: value });
    });

    // Live update for opacity display
    this.opacity.addEventListener('input', () => {
      this.opacityValue.textContent = `${this.opacity.value}%`;
    });

    this.strokeDasharray.addEventListener('change', () => {
      if (this.isUpdatingUI) return;
      this.applyStyleChange({ strokeDasharray: this.strokeDasharray.value });
    });

    this.strokeLinecap.addEventListener('change', () => {
      if (this.isUpdatingUI) return;
      this.applyStyleChange({ strokeLinecap: this.strokeLinecap.value as StrokeLinecap });
    });
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Update UI when selection changes
    eventBus.on('selection:changed', (shapes: Shape[]) => {
      if (shapes.length === 1) {
        // Show selected shape's style
        this.updateUIFromStyle(shapes[0].style);
      } else if (shapes.length === 0) {
        // Show editor's current style (for new shapes)
        this.updateUIFromStyle(editorState.currentStyle);
      }
      // For multiple selection, keep current UI (could show "mixed" state)
    });
  }

  /**
   * Apply style change to selected shapes or editor state
   */
  private applyStyleChange(updates: Partial<ShapeStyle>): void {
    const selectedShapes = selectionManager.getSelection();

    if (selectedShapes.length > 0) {
      // Apply to selected shapes with undo support
      const command = new StyleChangeCommand([...selectedShapes], updates);
      historyManager.execute(command);
    }

    // Always update editor state (for new shapes)
    editorState.updateStyle(updates);
  }

  /**
   * Update UI inputs from style object
   */
  private updateUIFromStyle(style: ShapeStyle): void {
    this.isUpdatingUI = true;

    this.fillColor.value = style.fill;
    this.fillNone.checked = style.fillNone;
    this.strokeColor.value = style.stroke;
    this.strokeWidth.value = String(style.strokeWidth);
    this.opacity.value = String(Math.round(style.opacity * 100));
    this.opacityValue.textContent = `${Math.round(style.opacity * 100)}%`;
    this.strokeDasharray.value = style.strokeDasharray;
    this.strokeLinecap.value = style.strokeLinecap;

    this.isUpdatingUI = false;
  }
}
