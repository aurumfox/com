const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Предполагаем, что вы создадите этот файл:
// project_root/config/constants.js
// module.exports = {
//   ROLES: {
//     USER: 'user',
//     ADMIN: 'admin',
//     DEVELOPER: 'developer',
//     ADVERTISER: 'advertiser',
//     PUBLISHER: 'publisher',
//   },
//   // Другие константы...
// };
const { ROLES } = require('../config/constants'); 

// Предполагаем, что вы создадите этот файл:
// project_root/utils/solanaValidation.js
// function isValidSolanaAddress(address) {
//     if (typeof address !== 'string' || address.length < 32 || address.length > 44) {
//         return false;
//     }
//     try {
//         // This line would require @solana/web3.js to be installed and imported
//         // const { PublicKey } = require('@solana/web3.js');
//         // new PublicKey(address);
//         return true; // Simplified for now, real validation needs @solana/web3.js
//     } catch (e) {
//         return false;
//     }
// }
// module.exports = { isValidSolanaAddress };
const { isValidSolanaAddress } = require('../utils/solanaValidation');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: false, 
        unique: true,
        sparse: true, 
        trim: true,
        minlength: [3, 'Username must be at least 3 characters long.'],
        maxlength: [30, 'Username cannot exceed 30 characters.']
    },
    walletAddress: {
        type: String,
        required: [true, 'Wallet address is required.'],
        unique: true,
        trim: true,
        minlength: [32, 'Solana wallet address must be at least 32 characters long.'],
        maxlength: [44, 'Solana wallet address cannot exceed 44 characters.'],
        index: true,
        validate: {
            validator: (v) => isValidSolanaAddress(v),
            message: props => `${props.value} is not a valid Solana address!`
        }
    },
    password: { 
        type: String,
        required: [true, 'Password is required.'],
        minlength: [8, 'Password must be at least 8 characters long.'] 
    },
    role: { 
        type: String,
        enum: {
            values: Object.values(ROLES),
            message: 'Invalid role. Allowed roles: {VALUE}'
        },
        default: ROLES.USER,
        required: true 
    }
}, {
    timestamps: true 
});

// --- Pre-save hook: Hash password and enforce strong password requirements ---
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) {
        return next();
    }

    const password = this.password;

    // Enforce strong password requirements
    if (password.length < 8) {
        return next(new mongoose.Error.ValidationError({
            message: 'Password must be at least 8 characters long.',
            errors: { password: { message: 'Password too short.' } }
        }));
    }
    if (!/[A-Z]/.test(password)) {
        return next(new mongoose.Error.ValidationError({
            message: 'Password must include at least one uppercase letter.',
            errors: { password: { message: 'Missing uppercase letter.' } }
        }));
    }
    if (!/[a-z]/.test(password)) {
        return next(new mongoose.Error.ValidationError({
            message: 'Password must include at least one lowercase letter.',
            errors: { password: { message: 'Missing lowercase letter.' } }
        }));
    }
    if (!/[0-9]/.test(password)) {
        return next(new mongoose.Error.ValidationError({
            message: 'Password must include at least one number.',
            errors: { password: { message: 'Missing number.' } }
        }));
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
        return next(new mongoose.Error.ValidationError({
            message: 'Password must include at least one special character.',
            errors: { password: { message: 'Missing special character.' } }
        }));
    }

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(password, salt);
    next();
});

// --- Method for comparing passwords ---
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// --- Configure toJSON to remove sensitive fields and transform _id ---
userSchema.set('toJSON', {
    virtuals: true, 
    transform: (doc, ret) => {
        // Mongoose automatically adds 'id' virtual for _id when virtuals are true
        delete ret._id;       
        delete ret.__v;       
        delete ret.password;  
        return ret;
    }
});

const User = mongoose.model('User', userSchema);

module.exports = User;
