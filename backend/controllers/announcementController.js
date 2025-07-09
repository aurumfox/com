const Announcement = require('../models/Announcement');
const logger = require('../config/logger');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { invalidateResourceCache } = require('../utils/cache');
const { publishEvent } = require('../services/eventService'); // Import event service
const Joi = require('joi'); // For input validation
const { ROLES } = require('../config/constants'); // Assuming you have ROLES constant

// --- Joi Validation Schemas ---
// Reusing schemas from GraphQL resolvers if appropriate, or define new ones
const createAnnouncementSchema = Joi.object({
    text: Joi.string().trim().required().min(5).max(500).messages({
        'string.empty': 'Announcement text cannot be empty.',
        'string.min': 'Announcement text must be at least 5 characters long.',
        'string.max': 'Announcement text cannot exceed 500 characters.',
        'any.required': 'Announcement text is required.'
    })
});

const updateAnnouncementSchema = Joi.object({
    text: Joi.string().trim().min(5).max(500).messages({
        'string.empty': 'Announcement text cannot be empty.',
        'string.min': 'Announcement text must be at least 5 characters long.',
        'string.max': 'Announcement text cannot exceed 500 characters.'
    }).required() // Assuming text is always required for an update, or use .optional()
});

/**
 * @desc Get all announcements
 * @route GET /api/v1/announcements
 * @access Public
 * @returns {object} 200 - An object with success status, count, and an array of announcements.
 * @throws {ApiError} If an unexpected error occurs.
 */
const getAnnouncements = asyncHandler(async (req, res, next) => {
    const announcements = await Announcement.find().sort({ date: -1 });
    logger.debug(`Fetched ${announcements.length} announcements.`);
    res.status(200).json({ success: true, count: announcements.length, data: announcements });
});

/**
 * @desc Create a new announcement
 * @route POST /api/v1/announcements
 * @access Private (Admin only)
 * @param {object} req - The Express request object.
 * @param {object} req.body - The request body containing the 'text' for the announcement.
 * @param {object} req.user - The authenticated user object (from authMiddleware).
 * @param {object} res - The Express response object.
 * @param {function} next - The Express next middleware function.
 * @returns {object} 201 - An object with success status, message, and the new announcement data.
 * @throws {ApiError} 400 - If validation fails.
 * @throws {ApiError} 403 - If the user is not authorized (not an admin).
 * @throws {ApiError} 500 - If an unexpected error occurs during creation.
 */
const createAnnouncement = asyncHandler(async (req, res, next) => {
    // 1. Authorization: Only Admin can create announcements
    if (!req.user || req.user.role !== ROLES.ADMIN) {
        logger.warn(`Unauthorized attempt to create announcement by user ${req.user ? req.user.walletAddress : 'N/A'} (Role: ${req.user ? req.user.role : 'N/A'}).`);
        return next(ApiError.forbidden('Only administrators can create announcements.'));
    }

    // 2. Input Validation
    const { error, value } = createAnnouncementSchema.validate(req.body);
    if (error) {
        const errors = error.details.map(detail => detail.message);
        logger.warn(`Validation error during announcement creation: ${errors.join(', ')}`);
        return next(ApiError.badRequest('Validation Error', errors));
    }

    const { text } = value; // Use validated value

    const newAnnouncement = new Announcement({ text, author: req.user.id }); // Assign author from authenticated user
    await newAnnouncement.save();

    // 3. Cache Invalidation
    await invalidateResourceCache('announcements'); // Invalidate the list of announcements

    // 4. Publish Event
    publishEvent('announcementCreated', {
        _id: newAnnouncement._id,
        text: newAnnouncement.text,
        author: newAnnouncement.author,
        date: newAnnouncement.date
    });
    logger.info(`New announcement created and event published: ${newAnnouncement._id} by ${req.user.walletAddress}`);
    res.status(201).json({ success: true, message: 'Announcement published successfully', data: newAnnouncement });
});

/**
 * @desc Update an announcement
 * @route PUT /api/v1/announcements/:id
 * @access Private (Admin only)
 * @param {object} req - The Express request object.
 * @param {object} req.params - The request parameters containing the 'id' of the announcement.
 * @param {object} req.body - The request body containing the 'text' to update.
 * @param {object} req.user - The authenticated user object (from authMiddleware).
 * @param {object} res - The Express response object.
 * @param {function} next - The Express next middleware function.
 * @returns {object} 200 - An object with success status, message, and the updated announcement data.
 * @throws {ApiError} 400 - If validation fails or ID is invalid.
 * @throws {ApiError} 403 - If the user is not authorized (not an admin).
 * @throws {ApiError} 404 - If the announcement is not found.
 * @throws {ApiError} 500 - If an unexpected error occurs during update.
 */
