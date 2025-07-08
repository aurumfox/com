// utils/asyncHandler.js
/**
 * Higher-order function to wrap async Express route handlers.
 * Catches errors and passes them to the next error middleware.
 * This avoids needing try-catch blocks in every async controller function.
 */
const asyncHandler = (fn) => (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;
