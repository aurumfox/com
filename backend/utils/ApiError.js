/**
 * @file Defines a custom ApiError class for structured API error handling.
 * This class extends the built-in Error class and adds properties for HTTP status code,
 * an operational flag, and a details array for more specific error information.
 */

class ApiError extends Error {
    /**
     * Creates an instance of ApiError.
     * @param {string} message - A human-readable error message.
     * @param {number} [statusCode=500] - The HTTP status code associated with the error (e.g., 400, 404, 500). Defaults to 500.
     * @param {Array<string|object>} [details=[]] - An optional array of more specific error details, often used for validation errors.
     * @param {string} [name='ApiError'] - The name of the error. Defaults to 'ApiError'.
     */
    constructor(message, statusCode = 500, details = [], name = 'ApiError') {
        super(message); // Call the parent Error constructor
        this.name = name; // Set the error name
        this.statusCode = statusCode; // HTTP status code for the response
        this.isOperational = true; // Indicates errors that are expected and handled,
                                   // allowing graceful responses (e.g., to distinguish from unhandled exceptions).
        this.details = details; // Additional specific error information (e.g., field-level validation errors)

        // Captures the stack trace, excluding the constructor call itself, for better debugging.
        Error.captureStackTrace(this, this.constructor);
    }

    // --- Static Helper Methods for Common HTTP Errors ---
    // These methods provide a convenient way to create ApiError instances
    // without repeating statusCode values.

    /**
     * Creates an ApiError for a 400 Bad Request.
     * @param {string} message - The error message.
     * @param {Array<string|object>} [details=[]] - Specific error details (e.g., validation errors).
     * @returns {ApiError}
     */
    static badRequest(message = 'Bad Request', details = []) {
        return new ApiError(message, 400, details, 'BadRequestError');
    }

    /**
     * Creates an ApiError for a 401 Unauthorized.
     * @param {string} message - The error message.
     * @param {Array<string|object>} [details=[]] - Specific error details.
     * @returns {ApiError}
     */
    static unauthorized(message = 'Unauthorized', details = []) {
        return new ApiError(message, 401, details, 'UnauthorizedError');
    }

    /**
     * Creates an ApiError for a 403 Forbidden.
     * @param {string} message - The error message.
     * @param {Array<string|object>} [details=[]] - Specific error details.
     * @returns {ApiError}
     */
    static forbidden(message = 'Forbidden', details = []) {
        return new ApiError(message, 403, details, 'ForbiddenError');
    }

    /**
     * Creates an ApiError for a 404 Not Found.
     * @param {string} message - The error message.
     * @param {Array<string|object>} [details=[]] - Specific error details.
     * @returns {ApiError}
     */
    static notFound(message = 'Not Found', details = []) {
        return new ApiError(message, 404, details, 'NotFoundError');
    }

    /**
     * Creates an ApiError for a 409 Conflict.
     * @param {string} message - The error message.
     * @param {Array<string|object>} [details=[]] - Specific error details.
     * @returns {ApiError}
     */
    static conflict(message = 'Conflict', details = []) {
        return new ApiError(message, 409, details, 'ConflictError');
    }

    /**
     * Creates an ApiError for a 500 Internal Server Error.
     * This should generally be used for unexpected errors, or if you prefer to explicitly
     * throw a 500. For unhandled errors, a global error handler might convert them to 500.
     * @param {string} message - The error message.
     * @param {Array<string|object>} [details=[]] - Specific error details.
     * @returns {ApiError}
     */
    static internal(message = 'Internal Server Error', details = []) {
        return new ApiError(message, 500, details, 'InternalServerError');
    }

    /**
     * Creates an ApiError for a 503 Service Unavailable.
     * @param {string} message - The error message.
     * @param {Array<string|object>} [details=[]] - Specific error details.
     * @returns {ApiError}
     */
    static serviceUnavailable(message = 'Service Unavailable', details = []) {
        return new ApiError(message, 503, details, 'ServiceUnavailableError');
    }
}

module.exports = ApiError;
