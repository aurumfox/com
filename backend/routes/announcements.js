const express = require('express');
const router = express.Router();
const Joi = require('joi'); // For robust request body validation
const Announcement = require('../models/Announcement');

// --- Centralized Utilities and Configuration ---
// These files MUST be created and properly implemented in your backend/utils directory.

// 1. Solana Utility for Signature Verification (backend/utils/solanaUtils.js)
//    - This is CRUCIAL for proving actual wallet ownership and preventing spoofing.
//    - Make sure it's implemented to verify a message signed by a Solana wallet.
const { verifySignature } = require('../utils/solanaUtils'); // Ensure this file exists and is functional

// 2. Validators for Solana Addresses (backend/utils/validators.js)
//    - For consistent validation logic across all models and routes.
const { isValidSolanaAddress } = require('../utils/validators'); 

// 3. Admin Wallets Configuration:
//    - LOAD THIS SECURELY, E.G., FROM ENVIRONMENT VARIABLES (process.env.ADMIN_WALLETS).
//    - For demonstration, we'll keep it hardcoded, but this is NOT PRODUCTION-READY.
//    - ADMIN_WALLETS should be a comma-separated string in your .env (e.g., "ADDR1,ADDR2")
const ADMIN_WALLETS_ENV = process.env.ADMIN_WALLETS;
const AUTHORIZED_ADMIN_WALLETS = ADMIN_WALLETS_ENV 
    ? ADMIN_WALLETS_ENV.split(',').map(addr => addr.trim()) 
    : [
        "YOUR_ADMIN_SOLANA_WALLET_ADDRESS_1", // <<--- REPLACE WITH REAL ADMIN WALLET ADDRESSES
        "YOUR_ADMIN_SOLANA_WALLET_ADDRESS_2"  // <<--- IMPORTANT: DO NOT USE IN PRODUCTION WITHOUT SECURE LOADING
    ];
if (AUTHORIZED_ADMIN_WALLETS.includes("YOUR_ADMIN_SOLANA_WALLET_ADDRESS_1")) {
    console.warn("\nWARNING: ADMIN_WALLETS are still placeholders. Please configure ADMIN_WALLETS environment variable securely for production.\n");
}


// --- Joi Schema for Announcement Creation Request Body Validation ---
// This schema defines the expected structure and validation rules for the incoming request body.
const announcementCreationSchema = Joi.object({
    text: Joi.string().trim().min(5).max(1000).required()
        .messages({
            'string.empty': 'Announcement text cannot be empty.',
            'string.min': 'Announcement text must be at least 5 characters long.',
            'string.max': 'Announcement text cannot exceed 1000 characters.',
            'any.required': 'Announcement text is required.'
        }),
    authorWallet: Joi.string().trim().required()
        .custom((value, helpers) => { // Custom Joi validation using our utility
            if (!isValidSolanaAddress(value)) {
                return helpers.message('The provided author wallet address is not a valid Solana public key format.');
            }
            return value;
        })
        .messages({
            'string.empty': 'Author wallet address cannot be empty.',
            'any.required': 'Author wallet address is required.'
        }),
    signature: Joi.string().trim().required() // Signature is required for Web3 auth
        .messages({
            'string.empty': 'Wallet signature cannot be empty.',
            'any.required': 'Wallet signature is required for authentication.'
        })
});


// --- Middleware for Admin Authorization ---
// This middleware checks if the requesting wallet is an authorized administrator
// AND verifies the wallet's signature for the request.
const authorizeAdmin = async (req, res, next) => {
    // Validate request body for authorization details first
    const { error, value } = announcementCreationSchema.validate(req.body);
    if (error) {
        console.warn('Joi validation failed during admin authorization:', error.details.map(d => d.message));
        return res.status(400).json({ 
            message: 'Invalid request data for authorization.', 
            errors: error.details.map(d => d.message) 
        });
    }

    const { text, authorWallet, signature } = value; // Use the validated values

    // 1. Whitelist Check: Verify if the provided wallet address is in the list of authorized admins.
    if (!AUTHORIZED_ADMIN_WALLETS.includes(authorWallet)) {
        console.warn(`Unauthorized access attempt: Wallet ${authorWallet} is not an authorized administrator.`);
        return res.status(403).json({ message: 'Forbidden: Only authorized administrators can perform this action.' });
    }

    // 2. Web3 Signature Verification (CRUCIAL for proving actual wallet ownership)
    // This step verifies that the request was cryptographically signed by the 'authorWallet'.
    // For production, consider using a nonce to prevent replay attacks.
    const messageToVerify = JSON.stringify({ text, authorWallet }); // Signing the relevant data

    try {
        const isSignatureValid = await verifySignature(authorWallet, messageToVerify, signature);
        if (!isSignatureValid) {
            console.warn(`Signature verification failed for admin wallet: ${authorWallet}. Potentially spoofed request.`);
            return res.status(403).json({ message: 'Authentication failed: Invalid wallet signature.' });
        }
    } catch (sigError) {
        console.error('Server error during signature verification in authorizeAdmin:', sigError);
        return res.status(500).json({ message: 'Internal server error during signature verification. Please try again later.' });
    }

    // If all checks pass (Joi validation, whitelist, and signature), proceed
    req.validatedBody = value; // Attach validated data to request object for reuse in route
    next();
};


// --- Route: Get All Announcements ---
// Fetches all announcements from the database, sorted by their creation date (newest first).
router.get('/', async (req, res) => {
    try {
        const announcements = await Announcement.find().sort({ createdAt: -1 });
        res.json(announcements);
    } catch (error) {
        console.error('Error fetching announcements:', error);
        res.status(500).json({ message: 'Failed to retrieve announcements. An unexpected error occurred.' });
    }
});


// --- Route: Post a New Announcement ---
// This route is protected by the `authorizeAdmin` middleware, which handles
// request body validation (Joi) and Web3 signature verification.
router.post('/', authorizeAdmin, async (req, res) => {
    // The request body has already been validated and authorized by `authorizeAdmin` middleware.
    // We can directly use `req.validatedBody` which contains the clean, validated data.
    const { text, authorWallet } = req.validatedBody; 

    // 1. Create a new Announcement document based on the Mongoose model.
    const newAnnouncement = new Announcement({
        text,
        authorWallet
        // `createdAt` and `updatedAt` will be automatically populated by Mongoose.
    });

    // 2. Save the new announcement to the database.
    try {
        const savedAnnouncement = await newAnnouncement.save();
        res.status(201).json({
            message: 'Announcement successfully posted!',
            announcement: savedAnnouncement
        });
    } catch (error) {
        // 3. Handle Mongoose Validation Errors (e.g., if any schema-level consistency checks fail)
        // Joi catches most errors upfront, but Mongoose might catch edge cases or DB-specific issues.
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            console.warn('Mongoose validation failed during save for new announcement:', errors);
            return res.status(400).json({ message: 'Database validation failed for announcement data.', errors });
        }
        // 4. Handle Other Potential Server-Side Errors during the save operation.
        console.error('Error saving new announcement to database:', error);
        res.status(500).json({ message: 'Failed to post announcement due to an unexpected server error. Please try again.', error: error.message });
    }
});

module.exports = router;
