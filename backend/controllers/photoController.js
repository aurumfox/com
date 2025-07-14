/**
 * @file This file contains controller functions for handling photo-related operations.
 * It includes fetching all photos and uploading new photos, with robust validation,
 * authorization, and error handling.
 */

const Photo = require('../models/Photo');
const fs = require('fs').promises; // For file system operations
const logger = require('../config/logger');
const path = require('path');
const asyncHandler = require('../utils/asyncHandler'); // For consistent error handling
const ApiError = require('../utils/ApiError'); // For standardized API errors
const Joi = require('joi'); // For input validation
const { ROLES } = require('../config/constants'); // Assuming you have ROLES constant

// Consistent with app.js and multer.js for upload directory
const uploadDir = 'uploads/';
const baseUploadsPath = path.join(__dirname, '..', uploadDir); // Absolute path for unlink

// --- Joi Validation Schemas ---
const uploadPhotoBodySchema = Joi.object({
    title: Joi.string().trim().required().min(3).max(100).messages({
        'string.empty': 'Photo title cannot be empty.',
        'string.min': 'Photo title must be at least 3 characters long.',
        'string.max': 'Photo title cannot exceed 100 characters.',
        'any.required': 'Photo title is required.'
    }),
    description: Joi.string().trim().max(1000).optional().allow('').messages({
        'string.max': 'Photo description cannot exceed 1000 characters.'
    }),
    // creatorWallet will come from req.user.walletAddress, not body.
    // This field is conceptually for the logged-in user, not user input.
    // If you _do_ allow it in the body for specific cases (e.g., admin upload for another user),
    // then it needs strong authorization check and wallet format validation.
    // For now, assume it's derived from authentication.
});

/**
 * @desc Get all photos
 * @route GET /api/photos
 * @access Public
 * @returns {object} 200 - An array of photo objects.
 * @throws {ApiError} 500 - If an unexpected error occurs during fetching photos.
 */
const getPhotos = asyncHandler(async (req, res, next) => {
    const photos = await Photo.find().sort({ createdAt: -1 }); // Use createdAt for consistent sorting
    logger.debug(`Fetched ${photos.length} photos.`);
    res.status(200).json({ success: true, count: photos.length, data: photos });
});

/**
 * @desc Upload a new photo
 * @route POST /api/photos/upload
 * @access Private (Authenticated user, potentially specific roles like PUBLISHER/USER)
 * @param {object} req - The Express request object.
 * @param {object} req.file - The uploaded file object (from multer middleware).
 * @param {object} req.body - The request body containing title and description.
 * @param {object} req.user - The authenticated user object (from authMiddleware).
 * @param {object} res - The Express response object.
 * @param {function} next - The Express next middleware function.
 * @returns {object} 201 - An object with success message and the new photo data.
 * @throws {ApiError} 400 - If no file is uploaded or validation fails.
 * @throws {ApiError} 401 - If the user is not authenticated.
 * @throws {ApiError} 403 - If the user is not authorized to upload photos.
 * @throws {ApiError} 500 - If a database error or unexpected server error occurs.
 */
const uploadPhoto = asyncHandler(async (req, res, next) => {
    // 1. Authentication Check (assuming this is handled by a prior middleware)
    if (!req.user || !req.user.walletAddress || !req.user.id) {
        logger.warn('Unauthorized photo upload attempt: No authenticated user.');
        return next(ApiError.unauthorized('Authentication required to upload photos.'));
    }

    // 2. Authorization Check (Example: only users with 'PUBLISHER' or 'USER' role)
    // Adjust roles based on your application's requirements
    if (![ROLES.USER, ROLES.PUBLISHER, ROLES.ADMIN].includes(req.user.role)) {
        logger.warn(`Forbidden photo upload attempt by user ${req.user.walletAddress} with role ${req.user.role}.`);
        return next(ApiError.forbidden('You are not authorized to upload photos.'));
    }

    // 3. File Presence Check
    if (!req.file) {
        logger.warn('Photo upload attempt: No file provided in the request.');
        return next(ApiError.badRequest('No photo file uploaded. Please ensure you are sending a multipart/form-data request with a file.'));
    }

    // 4. Input Validation (for body fields)
    const { error, value } = uploadPhotoBodySchema.validate(req.body);
    if (error) {
        const errors = error.details.map(detail => detail.message);
        logger.warn(`Validation error during photo upload for user ${req.user.walletAddress}: ${errors.join(', ')}`);
        // Clean up the uploaded file if body validation fails
        try {
            await fs.unlink(req.file.path);
            logger.info(`Cleaned up uploaded file due to validation error: ${req.file.path}`);
        } catch (e) {
            logger.error(`Error cleaning up file ${req.file.path} after validation error: ${e.message}`);
        }
        return next(ApiError.badRequest('Validation Error', errors));
    }

    const { title, description } = value; // Use validated values
    // Creator wallet comes from authenticated user
    const creatorWallet = req.user.walletAddress;
    const creatorId = req.user.id;

    // Construct image URL (ensure this matches your server setup)
    // Using process.env.PUBLIC_URL if available, otherwise fallback to localhost
    const baseUrl = process.env.PUBLIC_URL || `http://localhost:${process.env.PORT || 3000}`;
    const imageUrl = `${baseUrl}/uploads/${req.file.filename}`;

    try {
        const newPhoto = new Photo({
            title,
            description,
            imageUrl,
            filename: req.file.filename, // Store filename for easier deletion/management
            mimetype: req.file.mimetype, // Store mimetype
            size: req.file.size,       // Store file size
            creatorWallet,
            creator: creatorId // Link to the User ID from the database
        });
        await newPhoto.save();
        logger.info(`Photo uploaded and saved to DB: ${newPhoto._id} by ${creatorWallet} (File: ${req.file.filename})`);
        res.status(201).json({ success: true, message: 'Photo uploaded successfully.', photo: newPhoto });
    } catch (error) {
        logger.error(`Database error saving photo for wallet ${creatorWallet}: ${error.message}`, error);
        // Clean up the uploaded file if DB save fails
        try {
            await fs.unlink(req.file.path);
            logger.info(`Cleaned up uploaded file due to DB error: ${req.file.path}`);
        } catch (e) {
            logger.error(`Error cleaning up file ${req.file.path} after DB error: ${e.message}`);
        }
        next(ApiError.internal('Failed to save photo metadata to database.')); // Convert to API Error
    }
});

