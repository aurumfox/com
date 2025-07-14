const jwt = require('jsonwebtoken');
const logger = require('../config/logger');
const ApiError = require('../utils/ApiError'); // Import your custom ApiError
const { ROLES } = require('../config/constants'); // Import ROLES constant (assuming you have this)

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
        // Use ApiError for consistent error responses, e.g., 401 Unauthorized
        return next(ApiError.unauthorized('Authentication token required.'));
    }

    // IMPORTANT: Ensure JWT_SECRET is defined in your environment variables.
    // This is a critical security parameter.
    if (!process.env.JWT_SECRET) {
        logger.error('JWT_SECRET environment variable is not defined!');
        // This is a critical server misconfiguration. Alert immediately.
        return next(ApiError.internal('Server configuration error: JWT secret missing.'));
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            // Handle specific JWT errors for clearer client feedback
            if (err.name === 'TokenExpiredError') {
                logger.warn(`Authentication failed: Token expired for user ${user ? user.id : 'unknown'}.`);
                return next(ApiError.unauthorized('Authentication token has expired. Please log in again.'));
            }
            // For any other JWT verification errors (e.g., malformed, invalid signature)
            logger.warn(`Authentication failed: Invalid token. Error: ${err.message}`);
            // Use 403 Forbidden as the token is "forbidden" due to its invalidity, not just missing.
            return next(ApiError.forbidden('Invalid authentication token. Access denied.')); 
        }
        
        // Attach the decoded user payload to the request object.
        // Ensure your JWT payload includes necessary user data like 'id', 'walletAddress', 'role'.
        req.user = user; 
        logger.debug(`User authenticated: ${req.user.walletAddress} (Role: ${req.user.role})`);
        next(); // Proceed to the next middleware or route handler
    });
};

/**
 * Middleware to authorize access based on user role(s).
 * This middleware *must* be used after `authenticateToken`, as it relies on `req.user` being populated.
 *
 * @param {string|string[]} allowedRoles - A single role string (e.g., 'admin')
 * or an array of role strings (e.g., ['admin', 'publisher']) that are allowed to access the route.
 * It's highly recommended to use constants from your `ROLES` object (e.g., `ROLES.ADMIN`).
 * @returns {function} Express middleware function.
 */
const authorizeRole = (allowedRoles) => (req, res, next) => {
    // Crucial check: Ensure `req.user` exists and has a `role` property.
    // If not, it suggests `authenticateToken` failed or was skipped.
    if (!req.user || !req.user.role) {
        logger.error('Authorization failed: User not authenticated or role missing on token payload. Ensure authenticateToken runs before authorizeRole.');
        // This indicates a severe logical flow error or a malformed token.
        return next(ApiError.internal('Authentication context missing for authorization check.')); 
    }

    // Ensure `allowedRoles` is an array for consistent checking, even if a single role is passed.
    const rolesToCheck = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

    // Check if the authenticated user's role is included in the list of allowed roles.
    if (!rolesToCheck.includes(req.user.role)) {
        logger.warn(`Authorization denied for user ${req.user.walletAddress} (Role: ${req.user.role}): Required roles: [${rolesToCheck.join(', ')}].`);
        // Use 403 Forbidden as the user is authenticated but not authorized for this specific resource.
        return next(ApiError.forbidden(`Access denied. Requires one of the following roles: ${rolesToCheck.join(', ')}.`));
    }

    logger.debug(`Authorization granted for user ${req.user.walletAddress} (Role: ${req.user.role}) for route requiring [${rolesToCheck.join(', ')}].`);
    next(); // User is authorized, proceed to the next middleware or route handler.
};

module.exports = {
    authenticateToken,
    authorizeRole
};
