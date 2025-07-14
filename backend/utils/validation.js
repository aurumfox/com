/**
 * @file This file centralizes custom validation functions used across the backend.
 * These functions are designed to be integrated with validation libraries like Joi
 * via custom validators (e.g., Joi.custom()).
 */

const logger = require('../config/logger');
const { PublicKey } = require('@solana/web3.js'); // РАСКОММЕНТИРОВАНО
const isURL = require('validator/lib/isURL');    // ДОБАВЛЕНО: Убедитесь, что 'validator' установлен (npm install validator)
const mongoose = require('mongoose'); // Assuming mongoose is installed and configured


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
        new PublicKey(address);
        return true;
    } catch (e) {
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
function isValidObjectId(id) {
    if (typeof id !== 'string' || !id) {
        logger.debug(`Invalid ObjectId: Not a string or empty.`);
        return false;
    }
    const isValid = mongoose.Types.ObjectId.isValid(id);
    if (!isValid) {
        logger.debug(`Invalid ObjectId format: "${id}"`);
    }
    return isValid;
}

/**
 * Validates if a given string is a valid URL.
 * Uses the 'validator' library for robust URL validation.
 *
 * @param {string} url - The string to validate as a URL.
 * @returns {boolean} - True if the URL is valid, false otherwise.
 */
function isValidURL(url) {
    if (typeof url !== 'string') {
        logger.debug(`Invalid URL: Not a string.`);
        return false;
    }
    if (url.trim() === '') return true; // Разрешаем пустую строку, если это допустимо для вашего сценария
    return isURL(url, { require_protocol: true }); // Требуем http/https
}


module.exports = {
    isValidSolanaAddress,
    isValidObjectId,
    isValidURL, // ДОБАВЛЕНО
};
