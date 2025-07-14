// server.js (Production-Oriented Version)

// Load environment variables from .env file FIRST THING
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises; // Use fs.promises directly for async file operations
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken'); // Still needed for jwt.sign, but not for verify (used in authMiddleware)
const bcrypt = require('bcryptjs'); // Still needed for seeding, but not for hashing/compare (used in User model)

// --- Custom Modules & Configuration Imports ---
const logger = require('./config/logger'); // Centralized logger
const ApiError = require('./utils/ApiError'); // Custom error class
const { isValidSolanaAddress } = require('./utils/validation'); // Combined validation utilities
const { authenticateToken, authorizeRole } = require('./middleware/authMiddleware'); // Auth middlewares
const {
    ROLES,
    API_VERSIONS,
    JWT_CONFIG,
    UPLOAD_CONFIG,
    ALLOWED_MIME_TYPES,
    SOLANA_CONFIG,
    // Add other constants as needed
} = require('./config/constants');

// --- Mongoose Model Imports ---
const User = require('./models/User'); // Updated User model
const Announcement = require('./models/Announcement');
const Photo = require('./models/Photo');
const Post = require('./models/Post');
const Nft = require('./models/Nft');
const Game = require('./models/Game');
const Ad = require('./models/Ad');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;
const ALLOWED_CORS_ORIGINS = process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : ['http://127.0.0.1:5500', 'http://localhost:5500'];
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
const JWT_SECRET = JWT_CONFIG.SECRET; // Get from constants, which get from env
const MARKETPLACE_ESCROW_WALLET = process.env.MARKETPLACE_ESCROW_WALLET;


// --- Security & Configuration Checks (More Robust) ---
// These checks should ideally be done in a separate bootstrap/config file
// or as part of a health check, but here is fine for now.
if (!JWT_SECRET || JWT_SECRET.length < 32 || JWT_SECRET === JWT_CONFIG.SECRET) {
    logger.fatal('ERROR: JWT_SECRET environment variable is missing, too short, or using default fallback. Please set a strong, random secret (e.g., 32+ characters) in your .env file.');
    process.exit(1);
}
if (!MONGODB_URI) {
    logger.fatal('ERROR: MONGODB_URI environment variable is missing. Please set your MongoDB connection string in your .env file.');
    process.exit(1);
}
// Using the imported isValidSolanaAddress for this critical check
if (!MARKETPLACE_ESCROW_WALLET || !isValidSolanaAddress(MARKETPLACE_ESCROW_WALLET)) {
    logger.fatal('ERROR: MARKETPLACE_ESCROW_WALLET environment variable is missing or invalid. Set a real, valid Solana address in your .env file for production.');
    process.exit(1);
}

// --- Middlewares ---
app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (ALLOWED_CORS_ORIGINS.includes(origin)) {
            return callback(null, true);
        }
        const msg = `The CORS policy for this site does not allow access from the specified Origin: ${origin}`;
        logger.warn(`CORS blocked request from origin: ${origin}`);
        return callback(new Error(msg), false);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Add OPTIONS for preflight requests
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'], // Add Accept
    credentials: true
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files for uploads - FOR DEVELOPMENT/TESTING ONLY
// In production, consider serving these from a CDN or cloud storage
app.use('/uploads', express.static(path.join(__dirname, UPLOAD_CONFIG.BASE_DIR || 'uploads')));

// --- Multer Setup for File Uploads ---
const uploadDir = UPLOAD_CONFIG.BASE_DIR || 'uploads/'; // Local upload directory - **REPLACE WITH CLOUD STORAGE IN PRODUCTION**

async function ensureUploadDir() {
    try {
        await fs.mkdir(uploadDir, { recursive: true });
        logger.info(`Upload directory '${uploadDir}' ensured.`);
    } catch (err) {
        logger.fatal(`Error ensuring upload directory '${uploadDir}':`, err);
        process.exit(1); // Exit if crucial directory can't be created
    }
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Determine specific subdirectory based on file type if needed, e.g., for NFTs vs Photos
        let destPath = uploadDir;
        if (file.fieldname === 'nftFile') {
            destPath = path.join(uploadDir, UPLOAD_CONFIG.NFT_UPLOAD_DIR);
        } else if (file.fieldname === 'photo') {
            destPath = path.join(uploadDir, UPLOAD_CONFIG.IMAGE_UPLOAD_DIR);
        } else if (file.fieldname === 'gameFile') {
            destPath = path.join(uploadDir, UPLOAD_CONFIG.GAME_UPLOAD_DIR);
        } else if (file.fieldname === 'adCreative') {
            destPath = path.join(uploadDir, UPLOAD_CONFIG.IMAGE_UPLOAD_DIR); // Ads typically use images
        }
        fs.mkdir(destPath, { recursive: true }).then(() => {
            cb(null, destPath);
        }).catch(err => {
            logger.error(`Failed to create upload subdirectory ${destPath}:`, err);
            cb(new Error(`Failed to create upload directory.`));
        });
    },
    filename: (req, file, cb) => {
        const originalName = path.parse(file.originalname).name;
        const extension = path.parse(file.originalname).ext;
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        // Sanitize original name to be URL-friendly and prevent path traversal issues
        const sanitizedOriginalName = originalName.replace(/[^a-zA-Z0-9-_.]/g, '_').substring(0, 50); // Keep periods for extensions
        cb(null, `${sanitizedOriginalName}-${uniqueSuffix}${extension}`);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: UPLOAD_CONFIG.MAX_FILE_SIZE_BYTES },
    fileFilter: (req, file, cb) => {
        // Use constants for allowed MIME types
        if (ALLOWED_MIME_TYPES.ALL_MEDIA.includes(file.mimetype) ||
            ALLOWED_MIME_TYPES.GAME_FILES.includes(file.mimetype) ||
            ALLOWED_MIME_TYPES.NFT_METADATA.includes(file.mimetype)) { // Added for explicit metadata check
            cb(null, true);
        } else {
            logger.warn(`File upload blocked: Invalid file type '${file.mimetype}' for file '${file.originalname}'.`);
            cb(new ApiError(400, `Invalid file type: ${file.mimetype}. Only images, videos, JSON, HTML, and JS files are allowed.`), false);
        }
    }
});

