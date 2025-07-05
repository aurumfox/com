// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises; // Use fs.promises for async file operations
const mongoose = require('mongoose');

// IMPORTANT: For real Solana blockchain interactions, uncomment and configure these.
// const { Connection, Keypair, PublicKey, clusterApiUrl, SystemProgram } = require('@solana/web3.js');
// const { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, createTransferInstruction, TOKEN_PROGRAM_ID } = require('@solana/spl-token');
// const bs58 = require('bs58'); // For working with base58 keys, if needed

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/solana_dapp_db_default';
const ALLOWED_CORS_ORIGINS = process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : ['http://127.0.0.1:5500']; // Default for local dev

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
    creatorWallet: { type: String, required: true, trim: true }, // Add validation for Solana address format
});
const Photo = mongoose.model('Photo', photoSchema);

const postSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true, trim: true },
    date: { type: Date, default: Date.now },
    authorWallet: { type: String, required: true, trim: true }, // Add validation for Solana address format
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

// --- Utility Functions / Placeholders for Auth ---

/**
 * Basic Solana public key validation (placeholder).
 * In a real dApp, you'd use @solana/web3.js for robust validation.
 * e.g., `return PublicKey.isOnCurve(new PublicKey(address));`
 */
function isValidSolanaAddress(address) {
    if (typeof address !== 'string' || address.length < 32 || address.length > 44) {
        return false; // Basic length check for Solana addresses
    }
    // More robust check if @solana/web3.js is uncommented:
    // try {
    //     new PublicKey(address);
    //     return true;
    // } catch (e) {
    //     return false;
    // }
    return true; // Placeholder for actual validation
}

/**
 * Placeholder middleware for authentication.
 * In production, this would verify a JWT token or similar.
 */
const authenticateToken = (req, res, next) => {
    // const authHeader = req.headers['authorization'];
    // const token = authHeader && authHeader.split(' ')[1];
    // if (token == null) return res.status(401).json({ error: 'Authentication token required.' });

    // // Placeholder: In a real app, verify the token
    // jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
    //     if (err) return res.status(403).json({ error: 'Invalid or expired token.' });
    //     req.user = user; // Attach user info to request
    //     next();
    // });

    console.warn("WARNING: Authentication is not implemented for this endpoint. Access is open.");
    next(); // For development, allow all access
};

/**
 * Placeholder middleware for authorization (role-based access control).
 */
const authorizeRole = (requiredRole) => (req, res, next) => {
    // if (!req.user || req.user.role !== requiredRole) {
    //     return res.status(403).json({ error: `Access denied. Requires '${requiredRole}' role.` });
    // }
    console.warn(`WARNING: Authorization for role '${requiredRole}' is not implemented. Access is open.`);
    next(); // For development, allow all access
};

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
        // Clean up uploaded file if required fields are missing
        if (req.file) {
            try { await fs.unlink(req.file.path); } catch (e) { console.error('Error cleaning up file:', e); }
        }
        return res.status(400).json({ error: 'Title, description, and developer are required to add a game.' });
    }

    let gameUrl = externalUrl ? externalUrl.trim() : null;

    if (req.file) {
        // If a file is uploaded, prioritize serving it from our server
        gameUrl = `http://localhost:${PORT}/uploads/${req.file.filename}`;
        // In production, replace localhost with your actual domain
        // gameUrl = `https://your-domain.com/uploads/${req.file.filename}`;
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
        if (req.file) { // Clean up if DB save fails
            try { await fs.unlink(req.file.path); } catch (e) { console.error('Error cleaning up file on DB error:', e); }
        }
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
        if (req.file) {
            try { await fs.unlink(req.file.path); } catch (e) { console.error('Error cleaning up file:', e); }
        }
        return res.status(400).json({ error: 'Title, content, and advertiser are required to post an ad.' });
    }

    let imageUrl = null;
    if (req.file) {
        imageUrl = `http://localhost:${PORT}/uploads/${req.file.filename}`;
        // In production, replace localhost with your actual domain
        // imageUrl = `https://your-domain.com/uploads/${req.file.filename}`;
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
        if (req.file) { // Clean up if DB save fails
            try { await fs.unlink(req.file.path); } catch (e) { console.error('Error cleaning up file on DB error:', e); }
        }
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

    const imageUrl = `http://localhost:${PORT}/uploads/${req.file.filename}`;
    // In production, replace localhost with your actual domain
    // const imageUrl = `https://your-domain.com/uploads/${req.file.filename}`;

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
        console.error('Error publishing post:', error);
        res.status(500).json({ error: 'Failed to publish post.' });
    }
});


