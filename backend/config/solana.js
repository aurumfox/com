// config/solana.js
// IMPORTANT: Uncomment and configure for real Solana interactions.
// const { Connection, clusterApiUrl, PublicKey, LAMPORTS_PER_SOL } = require('@solana/web3.js');
// const logger = require('./logger');

// const SOLANA_CLUSTER = process.env.SOLANA_CLUSTER || 'devnet'; // e.g., 'devnet', 'testnet', 'mainnet-beta'
// const SOLANA_CLUSTER_URL = clusterApiUrl(SOLANA_CLUSTER);

// let solanaConnection;

// const getSolanaConnection = () => {
//     if (!solanaConnection) {
//         solanaConnection = new Connection(SOLANA_CLUSTER_URL, 'confirmed');
//         logger.info(`Solana connection established to ${SOLANA_CLUSTER} at ${SOLANA_CLUSTER_URL}`);
//     }
//     return solanaConnection;
// };

// module.exports = {
//     getSolanaConnection,
//     LAMPORTS_PER_SOL,
//     SOLANA_CLUSTER,
//     // You might export other keypairs if your backend holds any (e.g., for a fee payer or marketplace program owner)
// };
