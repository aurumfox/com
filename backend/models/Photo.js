const mongoose = require('mongoose');
const { isValidSolanaAddress } = require('../utils/validation'); // Corrected path

const photoSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true, minlength: 3, maxlength: 100 },
    description: { type: String, trim: true, maxlength: 1000 },
    imageUrl: { type: String, required: true, trim: true, match: /^https?:\/\/.+/ },
    creatorWallet: {
        type: String,
        required: true,
        trim: true,
        validate: {
            validator: (v) => isValidSolanaAddress(v),
            message: props => `${props.value} is not a valid Solana address!`
        }
    },
}, { timestamps: true });
module.exports = mongoose.model('Photo', photoSchema);
