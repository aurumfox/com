// Load environment variables from .env file FIRST
// This should always be the very first line to ensure all subsequent modules
// have access to the environment variables.
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs').promises; // Use promises version for async/await
const rateLimit = require('express-rate-limit');
const hpp = require('hpp'); // HTTP Parameter Pollution protection
const xss = require('express-xss-clean'); // XSS protection
const morgan = require('morgan'); // HTTP request logger
const mongooseMorgan = require('mongoose-morgan'); // For logging to MongoDB
const compression = require('compression'); // Gzip compression
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const { graphqlHTTP } = require('express-graphql'); // NEW: For GraphQL

// --- Configuration & Utilities ---
// Database connection
const connectDB = require('./config/db');
// Redis connection
const { connectRedis, getRedisClient, disconnectRedis } = require('./config/redis');
// Logger - Should be required after dotenv to get LOG_LEVEL etc.
const logger = require('./config/logger');
// Constants (moved to utils/constants.js)
const { API_VERSIONS, ROLES, ALLOWED_MIME_TYPES } = require('./utils/constants');
// Dependency Injection Container - Initialize early
const container = require('./config/container'); // NEW: DI container

// --- IMPORTANT: ROUTE IMPORTS ---
// You MUST import your route files here.
// Replace these with your actual route file paths.
const authRoutes = require('./routes/auth');
const announcementRoutes = require('./routes/announcements');
const photoRoutes = require('./routes/photos'); // Placeholder - create this file
const postRoutes = require('./routes/posts');   // Placeholder - create this file
const nftRoutes = require('./routes/nfts');     // Placeholder - create this file
const gameRoutes = require('./routes/games');   // Placeholder - create this file
const adRoutes = require('./routes/ads');       // Placeholder - create this file
const docsRoutes = require('./routes/docs');    // Placeholder for Swagger docs route

// Middleware Imports (should be required after logger/config for consistent use)
const { notFound, errorHandler, ApiError } = require('./middleware/errorMiddleware'); // Ensure ApiError is exported
const { authenticateToken, authorizeRole } = require('./middleware/authMiddleware');
const cacheMiddleware = require('./middleware/cacheMiddleware');
const applySecurityHeaders = require('./middleware/securityHeaders');
const diMiddleware = require('./middleware/diMiddleware'); // NEW: Dependency Injection middleware
const { validateFileUpload } = require('./middleware/fileUploadMiddleware'); // NEW: File upload validation
// Multer configuration - Ensure you define `upload` correctly based on your needs
const upload = require('./utils/multer'); // Assuming this exports a configured multer instance

// Event Emitter setup
const { eventEmitter } = require('./events'); // Assuming this is your central event emitter

// GraphQL Schema and Resolvers
const { schema, rootValue } = require('./graphql/index'); // NEW: GraphQL setup

// --- Initialize Express App ---
const app = express();

// --- Environment Variables & Constants ---
const PORT = process.env.PORT || 3000;
const ALLOWED_CORS_ORIGINS = process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',').map(s => s.trim()) : ['http://127.0.0.1:5500', 'http://localhost:5500'];
const NODE_ENV = process.env.NODE_ENV || 'development';
const MONGODB_URI = process.env.MONGODB_URI; // Get from process.env after dotenv.config()
const DEFAULT_ADMIN_PASSWORD = process.env.DEFAULT_ADMIN_PASSWORD || 'adminpassword';
const FRONTEND_SERVER_BASE_URL = process.env.FRONTEND_SERVER_BASE_URL || `http://localhost:${PORT}`; // Use for generating URLs

// --- Initial Setup & Directory Checks ---
const uploadDir = 'uploads/';
async function ensureUploadDir() {
    try {
        await fs.mkdir(uploadDir, { recursive: true });
        logger.info(`Server: Upload directory '${uploadDir}' ensured.`);
    } catch (err) {
        logger.error(`Server Error: Failed to ensure upload directory '${uploadDir}':`, err);
        // It's critical to have this directory, so exit if it fails
        process.exit(1);
    }
}

