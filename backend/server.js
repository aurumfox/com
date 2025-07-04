const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');

// Import Solana Web3 for server-side blockchain interactions
// IMPORTANT: For real blockchain operations on the server (e.g., creating NFT purchase transactions),
// you'll need to initialize a connection, a Keypair for fees/marketplace, etc.
// const SolanaWeb3 = require('@solana/web3.js'); // Uncomment if you'll use on the server
// const SolanaToken = require('@solana/spl-token'); // Uncomment if you'll use on the server
// const bs58 = require('bs58'); // For working with base58 keys, if needed

const app = express();
const port = 3000;

// --- Middlewares ---
// Configure CORS
// IMPORTANT: In production, replace 'http://127.0.0.1:5500' with your actual frontend's domain.
// If your frontend will be at https://www.yourdomain.com, the origin should be the same.
// For multiple domains, you can use an array: ['http://localhost:3000', 'https://www.yourdomain.com']
// Or dynamic checking:
/*
const allowedOrigins = ['http://127.0.0.1:5500', 'http://localhost:3000', 'http://localhost:8080']; // Add all your frontend domains
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (e.g., from Postman or file://)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
*/
// For simplicity, we'll keep your current cors config for now, but remember for production.
app.use(cors({
    origin: 'http://127.0.0.1:5500', // MUST CHANGE IN PRODUCTION
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
            cb(new Error('Invalid file type.'), false);
        }
    }
});

// --- MongoDB Connection ---
const MONGODB_URI = 'mongodb://localhost:27017/solana_dapp_db'; // IMPORTANT: Replace with your actual MongoDB connection string in production!
// If MongoDB is on a remote server, use its URI: 'mongodb+srv://user:password@cluster.mongodb.net/solana_dapp_db?retryWrites=true&w=majority'
mongoose.connect(MONGODB_URI)
    .then(() => console.log('MongoDB connected successfully!'))
    .catch(err => {
        console.error('MongoDB connection error:', err);
        // Optionally add log.error for logging systems in production
        process.exit(1); // Exit the process if unable to connect to the DB
    });

// --- Mongoose Schemas and Models ---
// (Your schemas look good, keeping them as is)

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
// Added: index on mint for faster lookup and uniqueness enforcement
const nftSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: String,
    image: { type: String, required: true },
    mint: { type: String, required: true, unique: true, index: true }, // Index added
    owner: { type: String, required: true },
    isListed: { type: Boolean, default: false },
    price: Number,
    listedAt: Date,
    listingDuration: Number,
    listedBy: String,
    attributes: [{ trait_type: String, value: String }],
    history: [{ // Adding transaction history for NFTs
        type: { type: String, enum: ['Mint', 'Transfer', 'Sale', 'List', 'Delist'], required: true },
        from: String, // Wallet address
        to: String,   // Wallet address
        price: Number, // If sale
        timestamp: { type: Date, default: Date.now }
    }]
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
    // IN PRODUCTION: ADD AUTHENTICATION AND AUTHORIZATION (e.g., JWT token + admin role check)
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

