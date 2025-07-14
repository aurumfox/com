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

// Define the Mongoose schema for a 'Post' document.
const postSchema = new mongoose.Schema({
    // 'title' field: Required, trimmed, with min/max length constraints.
    title: {
        type: String,
        required: [true, 'Post title is required.'],
        trim: true,
        minlength: [3, 'Post title must be at least 3 characters long.'],
        maxlength: [100, 'Post title cannot exceed 100 characters.']
    },
    // 'content' field: Required, trimmed, with min/max length constraints.
    content: {
        type: String,
        required: [true, 'Post content is required.'],
        trim: true,
        minlength: [10, 'Post content must be at least 10 characters long.'],
        maxlength: [5000, 'Post content cannot exceed 5000 characters.']
    },
    // 'authorWallet' field: Required, trimmed, validated as a Solana wallet address.
    authorWallet: {
        type: String,
        required: [true, 'Author wallet address is required.'],
        trim: true,
        validate: {
            validator: isValidSolanaAddress, // Using the centralized Solana address validator
            message: props => `${props.value} is not a valid Solana wallet address.`
        }
    }
}, {
    // Schema options:
    // `timestamps: true` automatically adds `createdAt` and `updatedAt` Date fields to the schema.
    timestamps: true
});

// Add an index to the authorWallet for efficient lookup of posts by a specific author.
postSchema.index({ authorWallet: 1 });
// Add an index to the createdAt field for efficient sorting by creation date.
postSchema.index({ createdAt: -1 });

// Export the Mongoose model named 'Post'.
module.exports = mongoose.model('Post', postSchema);
