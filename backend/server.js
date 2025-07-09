// server.js (Consolidated and Updated)

// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises; // Use fs.promises for async file operations
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken'); // NEW: Import jsonwebtoken
const bcrypt = require('bcryptjs'); // NEW: Import bcryptjs

// --- Solana Imports ---
// IMPORTANT: For real Solana blockchain interactions, uncomment and configure these.
// const { Connection, Keypair, PublicKey, clusterApiUrl, SystemProgram } = require('@solana/web3.js');
// const { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, createTransferInstruction, TOKEN_PROGRAM_ID } = require('@solana/spl-token');
// const bs58 = require('bs58'); // For working with base58 keys, if needed
const { PublicKey } = require('@solana/web3.js'); // Keeping this for isValidSolanaAddress if not uncommenting full web3.js

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/solana_dapp_db_default';
const ALLOWED_CORS_ORIGINS = process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : ['http://127.0.0.1:5500']; // Default for local dev
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`; // Base URL for file access
const JWT_SECRET = process.env.JWT_SECRET; // JWT Secret from .env

// --- Middlewares ---

// Configure CORS for production readiness
app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (e.g., Postman, mobile apps, curl)
        if (!origin) return callback(null, true);
        if (ALLOWED_CORS_ORIGINS.includes(origin)) {
            return callback(null, true);
        }
        const msg = `The CORS policy for this site does not allow access from the specified Origin: ${origin}`;
        return callback(new Error(msg), false);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true // If you handle cookies/sessions
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files from the 'uploads' directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- Multer Setup for File Uploads ---
const uploadDir = 'uploads/';

// Ensure the upload directory exists
async function ensureUploadDir() {
    try {
        await fs.mkdir(uploadDir, { recursive: true });
        console.log(`Upload directory '${uploadDir}' ensured.`);
    } catch (err) {
        console.error(`Error ensuring upload directory '${uploadDir}':`, err);
        // It's critical for the server to not start if uploads cannot be managed
        process.exit(1);
    }
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB file size limit
    fileFilter: (req, file, cb) => {
        const allowedMimeTypes = [
            'image/jpeg', 'image/png', 'image/gif', 'image/webp', // Common image types
            'video/mp4', 'video/webm', 'video/ogg', // Common video types
            'application/json', // For NFT metadata
            'text/html', 'application/javascript', 'application/x-javascript' // For game files (html/js)
        ];
        if (allowedMimeTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only images, videos, JSON, HTML, and JS files are allowed.'));
        }
    }
});

// --- MongoDB Connection ---
mongoose.connect(MONGODB_URI)
    .then(() => console.log('MongoDB connected successfully!'))
    .catch(err => {
        console.error('MongoDB connection error:', err);
        // In production, consider using a proper logging library (e.g., Winston)
        process.exit(1); // Exit the process if unable to connect to the DB
    });

// --- Mongoose Schemas and Models ---

const announcementSchema = new mongoose.Schema({
    text: { type: String, required: true, trim: true },
    date: { type: Date, default: Date.now },
});
const Announcement = mongoose.model('Announcement', announcementSchema);

const photoSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    imageUrl: { type: String, required: true },
    date: { type: Date, default: Date.now },
    creatorWallet: { type: String, required: true, trim: true },
});
const Photo = mongoose.model('Photo', photoSchema);

const postSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true, trim: true },
    date: { type: Date, default: Date.now },
    authorWallet: { type: String, required: true, trim: true },
});
const Post = mongoose.model('Post', postSchema);

const nftSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    image: { type: String, required: true },
    mint: { type: String, required: true, unique: true, index: true, trim: true },
    owner: { type: String, required: true, trim: true },
    isListed: { type: Boolean, default: false },
    price: { type: Number, min: 0 },
    listedAt: Date,
    listingDuration: Number, // Duration in days, hours, etc. (needs clarification for actual use)
    listedBy: { type: String, trim: true },
    attributes: [{ trait_type: { type: String, trim: true }, value: { type: String, trim: true } }],
    history: [{
        type: { type: String, enum: ['Mint', 'Transfer', 'Sale', 'List', 'Delist'], required: true },
        from: { type: String, trim: true },
        to: { type: String, trim: true },
        price: Number,
        timestamp: { type: Date, default: Date.now }
    }]
});
const Nft = mongoose.model('Nft', nftSchema);

const gameSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    url: { type: String, required: true, trim: true }, // URL to access the game (local or external)
    developer: { type: String, trim: true },
});
const Game = mongoose.model('Game', gameSchema);

const adSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true, trim: true },
    imageUrl: String,
    link: { type: String, trim: true }, // URL for the ad
    advertiser: { type: String, trim: true },
});
const Ad = mongoose.model('Ad', adSchema);

// NEW: User Schema and Model
const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 3
    },
    password: { // Will store hashed password
        type: String,
        required: true,
        minlength: 6
    },
    walletAddress: { // User's Solana wallet
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    role: { // User role (e.g., 'user', 'admin', 'developer', 'advertiser', 'publisher')
        type: String,
        enum: ['user', 'admin', 'developer', 'advertiser', 'publisher'],
        default: 'user'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Pre-save hook: Hash password before saving
userSchema.pre('save', async function(next) {
    if (this.isModified('password')) {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
    }
    next();
});

// Method to compare passwords
userSchema.methods.comparePassword = async function(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);


// --- Utility Functions ---

/**
 * Basic Solana public key validation.
 */
function isValidSolanaAddress(address) {
    if (typeof address !== 'string' || address.length < 32 || address.length > 44) {
        return false; // Basic length check for Solana addresses
    }
    try {
        new PublicKey(address);
        return true;
    } catch (e) {
        return false;
    }
}

/**
 * Authentication Middleware: Verifies the JWT token from the Authorization header.
 * Attaches user information (userId, username, walletAddress, role) to req.user.
 */
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Expects "Bearer TOKEN" format

    if (token == null) {
        return res.status(401).json({ error: 'Authentication token required.' });
    }

    if (!JWT_SECRET) {
        console.error("JWT_SECRET is not defined in environment variables!");
        return res.status(500).json({ error: 'Server configuration error: JWT secret missing.' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            // Token verification error (e.g., invalid signature, expired)
            console.warn("JWT verification failed:", err.message);
            return res.status(403).json({ error: 'Invalid or expired token.' });
        }
        // Token is valid, attach user data to the request
        req.user = user;
        next(); // Continue request execution
    });
};

/**
 * Authorization Middleware: Checks the user's role, attached by authenticateToken.
 */
const authorizeRole = (requiredRole) => (req, res, next) => {
    if (!req.user) {
        // This should theoretically be caught by `authenticateToken` first
        return res.status(401).json({ error: 'Not authenticated.' });
    }
    if (req.user.role !== requiredRole) {
        console.warn(`Access denied for user ${req.user.username} (role: ${req.user.role}). Required role: ${requiredRole}`);
        return res.status(403).json({ error: `Access denied. Requires '${requiredRole}' role.` });
    }
    next(); // Continue request execution
};


// --- API Endpoints ---

// NEW: Authentication Endpoints
app.post('/api/auth/register', async (req, res, next) => {
    const { username, password, walletAddress, role } = req.body;

    if (!username || !password || !walletAddress) {
        return res.status(400).json({ error: 'Username, password, and wallet address are required.' });
    }
    if (!isValidSolanaAddress(walletAddress.trim())) {
        return res.status(400).json({ error: 'Invalid Solana wallet address format.' });
    }

    // Role assignment logic:
    // Only an already authenticated 'admin' user can assign roles other than 'user'.
    // If no token is present or user is not an admin, 'role' must be 'user' or absent.
    if (role && role !== 'user') {
        if (!req.headers['authorization']) { // No token present, cannot assign non-user role
            return res.status(403).json({ error: 'Authentication required to assign specific roles.' });
        }
        // Temporarily use authenticateToken to check for admin role if a token is provided for registration
        authenticateToken(req, res, async () => {
            if (req.user && req.user.role === 'admin') {
                // Admin is present and valid, allow assigning specified role
                try {
                    const newUser = new User({
                        username: username.trim(),
                        password: password,
                        walletAddress: walletAddress.trim(),
                        role: role
                    });
                    await newUser.save();
                    res.status(201).json({ message: 'User registered successfully!' });
                } catch (error) {
                    if (error.code === 11000) {
                        return res.status(409).json({ error: 'Username or wallet address already in use.' });
                    }
                    next(error);
                }
            } else {
                // Token present but not an admin, or token invalid after initial check
                return res.status(403).json({ error: 'Only administrators can assign specific roles.' });
            }
        });
        return; // Exit here as authenticateToken will handle response
    }

    // Default registration for 'user' role
    try {
        const newUser = new User({
            username: username.trim(),
            password: password,
            walletAddress: walletAddress.trim(),
            role: 'user' // Default to 'user' if no role specified or not admin
        });
        await newUser.save();
        res.status(201).json({ message: 'User registered successfully!' });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ error: 'Username or wallet address already in use.' });
        }
        next(error);
    }
});

app.post('/api/auth/login', async (req, res, next) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required.' });
    }

    try {
        const user = await User.findOne({ username: username.trim() });
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials.' });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials.' });
        }

        // Create JWT
        const token = jwt.sign(
            {
                userId: user._id,
                username: user.username,
                walletAddress: user.walletAddress,
                role: user.role
            },
            JWT_SECRET,
            { expiresIn: '1h' } // Token expires in 1 hour
        );

        res.json({ message: 'Logged in successfully!', token: token, user: {
            id: user._id,
            username: user.username,
            walletAddress: user.walletAddress,
            role: user.role
        }});
    } catch (error) {
        next(error);
    }
});


// Announcements API - Admin role required for POST
app.get('/api/announcements', async (req, res, next) => {
    try {
        const announcements = await Announcement.find().sort({ date: -1 });
        res.json(announcements);
    } catch (error) {
        next(error);
    }
});
app.post('/api/announcements', authenticateToken, authorizeRole('admin'), async (req, res, next) => {
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

// Games API - Developer role required for POST
app.get('/api/games', async (req, res, next) => {
    try {
        const games = await Game.find();
        res.json(games);
    } catch (error) {
        next(error);
    }
});
app.post('/api/games', authenticateToken, authorizeRole('developer'), upload.single('gameFile'), async (req, res, next) => {
    const { title, description, developer, url: externalUrl } = req.body;

    if (!title || title.trim().length === 0 ||
        !description || description.trim().length === 0 ||
        !developer || developer.trim().length === 0) {
        if (req.file) { try { await fs.unlink(req.file.path); } catch (e) { console.error('Error cleaning up file:', e); } }
        return res.status(400).json({ error: 'Title, description, and developer are required to add a game.' });
    }

    let gameUrl = externalUrl ? externalUrl.trim() : null;

    if (req.file) {
        gameUrl = `${BASE_URL}/uploads/${req.file.filename}`;
    } else if (!gameUrl) {
        return res.status(400).json({ error: 'Either a game file must be uploaded or a valid external URL must be provided.' });
    }

    try {
        const newGame = new Game({
            title: title.trim(),
            description: description.trim(),
            url: gameUrl,
            developer: developer.trim()
        });
        await newGame.save();
        res.status(201).json({ message: 'Game added successfully', game: newGame });
    } catch (error) {
        if (req.file) { try { await fs.unlink(req.file.path); } catch (e) { console.error('Error cleaning up file on DB error:', e); } }
        next(error);
    }
});


// Ads API - Advertiser role required for POST
app.get('/api/ads', async (req, res, next) => {
    try {
        const ads = await Ad.find();
        res.json(ads);
    } catch (error) {
        next(error);
    }
});
app.post('/api/ads', authenticateToken, authorizeRole('advertiser'), upload.single('adCreative'), async (req, res, next) => {
    const { title, content, link, advertiser } = req.body;

    if (!title || title.trim().length === 0 ||
        !content || content.trim().length === 0 ||
        !advertiser || advertiser.trim().length === 0) {
        if (req.file) { try { await fs.unlink(req.file.path); } catch (e) { console.error('Error cleaning up file:', e); } }
        return res.status(400).json({ error: 'Title, content, and advertiser are required to post an ad.' });
    }

    let imageUrl = null;
    if (req.file) {
        imageUrl = `${BASE_URL}/uploads/${req.file.filename}`;
    }

    try {
        const newAd = new Ad({
            title: title.trim(),
            content: content.trim(),
            imageUrl,
            link: link ? link.trim() : null,
            advertiser: advertiser.trim()
        });
        await newAd.save();
        res.status(201).json({ message: 'Ad posted successfully', ad: newAd });
    } catch (error) {
        if (req.file) { try { await fs.unlink(req.file.path); } catch (e) { console.error('Error cleaning up file on DB error:', e); } }
        next(error);
    }
});


// Photos API - Authenticated user required for POST
app.get('/api/photos', async (req, res, next) => {
    try {
        const photos = await Photo.find().sort({ date: -1 });
        res.json(photos);
    } catch (error) {
        next(error);
    }
});
app.post('/api/photos/upload', authenticateToken, upload.single('photo'), async (req, res, next) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No photo file uploaded.' });
    }
    const { title, description, creatorWallet } = req.body;

    if (!title || title.trim().length === 0 ||
        !creatorWallet || creatorWallet.trim().length === 0) {
        try { await fs.unlink(req.file.path); } catch (e) { console.error('Error cleaning up file:', e); }
        return res.status(400).json({ error: 'Photo title and creator wallet are required.' });
    }

    if (!isValidSolanaAddress(creatorWallet.trim())) {
        try { await fs.unlink(req.file.path); } catch (e) { console.error('Error cleaning up file:', e); }
        return res.status(400).json({ error: 'Invalid Solana wallet address format for creatorWallet.' });
    }

    const imageUrl = `${BASE_URL}/uploads/${req.file.filename}`;

    try {
        const newPhoto = new Photo({
            title: title.trim(),
            description: description ? description.trim() : '',
            imageUrl,
            creatorWallet: creatorWallet.trim()
        });
        await newPhoto.save();
        res.status(201).json({ message: 'Photo uploaded successfully.', photo: newPhoto });
    } catch (error) {
        if (req.file) { try { await fs.unlink(req.file.path); } catch (e) { console.error('Error cleaning up file on DB error:', e); } }
        next(error);
    }
});

// Posts API - Publisher role required for POST
app.get('/api/posts', async (req, res, next) => {
    try {
        const posts = await Post.find().sort({ date: -1 });
        res.json(posts);
    } catch (error) {
        next(error);
    }
});
app.post('/api/posts', authenticateToken, authorizeRole('publisher'), async (req, res, next) => {
    const { title, content, authorWallet } = req.body;
    if (!title || title.trim().length === 0 ||
        !content || content.trim().length === 0 ||
        !authorWallet || authorWallet.trim().length === 0) {
        return res.status(400).json({ error: 'Title, content, and author wallet are required.' });
    }
    if (!isValidSolanaAddress(authorWallet.trim())) {
        return res.status(400).json({ error: 'Invalid Solana wallet address format for authorWallet.' });
    }

    try {
        const newPost = new Post({
            title: title.trim(),
            content: content.trim(),
            authorWallet: authorWallet.trim()
        });
        await newPost.save();
        res.status(201).json({ message: 'Post published successfully', post: newPost });
    } catch (error) {
        next(error);
    }
});


// NFTs API (Simulated Blockchain Interaction) - Authenticated user for prepare-mint, list, buy
app.get('/api/nfts/marketplace', async (req, res, next) => {
    try {
        const nfts = await Nft.find();
        res.json({ nfts: nfts, marketplaceOwnerWallet: "MARKETPLACE_ESCROW_WALLET_ADDRESS_HERE" });
    } catch (error) {
        next(error);
    }
});

app.post('/api/nfts/prepare-mint', authenticateToken, upload.single('nftFile'), async (req, res, next) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No NFT file uploaded.' });
    }
    const { name, description, attributes, creatorWallet } = req.body;

    if (!name || name.trim().length === 0 ||
        !description || description.trim().length === 0 ||
        !creatorWallet || creatorWallet.trim().length === 0) {
        try { await fs.unlink(req.file.path); } catch (e) { console.error('Error cleaning up file:', e); }
        return res.status(400).json({ error: 'Name, description, and creator wallet are required for NFT preparation.' });
    }
    if (!isValidSolanaAddress(creatorWallet.trim())) {
        try { await fs.unlink(req.file.path); } catch (e) { console.error('Error cleaning up file:', e); }
        return res.status(400).json({ error: 'Invalid Solana wallet address format for creatorWallet.' });
    }

    const contentUrl = `${BASE_URL}/uploads/${req.file.filename}`;

    const nftMetadata = {
        name: name.trim(),
        symbol: "AFOXNFT",
        description: description.trim(),
        image: contentUrl,
        properties: {
            files: [{
                uri: contentUrl,
                type: req.file.mimetype,
            }],
            category: req.file.mimetype.startsWith('image') ? 'image' : 'video',
            creators: [{
                address: creatorWallet.trim(),
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
            } else {
                console.warn("NFT preparation: 'attributes' field was provided but not a valid JSON array.");
            }
        }
    } catch (e) {
        console.warn("NFT preparation: Could not parse attributes JSON:", e.message);
    }

    const metadataFileName = `${path.basename(req.file.filename, path.extname(req.file.filename))}.json`;
    metadataFilePath = path.join(__dirname, uploadDir, metadataFileName);

    try {
        await fs.writeFile(metadataFilePath, JSON.stringify(nftMetadata, null, 2));
    } catch (error) {
        console.error('Error writing NFT metadata file:', error);
        try { await fs.unlink(req.file.path); } catch (e) { console.error('Error cleaning up NFT file:', e); }
        return res.status(500).json({ error: 'Failed to save NFT metadata file.' });
    }

    const metadataUri = `${BASE_URL}/uploads/${metadataFileName}`;

    const simulatedMintAddress = `SIMULATED_MINT_${Date.now()}_${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

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

        res.status(201).json({
            message: 'NFT assets prepared and simulated mint successful.',
            uri: metadataUri,
            mintAddress: simulatedMintAddress,
            imageUrl: contentUrl,
            signature: 'SIMULATED_TRANSACTION_SIGNATURE_FROM_BACKEND',
            nft: newNft
        });
    } catch (error) {
        if (req.file) { try { await fs.unlink(req.file.path); } catch (e) { console.error('Error cleaning up NFT file:', e); } }
        if (metadataFilePath) { try { await fs.unlink(metadataFilePath); } catch (e) { console.error('Error cleaning up NFT metadata file:', e); } }
        next(error);
    }
});

