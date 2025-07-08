// config/rabbitmq.js
const amqp = require('amqplib');
const logger = require('./logger');
const config = require('./environments')[process.env.NODE_ENV || 'development'];

let channel = null;
let connection = null;

const connectRabbitMQ = async () => {
    try {
        connection = await amqp.connect(config.rabbitmqUri);
        channel = await connection.createChannel();
        logger.info('Connected to RabbitMQ');

        // Optional: Assert a queue for general events or specific tasks
        await channel.assertQueue('nft_processing_queue', { durable: true });
        await channel.assertQueue('notification_queue', { durable: true });

        connection.on('close', () => {
            logger.error('RabbitMQ connection closed! Reconnecting...');
            setTimeout(connectRabbitMQ, 5000); // Attempt to reconnect after 5 seconds
        });
        connection.on('error', (err) => {
            logger.error('RabbitMQ connection error:', err);
        });

    } catch (error) {
        logger.error('Failed to connect to RabbitMQ:', error.message);
        setTimeout(connectRabbitMQ, 5000); // Retry connection
    }
};

const getRabbitMQChannel = () => {
    if (!channel) {
        logger.warn('RabbitMQ channel not available. Ensure connectRabbitMQ has been called.');
    }
    return channel;
};

const disconnectRabbitMQ = async () => {
    if (channel) {
        await channel.close();
        channel = null;
    }
    if (connection) {
        await connection.close();
        connection = null;
        logger.info('Disconnected from RabbitMQ');
    }
};

module.exports = {
    connectRabbitMQ,
    getRabbitMQChannel,
    disconnectRabbitMQ
};
