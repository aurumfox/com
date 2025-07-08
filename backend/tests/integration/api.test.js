const request = require('supertest');
const app = require('../../app'); // Your main express app
const mongoose = require('mongoose');
const User = require('../../models/User');
const Announcement = require('../../models/Announcement');
const { generateToken } = require('../../utils/auth');
const { ROLES } = require('../../config/constants');

// Use a separate test database
const MONGODB_TEST_URI = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/solana_dapp_test_db';

let adminToken;
let userToken;
let adminUser;
let regularUser;

beforeAll(async () => {
    // Connect to test DB
    await mongoose.connect(MONGODB_TEST_URI);
    console.log('Connected to test DB');

    // Clean up DB before tests
    await User.deleteMany({});
    await Announcement.deleteMany({});

    // Create test users
    adminUser = await User.create({
        walletAddress: 'TEST_ADMIN_WALLET',
        password: 'adminpassword',
        role: ROLES.ADMIN
    });
    regularUser = await User.create({
        walletAddress: 'TEST_USER_WALLET',
        password: 'userpassword',
        role: ROLES.USER
    });

    adminToken = generateToken(adminUser._id);
    userToken = generateToken(regularUser._id);
});

afterAll(async () => {
    // Clean up DB after tests
    await User.deleteMany({});
    await Announcement.deleteMany({});
    // Disconnect from DB
    await mongoose.connection.close();
    console.log('Disconnected from test DB');
});

describe('Announcements API', () => {
    it('should get all announcements (public access)', async () => {
        await Announcement.create({ text: 'Test Announcement 1' });
        await Announcement.create({ text: 'Test Announcement 2' });

        const res = await request(app).get('/api/v1/announcements');
        expect(res.statusCode).toEqual(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    });

    it('should allow admin to create an announcement', async () => {
        const res = await request(app)
            .post('/api/v1/announcements')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ text: 'New Announcement by Admin' });

        expect(res.statusCode).toEqual(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.text).toEqual('New Announcement by Admin');
    });

    it('should prevent regular user from creating an announcement', async () => {
        const res = await request(app)
            .post('/api/v1/announcements')
            .set('Authorization', `Bearer ${userToken}`)
            .send({ text: 'New Announcement by User' });

        expect(res.statusCode).toEqual(403); // Forbidden
        expect(res.body.success).toBe(false);
        expect(res.body.message).toContain('Not authorized as admin');
    });

    it('should prevent unauthenticated user from creating an announcement', async () => {
        const res = await request(app)
            .post('/api/v1/announcements')
            .send({ text: 'New Announcement by Guest' });

        expect(res.statusCode).toEqual(401); // Unauthorized
        expect(res.body.success).toBe(false);
        expect(res.body.message).toContain('Not authorized, no token');
    });

    it('should allow admin to update an announcement', async () => {
        const announcement = await Announcement.create({ text: 'Original Text' });
        const res = await request(app)
            .put(`/api/v1/announcements/${announcement._id}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ text: 'Updated Text by Admin' });

        expect(res.statusCode).toEqual(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.text).toEqual('Updated Text by Admin');
    });

    it('should allow admin to delete an announcement', async () => {
        const announcement = await Announcement.create({ text: 'To be deleted' });
        const res = await request(app)
            .delete(`/api/v1/announcements/${announcement._id}`)
            .set('Authorization', `Bearer ${adminToken}`);

        expect(res.statusCode).toEqual(200);
        expect(res.body.success).toBe(true);
        expect(res.body.message).toContain('deleted successfully');

        const check = await Announcement.findById(announcement._id);
        expect(check).toBeNull();
    });
});
