const mongoose = require('mongoose');

// --- Recommended: Extract validators into a separate utilities file ---
// This promotes reusability and keeps your models clean.
// Example content for backend/utils/validators.js:
// const { PublicKey } = require('@solana/web3.js'); // Make sure 'web3.js' is installed
// const isURL = require('validator/lib/isURL');    // Make sure 'validator' is installed (npm install validator)

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
// function isValidURL(url) {
//     if (url === '') return true; // Allow empty string
//     return isURL(url, { require_protocol: true }); // Require http/https
// }
//
// module.exports = { isValidSolanaAddress, isValidURL };


// Assuming isValidSolanaAddress is imported from '../utils/validators'
const { isValidSolanaAddress } = require('../utils/validators'); 

const daoProposalSchema = new mongoose.Schema({
    // Title of the DAO proposal. Required.
    title: {
        type: String,
        required: [true, 'Proposal title is required.'],
        trim: true,
        minlength: [5, 'Proposal title must be at least 5 characters long.'],
        maxlength: [200, 'Proposal title cannot exceed 200 characters.']
    },
    // Detailed description of the DAO proposal. Required.
    description: {
        type: String,
        required: [true, 'Proposal description is required.'],
        trim: true,
        minlength: [20, 'Proposal description must be at least 20 characters long.'],
        maxlength: [5000, 'Proposal description cannot exceed 5000 characters.']
    },
    // The Solana wallet address of the proposal's creator. Required.
    creatorWallet: {
        type: String,
        required: [true, 'Creator wallet address is required.'],
        trim: true,
        validate: {
            validator: isValidSolanaAddress, // Using the centralized Solana address validator
            message: props => `${props.value} is not a valid Solana wallet address format for the creator!`
        }
    },
    // Count of 'for' votes received.
    votesFor: {
        type: Number,
        default: 0,
        min: [0, 'Votes for cannot be negative.']
    },
    // Count of 'against' votes received.
    votesAgainst: {
        type: Number,
        default: 0,
        min: [0, 'Votes against cannot be negative.']
    },
    // An array of unique wallet addresses that have already voted on this proposal.
    // This helps in preventing duplicate votes from the same wallet.
    voters: {
        type: [String], // An array where each element is a string (wallet address)
        default: [], // Defaults to an empty array
        validate: {
            validator: function(votersArray) {
                // If the array is empty or null, it's valid (no voters yet).
                if (!votersArray || votersArray.length === 0) return true;
                // Otherwise, validate that every wallet address in the array conforms to the Solana format.
                const allWalletsValid = votersArray.every(isValidSolanaAddress); // Use the shared utility
                if (!allWalletsValid) return false;

                // Ensure no duplicate wallets within the array itself
                const uniqueVoters = new Set(votersArray);
                return uniqueVoters.size === votersArray.length;
            },
            message: 'Voters list contains invalid Solana wallet addresses or duplicates.' // Updated message
        }
    },
    // The date and time when the voting period for the proposal ends.
    expiresAt: {
        type: Date,
        required: [true, 'The expiration date for the proposal is required.'],
        validate: {
            validator: function(value) {
                // When creating a new proposal, the expiration date must be in the future.
                // This validation applies at the time of document creation/validation.
                return value > Date.now();
            },
            message: props => `The expiration date (${props.value}) must be in the future for an active proposal.`
        }
    },
    // The current status of the proposal, restricting it to predefined values.
    status: {
        type: String,
        enum: {
            values: ['active', 'completed'], // Only 'active' or 'completed' are allowed statuses
            message: 'Proposal status must be either "active" or "completed".'
        },
        default: 'active', // New proposals default to 'active'
        index: true // Add an index for faster lookups by status
    }
}, {
    // Schema options:
    // `timestamps: true` automatically adds `createdAt` and `updatedAt` fields.
    // `createdAt` stores the timestamp when the document was first created.
    // `updatedAt` stores the timestamp of the last update to the document.
    timestamps: true
});

module.exports = mongoose.model('DaoProposal', daoProposalSchema);
