/**
 * @file Service for managing user accounts, including authentication, roles,
 * and fetching blockchain-related user data (Solana balance, SPL tokens).
 * Integrates with database, cache, event bus, and external Solana RPC via circuit breaker.
 */

const bcrypt = require('bcryptjs'); // For password hashing

/**
 * Creates an instance of the User Service.
 * This service handles all user-related business logic.
 *
 * @param {object} dependencies - Injected dependencies from the Awilix container.
 * @param {import('../models/User')} dependencies.userModel - Mongoose User model.
 * @param {import('../services/solanaService')} dependencies.solanaService - Service for interacting with Solana blockchain.
 * @param {import('../services/eventService')} dependencies.eventService - Internal event publishing service.
 * @param {import('../services/cacheService')} dependencies.cacheService - Caching service (Redis).
 * @param {import('../utils/ApiError')} dependencies.ApiError - Custom API Error class.
 * @param {import('winston').Logger} dependencies.logger - The logger instance.
 * @param {object} dependencies.config - Application configuration (e.g., USER_ROLES).
 * @returns {object} The user service instance.
 */
module.exports = ({
    userModel,
    solanaService, // Changed from solanaSimulator for a dedicated service
    eventService,
    cacheService,
    ApiError, // Injected directly
    logger, // Injected directly
    config // Access app-wide configs
}) => {

    const USER_CACHE_TTL_SHORT = cacheService.CACHE_TTL_SHORT; // e.g., 5 minutes for user profiles
    const USER_CACHE_TTL_DEFAULT = cacheService.CACHE_TTL_DEFAULT; // e.g., 1 hour for all users list
    const SOLANA_BALANCE_CACHE_TTL = 60; // 60 seconds for volatile blockchain balances
    const SPL_TOKENS_CACHE_TTL = 120;   // 120 seconds for SPL token balances

    /**
     * Helper to get user by wallet address, with caching.
     * @param {string} walletAddress - The user's Solana wallet address.
     * @returns {Promise<object | null>} - User object or null if not found.
     */
    const getUserByWalletAddress = async (walletAddress) => {
        if (!walletAddress) {
            logger.warn('User Service: Attempted to get user with empty wallet address.');
            return null;
        }
        const cacheKey = cacheService.CACHE_KEYS.USER_PROFILE(walletAddress);
        let user = await cacheService.getFromCache(cacheKey);
        if (user) {
            logger.debug(`User Service: Cache hit for user wallet: ${walletAddress}`);
            return user;
        }

        user = await userModel.findOne({ walletAddress }).lean(); // Use .lean() for faster queries
        if (user) {
            await cacheService.setToCache(cacheKey, user, USER_CACHE_TTL_SHORT);
            logger.debug(`User Service: Fetched user ${walletAddress} from DB and cached.`);
        } else {
            logger.debug(`User Service: User with wallet ${walletAddress} not found.`);
        }
        return user;
    };

    /**
     * Helper to get user by database ID, with caching.
     * @param {string} id - The MongoDB ID of the user.
     * @returns {Promise<object | null>} - User object or null if not found.
     */
    const getUserById = async (id) => {
        if (!id) {
            logger.warn('User Service: Attempted to get user with empty ID.');
            return null;
        }
        const cacheKey = cacheService.CACHE_KEYS.USER_BY_ID(id);
        let user = await cacheService.getFromCache(cacheKey);
        if (user) {
            logger.debug(`User Service: Cache hit for user ID: ${id}`);
            return user;
        }

        user = await userModel.findById(id).lean();
        if (user) {
            await cacheService.setToCache(cacheKey, user, USER_CACHE_TTL_SHORT);
            logger.debug(`User Service: Fetched user ID ${id} from DB and cached.`);
        } else {
            logger.debug(`User Service: User with ID ${id} not found.`);
        }
        return user;
    };

    /**
     * Registers a new user.
     * @param {string} walletAddress - The user's Solana wallet address (unique identifier).
     * @param {string} password - The user's chosen password.
     * @param {string} [role=config.ROLES.USER] - The role of the user (e.g., 'user', 'admin'). Defaults to 'user'.
     * @returns {Promise<object>} - The newly created user document (excluding password).
     * @throws {ApiError} If a user with the wallet address already exists or role is invalid.
     */
    const registerUser = async (walletAddress, password, role = config.ROLES.USER) => {
        if (!walletAddress || !password) {
            throw new ApiError('Wallet address and password are required for registration.', 400);
        }
        if (await userModel.findOne({ walletAddress })) {
            throw new ApiError('User with this wallet address already exists.', 409); // Use 409 Conflict for existing resource
        }
        if (!Object.values(config.ROLES).includes(role)) {
            throw new ApiError(`Invalid role: ${role}. Valid roles are: ${Object.values(config.ROLES).join(', ')}.`, 400);
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        try {
            const newUser = await userModel.create({
                walletAddress,
                password: hashedPassword,
                role
            });
            // Invalidate specific user caches and the "all users" list
            await cacheService.invalidateCache(cacheService.CACHE_KEYS.USER_PROFILE(walletAddress));
            await cacheService.invalidateCache(cacheService.CACHE_KEYS.USER_BY_ID(newUser._id.toString()));
            await cacheService.invalidateCache(cacheService.CACHE_KEYS.ALL_USERS);

            logger.info(`User Service: New user registered: ${newUser.walletAddress} with role ${newUser.role}`);
            eventService.publishEvent('userRegistered', newUser.toObject()); // Emit a plain object

            // Return a plain object, omitting sensitive info like password
            const userResponse = newUser.toObject();
            delete userResponse.password;
            return userResponse;
        } catch (error) {
            logger.error(`User Service Error: Failed to register user ${walletAddress}: ${error.message}`, error);
            throw new ApiError('Registration failed due to a server error.', 500);
        }
    };

    /**
     * Authenticates a user.
     * @param {string} walletAddress - The user's wallet address.
     * @param {string} password - The user's plain text password.
     * @returns {Promise<object | null>} - The user document if authentication is successful, null otherwise.
     */
    const authenticateUser = async (walletAddress, password) => {
        const user = await userModel.findOne({ walletAddress });
        if (!user) {
            logger.warn(`User Service: Authentication attempt for non-existent user: ${walletAddress}`);
            return null; // User not found
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            logger.warn(`User Service: Failed authentication attempt for user: ${walletAddress} (incorrect password).`);
            return null; // Password mismatch
        }

        logger.info(`User Service: User authenticated successfully: ${walletAddress}`);
        // Return a plain object, omitting sensitive info like password
        const userResponse = user.toObject();
        delete userResponse.password;
        return userResponse;
    };

    /**
     * Gets all users from the database, with caching.
     * For large datasets, consider pagination.
     * @returns {Promise<object[]>} - Array of user objects.
     */
    const getAllUsers = async () => {
        const cacheKey = cacheService.CACHE_KEYS.ALL_USERS;
        let users = await cacheService.getFromCache(cacheKey);
        if (users) {
            logger.debug('User Service: Cache hit for all users.');
            return users;
        }
        users = await userModel.find({}).lean();
        await cacheService.setToCache(cacheKey, users, USER_CACHE_TTL_DEFAULT);
        logger.debug(`User Service: Fetched ${users.length} users from DB and cached.`);
        return users;
    };

    /**
     * Updates a user's role.
     * @param {string} id - The MongoDB ID of the user.
     * @param {string} newRole - The new role to assign.
     * @returns {Promise<object>} - The updated user document (excluding password).
     * @throws {ApiError} If user not found or role is invalid.
     */
    const updateUserRole = async (id, newRole) => {
        if (!Object.values(config.ROLES).includes(newRole)) {
            throw new ApiError(`Invalid role: ${newRole}. Valid roles are: ${Object.values(config.ROLES).join(', ')}.`, 400);
        }

        const user = await userModel.findById(id);
        if (!user) {
            throw new ApiError('User not found.', 404);
        }
        if (user.role === newRole) {
            logger.info(`User Service: User ${user.walletAddress} already has role ${newRole}. No update needed.`);
            const userResponse = user.toObject();
            delete userResponse.password;
            return userResponse;
        }

        const oldRole = user.role;
        user.role = newRole;
        await user.save();

        // Invalidate relevant caches
        await cacheService.invalidateCache(cacheService.CACHE_KEYS.USER_PROFILE(user.walletAddress));
        await cacheService.invalidateCache(cacheService.CACHE_KEYS.USER_BY_ID(id));
        await cacheService.invalidateCache(cacheService.CACHE_KEYS.ALL_USERS);

        logger.info(`User Service: User ${user.walletAddress} role updated from ${oldRole} to ${newRole}.`);
        eventService.publishEvent('userRoleUpdated', { userId: id, oldRole, newRole });

        const userResponse = user.toObject();
        delete userResponse.password;
        return userResponse;
    };

    /**
     * Simulates fetching Solana balance for a given wallet address using the dedicated solanaService.
     * @param {string} walletAddress - The Solana wallet address.
     * @returns {Promise<number>} - Balance in SOL.
     * @throws {ApiError} If Solana service is unavailable or wallet address is invalid.
     */
    const getSolanaBalance = async (walletAddress) => {
        if (!walletAddress) {
            throw new ApiError('Wallet address is required to get Solana balance.', 400);
        }
        const cacheKey = cacheService.CACHE_KEYS.SOLANA_BALANCE(walletAddress);
        let balance = await cacheService.getFromCache(cacheKey);
        if (balance !== null) { // Check for null explicitly as 0 is a valid balance
            logger.debug(`User Service: Cache hit for Solana balance of ${walletAddress}.`);
            return balance;
        }

        try {
            // Use the dedicated solanaService for real blockchain interaction
            // solanaService.getAccountInfo will use the circuit breaker internally
            const accountInfo = await solanaService.getAccountInfo(walletAddress);
            if (!accountInfo) {
                logger.debug(`User Service: No account info found for ${walletAddress}. Balance is 0.`);
                balance = 0; // Treat as 0 SOL if account not found
            } else {
                balance = accountInfo.lamports / config.LAMPORTS_PER_SOL; // Use injected LAMPORTS_PER_SOL
            }

            await cacheService.setToCache(cacheKey, balance, SOLANA_BALANCE_CACHE_TTL);
            logger.info(`User Service: Fetched Solana balance for ${walletAddress}: ${balance} SOL.`);
            return balance;
        } catch (error) {
            logger.error(`User Service Error: Failed to fetch Solana balance for ${walletAddress}: ${error.message}`, error);
            throw new ApiError(`Failed to retrieve Solana balance: ${error.message}`, error.statusCode || 500); // Propagate or wrap ApiError
        }
    };

    /**
     * Simulates fetching SPL token balances for a given wallet address using the dedicated solanaService.
     * @param {string} walletAddress - The Solana wallet address.
     * @returns {Promise<Array<object>>} - Array of SPL token objects (mint, amount, decimals, etc.).
     * @throws {ApiError} If Solana service is unavailable or wallet address is invalid.
     */
    const getSplTokenBalances = async (walletAddress) => {
        if (!walletAddress) {
            throw new ApiError('Wallet address is required to get SPL token balances.', 400);
        }
        const cacheKey = cacheService.CACHE_KEYS.SPL_TOKEN_BALANCES(walletAddress);
        let tokens = await cacheService.getFromCache(cacheKey);
        if (tokens) {
            logger.debug(`User Service: Cache hit for SPL token balances of ${walletAddress}.`);
            return tokens;
        }

        try {
            // Use the dedicated solanaService for real blockchain interaction
            const tokenAccounts = await solanaService.getParsedTokenAccountsByOwner(walletAddress);
            // Process the raw tokenAccounts into a cleaner format for your API
            tokens = tokenAccounts.value.map(account => ({
                address: account.pubkey.toBase58(), // The token account address
                mint: account.account.data.parsed.info.mint,
                amount: account.account.data.parsed.info.tokenAmount.uiAmount,
                decimals: account.account.data.parsed.info.tokenAmount.decimals,
                // Potentially fetch token metadata (name, symbol) using the mint address
                // and a separate service/cache layer if performance is critical.
            }));

            await cacheService.setToCache(cacheKey, tokens, SPL_TOKENS_CACHE_TTL);
            logger.info(`User Service: Fetched SPL token balances for ${walletAddress}: ${tokens.length} tokens.`);
            return tokens;
        } catch (error) {
            logger.error(`User Service Error: Failed to fetch SPL token balances for ${walletAddress}: ${error.message}`, error);
            throw new ApiError(`Failed to retrieve SPL token balances: ${error.message}`, error.statusCode || 500);
        }
    };

    return {
        getUserByWalletAddress,
        getUserById,
        registerUser,
        authenticateUser, // Added for full user flow
        getAllUsers,
        updateUserRole,
        getSolanaBalance,
        getSplTokenBalances,
    };
};