app.post('/api/nfts/list', authenticateToken, async (req, res, next) => {
    const { mintAddress, price, duration, sellerWallet } = req.body;

    if (!mintAddress || mintAddress.trim().length === 0 ||
        !price || isNaN(price) || Number(price) <= 0 ||
        !duration || isNaN(duration) || Number(duration) <= 0 ||
        !sellerWallet || sellerWallet.trim().length === 0) {
        return res.status(400).json({ error: 'Missing or invalid required fields for listing (mintAddress, price, duration, sellerWallet).' });
    }
    if (!isValidSolanaAddress(sellerWallet.trim())) {
        return res.status(400).json({ error: 'Invalid Solana wallet address format for sellerWallet.' });
    }

    try {
        const nft = await Nft.findOneAndUpdate(
            { mint: mintAddress.trim(), owner: sellerWallet.trim(), isListed: false },
            {
                $set: {
                    isListed: true,
                    price: Number(price),
                    listedAt: new Date(),
                    listingDuration: Number(duration),
                    listedBy: sellerWallet.trim(),
                },
                $push: { history: { type: 'List', from: sellerWallet.trim(), timestamp: new Date() } }
            },
            { new: true }
        );

        if (!nft) {
            return res.status(404).json({ error: 'NFT not found, you are not the owner, or it is already listed.' });
        }

        console.log(`NFT ${mintAddress} listed by ${sellerWallet} for ${price} SOL (simulated).`);
        res.status(200).json({ message: `NFT ${mintAddress} listed for sale for ${price} SOL (simulated).`, nft });
    } catch (error) {
        next(error);
    }
});

