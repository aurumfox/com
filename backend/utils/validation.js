// utils/solanaValidation.js
// IMPORTANT: You will need to install @solana/web3.js: npm install @solana/web3.js
const { PublicKey } = require('@solana/web3.js'); 

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

module.exports = { isValidSolanaAddress };
