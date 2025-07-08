// events/nftEvents.js
const { eventEmitter } = require('./index');
const logger = require('../config/logger');
const { invalidateResourceCache } = require('../utils/cache');
// const { sendNotification } = require('../services/notificationService'); // Conceptual notification service

// Event: 'nftListed'
eventEmitter.on('nftListed', async (nft) => {
    logger.info(`Event: NFT Listed - ${nft.mint} by ${nft.listedBy} for ${nft.price} SOL`);
    // Invalidate cache for NFTs
    await invalidateResourceCache('nfts');
    // Example: Send a notification to subscribers
    // await sendNotification(`New NFT listed: ${nft.name} for ${nft.price} SOL!`);
});

// Event: 'nftPurchased'
eventEmitter.on('nftPurchased', async (nft, buyerWallet) => {
    logger.info(`Event: NFT Purchased - ${nft.mint} bought by ${buyerWallet}`);
    // Invalidate cache for NFTs
    await invalidateResourceCache('nfts');
    // Example: Update user's portfolio, send confirmation
    // await sendNotification(`You successfully bought ${nft.name}!`);
});

// Event: 'nftMinted'
eventEmitter.on('nftMinted', async (nft) => {
    logger.info(`Event: NFT Minted - ${nft.mint} owned by ${nft.owner}`);
    // Invalidate cache for NFTs
    await invalidateResourceCache('nfts');
    // Example: Trigger indexing for search, add to a gallery
});

// Event: 'nftListingCancelled'
eventEmitter.on('nftListingCancelled', async (nft) => {
    logger.info(`Event: NFT Listing Cancelled - ${nft.mint}`);
    // Invalidate cache for NFTs
    await invalidateResourceCache('nfts');
});
