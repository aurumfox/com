const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
require('dotenv').config(); // Loads environment variables from .env file

// --- START OF CORRECTIONS ---
// 1. Critical errors / Missing implementations:
//    If you plan to perform Solana operations on the server (e.g., create/sign transactions),
//    uncomment these lines and ensure the packages are installed.
//    In this correction, I leave them commented out, as typically transaction creation/signing
//    occurs on the client side. However, if you were to use them:
const { Connection, PublicKey, SystemProgram, Keypair, Transaction } = require('@solana/web3.js'); // Uncomment
const { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, createTransferInstruction, TOKEN_PROGRAM_ID } = require('@solana/spl-token'); // Uncomment
// const bs58 = require('bs58'); // For working with base58 keys, if needed (e.g., for Keypair.fromSecretKey)
// --- END OF CORRECTIONS ---

const app = express();
const port = process.env.PORT || 3000; // Use port from environment variables or 3000

// --- Middlewares ---
// Configure CORS
// IMPORTANT: In production, replace 'http://127.0.0.1:5500' with your actual frontend's domain.
// If your frontend will be at https://www.yourdomain.com, the origin should be the same.
// For multiple domains, you can use an array: ['http://localhost:3000', 'https://www.yourdomain.com']
// Or dynamic checking:
const allowedOrigins = [
    'http://127.0.0.1:5500',
    `http://localhost:${port}`, // Add localhost with the current port
    process.env.FRONTEND_URL // Add frontend URL from environment variables
].filter(Boolean); // Remove empty values

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (e.g., from Postman or file://)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = `The CORS policy for this site does not allow access from the specified Origin: ${origin}.`;
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files from the 'uploads' directory
// This is important so your frontend can access uploaded NFT images, photos, ads, etc.
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- Multer Setup for File Uploads ---
const uploadDir = 'uploads/';
if (!fs.existsSync(uploadDir)) {
    console.log(`Creating upload directory: ${uploadDir}`);
    fs.mkdirSync(uploadDir, { recursive: true }); // recursive: true allows creating nested folders
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Ensure the filename is unique and retains the original extension
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // File size limit to 10MB
    fileFilter: (req, file, cb) => {
        // Additional file type (MIME type) validation
        if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/') || file.mimetype === 'application/json' || file.mimetype === 'text/html') {
            cb(null, true);
        } else {
            // --- START OF CORRECTIONS ---
            // 2. More informative file type error messages
            cb(new Error(`Invalid file type: ${file.mimetype}. Images, videos, JSON, and HTML are allowed.`), false);
            // --- END OF CORRECTIONS ---
        }
    }
});

// --- MongoDB Connection ---
// USE AN ENVIRONMENT VARIABLE FOR THE DATABASE CONNECTION URI!
// Create a .env file in your project root and add:
// MONGODB_URI=mongodb://localhost:27017/solana_dapp_db
//
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('FATAL ERROR: MONGODB_URI is not defined in environment variables. Please set it in your .env file or directly in your environment.');
    process.exit(1); // Exit the process if URI is not set
}

mongoose.connect(MONGODB_URI)
    .then(() => console.log('MongoDB connected successfully!'))
    .catch(err => {
        console.error('MongoDB connection error:', err);
        // In production, add logging for monitoring systems
        process.exit(1); // Exit the process if unable to connect to DB
    });

// --- Mongoose Schemas and Models ---

// Schema for Announcements
const announcementSchema = new mongoose.Schema({
    text: { type: String, required: true, trim: true }, // trim added
    date: { type: Date, default: Date.now },
});
const Announcement = mongoose.model('Announcement', announcementSchema);

// Schema for Photos (User-uploaded images)
const photoSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true, maxlength: 255 }, // trim and maxlength added
    description: { type: String, trim: true, maxlength: 1000 }, // trim and maxlength added
    imageUrl: { type: String, required: true },
    date: { type: Date, default: Date.now },
    creatorWallet: { type: String, required: true, trim: true }, // trim added
});
const Photo = mongoose.model('Photo', photoSchema);

// Schema for Posts (Blog posts, community updates)
const postSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true, maxlength: 255 }, // trim and maxlength added
    content: { type: String, required: true, trim: true, maxlength: 5000 }, // trim and maxlength added
    date: { type: Date, default: Date.now },
    authorWallet: { type: String, required: true, trim: true }, // trim added
});
const Post = mongoose.model('Post', postSchema);

// Schema for NFTs (Non-Fungible Tokens)
const nftSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true, maxlength: 255 }, // trim and maxlength added
    description: { type: String, trim: true, maxlength: 1000 }, // trim and maxlength added
    image: { type: String, required: true },
    mint: { type: String, required: true, unique: true, index: true, trim: true }, // trim added
    owner: { type: String, required: true, trim: true }, // trim added
    isListed: { type: Boolean, default: false },
    price: Number,
    listedAt: Date,
    listingDuration: Number,
    listedBy: { type: String, trim: true }, // trim added
    attributes: [{ trait_type: { type: String, trim: true }, value: { type: String, trim: true } }], // trim added
    history: [{ // Adding transaction history for NFTs
        type: { type: String, enum: ['Mint', 'Transfer', 'Sale', 'List', 'Delist'], required: true },
        from: { type: String, trim: true }, // Wallet address
        to: { type: String, trim: true },   // Wallet address
        price: Number, // If sale
        timestamp: { type: Date, default: Date.now }
    }]
});
const Nft = mongoose.model('Nft', nftSchema);

