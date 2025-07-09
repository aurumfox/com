/**
 * @file Configuration and utilities for interacting with the Solana blockchain.
 * This file should be uncommented and fully configured when real Solana
 * blockchain interactions are required.
 */

const { Connection, clusterApiUrl, PublicKey, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const logger = require('./logger'); // Ensure your logger is correctly configured

// Load environment variables. It's crucial to use a robust method like dotenv.
// If you're not using dotenv yet, you should: `npm install dotenv` and `require('dotenv').config();` at your app's entry point.
const SOLANA_CLUSTER = process.env.SOLANA_CLUSTER || 'devnet'; // Default to 'devnet' for development
const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || clusterApiUrl(SOLANA_CLUSTER); // Allow custom RPC URL

// You might also want to configure connection commitment level
const SOLANA_COMMITMENT = process.env.SOLANA_COMMITMENT || 'confirmed'; // 'processed', 'confirmed', 'finalized'

let solanaConnection = null; // Initialize as null to ensure lazy instantiation

/**
 * Establishes and returns a singleton Solana Connection instance.
 * The connection will be created only once.
 * @returns {Connection} The Solana Connection object.
 */
const getSolanaConnection = () => {
    if (!solanaConnection) {
        try {
            solanaConnection = new Connection(SOLANA_RPC_URL, SOLANA_COMMITMENT);
            logger.info(`Solana connection established to cluster: '${SOLANA_CLUSTER}' at URL: '${SOLANA_RPC_URL}' with commitment: '${SOLANA_COMMITMENT}'.`);
        } catch (error) {
            logger.error(`Failed to establish Solana connection to ${SOLANA_RPC_URL}: ${error.message}`);
            // Depending on your application's needs, you might want to:
            // 1. Throw the error to prevent the app from starting without a connection.
            // 2. Implement a retry mechanism.
            // For now, we'll log and let the application continue, but subsequent calls
            // requiring the connection will fail if it's truly broken.
            throw new Error(`Solana connection error: ${error.message}`);
        }
    }
    return solanaConnection;
};

/**
 * Verifies if a given string is a valid Solana public key.
 * @param {string} publicKeyString - The string to validate.
 * @returns {boolean} True if valid, false otherwise.
 */
const isValidSolanaPublicKey = (publicKeyString) => {
    try {
        new PublicKey(publicKeyString);
        return true;
    } catch (error) {
        logger.debug(`Invalid Solana public key string: ${publicKeyString} - ${error.message}`);
        return false;
    }
};

/**
 * Fetches the SOL balance for a given public key.
 * @param {string} publicKeyString - The wallet address (public key) to check.
 * @returns {Promise<number>} The balance in SOL.
 * @throws {Error} If the public key is invalid or fetching balance fails.
 */
const getSolBalance = async (publicKeyString) => {
    if (!isValidSolanaPublicKey(publicKeyString)) {
        throw new Error(`Invalid Solana public key format: ${publicKeyString}`);
    }

    const connection = getSolanaConnection();
    const publicKey = new PublicKey(publicKeyString);

    try {
        const balanceLamports = await connection.getBalance(publicKey);
        const balanceSOL = balanceLamports / LAMPORTS_PER_SOL;
        logger.debug(`Fetched SOL balance for ${publicKeyString}: ${balanceSOL} SOL`);
        return balanceSOL;
    } catch (error) {
        logger.error(`Failed to get SOL balance for ${publicKeyString}: ${error.message}`);
        throw new Error(`Could not fetch SOL balance: ${error.message}`);
    }
};

// --- Transaction Simulation (Example - could be in a separate 'solanaService') ---
/**
 * Simulates sending a transaction to the Solana blockchain.
 * This is a placeholder for actual transaction logic.
 * @param {Object} transactionData - Data describing the transaction (e.g., recipient, amount, instruction type).
 * @param {Array<string>} signers - Public keys of the simulated signers.
 * @returns {Promise<string>} A simulated transaction signature.
 */
const simulateSolanaTransaction = async (transactionData, signers) => {
    logger.info(`Simulating Solana transaction: ${JSON.stringify(transactionData)} with signers: ${JSON.stringify(signers)}`);
    // In a real scenario, this would involve:
    // 1. Constructing a Solana Transaction object.
    // 2. Adding instructions (e.g., SystemProgram.transfer, TokenProgram.transfer).
    // 3. Potentially fetching recent blockhash.
    // 4. Signing the transaction (if backend is a signer, usually client-side).
    // 5. Sending the transaction: `await connection.sendRawTransaction(transaction.serialize())`.
    // 6. Confirming the transaction: `await connection.confirmTransaction(signature)`.

    // For simulation, generate a fake signature
    const simulatedSignature = `SimulatedTxn_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    logger.info(`Simulated transaction successful. Signature: ${simulatedSignature}`);
    return simulatedSignature;
};


module.exports = {
    getSolanaConnection,
    LAMPORTS_PER_SOL,
    SOLANA_CLUSTER,
    SOLANA_RPC_URL, // Export the configured URL for verification/logging elsewhere
    SOLANA_COMMITMENT, // Export commitment level
    PublicKey, // Export PublicKey for convenience in other modules
    isValidSolanaPublicKey,
    getSolBalance,
    simulateSolanaTransaction, // Export for use in simulated environments
    // Add other Solana-related constants or utilities as needed
    // e.g., TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID etc.
};
