import { EventName } from '../../shared/types';

type EventCallback = (data?: any) => void;

/**
 * Simple event bus for decoupled component communication
 */
export class EventBus {
  private listeners: Map<EventName, Set<EventCallback>> = new Map();

  /**
   * Subscribe to an event
   */
  on(event: EventName, callback: EventCallback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  /**
   * Unsubscribe from an event
   */
  off(event: EventName, callback: EventCallback): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.delete(callback);
    }
  }

  /**
   * Emit an event to all subscribers
   */
  emit(event: EventName, data?: any): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }

  /**
   * Subscribe to an event only once
   */
  once(event: EventName, callback: EventCallback): void {
    const wrapper = (data?: any) => {
      this.off(event, wrapper);
      callback(data);
    };
    this.on(event, wrapper);
  }
}

// Global event bus instance
export const eventBus = new EventBus();