app.post('/api/nfts/buy', authenticateToken, async (req, res, next) => {
    const { mintAddress, buyerWallet, sellerWallet, price } = req.body;

    if (!mintAddress || mintAddress.trim().length === 0 ||
        !buyerWallet || buyerWallet.trim().length === 0 ||
        !sellerWallet || sellerWallet.trim().length === 0 ||
        !price || isNaN(price) || Number(price) <= 0) {
        return res.status(400).json({ error: 'Missing or invalid required fields for buying NFT.' });
    }
    if (buyerWallet.trim() === sellerWallet.trim()) {
        return res.status(400).json({ error: 'Cannot buy your own NFT.' });
    }
    if (!isValidSolanaAddress(buyerWallet.trim()) || !isValidSolanaAddress(sellerWallet.trim())) {
        return res.status(400).json({ error: 'Invalid Solana wallet address format for buyerWallet or sellerWallet.' });
    }

    try {
        const nft = await Nft.findOneAndUpdate(
            { mint: mintAddress.trim(), owner: sellerWallet.trim(), isListed: true, price: Number(price) },
            {
                $set: {
                    owner: buyerWallet.trim(),
                    isListed: false,
                    price: null,
                    listedAt: null,
                    listingDuration: null,
                    listedBy: null
                },
                $push: { history: { type: 'Sale', from: sellerWallet.trim(), to: buyerWallet.trim(), price: Number(price), timestamp: new Date() } }
            },
            { new: true }
        );

        if (!nft) {
            return res.status(404).json({ error: 'NFT not found, not listed, or seller/price mismatch.' });
        }

        res.status(200).json({
            message: `NFT ${nft.name} successfully purchased (simulated).`,
            nft,
            serializedTransaction: 'SIMULATED_TRANSACTION_BASE64_FOR_CLIENT_SIGNING'
        });
        console.log(`NFT ${nft.name} transferred from ${sellerWallet} to ${buyerWallet} for ${price} SOL (simulated).`);

    } catch (error) {
        next(error);
    }
});


