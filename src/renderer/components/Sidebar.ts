import { ShapeStyle, StrokeLinecap, MarkerType, EdgeDirection, CanvasSize, ToolType, TextAnchor, StyleClass, TextRunStyle } from '../../shared/types';
import { eventBus } from '../core/EventBus';
import { editorState } from '../core/EditorState';
import { selectionManager } from '../core/SelectionManager';
import { historyManager } from '../core/HistoryManager';
import { styleClassManager } from '../core/StyleClassManager';
import { Shape } from '../shapes/Shape';
import { Text } from '../shapes/Text';
import { Line } from '../shapes/Line';
import { Ellipse } from '../shapes/Ellipse';
import { Rectangle } from '../shapes/Rectangle';
import { Node } from '../shapes/Node';
import { Edge } from '../shapes/Edge';
import { Path } from '../shapes/Path';
import { StyleChangeCommand } from '../commands/StyleChangeCommand';
import { TextPropertyChangeCommand, TextPropertyUpdates } from '../commands/TextPropertyChangeCommand';
import { MarkerChangeCommand, MarkerUpdates } from '../commands/MarkerChangeCommand';
import { NodeLabelChangeCommand, NodePropertyUpdates } from '../commands/NodeLabelChangeCommand';
import { EdgeDirectionChangeCommand } from '../commands/EdgeDirectionChangeCommand';
import { EdgeLabelChangeCommand } from '../commands/EdgeLabelChangeCommand';
import { ResizeShapeCommand } from '../commands/ResizeShapeCommand';
import { CanvasResizeCommand } from '../commands/CanvasResizeCommand';
import { RotateShapeCommand } from '../commands/RotateShapeCommand';
import { ApplyClassCommand } from '../commands/ApplyClassCommand';
import { RichTextChangeCommand, ClearRichTextCommand } from '../commands/RichTextChangeCommand';
import { ClassNameDialog } from './ClassNameDialog';
import { StyleClassManagementDialog } from './StyleClassManagementDialog';
import { parsePath, serializePath } from '../core/PathParser';
import { round3 } from '../core/MathUtils';
import { globalIndexToLineChar } from '../core/TextRunUtils';

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
  private textContent: HTMLTextAreaElement;
  private fontSize: HTMLInputElement;
  private fontFamily: HTMLSelectElement;
  private textAnchor: HTMLSelectElement;
  private lineHeight: HTMLSelectElement;
  private fontBoldBtn: HTMLButtonElement;
  private fontItalicBtn: HTMLButtonElement;
  private textUnderlineBtn: HTMLButtonElement;
  private textStrikethroughBtn: HTMLButtonElement;

  // Marker properties (for Line and Path)
  private markerPropertiesContainer: HTMLDivElement;
  private markerStart: HTMLSelectElement;
  private markerEnd: HTMLSelectElement;

  // Node-specific properties
  private nodePropertiesContainer: HTMLDivElement | null = null;
  private nodeLabel: HTMLInputElement | null = null;
  private nodeFontSize: HTMLInputElement | null = null;

  // Edge-specific properties
  private edgePropertiesContainer: HTMLDivElement | null = null;
  private edgeDirection: HTMLSelectElement | null = null;
  private edgeLineType: HTMLSelectElement | null = null;
  private edgeCurveAmountSection: HTMLDivElement | null = null;
  private edgeCurveAmount: HTMLInputElement | null = null;
  private edgeCurveAmountValue: HTMLSpanElement | null = null;
  private edgeLabel: HTMLInputElement | null = null;

  // Path-specific properties
  private pathPropertiesContainer: HTMLDivElement | null = null;
  private pathDataInput: HTMLTextAreaElement | null = null;

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

  // Rotation property
  private rotationPropertyContainer: HTMLDivElement | null = null;
  private rotationInput: HTMLInputElement | null = null;

  // Currently edited shape reference (for blur handlers)
  private currentEditingShape: Shape | null = null;

  // Style class selector
  private styleClassSection: HTMLDivElement | null = null;
  private styleClassSelect: HTMLSelectElement | null = null;
  private saveClassButton: HTMLButtonElement | null = null;
  private manageClassesButton: HTMLButtonElement | null = null;

  // Rich text controls
  private richTextControlsContainer: HTMLDivElement | null = null;
  private rangeStartInput: HTMLInputElement | null = null;
  private rangeEndInput: HTMLInputElement | null = null;
  private rangeBoldBtn: HTMLButtonElement | null = null;
  private rangeItalicBtn: HTMLButtonElement | null = null;
  private rangeUnderlineBtn: HTMLButtonElement | null = null;
  private rangeStrikethroughBtn: HTMLButtonElement | null = null;
  private rangeColorInput: HTMLInputElement | null = null;
  private rangeSuperscriptBtn: HTMLButtonElement | null = null;
  private rangeSubscriptBtn: HTMLButtonElement | null = null;
  private clearFormattingBtn: HTMLButtonElement | null = null;

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
    this.textContent = document.getElementById('prop-text-content') as HTMLTextAreaElement;
    this.fontSize = document.getElementById('prop-font-size') as HTMLInputElement;
    this.fontFamily = document.getElementById('prop-font-family') as HTMLSelectElement;
    this.textAnchor = document.getElementById('prop-text-anchor') as HTMLSelectElement;
    this.lineHeight = document.getElementById('prop-line-height') as HTMLSelectElement;
    this.fontBoldBtn = document.getElementById('prop-font-bold-btn') as HTMLButtonElement;
    this.fontItalicBtn = document.getElementById('prop-font-italic-btn') as HTMLButtonElement;
    this.textUnderlineBtn = document.getElementById('prop-text-underline-btn') as HTMLButtonElement;
    this.textStrikethroughBtn = document.getElementById('prop-text-strikethrough-btn') as HTMLButtonElement;

    // Line-specific elements
    this.markerPropertiesContainer = document.getElementById('marker-properties') as HTMLDivElement;
    this.markerStart = document.getElementById('prop-marker-start') as HTMLSelectElement;
    this.markerEnd = document.getElementById('prop-marker-end') as HTMLSelectElement;

    // Node-specific elements
    this.nodePropertiesContainer = document.getElementById('node-properties') as HTMLDivElement;
    this.nodeLabel = document.getElementById('prop-node-label') as HTMLInputElement;
    this.nodeFontSize = document.getElementById('prop-node-font-size') as HTMLInputElement;

    // Edge-specific elements
    this.edgePropertiesContainer = document.getElementById('edge-properties') as HTMLDivElement;
    this.edgeDirection = document.getElementById('prop-edge-direction') as HTMLSelectElement;
    this.edgeLineType = document.getElementById('prop-edge-line-type') as HTMLSelectElement;
    this.edgeCurveAmountSection = document.getElementById('edge-curve-amount-section') as HTMLDivElement;
    this.edgeCurveAmount = document.getElementById('prop-edge-curve-amount') as HTMLInputElement;
    this.edgeCurveAmountValue = document.getElementById('edge-curve-amount-value') as HTMLSpanElement;
    this.edgeLabel = document.getElementById('prop-edge-label') as HTMLInputElement;

    // Path-specific elements
    this.pathPropertiesContainer = document.getElementById('path-properties') as HTMLDivElement;
    this.pathDataInput = document.getElementById('prop-path-data') as HTMLTextAreaElement;

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

    // Rotation property
    this.rotationPropertyContainer = document.getElementById('rotation-property') as HTMLDivElement;
    this.rotationInput = document.getElementById('prop-rotation') as HTMLInputElement;

    // Style class selector
    this.styleClassSection = document.getElementById('style-class-section') as HTMLDivElement;
    this.styleClassSelect = document.getElementById('prop-style-class') as HTMLSelectElement;
    this.saveClassButton = document.getElementById('btn-save-class') as HTMLButtonElement;
    this.manageClassesButton = document.getElementById('btn-manage-classes') as HTMLButtonElement;

    // Rich text controls
    this.richTextControlsContainer = document.getElementById('rich-text-controls') as HTMLDivElement;
    this.rangeStartInput = document.getElementById('prop-range-start') as HTMLInputElement;
    this.rangeEndInput = document.getElementById('prop-range-end') as HTMLInputElement;
    this.rangeBoldBtn = document.getElementById('prop-range-bold-btn') as HTMLButtonElement;
    this.rangeItalicBtn = document.getElementById('prop-range-italic-btn') as HTMLButtonElement;
    this.rangeUnderlineBtn = document.getElementById('prop-range-underline-btn') as HTMLButtonElement;
    this.rangeStrikethroughBtn = document.getElementById('prop-range-strikethrough-btn') as HTMLButtonElement;
    this.rangeColorInput = document.getElementById('prop-range-color') as HTMLInputElement;
    this.rangeSuperscriptBtn = document.getElementById('prop-range-superscript-btn') as HTMLButtonElement;
    this.rangeSubscriptBtn = document.getElementById('prop-range-subscript-btn') as HTMLButtonElement;
    this.clearFormattingBtn = document.getElementById('prop-clear-formatting-btn') as HTMLButtonElement;

    this.setupInputListeners();
    this.setupStyleClassListeners();
    this.setupTextInputListeners();
    this.setupLineInputListeners();
    this.setupNodeInputListeners();
    this.setupEdgeInputListeners();
    this.setupPathInputListeners();
    this.setupPositionInputListeners();
    this.setupCanvasSizeInputListeners();
    this.setupDefaultNodeSizeInputListeners();
    this.setupRotationInputListeners();
    this.setupRichTextInputListeners();
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

    this.textAnchor.addEventListener('change', () => {
      if (this.isUpdatingUI) return;
      this.applyTextPropertyChange({ textAnchor: this.textAnchor.value as TextAnchor });
    });

    this.lineHeight.addEventListener('change', () => {
      if (this.isUpdatingUI) return;
      this.applyTextPropertyChange({ lineHeight: parseFloat(this.lineHeight.value) || 1.2 });
    });

    // Style toggle buttons
    this.fontBoldBtn.addEventListener('click', () => {
      if (this.isUpdatingUI) return;
      const selectedShapes = selectionManager.getSelection();
      if (selectedShapes.length === 1 && selectedShapes[0] instanceof Text) {
        const text = selectedShapes[0] as Text;
        this.applyTextPropertyChange({ fontWeight: text.fontWeight === 'bold' ? 'normal' : 'bold' });
      }
    });

    this.fontItalicBtn.addEventListener('click', () => {
      if (this.isUpdatingUI) return;
      const selectedShapes = selectionManager.getSelection();
      if (selectedShapes.length === 1 && selectedShapes[0] instanceof Text) {
        const text = selectedShapes[0] as Text;
        this.applyTextPropertyChange({ fontStyle: text.fontStyle === 'italic' ? 'normal' : 'italic' });
      }
    });

    this.textUnderlineBtn.addEventListener('click', () => {
      if (this.isUpdatingUI) return;
      const selectedShapes = selectionManager.getSelection();
      if (selectedShapes.length === 1 && selectedShapes[0] instanceof Text) {
        const text = selectedShapes[0] as Text;
        this.applyTextPropertyChange({ textUnderline: !text.textUnderline });
      }
    });

    this.textStrikethroughBtn.addEventListener('click', () => {
      if (this.isUpdatingUI) return;
      const selectedShapes = selectionManager.getSelection();
      if (selectedShapes.length === 1 && selectedShapes[0] instanceof Text) {
        const text = selectedShapes[0] as Text;
        this.applyTextPropertyChange({ textStrikethrough: !text.textStrikethrough });
      }
    });

    // Listen for selection changes in textarea to update range inputs
    this.textContent.addEventListener('select', () => {
      this.updateRangeFromTextareaSelection();
    });
    this.textContent.addEventListener('mouseup', () => {
      this.updateRangeFromTextareaSelection();
    });
    this.textContent.addEventListener('keyup', () => {
      this.updateRangeFromTextareaSelection();
    });
  }

  /**
   * Setup rich text input listeners
   */
  private setupRichTextInputListeners(): void {
    // Range style buttons
    if (this.rangeBoldBtn) {
      this.rangeBoldBtn.addEventListener('click', () => {
        this.applyRangeStyle({ fontWeight: 'bold' });
      });
    }

    if (this.rangeItalicBtn) {
      this.rangeItalicBtn.addEventListener('click', () => {
        this.applyRangeStyle({ fontStyle: 'italic' });
      });
    }

    if (this.rangeUnderlineBtn) {
      this.rangeUnderlineBtn.addEventListener('click', () => {
        this.applyRangeStyle({ textUnderline: true });
      });
    }

    if (this.rangeStrikethroughBtn) {
      this.rangeStrikethroughBtn.addEventListener('click', () => {
        this.applyRangeStyle({ textStrikethrough: true });
      });
    }

    if (this.rangeColorInput) {
      this.rangeColorInput.addEventListener('change', () => {
        this.applyRangeStyle({ fill: this.rangeColorInput!.value });
      });
    }

    if (this.rangeSuperscriptBtn) {
      this.rangeSuperscriptBtn.addEventListener('click', () => {
        // Superscript: baseline-shift: super, font-size: 70%
        this.applyRangeStyle({ baselineShift: 'super', fontSize: -70 });
      });
    }

    if (this.rangeSubscriptBtn) {
      this.rangeSubscriptBtn.addEventListener('click', () => {
        // Subscript: baseline-shift: sub, font-size: 70%
        this.applyRangeStyle({ baselineShift: 'sub', fontSize: -70 });
      });
    }

    if (this.clearFormattingBtn) {
      this.clearFormattingBtn.addEventListener('click', () => {
        this.clearTextFormatting();
      });
    }
  }

  /**
   * Update range inputs from textarea selection
   */
  private updateRangeFromTextareaSelection(): void {
    if (!this.textContent || !this.rangeStartInput || !this.rangeEndInput) return;

    const start = this.textContent.selectionStart;
    const end = this.textContent.selectionEnd;

    if (start !== end) {
      this.rangeStartInput.value = String(start);
      this.rangeEndInput.value = String(end);
    }
  }

  /**
   * Apply rich text style to the selected range
   */
  private applyRangeStyle(style: TextRunStyle): void {
    const selectedShapes = selectionManager.getSelection();
    if (selectedShapes.length !== 1 || !(selectedShapes[0] instanceof Text)) return;

    const text = selectedShapes[0] as Text;

    // Get range from inputs
    const startIndex = parseInt(this.rangeStartInput?.value || '0', 10);
    const endIndex = parseInt(this.rangeEndInput?.value || '0', 10);

    if (startIndex >= endIndex) {
      return;
    }

    // Get or create runs
    const runs = text.getOrCreateRuns();

    // Convert global indices to line/char coordinates
    const startCoord = globalIndexToLineChar(runs, startIndex);
    const endCoord = globalIndexToLineChar(runs, endIndex);

    // Create and execute command
    const command = new RichTextChangeCommand(
      text,
      startCoord.lineIndex,
      startCoord.charIndex,
      endCoord.lineIndex,
      endCoord.charIndex,
      style
    );
    historyManager.execute(command);
  }

  /**
   * Clear all rich text formatting
   */
  private clearTextFormatting(): void {
    const selectedShapes = selectionManager.getSelection();
    if (selectedShapes.length !== 1 || !(selectedShapes[0] instanceof Text)) return;

    const text = selectedShapes[0] as Text;

    if (text.runs) {
      const command = new ClearRichTextCommand(text);
      historyManager.execute(command);
    }
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
      this.nodeFontSize.addEventListener('blur', () => {
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

    if (this.edgeLineType) {
      this.edgeLineType.addEventListener('change', () => {
        if (this.isUpdatingUI) return;
        this.applyEdgeLineTypeChange();
      });
    }

    if (this.edgeCurveAmount) {
      // Update display value on input (live preview)
      this.edgeCurveAmount.addEventListener('input', () => {
        if (this.edgeCurveAmountValue) {
          this.edgeCurveAmountValue.textContent = this.edgeCurveAmount!.value;
        }
        if (this.isUpdatingUI) return;
        this.applyEdgeCurveAmountChange();
      });
      // Apply on change (when slider released)
      this.edgeCurveAmount.addEventListener('change', () => {
        if (this.isUpdatingUI) return;
        this.applyEdgeCurveAmountChange();
      });
    }

    if (this.edgeLabel) {
      this.edgeLabel.addEventListener('change', () => {
        if (this.isUpdatingUI) return;
        this.applyEdgeLabelChange(this.edgeLabel!.value);
      });
      this.edgeLabel.addEventListener('blur', () => {
        if (this.isUpdatingUI) return;
        this.applyEdgeLabelChange(this.edgeLabel!.value);
      });
    }
  }

  /**
   * Setup path property input listeners
   */
  private setupPathInputListeners(): void {
    if (this.pathDataInput) {
      this.pathDataInput.addEventListener('change', () => {
        if (this.isUpdatingUI) return;
        this.applyPathDataChange();
      });
      this.pathDataInput.addEventListener('blur', () => {
        if (this.isUpdatingUI) return;
        this.applyPathDataChange();
      });
    }
  }

  /**
   * Setup position/size input listeners
   * Uses both 'change' and 'blur' events to ensure changes are applied
   */
  private setupPositionInputListeners(): void {
    // Line position inputs
    const lineInputs = [this.lineX1Input, this.lineY1Input, this.lineX2Input, this.lineY2Input];
    lineInputs.forEach(input => {
      if (input) {
        input.addEventListener('change', () => this.applyLinePositionChange());
        input.addEventListener('blur', () => this.applyLinePositionChange());
      }
    });

    // Ellipse position inputs
    const ellipseInputs = [this.ellipseCxInput, this.ellipseCyInput, this.ellipseRxInput, this.ellipseRyInput];
    ellipseInputs.forEach(input => {
      if (input) {
        input.addEventListener('change', () => this.applyEllipsePositionChange());
        input.addEventListener('blur', () => this.applyEllipsePositionChange());
      }
    });

    // Rectangle position inputs
    const rectInputs = [this.rectXInput, this.rectYInput, this.rectWidthInput, this.rectHeightInput];
    rectInputs.forEach(input => {
      if (input) {
        input.addEventListener('change', () => this.applyRectanglePositionChange());
        input.addEventListener('blur', () => this.applyRectanglePositionChange());
      }
    });

    // Text position inputs
    const textInputs = [this.textXInput, this.textYInput];
    textInputs.forEach(input => {
      if (input) {
        input.addEventListener('change', () => this.applyTextPositionChange());
        input.addEventListener('blur', () => this.applyTextPositionChange());
      }
    });

    // Node position inputs
    const nodeInputs = [this.nodeCxInput, this.nodeCyInput, this.nodeRxInput, this.nodeRyInput];
    nodeInputs.forEach(input => {
      if (input) {
        input.addEventListener('change', () => this.applyNodePositionChange());
        input.addEventListener('blur', () => this.applyNodePositionChange());
      }
    });
  }

  /**
   * Setup canvas size input listeners
   */
  private setupCanvasSizeInputListeners(): void {
    if (this.canvasWidthInput) {
      this.canvasWidthInput.addEventListener('change', () => this.applyCanvasSizeChange());
      this.canvasWidthInput.addEventListener('blur', () => this.applyCanvasSizeChange());
    }
    if (this.canvasHeightInput) {
      this.canvasHeightInput.addEventListener('change', () => this.applyCanvasSizeChange());
      this.canvasHeightInput.addEventListener('blur', () => this.applyCanvasSizeChange());
    }
  }

  /**
   * Setup default node size input listeners
   */
  private setupDefaultNodeSizeInputListeners(): void {
    if (this.defaultNodeRxInput) {
      this.defaultNodeRxInput.addEventListener('change', () => this.applyDefaultNodeSizeChange());
      this.defaultNodeRxInput.addEventListener('blur', () => this.applyDefaultNodeSizeChange());
    }
    if (this.defaultNodeRyInput) {
      this.defaultNodeRyInput.addEventListener('change', () => this.applyDefaultNodeSizeChange());
      this.defaultNodeRyInput.addEventListener('blur', () => this.applyDefaultNodeSizeChange());
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
   * Setup rotation input listeners
   */
  private setupRotationInputListeners(): void {
    if (this.rotationInput) {
      this.rotationInput.addEventListener('change', () => {
        if (this.isUpdatingUI) return;
        this.applyRotationChange();
      });
      this.rotationInput.addEventListener('blur', () => {
        if (this.isUpdatingUI) return;
        this.applyRotationChange();
      });
    }
  }

  /**
   * Setup style class selector listeners
   */
  private setupStyleClassListeners(): void {
    // Class select change
    if (this.styleClassSelect) {
      this.styleClassSelect.addEventListener('change', () => {
        if (this.isUpdatingUI) return;
        this.applyClassChange();
      });
    }

    // Save class button
    if (this.saveClassButton) {
      this.saveClassButton.addEventListener('click', () => {
        this.saveCurrentStyleAsClass();
      });
    }

    // Manage classes button
    if (this.manageClassesButton) {
      this.manageClassesButton.addEventListener('click', () => {
        this.showManageClassesDialog();
      });
    }

    // Populate class options on initialization
    this.populateClassOptions();
  }

  /**
   * Populate class dropdown options
   */
  private populateClassOptions(): void {
    if (!this.styleClassSelect) return;

    const classes = styleClassManager.getAllClassesSync();

    // Clear existing options except first (none)
    while (this.styleClassSelect.options.length > 1) {
      this.styleClassSelect.remove(1);
    }

    // Group classes
    const builtinClasses = classes.filter(c => c.isBuiltin);
    const customClasses = classes.filter(c => !c.isBuiltin);

    // Add built-in classes
    if (builtinClasses.length > 0) {
      const builtinGroup = document.createElement('optgroup');
      builtinGroup.label = 'Built-in';
      builtinClasses.forEach(cls => {
        const option = document.createElement('option');
        option.value = cls.name;
        option.textContent = cls.name;
        builtinGroup.appendChild(option);
      });
      this.styleClassSelect.appendChild(builtinGroup);
    }

    // Add custom classes
    if (customClasses.length > 0) {
      const customGroup = document.createElement('optgroup');
      customGroup.label = 'Custom';
      customClasses.forEach(cls => {
        const option = document.createElement('option');
        option.value = cls.name;
        option.textContent = cls.name;
        customGroup.appendChild(option);
      });
      this.styleClassSelect.appendChild(customGroup);
    }
  }

  /**
   * Show style class section when shapes are selected
   */
  private showStyleClassSection(shapes: Shape[]): void {
    if (!this.styleClassSection || !this.styleClassSelect) return;

    this.styleClassSection.style.display = 'block';

    // Update dropdown to show current class
    this.isUpdatingUI = true;

    if (shapes.length === 1) {
      const className = shapes[0].className || '';
      this.styleClassSelect.value = className;
    } else {
      // Multiple shapes - check if all have same class
      const firstClass = shapes[0].className || '';
      const allSame = shapes.every(s => (s.className || '') === firstClass);
      this.styleClassSelect.value = allSame ? firstClass : '';
    }

    this.isUpdatingUI = false;
  }

  /**
   * Hide style class section
   */
  private hideStyleClassSection(): void {
    if (this.styleClassSection) {
      this.styleClassSection.style.display = 'none';
    }
  }

  /**
   * Apply class change to selected shapes
   */
  private applyClassChange(): void {
    if (this.isUpdatingUI || !this.styleClassSelect) return;

    const selectedShapes = selectionManager.getSelection();
    if (selectedShapes.length === 0) return;

    const className = this.styleClassSelect.value || undefined;

    // Get style for the class (or default if none)
    let newStyle: ShapeStyle;
    if (className) {
      const styleClass = styleClassManager.getClass(className);
      if (styleClass) {
        newStyle = { ...styleClass.style };
      } else {
        return; // Class not found
      }
    } else {
      // Removing class - keep current style
      newStyle = { ...selectedShapes[0].style };
    }

    // Create command and execute
    const command = new ApplyClassCommand([...selectedShapes], className, newStyle);
    historyManager.execute(command);

    // Update UI to show new style
    if (selectedShapes.length === 1) {
      this.updateUIFromStyle(selectedShapes[0].style);
    }
  }

  /**
   * Save current style as a new class
   */
  private async saveCurrentStyleAsClass(): Promise<void> {
    const selectedShapes = selectionManager.getSelection();
    if (selectedShapes.length === 0) return;

    // Get style from first selected shape
    const style = { ...selectedShapes[0].style };

    // Show class name dialog
    const dialog = new ClassNameDialog();
    const name = await dialog.show();
    if (!name) return;

    try {
      // Add class to manager
      const newClass = await styleClassManager.addClass(name, style);

      // Refresh dropdown
      this.populateClassOptions();

      // Apply the new class to selected shapes
      if (this.styleClassSelect) {
        this.styleClassSelect.value = newClass.name;
        this.applyClassChange();
      }
    } catch (error) {
      console.error('Failed to save class:', error);
    }
  }

  /**
   * Show the style class management dialog
   */
  private async showManageClassesDialog(): Promise<void> {
    const dialog = new StyleClassManagementDialog();
    const changed = await dialog.show();

    if (changed) {
      // Refresh dropdown after changes
      this.populateClassOptions();

      // Update selection UI if needed
      const selectedShapes = selectionManager.getSelection();
      if (selectedShapes.length > 0) {
        this.showStyleClassSection(selectedShapes);
      }
    }
  }

  /**
   * Apply rotation change from input
   */
  private applyRotationChange(): void {
    if (this.isUpdatingUI || !this.rotationInput) return;

    const selectedShapes = selectionManager.getSelection();
    if (selectedShapes.length !== 1) return;

    const shape = selectedShapes[0];
    // Edge shapes don't support rotation
    if (shape.type === 'edge') return;

    const newRotation = parseFloat(this.rotationInput.value) || 0;
    const beforeRotation = shape.rotation;

    if (Math.abs(newRotation - beforeRotation) > 0.1) {
      const command = new RotateShapeCommand(shape, beforeRotation, newRotation);
      historyManager.execute(command);
    }
  }

  /**
   * Show rotation property for rotatable shapes
   */
  private showRotationProperty(shape: Shape): void {
    if (!this.rotationPropertyContainer || !this.rotationInput) return;

    // Edge doesn't support rotation
    if (shape.type === 'edge') {
      this.hideRotationProperty();
      return;
    }

    this.isUpdatingUI = true;
    this.rotationPropertyContainer.style.display = 'block';
    this.rotationInput.value = String(Math.round(shape.rotation));
    this.isUpdatingUI = false;
  }

  /**
   * Hide rotation property
   */
  private hideRotationProperty(): void {
    if (this.rotationPropertyContainer) {
      this.rotationPropertyContainer.style.display = 'none';
    }
  }

  /**
   * Update rotation input from shape
   */
  private updateRotationInput(shape: Shape): void {
    if (!this.rotationInput || shape.type === 'edge') return;

    this.isUpdatingUI = true;
    this.rotationInput.value = String(Math.round(shape.rotation));
    this.isUpdatingUI = false;
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

        // Show style class section
        this.showStyleClassSection(shapes);

        // Show/hide text properties based on shape type
        if (shape instanceof Text) {
          this.showTextProperties(shape);
        } else {
          this.hideTextProperties();
        }

        // Show/hide marker properties based on shape type (Line or Path)
        if (shape instanceof Line || shape instanceof Path) {
          this.showMarkerProperties(shape);
        } else {
          this.hideMarkerProperties();
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

        // Show/hide path properties based on shape type
        if (shape instanceof Path) {
          this.showPathProperties(shape);
        } else {
          this.hidePathProperties();
        }

        // Show position properties based on shape type
        this.showPositionProperties(shape);

        // Show rotation property for rotatable shapes
        this.showRotationProperty(shape);
      } else if (shapes.length === 0) {
        // Show editor's current style (for new shapes)
        this.updateUIFromStyle(editorState.currentStyle);
        this.hideStyleClassSection();
        this.hideTextProperties();
        this.hideMarkerProperties();
        this.hideNodeProperties();
        this.hideEdgeProperties();
        this.hidePathProperties();
        this.hideAllPositionProperties();
        this.hideRotationProperty();
      } else {
        // Multiple selection - show style class section, hide special properties
        this.showStyleClassSection(shapes);
        this.hideTextProperties();
        this.hideMarkerProperties();
        this.hideNodeProperties();
        this.hideEdgeProperties();
        this.hidePathProperties();
        this.hideAllPositionProperties();
        this.hideRotationProperty();
      }
    });

    // Update position inputs when shape is updated (e.g., during drag)
    eventBus.on('shape:updated', (shape: Shape) => {
      const selectedShapes = selectionManager.getSelection();
      if (selectedShapes.length === 1 && selectedShapes[0] === shape) {
        this.updatePositionInputs(shape);
        // Update path data input if it's a path
        if (shape instanceof Path) {
          this.updatePathDataInput(shape);
        }
        // Update rotation input
        this.updateRotationInput(shape);
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
   * Apply marker change to selected Line or Path shape
   */
  private applyMarkerChange(updates: MarkerUpdates): void {
    const selectedShapes = selectionManager.getSelection();

    if (selectedShapes.length === 1) {
      const shape = selectedShapes[0];
      if (shape instanceof Line || shape instanceof Path) {
        const command = new MarkerChangeCommand(shape, updates);
        historyManager.execute(command);
      }
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
    // Extract first font name from font-family (e.g., "CMU Serif, serif" -> "CMU Serif")
    const primaryFont = text.fontFamily.split(',')[0].trim();
    this.fontFamily.value = primaryFont;
    this.textAnchor.value = text.textAnchor;
    this.lineHeight.value = String(text.lineHeight);

    // Update toggle button states
    this.fontBoldBtn.classList.toggle('active', text.fontWeight === 'bold');
    this.fontItalicBtn.classList.toggle('active', text.fontStyle === 'italic');
    this.textUnderlineBtn.classList.toggle('active', text.textUnderline);
    this.textStrikethroughBtn.classList.toggle('active', text.textStrikethrough);

    // Show rich text controls and reset range inputs
    if (this.richTextControlsContainer) {
      this.richTextControlsContainer.style.display = 'block';
    }
    if (this.rangeStartInput) {
      this.rangeStartInput.value = '0';
    }
    if (this.rangeEndInput) {
      this.rangeEndInput.value = '0';
    }

    this.isUpdatingUI = false;
  }

  /**
   * Hide text properties
   */
  private hideTextProperties(): void {
    this.textPropertiesContainer.style.display = 'none';
    if (this.richTextControlsContainer) {
      this.richTextControlsContainer.style.display = 'none';
    }
  }

  /**
   * Show marker properties and populate with shape values (for Line and Path)
   */
  private showMarkerProperties(shape: Line | Path): void {
    this.isUpdatingUI = true;

    this.markerPropertiesContainer.style.display = 'block';
    this.markerStart.value = shape.markerStart;
    this.markerEnd.value = shape.markerEnd;

    this.isUpdatingUI = false;
  }

  /**
   * Hide marker properties
   */
  private hideMarkerProperties(): void {
    this.markerPropertiesContainer.style.display = 'none';
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
   * Apply edge label change
   */
  private applyEdgeLabelChange(label: string): void {
    const selectedShapes = selectionManager.getSelection();

    if (selectedShapes.length === 1 && selectedShapes[0] instanceof Edge) {
      const edge = selectedShapes[0] as Edge;
      const newLabel = label.trim() || undefined;
      const command = new EdgeLabelChangeCommand(edge, newLabel);
      historyManager.execute(command);
    }
  }

  /**
   * Apply edge line type change
   */
  private applyEdgeLineTypeChange(): void {
    if (!this.edgeLineType) return;

    const selectedShapes = selectionManager.getSelection();
    if (selectedShapes.length !== 1 || !(selectedShapes[0] instanceof Edge)) return;

    const edge = selectedShapes[0] as Edge;
    const newLineType = this.edgeLineType.value as 'straight' | 'curve' | 'path';

    // Don't allow straight for self-loops
    if (edge.isSelfLoop && newLineType === 'straight') {
      this.edgeLineType.value = edge.lineType;
      return;
    }

    // Skip if no change
    if (edge.lineType === newLineType) return;

    // Execute command
    const { EdgeLineTypeChangeCommand } = require('../commands/EdgeLineTypeChangeCommand');
    const command = new EdgeLineTypeChangeCommand(edge, newLineType);
    historyManager.execute(command);

    // Update curve amount section visibility
    this.updateCurveAmountVisibility(newLineType);
  }

  /**
   * Apply edge curve amount change
   */
  private applyEdgeCurveAmountChange(): void {
    if (!this.edgeCurveAmount) return;

    const selectedShapes = selectionManager.getSelection();
    if (selectedShapes.length !== 1 || !(selectedShapes[0] instanceof Edge)) return;

    const edge = selectedShapes[0] as Edge;
    const newCurveAmount = parseInt(this.edgeCurveAmount.value, 10);

    // Skip if no change
    if (edge.curveAmount === newCurveAmount) return;

    // Execute command
    const { EdgeCurveAmountChangeCommand } = require('../commands/EdgeCurveAmountChangeCommand');
    const command = new EdgeCurveAmountChangeCommand(edge, newCurveAmount);
    historyManager.execute(command);
  }

  /**
   * Update curve amount section visibility based on line type
   */
  private updateCurveAmountVisibility(lineType: string): void {
    if (this.edgeCurveAmountSection) {
      this.edgeCurveAmountSection.style.display = lineType === 'curve' ? 'block' : 'none';
    }
    // Disable straight option for self-loops
    if (this.edgeLineType) {
      const straightOption = this.edgeLineType.querySelector('option[value="straight"]') as HTMLOptionElement;
      if (straightOption) {
        const selectedShapes = selectionManager.getSelection();
        if (selectedShapes.length === 1 && selectedShapes[0] instanceof Edge) {
          const edge = selectedShapes[0] as Edge;
          straightOption.disabled = edge.isSelfLoop;
        }
      }
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
    if (this.edgeLineType) {
      this.edgeLineType.value = edge.lineType;
      // Disable straight option for self-loops
      const straightOption = this.edgeLineType.querySelector('option[value="straight"]') as HTMLOptionElement;
      if (straightOption) {
        straightOption.disabled = edge.isSelfLoop;
      }
    }
    if (this.edgeCurveAmount) {
      this.edgeCurveAmount.value = String(edge.curveAmount);
    }
    if (this.edgeCurveAmountValue) {
      this.edgeCurveAmountValue.textContent = String(edge.curveAmount);
    }
    // Show/hide curve amount section based on line type
    if (this.edgeCurveAmountSection) {
      this.edgeCurveAmountSection.style.display = edge.lineType === 'curve' ? 'block' : 'none';
    }
    if (this.edgeLabel) this.edgeLabel.value = edge.label || '';

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
   * Show path properties and populate with shape values
   */
  private showPathProperties(path: Path): void {
    if (!this.pathPropertiesContainer || !this.pathDataInput) return;

    this.isUpdatingUI = true;

    this.pathPropertiesContainer.style.display = 'block';
    this.pathDataInput.value = serializePath(path.commands);

    this.isUpdatingUI = false;
  }

  /**
   * Hide path properties
   */
  private hidePathProperties(): void {
    if (this.pathPropertiesContainer) {
      this.pathPropertiesContainer.style.display = 'none';
    }
  }

  /**
   * Update path data input without triggering change events
   */
  private updatePathDataInput(path: Path): void {
    if (!this.pathDataInput) return;

    this.isUpdatingUI = true;
    this.pathDataInput.value = serializePath(path.commands);
    this.isUpdatingUI = false;
  }

  /**
   * Apply path data change from input
   */
  private applyPathDataChange(): void {
    if (this.isUpdatingUI || !this.pathDataInput) return;

    const selectedShapes = selectionManager.getSelection();
    if (selectedShapes.length !== 1 || !(selectedShapes[0] instanceof Path)) return;

    const path = selectedShapes[0] as Path;
    const newD = this.pathDataInput.value.trim();

    // Parse the new path data
    try {
      const newCommands = parsePath(newD);
      if (newCommands.length === 0) {
        // Invalid or empty path, revert to current value
        this.pathDataInput.value = serializePath(path.commands);
        return;
      }

      // Create command for undo/redo
      const beforeState = { commands: path.commands.map(cmd => ({ ...cmd })) };
      const afterState = { commands: newCommands };

      const command = new ResizeShapeCommand(path, beforeState, afterState);
      historyManager.execute(command);
    } catch (e) {
      // Parse error, revert to current value
      console.warn('Invalid path data:', e);
      this.pathDataInput.value = serializePath(path.commands);
    }
  }

  /**
   * Update UI inputs from style object
   */
  private updateUIFromStyle(style: ShapeStyle): void {
    this.isUpdatingUI = true;

    // Only set fillColor if it's a valid color (not 'none')
    if (!style.fillNone && style.fill !== 'none') {
      this.fillColor.value = style.fill;
    }
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

    // Store reference to the shape being edited (for blur handlers)
    this.currentEditingShape = shape;

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
    // Note: Don't clear currentEditingShape here - blur handlers may still need it
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
      if (this.lineX1Input) this.lineX1Input.value = String(round3(shape.x1));
      if (this.lineY1Input) this.lineY1Input.value = String(round3(shape.y1));
      if (this.lineX2Input) this.lineX2Input.value = String(round3(shape.x2));
      if (this.lineY2Input) this.lineY2Input.value = String(round3(shape.y2));
    } else if (shape instanceof Node) {
      if (this.nodeCxInput) this.nodeCxInput.value = String(round3(shape.cx));
      if (this.nodeCyInput) this.nodeCyInput.value = String(round3(shape.cy));
      if (this.nodeRxInput) this.nodeRxInput.value = String(round3(shape.rx));
      if (this.nodeRyInput) this.nodeRyInput.value = String(round3(shape.ry));
    } else if (shape instanceof Ellipse) {
      if (this.ellipseCxInput) this.ellipseCxInput.value = String(round3(shape.cx));
      if (this.ellipseCyInput) this.ellipseCyInput.value = String(round3(shape.cy));
      if (this.ellipseRxInput) this.ellipseRxInput.value = String(round3(shape.rx));
      if (this.ellipseRyInput) this.ellipseRyInput.value = String(round3(shape.ry));
    } else if (shape instanceof Rectangle) {
      if (this.rectXInput) this.rectXInput.value = String(round3(shape.x));
      if (this.rectYInput) this.rectYInput.value = String(round3(shape.y));
      if (this.rectWidthInput) this.rectWidthInput.value = String(round3(shape.width));
      if (this.rectHeightInput) this.rectHeightInput.value = String(round3(shape.height));
    } else if (shape instanceof Text) {
      if (this.textXInput) this.textXInput.value = String(round3(shape.x));
      if (this.textYInput) this.textYInput.value = String(round3(shape.y));
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

    // Use stored shape reference (selection may have been cleared before blur fires)
    const line = this.currentEditingShape instanceof Line ? this.currentEditingShape : null;
    if (!line) return;

    const newX1 = parseFloat(this.lineX1Input?.value || '0');
    const newY1 = parseFloat(this.lineY1Input?.value || '0');
    const newX2 = parseFloat(this.lineX2Input?.value || '0');
    const newY2 = parseFloat(this.lineY2Input?.value || '0');

    // Check if values actually changed
    if (line.x1 === newX1 && line.y1 === newY1 && line.x2 === newX2 && line.y2 === newY2) return;

    const beforeState = ResizeShapeCommand.captureState(line);
    const afterState = { x1: newX1, y1: newY1, x2: newX2, y2: newY2 };

    const command = new ResizeShapeCommand(line, beforeState, afterState);
    historyManager.execute(command);
  }

  private applyEllipsePositionChange(): void {
    if (this.isUpdatingUI) return;

    // Use stored shape reference (selection may have been cleared before blur fires)
    const ellipse = this.currentEditingShape instanceof Ellipse ? this.currentEditingShape : null;
    if (!ellipse) return;

    const newCx = parseFloat(this.ellipseCxInput?.value || '0');
    const newCy = parseFloat(this.ellipseCyInput?.value || '0');
    const newRx = Math.max(1, parseFloat(this.ellipseRxInput?.value || '1'));
    const newRy = Math.max(1, parseFloat(this.ellipseRyInput?.value || '1'));

    // Check if values actually changed
    if (ellipse.cx === newCx && ellipse.cy === newCy && ellipse.rx === newRx && ellipse.ry === newRy) return;

    const beforeState = ResizeShapeCommand.captureState(ellipse);
    const afterState = { cx: newCx, cy: newCy, rx: newRx, ry: newRy };

    const command = new ResizeShapeCommand(ellipse, beforeState, afterState);
    historyManager.execute(command);
  }

  private applyRectanglePositionChange(): void {
    if (this.isUpdatingUI) return;

    // Use stored shape reference (selection may have been cleared before blur fires)
    const rect = this.currentEditingShape instanceof Rectangle ? this.currentEditingShape : null;
    if (!rect) return;

    const newX = parseFloat(this.rectXInput?.value || '0');
    const newY = parseFloat(this.rectYInput?.value || '0');
    const newWidth = Math.max(1, parseFloat(this.rectWidthInput?.value || '1'));
    const newHeight = Math.max(1, parseFloat(this.rectHeightInput?.value || '1'));

    // Check if values actually changed
    if (rect.x === newX && rect.y === newY && rect.width === newWidth && rect.height === newHeight) return;

    const beforeState = ResizeShapeCommand.captureState(rect);
    const afterState = { x: newX, y: newY, width: newWidth, height: newHeight };

    const command = new ResizeShapeCommand(rect, beforeState, afterState);
    historyManager.execute(command);
  }

  private applyTextPositionChange(): void {
    if (this.isUpdatingUI) return;

    // Use stored shape reference (selection may have been cleared before blur fires)
    const text = this.currentEditingShape instanceof Text ? this.currentEditingShape : null;
    if (!text) return;

    const newX = parseFloat(this.textXInput?.value || '0');
    const newY = parseFloat(this.textYInput?.value || '0');

    // Check if values actually changed
    if (text.x === newX && text.y === newY) return;

    const beforeState = ResizeShapeCommand.captureState(text);
    const afterState = { x: newX, y: newY };

    const command = new ResizeShapeCommand(text, beforeState, afterState);
    historyManager.execute(command);
  }

  private applyNodePositionChange(): void {
    if (this.isUpdatingUI) return;

    // Use stored shape reference (selection may have been cleared before blur fires)
    const node = this.currentEditingShape instanceof Node ? this.currentEditingShape : null;
    if (!node) return;

    const newCx = parseFloat(this.nodeCxInput?.value || '0');
    const newCy = parseFloat(this.nodeCyInput?.value || '0');
    const newRx = Math.max(1, parseFloat(this.nodeRxInput?.value || '1'));
    const newRy = Math.max(1, parseFloat(this.nodeRyInput?.value || '1'));

    // Check if values actually changed
    if (node.cx === newCx && node.cy === newCy && node.rx === newRx && node.ry === newRy) return;

    const beforeState = ResizeShapeCommand.captureState(node);
    const afterState = { cx: newCx, cy: newCy, rx: newRx, ry: newRy };

    const command = new ResizeShapeCommand(node, beforeState, afterState);
    historyManager.execute(command);
  }
}
