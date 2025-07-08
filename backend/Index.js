// config/index.js
require('dotenv').config();

const config = {
    port: process.env.PORT || 3000,
    mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/solana_dapp_db_default',
    corsOrigins: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : ['http://127.0.0.1:5500'],
    jwtSecret: process.env.JWT_SECRET || 'YOUR_SUPER_SECRET_JWT_KEY', // IMPORTANT: CHANGE THIS IN PRODUCTION
    solanaCluster: process.env.SOLANA_CLUSTER || 'devnet', // e.g., 'mainnet-beta', 'devnet', 'testnet'
    marketplaceEscrowWallet: process.env.MARKETPLACE_ESCROW_WALLET || 'MARKETPLACE_ESCROW_WALLET_ADDRESS_HERE_FOR_SIMULATION', // For simulation, in real dApp, this would be derived from program
    uploadDir: 'uploads/',
    uploadLimitBytes: 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'video/mp4', 'video/webm', 'video/ogg',
        'application/json',
        'text/html', 'application/javascript', 'application/x-javascript'
    ]
};

// Basic validation for critical variables
if (!config.jwtSecret || config.jwtSecret === 'YOUR_SUPER_SECRET_JWT_KEY') {
    console.warn('WARNING: JWT_SECRET is not set or is default. Please set a strong secret in your .env file!');
}
if (config.mongodbUri.includes('localhost') && process.env.NODE_ENV === 'production') {
    console.warn('WARNING: MongoDB URI is set to localhost in production. Please use a production-ready database URI!');
}

module.exports = config;
