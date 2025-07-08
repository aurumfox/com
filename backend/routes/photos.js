const express = require('express');
const { body } = require('express-validator');
const photoController = require('../controllers/photoController');
const { authenticateToken } = require('../middleware/authMiddleware');
const upload = require('../utils/multer'); // Multer config
const { isValidSolanaAddress, validate } = require('../utils/validation');

const router = express.Router();

// GET all photos
router.get('/', photoController.getPhotos);

// POST a new photo
router.post(
    '/upload',
    authenticateToken, // Requires authentication
    upload.single('photo'), // Use multer for file upload
    [
        body('title').isString().trim().isLength({ min: 3, maxlength: 100 }).withMessage('Photo title is required and must be between 3 and 100 characters.'),
        body('description').optional().isString().trim().isLength({ maxlength: 500 }).withMessage('Description cannot exceed 500 characters.'),
        body('creatorWallet').isString().trim().custom(value => isValidSolanaAddress(value)).withMessage('Invalid Solana wallet address format for creatorWallet.')
    ],
    validate, // Apply validation middleware
    photoController.uploadPhoto
);

module.exports = router;
