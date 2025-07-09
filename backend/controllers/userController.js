/**
 * @file This file contains controller functions for user authentication (registration and login).
 * It uses a UserService via dependency injection to handle business logic and interacts
 * with a centralized event service for decoupled side effects.
 */

// User model is conceptually still needed for type definitions, but actual DB interaction
// for CRUD should primarily go through the service layer.
const User = require('../models/User'); // Used for type reference if needed, not direct CRUD
const { generateToken } = require('../utils/auth'); // For JWT token generation
const logger = require('../config/logger'); // For logging
const asyncHandler = require('../utils/asyncHandler'); // For consistent async error handling
const ApiError = require('../utils/ApiError'); // For standardized API error responses
const Joi = require('joi'); // For input validation
const { publishEvent } = require('../services/eventService'); // For event publishing

// --- Joi Validation Schemas ---
const registerUserSchema = Joi.object({
    walletAddress: Joi.string().trim().required().pattern(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/).messages({
        'string.empty': 'Wallet address cannot be empty.',
        'string.pattern.base': 'Wallet address must be a valid Solana wallet address (base58 encoded, 32-44 characters).',
        'any.required': 'Wallet address is required.'
    }),
    password: Joi.string().required().min(8).max(64).messages({
        'string.empty': 'Password cannot be empty.',
        'string.min': 'Password must be at least 8 characters long.',
        'string.max': 'Password cannot exceed 64 characters.',
        'any.required': 'Password is required.'
    }),
    // Role should generally NOT be set by the user during registration for security.
    // If you need it, add validation, but it's safer to assign it default 'user' in service.
    // role: Joi.string().valid('user', 'admin', 'developer').optional().default('user')
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
 * @route POST /api/auth/register
 * @access Public
 * @param {object} req - The Express request object.
 * @param {object} req.body - The request body containing walletAddress and password. Role is handled by service.
 * @param {object} res - The Express response object.
 * @param {function} next - The Express next middleware function.
 * @returns {object} 201 - An object with success status, message, token, and new user details.
 * @throws {ApiError} 400 - If validation fails or wallet address is already registered.
 * @throws {ApiError} 500 - If an unexpected error occurs during registration.
 */
const registerUser = asyncHandler(async (req, res, next) => {
    // 1. Input Validation
    const { error, value } = registerUserSchema.validate(req.body);
    if (error) {
        const errors = error.details.map(detail => detail.message);
        logger.warn(`Validation error during user registration for ${req.body.walletAddress || 'N/A'}: ${errors.join(', ')}`);
        return next(ApiError.badRequest('Validation Error', errors));
    }

    const { walletAddress, password } = value; // Use validated values

    // Get userService from container attached to req (assuming DI setup)
    const userService = req.container.resolve('userService');

    try {
        // Service handles checking for existing user, hashing password, and creating user
        const newUser = await userService.registerUser(walletAddress, password, 'user'); // Default role 'user'

        // Generate JWT token. The payload should contain necessary info for authMiddleware.
        const token = generateToken({
            id: newUser._id,
            walletAddress: newUser.walletAddress,
            role: newUser.role,
        });

        // Publish event for side effects (e.g., send welcome email, analytics)
        publishEvent('userRegistered', {
            _id: newUser._id,
            walletAddress: newUser.walletAddress,
            role: newUser.role,
            createdAt: newUser.createdAt,
        });
        logger.info(`User registered successfully and event published: ${newUser.walletAddress}`);

        res.status(201).json({
            success: true, // Consistent with other API responses
            message: 'User registered successfully.',
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
        logger.error(`Error during user registration for wallet ${walletAddress}: ${error.message}`, error);
        return next(ApiError.internal('Failed to register user.')); // Generic internal error
    }
});

/**
 * @desc Authenticate user & get token
 * @route POST /api/auth/login
 * @access Public
 * @param {object} req - The Express request object.
 * @param {object} req.body - The request body containing walletAddress and password.
 * @param {object} res - The Express response object.
 * @param {function} next - The Express next middleware function.
 * @returns {object} 200 - An object with success status, message, token, and user details.
 * @throws {ApiError} 400 - If validation fails.
 * @throws {ApiError} 401 - If invalid credentials are provided.
 * @throws {ApiError} 500 - If an unexpected error occurs during login.
 */
const loginUser = asyncHandler(async (req, res, next) => {
    // 1. Input Validation
    const { error, value } = loginUserSchema.validate(req.body);
    if (error) {
        const errors = error.details.map(detail => detail.message);
        logger.warn(`Validation error during user login for ${req.body.walletAddress || 'N/A'}: ${errors.join(', ')}`);
        return next(ApiError.badRequest('Validation Error', errors));
    }

    const { walletAddress, password } = value; // Use validated values

    // Get userService from container attached to req
    const userService = req.container.resolve('userService');

    const user = await userService.getUserByWalletAddress(walletAddress); // Use service to get user

    // Compare provided password with hashed password
    if (!user || !(await user.matchPassword(password))) {
        // Note: user.matchPassword is a method on the Mongoose user schema, not the service.
        // This is acceptable as it's a model-level concern.
        logger.warn(`Login attempt failed: Invalid credentials for wallet: ${walletAddress}`);
        return next(ApiError.unauthorized('Invalid wallet address or password.')); // Use 401 Unauthorized
    }

    // Generate JWT token. The payload should contain necessary info for authMiddleware.
    const token = generateToken({
        id: user._id,
        walletAddress: user.walletAddress,
        role: user.role,
    });

    // Publish event for side effects (e.g., update last login, analytics)
    publishEvent('userLoggedIn', {
        _id: user._id,
        walletAddress: user.walletAddress,
        role: user.role,
        lastLogin: new Date().toISOString(),
    });
    logger.info(`User logged in successfully and event published: ${user.walletAddress}`);

    res.status(200).json({ // Explicitly 200 OK
        success: true,
        message: 'Logged in successfully.',
        token,
        user: {
            _id: user._id,
            walletAddress: user.walletAddress,
            role: user.role,
        },
    });
});

module.exports = {
    registerUser,
    loginUser,
    // getMe is typically a separate controller function if not already here
};
