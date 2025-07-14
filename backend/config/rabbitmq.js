/**
 * @file Handles the connection and management of the RabbitMQ client (AMQP).
 * Implements robust connection, error handling, and reconnection strategies.
 */

const amqp = require('amqplib');
const logger = require('./logger'); // Assuming your logger is correctly configured
// Assuming config.js provides environment-specific variables
const config = require('./environments')[process.env.NODE_ENV || 'development'];

let connection = null;
let channel = null;
let isConnecting = false; // Flag to prevent multiple concurrent connection attempts
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 30; // Max attempts before giving up or exiting
const RECONNECT_INTERVAL_MS = 5000; // 5 seconds between reconnect attempts

// Queues that this application asserts/uses
const RABBITMQ_QUEUES = {
    NFT_PROCESSING: 'nft_processing_queue',
    NOTIFICATION: 'notification_queue',
    // Add other queues as your application grows
    EMAIL_DELIVERY: 'email_delivery_queue',
    ANALYTICS_EVENTS: 'analytics_events_queue'
};

/**
 * Connects to RabbitMQ and sets up event listeners for robust handling.
 * Implements a retry mechanism for connection attempts.
 * @returns {Promise<void>} A promise that resolves when RabbitMQ is connected and channel is created.
 */
const connectRabbitMQ = async () => {
    if (connection && channel) {
        logger.info('RabbitMQ: Already connected and channel available.');
        return;
    }

    if (isConnecting) {
        logger.debug('RabbitMQ: Connection attempt already in progress. Skipping.');
        return;
    }

    isConnecting = true;
    reconnectAttempts++;

    if (reconnectAttempts > MAX_RECONNECT_ATTEMPTS) {
        logger.error(`RabbitMQ: Max reconnect attempts (${MAX_RECONNECT_ATTEMPTS}) reached. Exiting process.`);
        process.exit(1); // Critical failure, exit application
    }

    logger.info(`RabbitMQ: Attempting to connect (Attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);

    try {
        connection = await amqp.connect(config.rabbitmqUri);
        logger.info('RabbitMQ: Connection established.');

        // Set up connection-level listeners for robustness
        connection.on('close', (err) => {
            logger.error(`RabbitMQ: Connection closed! Error: ${err ? err.message : 'No error specified'}. Reconnecting...`, err);
            // Reset channel and connection to null to force re-creation
            channel = null;
            connection = null;
            isConnecting = false; // Allow new connection attempt
            setTimeout(connectRabbitMQ, RECONNECT_INTERVAL_MS); // Retry connection
        });

        connection.on('error', (err) => {
            logger.error(`RabbitMQ: Connection error: ${err.message}`, err);
            // This might or might not lead to a 'close' event. If not, logic in 'close'
            // listener will not fire. A robust app might explicitly close and retry here.
            // For now, assume 'close' will follow for most critical errors.
        });

        channel = await connection.createChannel();
        logger.info('RabbitMQ: Channel created.');

        // Enable publisher confirms for reliable message sending
        await channel.confirmSelect();
        logger.info('RabbitMQ: Publisher confirms enabled for channel.');

        // Assert queues: durable ensures they survive RabbitMQ restarts.
        // Also assert exchanges if you plan to use topics/fanout.
        for (const queueName of Object.values(RABBITMQ_QUEUES)) {
            await channel.assertQueue(queueName, { durable: true });
            logger.info(`RabbitMQ: Asserted queue: '${queueName}'`);
        }

        reconnectAttempts = 0; // Reset counter on successful full connection
        isConnecting = false; // Release the connection flag

    } catch (error) {
        logger.error(`RabbitMQ: Failed to connect or setup: ${error.message}. Retrying in ${RECONNECT_INTERVAL_MS}ms...`, error);
        connection = null; // Clear connection on failure
        channel = null;     // Clear channel on failure
        isConnecting = false; // Allow new connection attempt
        setTimeout(connectRabbitMQ, RECONNECT_INTERVAL_MS); // Retry connection
    }
};

/**
 * Returns the active RabbitMQ channel.
 * This channel can be used for publishing messages.
 * @returns {amqp.Channel | null} The RabbitMQ channel if available, otherwise null.
 */
const getRabbitMQChannel = () => {
    if (!channel) {
        logger.warn('RabbitMQ channel not available. Ensure connectRabbitMQ has been called and succeeded.');
        // Optionally, throw an error to force callers to handle a missing channel
        // throw new Error('RabbitMQ channel is not available.');
    }
    return channel;
};

/**
 * Publishes a message to a specific queue.
 * Utilizes publisher confirms for reliability.
 * @param {string} queueName - The name of the queue to publish to.
 * @param {object} message - The message payload (will be JSON.stringified).
 * @param {object} [options={}] - Optional AMQP publishing options (e.g., `persistent: true`).
 * @returns {Promise<boolean>} True if message was successfully confirmed by RabbitMQ, false otherwise.
 */
const publishMessage = async (queueName, message, options = { persistent: true }) => {
    const pubChannel = getRabbitMQChannel();
    if (!pubChannel) {
        logger.error(`RabbitMQ: Cannot publish message to queue '${queueName}'. Channel not available.`);
        return false;
    }

    if (!Object.values(RABBITMQ_QUEUES).includes(queueName)) {
        logger.error(`RabbitMQ: Attempted to publish to an un-asserted or unknown queue: '${queueName}'`);
        return false; // Prevent publishing to unknown queues
    }

    try {
        const content = Buffer.from(JSON.stringify(message));
        // `sendToQueue` with confirmSelect makes this return true on ack, false on nack
        const published = pubChannel.sendToQueue(queueName, content, options);

        if (published) {
            // Wait for publisher confirm
            await pubChannel.waitForConfirms();
            logger.debug(`RabbitMQ: Message confirmed for queue '${queueName}'.`);
            return true;
        } else {
            // This case means the buffer is full, not a definitive failure yet.
            // Client library will retry internally or raise an error eventually.
            logger.warn(`RabbitMQ: Message temporarily unconfirmed (buffer full) for queue '${queueName}'.`);
            // You might want to implement a retry here or use a dedicated `confirm` listener.
            return false;
        }
    } catch (error) {
        logger.error(`RabbitMQ: Failed to publish message to queue '${queueName}': ${error.message}`, error);
        // This catch block handles errors like channel closure during publishing
        return false;
    }
};

/**
 * Closes the RabbitMQ channel and connection gracefully.
 * @returns {Promise<void>} A promise that resolves when RabbitMQ is disconnected.
 */
const disconnectRabbitMQ = async () => {
    if (channel) {
        try {
            await channel.close();
            logger.info('RabbitMQ: Channel closed.');
        } catch (err) {
            logger.error(`RabbitMQ: Error closing channel: ${err.message}`, err);
        } finally {
            channel = null;
        }
    }
    if (connection) {
        try {
            await connection.close();
            logger.info('RabbitMQ: Connection closed.');
        } catch (err) {
            logger.error(`RabbitMQ: Error closing connection: ${err.message}`, err);
        } finally {
            connection = null;
        }
    }
    isConnecting = false;
    reconnectAttempts = 0;
};

// --- Consumer Example (if your app needs to consume messages) ---
/**
 * Starts consuming messages from a specified queue.
 * This function should ideally be called once during application startup for each queue.
 * @param {string} queueName - The name of the queue to consume from.
 * @param {Function} messageHandler - An async function `(msg) => {}` to process each message.
 * It must acknowledge the message using `channel.ack(msg)` or `channel.nack(msg)`.
 * @param {object} [options={}] - Optional AMQP consume options (e.g., `noAck: false`).
 * @returns {Promise<void>}
 */
const startConsumer = async (queueName, messageHandler, options = { noAck: false }) => {
    const consumerChannel = getRabbitMQChannel();
    if (!consumerChannel) {
        logger.error(`RabbitMQ: Cannot start consumer for queue '${queueName}'. Channel not available.`);
        return;
    }

    if (!Object.values(RABBITMQ_QUEUES).includes(queueName)) {
        logger.error(`RabbitMQ: Attempted to start consumer for an un-asserted or unknown queue: '${queueName}'`);
        return;
    }

    logger.info(`RabbitMQ: Starting consumer for queue: '${queueName}'`);

    try {
        await consumerChannel.consume(queueName, async (msg) => {
            if (msg === null) {
                logger.warn(`RabbitMQ: Consumer for queue '${queueName}' cancelled by RabbitMQ.`);
                // This means the consumer has been cancelled (e.g., queue deleted)
                // You might want to re-establish the consumer here or alert.
                return;
            }
            try {
                const messageContent = JSON.parse(msg.content.toString());
                logger.debug(`RabbitMQ: Received message from '${queueName}': ${JSON.stringify(messageContent)}`);
                await messageHandler(messageContent);
                consumerChannel.ack(msg); // Acknowledge message after successful processing
                logger.debug(`RabbitMQ: Message acknowledged for queue '${queueName}'.`);
            } catch (handlerError) {
                logger.error(`RabbitMQ: Error processing message from queue '${queueName}': ${handlerError.message}. Message: ${msg.content.toString()}`, handlerError);
                // Requeue the message for retry, or move to a dead-letter queue
                consumerChannel.nack(msg, false, true); // Requeue = true
                logger.warn(`RabbitMQ: Message nacked and requeued for queue '${queueName}'.`);
            }
        }, options);
        logger.info(`RabbitMQ: Consumer for queue '${queueName}' started successfully.`);
    } catch (error) {
        logger.error(`RabbitMQ: Failed to start consumer for queue '${queueName}': ${error.message}`, error);
        // This might happen if the queue doesn't exist or permissions issue.
        // The connection listeners should handle global reconnections.
    }
};


module.exports = {
    connectRabbitMQ,
    getRabbitMQChannel,
    publishMessage, // New export for direct publishing
    disconnectRabbitMQ,
    RABBITMQ_QUEUES, // Export queue names for easy access
    startConsumer, // New export for managing consumers
};
