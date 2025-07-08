// services/queueService.js
const { getRabbitMQChannel } = require('../config/rabbitmq');
const logger = require('../config/logger');

const QUEUE_NAMES = {
    NFT_PROCESSING: 'nft_processing_queue',
    NOTIFICATIONS: 'notification_queue',
    // Add other queue names as needed
};

/**
 * Publishes a message to a specified queue.
 * @param {string} queueName - The name of the queue.
 * @param {object} message - The message payload (will be JSON.stringified).
 * @returns {boolean} - True if message was sent, false otherwise.
 */
const publishToQueue = (queueName, message) => {
    const channel = getRabbitMQChannel();
    if (!channel) {
        logger.error(`Failed to publish to queue ${queueName}: RabbitMQ channel not available.`);
        return false;
    }
    try {
        const sent = channel.sendToQueue(queueName, Buffer.from(JSON.stringify(message)), { persistent: true });
        if (sent) {
            logger.info(`Message published to queue ${queueName}: ${JSON.stringify(message)}`);
        } else {
            logger.warn(`Message not immediately sent to queue ${queueName}. Buffer might be full.`);
        }
        return sent;
    } catch (error) {
        logger.error(`Error publishing to queue ${queueName}:`, error);
        return false;
    }
};

/**
 * Consumes messages from a specified queue.
 * This function should typically be called in a separate worker process or a dedicated consumer module.
 * @param {string} queueName - The name of the queue to consume from.
 * @param {Function} callback - The callback function to process each message.
 */
const consumeFromQueue = async (queueName, callback) => {
    const channel = getRabbitMQChannel();
    if (!channel) {
        logger.error(`Failed to consume from queue ${queueName}: RabbitMQ channel not available.`);
        return;
    }
    try {
        await channel.consume(queueName, async (msg) => {
            if (msg !== null) {
                try {
                    const content = JSON.parse(msg.content.toString());
                    logger.debug(`Received message from ${queueName}: ${JSON.stringify(content)}`);
                    await callback(content);
                    channel.ack(msg); // Acknowledge message processing
                } catch (error) {
                    logger.error(`Error processing message from queue ${queueName}:`, error);
                    channel.nack(msg); // Negative acknowledge (requeue or dead-letter)
                }
            }
        });
        logger.info(`Started consuming from queue: ${queueName}`);
    } catch (error) {
        logger.error(`Error consuming from queue ${queueName}:`, error);
    }
};

module.exports = ({ getRabbitMQChannel, logger }) => ({
    QUEUE_NAMES,
    publishToQueue,
    consumeFromQueue,
});