// NFTs API (Simulated Blockchain Interaction)

// GET all NFTs, including those listed on the marketplace
app.get('/api/nfts/marketplace', async (req, res) => {
    try {
        const nfts = await Nft.find();
        // IMPORTANT: Replace with your actual marketplace/escrow wallet address in production
        // This address would be a PDA (Program Derived Address) or a dedicated escrow wallet for your program.
        res.json({ nfts: nfts, marketplaceOwnerWallet: "MARKETPLACE_ESCROW_WALLET_ADDRESS_HERE" });
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

    const contentUrl = `http://localhost:${PORT}/uploads/${req.file.filename}`;
    // In production, replace localhost with your actual domain
    // const contentUrl = `https://your-domain.com/uploads/${req.file.filename}`;

    const nftMetadata = {
        name: name.trim(),
        symbol: "AFOXNFT", // Example symbol for your collection
        description: description.trim(),
        image: contentUrl,
        properties: {
            files: [{
                uri: contentUrl,
                type: req.file.mimetype,
            }],
            category: req.file.mimetype.startsWith('image') ? 'image' : 'video', // Or other categories like 'audio', 'html', etc.
            creators: [{
                address: creatorWallet.trim(),
                share: 100 // Example: Creator gets 100% royalty in this simulation
            }]
        },
        attributes: []
    };

    let metadataFilePath;
    try {
        if (attributes && typeof attributes === 'string') {
            const parsedAttributes = JSON.parse(attributes);
            if (Array.isArray(parsedAttributes)) {
                // Validate individual attribute objects if needed: { trait_type: string, value: string }
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
        // Do not fail the request if attributes parsing fails, just ignore them.
    }

    // Save metadata JSON to the 'uploads' folder
    const metadataFileName = `${path.basename(req.file.filename, path.extname(req.file.filename))}.json`;
    metadataFilePath = path.join(__dirname, uploadDir, metadataFileName);

    try {
        await fs.writeFile(metadataFilePath, JSON.stringify(nftMetadata, null, 2));
    } catch (error) {
        console.error('Error writing NFT metadata file:', error);
        try { await fs.unlink(req.file.path); } catch (e) { console.error('Error cleaning up NFT file:', e); }
        return res.status(500).json({ error: 'Failed to save NFT metadata file.' });
    }

    const metadataUri = `http://localhost:${PORT}/uploads/${metadataFileName}`;
    // In production, replace localhost with your actual domain
    // const metadataUri = `https://your-domain.com/uploads/${metadataFileName}`;

    // Simulate a unique Solana mint address.
    // IN A REAL PRODUCTION APP: This mint address is generated on the blockchain during actual minting.
    // The server would typically return a transaction (or instructions) for the client to sign and send.
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
            history: [{ type: 'Mint', to: nftMetadata.properties.creators[0].address }] // Add minting history
        });
        await newNft.save();

        res.status(201).json({
            message: 'NFT assets prepared and simulated mint successful.',
            uri: metadataUri,
            mintAddress: simulatedMintAddress,
            imageUrl: contentUrl,
            signature: 'SIMULATED_TRANSACTION_SIGNATURE_FROM_BACKEND', // Placeholder
            nft: newNft // Return the full NFT object
        });
    } catch (error) {
        console.error('Error preparing/simulating NFT mint and saving to DB:', error);
        // Clean up both uploaded file and metadata file if DB save fails
        try { await fs.unlink(req.file.path); } catch (e) { console.error('Error cleaning up NFT file:', e); }
        if (metadataFilePath) {
            try { await fs.unlink(metadataFilePath); } catch (e) { console.error('Error cleaning up NFT metadata file:', e); }
        }
        res.status(500).json({ error: 'Failed to prepare/simulate NFT mint.' });
    }
});

