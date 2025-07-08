// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs').promises;
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');
const xss = require('express-xss-clean');
const morgan = require('morgan');
const mongooseMorgan = require('mongoose-morgan');
const compression = require('compression');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const { graphqlHTTP } = require('express-graphql'); // NEW: For GraphQL

// Database connection
const connectDB = require('./config/db');
// Redis connection
const { connectRedis, getRedisClient, disconnectRedis } = require('./config/redis');
// Logger
const logger = require('./config/logger');
// Constants (moved to utils/constants.js)
const { API_VERSIONS, ROLES, ALLOWED_MIME_TYPES } = require('./utils/constants');
// Middleware
const { notFound, errorHandler } = require('./middleware/errorMiddleware');
const { authenticateToken, authorizeRole } = require('./middleware/authMiddleware');
const cacheMiddleware = require('./middleware/cacheMiddleware');
const applySecurityHeaders = require('./middleware/securityHeaders');
const diMiddleware = require('./middleware/diMiddleware'); // NEW: Dependency Injection middleware

// Multer configuration
const upload = require('./utils/multer');

// Event Emitter setup
const { eventEmitter } = require('./events');

// GraphQL Schema and Resolvers
const { schema, rootValue } = require('./graphql/index'); // NEW: GraphQL setup

// Dependency Injection Container
const container = require('./config/container'); // NEW: DI container

// Route Imports
const authRoutes = require('./routes/auth');
const announcementRoutes = require('./routes/announcements');
const photoRoutes = require('./routes/photos');
const postRoutes = require('./routes/posts');
const nftRoutes = require('./routes/nfts');
const gameRoutes = require('./routes/games');
const adRoutes = require('./routes/ads');
const docsRoutes = require('./routes/docs');

const app = express();
const PORT = process.env.PORT || 3000;
const ALLOWED_CORS_ORIGINS = process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : ['http://127.0.0.1:5500', 'http://localhost:5500'];
const NODE_ENV = process.env.NODE_ENV || 'development';

// --- Middlewares ---
app.use(helmet());
applySecurityHeaders(app);

app.use(compression());

// Configure CORS
app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (ALLOWED_CORS_ORIGINS.includes(origin)) {
            return callback(null, true);
        }
        logger.warn(`CORS: Blocking origin ${origin}`);
        const msg = `The CORS policy for this site does not allow access from the specified Origin: ${origin}`;
        return callback(new Error(msg), false);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true
}));
app.options('*', cors());

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Prevent HTTP Parameter Pollution attacks
app.use(hpp());

// Sanitize data to prevent XSS attacks
app.use(xss());

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests from this IP, please try again after 15 minutes',
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(limiter);

// HTTP Request Logging
if (NODE_ENV === 'development') {
    app.use(morgan('dev'));
} else {
    app.use(mongooseMorgan({
        connectionString: process.env.MONGODB_URI,
        collection: 'access_logs',
        token: ':remote-addr - :remote-user ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"',
        format: 'combined',
    }, {}, {
        skip: (req, res) => res.statusCode < 400
    }));
    app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
}

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Ensure upload directory exists
const uploadDir = 'uploads/';
async function ensureUploadDir() {
    try {
        await fs.mkdir(uploadDir, { recursive: true });
        logger.info(`Upload directory '${uploadDir}' ensured.`);
    } catch (err) {
        logger.error(`Error ensuring upload directory '${uploadDir}':`, err);
        process.exit(1);
    }
}

// --- Connect to MongoDB and Redis ---
connectDB();
connectRedis();

// NEW: Apply Dependency Injection Middleware
app.use(diMiddleware(container));

// --- API Routes ---
app.use(`${API_VERSIONS.V1}/auth`, authRoutes);
app.use(`${API_VERSIONS.V1}/announcements`, cacheMiddleware(300), announcementRoutes);
app.use(`${API_VERSIONS.V1}/photos`, cacheMiddleware(300), photoRoutes);
app.use(`${API_VERSIONS.V1}/posts`, cacheMiddleware(300), postRoutes);
app.use(`${API_VERSIONS.V1}/nfts`, cacheMiddleware(60), nftRoutes);
app.use(`${API_VERSIONS.V1}/games`, cacheMiddleware(3600), gameRoutes);
app.use(`${API_VERSIONS.V1}/ads`, cacheMiddleware(600), adRoutes);

// Swagger UI documentation
app.use('/api-docs', docsRoutes);

// NEW: GraphQL Endpoint
app.use(`${API_VERSIONS.V1}/graphql`, graphqlHTTP({
    schema: schema,
    rootValue: rootValue,
    graphiql: NODE_ENV === 'development', // Enable GraphiQL in development
    context: (req) => ({ // Pass request context to resolvers
        req,
        logger: req.container.resolve('logger'),
        nftService: req.container.resolve('nftService'),
        userService: req.container.resolve('userService'),
        announcementService: req.container.resolve('announcementService'), // Example: add more services
        // Add other services/dependencies needed by GraphQL resolvers
    })
}));
logger.info(`GraphQL endpoint available at http://localhost:${PORT}${API_VERSIONS.V1}/graphql`);


// --- Error Handling Middleware (must be last) ---
app.use(notFound);
app.use(errorHandler);

