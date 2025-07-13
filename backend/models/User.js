// --- config/constants.js ---
// This file will contain general constants that can be used throughout your application.

const ROLES = {
  USER: 'user',
  ADMIN: 'admin',
  DEVELOPER: 'developer',
  ADVERTISER: 'advertiser',
  PUBLISHER: 'publisher',
};

module.exports = {
  ROLES,
  // Other constants, such as file limits, allowed MIME types, etc.
  ALLOWED_FILE_MIMETYPES: [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'video/mp4', 'video/webm', 'video/ogg',
    'application/json',
    'text/html', 'application/javascript'
  ],
  MAX_FILE_SIZE: 10 * 1024 * 1024 // 10MB
};

// --- utils/solanaUtils.js ---
// Helper functions related to Solana.
// In a real project, this would contain more logic for blockchain interaction.
const { PublicKey } = require('@solana/web3.js'); // Part of @solana/web3.js

function isValidSolanaAddress(address) {
    if (typeof address !== 'string' || address.length < 32 || address.length > 44) {
        return false;
    }
    try {
        new PublicKey(address);
        return true;
    } catch (e) {
        return false;
    }
}

module.exports = {
    isValidSolanaAddress
};

// --- models/User.js ---
// Mongoose schema and model definition for User.

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { ROLES } = require('../config/constants'); // Import roles
const { isValidSolanaAddress } = require('../utils/solanaUtils'); // Import Solana address validator

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: false, // Username can now be optional if the primary identifier is the wallet
        unique: true,
        sparse: true, // Allows multiple documents to have a null unique value for optional fields
        trim: true,
        minlength: 3,
        maxlength: 30
    },
    walletAddress: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 32,
        maxlength: 44,
        index: true, // Added index for faster lookups
        validate: {
            validator: (v) => isValidSolanaAddress(v),
            message: props => `${props.value} is not a valid Solana address!`
        }
    },
    password: {
        type: String,
        required: true,
        minlength: 8 // Increased minimum password length
    },
    role: {
        type: String,
        enum: Object.values(ROLES), // Validates the role against constants
        default: ROLES.USER,
        required: true
    },
    // Additional user-related fields can be added here (email, profilePicture, bio, etc.)
}, {
    timestamps: true // Automatically adds createdAt and updatedAt fields
});

// Pre-save hook for password hashing
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) {
        return next();
    }
    // Additional password strength checks can be added here
    // For example: if (this.password.length < 8 || !/[A-Z]/.test(this.password) || ...) { return next(new Error('...')); }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Method for comparing passwords
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Configure toJSON to remove sensitive fields when sending to client
userSchema.set('toJSON', {
    virtuals: true,
    transform: (doc, ret) => {
        delete ret._id;
        delete ret.__v;
        delete ret.password;
        return ret;
    }
});

module.exports = mongoose.model('User', userSchema);

// --- middleware/authenticateToken.js ---
// Middleware for JWT token verification.

const jwt = require('jsonwebtoken');
const config = require('../config'); // Assumes config.js contains JWT_SECRET

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Authentication token is required. Please log in.' });
    }

    jwt.verify(token, config.JWT_SECRET, (err, user) => {
        if (err) {
            if (err.name === 'TokenExpiredError') {
                console.warn(`JWT verification failed: Token expired for user ${user ? user.username : 'unknown'}.`);
                return res.status(401).json({ error: 'Authentication token expired. Please log in again.' });
            }
            console.warn(`JWT verification failed for token starting with "${token.substring(0, 10)}...":`, err.message);
            return res.status(403).json({ error: 'Invalid authentication token.' });
        }
        req.user = user;
        next();
    });
};

module.exports = authenticateToken;

// --- middleware/authorizeRole.js ---
// Middleware for user role authorization.

const authorizeRole = (...requiredRoles) => (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Authentication required for this action.' });
    }
    if (!requiredRoles.includes(req.user.role)) {
        console.warn(`Access denied for user ${req.user.username} (role: ${req.user.role}). Required roles: ${requiredRoles.join(', ')}`);
        return res.status(403).json({ error: `Access denied. Requires one of the following roles: ${requiredRoles.join(', ')}.` });
    }
    next();
};