// --- MongoDB Connection ---
mongoose.connect(MONGODB_URI)
    .then(() => logger.info('MongoDB connected successfully!'))
    .catch(err => {
        logger.fatal('MongoDB connection error:', err);
        process.exit(1); // Exit if DB connection fails
    });

// --- API Endpoints ---
const API_BASE = API_VERSIONS.V1; // Using API versioning constant

// Authentication Endpoints
app.post(`${API_BASE}/auth/register`, async (req, res, next) => {
    const { username, password, walletAddress } = req.body;

    // Basic type validation and presence check
    if (typeof username !== 'string' || typeof password !== 'string' || typeof walletAddress !== 'string' ||
        username.trim().length === 0 || password.trim().length === 0 || walletAddress.trim().length === 0) {
        return next(ApiError.badRequest('Username, password, and wallet address are required and must be non-empty strings.'));
    }

    const trimmedUsername = username.trim();
    const trimmedWalletAddress = walletAddress.trim();

    if (!isValidSolanaAddress(trimmedWalletAddress)) {
        return next(ApiError.badRequest('Invalid Solana wallet address format.'));
    }

    try {
        // Always assign 'user' role by default during registration
        // Specific role assignment (admin, developer etc.) should be done by an existing admin
        // through a separate, authorized endpoint (e.g., /api/users/:id/role)
        const newUser = new User({
            username: trimmedUsername,
            password: password, // Password will be hashed by the User model's pre-save hook
            walletAddress: trimmedWalletAddress,
            role: ROLES.USER // Default role for new registrations
        });
        await newUser.save();
        logger.info(`New user registered: ${newUser.username} with role ${newUser.role}`);
        res.status(201).json({ message: 'User registered successfully! Default role assigned: user.' });
    } catch (error) {
        if (error.code === 11000) { // Duplicate key error
            const field = Object.keys(error.keyValue)[0];
            const value = error.keyValue[field];
            return next(ApiError.conflict(`Duplicate value '${value}' for field '${field}'. Please use another.`));
        }
        // Handle Mongoose validation errors from User model's pre-save hook (for password complexity)
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(el => el.message);
            return next(ApiError.badRequest('Validation failed: ' + errors.join(', ')));
        }
        next(error); // Pass other errors to the central error handler
    }
});

