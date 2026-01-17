import { describe, it, expect } from 'vitest';
import { NodeLabelChangeCommand } from '../../../../src/renderer/commands/NodeLabelChangeCommand';
import { createTestNode } from '../../../utils/mock-factories';
import { expectClose } from '../../../utils/shape-comparators';

describe('NodeLabelChangeCommand', () => {
  describe('execute()', () => {
    it('should change node label', () => {
      const node = createTestNode({ label: 'A' });
      const command = new NodeLabelChangeCommand(node, { label: 'NewLabel' });

      command.execute();

      expect(node.label).toBe('NewLabel');
    });

    it('should change node fontSize', () => {
      const node = createTestNode({ fontSize: 14 });
      const command = new NodeLabelChangeCommand(node, { fontSize: 20 });

      command.execute();

      expect(node.fontSize).toBe(20);
    });

    it('should change node rx', () => {
      const node = createTestNode({ rx: 30 });
      const command = new NodeLabelChangeCommand(node, { rx: 50 });

      command.execute();

      expectClose(node.rx, 50);
    });

    it('should change node ry', () => {
      const node = createTestNode({ ry: 30 });
      const command = new NodeLabelChangeCommand(node, { ry: 40 });

      command.execute();

      expectClose(node.ry, 40);
    });

    it('should change multiple properties', () => {
      const node = createTestNode({ label: 'A', fontSize: 14, rx: 30, ry: 30 });
      const command = new NodeLabelChangeCommand(node, {
        label: 'B',
        fontSize: 18,
        rx: 40,
        ry: 35
      });

      command.execute();

      expect(node.label).toBe('B');
      expect(node.fontSize).toBe(18);
      expectClose(node.rx, 40);
      expectClose(node.ry, 35);
    });

    it('should preserve unchanged properties', () => {
      const node = createTestNode({ label: 'A', fontSize: 14, rx: 30, ry: 30 });
      const command = new NodeLabelChangeCommand(node, { label: 'B' });

      command.execute();

      expect(node.label).toBe('B');
      expect(node.fontSize).toBe(14);
      expectClose(node.rx, 30);
      expectClose(node.ry, 30);
    });

    it('should handle empty label', () => {
      const node = createTestNode({ label: 'A' });
      const command = new NodeLabelChangeCommand(node, { label: '' });

      command.execute();

      expect(node.label).toBe('');
    });
  });

  describe('undo()', () => {
    it('should restore original label', () => {
      const node = createTestNode({ label: 'Original' });
      const command = new NodeLabelChangeCommand(node, { label: 'Updated' });

      command.execute();
      command.undo();

      expect(node.label).toBe('Original');
    });

    it('should restore original fontSize', () => {
      const node = createTestNode({ fontSize: 14 });
      const command = new NodeLabelChangeCommand(node, { fontSize: 20 });

      command.execute();
      command.undo();

      expect(node.fontSize).toBe(14);
    });

    it('should restore original rx and ry', () => {
      const node = createTestNode({ rx: 30, ry: 30 });
      const command = new NodeLabelChangeCommand(node, { rx: 50, ry: 40 });

      command.execute();
      command.undo();

      expectClose(node.rx, 30);
      expectClose(node.ry, 30);
    });

    it('should restore all properties', () => {
      const node = createTestNode({ label: 'A', fontSize: 14, rx: 30, ry: 30 });
      const command = new NodeLabelChangeCommand(node, {
        label: 'B',
        fontSize: 18,
        rx: 40,
        ry: 35
      });

      command.execute();
      command.undo();

      expect(node.label).toBe('A');
      expect(node.fontSize).toBe(14);
      expectClose(node.rx, 30);
      expectClose(node.ry, 30);
    });
  });

  describe('execute() after undo()', () => {
    it('should re-apply changes (redo behavior)', () => {
      const node = createTestNode({ label: 'A', fontSize: 14 });
      const command = new NodeLabelChangeCommand(node, { label: 'B', fontSize: 20 });

      command.execute();
      command.undo();
      command.execute();

      expect(node.label).toBe('B');
      expect(node.fontSize).toBe(20);
    });

    it('should handle multiple undo/redo cycles', () => {
      const node = createTestNode({ label: 'A' });
      const command = new NodeLabelChangeCommand(node, { label: 'B' });

      command.execute();
      expect(node.label).toBe('B');

      command.undo();
      expect(node.label).toBe('A');

      command.execute();
      expect(node.label).toBe('B');

      command.undo();
      expect(node.label).toBe('A');
    });
  });

  describe('getDescription()', () => {
    it('should include current node label in description', () => {
      const node = createTestNode({ label: 'TestNode' });
      const command = new NodeLabelChangeCommand(node, { label: 'NewName' });

      // Description uses current label before execution
      expect(command.getDescription()).toBe('Change node "TestNode" properties');
    });

    it('should reflect updated label after execution', () => {
      const node = createTestNode({ label: 'OldName' });
      const command = new NodeLabelChangeCommand(node, { label: 'NewName' });

      command.execute();

      // Now description uses updated label
      expect(command.getDescription()).toBe('Change node "NewName" properties');
    });
  });
});
