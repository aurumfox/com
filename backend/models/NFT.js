const mongoose = require('mongoose');
const { isValidSolanaAddress } = require('../utils/validation'); // Corrected path

const nftSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true, minlength: 3, maxlength: 100 },
    description: { type: String, trim: true, maxlength: 1000 },
    image: { type: String, required: true, trim: true, match: /^https?:\/\/.+/ },
    mint: { type: String, required: true, unique: true, index: true, trim: true, minlength: 32, maxlength: 44 },
    owner: {
        type: String,
        required: true,
        trim: true,
        validate: {
            validator: (v) => isValidSolanaAddress(v),
            message: props => `${props.value} is not a valid Solana address!`
        }
    },
    isListed: { type: Boolean, default: false },
    price: { type: Number, min: 0, required: function() { return this.isListed; } },
    listedAt: Date,
    listingDuration: { type: Number, min: 1, required: function() { return this.isListed; } },
    listedBy: {
        type: String,
        trim: true,
        validate: {
            validator: (v) => !v || isValidSolanaAddress(v),
            message: props => `${props.value} is not a valid Solana address!`
        }
    },
    attributes: [{
        trait_type: { type: String, trim: true, minlength: 1, maxlength: 50 },
        value: { type: String, trim: true, minlength: 1, maxlength: 100 }
    }],
    history: [{
        type: { type: String, enum: ['Mint', 'Transfer', 'Sale', 'List', 'Delist'], required: true },
        from: { type: String, trim: true },
        to: { type: String, trim: true },
        price: Number,
        timestamp: { type: Date, default: Date.now }
    }]
}, { timestamps: true });
module.exports = mongoose.model('Nft', nftSchema);
