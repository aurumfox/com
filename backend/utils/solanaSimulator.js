const logger = require('../config/logger');
// In a real dApp, you would use these:
// const { Connection, PublicKey, Keypair, Transaction, SystemProgram, LAMPORTS_PER_SOL } = require('@solana/web3.js');
// const { Token, TOKEN_PROGRAM_ID } = require('@solana/spl-token');

// --- Real Solana Connection Setup (for when you switch off simulation) ---
// This would typically be in a separate file like `config/solana.js` or `utils/solanaConnection.js`
let _solanaConnection = null;
const getSolanaConnection = () => {
    if (!_solanaConnection) {
        // Replace with your desired cluster (e.g., 'mainnet-beta', 'devnet', 'testnet', or a custom RPC URL)
        // You might also want to manage this via environment variables.
        // _solanaConnection = new Connection('devnet', 'confirmed');
        // logger.info('Initialized real Solana Connection to Devnet.');
        
        // For now, always return null to enforce simulation
        logger.warn('Real Solana Connection is not initialized. Using simulator.');
        return null; 
    }
    return _solanaConnection;
};


// --- Simulated Data Storage (for a more consistent simulation state) ---
// In a real dApp, this data would come from the blockchain and your database.
const simulatedAccountBalances = {
    // Example: Assign initial SOL balances to dummy addresses
    'SIMULATED_WALLET_ADDRESS_ABCDEF': { lamports: 5 * 1e9 }, // 5 SOL
    'SIMULATED_WALLET_ADDRESS_GHIJKL': { lamports: 10 * 1e9 }, // 10 SOL
};

const simulatedTokenBalances = {
    // { walletAddress: { mintAddress: uiAmount } }
    'SIMULATED_WALLET_ADDRESS_ABCDEF': {
        'AFOX_TOKEN_MINT_SIMULATED_1': 1000.50,
        'USDC_TOKEN_MINT_SIMULATED_2': 2500.75,
    },
    'SIMULATED_WALLET_ADDRESS_GHIJKL': {
        'AFOX_TOKEN_MINT_SIMULATED_1': 500.00,
        'SOME_OTHER_TOKEN_MINT': 123.45,
    },
};

const simulatedTransactions = {}; // Stores simulated transaction details by signature


// --- Solana Simulation Functions ---

/**
 * Simulates a Solana wallet connection for local development.
 * In a real dApp, this would involve client-side wallet adapters and actual PublicKeys.
 * @param {string} dummyAddress - A dummy Base58 address string to simulate.
 * @returns {object} - Simulated wallet object with a `publicKey` object that mimics `solana/web3.js` PublicKey.
 */
const simulateWalletConnection = (dummyAddress = 'SIMULATED_WALLET_ADDRESS_ABCDEF') => {
    logger.debug(`Simulating wallet connection for: ${dummyAddress}`);
    return {
        publicKey: {
            toBase58: () => dummyAddress,
            equals: (otherPublicKey) => otherPublicKey.toBase58() === dummyAddress,
            // Add other essential PublicKey methods if needed for deeper simulation
            // For example, if your code calls .toBuffer() or .toString()
            toString: () => dummyAddress,
            // Add a placeholder for `toBuffer` if your code uses it
            toBuffer: () => Buffer.from(dummyAddress),
        },
        // In a real scenario, these would involve actual wallet interactions:
        // signTransaction: async (transaction) => { logger.info('Simulating signTransaction'); return transaction; },
        // signAllTransactions: async (transactions) => { logger.info('Simulating signAllTransactions'); return transactions; },
    };
};

/**
 * Simulates sending a Solana transaction and records it.
 * In a real dApp, this would involve `sendAndConfirmTransaction` with a real `Connection`.
 * @param {object} transaction - The simulated transaction object (can be a simplified representation).
 * @param {Array<object>} signers - Simulated signers (e.g., Keypair objects in real scenario).
 * @param {string} type - A string indicating the type of simulated transaction (e.g., 'stake', 'unstake', 'transfer').
 * @param {string} senderAddress - The sender's wallet address.
 * @param {number} amount - The amount involved in the transaction.
 * @param {string} [recipientAddress=null] - The recipient's wallet address if applicable.
 * @returns {Promise<string>} - Simulated transaction signature.
 */
