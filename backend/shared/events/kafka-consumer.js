const { Kafka } = require('kafkajs');

class KafkaConsumer {
  constructor(serviceName) {
    this.kafka = new Kafka({
      clientId: serviceName,
      brokers: process.env.KAFKA_BROKERS?.split(',') || ['localhost:9092'],
      retry: {
        initialRetryTime: 100,
        retries: 8
      }
    });

    this.consumer = this.kafka.consumer({ 
      groupId: `${serviceName}-group` 
    });
    this.handlers = new Map();
    this.isConnected = false;
  }

  async connect() {
    if (!this.isConnected) {
      await this.consumer.connect();
      this.isConnected = true;
      console.log(`✅ Kafka Consumer connected for ${this.consumer.groupId}`);
    }
  }

  async subscribe(topic, handler) {
    await this.connect();
    await this.consumer.subscribe({ topic, fromBeginning: true });
    this.handlers.set(topic, handler);
    console.log(`📥 Subscribed to topic: ${topic}`);
  }

  async run() {
    await this.consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const event = JSON.parse(message.value.toString());
          const handler = this.handlers.get(topic);

          if (handler) {
            console.log(`📨 Processing event: ${topic}`, {
              eventId: event.eventId,
              partition,
              offset: message.offset
            });

            await handler(event);
          } else {
            console.warn(`⚠️ No handler for topic: ${topic}`);
          }
        } catch (error) {
          console.error(`❌ Error processing message from ${topic}:`, error);
          // Në prodhim, duhet të dërgohet në Dead Letter Queue
        }
      }
    });
  }

  async disconnect() {
    if (this.isConnected) {
      await this.consumer.disconnect();
      this.isConnected = false;
      console.log('🔌 Kafka Consumer disconnected');
    }
  }
}

module.exports = KafkaConsumer;