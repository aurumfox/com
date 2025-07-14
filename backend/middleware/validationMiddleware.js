const Joi = require('joi');
const ApiError = require('../utils/ApiError');
// Import custom validation functions from your utils file
const { isValidSolanaAddress, isValidObjectId } = require('../utils/validators'); 
const { ROLES } = require('../config/constants'); // Import ROLES for validation

// --- Custom Joi Validators ---
// These custom validators integrate your utility functions with Joi's validation pipeline.

/**
 * Custom Joi validator for Solana wallet addresses.
 * Uses isValidSolanaAddress from '../utils/validators'.
 */
const joiSolanaAddress = Joi.string().trim().required().custom((value, helpers) => {
    if (!isValidSolanaAddress(value)) {
        // Use Joi's message system for clearer error paths
        return helpers.message('{{#label}} must be a valid Solana wallet address format.');
    }
    return value;
}, 'Solana Address Validation'); // Name for debugging/logging

/**
 * Custom Joi validator for MongoDB ObjectId.
 * Uses isValidObjectId from '../utils/validators'.
 */
const joiObjectId = Joi.string().trim().required().custom((value, helpers) => {
    if (!isValidObjectId(value)) {
        return helpers.message('{{#label}} must be a valid MongoDB ObjectId.');
    }
    return value;
}, 'MongoDB ObjectId Validation'); // Name for debugging/logging


// --- Generic Validation Middleware ---
/**
 * Higher-order function to create a validation middleware.
 * It validates different parts of the request (body, params, query) against provided Joi schemas.
 *
 * @param {object} schemasToValidate - An object where keys are 'body', 'params', 'query'
 * and values are Joi schemas for that part of the request.
 * Example: `{ body: Joi.object({ name: Joi.string() }), params: Joi.object({ id: joiObjectId }) }`
 * @returns {Function} Express middleware function.
 */
