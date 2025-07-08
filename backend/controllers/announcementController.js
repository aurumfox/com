const Announcement = require('../models/Announcement');
const logger = require('../config/logger');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { invalidateResourceCache } = require('../utils/cache');
const { publishEvent } = require('../services/eventService'); // NEW: Import event service

// @desc    Get all announcements
// @route   GET /api/v1/announcements
// @access  Public
const getAnnouncements = asyncHandler(async (req, res, next) => {
    const announcements = await Announcement.find().sort({ date: -1 });
    res.json({ success: true, count: announcements.length, data: announcements });
});

// @desc    Create a new announcement
// @route   POST /api/v1/announcements
// @access  Private (Admin only)
const createAnnouncement = asyncHandler(async (req, res, next) => {
    const { text } = req.body;

    const newAnnouncement = new Announcement({ text });
    await newAnnouncement.save();

    await invalidateResourceCache('announcements');
    // publishEvent('announcementCreated', newAnnouncement); // Example of publishing an event

    logger.info(`New announcement published: ${newAnnouncement._id}`);
    res.status(201).json({ success: true, message: 'Announcement published successfully', data: newAnnouncement });
});

// @desc    Update an announcement
// @route   PUT /api/v1/announcements/:id
// @access  Private (Admin only)
const updateAnnouncement = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const { text } = req.body;

    const announcement = await Announcement.findById(id);

    if (!announcement) {
        return next(new ApiError('Announcement not found', 404));
    }

    announcement.text = text || announcement.text;
    await announcement.save();

    await invalidateResourceCache('announcements');
    // publishEvent('announcementUpdated', announcement); // Example of publishing an event

    logger.info(`Announcement updated: ${announcement._id}`);
    res.json({ success: true, message: 'Announcement updated successfully', data: announcement });
});

// @desc    Delete an announcement
// @route   DELETE /api/v1/announcements/:id
// @access  Private (Admin only)
const deleteAnnouncement = asyncHandler(async (req, res, next) => {
    const { id } = req.params;

    const announcement = await Announcement.findByIdAndDelete(id);

    if (!announcement) {
        return next(new ApiError('Announcement not found', 404));
    }

    await invalidateResourceCache('announcements');
    // publishEvent('announcementDeleted', announcement._id); // Example of publishing an event

    logger.info(`Announcement deleted: ${announcement._id}`);
    res.json({ success: true, message: 'Announcement deleted successfully' });
});

module.exports = {
    getAnnouncements,
    createAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
};
