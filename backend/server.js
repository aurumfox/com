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
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// --- Solana Imports (for validation, not full interaction) ---
// For full blockchain interactions, you would need more: Connection, Keypair, Transaction, etc.
const { PublicKey } = require('@solana/web3.js');

const app = express();
const PORT = process.env.PORT || 3000;
// CRITICAL: MONGODB_URI MUST be set in .env for production.
const MONGODB_URI = process.env.MONGODB_URI;
// Robust CORS origin parsing and default.
const ALLOWED_CORS_ORIGINS = process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : ['http://127.0.0.1:5500', 'http://localhost:5500'];
// BASE_URL should be your deployed domain in production (e.g., https://api.yourapp.com)
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
// CRITICAL: JWT_SECRET MUST be set in .env for production.
const JWT_SECRET = process.env.JWT_SECRET;
// Placeholder for a real marketplace wallet in production
const MARKETPLACE_ESCROW_WALLET = process.env.MARKETPLACE_ESCROW_WALLET || 'YOUR_REAL_MARKETPLACE_ESCROW_WALLET_ADDRESS';


// --- Security & Configuration Checks ---
if (!JWT_SECRET || JWT_SECRET.length < 32) {
    console.error('ERROR: JWT_SECRET environment variable is missing or too short. Please set a strong, random secret (e.g., 32+ characters) in your .env file.');
    process.exit(1);
}
if (!MONGODB_URI) {
    console.error('ERROR: MONGODB_URI environment variable is missing. Please set your MongoDB connection string in your .env file.');
    process.exit(1);
}
if (!MARKETPLACE_ESCROW_WALLET || !isValidSolanaAddress(MARKETPLACE_ESCROW_WALLET)) {
    console.warn('WARNING: MARKETPLACE_ESCROW_WALLET environment variable is missing or invalid. Set a real Solana address for production.');
}


// --- Middlewares ---

app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (ALLOWED_CORS_ORIGINS.includes(origin)) {
            return callback(null, true);
        }
        const msg = `The CORS policy for this site does not allow access from the specified Origin: ${origin}`;
        return callback(new Error(msg), false);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files for uploads - FOR DEVELOPMENT/TESTING ONLY
// In production, consider serving these from a CDN or cloud storage
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- Multer Setup for File Uploads ---
const uploadDir = 'uploads/'; // Local upload directory - **REPLACE WITH CLOUD STORAGE IN PRODUCTION**

async function ensureUploadDir() {
    try {
        await fs.mkdir(uploadDir, { recursive: true });
        console.log(`Upload directory '${uploadDir}' ensured.`);
    } catch (err) {
        console.error(`Error ensuring upload directory '${uploadDir}':`, err);
        process.exit(1); // Exit if crucial directory can't be created
    }
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const originalName = path.parse(file.originalname).name;
        const extension = path.parse(file.originalname).ext;
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const sanitizedOriginalName = originalName.replace(/[^a-zA-Z0-9-]/g, '_').substring(0, 50);
        cb(null, `${sanitizedOriginalName}-${uniqueSuffix}${extension}`);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB file size limit
    fileFilter: (req, file, cb) => {
        const allowedMimeTypes = [
            'image/jpeg', 'image/png', 'image/gif', 'image/webp',
            'video/mp4', 'video/webm', 'video/ogg',
            'application/json',
            'text/html', 'application/javascript'
        ];
        if (allowedMimeTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`Invalid file type: ${file.mimetype}. Only images, videos, JSON, HTML, and JS files are allowed.`), false);
        }
    }
});

// --- MongoDB Connection ---
mongoose.connect(MONGODB_URI)
    .then(() => console.log('MongoDB connected successfully!'))
    .catch(err => {
        console.error('MongoDB connection error:', err);
        process.exit(1); // Exit if DB connection fails
    });

// --- Mongoose Schemas and Models ---
// All schemas now include timestamps: true by default
const announcementSchema = new mongoose.Schema({
    text: { type: String, required: true, trim: true, minlength: 5, maxlength: 500 },
}, { timestamps: true });
const Announcement = mongoose.model('Announcement', announcementSchema);

const photoSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true, minlength: 3, maxlength: 100 },
    description: { type: String, trim: true, maxlength: 1000 },
    imageUrl: { type: String, required: true, trim: true, match: /^https?:\/\/.+/ },
    creatorWallet: {
        type: String,
        required: true,
        trim: true,
        validate: {
            validator: (v) => isValidSolanaAddress(v),
            message: props => `${props.value} is not a valid Solana address!`
        }
    },
}, { timestamps: true });
const Photo = mongoose.model('Photo', photoSchema);

const postSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true, minlength: 5, maxlength: 200 },
    content: { type: String, required: true, trim: true, minlength: 10 },
    authorWallet: {
        type: String,
        required: true,
        trim: true,
        validate: {
            validator: (v) => isValidSolanaAddress(v),
            message: props => `${props.value} is not a valid Solana address!`
        }
    },
}, { timestamps: true });
const Post = mongoose.model('Post', postSchema);

const nftSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true, minlength: 3, maxlength: 100 },
    description: { type: String, trim: true, maxlength: 1000 },
    image: { type: String, required: true, trim: true, match: /^https?:\/\/.+/ },
    mint: { type: String, required: true, unique: true, index: true, trim: true, minlength: 32, maxlength: 44 },
    owner: {
        type: String,
        required: true,
        trim: true,
        validate: {
            validator: (v) => isValidSolanaAddress(v),
            message: props => `${props.value} is not a valid Solana address!`
        }
    },
    isListed: { type: Boolean, default: false },
    price: { type: Number, min: 0, required: function() { return this.isListed; } },
    listedAt: Date,
    listingDuration: { type: Number, min: 1, required: function() { return this.isListed; } },
    listedBy: {
        type: String,
        trim: true,
        validate: {
            validator: (v) => !v || isValidSolanaAddress(v),
            message: props => `${props.value} is not a valid Solana address!`
        }
    },
    attributes: [{
        trait_type: { type: String, trim: true, minlength: 1, maxlength: 50 },
        value: { type: String, trim: true, minlength: 1, maxlength: 100 }
    }],
    history: [{
        type: { type: String, enum: ['Mint', 'Transfer', 'Sale', 'List', 'Delist'], required: true },
        from: { type: String, trim: true },
        to: { type: String, trim: true },
        price: Number,
        timestamp: { type: Date, default: Date.now }
    }]
}, { timestamps: true });
const Nft = mongoose.model('Nft', nftSchema);

const gameSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true, minlength: 3, maxlength: 100 },
    description: { type: String, trim: true, maxlength: 1000 },
    url: { type: String, required: true, trim: true, match: /^https?:\/\/.+/ },
    developer: { type: String, trim: true, minlength: 3, maxlength: 100 },
}, { timestamps: true });
const Game = mongoose.model('Game', gameSchema);

const adSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true, minlength: 3, maxlength: 100 },
    content: { type: String, required: true, trim: true, minlength: 10, maxlength: 1000 },
    imageUrl: { type: String, trim: true, match: /^https?:\/\/.+/, default: null },
    link: { type: String, trim: true, match: /^https?:\/\/.+/, default: null },
    advertiser: { type: String, trim: true, minlength: 3, maxlength: 100 },
}, { timestamps: true });
const Ad = mongoose.model('Ad', adSchema);

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 3,
        maxlength: 30
    },
    password: {
        type: String,
        required: true,
        minlength: 6,
        maxlength: 100
    },
    walletAddress: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        validate: {
            validator: (v) => isValidSolanaAddress(v),
            message: props => `${props.value} is not a valid Solana address!`
        }
    },
    role: {
        type: String,
        enum: ['user', 'admin', 'developer', 'advertiser', 'publisher'],
        default: 'user'
    },
}, { timestamps: true });

userSchema.pre('save', async function(next) {
    if (this.isModified('password')) {
        // Enforce strong password requirements
        if (this.password.length < 8 || !/[A-Z]/.test(this.password) || !/[a-z]/.test(this.password) || !/[0-9]/.test(this.password) || !/[^A-Za-z0-9]/.test(this.password)) {
            return next(new Error('Password must be at least 8 characters long and include uppercase, lowercase, numbers, and special characters.'));
        }
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
    }
    next();
});

userSchema.methods.comparePassword = async function(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);

// --- Utility Functions ---

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

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Authentication token is required. Please log in.' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({ error: 'Authentication token expired. Please log in again.' });
            }
            console.warn("JWT verification failed:", err.message);
            return res.status(403).json({ error: 'Invalid authentication token.' });
        }
        req.user = user;
        next();
    });
};

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


// --- API Endpoints ---

