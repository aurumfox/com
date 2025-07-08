// events/userEvents.js
const { eventEmitter } = require('./index');
const logger = require('../config/logger');
// const { sendWelcomeEmail } = require('../services/emailService'); // Conceptual email service

// Event: 'userRegistered'
eventEmitter.on('userRegistered', async (user) => {
    logger.info(`Event: User Registered - ${user.walletAddress}`);
    // Example: Send a welcome email
    // await sendWelcomeEmail(user.email, user.walletAddress);
    // Example: Initialize user preferences in another service
});

// Event: 'userLoggedIn'
eventEmitter.on('userLoggedIn', (user) => {
    logger.info(`Event: User Logged In - ${user.walletAddress}`);
    // Example: Update last login timestamp, track active users
});
