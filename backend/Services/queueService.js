/**
 * @file Service for interacting with RabbitMQ message queues.
 * Provides functions for publishing messages to queues and consuming messages from them,
 * designed for asynchronous processing of tasks like blockchain interactions, notifications, etc.
 */

// Note: The QUEUE_NAMES should ideally come from a centralized constants file
// and be injected, or imported from a config directly. For now, it's kept here
// and also available via the `config` injection.

/**
 * Creates an instance of the Queue Service.
 * This service provides a standardized way to interact with RabbitMQ queues.
 *
 * @param {object} dependencies - Injected dependencies from the Awilix container.
 * @param {import('amqplib').Channel} dependencies.rabbitMQChannel - The RabbitMQ channel instance.
 * @param {import('winston').Logger} dependencies.logger - The logger instance.
 * @param {object} dependencies.config - Application configuration (e.g., QUEUE_NAMES from constants).
 * @returns {object} The queue service instance.
 */
module.exports = ({ rabbitMQChannel, logger, config }) => { // Correct Awilix injection

    // Access QUEUE_NAMES from config if they are defined there
    const QUEUE_NAMES = config.QUEUE_NAMES || {
        NFT_PROCESSING: 'nft_processing_queue',
        NOTIFICATIONS: 'notification_queue',
        // Default queues if not provided by config
    };

    /**
     * Asserts a queue, ensuring it exists before publishing or consuming.
     * This is crucial to call before any publish/consume operations, especially at application startup.
     * @param {string} queueName - The name of the queue to assert.
     * @param {object} [options={}] - Options for asserting the queue (e.g., durable, arguments).
     * @returns {Promise<void>}
     */
    const assertQueue = async (queueName, options = { durable: true }) => {
        if (!rabbitMQChannel) {
            logger.error(`Queue Service: Cannot assert queue '${queueName}': RabbitMQ channel not available.`);
            throw new Error('RabbitMQ channel not available.');
        }
        try {
            await rabbitMQChannel.assertQueue(queueName, options);
            logger.info(`Queue Service: Asserted queue '${queueName}'.`);
        } catch (error) {
            logger.error(`Queue Service Error: Failed to assert queue '${queueName}': ${error.message}`, error);
            throw error; // Re-throw to indicate a critical setup failure
        }
    };

    /**
     * Publishes a message to a specified queue.
     * Ensures the message is persisted across RabbitMQ restarts.
     *
     * @param {string} queueName - The name of the queue.
     * @param {object | string | Buffer} message - The message payload. Will be JSON.stringified if object.
     * @param {object} [options={}] - Additional publishing options.
     * @param {boolean} [options.persistent=true] - Whether the message should survive broker restarts.
     * @param {string} [options.contentType='application/json'] - Content type of the message.
     * @returns {boolean} - True if message was successfully enqueued, false otherwise (e.g., buffer full).
     */
    const publishToQueue = (queueName, message, options = {}) => {
        if (!rabbitMQChannel) {
            logger.error(`Queue Service: Failed to publish message to '${queueName}': RabbitMQ channel not available.`);
            return false;
        }

        const defaultPublishOptions = { persistent: true, contentType: 'application/json', ...options };
        let bufferMessage;

        try {
            if (typeof message === 'object' && message !== null) {
                bufferMessage = Buffer.from(JSON.stringify(message));
            } else if (typeof message === 'string') {
                bufferMessage = Buffer.from(message);
            } else if (Buffer.isBuffer(message)) {
                bufferMessage = message;
            } else {
                logger.error(`Queue Service: Invalid message type for queue '${queueName}'. Must be object, string, or Buffer.`);
                return false;
            }

            const sent = rabbitMQChannel.sendToQueue(queueName, bufferMessage, defaultPublishOptions);
            if (sent) {
                logger.info(`Queue Service: Message published to queue '${queueName}'.`);
            } else {
                // This means the internal buffer is full. The client should either wait
                // or handle this backpressure. For now, log a warning.
                logger.warn(`Queue Service: Message not immediately sent to queue '${queueName}'. Internal buffer might be full. Consider implementing drain event listener.`);
            }
            return sent;
        } catch (error) {
            logger.error(`Queue Service Error: Failed to publish message to queue '${queueName}': ${error.message}`, error);
            return false;
        }
    };

    /**
     * Consumes messages from a specified queue.
     * This function should typically be called in a separate worker process or a dedicated consumer module.
     * It ensures the queue is asserted before attempting to consume.
     *
     * @param {string} queueName - The name of the queue to consume from.
     * @param {Function} messageProcessor - The async callback function to process each message.
     * It should accept one argument: `content` (the parsed message payload).
     * The callback is responsible for its own error handling for the processing logic.
     * @param {object} [options={}] - Options for consuming (e.g., noAck).
     * @returns {Promise<void>} A promise that resolves when consumption starts.
     * @throws {Error} If RabbitMQ channel is not available or queue assertion fails.
     */
    const consumeFromQueue = async (queueName, messageProcessor, options = { noAck: false }) => {
        if (!rabbitMQChannel) {
            logger.error(`Queue Service: Cannot consume from queue '${queueName}': RabbitMQ channel not available.`);
            throw new Error('RabbitMQ channel not available.');
        }

        try {
            await assertQueue(queueName); // Ensure queue exists before consuming

            await rabbitMQChannel.consume(queueName, async (msg) => {
                if (msg === null) {
                    logger.warn(`Queue Service: Consumer for '${queueName}' received null message (channel might be closed).`);
                    return; // Channel closed or consumer cancelled
                }

                try {
                    const content = JSON.parse(msg.content.toString());
                    logger.debug(`Queue Service: Received message from '${queueName}': ${JSON.stringify(content).substring(0, 200)}...`); // Log truncated content

                    await messageProcessor(content); // Process message using the provided callback

                    if (!options.noAck) {
                        rabbitMQChannel.ack(msg); // Acknowledge message processing
                        logger.debug(`Queue Service: Message acknowledged for queue '${queueName}'.`);
                    }
                } catch (processingError) {
                    logger.error(`Queue Service Error: Failed to process message from '${queueName}'. Message content: ${msg.content.toString()}. Error: ${processingError.message}`, processingError);
                    if (!options.noAck) {
                        // Nack and potentially requeue or send to dead-letter queue
                        // false = don't requeue, true = requeue
                        rabbitMQChannel.nack(msg, false, false); // Nack with no re-queue by default
                        logger.warn(`Queue Service: Message NACKed for queue '${queueName}'. It will NOT be re-queued immediately.`);
                    }
                }
            }, options); // Pass consumer options

            logger.info(`Queue Service: Started consuming from queue '${queueName}'.`);
        } catch (error) {
            logger.error(`Queue Service Error: Failed to start consuming from queue '${queueName}': ${error.message}`, error);
            throw error; // Re-throw to indicate a critical setup failure
        }
    };

    /**
     * Initiates the setup for all known queues by asserting them.
     * This should be called once during application startup.
     * @returns {Promise<void>}
     */
    const setupQueues = async () => {
        logger.info('Queue Service: Initiating queue setup...');
        for (const queueName of Object.values(QUEUE_NAMES)) {
            try {
                await assertQueue(queueName);
            } catch (error) {
                logger.error(`Queue Service Error: Critical failure to assert queue '${queueName}' during startup.`, error);
                // Depending on criticality, you might want to exit the process here
                // process.exit(1);
            }
        }
        logger.info('Queue Service: All configured queues asserted successfully.');
    };

    return {
        QUEUE_NAMES, // Expose queue names for other services
        assertQueue,
        publishToQueue,
        consumeFromQueue,
        setupQueues,
    };
};
