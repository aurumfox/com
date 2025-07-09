const mongoose = require('mongoose');

// --- Recommended: Extract validators into a separate utilities file ---
// Example content for backend/utils/validators.js:
// const { PublicKey } = require('@solana/web3.js'); // Make sure 'web3.js' is installed
//
// function isValidSolanaAddress(address) {
//     if (typeof address !== 'string' || address.length < 32 || address.length > 44) {
//         return false;
//     }
//     try {
//         new PublicKey(address); // Uses Solana SDK for robust cryptographic validation
//         return true;
//     } catch (e) {
//         return false;
//     }
// }
//
// module.exports = { isValidSolanaAddress, /* other validators like isValidURL */ };

// Assuming isValidSolanaAddress is imported from '../utils/validators'
const { isValidSolanaAddress } = require('../utils/validators'); 

const stakingUserSchema = new mongoose.Schema({
    // Unique identifier for the user's wallet address. Required and must be a valid Solana address.
    walletAddress: {
        type: String,
        required: [true, 'Wallet address is required for a staking user.'],
        unique: true, // Ensures each wallet has only one staking profile
        trim: true,
        validate: {
            validator: isValidSolanaAddress, // Using the centralized Solana address validator
            message: props => `${props.value} is not a valid Solana wallet address.`
        },
        index: true // Add an index for faster lookups by wallet address
    },
    // The total amount of tokens currently staked by the user.
    stakedAmount: {
        type: Number,
        default: 0,
        min: [0, 'Staked amount cannot be negative.'] // Ensures the staked amount will never be negative
    },
    // Accumulated rewards that the user has not yet claimed.
    rewards: {
        type: Number,
        default: 0,
        min: [0, 'Rewards cannot be negative.'] // Ensures rewards will never be negative
    },
    // Timestamp of the last time the user claimed their rewards.
    lastClaimed: {
        type: Date,
        default: Date.now,
        required: true // This field should always be present, even if default to now
    },
    // Timestamp of the last staking or unstaking action,
    // critically important for accurate reward calculation.
    lastStakedOrUnstaked: {
        type: Date,
        default: Date.now,
        required: true // This field should always be present, even if default to now
    }
}, {
    // Schema options:
    // `timestamps: true` automatically adds `createdAt` (date of creation) and `updatedAt` (date of last modification).
    timestamps: true
});

// Adding an index on `stakedAmount` could be useful for leaderboards or queries
// for users with significant stakes.
stakingUserSchema.index({ stakedAmount: -1 }); // Index for descending order of staked amount

module.exports = mongoose.model('StakingUser', stakingUserSchema);
