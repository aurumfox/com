/**
 * @file Dependency Injection Container configuration for the Aurum Fox Unified Portal API.
 * Uses Awilix to manage and inject dependencies, promoting modularity and testability.
 */

const { createContainer, asValue, asFunction, asClass, Lifetime } = require('awilix');
const logger = require('./logger'); // Your Winston logger instance
const { getRedisClient } = require('./redis'); // Function to get Redis client
const { getRabbitMQChannel, publishMessage, RABBITMQ_QUEUES } = require('./rabbitmq'); // RabbitMQ utilities
const { getSolanaConnection, PublicKey, isValidSolanaPublicKey, getSolBalance, simulateSolanaTransaction, LAMPORTS_PER_SOL } = require('./solana'); // Solana utilities
const config = require('./environments')[process.env.NODE_ENV || 'development']; // General application config

// --- Models ---
// It's good practice to register all models for consistency
const User = require('../models/User');
const Announcement = require('../models/Announcement');
const Nft = require('../models/Nft');
const Photo = require('../models/Photo'); // Assuming you will have a Photo model
const Post = require('../models/Post');   // Assuming you will have a Post model
const Game = require('../models/Game');   // Assuming you will have a Game model
const Ad = require('../models/Ad');       // Assuming you will have an Ad model


// --- Services ---
// Grouping service imports for readability
const announcementService = require('../services/announcementService');
const authService = require('../services/authService'); // Assuming you'll extract auth logic to a service
const cacheService = require('../services/cacheService');
const circuitBreakerService = require('../services/circuitBreakerService');
const eventService = require('../services/eventService');
const nftService = require('../services/nftService');
const photoService = require('../services/photoService'); // Assuming you'll have a photo service
const queueService = require('../services/queueService');
const transactionService = require('../services/transactionService');
const userService = require('../services/userService');


// --- Utilities ---
// Grouping utility imports
const solanaUtils = require('../utils/solana'); // Your general Solana utility functions if any beyond config
const cacheUtility = require('../utils/cache'); // Your custom caching utility or wrapper
const jwtUtility = require('../utils/jwt');     // Assuming you'll have a JWT utility


// Create the Awilix container
const container = createContainer();

// Register modules with Awilix
container.register({
    // --- Configuration Values / Primitives (asValue) ---
    // These are direct values or functions that return values
    logger: asValue(logger), // Your Winston logger instance
    config: asValue(config), // Application configuration (e.g., database URIs, API keys)

    // Redis client getter
    redisClient: asFunction(getRedisClient).singleton(), // Access the Redis client instance directly

    // RabbitMQ channel and publishing tools
    rabbitMQChannel: asFunction(getRabbitMQChannel).singleton(), // Access the RabbitMQ channel instance directly
    rabbitMQPublisher: asValue(publishMessage), // Function to publish messages
    rabbitMQQueues: asValue(RABBITMQ_QUEUES), // Export queue names

    // Solana connection and utilities
    solanaConnection: asFunction(getSolanaConnection).singleton(), // Access the Solana Connection instance
    solanaPublicKey: asValue(PublicKey), // Solana PublicKey class
    isValidSolanaPublicKey: asValue(isValidSolanaPublicKey), // Utility for public key validation
    getSolBalance: asValue(getSolBalance), // Utility to get SOL balance
    simulateSolanaTransaction: asValue(simulateSolanaTransaction), // Simulated transaction helper
    LAMPORTS_PER_SOL: asValue(LAMPORTS_PER_SOL), // Constant for lamports conversion


    // --- Models (asValue) ---
    // Mongoose models are typically singleton values
    userModel: asValue(User),
    announcementModel: asValue(Announcement),
    nftModel: asValue(Nft),
    photoModel: asValue(Photo),
    postModel: asValue(Post),
    gameModel: asValue(Game),
    adModel: asValue(Ad),

    // --- Core Utilities (asValue or asFunction) ---
    // Register wrappers or complex utility functions
    solanaUtils: asValue(solanaUtils), // If you have a file with misc Solana utilities
    cacheUtility: asValue(cacheUtility), // Your generic caching utility (e.g., wrapper around Redis calls)
    jwtUtility: asValue(jwtUtility), // JWT token generation/verification utility

    // --- Services (asFunction or asClass with Singleton Lifetime) ---
    // Define services as functions or classes, specifying their dependencies.
    // Use `Lifetime.SINGLETON` for services that maintain state or manage external connections.

    // Core infrastructure services
    eventService: asFunction(eventService).singleton(), // EventEmitter wrapper for internal events
    cacheService: asFunction(cacheService).singleton(), // Depends on redisClient, logger
    queueService: asFunction(queueService).singleton(), // Depends on rabbitMQPublisher, rabbitMQQueues, logger
    circuitBreakerService: asFunction(circuitBreakerService).singleton(), // Depends on logger

    // Domain-specific services
    // AuthService depends on userModel, jwtUtility, logger, eventService
    authService: asFunction(authService).singleton(),

    // TransactionService depends on logger, solanaConnection, solanaPublicKey, LAMPORTS_PER_SOL
    // (Note: The actual `transactionService` implementation will need `solanaConnection` to do real transactions)
    transactionService: asFunction(transactionService).singleton(),

    // AnnouncementService depends on announcementModel, eventService, cacheService, queueService
    announcementService: asFunction(announcementService).singleton(),

    // NftService depends on nftModel, userModel, solanaSimulator/solanaConnection,
    // eventService, transactionService, cacheService, queueService, circuitBreakerService, logger
    nftService: asFunction(nftService).singleton(),

    // UserService depends on userModel, solanaConnection/getSolBalance, eventService, cacheService, logger
    userService: asFunction(userService).singleton(),

    // PhotoService depends on photoModel, logger, eventService, queueService
    photoService: asFunction(photoService).singleton(),

    // Register other services similarly
    // postService: asFunction(postService).singleton(),
    // gameService: asFunction(gameService).singleton(),
    // adService: asFunction(adService).singleton(),
});

module.exports = container;
