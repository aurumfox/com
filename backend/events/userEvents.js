/**
 * @file This file contains event listeners for user-related events.
 * It subscribes to events emitted by the application's central event bus
 * and performs side effects such as sending welcome emails, logging login
 * activity, or triggering other user-centric updates.
 */

const { eventEmitter } = require('./index');
const logger = require('../config/logger');
// const { sendWelcomeEmail } = require('../services/emailService'); // Conceptual email service
// const { updateLastLogin } = require('../services/userService'); // Conceptual user service method
// const { trackUserActivity } = require('../services/analyticsService'); // Conceptual analytics service

/**
 * Event listener for 'userRegistered' event.
 * Triggered when a new user successfully registers.
 * @param {object} user - The user object that was registered.
 * @param {string} user.walletAddress - The wallet address of the registered user.
 * @param {string} [user.email] - Optional: The email address of the registered user.
 */
eventEmitter.on('userRegistered', async (user) => {
    try {
        logger.info(`Event: User Registered - Wallet: ${user.walletAddress}`);

        // Example: Send a welcome email (if email is part of your user model)
        // if (user.email && typeof sendWelcomeEmail === 'function') {
        //     await sendWelcomeEmail(user.email, user.walletAddress);
        //     logger.debug(`Welcome email sent to ${user.email} for wallet ${user.walletAddress}.`);
        // } else if (!user.email) {
        //     logger.warn(`Skipping welcome email for ${user.walletAddress}: No email address provided.`);
        // }

        // Example: Initialize user-specific data or preferences in another service
        // e.g., create an empty portfolio, set default notification settings
        // if (initializeUserPreferences) { // Conceptual function
        //     await initializeUserPreferences(user._id);
        //     logger.debug(`User preferences initialized for user ID: ${user._id}.`);
        // }

    } catch (error) {
        logger.error(`Error handling 'userRegistered' event for wallet ${user ? user.walletAddress : 'unknown'}:`, error);
        // You might re-emit an error on the main eventEmitter for centralized handling
        // eventEmitter.emit('error', new Error(`Failed to handle userRegistered: ${error.message}`));
    }
});

/**
 * Event listener for 'userLoggedIn' event.
 * Triggered when a user successfully logs in.
 * @param {object} user - The user object that logged in.
 * @param {string} user.walletAddress - The wallet address of the logged-in user.
 * @param {string} [user._id] - Optional: The MongoDB ID of the user.
 */
eventEmitter.on('userLoggedIn', async (user) => { // Made async to allow for await calls
    try {
        logger.info(`Event: User Logged In - Wallet: ${user.walletAddress}`);

        // Example: Update last login timestamp in the database
        // if (typeof updateLastLogin === 'function' && user._id) {
        //     await updateLastLogin(user._id);
        //     logger.debug(`Last login timestamp updated for user ID: ${user._id}.`);
        // } else {
        //     logger.warn(`Skipping last login update for ${user.walletAddress}: User ID not available or updateLastLogin not defined.`);
        // }

        // Example: Track active users or login metrics in an analytics service
        // if (typeof trackUserActivity === 'function') {
        //     await trackUserActivity(user._id, 'login');
        //     logger.debug(`User activity tracked for login of user ID: ${user._id}.`);
        // }

    } catch (error) {
        logger.error(`Error handling 'userLoggedIn' event for wallet ${user ? user.walletAddress : 'unknown'}:`, error);
    }
});

// You can add more specific user-related event listeners here, e.g.:
// eventEmitter.on('userProfileUpdated', async (userId) => { /* ... */ });
// eventEmitter.on('passwordChanged', async (userId) => { /* ... */ });
// eventEmitter.on('walletConnected', async (userId, newWallet) => { /* ... */ });
