// services/nftService.js
const { v4: uuidv4 } = require('uuid');

module.exports = (NftModel, UserModel, solanaSimulator, eventService, transactionService, cacheService, queueService, circuitBreakerService) => {
    const logger = require('../config/logger');

    const NFT_CACHE_TTL = 300; // 5 minutes

    // Create a circuit breaker for Solana API calls
    const solanaApiBreaker = circuitBreakerService.createCircuitBreaker(
        solanaSimulator.simulateGetAccountInfo, // The function to protect
        'solana-get-account-info-breaker',
        { timeout: 5000 } // Custom timeout for Solana calls
    );

    /**
     * Helper to get NFT by ID, with caching.
     */
    const getNftById = async (id) => {
        const cacheKey = `nft:${id}`;
        let nft = await cacheService.getFromCache(cacheKey);
        if (nft) {
            return nft;
        }

        nft = await NftModel.findById(id);
        if (nft) {
            await cacheService.setToCache(cacheKey, nft.toObject(), NFT_CACHE_TTL);
        }
        return nft;
    };

    /**
     * Helper to search NFTs, with caching.
     */
    const searchNfts = async (query = {}) => {
        const cacheKey = `nfts:search:${JSON.stringify(query)}`;
        let nfts = await cacheService.getFromCache(cacheKey);
        if (nfts) {
            return nfts;
        }

        nfts = await NftModel.find(query);
        await cacheService.setToCache(cacheKey, nfts.map(n => n.toObject()), NFT_CACHE_TTL);
        return nfts;
    };

    /**
     * Simulates fetching NFT data from Solana blockchain using Circuit Breaker.
     * @param {string} mintAddress - The mint address of the NFT.
     * @returns {Promise<object>} - Simulated NFT data.
     */
    const fetchNftFromBlockchain = async (mintAddress) => {
        logger.info(`Simulating fetching NFT from blockchain for mint: ${mintAddress}`);
        const cacheKey = `blockchain_nft:${mintAddress}`;
        let blockchainNftData = await cacheService.getFromCache(cacheKey);
        if (blockchainNftData) {
            return blockchainNftData;
        }

        try {
            const accountInfo = await solanaApiBreaker.fire(mintAddress); // Use circuit breaker
            const simulatedNftData = {
                blockchainData: {
                    mint: mintAddress,
                    supply: 1,
                    owner: accountInfo.owner,
                },
                offChainMetadata: {
                    name: `Simulated NFT ${mintAddress.substring(0, 8)}`,
                    description: "This is a simulated NFT fetched from the blockchain service.",
                    image: "https://via.placeholder.com/150",
                }
            };
            await cacheService.setToCache(cacheKey, simulatedNftData, 3600);
            return simulatedNftData;
        } catch (error) {
            logger.error(`Failed to fetch NFT from blockchain (via circuit breaker): ${error.message}`);
            // If circuit is open or call failed, you might return a default/stale data or throw
            throw new Error('Blockchain service currently unavailable or unresponsive.');
        }
    };

    /**
     * Handles the logic for listing an NFT on the marketplace.
     * Uses compensating transactions pattern and publishes to queue.
     * @param {string} nftId - The ID of the NFT in our database.
     * @param {string} sellerWallet - The wallet address of the seller.
     * @param {number} price - The listing price.
     * @param {number} duration - Listing duration in days.
     * @returns {Promise<object>} - Updated NFT object.
     */
    const listNft = async (nftId, sellerWallet, price, duration) => {
        const transactionId = uuidv4();
        transactionService.startTransaction(transactionId);
        let nft;

        try {
            nft = await NftModel.findById(nftId);
            if (!nft) {
                throw new Error('NFT not found.');
            }
            if (nft.owner !== sellerWallet) {
                throw new Error('Only the owner can list this NFT.');
            }
            if (nft.isListed) {
                throw new Error('NFT is already listed.');
            }

            // Step 1: Simulate Blockchain Interaction (e.g., sending NFT to escrow)
            // Instead of direct call, publish to a queue for background processing
            const queueMessage = {
                type: 'LIST_NFT_ON_CHAIN',
                transactionId: transactionId,
                nftId: nftId,
                mint: nft.mint,
                sellerWallet: sellerWallet,
                price: price,
                duration: duration,
            };
            const published = queueService.publishToQueue(queueService.QUEUE_NAMES.NFT_PROCESSING, queueMessage);

            if (!published) {
                throw new Error('Failed to queue blockchain listing operation.');
            }

            // Compensation for Step 1: If DB update fails, we'd need to send a message to revert the blockchain action
            // This is more complex with queues, as the blockchain action might not have happened yet.
            // A common pattern is to have a "saga" or "orchestrator" that listens to events.
            // For simplicity here, we assume if the queue message is sent, the blockchain part will eventually succeed or be handled by a separate consumer.
            // If the DB update fails, we'd need to un-list the NFT on the blockchain if it was already listed.
            // This highlights the complexity of distributed transactions.

            // Step 2: Update NFT status in DB
            const originalNftState = nft.toObject(); // Store original state for compensation
            nft.isListed = true;
            nft.price = price;
            nft.listedAt = new Date();
            nft.listingDuration = duration;
            nft.listedBy = sellerWallet;
            nft.history.push({ type: 'List', from: sellerWallet, timestamp: new Date() });
            await nft.save();

            // Compensation for Step 2: Revert DB changes
            transactionService.addCompensation(transactionId, async () => {
                logger.warn(`Transaction ${transactionId}: Compensating: reverting NFT DB state for ${nft.mint}`);
                await NftModel.findByIdAndUpdate(nftId, originalNftState);
                await cacheService.invalidateCache(`nft:${nftId}`);
            });

            // Invalidate relevant caches
            await cacheService.invalidateCache(`nft:${nftId}`);
            await cacheService.invalidateCacheByPattern('nfts:search:*');

            transactionService.commitTransaction(transactionId);
            eventService.publishEvent('nftListed', nft);

            return nft;

        } catch (error) {
            logger.error(`Error listing NFT ${nftId}: ${error.message}`, error);
            await transactionService.rollbackTransaction(transactionId);
            throw error; // Re-throw the error for the caller
        }
    };

    /**
     * Handles the logic for buying an NFT from the marketplace.
     * Uses compensating transactions pattern and publishes to queue.
     * @param {string} nftId - The ID of the NFT in our database.
     * @param {string} buyerWallet - The wallet address of the buyer.
     * @returns {Promise<object>} - Updated NFT object.
     */
    const buyNft = async (nftId, buyerWallet) => {
        const transactionId = uuidv4();
        transactionService.startTransaction(transactionId);
        let nft;
        let originalSellerWallet;
        let buyerUser;

        try {
            nft = await NftModel.findById(nftId);
            if (!nft) {
                throw new Error('NFT not found.');
            }
            if (!nft.isListed) {
                throw new Error('NFT is not listed for sale.');
            }
            if (nft.owner === buyerWallet) {
                throw new Error('Cannot buy your own NFT.');
            }
            if (!nft.price) {
                throw new Error('NFT has no price specified for purchase.');
            }

            originalSellerWallet = nft.owner; // Store current owner for potential compensation

            // Step 1: Publish blockchain interaction to a queue
            const queueMessage = {
                type: 'BUY_NFT_ON_CHAIN',
                transactionId: transactionId,
                nftId: nftId,
                mint: nft.mint,
                sellerWallet: originalSellerWallet,
                buyerWallet: buyerWallet,
                price: nft.price,
            };
            const published = queueService.publishToQueue(queueService.QUEUE_NAMES.NFT_PROCESSING, queueMessage);

            if (!published) {
                throw new Error('Failed to queue blockchain purchase operation.');
            }

            // Step 2: Update NFT status in DB
            const originalNftState = nft.toObject(); // Store original state
            nft.isListed = false;
            nft.price = null;
            nft.listedAt = null;
            nft.listingDuration = null;
            nft.listedBy = null;
            nft.owner = buyerWallet; // Transfer ownership
            nft.history.push({ type: 'Buy', from: originalSellerWallet, to: buyerWallet, price: nft.price, timestamp: new Date() });
            await nft.save();

            // Compensation for Step 2: Revert DB changes
            transactionService.addCompensation(transactionId, async () => {
                logger.warn(`Transaction ${transactionId}: Compensating: reverting NFT DB state for ${nft.mint}`);
                await NftModel.findByIdAndUpdate(nftId, originalNftState);
                await cacheService.invalidateCache(`nft:${nftId}`);
            });

            // Step 3: Update user's owned NFTs (if you store them on user model as well)
            buyerUser = await UserModel.findOne({ walletAddress: buyerWallet });
            if (!buyerUser) {
                buyerUser = new UserModel({ walletAddress: buyerWallet, role: 'user', password: 'autogenerated_password_buy_nft' });
                await buyerUser.save();
                logger.info(`Transaction ${transactionId}: Created new user for buyer: ${buyerWallet}`);
            }

            // Invalidate relevant caches
            await cacheService.invalidateCache(`nft:${nftId}`);
            await cacheService.invalidateCacheByPattern('nfts:search:*');
            await cacheService.invalidateCache(`user:${buyerWallet}`);
            await cacheService.invalidateCache(`user:${originalSellerWallet}`);

            transactionService.commitTransaction(transactionId);
            eventService.publishEvent('nftPurchased', nft, buyerWallet);

            // Emit real-time update via Socket.IO
            // This would be done by the consumer of the queue once the blockchain transaction is confirmed
            // For now, we'll simulate it here for immediate feedback
            // io.emit('nftUpdate', { id: nft._id, newOwner: buyerWallet, isListed: false });

            return nft;

        } catch (error) {
            logger.error(`Error buying NFT ${nftId}: ${error.message}`, error);
            await transactionService.rollbackTransaction(transactionId);
            throw error;
        }
    };

    return {
        getNftById,
        searchNfts,
        fetchNftFromBlockchain,
        listNft,
        buyNft,
    };
};
