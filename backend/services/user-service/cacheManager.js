const redis = require('redis');

class CacheManager {
  constructor() {
    this.cache = new Map();
    this.ttl = new Map();
    this.redisClient = null;
    this.useRedis = false;
  }

  async initialize() {
    // Skip Redis if explicitly disabled
    if (process.env.REDIS_ENABLED === 'false') {
      console.log('ℹ️ Redis disabled via environment variable');
      this.useRedis = false;
      return;
    }

    // Try Redis with timeout and limited retries
    try {
      console.log('🔄 Attempting Redis connection...');
     
      this.redisClient = redis.createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        socket: {
          connectTimeout: 2000,  // Only wait 2 seconds
          reconnectStrategy: (retries) => {
            // Stop after 2 retries
            if (retries >= 2) {
              console.log('❌ Redis connection failed after maximum retries');
              this.useRedis = false;
              return false; // Stop retrying
            }
            console.log(`⚠️ Redis retry ${retries + 1}/2`);
            return 1000; // Wait 1 second
          }
        }
      });

      // Add error handler
      this.redisClient.on('error', (err) => {
        console.log(`⚠️ Redis error: ${err.message}`);
      });

      // Connect with timeout
      await Promise.race([
        this.redisClient.connect(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Redis connection timeout after 3 seconds')), 3000)
        )
      ]);
     
      this.useRedis = true;
      console.log('✅ Redis connected successfully');
     
    } catch (error) {
      console.log(`⚠️ Using memory cache: ${error.message}`);
      this.useRedis = false;
      this.redisClient = null; // Make sure client is null
    }
  }

  async set(key, value, ttl = 3600) {
    if (this.useRedis && this.redisClient) {
      try {
        await this.redisClient.setEx(key, ttl, JSON.stringify(value));
        return true;
      } catch (error) {
        console.log('Redis set failed, falling back to memory');
        this.useRedis = false; // Disable Redis for next operations
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
        this.useRedis = false;
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
        this.useRedis = false;
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