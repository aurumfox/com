const express = require('express');
const router = express.Router();
const Joi = require('joi'); // For robust request body validation
const Game = require('../models/Game');

// --- Centralized Utilities (IMPORTANT: Ensure these files are created and functional) ---

// Validators for Solana Addresses and URLs (backend/utils/validators.js)
// Make sure isValidSolanaAddress and isValidURL are exported from this file.
const { isValidSolanaAddress, isValidURL } = require('../utils/validators'); 

// --- Custom Joi Validators ---
// Custom Joi validator for Solana wallet addresses
const joiSolanaAddress = Joi.string().trim().required().custom((value, helpers) => {
    if (!isValidSolanaAddress(value)) {
        return helpers.message('Must be a valid Solana wallet address format.');
    }
    return value;
});

// Custom Joi validator for URL format (allows empty string for optional URLs)
const joiOptionalURL = Joi.string().trim().max(500).allow('').custom((value, helpers) => {
    if (value === '') return value; // Empty string is valid as per schema default
    if (!isValidURL(value)) {
        return helpers.message('Must be a valid URL.');
    }
    return value;
});

// --- Helper function for Mongoose Validation Errors ---
// Still useful for rare cases where Mongoose catches something Joi misses, or for PATCH/PUT updates.
const formatMongooseErrors = (err) => {
    const errors = {};
    for (let field in err.errors) {
        errors[field] = err.errors[field].message;
    }
    return errors;
};

// --- Joi Schema for Game Creation Request Body Validation ---
const createGameSchema = Joi.object({
    title: Joi.string().trim().min(3).max(100).required()
        .messages({
            'string.empty': 'Game title cannot be empty.',
            'string.min': 'Game title must be at least 3 characters long.',
            'string.max': 'Game title cannot exceed 100 characters.',
            'any.required': 'Game title is required.'
        }),
    description: Joi.string().trim().min(20).max(5000).required()
        .messages({
            'string.empty': 'Game description cannot be empty.',
            'string.min': 'Game description must be at least 20 characters long.',
            'string.max': 'Game description cannot exceed 5000 characters.',
            'any.required': 'Game description is required.'
        }),
    developer: joiSolanaAddress.messages({
        'any.required': 'Developer wallet address is required.'
    }),
    url: joiOptionalURL, // Uses the custom Joi URL validator
    releaseDate: Joi.date().iso().less('now').messages({ // ISO format and not in the future
        'date.iso': 'Release date must be in ISO 8601 format (e.g., YYYY-MM-DD).',
        'date.less': 'Release date cannot be in the future.'
    }).optional(),
    genres: Joi.array().items(Joi.string().valid( // Ensure genres match your schema's enum values
        'Action', 'Adventure', 'RPG', 'Strategy', 'Simulation', 'Sports', 'Puzzle', 'Horror', 
        'Sci-Fi', 'Fantasy', 'Indie', 'MMO', 'Racing', 'Fighting', 'Casual', 'Educational', 
        'Party', 'Board Game'
    )).default([]).messages({
        'array.base': 'Genres must be an array of strings.',
        'any.only': '{#value} is not a valid genre.'
    }),
    platforms: Joi.array().items(Joi.string().valid( // Ensure platforms match your schema's enum values
        'PC', 'PlayStation', 'Xbox', 'Nintendo Switch', 'Mobile (iOS)', 'Mobile (Android)', 
        'Browser', 'VR', 'Mac', 'Linux'
    )).default([]).messages({
        'array.base': 'Platforms must be an array of strings.',
        'any.only': '{#value} is not a valid platform.'
    }),
    screenshots: Joi.array().items(joiOptionalURL.required()) // Each screenshot URL must be a valid URL
        .default([]).messages({
            'array.base': 'Screenshots must be an array of URLs.',
            'any.required': 'Screenshot URL cannot be empty.', // If the item itself is not empty
            'string.uri': 'One or more screenshot URLs are invalid.' // If the format is wrong
        })
});

// --- GET /api/games ---
// Route to retrieve all games from the database, sorted by releaseDate.
// Can be extended with query parameters for filtering, sorting, and pagination.
router.get('/', async (req, res) => {
    try {
        const games = await Game.find().sort({ releaseDate: -1 });
        res.json(games);
    } catch (err) {
        console.error('Error fetching games:', err);
        res.status(500).json({ message: 'Internal Server Error: Could not retrieve games.' });
    }
});

// --- POST /api/games ---
// Route to add a new game to the database.
// Requires Joi validation and ideally, authentication/authorization for who can add games.
router.post('/', 
    // IMPORTANT: Add authentication middleware here (e.g., authenticateToken, authorizeAdmin)
    // router.post('/', authenticateToken, authorizeAdmin, validateRequestBody(createGameSchema), async (req, res) => {
    // For now, only applying validation:
    (req, res, next) => { // Generic Joi validation middleware
        const { error, value } = createGameSchema.validate(req.body, { abortEarly: false }); 
        if (error) {
            const errors = error.details.map(detail => detail.message);
            console.warn('Joi validation failed for new game:', errors);
            return res.status(400).json({ message: 'Invalid game data provided.', errors });
        }
        req.validatedBody = value; // Attach validated data
        next();
    },
    async (req, res) => {
    // Data is already validated by the Joi middleware.
    const newGame = new Game(req.validatedBody);

    try {
        const savedGame = await newGame.save();
        res.status(201).json(savedGame);
    } catch (err) {
        // This catch block handles potential Mongoose-level validation errors
        // that Joi might not cover (e.g., unique constraints) or other DB errors.
        if (err.name === 'ValidationError') {
            return res.status(400).json({
                message: 'Database Validation Error: Please check your input.',
                errors: formatMongooseErrors(err) 
            });
        }
        console.error('Error saving game:', err); 
        res.status(500).json({ message: 'Internal Server Error: Could not save the game.' });
    }
});

module.exports = router;
