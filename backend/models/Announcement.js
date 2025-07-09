const mongoose = require('mongoose');

// --- Recommended: Extract validators into a separate utilities file ---
// This promotes reusability and keeps your models clean.
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
// module.exports = { isValidSolanaAddress };

// Assuming isValidSolanaAddress is imported from '../utils/validators'
const { isValidSolanaAddress } = require('../utils/validators'); 

const announcementSchema = new mongoose.Schema({
    // The main text content of the announcement.
    text: {
        type: String,
        required: [true, 'Announcement text is required.'],
        trim: true,
        minlength: [5, 'Announcement text must be at least 5 characters long.'],
        maxlength: [1000, 'Announcement text cannot exceed 1000 characters.']
    },
    // The Solana wallet address of the admin/publisher who created the announcement.
    // This field is required and includes schema-level validation for a valid Solana address format.
    authorWallet: {
        type: String,
        required: [true, 'Author wallet address is required.'],
        trim: true,
        validate: {
            validator: isValidSolanaAddress, // Using the centralized Solana address validator
            message: props => `${props.value} is not a valid Solana wallet address!`
        }
    }
    // Removed the 'date' field. The 'createdAt' field from 'timestamps: true'
    // serves the same purpose of recording the creation date of the announcement.
    // If you had a specific need for a *scheduled* or *publish* date distinct from creation,
    // you would add a field like 'publishDate: { type: Date }' instead.
}, {
    // Schema options:
    // `timestamps: true` automatically adds `createdAt` and `updatedAt` fields.
    // `createdAt` records the exact time the document was created.
    // `updatedAt` records the time of the last modification.
    timestamps: true
});

module.exports = mongoose.model('Announcement', announcementSchema);
