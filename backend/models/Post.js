const mongoose = require('mongoose');
const { isValidSolanaAddress, isValidURL } = require('../utils/validators'); // Предполагается, что вы создадите utils/validators.js

const photoSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Photo title is required.'],
        trim: true,
        minlength: [3, 'Photo title must be at least 3 characters long.'],
        maxlength: [100, 'Photo title cannot exceed 100 characters.']
    },
    description: {
        type: String,
        trim: true,
        maxlength: [500, 'Photo description cannot exceed 500 characters.'],
        default: '' // Описание может быть необязательным
    },
    imageUrl: {
        type: String,
        required: [true, 'Image URL is required.'],
        trim: true,
        validate: {
            validator: isValidURL, // Используем валидатор URL
            message: props => `${props.value} is not a valid URL for the image.`
        }
    },
    creatorWallet: {
        type: String,
        required: [true, 'Creator wallet address is required.'],
        trim: true,
        validate: {
            validator: isValidSolanaAddress, // Используем валидатор Solana адреса
            message: props => `${props.value} is not a valid Solana wallet address.`
        }
    },
    // Дополнительные поля, если нужны (например, теги, категория, лайки/дизлайки)
    tags: [{
        type: String,
        trim: true,
        lowercase: true
    }],
    category: {
        type: String,
        trim: true,
        default: 'General'
    }
}, {
    timestamps: true // Автоматически добавляет createdAt и updatedAt
});

// Индексы для оптимизации поиска
photoSchema.index({ creatorWallet: 1 });
photoSchema.index({ createdAt: -1 });
photoSchema.index({ title: 'text', description: 'text' }); // Полнотекстовый поиск по заголовку и описанию

module.exports = mongoose.model('Photo', photoSchema);
