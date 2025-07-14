const logger = require('../config/logger');
const ApiError = require('../utils/ApiError');
const { ROLES } = require('../config/constants'); // Assuming you have ROLES constant
const Joi = require('joi'); // For server-side validation within resolvers
// Import Joi schemas if you have them centralized, e.g., from validationMiddleware.js
// const { schemas } = require('../middleware/validationMiddleware');

// --- Joi Schemas for Resolver Input Validation (Example) ---
// It's good practice to validate inputs at the resolver level,
// in addition to any HTTP-level validation for REST endpoints.
const createUserSchema = Joi.object({
    walletAddress: Joi.string().required().min(32).max(44).messages({
        'string.empty': 'Wallet address cannot be empty.',
        'string.min': 'Wallet address must be at least 32 characters long.',
        'string.max': 'Wallet address cannot exceed 44 characters.',
        'any.required': 'Wallet address is required.'
    }),
    password: Joi.string().required().min(6).messages({
        'string.empty': 'Password cannot be empty.',
        'string.min': 'Password must be at least 6 characters long.',
        'any.required': 'Password is required.'
    }),
    role: Joi.string().valid(...Object.values(ROLES)).default(ROLES.USER)
});

const updateUserRoleSchema = Joi.object({
    id: Joi.string().required().pattern(/^[0-9a-fA-F]{24}$/).messages({
        'string.pattern.base': 'User ID must be a valid MongoDB ObjectId.',
        'any.required': 'User ID is required.'
    }),
    role: Joi.string().valid(...Object.values(ROLES)).required().messages({
        'any.only': `Role must be one of ${Object.values(ROLES).join(', ')}.`,
        'any.required': 'Role is required.'
    })
});

const createAnnouncementSchema = Joi.object({
    text: Joi.string().required().min(5).max(500).messages({
        'string.empty': 'Announcement text cannot be empty.',
        'string.min': 'Announcement text must be at least 5 characters long.',
        'string.max': 'Announcement text cannot exceed 500 characters.',
        'any.required': 'Announcement text is required.'
    })
});

// Helper function for authorization check
const checkAuthorization = (user, allowedRoles) => {
    if (!user || !user.role) {
        logger.warn('Authorization attempt without authenticated user or role.');
        throw ApiError.unauthorized('Authentication required.');
    }
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    if (!roles.includes(user.role)) {
        logger.warn(`Authorization denied for user ${user.walletAddress} (Role: ${user.role}). Required roles: [${roles.join(', ')}].`);
        throw ApiError.forbidden(`Access denied. Requires one of the following roles: ${roles.join(', ')}.`);
    }
};

