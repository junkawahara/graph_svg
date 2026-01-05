import { ShapeStyle, StrokeLinecap, MarkerType, EdgeDirection } from '../../shared/types';
import { eventBus } from '../core/EventBus';
import { editorState } from '../core/EditorState';
import { selectionManager } from '../core/SelectionManager';
import { historyManager } from '../core/HistoryManager';
import { Shape } from '../shapes/Shape';
import { Text } from '../shapes/Text';
import { Line } from '../shapes/Line';
import { Node } from '../shapes/Node';
import { Edge } from '../shapes/Edge';
import { StyleChangeCommand } from '../commands/StyleChangeCommand';
import { TextPropertyChangeCommand, TextPropertyUpdates } from '../commands/TextPropertyChangeCommand';
import { MarkerChangeCommand, MarkerUpdates } from '../commands/MarkerChangeCommand';
import { NodeLabelChangeCommand, NodePropertyUpdates } from '../commands/NodeLabelChangeCommand';
import { EdgeDirectionChangeCommand } from '../commands/EdgeDirectionChangeCommand';

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

  // Text-specific properties
  private textPropertiesContainer: HTMLDivElement;
  private textContent: HTMLInputElement;
  private fontSize: HTMLInputElement;
  private fontFamily: HTMLSelectElement;
  private fontBold: HTMLInputElement;

  // Line-specific properties (arrows)
  private linePropertiesContainer: HTMLDivElement;
  private markerStart: HTMLSelectElement;
  private markerEnd: HTMLSelectElement;

  // Node-specific properties
  private nodePropertiesContainer: HTMLDivElement | null = null;
  private nodeLabel: HTMLInputElement | null = null;
  private nodeFontSize: HTMLInputElement | null = null;

  // Edge-specific properties
  private edgePropertiesContainer: HTMLDivElement | null = null;
  private edgeDirection: HTMLSelectElement | null = null;

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

    // Text-specific elements
    this.textPropertiesContainer = document.getElementById('text-properties') as HTMLDivElement;
    this.textContent = document.getElementById('prop-text-content') as HTMLInputElement;
    this.fontSize = document.getElementById('prop-font-size') as HTMLInputElement;
    this.fontFamily = document.getElementById('prop-font-family') as HTMLSelectElement;
    this.fontBold = document.getElementById('prop-font-bold') as HTMLInputElement;

    // Line-specific elements
    this.linePropertiesContainer = document.getElementById('line-properties') as HTMLDivElement;
    this.markerStart = document.getElementById('prop-marker-start') as HTMLSelectElement;
    this.markerEnd = document.getElementById('prop-marker-end') as HTMLSelectElement;

    // Node-specific elements
    this.nodePropertiesContainer = document.getElementById('node-properties') as HTMLDivElement;
    this.nodeLabel = document.getElementById('prop-node-label') as HTMLInputElement;
    this.nodeFontSize = document.getElementById('prop-node-font-size') as HTMLInputElement;

    // Edge-specific elements
    this.edgePropertiesContainer = document.getElementById('edge-properties') as HTMLDivElement;
    this.edgeDirection = document.getElementById('prop-edge-direction') as HTMLSelectElement;

    this.setupInputListeners();
    this.setupTextInputListeners();
    this.setupLineInputListeners();
    this.setupNodeInputListeners();
    this.setupEdgeInputListeners();
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
   * Setup text property input listeners
   */
  private setupTextInputListeners(): void {
    this.textContent.addEventListener('change', () => {
      if (this.isUpdatingUI) return;
      this.applyTextPropertyChange({ content: this.textContent.value });
    });

    this.fontSize.addEventListener('change', () => {
      if (this.isUpdatingUI) return;
      this.applyTextPropertyChange({ fontSize: parseInt(this.fontSize.value, 10) || 24 });
    });

    this.fontFamily.addEventListener('change', () => {
      if (this.isUpdatingUI) return;
      this.applyTextPropertyChange({ fontFamily: this.fontFamily.value });
    });

    this.fontBold.addEventListener('change', () => {
      if (this.isUpdatingUI) return;
      this.applyTextPropertyChange({ fontWeight: this.fontBold.checked ? 'bold' : 'normal' });
    });
  }

  /**
   * Setup line property input listeners
   */
  private setupLineInputListeners(): void {
    this.markerStart.addEventListener('change', () => {
      if (this.isUpdatingUI) return;
      this.applyMarkerChange({ markerStart: this.markerStart.value as MarkerType });
    });

    this.markerEnd.addEventListener('change', () => {
      if (this.isUpdatingUI) return;
      this.applyMarkerChange({ markerEnd: this.markerEnd.value as MarkerType });
    });
  }

  /**
   * Setup node property input listeners
   */
  private setupNodeInputListeners(): void {
    if (this.nodeLabel) {
      this.nodeLabel.addEventListener('change', () => {
        if (this.isUpdatingUI) return;
        this.applyNodePropertyChange({ label: this.nodeLabel!.value });
      });
    }

    if (this.nodeFontSize) {
      this.nodeFontSize.addEventListener('change', () => {
        if (this.isUpdatingUI) return;
        this.applyNodePropertyChange({ fontSize: parseInt(this.nodeFontSize!.value, 10) || 14 });
      });
    }
  }

  /**
   * Setup edge property input listeners
   */
  private setupEdgeInputListeners(): void {
    if (this.edgeDirection) {
      this.edgeDirection.addEventListener('change', () => {
        if (this.isUpdatingUI) return;
        this.applyEdgeDirectionChange(this.edgeDirection!.value as EdgeDirection);
      });
    }
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Update UI when selection changes
    eventBus.on('selection:changed', (shapes: Shape[]) => {
      if (shapes.length === 1) {
        const shape = shapes[0];
        // Show selected shape's style
        this.updateUIFromStyle(shape.style);

        // Show/hide text properties based on shape type
        if (shape instanceof Text) {
          this.showTextProperties(shape);
        } else {
          this.hideTextProperties();
        }

        // Show/hide line properties based on shape type
        if (shape instanceof Line) {
          this.showLineProperties(shape);
        } else {
          this.hideLineProperties();
        }

        // Show/hide node properties based on shape type
        if (shape instanceof Node) {
          this.showNodeProperties(shape);
        } else {
          this.hideNodeProperties();
        }

        // Show/hide edge properties based on shape type
        if (shape instanceof Edge) {
          this.showEdgeProperties(shape);
        } else {
          this.hideEdgeProperties();
        }
      } else if (shapes.length === 0) {
        // Show editor's current style (for new shapes)
        this.updateUIFromStyle(editorState.currentStyle);
        this.hideTextProperties();
        this.hideLineProperties();
        this.hideNodeProperties();
        this.hideEdgeProperties();
      } else {
        // Multiple selection - hide special properties
        this.hideTextProperties();
        this.hideLineProperties();
        this.hideNodeProperties();
        this.hideEdgeProperties();
      }
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
   * Apply text property change to selected Text shape
   */
  private applyTextPropertyChange(updates: TextPropertyUpdates): void {
    const selectedShapes = selectionManager.getSelection();

    if (selectedShapes.length === 1 && selectedShapes[0] instanceof Text) {
      const textShape = selectedShapes[0] as Text;
      const command = new TextPropertyChangeCommand(textShape, updates);
      historyManager.execute(command);
    }
  }

  /**
   * Apply marker change to selected Line shape
   */
  private applyMarkerChange(updates: MarkerUpdates): void {
    const selectedShapes = selectionManager.getSelection();

    if (selectedShapes.length === 1 && selectedShapes[0] instanceof Line) {
      const lineShape = selectedShapes[0] as Line;
      const command = new MarkerChangeCommand(lineShape, updates);
      historyManager.execute(command);
    }
  }

  /**
   * Show text properties and populate with shape values
   */
  private showTextProperties(text: Text): void {
    this.isUpdatingUI = true;

    this.textPropertiesContainer.style.display = 'block';
    this.textContent.value = text.content;
    this.fontSize.value = String(text.fontSize);
    this.fontFamily.value = text.fontFamily;
    this.fontBold.checked = text.fontWeight === 'bold';

    this.isUpdatingUI = false;
  }

  /**
   * Hide text properties
   */
  private hideTextProperties(): void {
    this.textPropertiesContainer.style.display = 'none';
  }

  /**
   * Show line properties and populate with shape values
   */
  private showLineProperties(line: Line): void {
    this.isUpdatingUI = true;

    this.linePropertiesContainer.style.display = 'block';
    this.markerStart.value = line.markerStart;
    this.markerEnd.value = line.markerEnd;

    this.isUpdatingUI = false;
  }

  /**
   * Hide line properties
   */
  private hideLineProperties(): void {
    this.linePropertiesContainer.style.display = 'none';
  }

  /**
   * Apply node property change
   */
  private applyNodePropertyChange(updates: NodePropertyUpdates): void {
    const selectedShapes = selectionManager.getSelection();

    if (selectedShapes.length === 1 && selectedShapes[0] instanceof Node) {
      const node = selectedShapes[0] as Node;
      const command = new NodeLabelChangeCommand(node, updates);
      historyManager.execute(command);
    }
  }

  /**
   * Apply edge direction change
   */
  private applyEdgeDirectionChange(direction: EdgeDirection): void {
    const selectedShapes = selectionManager.getSelection();

    if (selectedShapes.length === 1 && selectedShapes[0] instanceof Edge) {
      const edge = selectedShapes[0] as Edge;
      const command = new EdgeDirectionChangeCommand(edge, direction);
      historyManager.execute(command);
    }
  }

  /**
   * Show node properties and populate with shape values
   */
  private showNodeProperties(node: Node): void {
    if (!this.nodePropertiesContainer) return;

    this.isUpdatingUI = true;

    this.nodePropertiesContainer.style.display = 'block';
    if (this.nodeLabel) this.nodeLabel.value = node.label;
    if (this.nodeFontSize) this.nodeFontSize.value = String(node.fontSize);

    this.isUpdatingUI = false;
  }

  /**
   * Hide node properties
   */
  private hideNodeProperties(): void {
    if (this.nodePropertiesContainer) {
      this.nodePropertiesContainer.style.display = 'none';
    }
  }

  /**
   * Show edge properties and populate with values
   */
  private showEdgeProperties(edge: Edge): void {
    if (!this.edgePropertiesContainer) return;

    this.isUpdatingUI = true;

    this.edgePropertiesContainer.style.display = 'block';
    if (this.edgeDirection) this.edgeDirection.value = edge.direction;

    this.isUpdatingUI = false;
  }

  /**
   * Hide edge properties
   */
  private hideEdgeProperties(): void {
    if (this.edgePropertiesContainer) {
      this.edgePropertiesContainer.style.display = 'none';
    }
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
