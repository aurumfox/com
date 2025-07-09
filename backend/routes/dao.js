const express = require('express');
const router = express.Router();
const mongoose = require('mongoose'); // Still needed for ObjectId.isValid in custom Joi validator
const Joi = require('joi'); // For robust request body validation
const DaoProposal = require('../models/DaoProposal');

// --- Centralized Utilities (IMPORTANT: Ensure these files are created and functional) ---

// 1. Solana Utility for Signature Verification (backend/utils/solanaUtils.js)
//    - This is CRUCIAL for proving actual wallet ownership and preventing spoofing.
//    - Make sure it's implemented to verify a message signed by a Solana wallet.
const { verifySignature } = require('../utils/solanaUtils'); 

// 2. Validators for Solana Addresses and URLs (backend/utils/validators.js)
//    - For consistent validation logic across all models and routes.
const { isValidSolanaAddress } = require('../utils/validators'); 

// --- Custom Joi Validators ---
// Custom Joi validator for Solana wallet addresses
const joiSolanaAddress = Joi.string().trim().required().custom((value, helpers) => {
    if (!isValidSolanaAddress(value)) {
        return helpers.message('Must be a valid Solana wallet address format.');
    }
    return value;
});

// Custom Joi validator for MongoDB ObjectId format
const joiObjectId = Joi.string().trim().required().custom((value, helpers) => {
    if (!mongoose.Types.ObjectId.isValid(value)) {
        return helpers.message('Invalid ID format.');
    }
    return value;
});

// --- Joi Schemas for Request Body Validation ---

// Schema for creating a new DAO proposal
const createProposalSchema = Joi.object({
    title: Joi.string().trim().min(5).max(200).required()
        .messages({
            'string.empty': 'Proposal title cannot be empty.',
            'string.min': 'Proposal title must be at least 5 characters long.',
            'string.max': 'Proposal title cannot exceed 200 characters.',
            'any.required': 'Proposal title is required.'
        }),
    description: Joi.string().trim().min(20).max(5000).required()
        .messages({
            'string.empty': 'Proposal description cannot be empty.',
            'string.min': 'Proposal description must be at least 20 characters long.',
            'string.max': 'Proposal description cannot exceed 5000 characters.',
            'any.required': 'Proposal description is required.'
        }),
    creatorWallet: joiSolanaAddress.messages({
        'any.required': 'Creator wallet address is required.'
    }),
    signature: Joi.string().trim().required()
        .messages({
            'string.empty': 'Signature cannot be empty.',
            'any.required': 'Signature is required for authentication.'
        })
    // Optional: client can provide a duration for flexibility, otherwise use a default
    // durationInDays: Joi.number().integer().min(1).max(30).default(7) 
});

// Schema for voting on a DAO proposal
const voteProposalSchema = Joi.object({
    proposalId: joiObjectId.messages({
        'any.required': 'Proposal ID is required.'
    }),
    voteType: Joi.string().valid('for', 'against').required()
        .messages({
            'any.only': 'Vote type must be "for" or "against".',
            'any.required': 'Vote type is required.'
        }),
    voterWallet: joiSolanaAddress.messages({
        'any.required': 'Voter wallet address is required.'
    }),
    signature: Joi.string().trim().required()
        .messages({
            'string.empty': 'Signature cannot be empty.',
            'any.required': 'Signature is required for authentication.'
        })
});


// --- Middleware for Joi Validation ---
// Reusable middleware to validate request body against a Joi schema
const validateRequestBody = (schema) => (req, res, next) => {
    const { error, value } = schema.validate(req.body, { abortEarly: false }); // Collect all errors
    if (error) {
        const errors = error.details.map(detail => detail.message);
        console.warn('Joi validation failed:', errors);
        return res.status(400).json({ message: 'Invalid request data.', errors });
    }
    req.validatedBody = value; // Attach validated data to req for later use
    next();
};


// --- GET All DAO Proposals ---
// Fetches all DAO proposals from the database, sorted by their creation date (newest first).
router.get('/proposals', async (req, res) => {
    try {
        const proposals = await DaoProposal.find().sort({ createdAt: -1 });
        res.json({
            message: 'Successfully retrieved all DAO proposals.',
            proposals: proposals
        });
    } catch (error) {
        console.error('Error fetching DAO proposals:', error);
        res.status(500).json({ message: 'Failed to retrieve DAO proposals. An unexpected server error occurred.' });
    }
});


