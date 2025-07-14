/**
 * @file This file initializes a central application-wide EventEmitter
 * and registers all event handlers. It serves as the hub for
 * asynchronous communication between different parts of the application,
 * promoting a loosely coupled architecture.
 */

const EventEmitter = require('events');
const logger = require('../config/logger');

/**
 * Custom EventEmitter class for better type hinting and potential future extensions.
 * Inherits all capabilities from Node.js's native EventEmitter.
 * @extends EventEmitter
 */
class AppEventEmitter extends EventEmitter {}

/**
 * The singleton instance of the application's event emitter.
 * All modules should use this instance to emit and listen for events.
 * @type {AppEventEmitter}
 */
const eventEmitter = new AppEventEmitter();

// --- Centralized Error Handling for Events ---
/**
 * Registers a global error listener for the event emitter.
 * This catches any errors emitted by `eventEmitter.emit('error', err)`
 * or errors thrown within an event listener that are not caught otherwise.
 * It's crucial for preventing uncaught exceptions in event-driven code.
 *
 * @param {Error} err - The error object emitted by an event.
 */
eventEmitter.on('error', (err) => {
    logger.error('Central Event Emitter Error:', err.message, err.stack);
    // Depending on the severity, you might want to send alerts here
    // or take specific recovery actions.
});

// --- Register All Event Listeners ---
// These `require` statements ensure that your event listener modules
// are loaded and their `eventEmitter.on()` calls are executed,
// registering their respective callbacks with the central `eventEmitter`.
logger.info('Registering application event listeners...');
require('./nftEvents'); // Contains listeners for NFT-related events
require('./userEvents'); // Contains listeners for User-related events
// Add other event listener files as your application grows, e.g.:
// require('./marketplaceEvents');
// require('./auctionEvents');
// require('./notificationEvents');
logger.info('All event listeners registered.');

module.exports = { eventEmitter };
