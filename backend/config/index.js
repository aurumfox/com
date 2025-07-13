// config/index.js

require('dotenv').config(); // Load environment variables first thing

const { PublicKey } = require('@solana/web3.js'); // Import for Solana address validation

// --- Utility function for Solana address validation ---
function isValidSolanaAddress(address) {
    if (typeof address !== 'string' || address.length < 32 || address.length > 44) {
        return false;
    }
    try {
        new PublicKey(address);
        return true;
    } catch (e) {
        return false;
    }
}

// --- Configuration Variables ---
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;
const ALLOWED_CORS_ORIGINS = process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',').map(s => s.trim()) : ['http://127.0.0.1:5500', 'http://localhost:5500'];
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
const JWT_SECRET = process.env.JWT_SECRET;
const MARKETPLACE_ESCROW_WALLET = process.env.MARKETPLACE_ESCROW_WALLET;

// --- Security & Configuration Checks ---
if (!JWT_SECRET || JWT_SECRET.length < 32) {
    console.error('ERROR: JWT_SECRET environment variable is missing or too short. Please set a strong, random secret (e.g., 32+ characters) in your .env file.');
    process.exit(1);
}
if (!MONGODB_URI) {
    console.error('ERROR: MONGODB_URI environment variable is missing. Please set your MongoDB connection string in your .env file.');
    process.exit(1);
}
if (!MARKETPLACE_ESCROW_WALLET || !isValidSolanaAddress(MARKETPLACE_ESCROW_WALLET)) {
    console.warn('WARNING: MARKETPLACE_ESCROW_WALLET environment variable is missing or invalid. Set a real Solana address for production.');
}

// IMPORTANT: For production, DEFAULT_ADMIN_PASSWORD, DEFAULT_TEST_PASSWORD etc.
// should be set as strong, unique values in your .env or removed from seeding.
const DEFAULT_ADMIN_PASSWORD = process.env.DEFAULT_ADMIN_PASSWORD || 'ChangeMeAdmin123!';
const DEFAULT_TEST_PASSWORD = process.env.DEFAULT_TEST_PASSWORD || 'ChangeMeTest123!';
const DEFAULT_DEV_PASSWORD = process.env.DEFAULT_DEV_PASSWORD || 'ChangeMeDev123!';
const DEFAULT_AD_PASSWORD = process.env.DEFAULT_AD_PASSWORD || 'ChangeMeAd123!';
const DEFAULT_PUB_PASSWORD = process.env.DEFAULT_PUB_PASSWORD || 'ChangeMePub123!';


module.exports = {
    PORT,
    MONGODB_URI,
    ALLOWED_CORS_ORIGINS,
    BASE_URL,
    JWT_SECRET,
    MARKETPLACE_ESCROW_WALLET,
    isValidSolanaAddress, // Export the utility for use in other files
    DEFAULT_ADMIN_PASSWORD,
    DEFAULT_TEST_PASSWORD,
    DEFAULT_DEV_PASSWORD,
    DEFAULT_AD_PASSWORD,
    DEFAULT_PUB_PASSWORD
};
