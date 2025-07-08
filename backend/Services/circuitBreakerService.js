// services/circuitBreakerService.js
const CircuitBreaker = require('opossum');
const logger = require('../config/logger');

/**
 * Creates a Circuit Breaker for a given asynchronous function.
 * This helps to prevent cascading failures when an external service is unhealthy.
 * @param {Function} actionFn - The asynchronous function to protect (e.g., a call to Solana API).
 * @param {string} name - A unique name for this circuit breaker.
 * @param {object} options - Circuit Breaker options.
 * @returns {CircuitBreaker}
 */
const createCircuitBreaker = (actionFn, name, options = {}) => {
    const defaultOptions = {
        timeout: 3000, // If our function takes longer than 3 seconds, trigger a failure
        errorThresholdPercentage: 50, // When 50% of requests fail, open the circuit
        resetTimeout: 30000, // After 30 seconds, try to close the circuit
        rollingCountTimeout: 10000, // How long to consider failures for the threshold
        rollingCountBuckets: 10, // Number of buckets for rolling count
        name: name,
    };

    const breaker = new CircuitBreaker(actionFn, { ...defaultOptions, ...options });

    breaker.on('open', () => logger.warn(`Circuit Breaker "${name}" is OPEN! All requests failing.`));
    breaker.on('halfOpen', () => logger.info(`Circuit Breaker "${name}" is HALF-OPEN. Trying a single request.`));
    breaker.on('close', () => logger.info(`Circuit Breaker "${name}" is CLOSED. Service is healthy again.`));
    breaker.on('fallback', (err) => logger.error(`Circuit Breaker "${name}" fallback triggered: ${err.message}`));
    breaker.on('success', () => logger.debug(`Circuit Breaker "${name}" request succeeded.`));
    breaker.on('reject', () => logger.warn(`Circuit Breaker "${name}" request rejected (circuit open).`));

    return breaker;
};

module.exports = ({ logger }) => ({
    createCircuitBreaker,
});
