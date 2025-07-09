/**
 * @file Service for creating and managing Circuit Breakers using Opossum.
 * Circuit breakers are used to prevent cascading failures in a distributed system
 * by stopping requests to services that are likely to fail.
 */

const CircuitBreaker = require('opossum');

/**
 * Creates a Circuit Breaker for a given asynchronous function.
 * This helps to prevent cascading failures when an external service is unhealthy.
 *
 * @param {object} dependencies - Injected dependencies.
 * @param {import('winston').Logger} dependencies.logger - The logger instance.
 * @returns {object} An object containing the `createCircuitBreaker` function.
 */
module.exports = ({ logger }) => {

    /**
     * Creates and configures an Opossum Circuit Breaker.
     *
     * @param {Function} actionFn - The asynchronous function to protect (e.g., a call to Solana API, external HTTP call).
     * @param {string} name - A unique and descriptive name for this circuit breaker (e.g., 'solana-rpc', 'nft-storage-api').
     * @param {object} [options={}] - Custom options for the circuit breaker.
     * @param {number} [options.timeout=5000] - Time in ms before the actionFn is considered timed out.
     * @param {number} [options.errorThresholdPercentage=50] - Percentage of failures to open the circuit.
     * @param {number} [options.resetTimeout=60000] - Time in ms before attempting to close a half-open circuit.
     * @param {number} [options.rollingCountTimeout=10000] - Duration of the statistical rolling window in ms.
     * @param {number} [options.rollingCountBuckets=10] - Number of buckets in the rolling window.
     * @param {boolean} [options.enabled=true] - Whether the circuit breaker is initially enabled.
     * @param {Function} [options.errorFilter] - A function (err) => boolean to determine if an error should count towards the error threshold.
     * @param {Function} [fallbackFn] - An optional fallback function to execute when the circuit is open or the action fails.
     * @returns {CircuitBreaker} The configured CircuitBreaker instance.
     */
    const createCircuitBreaker = (actionFn, name, options = {}, fallbackFn = null) => {
        const defaultOptions = {
            timeout: 5000, // Increased default timeout as external calls can be slower
            errorThresholdPercentage: 50, // When 50% of requests fail, open the circuit
            resetTimeout: 60000, // After 60 seconds, try to close the circuit (longer than before for recovery)
            rollingCountTimeout: 10000, // How long to consider failures for the threshold (e.g., 10 seconds)
            rollingCountBuckets: 10, // Number of 1-second buckets for rolling count
            name: name, // Unique name for this breaker
            enabled: true, // Circuit breaker starts enabled
            // You can also add `volumeThreshold` here if you want to only open the circuit after a certain number of requests have been made within the rolling window.
            // volumeThreshold: 5, // e.g., require at least 5 requests before calculating errorThresholdPercentage
        };

        const mergedOptions = { ...defaultOptions, ...options };

        // Custom error filter example: only count 5xx errors for HTTP services
        // If `actionFn` calls an HTTP service, you might want to only trip the breaker
        // on server-side errors (5xx) and not client-side errors (4xx) or validation errors.
        if (typeof mergedOptions.errorFilter !== 'function') {
            mergedOptions.errorFilter = (err) => {
                // Example: for HTTP errors, only consider 5xx as a circuit-breaking error
                // This assumes `err.response.status` exists for errors from libraries like Axios.
                // You'll need to adapt this based on the error structure of your `actionFn`.
                if (err && err.response && err.response.status >= 500 && err.response.status < 600) {
                    logger.error(`Circuit Breaker "${name}": Identified 5xx error (${err.response.status}). Counting towards circuit opening.`, err);
                    return true;
                }
                // Also count general non-HTTP errors (e.g., network timeout, service unavailable)
                if (err && (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT' || err.name === 'TimeoutError' || err.message.includes('network error'))) {
                     logger.error(`Circuit Breaker "${name}": Identified network error (${err.code || err.name}). Counting towards circuit opening.`, err);
                     return true;
                }
                logger.debug(`Circuit Breaker "${name}": Ignoring non-critical error for circuit calculation: ${err.message}`, err);
                return false; // Don't count other errors (e.g., 4xx, validation)
            };
        }

        const breaker = new CircuitBreaker(actionFn, mergedOptions);

        // Optional: Attach a fallback function
        if (typeof fallbackFn === 'function') {
            breaker.fallback(fallbackFn);
        } else {
            // Default fallback if none provided and circuit opens
            breaker.fallback((err, ...args) => {
                const msg = `Circuit Breaker "${name}" is OPEN or action failed. Default fallback triggered. Original error: ${err ? err.message : 'Unknown error'}`;
                logger.warn(msg, err);
                // Return a default value or throw a specific error that the caller can handle
                throw new Error(`Service temporarily unavailable via ${name} circuit.`);
            });
        }


        // --- Event Listeners for better logging and monitoring ---
        breaker.on('open', () => logger.warn(`Circuit Breaker "${name}" is OPEN! All requests to '${name}' will be rejected. Failure Threshold: ${mergedOptions.errorThresholdPercentage}%, Reset Timeout: ${mergedOptions.resetTimeout / 1000}s`));
        breaker.on('halfOpen', () => logger.info(`Circuit Breaker "${name}" is HALF-OPEN. Allowing a single test request to check service health.`));
        breaker.on('close', () => logger.info(`Circuit Breaker "${name}" is CLOSED. Service '${name}' is healthy again and requests are flowing normally.`));
        breaker.on('fallback', (err, result) => {
            logger.warn(`Circuit Breaker "${name}" fallback triggered. Error: ${err ? err.message : 'N/A'}. Fallback Result (if any): ${result ? JSON.stringify(result).substring(0, 100) : 'N/A'}`);
        });
        breaker.on('success', (result, latency) => logger.debug(`Circuit Breaker "${name}" request succeeded in ${latency}ms.`));
        breaker.on('reject', () => logger.warn(`Circuit Breaker "${name}" request rejected (circuit is OPEN).`));
        breaker.on('timeout', () => logger.error(`Circuit Breaker "${name}" action timed out (${mergedOptions.timeout}ms).`));
        breaker.on('healthCheckFailed', (err) => logger.error(`Circuit Breaker "${name}" health check failed: ${err.message}`));
        breaker.on('fire', () => logger.debug(`Circuit Breaker "${name}" firing action.`)); // Useful for seeing every invocation

        // It's good practice to monitor breaker stats in production.
        // You can expose metrics via Prometheus or other monitoring tools.
        // breaker.on('status', (status) => logger.debug(`Circuit Breaker "${name}" status:`, status));


        return breaker;
    };

    return {
        createCircuitBreaker,
    };
};
