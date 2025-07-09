/**
 * @file Higher-order function to wrap asynchronous Express route handlers.
 * This utility function eliminates the need for repetitive try-catch blocks
 * in every async controller or middleware function.
 */

/**
 * Higher-order function that takes an asynchronous Express route handler (or middleware)
 * and returns a new function that correctly handles errors.
 *
 * How it works:
 * 1. It receives an `fn` (your async route handler like `async (req, res, next) => { ... }`).
 * 2. It returns a new Express-compatible middleware function `(req, res, next) => { ... }`.
 * 3. Inside this returned function:
 * - `Promise.resolve(fn(req, res, next))`: Ensures that the execution of your `fn` is
 * wrapped in a Promise. If `fn` is an `async` function, it implicitly returns a Promise.
 * If `fn` is synchronous, `Promise.resolve()` wraps its return value in a resolved Promise.
 * - `.catch(next)`: If the Promise returned by `fn` rejects (i.e., an error is thrown
 * or a Promise inside `fn` rejects), this `.catch()` block will execute.
 * It then passes the caught error directly to Express's `next()` function.
 * Express's built-in error handling mechanism (or your custom error middleware)
 * will then pick up this error.
 *
 * @param {Function} fn - The asynchronous Express route handler or middleware function
 * (e.g., `async (req, res, next) => { ... }`).
 * @returns {Function} - A new Express middleware function that handles errors.
 */
const asyncHandler = (fn) => (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;
