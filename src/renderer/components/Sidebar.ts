import { ShapeStyle, StrokeLinecap, MarkerType, EdgeDirection, CanvasSize, ToolType } from '../../shared/types';
import { eventBus } from '../core/EventBus';
import { editorState } from '../core/EditorState';
import { selectionManager } from '../core/SelectionManager';
import { historyManager } from '../core/HistoryManager';
import { Shape } from '../shapes/Shape';
import { Text } from '../shapes/Text';
import { Line } from '../shapes/Line';
import { Ellipse } from '../shapes/Ellipse';
import { Rectangle } from '../shapes/Rectangle';
import { Node } from '../shapes/Node';
import { Edge } from '../shapes/Edge';
import { StyleChangeCommand } from '../commands/StyleChangeCommand';
import { TextPropertyChangeCommand, TextPropertyUpdates } from '../commands/TextPropertyChangeCommand';
import { MarkerChangeCommand, MarkerUpdates } from '../commands/MarkerChangeCommand';
import { NodeLabelChangeCommand, NodePropertyUpdates } from '../commands/NodeLabelChangeCommand';
import { EdgeDirectionChangeCommand } from '../commands/EdgeDirectionChangeCommand';
import { ResizeShapeCommand } from '../commands/ResizeShapeCommand';
import { CanvasResizeCommand } from '../commands/CanvasResizeCommand';

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

  // Position/Size properties
  private linePositionContainer: HTMLDivElement | null = null;
  private lineX1Input: HTMLInputElement | null = null;
  private lineY1Input: HTMLInputElement | null = null;
  private lineX2Input: HTMLInputElement | null = null;
  private lineY2Input: HTMLInputElement | null = null;

  private ellipsePositionContainer: HTMLDivElement | null = null;
  private ellipseCxInput: HTMLInputElement | null = null;
  private ellipseCyInput: HTMLInputElement | null = null;
  private ellipseRxInput: HTMLInputElement | null = null;
  private ellipseRyInput: HTMLInputElement | null = null;

  private rectanglePositionContainer: HTMLDivElement | null = null;
  private rectXInput: HTMLInputElement | null = null;
  private rectYInput: HTMLInputElement | null = null;
  private rectWidthInput: HTMLInputElement | null = null;
  private rectHeightInput: HTMLInputElement | null = null;

  private textPositionContainer: HTMLDivElement | null = null;
  private textXInput: HTMLInputElement | null = null;
  private textYInput: HTMLInputElement | null = null;

  private nodePositionContainer: HTMLDivElement | null = null;
  private nodeCxInput: HTMLInputElement | null = null;
  private nodeCyInput: HTMLInputElement | null = null;
  private nodeRxInput: HTMLInputElement | null = null;
  private nodeRyInput: HTMLInputElement | null = null;

  // Canvas size inputs
  private canvasWidthInput: HTMLInputElement | null = null;
  private canvasHeightInput: HTMLInputElement | null = null;

  // Default node size inputs
  private defaultNodeSizeSection: HTMLDivElement | null = null;
  private defaultNodeRxInput: HTMLInputElement | null = null;
  private defaultNodeRyInput: HTMLInputElement | null = null;

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

    // Position/Size elements
    this.linePositionContainer = document.getElementById('line-position') as HTMLDivElement;
    this.lineX1Input = document.getElementById('prop-line-x1') as HTMLInputElement;
    this.lineY1Input = document.getElementById('prop-line-y1') as HTMLInputElement;
    this.lineX2Input = document.getElementById('prop-line-x2') as HTMLInputElement;
    this.lineY2Input = document.getElementById('prop-line-y2') as HTMLInputElement;

    this.ellipsePositionContainer = document.getElementById('ellipse-position') as HTMLDivElement;
    this.ellipseCxInput = document.getElementById('prop-ellipse-cx') as HTMLInputElement;
    this.ellipseCyInput = document.getElementById('prop-ellipse-cy') as HTMLInputElement;
    this.ellipseRxInput = document.getElementById('prop-ellipse-rx') as HTMLInputElement;
    this.ellipseRyInput = document.getElementById('prop-ellipse-ry') as HTMLInputElement;

    this.rectanglePositionContainer = document.getElementById('rectangle-position') as HTMLDivElement;
    this.rectXInput = document.getElementById('prop-rect-x') as HTMLInputElement;
    this.rectYInput = document.getElementById('prop-rect-y') as HTMLInputElement;
    this.rectWidthInput = document.getElementById('prop-rect-width') as HTMLInputElement;
    this.rectHeightInput = document.getElementById('prop-rect-height') as HTMLInputElement;

    this.textPositionContainer = document.getElementById('text-position') as HTMLDivElement;
    this.textXInput = document.getElementById('prop-text-x') as HTMLInputElement;
    this.textYInput = document.getElementById('prop-text-y') as HTMLInputElement;

    this.nodePositionContainer = document.getElementById('node-position') as HTMLDivElement;
    this.nodeCxInput = document.getElementById('prop-node-cx') as HTMLInputElement;
    this.nodeCyInput = document.getElementById('prop-node-cy') as HTMLInputElement;
    this.nodeRxInput = document.getElementById('prop-node-rx') as HTMLInputElement;
    this.nodeRyInput = document.getElementById('prop-node-ry') as HTMLInputElement;

    // Canvas size inputs
    this.canvasWidthInput = document.getElementById('prop-canvas-width') as HTMLInputElement;
    this.canvasHeightInput = document.getElementById('prop-canvas-height') as HTMLInputElement;

    // Default node size inputs
    this.defaultNodeSizeSection = document.getElementById('default-node-size-section') as HTMLDivElement;
    this.defaultNodeRxInput = document.getElementById('prop-default-node-rx') as HTMLInputElement;
    this.defaultNodeRyInput = document.getElementById('prop-default-node-ry') as HTMLInputElement;

    this.setupInputListeners();
    this.setupTextInputListeners();
    this.setupLineInputListeners();
    this.setupNodeInputListeners();
    this.setupEdgeInputListeners();
    this.setupPositionInputListeners();
    this.setupCanvasSizeInputListeners();
    this.setupDefaultNodeSizeInputListeners();
    this.setupEventListeners();

    // Initialize with default style
    this.updateUIFromStyle(editorState.currentStyle);

    // Initialize canvas size inputs
    this.updateCanvasSizeInputs(editorState.canvasSize);
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
   * Setup position/size input listeners
   */
  private setupPositionInputListeners(): void {
    // Line position inputs
    const lineInputs = [this.lineX1Input, this.lineY1Input, this.lineX2Input, this.lineY2Input];
    lineInputs.forEach(input => {
      if (input) {
        input.addEventListener('change', () => this.applyLinePositionChange());
      }
    });

    // Ellipse position inputs
    const ellipseInputs = [this.ellipseCxInput, this.ellipseCyInput, this.ellipseRxInput, this.ellipseRyInput];
    ellipseInputs.forEach(input => {
      if (input) {
        input.addEventListener('change', () => this.applyEllipsePositionChange());
      }
    });

    // Rectangle position inputs
    const rectInputs = [this.rectXInput, this.rectYInput, this.rectWidthInput, this.rectHeightInput];
    rectInputs.forEach(input => {
      if (input) {
        input.addEventListener('change', () => this.applyRectanglePositionChange());
      }
    });

    // Text position inputs
    const textInputs = [this.textXInput, this.textYInput];
    textInputs.forEach(input => {
      if (input) {
        input.addEventListener('change', () => this.applyTextPositionChange());
      }
    });

    // Node position inputs
    const nodeInputs = [this.nodeCxInput, this.nodeCyInput, this.nodeRxInput, this.nodeRyInput];
    nodeInputs.forEach(input => {
      if (input) {
        input.addEventListener('change', () => this.applyNodePositionChange());
      }
    });
  }

  /**
   * Setup canvas size input listeners
   */
  private setupCanvasSizeInputListeners(): void {
    if (this.canvasWidthInput) {
      this.canvasWidthInput.addEventListener('change', () => this.applyCanvasSizeChange());
    }
    if (this.canvasHeightInput) {
      this.canvasHeightInput.addEventListener('change', () => this.applyCanvasSizeChange());
    }
  }

  /**
   * Setup default node size input listeners
   */
  private setupDefaultNodeSizeInputListeners(): void {
    if (this.defaultNodeRxInput) {
      this.defaultNodeRxInput.addEventListener('change', () => this.applyDefaultNodeSizeChange());
    }
    if (this.defaultNodeRyInput) {
      this.defaultNodeRyInput.addEventListener('change', () => this.applyDefaultNodeSizeChange());
    }
  }

  /**
   * Apply default node size change from inputs
   */
  private applyDefaultNodeSizeChange(): void {
    if (this.isUpdatingUI) return;

    const rx = Math.max(5, parseInt(this.defaultNodeRxInput?.value || '20', 10));
    const ry = Math.max(5, parseInt(this.defaultNodeRyInput?.value || '20', 10));
    editorState.setDefaultNodeSize(rx, ry);
  }

  /**
   * Update default node size inputs
   */
  private updateDefaultNodeSizeInputs(): void {
    this.isUpdatingUI = true;
    const { rx, ry } = editorState.defaultNodeSize;
    if (this.defaultNodeRxInput) this.defaultNodeRxInput.value = String(rx);
    if (this.defaultNodeRyInput) this.defaultNodeRyInput.value = String(ry);
    this.isUpdatingUI = false;
  }

  /**
   * Update canvas size inputs from canvas size
   */
  private updateCanvasSizeInputs(size: CanvasSize): void {
    this.isUpdatingUI = true;

    if (this.canvasWidthInput) {
      this.canvasWidthInput.value = String(size.width);
    }
    if (this.canvasHeightInput) {
      this.canvasHeightInput.value = String(size.height);
    }

    this.isUpdatingUI = false;
  }

  /**
   * Apply canvas size change from inputs
   */
  private applyCanvasSizeChange(): void {
    if (this.isUpdatingUI) return;

    const newWidth = Math.max(100, parseInt(this.canvasWidthInput?.value || '800', 10));
    const newHeight = Math.max(100, parseInt(this.canvasHeightInput?.value || '600', 10));
    const currentSize = editorState.canvasSize;

    if (newWidth !== currentSize.width || newHeight !== currentSize.height) {
      const command = new CanvasResizeCommand(
        currentSize,
        { width: newWidth, height: newHeight }
      );
      historyManager.execute(command);
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

        // Show position properties based on shape type
        this.showPositionProperties(shape);
      } else if (shapes.length === 0) {
        // Show editor's current style (for new shapes)
        this.updateUIFromStyle(editorState.currentStyle);
        this.hideTextProperties();
        this.hideLineProperties();
        this.hideNodeProperties();
        this.hideEdgeProperties();
        this.hideAllPositionProperties();
      } else {
        // Multiple selection - hide special properties
        this.hideTextProperties();
        this.hideLineProperties();
        this.hideNodeProperties();
        this.hideEdgeProperties();
        this.hideAllPositionProperties();
      }
    });

    // Update position inputs when shape is updated (e.g., during drag)
    eventBus.on('shape:updated', (shape: Shape) => {
      const selectedShapes = selectionManager.getSelection();
      if (selectedShapes.length === 1 && selectedShapes[0] === shape) {
        this.updatePositionInputs(shape);
      }
    });

    // Update canvas size inputs when canvas size changes
    eventBus.on('canvas:sizeChanged', (size: CanvasSize) => {
      this.updateCanvasSizeInputs(size);
    });

    // Show/hide default node size section based on current tool
    eventBus.on('tool:changed', (tool: ToolType) => {
      if (tool === 'node') {
        this.showDefaultNodeSizeSection();
      } else {
        this.hideDefaultNodeSizeSection();
      }
    });
  }

  /**
   * Show default node size section
   */
  private showDefaultNodeSizeSection(): void {
    if (this.defaultNodeSizeSection) {
      this.defaultNodeSizeSection.style.display = 'block';
      this.updateDefaultNodeSizeInputs();
    }
  }

  /**
   * Hide default node size section
   */
  private hideDefaultNodeSizeSection(): void {
    if (this.defaultNodeSizeSection) {
      this.defaultNodeSizeSection.style.display = 'none';
    }
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

  /**
   * Show position properties for the given shape
   */
  private showPositionProperties(shape: Shape): void {
    this.hideAllPositionProperties();

    if (shape instanceof Line) {
      this.showLinePositionProperties(shape);
    } else if (shape instanceof Node) {
      this.showNodePositionProperties(shape);
    } else if (shape instanceof Ellipse) {
      this.showEllipsePositionProperties(shape);
    } else if (shape instanceof Rectangle) {
      this.showRectanglePositionProperties(shape);
    } else if (shape instanceof Text) {
      this.showTextPositionProperties(shape);
    }
    // Edge has no position properties (derived from nodes)
  }

  /**
   * Hide all position property sections
   */
  private hideAllPositionProperties(): void {
    if (this.linePositionContainer) this.linePositionContainer.style.display = 'none';
    if (this.ellipsePositionContainer) this.ellipsePositionContainer.style.display = 'none';
    if (this.rectanglePositionContainer) this.rectanglePositionContainer.style.display = 'none';
    if (this.textPositionContainer) this.textPositionContainer.style.display = 'none';
    if (this.nodePositionContainer) this.nodePositionContainer.style.display = 'none';
  }

  /**
   * Update position inputs from shape (without triggering change events)
   */
  private updatePositionInputs(shape: Shape): void {
    this.isUpdatingUI = true;

    if (shape instanceof Line) {
      if (this.lineX1Input) this.lineX1Input.value = String(Math.round(shape.x1));
      if (this.lineY1Input) this.lineY1Input.value = String(Math.round(shape.y1));
      if (this.lineX2Input) this.lineX2Input.value = String(Math.round(shape.x2));
      if (this.lineY2Input) this.lineY2Input.value = String(Math.round(shape.y2));
    } else if (shape instanceof Node) {
      if (this.nodeCxInput) this.nodeCxInput.value = String(Math.round(shape.cx));
      if (this.nodeCyInput) this.nodeCyInput.value = String(Math.round(shape.cy));
      if (this.nodeRxInput) this.nodeRxInput.value = String(Math.round(shape.rx));
      if (this.nodeRyInput) this.nodeRyInput.value = String(Math.round(shape.ry));
    } else if (shape instanceof Ellipse) {
      if (this.ellipseCxInput) this.ellipseCxInput.value = String(Math.round(shape.cx));
      if (this.ellipseCyInput) this.ellipseCyInput.value = String(Math.round(shape.cy));
      if (this.ellipseRxInput) this.ellipseRxInput.value = String(Math.round(shape.rx));
      if (this.ellipseRyInput) this.ellipseRyInput.value = String(Math.round(shape.ry));
    } else if (shape instanceof Rectangle) {
      if (this.rectXInput) this.rectXInput.value = String(Math.round(shape.x));
      if (this.rectYInput) this.rectYInput.value = String(Math.round(shape.y));
      if (this.rectWidthInput) this.rectWidthInput.value = String(Math.round(shape.width));
      if (this.rectHeightInput) this.rectHeightInput.value = String(Math.round(shape.height));
    } else if (shape instanceof Text) {
      if (this.textXInput) this.textXInput.value = String(Math.round(shape.x));
      if (this.textYInput) this.textYInput.value = String(Math.round(shape.y));
    }

    this.isUpdatingUI = false;
  }

  // Show position properties for each shape type
  private showLinePositionProperties(line: Line): void {
    if (!this.linePositionContainer) return;
    this.linePositionContainer.style.display = 'block';
    this.updatePositionInputs(line);
  }

  private showEllipsePositionProperties(ellipse: Ellipse): void {
    if (!this.ellipsePositionContainer) return;
    this.ellipsePositionContainer.style.display = 'block';
    this.updatePositionInputs(ellipse);
  }

  private showRectanglePositionProperties(rect: Rectangle): void {
    if (!this.rectanglePositionContainer) return;
    this.rectanglePositionContainer.style.display = 'block';
    this.updatePositionInputs(rect);
  }

  private showTextPositionProperties(text: Text): void {
    if (!this.textPositionContainer) return;
    this.textPositionContainer.style.display = 'block';
    this.updatePositionInputs(text);
  }

  private showNodePositionProperties(node: Node): void {
    if (!this.nodePositionContainer) return;
    this.nodePositionContainer.style.display = 'block';
    this.updatePositionInputs(node);
  }

  // Apply position changes from inputs
  private applyLinePositionChange(): void {
    if (this.isUpdatingUI) return;
    const selectedShapes = selectionManager.getSelection();
    if (selectedShapes.length !== 1 || !(selectedShapes[0] instanceof Line)) return;

    const line = selectedShapes[0] as Line;
    const beforeState = ResizeShapeCommand.captureState(line);
    const afterState = {
      x1: parseFloat(this.lineX1Input?.value || '0'),
      y1: parseFloat(this.lineY1Input?.value || '0'),
      x2: parseFloat(this.lineX2Input?.value || '0'),
      y2: parseFloat(this.lineY2Input?.value || '0')
    };

    const command = new ResizeShapeCommand(line, beforeState, afterState);
    historyManager.execute(command);
  }

  private applyEllipsePositionChange(): void {
    if (this.isUpdatingUI) return;
    const selectedShapes = selectionManager.getSelection();
    if (selectedShapes.length !== 1 || !(selectedShapes[0] instanceof Ellipse)) return;

    const ellipse = selectedShapes[0] as Ellipse;
    const beforeState = ResizeShapeCommand.captureState(ellipse);
    const afterState = {
      cx: parseFloat(this.ellipseCxInput?.value || '0'),
      cy: parseFloat(this.ellipseCyInput?.value || '0'),
      rx: Math.max(1, parseFloat(this.ellipseRxInput?.value || '1')),
      ry: Math.max(1, parseFloat(this.ellipseRyInput?.value || '1'))
    };

    const command = new ResizeShapeCommand(ellipse, beforeState, afterState);
    historyManager.execute(command);
  }

  private applyRectanglePositionChange(): void {
    if (this.isUpdatingUI) return;
    const selectedShapes = selectionManager.getSelection();
    if (selectedShapes.length !== 1 || !(selectedShapes[0] instanceof Rectangle)) return;

    const rect = selectedShapes[0] as Rectangle;
    const beforeState = ResizeShapeCommand.captureState(rect);
    const afterState = {
      x: parseFloat(this.rectXInput?.value || '0'),
      y: parseFloat(this.rectYInput?.value || '0'),
      width: Math.max(1, parseFloat(this.rectWidthInput?.value || '1')),
      height: Math.max(1, parseFloat(this.rectHeightInput?.value || '1'))
    };

    const command = new ResizeShapeCommand(rect, beforeState, afterState);
    historyManager.execute(command);
  }

  private applyTextPositionChange(): void {
    if (this.isUpdatingUI) return;
    const selectedShapes = selectionManager.getSelection();
    if (selectedShapes.length !== 1 || !(selectedShapes[0] instanceof Text)) return;

    const text = selectedShapes[0] as Text;
    const beforeState = ResizeShapeCommand.captureState(text);
    const afterState = {
      x: parseFloat(this.textXInput?.value || '0'),
      y: parseFloat(this.textYInput?.value || '0')
    };

    const command = new ResizeShapeCommand(text, beforeState, afterState);
    historyManager.execute(command);
  }

  private applyNodePositionChange(): void {
    if (this.isUpdatingUI) return;
    const selectedShapes = selectionManager.getSelection();
    if (selectedShapes.length !== 1 || !(selectedShapes[0] instanceof Node)) return;

    const node = selectedShapes[0] as Node;
    const beforeState = ResizeShapeCommand.captureState(node);
    const afterState = {
      cx: parseFloat(this.nodeCxInput?.value || '0'),
      cy: parseFloat(this.nodeCyInput?.value || '0'),
      rx: Math.max(1, parseFloat(this.nodeRxInput?.value || '1')),
      ry: Math.max(1, parseFloat(this.nodeRyInput?.value || '1'))
    };

    const command = new ResizeShapeCommand(node, beforeState, afterState);
    historyManager.execute(command);
  }
}
