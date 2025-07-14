const mongoose = require('mongoose');
const announcementSchema = new mongoose.Schema({
    text: { type: String, required: true, trim: true, minlength: 5, maxlength: 500 },
}, { timestamps: true });
module.exports = mongoose.model('Announcement', announcementSchema);
