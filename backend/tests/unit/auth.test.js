const bcrypt = require('bcryptjs');
const mongoose = require('mongoose'); // Import mongoose to mock actual model behavior
const jwt = require('jsonwebtoken'); // Import jwt to verify token generation

// IMPORTANT: Ensure paths are correct based on your project structure
// Assuming User model is at '../../models/User'
// Assuming generateToken utility is at '../../utils/auth' (or wherever your JWT generation lives)
// Assuming constants (like JWT_SECRET) are at '../../config/constants' or from process.env
const User = require('../../models/User'); 
const { generateToken } = require('../../utils/auth'); 

// Mock mongoose connect/disconnect if needed for real DB testing, but for unit tests,
// we mostly mock the model's static methods.
// For unit tests, we want to mock the actual mongoose model methods, not just the file.
// The `jest.mock` should ideally point to the actual model path.

// Mock the User model's static methods that are called directly on `User`
// (e.g., User.findOne, User.create, User.findById)
jest.mock('../../models/User', () => {
    // We need to retain the actual schema and pre-save hooks for testing instance methods
    // while mocking static methods. This is a bit tricky with `jest.mock`.
    // A better approach for schema/hook testing is often a small integration test or
    // explicitly testing the pre-save hook function itself.
    // For this unit test, let's assume `User` is a simple object that we mock methods on.
    const mockUserInstance = {
        walletAddress: '',
        password: '',
        matchPassword: jest.fn(), // Mock instance method
        save: jest.fn(), // Mock save method
        isModified: jest.fn(), // Mock Mongoose's isModified
    };

    return {
        findById: jest.fn(),
        create: jest.fn(),
        findOne: jest.fn(),
        // When `new User()` is called, return our mock instance
        // This allows testing instance methods like `matchPassword` and `pre('save')` behavior
        // by manually setting up the mock's behavior.
        // For pre-save specifically, you often need a closer mock of mongoose.
        // Let's refine this to make it more testable.
        // A common pattern is to test the pre-save logic in isolation or via integration tests.
        // For `matchPassword`, we can just mock it directly.
        // For `pre('save')`, if it's external, you test it directly. If internal, you'd mock the User constructor
        // to have a mocked `pre` method, which is complex.
        // Simpler for unit tests: mock the outcome of `save` after a mock hook is run.
        __esModule: true, // Needed for ES Modules compatibility with Jest mocks
        default: jest.fn().mockImplementation((data) => {
            // This mock allows `new User(data)` to create an object we can control
            const instance = { ...data }; // Copy data to the instance
            // Mock Mongoose instance methods
            instance.save = jest.fn().mockResolvedValue(instance); // Simulate save returning the instance
            instance.isModified = jest.fn((field) => field === 'password'); // Simulate password always modified for these tests
            instance.matchPassword = jest.fn(async (enteredPassword) => {
                return bcrypt.compare(enteredPassword, instance.password);
            });
            // This setup is for testing the `matchPassword` later.
            // For `pre('save')`, it's still tricky because it's a Mongoose specific hook.
            // Let's adjust the `pre('save')` test to manually call the hashing logic.
            return instance;
        }),
    };
});

// Mock bcryptjs to control its output and ensure it's called
jest.mock('bcryptjs', () => ({
    genSalt: jest.fn(() => Promise.resolve('mockSalt')),
    hash: jest.fn((password, salt) => Promise.resolve(`hashed_${password}_${salt}`)),
    compare: jest.fn((plain, hashed) => Promise.resolve(plain === hashed.replace('hashed_', '').replace('_mockSalt', ''))),
}));

// Mock `process.env.JWT_SECRET` for testing JWT generation
const MOCK_JWT_SECRET = 'your_test_jwt_secret_for_testing';
process.env.JWT_SECRET = MOCK_JWT_SECRET; // Set it for the duration of tests

