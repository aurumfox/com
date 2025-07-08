// middleware/authMiddleware.js
// const jwt = require('jsonwebtoken'); // If you implement JWT
const config = require('../config');

const authenticateToken = (req, res, next) => {
    // --- REAL AUTHENTICATION LOGIC (UNCOMMENT AND IMPLEMENT IN PRODUCTION) ---
    // const authHeader = req.headers['authorization'];
    // const token = authHeader && authHeader.split(' ')[1];
    // if (token == null) {
    //     return res.status(401).json({ error: 'Authentication token required.' });
    // }

    // try {
    //     // const user = jwt.verify(token, config.jwtSecret);
    //     // req.user = user; // Attach user info to request (e.g., { walletAddress: '...', role: 'user' })
    //     // console.log(`Authenticated user: ${user.walletAddress} with role ${user.role}`);
    //     next();
    // } catch (err) {
    //     if (err.name === 'TokenExpiredError') {
    //         return res.status(401).json({ error: 'Token expired.' });
    //     }
    //     return res.status(403).json({ error: 'Invalid or malformed token.' });
    // }
    // --- END REAL AUTHENTICATION LOGIC ---

    // Development/Demo Mode: Bypass authentication for easy testing
    console.warn("WARNING: Authentication is currently bypassed for development. ACCESS IS OPEN.");
    req.user = { walletAddress: 'DEV_MODE_WALLET', role: 'admin' }; // Assign a default user for development
    next();
};

const authorizeRole = (requiredRole) => (req, res, next) => {
    if (!req.user) {
        console.error("Authorization failed: No user attached to request. (Authentication middleware might be missing or failed)");
        return res.status(403).json({ error: 'Access denied: Authentication required before authorization.' });
    }
    // 'admin' role can perform any action
    if (req.user.role !== requiredRole && req.user.role !== 'admin') {
        console.warn(`WARNING: Authorization failed for ${req.user.walletAddress}. Requires '${requiredRole}' role, but has '${req.user.role}'.`);
        return res.status(403).json({ error: `Access denied. Requires '${requiredRole}' role.` });
    }
    console.log(`User ${req.user.walletAddress} authorized for role '${requiredRole}'.`);
    next();
};

module.exports = { authenticateToken, authorizeRole };
