const express = require('express');
const router = express.Router();

// --- Import Controller Functions ---
// These functions contain the core logic for handling photo-related requests.
const photoController = require('../controllers/photoController');

// --- Import Middleware & Utilities ---
// Centralized authentication, file upload, and Joi validation.
const { authenticateToken } = require('../middleware/authMiddleware'); // For JWT authentication
const upload = require('../utils/multer'); // Configured Multer instance for file uploads
const { validate, schemas } = require('../middleware/validationMiddleware'); // Joi schemas and validation middleware

// IMPORTANT ASSUMPTION:
// We are assuming that your `backend/middleware/validationMiddleware.js`
// now exports a `validate` function (which applies a Joi schema) and a `schemas` object
// that will include `schemas.photos.upload`.
//
// Example structure for `backend/middleware/validationMiddleware.js`:
/*
    const Joi = require('joi');
    const { isValidSolanaAddress } = require('../utils/validators'); // Re-use your utility

    // Custom Joi validator for Solana wallet addresses
    const joiSolanaAddress = Joi.string().trim().required().custom((value, helpers) => {
        if (!isValidSolanaAddress(value)) {
            return helpers.message('Must be a valid Solana wallet address format.');
        }
        return value;
    });

    const schemas = {
        // ... (other schemas like auth, nfts, dao)
        photos: {
            upload: Joi.object({
                title: Joi.string().trim().min(3).max(100).required()
                    .messages({
                        'string.empty': 'Photo title cannot be empty.',
                        'string.min': 'Photo title must be at least 3 characters long.',
                        'string.max': 'Photo title cannot exceed 100 characters.',
                        'any.required': 'Photo title is required.'
                    }),
                description: Joi.string().trim().max(500).optional().allow('')
                    .messages({
                        'string.max': 'Description cannot exceed 500 characters.'
                    }),
                creatorWallet: joiSolanaAddress.messages({ // Using the centralized Solana address validator
                    'any.required': 'Creator wallet address is required.'
                })
                // Note: File validation (like mimetype, size) is typically handled by Multer options
                // or a custom file validation middleware *after* Multer.
            })
        }
    };

    const validate = (schema) => (req, res, next) => {
        const { error, value } = schema.validate(req.body, { abortEarly: false });
        if (error) {
            const errors = error.details.map(detail => detail.message);
            console.warn('Joi validation failed:', errors);
            return res.status(400).json({ message: 'Invalid request data.', errors });
        }
        req.validatedBody = value; // Attach validated data
        next();
    };

    module.exports = { validate, schemas };
*/


// --- Photo Routes ---

// GET /api/photos
// Route to retrieve all photos.
router.get('/', photoController.getPhotos);

// POST /api/photos/upload
// Route to upload a new photo.
// Requires authentication and uses Multer for file processing, followed by Joi validation.
router.post(
    '/upload',
    authenticateToken,                             // 1. Authenticate the requesting user via JWT.
    upload.single('photo'),                        // 2. Process file upload. The uploaded file details are available in `req.file`.
                                                   //    Text fields from multipart form data are in `req.body`.
    validate(schemas.photos.upload),               // 3. Validate the `req.body` (title, description, creatorWallet) using Joi schema.
                                                   //    If validation passes, `req.validatedBody` is populated.
    photoController.uploadPhoto                    // 4. Call the controller function. It will access `req.file` and `req.validatedBody`.
);

module.exports = router;