// --- POST Create a New DAO Proposal ---
// Allows a user to submit a new DAO proposal, with Web3 signature authentication.
router.post('/proposals', validateRequestBody(createProposalSchema), async (req, res) => {
    const { title, description, creatorWallet, signature } = req.validatedBody; // Data already validated by Joi

    try {
        // 1. Web3 Security: Verify Creator Wallet Signature (CRITICAL FOR AUTHENTICITY)
        // This step is vital. It verifies that the request to create a proposal was indeed signed by the 'creatorWallet'.
        // For production, consider using a unique nonce from the backend for each request to prevent replay attacks.
        const messageToVerify = JSON.stringify({ title, description, creatorWallet }); 
        const isSignatureValid = await verifySignature(creatorWallet, messageToVerify, signature);
        
        if (!isSignatureValid) {
            console.warn(`Signature verification failed for creator wallet: ${creatorWallet}. Request might be spoofed.`);
            return res.status(403).json({ message: 'Authentication failed: Invalid wallet signature provided by creator.' });
        }

        // 2. Define proposal expiration (e.g., 7 days from the current time).
        // If you passed `durationInDays` from the client in Joi schema, use it here.
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        // 3. Create and Save new DAO Proposal document.
        const newProposal = new DaoProposal({
            title,
            description,
            creatorWallet,
            expiresAt,
            status: 'active', 
            votesFor: 0,
            votesAgainst: 0,
            voters: [] 
        });

        const savedProposal = await newProposal.save();
        res.status(201).json({
            message: 'DAO proposal successfully created!',
            proposal: savedProposal
        });

    } catch (error) {
        // 4. Handle Mongoose Validation Errors (e.g., if custom validators in schema fail)
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            console.warn('Mongoose validation failed for new DAO proposal:', errors);
            return res.status(400).json({ message: 'Database validation failed for proposal data.', errors });
        }
        // 5. Handle Other Unexpected Server-Side Errors.
        console.error('Error creating new DAO proposal:', error);
        res.status(500).json({ message: 'Failed to create DAO proposal due to an unexpected server error. Please try again.', error: error.message });
    }
});


// --- POST Vote on a Proposal ---
// Allows a user to cast a vote ('for' or 'against') on an active DAO proposal.
router.post('/vote', validateRequestBody(voteProposalSchema), async (req, res) => {
    const { proposalId, voteType, voterWallet, signature } = req.validatedBody; // Data already validated by Joi

    try {
        // 1. Web3 Security: Verify Voter Wallet Signature (CRITICAL FOR AUTHENTICITY)
        const messageToVerify = JSON.stringify({ proposalId, voteType, voterWallet }); 
        const isSignatureValid = await verifySignature(voterWallet, messageToVerify, signature);
        
        if (!isSignatureValid) {
            console.warn(`Signature verification failed for voter wallet: ${voterWallet}. Vote might be unauthorized.`);
            return res.status(403).json({ message: 'Authentication failed: Invalid wallet signature provided by voter.' });
        }

        const proposal = await DaoProposal.findById(proposalId);

        // 2. Check if the proposal exists.
        if (!proposal) {
            return res.status(404).json({ message: 'DAO Proposal not found with the provided ID.' });
        }

        // 3. Check if the proposal has expired.
        if (new Date() >= proposal.expiresAt) {
            if (proposal.status === 'active') { // Update status if it's still 'active' but expired
                proposal.status = 'completed'; 
                await proposal.save(); 
            }
            return res.status(400).json({ message: 'Voting for this proposal has already ended.' });
        }

        // 4. Check if the voter has already cast a vote on this specific proposal.
        if (proposal.voters.includes(voterWallet)) {
            return res.status(409).json({ message: 'You have already cast a vote on this proposal. Each wallet can vote only once.' });
        }

        // 5. Record the vote and add voter to the list.
        if (voteType === 'for') {
            proposal.votesFor += 1;
        } else { 
            proposal.votesAgainst += 1;
        }
        proposal.voters.push(voterWallet);
        
        await proposal.save(); 

        res.json({
            message: 'Your vote has been successfully cast!',
            proposal: proposal 
        });

    } catch (error) {
        // 6. Handle Mongoose Validation Errors (e.g., if `voters` array validation fails in schema)
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            console.warn('Mongoose validation failed during vote processing:', errors);
            return res.status(400).json({ message: 'Database validation failed for vote data.', errors });
        }
        // 7. Handle Other Unexpected Server-Side Errors.
        console.error('Error processing vote for DAO proposal:', error);
        res.status(500).json({ message: 'Failed to cast vote due to an unexpected server error. Please try again later.', error: error.message });
    }
});

module.exports = router;
