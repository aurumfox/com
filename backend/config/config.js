// config/config.js
const { PublicKey } = require('@solana/web3.js'); // Нужен для валидации адреса Solana

// --- Utility Functions (moved from server.js) ---

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
// Robust CORS origin parsing and default.
const ALLOWED_CORS_ORIGINS = process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',').map(s => s.trim()) : ['http://127.0.0.1:5500', 'http://localhost:5500'];
// BASE_URL should be your deployed domain (e.g., https://api.yourapp.com)
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
const JWT_SECRET = process.env.JWT_SECRET;
const MARKETPLACE_ESCROW_WALLET = process.env.MARKETPLACE_ESCROW_WALLET || 'GDk2UfqfWPepQBZB8BMVMCUnbLbhRCuhK6VzLBpR2HAr';

// --- Validation (Moved from server.js for centralized checking) ---

if (!JWT_SECRET || JWT_SECRET.length < 32) {
    console.error('ERROR: JWT_SECRET environment variable is missing or too short. Please set a strong, random secret (e.g., 32+ characters) in your .env file.');
    process.exit(1);
}
if (!MONGODB_URI) {
    console.error('ERROR: MONGODB_URI environment variable is missing. Please set your MongoDB connection string in your .env file.');
    process.exit(1);
}
if (!MARKETPLACE_ESCROW_WALLET || !isValidSolanaAddress(MARKETPLACE_ESCROW_WALLET)) {
    console.warn('WARNING: MARKETPLACE_ESCROW_WALLET is missing or invalid. Using placeholder. Set a real Solana address for production.');
}


module.exports = {
    PORT,
    MONGODB_URI,
    ALLOWED_CORS_ORIGINS,
    BASE_URL,
    JWT_SECRET,
    MARKETPLACE_ESCROW_WALLET,
    isValidSolanaAddress // Export the utility function for use in models/controllers
};
