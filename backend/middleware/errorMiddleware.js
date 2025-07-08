const ApiError = require('../utils/ApiError');
const logger = require('../config/logger');

const notFound = (req, res, next) => {
    const error = new ApiError(`Not Found - ${req.originalUrl}`, 404);
    next(error);
};

const errorHandler = (err, req, res, next) => {
    let statusCode = err.statusCode || 500;
    let message = err.message || 'Internal Server Error';
    let details = err.details || []; // For validation errors etc.

    // Log the error
    if (statusCode >= 500) {
        logger.error(`Server Error: ${message}`, err.stack);
    } else {
        logger.warn(`Client Error (${statusCode}): ${message}`);
        if (details.length > 0) {
            logger.debug('Error Details:', details);
        }
    }

    // Mongoose Bad ObjectId
    if (err.name === 'CastError' && err.kind === 'ObjectId') {
        statusCode = 404;
        message = `Resource not found: Invalid ID`;
        details = [`The ID provided '${err.value}' is not a valid MongoDB ObjectId.`];
    }

    // Mongoose Duplicate Key Error
    if (err.code === 11000) {
        statusCode = 400;
        const field = Object.keys(err.keyValue).join(', ');
        message = `Duplicate field value: ${field} already exists.`;
        details = [`A record with the provided ${field} already exists. Please use a different value.`];
    }

    // Mongoose Validation Error
    if (err.name === 'ValidationError') {
        statusCode = 400;
        message = 'Validation Failed';
        details = Object.values(err.errors).map(val => val.message);
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        statusCode = 401;
        message = 'Invalid token, please login again.';
        details = ['The provided authentication token is invalid or malformed.'];
    }
    if (err.name === 'TokenExpiredError') {
        statusCode = 401;
        message = 'Token expired, please login again.';
        details = ['Your authentication token has expired.'];
    }

    // Send error response
    res.status(statusCode).json({
        success: false,
        message: message,
        // Only send stack trace in development mode
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
        details: details.length > 0 ? details : undefined // Only include if details exist
    });
};

module.exports = {
    notFound,
    errorHandler
};
