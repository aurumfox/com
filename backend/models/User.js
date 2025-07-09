const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// --- Recommended: Extract roles into a separate configuration file ---
// Example: ../config/constants.js
// export const ROLES = {
//   USER: 'user',
//   ADMIN: 'admin',
//   DEVELOPER: 'developer',
//   ADVERTISER: 'advertiser',
//   PUBLISHER: 'publisher',
// };
// Assuming ROLES is imported from '../config/constants'
const { ROLES } = require('../config/constants'); 

const userSchema = new mongoose.Schema({
    // Username can be optional if the primary identifier is the wallet
    username: {
        type: String,
        required: false, // Can be optional if user registers via wallet
        unique: true,
        sparse: true, // Allows multiple documents to have a null unique value (for optional fields)
        trim: true,
        minlength: 3,
        maxlength: 30 // Limit maximum length
    },
    // walletAddress will be the primary identifier for the dApp
    walletAddress: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 32, // Solana public keys are 32-44 chars (base58)
        maxlength: 44,
        index: true // Add an index for faster lookups by wallet address
    },
    password: { // Will store the hashed password
        type: String,
        required: true,
        minlength: 8 // Increase minimum password length for better security
    },
    role: { // User's role
        type: String,
        enum: Object.values(ROLES), // Ensures the role is one of the predefined roles
        default: ROLES.USER,
        required: true // Role should always be present
    },
    // Additional user-related fields as needed
    // For example:
    // email: {
    //     type: String,
    //     unique: true,
    //     sparse: true, // Allows multiple documents to have a null unique value
    //     trim: true,
    //     lowercase: true,
    //     match: [/.+@.+\..+/, 'Please enter a valid email address']
    // },
    // profilePicture: {
    //     type: String, // URL to the profile picture
    //     default: 'https://example.com/default-avatar.png' 
    // },
    // bio: {
    //     type: String,
    //     trim: true,
    //     maxlength: 500
    // }
}, {
    timestamps: true // Automatically adds createdAt and updatedAt fields
});

// --- Pre-save hook: Hash password before saving ---
userSchema.pre('save', async function(next) {
    // Only hash the password if it has been modified (or is new)
    if (!this.isModified('password')) {
        return next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// --- Method for comparing passwords ---
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// --- Configure toJSON to remove sensitive fields and transform _id ---
// This ensures that when user data is sent to the client,
// the password is not included, and _id is transformed to id.
userSchema.set('toJSON', {
    virtuals: true, // Includes virtual fields (e.g., 'id')
    transform: (doc, ret) => {
        delete ret._id;       // Remove the internal _id
        delete ret.__v;       // Remove the document version key
        delete ret.password;  // Remove the hashed password from the response
        return ret;
    }
});

const User = mongoose.model('User', userSchema);

module.exports = User;
