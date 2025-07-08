// socket/index.js
const { Server } = require('socket.io');
const logger = require('../config/logger');

let ioInstance = null;

const initializeSocketIO = (httpServer) => {
    if (ioInstance) {
        return ioInstance;
    }

    ioInstance = new Server(httpServer, {
        cors: {
            origin: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : ['http://127.0.0.1:5500', 'http://localhost:5500'],
            methods: ['GET', 'POST'],
            credentials: true
        }
    });

    ioInstance.on('connection', (socket) => {
        logger.info(`Socket connected: ${socket.id}`);

        socket.on('disconnect', () => {
            logger.info(`Socket disconnected: ${socket.id}`);
        });

        // Example: Join a room for NFT updates
        socket.on('joinNftUpdates', (data) => {
            if (data && data.nftId) {
                socket.join(`nft:${data.nftId}`);
                logger.info(`Socket ${socket.id} joined room nft:${data.nftId}`);
            }
        });

        // Example: Join a room for general announcements
        socket.on('joinAnnouncements', () => {
            socket.join('announcements');
            logger.info(`Socket ${socket.id} joined announcements room.`);
        });

        // You can add more specific event handlers here
    });

    logger.info('Socket.IO initialized');
    return ioInstance;
};

// Function to get the Socket.IO instance (e.g., for controllers/services to emit events)
const getSocketIOInstance = () => {
    if (!ioInstance) {
        logger.warn('Socket.IO instance not initialized. Call initializeSocketIO first.');
    }
    return ioInstance;
};

module.exports = initializeSocketIO;
module.exports.getSocketIOInstance = getSocketIOInstance;
