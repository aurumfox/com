const User = require('../models/User'); // Still needed for Mongoose model definition (though directly used by service)
const bcrypt = require('bcryptjs'); // Needed here for password comparison
const { generateToken } = require('../utils/auth'); // Used to generate token in controller
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const logger = require('../config/logger');
const { publishEvent } = require('../services/eventService'); // For event publishing
const Joi = require('joi'); // For input validation

// --- Joi Validation Schemas ---
const registerUserSchema = Joi.object({
    walletAddress: Joi.string().trim().required().min(32).max(44).messages({
        'string.empty': 'Wallet address cannot be empty.',
        'string.min': 'Wallet address must be at least 32 characters long.',
        'string.max': 'Wallet address cannot exceed 44 characters.',
        'any.required': 'Wallet address is required.'
    }),
    password: Joi.string().required().min(6).messages({
        'string.empty': 'Password cannot be empty.',
        'string.min': 'Password must be at least 6 characters long.',
        'any.required': 'Password is required.'
    })
});

const loginUserSchema = Joi.object({
    walletAddress: Joi.string().trim().required().messages({
        'string.empty': 'Wallet address cannot be empty.',
        'any.required': 'Wallet address is required.'
    }),
    password: Joi.string().required().messages({
        'string.empty': 'Password cannot be empty.',
        'any.required': 'Password is required.'
    })
});

/**
 * @desc Register a new user
 * @route POST /api/v1/auth/register
 * @access Public
 * @param {object} req - The Express request object.
 * @param {object} req.body - The request body containing walletAddress and password.
 * @param {object} res - The Express response object.
 * @param {function} next - The Express next middleware function.
 * @returns {object} 201 - An object with success status, message, token, and user details.
 * @throws {ApiError} 400 - If validation fails or user with walletAddress already exists.
 * @throws {ApiError} 500 - If an unexpected error occurs during registration.
 */
const registerUser = asyncHandler(async (req, res, next) => {
    // 1. Input Validation
    const { error, value } = registerUserSchema.validate(req.body);
    if (error) {
        const errors = error.details.map(detail => detail.message);
        logger.warn(`Validation error during user registration: ${errors.join(', ')}`);
        return next(ApiError.badRequest('Validation Error', errors));
    }

    const { walletAddress, password } = value; // Use validated values

    const userService = req.container.resolve('userService');
    
    try {
        // Use the service method for registration.
        // The service should handle checking for existing users and password hashing.
        const newUser = await userService.registerUser(walletAddress, password, 'user'); // Default role 'user'

        // 2. Generate JWT token
        // Token payload should include ID, walletAddress, and role for authMiddleware
        const token = generateToken({
            id: newUser._id,
            walletAddress: newUser.walletAddress,
            role: newUser.role,
        });

        // 3. Publish Event
        // Ensure event is published AFTER successful registration and token generation
        publishEvent('userRegistered', {
            _id: newUser._id,
            walletAddress: newUser.walletAddress,
            role: newUser.role,
            createdAt: newUser.createdAt, // Include timestamp for listeners
        });
        logger.info(`User registered and event published: ${newUser.walletAddress}`);

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
    } catch (error) {
        // Catch specific errors from userService, e.g., duplicate wallet
        if (error instanceof ApiError) {
            return next(error); // Re-throw ApiErrors from service layer
        }
        logger.error(`Error registering user ${walletAddress}:`, error);
        return next(ApiError.internal('Failed to register user.'));
    }
});

/**
 * @desc Login user
 * @route POST /api/v1/auth/login
 * @access Public
 * @param {object} req - The Express request object.
 * @param {object} req.body - The request body containing walletAddress and password.
 * @param {object} res - The Express response object.
 * @param {function} next - The Express next middleware function.
 * @returns {object} 200 - An object with success status, message, token, and user details.
 * @throws {ApiError} 400 - If validation fails or invalid credentials.
 * @throws {ApiError} 500 - If an unexpected error occurs during login.
 */
const loginUser = asyncHandler(async (req, res, next) => {
    // 1. Input Validation
    const { error, value } = loginUserSchema.validate(req.body);
    if (error) {
        const errors = error.details.map(detail => detail.message);
        logger.warn(`Validation error during user login: ${errors.join(', ')}`);
        return next(ApiError.badRequest('Validation Error', errors));
    }

    const { walletAddress, password } = value; // Use validated values

    const userService = req.container.resolve('userService');

    // Use service to get user by walletAddress
    const user = await userService.getUserByWalletAddress(walletAddress);

    // Compare provided password with hashed password
    if (!user || !(await bcrypt.compare(password, user.password))) {
        logger.warn(`Login failed for wallet: ${walletAddress} - Invalid credentials.`);
        return next(ApiError.unauthorized('Invalid credentials.')); // Use 401 Unauthorized for login failures
    }

    // 2. Generate JWT token
    // Token payload should include ID, walletAddress, and role for authMiddleware
    const token = generateToken({
        id: user._id,
        walletAddress: user.walletAddress,
        role: user.role,
    });

    // 3. Publish Event
    publishEvent('userLoggedIn', {
        _id: user._id,
        walletAddress: user.walletAddress,
        role: user.role,
        lastLogin: new Date().toISOString(), // Indicate current login time for listeners
    });
    logger.info(`User logged in and event published: ${user.walletAddress}`);

    res.status(200).json({ // Explicitly 200 OK
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

/**
 * @desc Get current user profile
 * @route GET /api/v1/auth/me
 * @access Private
 * @param {object} req - The Express request object.
 * @param {object} req.user - The authenticated user object (populated by authenticateToken middleware).
 * @param {object} res - The Express response object.
 * @param {function} next - The Express next middleware function.
 * @returns {object} 200 - An object with success status and the user data.
 * @throws {ApiError} 404 - If the user is not found (shouldn't happen if auth middleware works).
 * @throws {ApiError} 500 - If an unexpected error occurs.
 */
const getMe = asyncHandler(async (req, res, next) => {
    // req.user is populated by authenticateToken middleware (contains id, walletAddress, role)
    if (!req.user || !req.user.id) {
        logger.error('Attempted to get user profile without req.user populated.');
        return next(ApiError.internal('Authentication context missing.'));
    }

    const userService = req.container.resolve('userService');
    // Fetch full user data from DB if necessary, or just return req.user if it has enough info.
    // Fetching from DB here allows you to get the latest data, e.g., updated roles.
    const user = await userService.getUserById(req.user.id);

    if (!user) {
        logger.warn(`Authenticated user with ID ${req.user.id} not found in DB.`);
        // This case indicates a problem (e.g., user deleted after token issued)
        return next(ApiError.notFound('User profile not found.'));
    }

    // Optionally, fetch additional dynamic data for the user profile
    try {
        user.solanaBalance = await userService.getSolanaBalance(user.walletAddress);
        user.splTokens = await userService.getSplTokenBalances(user.walletAddress);
    } catch (error) {
        logger.error(`Failed to fetch Solana balance/SPL tokens for user ${user.walletAddress}:`, error);
        // Decide if you want to throw or just return user without these fields
        // For profile, it's often better to return what you have
    }

    logger.debug(`User profile fetched for ${user.walletAddress}.`);
    res.status(200).json({ success: true, data: user });
});

module.exports = {
    registerUser,
    loginUser,
    getMe,
};
