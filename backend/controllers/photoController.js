const Photo = require('../models/Photo');
const fs = require('fs').promises;
const logger = require('../config/logger');
const path = require('path');

const uploadDir = 'uploads/'; // Consistent with app.js and multer.js

// @desc    Get all photos
// @route   GET /api/photos
// @access  Public
const getPhotos = async (req, res, next) => {
    try {
        const photos = await Photo.find().sort({ date: -1 });
        res.json(photos);
    } catch (error) {
        logger.error(`Error fetching photos: ${error.message}`);
        next(error);
    }
};

// @desc    Upload a new photo
// @route   POST /api/photos/upload
// @access  Private
const uploadPhoto = async (req, res, next) => {
    if (!req.file) {
        logger.warn('Photo upload attempt: No file uploaded.');
        return res.status(400).json({ message: 'No photo file uploaded.' });
    }

    const { title, description, creatorWallet } = req.body;
    const imageUrl = `http://localhost:${process.env.PORT || 3000}/uploads/${req.file.filename}`;

    try {
        const newPhoto = new Photo({
            title,
            description: description || '',
            imageUrl,
            creatorWallet
        });
        await newPhoto.save();
        logger.info(`Photo uploaded successfully: ${newPhoto._id} by ${creatorWallet}`);
        res.status(201).json({ message: 'Photo uploaded successfully.', photo: newPhoto });
    } catch (error) {
        logger.error(`Error uploading photo: ${error.message}`);
        // Clean up the uploaded file if DB save fails
        try {
            await fs.unlink(req.file.path);
            logger.info(`Cleaned up uploaded file: ${req.file.path}`);
        } catch (e) {
            logger.error(`Error cleaning up file ${req.file.path} after DB error: ${e.message}`);
        }
        next(error); // Pass to error handling middleware
    }
};

module.exports = {
    getPhotos,
    uploadPhoto,
};
