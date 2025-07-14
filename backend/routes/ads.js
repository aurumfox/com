const express = require('express');
const router = express.Router();
const Joi = require('joi'); // For robust request body validation
const Ad = require('../models/Ad');

// --- Centralized Utilities ---
// Assuming these are now in backend/utils/validators.js and backend/utils/solanaUtils.js
const { isValidSolanaAddress } = require('../utils/validators'); 
const { verifySignature } = require('../utils/solanaUtils'); // Ensure this file is created and functional

// --- Joi Schema for Ad Creation Request Body Validation ---
// This schema defines the expected structure and validation rules for the incoming request body.
const adCreationSchema = Joi.object({
    title: Joi.string().trim().min(3).max(100).required()
        .messages({
            'string.empty': 'Ad title cannot be empty.',
            'string.min': 'Ad title must be at least 3 characters long.',
            'string.max': 'Ad title cannot exceed 100 characters.',
            'any.required': 'Ad title is required.'
        }),
    content: Joi.string().trim().min(10).max(500).required()
        .messages({
            'string.empty': 'Ad content cannot be empty.',
            'string.min': 'Ad content must be at least 10 characters long.',
            'string.max': 'Ad content cannot exceed 500 characters.',
            'any.required': 'Ad content is required.'
        }),
    advertiser: Joi.string().trim().required()
        .custom((value, helpers) => { // Custom Joi validation using our utility
            if (!isValidSolanaAddress(value)) {
                return helpers.message('The provided advertiser wallet address is not a valid Solana public key format.');
            }
            return value;
        })
        .messages({
            'string.empty': 'Advertiser wallet address cannot be empty.',
            'any.required': 'Advertiser wallet address is required.'
        }),
    link: Joi.string().uri().max(500).allow('').default('') // .uri() checks for valid URL format
        .messages({
            'string.uri': 'Link must be a valid URL.',
            'string.max': 'Link URL cannot exceed 500 characters.'
        }),
    imageUrl: Joi.string().uri().max(500).allow('').default('') // .uri() checks for valid URL format
        .messages({
            'string.uri': 'Image URL must be a valid URL.',
            'string.max': 'Image URL cannot exceed 500 characters.'
        }),
    signature: Joi.string().trim().required() // Signature is required for Web3 auth
        .messages({
            'string.empty': 'Wallet signature cannot be empty.',
            'any.required': 'Wallet signature is required for authentication.'
        })
});


// --- GET All Advertisements ---
// Fetches all advertisements from the database, sorted by their creation date (newest first).
router.get('/', async (req, res) => {
    try {
        const ads = await Ad.find().sort({ createdAt: -1 });
        res.json(ads);
    } catch (error) {
        console.error('Error fetching advertisements:', error);
        res.status(500).json({ message: 'Failed to retrieve advertisements. Please try again later.' });
    }
});

// --- POST Place a New Advertisement ---
// Allows a user to submit a new advertisement, with Web3 signature authentication.
router.post('/', async (req, res) => {
    try {
        // 1. Validate Request Body using Joi
        const { error, value } = adCreationSchema.validate(req.body);
        if (error) {
            console.warn('Joi validation failed for new ad:', error.details.map(d => d.message));
            return res.status(400).json({ 
                message: 'Invalid advertisement data provided.', 
                errors: error.details.map(d => d.message) 
            });
        }

        const { title, content, advertiser, link, imageUrl, signature } = value;

        // 2. Web3 Security Enhancement: Verify Wallet Signature
        // This is CRUCIAL for a Web3 application.
        // The frontend should send a signed message (e.g., a hash of the ad data, or a unique nonce)
        // using the 'advertiser's private key via their wallet (like Phantom).
        // For robustness, consider signing a nonce obtained from the backend.
        const messageToVerify = JSON.stringify({ title, content, advertiser }); // Example message structure

        const isSignatureValid = await verifySignature(advertiser, messageToVerify, signature);
        if (!isSignatureValid) {
            console.warn(`Signature verification failed for wallet: ${advertiser}`);
            return res.status(403).json({ message: 'Invalid wallet signature. Authentication failed for the advertiser.' });
        }

        // 3. Create and Save New Ad Document
        const newAd = new Ad({
            title,
            content,
            advertiser,
            link,
            imageUrl
            // createdAt and updatedAt are handled by Mongoose timestamps
        });

        const savedAd = await newAd.save();
        res.status(201).json({
            message: 'Advertisement successfully posted!',
            ad: savedAd
        });

    } catch (error) {
        // 4. Handle Mongoose Validation Errors (if any escaped Joi or for schema-level inconsistencies)
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            console.warn('Mongoose validation failed for new ad:', errors);
            return res.status(400).json({ message: 'Database validation failed for advertisement data.', errors });
        }
        // 5. Handle Other Server Errors
        console.error('Error in POST /api/ads:', error);
        res.status(500).json({ message: 'Failed to post advertisement due to a server error. Please try again.', error: error.message });
    }
});

module.exports = router;
