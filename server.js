const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const fs = require('fs'); // Added for file system operations, like creating 'uploads' directory
const mongoose = require('mongoose');

const app = express();
const port = 3000;

// --- Middlewares ---
// Configure CORS to allow requests from your frontend's origin.
// IMPORTANT: Replace 'http://127.0.0.1:5500' with your actual frontend URL (e.g., Live Server URL or deployed URL).
app.use(cors({
    origin: 'http://127.0.0.1:5500',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(bodyParser.json()); // Parses incoming request bodies as JSON
app.use(bodyParser.urlencoded({ extended: true })); // Parses incoming request bodies from URL-encoded forms

// --- Multer Setup for File Uploads ---
const uploadDir = 'uploads/';
// Ensure the 'uploads' directory exists. Create it if it doesn't.
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir); // Files will be saved in the 'uploads/' folder
    },
    filename: function (req, file, cb) {
        // Creates a unique filename by prepending a timestamp to the original filename.
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});
const upload = multer({ storage: storage }); // Initializes Multer with the defined storage

// --- MongoDB Connection ---
const MONGODB_URI = 'mongodb://localhost:27017/solana_dapp_db'; // IMPORTANT: Replace with your actual MongoDB connection string!
mongoose.connect(MONGODB_URI)
    .then(() => console.log('MongoDB connected successfully!'))
    .catch(err => console.error('MongoDB connection error:', err));

// --- Mongoose Schemas and Models ---

// Schema for Announcements
const announcementSchema = new mongoose.Schema({
    text: { type: String, required: true },
    date: { type: Date, default: Date.now },
});
const Announcement = mongoose.model('Announcement', announcementSchema);

// Schema for Photos (User-uploaded images)
const photoSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: String,
    imageUrl: { type: String, required: true },
    date: { type: Date, default: Date.now },
    creatorWallet: String,
});
const Photo = mongoose.model('Photo', photoSchema);

// Schema for Posts (Blog posts, community updates)
const postSchema = new mongoose.Schema({
    title: { type: String, required: true },
    content: { type: String, required: true },
    date: { type: Date, default: Date.now },
    authorWallet: String,
});
const Post = mongoose.model('Post', postSchema);

// Schema for NFTs (Non-Fungible Tokens)
const nftSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: String,
    image: { type: String, required: true }, // URL to the NFT image
    mint: { type: String, required: true, unique: true }, // Unique Solana mint address
    owner: { type: String, required: true }, // Current owner's wallet address
    isListed: { type: Boolean, default: false }, // True if listed for sale
    price: Number, // Price in SOL if listed
    listedAt: Date, // Timestamp when listed
    listingDuration: Number, // Duration of listing in days
    listedBy: String, // Wallet address of the user who listed the NFT (could be different from owner if marketplace escrow)
    attributes: [{ trait_type: String, value: String }], // Array of NFT attributes
});
const Nft = mongoose.model('Nft', nftSchema);

// Schema for Games
const gameSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: String,
    url: String, // URL to access the game
    developer: String,
});
const Game = mongoose.model('Game', gameSchema);

// Schema for Advertisements
const adSchema = new mongoose.Schema({
    title: { type: String, required: true },
    content: { type: String, required: true },
    imageUrl: String,
    link: String,
    advertiser: String,
});
const Ad = mongoose.model('Ad', adSchema);


// --- API Endpoints ---

// Serve static files from the 'uploads' directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve the static frontend files (assuming they are in a 'public' directory if not using a separate frontend server)
// If your frontend is served by Live Server or another separate development server, you might not need this.
// app.use(express.static(path.join(__dirname, 'public')));


// Announcements API
app.get('/api/announcements', async (req, res) => {
    try {
        const announcements = await Announcement.find().sort({ date: -1 });
        res.json(announcements);
    } catch (error) {
        console.error('Error fetching announcements:', error);
        res.status(500).json({ error: 'Failed to fetch announcements' });
    }
});

