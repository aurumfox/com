// config/environments/production.js
module.exports = {
    port: process.env.PORT || 80, // Default to 80 for production
    mongodbUri: process.env.MONGODB_URI, // MUST be set in production env
    redisUri: process.env.REDIS_URI,     // MUST be set in production env
    rabbitmqUri: process.env.RABBITMQ_URI, // MUST be set in production env
    jwtSecret: process.env.JWT_SECRET,   // MUST be set in production env
    corsOrigins: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : ['https://yourproductiondomain.com'], // Restrict origins
    defaultAdminPassword: process.env.DEFAULT_ADMIN_PASSWORD, // Should be strong or removed after initial setup
    logLevel: 'info', // Less verbose logging for production
    // Add other production-specific settings (e.g., external service URLs, API keys)
};
