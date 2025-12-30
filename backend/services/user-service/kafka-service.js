// backend/services/user-service/kafka-service.js
const { Kafka } = require('kafkajs');
const avro = require('avsc');

class KafkaService {
  constructor() {
    this.kafka = null;
    this.producer = null;
    this.consumer = null;
    
    // Avro schema for user events
    this.userSchema = avro.Type.forSchema({
      type: 'record',
      name: 'UserEvent',
      fields: [
        { name: 'eventId', type: 'string' },
        { name: 'eventType', type: 'string' },
        { name: 'userId', type: ['null', 'int'], default: null },
        { name: 'email', type: 'string' },
        { name: 'username', type: ['null', 'string'], default: null },
        { name: 'timestamp', type: 'string' },
        { name: 'source', type: 'string', default: 'user-service' },
        { name: 'metadata', type: ['null', 'string'], default: null }
      ]
    });
    
    this.initialize();
  }

  initialize() {
    try {
      // Only initialize if Kafka is configured
      if (!process.env.KAFKA_BROKERS) {
        console.log('⚠️ Kafka not configured, running in simulation mode');
        return;
      }

      this.kafka = new Kafka({
        clientId: 'user-service',
        brokers: process.env.KAFKA_BROKERS.split(','),
        ssl: process.env.KAFKA_SSL === 'true',
        sasl: process.env.KAFKA_USERNAME ? {
          mechanism: 'plain',
          username: process.env.KAFKA_USERNAME,
          password: process.env.KAFKA_PASSWORD
        } : undefined
      });

      this.producer = this.kafka.producer();
      this.consumer = this.kafka.consumer({ groupId: 'user-service-group' });

      console.log('✅ Kafka service initialized');
    } catch (error) {
      console.warn('⚠️ Kafka initialization failed:', error.message);
    }
  }

  async publishUserRegistered(user, req) {
    try {
      if (!this.producer) {
        console.log('📨 [Mock] User registered:', user.email);
        return true;
      }

      await this.producer.connect();

      const eventData = {
        eventId: `user_${user.id}_${Date.now()}`,
        eventType: 'USER_REGISTERED',
        userId: user.id,
        email: user.email,
        username: user.username,
        timestamp: new Date().toISOString(),
        source: 'user-service',
        metadata: JSON.stringify({
          ip: req.ip,
          userAgent: req.headers['user-agent']
        })
      };

      const message = {
        value: this.userSchema.toBuffer(eventData),
        headers: {
          'event-type': 'USER_REGISTERED',
          'version': '1.0.0'
        }
      };

      await this.producer.send({
        topic: 'user-events',
        messages: [message]
      });

      console.log(`✅ UserRegistered event published: ${user.email}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to publish UserRegistered event:', error);
      return false;
    }
  }

  async publishEvent(topic, event) {
    try {
      if (!this.producer) {
        console.log(`📨 [Mock] Event to ${topic}: ${event.eventType}`);
        return true;
      }

      await this.producer.connect();
      
      await this.producer.send({
        topic: topic,
        messages: [{
          value: JSON.stringify(event),
          headers: {
            'event-type': event.eventType || 'UNKNOWN',
            'timestamp': new Date().toISOString()
          }
        }]
      });

      return true;
    } catch (error) {
      console.error(`❌ Failed to publish to ${topic}:`, error);
      return false;
    }
  }

  async publishUserLogin(user, req) {
    return this.publishEvent('user-logins', {
      eventType: 'USER_LOGIN',
      userId: user.id,
      username: user.username,
      email: user.email,
      timestamp: new Date().toISOString(),
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });
  }

  async sendToDLQ(topic, eventType, data, error) {
    try {
      if (!this.producer) {
        console.log(`📨 [Mock] DLQ event: ${eventType}`);
        return true;
      }

      await this.producer.connect();
      
      const dlqEvent = {
        eventType,
        originalData: data,
        error: error.message,
        timestamp: new Date().toISOString(),
        service: 'user-service'
      };

      await this.producer.send({
        topic: 'dead-letter-queue',
        messages: [{
          value: JSON.stringify(dlqEvent),
          headers: {
            'source-topic': topic,
            'error-type': error.name
          }
        }]
      });

      console.log(`✅ Event sent to DLQ: ${eventType}`);
      return true;
    } catch (dlqError) {
      console.error('❌ Failed to send to DLQ:', dlqError);
      return false;
    }
  }

  async startConsumer() {
    if (!this.consumer) {
      console.log('⚠️ Kafka consumer not available');
      return;
    }

    try {
      await this.consumer.connect();
      await this.consumer.subscribe({ topic: 'audit-logs', fromBeginning: false });
      
      await this.consumer.run({
        eachMessage: async ({ message }) => {
          console.log('📨 Received audit log:', message.value.toString());
        }
      });
    } catch (error) {
      console.error('❌ Failed to start consumer:', error);
    }
  }
}

module.exports = new KafkaService();