const simulateSendTransaction = async (transaction, signers = [], type, senderAddress, amount, recipientAddress = null) => {
    const simulatedSignature = `SIMULATED_TXN_SIGNATURE_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    logger.info(`Simulating transaction send. Type: ${type}, Sender: ${senderAddress}, Amount: ${amount}, Signature: ${simulatedSignature}`);

    // Store transaction details for later verification
    simulatedTransactions[simulatedSignature] = {
        type,
        senderAddress,
        amount,
        recipientAddress, // Will be null for stake/claim if not relevant
        timestamp: Date.now(),
        status: 'finalized', // Simulate successful finalization
        // Add more details from the simulated 'transaction' object if needed for advanced verification
    };

    // In a real scenario:
    // const connection = getSolanaConnection();
    // if (!connection) throw new Error('Solana connection not available.');
    // const signature = await sendAndConfirmTransaction(connection, transaction, signers);
    // return signature;

    return simulatedSignature;
};

/**
 * Simulates fetching account info (e.g., balance in lamports).
 * @param {string} address - The Base58 address string to query.
 * @returns {Promise<object | null>} - Simulated account info or null if not found.
 */
const simulateGetAccountInfo = async (address) => {
    logger.debug(`Simulating fetching account info for: ${address}`);
    const accountInfo = simulatedAccountBalances[address];

    if (accountInfo) {
        return {
            lamports: accountInfo.lamports,
            owner: '11111111111111111111111111111111', // System Program ID (dummy)
            executable: false,
            rentEpoch: 0,
            data: [], // Dummy data
        };
    }
    logger.warn(`Simulated account not found for: ${address}`);
    return null; // Simulate account not found
};

/**
 * Simulates fetching SPL token accounts for a given owner.
 * @param {string} ownerAddress - The owner's Base58 address string.
 * @param {object} [options={}] - Optional parameters (e.g., `mint` for filtering by token mint).
 * @returns {Promise<{value: Array<object>}>} - Simulated parsed token accounts.
 */
const simulateGetParsedTokenAccountsByOwner = async (ownerAddress, options = {}) => {
    logger.debug(`Simulating fetching SPL token accounts for owner: ${ownerAddress}`);
    const ownerTokens = simulatedTokenBalances[ownerAddress] || {};
    const resultValue = [];

    for (const mint in ownerTokens) {
        // Filter by mint if specified in options
        if (options.mint && options.mint !== mint) {
            continue;
        }

        resultValue.push({
            pubkey: {
                toBase58: () => `SIMULATED_TOKEN_ACC_${mint.substring(0, 5)}_${ownerAddress.substring(0, 5)}`,
                // Add other PublicKey methods as needed
            },
            account: {
                data: {
                    parsed: {
                        info: {
                            mint: mint,
                            tokenAmount: {
                                uiAmount: ownerTokens[mint],
                                decimals: 9, // Common for SPL tokens, adjust as needed
                                amount: (ownerTokens[mint] * (10 ** 9)).toString(), // Raw amount as string
                            },
                        },
                        type: 'Account',
                    },
                    program: 'spl-token',
                    space: 165,
                },
                executable: false,
                lamports: 2039280, // Dummy rent-exempt lamports
                owner: 'TokenkegQfeZyiNwAJbNbFxbonaZwsJQGCFvx5yrUi', // SPL Token Program ID
                rentEpoch: 0,
            },
        });
    }

    return { value: resultValue };
};

/**
 * Simulates verifying a Solana transaction signature by looking up stored simulated transactions.
 * This function is used by the backend to verify client-provided transaction signatures.
 * @param {string} signature - The transaction signature to verify.
 * @param {string} expectedSender - The expected sender's wallet address (from authenticated user).
 * @param {number} expectedAmount - The expected amount involved in the transaction.
 * @param {string} expectedType - The expected type of transaction (e.g., 'stake', 'claim', 'unstake', 'buy', 'transfer').
 * @param {string} [expectedRecipient=null] - The expected recipient address for verification (e.g., staking program, new NFT owner).
 * @returns {Promise<boolean>} - True if the transaction is successfully simulated and verified, false otherwise.
 */
const verifyTransactionSignature = async (signature, expectedSender, expectedAmount, expectedType, expectedRecipient = null) => {
    logger.debug(`Simulating verification for signature: ${signature}`);
    const tx = simulatedTransactions[signature];

    if (!tx) {
        logger.warn(`Verification failed: Signature ${signature} not found in simulated transactions.`);
        return false;
    }

    // Basic sanity checks against the stored simulated transaction
    if (tx.senderAddress.toLowerCase() !== expectedSender.toLowerCase()) {
        logger.warn(`Verification failed: Expected sender ${expectedSender}, got ${tx.senderAddress} for ${signature}.`);
        return false;
    }

    // Allow a small tolerance for floating point comparisons, or enforce exact match if using integers
    const amountTolerance = 0.00000001; // Adjust as needed
    if (Math.abs(tx.amount - expectedAmount) > amountTolerance) {
        logger.warn(`Verification failed: Expected amount ${expectedAmount}, got ${tx.amount} for ${signature}.`);
        return false;
    }

    if (tx.type !== expectedType) {
        logger.warn(`Verification failed: Expected type ${expectedType}, got ${tx.type} for ${signature}.`);
        return false;
    }

    if (expectedRecipient && tx.recipientAddress && tx.recipientAddress.toLowerCase() !== expectedRecipient.toLowerCase()) {
        logger.warn(`Verification failed: Expected recipient ${expectedRecipient}, got ${tx.recipientAddress} for ${signature}.`);
        return false;
    }

    // Simulate real-world transaction finalization check
    if (tx.status !== 'finalized') {
        logger.warn(`Verification failed: Transaction ${signature} is not finalized.`);
        return false;
    }

    logger.info(`Simulated verification SUCCESS for signature: ${signature}, Type: ${expectedType}`);
    return true;
};


module.exports = {
    getSolanaConnection, // Export this for when you transition to real Solana
    simulateWalletConnection,
    simulateSendTransaction,
    simulateGetAccountInfo,
    simulateGetParsedTokenAccountsByOwner,
    verifyTransactionSignature, // New, crucial function for backend verification
};
