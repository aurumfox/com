const express = require('express');
const router = express.Router();
const Joi = require('joi'); // For robust request body/params validation
const StakingUser = require('../models/StakingUser');

// --- Centralized Middleware & Utilities ---
const { authenticateToken } = require('../middleware/authMiddleware'); // For JWT authentication
const { validate, schemas } = require('../middleware/validationMiddleware'); // Joi validation middleware and schemas
// Make sure joiSolanaAddress is defined in your validationMiddleware.js or a shared Joi extension
const { isValidSolanaAddress } = require('../utils/validators'); // Centralized Solana address validator
const { verifyTransactionSignature } = require('../utils/solanaUtils'); // Placeholder for actual on-chain transaction verification

// --- Staking Configuration ---
const STAKING_APR = 0.10; // 10% Annual Percentage Rate
const MS_PER_DAY = 1000 * 60 * 60 * 24; // Milliseconds in a day for calculation

// --- Custom Joi Validators (if not already in validationMiddleware.js) ---
// These are defined here for clarity but should ideally reside in `validationMiddleware.js`
// or a shared Joi extension for reusability across all schemas.
const joiSolanaAddress = Joi.string().trim().required().custom((value, helpers) => {
    if (!isValidSolanaAddress(value)) {
        return helpers.message('Must be a valid Solana wallet address format.');
    }
    return value;
});

// --- Joi Schemas for Staking Operations ---

const getStakingDataSchema = Joi.object({
    walletAddress: joiSolanaAddress // Validate wallet address from URL params
});

const stakeSchema = Joi.object({
    walletAddress: joiSolanaAddress,
    amount: Joi.number().positive().required() // Staking amount must be positive
        .messages({
            'number.base': 'Amount must be a number.',
            'number.positive': 'Staking amount must be positive.',
            'any.required': 'Staking amount is required.'
        }),
    transactionSignature: Joi.string().trim().required() // CRITICAL: Signature for on-chain verification
        .messages({
            'string.empty': 'Transaction signature cannot be empty.',
            'any.required': 'Transaction signature is required for staking.'
        })
});

const claimUnstakeSchema = Joi.object({
    walletAddress: joiSolanaAddress,
    transactionSignature: Joi.string().trim().required() // CRITICAL: Signature for on-chain verification
        .messages({
            'string.empty': 'Transaction signature cannot be empty.',
            'any.required': 'Transaction signature is required.'
        })
});


// --- Helper Function to calculate rewards ---
// This function calculates rewards based on time elapsed and staked amount.
// NOTE: For highly precise and secure reward calculation in production, consider:
// 1. Storing amounts in smallest token units (integers) to avoid floating-point errors.
// 2. Performing reward calculation on-chain where possible, or with a high-precision library (e.g., decimal.js).
function calculateRewards(stakedAmount, lastStakedOrUnstakedDate) {
    if (stakedAmount <= 0) return 0; // No staked amount, no rewards
    
    const now = Date.now();
    const lastDate = lastStakedOrUnstakedDate.getTime();
    
    // Ensure calculation only happens for positive time difference
    const timeDiffMs = Math.max(0, now - lastDate); 
    
    const dailyRate = STAKING_APR / 365; // Convert APR to daily rate
    const accruedRewards = stakedAmount * dailyRate * (timeDiffMs / MS_PER_DAY);

    return accruedRewards;
}

// --- Middleware for Wallet Authorization ---
// This middleware ensures that the walletAddress in the request (body or params)
// matches the walletAddress from the authenticated user's JWT.
const authorizeWallet = (location = 'body') => async (req, res, next) => {
    const targetWalletAddress = location === 'body' ? req.body.walletAddress : req.params.walletAddress;

    if (!req.user || req.user.walletAddress.toLowerCase() !== targetWalletAddress.toLowerCase()) {
        return res.status(403).json({ message: 'Forbidden: You are not authorized to access or modify staking data for this wallet.' });
    }
    next();
};


