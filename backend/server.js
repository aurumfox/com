// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises; // Use fs.promises for async file operations
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken'); // For JWT authentication

// --- IMPORTANT: For real Solana blockchain interactions, uncomment and configure these. ---
// const { Connection, Keypair, PublicKey, clusterApiUrl, SystemProgram } = require('@solana/web3.js');
// const { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, createTransferInstruction, TOKEN_PROGRAM_ID } = require('@solana/spl-token');
// const bs58 = require('bs58'); // For working with base58 keys, if needed
// const { TOKEN_METADATA_PROGRAM_ID } = require('@metaplex-foundation/mpl-token-metadata'); // For advanced NFT metadata interactions

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/solana_dapp_db_default';
const ALLOWED_CORS_ORIGINS = process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : ['http://127.0.0.1:5500', 'http://localhost:5500']; // Default for local dev
const JWT_SECRET = process.env.JWT_SECRET || 'YOUR_SUPER_STRONG_JWT_SECRET_HERE'; // *** REPLACE THIS IN PRODUCTION ***
const SERVER_BASE_URL = process.env.SERVER_BASE_URL || `http://localhost:${PORT}`; // Base URL for uploaded files and metadata

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
const uploadDir = 'uploads/'; // Local directory for file uploads

// Ensure the upload directory exists
async function ensureUploadDir() {
    try {
        await fs.mkdir(uploadDir, { recursive: true });
        console.log(`Upload directory '${uploadDir}' ensured.`);
    } catch (err) {
        console.error(`Error ensuring upload directory '${uploadDir}':`, err);
        process.exit(1); // Critical error, server cannot function without upload dir
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
            'image/jpeg', 'image/png', 'image/gif', 'image/webp',
            'video/mp4', 'video/webm', 'video/ogg',
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
        process.exit(1); // Exit if DB connection fails
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
    image: { type: String, required: true }, // URL to the NFT image/media
    mint: { type: String, required: true, unique: true, index: true, trim: true }, // The actual Solana NFT Mint address
    owner: { type: String, required: true, trim: true }, // Current owner's Solana wallet address
    isListed: { type: Boolean, default: false },
    price: { type: Number, min: 0 }, // Price in SOL (for display) or lamports (for internal use)
    listedAt: Date,
    listingDuration: Number, // Duration in seconds or hours (needs frontend logic to enforce)
    listedBy: { type: String, trim: true }, // Wallet address that listed the NFT
    attributes: [{ trait_type: { type: String, trim: true }, value: { type: String, trim: true } }],
    history: [{
        type: { type: String, enum: ['Mint', 'Transfer', 'Sale', 'List', 'Delist'], required: true },
        from: { type: String, trim: true }, // Optional, for transfer/sale
        to: { type: String, trim: true },   // Optional, for transfer/sale
        price: Number, // Optional, for sale
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

// --- Utility Functions ---

/**
 * Basic Solana public key validation.
 * For robust validation in production, uncomment and use @solana/web3.js.
 */
function isValidSolanaAddress(address) {
    if (typeof address !== 'string' || address.length < 32 || address.length > 44) {
        return false;
    }
    // TODO: For PRODUCTION, uncomment this section and install @solana/web3.js
    // try {
    //     // Ensure PublicKey is imported: const { PublicKey } = require('@solana/web3.js');
    //     new PublicKey(address);
    //     return true;
    // } catch (e) {
    //     return false;
    // }
    return true; // DANGER: Placeholder for development only. REPLACE WITH REAL VALIDATION.
}

/**
 * Middleware for authentication using JWT.
 * It expects a 'Bearer Token' in the Authorization header.
 * Attaches user info (e.g., wallet address, role) to req.user.
 */
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) {
        return res.status(401).json({ error: 'Authentication token required.' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            // console.error('JWT verification failed:', err); // Log for debugging
            return res.status(403).json({ error: 'Invalid or expired token.' });
        }
        req.user = user; // Attach user payload (e.g., { walletAddress: '...', role: '...' })
        next();
    });
};

/**
 * Middleware for authorization (role-based access control).
 * Requires authenticateToken to run before it.
 */
const authorizeRole = (requiredRole) => (req, res, next) => {
    if (!req.user || !req.user.role || req.user.role !== requiredRole) {
        return res.status(403).json({ error: `Access denied. Requires '${requiredRole}' role.` });
    }
    next();
};

// --- Authentication Endpoint (Simulated Login) ---
// In a real dApp, this would involve a wallet signature verification.
app.post('/api/auth/login', async (req, res) => {
    const { walletAddress, signature, message } = req.body; // Expect walletAddress and a signed message

    if (!walletAddress || !isValidSolanaAddress(walletAddress)) {
        return res.status(400).json({ error: 'Valid Solana wallet address is required.' });
    }

    // TODO: REAL AUTHENTICATION LOGIC HERE:
    // 1. On client, generate a unique message (e.g., nonce + "Sign in to Aurum Fox").
    // 2. Client signs this message with their wallet and sends (walletAddress, signature, message) here.
    // 3. On backend, use @solana/web3.js to VERIFY the signature against the walletAddress and message.
    //    Example:
    //    const { message, signature } = req.body;
    //    const messageBytes = new TextEncoder().encode(message);
    //    const signatureBytes = bs58.decode(signature); // If signature is base58 encoded
    //    const publicKey = new PublicKey(walletAddress);
    //    const isVerified = nacl.sign.detached.verify(messageBytes, signatureBytes, publicKey.toBytes()); // Requires 'tweetnacl'

    // DANGER: Currently, this is a SIMULATION. Any walletAddress will get a token.
    console.warn('WARNING: /api/auth/login is simulated. No real signature verification happens.');

    // Simulate user roles (you'd fetch this from a DB based on walletAddress)
    let userRole = 'user';
    if (walletAddress === 'SIMULATED_ADMIN_WALLET') { // Replace with a real admin wallet in your DB
        userRole = 'admin';
    } else if (walletAddress === 'SIMULATED_DEVELOPER_WALLET') { // Replace with a real developer wallet
        userRole = 'developer';
    } else if (walletAddress === 'SIMULATED_ADVERTISER_WALLET') { // Replace with a real advertiser wallet
        userRole = 'advertiser';
    }

    const token = jwt.sign(
        { walletAddress: walletAddress, role: userRole },
        JWT_SECRET,
        { expiresIn: '1h' } // Token expires in 1 hour
    );

    res.json({
        message: 'Login successful (simulated).',
        token,
        user: { walletAddress, role: userRole }
    });
});

// --- API Endpoints ---

// Announcements API
app.get('/api/announcements', async (req, res) => {
    try {
        const announcements = await Announcement.find().sort({ date: -1 });
        res.json(announcements);
    } catch (error) {
        console.error('Error fetching announcements:', error);
        res.status(500).json({ error: 'Failed to fetch announcements.' });
    }
});

app.post('/api/announcements', authenticateToken, authorizeRole('admin'), async (req, res) => {
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
        console.error('Error publishing announcement:', error);
        res.status(500).json({ error: 'Failed to publish announcement.' });
    }
});

// Games API
app.get('/api/games', async (req, res) => {
    try {
        const games = await Game.find();
        res.json(games);
    } catch (error) {
        console.error('Error fetching games:', error);
        res.status(500).json({ error: 'Failed to fetch games.' });
    }
});

app.post('/api/games', authenticateToken, authorizeRole('developer'), upload.single('gameFile'), async (req, res) => {
    const { title, description, developer, url: externalUrl } = req.body;

    if (!title || title.trim().length === 0 ||
        !description || description.trim().length === 0 ||
        !developer || developer.trim().length === 0) {
        if (req.file) { try { await fs.unlink(req.file.path); } catch (e) { console.error('Error cleaning up file:', e); } }
        return res.status(400).json({ error: 'Title, description, and developer are required to add a game.' });
    }

    let gameUrl = externalUrl ? externalUrl.trim() : null;

    if (req.file) {
        // In production, replace this with upload to IPFS/Arweave or S3
        gameUrl = `${SERVER_BASE_URL}/uploads/${req.file.filename}`;
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
        console.error('Error adding game:', error);
        if (req.file) { try { await fs.unlink(req.file.path); } catch (e) { console.error('Error cleaning up file on DB error:', e); } }
        res.status(500).json({ error: 'Failed to add game.' });
    }
});


// Ads API
app.get('/api/ads', async (req, res) => {
    try {
        const ads = await Ad.find();
        res.json(ads);
    } catch (error) {
        console.error('Error fetching ads:', error);
        res.status(500).json({ error: 'Failed to fetch ads.' });
    }
});

app.post('/api/ads', authenticateToken, authorizeRole('advertiser'), upload.single('adCreative'), async (req, res) => {
    const { title, content, link, advertiser } = req.body;

    if (!title || title.trim().length === 0 ||
        !content || content.trim().length === 0 ||
        !advertiser || advertiser.trim().length === 0) {
        if (req.file) { try { await fs.unlink(req.file.path); } catch (e) { console.error('Error cleaning up file:', e); } }
        return res.status(400).json({ error: 'Title, content, and advertiser are required to post an ad.' });
    }

    let imageUrl = null;
    if (req.file) {
        // In production, replace this with upload to IPFS/Arweave or S3
        imageUrl = `${SERVER_BASE_URL}/uploads/${req.file.filename}`;
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
        console.error('Error posting ad:', error);
        if (req.file) { try { await fs.unlink(req.file.path); } catch (e) { console.error('Error cleaning up file on DB error:', e); } }
        res.status(500).json({ error: 'Failed to post ad.' });
    }
});


// Photos API
app.get('/api/photos', async (req, res) => {
    try {
        const photos = await Photo.find().sort({ date: -1 });
        res.json(photos);
    } catch (error) {
        console.error('Error fetching photos:', error);
        res.status(500).json({ error: 'Failed to fetch photos.' });
    }
});

app.post('/api/photos/upload', authenticateToken, upload.single('photo'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No photo file uploaded.' });
    }
    const { title, description } = req.body;
    // creatorWallet should come from authenticated user (req.user.walletAddress) for security
    const creatorWallet = req.user ? req.user.walletAddress : req.body.creatorWallet; // Fallback for dev

    if (!title || title.trim().length === 0 ||
        !creatorWallet || creatorWallet.trim().length === 0) {
        try { await fs.unlink(req.file.path); } catch (e) { console.error('Error cleaning up file:', e); }
        return res.status(400).json({ error: 'Photo title and creator wallet are required.' });
    }

    if (!isValidSolanaAddress(creatorWallet.trim())) {
        try { await fs.unlink(req.file.path); } catch (e) { console.error('Error cleaning up file:', e); }
        return res.status(400).json({ error: 'Invalid Solana wallet address format for creatorWallet.' });
    }

    // In production, replace this with upload to IPFS/Arweave or S3
    const imageUrl = `${SERVER_BASE_URL}/uploads/${req.file.filename}`;

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
        console.error('Error uploading photo:', error);
        try { await fs.unlink(req.file.path); } catch (e) { console.error('Error cleaning up file on DB error:', e); }
        res.status(500).json({ error: 'Failed to upload photo.' });
    }
});