app.post(`${API_BASE}/auth/login`, async (req, res, next) => {
    const { username, password } = req.body;

    if (typeof username !== 'string' || typeof password !== 'string' ||
        username.trim().length === 0 || password.trim().length === 0) {
        return next(ApiError.badRequest('Username and password are required.'));
    }

    try {
        const user = await User.findOne({ username: username.trim() });
        if (!user) {
            return next(ApiError.unauthorized('Invalid username or password.'));
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return next(ApiError.unauthorized('Invalid username or password.'));
        }

        // Generate JWT using configured secret and expiry
        const token = jwt.sign(
            {
                userId: user._id,
                username: user.username,
                walletAddress: user.walletAddress,
                role: user.role
            },
            JWT_SECRET,
            { expiresIn: JWT_CONFIG.EXPIRES_IN }
        );

        logger.info(`User logged in: ${user.username} (Role: ${user.role})`);
        res.json({
            message: 'Logged in successfully!',
            token: token,
            user: {
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

// User profile endpoint (example, can be extended)
app.get(`${API_BASE}/users/me`, authenticateToken, async (req, res, next) => {
    try {
        // req.user is populated by authenticateToken
        const user = await User.findById(req.user.userId).select('-password'); // Exclude password from response
        if (!user) {
            return next(ApiError.notFound('User not found.'));
        }
        res.json(user);
    } catch (error) {
        next(error);
    }
});

// Admin endpoint to get all users (for demonstration)
app.get(`${API_BASE}/users`, authenticateToken, authorizeRole(ROLES.ADMIN), async (req, res, next) => {
    try {
        const users = await User.find().select('-password'); // Exclude passwords
        res.json(users);
    } catch (error) {
        next(error);
    }
});

// Admin endpoint to update user role (IMPORTANT: requires careful handling in production)
app.put(`${API_BASE}/users/:userId/role`, authenticateToken, authorizeRole(ROLES.ADMIN), async (req, res, next) => {
    const { userId } = req.params;
    const { newRole } = req.body;

    if (!newRole || typeof newRole !== 'string' || !Object.values(ROLES).includes(newRole)) {
        return next(ApiError.badRequest('Invalid or missing new role.'));
    }
    if (!isValidObjectId(userId)) { // Using isValidObjectId from utils/validation
        return next(ApiError.badRequest('Invalid user ID format.'));
    }

    try {
        const user = await User.findById(userId);
        if (!user) {
            return next(ApiError.notFound('User not found.'));
        }

        user.role = newRole;
        await user.save();
        logger.info(`Admin ${req.user.username} changed role of user ${user.username} to ${newRole}`);
        res.status(200).json({ message: `User role updated to ${newRole}`, user: user.toJSON() });
    } catch (error) {
        next(error);
    }
});


// Announcements API
app.get(`${API_BASE}/announcements`, async (req, res, next) => {
    try {
        const announcements = await Announcement.find().sort({ createdAt: -1 });
        res.json(announcements);
    } catch (error) {
        next(error);
    }
});
app.post(`${API_BASE}/announcements`, authenticateToken, authorizeRole(ROLES.ADMIN), async (req, res, next) => {
    const { text } = req.body;
    if (!text || typeof text !== 'string' || text.trim().length < 5) {
        return next(ApiError.badRequest('Announcement text is required and must be a string of at least 5 characters.'));
    }
    try {
        const newAnnouncement = new Announcement({ text: text.trim() });
        await newAnnouncement.save();
        logger.info(`New announcement published by ${req.user.username}: "${newAnnouncement.text}"`);
        res.status(201).json({ message: 'Announcement published successfully', announcement: newAnnouncement });
    } catch (error) {
        next(error);
    }
});

// Games API
app.get(`${API_BASE}/games`, async (req, res, next) => {
    try {
        const games = await Game.find().sort({ createdAt: -1 });
        res.json(games);
    } catch (error) {
        next(error);
    }
});
app.post(`${API_BASE}/games`, authenticateToken, authorizeRole(ROLES.DEVELOPER), upload.single('gameFile'), async (req, res, next) => {
    const { title, description, developer, url: externalUrl } = req.body;

    const trimmedTitle = String(title || '').trim();
    const trimmedDescription = String(description || '').trim();
    const trimmedDeveloper = String(developer || '').trim();
    const trimmedExternalUrl = externalUrl ? String(externalUrl).trim() : null;

    if (!trimmedTitle || !trimmedDescription || !trimmedDeveloper) {
        if (req.file) { await fs.unlink(req.file.path).catch(e => logger.error('Error cleaning up file:', e)); }
        return next(ApiError.badRequest('Title, description, and developer are required to add a game.'));
    }

    let gameUrl;

    if (req.file) {
        // In PRODUCTION, you would upload req.file to cloud storage (e.g., S3, Arweave, IPFS)
        // and set gameUrl to the public URL of that cloud resource.
        logger.warn('WARNING: Game file uploaded to local storage. Use cloud storage in production!');
        gameUrl = `${BASE_URL}/${UPLOAD_CONFIG.BASE_DIR}/${UPLOAD_CONFIG.GAME_UPLOAD_DIR}/${req.file.filename}`;
    } else if (trimmedExternalUrl) {
        gameUrl = trimmedExternalUrl;
    } else {
        return next(ApiError.badRequest('Either a game file must be uploaded or a valid external URL must be provided.'));
    }

    if (gameUrl && !/^https?:\/\/.+/.test(gameUrl)) {
        if (req.file) { await fs.unlink(req.file.path).catch(e => logger.error('Error cleaning up file:', e)); }
        return next(ApiError.badRequest('Provided game URL is not valid.'));
    }

    try {
        const newGame = new Game({
            title: trimmedTitle,
            description: trimmedDescription,
            url: gameUrl,
            developer: trimmedDeveloper
        });
        await newGame.save();
        logger.info(`New game added by ${req.user.username}: "${newGame.title}"`);
        res.status(201).json({ message: 'Game added successfully', game: newGame });
    } catch (error) {
        if (req.file) { await fs.unlink(req.file.path).catch(e => logger.error('Error cleaning up file on DB error:', e)); }
        next(error);
    }
});

// Ads API
app.get(`${API_BASE}/ads`, async (req, res, next) => {
    try {
        const ads = await Ad.find().sort({ createdAt: -1 });
        res.json(ads);
    } catch (error) {
        next(error);
    }
});
app.post(`${API_BASE}/ads`, authenticateToken, authorizeRole(ROLES.ADVERTISER), upload.single('adCreative'), async (req, res, next) => {
    const { title, content, link, advertiser } = req.body;

    const trimmedTitle = String(title || '').trim();
    const trimmedContent = String(content || '').trim();
    const trimmedAdvertiser = String(advertiser || '').trim();
    const trimmedLink = link ? String(link).trim() : null;

    if (!trimmedTitle || !trimmedContent || !trimmedAdvertiser) {
        if (req.file) { await fs.unlink(req.file.path).catch(e => logger.error('Error cleaning up file:', e)); }
        return next(ApiError.badRequest('Title, content, and advertiser are required to post an ad.'));
    }

    if (trimmedLink && !/^https?:\/\/.+/.test(trimmedLink)) {
        if (req.file) { await fs.unlink(req.file.path).catch(e => logger.error('Error cleaning up file:', e)); }
        return next(ApiError.badRequest('Provided ad link is not a valid URL.'));
    }

    let imageUrl = null;
    if (req.file) {
        logger.warn('WARNING: Ad creative uploaded to local storage. Use cloud storage in production!');
        imageUrl = `${BASE_URL}/${UPLOAD_CONFIG.BASE_DIR}/${UPLOAD_CONFIG.IMAGE_UPLOAD_DIR}/${req.file.filename}`;
    }

    try {
        const newAd = new Ad({
            title: trimmedTitle,
            content: trimmedContent,
            imageUrl,
            link: trimmedLink,
            advertiser: trimmedAdvertiser
        });
        await newAd.save();
        logger.info(`New ad posted by ${req.user.username}: "${newAd.title}"`);
        res.status(201).json({ message: 'Ad posted successfully', ad: newAd });
    } catch (error) {
        if (req.file) { await fs.unlink(req.file.path).catch(e => logger.error('Error cleaning up file on DB error:', e)); }
        next(error);
    }
});

// Photos API
app.get(`${API_BASE}/photos`, async (req, res, next) => {
    try {
        const photos = await Photo.find().sort({ createdAt: -1 });
        res.json(photos);
    } catch (error) {
        next(error);
    }
});
app.post(`${API_BASE}/photos/upload`, authenticateToken, upload.single('photo'), async (req, res, next) => {
    if (!req.file) {
        return next(ApiError.badRequest('No photo file uploaded.'));
    }
    const { title, description, creatorWallet } = req.body;

    const trimmedTitle = String(title || '').trim();
    const trimmedDescription = description ? String(description).trim() : '';
    const trimmedCreatorWallet = String(creatorWallet || '').trim();

    if (!trimmedTitle || !trimmedCreatorWallet) {
        await fs.unlink(req.file.path).catch(e => logger.error('Error cleaning up file:', e));
        return next(ApiError.badRequest('Photo title and creator wallet are required.'));
    }
    if (!isValidSolanaAddress(trimmedCreatorWallet)) {
        await fs.unlink(req.file.path).catch(e => logger.error('Error cleaning up file:', e));
        return next(ApiError.badRequest('Invalid Solana wallet address format for creatorWallet.'));
    }

    logger.warn('WARNING: Photo file uploaded to local storage. Use cloud storage in production!');
    const imageUrl = `${BASE_URL}/${UPLOAD_CONFIG.BASE_DIR}/${UPLOAD_CONFIG.IMAGE_UPLOAD_DIR}/${req.file.filename}`;

    try {
        const newPhoto = new Photo({
            title: trimmedTitle,
            description: trimmedDescription,
            imageUrl,
            creatorWallet: trimmedCreatorWallet
        });
        await newPhoto.save();
        logger.info(`New photo uploaded by ${req.user.username}: "${newPhoto.title}"`);
        res.status(201).json({ message: 'Photo uploaded successfully.', photo: newPhoto });
    } catch (error) {
        if (req.file) { await fs.unlink(req.file.path).catch(e => logger.error('Error cleaning up file on DB error:', e)); }
        next(error);
    }
});

// Posts API
app.get(`${API_BASE}/posts`, async (req, res, next) => {
    try {
        const posts = await Post.find().sort({ createdAt: -1 });
        res.json(posts);
    } catch (error) {
        next(error);
    }
});
app.post(`${API_BASE}/posts`, authenticateToken, authorizeRole(ROLES.PUBLISHER), async (req, res, next) => {
    const { title, content, authorWallet } = req.body;

    const trimmedTitle = String(title || '').trim();
    const trimmedContent = String(content || '').trim();
    const trimmedAuthorWallet = String(authorWallet || '').trim();

    if (!trimmedTitle || !trimmedContent || !trimmedAuthorWallet) {
        return next(ApiError.badRequest('Title, content, and author wallet are required.'));
    }
    if (!isValidSolanaAddress(trimmedAuthorWallet)) {
        return next(ApiError.badRequest('Invalid Solana wallet address format for authorWallet.'));
    }

    try {
        const newPost = new Post({
            title: trimmedTitle,
            content: trimmedContent,
            authorWallet: trimmedAuthorWallet
        });
        await newPost.save();
        logger.info(`New post published by ${req.user.username}: "${newPost.title}"`);
        res.status(201).json({ message: 'Post published successfully', post: newPost });
    } catch (error) {
        next(error);
    }
});

// NFTs API (Placeholder for REAL Blockchain Interaction)
app.get(`${API_BASE}/nfts/marketplace`, async (req, res, next) => {
    try {
        const nfts = await Nft.find({ isListed: true }).sort({ listedAt: -1 });
        res.json({ nfts: nfts, marketplaceOwnerWallet: MARKETPLACE_ESCROW_WALLET });
    } catch (error) {
        next(error);
    }
});

app.post(`${API_BASE}/nfts/prepare-mint`, authenticateToken, authorizeRole(ROLES.DEVELOPER), upload.single('nftFile'), async (req, res, next) => {
    if (!req.file) {
        return next(ApiError.badRequest('No NFT file uploaded.'));
    }
    const { name, description, attributes, creatorWallet } = req.body;

    const trimmedName = String(name || '').trim();
    const trimmedDescription = String(description || '').trim();
    const trimmedCreatorWallet = String(creatorWallet || '').trim();

    if (!trimmedName || !trimmedDescription || !trimmedCreatorWallet) {
        await fs.unlink(req.file.path).catch(e => logger.error('Error cleaning up file:', e));
        return next(ApiError.badRequest('Name, description, and creator wallet are required for NFT preparation.'));
    }
    if (!isValidSolanaAddress(trimmedCreatorWallet)) {
        await fs.unlink(req.file.path).catch(e => logger.error('Error cleaning up file:', e));
        return next(ApiError.badRequest('Invalid Solana wallet address format for creatorWallet.'));
    }

    logger.warn('WARNING: NFT media file uploaded to local storage. Use Arweave/IPFS in production!');
    const contentUrl = `${BASE_URL}/${UPLOAD_CONFIG.BASE_DIR}/${UPLOAD_CONFIG.NFT_UPLOAD_DIR}/${req.file.filename}`;

    const nftMetadata = {
        name: trimmedName,
        symbol: "AFOXNFT",
        description: trimmedDescription,
        image: contentUrl,
        properties: {
            files: [{
                uri: contentUrl,
                type: req.file.mimetype,
            }],
            category: req.file.mimetype.startsWith('image') ? 'image' : (req.file.mimetype.startsWith('video') ? 'video' : 'misc'),
            creators: [{
                address: trimmedCreatorWallet,
                share: 100
            }]
        },
        attributes: []
    };

    let metadataFilePath;
    try {
        if (attributes && typeof attributes === 'string') {
            const parsedAttributes = JSON.parse(attributes);
            if (Array.isArray(parsedAttributes)) {
                nftMetadata.attributes = parsedAttributes.map(attr => ({
                    trait_type: String(attr.trait_type || '').trim(),
                    value: String(attr.value || '').trim()
                })).filter(attr => attr.trait_type.length > 0 && attr.value.length > 0);
            }
        }
    } catch (e) {
        logger.warn("NFT preparation: Could not parse attributes JSON:", e.message);
        // Do not return error here, just log and proceed with empty attributes
    }

    logger.warn('WARNING: NFT metadata JSON saved locally. Use Arweave/IPFS for metadata in production!');
    const baseFileName = path.basename(req.file.filename, path.extname(req.file.filename));
    const metadataFileName = `${baseFileName}-metadata.json`;
    // Ensure metadata is saved in the correct subdirectory for NFTs
    metadataFilePath = path.join(__dirname, UPLOAD_CONFIG.BASE_DIR, UPLOAD_CONFIG.NFT_UPLOAD_DIR, metadataFileName);
    try {
        await fs.writeFile(metadataFilePath, JSON.stringify(nftMetadata, null, 2));
    } catch (error) {
        logger.error('Error writing NFT metadata file:', error);
        await fs.unlink(req.file.path).catch(e => logger.error('Error cleaning up NFT file:', e));
        if (metadataFilePath) { await fs.unlink(metadataFilePath).catch(e => logger.error('Error cleaning up NFT metadata file (partial):', e)); e.message = 'Failed to clean up metadata file.'; }
        return next(ApiError.internal('Failed to save NFT metadata file.'));
    }
    const metadataUri = `${BASE_URL}/${UPLOAD_CONFIG.BASE_DIR}/${UPLOAD_CONFIG.NFT_UPLOAD_DIR}/${metadataFileName}`; // Local URI

    // *** THIS IS THE CRITICAL SIMULATION PART ***
    const simulatedMintAddress = `SIMULATED_MINT_${Date.now()}_${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    const simulatedSignature = 'SIMULATED_TRANSACTION_SIGNATURE_FROM_BACKEND';

    try {
        const newNft = new Nft({
            name: nftMetadata.name,
            description: nftMetadata.description,
            image: nftMetadata.image,
            mint: simulatedMintAddress,
            owner: nftMetadata.properties.creators[0].address,
            isListed: false,
            attributes: nftMetadata.attributes,
            history: [{ type: 'Mint', to: nftMetadata.properties.creators[0].address, timestamp: new Date() }]
        });
        await newNft.save();
        logger.info(`NFT prepared and simulated mint successful by ${req.user.username}: "${newNft.name}"`);
        res.status(201).json({
            message: 'NFT assets prepared and simulated mint successful. **REQUIRES REAL SOLANA MINT IN PRODUCTION.**',
            uri: metadataUri,
            mintAddress: simulatedMintAddress,
            imageUrl: contentUrl,
            signature: simulatedSignature,
            nft: newNft
        });
    } catch (error) {
        if (req.file) { await fs.unlink(req.file.path).catch(e => logger.error('Error cleaning up NFT file:', e)); }
        if (metadataFilePath) { await fs.unlink(metadataFilePath).catch(e => logger.error('Error cleaning up NFT metadata file:', e)); }
        next(error);
    }
});

app.post(`${API_BASE}/nfts/list`, authenticateToken, async (req, res, next) => {
    const { mintAddress, price, duration, sellerWallet } = req.body;

    if (!mintAddress || !price || isNaN(price) || Number(price) <= 0 ||
        !duration || isNaN(duration) || Number(duration) <= 0 ||
        !sellerWallet || !isValidSolanaAddress(sellerWallet)) {
        return next(ApiError.badRequest('Missing or invalid required fields for listing (mintAddress, price (>0), duration (>0), sellerWallet (valid Solana address)).'));
    }

    const trimmedMintAddress = String(mintAddress).trim();
    const parsedPrice = Number(price);
    const parsedDuration = Number(duration);
    const trimmedSellerWallet = String(sellerWallet).trim();

    // The user trying to list must own the NFT AND be the authenticated user
    if (req.user.walletAddress !== trimmedSellerWallet) {
         return next(ApiError.forbidden('You can only list NFTs from your own authenticated wallet.'));
    }

    try {
        const nft = await Nft.findOneAndUpdate(
            { mint: trimmedMintAddress, owner: trimmedSellerWallet, isListed: false }, // Must be owned by seller and not listed
            {
                $set: {
                    isListed: true,
                    price: parsedPrice,
                    listedAt: new Date(),
                    listingDuration: parsedDuration,
                    listedBy: trimmedSellerWallet,
                },
                $push: { history: { type: 'List', from: trimmedSellerWallet, price: parsedPrice, timestamp: new Date() } }
            },
            { new: true, runValidators: true }
        );

        if (!nft) {
            return next(ApiError.notFound('NFT not found, you are not the owner, or it is already listed.'));
        }

        logger.info(`NFT ${trimmedMintAddress} listed by ${trimmedSellerWallet} for ${parsedPrice} SOL (simulated).`);
        res.status(200).json({ message: `NFT ${trimmedMintAddress} listed for sale for ${parsedPrice} SOL (simulated). **REQUIRES REAL SOLANA LISTING TX IN PRODUCTION.**`, nft });
    } catch (error) {
        next(error);
    }
});

app.post(`${API_BASE}/nfts/buy`, authenticateToken, async (req, res, next) => {
    const { mintAddress, buyerWallet, sellerWallet, price } = req.body;

    if (!mintAddress || !buyerWallet || !sellerWallet || !price || isNaN(price) || Number(price) <= 0 ||
        !isValidSolanaAddress(buyerWallet) || !isValidSolanaAddress(sellerWallet)) {
        return next(ApiError.badRequest('Missing or invalid required fields for buying NFT (mintAddress, buyerWallet, sellerWallet, price (>0)). All wallets must be valid Solana addresses.'));
    }

    const trimmedMintAddress = String(mintAddress).trim();
    const trimmedBuyerWallet = String(buyerWallet).trim();
    const trimmedSellerWallet = String(sellerWallet).trim();
    const parsedPrice = Number(price);

    if (trimmedBuyerWallet === trimmedSellerWallet) {
        return next(ApiError.badRequest('Cannot buy your own NFT.'));
    }
    // Authenticated user must be the buyer
    if (req.user.walletAddress !== trimmedBuyerWallet) {
        return next(ApiError.forbidden('You can only buy NFTs with your authenticated wallet.'));
    }

    try {
        const nft = await Nft.findOneAndUpdate(
            { mint: trimmedMintAddress, owner: trimmedSellerWallet, isListed: true, price: parsedPrice }, // Ensure it's listed by this seller at this price
            {
                $set: {
                    owner: trimmedBuyerWallet,
                    isListed: false,
                    price: null,
                    listedAt: null,
                    listingDuration: null,
                    listedBy: null
                },
                $push: { history: { type: 'Sale', from: trimmedSellerWallet, to: trimmedBuyerWallet, price: parsedPrice, timestamp: new Date() } }
            },
            { new: true, runValidators: true }
        );

        if (!nft) {
            return next(ApiError.notFound('NFT not found, not listed by that seller, or price mismatch. It might have been delisted or sold.'));
        }

        const serializedTransaction = 'SIMULATED_TRANSACTION_BASE64_FOR_CLIENT_SIGNING'; // Placeholder

        logger.info(`NFT ${nft.name} transferred from ${trimmedSellerWallet} to ${trimmedBuyerWallet} for ${parsedPrice} SOL (simulated).`);
        res.status(200).json({
            message: `NFT ${nft.name} successfully purchased (simulated). **REQUIRES REAL SOLANA BUY TX IN PRODUCTION.**`,
            nft,
            serializedTransaction
        });

    } catch (error) {
        next(error);
    }
});

app.post(`${API_BASE}/nfts/delist`, authenticateToken, async (req, res, next) => {
    const { mintAddress, ownerWallet } = req.body;

    if (!mintAddress || !ownerWallet || !isValidSolanaAddress(ownerWallet)) {
        return next(ApiError.badRequest('Mint address and owner wallet (valid Solana address) are required.'));
    }
    const trimmedMintAddress = String(mintAddress).trim();
    const trimmedOwnerWallet = String(ownerWallet).trim();

    // Authenticated user must be the owner trying to delist
    if (req.user.walletAddress !== trimmedOwnerWallet) {
        return next(ApiError.forbidden('You can only delist NFTs from your own authenticated wallet.'));
    }

    try {
        const nft = await Nft.findOneAndUpdate(
            { mint: trimmedMintAddress, owner: trimmedOwnerWallet, isListed: true }, // Must be owned by owner and currently listed
            {
                $set: {
                    isListed: false,
                    price: null,
                    listedAt: null,
                    listingDuration: null,
                    listedBy: null
                },
                $push: { history: { type: 'Delist', from: trimmedOwnerWallet, timestamp: new Date() } }
            },
            { new: true }
        );

        if (!nft) {
            return next(ApiError.notFound('NFT not found, you are not the owner, or it is not currently listed.'));
        }

        logger.info(`NFT ${nft.name} delisted by ${trimmedOwnerWallet}.`);
        res.status(200).json({ message: `NFT ${nft.name} delisted successfully. **REQUIRES REAL SOLANA DELIST TX IN PRODUCTION.**`, nft });
    } catch (error) {
        next(error);
    }
});


app.get(`${API_BASE}/nfts/:mint/history`, async (req, res, next) => {
    const { mint } = req.params;
    if (!mint || mint.trim().length === 0) {
        return next(ApiError.badRequest('NFT mint address is required.'));
    }

    try {
        const nft = await Nft.findOne({ mint: mint.trim() }, 'history');
        if (!nft) {
            return next(ApiError.notFound('NFT not found.'));
        }
        res.json(nft.history);
    } catch (error) {
        next(error);
    }
});


// --- Centralized Express Error Handler ---
// This middleware must be defined LAST, after all routes and other middlewares.
app.use((err, req, res, next) => {
    // Log the full error for debugging (use logger)
    logger.error(`Unhandled API Error: ${err.message}`, err.stack);

    if (err instanceof ApiError) {
        return res.status(err.statusCode).json({ error: err.message });
    }
    
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return next(ApiError.badRequest(`File too large. Max ${UPLOAD_CONFIG.MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB allowed.`));
        }
        return next(ApiError.badRequest(`File upload error: ${err.message}`));
    }
    
    if (err.name === 'ValidationError') { // Mongoose validation errors
        // Collect all validation error messages
        const errors = Object.values(err.errors).map(el => el.message);
        return next(ApiError.badRequest('Validation failed: ' + errors.join(', ')));
    }
    
    if (err.code === 11000) { // MongoDB duplicate key error
        const field = Object.keys(err.keyValue)[0];
        const value = err.keyValue[field];
        return next(ApiError.conflict(`Duplicate value '${value}' for field '${field}'. Please use another value.`));
    }

    if (err.type === 'entity.parse.failed' || err.name === 'SyntaxError') { // Malformed JSON in request body
        return next(ApiError.badRequest('Malformed JSON in request body.'));
    }
    
    if (err.name === 'JsonWebTokenError') { // Generic JWT error (e.g., invalid signature)
        return next(ApiError.forbidden('Invalid authentication token.'));
    }
    if (err.name === 'TokenExpiredError') { // Specific JWT token expired error
        return next(ApiError.unauthorized('Authentication token expired. Please log in again.'));
    }

    // Default to a 500 Internal Server Error
    res.status(500).json({
        error: 'An unexpected server error occurred.',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong.' // Show less info in prod
    });
});


// --- Initial Data Seeding (for Development/Testing) ---
async function seedInitialData() {
    logger.info('Checking for initial data and seeding if necessary (Development Mode)...');
    try {
        await ensureUploadDir(); // Ensure base upload directory exists

        // Function to create placeholder files for seeding
        const createPlaceholderFile = async (subDir, fileName) => {
            const filePath = path.join(uploadDir, subDir, fileName);
            try {
                await fs.mkdir(path.dirname(filePath), { recursive: true }); // Ensure sub-directory exists
                await fs.access(filePath); // Check if file already exists
            } catch (err) {
                if (err.code === 'ENOENT') {
                    await fs.writeFile(filePath, Buffer.from('')); // Create an empty file
                    logger.debug(`Created placeholder: ${filePath}`);
                } else {
                    logger.error(`Error checking/creating placeholder ${filePath}:`, err);
                }
            }
        };

        const announcementCount = await Announcement.countDocuments();
        if (announcementCount === 0) {
            await Announcement.insertMany([
                { text: 'Welcome to Aurum Fox Unified Portal!' },
                { text: 'AFOX Phase 1 completed!' }
            ]);
            logger.info('  Initial announcements seeded.');
        }

        const photoCount = await Photo.countDocuments();
        if (photoCount === 0) {
            await createPlaceholderFile(UPLOAD_CONFIG.IMAGE_UPLOAD_DIR, 'photo_placeholder_1.png');
            await createPlaceholderFile(UPLOAD_CONFIG.IMAGE_UPLOAD_DIR, 'photo_placeholder_2.png');
            await Photo.insertMany([
                { title: 'First Day in Office', description: 'Getting started with Aurum Fox.', imageUrl: `${BASE_URL}/${UPLOAD_CONFIG.BASE_DIR}/${UPLOAD_CONFIG.IMAGE_UPLOAD_DIR}/photo_placeholder_1.png`, creatorWallet: "5bW2D6d3jV3oR7s8t9u0v1w2x3y4z5a6b7c8d9e0f1g2h3i4j5k6l7m8n9o0p1q2" },
                { title: 'Aurum Fox Team', description: 'Our dedicated team.', imageUrl: `${BASE_URL}/${UPLOAD_CONFIG.BASE_DIR}/${UPLOAD_CONFIG.IMAGE_UPLOAD_DIR}/photo_placeholder_2.png`, creatorWallet: "9cE4F7g8hI9j0k1l2M3n4o5p6q7r8s9t0U1v2w3x4y5z6a7b8c9d0e1f2g3h4i5j" }
            ]);
            logger.info('  Initial photos seeded.');
        }

        const postCount = await Post.countDocuments();
        if (postCount === 0) {
            await Post.insertMany([
                { title: "Launch Day!", content: "Today marks the official launch of the Aurum Fox Unified Portal. We're excited to bring you a seamless Web3 and multimedia experience!", authorWallet: "6dF3G5h7jK9l1M2n3O4p5q6r7S8t9U0v1W2x3Y4z5a6b7c8d9e0f1g2h3i4j5k6l" },
                { title: "New Features Coming Soon", content: "Stay tuned for exciting new features including decentralized storage options for your media and advanced NFT marketplace functionalities.", authorWallet: "7eG4H6i8kL0m1N2o3P4q5R6s7T8u9V0w1X2y3Z4a5b6c7d8e9f0g1h2i3j4k5l6m" }
            ]);
            logger.info('  Initial posts seeded.');
        }

        const nftCount = await Nft.countDocuments();
        if (nftCount === 0) {
            await createPlaceholderFile(UPLOAD_CONFIG.NFT_UPLOAD_DIR, 'nft_marketplace_1.png');
            await createPlaceholderFile(UPLOAD_CONFIG.NFT_UPLOAD_DIR, 'nft_marketplace_2.png');
            await createPlaceholderFile(UPLOAD_CONFIG.NFT_UPLOAD_DIR, 'nft_user_owned.png');

            await Nft.insertMany([
                {
                    name: "Rare Fox", description: "A very rare golden fox NFT.", image: `${BASE_URL}/${UPLOAD_CONFIG.BASE_DIR}/${UPLOAD_CONFIG.NFT_UPLOAD_DIR}/nft_marketplace_1.png`, mint: "MARKETPLACEMINTA111111111111111111111111111111111111", owner: MARKETPLACE_ESCROW_WALLET, isListed: true, price: 0.8, listedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), listingDuration: 30, listedBy: MARKETPLACE_ESCROW_WALLET, attributes: [{ trait_type: "Rarity", value: "Rare" }],
                    history: [{ type: 'Mint', to: MARKETPLACE_ESCROW_WALLET, timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) }, { type: 'List', from: MARKETPLACE_ESCROW_WALLET, price: 0.8, timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) }]
                },
                {
                    name: "Cunning Fox", description: "A cunning fox ready to pounce.", image: `${BASE_URL}/${UPLOAD_CONFIG.BASE_DIR}/${UPLOAD_CONFIG.NFT_UPLOAD_DIR}/nft_marketplace_2.png`, mint: "MARKETPLACEMINTB222222222222222222222222222222222222", owner: "ANOTHER_SELLER_WALLET_ADDRESS", isListed: true, price: 0.3, listedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), listingDuration: 60, listedBy: "ANOTHER_SELLER_WALLET_ADDRESS", attributes: [{ trait_type: "Expression", value: "Wink" }],
                    history: [{ type: 'Mint', to: "ANOTHER_SELLER_WALLET_ADDRESS", timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000) }, { type: 'List', from: "ANOTHER_SELLER_WALLET_ADDRESS", price: 0.3, timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) }]
                },
                {
                    name: "User Owned Fox", description: "An NFT owned by a user, not yet listed.", image: `${BASE_URL}/${UPLOAD_CONFIG.BASE_DIR}/${UPLOAD_CONFIG.NFT_UPLOAD_DIR}/nft_user_owned.png`, mint: "USEROWNEDMINTC3333333333333333333333333333333333333", owner: "TestUserWalletAddressHere11111111111111111111111111111", isListed: false, price: null, attributes: [{ trait_type: "Color", value: "Blue" }],
                    history: [{ type: 'Mint', to: "TestUserWalletAddressHere11111111111111111111111111111", timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) }]
                }
            ]);
            logger.info('  Initial NFTs seeded.');
        }

        const gameCount = await Game.countDocuments();
        if (gameCount === 0) {
            await Game.insertMany([
                { title: "Solana Chess", description: "Play chess on Solana!", url: "https://example.com/solana-chess", developer: "BlockchainDevs" },
                { title: "Degen Racer", description: "Fast-paced racing game.", url: "https://example.com/degen-racer", developer: "GameFi Studios" }
            ]);
            logger.info('  Initial games seeded.');
        }

        const adCount = await Ad.countDocuments();
        if (adCount === 0) {
            await createPlaceholderFile(UPLOAD_CONFIG.IMAGE_UPLOAD_DIR, 'ad_placeholder.png'); // Assuming ads also use IMAGE_UPLOAD_DIR
            await Ad.insertMany([
                { title: "Buy My Awesome Project!", content: "Check out our new dApp, it's great!", imageUrl: `${BASE_URL}/${UPLOAD_CONFIG.BASE_DIR}/${UPLOAD_CONFIG.IMAGE_UPLOAD_DIR}/ad_placeholder.png`, link: "https://myawesomedapp.com", advertiser: "ProjectX" }
            ]);
            logger.info('  Initial ads seeded.');
        }

        const adminUserCount = await User.countDocuments({ role: ROLES.ADMIN });
        if (adminUserCount === 0) {
            logger.info('  No admin user found. Creating a default admin user...');
            const defaultAdminUser = new User({
                username: 'admin',
                password: process.env.DEFAULT_ADMIN_PASSWORD || 'ChangeMeAdmin123!', // Use ENV variable, then strong fallback
                walletAddress: 'AdminWalletAddressHere11111111111111111111111111111111',
                role: ROLES.ADMIN
            });
            await defaultAdminUser.save(); // pre-save hook will hash password
            logger.warn('  Default admin user created: username "admin". **CRITICAL: CHANGE DEFAULT_ADMIN_PASSWORD IN .ENV IMMEDIATELY!**');
        }
        const regularUserCount = await User.countDocuments({ username: 'testuser' });
        if (regularUserCount === 0) {
            logger.info('  No test user found. Creating a default test user...');
            const defaultTestUser = new User({
                username: 'testuser',
                password: process.env.DEFAULT_TEST_PASSWORD || 'ChangeMeTest123!',
                walletAddress: 'TestUserWalletAddressHere11111111111111111111111111111',
                role: ROLES.USER
            });
            await defaultTestUser.save();
            logger.warn('  Default test user created: username "testuser". **CRITICAL: CHANGE DEFAULT_TEST_PASSWORD IN .ENV IMMEDIATELY!**');
        }
        const developerUserCount = await User.countDocuments({ username: 'devuser' });
        if (developerUserCount === 0) {
            logger.info('  No developer user found. Creating a default developer user...');
            const defaultDevUser = new User({
                username: 'devuser',
                password: process.env.DEFAULT_DEV_PASSWORD || 'ChangeMeDev123!',
                walletAddress: 'DevUserWalletAddressHere111111111111111111111111111111',
                role: ROLES.DEVELOPER
            });
            await defaultDevUser.save();
            logger.warn('  Default developer user created: username "devuser". **CRITICAL: CHANGE DEFAULT_DEV_PASSWORD IN .ENV IMMEDIATELY!**');
        }
        const advertiserUserCount = await User.countDocuments({ username: 'aduser' });
        if (advertiserUserCount === 0) {
            logger.info('  No advertiser user found. Creating a default advertiser user...');
            const defaultAdUser = new User({
                username: 'aduser',
                password: process.env.DEFAULT_AD_PASSWORD || 'ChangeMeAd123!',
                walletAddress: 'AdUserWalletAddressHere111111111111111111111111111111',
                role: ROLES.ADVERTISER
            });
            await defaultAdUser.save();
            logger.warn('  Default advertiser user created: username "aduser". **CRITICAL: CHANGE DEFAULT_AD_PASSWORD IN .ENV IMMEDIATELY!**');
        }
        const publisherUserCount = await User.countDocuments({ username: 'pubuser' });
        if (publisherUserCount === 0) {
            logger.info('  No publisher user found. Creating a default publisher user...');
            const defaultPubUser = new User({
                username: 'pubuser',
                password: process.env.DEFAULT_PUB_PASSWORD || 'ChangeMePub123!',
                walletAddress: 'PubUserWalletAddressHere111111111111111111111111111111',
                role: ROLES.PUBLISHER
            });
            await defaultPubUser.save();
            logger.warn('  Default publisher user created: username "pubuser". **CRITICAL: CHANGE DEFAULT_PUB_PASSWORD IN .ENV IMMEDIATELY!**');
        }

    } catch (error) {
        logger.error('Error seeding initial data:', error);
    }
}

// --- Server Start ---
ensureUploadDir().then(() => {
    app.listen(PORT, () => {
        logger.info(`Backend server listening at ${BASE_URL}`);
        logger.info(`MongoDB URI: ${MONGODB_URI ? 'Connected' : 'NOT SET, using default!'}`); // Indicate if URI is set
        logger.info(`CORS allowed origins: ${ALLOWED_CORS_ORIGINS.join(', ')}`);
        logger.info(`Your frontend should be configured to fetch from ${BASE_URL}`);
        logger.info(`\n--- PRODUCTION CHECKLIST ---`);
        logger.info(`1. Ensure .env file has strong JWT_SECRET, MONGODB_URI, and BASE_URL.`);
        logger.info(`2. Replace local file uploads (Multer) with a cloud storage solution (e.g., AWS S3, Arweave, IPFS).`);
        logger.info(`3. Implement REAL Solana blockchain interactions for NFT minting, listing, buying, and delisting.`);
        logger.info(`4. Change all default user passwords (or remove the seeding logic entirely) for production.`);
        logger.info(`5. MARKETPLACE_ESCROW_WALLET is critical and must be a real, secure Solana address.`);
        logger.info(`----------------------------`);
        if (process.env.NODE_ENV !== 'production') { // Only seed in non-production environments
             seedInitialData();
        } else {
            logger.info('Skipping data seeding in production environment.');
        }
    });
}).catch(err => {
    logger.fatal('Failed to start server due to directory setup error:', err);
    process.exit(1);
});
