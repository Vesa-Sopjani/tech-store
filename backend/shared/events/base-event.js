class BaseEvent {
  constructor(type, payload, metadata = {}) {
    this.eventId = this.generateId();
    this.eventType = type;
    this.timestamp = new Date().toISOString();
    this.payload = payload;
    this.metadata = {
      source: metadata.source || 'unknown',
      version: '1.0.0',
      correlationId: metadata.correlationId || this.generateId(),
      ...metadata
    };
  }

  generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  toJSON() {
    return {
      eventId: this.eventId,
      eventType: this.eventType,
      timestamp: this.timestamp,
      payload: this.payload,
      metadata: this.metadata
    };
  }
}

module.exports = BaseEvent;