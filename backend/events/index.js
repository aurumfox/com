// events/index.js
const EventEmitter = require('events');
const logger = require('../config/logger');

class AppEventEmitter extends EventEmitter {}

const eventEmitter = new AppEventEmitter();

// Centralized error handling for events
eventEmitter.on('error', (err) => {
    logger.error('Event emitter error:', err);
});

// Register all event listeners
require('./nftEvents');
require('./userEvents');

module.exports = { eventEmitter };