describe('User Model Functionality', () => {
    beforeEach(() => {
        jest.clearAllMocks(); // Clear mocks before each test
        // Reset the mock implementation of `User` constructor
        // to ensure a fresh instance for each test.
        User.default.mockImplementation((data) => {
            const instance = { ...data };
            instance.save = jest.fn().mockResolvedValue(instance);
            instance.isModified = jest.fn((field) => field === 'password');
            instance.matchPassword = jest.fn(async (enteredPassword) => {
                return bcrypt.compare(enteredPassword, instance.password);
            });
            return instance;
        });
    });

    // Test password hashing before saving (simulating a pre-save hook)
    // Note: This is a unit test of the *logic* of hashing, not Mongoose's hook system itself.
    it('should hash password before saving (manual hook simulation)', async () => {
        const plainPassword = 'plainpassword123';
        const user = new User({
            walletAddress: 'test_wallet_address',
            password: plainPassword,
        });

        // Manually apply the hashing logic that would typically be in a pre-save hook
        if (user.isModified('password')) {
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(user.password, salt);
        }

        // Verify bcrypt.genSalt and bcrypt.hash were called
        expect(bcrypt.genSalt).toHaveBeenCalledWith(10);
        expect(bcrypt.hash).toHaveBeenCalledWith(plainPassword, 'mockSalt');

        // Verify the password was changed
        expect(user.password).not.toBe(plainPassword);
        // Verify the hashed password can be compared back to the original
        expect(await bcrypt.compare(plainPassword, user.password)).toBe(true);
    });

    // Test the `matchPassword` instance method
    it('should match password correctly', async () => {
        const plainPassword = 'plainpassword123';
        const hashedPassword = await bcrypt.hash(plainPassword, 'mockSalt'); // Use mock hash result

        const user = new User({
            walletAddress: 'test_wallet_address',
            password: hashedPassword, // Set the hashed password on the user instance
        });

        // Use the mocked `matchPassword` method of the user instance
        const isMatch = await user.matchPassword(plainPassword);
        expect(isMatch).toBe(true);
        expect(bcrypt.compare).toHaveBeenCalledWith(plainPassword, hashedPassword);

        const isWrongMatch = await user.matchPassword('wrongpassword');
        expect(isWrongMatch).toBe(false);
        // bcrypt.compare should be called again for the second check
        expect(bcrypt.compare).toHaveBeenCalledWith('wrongpassword', hashedPassword);
    });

    it('should not hash password if not modified', async () => {
        const user = new User({
            walletAddress: 'test_wallet_address',
            password: 'existing_hashed_password',
        });
        
        // Mock isModified to return false for 'password'
        user.isModified.mockReturnValue(false);

        const originalPassword = user.password;

        // Manually apply the hashing logic (simulating pre-save)
        if (user.isModified('password')) {
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(user.password, salt);
        }

        expect(bcrypt.genSalt).not.toHaveBeenCalled();
        expect(bcrypt.hash).not.toHaveBeenCalled();
        expect(user.password).toBe(originalPassword); // Password should remain unchanged
    });
});

describe('Auth Utilities - generateToken', () => {
    beforeAll(() => {
        // Set JWT_SECRET for the duration of this describe block
        process.env.JWT_SECRET = MOCK_JWT_SECRET;
    });

    afterAll(() => {
        // Clean up JWT_SECRET after tests
        delete process.env.JWT_SECRET;
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should generate a valid JWT token with correct payload and secret', () => {
        const userId = 'someUserId123';
        const userRole = ROLES.USER; // Assuming ROLES.USER exists and is 'user'
        const walletAddress = 'mockWalletAddress123';

        // Mock `User` model methods if generateToken relies on them directly to build payload
        // If generateToken takes `user` object as argument, mock that.
        // Assuming generateToken takes `userId`, `walletAddress`, and `role`
        const token = generateToken({ id: userId, walletAddress, role: userRole });

        expect(typeof token).toBe('string');
        expect(token.length).toBeGreaterThan(0);

        // Verify the token's content using the mock secret
        const decoded = jwt.verify(token, MOCK_JWT_SECRET);

        expect(decoded).toMatchObject({
            id: userId,
            walletAddress: walletAddress,
            role: userRole,
        });
        // Check for common JWT properties like 'iat' and 'exp' if your generateToken adds them
        expect(decoded).toHaveProperty('iat');
        expect(decoded).toHaveProperty('exp');
    });

    it('should throw an error if JWT_SECRET is not defined', () => {
        // Temporarily unset JWT_SECRET for this test
        const originalSecret = process.env.JWT_SECRET;
        delete process.env.JWT_SECRET;

        const userId = 'someUserId123';
        const userRole = ROLES.USER;
        const walletAddress = 'mockWalletAddress123';

        expect(() => generateToken({ id: userId, walletAddress, role: userRole }))
            .toThrow('JWT_SECRET is not defined in environment variables.'); // Or whatever error message generateToken throws

        // Restore JWT_SECRET
        process.env.JWT_SECRET = originalSecret;
    });
});
