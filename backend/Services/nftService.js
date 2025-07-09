/**
 * @file Service for managing NFTs (Non-Fungible Tokens), including their database representation,
 * interaction with Solana blockchain, caching, and marketplace operations (listing/buying).
 * Implements compensating transactions and uses message queues for asynchronous blockchain interactions.
 */

const { v4: uuidv4 } = require('uuid');
const { Transaction } = require('@solana/web3.js'); // Assuming you'd use this for real transactions

/**
 * Creates an instance of the NFT Service.
 * This service handles all NFT-related business logic.
 *
 * @param {object} dependencies - Injected dependencies from the Awilix container.
 * @param {import('../models/Nft')} dependencies.nftModel - Mongoose Nft model.
 * @param {import('../models/User')} dependencies.userModel - Mongoose User model.
 * @param {object} dependencies.solanaConnection - Solana web3.js Connection instance.
 * @param {import('../config/solana').PublicKey} dependencies.solanaPublicKey - Solana PublicKey class.
 * @param {import('../config/solana').LAMPORTS_PER_SOL} dependencies.LAMPORTS_PER_SOL - Constant for Lamports per SOL.
 * @param {Function} dependencies.simulateSolanaTransaction - Utility to simulate Solana transactions (for dev/testing).
 * @param {import('../services/eventService')} dependencies.eventService - Internal event publishing service.
 * @param {import('../services/transactionService')} dependencies.transactionService - Distributed transaction management service.
 * @param {import('../services/cacheService')} dependencies.cacheService - Caching service (Redis).
 * @param {import('../services/queueService')} dependencies.queueService - Message queuing service (RabbitMQ).
 * @param {import('../services/circuitBreakerService')} dependencies.circuitBreakerService - Circuit Breaker factory.
 * @param {import('winston').Logger} dependencies.logger - The logger instance.
 * @param {object} dependencies.config - Application configuration (e.g., SOLANA_CONFIG from environments).
 * @returns {object} The NFT service instance.
 */
