const express = require('express');
const mongoose = require('mongoose');
const { getRedisClient } = require('../config/redis');
const { getRabbitMQChannel } = require('../config/rabbitmq');
const logger = require('../config/logger'); // Assuming this is your Winston or similar logger

const router = express.Router();

// Define constants for health statuses for consistency
const STATUS_UP = 'UP';
const STATUS_DOWN = 'DOWN';
const SERVICE_UNHEALTHY = 'Service is unhealthy';
const SERVICE_OK = 'OK';

router.get('/', async (req, res) => {
    // Initialize the healthcheck object with default DOWN statuses
    const healthcheck = {
        uptime: process.uptime(),
        message: SERVICE_OK, // Default to OK, will change if any component is DOWN
        timestamp: new Date().toISOString(), // Use ISO string for consistent date format
        database: {
            mongodb: {
                status: STATUS_DOWN,
                error: null
            }
        },
        cache: {
            redis: {
                status: STATUS_DOWN,
                error: null
            }
        },
        queue: {
            rabbitmq: {
                status: STATUS_DOWN,
                error: null
            }
        }
    };

    let overallStatus = 200; // Default to OK

    // --- Check MongoDB Connection ---
    try {
        if (mongoose.connection.readyState === 1) { // 1 means connected
            healthcheck.database.mongodb.status = STATUS_UP;
        } else {
            // Mongoose readyState 0: disconnected, 2: connecting, 3: disconnecting
            throw new Error(`MongoDB not connected. Current state: ${mongoose.connection.readyState}`);
        }
    } catch (error) {
        healthcheck.database.mongodb.error = error.message;
        overallStatus = 503; // MongoDB is critical, so set overall status to 503
        logger.error(`Health check failed - MongoDB: ${error.message}`);
    }

    // --- Check Redis Connection ---
    try {
        const redisClient = getRedisClient();
        if (redisClient && redisClient.isOpen) { // Check if client exists and is open
            await redisClient.ping(); // Attempt to ping Redis
            healthcheck.cache.redis.status = STATUS_UP;
        } else {
            throw new Error('Redis client not available or connection not open.');
        }
    } catch (error) {
        healthcheck.cache.redis.error = error.message;
        overallStatus = 503; // Redis is critical, so set overall status to 503
        logger.error(`Health check failed - Redis: ${error.message}`);
    }

    // --- Check RabbitMQ Connection ---
    try {
        const rabbitmqChannel = getRabbitMQChannel();
        if (rabbitmqChannel) {
            // A robust way to check channel health is to try asserting a queue.
            // Using a non-existent temporary queue is often fine, or a known application queue.
            // Be mindful of potential side effects if using a persistent queue that doesn't exist.
            await rabbitmqChannel.checkQueue('some_temporary_health_check_queue'); 
            healthcheck.queue.rabbitmq.status = STATUS_UP;
        } else {
            throw new Error('RabbitMQ channel not available. It might not have been initialized.');
        }
    } catch (error) {
        healthcheck.queue.rabbitmq.error = error.message;
        overallStatus = 503; // RabbitMQ is critical, so set overall status to 503
        logger.error(`Health check failed - RabbitMQ: ${error.message}`);
    }

    // Set overall message based on overallStatus
    if (overallStatus === 503) {
        healthcheck.message = SERVICE_UNHEALTHY;
    }

    // Send the final response
    res.status(overallStatus).json(healthcheck);
});

module.exports = router;
