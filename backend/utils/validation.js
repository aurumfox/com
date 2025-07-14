/**
 * @file This file centralizes custom validation functions used across the backend.
 * These functions are designed to be integrated with validation libraries like Joi
 * via custom validators (e.g., Joi.custom()).
 */

const logger = require('../config/logger');

// IMPORTANT: For real Solana blockchain interactions, uncomment and use @solana/web3.js for robust validation.
// You must install it: `npm install @solana/web3.js`
const { PublicKey } = require('@solana/web3.js'); // Keeping it commented out for now as per original


/**
 * Validates if a given string is a valid Solana public key (wallet address) format.
 *
 * This function performs a robust check using `@solana/web3.js`'s `PublicKey`
 * constructor. It attempts to create a PublicKey instance, which will throw
 * an error if the address format is invalid.
 *
 * @param {string} address - The string to validate as a Solana wallet address.
 * @returns {boolean} - True if the address is a valid Solana public key format, false otherwise.
 */
function isValidSolanaAddress(address) {
    if (typeof address !== 'string' || !address) {
        logger.debug(`Invalid Solana address: Not a string or empty.`);
        return false;
    }

    try {
        // Attempt to create a PublicKey instance.
        // This constructor throws an error for invalid Base58 strings or incorrect lengths.
        new PublicKey(address);
        return true; // If no error, it's a valid format.
    } catch (e) {
        // Log the specific error for debugging purposes, but return false for invalid.
        logger.debug(`Invalid Solana address "${address}": ${e.message}`);
        return false;
    }
}

/**
 * Validates if a given string is a valid MongoDB ObjectId format.
 *
 * This function uses Mongoose's `ObjectId.isValid()` method to check the format.
 * It's purely a format check and doesn't verify if an ID exists in the database.
 *
 * @param {string} id - The string to validate as a MongoDB ObjectId.
 * @returns {boolean} - True if the ID is a valid MongoDB ObjectId format, false otherwise.
 */
// Assuming mongoose is available in your project, you'll need to import it here
// or pass it as an argument if this function were part of a more complex utility.
// For simplicity, we'll assume it's imported where this validator is used or globally available.
// If not, you might need to adjust your setup to make Mongoose available, or use a simpler regex.
const mongoose = require('mongoose'); // Assuming mongoose is installed and configured

function isValidObjectId(id) {
    if (typeof id !== 'string' || !id) {
        logger.debug(`Invalid ObjectId: Not a string or empty.`);
        return false;
    }
    // Mongoose's ObjectId.isValid provides the most robust check.
    const isValid = mongoose.Types.ObjectId.isValid(id);
    if (!isValid) {
        logger.debug(`Invalid ObjectId format: "${id}"`);
    }
    return isValid;
}


module.exports = {
    isValidSolanaAddress,
    isValidObjectId, // Export the new ObjectId validator
};
