// =========================================================================
// server.js (Backend Code - to be placed in your main project directory)
// =========================================================================

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 3000;

// --- Middlewares ---
// Configure CORS to allow requests from your frontend's origin
app.use(cors({
    origin: 'http://127.0.0.1:5500', // IMPORTANT: Replace with the actual URL your frontend runs on (e.g., Live Server URL)
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // Serve uploaded files statically

// --- Multer setup for file uploads ---
const uploadDir = 'uploads/';
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});
const upload = multer({ storage: storage });

// --- Simple In-Memory "Database" (for DEMO only!) ---
// *** REPLACE THIS WITH A REAL PERSISTENT DATABASE (MongoDB, PostgreSQL, etc.) IN PRODUCTION ***
const db = {
    announcements: [
        { text: "Welcome to Aurum Fox Unified Portal!", date: new Date().toISOString() },
        { text: "AFOX Phase 1 completed!", date: new Date(Date.now() - 86400000).toISOString() }
    ],
    nfts: [], // Stores user-minted NFTs in memory for simulation (those *owned* by the user)
    games: [
        { title: "Solana Chess", description: "Play chess on Solana!", url: "https://example.com/solana-chess" },
        { title: "Degen Racer", description: "Fast-paced racing game.", url: "https://example.com/degen-racer" }
    ],
    ads: [
        { title: "Buy My Awesome Project!", content: "Check out our new dApp, it's great!", imageUrl: "http://localhost:3000/uploads/ad_placeholder.png", link: "https://myawesomedapp.com" }
    ],
    photos: [
        { title: "First Day in Office", description: "Getting started with Aurum Fox.", imageUrl: "http://localhost:3000/uploads/photo_placeholder.png", date: new Date().toISOString(), creatorWallet: "SIMULATED_WALLET_A" }
    ],
    posts: [
        { title: "Launch Day!", content: "Today marks the official launch of the Aurum Fox Unified Portal. We're excited to bring you a seamless Web3 and multimedia experience!", date: new Date(Date.now() - 2 * 86400000).toISOString(), authorWallet: "SIMULATED_AUTHOR_WALLET_1" },
        { title: "New Features Coming Soon", content: "Stay tuned for exciting new features including decentralized storage options for your media and advanced NFT marketplace functionalities.", date: new Date(Date.now() - 25 * 86400000).toISOString(), authorWallet: "SIMULATED_AUTHOR_WALLET_2" }
    ],
    marketplaceNFTs: [ // NFTs pre-listed on the marketplace
        { mint: "SOME_MARKETPLACE_NFT_MINT_1", name: "Rare Fox", description: "A very rare golden fox NFT.", image: "http://localhost:3000/uploads/nft_marketplace_1.png", attributes: [{trait_type: "Rarity", value: "Rare"}], price: 0.8, owner: "MARKETPLACE_OWNER_WALLET_ADDRESS_HERE", listedBy: "MARKETPLACE_OWNER_WALLET_ADDRESS_HERE", listingDuration: 30, listedDate: new Date().toISOString() },
        { mint: "SOME_MARKETPLACE_NFT_MINT_2", name: "Cunning Fox", description: "A cunning fox ready to pounce.", image: "http://localhost:3000/uploads/nft_marketplace_2.png", attributes: [{trait_type: "Expression", value: "Wink"}], price: 0.3, owner: "ANOTHER_SELLER_WALLET_ADDRESS", listedBy: "ANOTHER_SELLER_WALLET_ADDRESS", listingDuration: 60, listedDate: new Date().toISOString() }
    ],
    // In a real application, this would be a real wallet address or a program ID
    marketplaceOwnerWallet: "MARKETPLACE_OWNER_WALLET_ADDRESS_HERE"
};

// --- API Endpoints ---

// Serve the static frontend files (e.g., your index.html and script.js)
app.use(express.static(path.join(__dirname, 'public')));

// Announcements
app.get('/api/announcements', (req, res) => {
    res.json(db.announcements);
});

app.post('/api/announcements', (req, res) => {
    // In a real application: ADMIN AUTHENTICATION is required here
    const { text, date } = req.body;
    if (text) {
        db.announcements.push({ text, date: date || new Date().toISOString() });
        res.status(201).json({ message: 'Announcement added' });
    } else {
        res.status(400).json({ error: 'Text is required' });
    }
});

// Games
app.get('/api/games', (req, res) => {
    res.json(db.games);
});
app.post('/api/games', upload.single('gameFile'), (req, res) => {
    // Simplified: in a real app, handle actual game file upload and saving logic
    const { title, description } = req.body;
    if (title && description) {
        const gameUrl = req.file ? `http://localhost:${port}/uploads/${req.file.filename}` : "https://example.com/placeholder-game.html";
        db.games.push({ title, description, url: gameUrl });
        res.status(201).json({ message: 'Game added', game: { title, description, url: gameUrl } });
    } else {
        res.status(400).json({ error: 'Title and description are required' });
    }
});

// Ads
app.get('/api/ads', (req, res) => {
    res.json(db.ads);
});
app.post('/api/ads', upload.single('adCreative'), (req, res) => {
    // Simplified: in a real app, handle ad creative upload and saving logic
    const { title, content, link } = req.body;
    if (title && content) {
        const imageUrl = req.file ? `http://localhost:${port}/uploads/${req.file.filename}` : null;
        db.ads.push({ title, content, imageUrl, link });
        res.status(201).json({ message: 'Ad posted', ad: { title, content, imageUrl, link } });
    } else {
        res.status(400).json({ error: 'Title and content are required' });
    }
});

// Photos
app.get('/api/photos', (req, res) => {
    res.json(db.photos);
});
app.post('/api/photos/upload', upload.single('photo'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No photo file uploaded.' });
    }
    const { title, description, creatorWallet } = req.body;
    if (!title) {
        // Clean up the uploaded file if title is missing
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: 'Photo title is required.' });
    }
    const imageUrl = `http://localhost:${port}/uploads/${req.file.filename}`;
    db.photos.push({ title, description: description || 'No description', imageUrl, date: new Date().toISOString(), creatorWallet: creatorWallet || 'UNKNOWN_WALLET' });
    res.status(201).json({ message: 'Photo uploaded successfully.', photo: { title, imageUrl } });
});

