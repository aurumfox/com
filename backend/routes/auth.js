const express = require('express');
const { registerUser, loginUser, getMe } = require('../controllers/authController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { validate, schemas } = require('../middleware/validationMiddleware'); // Import validate and schemas

const router = express.Router();

router.post('/register', validate(schemas.auth.register), registerUser); // Apply validation
router.post('/login', validate(schemas.auth.login), loginUser);         // Apply validation
router.get('/me', authenticateToken, getMe);

module.exports = router;