// Posts API
app.get('/api/posts', async (req, res) => {
    try {
        const posts = await Post.find().sort({ date: -1 });
        res.json(posts);
    } catch (error) {
        console.error('Error fetching posts:', error);
        res.status(500).json({ error: 'Failed to fetch posts.' });
    }
});

app.post('/api/posts', authenticateToken, authorizeRole('publisher'), async (req, res) => {
    const { title, content } = req.body;
    // authorWallet should come from authenticated user (req.user.walletAddress) for security
    const authorWallet = req.user ? req.user.walletAddress : req.body.authorWallet; // Fallback for dev

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
        console.error('Error publishing post:', error);
        res.status(500).json({ error: 'Failed to publish post.' });
    }
});


// NFTs API (Simulated Blockchain Interaction with Integration Points)

// GET all NFTs, including those listed on the marketplace
app.get('/api/nfts/marketplace', async (req, res) => {
    try {
        const nfts = await Nft.find();
        // TODO: Replace with your actual marketplace/escrow wallet address for your program.
        const MARKETPLACE_ESCROW_WALLET_ADDRESS = "YOUR_SOLANA_MARKETPLACE_PROGRAM_PDA_OR_WALLET_ADDRESS";
        res.json({ nfts: nfts, marketplaceOwnerWallet: MARKETPLACE_ESCROW_WALLET_ADDRESS });
    } catch (error) {
        console.error('Error fetching marketplace NFTs:', error);
        res.status(500).json({ error: 'Failed to fetch marketplace NFTs.' });
    }
});