// Posts
app.get('/api/posts', (req, res) => {
    res.json(db.posts);
});
app.post('/api/posts', (req, res) => {
    const { title, content, date, authorWallet } = req.body;
    if (title && content) {
        db.posts.push({ title, content, date: date || new Date().toISOString(), authorWallet: authorWallet || 'UNKNOWN_WALLET' });
        res.status(201).json({ message: 'Post published', post: { title, content } });
    } else {
        res.status(400).json({ error: 'Title and content are required' });
    }
});

// NFTs (Simplified/Simulated)
app.get('/api/nfts/marketplace', (req, res) => {
    // Combines NFTs "owned" by users (db.nfts) with pre-listed marketplace NFTs (db.marketplaceNFTs)
    // In a real app, you'd fetch from blockchain or a marketplace API.
    const allKnownNfts = [...db.marketplaceNFTs.map(nft => ({...nft, isListed: true})), ...db.nfts.map(nft => ({...nft, isListed: false}))];
    res.json({ nfts: allKnownNfts, owner: db.marketplaceOwnerWallet });
});


// Endpoint for preparing NFT mint (uploading to local 'uploads' and generating metadata URI)
app.post('/api/nfts/prepare-mint', upload.single('nftFile'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No NFT file uploaded.' });
    }
    const { name, description, attributes, creatorWallet } = req.body;

    const contentUrl = `http://localhost:${port}/uploads/${req.file.filename}`; // Simulated content URL

    const nftMetadata = {
        name: name,
        symbol: "AFOXNFT",
        description: description,
        image: contentUrl,
        properties: {
            files: [{
                uri: contentUrl,
                type: req.file.mimetype,
            }],
            category: req.file.mimetype.startsWith('image') ? 'image' : 'video',
            creators: [{
                address: creatorWallet,
                share: 100
            }]
        },
        attributes: []
    };
    try {
        if (attributes) {
            nftMetadata.attributes = JSON.parse(attributes);
        }
    } catch (e) {
        console.warn("Could not parse attributes JSON:", e);
    }

    const metadataFileName = `${req.file.filename.replace(/\..+$/, '')}.json`;
    const metadataFilePath = path.join(__dirname, 'uploads', metadataFileName);
    fs.writeFileSync(metadataFilePath, JSON.stringify(nftMetadata, null, 2));
    const metadataUri = `http://localhost:${port}/uploads/${metadataFileName}`; // Simulated metadata URL

    const simulatedMintAddress = `MINT_${Date.now()}_${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

    // Add the newly "minted" NFT to the user's in-memory collection
    db.nfts.push({
        mint: simulatedMintAddress,
        name: name,
        description: description,
        image: contentUrl,
        attributes: nftMetadata.attributes,
        owner: creatorWallet
    });

    res.status(200).json({
        message: 'NFT assets prepared and simulated mint successful.',
        uri: metadataUri,
        mintAddress: simulatedMintAddress,
        imageUrl: contentUrl,
        signature: 'SIMULATED_TRANSACTION_SIGNATURE_FROM_BACKEND'
    });
});

// Endpoint for listing NFT (simulation)
app.post('/api/nfts/list', (req, res) => {
    const { mintAddress, price, duration, sellerWallet } = req.body;
    if (!mintAddress || !price || !sellerWallet) {
        return res.status(400).json({ error: 'Missing required fields for listing.' });
    }

    // Find the NFT in the user's collection (db.nfts)
    const listedNftIndex = db.nfts.findIndex(nft => nft.mint === mintAddress && nft.owner === sellerWallet);
    let listedNftData;

    if (listedNftIndex !== -1) {
        listedNftData = db.nfts[listedNftIndex];
        db.nfts.splice(listedNftIndex, 1); // Remove from user's collection in memory
    } else {
        // If not found in user's minted NFTs, check if it's already in marketplace (meaning user re-listed it)
        listedNftData = db.marketplaceNFTs.find(nft => nft.mint === mintAddress && nft.listedBy === sellerWallet);
        if (!listedNftData) {
            // This case should ideally not happen if NFTs are always tracked, but as a fallback:
            console.warn(`NFT ${mintAddress} not found in user's or existing marketplace listings. Creating generic.`);
            listedNftData = {
                mint: mintAddress,
                name: "Simulated Listed NFT (Unknown Origin)",
                description: "This NFT was listed through the portal simulation, but its original source was not tracked.",
                image: "https://via.placeholder.com/180x180?text=Listed+NFT",
                attributes: [],
                owner: sellerWallet
            };
        }
    }

    // Add or update the listing in the marketplace collection
    const existingListingIndex = db.marketplaceNFTs.findIndex(nft => nft.mint === mintAddress);
    if (existingListingIndex !== -1) {
        // Update existing listing
        db.marketplaceNFTs[existingListingIndex] = {
            ...db.marketplaceNFTs[existingListingIndex],
            price: price,
            listingDuration: duration,
            listedDate: new Date().toISOString(),
            listedBy: sellerWallet, // The original seller
            owner: db.marketplaceOwnerWallet // NFT is now "owned" by marketplace program in simulation
        };
    } else {
        // Add new listing
        db.marketplaceNFTs.push({
            ...listedNftData,
            price: price,
            listedBy: sellerWallet,
            listingDuration: duration,
            listedDate: new Date().toISOString(),
            owner: db.marketplaceOwnerWallet // NFT is now "owned" by marketplace program in simulation
        });
    }

    res.status(200).json({ message: `NFT ${mintAddress} listed for sale for ${price} SOL (simulated).` });
});


// --- Server Start ---
app.listen(port, () => {
    console.log(`Backend server listening at http://localhost:${port}`);
    console.log(`Make sure 'uploads' directory exists and contains placeholder images.`);
    console.log(`Your frontend should be served from http://127.0.0.1:5500 (or your actual frontend URL).`);
});
