import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GraphManager, getGraphManager } from '../../../src/renderer/core/GraphManager';
import { Node } from '../../../src/renderer/shapes/Node';

describe('GraphManager', () => {
  let graphManager: GraphManager;

  beforeEach(() => {
    graphManager = new GraphManager();
  });

  describe('node registration', () => {
    it('should register a node', () => {
      graphManager.registerNode('node-1');

      expect(graphManager.hasNode('node-1')).toBe(true);
    });

    it('should not duplicate node registration', () => {
      graphManager.registerNode('node-1');
      graphManager.registerNode('node-1');

      expect(graphManager.getAllNodeIds()).toHaveLength(1);
    });

    it('should register multiple nodes', () => {
      graphManager.registerNode('node-1');
      graphManager.registerNode('node-2');
      graphManager.registerNode('node-3');

      expect(graphManager.getAllNodeIds()).toHaveLength(3);
      expect(graphManager.hasNode('node-1')).toBe(true);
      expect(graphManager.hasNode('node-2')).toBe(true);
      expect(graphManager.hasNode('node-3')).toBe(true);
    });

    it('should unregister a node', () => {
      graphManager.registerNode('node-1');
      graphManager.unregisterNode('node-1');

      expect(graphManager.hasNode('node-1')).toBe(false);
    });

    it('should return connected edge IDs when unregistering node', () => {
      graphManager.registerNode('node-1');
      graphManager.registerNode('node-2');
      graphManager.registerEdge('edge-1', 'node-1', 'node-2');
      graphManager.registerEdge('edge-2', 'node-1', 'node-2');

      const removedEdges = graphManager.unregisterNode('node-1');

      expect(removedEdges).toContain('edge-1');
      expect(removedEdges).toContain('edge-2');
    });

    it('should remove connected edges when unregistering node', () => {
      graphManager.registerNode('node-1');
      graphManager.registerNode('node-2');
      graphManager.registerEdge('edge-1', 'node-1', 'node-2');

      graphManager.unregisterNode('node-1');

      expect(graphManager.hasEdge('edge-1')).toBe(false);
    });

    it('should handle unregistering non-existent node', () => {
      const result = graphManager.unregisterNode('non-existent');

      expect(result).toEqual([]);
    });
  });

  describe('edge registration', () => {
    it('should register an edge', () => {
      graphManager.registerNode('node-1');
      graphManager.registerNode('node-2');
      graphManager.registerEdge('edge-1', 'node-1', 'node-2');

      expect(graphManager.hasEdge('edge-1')).toBe(true);
    });

    it('should auto-create nodes when registering edge', () => {
      graphManager.registerEdge('edge-1', 'node-1', 'node-2');

      expect(graphManager.hasNode('node-1')).toBe(true);
      expect(graphManager.hasNode('node-2')).toBe(true);
    });

    it('should register multiple edges', () => {
      graphManager.registerEdge('edge-1', 'node-1', 'node-2');
      graphManager.registerEdge('edge-2', 'node-2', 'node-3');

      expect(graphManager.getAllEdgeIds()).toHaveLength(2);
    });

    it('should store edge connection info', () => {
      graphManager.registerEdge('edge-1', 'node-1', 'node-2');

      const connection = graphManager.getEdgeConnection('edge-1');

      expect(connection).toEqual({ sourceId: 'node-1', targetId: 'node-2' });
    });

    it('should unregister an edge', () => {
      graphManager.registerEdge('edge-1', 'node-1', 'node-2');
      graphManager.unregisterEdge('edge-1');

      expect(graphManager.hasEdge('edge-1')).toBe(false);
    });

    it('should remove edge from node edge lists when unregistering', () => {
      graphManager.registerEdge('edge-1', 'node-1', 'node-2');
      graphManager.unregisterEdge('edge-1');

      expect(graphManager.getEdgeIdsForNode('node-1')).not.toContain('edge-1');
      expect(graphManager.getEdgeIdsForNode('node-2')).not.toContain('edge-1');
    });

    it('should handle unregistering non-existent edge', () => {
      // Should not throw
      graphManager.unregisterEdge('non-existent');

      expect(graphManager.hasEdge('non-existent')).toBe(false);
    });

    it('should handle self-loop edge', () => {
      graphManager.registerNode('node-1');
      graphManager.registerEdge('edge-1', 'node-1', 'node-1');

      expect(graphManager.hasEdge('edge-1')).toBe(true);

      const connection = graphManager.getEdgeConnection('edge-1');
      expect(connection?.sourceId).toBe('node-1');
      expect(connection?.targetId).toBe('node-1');
    });
  });

  describe('node-edge relationships', () => {
    it('should get edge IDs for a node', () => {
      graphManager.registerEdge('edge-1', 'node-1', 'node-2');
      graphManager.registerEdge('edge-2', 'node-1', 'node-3');
      graphManager.registerEdge('edge-3', 'node-2', 'node-3');

      const edges = graphManager.getEdgeIdsForNode('node-1');

      expect(edges).toContain('edge-1');
      expect(edges).toContain('edge-2');
      expect(edges).not.toContain('edge-3');
    });

    it('should return empty array for node with no edges', () => {
      graphManager.registerNode('node-1');

      const edges = graphManager.getEdgeIdsForNode('node-1');

      expect(edges).toEqual([]);
    });

    it('should return empty array for non-existent node', () => {
      const edges = graphManager.getEdgeIdsForNode('non-existent');

      expect(edges).toEqual([]);
    });

    it('should get edges between two nodes', () => {
      graphManager.registerEdge('edge-1', 'node-1', 'node-2');
      graphManager.registerEdge('edge-2', 'node-1', 'node-2');
      graphManager.registerEdge('edge-3', 'node-1', 'node-3');

      const edges = graphManager.getEdgeIdsBetween('node-1', 'node-2');

      expect(edges).toContain('edge-1');
      expect(edges).toContain('edge-2');
      expect(edges).not.toContain('edge-3');
    });

    it('should return empty array when no edges between nodes', () => {
      graphManager.registerNode('node-1');
      graphManager.registerNode('node-2');

      const edges = graphManager.getEdgeIdsBetween('node-1', 'node-2');

      expect(edges).toEqual([]);
    });
  });

  describe('parallel edge offset calculation', () => {
    it('should return 0 for first edge between nodes', () => {
      graphManager.registerNode('node-1');
      graphManager.registerNode('node-2');

      const offset = graphManager.calculateParallelOffset('node-1', 'node-2');

      expect(offset).toBe(0);
    });

    it('should return negative offset for second edge', () => {
      graphManager.registerEdge('edge-1', 'node-1', 'node-2');

      // count=1, sign = count % 2 === 0 ? 1 : -1 = -1, multiplier = ceil(2/2) = 1
      const offset = graphManager.calculateParallelOffset('node-1', 'node-2');

      expect(offset).toBe(-25);
    });

    it('should return positive offset for third edge', () => {
      graphManager.registerEdge('edge-1', 'node-1', 'node-2');
      graphManager.registerEdge('edge-2', 'node-1', 'node-2');

      // count=2, sign = 1, multiplier = ceil(3/2) = 2
      const offset = graphManager.calculateParallelOffset('node-1', 'node-2');

      expect(offset).toBe(50);
    });

    it('should alternate offsets for multiple parallel edges', () => {
      // Offset pattern: count=1 -> -25, count=2 -> +50, count=3 -> -50
      graphManager.registerEdge('edge-1', 'node-1', 'node-2');
      graphManager.registerEdge('edge-2', 'node-1', 'node-2');
      graphManager.registerEdge('edge-3', 'node-1', 'node-2');

      // count=3, sign = -1, multiplier = ceil(4/2) = 2
      const offset = graphManager.calculateParallelOffset('node-1', 'node-2');

      expect(offset).toBe(-50);  // 4th edge
    });

    it('should calculate offsets for all parallel edges', () => {
      graphManager.registerEdge('edge-1', 'node-1', 'node-2');
      graphManager.registerEdge('edge-2', 'node-1', 'node-2');
      graphManager.registerEdge('edge-3', 'node-1', 'node-2');

      const offsets = graphManager.calculateParallelOffsets('node-1', 'node-2');

      expect(offsets.get('edge-1')).toBe(0);
      expect(offsets.get('edge-2')).toBe(25);
      expect(offsets.get('edge-3')).toBe(-25);
    });

    it('should return offset 0 for single edge', () => {
      graphManager.registerEdge('edge-1', 'node-1', 'node-2');

      const offsets = graphManager.calculateParallelOffsets('node-1', 'node-2');

      expect(offsets.get('edge-1')).toBe(0);
    });
  });

  describe('self-loop angle calculation', () => {
    it('should return 0 for first self-loop', () => {
      graphManager.registerNode('node-1');

      const angle = graphManager.getNextSelfLoopAngle('node-1');

      expect(angle).toBe(0);
    });

    it('should return PI/2 for second self-loop', () => {
      graphManager.registerNode('node-1');
      graphManager.registerEdge('edge-1', 'node-1', 'node-1');

      const angle = graphManager.getNextSelfLoopAngle('node-1');

      expect(angle).toBe(Math.PI / 2);
    });

    it('should cycle through base angles', () => {
      graphManager.registerNode('node-1');

      // Add 4 self-loops
      graphManager.registerEdge('edge-1', 'node-1', 'node-1');
      graphManager.registerEdge('edge-2', 'node-1', 'node-1');
      graphManager.registerEdge('edge-3', 'node-1', 'node-1');
      graphManager.registerEdge('edge-4', 'node-1', 'node-1');

      // 5th self-loop should use subdivision angles
      const angle = graphManager.getNextSelfLoopAngle('node-1');

      expect(angle).toBe(Math.PI / 4);
    });

    it('should return 0 for non-existent node', () => {
      const angle = graphManager.getNextSelfLoopAngle('non-existent');

      expect(angle).toBe(0);
    });
  });

  describe('connection point calculation', () => {
    it('should calculate point on right side of circle', () => {
      const point = graphManager.calculateConnectionPoint(100, 100, 50, 50, 200, 100);

      expect(point.x).toBeCloseTo(150, 1);
      expect(point.y).toBeCloseTo(100, 1);
    });

    it('should calculate point on left side of circle', () => {
      const point = graphManager.calculateConnectionPoint(100, 100, 50, 50, 0, 100);

      expect(point.x).toBeCloseTo(50, 1);
      expect(point.y).toBeCloseTo(100, 1);
    });

    it('should calculate point on top of circle', () => {
      const point = graphManager.calculateConnectionPoint(100, 100, 50, 50, 100, 0);

      expect(point.x).toBeCloseTo(100, 1);
      expect(point.y).toBeCloseTo(50, 1);
    });

    it('should calculate point on bottom of circle', () => {
      const point = graphManager.calculateConnectionPoint(100, 100, 50, 50, 100, 200);

      expect(point.x).toBeCloseTo(100, 1);
      expect(point.y).toBeCloseTo(150, 1);
    });

    it('should calculate point on ellipse', () => {
      // Ellipse with rx=100, ry=50
      const point = graphManager.calculateConnectionPoint(100, 100, 100, 50, 200, 100);

      expect(point.x).toBeCloseTo(200, 1);  // 100 + 100
      expect(point.y).toBeCloseTo(100, 1);
    });

    it('should calculate diagonal point on ellipse', () => {
      const point = graphManager.calculateConnectionPoint(0, 0, 100, 50, 100, 100);

      // At 45 degrees, x = 100*cos(45) ≈ 70.7, y = 50*sin(45) ≈ 35.4
      expect(point.x).toBeCloseTo(70.7, 0);
      expect(point.y).toBeCloseTo(35.4, 0);
    });
  });

  describe('node shape management', () => {
    it('should set and get node shape', () => {
      const mockNode = { id: 'node-1' } as Node;
      graphManager.setNodeShape('node-1', mockNode);

      const result = graphManager.getNodeShape('node-1');

      expect(result).toBe(mockNode);
    });

    it('should return null for non-existent node shape', () => {
      const result = graphManager.getNodeShape('non-existent');

      expect(result).toBeNull();
    });

    it('should remove node shape', () => {
      const mockNode = { id: 'node-1' } as Node;
      graphManager.setNodeShape('node-1', mockNode);
      graphManager.removeNodeShape('node-1');

      const result = graphManager.getNodeShape('node-1');

      expect(result).toBeNull();
    });

    it('should remove node shape when unregistering node', () => {
      const mockNode = { id: 'node-1' } as Node;
      graphManager.registerNode('node-1');
      graphManager.setNodeShape('node-1', mockNode);
      graphManager.unregisterNode('node-1');

      const result = graphManager.getNodeShape('node-1');

      expect(result).toBeNull();
    });
  });

  describe('edge update callback', () => {
    it('should call update callback for node edges', () => {
      const updateCallback = vi.fn();
      graphManager.setUpdateEdgeCallback(updateCallback);

      graphManager.registerEdge('edge-1', 'node-1', 'node-2');
      graphManager.registerEdge('edge-2', 'node-1', 'node-3');

      graphManager.updateEdgesForNode('node-1');

      expect(updateCallback).toHaveBeenCalledWith('edge-1');
      expect(updateCallback).toHaveBeenCalledWith('edge-2');
      expect(updateCallback).toHaveBeenCalledTimes(2);
    });

    it('should not throw when no callback set', () => {
      graphManager.registerEdge('edge-1', 'node-1', 'node-2');

      // Should not throw
      graphManager.updateEdgesForNode('node-1');
    });
  });

  describe('clear', () => {
    it('should clear all nodes and edges', () => {
      graphManager.registerEdge('edge-1', 'node-1', 'node-2');
      graphManager.registerEdge('edge-2', 'node-2', 'node-3');
      graphManager.setNodeShape('node-1', { id: 'node-1' } as Node);

      graphManager.clear();

      expect(graphManager.getAllNodeIds()).toHaveLength(0);
      expect(graphManager.getAllEdgeIds()).toHaveLength(0);
      expect(graphManager.getNodeShape('node-1')).toBeNull();
    });
  });

  describe('getAllNodeIds and getAllEdgeIds', () => {
    it('should return all node IDs', () => {
      graphManager.registerNode('node-1');
      graphManager.registerNode('node-2');
      graphManager.registerNode('node-3');

      const nodeIds = graphManager.getAllNodeIds();

      expect(nodeIds).toContain('node-1');
      expect(nodeIds).toContain('node-2');
      expect(nodeIds).toContain('node-3');
      expect(nodeIds).toHaveLength(3);
    });

    it('should return all edge IDs', () => {
      graphManager.registerEdge('edge-1', 'node-1', 'node-2');
      graphManager.registerEdge('edge-2', 'node-2', 'node-3');

      const edgeIds = graphManager.getAllEdgeIds();

      expect(edgeIds).toContain('edge-1');
      expect(edgeIds).toContain('edge-2');
      expect(edgeIds).toHaveLength(2);
    });

    it('should return empty arrays when no data', () => {
      expect(graphManager.getAllNodeIds()).toEqual([]);
      expect(graphManager.getAllEdgeIds()).toEqual([]);
    });
  });

  describe('singleton', () => {
    it('should return same instance from getGraphManager', () => {
      const instance1 = getGraphManager();
      const instance2 = getGraphManager();

      expect(instance1).toBe(instance2);
    });
  });
});