module.exports = authorizeRole;

// --- middleware/errorHandler.js ---
// Centralized Express error handler.

const multer = require('multer');

const errorHandler = (err, req, res, next) => {
    console.error('API Error:', err); // Log full error for debugging

    if (err.name === 'ValidationError') {
        const errors = Object.values(err.errors).map(el => el.message);
        return res.status(400).json({ error: 'Validation failed', details: errors });
    }
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({ error: `File too large. Max ${process.env.MAX_FILE_SIZE_MB || 10}MB allowed.` }); // Use ENV for limit
        }
        return res.status(400).json({ error: `File upload error: ${err.message}` });
    }
    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({ error: 'Malformed JSON in request body.' });
    }
    if (err.name === 'JsonWebTokenError') {
        return res.status(403).json({ error: 'Invalid token.' });
    }
    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expired.' });
    }
    if (err.code === 11000) { // MongoDB duplicate key error
        const field = Object.keys(err.keyValue)[0];
        const value = err.keyValue[field];
        return res.status(409).json({ error: `Duplicate field value: '${value}' for '${field}'. Please use another value.` });
    }

    // If the error was not handled above, send a generic message
    res.status(500).json({ error: 'An unexpected server error occurred.', message: err.message });
};

module.exports = errorHandler;

// --- config/index.js ---
// Centralized loading and validation of environment variables.
// This file should be loaded first.

require('dotenv').config();

const { isValidSolanaAddress } = require('../utils/solanaUtils'); // For Solana wallet address validation

