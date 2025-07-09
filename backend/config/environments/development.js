/**
 * @file Development environment configuration for the Aurum Fox Unified Portal API.
 * This file defines settings tailored for local development, prioritizing ease of use,
 * detailed logging, and broad access for local testing.
 */

module.exports = {
    // --- Server & Network Configuration ---
    port: process.env.PORT || 3000,
    host: process.env.HOST || 'localhost', // Listen only on localhost by default
    NODE_ENV: 'development', // Explicitly set Node.js environment

    // --- Database & Cache URIs ---
    mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/solana_dapp_dev_db', // Use a separate DB for dev
    redisUri: process.env.REDIS_URI || 'redis://localhost:6379',
    rabbitmqUri: process.env.RABBITMQ_URI || 'amqp://localhost',

    // --- Security & Authentication (relaxed for dev) ---
    jwtSecret: process.env.JWT_SECRET || 'dev_jwt_secret_CHANGE_ME_IN_PROD_NEVER_USE_THIS_IN_PROD', // Easier to debug locally
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h', // Shorter expiry for faster token invalidation during dev
    jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'dev_jwt_refresh_secret_CHANGE_ME_IN_PROD_NEVER_USE_THIS_IN_PROD',
    jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',

    // CORS Configuration (more permissive for local development)
    corsOrigins: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',').map(o => o.trim()) : [
        'http://127.0.0.1:5500',    // Common for VS Code Live Server
        'http://localhost:5500',
        'http://localhost:3000',    // Your own backend's origin
        'http://localhost:4200',    // Common for Angular dev server
        'http://localhost:8080',    // Common for React/Vue dev server
        'http://localhost:5173',    // Common for Vite dev server
        'http://127.0.0.1:3000',
        'http://127.0.0.1:4200',
        'http://127.0.0.1:8080',
        'http://127.0.0.1:5173',
        /\.vercel\.app$/, // Allow Vercel preview deployments if needed
        /\.ngrok\.io$/,   // Allow ngrok tunnels for testing webhooks/local dev
        'capacitor://localhost', // For Capacitor/Ionic mobile app development
        'app://localhost' // For Electron or other custom schema apps
    ],
    corsMethods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    corsAllowedHeaders: 'Content-Type,Authorization,X-Requested-With,Accept,Origin',
    corsCredentials: true,

    // Helmet Security Middleware (can be disabled or relaxed for dev)
    enableHelmet: false, // Often disabled in dev to inspect headers more easily, or for specific tooling
    // Rate Limiting (often disabled in dev to avoid hitting limits during testing)
    enableRateLimiting: false,

    // --- Logging & Monitoring ---
    logLevel: process.env.LOG_LEVEL || 'debug', // Detailed logging for development
    logFilePath: process.env.LOG_FILE_PATH || 'logs/development/application', // Separate logs for dev
    errorLogFilePath: process.env.ERROR_LOG_FILE_PATH || 'logs/development/error',

    // --- Solana & Blockchain Configuration ---
    solanaCluster: process.env.SOLANA_CLUSTER || 'devnet', // Default to devnet for local development
    solanaRpcUrl: process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com', // Default Devnet RPC
    solanaWsUrl: process.env.SOLANA_WS_URL || 'wss://api.devnet.solana.com/', // Default Devnet WS
    solanaCommitment: process.env.SOLANA_COMMITMENT || 'confirmed',
    // Mock or development wallet addresses (can be hardcoded or from a dev env file)
    solanaTreasuryWallet: process.env.SOLANA_TREASURY_WALLET || 'DEV_TREASURY_WALLET_ADDRESS_HERE',
    solanaPlatformFeeWallet: process.env.SOLANA_PLATFORM_FEE_WALLET || 'DEV_PLATFORM_FEE_WALLET_ADDRESS_HERE',
    solanaNftMarketplaceProgramId: process.env.SOLANA_NFT_MARKETPLACE_PROGRAM_ID || 'DEV_NFT_MARKETPLACE_PROGRAM_ID_HERE',

    // --- File Storage (local for dev) ---
    fileStorageProvider: process.env.FILE_STORAGE_PROVIDER || 'local', // Use local storage for development
    // No need for AWS S3 keys in development if using 'local' provider

    // --- Email Service (mock or disabled for dev) ---
    emailServiceEnabled: process.env.EMAIL_SERVICE_ENABLED === 'true' || false, // Usually false in dev
    emailServiceProvider: 'console', // Log emails to console instead of sending
    // No need for SendGrid/SMTP keys in development if using 'console' provider
    emailFromAddress: 'dev-noreply@aurumfox.com',

    // --- Admin & Initial Setup ---
    // A simple, known password for local development admin user (for ease of testing)
    defaultAdminPassword: process.env.DEFAULT_ADMIN_PASSWORD || 'aurumfoxdevadmin',
    initialAdminEmail: process.env.INITIAL_ADMIN_EMAIL || 'dev-admin@aurumfox.com',

    // --- Other External Service URLs/API Keys ---
    // Use mock URLs or sandbox API keys for external services in development
    externalServiceApiKey: process.env.EXTERNAL_SERVICE_API_KEY || 'dev_external_api_key',
    externalServiceBaseUrl: process.env.EXTERNAL_SERVICE_BASE_URL || 'http://localhost:9999/mock-service', // Example mock service
};
