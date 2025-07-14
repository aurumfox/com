const { getRedisClient } = require('../config/redis');
const logger = require('../config/logger');

/**
 * Caching middleware for GET requests.
 * Caches successful JSON responses in Redis for a specified duration.
 *
 * @param {number} durationSeconds - The duration in seconds to cache the response.
 * @returns {Function} Express middleware function.
 */
const cacheMiddleware = (durationSeconds) => async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
        logger.debug(`Skipping cache for non-GET request: ${req.method} ${req.originalUrl}`);
        return next();
    }

    const redisClient = getRedisClient();
    // Ensure Redis client is available AND connected (isOpen)
    if (!redisClient || !redisClient.isOpen) {
        logger.warn('Redis client not available or not connected. Skipping cache for:', req.originalUrl);
        return next();
    }

    // Use a cache key that incorporates the full URL (including query parameters)
    // and potentially the accept header or user roles if responses vary.
    // For most REST APIs, originalUrl is sufficient.
    const key = req.originalUrl; 

    try {
        const cachedResponse = await redisClient.get(key);

        if (cachedResponse) {
            logger.debug(`Cache HIT for key: ${key}`);
            // Attempt to parse. If it fails, treat as a cache miss or malformed cache.
            try {
                // Assuming responses are typically JSON
                res.setHeader('Content-Type', 'application/json');
                return res.send(JSON.parse(cachedResponse));
            } catch (parseError) {
                logger.warn(`Failed to parse cached response for key ${key}. Treating as miss.`, parseError.message);
                // In case of parsing error, delete the malformed cache and proceed
                await redisClient.del(key);
                // Fall through to the caching logic below
            }
        }

        logger.debug(`Cache MISS for key: ${key}`);
        
        // Intercept both `res.json` and `res.send` to cache the response.
        // Intercepting `res.json` is often more direct for API responses.
        const originalJson = res.json;
        const originalSend = res.send;

        // Override res.json to cache the data before sending
        res.json = async (data) => {
            // Only cache successful responses
            if (res.statusCode >= 200 && res.statusCode < 300) {
                try {
                    // Stringify the data before storing in Redis
                    const stringifiedData = JSON.stringify(data);
                    await redisClient.setEx(key, durationSeconds, stringifiedData);
                    logger.info(`Response cached for key: ${key} (TTL: ${durationSeconds}s).`);
                } catch (cacheError) {
                    logger.error(`Failed to cache JSON response for key ${key}:`, cacheError);
                    // Don't block the response, just log the caching error
                }
            }
            originalJson.call(res, data); // Call the original res.json to send the response
        };

        // Also override res.send to catch cases where res.json is not used.
        // Be careful if `res.send` might send non-JSON data.
        res.send = async (body) => {
            // Only cache successful responses
            if (res.statusCode >= 200 && res.statusCode < 300) {
                try {
                    // Check if body is already a string (e.g., HTML, plain text)
                    // If it's an object/array, assume it's meant to be JSON
                    const dataToCache = typeof body === 'object' ? JSON.stringify(body) : body;
                    
                    // Only cache if it's a string, otherwise log warning
                    if (typeof dataToCache === 'string') {
                        await redisClient.setEx(key, durationSeconds, dataToCache);
                        logger.info(`Response cached (via send) for key: ${key} (TTL: ${durationSeconds}s).`);
                    } else {
                        logger.warn(`Skipping caching for non-string, non-JSON body via res.send for key ${key}.`);
                    }
                } catch (cacheError) {
                    logger.error(`Failed to cache response (via send) for key ${key}:`, cacheError);
                }
            }
            originalSend.call(res, body); // Call the original res.send to send the response
        };

        next(); // Proceed to the actual route handler
    } catch (error) {
        logger.error(`Unhandled error in cache middleware for key ${key}:`, error);
        // If an unexpected error occurs within the middleware, ensure request proceeds
        next();
    }
};

module.exports = cacheMiddleware;
