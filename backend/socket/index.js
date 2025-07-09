const { Server } = require('socket.io');
const logger = require('../config/logger');
const jwt = require('jsonwebtoken'); // Assuming JWT for socket authentication
const ApiError = require('../utils/ApiError'); // For consistent error handling
const { ROLES } = require('../config/constants'); // If using roles for socket auth/authz

let ioInstance = null;

/**
 * Initializes the Socket.IO server.
 * This should be called once when your HTTP server starts.
 *
 * @param {object} httpServer - The HTTP server instance (e.g., from `app.listen()`).
 * @returns {Server} The initialized Socket.IO server instance.
 */
const initializeSocketIO = (httpServer) => {
    if (ioInstance) {
        logger.warn('Socket.IO instance already initialized. Returning existing instance.');
        return ioInstance;
    }

    // Configure CORS origins securely.
    // In production, process.env.CORS_ORIGINS should be a comma-separated list of your exact frontend origins.
    // For development, allow localhost. Wildcard '*' should be used with extreme caution.
    const corsOrigins = process.env.CORS_ORIGINS
        ? process.env.CORS_ORIGINS.split(',')
        : ['http://127.0.0.1:5500', 'http://localhost:5500', 'http://localhost:3000', 'http://127.0.0.1:3000'];

    ioInstance = new Server(httpServer, {
        cors: {
            origin: corsOrigins,
            methods: ['GET', 'POST'],
            credentials: true // Allow sending cookies/auth headers if needed
        },
        // Optional: Configure ping/pong intervals for heartbeat.
        // Adjust these based on network conditions and desired responsiveness.
        pingInterval: 25000, // Send ping every 25 seconds
        pingTimeout: 5000,   // Wait 5 seconds for pong response before considering disconnected
        // Optional: Max HTTP buffer size for large events
        maxHttpBufferSize: 1e8 // 100 MB
    });

    // --- Socket.IO Authentication Middleware (Optional but Recommended for dApps) ---
    // This middleware runs for every new connection.
    ioInstance.use(async (socket, next) => {
        const token = socket.handshake.auth.token || socket.handshake.query.token;

        if (!token) {
            logger.warn(`Socket authentication failed for ID ${socket.id}: No token provided.`);
            // Use an Error object to pass to next() for consistent error handling
            return next(new Error('Authentication token required.'));
        }

        if (!process.env.JWT_SECRET) {
            logger.error('JWT_SECRET environment variable is not defined for Socket.IO authentication!');
            return next(new Error('Server configuration error: JWT secret missing.'));
        }

        try {
            // Verify the token using your JWT secret
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            // Attach the decoded user payload to the socket object
            socket.user = decoded; 
            logger.info(`Socket authenticated: ${socket.id} for user ${socket.user.walletAddress} (Role: ${socket.user.role})`);
            next(); // Authentication successful, proceed
        } catch (error) {
            logger.warn(`Socket authentication failed for ID ${socket.id}: Invalid or expired token. Error: ${error.message}`);
            if (error.name === 'TokenExpiredError') {
                return next(new Error('Authentication token has expired.'));
            }
            return next(new Error('Invalid authentication token.'));
        }
    });

    // --- Main Connection Handler ---
    ioInstance.on('connection', (socket) => {
        logger.info(`Socket connected and authenticated: ${socket.id} (User: ${socket.user ? socket.user.walletAddress : 'N/A'})`);

        socket.on('disconnect', (reason) => {
            logger.info(`Socket disconnected: ${socket.id} (Reason: ${reason})`);
            // Optional: Log if user was connected
            if (socket.user) {
                logger.debug(`User ${socket.user.walletAddress} disconnected.`);
            }
        });

        // --- Event Handlers with Authorization Examples ---

        // Example: Join a room for NFT updates (requires authentication)
        // Add authorization check if only certain roles can join specific NFT rooms
        socket.on('joinNftUpdates', (data, callback) => {
            if (!socket.user) {
                logger.warn(`Socket ${socket.id} attempted to join NFT room without authentication.`);
                return callback && callback(new ApiError('Authentication required to join NFT updates.'));
            }
            if (!data || !data.nftId) {
                logger.warn(`Socket ${socket.id} attempted to join NFT updates without nftId.`);
                return callback && callback(new ApiError('NFT ID is required to join NFT updates.'));
            }

            // Example authorization: Only users and publishers can join specific NFT rooms
            // if (![ROLES.USER, ROLES.PUBLISHER].includes(socket.user.role)) {
            //     logger.warn(`User ${socket.user.walletAddress} (Role: ${socket.user.role}) attempted unauthorized join to nft:${data.nftId}`);
            //     return callback && callback(new ApiError('Unauthorized: Insufficient role to join this NFT room.', 403));
            // }

            socket.join(`nft:${data.nftId}`);
            logger.info(`Socket ${socket.id} (User: ${socket.user.walletAddress}) joined room nft:${data.nftId}`);
            callback && callback({ success: true, message: `Joined room nft:${data.nftId}` });
        });

        // Example: Leave an NFT updates room
        socket.on('leaveNftUpdates', (data, callback) => {
            if (data && data.nftId) {
                socket.leave(`nft:${data.nftId}`);
                logger.info(`Socket ${socket.id} (User: ${socket.user.walletAddress}) left room nft:${data.nftId}`);
                callback && callback({ success: true, message: `Left room nft:${data.nftId}` });
            } else {
                callback && callback(new ApiError('NFT ID is required to leave NFT updates.'));
            }
        });

        // Example: Join a room for general announcements (might not require specific roles)
        socket.on('joinAnnouncements', (callback) => {
            if (!socket.user) { // Even for general rooms, authentication is often good
                logger.warn(`Socket ${socket.id} attempted to join announcements without authentication.`);
                return callback && callback(new ApiError('Authentication required to join announcements.'));
            }
            socket.join('announcements');
            logger.info(`Socket ${socket.id} (User: ${socket.user.walletAddress}) joined announcements room.`);
            callback && callback({ success: true, message: 'Joined announcements room.' });
        });

        // Example: Send a chat message (requires authentication)
        socket.on('sendMessage', (messageData, callback) => {
            if (!socket.user) {
                logger.warn(`Socket ${socket.id} attempted to send message without authentication.`);
                return callback && callback(new ApiError('Authentication required to send messages.'));
            }
            if (!messageData || !messageData.message || !messageData.roomId) {
                logger.warn(`Socket ${socket.id} attempted to send incomplete message.`);
                return callback && callback(new ApiError('Message content and room ID are required.'));
            }

            const { message, roomId } = messageData;
            const chatMessage = {
                senderId: socket.user.id,
                senderWallet: socket.user.walletAddress,
                role: socket.user.role,
                message: message,
                timestamp: new Date().toISOString()
            };

            // Emit to all sockets in the specific room
            ioInstance.to(roomId).emit('newMessage', chatMessage);
            logger.info(`Message sent to room '${roomId}' by ${socket.user.walletAddress}: "${message}"`);
            callback && callback({ success: true, message: 'Message sent.' });
        });

        // Handle client-side errors for events
        socket.on('error', (error) => {
            logger.error(`Socket error for ID ${socket.id}: ${error.message}`, error);
            // You might emit a specific error event back to the client if the error is safe to expose
            socket.emit('serverError', { message: 'An internal server error occurred for your request.' });
        });
    });

    logger.info('Socket.IO initialized and configured.');
    return ioInstance;
};

