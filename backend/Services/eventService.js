// services/eventService.js
const { eventEmitter } = require('../events');
const logger = require('../config/logger');

/**
 * Publishes an event to the internal event emitter.
 * @param {string} eventName - The name of the event.
 * @param {any[]} args - Arguments to pass to the event listeners.
 */
const publishEvent = (eventName, ...args) => {
    logger.debug(`Publishing event: ${eventName}`);
    eventEmitter.emit(eventName, ...args);
};

module.exports = {
    publishEvent
};
