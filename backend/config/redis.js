// config/redis.js
const redis = require('redis');
const logger = require('./logger');

let redisClient;

const connectRedis = async () => {
    try {
        redisClient = redis.createClient({
            url: process.env.REDIS_URI || 'redis://localhost:6379'
        });

        redisClient.on('error', (err) => logger.error('Redis Client Error', err));
        redisClient.on('connect', () => logger.info('Redis Client Connected'));
        redisClient.on('ready', () => logger.info('Redis Client Ready'));
        redisClient.on('end', () => logger.info('Redis Client Disconnected'));

        await redisClient.connect();
    } catch (error) {
        logger.error('Could not connect to Redis:', error);
        // In a production environment, you might want to exit or implement a retry mechanism
        // process.exit(1);
    }
};

const getRedisClient = () => {
    if (!redisClient || !redisClient.isReady) {
        logger.warn('Redis client not connected or ready. Attempting to reconnect.');
        // Consider a more robust reconnection strategy here if needed
        // For now, it will just return null if not ready
        return null;
    }
    return redisClient;
};

const disconnectRedis = async () => {
    if (redisClient && redisClient.isReady) {
        await redisClient.quit();
        logger.info('Redis client disconnected.');
    }
};

module.exports = {
    connectRedis,
    getRedisClient,
    disconnectRedis
};
