const User = require('../models/User'); // Still needed for Mongoose model definition
const bcrypt = require('bcryptjs');
const { generateToken } = require('../utils/auth');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const logger = require('../config/logger');
const { publishEvent } = require('../services/eventService'); // Still needed for event publishing

// Register a new user
// @route   POST /api/v1/auth/register
// @access  Public
const registerUser = asyncHandler(async (req, res, next) => {
    // Get userService from container attached to req
    const userService = req.container.resolve('userService');
    const { walletAddress, password } = req.body;

    // Use the service method for registration
    const newUser = await userService.registerUser(walletAddress, password, 'user'); // Default role 'user'

    // Generate JWT token
    const token = generateToken(newUser._id);

    res.status(201).json({
        success: true,
        message: 'User registered successfully',
        token,
        user: {
            _id: newUser._id,
            walletAddress: newUser.walletAddress,
            role: newUser.role,
        },
    });
});

// Login user
// @route   POST /api/v1/auth/login
// @access  Public
const loginUser = asyncHandler(async (req, res, next) => {
    const { walletAddress, password } = req.body;

    // Get userService from container attached to req
    const userService = req.container.resolve('userService');

    const user = await userService.getUserByWalletAddress(walletAddress); // Use service to get user

    if (!user || !(await bcrypt.compare(password, user.password))) {
        return next(new ApiError('Invalid credentials', 400));
    }

    // Generate JWT token
    const token = generateToken(user._id);

    publishEvent('userLoggedIn', user); // Publish event

    res.json({
        success: true,
        message: 'Login successful',
        token,
        user: {
            _id: user._id,
            walletAddress: user.walletAddress,
            role: user.role,
        },
    });
});

// Get current user profile
// @route   GET /api/v1/auth/me
// @access  Private
const getMe = asyncHandler(async (req, res, next) => {
    // req.user is populated by authenticateToken middleware
    const userService = req.container.resolve('userService');
    const user = await userService.getUserById(req.user.id);

    if (!user) {
        return next(new ApiError('User not found', 404));
    }

    res.json({ success: true, data: user });
});

module.exports = {
    registerUser,
    loginUser,
    getMe,
};