const validate = (schemasToValidate) => (req, res, next) => {
    const validationErrors = [];

    // Validate req.params if a schema is provided
    if (schemasToValidate.params) {
        // `allowUnknown: false` is generally recommended for URL parameters for stricter validation
        const { error, value } = schemasToValidate.params.validate(req.params, { abortEarly: false, allowUnknown: false });
        if (error) {
            validationErrors.push(...error.details.map(detail => ({
                field: detail.context.key, // The field that failed validation
                message: detail.message.replace(/['"]/g, '') // Clean up Joi's default messages
            })));
        } else {
            req.validatedParams = value; // Attach validated parameters to the request object
        }
    }

    // Validate req.query if a schema is provided
    if (schemasToValidate.query) {
        // `allowUnknown: false` is generally recommended for query parameters for stricter validation
        const { error, value } = schemasToValidate.query.validate(req.query, { abortEarly: false, allowUnknown: false });
        if (error) {
            validationErrors.push(...error.details.map(detail => ({
                field: detail.context.key,
                message: detail.message.replace(/['"]/g, '')
            })));
        } else {
            req.validatedQuery = value; // Attach validated query to the request object
        }
    }

    // Validate req.body if a schema is provided
    if (schemasToValidate.body) {
        // Original code used `allowUnknown: true`, indicating unknown fields are ignored, not rejected.
        // If you want to strictly reject unknown fields, change to `false` and consider `stripUnknown: true`.
        const { error, value } = schemasToValidate.body.validate(req.body, { abortEarly: false, allowUnknown: true }); 
        if (error) {
            validationErrors.push(...error.details.map(detail => ({
                field: detail.context.key,
                message: detail.message.replace(/['"]/g, '')
            })));
        } else {
            req.validatedBody = value; // Attach validated body to the request object
        }
    }

    // If any validation errors occurred, throw an ApiError
    if (validationErrors.length > 0) {
        const errorMessage = `Validation failed: ${validationErrors.map(err => err.message).join('; ')}`;
        // Pass the detailed errors array to ApiError for structured client responses
        return next(ApiError.badRequest(errorMessage, validationErrors)); 
    }

    next(); // All validations passed, proceed to the next middleware/route handler
};


// --- Define all Joi Schemas ---
const schemas = {
    // --- Common Parameter Schemas ---
    params: {
        // Schema for validating common ID parameters (e.g., in /api/v1/posts/:id)
        id: Joi.object({
            id: joiObjectId.messages({ 'any.required': 'ID parameter is required.' })
        })
    },

    // --- Authentication Schemas ---
    auth: {
        register: Joi.object({
            walletAddress: joiSolanaAddress.messages({ // Using custom validator
                'string.empty': 'Wallet address cannot be empty.',
                'string.min': 'Wallet address must be at least 32 characters long.',
                'string.max': 'Wallet address cannot exceed 44 characters.',
                'any.required': 'Wallet address is required.'
            }),
            password: Joi.string().required().min(6).messages({
                'string.base': 'Password must be a string.',
                'string.empty': 'Password cannot be empty.',
                'string.min': 'Password must be at least 6 characters long.',
                'any.required': 'Password is required.'
            }),
            // Using ROLES constant for valid values, more robust and maintainable
            role: Joi.string().valid(...Object.values(ROLES)).default(ROLES.USER).messages({
                'any.only': `Role must be one of ${Object.values(ROLES).join(', ')}.`
            })
        }),
        login: Joi.object({
            walletAddress: joiSolanaAddress.messages({ 'any.required': 'Wallet address is required.' }), // Using custom validator
            password: Joi.string().required().messages({ 'any.required': 'Password is required.' })
        })
    },

    // --- NFT Schemas ---
    nfts: {
        create: Joi.object({
            name: Joi.string().trim().required().min(3).max(100).messages({
                'string.empty': 'NFT name cannot be empty.',
                'string.min': 'NFT name must be at least 3 characters long.',
                'string.max': 'NFT name cannot exceed 100 characters.',
                'any.required': 'NFT name is required.'
            }),
            description: Joi.string().trim().max(500).allow('').messages({
                'string.max': 'NFT description cannot exceed 500 characters.'
            }),
            // Owner should typically come from the authenticated user's wallet.
            // If provided in body (e.g., for admin tools), validate it.
            owner: joiSolanaAddress.messages({ 'any.required': 'NFT owner wallet address is required.' }), // Using custom validator
            image: Joi.string().uri().allow('').messages({ 'string.uri': 'Image must be a valid URL.' }),
            attributes: Joi.array().items(Joi.object({
                trait_type: Joi.string().trim().required().messages({ 'any.required': 'Trait type is required.' }),
                value: Joi.string().trim().required().messages({ 'any.required': 'Trait value is required.' })
            })).default([])
        }),
        list: Joi.object({
            price: Joi.number().positive().required().messages({
                'number.base': 'Price must be a number.',
                'number.positive': 'Price must be positive.',
                'any.required': 'Price is required.'
            }),
            duration: Joi.number().integer().positive().required().messages({
                'number.base': 'Duration must be a number.',
                'number.integer': 'Duration must be an integer.',
                'number.positive': 'Duration must be positive.',
                'any.required': 'Duration is required.'
            }) // Duration in days
        }),
        buy: Joi.object({
            // Assuming buyerWallet comes from auth middleware.
            // A transactionSignature is crucial for on-chain verification.
            transactionSignature: Joi.string().trim().required().messages({
                'string.empty': 'Transaction signature cannot be empty.',
                'any.required': 'Transaction signature is required for purchase.'
            })
        }),
        update: Joi.object({
            name: Joi.string().trim().min(3).max(100).messages({
                'string.min': 'NFT name must be at least 3 characters long.',
                'string.max': 'NFT name cannot exceed 100 characters.'
            }),
            description: Joi.string().trim().max(500).allow('').messages({
                'string.max': 'NFT description cannot exceed 500 characters.'
            }),
            image: Joi.string().uri().allow('').messages({ 'string.uri': 'Image must be a valid URL.' }),
            attributes: Joi.array().items(Joi.object({
                trait_type: Joi.string().trim().required(),
                value: Joi.string().trim().required()
            }))
        }).min(1).messages({ 'object.min': 'At least one field (name, description, image, or attributes) is required for update.' })
    },

    // --- Post Schemas (Example for a content type) ---
    posts: {
        create: Joi.object({
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
            // Assumed author comes from authenticated user, but if sent in body:
            authorWallet: joiSolanaAddress.messages({
                'any.required': 'Author wallet address is required.'
            })
        }),
        update: Joi.object({
            title: Joi.string().trim().min(3).max(200).optional()
                .messages({
                    'string.empty': 'Post title cannot be empty.',
                    'string.min': 'Post title must be at least 3 characters long.',
                    'string.max': 'Post title cannot exceed 200 characters.'
                }),
            content: Joi.string().trim().min(10).max(10000).optional()
                .messages({
                    'string.empty': 'Post content cannot be empty.',
                    'string.min': 'Post content must be at least 10 characters long.',
                    'string.max': 'Post content cannot exceed 10000 characters.'
                }),
        }).or('title', 'content').messages({
            'object.missing': 'At least one field (title or content) is required for updating the post.'
        })
    },

    // --- Staking Schemas (Example from backend/routes/staking.js) ---
    staking: {
        getStakingData: Joi.object({
            walletAddress: joiSolanaAddress // Validate URL parameter format
        }),
        stake: Joi.object({
            walletAddress: joiSolanaAddress,
            amount: Joi.number().positive().required()
                .messages({
                    'number.base': 'Amount must be a number.',
                    'number.positive': 'Staking amount must be positive.',
                    'any.required': 'Staking amount is required.'
                }),
            // Transaction signature is crucial for on-chain verification
            transactionSignature: Joi.string().trim().required() 
                .messages({
                    'string.empty': 'Transaction signature cannot be empty.',
                    'any.required': 'Transaction signature is required for staking.'
                })
        }),
        claimUnstake: Joi.object({
            walletAddress: joiSolanaAddress,
            transactionSignature: Joi.string().trim().required()
                .messages({
                    'string.empty': 'Transaction signature cannot be empty.',
                    'any.required': 'Transaction signature is required.'
                })
        })
    },

    // --- Common Query Schemas ---
    query: {
        pagination: Joi.object({
            page: Joi.number().integer().min(1).default(1),
            limit: Joi.number().integer().min(1).max(100).default(10),
            sortBy: Joi.string().allow(''), // Allow empty string for no sort
            order: Joi.string().valid('asc', 'desc').default('desc')
        })
    }
    // Add more schemas for other models (announcements, photos, games, ads, etc.) as needed
};

module.exports = {
    validate,
    schemas, // Export the consolidated schemas object
};
