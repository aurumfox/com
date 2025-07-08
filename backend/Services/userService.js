// services/userService.js
module.exports = (UserModel, solanaSimulator, eventService, cacheService) => {
    const logger = require('../config/logger'); // Get logger directly here
    const bcrypt = require('bcryptjs'); // For password hashing
    const { ApiError } = require('../utils/ApiError'); // Ensure this is accessible

    const USER_CACHE_TTL = 600; // 10 minutes

    /**
     * Helper to get user by wallet address, with caching.
     */
    const getUserByWalletAddress = async (walletAddress) => {
        const cacheKey = `user:${walletAddress}`;
        let user = await cacheService.getFromCache(cacheKey);
        if (user) {
            return user;
        }

        user = await UserModel.findOne({ walletAddress });
        if (user) {
            await cacheService.setToCache(cacheKey, user.toObject(), USER_CACHE_TTL);
        }
        return user;
    };

    /**
     * Helper to get user by ID, with caching.
     */
    const getUserById = async (id) => {
        const cacheKey = `user_id:${id}`;
        let user = await cacheService.getFromCache(cacheKey);
        if (user) {
            return user;
        }

        user = await UserModel.findById(id);
        if (user) {
            await cacheService.setToCache(cacheKey, user.toObject(), USER_CACHE_TTL);
        }
        return user;
    };

    /**
     * Registers a new user.
     * @param {string} walletAddress
     * @param {string} password
     * @param {string} role
     */
    const registerUser = async (walletAddress, password, role) => {
        if (await UserModel.findOne({ walletAddress })) {
            throw new ApiError('User with this wallet address already exists', 400);
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await UserModel.create({
            walletAddress,
            password: hashedPassword,
            role
        });
        await cacheService.invalidateCache(`user:${walletAddress}`);
        eventService.publishEvent('userRegistered', newUser);
        return newUser;
    };

    /**
     * Gets all users.
     */
    const getAllUsers = async () => {
        const cacheKey = 'users:all';
        let users = await cacheService.getFromCache(cacheKey);
        if (users) {
            return users;
        }
        users = await UserModel.find({});
        await cacheService.setToCache(cacheKey, users.map(u => u.toObject()), USER_CACHE_TTL);
        return users;
    };

    /**
     * Updates user role.
     * @param {string} id
     * @param {string} role
     */
    const updateUserRole = async (id, role) => {
        const user = await UserModel.findById(id);
        if (!user) {
            throw new ApiError('User not found', 404);
        }
        user.role = role;
        await user.save();
        await cacheService.invalidateCache(`user:${user.walletAddress}`);
        await cacheService.invalidateCache(`user_id:${id}`);
        await cacheService.invalidateCache('users:all'); // Invalidate all users cache
        return user;
    };

    /**
     * Simulates fetching Solana balance for a given wallet address.
     * @param {string} walletAddress - The Solana wallet address.
     * @returns {Promise<number>} - Simulated balance in SOL.
     */
    const getSolanaBalance = async (walletAddress) => {
        logger.info(`Simulating fetching Solana balance for: ${walletAddress}`);
        const cacheKey = `solana_balance:${walletAddress}`;
        let balance = await cacheService.getFromCache(cacheKey);
        if (balance) {
            return balance;
        }
        const accountInfo = await solanaSimulator.simulateGetAccountInfo(walletAddress);
        balance = accountInfo.lamports / 1e9; // Convert lamports to SOL
        await cacheService.setToCache(cacheKey, balance, 60); // Cache balance for 60 seconds
        return balance;
    };

    /**
     * Simulates fetching SPL token balances for a given wallet address.
     * @param {string} walletAddress - The Solana wallet address.
     * @returns {Promise<Array<object>>} - Simulated SPL token data.
     */
    const getSplTokenBalances = async (walletAddress) => {
        logger.info(`Simulating fetching SPL token balances for: ${walletAddress}`);
        const cacheKey = `spl_tokens:${walletAddress}`;
        let tokens = await cacheService.getFromCache(cacheKey);
        if (tokens) {
            return tokens;
        }
        const tokenAccounts = await solanaSimulator.simulateGetParsedTokenAccountsByOwner(walletAddress);
        tokens = tokenAccounts.value.map(account => ({
            mint: account.account.data.parsed.info.mint,
            amount: account.account.data.parsed.info.tokenAmount.uiAmount,
        }));
        await cacheService.setToCache(cacheKey, tokens, 60); // Cache tokens for 60 seconds
        return tokens;
    };

    return {
        getUserByWalletAddress,
        getUserById,
        registerUser,
        getAllUsers,
        updateUserRole,
        getSolanaBalance,
        getSplTokenBalances,
    };
};