/**
 * @desc Delete a photo
 * @route DELETE /api/photos/:id
 * @access Private (Owner or Admin)
 * @param {object} req - The Express request object.
 * @param {object} req.params - The request parameters containing the 'id' of the photo.
 * @param {object} req.user - The authenticated user object (from authMiddleware).
 * @param {object} res - The Express response object.
 * @param {function} next - The Express next middleware function.
 * @returns {object} 200 - An object with success status and message.
 * @throws {ApiError} 400 - If the photo ID format is invalid.
 * @throws {ApiError} 401 - If the user is not authenticated.
 * @throws {ApiError} 403 - If the user is not authorized to delete the photo.
 * @throws {ApiError} 404 - If the photo is not found.
 * @throws {ApiError} 500 - If a file system or database error occurs during deletion.
 */
const deletePhoto = asyncHandler(async (req, res, next) => {
    const { id } = req.params;

    // 1. Authentication Check
    if (!req.user || !req.user.id) {
        logger.warn('Unauthorized photo deletion attempt: No authenticated user.');
        return next(ApiError.unauthorized('Authentication required to delete photos.'));
    }

    // 2. Input Validation for ID
    const { error: idError } = Joi.string().pattern(/^[0-9a-fA-F]{24}$/).validate(id);
    if (idError) {
        return next(ApiError.badRequest(idError.details[0].message));
    }

    const photo = await Photo.findById(id);

    if (!photo) {
        logger.warn(`Photo not found for deletion: ${id}`);
        return next(ApiError.notFound('Photo not found.'));
    }

    // 3. Authorization Check: Only the creator or an Admin can delete
    if (photo.creator.toString() !== req.user.id && req.user.role !== ROLES.ADMIN) {
        logger.warn(`Forbidden photo deletion attempt for ID ${id} by user ${req.user.walletAddress} (Role: ${req.user.role}). Creator: ${photo.creatorWallet}`);
        return next(ApiError.forbidden('You are not authorized to delete this photo.'));
    }

    // 4. Delete file from file system
    if (photo.filename) {
        const filePath = path.join(baseUploadsPath, photo.filename);
        try {
            await fs.unlink(filePath);
            logger.info(`Deleted physical file: ${filePath}`);
        } catch (fileError) {
            if (fileError.code === 'ENOENT') {
                logger.warn(`File not found on disk for deletion (already removed?): ${filePath}`);
            } else {
                logger.error(`Error deleting physical file ${filePath} for photo ${id}: ${fileError.message}`);
                // Decide if DB record should still be deleted even if file delete fails
                // For now, we'll proceed to delete DB record, but log the error.
            }
        }
    } else {
        logger.warn(`Photo ${id} has no filename recorded. Skipping physical file deletion.`);
    }

    // 5. Delete record from database
    await Photo.findByIdAndDelete(id);
    logger.info(`Photo record deleted from DB: ${id} by ${req.user.walletAddress}`);

    res.status(200).json({ success: true, message: 'Photo deleted successfully.' });
});

module.exports = {
    getPhotos,
    uploadPhoto,
    deletePhoto, // Export the new delete function
};
