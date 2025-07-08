// middleware/validationMiddleware.js
const Joi = require('joi');
const ApiError = require('../utils/ApiError');

const validate = (schema) => (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false, allowUnknown: true }); // allowUnknown for extra fields not in schema
    if (error) {
        const errors = error.details.map(detail => detail.message);
        return next(new ApiError(`Validation error: ${errors.join(', ')}`, 400));
    }
    next();
};

// Define common schemas here or import from utils/validationSchemas.js
const authSchemas = {
    register: Joi.object({
        walletAddress: Joi.string().required().min(32).max(44).messages({
            'string.base': 'Wallet address must be a string',
            'string.empty': 'Wallet address cannot be empty',
            'string.min': 'Wallet address must be at least {#limit} characters long',
            'string.max': 'Wallet address cannot exceed {#limit} characters',
            'any.required': 'Wallet address is required'
        }),
        password: Joi.string().required().min(6).messages({
            'string.base': 'Password must be a string',
            'string.empty': 'Password cannot be empty',
            'string.min': 'Password must be at least {#limit} characters long',
            'any.required': 'Password is required'
        }),
        role: Joi.string().valid('user', 'admin', 'developer', 'publisher', 'advertiser').default('user')
    }),
    login: Joi.object({
        walletAddress: Joi.string().required(),
        password: Joi.string().required()
    })
};

const nftSchemas = {
    create: Joi.object({
        name: Joi.string().required().min(3).max(100),
        description: Joi.string().max(500).allow(''),
        owner: Joi.string().required().min(32).max(44),
        image: Joi.string().uri().allow(''), // Can be a URL, or handled by multer
        attributes: Joi.array().items(Joi.object({
            trait_type: Joi.string().required(),
            value: Joi.string().required()
        })).default([])
    }),
    list: Joi.object({
        price: Joi.number().required().positive(),
        duration: Joi.number().required().integer().positive() // Duration in days
    }),
    buy: Joi.object({
        // No body required, buyerWallet comes from auth
    }),
    update: Joi.object({
        name: Joi.string().min(3).max(100),
        description: Joi.string().max(500).allow(''),
        image: Joi.string().uri().allow(''),
        attributes: Joi.array().items(Joi.object({
            trait_type: Joi.string().required(),
            value: Joi.string().required()
        }))
    }).min(1) // At least one field must be provided for update
};

// Add more schemas for other models (announcements, photos, posts, games, ads)

module.exports = {
    validate,
    schemas: {
        auth: authSchemas,
        nfts: nftSchemas,
        // Export other schemas here
    }
};