// --- GET User Staking Data ---
// Securely retrieves staking data for the authenticated user's wallet.
router.get(
    '/:walletAddress',
    validate(getStakingDataSchema), // Validate URL parameter format
    authorizeWallet('params'),      // Ensure authenticated user matches wallet in params
    async (req, res) => {
        try {
            const walletAddress = req.params.walletAddress; // Already validated and authorized
            const user = await StakingUser.findOne({ walletAddress });

            if (user) {
                // Calculate current rewards, including pending rewards, for display
                const currentRewards = user.rewards + calculateRewards(user.stakedAmount, user.lastStakedOrUnstaked);
                res.json({
                    stakedAmount: user.stakedAmount.toFixed(8), // Format for display
                    rewards: currentRewards.toFixed(8),         // Format for display
                    lastClaimed: user.lastClaimed ? user.lastClaimed.toISOString() : null,
                    lastStakedOrUnstaked: user.lastStakedOrUnstaked ? user.lastStakedOrUnstaked.toISOString() : null
                });
            } else {
                // If user not found, return initial staking state
                res.json({ stakedAmount: 0, rewards: 0, lastClaimed: null, lastStakedOrUnstaked: null });
            }
        } catch (err) {
            console.error('Error fetching user staking data:', err);
            res.status(500).json({ message: 'Internal Server Error: Could not retrieve staking data.' });
        }
    }
);

// --- POST Stake AFOX ---
// Allows an authenticated user to stake AFOX tokens.
// CRITICAL: On-chain transaction verification is paramount here.
router.post(
    '/stake',
    authenticateToken,         // 1. Authenticate the user
    validate(stakeSchema),     // 2. Validate request body (walletAddress, amount, transactionSignature)
    authorizeWallet('body'),   // 3. Ensure authenticated user matches wallet in body
    async (req, res) => {
        const { walletAddress, amount, transactionSignature } = req.validatedBody;

        try {
            // --- CRITICAL SECURITY STEP: Verify On-Chain Transaction ---
            // In a real dApp, you MUST verify that:
            // 1. The `transactionSignature` is valid and exists on the Solana blockchain.
            // 2. The transaction transferred `amount` AFOX from `walletAddress` to your staking program/vault.
            // 3. The transaction is finalized and not subject to reorgs (e.g., using commitment level 'confirmed' or 'finalized').
            const isTxValid = await verifyTransactionSignature(transactionSignature, walletAddress, amount, 'stake');
            if (!isTxValid) {
                return res.status(400).json({ message: 'Invalid or unconfirmed staking transaction. Please ensure the transaction was successful on-chain.' });
            }
            // --- END CRITICAL SECURITY STEP ---

            let user = await StakingUser.findOne({ walletAddress });

            if (!user) {
                user = new StakingUser({ walletAddress, stakedAmount: 0, rewards: 0, lastStakedOrUnstaked: new Date(), lastClaimed: null });
            } else {
                // If user exists, first accrue rewards from previous staking period before updating
                user.rewards += calculateRewards(user.stakedAmount, user.lastStakedOrUnstaked);
            }

            user.stakedAmount += amount;
            user.lastStakedOrUnstaked = new Date(); // Update timestamp of last activity

            await user.save();
            res.status(200).json({ message: 'Staking successful. Your balance will update shortly.', user });
        } catch (err) {
            console.error('Error during AFOX staking:', err);
            res.status(500).json({ message: 'Internal Server Error: Failed to process staking request.' });
        }
    }
);

