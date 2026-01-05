import cytoscape from 'cytoscape';
import { getGraphManager } from './GraphManager';

export type LayoutType = 'cose' | 'circle' | 'breadthfirst' | 'grid' | 'concentric';

/**
 * LayoutManager - Handles automatic graph layout using cytoscape.js
 */
export class LayoutManager {
  /**
   * Apply automatic layout to all graph nodes
   * @param layoutType The layout algorithm to use
   * @param canvasWidth Canvas width for centering
   * @param canvasHeight Canvas height for centering
   */
  static applyLayout(layoutType: LayoutType, canvasWidth: number, canvasHeight: number): void {
    const gm = getGraphManager();
    const nodeIds = gm.getAllNodeIds();
    const edgeIds = gm.getAllEdgeIds();

    // No nodes to layout
    if (nodeIds.length === 0) return;

    // Build cytoscape elements
    const cyNodes = nodeIds.map(id => {
      const node = gm.getNodeShape(id)!;
      return {
        data: { id, width: node.rx * 2, height: node.ry * 2 },
        position: { x: node.cx, y: node.cy }
      };
    });

    const cyEdges = edgeIds.map(id => {
      const conn = gm.getEdgeConnection(id)!;
      return {
        data: { id, source: conn.sourceId, target: conn.targetId }
      };
    });

    // Create headless cytoscape instance
    const cy = cytoscape({
      headless: true,
      styleEnabled: false,
      elements: {
        nodes: cyNodes,
        edges: cyEdges
      }
    });

    // Configure layout options based on type
    const layoutOptions = this.getLayoutOptions(layoutType, canvasWidth, canvasHeight);

    // Run layout
    const layout = cy.layout(layoutOptions);
    layout.run();

    // Apply new positions to nodes
    cy.nodes().forEach(cyNode => {
      const node = gm.getNodeShape(cyNode.id());
      if (node) {
        const pos = cyNode.position();
        node.cx = pos.x;
        node.cy = pos.y;
        node.updateElement();
      }
    });

    // Center the result on canvas
    this.centerOnCanvas(nodeIds, canvasWidth, canvasHeight);

    // Update all edges
    nodeIds.forEach(id => gm.updateEdgesForNode(id));

    // Destroy cytoscape instance
    cy.destroy();
  }

  /**
   * Get layout options for the specified layout type
   */
  private static getLayoutOptions(layoutType: LayoutType, canvasWidth: number, canvasHeight: number): cytoscape.LayoutOptions {
    const baseOptions = {
      name: layoutType,
      animate: false,
      fit: false  // We'll handle centering ourselves
    };

    switch (layoutType) {
      case 'cose':
        return {
          ...baseOptions,
          name: 'cose',
          idealEdgeLength: 200,
          nodeOverlap: 50,
          nodeRepulsion: (node: cytoscape.NodeSingular) => 8000,
          edgeElasticity: (edge: cytoscape.EdgeSingular) => 50,
          gravity: 0.1,
          numIter: 1000,
          coolingFactor: 0.95,
          minTemp: 1.0
        } as cytoscape.CoseLayoutOptions;

      case 'circle':
        return {
          ...baseOptions,
          name: 'circle',
          radius: Math.min(canvasWidth, canvasHeight) * 0.3,
          startAngle: 0,
          sweep: 2 * Math.PI
        } as cytoscape.CircleLayoutOptions;

      case 'breadthfirst':
        return {
          ...baseOptions,
          name: 'breadthfirst',
          directed: true,
          spacingFactor: 1.5
        } as cytoscape.BreadthFirstLayoutOptions;

      case 'grid':
        return {
          ...baseOptions,
          name: 'grid',
          rows: undefined,
          cols: undefined,
          condense: true
        } as cytoscape.GridLayoutOptions;

      case 'concentric':
        return {
          ...baseOptions,
          name: 'concentric',
          minNodeSpacing: 50,
          startAngle: 0,
          sweep: 2 * Math.PI,
          equidistant: true
        } as cytoscape.ConcentricLayoutOptions;

      default:
        return baseOptions;
    }
  }

  /**
   * Scale and center all nodes to fit the canvas
   */
  private static centerOnCanvas(nodeIds: string[], canvasWidth: number, canvasHeight: number): void {
    const gm = getGraphManager();

    if (nodeIds.length === 0) return;

    // Calculate bounding box of all nodes
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    nodeIds.forEach(id => {
      const node = gm.getNodeShape(id);
      if (node) {
        minX = Math.min(minX, node.cx - node.rx);
        minY = Math.min(minY, node.cy - node.ry);
        maxX = Math.max(maxX, node.cx + node.rx);
        maxY = Math.max(maxY, node.cy + node.ry);
      }
    });

    // Calculate current bounds dimensions
    const boundsWidth = maxX - minX;
    const boundsHeight = maxY - minY;

    // Skip if bounds are zero (single node or identical positions)
    if (boundsWidth <= 0 && boundsHeight <= 0) {
      // Just center a single node
      const canvasCenterX = canvasWidth / 2;
      const canvasCenterY = canvasHeight / 2;
      nodeIds.forEach(id => {
        const node = gm.getNodeShape(id);
        if (node) {
          node.cx = canvasCenterX;
          node.cy = canvasCenterY;
          node.updateElement();
        }
      });
      return;
    }

    // Target area: use 80% of canvas with padding
    const padding = 50;
    const targetWidth = canvasWidth - padding * 2;
    const targetHeight = canvasHeight - padding * 2;

    // Calculate scale factor to fit nodes into target area
    const scaleX = boundsWidth > 0 ? targetWidth / boundsWidth : 1;
    const scaleY = boundsHeight > 0 ? targetHeight / boundsHeight : 1;
    const scale = Math.min(scaleX, scaleY, 3); // Cap scale at 3x to avoid excessive spreading

    // Calculate center of bounding box
    const boundsCenterX = (minX + maxX) / 2;
    const boundsCenterY = (minY + maxY) / 2;

    // Calculate canvas center
    const canvasCenterX = canvasWidth / 2;
    const canvasCenterY = canvasHeight / 2;

    // Apply scale and center to all nodes
    nodeIds.forEach(id => {
      const node = gm.getNodeShape(id);
      if (node) {
        // Scale relative to bounds center, then translate to canvas center
        const relX = node.cx - boundsCenterX;
        const relY = node.cy - boundsCenterY;
        node.cx = canvasCenterX + relX * scale;
        node.cy = canvasCenterY + relY * scale;
        node.updateElement();
      }
    });
  }

  /**
   * Capture current positions of all nodes
   */
  static capturePositions(): Map<string, { cx: number; cy: number }> {
    const gm = getGraphManager();
    const positions = new Map<string, { cx: number; cy: number }>();

    gm.getAllNodeIds().forEach(id => {
      const node = gm.getNodeShape(id);
      if (node) {
        positions.set(id, { cx: node.cx, cy: node.cy });
      }
    });

    return positions;
  }

  /**
   * Apply saved positions to nodes
   */
  static applyPositions(positions: Map<string, { cx: number; cy: number }>): void {
    const gm = getGraphManager();

    positions.forEach((pos, id) => {
      const node = gm.getNodeShape(id);
      if (node) {
        node.cx = pos.cx;
        node.cy = pos.cy;
        node.updateElement();
      }
    });

    // Update all edges
    gm.getAllNodeIds().forEach(id => gm.updateEdgesForNode(id));
  }
}
