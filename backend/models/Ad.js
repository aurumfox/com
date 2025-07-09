const mongoose = require('mongoose');

// --- Recommended: Extract validators into a separate utilities file ---
// Example: backend/utils/validators.js
// const { PublicKey } = require('@solana/web3.js'); // Ensure 'web3.js' is installed
// const isURL = require('validator/lib/isURL');    // Ensure 'validator' is installed (npm install validator)

// function isValidSolanaAddress(address) {
//     if (typeof address !== 'string' || address.length < 32 || address.length > 44) {
//         return false;
//     }
//     try {
//         new PublicKey(address); // Uses Solana SDK for robust validation
//         return true;
//     } catch (e) {
//         return false;
//     }
// }

// function isValidURL(url) {
//     if (url === '') return true; // Allow empty string
//     return isURL(url, { require_protocol: true }); // Require http/https
// }

// module.exports = { isValidSolanaAddress, isValidURL };

// Assuming validators are imported from '../utils/validators'
const { isValidSolanaAddress, isValidURL } = require('../utils/validators'); 

const adSchema = new mongoose.Schema({
    // Title of the advertisement. Must be a string and is required.
    title: {
        type: String,
        required: [true, 'Ad title is required.'], // Custom error message
        trim: true, // Removes leading/trailing whitespace
        minlength: [3, 'Ad title must be at least 3 characters long.'], // Minimum length for quality
        maxlength: [100, 'Ad title cannot exceed 100 characters.'] // Maximum length to prevent bloat
    },
    // Main content or body of the advertisement. Must be a string and is required.
    content: {
        type: String,
        required: [true, 'Ad content is required.'], // Custom error message
        trim: true,
        minlength: [10, 'Ad content must be at least 10 characters long.'],
        maxlength: [500, 'Ad content cannot exceed 500 characters.'] // Reasonable length for ad content
    },
    // The wallet address of the advertiser. This should typically be a Solana public key.
    // Stored as a String, with a validator for base58 format.
    advertiser: {
        type: String,
        required: [true, 'Advertiser wallet address is required.'],
        trim: true,
        validate: {
            validator: isValidSolanaAddress, // Uses the shared validation utility
            message: props => `${props.value} is not a valid Solana wallet address!`
        }
    },
    // Optional URL link associated with the advertisement.
    link: {
        type: String,
        default: '', // Empty string by default
        trim: true,
        validate: {
            validator: isValidURL, // Uses the shared URL validation utility
            message: props => `${props.value} is not a valid URL!`
        }
    },
    // Optional URL to an image for the advertisement.
    imageUrl: {
        type: String,
        default: '', // Empty string by default
        trim: true,
        validate: {
            validator: isValidURL, // Uses the shared URL validation utility
            message: props => `${props.value} is not a valid image URL!`
        }
    }
}, {
    timestamps: true // Automatically adds `createdAt` (creation date) and `updatedAt` (last modification date) fields.
});

module.exports = mongoose.model('Ad', adSchema);
