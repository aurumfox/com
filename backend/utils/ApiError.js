// utils/ApiError.js
class ApiError extends Error {
    constructor(message, statusCode, details = []) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true; // Indicates errors that are expected and handled
        this.details = details; // Array for more specific error messages (e.g., validation)
        Error.captureStackTrace(this, this.constructor); // Captures stack trace
    }
}

module.exports = ApiError;