// Schema for Games
const gameSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true, maxlength: 255 }, // trim and maxlength added
    description: { type: String, trim: true, maxlength: 1000 }, // trim and maxlength added
    url: { type: String, trim: true }, // trim added
    developer: { type: String, trim: true, maxlength: 255 }, // trim and maxlength added
});
const Game = mongoose.model('Game', gameSchema);

// Schema for Advertisements
const adSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true, maxlength: 255 }, // trim and maxlength added
    content: { type: String, required: true, trim: true, maxlength: 1000 }, // trim and maxlength added
    imageUrl: String,
    link: { type: String, trim: true }, // trim added
    advertiser: { type: String, trim: true, maxlength: 255 }, // trim and maxlength added
});
const Ad = mongoose.model('Ad', adSchema);

// --- Helper function for Solana address validation ---
// --- START OF CORRECTIONS ---
const isValidSolanaAddress = (address) => {
    if (!address || typeof address !== 'string') return false;
    try {
        new PublicKey(address);
        return true;
    } catch (e) {
        return false;
    }
};
// --- END OF CORRECTIONS ---

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

app.post('/api/announcements', async (req, res) => {
    // --- START OF CORRECTIONS ---
    // 3. Authentication and Authorization (placeholder)
    // IN PRODUCTION: This is where user authentication logic (e.g., JWT verification)
    // and authorization (e.g., admin role check) should be implemented.
    // if (!req.user || req.user.role !== 'admin') {
    //     return res.status(403).json({ error: 'Access denied. Administrator privileges required.' });
    // }
    // --- END OF CORRECTIONS ---

    const { text } = req.body;
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
        return res.status(400).json({ error: 'Announcement text is required and cannot be empty.' });
    }
    // --- START OF CORRECTIONS ---
    // 4. Announcement text length validation
    if (text.trim().length > 1000) { // Example maximum length
        return res.status(400).json({ error: 'Announcement text is too long (max 1000 characters).' });
    }
    // --- END OF CORRECTIONS ---

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

app.post('/api/games', upload.single('gameFile'), async (req, res) => {
    // --- START OF CORRECTIONS ---
    // 3. Authentication and Authorization (placeholder)
    // if (!req.user || req.user.role !== 'developer') { // Example: only developers can upload games
    //     if (req.file) { fs.unlink(req.file.path, (err) => { if (err) console.error('Error deleting uploaded game file due to auth:', err); }); }
    //     return res.status(403).json({ error: 'Access denied. Developer privileges required.' });
    // }
    // --- END OF CORRECTIONS ---

    const { title, description, developer } = req.body;
    let gameUrl = '';
    const frontendBaseUrl = process.env.FRONTEND_SERVER_BASE_URL || `http://localhost:${port}`;

    // Basic validation
    if (!title || typeof title !== 'string' || title.trim().length === 0 ||
        !description || typeof description !== 'string' || description.trim().length === 0 ||
        !developer || typeof developer !== 'string' || developer.trim().length === 0) {
        if (req.file) { // Clean up uploaded file if required fields are missing
            fs.unlink(req.file.path, (err) => {
                if (err) console.error('Error deleting uploaded file:', err);
            });
        }
        return res.status(400).json({ error: 'Title, description, and developer are required and cannot be empty to add a game.' });
    }

    // --- START OF CORRECTIONS ---
    // 4. Game field length validation
    if (title.trim().length > 255 || description.trim().length > 1000 || developer.trim().length > 255) {
        if (req.file) { fs.unlink(req.file.path, (err) => { if (err) console.error('Error deleting uploaded game file due to length validation:', err); }); }
        return res.status(400).json({ error: 'Title, description, or developer are too long.' });
    }
    // --- END OF CORRECTIONS ---

    if (req.file) {
        gameUrl = `${frontendBaseUrl}/uploads/${req.file.filename}`;
    } else {
        // If game file not uploaded, but a URL is provided
        if (req.body.url && typeof req.body.url === 'string') {
            gameUrl = req.body.url.trim();
            // Additional URL validation if it's an external resource
            // --- START OF CORRECTIONS ---
            // 4. Stricter URL validation
            const urlRegex = /^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/i;
            if (!urlRegex.test(gameUrl)) {
                 return res.status(400).json({ error: 'Provided URL must be a valid HTTP/HTTPS link.' });
            }
            // --- END OF CORRECTIONS ---
        } else {
            return res.status(400).json({ error: 'To add a game, either upload a file or provide a valid URL.' });
        }
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
        if (req.file) { // Clean up if DB save failed
            fs.unlink(req.file.path, (err) => {
                if (err) console.error('Error deleting uploaded file after DB error:', err);
            });
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

app.post('/api/ads', upload.single('adCreative'), async (req, res) => {
    // --- START OF CORRECTIONS ---
    // 3. Authentication and Authorization (placeholder)
    // if (!req.user || req.user.role !== 'advertiser_admin') { // Example: only advertiser admins
    //     if (req.file) { fs.unlink(req.file.path, (err) => { if (err) console.error('Error deleting uploaded ad creative due to auth:', err); }); }
    //     return res.status(403).json({ error: 'Access denied. Insufficient privileges to place an ad.' });
    // }
    // --- END OF CORRECTIONS ---

    const { title, content, link, advertiser } = req.body;
    const frontendBaseUrl = process.env.FRONTEND_SERVER_BASE_URL || `http://localhost:${port}`;

    if (!title || typeof title !== 'string' || title.trim().length === 0 ||
        !content || typeof content !== 'string' || content.trim().length === 0 ||
        !advertiser || typeof advertiser !== 'string' || advertiser.trim().length === 0) {
        if (req.file) {
            fs.unlink(req.file.path, (err) => {
                if (err) console.error('Error deleting uploaded ad creative:', err);
            });
        }
        return res.status(400).json({ error: 'Title, content, and advertiser are required and cannot be empty to place an ad.' });
    }

    // --- START OF CORRECTIONS ---
    // 4. Ad field length validation
    if (title.trim().length > 255 || content.trim().length > 1000 || advertiser.trim().length > 255) {
        if (req.file) { fs.unlink(req.file.path, (err) => { if (err) console.error('Error deleting uploaded ad creative due to length validation:', err); }); }
        return res.status(400).json({ error: 'Title, content, or advertiser are too long.' });
    }
    // 4. Ad link validation
    if (link && typeof link === 'string') {
        const urlRegex = /^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/i;
        if (!urlRegex.test(link.trim())) {
            return res.status(400).json({ error: 'Provided link must be a valid HTTP/HTTPS link.' });
        }
    }
    // --- END OF CORRECTIONS ---

    let imageUrl = null;
    if (req.file) {
        imageUrl = `${frontendBaseUrl}/uploads/${req.file.filename}`;
    }

    try {
        const newAd = new Ad({
            title: title.trim(),
            content: content.trim(),
            imageUrl,
            link: link ? link.trim() : null, // link is optional
            advertiser: advertiser.trim()
        });
        await newAd.save();
        res.status(201).json({ message: 'Ad placed successfully', ad: newAd });
    } catch (error) {
        console.error('Error placing ad:', error);
        if (req.file) {
            fs.unlink(req.file.path, (err) => {
                if (err) console.error('Error deleting uploaded ad creative after DB error:', err);
            });
        }
        res.status(500).json({ error: 'Failed to place ad.' });
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

app.post('/api/photos/upload', upload.single('photo'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No photo file uploaded.' });
    }
    const { title, description, creatorWallet } = req.body;
    const frontendBaseUrl = process.env.FRONTEND_SERVER_BASE_URL || `http://localhost:${port}`;

    if (!title || typeof title !== 'string' || title.trim().length === 0 ||
        !creatorWallet || typeof creatorWallet !== 'string' || creatorWallet.trim().length === 0) {
        fs.unlink(req.file.path, (err) => { // Clean up the uploaded file if title/wallet is missing
            if (err) console.error('Error deleting uploaded photo:', err);
        });
        return res.status(400).json({ error: 'Photo title and creator wallet are required and cannot be empty.' });
    }

    // --- START OF CORRECTIONS ---
    // 4. Validate creatorWallet format (Solana address)
    if (!isValidSolanaAddress(creatorWallet.trim())) {
        fs.unlink(req.file.path, (err) => { if (err) console.error('Error deleting uploaded photo due to invalid creator wallet:', err); });
        return res.status(400).json({ error: 'Invalid Solana creator wallet address.' });
    }
    // 4. Photo field length validation
    if (title.trim().length > 255 || (description && description.trim().length > 1000)) {
        fs.unlink(req.file.path, (err) => { if (err) console.error('Error deleting uploaded photo due to length validation:', err); });
        return res.status(400).json({ error: 'Photo title or description is too long.' });
    }
    // --- END OF CORRECTIONS ---

    const imageUrl = `${frontendBaseUrl}/uploads/${req.file.filename}`;

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
        fs.unlink(req.file.path, (err) => {
            if (err) console.error('Error deleting uploaded photo after DB error:', err);
        });
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

app.post('/api/posts', async (req, res) => {
    // --- START OF CORRECTIONS ---
    // 3. Authentication and Authorization (placeholder)
    // if (!req.user || req.user.role !== 'author') { // Example: only authors
    //     return res.status(403).json({ error: 'Access denied. Insufficient privileges to publish a post.' });
    // }
    // --- END OF CORRECTIONS ---

    const { title, content, authorWallet } = req.body;
    if (!title || typeof title !== 'string' || title.trim().length === 0 ||
        !content || typeof content !== 'string' || content.trim().length === 0 ||
        !authorWallet || typeof authorWallet !== 'string' || authorWallet.trim().length === 0) {
        return res.status(400).json({ error: 'Title, content, and author wallet are required and cannot be empty.' });
    }

    // --- START OF CORRECTIONS ---
    // 4. Validate authorWallet format (Solana address)
    if (!isValidSolanaAddress(authorWallet.trim())) {
        return res.status(400).json({ error: 'Invalid Solana author wallet address.' });
    }
    // 4. Post field length validation
    if (title.trim().length > 255 || content.trim().length > 5000) {
        return res.status(400).json({ error: 'Post title or content is too long.' });
    }
    // --- END OF CORRECTIONS ---

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
        // IN PRODUCTION: Replace MARKETPLACE_OWNER_WALLET_ADDRESS_HERE with the actual marketplace/escrow wallet address
        const marketplaceOwnerWallet = process.env.MARKETPLACE_OWNER_WALLET_ADDRESS || "MARKETPLACE_OWNER_WALLET_ADDRESS_HERE";
        const nfts = await Nft.find();
        res.json({ nfts: nfts, marketplaceOwnerWallet: marketplaceOwnerWallet });
    } catch (error) {
        console.error('Error fetching marketplace NFTs:', error);
        res.status(500).json({ error: 'Failed to fetch marketplace NFTs.' });
    }
});

// Endpoint for preparing NFT mint (uploading to local 'uploads' and generating metadata URI)
app.post('/api/nfts/prepare-mint', upload.single('nftFile'), async (req, res) => {
    // --- START OF CORRECTIONS ---
    // 3. Authentication and Authorization (placeholder)
    // if (!req.user || !req.user.canMintNfts) { // Example: only users with minting rights
    //     if (req.file) { fs.unlink(req.file.path, (err) => { if (err) console.error('Error deleting uploaded NFT file due to auth:', err); }); }
    //     return res.status(403).json({ error: 'Access denied. You do not have permission to mint NFTs.' });
    // }
    // --- END OF CORRECTIONS ---

    if (!req.file) {
        return res.status(400).json({ error: 'No NFT file uploaded.' });
    }
    const { name, description, attributes, creatorWallet } = req.body;
    const frontendBaseUrl = process.env.FRONTEND_SERVER_BASE_URL || `http://localhost:${port}`;

    // Validate required fields and types
    if (!name || typeof name !== 'string' || name.trim().length === 0 ||
        !description || typeof description !== 'string' || description.trim().length === 0 ||
        !creatorWallet || typeof creatorWallet !== 'string' || creatorWallet.trim().length === 0) {
        fs.unlink(req.file.path, (err) => {
            if (err) console.error('Error deleting uploaded NFT file:', err);
        });
        return res.status(400).json({ error: 'Name, description, and creator wallet are required and cannot be empty for NFT preparation.' });
    }

    // --- START OF CORRECTIONS ---
    // 4. Validate creatorWallet format (Solana address)
    if (!isValidSolanaAddress(creatorWallet.trim())) {
        fs.unlink(req.file.path, (err) => { if (err) console.error('Error deleting uploaded NFT file due to invalid creator wallet:', err); });
        return res.status(400).json({ error: 'Invalid Solana creator wallet address.' });
    }
    // 4. NFT field length validation
    if (name.trim().length > 255 || description.trim().length > 1000) {
        fs.unlink(req.file.path, (err) => { if (err) console.error('Error deleting uploaded NFT file due to length validation:', err); });
        return res.status(400).json({ error: 'NFT name or description is too long.' });
    }
    // --- END OF CORRECTIONS ---

    const contentUrl = `${frontendBaseUrl}/uploads/${req.file.filename}`;

    const nftMetadata = {
        name: name.trim(),
        symbol: "AFOXNFT", // Example symbol
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
                share: 100 // Full share for the creator in this simulation
            }]
        },
        attributes: []
    };
    let metadataFilePath; // Declared here to be accessible in catch block
    try {
        if (attributes && typeof attributes === 'string') {
            const parsedAttributes = JSON.parse(attributes);
            if (Array.isArray(parsedAttributes)) {
                // --- START OF CORRECTIONS ---
                // 4. NFT attribute validation (length)
                const isValidAttributes = parsedAttributes.every(attr =>
                    typeof attr.trait_type === 'string' && attr.trait_type.trim().length > 0 && attr.trait_type.trim().length <= 100 &&
                    typeof attr.value === 'string' && attr.value.trim().length > 0 && attr.value.trim().length <= 255
                );
                if (!isValidAttributes) {
                    throw new Error('Invalid NFT attributes: trait_type and value must be non-empty strings of a certain length.');
                }
                // --- END OF CORRECTIONS ---
                nftMetadata.attributes = parsedAttributes;
            } else {
                console.warn("Parsed attributes are not an array, skipping.", parsedAttributes);
            }
        }
    } catch (e) {
        console.warn("Could not parse NFT attributes JSON or attributes are invalid:", e.message);
        // We don't return a 400 error if attributes are invalid, just ignore them (or you could return 400 if attributes are mandatory)
    }

    // Save metadata JSON to the 'uploads' folder
    // --- START OF CORRECTIONS ---
    // 5. Ensure metadata filename is unique
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const metadataFileName = `metadata-${uniqueSuffix}.json`;
    // --- END OF CORRECTIONS ---
    metadataFilePath = path.join(__dirname, 'uploads', metadataFileName);
    let metadataUri; // Declared here
    try {
        fs.writeFileSync(metadataFilePath, JSON.stringify(nftMetadata, null, 2));
        metadataUri = `${frontendBaseUrl}/uploads/${metadataFileName}`;
    } catch (writeErr) {
        console.error('Error writing NFT metadata file:', writeErr);
        fs.unlink(req.file.path, (err) => { // Clean up if metadata write fails
            if (err) console.error('Error deleting uploaded NFT file after metadata write error:', err);
        });
        return res.status(500).json({ error: 'Failed to save NFT metadata.' });
    }

    // Simulate a unique Solana mint address
    const simulatedMintAddress = `MINT_${Date.now()}_${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

    try {
        const newNft = new Nft({
            name: nftMetadata.name,
            description: nftMetadata.description,
            image: nftMetadata.image,
            mint: simulatedMintAddress,
            owner: nftMetadata.properties.creators[0].address,
            isListed: false,
            attributes: nftMetadata.attributes,
            history: [{ type: 'Mint', to: nftMetadata.properties.creators[0].address, timestamp: new Date() }] // Add minting history
        });
        await newNft.save();

        res.status(201).json({
            message: 'NFT assets prepared and simulated mint successful.',
            uri: metadataUri,
            mintAddress: simulatedMintAddress,
            imageUrl: contentUrl,
            signature: 'SIMULATED_TRANSACTION_SIGNATURE_FROM_BACKEND', // Placeholder signature
            nft: newNft // Return the full NFT object
        });
    } catch (error) {
        console.error('Error preparing/simulating NFT mint:', error);
        fs.unlink(req.file.path, (err) => { // Clean up if DB save failed
            if (err) console.error('Error deleting uploaded NFT file after DB error:', err);
        });
        if (metadataFilePath && fs.existsSync(metadataFilePath)) {
            fs.unlink(metadataFilePath, (err) => { // Clean up metadata file
                if (err) console.error('Error deleting NFT metadata file after DB error:', err);
            });
        }
        // --- START OF CORRECTIONS ---
        // 6. Handle mint uniqueness error
        if (error.code === 11000) { // MongoDB duplicate key error code
            return res.status(409).json({ error: 'Error: An NFT with this mint address already exists.' });
        }
        // --- END OF CORRECTIONS ---
        res.status(500).json({ error: 'Failed to prepare/simulate NFT mint.' });
    }
});

// Endpoint for listing NFT (simulation)
app.post('/api/nfts/list', async (req, res) => {
    // --- START OF CORRECTIONS ---
    // 3. Authentication and Authorization (placeholder)
    // if (!req.user || req.user.walletAddress !== req.body.sellerWallet) { // Example: only owner can list NFT
    //     return res.status(403).json({ error: 'Access denied. You can only list your own NFTs.' });
    // }
    // --- END OF CORRECTIONS ---

    const { mintAddress, price, duration, sellerWallet } = req.body;
    if (!mintAddress || typeof mintAddress !== 'string' || mintAddress.trim().length === 0 ||
        !price || isNaN(price) || price <= 0 ||
        !duration || isNaN(duration) || !Number.isInteger(duration) || duration <= 0 || // Check for integer
        !sellerWallet || typeof sellerWallet !== 'string' || sellerWallet.trim().length === 0) {
        return res.status(400).json({ error: 'Missing or invalid required fields for listing (mintAddress, price, duration, sellerWallet).' });
    }
    // --- START OF CORRECTIONS ---
    // 4. Validate sellerWallet format (Solana address)
    if (!isValidSolanaAddress(sellerWallet.trim())) {
        return res.status(400).json({ error: 'Invalid Solana seller wallet address.' });
    }
    // --- END OF CORRECTIONS ---

    try {
        // Find NFT by its mint address and confirm that the seller is the owner and it's not already listed
        const nft = await Nft.findOneAndUpdate(
            { mint: mintAddress.trim(), owner: sellerWallet.trim(), isListed: false },
            {
                $set: {
                    isListed: true,
                    price: price,
                    listedAt: new Date(),
                    listingDuration: duration,
                    listedBy: sellerWallet.trim(), // Track who listed it
                    // IN A REAL dApp: 'owner' might change to a marketplace escrow account here
                },
                $push: { history: { type: 'List', from: sellerWallet.trim(), timestamp: new Date() } } // Add to history
            },
            { new: true } // Return the updated document
        );

        if (!nft) {
            return res.status(404).json({ error: 'NFT not found, you are not its owner, or it is already listed for sale.' });
        }

        console.log(`NFT ${mintAddress} listed by ${sellerWallet} for ${price} SOL (simulation).`);
        res.status(200).json({ message: `NFT ${mintAddress} listed for sale for ${price} SOL (simulation).`, nft });
    } catch (error) {
        console.error('Error listing NFT:', error);
        res.status(500).json({ error: 'Failed to list NFT.' });
    }
});

// Endpoint for buying NFT (simulation)
app.post('/api/nfts/buy', async (req, res) => {
    // --- START OF CORRECTIONS ---
    // 3. Authentication and Authorization (placeholder)
    // if (!req.user || req.user.walletAddress !== req.body.buyerWallet) { // Example: only authorized buyer
    //     return res.status(403).json({ error: 'Access denied. You can only make purchases from your authorized wallet.' });
    // }
    // --- END OF CORRECTIONS ---

    const { mintAddress, buyerWallet, sellerWallet, price } = req.body;
    if (!mintAddress || typeof mintAddress !== 'string' || mintAddress.trim().length === 0 ||
        !buyerWallet || typeof buyerWallet !== 'string' || buyerWallet.trim().length === 0 ||
        !sellerWallet || typeof sellerWallet !== 'string' || sellerWallet.trim().length === 0 ||
        !price || isNaN(price) || price <= 0) {
        return res.status(400).json({ error: 'Missing or invalid required fields for NFT purchase.' });
    }
    if (buyerWallet.trim() === sellerWallet.trim()) { // Use trim for comparison
        return res.status(400).json({ error: 'Cannot buy your own NFT.' });
    }

    // --- START OF CORRECTIONS ---
    // 4. Validate Solana address format
    if (!isValidSolanaAddress(buyerWallet.trim()) || !isValidSolanaAddress(sellerWallet.trim()) || !isValidSolanaAddress(mintAddress.trim())) {
        return res.status(400).json({ error: 'Invalid Solana buyer, seller, or NFT mint wallet address.' });
    }
    // --- END OF CORRECTIONS ---

    try {
        // Find NFT, ensure it's listed for sale, and the owner matches the sellerWallet
        const nft = await Nft.findOneAndUpdate(
            { mint: mintAddress.trim(), owner: sellerWallet.trim(), isListed: true, price: price }, // Check that the price matches
            {
                $set: {
                    owner: buyerWallet.trim(),
                    isListed: false, // Delist after purchase
                    price: null,
                    listedAt: null,
                    listingDuration: null,
                    listedBy: null
                },
                $push: { history: { type: 'Sale', from: sellerWallet.trim(), to: buyerWallet.trim(), price: price, timestamp: new Date() } }
            },
            { new: true }
        );

        if (!nft) {
            return res.status(404).json({ error: 'NFT not found, not listed for sale, or seller/price mismatch.' });
        }

        // IN REAL PRODUCTION:
        // Here, the server should:
        // 1. Generate a Solana transaction to transfer SOL from buyer to seller.
        // 2. Generate a Solana transaction to transfer the NFT from (escrow or seller) to buyer.
        // 3. Serialize this transaction and send it to the client for buyer's signature.
        //
        // Example (pseudocode, now using imports if they are uncommented above):
        /*
        // --- START OF CORRECTIONS (If you uncommented Solana Web3/SPL-Token) ---
        // if (typeof Connection !== 'undefined') { // Check that Solana Web3 is imported
        //     const connection = new Connection(clusterApiUrl('devnet'), 'confirmed'); // Or 'mainnet-beta'
        //     const buyerPubKey = new PublicKey(buyerWallet);
        //     const sellerPubKey = new PublicKey(sellerWallet);
        //     const nftMintPubKey = new PublicKey(mintAddress);

        //     // Get or create Associated Token Account for the buyer
        //     const buyerTokenAccount = await getAssociatedTokenAddress(nftMintPubKey, buyerPubKey);
        //     let instructions = [];
        //     const buyerAtaInfo = await connection.getAccountInfo(buyerTokenAccount);
        //     if (!buyerAtaInfo) {
        //         instructions.push(createAssociatedTokenAccountInstruction(
        //             buyerPubKey, // Payer
        //             buyerTokenAccount,
        //             buyerPubKey, // Owner
        //             nftMintPubKey,
        //             TOKEN_PROGRAM_ID,
        //             SystemProgram.programId
        //         ));
        //     }

        //     // Get seller's Associated Token Account
        //     const sellerTokenAccounts = await connection.getParsedTokenAccountsByOwner(sellerPubKey, { mint: nftMintPubKey });
        //     if (!sellerTokenAccounts.value || sellerTokenAccounts.value.length === 0) {
        //         throw new Error('Seller does not own this NFT.');
        //     }
        //     const sellerTokenAccount = sellerTokenAccounts.value[0].pubkey;

        //     // Add NFT transfer instruction
        //     instructions.push(createTransferInstruction(
        //         sellerTokenAccount,
        //         buyerTokenAccount,
        //         sellerPubKey, // Authority (token owner) - THIS IS THE SELLER'S WALLET!
        //         1, // NFT quantity (always 1 for NFTs)
        //         [], // Signers
        //         TOKEN_PROGRAM_ID
        //     ));

        //     // Add SOL transfer instruction
        //     instructions.push(SystemProgram.transfer({
        //         fromPubkey: buyerPubKey,
        //         toPubkey: sellerPubKey,
        //         lamports: price * LAMPORTS_PER_SOL,
        //     }));

        //     const transaction = new Transaction().add(...instructions);
        //     transaction.feePayer = buyerPubKey; // Buyer pays fees
        //     transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

        //     const serializedTransaction = transaction.serialize({ requireAllSignatures: false }).toString('base64');

        //     return res.status(200).json({
        //         message: `NFT ${nft.name} simulated purchase. Transaction prepared for signing.`,
        //         nft,
        //         serializedTransaction: serializedTransaction
        //     });
        // }
        // --- END OF CORRECTIONS ---

        // For now, return a simulated transaction
        res.status(200).json({
            message: `NFT ${nft.name} successfully purchased (simulation).`,
            nft,
            // Placeholder for client to "send" the transaction
            serializedTransaction: 'SIMULATED_TRANSACTION_BASE64'
        });
        console.log(`NFT ${nft.name} transferred from ${sellerWallet} to ${buyerWallet} for ${price} SOL (simulation).`);

    } catch (error) {
        console.error('Error buying NFT:', error);
        res.status(500).json({ error: 'Failed to buy NFT.' });
    }
});

// Endpoint for NFT history
app.get('/api/nfts/:mint/history', async (req, res) => {
    const { mint } = req.params;
    if (!mint || typeof mint !== 'string' || mint.trim().length === 0) {
        return res.status(400).json({ error: 'NFT mint address is required.' });
    }

    // --- START OF CORRECTIONS ---
    // 4. Validate mint address format (Solana address)
    if (!isValidSolanaAddress(mint.trim())) {
        return res.status(400).json({ error: 'Invalid Solana NFT mint address.' });
    }
    // --- END OF CORRECTIONS ---

    try {
        const nft = await Nft.findOne({ mint: mint.trim() });
        if (!nft) {
            return res.status(404).json({ error: 'NFT not found.' });
        }
        res.json(nft.history); // Return history from the database
    } catch (error) {
        console.error('Error fetching NFT history:', error);
        res.status(500).json({ error: 'Failed to fetch NFT history.' });
    }
});

// --- Initial Data Seeding ---
// This function populates the MongoDB database with initial data if collections are empty.
async function seedInitialData() {
    // Get the base URL of the server for correct image URLs in seeding
    const serverBaseUrl = process.env.FRONTEND_SERVER_BASE_URL || `http://localhost:${port}`;

    try {
        // Check and seed Announcements
        const announceCount = await Announcement.countDocuments();
        if (announceCount === 0) {
            await Announcement.insertMany([
                { text: 'Welcome to the Aurum Fox Unified Portal!', date: new Date() },
                { text: 'AFOX Phase 1 completed! Stay tuned for updates.', date: new Date(Date.now() - 86400000 * 5) }
            ]);
            console.log('Initial announcements seeded.');
        }

        // Check and seed Photos
        const photoCount = await Photo.countDocuments();
        if (photoCount === 0) {
            // Ensure these files exist in your server's 'uploads' directory
            const placeholderPhoto1 = path.join(uploadDir, 'photo_placeholder.png');
            const placeholderPhoto2 = path.join(uploadDir, 'photo_placeholder_2.png');
            // Create empty files if missing (for seeding/testing purposes)
            if (!fs.existsSync(placeholderPhoto1)) {
                console.warn(`Photo placeholder file ${placeholderPhoto1} not found. Creating empty file. For full functionality, place a real image there.`);
                fs.writeFileSync(placeholderPhoto1, '');
            }
            if (!fs.existsSync(placeholderPhoto2)) {
                console.warn(`Photo placeholder file ${placeholderPhoto2} not found. Creating empty file. For full functionality, place a real image there.`);
                fs.writeFileSync(placeholderPhoto2, '');
            }

            await Photo.insertMany([
                { title: 'First Day at the Office', description: 'Starting our journey with Aurum Fox.', imageUrl: `${serverBaseUrl}/uploads/photo_placeholder.png`, date: new Date(Date.now() - 86400000 * 10), creatorWallet: "4cE7U21vM2y2g3X9Q1p7J0k8L6z5H4x3R2b1C0a9F8d7E6f" }, // Example real address
                { title: 'The Aurum Fox Team', description: 'Our dedicated team.', imageUrl: `${serverBaseUrl}/uploads/photo_placeholder_2.png`, date: new Date(Date.now() - 86400000 * 15), creatorWallet: "A2B4C6D8E0F2G4H6I8J0K2L4M6N8O0P2Q4R6S8T0U2V4W6X" } // Example real address
            ]);
            console.log('Initial photos seeded.');
        }

        // Check and seed Posts
        const postCount = await Post.countDocuments();
        if (postCount === 0) {
            await Post.insertMany([
                { title: "Launch Day!", content: "Today marks the official launch of the Aurum Fox Unified Portal. We are excited to bring you a seamless Web3 and multimedia experience!", date: new Date(Date.now() - 86400000 * 2), authorWallet: "GbT5Y2j7L1m9N0o3P5q7R9s1U3v5W7x9Y1z3A5b7C9d1E3f" }, // Example real address
                { title: "New Features Coming Soon", content: "Stay tuned for exciting new features coming soon, including decentralized storage options for your media and enhanced NFT marketplace functionalities.", date: new Date(Date.now() - 86400000 * 25), authorWallet: "K9L1M3N5O7P9Q1R3S5T7U9V1W3X5Y7Z9A1B3C5D7E9F" } // Example real address
            ]);
            console.log('Initial posts seeded.');
        }

        // Check and seed NFTs
        const nftCount = await Nft.countDocuments();
        if (nftCount === 0) {
            // Ensure these files exist in your server's 'uploads' directory
            const nftMarketplace1 = path.join(uploadDir, 'nft_marketplace_1.png');
            const nftMarketplace2 = path.join(uploadDir, 'nft_marketplace_2.png');
            const nftUserOwned = path.join(uploadDir, 'nft_user_owned.png');
            if (!fs.existsSync(nftMarketplace1)) {
                console.warn(`NFT placeholder file ${nftMarketplace1} not found. Creating empty file.`);
                fs.writeFileSync(nftMarketplace1, '');
            }
            if (!fs.existsSync(nftMarketplace2)) {
                console.warn(`NFT placeholder file ${nftMarketplace2} not found. Creating empty file.`);
                fs.writeFileSync(nftMarketplace2, '');
            }
            if (!fs.existsSync(nftUserOwned)) {
                console.warn(`NFT placeholder file ${nftUserOwned} not found. Creating empty file.`);
                fs.writeFileSync(nftUserOwned, '');
            }

            // --- START OF CORRECTIONS ---
            // 7. Example real Solana addresses for seeding
            const marketplaceOwnerWallet = process.env.MARKETPLACE_OWNER_WALLET_ADDRESS || "2uE8xK2rN1p3Q5S7U9W1Y3a5b7c9d1e3f5g7h9i1j3k5l7m9n1o3p5q7r9s1t3u5v";
            const anotherSellerWallet = "J7K9L1M3N5O7P9Q1R3S5T7U9V1W3X5Y7Z9A1B3C5D7E9F0G";
            const simulatedUserWallet = "A1B3C5D7E9F1G3H5I7J9K1L3M5N7O9P1Q3R5S7T9U1V3W5X";
            // --- END OF CORRECTIONS ---

            await Nft.insertMany([
                {
                    name: "Rare Fox", description: "A very rare NFT featuring a golden fox.", image: `${serverBaseUrl}/uploads/nft_marketplace_1.png`, mint: "9B5sP4q1R3S5T7U9V1W3X5Y7Z9A1B3C5D7E9F1G3H5I7J9K", owner: marketplaceOwnerWallet, isListed: true, price: 0.8, listedAt: new Date(Date.now() - 86400000), listingDuration: 30, listedBy: marketplaceOwnerWallet, attributes: [{ trait_type: "Rarity", value: "Rare" }],
                    history: [{ type: 'Mint', to: marketplaceOwnerWallet, timestamp: new Date(Date.now() - 86400000 * 3) }, { type: 'List', from: marketplaceOwnerWallet, timestamp: new Date(Date.now() - 86400000) }]
                },
                {
                    name: "Cunning Fox", description: "A cunning fox, ready to pounce.", image: `${serverBaseUrl}/uploads/nft_marketplace_2.png`, mint: "CcD1E3F5G7H9I1J3K5L7M9N1O3P5Q7R9S1T3U5V7W9X1Y3Z", owner: anotherSellerWallet, isListed: true, price: 0.3, listedAt: new Date(Date.now() - 86400000 * 2), listingDuration: 60, listedBy: anotherSellerWallet, attributes: [{ trait_type: "Expression", value: "Wink" }],
                    history: [{ type: 'Mint', to: anotherSellerWallet, timestamp: new Date(Date.now() - 86400000 * 4) }, { type: 'List', from: anotherSellerWallet, timestamp: new Date(Date.now() - 86400000 * 2) }]
                },
                {
                    name: "User-Owned Fox", description: "An NFT owned by a user, not yet listed.", image: `${serverBaseUrl}/uploads/nft_user_owned.png`, mint: "D8E0F2G4H6I8J0K2L4M6N8O0P2Q4R6S8T0U2V4W6X8Y0Z2", owner: simulatedUserWallet, isListed: false, price: null, attributes: [{ trait_type: "Color", value: "Blue" }],
                    history: [{ type: 'Mint', to: simulatedUserWallet, timestamp: new Date(Date.now() - 86400000 * 5) }]
                }
            ]);
            console.log('Initial NFTs seeded.');
        }

        // Check and seed Games
        const gameCount = await Game.countDocuments();
        if (gameCount === 0) {
            await Game.insertMany([
                { title: "Solana Chess", description: "Play chess on Solana!", url: "https://example.com/solana-chess", developer: "BlockchainDevs" },
                { title: "Degen Racer", description: "A fast-paced racing game.", url: "https://example.com/degen-racer", developer: "GameFi Studios" }
            ]);
            console.log('Initial games seeded.');
        }

        // Check and seed Ads
        const adCount = await Ad.countDocuments();
        if (adCount === 0) {
            const adPlaceholder = path.join(uploadDir, 'ad_placeholder.png');
            if (!fs.existsSync(adPlaceholder)) {
                console.warn(`Ad image placeholder file ${adPlaceholder} not found. Creating empty file.`);
                fs.writeFileSync(adPlaceholder, '');
            }

            await Ad.insertMany([
                { title: "Buy My Awesome Project!", content: "Check out our new dApp, it's great!", imageUrl: `${serverBaseUrl}/uploads/ad_placeholder.png`, link: "https://myawesomedapp.com", advertiser: "ProjectX" }
            ]);
            console.log('Initial ads seeded.');
        }

    } catch (error) {
        console.error('Error seeding initial data:', error);
    }
}

// --- Server Start ---
app.listen(port, () => {
    console.log(`Backend server running at http://localhost:${port}`);
    console.log(`For production, ensure MONGODB_URI, FRONTEND_URL, and MARKETPLACE_OWNER_WALLET_ADDRESS are set in your environment variables or .env file.`);
    console.log(`Ensure the 'uploads' directory exists and contains placeholder images (e.g., photo_placeholder.png, nft_marketplace_1.png, ad_placeholder.png) for seeding.`);
    console.log(`Your frontend should be configured to fetch data from http://localhost:${port} (or your production URL).`);
    console.log(`CORS is configured for allowed origins: ${allowedOrigins.join(', ')}.`);
    seedInitialData(); // Call the data seeding function when the server starts
});
