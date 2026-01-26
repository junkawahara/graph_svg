import { describe, it, expect } from 'vitest';
import { NodeLabelPlacementCommand } from '../../../../src/renderer/commands/NodeLabelPlacementCommand';
import { createTestNode } from '../../../utils/mock-factories';
import { NodeLabelPlacement, DEFAULT_NODE_LABEL_PLACEMENT } from '../../../../src/shared/types';

describe('NodeLabelPlacementCommand', () => {
  describe('execute()', () => {
    it('should change node label position to "above"', () => {
      const node = createTestNode({ label: 'A' });
      node.labelPlacement = { ...DEFAULT_NODE_LABEL_PLACEMENT };

      const newPlacement: NodeLabelPlacement = { position: 'above', distance: 5 };
      const command = new NodeLabelPlacementCommand(node, newPlacement);

      command.execute();

      expect(node.labelPlacement.position).toBe('above');
      expect(node.labelPlacement.distance).toBe(5);
    });

    it('should change node label position to "below"', () => {
      const node = createTestNode({ label: 'A' });
      node.labelPlacement = { position: 'center', distance: 0 };

      const newPlacement: NodeLabelPlacement = { position: 'below', distance: 10 };
      const command = new NodeLabelPlacementCommand(node, newPlacement);

      command.execute();

      expect(node.labelPlacement.position).toBe('below');
      expect(node.labelPlacement.distance).toBe(10);
    });

    it('should change node label position to "left"', () => {
      const node = createTestNode({ label: 'A' });
      node.labelPlacement = { position: 'center', distance: 0 };

      const newPlacement: NodeLabelPlacement = { position: 'left', distance: 8 };
      const command = new NodeLabelPlacementCommand(node, newPlacement);

      command.execute();

      expect(node.labelPlacement.position).toBe('left');
      expect(node.labelPlacement.distance).toBe(8);
    });

    it('should change node label position to "right"', () => {
      const node = createTestNode({ label: 'A' });
      node.labelPlacement = { position: 'center', distance: 0 };

      const newPlacement: NodeLabelPlacement = { position: 'right', distance: 12 };
      const command = new NodeLabelPlacementCommand(node, newPlacement);

      command.execute();

      expect(node.labelPlacement.position).toBe('right');
      expect(node.labelPlacement.distance).toBe(12);
    });

    it('should change node label position to diagonal direction', () => {
      const node = createTestNode({ label: 'A' });
      node.labelPlacement = { position: 'center', distance: 0 };

      const newPlacement: NodeLabelPlacement = { position: 'above left', distance: 5 };
      const command = new NodeLabelPlacementCommand(node, newPlacement);

      command.execute();

      expect(node.labelPlacement.position).toBe('above left');
    });

    it('should change node label position to numeric angle', () => {
      const node = createTestNode({ label: 'A' });
      node.labelPlacement = { position: 'center', distance: 0 };

      const newPlacement: NodeLabelPlacement = { position: 45, distance: 5 };
      const command = new NodeLabelPlacementCommand(node, newPlacement);

      command.execute();

      expect(node.labelPlacement.position).toBe(45);
    });

    it('should change label distance', () => {
      const node = createTestNode({ label: 'A' });
      node.labelPlacement = { position: 'above', distance: 5 };

      const newPlacement: NodeLabelPlacement = { position: 'above', distance: 20 };
      const command = new NodeLabelPlacementCommand(node, newPlacement);

      command.execute();

      expect(node.labelPlacement.distance).toBe(20);
    });
  });

  describe('undo()', () => {
    it('should restore original position', () => {
      const node = createTestNode({ label: 'A' });
      node.labelPlacement = { position: 'center', distance: 0 };

      const newPlacement: NodeLabelPlacement = { position: 'above', distance: 5 };
      const command = new NodeLabelPlacementCommand(node, newPlacement);

      command.execute();
      command.undo();

      expect(node.labelPlacement.position).toBe('center');
      expect(node.labelPlacement.distance).toBe(0);
    });

    it('should restore original distance', () => {
      const node = createTestNode({ label: 'A' });
      node.labelPlacement = { position: 'above', distance: 5 };

      const newPlacement: NodeLabelPlacement = { position: 'above', distance: 20 };
      const command = new NodeLabelPlacementCommand(node, newPlacement);

      command.execute();
      command.undo();

      expect(node.labelPlacement.distance).toBe(5);
    });

    it('should restore numeric angle position', () => {
      const node = createTestNode({ label: 'A' });
      node.labelPlacement = { position: 135, distance: 10 };

      const newPlacement: NodeLabelPlacement = { position: 'below', distance: 5 };
      const command = new NodeLabelPlacementCommand(node, newPlacement);

      command.execute();
      expect(node.labelPlacement.position).toBe('below');

      command.undo();
      expect(node.labelPlacement.position).toBe(135);
      expect(node.labelPlacement.distance).toBe(10);
    });
  });

  describe('execute() after undo()', () => {
    it('should re-apply changes (redo behavior)', () => {
      const node = createTestNode({ label: 'A' });
      node.labelPlacement = { position: 'center', distance: 0 };

      const newPlacement: NodeLabelPlacement = { position: 'above', distance: 5 };
      const command = new NodeLabelPlacementCommand(node, newPlacement);

      command.execute();
      command.undo();
      command.execute();

      expect(node.labelPlacement.position).toBe('above');
      expect(node.labelPlacement.distance).toBe(5);
    });

    it('should handle multiple undo/redo cycles', () => {
      const node = createTestNode({ label: 'A' });
      node.labelPlacement = { position: 'center', distance: 0 };

      const newPlacement: NodeLabelPlacement = { position: 'left', distance: 10 };
      const command = new NodeLabelPlacementCommand(node, newPlacement);

      command.execute();
      expect(node.labelPlacement.position).toBe('left');

      command.undo();
      expect(node.labelPlacement.position).toBe('center');

      command.execute();
      expect(node.labelPlacement.position).toBe('left');

      command.undo();
      expect(node.labelPlacement.position).toBe('center');
    });
  });

  describe('getDescription()', () => {
    it('should include node label in description', () => {
      const node = createTestNode({ label: 'TestNode' });
      node.labelPlacement = { position: 'center', distance: 0 };

      const newPlacement: NodeLabelPlacement = { position: 'above', distance: 5 };
      const command = new NodeLabelPlacementCommand(node, newPlacement);

      expect(command.getDescription()).toBe('Change node "TestNode" label placement');
    });

    it('should reflect current node label', () => {
      const node = createTestNode({ label: 'MyNode' });
      node.labelPlacement = { position: 'center', distance: 0 };

      const newPlacement: NodeLabelPlacement = { position: 'below', distance: 5 };
      const command = new NodeLabelPlacementCommand(node, newPlacement);

      expect(command.getDescription()).toContain('MyNode');
    });
  });

  describe('all position options', () => {
    const positions: Array<'auto' | 'center' | 'above' | 'below' | 'left' | 'right' | 'above left' | 'above right' | 'below left' | 'below right'> = [
      'auto', 'center', 'above', 'below', 'left', 'right',
      'above left', 'above right', 'below left', 'below right'
    ];

    positions.forEach(position => {
      it(`should handle "${position}" position`, () => {
        const node = createTestNode({ label: 'A' });
        node.labelPlacement = { position: 'center', distance: 0 };

        const newPlacement: NodeLabelPlacement = { position, distance: 5 };
        const command = new NodeLabelPlacementCommand(node, newPlacement);

        command.execute();
        expect(node.labelPlacement.position).toBe(position);

        command.undo();
        expect(node.labelPlacement.position).toBe('center');
      });
    });
  });

  describe('numeric angle positions', () => {
    const angles = [0, 45, 90, 135, 180, 225, 270, 315, 360];

    angles.forEach(angle => {
      it(`should handle angle ${angle}°`, () => {
        const node = createTestNode({ label: 'A' });
        node.labelPlacement = { position: 'center', distance: 0 };

        const newPlacement: NodeLabelPlacement = { position: angle, distance: 5 };
        const command = new NodeLabelPlacementCommand(node, newPlacement);

        command.execute();
        expect(node.labelPlacement.position).toBe(angle);

        command.undo();
        expect(node.labelPlacement.position).toBe('center');
      });
    });
  });
});
