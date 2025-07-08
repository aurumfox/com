// config/constants.js
const API_VERSIONS = {
    V1: '/api/v1',
};

const ROLES = {
    USER: 'user',
    ADMIN: 'admin',
    DEVELOPER: 'developer',
    PUBLISHER: 'publisher',
    ADVERTISER: 'advertiser',
};

const ALLOWED_MIME_TYPES = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'video/mp4', 'video/webm', 'video/ogg',
    'application/json', // For NFT metadata
    'text/html', 'application/javascript', 'application/x-javascript' // For game files (html/js)
];

// In a real dApp, you might manage marketplace owner wallets or program IDs here
const MARKETPLACE_CONFIG = {
    ESCROW_WALLET_ADDRESS: "MARKETPLACE_ESCROW_WALLET_ADDRESS_HERE", // Replace with real address
    PROGRAM_ID: "YOUR_SOLANA_MARKETPLACE_PROGRAM_ID", // If you have a custom program
};


module.exports = {
    API_VERSIONS,
    ROLES,
    ALLOWED_MIME_TYPES,
    MARKETPLACE_CONFIG,
};