app.post('/api/games', upload.single('gameFile'), async (req, res) => {
    // IN PRODUCTION: ADD AUTHENTICATION AND AUTHORIZATION (e.g., who can upload games)
    const { title, description, developer } = req.body;
    // Basic validation
    if (!title || typeof title !== 'string' || title.trim().length === 0 ||
        !description || typeof description !== 'string' || description.trim().length === 0 ||
        !developer || typeof developer !== 'string' || developer.trim().length === 0) {
        if (req.file) fs.unlinkSync(req.file.path); // Clean up uploaded file if required fields are missing
        return res.status(400).json({ error: 'Title, description, and developer are required and must be non-empty strings to add a game.' });
    }

    let gameUrl = '';
    if (req.file) {
        gameUrl = `http://localhost:${port}/uploads/${req.file.filename}`;
        // IN PRODUCTION: Replace localhost with your actual domain
        // gameUrl = `https://your-domain.com/uploads/${req.file.filename}`;
    } else {
        // If no game file is uploaded, but a URL is provided
        if (req.body.url && typeof req.body.url === 'string') {
            gameUrl = req.body.url;
        } else {
            return res.status(400).json({ error: 'Either a game file must be uploaded or a valid URL must be provided.' });
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
        if (req.file) fs.unlinkSync(req.file.path); // Clean up if DB save fails
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
    // IN PRODUCTION: ADD AUTHENTICATION AND AUTHORIZATION
    const { title, content, link, advertiser } = req.body;

    if (!title || typeof title !== 'string' || title.trim().length === 0 ||
        !content || typeof content !== 'string' || content.trim().length === 0 ||
        !advertiser || typeof advertiser !== 'string' || advertiser.trim().length === 0) {
        if (req.file) fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: 'Title, content, and advertiser are required and must be non-empty strings to post an ad.' });
    }

    let imageUrl = null;
    if (req.file) {
        imageUrl = `http://localhost:${port}/uploads/${req.file.filename}`;
        // IN PRODUCTION: Replace localhost with your actual domain
        // imageUrl = `https://your-domain.com/uploads/${req.file.filename}`;
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
        res.status(201).json({ message: 'Ad posted successfully', ad: newAd });
    } catch (error) {
        console.error('Error posting ad:', error);
        if (req.file) fs.unlinkSync(req.file.path);
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

    if (!title || typeof title !== 'string' || title.trim().length === 0 ||
        !creatorWallet || typeof creatorWallet !== 'string' || creatorWallet.trim().length === 0) {
        fs.unlinkSync(req.file.path); // Clean up the uploaded file if title/wallet is missing
        return res.status(400).json({ error: 'Photo title and creator wallet are required and must be non-empty strings.' });
    }
    // IN PRODUCTION: ADD VALIDATION FOR creatorWallet FORMAT (Solana address)
    // if (!SolanaWeb3.PublicKey.isOnCurve(new SolanaWeb3.PublicKey(creatorWallet))) { /* error */ }

    const imageUrl = `http://localhost:${port}/uploads/${req.file.filename}`;
    // IN PRODUCTION: Replace localhost with your actual domain
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
        fs.unlinkSync(req.file.path);
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
    // IN PRODUCTION: ADD AUTHENTICATION AND AUTHORIZATION (who can publish posts)
    const { title, content, authorWallet } = req.body;
    if (!title || typeof title !== 'string' || title.trim().length === 0 ||
        !content || typeof content !== 'string' || content.trim().length === 0 ||
        !authorWallet || typeof authorWallet !== 'string' || authorWallet.trim().length === 0) {
        return res.status(400).json({ error: 'Title, content, and author wallet are required and must be non-empty strings.' });
    }
    // IN PRODUCTION: ADD VALIDATION FOR authorWallet FORMAT
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
        // IN PRODUCTION: Replace MARKETPLACE_OWNER_WALLET_ADDRESS_HERE with the actual marketplace/escrow wallet address
        res.json({ nfts: nfts, marketplaceOwnerWallet: "MARKETPLACE_OWNER_WALLET_ADDRESS_HERE" });
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

    // Validate required fields and types
    if (!name || typeof name !== 'string' || name.trim().length === 0 ||
        !description || typeof description !== 'string' || description.trim().length === 0 ||
        !creatorWallet || typeof creatorWallet !== 'string' || creatorWallet.trim().length === 0) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: 'Name, description, and creator wallet are required and must be non-empty strings for NFT preparation.' });
    }
    // IN PRODUCTION: Add validation for creatorWallet format (Solana address)
    // try { new SolanaWeb3.PublicKey(creatorWallet); } catch (e) { /* error */ }

    const contentUrl = `http://localhost:${port}/uploads/${req.file.filename}`;
    // IN PRODUCTION: Replace localhost with your actual domain
    // const contentUrl = `https://your-domain.com/uploads/${req.file.filename}`;

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
    try {
        if (attributes && typeof attributes === 'string') {
            const parsedAttributes = JSON.parse(attributes);
            if (Array.isArray(parsedAttributes)) {
                nftMetadata.attributes = parsedAttributes;
            } else {
                console.warn("Parsed attributes is not an array, skipping.", parsedAttributes);
            }
        }
    } catch (e) {
        console.warn("Could not parse attributes JSON:", e);
        // We don't return a 400 error if attributes are invalid, just ignore them
    }

    // Save metadata JSON to the 'uploads' folder
    const metadataFileName = `${path.basename(req.file.filename, path.extname(req.file.filename))}.json`; // Filename without extension
    const metadataFilePath = path.join(__dirname, 'uploads', metadataFileName);
    fs.writeFileSync(metadataFilePath, JSON.stringify(nftMetadata, null, 2));
    const metadataUri = `http://localhost:${port}/uploads/${metadataFileName}`;
    // IN PRODUCTION: Replace localhost with your actual domain
    // const metadataUri = `https://your-domain.com/uploads/${metadataFileName}`;

    // Simulate a unique Solana mint address
    // IN A REAL PRODUCTION APP: This mint address is generated on the blockchain during actual minting.
    // The server would need to create (or request from the client) the minting instruction, sign it
    // (if it's the Payer or Authority), and return it to the client for user signature.
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
            history: [{ type: 'Mint', to: nftMetadata.properties.creators[0].address }] // Add minting history
        });
        await newNft.save();

        res.status(201).json({ // Changed to 201 for resource creation
            message: 'NFT assets prepared and simulated mint successful.',
            uri: metadataUri,
            mintAddress: simulatedMintAddress,
            imageUrl: contentUrl,
            signature: 'SIMULATED_TRANSACTION_SIGNATURE_FROM_BACKEND', // Placeholder signature
            nft: newNft // Return the full NFT object
        });
    } catch (error) {
        console.error('Error preparing/simulating NFT mint:', error);
        fs.unlinkSync(req.file.path); // Clean up if DB save fails
        if (fs.existsSync(metadataFilePath)) fs.unlinkSync(metadataFilePath); // Clean up metadata file too
        res.status(500).json({ error: 'Failed to prepare/simulate NFT mint.' });
    }
});

