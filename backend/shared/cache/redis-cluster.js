const Redis = require('ioredis');
const NodeCache = require('node-cache');

class RedisClusterManager {
    constructor() {
        this.cluster = new Redis.Cluster([
            { host: 'redis-node-1', port: 6379 },
            { host: 'redis-node-2', port: 6379 },
            { host: 'redis-node-3', port: 6379 }
        ], {
            scaleReads: 'slave',
            redisOptions: {
                password: process.env.REDIS_PASSWORD
            }
        });

        this.localCache = new NodeCache({ 
            stdTTL: 30, // 30 seconds local cache
            checkperiod: 60 
        });

        this.cluster.on('error', (err) => {
            console.error('Redis Cluster Error:', err);
        });
    }

    // Write-through cache pattern
    async writeThrough(key, data, ttl = 3600) {
        try {
            // 1. Write to database (simulated)
            await this.writeToDatabase(key, data);
            
            // 2. Write to Redis
            await this.cluster.setex(key, ttl, JSON.stringify(data));
            
            // 3. Update local cache
            this.localCache.set(key, data, ttl);
            
            return true;
        } catch (error) {
            console.error('Write-through error:', error);
            throw error;
        }
    }

    // Write-behind cache pattern
    async writeBehind(key, data) {
        try {
            // 1. Write to Redis immediately
            await this.cluster.setex(key, 3600, JSON.stringify(data));
            this.localCache.set(key, data, 3600);
            
            // 2. Queue for database write (async)
            this.queueDatabaseWrite(key, data);
            
            return true;
        } catch (error) {
            console.error('Write-behind error:', error);
            throw error;
        }
    }

    async getWithCache(key) {
        // 1. Check local cache first
        const localData = this.localCache.get(key);
        if (localData) {
            console.log('Cache hit - local');
            return localData;
        }

        // 2. Check Redis cluster
        const redisData = await this.cluster.get(key);
        if (redisData) {
            console.log('Cache hit - Redis');
            const parsedData = JSON.parse(redisData);
            this.localCache.set(key, parsedData, 30);
            return parsedData;
        }

        // 3. Get from database
        console.log('Cache miss');
        const dbData = await this.getFromDatabase(key);
        
        if (dbData) {
            // 4. Populate cache asynchronously
            this.cluster.setex(key, 3600, JSON.stringify(dbData)).catch(console.error);
            this.localCache.set(key, dbData, 30);
        }
        
        return dbData;
    }

    async invalidatePattern(pattern) {
        const keys = await this.cluster.keys(pattern);
        const pipeline = this.cluster.pipeline();
        
        keys.forEach(key => {
            pipeline.del(key);
            this.localCache.del(key);
        });
        
        await pipeline.exec();
        return keys.length;
    }

    // Rate limiting with Redis
    async rateLimit(key, limit, windowInSeconds) {
        const current = await this.cluster.incr(key);
        
        if (current === 1) {
            await this.cluster.expire(key, windowInSeconds);
        }
        
        return current > limit;
    }

    // Bloom filter for existence checks
    async bloomFilterAdd(filterName, item) {
        return await this.cluster.call('BF.ADD', filterName, item);
    }

    async bloomFilterExists(filterName, item) {
        return await this.cluster.call('BF.EXISTS', filterName, item);
    }

    // Helper methods
    async writeToDatabase(key, data) {
        // Implement database write logic
        console.log(`Writing to database: ${key}`);
    }

    async getFromDatabase(key) {
        // Implement database read logic
        console.log(`Reading from database: ${key}`);
        return null;
    }

    async queueDatabaseWrite(key, data) {
        // Implement queue logic for async writes
        setTimeout(() => {
            this.writeToDatabase(key, data).catch(console.error);
        }, 5000);
    }
}

module.exports = new RedisClusterManager();