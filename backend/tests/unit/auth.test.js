const bcrypt = require('bcryptjs');
const User = require('../../models/User'); // Adjust path as needed
const { generateToken } = require('../../utils/auth'); // Adjust path as needed

// Mock Mongoose model methods
jest.mock('../../models/User', () => ({
    findById: jest.fn(),
    create: jest.fn(),
    findOne: jest.fn(),
}));

describe('User Model', () => {
    beforeEach(() => {
        jest.clearAllMocks(); // Clear mocks before each test
    });

    it('should hash password before saving', async () => {
        const user = new User({
            walletAddress: 'test_wallet_address',
            password: 'plainpassword123',
        });

        // Simulate pre-save hook
        await user.pre('save', async function (next) {
            if (!this.isModified('password')) {
                return next();
            }
            const salt = await bcrypt.genSalt(10);
            this.password = await bcrypt.hash(this.password, salt);
            next();
        })(); // Immediately invoke the function returned by pre-save

        expect(user.password).not.toBe('plainpassword123');
        expect(await bcrypt.compare('plainpassword123', user.password)).toBe(true);
    });

    it('should match password correctly', async () => {
        const hashedPassword = await bcrypt.hash('plainpassword123', 10);
        const user = new User({
            walletAddress: 'test_wallet_address',
            password: hashedPassword,
        });

        expect(await user.matchPassword('plainpassword123')).toBe(true);
        expect(await user.matchPassword('wrongpassword')).toBe(false);
    });
});

describe('Auth Utilities', () => {
    it('should generate a valid JWT token', () => {
        const userId = 'someUserId123';
        const token = generateToken(userId);
        expect(typeof token).toBe('string');
        expect(token.length).toBeGreaterThan(0);
        // Further validation would involve decoding the token using the secret
    });
});
