/**
 * @file Service for publishing and managing internal application events.
 * Uses an EventEmitter pattern to allow for decoupled communication between different
 * parts of the application.
 */

// Note: The eventEmitter itself should ideally be registered in the Awilix container
// if it's a single, shared instance.
// For now, assuming `../events` exports a singleton EventEmitter instance.

/**
 * Creates an instance of the Event Service.
 * This service provides a standardized way to publish events within the application.
 *
 * @param {object} dependencies - Injected dependencies.
 * @param {import('events').EventEmitter} dependencies.eventEmitter - The application's global EventEmitter instance.
 * @param {import('winston').Logger} dependencies.logger - The logger instance.
 * @returns {object} The event service instance.
 */
module.exports = ({ eventEmitter, logger }) => { // Correct Awilix injection

    /**
     * Publishes an event to the internal event emitter.
     * Services or modules interested in this event can subscribe to it.
     *
     * @param {string} eventName - The name of the event to publish.
     * @param {...any} args - Arguments to pass to the event listeners.
     * @returns {boolean} True if the event has listeners, false otherwise.
     */
    const publishEvent = (eventName, ...args) => {
        if (!eventEmitter) {
            logger.error(`Event Service: EventEmitter instance not available. Cannot publish event: ${eventName}`);
            return false;
        }
        logger.debug(`Event Service: Publishing event '${eventName}' with args: ${JSON.stringify(args)}`);
        const emitted = eventEmitter.emit(eventName, ...args);
        if (!emitted) {
            logger.debug(`Event Service: Event '${eventName}' was published but had no listeners.`);
        }
        return emitted;
    };

    /**
     * Subscribes a listener function to a specific event.
     * @param {string} eventName - The name of the event to subscribe to.
     * @param {Function} listener - The function to call when the event is published.
     * @returns {import('events').EventEmitter} The EventEmitter instance, for chaining.
     */
    const subscribeToEvent = (eventName, listener) => {
        if (!eventEmitter) {
            logger.error(`Event Service: EventEmitter instance not available. Cannot subscribe to event: ${eventName}`);
            // Return a dummy object or throw an error based on desired behavior
            return { on: () => {}, once: () => {}, off: () => {}, removeListener: () => {} };
        }
        logger.debug(`Event Service: Subscribing to event '${eventName}'.`);
        return eventEmitter.on(eventName, listener);
    };

    /**
     * Subscribes a listener function to a specific event only once.
     * The listener will be removed after the event is emitted the first time.
     * @param {string} eventName - The name of the event to subscribe to.
     * @param {Function} listener - The function to call when the event is published.
     * @returns {import('events').EventEmitter} The EventEmitter instance, for chaining.
     */
    const subscribeToEventOnce = (eventName, listener) => {
        if (!eventEmitter) {
            logger.error(`Event Service: EventEmitter instance not available. Cannot subscribe once to event: ${eventName}`);
            return { on: () => {}, once: () => {}, off: () => {}, removeListener: () => {} };
        }
        logger.debug(`Event Service: Subscribing once to event '${eventName}'.`);
        return eventEmitter.once(eventName, listener);
    };

    /**
     * Unsubscribes a listener function from a specific event.
     * @param {string} eventName - The name of the event to unsubscribe from.
     * @param {Function} listener - The listener function to remove.
     * @returns {import('events').EventEmitter} The EventEmitter instance, for chaining.
     */
    const unsubscribeFromEvent = (eventName, listener) => {
        if (!eventEmitter) {
            logger.error(`Event Service: EventEmitter instance not available. Cannot unsubscribe from event: ${eventName}`);
            return { on: () => {}, once: () => {}, off: () => {}, removeListener: () => {} };
        }
        logger.debug(`Event Service: Unsubscribing listener from event '${eventName}'.`);
        return eventEmitter.removeListener(eventName, listener);
    };

    /**
     * Removes all listeners for a given event, or all listeners if no eventName is specified.
     * Use with caution.
     * @param {string} [eventName] - The name of the event to remove all listeners from.
     * @returns {import('events').EventEmitter} The EventEmitter instance, for chaining.
     */
    const removeAllListeners = (eventName) => {
        if (!eventEmitter) {
            logger.error(`Event Service: EventEmitter instance not available. Cannot remove all listeners for event: ${eventName || 'all'}`);
            return { on: () => {}, once: () => {}, off: () => {}, removeListener: () => {} };
        }
        logger.warn(`Event Service: Removing all listeners for event '${eventName || 'all events'}'. Use with caution!`);
        return eventEmitter.removeAllListeners(eventName);
    };

    return {
        publishEvent,
        subscribeToEvent,
        subscribeToEventOnce,
        unsubscribeFromEvent,
        removeAllListeners,
    };
};
