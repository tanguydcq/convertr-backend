import { Redis } from 'ioredis';
import { config } from '../config/index.js';

// Create Redis client
export const redis = new Redis(config.REDIS_URL, {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    retryStrategy(times: number) {
        const delay = Math.min(times * 50, 2000);
        return delay;
    },
});

// Connection event handlers
redis.on('connect', () => {
    console.log('✓ Redis connected');
});

redis.on('error', (err: Error) => {
    console.error('❌ Redis connection error:', err.message);
});

// Cache utility functions
export const cache = {
    /**
     * Get a cached value by key
     */
    async get<T>(key: string): Promise<T | null> {
        const data = await redis.get(key);
        if (!data) return null;
        try {
            return JSON.parse(data) as T;
        } catch {
            return null;
        }
    },

    /**
     * Set a value in cache with optional TTL (default 1 hour)
     */
    async set(key: string, value: unknown, ttlSeconds = 3600): Promise<void> {
        await redis.setex(key, ttlSeconds, JSON.stringify(value));
    },

    /**
     * Delete a key from cache
     */
    async del(key: string): Promise<void> {
        await redis.del(key);
    },

    /**
     * Delete all keys matching a pattern
     */
    async delPattern(pattern: string): Promise<void> {
        const keys = await redis.keys(pattern);
        if (keys.length > 0) {
            await redis.del(...keys);
        }
    },

    /**
     * Check if a key exists
     */
    async exists(key: string): Promise<boolean> {
        const result = await redis.exists(key);
        return result === 1;
    },

    /**
     * Increment a counter (useful for rate limiting, metrics)
     */
    async incr(key: string, ttlSeconds?: number): Promise<number> {
        const value = await redis.incr(key);
        if (ttlSeconds && value === 1) {
            await redis.expire(key, ttlSeconds);
        }
        return value;
    },
};

// Pub/Sub for real-time features
export const pubsub = {
    /**
     * Publish a message to a channel
     */
    async publish(channel: string, message: unknown): Promise<void> {
        await redis.publish(channel, JSON.stringify(message));
    },

    /**
     * Subscribe to a channel (returns a new Redis instance for subscriptions)
     */
    createSubscriber(): Redis {
        return new Redis(config.REDIS_URL);
    },
};

export default redis;
