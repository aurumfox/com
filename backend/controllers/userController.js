const User = require('../models/User');
const generateToken = require('../utils/auth'); // Renamed to generateToken
const logger = require('../config/logger');

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res, next) => {
    const { walletAddress, password, role } = req.body;

    try {
        const userExists = await User.findOne({ walletAddress });
        if (userExists) {
            logger.warn(`Registration attempt: Wallet address already registered: ${walletAddress}`);
            return res.status(400).json({ message: 'Wallet address already registered.' });
        }

        const user = await User.create({
            walletAddress,
            password,
            role: role || 'user' // Default to 'user' if no role provided
        });

        if (user) {
            logger.info(`User registered successfully: ${user.walletAddress}`);
            res.status(201).json({
                message: 'User registered successfully.',
                _id: user._id,
                walletAddress: user.walletAddress,
                role: user.role,
                token: generateToken(user._id, user.role),
            });
        } else {
            res.status(400).json({ message: 'Invalid user data.' });
        }
    } catch (error) {
        logger.error(`Error during user registration: ${error.message}`);
        next(error); // Pass to error handling middleware
    }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res, next) => {
    const { walletAddress, password } = req.body;

    try {
        const user = await User.findOne({ walletAddress });

        if (user && (await user.matchPassword(password))) {
            logger.info(`User logged in: ${user.walletAddress}`);
            res.json({
                message: 'Logged in successfully.',
                _id: user._id,
                walletAddress: user.walletAddress,
                role: user.role,
                token: generateToken(user._id, user.role),
            });
        } else {
            logger.warn(`Login attempt failed: Invalid credentials for wallet: ${walletAddress}`);
            res.status(401).json({ message: 'Invalid wallet address or password.' });
        }
    } catch (error) {
        logger.error(`Error during user login: ${error.message}`);
        next(error);
    }
};

module.exports = {
    registerUser,
    loginUser,
};
