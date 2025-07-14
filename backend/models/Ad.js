const mongoose = require('mongoose');
const adSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true, minlength: 3, maxlength: 100 },
    content: { type: String, required: true, trim: true, minlength: 10, maxlength: 1000 },
    imageUrl: { type: String, trim: true, match: /^https?:\/\/.+/, default: null },
    link: { type: String, trim: true, match: /^https?:\/\/.+/, default: null },
    advertiser: { type: String, trim: true, minlength: 3, maxlength: 100 },
}, { timestamps: true });
module.exports = mongoose.model('Ad', adSchema);
