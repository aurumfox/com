const express = require('express');
const router = express.Router();
const mongoose = require('mongoose'); // Still needed for joiObjectId custom validator
const Joi = require('joi'); // For robust request body validation
const Post = require('../models/Post'); // Import the Post Mongoose model

// --- Centralized Middleware & Utilities ---
const { authenticateToken } = require('../middleware/authMiddleware'); // For JWT authentication
const { validate, schemas } = require('../middleware/validationMiddleware'); // Joi validation middleware and schemas
const { isValidSolanaAddress } = require('../utils/validators'); // Centralized Solana address validator
// If formatMongooseErrors is needed, it should be in a shared utility like `utils/errorHandler.js`
// const { formatMongooseErrors } = require('../utils/errorHandler'); // Example of external helper

// --- Custom Joi Validators (if not already in validationMiddleware.js) ---
// These are defined here for clarity but should ideally reside in `validationMiddleware.js`
// or a shared Joi extension for reusability across all schemas.
const joiSolanaAddress = Joi.string().trim().required().custom((value, helpers) => {
    if (!isValidSolanaAddress(value)) {
        return helpers.message('Must be a valid Solana wallet address format.');
    }
    return value;
});

const joiObjectId = Joi.string().trim().required().custom((value, helpers) => {
    if (!mongoose.Types.ObjectId.isValid(value)) {
        return helpers.message('Invalid ID format.');
    }
    return value;
});


// --- Joi Schemas for Post Operations ---

// Schema for creating a new post (POST /api/posts)
const createPostSchema = Joi.object({
    title: Joi.string().trim().min(3).max(200).required()
        .messages({
            'string.empty': 'Post title cannot be empty.',
            'string.min': 'Post title must be at least 3 characters long.',
            'string.max': 'Post title cannot exceed 200 characters.',
            'any.required': 'Post title is required.'
        }),
    content: Joi.string().trim().min(10).max(10000).required()
        .messages({
            'string.empty': 'Post content cannot be empty.',
            'string.min': 'Post content must be at least 10 characters long.',
            'string.max': 'Post content cannot exceed 10000 characters.',
            'any.required': 'Post content is required.'
        }),
    authorWallet: joiSolanaAddress.messages({
        'any.required': 'Author wallet address is required.'
    })
});

// Schema for updating an existing post (PUT /api/posts/:id)
const updatePostSchema = Joi.object({
    title: Joi.string().trim().min(3).max(200).optional() // Make optional for partial updates
        .messages({
            'string.empty': 'Post title cannot be empty.',
            'string.min': 'Post title must be at least 3 characters long.',
            'string.max': 'Post title cannot exceed 200 characters.'
        }),
    content: Joi.string().trim().min(10).max(10000).optional() // Make optional for partial updates
        .messages({
            'string.empty': 'Post content cannot be empty.',
            'string.min': 'Post content must be at least 10 characters long.',
            'string.max': 'Post content cannot exceed 10000 characters.'
        }),
    // authorWallet should NOT be updatable via PUT, but may be passed for authorization check if not using JWT wallet
    // If you pass it, validate it, but ensure it's not saved to the DB via `findByIdAndUpdate`
    requesterWallet: joiSolanaAddress.optional() // Wallet of the person making the request for in-route authorization
}).or('title', 'content') // At least one of title or content must be present for update
.messages({
    'object.missing': 'At least one field (title or content) is required for updating the post.'
});


// --- Authorization Middleware for Post Ownership ---
// This middleware ensures that the authenticated user (from JWT) is the author of the post.
const authorizePostOwnership = async (req, res, next) => {
    try {
        const postId = req.params.id;
        // Validate ID format early
        if (!mongoose.Types.ObjectId.isValid(postId)) {
            return res.status(400).json({ message: 'Invalid Post ID format.' });
        }

        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({ message: 'Post not found.' });
        }

        // `req.user` comes from `authenticateToken` middleware, carrying authenticated user's data (e.g., walletAddress).
        if (!req.user || post.authorWallet.toLowerCase() !== req.user.walletAddress.toLowerCase()) {
            // Also allow an admin role to bypass this check if you have authorizeRole middleware.
            // if (!req.user.role || req.user.role !== ROLES.ADMIN) { ... }
            return res.status(403).json({ message: 'Forbidden: You are not authorized to perform this action on this post.' });
        }

        // Attach the post to the request object so subsequent middleware/route handlers don't refetch it.
        req.post = post;
        next();
    } catch (err) {
        console.error('Error in authorizePostOwnership middleware:', err);
        res.status(500).json({ message: 'Internal server error during authorization.' });
    }
};