app.post('/api/announcements', async (req, res) => {
    // Implement robust authentication/authorization for admin access in production.
    const { text } = req.body;
    if (!text) {
        return res.status(400).json({ error: 'Announcement text is required.' });
    }
    try {
        const newAnnouncement = new Announcement({ text });
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
    const { title, description, developer } = req.body;
    if (!title || !description || !developer) {
        if (req.file) fs.unlinkSync(req.file.path); // Clean up uploaded file if required fields are missing
        return res.status(400).json({ error: 'Title, description, and developer are required to add a game.' });
    }
    const gameUrl = req.file ? `http://localhost:${port}/uploads/${req.file.filename}` : "https://example.com/placeholder-game.html"; // Placeholder if no file
    try {
        const newGame = new Game({ title, description, url: gameUrl, developer });
        await newGame.save();
        res.status(201).json({ message: 'Game added successfully', game: newGame });
    } catch (error) {
        console.error('Error adding game:', error);
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
    const { title, content, link, advertiser } = req.body;
    if (!title || !content || !advertiser) {
        if (req.file) fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: 'Title, content, and advertiser are required to post an ad.' });
    }
    const imageUrl = req.file ? `http://localhost:${port}/uploads/${req.file.filename}` : null;
    try {
        const newAd = new Ad({ title, content, imageUrl, link, advertiser });
        await newAd.save();
        res.status(201).json({ message: 'Ad posted successfully', ad: newAd });
    } catch (error) {
        console.error('Error posting ad:', error);
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

app.post('/api/photos/upload', upload.single('photo'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No photo file uploaded.' });
    }
    const { title, description, creatorWallet } = req.body;
    if (!title || !creatorWallet) {
        fs.unlinkSync(req.file.path); // Clean up the uploaded file if title/wallet is missing
        return res.status(400).json({ error: 'Photo title and creator wallet are required.' });
    }
    const imageUrl = `http://localhost:${port}/uploads/${req.file.filename}`;
    try {
        const newPhoto = new Photo({ title, description, imageUrl, creatorWallet });
        await newPhoto.save();
        res.status(201).json({ message: 'Photo uploaded successfully.', photo: newPhoto });
    } catch (error) {
        console.error('Error uploading photo:', error);
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
    const { title, content, authorWallet } = req.body;
    if (!title || !content || !authorWallet) {
        return res.status(400).json({ error: 'Title, content, and author wallet are required.' });
    }
    try {
        const newPost = new Post({ title, content, authorWallet });
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
        // Fetch all NFTs from the database.
        // In a real dApp, you'd distinguish between user-owned NFTs and marketplace listings,
        // potentially pulling some data directly from a blockchain indexer or marketplace program state.
        const nfts = await Nft.find();
        res.json({ nfts: nfts, marketplaceOwnerWallet: "MARKETPLACE_OWNER_WALLET_ADDRESS_HERE" }); // Placeholder marketplace owner
    } catch (error) {
        console.error('Error fetching marketplace NFTs:', error);
        res.status(500).json({ error: 'Failed to fetch marketplace NFTs.' });
    }
});

// Endpoint for preparing NFT mint (uploading to local 'uploads' and generating metadata URI)
app.post('/api/nfts/prepare-mint', upload.single('nftFile'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No NFT file uploaded.' });
    }
    const { name, description, attributes, creatorWallet } = req.body;

    // Validate required fields
    if (!name || !description || !creatorWallet) {
        fs.unlinkSync(req.file.path); // Clean up uploaded file
        return res.status(400).json({ error: 'Name, description, and creator wallet are required for NFT preparation.' });
    }

    const contentUrl = `http://localhost:${port}/uploads/${req.file.filename}`; // Simulated content URL

    const nftMetadata = {
        name: name,
        symbol: "AFOXNFT", // Example symbol
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
                share: 100 // Full share for the creator in this simulation
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

    // Save metadata JSON to the 'uploads' folder
    const metadataFileName = `${req.file.filename.replace(/\..+$/, '')}.json`;
    const metadataFilePath = path.join(__dirname, 'uploads', metadataFileName);
    fs.writeFileSync(metadataFilePath, JSON.stringify(nftMetadata, null, 2));
    const metadataUri = `http://localhost:${port}/uploads/${metadataFileName}`; // Simulated metadata URL

    // Simulate a unique Solana mint address
    const simulatedMintAddress = `MINT_${Date.now()}_${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

    try {
        const newNft = new Nft({
            name: name,
            description: description,
            image: contentUrl,
            mint: simulatedMintAddress,
            owner: creatorWallet,
            isListed: false,
            attributes: nftMetadata.attributes,
        });
        await newNft.save(); // Save the NFT to the database

        res.status(200).json({
            message: 'NFT assets prepared and simulated mint successful.',
            uri: metadataUri,
            mintAddress: simulatedMintAddress,
            imageUrl: contentUrl,
            signature: 'SIMULATED_TRANSACTION_SIGNATURE_FROM_BACKEND', // Placeholder signature
            nft: newNft // Return the full NFT object
        });
    } catch (error) {
        console.error('Error preparing/simulating NFT mint:', error);
        res.status(500).json({ error: 'Failed to prepare/simulate NFT mint.' });
    }
});

// Endpoint for listing NFT (simulation)
app.post('/api/nfts/list', async (req, res) => {
    const { mintAddress, price, duration, sellerWallet } = req.body;
    if (!mintAddress || !price || !sellerWallet || isNaN(price) || price <= 0 || isNaN(duration) || duration <= 0) {
        return res.status(400).json({ error: 'Missing or invalid required fields for listing (mintAddress, price, duration, sellerWallet).' });
    }

    try {
        // Find the NFT by its mint address and confirm the seller is the owner and it's not already listed
        const nft = await Nft.findOneAndUpdate(
            { mint: mintAddress, owner: sellerWallet, isListed: false },
            {
                $set: {
                    isListed: true,
                    price: price,
                    listedAt: new Date(),
                    listingDuration: duration,
                    listedBy: sellerWallet, // Track who listed it
                    // In a real dApp, the `owner` might change to a marketplace escrow account here
                }
            },
            { new: true } // Return the updated document
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


// --- Initial Data Seeding ---
// This function populates the MongoDB database with initial data if collections are empty.
async function seedInitialData() {
    try {
        // Check and seed Announcements
        const existingAnnouncements = await Announcement.countDocuments();
        if (existingAnnouncements === 0) {
            await Announcement.insertMany([
                { text: 'Welcome to Aurum Fox Unified Portal!', date: new Date() },
                { text: 'AFOX Phase 1 completed!', date: new Date(Date.now() - 86400000) }
            ]);
            console.log('Initial announcements seeded.');
        }

        // Check and seed Photos
        const existingPhotos = await Photo.countDocuments();
        if (existingPhotos === 0) {
            // Ensure placeholder images exist in 'uploads' directory for these to work
            await Photo.insertMany([
                { title: 'First Day in Office', description: 'Getting started with Aurum Fox.', imageUrl: `http://localhost:${port}/uploads/photo_placeholder.png`, date: new Date(), creatorWallet: "SIMULATED_WALLET_A" },
                { title: 'Aurum Fox Team', description: 'Our dedicated team.', imageUrl: `http://localhost:${port}/uploads/photo_placeholder_2.png`, date: new Date(Date.now() - 172800000), creatorWallet: "SIMULATED_WALLET_B" }
            ]);
            console.log('Initial photos seeded.');
        }

        // Check and seed Posts
        const existingPosts = await Post.countDocuments();
        if (existingPosts === 0) {
            await Post.insertMany([
                { title: "Launch Day!", content: "Today marks the official launch of the Aurum Fox Unified Portal. We're excited to bring you a seamless Web3 and multimedia experience!", date: new Date(Date.now() - 2 * 86400000), authorWallet: "SIMULATED_AUTHOR_WALLET_1" },
                { title: "New Features Coming Soon", content: "Stay tuned for exciting new features including decentralized storage options for your media and advanced NFT marketplace functionalities.", date: new Date(Date.now() - 25 * 86400000), authorWallet: "SIMULATED_AUTHOR_WALLET_2" }
            ]);
            console.log('Initial posts seeded.');
        }

        // Check and seed NFTs
        const existingNfts = await Nft.countDocuments();
        if (existingNfts === 0) {
            // These would represent NFTs already existing or listed on the marketplace
            await Nft.insertMany([
                { name: "Rare Fox", description: "A very rare golden fox NFT.", image: `http://localhost:${port}/uploads/nft_marketplace_1.png`, mint: "SOME_MARKETPLACE_NFT_MINT_1", owner: "MARKETPLACE_OWNER_WALLET_ADDRESS_HERE", isListed: true, price: 0.8, listedAt: new Date(), listingDuration: 30, listedBy: "MARKETPLACE_OWNER_WALLET_ADDRESS_HERE", attributes: [{trait_type: "Rarity", value: "Rare"}] },
                { name: "Cunning Fox", description: "A cunning fox ready to pounce.", image: `http://localhost:${port}/uploads/nft_marketplace_2.png`, mint: "SOME_MARKETPLACE_NFT_MINT_2", owner: "ANOTHER_SELLER_WALLET_ADDRESS", isListed: true, price: 0.3, listedAt: new Date(), listingDuration: 60, listedBy: "ANOTHER_SELLER_WALLET_ADDRESS", attributes: [{trait_type: "Expression", value: "Wink"}] },
                { name: "User Owned Fox", description: "An NFT owned by a user, not yet listed.", image: `http://localhost:${port}/uploads/nft_user_owned.png`, mint: "USER_OWNED_NFT_MINT_1", owner: "SIMULATED_USER_WALLET_ADDRESS", isListed: false, price: null, attributes: [{trait_type: "Color", value: "Blue"}] }
            ]);
            console.log('Initial NFTs seeded.');
        }

        // Check and seed Games
        const existingGames = await Game.countDocuments();
        if (existingGames === 0) {
            await Game.insertMany([
                { title: "Solana Chess", description: "Play chess on Solana!", url: "https://example.com/solana-chess", developer: "BlockchainDevs" },
                { title: "Degen Racer", description: "Fast-paced racing game.", url: "https://example.com/degen-racer", developer: "GameFi Studios" }
            ]);
            console.log('Initial games seeded.');
        }

        // Check and seed Ads
        const existingAds = await Ad.countDocuments();
        if (existingAds === 0) {
            // Ensure ad_placeholder.png exists in 'uploads' directory
            await Ad.insertMany([
                { title: "Buy My Awesome Project!", content: "Check out our new dApp, it's great!", imageUrl: `http://localhost:${port}/uploads/ad_placeholder.png`, link: "https://myawesomedapp.com", advertiser: "ProjectX" }
            ]);
            console.log('Initial ads seeded.');
        }

    } catch (error) {
        console.error('Error seeding initial data:', error);
    }
}

// --- Server Start ---
app.listen(port, () => {
    console.log(`Backend server listening at http://localhost:${port}`);
    console.log(`Make sure 'uploads' directory exists and contains placeholder images (e.g., photo_placeholder.png, nft_marketplace_1.png, ad_placeholder.png).`);
    console.log(`Your frontend should be configured to fetch from http://localhost:${port}`);
    console.log(`CORS is set to allow requests from http://127.0.0.1:5500. Adjust 'origin' if your frontend URL is different.`);
    seedInitialData(); // Calls the data seeding function when the server starts
});