// --- POST Claim Rewards ---
// Allows an authenticated user to claim accrued AFOX rewards.
// CRITICAL: On-chain transaction verification is paramount here.
router.post(
    '/claim-rewards',
    authenticateToken,         // 1. Authenticate the user
    validate(claimUnstakeSchema), // 2. Validate request body (walletAddress, transactionSignature)
    authorizeWallet('body'),   // 3. Ensure authenticated user matches wallet in body
    async (req, res) => {
        const { walletAddress, transactionSignature } = req.validatedBody;

        try {
            const user = await StakingUser.findOne({ walletAddress });
            if (!user) {
                return res.status(404).json({ message: 'Staking user not found.' });
            }

            // Calculate pending rewards to be claimed
            const totalClaimableRewards = user.rewards + calculateRewards(user.stakedAmount, user.lastStakedOrUnstaked);

            if (totalClaimableRewards <= 0) {
                return res.status(400).json({ message: 'No rewards to claim.' });
            }

            // --- CRITICAL SECURITY STEP: Verify On-Chain Transaction ---
            // In a real dApp, you MUST verify that:
            // 1. The `transactionSignature` is valid and exists on the Solana blockchain.
            // 2. This transaction was initiated by `walletAddress` to claim rewards from your smart contract.
            // 3. The transaction transferred `totalClaimableRewards` (or the exact amount claimed on-chain) to the user.
            const isTxValid = await verifyTransactionSignature(transactionSignature, walletAddress, totalClaimableRewards, 'claim');
            if (!isTxValid) {
                return res.status(400).json({ message: 'Invalid or unconfirmed claim transaction. Please ensure the transaction was successful on-chain.' });
            }
            // --- END CRITICAL SECURITY STEP ---

            // Reset rewards after successful on-chain verification
            user.rewards = 0;
            user.lastClaimed = new Date();
            user.lastStakedOrUnstaked = new Date(); // Reset reward calculation start time

            await user.save();
            res.status(200).json({ message: `Successfully claimed ${totalClaimableRewards.toFixed(8)} AFOX rewards.`, user });
        } catch (err) {
            console.error('Error claiming rewards:', err);
            res.status(500).json({ message: 'Internal Server Error: Failed to claim rewards.' });
        }
    }
);

// --- POST Unstake AFOX ---
// Allows an authenticated user to unstake AFOX tokens and claim remaining rewards.
// CRITICAL: On-chain transaction verification is paramount here.
router.post(
    '/unstake',
    authenticateToken,         // 1. Authenticate the user
    validate(claimUnstakeSchema), // 2. Validate request body (walletAddress, transactionSignature)
    authorizeWallet('body'),   // 3. Ensure authenticated user matches wallet in body
    async (req, res) => {
        const { walletAddress, transactionSignature } = req.validatedBody;

        try {
            const user = await StakingUser.findOne({ walletAddress });
            if (!user) {
                return res.status(404).json({ message: 'Staking user not found.' });
            }
            if (user.stakedAmount <= 0) {
                return res.status(400).json({ message: 'You have no AFOX staked to unstake.' });
            }

            // Calculate all remaining accrued rewards
            user.rewards += calculateRewards(user.stakedAmount, user.lastStakedOrUnstaked);
            const totalAmountToReturn = user.stakedAmount + user.rewards;

            // --- CRITICAL SECURITY STEP: Verify On-Chain Transaction ---
            // In a real dApp, you MUST verify that:
            // 1. The `transactionSignature` is valid and exists on the Solana blockchain.
            // 2. This transaction was initiated by `walletAddress` to unstake tokens from your smart contract.
            // 3. The transaction returned `totalAmountToReturn` (or the exact amount returned on-chain) to the user.
            const isTxValid = await verifyTransactionSignature(transactionSignature, walletAddress, totalAmountToReturn, 'unstake');
            if (!isTxValid) {
                return res.status(400).json({ message: 'Invalid or unconfirmed unstake transaction. Please ensure the transaction was successful on-chain.' });
            }
            // --- END CRITICAL SECURITY STEP ---

            // Reset stake and rewards after successful on-chain verification
            user.stakedAmount = 0;
            user.rewards = 0;
            user.lastStakedOrUnstaked = new Date(); // Update time
            user.lastClaimed = new Date();

            await user.save();
            res.status(200).json({ message: `Successfully unstaked ${totalAmountToReturn.toFixed(8)} AFOX.`, user });
        } catch (err) {
            console.error('Error during AFOX unstaking:', err);
            res.status(500).json({ message: 'Internal Server Error: Failed to process unstaking request.' });
        }
    }
);

module.exports = router;
