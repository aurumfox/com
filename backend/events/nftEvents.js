/**
 * @file This file contains event listeners for NFT-related events.
 * It subscribes to events emitted by the application's central event bus
 * and performs side effects such as cache invalidation, logging, and
 * triggering notifications or other system updates.
 */

const { eventEmitter } = require('./index');
const logger = require('../config/logger');
const { invalidateResourceCache } = require('../utils/cache');
// const { sendNotification } = require('../services/notificationService'); // Conceptual notification service
// const { updateSearchIndex } = require('../services/searchService'); // Conceptual search indexing service

/**
 * Event listener for 'nftListed' event.
 * Triggered when an NFT is successfully listed for sale.
 * @param {object} nft - The NFT object that was listed.
 */
eventEmitter.on('nftListed', async (nft) => {
    try {
        logger.info(`Event: NFT Listed - Mint: ${nft.mint}, Name: ${nft.name}, By: ${nft.listedBy}, Price: ${nft.price} SOL`);
        
        // Invalidate cache for relevant NFT data:
        // 1. Invalidate the specific NFT's cache if you cache individual NFTs
        if (nft._id) { // Assuming _id is available for specific cache invalidation
            await invalidateResourceCache(`nft:${nft._id}`);
        }
        // 2. Invalidate the cache for all NFTs list/search results
        await invalidateResourceCache('nfts'); 

        // Example: Send a notification to relevant users (e.g., global subscribers)
        // if (sendNotification) { // Check if service is imported/available
        //     await sendNotification({
        //         type: 'new_listing',
        //         title: `New NFT Listed: ${nft.name}`,
        //         message: `${nft.name} listed by ${nft.listedBy} for ${nft.price} SOL!`,
        //         target: 'all_subscribers', // Or to specific followers/categories
        //         data: { nftId: nft._id, mint: nft.mint, price: nft.price }
        //     });
        // }

        // Example: Update a search index if you have one
        // if (updateSearchIndex) {
        //     await updateSearchIndex(nft._id, 'update');
        // }

    } catch (error) {
        logger.error(`Error handling 'nftListed' event for NFT ${nft ? nft.mint : 'unknown'}:`, error);
        // You might re-emit an error on the main eventEmitter for centralized handling
        // eventEmitter.emit('error', new Error(`Failed to handle nftListed: ${error.message}`));
    }
});

/**
 * Event listener for 'nftPurchased' event.
 * Triggered when an NFT is successfully purchased.
 * @param {object} nft - The NFT object that was purchased.
 * @param {string} buyerWallet - The wallet address of the buyer.
 */
eventEmitter.on('nftPurchased', async (nft, buyerWallet) => {
    try {
        logger.info(`Event: NFT Purchased - Mint: ${nft.mint}, Name: ${nft.name}, Buyer: ${buyerWallet}`);

        // Invalidate cache for the specific NFT and the general NFTs list
        if (nft._id) {
            await invalidateResourceCache(`nft:${nft._id}`);
        }
        await invalidateResourceCache('nfts');

        // Example: Send notifications to buyer and seller
        // if (sendNotification) {
        //     await sendNotification({
        //         type: 'purchase_confirmation',
        //         title: `Congratulations! You bought ${nft.name}!`,
        //         message: `You successfully acquired ${nft.name} for ${nft.price} SOL.`,
        //         target: buyerWallet,
        //         data: { nftId: nft._id, mint: nft.mint }
        //     });
        //     await sendNotification({
        //         type: 'sale_notification',
        //         title: `Your NFT Sold: ${nft.name}!`,
        //         message: `${nft.name} was sold to ${buyerWallet} for ${nft.price} SOL.`,
        //         target: nft.listedBy, // Assuming listedBy is the seller
        //         data: { nftId: nft._id, mint: nft.mint }
        //     });
        // }

        // Example: Trigger analytics updates, update user's portfolio in a separate service
        // if (updateSearchIndex) {
        //     await updateSearchIndex(nft._id, 'update'); // Update listing status in search
        // }

    } catch (error) {
        logger.error(`Error handling 'nftPurchased' event for NFT ${nft ? nft.mint : 'unknown'} by ${buyerWallet}:`, error);
    }
});

/**
 * Event listener for 'nftMinted' event.
 * Triggered when a new NFT is minted.
 * @param {object} nft - The NFT object that was minted.
 */
eventEmitter.on('nftMinted', async (nft) => {
    try {
        logger.info(`Event: NFT Minted - Mint: ${nft.mint}, Name: ${nft.name}, Owner: ${nft.owner}`);

        // Invalidate cache for the specific NFT (if pre-cached) and the general NFTs list
        if (nft._id) {
            await invalidateResourceCache(`nft:${nft._id}`);
        }
        await invalidateResourceCache('nfts');

        // Example: Trigger indexing for search, add to a gallery, update user's owned NFTs
        // if (updateSearchIndex) {
        //     await updateSearchIndex(nft._id, 'create');
        // }

    } catch (error) {
        logger.error(`Error handling 'nftMinted' event for NFT ${nft ? nft.mint : 'unknown'}:`, error);
    }
});

/**
 * Event listener for 'nftListingCancelled' event.
 * Triggered when an NFT listing is cancelled (delisted).
 * @param {object} nft - The NFT object whose listing was cancelled.
 */
eventEmitter.on('nftListingCancelled', async (nft) => {
    try {
        logger.info(`Event: NFT Listing Cancelled - Mint: ${nft.mint}, Name: ${nft.name}`);

        // Invalidate cache for the specific NFT and the general NFTs list
        if (nft._id) {
            await invalidateResourceCache(`nft:${nft._id}`);
        }
        await invalidateResourceCache('nfts');

        // Example: Update search index (remove from listed items)
        // if (updateSearchIndex) {
        //     await updateSearchIndex(nft._id, 'update');
        // }

    } catch (error) {
        logger.error(`Error handling 'nftListingCancelled' event for NFT ${nft ? nft.mint : 'unknown'}:`, error);
    }
});

// You can add more specific NFT-related event listeners here, e.g.:
// eventEmitter.on('nftMetadataUpdated', async (nftId) => { /* ... */ });
// eventEmitter.on('nftTransferred', async (nftId, fromWallet, toWallet) => { /* ... */ });
