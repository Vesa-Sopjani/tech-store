const { Kafka } = require('kafkajs');
const BaseEvent = require('./base-event');

class KafkaProducer {
  constructor() {
    this.kafka = new Kafka({
      clientId: process.env.KAFKA_CLIENT_ID || 'tech-store-app',
      brokers: process.env.KAFKA_BROKERS?.split(',') || ['localhost:9092'],
      retry: {
        initialRetryTime: 100,
        retries: 8
      }
    });

    this.producer = this.kafka.producer();
    this.isConnected = false;
  }

  async connect() {
    if (!this.isConnected) {
      await this.producer.connect();
      this.isConnected = true;
      console.log('✅ Kafka Producer connected');
    }
  }

  async publish(event) {
    try {
      await this.connect();
      
      await this.producer.send({
        topic: event.eventType,
        messages: [
          {
            key: event.metadata.correlationId,
            value: JSON.stringify(event.toJSON()),
            headers: {
              'event-type': event.eventType,
              'timestamp': event.timestamp,
              'source': event.metadata.source
            }
          }
        ]
      });

      console.log(`📤 Event published: ${event.eventType}`, {
        eventId: event.eventId,
        correlationId: event.metadata.correlationId
      });

      return true;
    } catch (error) {
      console.error('❌ Failed to publish event:', error);
      throw error;
    }
  }

  async disconnect() {
    if (this.isConnected) {
      await this.producer.disconnect();
      this.isConnected = false;
      console.log('🔌 Kafka Producer disconnected');
    }
  }
}

module.exports = KafkaProducer;