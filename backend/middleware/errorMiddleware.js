const ApiError = require('../utils/ApiError');
const logger = require('../config/logger');

/**
 * Middleware to handle 404 Not Found errors.
 * If a request reaches this middleware, it means no route handled the request.
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 * @param {function} next - Express next middleware function.
 */
const notFound = (req, res, next) => {
    // Create an ApiError for 404, which will be caught by the general errorHandler
    const error = new ApiError(`Not Found - ${req.originalUrl}`, 404);
    next(error);
};

/**
 * Centralized error handling middleware.
 * This middleware catches errors from preceding middlewares and route handlers.
 * It formats the error response consistently for the client.
 *
 * @param {Error} err - The error object. Can be a standard Error, an ApiError, or a Mongoose/JWT error.
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 * @param {function} next - Express next middleware function (not used for terminal error handling).
 */
const errorHandler = (err, req, res, next) => {
    // Initialize response status and message based on the error
    let statusCode = err.statusCode || 500;
    let message = err.message || 'Internal Server Error';
    let details = err.details || []; // Ensure details is an array, default to empty

    // Log the error
    // Log 5xx errors as 'error', 4xx errors as 'warn' or 'info'
    if (statusCode >= 500) {
        logger.error(`Server Error (${statusCode}): ${message}`, err.stack);
        if (details.length > 0) {
            logger.error('Error Details:', details);
        }
    } else {
        logger.warn(`Client Error (${statusCode}): ${message}`);
        if (details.length > 0) {
            logger.debug('Error Details:', details); // Use debug for detailed client error info
        }
    }

    // --- Mongoose Error Handling ---
    // Mongoose Bad ObjectId (e.g., GET /api/posts/invalid_id)
    if (err.name === 'CastError' && err.kind === 'ObjectId') {
        statusCode = 404; // Often treated as Not Found for invalid IDs
        message = `Resource not found with ID '${err.value}'.`;
        details = [`The ID provided '${err.value}' is not a valid MongoDB ObjectId format.`];
    }

    // Mongoose Duplicate Key Error (code 11000)
    if (err.code === 11000) {
        statusCode = 409; // Conflict status code is more appropriate than 400 for duplicates
        const field = Object.keys(err.keyValue).join(', '); // Get the field that caused the duplicate
        const value = Object.values(err.keyValue).join(', '); // Get the value that caused the duplicate
        message = `Duplicate entry for '${field}': '${value}' already exists.`;
        details = [`A record with the provided ${field} (${value}) already exists. Please use a different value.`];
    }

    // Mongoose Validation Error (from schema validation before saving)
    if (err.name === 'ValidationError') {
        statusCode = 400; // Bad Request
        message = 'Validation Failed';
        // Map Mongoose validation errors into a structured details array
        details = Object.values(err.errors).map(val => ({
            field: val.path, // Path to the field (e.g., 'name', 'email')
            message: val.message // Mongoose's validation error message
        }));
    }

    // --- JWT (JSON Web Token) Errors ---
    if (err.name === 'JsonWebTokenError') {
        statusCode = 401; // Unauthorized
        message = 'Invalid authentication token.';
        details = ['The provided authentication token is invalid or malformed. Please log in again.'];
    }
    if (err.name === 'TokenExpiredError') {
        statusCode = 401; // Unauthorized
        message = 'Authentication token expired.';
        details = ['Your authentication token has expired. Please log in again.'];
    }

    // --- Final Response ---
    res.status(statusCode).json({
        success: false,
        message: message,
        // Include stack trace only in development environment for debugging
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
        // Include details only if available
        details: details.length > 0 ? details : undefined
    });
};

module.exports = {
    notFound,
    errorHandler
};
