// utils/solanaUtils.js
// IMPORTANT: Uncomment @solana/web3.js for actual validation and connection
// const { PublicKey, Connection, clusterApiUrl } = require('@solana/web3.js');
const config = require('../config');

function isValidSolanaAddress(address) {
    if (typeof address !== 'string') return false;
    // For real validation using @solana/web3.js:
    // try {
    //     new PublicKey(address);
    //     return true;
    // } catch (e) {
    //     return false;
    // }
    // Placeholder for now (basic string check):
    return address.length >= 32 && address.length <= 44 && /^[1-9A-HJ-NP-Za-km-z]+$/.test(address);
}

// Function to get a Solana Connection instance (if needed in controllers)
// const getConnection = () => {
//     return new Connection(clusterApiUrl(config.solanaCluster), 'confirmed');
// };

module.exports = { isValidSolanaAddress /*, getConnection */ };