// Endpoint for preparing NFT mint (uploading to local 'uploads' and generating metadata URI)
app.post('/api/nfts/prepare-mint', authenticateToken, upload.single('nftFile'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No NFT file uploaded.' });
    }
    const { name, description, attributes } = req.body;
    // creatorWallet should come from authenticated user (req.user.walletAddress)
    const creatorWallet = req.user.walletAddress;

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

    // TODO: In PRODUCTION, upload `req.file.path` to IPFS/Arweave or S3.
    // The `contentUrl` below would then be the URL from that service.
    const contentUrl = `${SERVER_BASE_URL}/uploads/${req.file.filename}`;

    const nftMetadata = {
        name: name.trim(),
        symbol: "AFOXNFT", // Example symbol for your collection
        description: description.trim(),
        image: contentUrl, // This should be the IPFS/Arweave/S3 URL in production
        properties: {
            files: [{
                uri: contentUrl, // This should be the IPFS/Arweave/S3 URL in production
                type: req.file.mimetype,
            }],
            category: req.file.mimetype.startsWith('image') ? 'image' : 'video',
            creators: [{
                address: creatorWallet.trim(),
                share: 100 // Adjust royalty share as needed
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

    // Save metadata JSON locally (for development)
    // TODO: In PRODUCTION, upload this metadata JSON to IPFS/Arweave or S3 as well.
    const metadataFileName = `${path.basename(req.file.filename, path.extname(req.file.filename))}.json`;
    metadataFilePath = path.join(__dirname, uploadDir, metadataFileName);

    try {
        await fs.writeFile(metadataFilePath, JSON.stringify(nftMetadata, null, 2));
    } catch (error) {
        console.error('Error writing NFT metadata file:', error);
        try { await fs.unlink(req.file.path); } catch (e) { console.error('Error cleaning up NFT file:', e); }
        return res.status(500).json({ error: 'Failed to save NFT metadata file.' });
    }

    // This `metadataUri` should be the IPFS/Arweave/S3 URL of the JSON in production
    const metadataUri = `${SERVER_BASE_URL}/uploads/${metadataFileName}`;

    // --- TODO: REAL SOLANA MINTING TRANSACTION PREPARATION ---
    // This is where you would prepare the actual Solana transaction
    // to mint the NFT using the `metadataUri`.
    // The client would then sign and send this transaction.
    // DANGER: The `simulatedMintAddress` is NOT a real Solana address.
    const simulatedMintAddress = `SIMULATED_MINT_${Date.now()}_${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

    // Pseudocode for real transaction:
    /*
    const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
    const payerKeypair = Keypair.generate(); // In real app, this might be a backend key or client's payer
    const mintKeypair = Keypair.generate(); // The keypair for the new NFT mint account
    const tokenAccount = await getAssociatedTokenAddress(mintKeypair.publicKey, new PublicKey(creatorWallet));

    // Instructions to create mint account, initialize mint, create associated token account, mint to, set metadata, etc.
    // This requires @solana/web3.js and @metaplex-foundation/js or similar libraries.
    // Example (very simplified, using Metaplex JS SDK usually):
    // const { createNft } = require('@metaplex-foundation/mpl-token-metadata');
    // const transactionBuilder = createNft(umi, { ... }); // Umi is Metaplex context

    // const transaction = new Transaction().add(...instructions);
    // transaction.feePayer = new PublicKey(creatorWallet);
    // transaction.recentBlockhash = (await connection.getLatestBlockhash('finalized')).blockhash;
    // const serializedTransaction = transaction.serialize({ requireAllSignatures: false, verifySignatures: false }).toString('base64');
    */
    // --- END REAL SOLANA MINTING ---

    try {
        // Only save to DB *after* confirming a real blockchain transaction succeeded
        const newNft = new Nft({
            name: nftMetadata.name,
            description: nftMetadata.description,
            image: nftMetadata.image, // URL to the main asset
            mint: simulatedMintAddress, // DANGER: Replace with actual mint address from blockchain
            owner: creatorWallet.trim(), // The initial owner
            isListed: false,
            attributes: nftMetadata.attributes,
            history: [{ type: 'Mint', to: creatorWallet.trim() }]
        });
        await newNft.save();

        res.status(201).json({
            message: 'NFT assets prepared and simulated mint data saved. Await client blockchain interaction.',
            uri: metadataUri, // URL to the metadata JSON
            imageUrl: contentUrl, // URL to the main NFT asset
            mintAddress: simulatedMintAddress, // DANGER: Client will get real mint from tx
            // For real: serializedTransaction: serializedTransaction,
            nft: newNft // Return the DB record for the simulated NFT
        });
    } catch (error) {
        console.error('Error preparing/simulating NFT mint and saving to DB:', error);
        try { await fs.unlink(req.file.path); } catch (e) { console.error('Error cleaning up NFT file:', e); }
        if (metadataFilePath) { try { await fs.unlink(metadataFilePath); } catch (e) { console.error('Error cleaning up NFT metadata file:', e); } }
        res.status(500).json({ error: 'Failed to prepare/simulate NFT mint.' });
    }
});

// Endpoint for listing NFT (Blockchain-triggered Update)
app.post('/api/nfts/list', authenticateToken, async (req, res) => {
    const { mintAddress, price, duration } = req.body;
    // sellerWallet should come from authenticated user (req.user.walletAddress)
    const sellerWallet = req.user.walletAddress;

    if (!mintAddress || mintAddress.trim().length === 0 ||
        !price || isNaN(price) || Number(price) <= 0 ||
        !duration || isNaN(duration) || Number(duration) <= 0 ||
        !sellerWallet || sellerWallet.trim().length === 0) {
        return res.status(400).json({ error: 'Missing or invalid required fields for listing (mintAddress, price, duration, sellerWallet).' });
    }
    if (!isValidSolanaAddress(sellerWallet.trim())) {
        return res.status(400).json({ error: 'Invalid Solana wallet address format for sellerWallet.' });
    }

    // --- TODO: REAL SOLANA LISTING TRANSACTION PREPARATION & CONFIRMATION ---
    // 1. Client initiates list action.
    // 2. Backend prepares transaction (e.g., transfer NFT to marketplace PDA, set price).
    // 3. Client signs and sends.
    // 4. Backend receives confirmation (via webhook or polling) OR client sends confirmation to a new endpoint.
    // DANGER: The update below happens immediately, assuming blockchain success.
    // In production, this DB update MUST only happen AFTER the Solana transaction confirms.

    try {
        // Find the NFT by its mint address and confirm the seller is the owner and it's not already listed
        const nft = await Nft.findOneAndUpdate(
            { mint: mintAddress.trim(), owner: sellerWallet.trim(), isListed: false },
            {
                $set: {
                    isListed: true,
                    price: Number(price),
                    listedAt: new Date(),
                    listingDuration: Number(duration),
                    listedBy: sellerWallet.trim(),
                    // In real dApp: The `owner` field might change to a marketplace escrow account/PDA here
                },
                $push: { history: { type: 'List', from: sellerWallet.trim(), timestamp: new Date() } }
            },
            { new: true }
        );

        if (!nft) {
            return res.status(404).json({ error: 'NFT not found, you are not the owner, or it is already listed.' });
        }

        console.log(`NFT ${mintAddress} listed by ${sellerWallet} for ${price} SOL (simulated update).`);
        res.status(200).json({ message: `NFT ${mintAddress} listed for sale for ${price} SOL (simulated).`, nft });
    } catch (error) {
        console.error('Error listing NFT:', error);
        res.status(500).json({ error: 'Failed to list NFT.' });
    }
});

// Endpoint for buying NFT (Blockchain-triggered Update)
app.post('/api/nfts/buy', authenticateToken, async (req, res) => {
    const { mintAddress, sellerWallet, price } = req.body;
    // buyerWallet should come from authenticated user (req.user.walletAddress)
    const buyerWallet = req.user.walletAddress;

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

    // --- TODO: REAL SOLANA BUYING TRANSACTION PREPARATION & CONFIRMATION ---
    // 1. Client initiates buy action.
    // 2. Backend prepares transaction (e.g., transfer SOL from buyer to seller, NFT from seller/marketplace to buyer).
    // 3. Client signs and sends.
    // 4. Backend receives confirmation (via webhook or polling) OR client sends confirmation to a new endpoint.
    // DANGER: The update below happens immediately, assuming blockchain success.
    // In production, this DB update MUST only happen AFTER the Solana transaction confirms.

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

        console.log(`NFT ${nft.name} successfully purchased (simulated update).`);
        res.status(200).json({
            message: `NFT ${nft.name} successfully purchased (simulated).`,
            nft,
            // For real: serializedTransaction: serializedTransaction // Return prepared tx for client to sign
        });

    } catch (error) {
        console.error('Error buying NFT:', error);
        res.status(500).json({ error: 'Failed to buy NFT.' });
    }
});

// Endpoint for NFT history
app.get('/api/nfts/:mint/history', async (req, res) => {
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
        console.error('Error fetching NFT history:', error);
        res.status(500).json({ error: 'Failed to fetch NFT history.' });
    }
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
            const placeholderPhoto1Path = path.join(uploadDir, 'photo_placeholder_1.png');
            const placeholderPhoto2Path = path.join(uploadDir, 'photo_placeholder_2.png');
            try { await fs.access(placeholderPhoto1Path); } catch (err) { await fs.writeFile(placeholderPhoto1Path, Buffer.from([])); console.log(`Created placeholder: ${placeholderPhoto1Path}`); }
            try { await fs.access(placeholderPhoto2Path); } catch (err) { await fs.writeFile(placeholderPhoto2Path, Buffer.from([])); console.log(`Created placeholder: ${placeholderPhoto2Path}`); }

            await Photo.insertMany([
                { title: 'First Day in Office', description: 'Getting started with Aurum Fox.', imageUrl: `${SERVER_BASE_URL}/uploads/photo_placeholder_1.png`, date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), creatorWallet: "SIMULATED_WALLET_A" },
                { title: 'Aurum Fox Team', description: 'Our dedicated team.', imageUrl: `${SERVER_BASE_URL}/uploads/photo_placeholder_2.png`, date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), creatorWallet: "SIMULATED_WALLET_B" }
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
            const nftPlaceholder1Path = path.join(uploadDir, 'nft_marketplace_1.png');
            const nftPlaceholder2Path = path.join(uploadDir, 'nft_marketplace_2.png');
            const nftUserOwnedPath = path.join(uploadDir, 'nft_user_owned.png');
            try { await fs.access(nftPlaceholder1Path); } catch (err) { await fs.writeFile(nftPlaceholder1Path, Buffer.from([])); console.log(`Created placeholder: ${nftPlaceholder1Path}`); }
            try { await fs.access(nftPlaceholder2Path); } catch (err) { await fs.writeFile(nftPlaceholder2Path, Buffer.from([])); console.log(`Created placeholder: ${nftPlaceholder2Path}`); }
            try { await fs.access(nftUserOwnedPath); } catch (err) { await fs.writeFile(nftUserOwnedPath, Buffer.from([])); console.log(`Created placeholder: ${nftUserOwnedPath}`); }

            await Nft.insertMany([
                {
                    name: "Rare Fox", description: "A very rare golden fox NFT.", image: `${SERVER_BASE_URL}/uploads/nft_marketplace_1.png`, mint: "SOME_MARKETPLACE_NFT_MINT_1", owner: "YOUR_SOLANA_MARKETPLACE_PROGRAM_PDA_OR_WALLET_ADDRESS", isListed: true, price: 0.8, listedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), listingDuration: 30, listedBy: "YOUR_SOLANA_MARKETPLACE_PROGRAM_PDA_OR_WALLET_ADDRESS", attributes: [{ trait_type: "Rarity", value: "Rare" }],
                    history: [{ type: 'Mint', to: "YOUR_SOLANA_MARKETPLACE_PROGRAM_PDA_OR_WALLET_ADDRESS", timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) }, { type: 'List', from: "YOUR_SOLANA_MARKETPLACE_PROGRAM_PDA_OR_WALLET_ADDRESS", timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) }]
                },
                {
                    name: "Cunning Fox", description: "A cunning fox ready to pounce.", image: `${SERVER_BASE_URL}/uploads/nft_marketplace_2.png`, mint: "SOME_MARKETPLACE_NFT_MINT_2", owner: "ANOTHER_SELLER_WALLET_ADDRESS", isListed: true, price: 0.3, listedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), listingDuration: 60, listedBy: "ANOTHER_SELLER_WALLET_ADDRESS", attributes: [{ trait_type: "Expression", value: "Wink" }],
                    history: [{ type: 'Mint', to: "ANOTHER_SELLER_WALLET_ADDRESS", timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000) }, { type: 'List', from: "ANOTHER_SELLER_WALLET_ADDRESS", timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) }]
                },
                {
                    name: "User Owned Fox", description: "An NFT owned by a user, not yet listed.", image: `${SERVER_BASE_URL}/uploads/nft_user_owned.png`, mint: "USER_OWNED_NFT_MINT_1", owner: "SIMULATED_USER_WALLET_ADDRESS", isListed: false, price: null, attributes: [{ trait_type: "Color", value: "Blue" }],
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
                { title: "Buy My Awesome Project!", content: "Check out our new dApp, it's great!", imageUrl: `${SERVER_BASE_URL}/uploads/ad_placeholder.png`, link: "https://myawesomedapp.com", advertiser: "ProjectX" }
            ]);
            console.log('  Initial ads seeded.');
        }

    } catch (error) {
        console.error('Error seeding initial data:', error);
    }
}

// --- Centralized Error Handling Middleware ---
app.use((err, req, res, next) => {
    console.error('An unhandled error occurred:', err);

    if (err instanceof multer.MulterError) {
        return res.status(400).json({ error: `File upload error: ${err.message}. Limit: ${req.app.get('multerLimits')?.fileSize / (1024 * 1024)}MB` });
    }
    if (err.message && err.message.startsWith('Invalid file type')) {
        return res.status(400).json({ error: err.message });
    }

    res.status(err.status || 500).json({
        error: err.message || 'An unexpected server error occurred.'
    });
});

// --- Server Start ---
// Ensure upload directory exists before starting the server and seeding data
ensureUploadDir().then(() => {
    app.listen(PORT, () => {
        console.log(`Backend server listening at ${SERVER_BASE_URL}`);
        console.log(`MongoDB URI: ${MONGODB_URI}`);
        console.log(`CORS allowed origins: ${ALLOWED_CORS_ORIGINS.join(', ')}`);
        console.log(`\n--- PRODUCTION CHECKLIST ---`);
        console.log(`1. REPLACE 'YOUR_SUPER_STRONG_JWT_SECRET_HERE' in .env with a strong, random secret!`);
        console.log(`2. REPLACE 'http://localhost:${PORT}' with your actual domain in SERVER_BASE_URL in .env! (e.g., https://api.your-domain.com)`);
        console.log(`3. IMPLEMENT REAL SOLANA WALLET SIGNATURE VERIFICATION in /api/auth/login!`);
        console.log(`4. INTEGRATE REAL SOLANA BLOCKCHAIN TXS for NFT mint/list/buy. Ensure DB updates ONLY after confirmed blockchain success!`);
        console.log(`5. CONFIGURE CLOUD STORAGE (IPFS/Arweave/S3) for all uploads. Update file handling logic.`);
        console.log(`6. REPLACE placeholder wallet addresses ('YOUR_SOLANA_MARKETPLACE_PROGRAM_PDA_OR_WALLET_ADDRESS', etc.) with real ones.`);
        console.log(`7. Consider using a production-ready logging library (Winston, Morgan).`);
        console.log(`8. Ensure proper HTTPS setup on your server/proxy.`);

        seedInitialData(); // Calls the data seeding function when the server starts
    });
});
