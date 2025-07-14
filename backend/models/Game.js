const mongoose = require('mongoose');
const gameSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true, minlength: 3, maxlength: 100 },
    description: { type: String, trim: true, maxlength: 1000 },
    url: { type: String, required: true, trim: true, match: /^https?:\/\/.+/ },
    developer: { type: String, trim: true, minlength: 3, maxlength: 100 },
}, { timestamps: true });
module.exports = mongoose.model('Game', gameSchema);
