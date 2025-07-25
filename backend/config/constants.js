/**
 * @file Centralized application constants.
 * This file defines various fixed values, configurations, and enumerations
 * used throughout the Aurum Fox Unified Portal backend, promoting consistency
 * and ease of management.
 */

// --- API & Routing Constants ---
const API_VERSIONS = {
    V1: '/api/v1',
    // V2: '/api/v2', // Example for future API versioning
};

const ROUTES = {
    AUTH: '/auth',
    USERS: '/users',
    ANNOUNCEMENTS: '/announcements',
    NFTS: '/nfts',
    PHOTOS: '/photos',
    POSTS: '/posts',
    GAMES: '/games',
    ADS: '/ads',
    METRICS: '/metrics', // For Prometheus metrics endpoint
    HEALTH: '/health',   // For health check endpoint
};

// --- User & Authorization Constants ---
const ROLES = {
    USER: 'user',
    ADMIN: 'admin',
    DEVELOPER: 'developer', // Can perform dev-specific actions (e.g., minting in devnet)
    PUBLISHER: 'publisher', // For content creators (e.g., game publishers, blog post authors)
    ADVERTISER: 'advertiser', // For ad campaign management
};

const JWT_CONFIG = {
    SECRET: process.env.JWT_SECRET || 'supersecretjwtkeyfallback_CHANGE_ME_IN_PROD', // IMPORTANT: Use a strong, env-based secret
    EXPIRES_IN: process.env.JWT_EXPIRES_IN || '1d', // e.g., '1h', '7d'
    REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'supersecretjwtrefreshkey_CHANGE_ME_IN_PROD', // For refresh tokens
    REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
};

// --- File Upload & Media Constants ---
const ALLOWED_MIME_TYPES = {
    IMAGES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
    VIDEOS: ['video/mp4', 'video/webm', 'video/ogg'],
    NFT_METADATA: ['application/json'], // For NFT JSON metadata files
    GAME_FILES: ['text/html', 'application/javascript', 'application/x-javascript', 'application/json', 'image/png', 'image/jpeg'], // Common game asset types
    DOCUMENTS: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    ALL_MEDIA: [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
        'video/mp4', 'video/webm', 'video/ogg',
        'application/json' // For metadata
    ]
};

const UPLOAD_CONFIG = {
    MAX_FILE_SIZE_BYTES: 10 * 1024 * 1024, // 10 MB default max file size
    IMAGE_UPLOAD_DIR: 'uploads/images',
    NFT_UPLOAD_DIR: 'uploads/nfts', // Directory for NFT images/metadata
    GAME_UPLOAD_DIR: 'uploads/games', // Directory for game files
    // Add other specific upload directories as needed
};

// --- Solana & Blockchain Constants ---
const SOLANA_CONFIG = {
    // These should ideally be loaded from environment variables or a specific blockchain config file,
    // but defining them here indicates where they belong.
    CLUSTER: process.env.SOLANA_CLUSTER || 'devnet', // e.g., 'devnet', 'testnet', 'mainnet-beta'
    PROGRAM_IDS: {
        // Your custom program IDs, if any
        NFT_MARKETPLACE: process.env.SOLANA_NFT_MARKETPLACE_PROGRAM_ID || 'NFT_MARKETPLACE_PROGRAM_ID_HERE',
        TOKEN_PROGRAM: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5mW', // Standard SPL Token Program ID
        ASSOCIATED_TOKEN_PROGRAM: 'ATokenGPvbdGVxr1b2hvZgMqHd8lSLFUxg72fwWgseR2', // Standard Associated Token Program ID
    },
    WALLET_ADDRESSES: {
        // Wallet addresses that your backend directly controls or interacts with (e.g., fee receivers)
        TREASURY: process.env.SOLANA_TREASURY_WALLET || 'GDk2UfqfWPepQBZB8BMVMCUnbLbhRCuhK6VzLBpR2HAr',
        PLATFORM_FEE_WALLET: process.env.SOLANA_PLATFORM_FEE_WALLET || 'GDk2UfqfWPepQBZB8BMVMCUnbLbhRCuhK6VzLBpR2HAr',
    },
    TRANSACTION_TIMEOUT_MS: 30000, // Timeout for Solana transactions in milliseconds
    CONFIRMATION_COMMITMENT: 'confirmed', // 'processed', 'confirmed', 'finalized'
    LAMPORTS_PER_SOL: 1_000_000_000, // 1 billion lamports in a SOL
};

// --- Caching & Queueing Constants ---
const CACHE_KEYS = {
    ALL_ANNOUNCEMENTS: 'all_announcements',
    ALL_NFTS: 'all_nfts',
    NFT_BY_ID: (id) => `nft:${id}`,
    USER_PROFILE: (walletAddress) => `user:${walletAddress}:profile`,
    // Add other cache key patterns
};

const QUEUE_NAMES = {
    NFT_MINT_REQUEST: 'nft_mint_request',
    NFT_LIST_EVENT: 'nft_list_event',
    NFT_PURCHASE_EVENT: 'nft_purchase_event',
    USER_REGISTERED_EVENT: 'user_registered_event',
    EMAIL_NOTIFICATION: 'email_notification',
    // Add other queue names for specific events or tasks
};

// --- General Application Constants ---
const APP_NAME = "Aurum Fox Unified Portal";
const DEFAULT_PAGINATION_LIMIT = 10;
const MAX_PAGINATION_LIMIT = 100;
const DEFAULT_SORT_ORDER = 'desc';

module.exports = {
    API_VERSIONS,
    ROUTES,
    ROLES,
    JWT_CONFIG,
    ALLOWED_MIME_TYPES,
    UPLOAD_CONFIG,
    SOLANA_CONFIG,
    CACHE_KEYS,
    QUEUE_NAMES,
    APP_NAME,
    DEFAULT_PAGINATION_LIMIT,
    MAX_PAGINATION_LIMIT,
    DEFAULT_SORT_ORDER,
};