const config = {
    PORT: process.env.PORT || 3000,
    MONGODB_URI: process.env.MONGODB_URI,
    JWT_SECRET: process.env.JWT_SECRET,
    // Splitting CORS origins into an array and validating it
    ALLOWED_CORS_ORIGINS: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',').map(s => s.trim()) : ['http://127.0.0.1:5500', 'http://localhost:5500'],
    BASE_URL: process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`,
    // Marketplace wallet, extremely important for production
    MARKETPLACE_ESCROW_WALLET: process.env.MARKETPLACE_ESCROW_WALLET,
    // Other sensitive parameters, e.g., for AWS S3, IPFS, etc.
    // AWS_S3_BUCKET_NAME: process.env.AWS_S3_BUCKET_NAME,
    // AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
    // AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
};

// --- Critical environment variable checks ---
if (!config.JWT_SECRET || config.JWT_SECRET.length < 32) {
    console.error('ERROR: JWT_SECRET environment variable is missing or too short. Please set a strong, random secret (e.g., 32+ characters) in your .env file.');
    process.exit(1);
}
if (!config.MONGODB_URI) {
    console.error('ERROR: MONGODB_URI environment variable is missing. Please set your MongoDB connection string in your .env file.');
    process.exit(1);
}
if (!config.MARKETPLACE_ESCROW_WALLET || !isValidSolanaAddress(config.MARKETPLACE_ESCROW_WALLET)) {
    console.warn('WARNING: MARKETPLACE_ESCROW_WALLET environment variable is missing or invalid. Set a real Solana address for production.');
    // In production, you might want to exit(1) here for critical components
}

module.exports = config;

// --- routes/auth.js ---
// Routes for authentication (registration, login).

const express = require('express');
const router = express.Router();
const User = require('../models/User'); // User model
const jwt = require('jsonwebtoken');
const config = require('../config'); // Configuration for JWT_SECRET
const { isValidSolanaAddress } = require('../utils/solanaUtils'); // Utility for Solana address validation
// const rateLimit = require('express-rate-limit'); // For rate limiting requests
// const loginLimiter = rateLimit({ /* ... */ }); // Configure the limiter

// User registration
router.post('/register', async (req, res, next) => {
    const { username, password, walletAddress, role } = req.body;

    // Extended input validation
    if (!password || !walletAddress) {
        return res.status(400).json({ error: 'Password and wallet address are required.' });
    }
    if (username && typeof username !== 'string') {
        return res.status(400).json({ error: 'Invalid username type.' });
    }
    if (typeof password !== 'string' || typeof walletAddress !== 'string') {
        return res.status(400).json({ error: 'Invalid data types for registration fields.' });
    }
    if (!isValidSolanaAddress(walletAddress.trim())) {
        return res.status(400).json({ error: 'Invalid Solana wallet address format.' });
    }

    let assignedRole = 'user'; // Default to 'user'
    // If a role is provided and is not 'user', check if the request is from an administrator
    if (role && role !== 'user') {
        try {
            const authHeader = req.headers['authorization'];
            const token = authHeader && authHeader.split(' ')[1];

            if (!token) {
                return res.status(403).json({ error: 'Authentication token required to assign specific roles.' });
            }

            const decodedUser = jwt.verify(token, config.JWT_SECRET);
            if (decodedUser.role !== 'admin') {
                return res.status(403).json({ error: 'Only administrators can assign specific roles.' });
            }
            assignedRole = role; // If admin and role is provided, use it
        } catch (err) {
            console.warn("Role assignment attempt failed:", err.message);
            return res.status(403).json({ error: 'Invalid or expired token for role assignment, or not authorized.' });
        }
    }

    try {
        const newUser = new User({
            username: username ? username.trim() : null, // Set to null if username is optional
            password: password,
            walletAddress: walletAddress.trim(),
            role: assignedRole
        });
        await newUser.save();
        res.status(201).json({ message: 'User registered successfully!' });
    } catch (error) {
        // Mongoose validation errors will be caught by central error handler
        if (error.code === 11000) { // Duplicate key error
            return res.status(409).json({ error: 'Username or wallet address already in use.' });
        }
        next(error);
    }
});

// User login
router.post('/login', /* loginLimiter, */ async (req, res, next) => {
    const { username, password, walletAddress } = req.body;

    // User can log in either by username or walletAddress
    if ((!username && !walletAddress) || !password) {
        return res.status(400).json({ error: 'Password and either username or wallet address are required.' });
    }
    if (username && typeof username !== 'string') {
        return res.status(400).json({ error: 'Invalid username type.' });
    }
    if (walletAddress && !isValidSolanaAddress(walletAddress.trim())) {
        return res.status(400).json({ error: 'Invalid Solana wallet address format.' });
    }
    if (typeof password !== 'string') {
        return res.status(400).json({ error: 'Invalid password type.' });
    }

    try {
        let user;
        if (username) {
            user = await User.findOne({ username: username.trim() });
        } else if (walletAddress) {
            user = await User.findOne({ walletAddress: walletAddress.trim() });
        }

        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials.' }); // Changed to a generic message
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials.' }); // Changed to a generic message
        }

        // Upon successful login, generate a JWT token
        const token = jwt.sign(
            {
                userId: user._id,
                username: user.username,
                walletAddress: user.walletAddress,
                role: user.role
            },
            config.JWT_SECRET,
            { expiresIn: '1h' } // Token valid for 1 hour
        );

        res.json({
            message: 'Logged in successfully!',
            token: token,
            user: { // Send only safe user data
                id: user._id,
                username: user.username,
                walletAddress: user.walletAddress,
                role: user.role
            }
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;

// --- routes/announcements.js ---
// Example routes for announcements. Other routes (photos, posts, nfts, games, ads)
// will look similar, importing their models, middleware, etc.

const express = require('express');
const router = express.Router();
const Announcement = require('../models/Announcement'); // Assumes you created models/Announcement.js
const authenticateToken = require('../middleware/authenticateToken');
const authorizeRole = require('../middleware/authorizeRole');

router.get('/', async (req, res, next) => {
    try {
        // Example pagination
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const announcements = await Announcement.find()
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const totalAnnouncements = await Announcement.countDocuments();
        const totalPages = Math.ceil(totalAnnouncements / limit);

        res.json({
            data: announcements,
            pagination: {
                totalItems: totalAnnouncements,
                currentPage: page,
                pageSize: limit,
                totalPages: totalPages
            }
        });
    } catch (error) {
        next(error);
    }
});

router.post('/', authenticateToken, authorizeRole('admin'), async (req, res, next) => {
    const { text } = req.body;
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
        return res.status(400).json({ error: 'Announcement text is required and must be a non-empty string.' });
    }
    try {
        const newAnnouncement = new Announcement({ text: text.trim() });
        await newAnnouncement.save();
        console.log('New announcement published:', newAnnouncement);
        res.status(201).json({ message: 'Announcement published successfully', announcement: newAnnouncement });
    } catch (error) {
        next(error);
    }
});

module.exports = router;

// --- seeders/initialData.js ---
// Logic for populating the database with initial data (for development/testing only).

const path = require('path');
const fs = require('fs').promises;
const mongoose = require('mongoose'); // To access models

// Import all models for seeding
const Announcement = require('../models/Announcement');
const Photo = require('../models/Photo'); // Assumes you created models/Photo.js
const Post = require('../models/Post');   // Assumes you created models/Post.js
const Nft = require('../models/Nft');     // Assumes you created models/Nft.js
const Game = require('../models/Game');   // Assumes you created models/Game.js
const Ad = require('../models/Ad');       // Assumes you created models/Ad.js
const User = require('../models/User');   // User model
const config = require('../config');      // Configuration
const { ROLES } = require('../config/constants'); // Roles

const uploadDir = 'uploads/'; // Directory for uploads

async function ensureUploadDir() {
    try {
        await fs.mkdir(uploadDir, { recursive: true });
        console.log(`Upload directory '${uploadDir}' ensured.`);
    } catch (err) {
        console.error(`Error ensuring upload directory '${uploadDir}':`, err);
        // Don't exit(1) here to allow the server to start, but the file won't be accessible
    }
}

async function createPlaceholderFile(fileName) {
    const filePath = path.join(uploadDir, fileName);
    try {
        await fs.access(filePath);
    } catch (err) {
        if (err.code === 'ENOENT') {
            await fs.writeFile(filePath, Buffer.from([])); // Create empty file
            console.log(`Created placeholder: ${filePath}`);
        } else {
            console.error(`Error checking/creating placeholder ${filePath}:`, err);
        }
    }
}

async function seedInitialData() {
    if (process.env.NODE_ENV === 'production') {
        console.log('Skipping data seeding in production environment.');
        return;
    }

    console.log('Checking for initial data and seeding if necessary (Development Mode)...');
    try {
        await ensureUploadDir();

        // Seeding announcements
        const announcementCount = await Announcement.countDocuments();
        if (announcementCount === 0) {
            await Announcement.insertMany([
                { text: 'Welcome to Aurum Fox Unified Portal!' },
                { text: 'AFOX Phase 1 completed!' }
            ]);
            console.log('  Initial announcements seeded.');
        }

        // Seeding photos
        const photoCount = await Photo.countDocuments();
        if (photoCount === 0) {
            await createPlaceholderFile('photo_placeholder_1.png');
            await createPlaceholderFile('photo_placeholder_2.png');
            await Photo.insertMany([
                { title: 'First Day in Office', description: 'Getting started with Aurum Fox.', imageUrl: `${config.BASE_URL}/uploads/photo_placeholder_1.png`, creatorWallet: "5bW2D6d3jV3oR7s8t9u0v1w2x3y4z5a6b7c8d9e0f1g2h3i4j5k6l7m8n9o0p1q2" },
                { title: 'Aurum Fox Team', description: 'Our dedicated team.', imageUrl: `${config.BASE_URL}/uploads/photo_placeholder_2.png`, creatorWallet: "9cE4F7g8hI9j0k1l2M3n4o5p6q7r8s9t0U1v2w3x4y5z6a7b8c9d0e1f2g3h4i5j" }
            ]);
            console.log('  Initial photos seeded.');
        }

        // Seeding posts
        const postCount = await Post.countDocuments();
        if (postCount === 0) {
            await Post.insertMany([
                { title: "Launch Day!", content: "Today marks the official launch of the Aurum Fox Unified Portal. We're excited to bring you a seamless Web3 and multimedia experience!", authorWallet: "6dF3G5h7jK9l1M2n3O4p5q6r7S8t9U0v1W2x3Y4z5a6b7c8d9e0f1g2h3i4j5k6l" },
                { title: "New Features Coming Soon", content: "Stay tuned for exciting new features including decentralized storage options for your media and advanced NFT marketplace functionalities.", authorWallet: "7eG4H6i8kL0m1N2o3P4q5R6s7T8u9V0w1X2y3Z4a5b6c7d8e9f0g1h2i3j4k5l6m" }
            ]);
            console.log('  Initial posts seeded.');
        }

        // Seeding NFTs
        const nftCount = await Nft.countDocuments();
        if (nftCount === 0) {
            await createPlaceholderFile('nft_marketplace_1.png');
            await createPlaceholderFile('nft_marketplace_2.png');
            await createPlaceholderFile('nft_user_owned.png');

            await Nft.insertMany([
                {
                    name: "Rare Fox", description: "A very rare golden fox NFT.", image: `${config.BASE_URL}/uploads/nft_marketplace_1.png`, mint: "MARKETPLACEMINTA111111111111111111111111111111111111", owner: config.MARKETPLACE_ESCROW_WALLET, isListed: true, price: 0.8, listedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), listingDuration: 30, listedBy: config.MARKETPLACE_ESCROW_WALLET, attributes: [{ trait_type: "Rarity", value: "Rare" }],
                    history: [{ type: 'Mint', to: config.MARKETPLACE_ESCROW_WALLET, timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) }, { type: 'List', from: config.MARKETPLACE_ESCROW_WALLET, price: 0.8, timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) }]
                },
                {
                    name: "Cunning Fox", description: "A cunning fox ready to pounce.", image: `${config.BASE_URL}/uploads/nft_marketplace_2.png`, mint: "MARKETPLACEMINTB222222222222222222222222222222222222", owner: "ANOTHER_SELLER_WALLET_ADDRESS_FOR_SEED", isListed: true, price: 0.3, listedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), listingDuration: 60, listedBy: "ANOTHER_SELLER_WALLET_ADDRESS_FOR_SEED", attributes: [{ trait_type: "Expression", value: "Wink" }],
                    history: [{ type: 'Mint', to: "ANOTHER_SELLER_WALLET_ADDRESS_FOR_SEED", timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000) }, { type: 'List', from: "ANOTHER_SELLER_WALLET_ADDRESS_FOR_SEED", price: 0.3, timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) }]
                },
                {
                    name: "User Owned Fox", description: "An NFT owned by a user, not yet listed.", image: `${config.BASE_URL}/uploads/nft_user_owned.png`, mint: "USEROWNEDMINTC3333333333333333333333333333333333333", owner: "TestUserWalletAddressHere11111111111111111111111111111", isListed: false, price: null, attributes: [{ trait_type: "Color", value: "Blue" }],
                    history: [{ type: 'Mint', to: "TestUserWalletAddressHere11111111111111111111111111111", timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) }]
                }
            ]);
            console.log('  Initial NFTs seeded.');
        }

        // Seeding games
        const gameCount = await Game.countDocuments();
        if (gameCount === 0) {
            await Game.insertMany([
                { title: "Solana Chess", description: "Play chess on Solana!", url: "https://example.com/solana-chess", developer: "BlockchainDevs" },
                { title: "Degen Racer", description: "Fast-paced racing game.", url: "https://example.com/degen-racer", developer: "GameFi Studios" }
            ]);
            console.log('  Initial games seeded.');
        }

        // Seeding ads
        const adCount = await Ad.countDocuments();
        if (adCount === 0) {
            await createPlaceholderFile('ad_placeholder.png');
            await Ad.insertMany([
                { title: "Buy My Awesome Project!", content: "Check out our new dApp, it's great!", imageUrl: `${config.BASE_URL}/uploads/ad_placeholder.png`, link: "https://myawesomedapp.com", advertiser: "ProjectX" }
            ]);
            console.log('  Initial ads seeded.');
        }

        // Seeding users (VERY IMPORTANT: REMOVE OR MODIFY THIS FOR PRODUCTION!)
        const adminUserCount = await User.countDocuments({ role: ROLES.ADMIN });
        if (adminUserCount === 0) {
            console.log('  No admin user found. Creating a default admin user...');
            const defaultAdminUser = new User({
                username: 'admin',
                password: process.env.DEFAULT_ADMIN_PASSWORD || 'StrongAdminPass123!',
                walletAddress: 'AdminWalletAddressHere11111111111111111111111111111111',
                role: ROLES.ADMIN
            });
            await defaultAdminUser.save();
            console.warn('  Default admin user created: username "admin". **CRITICAL: CHANGE DEFAULT_ADMIN_PASSWORD IN .ENV IMMEDIATELY!**');
        }
        const regularUserCount = await User.countDocuments({ username: 'testuser' });
        if (regularUserCount === 0) {
            console.log('  No test user found. Creating a default test user...');
            const defaultTestUser = new User({
                username: 'testuser',
                password: process.env.DEFAULT_TEST_PASSWORD || 'StrongTestPass123!',
                walletAddress: 'TestUserWalletAddressHere11111111111111111111111111111',
                role: ROLES.USER
            });
            await defaultTestUser.save();
            console.warn('  Default test user created: username "testuser". **CRITICAL: CHANGE DEFAULT_TEST_PASSWORD IN .ENV IMMEDIATELY!**');
        }
        const developerUserCount = await User.countDocuments({ username: 'devuser' });
        if (developerUserCount === 0) {
            console.log('  No developer user found. Creating a default developer user...');
            const defaultDevUser = new User({
                username: 'devuser',
                password: process.env.DEFAULT_DEV_PASSWORD || 'StrongDevPass123!',
                walletAddress: 'DevUserWalletAddressHere111111111111111111111111111111',
                role: ROLES.DEVELOPER
            });
            await defaultDevUser.save();
            console.warn('  Default developer user created: username "devuser". **CRITICAL: CHANGE DEFAULT_DEV_PASSWORD IN .ENV IMMEDIATELY!**');
        }
        const advertiserUserCount = await User.countDocuments({ username: 'aduser' });
        if (advertiserUserCount === 0) {
            console.log('  No advertiser user found. Creating a default advertiser user...');
            const defaultAdUser = new User({
                username: 'aduser',
                password: process.env.DEFAULT_AD_PASSWORD || 'StrongAdPass123!',
                walletAddress: 'AdUserWalletAddressHere111111111111111111111111111111',
                role: ROLES.ADVERTISER
            });
            await defaultAdUser.save();
            console.warn('  Default advertiser user created: username "aduser". **CRITICAL: CHANGE DEFAULT_AD_PASSWORD IN .ENV IMMEDIATELY!**');
        }
        const publisherUserCount = await User.countDocuments({ username: 'pubuser' });
        if (publisherUserCount === 0) {
            console.log('  No publisher user found. Creating a default publisher user...');
            const defaultPubUser = new User({
                username: 'pubuser',
                password: process.env.DEFAULT_PUB_PASSWORD || 'StrongPubPass123!',
                walletAddress: 'PubUserWalletAddressHere111111111111111111111111111111',
                role: ROLES.PUBLISHER
            });
            await defaultPubUser.save();
            console.warn('  Default publisher user created: username "pubuser". **CRITICAL: CHANGE DEFAULT_PUB_PASSWORD IN .ENV IMMEDIATELY!**');
        }

    } catch (error) {
        console.error('Error seeding initial data:', error);
    }
}

module.exports = { seedInitialData };


// --- server.js (main application file) ---
// The main file that initializes Express, connects to the database,
// and mounts all routes.

// Important: Load environment variables and configuration first
const config = require('./config'); // Application configuration loading and validation

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const path = require('path');
const multer = require('multer'); // Multer is here as it's used in middleware for file uploads
const fs = require('fs').promises; // For Multer and seed function

// Import middlewares
const authenticateToken = require('./middleware/authenticateToken');
const authorizeRole = require('./middleware/authorizeRole');
const errorHandler = require('./middleware/errorHandler');

// Import routes
const authRoutes = require('./routes/auth');
const announcementRoutes = require('./routes/announcements');
// Assumes you have other route files:
// const photoRoutes = require('./routes/photos');
// const postRoutes = require('./routes/posts');
// const nftRoutes = require('./routes/nfts');
// const gameRoutes = require('./routes/games');
// const adRoutes = require('./routes/ads');

// Import data seeding function (for development mode only)
const { seedInitialData } = require('./seeders/initialData');
const { ALLOWED_FILE_MIMETYPES, MAX_FILE_SIZE } = require('./config/constants'); // Constants for Multer

const app = express();

// --- Middleware ---

// CORS configuration
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || config.ALLOWED_CORS_ORIGINS.includes(origin)) {
            return callback(null, true);
        }
        const msg = `The CORS policy for this site does not allow access from the specified Origin: ${origin}`;
        return callback(new Error(msg), false);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'], // PATCH added
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// --- Multer Setup for File Uploads ---
// Important: In PRODUCTION, replace with cloud storage (AWS S3, Arweave, IPFS)
const uploadDir = 'uploads/'; // Local directory for uploads

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const originalName = path.parse(file.originalname).name;
        const extension = path.parse(file.originalname).ext;
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        // Sanitize filename for security and compatibility
        const sanitizedOriginalName = originalName.replace(/[^a-zA-Z0-9-_.]/g, '_').substring(0, 50);
        cb(null, `${sanitizedOriginalName}-${uniqueSuffix}${extension}`);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: MAX_FILE_SIZE }, // File size limit from constants
    fileFilter: (req, file, cb) => {
        if (ALLOWED_FILE_MIMETYPES.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`Invalid file type: ${file.mimetype}. Allowed types: ${ALLOWED_FILE_MIMETYPES.join(', ')}.`), false);
        }
    }
});
// Multer can be exported and used in route files to avoid duplication or global object usage.
// For example, in routes/photos.js: `router.post('/upload', authenticateToken, upload.single('photo'), ...);`

// --- Serve static files for uploads ---
// For development/testing only. In production, use CDN/cloud storage.
app.use('/uploads', express.static(path.join(__dirname, uploadDir)));

// --- MongoDB Connection ---
mongoose.connect(config.MONGODB_URI)
    .then(() => console.log('MongoDB connected successfully!'))
    .catch(err => {
        console.error('MongoDB connection error:', err);
        // In production, you might want to implement a retry mechanism for database connection
        process.exit(1); // Exit if DB connection fails on startup
    });

// --- API Endpoints (Mounting Routes) ---
app.use('/api/auth', authRoutes);
app.use('/api/announcements', announcementRoutes);
// Uncomment these lines when you create the corresponding route files
// app.use('/api/photos', photoRoutes);
// app.use('/api/posts', postRoutes);
// app.use('/api/nfts', nftRoutes);
// app.use('/api/games', gameRoutes);
// app.use('/api/ads', adRoutes);

// --- Centralized Error Handler (must be the last middleware) ---
app.use(errorHandler);

// --- Server Start ---
// Ensure the upload directory exists, then start the server,
// and (in development mode) perform data seeding.
(async () => {
    try {
        await fs.mkdir(uploadDir, { recursive: true }); // Ensure upload folder exists
        console.log(`Upload directory '${uploadDir}' ensured.`);

        app.listen(config.PORT, () => {
            console.log(`Backend server listening at ${config.BASE_URL}`);
            console.log(`MongoDB URI: ${config.MONGODB_URI ? 'Connected' : 'NOT SET, using default!'}`);
            console.log(`CORS allowed origins: ${config.ALLOWED_CORS_ORIGINS.join(', ')}`);
            console.log(`Your frontend should be configured to fetch from ${config.BASE_URL}`);

            console.log(`\n--- PRODUCTION CHECKLIST ---`);
            console.log(`1. Ensure .env file has strong JWT_SECRET, MONGODB_URI, and BASE_URL.`);
            console.log(`2. Replace local file uploads (Multer) with a cloud storage solution (e.g., AWS S3, Arweave, IPFS).`);
            console.log(`3. Implement REAL Solana blockchain interactions for NFT minting, listing, buying, and delisting.`);
            console.log(`4. Change all default user passwords (or remove the seeding logic entirely) for production.`);
            console.log(`5. Set MARKETPLACE_ESCROW_WALLET to a real, secure Solana address.`);
            console.log(`----------------------------`);

            if (process.env.NODE_ENV !== 'production') {
                seedInitialData(); // Call seed function only in development mode
            }
        });
    } catch (err) {
        console.error('Failed to start server due to directory setup or initial error:', err);
        process.exit(1);
    }
})();
