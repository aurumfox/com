/**
 * @file Handles the MongoDB database connection using Mongoose.
 * Implements connection logic, error handling, and monitors connection events for robustness.
 */

const mongoose = require('mongoose');
const logger = require('./logger'); // Assuming your logger is correctly configured

// Define default connection options for Mongoose
const mongooseOptions = {
    // useNewUrlParser: true, // Deprecated in Mongoose 6+
    // useUnifiedTopology: true, // Deprecated in Mongoose 6+
    serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
    socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
    family: 4, // Use IPv4, skip trying IPv6
    // Add other options as needed for replica sets, authentication, etc.
    // user: process.env.MONGODB_USER,
    // pass: process.env.MONGODB_PASSWORD,
    // authSource: 'admin', // If using a specific auth database
};

/**
 * Connects to the MongoDB database.
 * Implements a retry mechanism for initial connection attempts.
 * @returns {Promise<void>} A promise that resolves when MongoDB is connected.
 * @throws {Error} If connection fails after retries.
 */
const connectDB = async () => {
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/solana_dapp_db';
    let attempts = 0;
    const MAX_ATTEMPTS = 10; // Max number of attempts to connect
    const RETRY_DELAY_MS = 5000; // Delay between retries in milliseconds

    while (attempts < MAX_ATTEMPTS) {
        try {
            const conn = await mongoose.connect(MONGODB_URI, mongooseOptions);
            logger.info(`MongoDB Connected: ${conn.connection.host}`);
            // Setup Mongoose connection event listeners here, *after* successful initial connection
            setupConnectionListeners(conn.connection);
            return; // Exit on successful connection
        } catch (err) {
            attempts++;
            logger.error(`MongoDB connection attempt ${attempts}/${MAX_ATTEMPTS} failed: ${err.message}. Retrying in ${RETRY_DELAY_MS / 1000} seconds...`);
            if (attempts < MAX_ATTEMPTS) {
                await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
            } else {
                logger.error('Max MongoDB connection attempts reached. Exiting process.');
                process.exit(1); // Exit process with failure after exhausting retries
            }
        }
    }
};

/**
 * Sets up event listeners for Mongoose connection.
 * These listeners help monitor the connection state during runtime.
 * @param {mongoose.Connection} connection - The Mongoose connection object.
 */
const setupConnectionListeners = (connection) => {
    connection.on('connected', () => {
        logger.info('Mongoose default connection open to DB.');
    });

    connection.on('error', (err) => {
        logger.error(`Mongoose connection error: ${err.message}`);
        // This indicates a problem *after* initial connection.
        // Mongoose/MongoDB drivers usually handle internal reconnection for a while.
        // For persistent errors, you might want to consider application-specific alerts or actions.
    });

    connection.on('disconnected', () => {
        logger.warn('Mongoose default connection disconnected.');
        // This could be due to network issues, database restart, etc.
        // Mongoose will attempt to reconnect based on its internal logic.
        // If your application cannot function without the DB, you might trigger alerts here.
    });

    // If the Node process ends, close the Mongoose connection
    process.on('SIGINT', async () => {
        await connection.close();
        logger.warn('Mongoose default connection disconnected through app termination.');
        process.exit(0); // Exit process gracefully
    });
};

module.exports = connectDB;