// --- GET All Posts ---
router.get('/', async (req, res) => {
    try {
        const posts = await Post.find().sort({ createdAt: -1 });
        res.json(posts);
    } catch (err) {
        console.error('Error fetching posts:', err);
        res.status(500).json({ message: 'Internal Server Error: Could not retrieve posts.' });
    }
});

// --- GET Single Post by ID ---
router.get('/:id', validate(schemas.params.id || Joi.object({ id: joiObjectId })), async (req, res) => {
    // req.params.id is already validated by Joi middleware if schemas.params.id exists, or by inline Joi.
    try {
        const post = await Post.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ message: 'Post not found.' });
        }
        res.json(post);
    } catch (err) {
        // CastError for invalid ID format is now handled by Joi validation earlier.
        console.error(`Error fetching post with ID ${req.params.id}:`, err);
        res.status(500).json({ message: 'Internal Server Error: Could not retrieve post.' });
    }
});


// --- POST Create a New Post ---
// Requires authentication to know who the `authorWallet` is.
router.post(
    '/',
    authenticateToken,                       // 1. Authenticate the user (populates req.user with walletAddress from JWT)
    validate(createPostSchema),              // 2. Validate request body (title, content, authorWallet from body)
    async (req, res) => {
        const { title, content, authorWallet } = req.validatedBody; // Joi validated body

        // CRITICAL SECURITY CHECK: Ensure the `authorWallet` in the request body
        // matches the wallet of the authenticated user from the JWT token.
        if (authorWallet.toLowerCase() !== req.user.walletAddress.toLowerCase()) {
            return res.status(403).json({ message: 'Forbidden: You can only create posts for your own wallet address.' });
        }

        const newPost = new Post({ title, content, authorWallet });

        try {
            const savedPost = await newPost.save();
            res.status(201).json(savedPost);
        } catch (err) {
            console.error('Error creating post:', err);
            if (err.name === 'ValidationError') {
                const errors = Object.values(err.errors).map(e => e.message);
                return res.status(400).json({ message: 'Validation Error: Please check your input fields.', errors });
            }
            res.status(500).json({ message: 'Internal Server Error: Could not create post.' });
        }
    }
);

// --- PUT Update an Existing Post ---
// Requires authentication and authorization (only author or admin can update).
router.put(
    '/:id',
    authenticateToken,                       // 1. Authenticate the user
    authorizePostOwnership,                  // 2. Authorize: check if user owns the post (populates req.post)
    validate(updatePostSchema),              // 3. Validate request body (title, content, requesterWallet)
    async (req, res) => {
        const { title, content } = req.validatedBody; // Joi validated body
        const post = req.post; // Post document already fetched by authorizePostOwnership

        try {
            if (title !== undefined) post.title = title;
            if (content !== undefined) post.content = content;

            const updatedPost = await post.save();
            res.json(updatedPost);
        } catch (err) {
            console.error(`Error updating post with ID ${req.params.id}:`, err);
            if (err.name === 'ValidationError') {
                const errors = Object.values(err.errors).map(e => e.message);
                return res.status(400).json({ message: 'Validation Error: Invalid data provided for update.', errors });
            }
            res.status(500).json({ message: 'Internal Server Error: Could not update post.' });
        }
    }
);

// --- DELETE a Post ---
// Requires authentication and authorization (only author or admin can delete).
router.delete(
    '/:id',
    authenticateToken,                       // 1. Authenticate the user
    authorizePostOwnership,                  // 2. Authorize: check if user owns the post (populates req.post)
    async (req, res) => {
        const post = req.post; // Post document already fetched by authorizePostOwnership

        try {
            await Post.deleteOne({ _id: post._id }); // Use the _id from the fetched post object
            res.json({ message: 'Post successfully deleted.' });
        } catch (err) {
            console.error(`Error deleting post with ID ${req.params.id}:`, err);
            res.status(500).json({ message: 'Internal Server Error: Could not delete post.' });
        }
    }
);

module.exports = router;