// --- Initial Data Seeding ---
async function seedInitialData() {
    logger.info('Checking for initial data and seeding if necessary...');
    const Announcement = require('./models/Announcement');
    const Photo = require('./models/Photo');
    const Post = require('./models/Post');
    const Nft = require('./models/Nft');
    const Game = require('./models/Game');
    const Ad = require('./models/Ad');
    const User = require('./models/User');

    try {
        const adminUserCount = await User.countDocuments({ role: ROLES.ADMIN });
        if (adminUserCount === 0) {
            const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'adminpassword';
            const adminWallet = 'ADMIN_WALLET_ADDRESS_FOR_TESTING_1234567890ABCDEF';
            const admin = await User.create({
                walletAddress: adminWallet,
                password: adminPassword,
                role: ROLES.ADMIN
            });
            logger.info(`  Default admin user seeded: ${admin.walletAddress}`);
            logger.warn(`  Admin password for testing: "${adminPassword}". PLEASE CHANGE OR REMOVE IN PRODUCTION.`);
        }

        const announcementCount = await Announcement.countDocuments();
        if (announcementCount === 0) {
            await Announcement.insertMany([
                { text: 'Welcome to Aurum Fox Unified Portal!', date: new Date() },
                { text: 'AFOX Phase 1 completed!', date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) }
            ]);
            logger.info('  Initial announcements seeded.');
        }

        const photoCount = await Photo.countDocuments();
        if (photoCount === 0) {
            const placeholderPhoto1Path = path.join(uploadDir, 'photo_placeholder_1.png');
            const placeholderPhoto2Path = path.join(uploadDir, 'photo_placeholder_2.png');
            await fs.writeFile(placeholderPhoto1Path, Buffer.from(''))
                .catch(err => logger.error(`Error creating placeholder photo 1: ${err.message}`));
            await fs.writeFile(placeholderPhoto2Path, Buffer.from(''))
                .catch(err => logger.error(`Error creating placeholder photo 2: ${err.message}`));

            await Photo.insertMany([
                { title: 'First Day in Office', description: 'Getting started with Aurum Fox.', imageUrl: `http://localhost:${PORT}/uploads/photo_placeholder_1.png`, date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), creatorWallet: "SIMULATED_WALLET_A" },
                { title: 'Aurum Fox Team', description: 'Our dedicated team.', imageUrl: `http://localhost:${PORT}/uploads/photo_placeholder_2.png`, date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), creatorWallet: "SIMULATED_WALLET_B" }
            ]);
            logger.info('  Initial photos seeded.');
        }

        const postCount = await Post.countDocuments();
        if (postCount === 0) {
            await Post.insertMany([
                { title: "Launch Day!", content: "Today marks the official launch of the Aurum Fox Unified Portal. We're excited to bring you a seamless Web3 and multimedia experience!", date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), authorWallet: "SIMULATED_AUTHOR_WALLET_1" },
                { title: "New Features Coming Soon", content: "Stay tuned for exciting new features including decentralized storage options for your media and advanced NFT marketplace functionalities.", date: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000), authorWallet: "SIMULATED_AUTHOR_WALLET_2" }
            ]);
            logger.info('  Initial posts seeded.');
        }

        const nftCount = await Nft.countDocuments();
        if (nftCount === 0) {
            const nftPlaceholder1Path = path.join(uploadDir, 'nft_marketplace_1.png');
            const nftPlaceholder2Path = path.join(uploadDir, 'nft_marketplace_2.png');
            const nftUserOwnedPath = path.join(uploadDir, 'nft_user_owned.png');
            await fs.writeFile(nftPlaceholder1Path, Buffer.from(''))
                .catch(err => logger.error(`Error creating placeholder NFT 1: ${err.message}`));
            await fs.writeFile(nftPlaceholder2Path, Buffer.from(''))
                .catch(err => logger.error(`Error creating placeholder NFT 2: ${err.message}`));
            await fs.writeFile(nftUserOwnedPath, Buffer.from(''))
                .catch(err => logger.error(`Error creating placeholder NFT user owned: ${err.message}`));

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
            const adPlaceholderPath = path.join(uploadDir, 'ad_placeholder.png');
            await fs.writeFile(adPlaceholderPath, Buffer.from(''))
                .catch(err => logger.error(`Error creating placeholder ad: ${err.message}`));

            await Ad.insertMany([
                { title: "Buy My Awesome Project!", content: "Check out our new dApp, it's great!", imageUrl: `http://localhost:${PORT}/uploads/ad_placeholder.png`, link: "https://myawesomedapp.com", advertiser: "ProjectX" }
            ]);
            logger.info('  Initial ads seeded.');
        }

    } catch (error) {
        logger.error('Error seeding initial data:', error);
    }
}

// --- Server Start ---
let server;

ensureUploadDir().then(() => {
    server = app.listen(PORT, () => {
        logger.info(`Backend server listening at http://localhost:${PORT}`);
        logger.info(`MongoDB URI: ${process.env.MONGODB_URI ? 'Configured' : 'Not configured (using default)'}`);
        logger.info(`Redis URI: ${process.env.REDIS_URI ? 'Configured' : 'Not configured (using default)'}`);
        logger.info(`CORS allowed origins: ${ALLOWED_CORS_ORIGINS.join(', ')}`);
        logger.info(`Your frontend should be configured to fetch from http://localhost:${PORT}`);
        logger.info(`Swagger UI available at http://localhost:${PORT}/api-docs`);
        logger.info(`\nIMPORTANT: For production, uncomment and implement proper Solana Web3 integration.`);
        seedInitialData();
    });
});

// Graceful shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM signal received: closing HTTP server');
    server.close(() => {
        logger.info('HTTP server closed');
        disconnectRedis();
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    logger.info('SIGINT signal received: closing HTTP server');
    server.close(() => {
        logger.info('HTTP server closed');
        disconnectRedis();
        process.exit(0);
    });
});
