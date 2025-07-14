/**
 * @file This file centralizes custom validation functions used across the backend.
 * These functions are designed to be integrated with validation libraries like Joi
 * via custom validators (e.g., Joi.custom()), or used directly in Mongoose schemas.
 */

const logger = require('../config/logger');
const mongoose = require('mongoose'); // Необходим для isValidObjectId

// ИМПОРТ ДЛЯ РЕАЛЬНОЙ ВАЛИДАЦИИ SOLANA-АДРЕСОВ
// Вы должны установить `@solana/web3.js`: `npm install @solana/web3.js`
const { PublicKey } = require('@solana/web3.js'); 

/**
 * Валидирует, является ли данная строка действительным форматом публичного ключа Solana (адреса кошелька).
 *
 * Эта функция выполняет надежную проверку с использованием конструктора `PublicKey` из `@solana/web3.js`.
 * Она пытается создать экземпляр PublicKey, который выдаст ошибку, если формат адреса недействителен.
 *
 * @param {string} address - Строка для валидации как адрес кошелька Solana.
 * @returns {boolean} - True, если адрес является действительным форматом публичного ключа Solana, false в противном случае.
 */
function isValidSolanaAddress(address) {
    if (typeof address !== 'string' || !address) {
        logger.debug(`[Validation] Invalid Solana address: Not a string or empty. Value: ${address}`);
        return false;
    }
    // Solana-адреса имеют длину от 32 до 44 символов в кодировке Base58.
    // Хотя PublicKey проверит это, это быстрый отказ.
    if (address.length < 32 || address.length > 44) {
        logger.debug(`[Validation] Invalid Solana address length: "${address}"`);
        return false;
    }

    try {
        new PublicKey(address); // Попытка создать экземпляр PublicKey.
        return true; // Если ошибок нет, формат действителен.
    } catch (e) {
        // Логируем конкретную ошибку для отладки, но возвращаем false для недействительного адреса.
        logger.debug(`[Validation] Invalid Solana address "${address}": ${e.message}`);
        return false;
    }
}

/**
 * Валидирует, является ли данная строка действительным форматом MongoDB ObjectId.
 *
 * Эта функция использует метод `ObjectId.isValid()` Mongoose для проверки формата.
 * Это исключительно проверка формата и не проверяет, существует ли идентификатор в базе данных.
 *
 * @param {string} id - Строка для валидации как MongoDB ObjectId.
 * @returns {boolean} - True, если идентификатор является действительным форматом MongoDB ObjectId, false в противном случае.
 */
function isValidObjectId(id) {
    if (typeof id !== 'string' || !id) {
        logger.debug(`[Validation] Invalid ObjectId: Not a string or empty. Value: ${id}`);
        return false;
    }
    // ObjectId MongoDB всегда имеет длину 24 шестнадцатеричных символа.
    // Это быстрый отказ перед вызовом Mongoose.
    if (id.length !== 24 || !/^[0-9a-fA-F]+$/.test(id)) {
        logger.debug(`[Validation] Invalid ObjectId format (length/chars): "${id}"`);
        return false;
    }

    const isValid = mongoose.Types.ObjectId.isValid(id);
    if (!isValid) {
        logger.debug(`[Validation] Invalid ObjectId format (Mongoose check): "${id}"`);
    }
    return isValid;
}

module.exports = {
    isValidSolanaAddress,
    isValidObjectId,
};
