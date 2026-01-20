import { Point } from '../../shared/types';
import { Node } from '../shapes/Node';

/**
 * GraphManager - Manages relationships between graph nodes and edges
 *
 * This class maintains the graph structure and handles:
 * - Node-edge relationship tracking
 * - Edge updates when nodes move
 * - Parallel edge offset calculations
 * - Self-loop positioning
 */
export class GraphManager {
  // Maps nodeId -> Set of connected edgeIds
  private nodeEdges: Map<string, Set<string>> = new Map();

  // Maps edgeId -> { sourceId, targetId }
  private edgeConnections: Map<string, { sourceId: string; targetId: string }> = new Map();

  // Maps nodeId -> Node shape reference
  private nodeShapes: Map<string, Node> = new Map();

  // Callback to update edge shapes
  private updateEdgeCallback: ((edgeId: string) => void) | null = null;

  /**
   * Set callback for updating edge shapes
   */
  setUpdateEdgeCallback(callback: (edgeId: string) => void): void {
    this.updateEdgeCallback = callback;
  }

  /**
   * Register a node shape reference
   */
  setNodeShape(nodeId: string, node: Node): void {
    this.nodeShapes.set(nodeId, node);
  }

  /**
   * Get a node shape by ID
   */
  getNodeShape(nodeId: string): Node | null {
    return this.nodeShapes.get(nodeId) || null;
  }

  /**
   * Remove a node shape reference
   */
  removeNodeShape(nodeId: string): void {
    this.nodeShapes.delete(nodeId);
  }

  /**
   * Register a node in the graph
   */
  registerNode(nodeId: string): void {
    if (!this.nodeEdges.has(nodeId)) {
      this.nodeEdges.set(nodeId, new Set());
    }
  }

  /**
   * Unregister a node from the graph
   * Returns the set of edge IDs that were connected to this node
   */
  unregisterNode(nodeId: string): string[] {
    const connectedEdges = this.nodeEdges.get(nodeId);
    const edgeIds: string[] = [];

    if (connectedEdges) {
      connectedEdges.forEach(edgeId => {
        edgeIds.push(edgeId);
        this.edgeConnections.delete(edgeId);
      });
      this.nodeEdges.delete(nodeId);
    }

    // Also remove this node from other nodes' edge lists
    this.nodeEdges.forEach((edges, _nodeId) => {
      edgeIds.forEach(edgeId => edges.delete(edgeId));
    });

    // Remove node shape reference
    this.nodeShapes.delete(nodeId);

    return edgeIds;
  }

  /**
   * Register an edge in the graph
   */
  registerEdge(edgeId: string, sourceId: string, targetId: string): void {
    // Store the connection
    this.edgeConnections.set(edgeId, { sourceId, targetId });

    // Add to source node's edge list
    if (!this.nodeEdges.has(sourceId)) {
      this.nodeEdges.set(sourceId, new Set());
    }
    this.nodeEdges.get(sourceId)!.add(edgeId);

    // Add to target node's edge list (if different from source)
    if (sourceId !== targetId) {
      if (!this.nodeEdges.has(targetId)) {
        this.nodeEdges.set(targetId, new Set());
      }
      this.nodeEdges.get(targetId)!.add(edgeId);
    }
  }

  /**
   * Unregister an edge from the graph
   */
  unregisterEdge(edgeId: string): void {
    const connection = this.edgeConnections.get(edgeId);
    if (connection) {
      // Remove from source node's edge list
      const sourceEdges = this.nodeEdges.get(connection.sourceId);
      if (sourceEdges) {
        sourceEdges.delete(edgeId);
      }

      // Remove from target node's edge list
      const targetEdges = this.nodeEdges.get(connection.targetId);
      if (targetEdges) {
        targetEdges.delete(edgeId);
      }

      this.edgeConnections.delete(edgeId);
    }
  }

  /**
   * Get all edge IDs connected to a node
   */
  getEdgeIdsForNode(nodeId: string): string[] {
    const edges = this.nodeEdges.get(nodeId);
    return edges ? Array.from(edges) : [];
  }

  /**
   * Get the connection info for an edge
   */
  getEdgeConnection(edgeId: string): { sourceId: string; targetId: string } | null {
    return this.edgeConnections.get(edgeId) || null;
  }

  /**
   * Get all edges between two nodes (for parallel edge detection)
   */
  getEdgeIdsBetween(nodeId1: string, nodeId2: string): string[] {
    const edges1 = this.nodeEdges.get(nodeId1);
    const edges2 = this.nodeEdges.get(nodeId2);

    if (!edges1 || !edges2) return [];

    const result: string[] = [];
    edges1.forEach(edgeId => {
      if (edges2.has(edgeId)) {
        result.push(edgeId);
      }
    });

    return result;
  }

