/**
 * @file Service for interacting with the Redis cache.
 * Provides functions to get, set, and invalidate cached data,
 * with built-in error handling and dependency injection.
 */

const CACHE_TTL_DEFAULT = 3600; // Default cache time-to-live in seconds (1 hour)
const CACHE_TTL_SHORT = 300;    // Shorter TTL for highly volatile data (5 minutes)
const CACHE_TTL_LONG = 86400;   // Longer TTL for less volatile data (24 hours)

/**
 * Creates an instance of the Cache Service.
 * @param {object} dependencies - Injected dependencies.
 * @param {import('redis').RedisClientType} dependencies.redisClient - The Redis client instance.
 * @param {import('winston').Logger} dependencies.logger - The logger instance.
 * @returns {object} The cache service instance.
 */
module.exports = ({ redisClient, logger }) => { // Correct Awilix injection: receive client directly

    /**
     * Checks if the Redis client is available and ready.
     * Logs a warning if not, and returns false.
     * @returns {boolean} True if Redis is ready, false otherwise.
     */
    const isRedisReady = () => {
        if (!redisClient || !redisClient.isReady) {
            logger.warn('Cache service: Redis client not connected or ready. Cache operations will be skipped.');
            // This warning will be logged once per operation if Redis is down,
            // which might be noisy. Consider a circuit breaker or a flag to log this less frequently.
            return false;
        }
        return true;
    };

    /**
     * Retrieves data from cache.
     * @param {string} key - The cache key.
     * @returns {Promise<any | null>} - Cached data or null if not found/error.
     */
    const getFromCache = async (key) => {
        if (!isRedisReady()) {
            return null;
        }
        try {
            const data = await redisClient.get(key);
            if (data !== null) { // Check for null explicitly as get returns null for non-existent keys
                logger.debug(`Cache hit for key: ${key}`);
                return JSON.parse(data);
            }
            logger.debug(`Cache miss for key: ${key}`);
            return null;
        } catch (error) {
            logger.error(`Cache Service Error: Failed to get data for key '${key}': ${error.message}`, error);
            // Consider returning null or rethrowing based on error type.
            // Returning null allows the application to proceed with DB lookup.
            return null;
        }
    };

    /**
     * Stores data in cache.
     * @param {string} key - The cache key.
     * @param {any} data - The data to store.
     * @param {number} [ttl=CACHE_TTL_DEFAULT] - Time-to-live in seconds.
     * @returns {Promise<void>}
     */
    const setToCache = async (key, data, ttl = CACHE_TTL_DEFAULT) => {
        if (!isRedisReady()) {
            return;
        }
        try {
            // Using setEx (SET with EXpiration) which is more explicit
            await redisClient.setEx(key, ttl, JSON.stringify(data));
            logger.debug(`Cache Service: Key '${key}' set with TTL ${ttl}s.`);
        } catch (error) {
            logger.error(`Cache Service Error: Failed to set data for key '${key}': ${error.message}`, error);
        }
    };

    /**
     * Invalidates a specific cache key.
     * @param {string} key - The cache key to invalidate.
     * @returns {Promise<void>}
     */
    const invalidateCache = async (key) => {
        if (!isRedisReady()) {
            return;
        }
        try {
            const deletedCount = await redisClient.del(key);
            if (deletedCount > 0) {
                logger.info(`Cache Service: Key '${key}' invalidated.`);
            } else {
                logger.debug(`Cache Service: Key '${key}' not found for invalidation.`);
            }
        } catch (error) {
            logger.error(`Cache Service Error: Failed to invalidate key '${key}': ${error.message}`, error);
        }
    };

    /**
     * Invalidates cache keys by pattern.
     * WARNING: Using `KEYS` command in production on large datasets can block Redis.
     * Consider alternative strategies like managing keys in sets, or using `SCAN`.
     * For small, controlled datasets or dev environments, `KEYS` might be acceptable.
     * @param {string} pattern - The pattern to match keys (e.g., 'nfts:*', 'users:*').
     * @returns {Promise<void>}
     */
    const invalidateCacheByPattern = async (pattern) => {
        if (!isRedisReady()) {
            return;
        }
        try {
            // In a production environment with potentially many keys,
            // using `KEYS` is highly discouraged as it's a blocking operation.
            // A better approach involves:
            // 1. Maintaining sets of keys for categories (e.g., `sadd nft_ids "nft:123"`)
            //    and then iterating the set to delete.
            // 2. Using `SCAN` command for non-blocking iteration over keys.
            // 3. Implementing a dedicated cache invalidation strategy (e.g., pub/sub).

            // For now, retaining `KEYS` but with a strong warning.
            const keysToDelete = await redisClient.keys(pattern);
            if (keysToDelete.length > 0) {
                // `del` command can take multiple keys
                await redisClient.del(keysToDelete);
                logger.info(`Cache Service: Invalidated ${keysToDelete.length} keys matching pattern '${pattern}'.`);
            } else {
                logger.debug(`Cache Service: No keys found to invalidate for pattern '${pattern}'.`);
            }
        } catch (error) {
            logger.error(`Cache Service Error: Failed to invalidate cache by pattern '${pattern}': ${error.message}`, error);
        }
    };

    return {
        getFromCache,
        setToCache,
        invalidateCache,
        invalidateCacheByPattern,
        // Expose TTL constants for convenience if needed by other services
        CACHE_TTL_DEFAULT,
        CACHE_TTL_SHORT,
        CACHE_TTL_LONG,
    };
};
