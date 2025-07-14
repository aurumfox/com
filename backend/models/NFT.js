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

// Assuming isValidSolanaAddress and isValidURL are imported from '../utils/validators'
const { isValidSolanaAddress, isValidURL } = require('../utils/validators'); 

// Define the Mongoose schema for an NFT
const nftSchema = new mongoose.Schema({
    // Name of the NFT (e.g., "My Awesome NFT #1"). Required.
    name: {
        type: String,
        required: [true, 'NFT name is required.'],
        trim: true,
        minlength: [1, 'NFT name must not be empty.'],
        maxlength: [100, 'NFT name cannot exceed 100 characters.']
    },
    // Detailed description of the NFT, providing context and unique features. Required.
    description: {
        type: String,
        required: [true, 'NFT description is required.'],
        trim: true,
        minlength: [10, 'NFT description must be at least 10 characters long.'],
        maxlength: [2000, 'NFT description cannot exceed 2000 characters.']
    },
    // URL pointing to the NFT's image (e.g., IPFS gateway link, Arweave URL, or your server's path). Required.
    image: {
        type: String,
        required: [true, 'NFT image URL is required.'],
        trim: true,
        maxlength: [500, 'Image URL cannot exceed 500 characters.'],
        validate: {
            validator: isValidURL, // Using the centralized URL validator
            message: props => `${props.value} is not a valid image URL.`
        }
    },
    // The unique Solana mint address (public key) for this NFT. On-chain identifier. Required.
    mint: {
        type: String,
        unique: true, // Ensures every NFT document has a unique mint address
        required: [true, 'NFT mint address is required.'],
        trim: true,
        validate: {
            validator: isValidSolanaAddress, // Using the centralized Solana address validator
            message: props => `${props.value} is not a valid Solana mint address format.`
        }
    },
    // The Solana wallet address of the current owner of this NFT. Required.
    owner: {
        type: String,
        required: [true, 'NFT owner wallet address is required.'],
        trim: true,
        validate: {
            validator: isValidSolanaAddress, // Using the centralized Solana address validator
            message: props => `${props.value} is not a valid Solana owner wallet address format.`
        }
    },
    // The Solana wallet address of the original creator of the NFT. Required.
    creatorWallet: {
        type: String,
        required: [true, 'NFT creator wallet address is required.'],
        trim: true,
        validate: {
            validator: isValidSolanaAddress, // Using the centralized Solana address validator
            message: props => `${props.value} is not a valid Solana creator wallet address format.`
        }
    },
    // NFT attributes, typically an array of objects like [{ "trait_type": "Color", "value": "Red" }].
    // Using `mongoose.Schema.Types.Mixed` offers flexibility.
    attributes: {
        type: [mongoose.Schema.Types.Mixed],
        default: [],
        // Optional: Add custom validation if you need to enforce specific structures for each attribute object.
        // For example, to ensure each attribute has 'trait_type' and 'value'.
        // This is a common pattern for NFT metadata validation.
        validate: {
            validator: function(attrs) {
                if (!attrs || attrs.length === 0) return true; // Empty array is valid
                return attrs.every(attr => 
                    typeof attr === 'object' && 
                    attr !== null && 
                    'trait_type' in attr && typeof attr.trait_type === 'string' && attr.trait_type.trim().length > 0 &&
                    'value' in attr && (typeof attr.value === 'string' || typeof attr.value === 'number') // Value can be string or number
                );
            },
            message: 'Each attribute must be an object with non-empty "trait_type" (string) and "value" (string or number).'
        }
    },
    // Boolean flag indicating whether the NFT is currently listed for sale on a marketplace.
    isListed: {
        type: Boolean,
        default: false
    },
    // The price of the NFT in SOL (or other cryptocurrency) if it is listed for sale.
    price: {
        type: Number,
        default: null,
        min: [0, 'Price cannot be negative.'],
        // Custom validator to enforce logical consistency between `isListed` and `price`.
        validate: {
            validator: function(value) {
                if (this.isListed && (value === null || value === undefined)) {
                    return false; // If listed, price cannot be null or undefined
                }
                if (!this.isListed && (value !== null && value !== undefined)) {
                    // If not listed, price must be null. Allow 0 if it represents "not listed"
                    // or explicit handling for "free" NFTs. For now, enforcing null.
                    return false; 
                }
                return true;
            },
            message: 'Price must be a number if listed for sale, and null if not listed.'
        }
    },
    // Date representing when the NFT was minted or acquired by the initial owner.
    // This is distinct from `createdAt` (when the record was added to *this* database).
    acquisitionDate: {
        type: Date,
        default: Date.now
    }
}, {
    // Schema options:
    // `timestamps: true` automatically adds `createdAt` and `updatedAt` fields.
    timestamps: true
});

// Define indexes to improve query performance on frequently searched fields.
// Mongoose automatically creates a unique index for `mint` due to `unique: true`.
nftSchema.index({ owner: 1 });
nftSchema.index({ creatorWallet: 1 });
nftSchema.index({ isListed: 1, price: 1 }); // Compound index for marketplace listings
nftSchema.index({ name: 1 }); // Adding an index on name for search/sorting

module.exports = mongoose.model('NFT', nftSchema);