  /**
   * Calculate the offset for a new edge being created between two nodes
   * This is used when creating a new edge to determine its curve offset
   */
  calculateParallelOffset(sourceId: string, targetId: string): number {
    const existingEdges = this.getEdgeIdsBetween(sourceId, targetId);
    const count = existingEdges.length;

    if (count === 0) return 0;

    // Calculate offset: +25, -25, +50, -50, ...
    const step = 25;
    const multiplier = Math.ceil((count + 1) / 2);
    const sign = count % 2 === 0 ? 1 : -1;

    return sign * multiplier * step;
  }

  /**
   * Update all edges connected to a node (called when node moves)
   */
  updateEdgesForNode(nodeId: string): void {
    const edgeIds = this.getEdgeIdsForNode(nodeId);

    edgeIds.forEach(edgeId => {
      if (this.updateEdgeCallback) {
        this.updateEdgeCallback(edgeId);
      }
    });
  }

  /**
   * Calculate curve offsets for parallel edges between two nodes
   * Returns a map of edgeId -> offset value
   */
  calculateParallelOffsets(sourceId: string, targetId: string): Map<string, number> {
    const edgeIds = this.getEdgeIdsBetween(sourceId, targetId);
    const offsets = new Map<string, number>();

    if (edgeIds.length <= 1) {
      // Single edge or no edges - no offset needed
      edgeIds.forEach(id => offsets.set(id, 0));
      return offsets;
    }

    // Calculate offsets: 0, +25, -25, +50, -50, ...
    const step = 25;
    let currentOffset = 0;
    let sign = 1;
    let multiplier = 0;

    edgeIds.forEach((edgeId, index) => {
      if (index === 0) {
        offsets.set(edgeId, 0);
      } else {
        multiplier = Math.ceil(index / 2);
        sign = index % 2 === 1 ? 1 : -1;
        currentOffset = sign * multiplier * step;
        offsets.set(edgeId, currentOffset);
      }
    });

    return offsets;
  }

  /**
   * Get the next available angle for a self-loop on a node
   * Self-loops are positioned at different angles around the node
   */
  getNextSelfLoopAngle(nodeId: string): number {
    const edges = this.nodeEdges.get(nodeId);
    if (!edges) return 0;

    // Count existing self-loops
    let selfLoopCount = 0;
    edges.forEach(edgeId => {
      const connection = this.edgeConnections.get(edgeId);
      if (connection && connection.sourceId === connection.targetId) {
        selfLoopCount++;
      }
    });

    // Position self-loops at different angles: 0, PI/2, PI, 3*PI/2, ...
    // Then subdivide: PI/4, 3*PI/4, 5*PI/4, 7*PI/4, ...
    const baseAngles = [0, Math.PI / 2, Math.PI, 3 * Math.PI / 2];
    const subdivisionAngles = [Math.PI / 4, 3 * Math.PI / 4, 5 * Math.PI / 4, 7 * Math.PI / 4];

    if (selfLoopCount < baseAngles.length) {
      return baseAngles[selfLoopCount];
    } else if (selfLoopCount < baseAngles.length + subdivisionAngles.length) {
      return subdivisionAngles[selfLoopCount - baseAngles.length];
    } else {
      // Fallback for many self-loops
      return (selfLoopCount * Math.PI / 6) % (2 * Math.PI);
    }
  }

  /**
   * Check if a node exists in the graph
   */
  hasNode(nodeId: string): boolean {
    return this.nodeEdges.has(nodeId);
  }

  /**
   * Check if an edge exists in the graph
   */
  hasEdge(edgeId: string): boolean {
    return this.edgeConnections.has(edgeId);
  }

  /**
   * Get all registered node IDs
   */
  getAllNodeIds(): string[] {
    return Array.from(this.nodeEdges.keys());
  }

  /**
   * Get all registered edge IDs
   */
  getAllEdgeIds(): string[] {
    return Array.from(this.edgeConnections.keys());
  }

  /**
   * Clear all graph data
   */
  clear(): void {
    this.nodeEdges.clear();
    this.edgeConnections.clear();
    this.nodeShapes.clear();
  }

  /**
   * Calculate the connection point on a node's boundary for an edge
   * @param nodeCx Node center X
   * @param nodeCy Node center Y
   * @param nodeRx Node radius X
   * @param nodeRy Node radius Y
   * @param targetX Target point X (where the edge is going)
   * @param targetY Target point Y (where the edge is going)
   * @returns The point on the ellipse boundary
   */
  calculateConnectionPoint(
    nodeCx: number,
    nodeCy: number,
    nodeRx: number,
    nodeRy: number,
    targetX: number,
    targetY: number
  ): Point {
    // Calculate angle from node center to target
    const dx = targetX - nodeCx;
    const dy = targetY - nodeCy;
    const angle = Math.atan2(dy, dx);

    // Calculate point on ellipse at this angle
    return {
      x: nodeCx + nodeRx * Math.cos(angle),
      y: nodeCy + nodeRy * Math.sin(angle)
    };
  }
}

// Singleton instance
let graphManagerInstance: GraphManager | null = null;

/**
 * Get the singleton GraphManager instance
 */
export function getGraphManager(): GraphManager {
  if (!graphManagerInstance) {
    graphManagerInstance = new GraphManager();
  }
  return graphManagerInstance;
}
