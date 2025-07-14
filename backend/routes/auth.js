const express = require('express');
const router = express.Router();

// Import controller functions for user authentication operations.
const { registerUser, loginUser, getMe } = require('../controllers/authController');

// Import authentication middleware for token verification.
const { authenticateToken } = require('../middleware/authMiddleware');

// Import validation middleware and its defined Joi schemas.
// This centralizes schema definitions and validation logic.
const { validate, schemas } = require('../middleware/validationMiddleware'); 

// --- Authentication Routes ---

// Route for user registration.
// Applies the 'validate' middleware with the 'register' schema before calling 'registerUser'.
router.post('/register', validate(schemas.auth.register), registerUser);

// Route for user login.
// Applies the 'validate' middleware with the 'login' schema before calling 'loginUser'.
router.post('/login', validate(schemas.auth.login), loginUser);

// Route to get current authenticated user's profile.
// Requires 'authenticateToken' middleware to ensure the user is logged in.
router.get('/me', authenticateToken, getMe);

module.exports = router;
