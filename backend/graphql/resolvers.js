// graphql/resolvers.js
const logger = require('../config/logger');
const ApiError = require('../utils/ApiError');

const rootResolver = {
    hello: () => {
        return 'Hello from GraphQL!';
    },

    // User Resolvers
    user: async ({ walletAddress }, context) => {
        // context.req.container is available here due to diMiddleware
        const userService = context.req.container.resolve('userService');
        const user = await userService.getUserByWalletAddress(walletAddress); // Assume this service method exists
        if (!user) {
            throw new ApiError('User not found', 404);
        }
        // Fetch Solana balance and SPL tokens
        user.solanaBalance = await userService.getSolanaBalance(user.walletAddress);
        user.splTokens = await userService.getSplTokenBalances(user.walletAddress);
        return user;
    },
    users: async (args, context) => {
        const userService = context.req.container.resolve('userService');
        const users = await userService.getAllUsers(); // Assume this service method exists
        return users;
    },
    createUser: async ({ walletAddress, password, role }, context) => {
        const userService = context.req.container.resolve('userService');
        // This should probably be handled by Auth Controller for security best practices
        // For GraphQL simplicity, we'll put it here, but typically it's an HTTP endpoint.
        const newUser = await userService.registerUser(walletAddress, password, role || 'user');
        return newUser;
    },
    updateUserRole: async ({ id, role }, context) => {
        const userService = context.req.container.resolve('userService');
        // This requires authentication and authorization
        // For demo purposes, we skip auth here, but in real app, context.req.user would be checked
        const updatedUser = await userService.updateUserRole(id, role);
        return updatedUser;
    },

    // NFT Resolvers
    nft: async ({ id }, context) => {
        const nftService = context.req.container.resolve('nftService');
        const nft = await nftService.getNftById(id); // Assume this service method exists
        if (!nft) {
            throw new ApiError('NFT not found', 404);
        }
        return nft;
    },
    nfts: async ({ owner, isListed }, context) => {
        const nftService = context.req.container.resolve('nftService');
        const query = {};
        if (owner) query.owner = owner;
        if (typeof isListed === 'boolean') query.isListed = isListed;
        const nfts = await nftService.searchNfts(query); // Assume this service method exists
        return nfts;
    },
    listNFT: async ({ id, sellerWallet, price, duration }, context) => {
        const nftService = context.req.container.resolve('nftService');
        // In a real app, sellerWallet would be verified via authentication
        const listedNft = await nftService.listNft(id, sellerWallet, price, duration);
        return listedNft;
    },
    buyNFT: async ({ id, buyerWallet }, context) => {
        const nftService = context.req.container.resolve('nftService');
        // In a real app, buyerWallet would be verified via authentication
        const purchasedNft = await nftService.buyNft(id, buyerWallet);
        return purchasedNft;
    },

    // Announcement Resolvers
    announcements: async (args, context) => {
        const announcementModel = context.req.container.resolve('announcementModel');
        const announcements = await announcementModel.find().sort({ date: -1 });
        return announcements;
    },
    createAnnouncement: async ({ text }, context) => {
        const announcementModel = context.req.container.resolve('announcementModel');
        // Requires admin role in a real app (check context.req.user.role)
        const newAnnouncement = new announcementModel({ text });
        await newAnnouncement.save();
        return newAnnouncement;
    }
    // Add more resolvers for other models (Photo, Post, Game, Ad)
};

module.exports = { rootResolver };
