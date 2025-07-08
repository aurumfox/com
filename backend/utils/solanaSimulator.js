// utils/solanaSimulator.js
const logger = require('../config/logger');
// const { Connection, PublicKey, Keypair, Transaction, SystemProgram, LAMPORTS_PER_SOL } = require('@solana/web3.js'); // Uncomment for real Solana
// const { Token, TOKEN_PROGRAM_ID } = require('@solana/spl-token'); // Uncomment for real SPL tokens

/**
 * Simulates a Solana wallet connection and provides a dummy PublicKey.
 * In a real dApp, this would involve client-side wallet adapters.
 * @param {string} dummyAddress - A dummy address to simulate.
 * @returns {object} - Simulated wallet object with a publicKey.
 */
const simulateWalletConnection = (dummyAddress = 'SIMULATED_WALLET_ADDRESS_ABCDEF') => {
    logger.debug(`Simulating wallet connection for: ${dummyAddress}`);
    return {
        publicKey: {
            toBase58: () => dummyAddress,
            // Add other PublicKey methods if needed for deeper simulation
        },
        // signTransaction: async (transaction) => { /* simulate signing */ return transaction; },
        // signAllTransactions: async (transactions) => { /* simulate signing */ return transactions; },
    };
};

/**
 * Simulates sending a Solana transaction.
 * In a real dApp, this would involve `sendAndConfirmTransaction`.
 * @param {object} transaction - The simulated transaction object.
 * @param {Array<object>} signers - Simulated signers (e.g., Keypair objects).
 * @returns {Promise<string>} - Simulated transaction signature.
 */
const simulateSendTransaction = async (transaction, signers = []) => {
    const simulatedSignature = `SIMULATED_TXN_SIGNATURE_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    logger.info(`Simulating transaction send. Signature: ${simulatedSignature}`);
    // In a real scenario:
    // const connection = getSolanaConnection();
    // const signature = await sendAndConfirmTransaction(connection, transaction, signers);
    // return signature;
    return simulatedSignature;
};

/**
 * Simulates fetching account info (e.g., balance).
 * @param {string} address - The address to query.
 * @returns {Promise<object>} - Simulated account info.
 */
const simulateGetAccountInfo = async (address) => {
    logger.debug(`Simulating fetching account info for: ${address}`);
    return {
        lamports: Math.floor(Math.random() * 10 * 1e9) + 1e8, // Random lamports between 0.1 and 10 SOL
        owner: '11111111111111111111111111111111', // System Program ID
        executable: false,
        rentEpoch: 0,
        data: [],
    };
};

/**
 * Simulates fetching SPL token accounts.
 * @param {string} ownerAddress - The owner's address.
 * @returns {Promise<Array<object>>} - Simulated token accounts.
 */
const simulateGetParsedTokenAccountsByOwner = async (ownerAddress) => {
    logger.debug(`Simulating fetching SPL token accounts for: ${ownerAddress}`);
    return {
        value: [
            {
                pubkey: { toBase58: () => `SIMULATED_TOKEN_ACC_1_${ownerAddress.substring(0, 5)}` },
                account: {
                    data: {
                        parsed: {
                            info: {
                                mint: 'AFOX_TOKEN_MINT_SIMULATED_1',
                                tokenAmount: { uiAmount: parseFloat((Math.random() * 1000).toFixed(2)) },
                            },
                        },
                    },
                },
            },
            {
                pubkey: { toBase58: () => `SIMULATED_TOKEN_ACC_2_${ownerAddress.substring(0, 5)}` },
                account: {
                    data: {
                        parsed: {
                            info: {
                                mint: 'USDC_TOKEN_MINT_SIMULATED_2',
                                tokenAmount: { uiAmount: parseFloat((Math.random() * 5000).toFixed(2)) },
                            },
                        },
                    },
                },
            },
        ],
    };
};

module.exports = {
    simulateWalletConnection,
    simulateSendTransaction,
    simulateGetAccountInfo,
    simulateGetParsedTokenAccountsByOwner,
    // Add more simulation functions as needed (e.g., for NFT metadata, program calls)
};
