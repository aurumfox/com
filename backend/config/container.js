// config/container.js
const { createContainer, asValue, asFunction, asClass } = require('awilix');
const logger = require('./logger');
const Nft = require('../models/Nft');
const User = require('../models/User');
const Announcement = require('../models/Announcement');
// Import services
const nftService = require('../services/nftService');
const userService = require('../services/userService');
const eventService = require('../services/eventService');
const transactionService = require('../services/transactionService');
const cacheService = require('../services/cacheService');
const queueService = require('../services/queueService'); // NEW
const circuitBreakerService = require('../services/circuitBreakerService'); // NEW

// Import utils
const solanaSimulator = require('../utils/solanaSimulator');
const cache = require('../utils/cache');
const { getRedisClient } = require('./redis');
const { getRabbitMQChannel } = require('./rabbitmq'); // NEW

const container = createContainer();

container.register({
    // Values
    logger: asValue(logger),
    getRedisClient: asValue(getRedisClient),
    getRabbitMQChannel: asValue(getRabbitMQChannel), // Pass RabbitMQ channel getter

    // Models
    nftModel: asValue(Nft),
    userModel: asValue(User),
    announcementModel: asValue(Announcement),
    // Register other models here

    // Utils
    solanaSimulator: asValue(solanaSimulator),
    cacheUtility: asValue(cache),

    // Services (as functions to inject dependencies)
    // Order matters for some dependencies
    eventService: asFunction(eventService).singleton(),
    cacheService: asFunction(cacheService).singleton(),
    queueService: asFunction(queueService).singleton(), // Depends on getRabbitMQChannel, logger
    transactionService: asFunction(transactionService).singleton(),
    circuitBreakerService: asFunction(circuitBreakerService).singleton(), // Depends on logger

    // NFT Service depends on models, utils, eventService, transactionService, cacheService, queueService, circuitBreakerService
    nftService: asFunction(({ nftModel, userModel, solanaSimulator, eventService, transactionService, cacheService, queueService, circuitBreakerService }) =>
        nftService(nftModel, userModel, solanaSimulator, eventService, transactionService, cacheService, queueService, circuitBreakerService)
    ).singleton(),

    // User Service depends on models, utils, eventService, cacheService
    userService: asFunction(({ userModel, solanaSimulator, eventService, cacheService }) =>
        userService(userModel, solanaSimulator, eventService, cacheService)
    ).singleton(),

    // Announcement Service depends on models, eventService, cacheService, queueService
    announcementService: asFunction(({ announcementModel, eventService, cacheService, queueService }) =>
        require('../services/announcementService')(announcementModel, eventService, cacheService, queueService)
    ).singleton(),

    // Register other services here, injecting their dependencies
});

module.exports = container;
