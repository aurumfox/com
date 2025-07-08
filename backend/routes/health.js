// routes/health.js
const express = require('express');
const mongoose = require('mongoose');
const { getRedisClient } = require('../config/redis');
const { getRabbitMQChannel } = require('../config/rabbitmq');
const logger = require('../config/logger');

const router = express.Router();

router.get('/', async (req, res) => {
    const healthcheck = {
        uptime: process.uptime(),
        message: 'OK',
        timestamp: Date.now(),
        database: {
            mongodb: {
                status: 'DOWN',
                error: null
            }
        },
        cache: {
            redis: {
                status: 'DOWN',
                error: null
            }
        },
        queue: {
            rabbitmq: {
                status: 'DOWN',
                error: null
            }
        }
    };

    try {
        // Check MongoDB connection
        if (mongoose.connection.readyState === 1) {
            healthcheck.database.mongodb.status = 'UP';
        } else {
            throw new Error('MongoDB not connected');
        }

        // Check Redis connection
        const redisClient = getRedisClient();
        if (redisClient && redisClient.isOpen) {
            await redisClient.ping();
            healthcheck.cache.redis.status = 'UP';
        } else {
            throw new Error('Redis not connected or not pingable');
        }

        // Check RabbitMQ connection
        const rabbitmqChannel = getRabbitMQChannel();
        if (rabbitmqChannel) {
            // A simple way to check if channel is active (e.g., trying to assert a temporary queue)
            try {
                await rabbitmqChannel.checkQueue('nft_processing_queue'); // Check if a known queue is accessible
                healthcheck.queue.rabbitmq.status = 'UP';
            } catch (err) {
                throw new Error(`RabbitMQ channel not active: ${err.message}`);
            }
        } else {
            throw new Error('RabbitMQ channel not available');
        }

        res.status(200).json(healthcheck);

    } catch (e) {
        logger.error('Health check failed:', e.message);
        healthcheck.message = 'Service is unhealthy';
        if (e.message.includes('MongoDB')) {
            healthcheck.database.mongodb.error = e.message;
        } else if (e.message.includes('Redis')) {
            healthcheck.cache.redis.error = e.message;
        } else if (e.message.includes('RabbitMQ')) {
            healthcheck.queue.rabbitmq.error = e.message;
        }
        res.status(503).json(healthcheck); // Service Unavailable
    }
});

module.exports = router;