// Authentication Endpoints
app.post('/api/auth/register', async (req, res, next) => {
    const { username, password, walletAddress, role } = req.body;

    if (!username || !password || !walletAddress) {
        return res.status(400).json({ error: 'Username, password, and wallet address are required.' });
    }
    if (typeof username !== 'string' || typeof password !== 'string' || typeof walletAddress !== 'string') {
        return res.status(400).json({ error: 'Invalid data types for registration fields.' });
    }
    if (!isValidSolanaAddress(walletAddress.trim())) {
        return res.status(400).json({ error: 'Invalid Solana wallet address format.' });
    }

    // Admins can assign roles, others default to 'user'
    let assignedRole = 'user';
    if (role && role !== 'user') {
        try {
            const authHeader = req.headers['authorization'];
            const token = authHeader && authHeader.split(' ')[1];

            if (!token) {
                return res.status(403).json({ error: 'Authentication token required to assign specific roles.' });
            }

            const decodedUser = jwt.verify(token, JWT_SECRET);
            if (decodedUser.role !== 'admin') {
                return res.status(403).json({ error: 'Only administrators can assign specific roles.' });
            }
            assignedRole = role; // If admin and role provided, use it
        } catch (err) {
            console.warn("Role assignment attempt failed:", err.message);
            return res.status(403).json({ error: 'Invalid or expired token for role assignment, or not authorized.' });
        }
    }

    try {
        const newUser = new User({
            username: username.trim(),
            password: password,
            walletAddress: walletAddress.trim(),
            role: assignedRole
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
    if (typeof username !== 'string' || typeof password !== 'string') {
        return res.status(400).json({ error: 'Invalid data types for login credentials.' });
    }

    try {
        const user = await User.findOne({ username: username.trim() });
        if (!user) {
            return res.status(401).json({ error: 'Invalid username or password.' });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid username or password.' });
        }

        const token = jwt.sign(
            {
                userId: user._id,
                username: user.username,
                walletAddress: user.walletAddress,
                role: user.role
            },
            JWT_SECRET,
            { expiresIn: '1h' }
        );

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

// Announcements API
app.get('/api/announcements', async (req, res, next) => {
    try {
        const announcements = await Announcement.find().sort({ createdAt: -1 });
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

// Games API
app.get('/api/games', async (req, res, next) => {
    try {
        const games = await Game.find().sort({ createdAt: -1 });
        res.json(games);
    } catch (error) {
        next(error);
    }
});
app.post('/api/games', authenticateToken, authorizeRole('developer'), upload.single('gameFile'), async (req, res, next) => {
    const { title, description, developer, url: externalUrl } = req.body;

    // Validate inputs
    if (!title || !description || !developer) {
        if (req.file) { await fs.unlink(req.file.path).catch(e => console.error('Error cleaning up file:', e)); }
        return res.status(400).json({ error: 'Title, description, and developer are required to add a game.' });
    }
    const trimmedTitle = String(title).trim();
    const trimmedDescription = String(description).trim();
    const trimmedDeveloper = String(developer).trim();
    const trimmedExternalUrl = externalUrl ? String(externalUrl).trim() : null;

    if (trimmedTitle.length === 0 || trimmedDescription.length === 0 || trimmedDeveloper.length === 0) {
        if (req.file) { await fs.unlink(req.file.path).catch(e => console.error('Error cleaning up file:', e)); }
        return res.status(400).json({ error: 'Title, description, and developer cannot be empty.' });
    }

    let gameUrl;

    if (req.file) {
        // In PRODUCTION, you would upload req.file to cloud storage (e.g., S3, Arweave, IPFS)
        // and set gameUrl to the public URL of that cloud resource.
        // Example: const uploadResult = await uploadFileToS3(req.file);
        // gameUrl = uploadResult.publicUrl;
        console.warn('WARNING: Game file uploaded to local storage. Use cloud storage in production!');
        gameUrl = `${BASE_URL}/uploads/${req.file.filename}`;
    } else if (trimmedExternalUrl) {
        gameUrl = trimmedExternalUrl;
    } else {
        return res.status(400).json({ error: 'Either a game file must be uploaded or a valid external URL must be provided.' });
    }

    if (gameUrl && !/^https?:\/\/.+/.test(gameUrl)) {
        if (req.file) { await fs.unlink(req.file.path).catch(e => console.error('Error cleaning up file:', e)); }
        return res.status(400).json({ error: 'Provided game URL is not valid.' });
    }

    try {
        const newGame = new Game({
            title: trimmedTitle,
            description: trimmedDescription,
            url: gameUrl,
            developer: trimmedDeveloper
        });
        await newGame.save();
        res.status(201).json({ message: 'Game added successfully', game: newGame });
    } catch (error) {
        if (req.file) { await fs.unlink(req.file.path).catch(e => console.error('Error cleaning up file on DB error:', e)); }
        next(error);
    }
});

// Ads API
app.get('/api/ads', async (req, res, next) => {
    try {
        const ads = await Ad.find().sort({ createdAt: -1 });
        res.json(ads);
    } catch (error) {
        next(error);
    }
});
app.post('/api/ads', authenticateToken, authorizeRole('advertiser'), upload.single('adCreative'), async (req, res, next) => {
    const { title, content, link, advertiser } = req.body;

    if (!title || !content || !advertiser) {
        if (req.file) { await fs.unlink(req.file.path).catch(e => console.error('Error cleaning up file:', e)); }
        return res.status(400).json({ error: 'Title, content, and advertiser are required to post an ad.' });
    }
    const trimmedTitle = String(title).trim();
    const trimmedContent = String(content).trim();
    const trimmedAdvertiser = String(advertiser).trim();
    const trimmedLink = link ? String(link).trim() : null;

    if (trimmedTitle.length === 0 || trimmedContent.length === 0 || trimmedAdvertiser.length === 0) {
        if (req.file) { await fs.unlink(req.file.path).catch(e => console.error('Error cleaning up file:', e)); }
        return res.status(400).json({ error: 'Title, content, and advertiser cannot be empty.' });
    }
    if (trimmedLink && !/^https?:\/\/.+/.test(trimmedLink)) {
        if (req.file) { await fs.unlink(req.file.path).catch(e => console.error('Error cleaning up file:', e)); }
        return res.status(400).json({ error: 'Provided ad link is not a valid URL.' });
    }

    let imageUrl = null;
    if (req.file) {
        // In PRODUCTION, you would upload req.file to cloud storage (e.g., S3, Arweave, IPFS)
        // and set imageUrl to the public URL of that cloud resource.
        console.warn('WARNING: Ad creative uploaded to local storage. Use cloud storage in production!');
        imageUrl = `${BASE_URL}/uploads/${req.file.filename}`;
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
        res.status(201).json({ message: 'Ad posted successfully', ad: newAd });
    } catch (error) {
        if (req.file) { await fs.unlink(req.file.path).catch(e => console.error('Error cleaning up file on DB error:', e)); }
        next(error);
    }
});

// Photos API
app.get('/api/photos', async (req, res, next) => {
    try {
        const photos = await Photo.find().sort({ createdAt: -1 });
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

    if (!title || !creatorWallet) {
        await fs.unlink(req.file.path).catch(e => console.error('Error cleaning up file:', e));
        return res.status(400).json({ error: 'Photo title and creator wallet are required.' });
    }
    const trimmedTitle = String(title).trim();
    const trimmedDescription = description ? String(description).trim() : '';
    const trimmedCreatorWallet = String(creatorWallet).trim();

    if (trimmedTitle.length === 0 || trimmedCreatorWallet.length === 0) {
        await fs.unlink(req.file.path).catch(e => console.error('Error cleaning up file:', e));
        return res.status(400).json({ error: 'Photo title and creator wallet cannot be empty.' });
    }
    if (!isValidSolanaAddress(trimmedCreatorWallet)) {
        await fs.unlink(req.file.path).catch(e => console.error('Error cleaning up file:', e));
        return res.status(400).json({ error: 'Invalid Solana wallet address format for creatorWallet.' });
    }

    // In PRODUCTION, you would upload req.file to cloud storage (e.g., S3, Arweave, IPFS)
    // and set imageUrl to the public URL of that cloud resource.
    console.warn('WARNING: Photo file uploaded to local storage. Use cloud storage in production!');
    const imageUrl = `${BASE_URL}/uploads/${req.file.filename}`;

    try {
        const newPhoto = new Photo({
            title: trimmedTitle,
            description: trimmedDescription,
            imageUrl,
            creatorWallet: trimmedCreatorWallet
        });
        await newPhoto.save();
        res.status(201).json({ message: 'Photo uploaded successfully.', photo: newPhoto });
    } catch (error) {
        if (req.file) { await fs.unlink(req.file.path).catch(e => console.error('Error cleaning up file on DB error:', e)); }
        next(error);
    }
});

// Posts API
app.get('/api/posts', async (req, res, next) => {
    try {
        const posts = await Post.find().sort({ createdAt: -1 });
        res.json(posts);
    } catch (error) {
        next(error);
    }
});
app.post('/api/posts', authenticateToken, authorizeRole('publisher'), async (req, res, next) => {
    const { title, content, authorWallet } = req.body;
    if (!title || !content || !authorWallet) {
        return res.status(400).json({ error: 'Title, content, and author wallet are required.' });
    }
    const trimmedTitle = String(title).trim();
    const trimmedContent = String(content).trim();
    const trimmedAuthorWallet = String(authorWallet).trim();

    if (trimmedTitle.length === 0 || trimmedContent.length === 0 || trimmedAuthorWallet.length === 0) {
        return res.status(400).json({ error: 'Title, content, and author wallet cannot be empty.' });
    }
    if (!isValidSolanaAddress(trimmedAuthorWallet)) {
        return res.status(400).json({ error: 'Invalid Solana wallet address format for authorWallet.' });
    }

    try {
        const newPost = new Post({
            title: trimmedTitle,
            content: trimmedContent,
            authorWallet: trimmedAuthorWallet
        });
        await newPost.save();
        res.status(201).json({ message: 'Post published successfully', post: newPost });
    } catch (error) {
        next(error);
    }
});

// NFTs API (Placeholder for REAL Blockchain Interaction)
app.get('/api/nfts/marketplace', async (req, res, next) => {
    try {
        // In a REAL marketplace, you would query the blockchain or a blockchain indexer
        // for listed NFTs, not just your local database.
        const nfts = await Nft.find({ isListed: true }).sort({ listedAt: -1 });
        res.json({ nfts: nfts, marketplaceOwnerWallet: MARKETPLACE_ESCROW_WALLET });
    } catch (error) {
        next(error);
    }
});

app.post('/api/nfts/prepare-mint', authenticateToken, upload.single('nftFile'), async (req, res, next) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No NFT file uploaded.' });
    }
    const { name, description, attributes, creatorWallet } = req.body;

    if (!name || !description || !creatorWallet) {
        await fs.unlink(req.file.path).catch(e => console.error('Error cleaning up file:', e));
        return res.status(400).json({ error: 'Name, description, and creator wallet are required for NFT preparation.' });
    }

    const trimmedName = String(name).trim();
    const trimmedDescription = String(description).trim();
    const trimmedCreatorWallet = String(creatorWallet).trim();

    if (trimmedName.length === 0 || trimmedDescription.length === 0 || trimmedCreatorWallet.length === 0) {
        await fs.unlink(req.file.path).catch(e => console.error('Error cleaning up file:', e));
        return res.status(400).json({ error: 'Name, description, and creator wallet cannot be empty.' });
    }
    if (!isValidSolanaAddress(trimmedCreatorWallet)) {
        await fs.unlink(req.file.path).catch(e => console.error('Error cleaning up file:', e));
        return res.status(400).json({ error: 'Invalid Solana wallet address format for creatorWallet.' });
    }

    // In PRODUCTION, upload req.file to Arweave/IPFS and get its URI
    // const uploadResult = await uploadFileToArweave(req.file);
    // const contentUrl = uploadResult.uri;
    console.warn('WARNING: NFT media file uploaded to local storage. Use Arweave/IPFS in production!');
    const contentUrl = `${BASE_URL}/uploads/${req.file.filename}`;

    const nftMetadata = {
        name: trimmedName,
        symbol: "AFOXNFT", // Adjust symbol if needed
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
                share: 100 // Assuming single creator, adjust for multiple
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
        console.warn("NFT preparation: Could not parse attributes JSON:", e.message);
    }

    // In PRODUCTION, upload this metadata JSON to Arweave/IPFS and get its URI
    // const metadataUploadResult = await uploadMetadataToArweave(nftMetadata);
    // const metadataUri = metadataUploadResult.uri;
    console.warn('WARNING: NFT metadata JSON saved locally. Use Arweave/IPFS for metadata in production!');
    const baseFileName = path.basename(req.file.filename, path.extname(req.file.filename));
    const metadataFileName = `${baseFileName}-metadata.json`;
    metadataFilePath = path.join(__dirname, uploadDir, metadataFileName);
    try {
        await fs.writeFile(metadataFilePath, JSON.stringify(nftMetadata, null, 2));
    } catch (error) {
        console.error('Error writing NFT metadata file:', error);
        await fs.unlink(req.file.path).catch(e => console.error('Error cleaning up NFT file:', e));
        if (metadataFilePath) { await fs.unlink(metadataFilePath).catch(e => console.error('Error cleaning up NFT metadata file (partial):', e)); }
        return res.status(500).json({ error: 'Failed to save NFT metadata file.' });
    }
    const metadataUri = `${BASE_URL}/uploads/${metadataFileName}`; // Local URI

    // *** THIS IS THE CRITICAL SIMULATION PART ***
    // In a REAL DAPP, you would initiate a Solana mint transaction here.
    // 1. Construct a Metaplex/Token Metadata program instruction.
    // 2. Sign it with your backend's mint authority (or prepare for client signing).
    // 3. Send the transaction to the Solana cluster.
    // 4. Wait for confirmation and get the real `mintAddress` and `transactionSignature`.
    // Example (conceptual, requires @solana/web3.js and @metaplex-foundation/mpl-token-metadata):
    /*
    const { Connection, Keypair, Transaction, sendAndConfirmTransaction } = require('@solana/web3.js');
    const { createCreateMetadataAccountV2Instruction } = require('@metaplex-foundation/mpl-token-metadata');
    const connection = new Connection(process.env.SOLANA_RPC_URL, 'confirmed');
    const payerKeypair = Keypair.fromSecretKey(bs58.decode(process.env.BACKEND_MINT_AUTHORITY_SECRET_KEY)); // Load from .env securely
    const mintKeypair = Keypair.generate();

    // ... construct instruction with metadataUri, payer, mintKeypair, etc.
    // const transaction = new Transaction().add(createMetadataInstruction);
    // const transactionSignature = await sendAndConfirmTransaction(connection, transaction, [payerKeypair, mintKeypair]);
    // const realMintAddress = mintKeypair.publicKey.toBase58();
    */

    const simulatedMintAddress = `SIMULATED_MINT_${Date.now()}_${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    const simulatedSignature = 'SIMULATED_TRANSACTION_SIGNATURE_FROM_BACKEND';

    try {
        const newNft = new Nft({
            name: nftMetadata.name,
            description: nftMetadata.description,
            image: nftMetadata.image,
            mint: simulatedMintAddress, // Use realMintAddress in production
            owner: nftMetadata.properties.creators[0].address,
            isListed: false,
            attributes: nftMetadata.attributes,
            history: [{ type: 'Mint', to: nftMetadata.properties.creators[0].address, timestamp: new Date() }]
        });
        await newNft.save();

        res.status(201).json({
            message: 'NFT assets prepared and simulated mint successful. **REQUIRES REAL SOLANA MINT IN PRODUCTION.**',
            uri: metadataUri,
            mintAddress: simulatedMintAddress, // This needs to be the REAL mint address from Solana
            imageUrl: contentUrl,
            signature: simulatedSignature, // This needs to be the REAL transaction signature
            nft: newNft
        });
    } catch (error) {
        if (req.file) { await fs.unlink(req.file.path).catch(e => console.error('Error cleaning up NFT file:', e)); }
        if (metadataFilePath) { await fs.unlink(metadataFilePath).catch(e => console.error('Error cleaning up NFT metadata file:', e)); }
        next(error);
    }
});

app.post('/api/nfts/list', authenticateToken, async (req, res, next) => {
    const { mintAddress, price, duration, sellerWallet } = req.body;

    if (!mintAddress || !price || isNaN(price) || Number(price) <= 0 ||
        !duration || isNaN(duration) || Number(duration) <= 0 ||
        !sellerWallet) {
        return res.status(400).json({ error: 'Missing or invalid required fields for listing (mintAddress, price, duration, sellerWallet).' });
    }

    const trimmedMintAddress = String(mintAddress).trim();
    const parsedPrice = Number(price);
    const parsedDuration = Number(duration);
    const trimmedSellerWallet = String(sellerWallet).trim();

    if (!isValidSolanaAddress(trimmedSellerWallet)) {
        return res.status(400).json({ error: 'Invalid Solana wallet address format for sellerWallet.' });
    }
    if (req.user.walletAddress !== trimmedSellerWallet) {
         return res.status(403).json({ error: 'You can only list NFTs from your own wallet.' });
    }

    try {
        // *** REAL BLOCKCHAIN INTEGRATION FOR LISTING ***
        // In a real DApp:
        // 1. Your frontend initiates a transaction to list the NFT on a smart contract (e.g., Candy Machine, custom marketplace program).
        // 2. The smart contract transfers the NFT from seller to an escrow account (e.g., MARKETPLACE_ESCROW_WALLET).
        // 3. Your backend would listen for on-chain events or verify the transaction signature.
        // 4. ONLY AFTER successful on-chain listing, update your database.
        // For this example, we're still just updating the DB:
        const nft = await Nft.findOneAndUpdate(
            { mint: trimmedMintAddress, owner: trimmedSellerWallet, isListed: false },
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
            return res.status(404).json({ error: 'NFT not found, you are not the owner, or it is already listed.' });
        }

        console.log(`NFT ${trimmedMintAddress} listed by ${trimmedSellerWallet} for ${parsedPrice} SOL (simulated).`);
        res.status(200).json({ message: `NFT ${trimmedMintAddress} listed for sale for ${parsedPrice} SOL (simulated). **REQUIRES REAL SOLANA LISTING TX IN PRODUCTION.**`, nft });
    } catch (error) {
        next(error);
    }
});

app.post('/api/nfts/buy', authenticateToken, async (req, res, next) => {
    const { mintAddress, buyerWallet, sellerWallet, price } = req.body;

    if (!mintAddress || !buyerWallet || !sellerWallet || !price || isNaN(price) || Number(price) <= 0) {
        return res.status(400).json({ error: 'Missing or invalid required fields for buying NFT.' });
    }

    const trimmedMintAddress = String(mintAddress).trim();
    const trimmedBuyerWallet = String(buyerWallet).trim();
    const trimmedSellerWallet = String(sellerWallet).trim();
    const parsedPrice = Number(price);

    if (trimmedBuyerWallet === trimmedSellerWallet) {
        return res.status(400).json({ error: 'Cannot buy your own NFT.' });
    }
    if (!isValidSolanaAddress(trimmedBuyerWallet) || !isValidSolanaAddress(trimmedSellerWallet)) {
        return res.status(400).json({ error: 'Invalid Solana wallet address format for buyerWallet or sellerWallet.' });
    }
    if (req.user.walletAddress !== trimmedBuyerWallet) {
        return res.status(403).json({ error: 'You can only buy NFTs with your authenticated wallet.' });
    }

    try {
        // *** REAL BLOCKCHAIN INTEGRATION FOR BUYING ***
        // In a real DApp:
        // 1. Your backend (or frontend) constructs a transaction to buy the NFT from the smart contract.
        //    This involves transferring SOL from buyer to seller/marketplace and transferring NFT from escrow to buyer.
        // 2. The frontend signs and sends this transaction.
        // 3. Your backend would listen for on-chain events or verify the transaction signature.
        // 4. ONLY AFTER successful on-chain purchase, update your database.
        // For this example, we're still just updating the DB:
        const nft = await Nft.findOneAndUpdate(
            { mint: trimmedMintAddress, owner: trimmedSellerWallet, isListed: true, price: parsedPrice },
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
            return res.status(404).json({ error: 'NFT not found, not listed, or seller/price mismatch. It might have been delisted or sold.' });
        }

        // In a real app, `serializedTransaction` would be a base64 string of a Solana transaction
        // that the client wallet needs to sign.
        const serializedTransaction = 'SIMULATED_TRANSACTION_BASE64_FOR_CLIENT_SIGNING';

        res.status(200).json({
            message: `NFT ${nft.name} successfully purchased (simulated). **REQUIRES REAL SOLANA BUY TX IN PRODUCTION.**`,
            nft,
            serializedTransaction
        });
        console.log(`NFT ${nft.name} transferred from ${trimmedSellerWallet} to ${trimmedBuyerWallet} for ${parsedPrice} SOL (simulated).`);

    } catch (error) {
        next(error);
    }
});

app.post('/api/nfts/delist', authenticateToken, async (req, res, next) => {
    const { mintAddress, ownerWallet } = req.body;

    if (!mintAddress || !ownerWallet) {
        return res.status(400).json({ error: 'Mint address and owner wallet are required.' });
    }
    const trimmedMintAddress = String(mintAddress).trim();
    const trimmedOwnerWallet = String(ownerWallet).trim();

    if (!isValidSolanaAddress(trimmedOwnerWallet)) {
        return res.status(400).json({ error: 'Invalid Solana wallet address format for ownerWallet.' });
    }
    if (req.user.walletAddress !== trimmedOwnerWallet) {
        return res.status(403).json({ error: 'You can only delist NFTs from your own wallet.' });
    }

    try {
        // *** REAL BLOCKCHAIN INTEGRATION FOR DELISTING ***
        // In a real DApp, you would initiate a transaction to delist the NFT from the smart contract.
        // This usually involves transferring the NFT from the escrow back to the owner's wallet.
        // ONLY AFTER successful on-chain delisting, update your database.
        const nft = await Nft.findOneAndUpdate(
            { mint: trimmedMintAddress, owner: trimmedOwnerWallet, isListed: true },
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
            return res.status(404).json({ error: 'NFT not found, you are not the owner, or it is not currently listed.' });
        }

        res.status(200).json({ message: `NFT ${nft.name} delisted successfully. **REQUIRES REAL SOLANA DELIST TX IN PRODUCTION.**`, nft });
        console.log(`NFT ${nft.name} delisted by ${trimmedOwnerWallet}.`);
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
        const nft = await Nft.findOne({ mint: mint.trim() }, 'history');
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
    console.error('API Error:', err);

    if (err.name === 'ValidationError') {
        const errors = Object.values(err.errors).map(el => el.message);
        return res.status(400).json({ error: 'Validation failed', details: errors });
    }
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({ error: 'File too large. Max 10MB allowed.' });
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
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue)[0];
        const value = err.keyValue[field];
        return res.status(409).json({ error: `Duplicate field value: '${value}' for '${field}'. Please use another value.` });
    }

    res.status(500).json({ error: 'An unexpected server error occurred.', message: err.message });
});


// --- Initial Data Seeding (for Development/Testing) ---
async function seedInitialData() {
    console.log('Checking for initial data and seeding if necessary (Development Mode)...');
    try {
        await ensureUploadDir();

        const announcementCount = await Announcement.countDocuments();
        if (announcementCount === 0) {
            await Announcement.insertMany([
                { text: 'Welcome to Aurum Fox Unified Portal!', date: new Date() },
                { text: 'AFOX Phase 1 completed!', date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) }
            ]);
            console.log('  Initial announcements seeded.');
        }

        const createPlaceholderFile = async (fileName) => {
            const filePath = path.join(uploadDir, fileName);
            try {
                await fs.access(filePath);
            } catch (err) {
                if (err.code === 'ENOENT') {
                    await fs.writeFile(filePath, Buffer.from([])); // Create an empty file
                    console.log(`Created placeholder: ${filePath}`);
                } else {
                    console.error(`Error checking/creating placeholder ${filePath}:`, err);
                }
            }
        };

        const photoCount = await Photo.countDocuments();
        if (photoCount === 0) {
            await createPlaceholderFile('photo_placeholder_1.png');
            await createPlaceholderFile('photo_placeholder_2.png');
            await Photo.insertMany([
                { title: 'First Day in Office', description: 'Getting started with Aurum Fox.', imageUrl: `${BASE_URL}/uploads/photo_placeholder_1.png`, creatorWallet: "5bW2D6d3jV3oR7s8t9u0v1w2x3y4z5a6b7c8d9e0f1g2h3i4j5k6l7m8n9o0p1q2" },
                { title: 'Aurum Fox Team', description: 'Our dedicated team.', imageUrl: `${BASE_URL}/uploads/photo_placeholder_2.png`, creatorWallet: "9cE4F7g8hI9j0k1l2M3n4o5p6q7r8s9t0U1v2w3x4y5z6a7b8c9d0e1f2g3h4i5j" }
            ]);
            console.log('  Initial photos seeded.');
        }

        const postCount = await Post.countDocuments();
        if (postCount === 0) {
            await Post.insertMany([
                { title: "Launch Day!", content: "Today marks the official launch of the Aurum Fox Unified Portal. We're excited to bring you a seamless Web3 and multimedia experience!", authorWallet: "6dF3G5h7jK9l1M2n3O4p5q6r7S8t9U0v1W2x3Y4z5a6b7c8d9e0f1g2h3i4j5k6l" },
                { title: "New Features Coming Soon", content: "Stay tuned for exciting new features including decentralized storage options for your media and advanced NFT marketplace functionalities.", authorWallet: "7eG4H6i8kL0m1N2o3P4q5R6s7T8u9V0w1X2y3Z4a5b6c7d8e9f0g1h2i3j4k5l6m" }
            ]);
            console.log('  Initial posts seeded.');
        }

        const nftCount = await Nft.countDocuments();
        if (nftCount === 0) {
            await createPlaceholderFile('nft_marketplace_1.png');
            await createPlaceholderFile('nft_marketplace_2.png');
            await createPlaceholderFile('nft_user_owned.png');

            await Nft.insertMany([
                {
                    name: "Rare Fox", description: "A very rare golden fox NFT.", image: `${BASE_URL}/uploads/nft_marketplace_1.png`, mint: "MARKETPLACEMINTA111111111111111111111111111111111111", owner: MARKETPLACE_ESCROW_WALLET, isListed: true, price: 0.8, listedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), listingDuration: 30, listedBy: MARKETPLACE_ESCROW_WALLET, attributes: [{ trait_type: "Rarity", value: "Rare" }],
                    history: [{ type: 'Mint', to: MARKETPLACE_ESCROW_WALLET, timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) }, { type: 'List', from: MARKETPLACE_ESCROW_WALLET, price: 0.8, timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) }]
                },
                {
                    name: "Cunning Fox", description: "A cunning fox ready to pounce.", image: `${BASE_URL}/uploads/nft_marketplace_2.png`, mint: "MARKETPLACEMINTB222222222222222222222222222222222222", owner: "ANOTHER_SELLER_WALLET_ADDRESS", isListed: true, price: 0.3, listedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), listingDuration: 60, listedBy: "ANOTHER_SELLER_WALLET_ADDRESS", attributes: [{ trait_type: "Expression", value: "Wink" }],
                    history: [{ type: 'Mint', to: "ANOTHER_SELLER_WALLET_ADDRESS", timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000) }, { type: 'List', from: "ANOTHER_SELLER_WALLET_ADDRESS", price: 0.3, timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) }]
                },
                {
                    name: "User Owned Fox", description: "An NFT owned by a user, not yet listed.", image: `${BASE_URL}/uploads/nft_user_owned.png`, mint: "USEROWNEDMINTC3333333333333333333333333333333333333", owner: "TestUserWalletAddressHere11111111111111111111111111111", isListed: false, price: null, attributes: [{ trait_type: "Color", value: "Blue" }],
                    history: [{ type: 'Mint', to: "TestUserWalletAddressHere11111111111111111111111111111", timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) }]
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
            await createPlaceholderFile('ad_placeholder.png');
            await Ad.insertMany([
                { title: "Buy My Awesome Project!", content: "Check out our new dApp, it's great!", imageUrl: `${BASE_URL}/uploads/ad_placeholder.png`, link: "https://myawesomedapp.com", advertiser: "ProjectX" }
            ]);
            console.log('  Initial ads seeded.');
        }

        // IMPORTANT: For production, do NOT rely on these default users.
        // Create users with strong, unique passwords through your registration API or a secure setup process.
        // Consider removing or commenting out this seeding block entirely for production deployments.

        const adminUserCount = await User.countDocuments({ role: 'admin' });
        if (adminUserCount === 0) {
            console.log('  No admin user found. Creating a default admin user...');
            const defaultAdminUser = new User({
                username: 'admin',
                password: process.env.DEFAULT_ADMIN_PASSWORD || 'ChangeMeAdmin123!', // Use ENV variable, then strong fallback
                walletAddress: 'AdminWalletAddressHere11111111111111111111111111111111',
                role: 'admin'
            });
            await defaultAdminUser.save();
            console.warn('  Default admin user created: username "admin". **CRITICAL: CHANGE DEFAULT_ADMIN_PASSWORD IN .ENV IMMEDIATELY!**');
        }
        const regularUserCount = await User.countDocuments({ username: 'testuser' });
        if (regularUserCount === 0) {
            console.log('  No test user found. Creating a default test user...');
            const defaultTestUser = new User({
                username: 'testuser',
                password: process.env.DEFAULT_TEST_PASSWORD || 'ChangeMeTest123!',
                walletAddress: 'TestUserWalletAddressHere11111111111111111111111111111',
                role: 'user'
            });
            await defaultTestUser.save();
            console.warn('  Default test user created: username "testuser". **CRITICAL: CHANGE DEFAULT_TEST_PASSWORD IN .ENV IMMEDIATELY!**');
        }
        const developerUserCount = await User.countDocuments({ username: 'devuser' });
        if (developerUserCount === 0) {
            console.log('  No developer user found. Creating a default developer user...');
            const defaultDevUser = new User({
                username: 'devuser',
                password: process.env.DEFAULT_DEV_PASSWORD || 'ChangeMeDev123!',
                walletAddress: 'DevUserWalletAddressHere111111111111111111111111111111',
                role: 'developer'
            });
            await defaultDevUser.save();
            console.warn('  Default developer user created: username "devuser". **CRITICAL: CHANGE DEFAULT_DEV_PASSWORD IN .ENV IMMEDIATELY!**');
        }
        const advertiserUserCount = await User.countDocuments({ username: 'aduser' });
        if (advertiserUserCount === 0) {
            console.log('  No advertiser user found. Creating a default advertiser user...');
            const defaultAdUser = new User({
                username: 'aduser',
                password: process.env.DEFAULT_AD_PASSWORD || 'ChangeMeAd123!',
                walletAddress: 'AdUserWalletAddressHere111111111111111111111111111111',
                role: 'advertiser'
            });
            await defaultAdUser.save();
            console.warn('  Default advertiser user created: username "aduser". **CRITICAL: CHANGE DEFAULT_AD_PASSWORD IN .ENV IMMEDIATELY!**');
        }
        const publisherUserCount = await User.countDocuments({ username: 'pubuser' });
        if (publisherUserCount === 0) {
            console.log('  No publisher user found. Creating a default publisher user...');
            const defaultPubUser = new User({
                username: 'pubuser',
                password: process.env.DEFAULT_PUB_PASSWORD || 'ChangeMePub123!',
                walletAddress: 'PubUserWalletAddressHere111111111111111111111111111111',
                role: 'publisher'
            });
            await defaultPubUser.save();
            console.warn('  Default publisher user created: username "pubuser". **CRITICAL: CHANGE DEFAULT_PUB_PASSWORD IN .ENV IMMEDIATELY!**');
        }

    } catch (error) {
        console.error('Error seeding initial data:', error);
    }
}

// --- Server Start ---
ensureUploadDir().then(() => {
    app.listen(PORT, () => {
        console.log(`Backend server listening at ${BASE_URL}`);
        console.log(`MongoDB URI: ${MONGODB_URI ? 'Connected' : 'NOT SET, using default!'}`); // Indicate if URI is set
        console.log(`CORS allowed origins: ${ALLOWED_CORS_ORIGINS.join(', ')}`);
        console.log(`Your frontend should be configured to fetch from ${BASE_URL}`);
        console.log(`\n--- PRODUCTION CHECKLIST ---`);
        console.log(`1. Ensure .env file has strong JWT_SECRET, MONGODB_URI, and BASE_URL.`);
        console.log(`2. Replace local file uploads (Multer) with a cloud storage solution (e.g., AWS S3, Arweave, IPFS).`);
        console.log(`3. Implement REAL Solana blockchain interactions for NFT minting, listing, buying, and delisting.`);
        console.log(`4. Change all default user passwords (or remove the seeding logic entirely) for production.`);
        console.log(`5. Set MARKETPLACE_ESCROW_WALLET to a real, secure Solana address.`);
        console.log(`----------------------------`);
        seedInitialData(); // Call seed function after server starts and dir is ensured
    });
}).catch(err => {
    console.error('Failed to start server due to directory setup error:', err);
    process.exit(1);
});
