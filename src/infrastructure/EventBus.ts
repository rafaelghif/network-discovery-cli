import { EventEmitter } from 'events';
import { EventType, EventPayload, EventListener } from '../shared/types.js';

class EventBus {
  private emitter = new EventEmitter();

  publish(event: EventType, payload: EventPayload): void {
    this.emitter.emit(event, payload);
  }

  subscribe(event: EventType, listener: EventListener): void {
    this.emitter.on(event, listener);
  }
}

export const eventBus = new EventBus();