const jwt = require('jsonwebtoken');
const logger = require('../config/logger');
const ApiError = require('../utils/ApiError'); // Import your custom ApiError
const { ROLES } = require('../config/constants'); // Import ROLES constant

/**
 * Middleware to authenticate JWT (JSON Web Token).
 * Extracts the token from the Authorization header and verifies it.
 * If valid, attaches the decoded user payload to `req.user`.
 *
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 * @param {function} next - Express next middleware function.
 */
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    // Expected format: "Bearer TOKEN"
    const token = authHeader && authHeader.split(' ')[1]; 

    if (!token) {
        logger.warn('Authentication attempt blocked: No token provided in Authorization header.');
        // Use ApiError for consistent error responses
        return next(ApiError.unauthorized('Authentication token required.'));
    }

    // Ensure JWT_SECRET is defined in your environment variables
    if (!process.env.JWT_SECRET) {
        logger.error('JWT_SECRET environment variable is not defined!');
        // This is a critical server misconfiguration, should alert immediately
        return next(ApiError.internal('Server configuration error: JWT secret missing.'));
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            // Handle specific JWT errors
            if (err.name === 'TokenExpiredError') {
                logger.warn(`Authentication failed: Token expired for user ${user ? user.id : 'unknown'}.`);
                return next(ApiError.unauthorized('Authentication token has expired. Please log in again.'));
            }
            logger.warn(`Authentication failed: Invalid token. Error: ${err.message}`);
            return next(ApiError.forbidden('Invalid authentication token. Access denied.')); // 403 Forbidden for invalid
        }
        
        // Attach the decoded user payload to the request object
        // Ensure the payload matches what you expect (e.g., { id: '...', walletAddress: '...', role: '...' })
        req.user = user; 
        logger.debug(`User authenticated: ${req.user.walletAddress} (Role: ${req.user.role})`);
        next(); // Proceed to the next middleware or route handler
    });
};

/**
 * Middleware to authorize access based on user role(s).
 * This middleware should be used *after* `authenticateToken`.
 *
 * @param {string|string[]} allowedRoles - A single role string (e.g., 'admin')
 * or an array of roles (e.g., ['admin', 'publisher']) that are allowed to access the route.
 * Use constants from `ROLES` object (e.g., `ROLES.ADMIN`).
 * @returns {function} Express middleware function.
 */
const authorizeRole = (allowedRoles) => (req, res, next) => {
    // Ensure req.user is populated by authenticateToken
    if (!req.user || !req.user.role) {
        logger.error('Authorization failed: User not authenticated or role missing on token payload. Ensure authenticateToken runs first.');
        // This indicates a logical flow error or malformed token payload
        return next(ApiError.internal('Authentication context missing for authorization check.')); 
    }

    // Convert allowedRoles to an array if it's a single string for consistent handling
    const rolesToCheck = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

    // Check if the user's role is included in the allowed roles list
    if (!rolesToCheck.includes(req.user.role)) {
        logger.warn(`Authorization denied for user ${req.user.walletAddress} (Role: ${req.user.role}): Required roles: [${rolesToCheck.join(', ')}].`);
        // Use ApiError for consistent error responses
        return next(ApiError.forbidden(`Access denied. Requires one of the following roles: ${rolesToCheck.join(', ')}.`));
    }

    logger.debug(`Authorization granted for user ${req.user.walletAddress} (Role: ${req.user.role}) for route requiring [${rolesToCheck.join(', ')}].`);
    next(); // User is authorized, proceed
};

module.exports = {
    authenticateToken,
    authorizeRole
};
