const mongoose = require('mongoose');
const { isValidSolanaAddress } = require('../utils/validation'); // Corrected path

const postSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true, minlength: 5, maxlength: 200 },
    content: { type: String, required: true, trim: true, minlength: 10 },
    authorWallet: {
        type: String,
        required: true,
        trim: true,
        validate: {
            validator: (v) => isValidSolanaAddress(v),
            message: props => `${props.value} is not a valid Solana address!`
        }
    },
}, { timestamps: true });
module.exports = mongoose.model('Post', postSchema);