// --- Database & Cache Connections ---
// Connect to MongoDB and Redis asynchronously
async function initializeConnections() {
    try {
        await connectDB();
        await connectRedis();
        logger.info('Server: Database and Redis connections established.');
    } catch (error) {
        logger.error('Server Error: Failed to establish database or Redis connections:', error);
        process.exit(1); // Exit if critical connections fail
    }
}

// --- Middlewares ---

// Security Headers (Helmet and custom CSP/Referrer-Policy)
app.use(helmet());
applySecurityHeaders(app); // Assumes this function correctly applies headers

// Gzip Compression
app.use(compression());

// CORS Configuration
app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        if (ALLOWED_CORS_ORIGINS.includes(origin) || ALLOWED_CORS_ORIGINS.includes('*')) {
            return callback(null, true);
        }
        logger.warn(`CORS: Blocking origin ${origin}. Not in allowed list.`);
        const msg = `The CORS policy for this site does not allow access from the specified Origin: ${origin}`;
        return callback(new Error(msg), false);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'], // Added PATCH
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'], // Added Accept, Origin
    credentials: true,
    optionsSuccessStatus: 204 // For preflight requests
}));
app.options('*', cors()); // Enable pre-flight across all routes

// Body Parsers
app.use(express.json({ limit: '1mb' })); // Increased limit to 1MB, adjust as needed
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Prevent HTTP Parameter Pollution attacks
app.use(hpp());

// Sanitize data to prevent XSS attacks
app.use(xss());

// Rate limiting (apply globally or to specific routes)
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again after 15 minutes.',
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    // Optional: Add `keyGenerator` for more granular limiting (e.g., by user ID after auth)
});
app.use(apiLimiter); // Apply to all requests. Consider applying only to public routes.

// HTTP Request Logging
if (NODE_ENV === 'development') {
    app.use(morgan('dev')); // Concise output colored by response status for development
} else {
    // For production: Log successful requests to Winston and errors to MongooseMorgan
    // Note: mongoose-morgan might create a new connection or use an existing one.
    // Ensure it's using your already established Mongoose connection for efficiency.
    app.use(mongooseMorgan({
        connectionString: MONGODB_URI, // Use the configured URI
        collection: 'access_logs',
        // Example token for combined format (can be customized)
        token: ':remote-addr - :remote-user ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"',
        format: 'combined',
        // Customize options as needed
    }, {
        // Success callback for mongoose-morgan, if you want to inspect logs
        // success: (req, res) => { /* console.log('Log saved to MongoDB'); */ },
        // Error callback for mongoose-morgan
        // error: (err) => { logger.error('Mongoose-Morgan logging error:', err); }
    }, {
        // Skip logging requests that are already errors (handled by errorHandler)
        skip: (req, res) => res.statusCode >= 400 && res.statusCode < 500 // Exclude client errors from Mongo, but still log to console
    }));
    // Also log to console via Winston for real-time monitoring in production environment
    app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
}

// Serve static files (ensure this path is correct relative to your project root)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// NEW: Apply Dependency Injection Middleware (must come before routes that use it)
app.use(diMiddleware(container));

// --- API Routes ---
// The order of routes matters!
app.use(`${API_VERSIONS.V1}/auth`, authRoutes);
app.use(`${API_VERSIONS.V1}/announcements`, cacheMiddleware(300), announcementRoutes);
app.use(`${API_VERSIONS.V1}/photos`, cacheMiddleware(300), photoRoutes);
app.use(`${API_VERSIONS.V1}/posts`, cacheMiddleware(300), postRoutes);
app.use(`${API_VERSIONS.V1}/nfts`, cacheMiddleware(60), nftRoutes);
app.use(`${API_VERSIONS.V1}/games`, cacheMiddleware(3600), gameRoutes);
app.use(`${API_VERSIONS.V1}/ads`, cacheMiddleware(600), adRoutes);

// File Upload Route Example (if you have one)
app.post(`${API_VERSIONS.V1}/upload`, authenticateToken, upload.single('file'), validateFileUpload, async (req, res, next) => {
    try {
        if (!req.file) {
            throw new ApiError('No file uploaded.', 400);
        }
        // File is uploaded and validated, now process it (e.g., save path to DB)
        const filePath = `/uploads/${req.file.filename}`;
        logger.info(`File uploaded: ${filePath}`);
        res.status(200).json({ message: 'File uploaded successfully', filePath });
    } catch (error) {
        next(error); // Pass to error handler
    }
});


