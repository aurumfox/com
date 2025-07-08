const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { ROLES } = require('../config/constants'); // Import roles

const userSchema = new mongoose.Schema({
    walletAddress: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 32, // Solana public keys are 32-44 chars (base58)
        maxlength: 44,
        index: true // NEW: Add index for faster lookups
    },
    password: {
        type: String,
        required: true,
        minlength: 8
    },
    role: {
        type: String,
        enum: Object.values(ROLES), // Ensure role is one of the defined roles
        default: ROLES.USER
    },
    // Add more user-related fields as needed
    // e.g., profilePicture: String, bio: String, email: String (if applicable)
}, {
    timestamps: true // Adds createdAt and updatedAt fields
});

// Hash password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        return next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Method to compare passwords
userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// Configure toJSON to remove sensitive fields and transform _id
userSchema.set('toJSON', {
    virtuals: true,
    transform: (doc, ret) => {
        delete ret._id;
        delete ret.__v;
        delete ret.password; // Remove password from response
        return ret;
    }
});

module.exports = mongoose.model('User', userSchema);
