// utils/cache.js
const { getRedisClient } = require('../config/redis');
const logger = require('../config/logger');
const { API_VERSIONS } = require('../config/constants');

/**
 * Invalidates a specific cache key.
 * @param {string} key - The cache key to invalidate.
 */
const invalidateCache = async (key) => {
    const redisClient = getRedisClient();
    if (!redisClient) {
        logger.warn('Redis client not available. Cannot invalidate cache.');
        return;
    }
    try {
        const deleted = await redisClient.del(key);
        if (deleted) {
            logger.info(`Cache invalidated for key: ${key}`);
        } else {
            logger.debug(`Cache key not found for invalidation: ${key}`);
        }
    } catch (error) {
        logger.error(`Error invalidating cache for key ${key}:`, error);
    }
};

/**
 * Invalidates all cache keys related to a specific resource type.
 * This is useful for POST/PUT/DELETE operations that modify data.
 * @param {string} resourceType - e.g., 'announcements', 'nfts', 'posts'
 */
const invalidateResourceCache = async (resourceType) => {
    const redisClient = getRedisClient();
    if (!redisClient) {
        logger.warn('Redis client not available. Cannot invalidate resource cache.');
        return;
    }
    const pattern = `${API_VERSIONS.V1}/${resourceType}*`; // Matches all keys starting with /api/v1/resourceType
    try {
        // Use SCAN for production to avoid blocking the server with KEYS *
        // For simplicity, using KEYS here, but SCAN should be preferred for large datasets.
        const keys = await redisClient.keys(pattern);
        if (keys.length > 0) {
            const deletedCount = await redisClient.del(keys);
            logger.info(`Invalidated ${deletedCount} cache keys for resource type: ${resourceType}`);
        } else {
            logger.debug(`No cache keys found for resource type: ${resourceType}`);
        }
    } catch (error) {
        logger.error(`Error invalidating resource cache for pattern ${pattern}:`, error);
    }
};

module.exports = {
    invalidateCache,
    invalidateResourceCache
};
