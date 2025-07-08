// middleware/cacheMiddleware.js
const { getRedisClient } = require('../config/redis');
const logger = require('../config/logger');

/**
 * Caching middleware for GET requests.
 * Caches responses in Redis for a specified duration.
 *
 * @param {number} durationSeconds - The duration in seconds to cache the response.
 */
const cacheMiddleware = (durationSeconds) => async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
        return next();
    }

    const redisClient = getRedisClient();
    if (!redisClient) {
        logger.warn('Redis client not available for caching. Skipping cache for:', req.originalUrl);
        return next();
    }

    const key = req.originalUrl; // Use the full URL as the cache key

    try {
        const cachedBody = await redisClient.get(key);

        if (cachedBody) {
            logger.debug(`Cache HIT for key: ${key}`);
            // Set Content-Type header to ensure correct parsing by client
            res.setHeader('Content-Type', 'application/json');
            return res.send(JSON.parse(cachedBody));
        } else {
            logger.debug(`Cache MISS for key: ${key}`);
            // If not in cache, proceed to route handler and then cache the response
            const originalSend = res.send;
            res.send = async (body) => {
                // Cache only successful responses
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    await redisClient.setEx(key, durationSeconds, body);
                    logger.debug(`Cached key: ${key} for ${durationSeconds} seconds.`);
                }
                originalSend.call(res, body);
            };
            next();
        }
    } catch (error) {
        logger.error(`Error with Redis cache for key ${key}:`, error);
        // If there's a Redis error, just proceed without caching
        next();
    }
};

module.exports = cacheMiddleware;
