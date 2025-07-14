/**
 * @file Handles the connection and management of the Redis client.
 * Implements a singleton pattern for the Redis client and includes
 * robust connection, error, and reconnection handling.
 */

const redis = require('redis');
const logger = require('./logger'); // Assuming your logger is correctly configured

let redisClient = null; // Use null to explicitly indicate no client initially
let reconnectAttemptCount = 0;
const MAX_RECONNECT_ATTEMPTS = 10; // Max number of reconnect attempts
const RECONNECT_INTERVAL_MS = 5000; // 5 seconds between reconnect attempts

/**
 * Connects to Redis and sets up event listeners.
 * Implements a retry mechanism for initial connection.
 * @returns {Promise<void>} A promise that resolves when Redis is connected.
 * @throws {Error} If connection fails after max reconnect attempts.
 */
const connectRedis = async () => {
    if (redisClient && redisClient.isReady) {
        logger.info('Redis client already connected and ready.');
        return;
    }

    // Ensure only one connection attempt is active at a time
    if (redisClient && redisClient.connecting) {
        logger.debug('Redis client is already in the process of connecting.');
        return;
    }

    try {
        redisClient = redis.createClient({
            url: process.env.REDIS_URI || 'redis://localhost:6379',
            // Add options for better resilience and production-readiness
            socket: {
                keepAlive: 10000, // Keep connection alive (ms)
                connectTimeout: 10000, // Connection timeout (ms)
                reconnectStrategy: (retries) => {
                    // Custom reconnect strategy, overriding default behavior if needed.
                    // This function is called on each reconnect attempt.
                    if (retries > MAX_RECONNECT_ATTEMPTS) {
                        logger.error(`Max reconnect attempts (${MAX_RECONNECT_ATTEMPTS}) reached for Redis.`);
                        return new Error('Max reconnect attempts reached'); // Stop trying
                    }
                    logger.warn(`Redis reconnect attempt #${retries}. Retrying in ${RECONNECT_INTERVAL_MS}ms...`);
                    return RECONNECT_INTERVAL_MS; // Return delay in ms
                }
            }
        });

        // Event Listeners for connection lifecycle
        redisClient.on('error', (err) => {
            logger.error(`Redis Client Error: ${err.message}`, err);
            // On error, the client might try to reconnect based on `reconnectStrategy`
            // You might want to push specific error metrics here.
        });

        redisClient.on('connect', () => {
            logger.info('Redis Client: Connecting...');
            reconnectAttemptCount = 0; // Reset counter on successful connection attempt
        });

        redisClient.on('ready', () => {
            logger.info('Redis Client: Connected and Ready.');
            reconnectAttemptCount = 0; // Ensure reset on ready state
        });

        redisClient.on('end', () => {
            logger.warn('Redis Client: Disconnected.');
            // This event fires when connection is closed (e.g., by quit() or network issue)
            // The client will automatically try to reconnect if `reconnectStrategy` is set.
        });

        redisClient.on('reconnecting', (delay) => {
            logger.warn(`Redis Client: Reconnecting... (delay: ${delay}ms)`);
            reconnectAttemptCount++;
        });

        await redisClient.connect();
        logger.info(`Successfully connected to Redis at ${process.env.REDIS_URI || 'redis://localhost:6379'}`);

    } catch (error) {
        logger.error(`Critical error connecting to Redis: ${error.message}`, error);
        // This is for the initial connection attempt. If it fails, we throw.
        // The reconnectStrategy handles subsequent internal retries.
        process.exit(1); // Exit the application if initial critical connection fails
    }
};

/**
 * Returns the connected Redis client instance.
 * @returns {RedisClientType | null} The Redis client instance if connected and ready, otherwise null.
 */
const getRedisClient = () => {
    if (!redisClient || !redisClient.isReady) {
        logger.warn('Redis client is not connected or ready. Operations might fail.');
        // In a real application, you might want to:
        // 1. Throw an error immediately.
        // 2. Queue the operation and retry when Redis is ready (more complex).
        // 3. Fallback to a slower, non-cached operation (if applicable).
        // For now, returning null and letting the caller handle it.
        return null;
    }
    return redisClient;
};

/**
 * Disconnects the Redis client gracefully.
 * @returns {Promise<void>} A promise that resolves when Redis client is disconnected.
 */
const disconnectRedis = async () => {
    if (redisClient && redisClient.isReady) {
        try {
            await redisClient.quit();
            logger.info('Redis client gracefully disconnected.');
            redisClient = null; // Clear the client instance
        } catch (error) {
            logger.error(`Error during Redis client disconnect: ${error.message}`, error);
            // Forcefully disconnect if graceful quit fails
            try {
                await redisClient.disconnect();
                logger.warn('Redis client forcefully disconnected after quit failure.');
            } catch (e) {
                logger.error(`Failed to forcefully disconnect Redis client: ${e.message}`, e);
            }
        }
    } else if (redisClient && redisClient.connecting) {
        logger.warn('Redis client is still connecting, cannot disconnect immediately. Will attempt to disconnect once ready.');
        // Optionally, wait for connection and then quit, or just set to null
        redisClient.once('ready', async () => {
            await redisClient.quit();
            logger.info('Redis client disconnected after becoming ready.');
            redisClient = null;
        });
    } else {
        logger.info('Redis client is not active, no need to disconnect.');
    }
};

module.exports = {
    connectRedis,
    getRedisClient,
    disconnectRedis
};
