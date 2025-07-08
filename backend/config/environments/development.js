// config/environments/development.js
module.exports = {
    port: process.env.PORT || 3000,
    mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/solana_dapp_db',
    redisUri: process.env.REDIS_URI || 'redis://localhost:6379',
    rabbitmqUri: process.env.RABBITMQ_URI || 'amqp://localhost',
    jwtSecret: process.env.JWT_SECRET || 'your_super_secret_jwt_key_please_change_this_in_production',
    corsOrigins: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : ['http://127.0.0.1:5500', 'http://localhost:5500', 'http://localhost:3000'],
    defaultAdminPassword: process.env.DEFAULT_ADMIN_PASSWORD || 'adminpassword',
    logLevel: 'debug', // Detailed logging for development
    // Add other development-specific settings
};
