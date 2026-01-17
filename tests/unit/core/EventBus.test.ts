import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventBus } from '../../../src/renderer/core/EventBus';

describe('EventBus', () => {
  let eventBus: EventBus;

  beforeEach(() => {
    eventBus = new EventBus();
  });

  describe('on() and emit()', () => {
    it('should call callback when event is emitted', () => {
      const callback = vi.fn();
      eventBus.on('canvas:render', callback);

      eventBus.emit('canvas:render');

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should pass data to callback', () => {
      const callback = vi.fn();
      const data = { x: 100, y: 200 };
      eventBus.on('selection:changed', callback);

      eventBus.emit('selection:changed', data);

      expect(callback).toHaveBeenCalledWith(data);
    });

    it('should call multiple callbacks for same event', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      eventBus.on('tool:changed', callback1);
      eventBus.on('tool:changed', callback2);

      eventBus.emit('tool:changed', 'select');

      expect(callback1).toHaveBeenCalledWith('select');
      expect(callback2).toHaveBeenCalledWith('select');
    });

    it('should not call callback for different event', () => {
      const callback = vi.fn();
      eventBus.on('canvas:render', callback);

      eventBus.emit('tool:changed');

      expect(callback).not.toHaveBeenCalled();
    });

    it('should handle emit with no subscribers', () => {
      // Should not throw
      expect(() => eventBus.emit('canvas:render')).not.toThrow();
    });

    it('should call callback multiple times for multiple emits', () => {
      const callback = vi.fn();
      eventBus.on('canvas:render', callback);

      eventBus.emit('canvas:render');
      eventBus.emit('canvas:render');
      eventBus.emit('canvas:render');

      expect(callback).toHaveBeenCalledTimes(3);
    });
  });

  describe('off()', () => {
    it('should unsubscribe callback from event', () => {
      const callback = vi.fn();
      eventBus.on('canvas:render', callback);

      eventBus.off('canvas:render', callback);
      eventBus.emit('canvas:render');

      expect(callback).not.toHaveBeenCalled();
    });

    it('should only unsubscribe the specified callback', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      eventBus.on('tool:changed', callback1);
      eventBus.on('tool:changed', callback2);

      eventBus.off('tool:changed', callback1);
      eventBus.emit('tool:changed');

      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).toHaveBeenCalledTimes(1);
    });

    it('should handle off() for non-existent event', () => {
      const callback = vi.fn();
      // Should not throw
      expect(() => eventBus.off('canvas:render', callback)).not.toThrow();
    });

    it('should handle off() for non-subscribed callback', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      eventBus.on('canvas:render', callback1);

      // Should not throw
      expect(() => eventBus.off('canvas:render', callback2)).not.toThrow();

      // callback1 should still work
      eventBus.emit('canvas:render');
      expect(callback1).toHaveBeenCalled();
    });
  });

  describe('once()', () => {
    it('should call callback only once', () => {
      const callback = vi.fn();
      eventBus.once('canvas:render', callback);

      eventBus.emit('canvas:render');
      eventBus.emit('canvas:render');
      eventBus.emit('canvas:render');

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should pass data to once callback', () => {
      const callback = vi.fn();
      const data = { tool: 'select' };
      eventBus.once('tool:changed', callback);

      eventBus.emit('tool:changed', data);

      expect(callback).toHaveBeenCalledWith(data);
    });

    it('should work alongside regular on() subscriptions', () => {
      const onceCallback = vi.fn();
      const onCallback = vi.fn();
      eventBus.once('canvas:render', onceCallback);
      eventBus.on('canvas:render', onCallback);

      eventBus.emit('canvas:render');
      eventBus.emit('canvas:render');

      expect(onceCallback).toHaveBeenCalledTimes(1);
      expect(onCallback).toHaveBeenCalledTimes(2);
    });
  });

  describe('multiple events', () => {
    it('should handle multiple different events independently', () => {
      const renderCallback = vi.fn();
      const toolCallback = vi.fn();
      const selectionCallback = vi.fn();

      eventBus.on('canvas:render', renderCallback);
      eventBus.on('tool:changed', toolCallback);
      eventBus.on('selection:changed', selectionCallback);

      eventBus.emit('canvas:render');
      eventBus.emit('tool:changed', 'line');

      expect(renderCallback).toHaveBeenCalledTimes(1);
      expect(toolCallback).toHaveBeenCalledWith('line');
      expect(selectionCallback).not.toHaveBeenCalled();
    });

    it('should allow same callback for multiple events', () => {
      const callback = vi.fn();
      eventBus.on('canvas:render', callback);
      eventBus.on('shape:updated', callback);

      eventBus.emit('canvas:render');
      eventBus.emit('shape:updated');

      expect(callback).toHaveBeenCalledTimes(2);
    });
  });
});
