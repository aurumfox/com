// services/cacheService.js
const { getRedisClient } = require('../config/redis');
const logger = require('../config/logger');

const CACHE_TTL_DEFAULT = 3600; // Default cache time-to-live in seconds (1 hour)

/**
 * Retrieves data from cache.
 * @param {string} key - The cache key.
 * @returns {Promise<any | null>} - Cached data or null if not found.
 */
const getFromCache = async (key) => {
    const redisClient = getRedisClient();
    if (!redisClient) {
        logger.warn('Cache service: Redis client not available.');
        return null;
    }
    try {
        const data = await redisClient.get(key);
        if (data) {
            logger.debug(`Cache hit for key: ${key}`);
            return JSON.parse(data);
        }
        logger.debug(`Cache miss for key: ${key}`);
        return null;
    } catch (error) {
        logger.error(`Error getting from cache for key ${key}:`, error);
        return null;
    }
};

/**
 * Stores data in cache.
 * @param {string} key - The cache key.
 * @param {any} data - The data to store.
 * @param {number} ttl - Time-to-live in seconds.
 * @returns {Promise<void>}
 */
const setToCache = async (key, data, ttl = CACHE_TTL_DEFAULT) => {
    const redisClient = getRedisClient();
    if (!redisClient) {
        logger.warn('Cache service: Redis client not available, skipping set to cache.');
        return;
    }
    try {
        await redisClient.setEx(key, ttl, JSON.stringify(data));
        logger.debug(`Cache set for key: ${key} with TTL: ${ttl}s`);
    } catch (error) {
        logger.error(`Error setting to cache for key ${key}:`, error);
    }
};

/**
 * Invalidates a specific cache key.
 * @param {string} key - The cache key to invalidate.
 * @returns {Promise<void>}
 */
const invalidateCache = async (key) => {
    const redisClient = getRedisClient();
    if (!redisClient) {
        logger.warn('Cache service: Redis client not available, skipping cache invalidation.');
        return;
    }
    try {
        await redisClient.del(key);
        logger.info(`Cache invalidated for key: ${key}`);
    } catch (error) {
        logger.error(`Error invalidating cache for key ${key}:`, error);
    }
};

/**
 * Invalidates all cache keys matching a pattern. Use with caution.
 * @param {string} pattern - The pattern to match keys (e.g., 'nfts:*', 'users:*').
 * @returns {Promise<void>}
 */
const invalidateCacheByPattern = async (pattern) => {
    const redisClient = getRedisClient();
    if (!redisClient) {
        logger.warn('Cache service: Redis client not available, skipping pattern invalidation.');
        return;
    }
    try {
        const keys = await redisClient.keys(pattern);
        if (keys.length > 0) {
            await redisClient.del(keys);
            logger.info(`Invalidated ${keys.length} keys matching pattern: ${pattern}`);
        } else {
            logger.debug(`No keys found to invalidate for pattern: ${pattern}`);
        }
    } catch (error) {
        logger.error(`Error invalidating cache by pattern ${pattern}:`, error);
    }
};


module.exports = ({ getRedisClient, logger }) => ({ // Injected dependencies
    getFromCache,
    setToCache,
    invalidateCache,
    invalidateCacheByPattern,
});