module.exports = ({
    nftModel,
    userModel,
    solanaConnection, // Changed from solanaSimulator for real connection usage
    solanaPublicKey, // Added for real key handling
    LAMPORTS_PER_SOL, // Added for real currency calculations
    simulateSolanaTransaction, // Kept for simulation/testing
    eventService,
    transactionService,
    cacheService,
    queueService,
    circuitBreakerService,
    logger,
    config // Access app-wide configs
}) => {

    const NFT_CACHE_TTL_SHORT = cacheService.CACHE_TTL_SHORT; // e.g., 5 minutes for individual NFTs
    const NFT_CACHE_TTL_DEFAULT = cacheService.CACHE_TTL_DEFAULT; // e.g., 1 hour for search results

    // Create a circuit breaker for external Solana RPC calls
    const solanaRpcBreaker = circuitBreakerService.createCircuitBreaker(
        async (method, ...args) => {
            // This actionFn will be wrapped by the breaker.
            // It uses the actual solanaConnection instance.
            // Example: connection.getAccountInfo(publicKey)
            // Or connection.getBalance(publicKey)
            // Or connection.getTransaction(signature)
            switch (method) {
                case 'getAccountInfo':
                    return await solanaConnection.getAccountInfo(new solanaPublicKey(args[0]));
                case 'getBalance':
                    return await solanaConnection.getBalance(new solanaPublicKey(args[0]));
                case 'simulateTransaction':
                    // Use a specific simulation function if needed, or solanaConnection.simulateTransaction
                    return await simulateSolanaTransaction(...args);
                // Add other Solana RPC methods as needed
                default:
                    throw new Error(`Unsupported Solana RPC method for circuit breaker: ${method}`);
            }
        },
        'solana-rpc-breaker',
        {
            timeout: config.solana.transactionTimeoutMs || 10000, // Configurable timeout for Solana RPC
            errorThresholdPercentage: 60, // A bit more tolerant for external RPCs
            resetTimeout: 90000, // Longer reset time (90 seconds)
            // No custom errorFilter here, as we want to count all errors from RPC as unhealthy
        }
    );

    /**
     * Helper to get NFT by ID, with caching.
     * @param {string} id - The MongoDB ID of the NFT.
     * @returns {Promise<object | null>} - Cached NFT data or null if not found.
     */
    const getNftById = async (id) => {
        const cacheKey = cacheService.CACHE_KEYS.NFT_BY_ID(id); // Use structured cache keys
        let nft = await cacheService.getFromCache(cacheKey);
        if (nft) {
            logger.debug(`NFT Service: Cache hit for NFT ID: ${id}`);
            return nft;
        }

        nft = await nftModel.findById(id).lean(); // Use .lean() for faster queries if not modifying
        if (nft) {
            await cacheService.setToCache(cacheKey, nft, NFT_CACHE_TTL_SHORT); // Use short TTL for individual items
            logger.debug(`NFT Service: Fetched NFT ID ${id} from DB and cached.`);
        } else {
            logger.debug(`NFT Service: NFT ID ${id} not found.`);
        }
        return nft;
    };

    /**
     * Helper to search NFTs, with caching.
     * @param {object} query - The search query parameters.
     * @param {number} [limit=10] - Number of results to return.
     * @param {number} [page=1] - Page number for pagination.
     * @returns {Promise<object[]>} - Array of NFT objects.
     */
    const searchNfts = async (query = {}, limit = config.DEFAULT_PAGINATION_LIMIT, page = 1) => {
        const processedQuery = { ...query };
        // Clean up query if needed, e.g., for pagination params
        delete processedQuery.limit;
        delete processedQuery.page;

        const cacheKey = cacheService.CACHE_KEYS.ALL_NFTS(JSON.stringify({ ...processedQuery, limit, page }));
        let nfts = await cacheService.getFromCache(cacheKey);
        if (nfts) {
            logger.debug(`NFT Service: Cache hit for NFT search query: ${JSON.stringify(query)}`);
            return nfts;
        }

        nfts = await nftModel.find(processedQuery)
                             .skip((page - 1) * limit)
                             .limit(limit)
                             .lean();
        await cacheService.setToCache(cacheKey, nfts, NFT_CACHE_TTL_DEFAULT); // Use default TTL for search results
        logger.debug(`NFT Service: Fetched ${nfts.length} NFTs for query ${JSON.stringify(query)} from DB and cached.`);
        return nfts;
    };

    /**
     * Fetches NFT data from the Solana blockchain using Circuit Breaker.
     * This function should ideally connect to a real Solana RPC.
     * @param {string} mintAddress - The mint address of the NFT.
     * @returns {Promise<object>} - Blockchain-fetched NFT data.
     * @throws {Error} If blockchain service is unavailable or NFT not found on chain.
     */
    const fetchNftFromBlockchain = async (mintAddress) => {
        if (!mintAddress || !solanaPublicKey.isOnCurve(new solanaPublicKey(mintAddress))) {
            throw new Error('Invalid NFT mint address provided.');
        }

        const cacheKey = `blockchain_nft_data:${mintAddress}`; // Specific cache key for raw blockchain data
        let blockchainNftData = await cacheService.getFromCache(cacheKey);
        if (blockchainNftData) {
            logger.debug(`NFT Service: Blockchain NFT data cache hit for mint: ${mintAddress}`);
            return blockchainNftData;
        }

        try {
            logger.info(`NFT Service: Fetching raw blockchain data for mint: ${mintAddress} via circuit breaker.`);
            // Use the circuit breaker to call the real Solana connection method
            const accountInfo = await solanaRpcBreaker.fire('getAccountInfo', mintAddress);

            if (!accountInfo) {
                throw new Error(`NFT mint address ${mintAddress} not found on blockchain.`);
            }

            // In a real scenario, you'd parse accountInfo and fetch metadata from IPFS/Arweave
            // For now, simulate enriched data
            const simulatedRpcData = {
                mint: mintAddress,
                owner: accountInfo.owner ? accountInfo.owner.toBase58() : null, // Convert PublicKey to string
                rentEpoch: accountInfo.rentEpoch,
                executable: accountInfo.executable,
                lamports: accountInfo.lamports,
                // Add more parsed data relevant to the NFT if available in accountInfo.data
                // Example: token program specific data
            };

            // This part would involve fetching off-chain metadata (e.g., from Arweave/IPFS using URI in token metadata)
            const offChainMetadata = {
                name: `Aurum Fox NFT ${mintAddress.substring(0, 8)}`,
                description: `This is an NFT representing an asset in the Aurum Fox Unified Portal. Fetched from ${config.solanaCluster}.`,
                image: "https://arweave.net/EXAMPLE_ARWEAVE_HASH_FOR_IMAGE.png", // Replace with real Arweave/IPFS gateway
                attributes: [{ trait_type: "Edition", value: "1" }],
            };

            const combinedNftData = {
                blockchainData: simulatedRpcData,
                offChainMetadata: offChainMetadata
            };

            await cacheService.setToCache(cacheKey, combinedNftData, NFT_CACHE_TTL_LONG); // Longer TTL for static blockchain data
            return combinedNftData;
        } catch (error) {
            logger.error(`NFT Service Error: Failed to fetch NFT from blockchain for mint ${mintAddress}: ${error.message}`, error);
            // Re-throw specific error or return a structured error for the caller to handle
            throw new Error(`Blockchain data for NFT ${mintAddress} currently unavailable: ${error.message}`);
        }
    };


    /**
     * Handles the logic for minting a new NFT.
     * This is typically an asynchronous process.
     * @param {object} nftData - Data for the new NFT (e.g., name, description, image URI, collection).
     * @param {string} minterWallet - The wallet address of the minter.
     * @returns {Promise<object>} - The newly created NFT object in the database.
     */
    const mintNft = async (nftData, minterWallet) => {
        const transactionId = uuidv4();
        transactionService.startTransaction(transactionId);
        let newNftDocument;

        try {
            // Step 1: Create initial NFT record in DB with pending status
            newNftDocument = new nftModel({
                ...nftData,
                owner: minterWallet,
                status: 'pending_mint', // Indicate that minting is in progress
                mint: null, // Mint address will be set after successful blockchain mint
                history: [{ type: 'Mint Request', by: minterWallet, timestamp: new Date() }]
            });
            await newNftDocument.save();

            // Compensation for Step 1: Delete pending NFT if later steps fail
            transactionService.addCompensation(transactionId, async () => {
                logger.warn(`Transaction ${transactionId}: Compensating: Deleting pending NFT ${newNftDocument._id}`);
                await nftModel.findByIdAndDelete(newNftDocument._id);
                await cacheService.invalidateCache(cacheService.CACHE_KEYS.NFT_BY_ID(newNftDocument._id));
            });

            // Step 2: Queue the actual blockchain minting operation
            const queueMessage = {
                type: 'MINT_NFT_ON_CHAIN',
                transactionId: transactionId, // Link to the distributed transaction
                nftDbId: newNftDocument._id.toString(), // Pass the DB ID
                minterWallet: minterWallet,
                metadata: nftData, // Pass metadata for on-chain processing
            };
            const published = queueService.publishToQueue(queueService.QUEUE_NAMES.NFT_MINT_REQUEST, queueMessage);

            if (!published) {
                // If queue publish fails, roll back the DB changes
                throw new Error('Failed to queue NFT minting operation.');
            }

            logger.info(`NFT Service: Mint request for ${nftData.name} by ${minterWallet} queued (DB ID: ${newNftDocument._id}).`);
            eventService.publishEvent('nftMintRequested', { nftId: newNftDocument._id, minter: minterWallet });

            transactionService.commitTransaction(transactionId);
            return newNftDocument;

        } catch (error) {
            logger.error(`NFT Service Error: Failed to initiate minting for ${nftData.name}: ${error.message}`, error);
            await transactionService.rollbackTransaction(transactionId);
            throw error;
        }
    };


    /**
     * Handles the logic for listing an NFT on the marketplace.
     * Uses compensating transactions pattern and publishes to queue.
     * @param {string} nftId - The ID of the NFT in our database.
     * @param {string} sellerWallet - The wallet address of the seller.
     * @param {number} priceSol - The listing price in SOL.
     * @param {number} durationDays - Listing duration in days.
     * @returns {Promise<object>} - Updated NFT object.
     * @throws {Error} If NFT not found, not owned, or already listed.
     */
    const listNft = async (nftId, sellerWallet, priceSol, durationDays) => {
        const transactionId = uuidv4();
        transactionService.startTransaction(transactionId);
        let nft;
        const priceLamports = priceSol * LAMPORTS_PER_SOL; // Convert SOL to Lamports

        try {
            nft = await nftModel.findById(nftId);
            if (!nft) {
                throw new Error('NFT not found in database.');
            }
            if (nft.owner !== sellerWallet) {
                throw new Error('NFT listing: Only the owner can list this NFT.');
            }
            if (nft.isListed) {
                throw new Error('NFT is already listed for sale.');
            }
            if (nft.status !== 'active') { // Ensure NFT is active and minted
                throw new Error('NFT is not in an active state for listing.');
            }

            // Step 1: Update NFT status in DB to "pending_list"
            // This is the first "local" transaction step.
            const originalNftState = nft.toObject(); // Store original state for compensation
            nft.isListed = true; // Temporarily mark as listed in DB, actual on-chain confirmation pending
            nft.price = priceLamports;
            nft.listedAt = new Date();
            nft.listingDuration = durationDays;
            nft.listedBy = sellerWallet;
            nft.status = 'pending_list'; // New status for pending on-chain action
            nft.history.push({ type: 'List Request', from: sellerWallet, timestamp: new Date() });
            await nft.save();

            // Compensation for Step 1: Revert DB changes
            transactionService.addCompensation(transactionId, async () => {
                logger.warn(`Transaction ${transactionId}: Compensating: Reverting NFT DB state for ${nft.mint} (listing).`);
                await nftModel.findByIdAndUpdate(nftId, originalNftState);
                await cacheService.invalidateCache(cacheService.CACHE_KEYS.NFT_BY_ID(nftId));
            });

            // Step 2: Queue the actual blockchain listing operation
            // This message is consumed by a worker that interacts with Solana.
            const queueMessage = {
                type: queueService.QUEUE_NAMES.NFT_LIST_EVENT, // Use specific queue name from constants
                transactionId: transactionId,
                nftId: nftId, // MongoDB _id
                mintAddress: nft.mint, // Solana mint address
                sellerWallet: sellerWallet,
                priceLamports: priceLamports,
                durationDays: durationDays,
            };
            const published = queueService.publishToQueue(queueService.QUEUE_NAMES.NFT_PROCESSING, queueMessage);

            if (!published) {
                throw new Error('Failed to queue blockchain listing operation. Rolling back database changes.');
            }

            logger.info(`NFT Service: NFT ${nft.mint} listing request queued for seller ${sellerWallet} at ${priceSol} SOL.`);
            // Event is published after transaction is committed (or at least queued).
            // A 'nftListingRequested' event could be published here.
            // The 'nftListed' event should be published by the queue consumer once the blockchain transaction is confirmed.

            transactionService.commitTransaction(transactionId);
            // Optionally, publish an event indicating the request was received
            eventService.publishEvent('nftListingRequested', { nftId: nft._id, sellerWallet: sellerWallet, priceSol: priceSol });

            return nft;

        } catch (error) {
            logger.error(`NFT Service Error: Failed to list NFT ${nftId}: ${error.message}`, error);
            await transactionService.rollbackTransaction(transactionId);
            throw error; // Re-throw the error for the caller
        } finally {
            // Always invalidate cache relevant to the NFT
            await cacheService.invalidateCache(cacheService.CACHE_KEYS.NFT_BY_ID(nftId));
            await cacheService.invalidateCacheByPattern(cacheService.CACHE_KEYS.ALL_NFTS('*')); // Invalidate all search caches
        }
    };


    /**
     * Handles the logic for buying an NFT from the marketplace.
     * Uses compensating transactions pattern and publishes to queue.
     * @param {string} nftId - The ID of the NFT in our database.
     * @param {string} buyerWallet - The wallet address of the buyer.
     * @returns {Promise<object>} - Updated NFT object.
     * @throws {Error} If NFT not found, not listed, or cannot be bought.
     */
    const buyNft = async (nftId, buyerWallet) => {
        const transactionId = uuidv4();
        transactionService.startTransaction(transactionId);
        let nft;
        let originalSellerWallet;
        let buyerUser;

        try {
            nft = await nftModel.findById(nftId);
            if (!nft) {
                throw new Error('NFT not found in database.');
            }
            if (!nft.isListed || nft.status !== 'pending_list') { // Ensure it's genuinely listed
                throw new Error('NFT is not listed for sale or its listing is not active.');
            }
            if (nft.owner === buyerWallet) {
                throw new Error('Cannot buy your own NFT.');
            }
            if (!nft.price || nft.price <= 0) {
                throw new Error('NFT has no valid price specified for purchase.');
            }

            originalSellerWallet = nft.owner; // Store current owner for potential compensation

            // Step 1: Update NFT status in DB to "pending_sale"
            const originalNftState = nft.toObject(); // Store original state
            const originalBuyerUserState = await userModel.findOne({ walletAddress: buyerWallet }).lean(); // Store buyer state
            const originalSellerUserState = await userModel.findOne({ walletAddress: originalSellerWallet }).lean(); // Store seller state

            nft.isListed = false; // Mark as no longer listed, actual on-chain transfer pending
            // Do NOT nullify price, listedAt, listedBy until confirmed
            // For a robust system, you might add a 'buyerPending' field or similar
            nft.status = 'pending_sale'; // New status for pending on-chain action
            nft.history.push({ type: 'Buy Request', from: buyerWallet, price: nft.price, timestamp: new Date() });
            await nft.save();

            // Compensation for Step 1 (NFT state): Revert NFT DB changes
            transactionService.addCompensation(transactionId, async () => {
                logger.warn(`Transaction ${transactionId}: Compensating: Reverting NFT DB state for ${nft.mint} (purchase).`);
                await nftModel.findByIdAndUpdate(nftId, originalNftState);
                await cacheService.invalidateCache(cacheService.CACHE_KEYS.NFT_BY_ID(nftId));
                await cacheService.invalidateCacheByPattern(cacheService.CACHE_KEYS.ALL_NFTS('*'));
            });


            // Step 2: Ensure buyer user exists in DB, create if not
            buyerUser = await userModel.findOne({ walletAddress: buyerWallet });
            if (!buyerUser) {
                buyerUser = new userModel({ walletAddress: buyerWallet, role: config.ROLES.USER });
                await buyerUser.save();
                logger.info(`Transaction ${transactionId}: Created new user for buyer: ${buyerWallet}`);
            }

            // Compensation for Step 2 (new buyer user): Delete created user if later steps fail
            transactionService.addCompensation(transactionId, async () => {
                logger.warn(`Transaction ${transactionId}: Compensating: Deleting newly created user ${buyerUser.walletAddress}`);
                // Only delete if this service created the user
                if (!originalBuyerUserState) { // If there was no original state, means user was just created
                    await userModel.findByIdAndDelete(buyerUser._id);
                }
                await cacheService.invalidateCache(cacheService.CACHE_KEYS.USER_PROFILE(buyerWallet));
            });


            // Step 3: Queue the actual blockchain purchase operation (token transfer, funds transfer)
            const queueMessage = {
                type: queueService.QUEUE_NAMES.NFT_PURCHASE_EVENT, // Use specific queue name from constants
                transactionId: transactionId,
                nftId: nftId, // MongoDB _id
                mintAddress: nft.mint, // Solana mint address
                sellerWallet: originalSellerWallet,
                buyerWallet: buyerWallet,
                priceLamports: nft.price,
                platformFeeLamports: Math.floor(nft.price * (config.marketplaceFeePercentage || 0.02)), // Example fee
                platformFeeWallet: config.SOLANA_CONFIG.WALLET_ADDRESSES.PLATFORM_FEE_WALLET,
            };
            const published = queueService.publishToQueue(queueService.QUEUE_NAMES.NFT_PROCESSING, queueMessage);

            if (!published) {
                throw new Error('Failed to queue blockchain purchase operation. Rolling back database changes.');
            }

            logger.info(`NFT Service: NFT ${nft.mint} purchase request queued for buyer ${buyerWallet} from seller ${originalSellerWallet}.`);
            // The 'nftPurchased' event should be published by the queue consumer once the blockchain transaction is confirmed.
            // A 'nftPurchaseRequested' event could be published here.

            transactionService.commitTransaction(transactionId);
            eventService.publishEvent('nftPurchaseRequested', { nftId: nft._id, buyerWallet: buyerWallet, sellerWallet: originalSellerWallet, price: nft.price });

            return nft;

        } catch (error) {
            logger.error(`NFT Service Error: Failed to initiate buying NFT ${nftId}: ${error.message}`, error);
            await transactionService.rollbackTransaction(transactionId);
            throw error;
        } finally {
            // Always invalidate cache relevant to the NFT and users
            await cacheService.invalidateCache(cacheService.CACHE_KEYS.NFT_BY_ID(nftId));
            await cacheService.invalidateCacheByPattern(cacheService.CACHE_KEYS.ALL_NFTS('*')); // Invalidate all search caches
            if (buyerWallet) await cacheService.invalidateCache(cacheService.CACHE_KEYS.USER_PROFILE(buyerWallet));
            if (originalSellerWallet) await cacheService.invalidateCache(cacheService.CACHE_KEYS.USER_PROFILE(originalSellerWallet));
        }
    };

    /**
     * Updates an NFT record in the database based on blockchain confirmation.
     * This function would typically be called by a message queue consumer
     * after a blockchain transaction (mint, list, buy) is confirmed.
     * @param {string} nftDbId - The MongoDB ID of the NFT.
     * @param {object} updates - Object containing updates (e.g., { status: 'active', owner: newOwner, mint: 'mintAddress' }).
     * @param {string} transactionId - The ID of the distributed transaction.
     * @returns {Promise<object>} The updated NFT document.
     * @throws {Error} If NFT not found or update fails.
     */
    const updateNftStatusFromBlockchainConfirmation = async (nftDbId, updates, transactionId) => {
        try {
            const nft = await nftModel.findById(nftDbId);
            if (!nft) {
                logger.error(`NFT Service: NFT with DB ID ${nftDbId} not found for blockchain confirmation update.`);
                throw new Error(`NFT with ID ${nftDbId} not found.`);
            }

            const oldOwner = nft.owner; // Store for potential user cache invalidation

            // Apply updates
            Object.assign(nft, updates);

            // Add history entry based on status change
            if (updates.status) {
                if (updates.status === 'active' && !updates.mint) { // Confirming a listing or purchase
                    nft.history.push({ type: 'Status Confirmed', status: updates.status, timestamp: new Date() });
                } else if (updates.status === 'active' && updates.mint) { // Confirming a mint
                    nft.history.push({ type: 'Mint Confirmed', mint: updates.mint, timestamp: new Date() });
                } else if (updates.status === 'listed') {
                    // Update specific listing fields if not already done by listNft
                    nft.history.push({ type: 'Listing Confirmed', timestamp: new Date() });
                } else if (updates.status === 'sold') {
                    // Update specific purchase fields if not already done by buyNft
                    nft.history.push({ type: 'Purchase Confirmed', timestamp: new Date() });
                }
            }

            await nft.save();

            // Invalidate caches for the updated NFT
            await cacheService.invalidateCache(cacheService.CACHE_KEYS.NFT_BY_ID(nftDbId));
            await cacheService.invalidateCacheByPattern(cacheService.CACHE_KEYS.ALL_NFTS('*'));

            // Invalidate user caches if owner changed (for purchase confirmations)
            if (updates.owner && oldOwner !== updates.owner) {
                await cacheService.invalidateCache(cacheService.CACHE_KEYS.USER_PROFILE(oldOwner));
                await cacheService.invalidateCache(cacheService.CACHE_KEYS.USER_PROFILE(updates.owner));
            }

            logger.info(`NFT Service: NFT ${nftDbId} updated based on blockchain confirmation. New status: ${nft.status}`);
            eventService.publishEvent('nftUpdatedByBlockchain', { nftId: nftDbId, updates: updates });

            return nft;
        } catch (error) {
            logger.error(`NFT Service Error: Failed to update NFT ${nftDbId} after blockchain confirmation for transaction ${transactionId}: ${error.message}`, error);
            // DO NOT rollback the distributed transaction here. This function is typically called *after*
            // the blockchain action is confirmed, and any local DB changes are the final step.
            // If this fails, it's a data consistency issue in the application, not a distributed transaction rollback.
            throw error;
        }
    };


    return {
        getNftById,
        searchNfts,
        fetchNftFromBlockchain,
        mintNft,
        listNft,
        buyNft,
        updateNftStatusFromBlockchainConfirmation, // Export this for queue consumers
    };
};