// Endpoint for listing NFT (simulation)
app.post('/api/nfts/list', async (req, res) => {
    const { mintAddress, price, duration, sellerWallet } = req.body;
    if (!mintAddress || typeof mintAddress !== 'string' || mintAddress.trim().length === 0 ||
        !price || isNaN(price) || price <= 0 ||
        !duration || isNaN(duration) || duration <= 0 ||
        !sellerWallet || typeof sellerWallet !== 'string' || sellerWallet.trim().length === 0) {
        return res.status(400).json({ error: 'Missing or invalid required fields for listing (mintAddress, price, duration, sellerWallet).' });
    }
    // IN PRODUCTION: Add validation for Solana address format

    try {
        // Find the NFT by its mint address and confirm the seller is the owner and it's not already listed
        const nft = await Nft.findOneAndUpdate(
            { mint: mintAddress.trim(), owner: sellerWallet.trim(), isListed: false },
            {
                $set: {
                    isListed: true,
                    price: price,
                    listedAt: new Date(),
                    listingDuration: duration,
                    listedBy: sellerWallet.trim(), // Track who listed it
                    // IN A REAL dApp: The `owner` might change to a marketplace escrow account here
                },
                $push: { history: { type: 'List', from: sellerWallet.trim(), timestamp: new Date() } } // Add to history
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

// Endpoint for buying NFT (simulation)
app.post('/api/nfts/buy', async (req, res) => {
    const { mintAddress, buyerWallet, sellerWallet, price } = req.body;
    if (!mintAddress || !buyerWallet || !sellerWallet || !price || isNaN(price) || price <= 0) {
        return res.status(400).json({ error: 'Missing or invalid required fields for buying NFT.' });
    }
    if (buyerWallet === sellerWallet) {
        return res.status(400).json({ error: 'Cannot buy your own NFT.' });
    }
    // IN PRODUCTION: Add validation for Solana address format

    try {
        // Find the NFT, ensure it's listed for sale, and the owner matches the sellerWallet
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
            return res.status(404).json({ error: 'NFT not found, not listed, or seller/price mismatch.' });
        }

        // IN REAL PRODUCTION:
        // Here, the server should:
        // 1. Generate a Solana transaction to transfer SOL from the buyer to the seller.
        // 2. Generate a Solana transaction to transfer the NFT from (escrow or seller) to the buyer.
        // 3. Serialize this transaction and send it to the client for buyer's signature.
        //
        // Example (pseudocode):
        /*
        const connection = new SolanaWeb3.Connection(SolanaWeb3.clusterApiUrl('devnet'), 'confirmed');
        const buyerPubKey = new SolanaWeb3.PublicKey(buyerWallet);
        const sellerPubKey = new SolanaWeb3.PublicKey(sellerWallet);
        const nftMintPubKey = new SolanaWeb3.PublicKey(mintAddress);

        // Get or create Associated Token Account for the buyer
        const buyerTokenAccount = await SolanaToken.getAssociatedTokenAddress(nftMintPubKey, buyerPubKey);
        let instructions = [];
        const buyerAtaInfo = await connection.getAccountInfo(buyerTokenAccount);
        if (!buyerAtaInfo) {
            instructions.push(SolanaToken.createAssociatedTokenAccountInstruction(
                buyerPubKey, // Payer
                buyerTokenAccount,
                buyerPubKey, // Owner
                nftMintPubKey,
                SolanaToken.TOKEN_PROGRAM_ID,
                SolanaWeb3.SystemProgram.programId
            ));
        }

        // Get the seller's Associated Token Account
        const sellerTokenAccounts = await connection.getParsedTokenAccountsByOwner(sellerPubKey, { mint: nftMintPubKey });
        if (!sellerTokenAccounts.value || sellerTokenAccounts.value.length === 0) {
            throw new Error('Seller does not hold this NFT.');
        }
        const sellerTokenAccount = sellerTokenAccounts.value[0].pubkey;

        // Add NFT transfer instruction
        instructions.push(SolanaToken.createTransferInstruction(
            sellerTokenAccount,
            buyerTokenAccount,
            sellerPubKey, // Authority (token owner)
            1, // NFT quantity (always 1 for NFTs)
            [], // Signers
            SolanaToken.TOKEN_PROGRAM_ID
        ));

        // Add SOL transfer instruction
        instructions.push(SolanaWeb3.SystemProgram.transfer({
            fromPubkey: buyerPubKey,
            toPubkey: sellerPubKey,
            lamports: price * SolanaWeb3.LAMPORTS_PER_SOL,
        }));

        const transaction = new SolanaWeb3.Transaction().add(...instructions);
        transaction.feePayer = buyerPubKey; // Buyer pays fees
        transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

        const serializedTransaction = transaction.serialize({ requireAllSignatures: false }).toString('base64');

        res.status(200).json({
            message: `NFT ${nft.name} purchase simulated. Transaction prepared for signing.`,
            nft,
            serializedTransaction: serializedTransaction
        });
        */
        // For now, return a simulated transaction
        res.status(200).json({
            message: `NFT ${nft.name} successfully purchased (simulated).`,
            nft,
            // Placeholder for the client to "send" the transaction
            serializedTransaction: 'SIMULATED_TRANSACTION_BASE64'
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
    if (!mint || typeof mint !== 'string' || mint.trim().length === 0) {
        return res.status(400).json({ error: 'NFT mint address is required.' });
    }

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
    try {
        // Check and seed Announcements
        const announceCount = await Announcement.countDocuments();
        if (announceCount === 0) {
            await Announcement.insertMany([
                { text: 'Welcome to Aurum Fox Unified Portal!', date: new Date() },
                { text: 'AFOX Phase 1 completed!', date: new Date(Date.now() - 86400000 * 5) }
            ]);
            console.log('Initial announcements seeded.');
        }

        // Check and seed Photos
        const photoCount = await Photo.countDocuments();
        if (photoCount === 0) {
            // Ensure these files exist in your server's 'uploads' directory
            const placeholderPhoto1 = path.join(uploadDir, 'photo_placeholder.png');
            const placeholderPhoto2 = path.join(uploadDir, 'photo_placeholder_2.png');
            if (!fs.existsSync(placeholderPhoto1)) fs.writeFileSync(placeholderPhoto1, ''); // Create empty file if missing
            if (!fs.existsSync(placeholderPhoto2)) fs.writeFileSync(placeholderPhoto2, '');

            await Photo.insertMany([
                { title: 'First Day in Office', description: 'Getting started with Aurum Fox.', imageUrl: `http://localhost:${port}/uploads/photo_placeholder.png`, date: new Date(Date.now() - 86400000 * 10), creatorWallet: "SIMULATED_WALLET_A" },
                { title: 'Aurum Fox Team', description: 'Our dedicated team.', imageUrl: `http://localhost:${port}/uploads/photo_placeholder_2.png`, date: new Date(Date.now() - 86400000 * 15), creatorWallet: "SIMULATED_WALLET_B" }
            ]);
            console.log('Initial photos seeded.');
        }

        // Check and seed Posts
        const postCount = await Post.countDocuments();
        if (postCount === 0) {
            await Post.insertMany([
                { title: "Launch Day!", content: "Today marks the official launch of the Aurum Fox Unified Portal. We're excited to bring you a seamless Web3 and multimedia experience!", date: new Date(Date.now() - 86400000 * 2), authorWallet: "SIMULATED_AUTHOR_WALLET_1" },
                { title: "New Features Coming Soon", content: "Stay tuned for exciting new features including decentralized storage options for your media and advanced NFT marketplace functionalities.", date: new Date(Date.now() - 86400000 * 25), authorWallet: "SIMULATED_AUTHOR_WALLET_2" }
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
            if (!fs.existsSync(nftMarketplace1)) fs.writeFileSync(nftMarketplace1, '');
            if (!fs.existsSync(nftMarketplace2)) fs.writeFileSync(nftMarketplace2, '');
            if (!fs.existsSync(nftUserOwned)) fs.writeFileSync(nftUserOwned, '');

            await Nft.insertMany([
                {
                    name: "Rare Fox", description: "A very rare golden fox NFT.", image: `http://localhost:${port}/uploads/nft_marketplace_1.png`, mint: "SOME_MARKETPLACE_NFT_MINT_1", owner: "MARKETPLACE_OWNER_WALLET_ADDRESS_HERE", isListed: true, price: 0.8, listedAt: new Date(Date.now() - 86400000), listingDuration: 30, listedBy: "MARKETPLACE_OWNER_WALLET_ADDRESS_HERE", attributes: [{ trait_type: "Rarity", value: "Rare" }],
                    history: [{ type: 'Mint', to: "MARKETPLACE_OWNER_WALLET_ADDRESS_HERE", timestamp: new Date(Date.now() - 86400000 * 3) }, { type: 'List', from: "MARKETPLACE_OWNER_WALLET_ADDRESS_HERE", timestamp: new Date(Date.now() - 86400000) }]
                },
                {
                    name: "Cunning Fox", description: "A cunning fox ready to pounce.", image: `http://localhost:${port}/uploads/nft_marketplace_2.png`, mint: "SOME_MARKETPLACE_NFT_MINT_2", owner: "ANOTHER_SELLER_WALLET_ADDRESS", isListed: true, price: 0.3, listedAt: new Date(Date.now() - 86400000 * 2), listingDuration: 60, listedBy: "ANOTHER_SELLER_WALLET_ADDRESS", attributes: [{ trait_type: "Expression", value: "Wink" }],
                    history: [{ type: 'Mint', to: "ANOTHER_SELLER_WALLET_ADDRESS", timestamp: new Date(Date.now() - 86400000 * 4) }, { type: 'List', from: "ANOTHER_SELLER_WALLET_ADDRESS", timestamp: new Date(Date.now() - 86400000 * 2) }]
                },
                {
                    name: "User Owned Fox", description: "An NFT owned by a user, not yet listed.", image: `http://localhost:${port}/uploads/nft_user_owned.png`, mint: "USER_OWNED_NFT_MINT_1", owner: "SIMULATED_USER_WALLET_ADDRESS", isListed: false, price: null, attributes: [{ trait_type: "Color", value: "Blue" }],
                    history: [{ type: 'Mint', to: "SIMULATED_USER_WALLET_ADDRESS", timestamp: new Date(Date.now() - 86400000 * 5) }]
                }
            ]);
            console.log('Initial NFTs seeded.');
        }

        // Check and seed Games
        const gameCount = await Game.countDocuments();
        if (gameCount === 0) {
            await Game.insertMany([
                { title: "Solana Chess", description: "Play chess on Solana!", url: "https://example.com/solana-chess", developer: "BlockchainDevs" },
                { title: "Degen Racer", description: "Fast-paced racing game.", url: "https://example.com/degen-racer", developer: "GameFi Studios" }
            ]);
            console.log('Initial games seeded.');
        }

        // Check and seed Ads
        const adCount = await Ad.countDocuments();
        if (adCount === 0) {
            const adPlaceholder = path.join(uploadDir, 'ad_placeholder.png');
            if (!fs.existsSync(adPlaceholder)) fs.writeFileSync(adPlaceholder, '');

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