// Swagger UI documentation (ensure docsRoutes correctly serves Swagger JSON/YAML)
app.use('/api-docs', docsRoutes);

// NEW: GraphQL Endpoint
app.use(`${API_VERSIONS.V1}/graphql`, graphqlHTTP((req) => ({ // Wrap in a function to access req for context
    schema: schema,
    rootValue: rootValue,
    graphiql: NODE_ENV === 'development', // Enable GraphiQL in development
    context: { // Pass request and DI container's resolved services to resolvers
        req, // The express request object
        logger: req.container.resolve('logger'),
        nftService: req.container.resolve('nftService'),
        userService: req.container.resolve('userService'),
        announcementService: req.container.resolve('announcementService'),
        // Add other services/dependencies needed by GraphQL resolvers
        // Ensure these services are registered in your DI container (config/container.js)
    }
})));
logger.info(`Server: GraphQL endpoint available at ${FRONTEND_SERVER_BASE_URL}${API_VERSIONS.V1}/graphql`);


// --- Error Handling Middleware (must be LAST) ---
// These catch all unhandled errors and 404s.
app.use(notFound);
app.use(errorHandler);

// --- Initial Data Seeding ---
async function seedInitialData() {
    logger.info('Server: Checking for initial data and seeding if necessary...');
    // Dynamically require models to avoid circular dependencies if models
    // also depend on services that might depend on other models during DI setup.
    // Ensure these models are registered in your DI container (config/container.js)
    const Announcement = container.resolve('AnnouncementModel');
    const Photo = container.resolve('PhotoModel');
    const Post = container.resolve('PostModel');
    const Nft = container.resolve('NftModel');
    const Game = container.resolve('GameModel');
    const Ad = container.resolve('AdModel');
    const User = container.resolve('UserModel');
    const bcrypt = require('bcryptjs'); // For hashing admin password

    try {
        // Admin User Seeding
        const adminUserCount = await User.countDocuments({ role: ROLES.ADMIN });
        if (adminUserCount === 0) {
            const adminWallet = process.env.ADMIN_WALLETS ? process.env.ADMIN_WALLETS.split(',')[0] : 'ADMIN_WALLET_ADDRESS_FOR_TESTING_1234567890ABCDEF';
            if (adminWallet === 'ADMIN_WALLET_ADDRESS_FOR_TESTING_1234567890ABCDEF') {
                logger.warn('Server: Using default test admin wallet address. Change ADMIN_WALLETS in .env for production.');
            }
            const hashedPassword = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 10);
            const admin = await User.create({
                walletAddress: adminWallet,
                password: hashedPassword,
                role: ROLES.ADMIN
            });
            logger.info(`Server: Default admin user seeded: ${admin.walletAddress}`);
            logger.warn(`Server: Admin password for testing: "${DEFAULT_ADMIN_PASSWORD}". PLEASE CHANGE OR REMOVE IN PRODUCTION.`);
        }

        // Seed other data types if their collections are empty
        if (await Announcement.countDocuments() === 0) {
            await Announcement.insertMany([
                { text: 'Welcome to Aurum Fox Unified Portal!', date: new Date() },
                { text: 'AFOX Phase 1 completed!', date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) }
            ]);
            logger.info('Server: Initial announcements seeded.');
        }

        if (await Photo.countDocuments() === 0) {
            // Ensure placeholder images exist before seeding references
            const photoPlaceholder1Name = 'photo_placeholder_1.png';
            const photoPlaceholder2Name = 'photo_placeholder_2.png';
            const placeholderPhoto1Path = path.join(uploadDir, photoPlaceholder1Name);
            const placeholderPhoto2Path = path.join(uploadDir, photoPlaceholder2Name);

            // Create empty placeholder files if they don't exist
            await fs.writeFile(placeholderPhoto1Path, Buffer.from(''))
                .catch(err => logger.error(`Server Error: Error creating placeholder photo 1: ${err.message}`));
            await fs.writeFile(placeholderPhoto2Path, Buffer.from(''))
                .catch(err => logger.error(`Server Error: Error creating placeholder photo 2: ${err.message}`));

            await Photo.insertMany([
                { title: 'First Day in Office', description: 'Getting started with Aurum Fox.', imageUrl: `${FRONTEND_SERVER_BASE_URL}/uploads/${photoPlaceholder1Name}`, date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), creatorWallet: "SIMULATED_WALLET_A" },
                { title: 'Aurum Fox Team', description: 'Our dedicated team.', imageUrl: `${FRONTEND_SERVER_BASE_URL}/uploads/${photoPlaceholder2Name}`, date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), creatorWallet: "SIMULATED_WALLET_B" }
            ]);
            logger.info('Server: Initial photos seeded.');
        }

        if (await Post.countDocuments() === 0) {
            await Post.insertMany([
                { title: "Launch Day!", content: "Today marks the official launch of the Aurum Fox Unified Portal. We're excited to bring you a seamless Web3 and multimedia experience!", date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), authorWallet: "SIMULATED_AUTHOR_WALLET_1" },
                { title: "New Features Coming Soon", content: "Stay tuned for exciting new features including decentralized storage options for your media and advanced NFT marketplace functionalities.", date: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000), authorWallet: "SIMULATED_AUTHOR_WALLET_2" }
            ]);
            logger.info('Server: Initial posts seeded.');
        }

        if (await Nft.countDocuments() === 0) {
            const nftPlaceholder1Name = 'nft_marketplace_1.png';
            const nftPlaceholder2Name = 'nft_marketplace_2.png';
            const nftUserOwnedName = 'nft_user_owned.png';
            const nftPlaceholder1Path = path.join(uploadDir, nftPlaceholder1Name);
            const nftPlaceholder2Path = path.join(uploadDir, nftPlaceholder2Name);
            const nftUserOwnedPath = path.join(uploadDir, nftUserOwnedName);

            await fs.writeFile(nftPlaceholder1Path, Buffer.from(''))
                .catch(err => logger.error(`Server Error: Error creating placeholder NFT 1: ${err.message}`));
            await fs.writeFile(nftPlaceholder2Path, Buffer.from(''))
                .catch(err => logger.error(`Server Error: Error creating placeholder NFT 2: ${err.message}`));
            await fs.writeFile(nftUserOwnedPath, Buffer.from(''))
                .catch(err => logger.error(`Server Error: Error creating placeholder NFT user owned: ${err.message}`));

            await Nft.insertMany([
                {
                    name: "Rare Fox", description: "A very rare golden fox NFT.", image: `${FRONTEND_SERVER_BASE_URL}/uploads/${nftPlaceholder1Name}`, mint: "SOME_MARKETPLACE_NFT_MINT_1", owner: "MARKETPLACE_ESCROW_WALLET_ADDRESS_HERE", isListed: true, price: 0.8, listedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), listingDuration: 30, listedBy: "MARKETPLACE_ESCROW_WALLET_ADDRESS_HERE", attributes: [{ trait_type: "Rarity", value: "Rare" }],
                    history: [{ type: 'Mint', to: "MARKETPLACE_ESCROW_WALLET_ADDRESS_HERE", timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) }, { type: 'List', from: "MARKETPLACE_ESCROW_WALLET_ADDRESS_HERE", timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) }]
                },
                {
                    name: "Cunning Fox", description: "A cunning fox ready to pounce.", image: `${FRONTEND_SERVER_BASE_URL}/uploads/${nftPlaceholder2Name}`, mint: "SOME_MARKETPLACE_NFT_MINT_2", owner: "ANOTHER_SELLER_WALLET_ADDRESS", isListed: true, price: 0.3, listedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), listingDuration: 60, listedBy: "ANOTHER_SELLER_WALLET_ADDRESS", attributes: [{ trait_type: "Expression", value: "Wink" }],
                    history: [{ type: 'Mint', to: "ANOTHER_SELLER_WALLET_ADDRESS", timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000) }, { type: 'List', from: "ANOTHER_SELLER_WALLET_ADDRESS", timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) }]
                },
                {
                    name: "User Owned Fox", description: "An NFT owned by a user, not yet listed.", image: `${FRONTEND_SERVER_BASE_URL}/uploads/${nftUserOwnedName}`, mint: "USER_OWNED_NFT_MINT_1", owner: "SIMULATED_USER_WALLET_ADDRESS", isListed: false, price: null, attributes: [{ trait_type: "Color", value: "Blue" }],
                    history: [{ type: 'Mint', to: "SIMULATED_USER_WALLET_ADDRESS", timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) }]
                }
            ]);
            logger.info('Server: Initial NFTs seeded.');
        }

        if (await Game.countDocuments() === 0) {
            await Game.insertMany([
                { title: "Solana Chess", description: "Play chess on Solana!", url: "https://example.com/solana-chess", developer: "BlockchainDevs" },
                { title: "Degen Racer", description: "Fast-paced racing game.", url: "https://example.com/degen-racer", developer: "GameFi Studios" }
            ]);
            logger.info('Server: Initial games seeded.');
        }

        if (await Ad.countDocuments() === 0) {
            const adPlaceholderName = 'ad_placeholder.png';
            const adPlaceholderPath = path.join(uploadDir, adPlaceholderName);
            await fs.writeFile(adPlaceholderPath, Buffer.from(''))
                .catch(err => logger.error(`Server Error: Error creating placeholder ad: ${err.message}`));

            await Ad.insertMany([
                { title: "Buy My Awesome Project!", content: "Check out our new dApp, it's great!", imageUrl: `${FRONTEND_SERVER_BASE_URL}/uploads/${adPlaceholderName}`, link: "https://myawesomedapp.com", advertiser: "ProjectX" }
            ]);
            logger.info('Server: Initial ads seeded.');
        }

        logger.info('Server: Initial data seeding complete.');
    } catch (error) {
        logger.error('Server Error: Failed to seed initial data:', error);
    }
}

