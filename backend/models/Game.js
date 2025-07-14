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

const gameSchema = new mongoose.Schema({
    // Title of the game. Required.
    title: {
        type: String,
        required: [true, 'Game title is required.'],
        trim: true,
        minlength: [3, 'Game title must be at least 3 characters long.'],
        maxlength: [100, 'Game title cannot exceed 100 characters.']
    },
    // Detailed description of the game. Required.
    description: {
        type: String,
        required: [true, 'Game description is required.'],
        trim: true,
        minlength: [20, 'Game description must be at least 20 characters long.'],
        maxlength: [5000, 'Game description cannot exceed 5000 characters.']
    },
    // The Solana wallet address of the developer. Required.
    developer: {
        type: String,
        required: [true, 'Developer wallet address is required.'],
        trim: true,
        validate: {
            validator: isValidSolanaAddress, // Using the centralized Solana address validator
            message: props => `${props.value} is not a valid Solana wallet address for the developer!`
        }
    },
    // URL of the game's page or official website.
    url: {
        type: String,
        trim: true,
        default: '',
        maxlength: [500, 'URL cannot exceed 500 characters.'],
        validate: {
            validator: isValidURL, // Using the centralized URL validator
            message: props => `${props.value} is not a valid URL.`
        }
    },
    // Release date of the game. Defaults to the current date if not provided.
    // This field serves a different purpose than 'createdAt' (which is when the record was added to DB).
    releaseDate: {
        type: Date,
        default: Date.now,
        // Optional: Add validation that the date is not in the future, if it's a past release date.
        // Uncomment the following if you want to enforce this.
        // validate: {
        //     validator: function(value) {
        //         return value <= Date.now();
        //     },
        //     message: 'Release date cannot be in the future.'
        // }
    },
    // Genres the game belongs to. Array of predefined strings.
    genres: {
        type: [String],
        default: [],
        enum: {
            values: ['Action', 'Adventure', 'RPG', 'Strategy', 'Simulation', 'Sports', 'Puzzle', 'Horror', 'Sci-Fi', 'Fantasy', 'Indie', 'MMO', 'Racing', 'Fighting', 'Casual', 'Educational', 'Party', 'Board Game'], // Expanded example genres
            message: '{VALUE} is not a valid genre.'
        }
    },
    // Platforms the game is available on. Array of predefined strings.
    platforms: {
        type: [String],
        default: [],
        enum: {
            values: ['PC', 'PlayStation', 'Xbox', 'Nintendo Switch', 'Mobile (iOS)', 'Mobile (Android)', 'Browser', 'VR', 'Mac', 'Linux'], // Expanded example platforms
            message: '{VALUE} is not a valid platform.'
        }
    },
    // Array of URL strings for game screenshots.
    screenshots: {
        type: [String],
        default: [],
        validate: {
            validator: function(urls) {
                if (!urls || urls.length === 0) return true; // Empty array is valid
                return urls.every(isValidURL); // Validate each URL using the shared utility
            },
            message: 'One or more screenshot URLs are invalid.'
        }
    },
    // Optional: Game rating (e.g., from 1-5 stars, or an ESRB/PEGI rating)
    // rating: {
    //     type: Number,
    //     min: 1,
    //     max: 5,
    //     default: null // Can be null if not rated yet
    // },
    // Optional: Status of the game (e.g., 'released', 'in development', 'early access')
    // status: {
    //     type: String,
    //     enum: ['released', 'in development', 'early access', 'cancelled'],
    //     default: 'released'
    // }
}, {
    // Schema options:
    // `timestamps: true` automatically adds `createdAt` and `updatedAt` fields.
    timestamps: true
});

module.exports = mongoose.model('Game', gameSchema);