// Endpoint for listing NFT (simulation)
app.post('/api/nfts/list', authenticateToken, async (req, res) => {
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
                    // IN A REAL dApp: The `owner` might change to a marketplace escrow account here
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
        console.error('Error listing NFT:', error);
        res.status(500).json({ error: 'Failed to list NFT.' });
    }
});

// Endpoint for buying NFT (simulation)
app.post('/api/nfts/buy', authenticateToken, async (req, res) => {
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
        // Find the NFT, ensure it's listed for sale, and the owner matches the sellerWallet and price
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

        // --- REAL PRODUCTION SOLANA TRANSACTION LOGIC (Pseudocode) ---
        // This is where you'd construct and serialize the Solana transaction(s).
        // The client would then sign and send this serialized transaction to the Solana network.
        /*
        const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
        const buyerPubKey = new PublicKey(buyerWallet);
        const sellerPubKey = new PublicKey(sellerWallet);
        const nftMintPubKey = new PublicKey(mintAddress);

        let instructions = [];

        // 1. Get or create Associated Token Account for the buyer for this NFT mint
        const buyerTokenAccount = await getAssociatedTokenAddress(nftMintPubKey, buyerPubKey);
        const buyerAtaInfo = await connection.getAccountInfo(buyerTokenAccount);
        if (!buyerAtaInfo) {
            instructions.push(createAssociatedTokenAccountInstruction(
                buyerPubKey, // Payer of the ATA creation transaction
                buyerTokenAccount,
                buyerPubKey, // Owner of the ATA
                nftMintPubKey
            ));
        }

        // 2. Get the seller's Associated Token Account for this NFT mint
        // In a real marketplace, the NFT might be held by an escrow PDA.
        // For direct transfers, find the seller's ATA.
        const sellerTokenAccounts = await connection.getParsedTokenAccountsByOwner(sellerPubKey, { mint: nftMintPubKey });
        if (!sellerTokenAccounts.value || sellerTokenAccounts.value.length === 0) {
            throw new Error('Seller does not hold this NFT in an accessible account.');
        }
        const sellerTokenAccount = sellerTokenAccounts.value[0].pubkey;

        // 3. Add NFT transfer instruction
        instructions.push(createTransferInstruction(
            sellerTokenAccount, // From (ATA of seller)
            buyerTokenAccount,  // To (ATA of buyer)
            sellerPubKey,       // Owner (seller's wallet as signer for transfer)
            1                   // Amount (always 1 for NFTs)
        ));

        // 4. Add SOL transfer instruction (for payment)
        instructions.push(SystemProgram.transfer({
            fromPubkey: buyerPubKey,
            toPubkey: sellerPubKey,
            lamports: price * LAMPORTS_PER_SOL,
        }));

        const transaction = new Transaction().add(...instructions);
        transaction.feePayer = buyerPubKey; // Buyer pays transaction fees
        transaction.recentBlockhash = (await connection.getLatestBlockhash('finalized')).blockhash;

        // The transaction needs to be signed by the seller (for NFT transfer)
        // and by the buyer (for SOL transfer and fees).
        // In this backend context, you would typically only sign if the backend holds keys
        // (e.g., for a marketplace escrow account), then serialize and send to client for final user signature.
        // If seller is just a regular user, seller's wallet signs on frontend.
        // For simplicity, we'll assume direct transfer and buyer + seller both sign on client side after receiving instructions.

        const serializedTransaction = transaction.serialize({ requireAllSignatures: false, verifySignatures: false }).toString('base64');

        res.status(200).json({
            message: `NFT ${nft.name} purchase simulated. Transaction prepared for signing.`,
            nft,
            serializedTransaction: serializedTransaction
        });
        */
        // --- END OF REAL PRODUCTION SOLANA TRANSACTION LOGIC ---

        // For now, return a simulated transaction response
        res.status(200).json({
            message: `NFT ${nft.name} successfully purchased (simulated).`,
            nft,
            serializedTransaction: 'SIMULATED_TRANSACTION_BASE64_FOR_CLIENT_SIGNING'
        });
        console.log(`NFT ${nft.name} transferred from ${sellerWallet} to ${buyerWallet} for ${price} SOL (simulated).`);

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
                { title: 'First Day in Office', description: 'Getting started with Aurum Fox.', imageUrl: `http://localhost:${PORT}/uploads/photo_placeholder_1.png`, date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), creatorWallet: "SIMULATED_WALLET_A" },
                { title: 'Aurum Fox Team', description: 'Our dedicated team.', imageUrl: `http://localhost:${PORT}/uploads/photo_placeholder_2.png`, date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), creatorWallet: "SIMULATED_WALLET_B" }
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
                    name: "Rare Fox", description: "A very rare golden fox NFT.", image: `http://localhost:${PORT}/uploads/nft_marketplace_1.png`, mint: "SOME_MARKETPLACE_NFT_MINT_1", owner: "MARKETPLACE_ESCROW_WALLET_ADDRESS_HERE", isListed: true, price: 0.8, listedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), listingDuration: 30, listedBy: "MARKETPLACE_ESCROW_WALLET_ADDRESS_HERE", attributes: [{ trait_type: "Rarity", value: "Rare" }],
                    history: [{ type: 'Mint', to: "MARKETPLACE_ESCROW_WALLET_ADDRESS_HERE", timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) }, { type: 'List', from: "MARKETPLACE_ESCROW_WALLET_ADDRESS_HERE", timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) }]
                },
                {
                    name: "Cunning Fox", description: "A cunning fox ready to pounce.", image: `http://localhost:${PORT}/uploads/nft_marketplace_2.png`, mint: "SOME_MARKETPLACE_NFT_MINT_2", owner: "ANOTHER_SELLER_WALLET_ADDRESS", isListed: true, price: 0.3, listedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), listingDuration: 60, listedBy: "ANOTHER_SELLER_WALLET_ADDRESS", attributes: [{ trait_type: "Expression", value: "Wink" }],
                    history: [{ type: 'Mint', to: "ANOTHER_SELLER_WALLET_ADDRESS", timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000) }, { type: 'List', from: "ANOTHER_SELLER_WALLET_ADDRESS", timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) }]
                },
                {
                    name: "User Owned Fox", description: "An NFT owned by a user, not yet listed.", image: `http://localhost:${PORT}/uploads/nft_user_owned.png`, mint: "USER_OWNED_NFT_MINT_1", owner: "SIMULATED_USER_WALLET_ADDRESS", isListed: false, price: null, attributes: [{ trait_type: "Color", value: "Blue" }],
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
                { title: "Buy My Awesome Project!", content: "Check out our new dApp, it's great!", imageUrl: `http://localhost:${PORT}/uploads/ad_placeholder.png`, link: "https://myawesomedapp.com", advertiser: "ProjectX" }
            ]);
            console.log('  Initial ads seeded.');
        }

    } catch (error) {
        console.error('Error seeding initial data:', error);
    }
}

// --- Server Start ---
// Ensure upload directory exists before starting the server and seeding data
ensureUploadDir().then(() => {
    app.listen(PORT, () => {
        console.log(`Backend server listening at http://localhost:${PORT}`);
        console.log(`MongoDB URI: ${MONGODB_URI}`);
        console.log(`CORS allowed origins: ${ALLOWED_CORS_ORIGINS.join(', ')}`);
        console.log(`Your frontend should be configured to fetch from http://localhost:${PORT}`);
        console.log(`\nIMPORTANT: For production, uncomment and implement proper authentication (JWT) and Solana Web3 integration.`);
        seedInitialData(); // Calls the data seeding function when the server starts
    });
});