app.get('/api/nfts/:mint/history', async (req, res, next) => {
    const { mint } = req.params;
    if (!mint || mint.trim().length === 0) {
        return res.status(400).json({ error: 'NFT mint address is required.' });
    }

    try {
        const nft = await Nft.findOne({ mint: mint.trim() });
        if (!nft) {
            return res.status(404).json({ error: 'NFT not found.' });
        }
        res.json(nft.history);
    } catch (error) {
        next(error);
    }
});


// --- Centralized Express Error Handler ---
app.use((err, req, res, next) => {
    console.error('Unhandled API Error:', err);
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({ error: 'File too large. Max 10MB allowed.' });
        }
        return res.status(400).json({ error: err.message });
    }
    // Generic error response for unhandled errors
    res.status(500).json({ error: 'An unexpected server error occurred.' });
});


// --- Initial Data Seeding ---
async function seedInitialData() {
    console.log('Checking for initial data and seeding if necessary...');
    try {
        const announcementCount = await Announcement.countDocuments();
        if (announcementCount === 0) {
            await Announcement.insertMany([
                { text: 'Welcome to Aurum Fox Unified Portal!', date: new Date() },
                { text: 'AFOX Phase 1 completed!', date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) }
            ]);
            console.log('  Initial announcements seeded.');
        }

        const photoCount = await Photo.countDocuments();
        if (photoCount === 0) {
            // Create placeholder image files if they don't exist
            const placeholderPhoto1Path = path.join(uploadDir, 'photo_placeholder_1.png');
            const placeholderPhoto2Path = path.join(uploadDir, 'photo_placeholder_2.png');
            try {
                await fs.access(placeholderPhoto1Path);
            } catch (err) {
                await fs.writeFile(placeholderPhoto1Path, Buffer.from([])); // Create an empty file
                console.log(`Created placeholder: ${placeholderPhoto1Path}`);
            }
            try {
                await fs.access(placeholderPhoto2Path);
            } catch (err) {
                await fs.writeFile(placeholderPhoto2Path, Buffer.from([]));
                console.log(`Created placeholder: ${placeholderPhoto2Path}`);
            }

            await Photo.insertMany([
                { title: 'First Day in Office', description: 'Getting started with Aurum Fox.', imageUrl: `${BASE_URL}/uploads/photo_placeholder_1.png`, date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), creatorWallet: "SIMULATED_WALLET_A_PHOTO" },
                { title: 'Aurum Fox Team', description: 'Our dedicated team.', imageUrl: `${BASE_URL}/uploads/photo_placeholder_2.png`, date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), creatorWallet: "SIMULATED_WALLET_B_PHOTO" }
            ]);
            console.log('  Initial photos seeded.');
        }

        const postCount = await Post.countDocuments();
        if (postCount === 0) {
            await Post.insertMany([
                { title: "Launch Day!", content: "Today marks the official launch of the Aurum Fox Unified Portal. We're excited to bring you a seamless Web3 and multimedia experience!", date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), authorWallet: "SIMULATED_AUTHOR_WALLET_1" },
                { title: "New Features Coming Soon", content: "Stay tuned for exciting new features including decentralized storage options for your media and advanced NFT marketplace functionalities.", date: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000), authorWallet: "SIMULATED_AUTHOR_WALLET_2" }
            ]);
            console.log('  Initial posts seeded.');
        }

        const nftCount = await Nft.countDocuments();
        if (nftCount === 0) {
            // Create placeholder image files if they don't exist
            const nftPlaceholder1Path = path.join(uploadDir, 'nft_marketplace_1.png');
            const nftPlaceholder2Path = path.join(uploadDir, 'nft_marketplace_2.png');
            const nftUserOwnedPath = path.join(uploadDir, 'nft_user_owned.png');
            try { await fs.access(nftPlaceholder1Path); } catch (err) { await fs.writeFile(nftPlaceholder1Path, Buffer.from([])); console.log(`Created placeholder: ${nftPlaceholder1Path}`); }
            try { await fs.access(nftPlaceholder2Path); } catch (err) { await fs.writeFile(nftPlaceholder2Path, Buffer.from([])); console.log(`Created placeholder: ${nftPlaceholder2Path}`); }
            try { await fs.access(nftUserOwnedPath); } catch (err) { await fs.writeFile(nftUserOwnedPath, Buffer.from([])); console.log(`Created placeholder: ${nftUserOwnedPath}`); }

            await Nft.insertMany([
                {
                    name: "Rare Fox", description: "A very rare golden fox NFT.", image: `${BASE_URL}/uploads/nft_marketplace_1.png`, mint: "SOME_MARKETPLACE_NFT_MINT_1", owner: "MARKETPLACE_ESCROW_WALLET_ADDRESS_HERE", isListed: true, price: 0.8, listedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), listingDuration: 30, listedBy: "MARKETPLACE_ESCROW_WALLET_ADDRESS_HERE", attributes: [{ trait_type: "Rarity", value: "Rare" }],
                    history: [{ type: 'Mint', to: "MARKETPLACE_ESCROW_WALLET_ADDRESS_HERE", timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) }, { type: 'List', from: "MARKETPLACE_ESCROW_WALLET_ADDRESS_HERE", timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) }]
                },
                {
                    name: "Cunning Fox", description: "A cunning fox ready to pounce.", image: `${BASE_URL}/uploads/nft_marketplace_2.png`, mint: "SOME_MARKETPLACE_NFT_MINT_2", owner: "ANOTHER_SELLER_WALLET_ADDRESS", isListed: true, price: 0.3, listedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), listingDuration: 60, listedBy: "ANOTHER_SELLER_WALLET_ADDRESS", attributes: [{ trait_type: "Expression", value: "Wink" }],
                    history: [{ type: 'Mint', to: "ANOTHER_SELLER_WALLET_ADDRESS", timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000) }, { type: 'List', from: "ANOTHER_SELLER_WALLET_ADDRESS", timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) }]
                },
                {
                    name: "User Owned Fox", description: "An NFT owned by a user, not yet listed.", image: `${BASE_URL}/uploads/nft_user_owned.png`, mint: "USER_OWNED_NFT_MINT_1", owner: "SIMULATED_USER_WALLET_ADDRESS", isListed: false, price: null, attributes: [{ trait_type: "Color", value: "Blue" }],
                    history: [{ type: 'Mint', to: "SIMULATED_USER_WALLET_ADDRESS", timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) }]
                }
            ]);
            console.log('  Initial NFTs seeded.');
        }

        const gameCount = await Game.countDocuments();
        if (gameCount === 0) {
            await Game.insertMany([
                { title: "Solana Chess", description: "Play chess on Solana!", url: "https://example.com/solana-chess", developer: "BlockchainDevs" },
                { title: "Degen Racer", description: "Fast-paced racing game.", url: "https://example.com/degen-racer", developer: "GameFi Studios" }
            ]);
            console.log('  Initial games seeded.');
        }

        const adCount = await Ad.countDocuments();
        if (adCount === 0) {
            const adPlaceholderPath = path.join(uploadDir, 'ad_placeholder.png');
            try { await fs.access(adPlaceholderPath); } catch (err) { await fs.writeFile(adPlaceholderPath, Buffer.from([])); console.log(`Created placeholder: ${adPlaceholderPath}`); }

            await Ad.insertMany([
                { title: "Buy My Awesome Project!", content: "Check out our new dApp, it's great!", imageUrl: `${BASE_URL}/uploads/ad_placeholder.png`, link: "https://myawesomedapp.com", advertiser: "ProjectX" }
            ]);
            console.log('  Initial ads seeded.');
        }

        // Check and add default users for testing, if they don't exist
        const adminUserCount = await User.countDocuments({ role: 'admin' });
        if (adminUserCount === 0) {
            console.log('  No admin user found. Creating a default admin user...');
            const defaultAdminUser = new User({
                username: 'admin',
                password: 'admin_password_123', // !!! CHANGE THIS IN PRODUCTION !!!
                walletAddress: 'AdminWalletAddressHere11111111111111111111111111111111',
                role: 'admin'
            });
            await defaultAdminUser.save();
            console.log('  Default admin user created: username "admin", password "admin_password_123". PLEASE CHANGE THIS IN PRODUCTION!');
        }
        const regularUserCount = await User.countDocuments({ username: 'testuser' });
        if (regularUserCount === 0) {
            console.log('  No test user found. Creating a default test user...');
            const defaultTestUser = new User({
                username: 'testuser',
                password: 'test_password_123', // !!! CHANGE THIS IN PRODUCTION !!!
                walletAddress: 'TestUserWalletAddressHere11111111111111111111111111111',
                role: 'user'
            });
            await defaultTestUser.save();
            console.log('  Default test user created: username "testuser", password "test_password_123".');
        }

    } catch (error) {
        console.error('Error seeding initial data:', error);
    }
}

// --- Server Start ---
// Ensure upload directory exists before starting the server and seeding data
ensureUploadDir().then(() => {
    app.listen(PORT, () => {
        console.log(`Backend server listening at ${BASE_URL}`);
        console.log(`MongoDB URI: ${MONGODB_URI}`);
        console.log(`CORS allowed origins: ${ALLOWED_CORS_ORIGINS.join(', ')}`);
        console.log(`Your frontend should be configured to fetch from ${BASE_URL}`);
        console.log(`\nIMPORTANT: For production, ensure JWT_SECRET is strong and database initialized users have strong passwords.`);
        console.log(`Also, remember to replace local file paths with cloud storage (e.g., S3, Arweave/IPFS) and implement real Solana blockchain interactions.`);
        seedInitialData(); // Calls the data seeding function when the server starts
    });
});
