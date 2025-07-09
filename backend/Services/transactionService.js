/**
 * @file Service for managing distributed transactions using the Compensating Transaction pattern (Saga pattern).
 * This service allows for multi-step operations that can be rolled back (compensated)
 * if a later step fails, ensuring data consistency across disparate systems (e.g., database and blockchain).
 */

/**
 * Stores pending compensation functions for each active transaction ID.
 * Key: transactionId (string)
 * Value: Array<Function> - An array of asynchronous functions to execute for rollback.
 * Each function represents a step's compensation and is added in the order of the step execution.
 */
const activeCompensations = new Map();

/**
 * Creates an instance of the Transaction Service.
 * This service manages the lifecycle of distributed transactions and their compensation actions.
 *
 * @param {object} dependencies - Injected dependencies from the Awilix container.
 * @param {import('winston').Logger} dependencies.logger - The logger instance.
 * @returns {object} The transaction service instance.
 */
module.exports = ({ logger }) => { // Correct Awilix injection

    /**
     * Initiates a new multi-step transaction.
     * A new entry is created in `activeCompensations` for the given `transactionId`.
     *
     * @param {string} transactionId - A unique identifier for this transaction. It's recommended
     * to use a UUID for this purpose (e.g., from `uuid` library).
     * @throws {Error} If a transaction with the given ID is already active.
     */
    const startTransaction = (transactionId) => {
        if (activeCompensations.has(transactionId)) {
            logger.warn(`Transaction Service: Transaction ${transactionId} already active. Overwriting existing transaction.`);
            // Or throw an error if you want stricter control:
            // throw new Error(`Transaction ${transactionId} is already active.`);
        }
        activeCompensations.set(transactionId, []);
        logger.info(`Transaction Service: Started transaction: ${transactionId}`);
    };

    /**
     * Adds a compensation action for a step within the current transaction.
     * Compensation functions are stored and will be executed in reverse order if rollback is needed.
     *
     * @param {string} transactionId - The ID of the current transaction.
     * @param {Function} compensateFn - An asynchronous function to call if the transaction needs to be rolled back.
     * This function should encapsulate the logic to reverse the effects of a single successful step.
     * @throws {Error} If no transaction with the given ID is active.
     */
    const addCompensation = (transactionId, compensateFn) => {
        const compensations = activeCompensations.get(transactionId);
        if (!compensations) {
            logger.error(`Transaction Service: Attempted to add compensation for non-existent or inactive transaction: ${transactionId}.`);
            throw new Error(`Transaction ${transactionId} not found or inactive.`);
        }
        if (typeof compensateFn !== 'function') {
            logger.error(`Transaction Service: Invalid compensation function provided for transaction ${transactionId}.`);
            throw new Error('Compensation action must be a function.');
        }
        compensations.push(compensateFn);
        logger.debug(`Transaction Service: Added compensation action for transaction: ${transactionId}. Total actions: ${compensations.length}`);
    };

    /**
     * Commits the transaction. All registered compensation actions for this transaction
     * are cleared, indicating that all steps have successfully completed and no rollback is needed.
     *
     * @param {string} transactionId - The ID of the transaction to commit.
     * @returns {boolean} True if the transaction was found and committed, false otherwise.
     */
    const commitTransaction = (transactionId) => {
        if (activeCompensations.delete(transactionId)) {
            logger.info(`Transaction Service: Committed transaction: ${transactionId}. All compensations cleared.`);
            return true;
        } else {
            logger.warn(`Transaction Service: Attempted to commit non-existent or already committed transaction: ${transactionId}.`);
            return false;
        }
    };

    /**
     * Rolls back the transaction by executing all registered compensation actions.
     * Compensation actions are executed in the reverse order of their addition.
     * This function is typically called when an error occurs during a transaction.
     *
     * @param {string} transactionId - The ID of the transaction to roll back.
     * @returns {Promise<void>} A Promise that resolves once all compensations have been attempted.
     * Note: Individual compensation failures are logged but do not stop the overall rollback process.
     */
    const rollbackTransaction = async (transactionId) => {
        const compensations = activeCompensations.get(transactionId);
        if (!compensations) {
            logger.warn(`Transaction Service: No active compensations found for rollback of transaction: ${transactionId}.`);
            return;
        }

        logger.error(`Transaction Service: Initiating rollback for transaction ${transactionId} due to failure.`);
        // Execute compensations in reverse order of addition
        const reversedCompensations = [...compensations].reverse(); // Create a copy before reversing

        for (const compensateFn of reversedCompensations) {
            try {
                // Ensure compensation functions are awaited if they are async
                await compensateFn();
                logger.debug(`Transaction Service: Successfully executed compensation for transaction: ${transactionId}.`);
            } catch (compErr) {
                // Log the error but continue with other compensations.
                // A failed compensation is a critical issue that needs attention.
                logger.critical(`Transaction Service Error: Failed to execute compensation action for transaction ${transactionId}: ${compErr.message}. This may lead to data inconsistency!`, compErr);
                // Consider adding metrics/alerts here for failed compensations
            }
        }

        // Clean up the transaction regardless of whether all compensations succeeded
        activeCompensations.delete(transactionId);
        logger.info(`Transaction Service: Rollback complete for transaction: ${transactionId}.`);
    };

    /**
     * Retrieves the status of a given transaction.
     * @param {string} transactionId - The ID of the transaction.
     * @returns {'active' | 'committed' | 'rolled_back' | 'unknown'} The status of the transaction.
     */
    const getTransactionStatus = (transactionId) => {
        if (activeCompensations.has(transactionId)) {
            return 'active';
        }
        // This service only tracks 'active' transactions. Once committed or rolled back,
        // they are removed. For full historical status, a persistent store would be needed.
        return 'unknown'; // Could differentiate committed/rolled_back if a history was kept
    };


    // Optionally, for debugging/monitoring, expose the map size
    const getActiveTransactionCount = () => activeCompensations.size;

    return {
        startTransaction,
        addCompensation,
        commitTransaction,
        rollbackTransaction,
        getTransactionStatus,
        getActiveTransactionCount, // Exposed for monitoring
    };
};