// --- Server Start ---
let server;

// Wrap the entire startup process in an async function
async function startServer() {
    await ensureUploadDir(); // Ensure upload directory exists first
    await initializeConnections(); // Establish DB and Redis connections

    server = app.listen(PORT, () => {
        logger.info(`Server: Backend server listening at http://localhost:${PORT}`);
        logger.info(`Server: Node Environment: ${NODE_ENV}`);
        logger.info(`Server: MongoDB URI: ${MONGODB_URI ? 'Configured' : 'NOT CONFIGURED (using default client settings)'}`);
        logger.info(`Server: Redis URI: ${process.env.REDIS_URI ? 'Configured' : 'NOT CONFIGURED (using default client settings)'}`);
        logger.info(`Server: CORS allowed origins: ${ALLOWED_CORS_ORIGINS.join(', ')}`);
        logger.info(`Server: Frontend should fetch from ${FRONTEND_SERVER_BASE_URL}`);
        logger.info(`Server: Swagger UI available at ${FRONTEND_SERVER_BASE_URL}/api-docs`);
        logger.info(`Server: IMPORTANT: For production, uncomment and implement proper Solana Web3 integration and KMS.`);
        seedInitialData(); // Start seeding data after server is listening
    });
}

// Execute the server startup
startServer();

// Graceful shutdown
const gracefulShutdown = (signal) => {
    logger.info(`${signal} signal received: closing HTTP server.`);
    server.close(() => {
        logger.info('Server: HTTP server closed.');
        disconnectRedis(); // Disconnect Redis cleanly
        // Consider also disconnecting Mongoose here if it's the last connection
        // mongoose.connection.close(() => {
        //     logger.info('Server: MongoDB connection closed.');
        //     process.exit(0);
        // });
        process.exit(0);
    });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Catch unhandled rejections to prevent crashing
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Server Error: Unhandled Rejection at:', promise, 'reason:', reason);
    // Application specific logging, cleanup, or exit process
    // In production, you might want to gracefully exit after logging
    // process.exit(1);
});

// Catch uncaught exceptions
process.on('uncaughtException', (error) => {
    logger.critical('Server Error: Uncaught Exception:', error);
    // Ensure all logs are flushed before exiting
    // For critical errors, it's often best to exit the process to restart cleanly
    process.exit(1);
});
