// backend/services/user-service/cacheManager.js
class CacheManager {
  constructor() {
    this.cache = new Map();
    this.ttl = new Map();
    this.redisClient = null;
    this.useRedis = false;
  }

  async initialize() {
    // Try Redis first
    try {
      const redis = require('redis');
      this.redisClient = redis.createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        socket: { connectTimeout: 5000 }
      });

      this.redisClient.on('error', (err) => {
        console.log('⚠️ Redis connection failed, using memory cache');
        this.useRedis = false;
      });

      await this.redisClient.connect();
      this.useRedis = true;
      console.log('✅ Redis connected');
    } catch (error) {
      console.log('⚠️ Using memory cache (Redis not available)');
      this.useRedis = false;
    }
  }

  async set(key, value, ttl = 3600) {
    if (this.useRedis && this.redisClient) {
      try {
        await this.redisClient.setEx(key, ttl, JSON.stringify(value));
        return true;
      } catch (error) {
        console.log('Redis set failed, falling back to memory');
      }
    }

    this.cache.set(key, value);
    this.ttl.set(key, Date.now() + (ttl * 1000));
    return true;
  }

  async get(key) {
    if (this.useRedis && this.redisClient) {
      try {
        const cached = await this.redisClient.get(key);
        return cached ? JSON.parse(cached) : null;
      } catch (error) {
        console.log('Redis get failed, falling back to memory');
      }
    }

    const expiry = this.ttl.get(key);
    if (expiry && Date.now() > expiry) {
      this.cache.delete(key);
      this.ttl.delete(key);
      return null;
    }

    return this.cache.get(key) || null;
  }

  async del(key) {
    if (this.useRedis && this.redisClient) {
      try {
        await this.redisClient.del(key);
        return true;
      } catch (error) {
        console.log('Redis del failed, falling back to memory');
      }
    }

    this.cache.delete(key);
    this.ttl.delete(key);
    return true;
  }

  isRedisAvailable() {
    return this.useRedis;
  }
}

module.exports = CacheManager;