const rootResolver = {
    // Basic test query
    hello: () => {
        logger.info('GraphQL "hello" query executed.');
        return 'Hello from GraphQL!';
    },

    // --- User Resolvers ---
    /**
     * Fetches a single user by wallet address, including Solana balance and SPL tokens.
     * Accessible by anyone for public profiles, but sensitive data should be restricted.
     */
    user: async ({ walletAddress }, context) => {
        // Example of simple input validation
        if (!walletAddress) {
            throw ApiError.badRequest('Wallet address is required to fetch a user.');
        }

        const userService = context.container.resolve('userService'); // Access container via context
        const user = await userService.getUserByWalletAddress(walletAddress); 
        if (!user) {
            logger.warn(`User not found for walletAddress: ${walletAddress}`);
            throw ApiError.notFound('User not found.');
        }
        
        try {
            // Fetch Solana balance and SPL tokens - these are public data on blockchain
            user.solanaBalance = await userService.getSolanaBalance(user.walletAddress);
            user.splTokens = await userService.getSplTokenBalances(user.walletAddress);
        } catch (error) {
            logger.error(`Failed to fetch Solana balance/SPL tokens for ${walletAddress}:`, error);
            // Decide if you want to throw an error or just return user without balances
            // For now, let's just log and continue, as the user object itself was found.
            // You might add `user.solanaBalance = 0; user.splTokens = [];`
        }

        return user;
    },

    /**
     * Fetches all users. Typically restricted to admin/developer roles.
     */
    users: async (args, context) => {
        // Authorization: Only admin or developer can view all users
        checkAuthorization(context.user, [ROLES.ADMIN, ROLES.DEVELOPER]);

        const userService = context.container.resolve('userService');
        const users = await userService.getAllUsers();
        logger.debug(`Fetched ${users.length} users.`);
        return users;
    },

    /**
     * Registers a new user. This often corresponds to an HTTP POST endpoint for auth.
     * Consider making this an HTTP endpoint for better separation of concerns,
     * especially if it involves complex redirects or cookie management.
     */
    createUser: async ({ walletAddress, password, role }, context) => {
        // Input Validation using Joi
        const { error, value } = createUserSchema.validate({ walletAddress, password, role });
        if (error) {
            const errors = error.details.map(detail => detail.message);
            throw ApiError.badRequest('Validation error', errors);
        }

        // Authorization: Only 'admin' or 'developer' can create users with specific roles,
        // or a default 'user' role is allowed for anyone (e.g., initial signup).
        // If a role is specified and it's not the default 'user' role, require admin.
        if (value.role !== ROLES.USER) {
            checkAuthorization(context.user, ROLES.ADMIN);
            logger.info(`Admin user ${context.user.walletAddress} creating user with role: ${value.role}`);
        } else {
             // For public signup, you might not require authentication here,
             // or you might only allow authenticated admins to create new users.
             // For now, assuming anyone can register as 'user'.
             logger.info(`New user registration for wallet: ${value.walletAddress} (default role: ${ROLES.USER})`);
        }


        const userService = context.container.resolve('userService');
        try {
            const newUser = await userService.registerUser(value.walletAddress, value.password, value.role);
            return newUser;
        } catch (error) {
            // Catch specific service errors, e.g., duplicate wallet address
            if (error instanceof ApiError) {
                throw error; // Re-throw ApiErrors from service layer
            }
            logger.error(`Error creating user ${value.walletAddress}:`, error);
            throw ApiError.internal('Failed to create user.');
        }
    },

    /**
     * Updates a user's role. Strictly for admin use.
     */
    updateUserRole: async ({ id, role }, context) => {
        // Authorization: Only admin can update user roles
        checkAuthorization(context.user, ROLES.ADMIN);

        // Input Validation using Joi
        const { error, value } = updateUserRoleSchema.validate({ id, role });
        if (error) {
            const errors = error.details.map(detail => detail.message);
            throw ApiError.badRequest('Validation error', errors);
        }

        const userService = context.container.resolve('userService');
        try {
            const updatedUser = await userService.updateUserRole(value.id, value.role);
            if (!updatedUser) {
                logger.warn(`Attempted to update role for non-existent user ID: ${value.id}`);
                throw ApiError.notFound('User not found.');
            }
            logger.info(`Admin ${context.user.walletAddress} updated role for user ${value.id} to ${value.role}.`);
            return updatedUser;
        } catch (error) {
            if (error instanceof ApiError) {
                throw error; // Re-throw ApiErrors from service layer
            }
            logger.error(`Error updating user role for ${value.id}:`, error);
            throw ApiError.internal('Failed to update user role.');
        }
    },

    // --- NFT Resolvers ---
    /**
     * Fetches a single NFT by ID. Publicly accessible.
     */
    nft: async ({ id }, context) => {
        if (!id) throw ApiError.badRequest('NFT ID is required.');

        const nftService = context.container.resolve('nftService');
        const nft = await nftService.getNftById(id);
        if (!nft) {
            logger.warn(`NFT not found for ID: ${id}`);
            throw ApiError.notFound('NFT not found.');
        }
        return nft;
    },

    /**
     * Searches for NFTs by owner or listed status. Publicly accessible.
     */
    nfts: async ({ owner, isListed }, context) => {
        const nftService = context.container.resolve('nftService');
        const query = {};
        if (owner) query.owner = owner;
        if (typeof isListed === 'boolean') query.isListed = isListed;
        
        // Example: If a "private" flag exists on NFTs, apply authorization here.
        // E.g., if (query.private && (!context.user || context.user.role !== ROLES.ADMIN)) { ... }

        const nfts = await nftService.searchNfts(query);
        logger.debug(`Fetched ${nfts.length} NFTs for query: ${JSON.stringify(query)}`);
        return nfts;
    },

    /**
     * Lists an NFT for sale. Requires authentication and ownership verification.
     */
    listNFT: async ({ id, sellerWallet, price, duration }, context) => {
        // Authentication: User must be logged in
        checkAuthorization(context.user, [ROLES.USER, ROLES.PUBLISHER]); // Allow users or publishers to list

        // Input validation for price and duration
        if (typeof price !== 'number' || price <= 0) {
            throw ApiError.badRequest('Price must be a positive number.');
        }
        if (typeof duration !== 'number' || duration <= 0 || !Number.isInteger(duration)) {
            throw ApiError.badRequest('Duration must be a positive integer.');
        }

        // Authorization: Verify the authenticated user is the actual seller/owner
        // The `sellerWallet` from input should match `context.user.walletAddress`
        if (context.user.walletAddress !== sellerWallet) {
            logger.warn(`Unauthorized attempt to list NFT ${id}. User wallet ${context.user.walletAddress} does not match provided seller wallet ${sellerWallet}.`);
            throw ApiError.forbidden('You can only list NFTs owned by your authenticated wallet.');
        }
        
        const nftService = context.container.resolve('nftService');
        try {
            const listedNft = await nftService.listNft(id, sellerWallet, price, duration);
            logger.info(`NFT ${id} listed by ${sellerWallet} for ${price} for ${duration} days.`);
            return listedNft;
        } catch (error) {
            if (error instanceof ApiError) {
                throw error; 
            }
            logger.error(`Error listing NFT ${id}:`, error);
            throw ApiError.internal('Failed to list NFT.');
        }
    },

    /**
     * Buys an NFT. Requires authentication. The buyer is the authenticated user.
     */
    buyNFT: async ({ id }, context) => { // Removed buyerWallet from args as it comes from context
        // Authentication: User must be logged in
        checkAuthorization(context.user, ROLES.USER); // Only regular users can buy

        const nftService = context.container.resolve('nftService');
        const buyerWallet = context.user.walletAddress; // Use the authenticated user's wallet

        if (!id) throw ApiError.badRequest('NFT ID is required to buy.');

        try {
            const purchasedNft = await nftService.buyNft(id, buyerWallet);
            logger.info(`NFT ${id} purchased by ${buyerWallet}.`);
            return purchasedNft;
        } catch (error) {
            if (error instanceof ApiError) {
                throw error; 
            }
            logger.error(`Error buying NFT ${id} by ${buyerWallet}:`, error);
            throw ApiError.internal('Failed to purchase NFT.');
        }
    },

    // --- Announcement Resolvers ---
    /**
     * Fetches all announcements. Publicly accessible.
     */
    announcements: async (args, context) => {
        const announcementModel = context.container.resolve('announcementModel');
        const announcements = await announcementModel.find().sort({ date: -1 });
        logger.debug(`Fetched ${announcements.length} announcements.`);
        return announcements;
    },

    /**
     * Creates a new announcement. Restricted to admin role.
     */
    createAnnouncement: async ({ text }, context) => {
        // Authorization: Only admin can create announcements
        checkAuthorization(context.user, ROLES.ADMIN);

        // Input Validation using Joi
        const { error, value } = createAnnouncementSchema.validate({ text });
        if (error) {
            const errors = error.details.map(detail => detail.message);
            throw ApiError.badRequest('Validation error', errors);
        }

        const announcementModel = context.container.resolve('announcementModel');
        try {
            const newAnnouncement = new announcementModel({ text: value.text, author: context.user.id }); // Add author ID
            await newAnnouncement.save();
            logger.info(`Announcement created by admin ${context.user.walletAddress}: "${value.text.substring(0, 50)}..."`);
            return newAnnouncement;
        } catch (error) {
            logger.error(`Error creating announcement by ${context.user.walletAddress}:`, error);
            throw ApiError.internal('Failed to create announcement.');
        }
    }
    // Add more resolvers for other models (Photo, Post, Game, Ad) with similar validation/authorization patterns
};

module.exports = { rootResolver };
