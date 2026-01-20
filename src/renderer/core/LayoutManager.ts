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
   * @param padding Padding from canvas edges (default: 50)
   */
  static applyLayout(layoutType: LayoutType, canvasWidth: number, canvasHeight: number, padding: number = 50): void {
    const gm = getGraphManager();
    const nodeIds = gm.getAllNodeIds();
    const edgeIds = gm.getAllEdgeIds();

    // No nodes to layout
    if (nodeIds.length === 0) return;

    // Build cytoscape elements (filter out any with missing shapes)
    const cyNodes = nodeIds
      .map(id => {
        const node = gm.getNodeShape(id);
        if (!node) return null;
        return {
          data: { id, width: node.rx * 2, height: node.ry * 2 },
          position: { x: node.cx, y: node.cy }
        };
      })
      .filter((n): n is NonNullable<typeof n> => n !== null);

    const cyEdges = edgeIds
      .map(id => {
        const conn = gm.getEdgeConnection(id);
        if (!conn) return null;
        return {
          data: { id, source: conn.sourceId, target: conn.targetId }
        };
      })
      .filter((e): e is NonNullable<typeof e> => e !== null);

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
    this.centerOnCanvas(nodeIds, canvasWidth, canvasHeight, padding);

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
  private static centerOnCanvas(nodeIds: string[], canvasWidth: number, canvasHeight: number, padding: number): void {
    const gm = getGraphManager();

    if (nodeIds.length === 0) return;

    // Calculate bounding box of node CENTERS (not including radii)
    let minCX = Infinity, minCY = Infinity;
    let maxCX = -Infinity, maxCY = -Infinity;
    let maxRX = 0, maxRY = 0;

    nodeIds.forEach(id => {
      const node = gm.getNodeShape(id);
      if (node) {
        minCX = Math.min(minCX, node.cx);
        minCY = Math.min(minCY, node.cy);
        maxCX = Math.max(maxCX, node.cx);
        maxCY = Math.max(maxCY, node.cy);
        maxRX = Math.max(maxRX, node.rx);
        maxRY = Math.max(maxRY, node.ry);
      }
    });

    // Calculate current bounds dimensions (centers only)
    const centersWidth = maxCX - minCX;
    const centersHeight = maxCY - minCY;

    // DEBUG: Log centering calculations
    // Calculate canvas center
    const canvasCenterX = canvasWidth / 2;
    const canvasCenterY = canvasHeight / 2;

    // Skip if bounds are zero (single node or identical positions)
    if (centersWidth <= 0 && centersHeight <= 0) {
      // Just center a single node
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

    // Target area: canvas minus padding and node radii
    const targetWidth = canvasWidth - padding * 2 - maxRX * 2;
    const targetHeight = canvasHeight - padding * 2 - maxRY * 2;

    // Calculate scale factor to fit node centers into target area
    const scaleX = centersWidth > 0 ? targetWidth / centersWidth : 1;
    const scaleY = centersHeight > 0 ? targetHeight / centersHeight : 1;
    const scale = Math.min(scaleX, scaleY); // Use full canvas area

    // Calculate center of centers bounding box
    const centersCenterX = (minCX + maxCX) / 2;
    const centersCenterY = (minCY + maxCY) / 2;

    // Apply scale and center to all nodes
    nodeIds.forEach(id => {
      const node = gm.getNodeShape(id);
      if (node) {
        // Scale relative to centers center, then translate to canvas center
        const relX = node.cx - centersCenterX;
        const relY = node.cy - centersCenterY;
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
