const { getRedisClient } = require('../config/redis');
const logger = require('../config/logger');
const { API_VERSIONS } = require('../config/constants'); // Assuming API_VERSIONS is correctly defined

/**
 * Higher-order function to create a caching middleware for GET requests.
 * This middleware attempts to serve content from cache first.
 * If not found, it proceeds to the route handler, caches the response, and then sends it.
 *
 * @param {number} [ttlSeconds=3600] - Time-to-live for the cache entry in seconds (default: 1 hour).
 * @returns {Function} - Express middleware function.
 */
const cacheMiddleware = (ttlSeconds = 3600) => {
    return async (req, res, next) => {
        const redisClient = getRedisClient();
        if (!redisClient || !redisClient.isOpen) {
            logger.warn('Redis client not available for caching. Skipping cache lookup.');
            return next(); // Proceed without caching if Redis is not ready
        }

        // Generate a unique cache key based on the request URL
        const key = req.originalUrl;

        try {
            const cachedResponse = await redisClient.get(key);
            if (cachedResponse) {
                logger.debug(`Cache HIT for key: ${key}`);
                // Parse and send the cached JSON response
                return res.json(JSON.parse(cachedResponse));
            } else {
                logger.debug(`Cache MISS for key: ${key}`);
                // If not in cache, proceed to the actual route handler.
                // Intercept the `res.json` method to cache the response before sending it.
                const originalJson = res.json;
                res.json = async (data) => {
                    await redisClient.setEx(key, ttlSeconds, JSON.stringify(data));
                    logger.info(`Response cached for key: ${key} with TTL: ${ttlSeconds}s`);
                    originalJson.call(res, data); // Call the original res.json to send the response
                };
                next(); // Proceed to the route handler
            }
        } catch (error) {
            logger.error(`Error during cache middleware for key ${key}:`, error);
            // In case of any Redis error, don't block the request, just proceed to route handler.
            next();
        }
    };
};

/**
 * Invalidates a specific cache key.
 * @param {string} key - The cache key to invalidate.
 */
const invalidateCache = async (key) => {
    const redisClient = getRedisClient();
    if (!redisClient || !redisClient.isOpen) {
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
 * Invalidates all cache keys related to a specific resource type using SCAN.
 * This is crucial for POST/PUT/DELETE operations that modify data.
 * @param {string} resourceType - e.g., 'announcements', 'nfts', 'posts'
 * @param {string} [apiVersion=API_VERSIONS.V1] - The API version prefix to use for the pattern.
 */
const invalidateResourceCache = async (resourceType, apiVersion = API_VERSIONS.V1) => {
    const redisClient = getRedisClient();
    if (!redisClient || !redisClient.isOpen) {
        logger.warn('Redis client not available. Cannot invalidate resource cache.');
        return;
    }

    // Ensure resourceType doesn't include leading/trailing slashes if it's meant to be just the name
    const cleanedResourceType = resourceType.replace(/^\/|\/$/g, '');
    
    // Pattern to match keys: e.g., `/api/v1/announcements*` or `v1:announcements*` depending on your key naming convention
    // Using `*` for wildcard matching.
    const pattern = `/${apiVersion}/${cleanedResourceType}*`; 
    logger.debug(`Invalidating resource cache for pattern: ${pattern}`);

    let cursor = 0;
    let keysToDelete = [];
    const SCAN_BATCH_SIZE = 100; // Process keys in batches

    try {
        do {
            const [nextCursor, keys] = await redisClient.scan(
                cursor,
                'MATCH', pattern,
                'COUNT', SCAN_BATCH_SIZE
            );

            keysToDelete = keysToDelete.concat(keys);
            cursor = parseInt(nextCursor, 10);

        } while (cursor !== 0);

        if (keysToDelete.length > 0) {
            const deletedCount = await redisClient.del(keysToDelete);
            logger.info(`Invalidated ${deletedCount} cache keys for resource type: ${cleanedResourceType} (pattern: ${pattern}).`);
        } else {
            logger.debug(`No cache keys found for resource type: ${cleanedResourceType} with pattern: ${pattern}.`);
        }
    } catch (error) {
        logger.error(`Error invalidating resource cache for pattern ${pattern}:`, error);
    }
};

module.exports = {
    cacheMiddleware, // Export the new caching middleware
    invalidateCache,
    invalidateResourceCache
};