/**
 * Function to get the initialized Socket.IO instance.
 * Useful for emitting events from other parts of the application (e.g., controllers, services).
 *
 * @returns {Server|null} The Socket.IO server instance, or null if not yet initialized.
 */
const getSocketIOInstance = () => {
    if (!ioInstance) {
        logger.warn('Socket.IO instance not initialized. Call initializeSocketIO(httpServer) first.');
    }
    return ioInstance;
};

/**
 * Example of how to emit an event from another part of your application.
 * You would typically call `getSocketIOInstance().emit(...)` or `getSocketIOInstance().to(...).emit(...)`.
 */
// Example: Emitting a general announcement
// const emitNewAnnouncement = (announcementData) => {
//     const io = getSocketIOInstance();
//     if (io) {
//         io.to('announcements').emit('newAnnouncement', announcementData);
//         logger.info(`Emitted new announcement to 'announcements' room: ${announcementData.title}`);
//     }
// };

// Example: Emitting an NFT update to a specific room
// const emitNftUpdate = (nftId, updateData) => {
//     const io = getSocketIOInstance();
//     if (io) {
//         io.to(`nft:${nftId}`).emit('nftUpdated', updateData);
//         logger.info(`Emitted NFT update to room 'nft:${nftId}': ${updateData.name}`);
//     }
// };

module.exports = initializeSocketIO;
module.exports.getSocketIOInstance = getSocketIOInstance;
// module.exports.emitNewAnnouncement = emitNewAnnouncement; // Export if you use these helpers
// module.exports.emitNftUpdate = emitNftUpdate;
