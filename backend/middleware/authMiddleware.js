const jwt = require('jsonwebtoken');
const logger = require('../config/logger');

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (token == null) {
        logger.warn('Authentication attempt: No token provided.');
        return res.status(401).json({ message: 'Authentication token required.' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            logger.warn(`Authentication failed: Invalid or expired token. Error: ${err.message}`);
            return res.status(403).json({ message: 'Invalid or expired token.' });
        }
        req.user = user; // Attach user payload (e.g., { id: '...', role: '...' })
        next();
    });
};

const authorizeRole = (requiredRole) => (req, res, next) => {
    if (!req.user) {
        logger.error('Authorization failed: No user attached to request (authenticateToken middleware missing or failed).');
        return res.status(500).json({ message: 'Server error: User not authenticated.' }); // Should not happen if authenticateToken runs first
    }

    if (req.user.role !== requiredRole) {
        logger.warn(`Authorization failed for user ${req.user.id}: Required role '${requiredRole}', but user has '${req.user.role}'.`);
        return res.status(403).json({ message: `Access denied. Requires '${requiredRole}' role.` });
    }
    next();
};

module.exports = { authenticateToken, authorizeRole };
