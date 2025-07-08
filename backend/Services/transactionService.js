// services/transactionService.js
// This service demonstrates a pattern for multi-step operations that might need rollback (compensation)
// if a later step fails, especially relevant in distributed systems or with external calls.

const logger = require('../config/logger');

// Store pending compensations
const pendingCompensations = new Map(); // Map<transactionId, Array<Function>>

/**
 * Initiates a multi-step transaction.
 * @param {string} transactionId - A unique ID for this transaction.
 */
const startTransaction = (transactionId) => {
    logger.info(`Transaction ${transactionId}: Started.`);
    pendingCompensations.set(transactionId, []);
};

/**
 * Adds a compensation action for a step in the transaction.
 * @param {string} transactionId - The ID of the current transaction.
 * @param {Function} compensateFn - A function to call if the transaction needs to be rolled back.
 */
const addCompensation = (transactionId, compensateFn) => {
    if (!pendingCompensations.has(transactionId)) {
        logger.warn(`Transaction ${transactionId}: Attempted to add compensation for non-existent transaction.`);
        return;
    }
    pendingCompensations.get(transactionId).push(compensateFn);
    logger.debug(`Transaction ${transactionId}: Added compensation action.`);
};

/**
 * Commits the transaction, clearing all compensation actions.
 * @param {string} transactionId - The ID of the transaction to commit.
 */
const commitTransaction = (transactionId) => {
    if (pendingCompensations.delete(transactionId)) {
        logger.info(`Transaction ${transactionId}: Committed successfully.`);
    } else {
        logger.warn(`Transaction ${transactionId}: Attempted to commit non-existent or already committed transaction.`);
    }
};

/**
 * Rolls back the transaction by executing all compensation actions.
 * @param {string} transactionId - The ID of the transaction to rollback.
 * @returns {Promise<void>}
 */
const rollbackTransaction = async (transactionId) => {
    const compensations = pendingCompensations.get(transactionId);
    if (!compensations) {
        logger.warn(`Transaction ${transactionId}: No compensations found for rollback.`);
        return;
    }

    logger.error(`Transaction ${transactionId}: Rolling back due to failure.`);
    for (const compensateFn of compensations.reverse()) { // Execute in reverse order of addition
        try {
            await compensateFn();
            logger.debug(`Transaction ${transactionId}: Executed compensation.`);
        } catch (compErr) {
            logger.error(`Transaction ${transactionId}: Failed to execute compensation action: ${compErr.message}`);
        }
    }
    pendingCompensations.delete(transactionId);
    logger.info(`Transaction ${transactionId}: Rollback complete.`);
};

module.exports = ({ logger }) => ({ // Injected logger
    startTransaction,
    addCompensation,
    commitTransaction,
    rollbackTransaction,
});
