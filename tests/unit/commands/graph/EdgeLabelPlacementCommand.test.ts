import { describe, it, expect } from 'vitest';
import { EdgeLabelPlacementCommand } from '../../../../src/renderer/commands/EdgeLabelPlacementCommand';
import { createTestEdge, createTestNode } from '../../../utils/mock-factories';
import { EdgeLabelPlacement, DEFAULT_EDGE_LABEL_PLACEMENT } from '../../../../src/shared/types';
import { getGraphManager } from '../../../../src/renderer/core/GraphManager';

describe('EdgeLabelPlacementCommand', () => {
  // Helper to create edge with nodes registered in GraphManager
  function createEdgeWithNodes(label?: string): ReturnType<typeof createTestEdge> {
    const gm = getGraphManager();
    gm.clear();

    const node1 = createTestNode({ id: 'node-1', cx: 100, cy: 100 });
    const node2 = createTestNode({ id: 'node-2', cx: 200, cy: 100 });

    gm.registerNode(node1.id);
    gm.setNodeShape(node1.id, node1);
    gm.registerNode(node2.id);
    gm.setNodeShape(node2.id, node2);

    const edge = createTestEdge(node1.id, node2.id, { label });
    gm.registerEdge(edge.id, node1.id, node2.id);

    return edge;
  }

  describe('execute()', () => {
    it('should change edge label position to "near start"', () => {
      const edge = createEdgeWithNodes('weight');
      edge.labelPlacement = { ...DEFAULT_EDGE_LABEL_PLACEMENT };

      const newPlacement: EdgeLabelPlacement = {
        pos: 'near start',
        side: 'above',
        sloped: false,
        distance: 5
      };
      const command = new EdgeLabelPlacementCommand(edge, newPlacement);

      command.execute();

      expect(edge.labelPlacement.pos).toBe('near start');
    });

    it('should change edge label position to "near end"', () => {
      const edge = createEdgeWithNodes('weight');
      edge.labelPlacement = { ...DEFAULT_EDGE_LABEL_PLACEMENT };

      const newPlacement: EdgeLabelPlacement = {
        pos: 'near end',
        side: 'above',
        sloped: false,
        distance: 5
      };
      const command = new EdgeLabelPlacementCommand(edge, newPlacement);

      command.execute();

      expect(edge.labelPlacement.pos).toBe('near end');
    });

    it('should change edge label position to "midway"', () => {
      const edge = createEdgeWithNodes('weight');
      edge.labelPlacement = { pos: 'near start', side: 'above', sloped: false, distance: 5 };

      const newPlacement: EdgeLabelPlacement = {
        pos: 'midway',
        side: 'above',
        sloped: false,
        distance: 5
      };
      const command = new EdgeLabelPlacementCommand(edge, newPlacement);

      command.execute();

      expect(edge.labelPlacement.pos).toBe('midway');
    });

    it('should change edge label position to numeric value', () => {
      const edge = createEdgeWithNodes('weight');
      edge.labelPlacement = { ...DEFAULT_EDGE_LABEL_PLACEMENT };

      const newPlacement: EdgeLabelPlacement = {
        pos: 0.3,
        side: 'above',
        sloped: false,
        distance: 5
      };
      const command = new EdgeLabelPlacementCommand(edge, newPlacement);

      command.execute();

      expect(edge.labelPlacement.pos).toBe(0.3);
    });

    it('should change edge label side to "below"', () => {
      const edge = createEdgeWithNodes('weight');
      edge.labelPlacement = { pos: 'midway', side: 'above', sloped: false, distance: 5 };

      const newPlacement: EdgeLabelPlacement = {
        pos: 'midway',
        side: 'below',
        sloped: false,
        distance: 5
      };
      const command = new EdgeLabelPlacementCommand(edge, newPlacement);

      command.execute();

      expect(edge.labelPlacement.side).toBe('below');
    });

    it('should enable sloped option', () => {
      const edge = createEdgeWithNodes('weight');
      edge.labelPlacement = { pos: 'midway', side: 'above', sloped: false, distance: 5 };

      const newPlacement: EdgeLabelPlacement = {
        pos: 'midway',
        side: 'above',
        sloped: true,
        distance: 5
      };
      const command = new EdgeLabelPlacementCommand(edge, newPlacement);

      command.execute();

      expect(edge.labelPlacement.sloped).toBe(true);
    });

    it('should change distance', () => {
      const edge = createEdgeWithNodes('weight');
      edge.labelPlacement = { pos: 'midway', side: 'above', sloped: false, distance: 5 };

      const newPlacement: EdgeLabelPlacement = {
        pos: 'midway',
        side: 'above',
        sloped: false,
        distance: 15
      };
      const command = new EdgeLabelPlacementCommand(edge, newPlacement);

      command.execute();

      expect(edge.labelPlacement.distance).toBe(15);
    });

    it('should change multiple properties at once', () => {
      const edge = createEdgeWithNodes('weight');
      edge.labelPlacement = { pos: 'midway', side: 'above', sloped: false, distance: 5 };

      const newPlacement: EdgeLabelPlacement = {
        pos: 'near end',
        side: 'below',
        sloped: true,
        distance: 20
      };
      const command = new EdgeLabelPlacementCommand(edge, newPlacement);

      command.execute();

      expect(edge.labelPlacement.pos).toBe('near end');
      expect(edge.labelPlacement.side).toBe('below');
      expect(edge.labelPlacement.sloped).toBe(true);
      expect(edge.labelPlacement.distance).toBe(20);
    });
  });

  describe('undo()', () => {
    it('should restore original position', () => {
      const edge = createEdgeWithNodes('weight');
      edge.labelPlacement = { pos: 'midway', side: 'above', sloped: false, distance: 5 };

      const newPlacement: EdgeLabelPlacement = {
        pos: 'near start',
        side: 'above',
        sloped: false,
        distance: 5
      };
      const command = new EdgeLabelPlacementCommand(edge, newPlacement);

      command.execute();
      command.undo();

      expect(edge.labelPlacement.pos).toBe('midway');
    });

    it('should restore original side', () => {
      const edge = createEdgeWithNodes('weight');
      edge.labelPlacement = { pos: 'midway', side: 'above', sloped: false, distance: 5 };

      const newPlacement: EdgeLabelPlacement = {
        pos: 'midway',
        side: 'below',
        sloped: false,
        distance: 5
      };
      const command = new EdgeLabelPlacementCommand(edge, newPlacement);

      command.execute();
      command.undo();

      expect(edge.labelPlacement.side).toBe('above');
    });

    it('should restore original sloped setting', () => {
      const edge = createEdgeWithNodes('weight');
      edge.labelPlacement = { pos: 'midway', side: 'above', sloped: false, distance: 5 };

      const newPlacement: EdgeLabelPlacement = {
        pos: 'midway',
        side: 'above',
        sloped: true,
        distance: 5
      };
      const command = new EdgeLabelPlacementCommand(edge, newPlacement);

      command.execute();
      command.undo();

      expect(edge.labelPlacement.sloped).toBe(false);
    });

    it('should restore original distance', () => {
      const edge = createEdgeWithNodes('weight');
      edge.labelPlacement = { pos: 'midway', side: 'above', sloped: false, distance: 5 };

      const newPlacement: EdgeLabelPlacement = {
        pos: 'midway',
        side: 'above',
        sloped: false,
        distance: 20
      };
      const command = new EdgeLabelPlacementCommand(edge, newPlacement);

      command.execute();
      command.undo();

      expect(edge.labelPlacement.distance).toBe(5);
    });

    it('should restore all original properties', () => {
      const edge = createEdgeWithNodes('weight');
      edge.labelPlacement = { pos: 0.3, side: 'below', sloped: true, distance: 10 };

      const newPlacement: EdgeLabelPlacement = {
        pos: 'near end',
        side: 'above',
        sloped: false,
        distance: 20
      };
      const command = new EdgeLabelPlacementCommand(edge, newPlacement);

      command.execute();
      command.undo();

      expect(edge.labelPlacement.pos).toBe(0.3);
      expect(edge.labelPlacement.side).toBe('below');
      expect(edge.labelPlacement.sloped).toBe(true);
      expect(edge.labelPlacement.distance).toBe(10);
    });
  });

  describe('execute() after undo()', () => {
    it('should re-apply changes (redo behavior)', () => {
      const edge = createEdgeWithNodes('weight');
      edge.labelPlacement = { pos: 'midway', side: 'above', sloped: false, distance: 5 };

      const newPlacement: EdgeLabelPlacement = {
        pos: 'near start',
        side: 'below',
        sloped: true,
        distance: 15
      };
      const command = new EdgeLabelPlacementCommand(edge, newPlacement);

      command.execute();
      command.undo();
      command.execute();

      expect(edge.labelPlacement.pos).toBe('near start');
      expect(edge.labelPlacement.side).toBe('below');
      expect(edge.labelPlacement.sloped).toBe(true);
      expect(edge.labelPlacement.distance).toBe(15);
    });

    it('should handle multiple undo/redo cycles', () => {
      const edge = createEdgeWithNodes('weight');
      edge.labelPlacement = { pos: 'midway', side: 'above', sloped: false, distance: 5 };

      const newPlacement: EdgeLabelPlacement = {
        pos: 'near end',
        side: 'below',
        sloped: true,
        distance: 10
      };
      const command = new EdgeLabelPlacementCommand(edge, newPlacement);

      command.execute();
      expect(edge.labelPlacement.pos).toBe('near end');

      command.undo();
      expect(edge.labelPlacement.pos).toBe('midway');

      command.execute();
      expect(edge.labelPlacement.pos).toBe('near end');

      command.undo();
      expect(edge.labelPlacement.pos).toBe('midway');
    });
  });

  describe('getDescription()', () => {
    it('should return appropriate description', () => {
      const edge = createEdgeWithNodes('weight');
      edge.labelPlacement = { ...DEFAULT_EDGE_LABEL_PLACEMENT };

      const newPlacement: EdgeLabelPlacement = {
        pos: 'near start',
        side: 'above',
        sloped: false,
        distance: 5
      };
      const command = new EdgeLabelPlacementCommand(edge, newPlacement);

      expect(command.getDescription()).toBe('Change edge label placement');
    });
  });

  describe('all pos options', () => {
    const posOptions: Array<'auto' | 'midway' | 'near start' | 'near end'> = [
      'auto', 'midway', 'near start', 'near end'
    ];

    posOptions.forEach(pos => {
      it(`should handle "${pos}" position`, () => {
        const edge = createEdgeWithNodes('weight');
        edge.labelPlacement = { pos: 'midway', side: 'above', sloped: false, distance: 5 };

        const newPlacement: EdgeLabelPlacement = { pos, side: 'above', sloped: false, distance: 5 };
        const command = new EdgeLabelPlacementCommand(edge, newPlacement);

        command.execute();
        expect(edge.labelPlacement.pos).toBe(pos);

        command.undo();
        expect(edge.labelPlacement.pos).toBe('midway');
      });
    });
  });

  describe('numeric pos values', () => {
    const posValues = [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1];

    posValues.forEach(pos => {
      it(`should handle pos=${pos}`, () => {
        const edge = createEdgeWithNodes('weight');
        edge.labelPlacement = { pos: 'midway', side: 'above', sloped: false, distance: 5 };

        const newPlacement: EdgeLabelPlacement = { pos, side: 'above', sloped: false, distance: 5 };
        const command = new EdgeLabelPlacementCommand(edge, newPlacement);

        command.execute();
        expect(edge.labelPlacement.pos).toBe(pos);

        command.undo();
        expect(edge.labelPlacement.pos).toBe('midway');
      });
    });
  });

  describe('side options', () => {
    it('should toggle between above and below', () => {
      const edge = createEdgeWithNodes('weight');
      edge.labelPlacement = { pos: 'midway', side: 'above', sloped: false, distance: 5 };

      const command1 = new EdgeLabelPlacementCommand(edge, { pos: 'midway', side: 'below', sloped: false, distance: 5 });
      command1.execute();
      expect(edge.labelPlacement.side).toBe('below');

      const command2 = new EdgeLabelPlacementCommand(edge, { pos: 'midway', side: 'above', sloped: false, distance: 5 });
      command2.execute();
      expect(edge.labelPlacement.side).toBe('above');
    });
  });

  describe('sloped option', () => {
    it('should toggle sloped on and off', () => {
      const edge = createEdgeWithNodes('weight');
      edge.labelPlacement = { pos: 'midway', side: 'above', sloped: false, distance: 5 };

      const command1 = new EdgeLabelPlacementCommand(edge, { pos: 'midway', side: 'above', sloped: true, distance: 5 });
      command1.execute();
      expect(edge.labelPlacement.sloped).toBe(true);

      const command2 = new EdgeLabelPlacementCommand(edge, { pos: 'midway', side: 'above', sloped: false, distance: 5 });
      command2.execute();
      expect(edge.labelPlacement.sloped).toBe(false);
    });
  });
});
