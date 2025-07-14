/**
 * @file Production environment configuration for the Aurum Fox Unified Portal API.
 * This file defines settings that are specific to the production deployment,
 * prioritizing security, performance, and external service integration.
 */

module.exports = {
    // --- Server & Network Configuration ---
    port: process.env.PORT || 8080, // Default to 8080 or a common service port. 80 requires root, often proxied.
    host: process.env.HOST || '0.0.0.0', // Listen on all network interfaces
    NODE_ENV: 'production', // Explicitly set Node.js environment

    // --- Database & Cache URIs (Critical) ---
    mongodbUri: process.env.MONGODB_URI,     // IMPORTANT: Must be set in production environment variables
    redisUri: process.env.REDIS_URI,         // IMPORTANT: Must be set in production environment variables
    rabbitmqUri: process.env.RABBITMQ_URI,   // IMPORTANT: Must be set in production environment variables

    // --- Security & Authentication ---
    jwtSecret: process.env.JWT_SECRET,       // IMPORTANT: Strong, unique secret, not hardcoded
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d', // e.g., '1h', '7d'
    jwtRefreshSecret: process.env.JWT_REFRESH_SECRET, // IMPORTANT: Strong, unique secret for refresh tokens
    jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',

    // CORS Configuration
    corsOrigins: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',').map(o => o.trim()) : ['https://yourproductiondomain.com', 'https://youranotherdomain.com'], // Trim whitespace
    corsMethods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    corsAllowedHeaders: 'Content-Type,Authorization,X-Requested-With,Accept,Origin',
    corsCredentials: true, // Allow cookies and auth headers to be sent cross-origin

    // Helmet Security Middleware (settings if overridden from defaults)
    enableHelmet: true, // Enable Helmet for setting security HTTP headers

    // Rate Limiting
    enableRateLimiting: true,
    rateLimitWindowMs: 15 * 60 * 1000, // 15 minutes
    rateLimitMaxRequests: 100, // max 100 requests per 15 minutes per IP

    // --- Logging & Monitoring ---
    logLevel: process.env.LOG_LEVEL || 'info', // Default to 'info', can be overridden for specific debugging
    logFilePath: process.env.LOG_FILE_PATH || '/var/log/aurumfox/application', // Production-ready log path
    errorLogFilePath: process.env.ERROR_LOG_FILE_PATH || '/var/log/aurumfox/error',

    // --- Solana & Blockchain Configuration ---
    solanaCluster: process.env.SOLANA_CLUSTER || 'mainnet-beta', // Typically mainnet in production
    solanaRpcUrl: process.env.SOLANA_RPC_URL, // Use a dedicated RPC endpoint provider (e.g., QuickNode, Alchemy)
    solanaWsUrl: process.env.SOLANA_WS_URL, // For WebSocket subscriptions (e.g., block confirmations, account changes)
    solanaCommitment: process.env.SOLANA_COMMITMENT || 'confirmed', // 'processed', 'confirmed', 'finalized'
    // Wallet addresses for your application's operations (e.g., treasury, fee collector)
    solanaTreasuryWallet: process.env.SOLANA_TREASURY_WALLET, // IMPORTANT: Must be securely managed
    solanaPlatformFeeWallet: process.env.SOLANA_PLATFORM_FEE_WALLET, // IMPORTANT: Must be securely managed
    // Program IDs for your custom Solana programs
    solanaNftMarketplaceProgramId: process.env.SOLANA_NFT_MARKETPLACE_PROGRAM_ID,


    // --- File Storage (e.g., S3, Google Cloud Storage) ---
    // If you're storing large files (NFT assets, game files, user photos) externally
    fileStorageProvider: process.env.FILE_STORAGE_PROVIDER || 'local', // 'aws_s3', 'gcs', 'local'
    awsS3BucketName: process.env.AWS_S3_BUCKET_NAME,
    awsRegion: process.env.AWS_REGION,
    awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID, // Use IAM roles in EC2/ECS if possible
    awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,

    // --- Email Service (for notifications) ---
    emailServiceEnabled: process.env.EMAIL_SERVICE_ENABLED === 'true',
    emailServiceProvider: process.env.EMAIL_SERVICE_PROVIDER || 'sendgrid', // 'sendgrid', 'nodemailer', 'ses'
    sendgridApiKey: process.env.SENDGRID_API_KEY,
    smtpHost: process.env.SMTP_HOST,
    smtpPort: process.env.SMTP_PORT,
    smtpUser: process.env.SMTP_USER,
    smtpPass: process.env.SMTP_PASS,
    emailFromAddress: process.env.EMAIL_FROM_ADDRESS || 'noreply@yourproductiondomain.com',

    // --- Admin & Initial Setup ---
    // This should ideally be removed or set to a very secure default that's immediately changed
    // ONLY FOR INITIAL DEPLOYMENT SETUP IF ABSOLUTELY NECESSARY
    defaultAdminPassword: process.env.DEFAULT_ADMIN_PASSWORD || null, // Best practice: null or very long random string
    initialAdminEmail: process.env.INITIAL_ADMIN_EMAIL || null, // For creating the first admin user

    // --- Other External Service URLs/API Keys ---
    // Example: third-party NFT data providers, payment gateways, analytics
    externalServiceApiKey: process.env.EXTERNAL_SERVICE_API_KEY,
    externalServiceBaseUrl: process.env.EXTERNAL_SERVICE_BASE_URL,
    // Add any other specific API keys or URLs for external integrations.
};