const updateAnnouncement = asyncHandler(async (req, res, next) => {
    const { id } = req.params;

    // 1. Authorization: Only Admin can update announcements
    if (!req.user || req.user.role !== ROLES.ADMIN) {
        logger.warn(`Unauthorized attempt to update announcement ${id} by user ${req.user ? req.user.walletAddress : 'N/A'}.`);
        return next(ApiError.forbidden('Only administrators can update announcements.'));
    }

    // 2. Input Validation
    // Validate ID first if it's a MongoDB ObjectId
    if (!id.match(/^[0-9a-fA-F]{24}$/)) { // Basic ObjectId format check
        return next(ApiError.badRequest('Invalid Announcement ID format.'));
    }

    const { error, value } = updateAnnouncementSchema.validate(req.body);
    if (error) {
        const errors = error.details.map(detail => detail.message);
        logger.warn(`Validation error during announcement update for ID ${id}: ${errors.join(', ')}`);
        return next(ApiError.badRequest('Validation Error', errors));
    }

    const { text } = value; // Use validated value

    const announcement = await Announcement.findById(id);

    if (!announcement) {
        logger.warn(`Announcement not found for update: ${id}`);
        return next(ApiError.notFound('Announcement not found.'));
    }

    // Update fields
    announcement.text = text; // Always update if provided and validated
    // Optionally, track who updated it
    // announcement.lastUpdatedBy = req.user.id;
    await announcement.save();

    // 3. Cache Invalidation
    await invalidateResourceCache('announcements'); // Invalidate the list
    // If you cache individual announcements, invalidate that too:
    // await invalidateResourceCache(`announcement:${id}`);

    // 4. Publish Event
    publishEvent('announcementUpdated', {
        _id: announcement._id,
        text: announcement.text,
        updatedAt: announcement.updatedAt,
        // Add any other relevant fields
    });
    logger.info(`Announcement updated and event published: ${announcement._id} by ${req.user.walletAddress}`);
    res.status(200).json({ success: true, message: 'Announcement updated successfully', data: announcement });
});

/**
 * @desc Delete an announcement
 * @route DELETE /api/v1/announcements/:id
 * @access Private (Admin only)
 * @param {object} req - The Express request object.
 * @param {object} req.params - The request parameters containing the 'id' of the announcement.
 * @param {object} req.user - The authenticated user object (from authMiddleware).
 * @param {object} res - The Express response object.
 * @param {function} next - The Express next middleware function.
 * @returns {object} 200 - An object with success status and message.
 * @throws {ApiError} 400 - If ID is invalid.
 * @throws {ApiError} 403 - If the user is not authorized (not an admin).
 * @throws {ApiError} 404 - If the announcement is not found.
 * @throws {ApiError} 500 - If an unexpected error occurs during deletion.
 */
const deleteAnnouncement = asyncHandler(async (req, res, next) => {
    const { id } = req.params;

    // 1. Authorization: Only Admin can delete announcements
    if (!req.user || req.user.role !== ROLES.ADMIN) {
        logger.warn(`Unauthorized attempt to delete announcement ${id} by user ${req.user ? req.user.walletAddress : 'N/A'}.`);
        return next(ApiError.forbidden('Only administrators can delete announcements.'));
    }

    // 2. Input Validation
    if (!id.match(/^[0-9a-fA-F]{24}$/)) { // Basic ObjectId format check
        return next(ApiError.badRequest('Invalid Announcement ID format.'));
    }

    const announcement = await Announcement.findByIdAndDelete(id);

    if (!announcement) { // findByIdAndDelete returns null if not found
        logger.warn(`Announcement not found for deletion: ${id}`);
        return next(ApiError.notFound('Announcement not found.'));
    }

    // 3. Cache Invalidation
    await invalidateResourceCache('announcements'); // Invalidate the list
    // If you cache individual announcements, invalidate that too:
    // await invalidateResourceCache(`announcement:${id}`);

    // 4. Publish Event
    // Pass relevant data, e.g., the ID and text of the deleted announcement
    publishEvent('announcementDeleted', {
        _id: announcement._id,
        text: announcement.text, // Could be useful for logs/notifications
    });
    logger.info(`Announcement deleted and event published: ${announcement._id} by ${req.user.walletAddress}`);
    res.status(200).json({ success: true, message: 'Announcement deleted successfully' });
});

module.exports = {
    getAnnouncements,
    createAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
};
