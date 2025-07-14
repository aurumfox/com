const Nft = require('../models/Nft'); // Still needed for Mongoose model definition
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const logger = require('../config/logger');
const Joi = require('joi'); // For input validation
const { ROLES } = require('../config/constants'); // Assuming you have ROLES constant

// --- Joi Validation Schemas ---
const getNftsQuerySchema = Joi.object({
    owner: Joi.string().trim().optional(),
    isListed: Joi.boolean().optional(),
    limit: Joi.number().integer().min(1).default(10), // Pagination
    offset: Joi.number().integer().min(0).default(0), // Pagination
    minPrice: Joi.number().min(0).optional(),
    maxPrice: Joi.number().min(0).greater(Joi.ref('minPrice')).optional(), // maxPrice must be > minPrice
    sortBy: Joi.string().valid('createdAt', 'price', 'name').default('createdAt'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc')
}).and('minPrice', 'maxPrice'); // Both minPrice and maxPrice must be present if one is.

const nftIdSchema = Joi.string().pattern(/^[0-9a-fA-F]{24}$/).messages({
    'string.pattern.base': 'NFT ID must be a valid MongoDB ObjectId.'
});

const createNftBodySchema = Joi.object({
    name: Joi.string().trim().required().min(3).max(100),
    description: Joi.string().trim().max(1000).optional().allow(''),
    owner: Joi.string().trim().required().min(32).max(44).messages({
        'string.min': 'Owner wallet address must be at least 32 characters long.',
        'string.max': 'Owner wallet address cannot exceed 44 characters.'
    }), // Initial owner, validated as a wallet address
    attributes: Joi.array().items(Joi.object({
        trait_type: Joi.string().required().min(1),
        value: Joi.string().required().min(1)
    })).optional().default([]),
    image: Joi.string().uri().optional().allow('') // Optional if file upload is handled separately
});

const listNftForSaleSchema = Joi.object({
    price: Joi.number().min(0.000000001).required().messages({ 'number.min': 'Price must be a positive number.' }), // Minimum small positive value
    duration: Joi.number().integer().min(1).max(365).required().messages({
        'number.min': 'Listing duration must be at least 1 day.',
        'number.max': 'Listing duration cannot exceed 365 days.'
    })
});

// Update NFT schema for mutable fields
const updateNftBodySchema = Joi.object({
    name: Joi.string().trim().min(3).max(100).optional(),
    description: Joi.string().trim().max(1000).optional().allow(''),
    attributes: Joi.array().items(Joi.object({
        trait_type: Joi.string().required().min(1),
        value: Joi.string().required().min(1)
    })).optional(),
    // Image will be handled via file upload middleware, not directly in body
}).min(1).messages({ 'object.min': 'At least one field (name, description, or attributes) must be provided for update.' }); // At least one field is required for update

/**
 * @desc Get all NFTs
 * @route GET /api/v1/nfts
 * @access Public
 * @param {object} req - The Express request object.
 * @param {object} req.query - Query parameters for filtering and pagination (owner, isListed, limit, offset, etc.).
 * @param {object} res - The Express response object.
 * @param {function} next - The Express next middleware function.
 * @returns {object} 200 - An object with success status, count, and an array of NFTs.
 * @throws {ApiError} 400 - If validation of query parameters fails.
 */
const getNfts = asyncHandler(async (req, res, next) => {
    // 1. Input Validation for Query Parameters
    const { error, value } = getNftsQuerySchema.validate(req.query);
    if (error) {
        const errors = error.details.map(detail => detail.message);
        logger.warn(`Validation error for getNfts query: ${errors.join(', ')}`);
        return next(ApiError.badRequest('Validation Error', errors));
    }

    const nftService = req.container.resolve('nftService');
    
    // Construct query object based on validated values
    const query = {};
    if (value.owner) {
        query.owner = value.owner;
    }
    if (value.isListed !== undefined) {
        query.isListed = value.isListed;
    }

    // Pass pagination and sorting options to service
    const options = {
        limit: value.limit,
        offset: value.offset,
        sortBy: value.sortBy,
        sortOrder: value.sortOrder,
        minPrice: value.minPrice,
        maxPrice: value.maxPrice
    };

    const nfts = await nftService.searchNfts(query, options);
    logger.debug(`Fetched ${nfts.length} NFTs for query: ${JSON.stringify(query)} with options: ${JSON.stringify(options)}`);
    res.status(200).json({ success: true, count: nfts.length, data: nfts });
});

/**
 * @desc Get single NFT by ID
 * @route GET /api/v1/nfts/:id
 * @access Public
 * @param {object} req - The Express request object.
 * @param {object} req.params - The request parameters containing the 'id' of the NFT.
 * @param {object} res - The Express response object.
 * @param {function} next - The Express next middleware function.
 * @returns {object} 200 - An object with success status and the NFT data.
 * @throws {ApiError} 400 - If the NFT ID format is invalid.
 * @throws {ApiError} 404 - If the NFT is not found.
 */
const getNft = asyncHandler(async (req, res, next) => {
    // 1. Input Validation for ID
    const { error: idError } = nftIdSchema.validate(req.params.id);
    if (idError) {
        return next(ApiError.badRequest(idError.details[0].message));
    }

    const nftService = req.container.resolve('nftService');
    const nft = await nftService.getNftById(req.params.id);

    if (!nft) {
        logger.warn(`NFT not found for ID: ${req.params.id}`);
        return next(ApiError.notFound('NFT not found.'));
    }
    logger.debug(`Fetched NFT: ${nft._id}`);
    res.status(200).json({ success: true, data: nft });
});

/**
 * @desc Create a new NFT (Simulated Mint)
 * @route POST /api/v1/nfts
 * @access Private (Admin/Developer only)
 * @param {object} req - The Express request object.
 * @param {object} req.body - The request body containing NFT details (name, description, owner, attributes, optional image URL).
 * @param {object} req.file - The uploaded file object (if using multer for image upload).
 * @param {object} req.user - The authenticated user object (from authMiddleware).
 * @param {object} res - The Express response object.
 * @param {function} next - The Express next middleware function.
 * @returns {object} 201 - An object with success status, message, and the new NFT data.
 * @throws {ApiError} 400 - If validation fails or image is missing.
 * @throws {ApiError} 403 - If the user is not authorized.
 * @throws {ApiError} 500 - If an unexpected error occurs during creation.
 */
const createNft = asyncHandler(async (req, res, next) => {
    // 1. Authorization: Only Admin or Developer can create NFTs
    if (!req.user || ![ROLES.ADMIN, ROLES.DEVELOPER].includes(req.user.role)) {
        logger.warn(`Unauthorized attempt to create NFT by user ${req.user ? req.user.walletAddress : 'N/A'} (Role: ${req.user ? req.user.role : 'N/A'}).`);
        return next(ApiError.forbidden('Only administrators or developers can create NFTs.'));
    }

    // 2. Input Validation (for body fields)
    const { error, value } = createNftBodySchema.validate(req.body);
    if (error) {
        const errors = error.details.map(detail => detail.message);
        logger.warn(`Validation error during NFT creation: ${errors.join(', ')}`);
        return next(ApiError.badRequest('Validation Error', errors));
    }

    let image = value.image; // Use validated image URL from body

    // Handle image upload from file or ensure URL is present
    if (req.file) {
        // Construct the full image URL based on your server configuration
        image = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
        logger.info(`NFT image uploaded: ${image}`);
    } else if (!image) {
        // If no file uploaded AND no image URL provided in body
        return next(ApiError.badRequest('Image file or URL is required for NFT creation.'));
    }

    const nftService = req.container.resolve('nftService');
    const cacheService = req.container.resolve('cacheService');
    const eventService = req.container.resolve('eventService');

    try {
        // Simulate a mint address (in a real scenario, this comes from the Solana program)
        const mintAddress = `AFOX_NFT_MINT_${Date.now()}`;

        // Simulate blockchain interaction (e.g., calling a mint program)
        // This 'fetchNftFromBlockchain' call might not be needed for creation if data is from frontend.
        // It's more relevant for fetching existing NFTs from blockchain.
        // If this is for _simulating_ on-chain minting, the owner passed should be the minter.
        const blockchainData = await nftService.fetchNftFromBlockchain(mintAddress).catch(err => {
            logger.warn(`Simulated blockchain interaction failed for mint ${mintAddress}: ${err.message}`);
            // Decide if this should block creation or just proceed without blockchainData
            return { blockchainData: { owner: value.owner } }; // Fallback to provided owner
        });
        logger.info(`Simulated blockchain mint for ${mintAddress}: ${JSON.stringify(blockchainData)}`);

        const newNft = new Nft({
            name: value.name,
            description: value.description,
            image: image,
            mint: mintAddress,
            owner: value.owner || blockchainData.blockchainData.owner, // Use provided owner or simulated
            isListed: false,
            // Record the minter/creator in history
            history: [{ type: 'MINTED', to: value.owner || blockchainData.blockchainData.owner, timestamp: new Date() }],
            attributes: value.attributes,
            createdBy: req.user.id // Track who created this NFT in the system
        });

        await newNft.save();

        // Invalidate cache for NFT listings/searches and specific NFT
        await cacheService.invalidateCacheByPattern('nfts:search:*');
        await cacheService.invalidateCache(`nft:${newNft._id}`);

        eventService.publishEvent('nftMinted', newNft); // Publish event
        logger.info(`New NFT created and simulated mint: ${newNft._id} (${newNft.mint}) by ${req.user.walletAddress}`);

        res.status(201).json({ success: true, message: 'NFT created and simulated mint successfully', data: newNft });
    } catch (dbError) {
        logger.error(`Database error during NFT creation:`, dbError);
        return next(ApiError.internal('Failed to create NFT.'));
    }
});

/**
 * @desc List an NFT for sale
 * @route POST /api/v1/nfts/:id/list
 * @access Private (Owner only)
 * @param {object} req - The Express request object.
 * @param {object} req.params - The request parameters containing the 'id' of the NFT.
 * @param {object} req.body - The request body containing 'price' and 'duration'.
 * @param {object} req.user - The authenticated user object (from authMiddleware).
 * @param {object} res - The Express response object.
 * @param {function} next - The Express next middleware function.
 * @returns {object} 200 - An object with success status, message, and the listed NFT data.
 * @throws {ApiError} 400 - If validation fails or ID is invalid.
 * @throws {ApiError} 403 - If the user is not authorized (not owner).
 * @throws {ApiError} 404 - If the NFT is not found.
 * @throws {ApiError} 500 - If an unexpected error occurs during listing.
 */
const listNftForSale = asyncHandler(async (req, res, next) => {
    const { id } = req.params;

    // 1. Input Validation for ID
    const { error: idError } = nftIdSchema.validate(id);
    if (idError) {
        return next(ApiError.badRequest(idError.details[0].message));
    }

    // 2. Input Validation for Body
    const { error, value } = listNftForSaleSchema.validate(req.body);
    if (error) {
        const errors = error.details.map(detail => detail.message);
        logger.warn(`Validation error during NFT listing for ID ${id}: ${errors.join(', ')}`);
        return next(ApiError.badRequest('Validation Error', errors));
    }

    const { price, duration } = value; // Use validated values

    const nftService = req.container.resolve('nftService');
    const cacheService = req.container.resolve('cacheService');
    const eventService = req.container.resolve('eventService');

    // Authentication & Authorization: req.user.walletAddress must match NFT owner
    if (!req.user || !req.user.walletAddress) {
        logger.warn(`Unauthorized attempt to list NFT ${id}: No authenticated user.`);
        return next(ApiError.unauthorized('Authentication required to list an NFT.'));
    }

    try {
        const listedNft = await nftService.listNft(id, req.user.walletAddress, price, duration); // Use authenticated user's wallet

        // Invalidate cache for the specific NFT and general listings
        await cacheService.invalidateCache(`nft:${id}`);
        await cacheService.invalidateCacheByPattern('nfts:search:*');

        eventService.publishEvent('nftListed', {
            _id: listedNft._id,
            mint: listedNft.mint,
            name: listedNft.name,
            price: listedNft.price,
            listedBy: listedNft.listedBy,
            listingDuration: listedNft.listingDuration,
            isListed: listedNft.isListed
        });
        logger.info(`NFT ${id} listed for sale by ${req.user.walletAddress} for ${price} SOL.`);
        res.status(200).json({ success: true, message: 'NFT listed for sale successfully', data: listedNft });
    } catch (serviceError) {
        if (serviceError instanceof ApiError) {
            return next(serviceError); // Re-throw specific API errors from service (e.g., Not owner)
        }
        logger.error(`Error listing NFT ${id} by ${req.user.walletAddress}:`, serviceError);
        return next(ApiError.internal('Failed to list NFT for sale.'));
    }
});

/**
 * @desc Buy an NFT
 * @route POST /api/v1/nfts/:id/buy
 * @access Private (Authenticated user)
 * @param {object} req - The Express request object.
 * @param {object} req.params - The request parameters containing the 'id' of the NFT.
 * @param {object} req.user - The authenticated user object (from authMiddleware).
 * @param {object} res - The Express response object.
 * @param {function} next - The Express next middleware function.
 * @returns {object} 200 - An object with success status, message, and the purchased NFT data.
 * @throws {ApiError} 400 - If ID is invalid.
 * @throws {ApiError} 403 - If the user is not authorized (e.g., trying to buy own NFT, or insufficient funds handled by service).
 * @throws {ApiError} 404 - If the NFT is not found or not listed.
 * @throws {ApiError} 500 - If an unexpected error occurs during purchase.
 */
const buyNft = asyncHandler(async (req, res, next) => {
    const { id } = req.params;

    // 1. Input Validation for ID
    const { error: idError } = nftIdSchema.validate(id);
    if (idError) {
        return next(ApiError.badRequest(idError.details[0].message));
    }

    // 2. Authentication: User must be logged in
    if (!req.user || !req.user.walletAddress) {
        logger.warn(`Unauthorized attempt to buy NFT ${id}: No authenticated user.`);
        return next(ApiError.unauthorized('Authentication required to buy an NFT.'));
    }

    const nftService = req.container.resolve('nftService');
    const cacheService = req.container.resolve('cacheService');
    const eventService = req.container.resolve('eventService');

    const buyerWallet = req.user.walletAddress; // Use the authenticated user's wallet

    try {
        const purchasedNft = await nftService.buyNft(id, buyerWallet);

        // Invalidate cache for the specific NFT and general listings/searches
        await cacheService.invalidateCache(`nft:${id}`);
        await cacheService.invalidateCacheByPattern('nfts:search:*');

        eventService.publishEvent('nftPurchased', {
            _id: purchasedNft._id,
            mint: purchasedNft.mint,
            name: purchasedNft.name,
            buyerWallet: buyerWallet,
            price: purchasedNft.price, // Include sale price if available after purchase
            previousOwner: purchasedNft.history.find(h => h.type === 'BOUGHT' || h.type === 'TRANSFERRED')?.from // Find original seller
        });
        logger.info(`NFT ${id} purchased by ${buyerWallet}.`);
        res.status(200).json({ success: true, message: 'NFT purchased successfully', data: purchasedNft });
    } catch (serviceError) {
        if (serviceError instanceof ApiError) {
            return next(serviceError); // Re-throw specific API errors from service
        }
        logger.error(`Error buying NFT ${id} by ${buyerWallet}:`, serviceError);
        return next(ApiError.internal('Failed to purchase NFT.'));
    }
});

/**
 * @desc Update an NFT (e.g., change description, image - not blockchain owner)
 * @route PUT /api/v1/nfts/:id
 * @access Private (Admin or Owner)
 * @param {object} req - The Express request object.
 * @param {object} req.params - The request parameters containing the 'id' of the NFT.
 * @param {object} req.body - The request body containing fields to update (name, description, attributes).
 * @param {object} req.file - The uploaded file object (if image is updated).
 * @param {object} req.user - The authenticated user object (from authMiddleware).
 * @param {object} res - The Express response object.
 * @param {function} next - The Express next middleware function.
 * @returns {object} 200 - An object with success status, message, and the updated NFT data.
 * @throws {ApiError} 400 - If validation fails or ID is invalid.
 * @throws {ApiError} 403 - If the user is not authorized.
 * @throws {ApiError} 404 - If the NFT is not found.
 * @throws {ApiError} 500 - If an unexpected error occurs during update.
 */
const updateNft = asyncHandler(async (req, res, next) => {
    const { id } = req.params;

    // 1. Input Validation for ID
    const { error: idError } = nftIdSchema.validate(id);
    if (idError) {
        return next(ApiError.badRequest(idError.details[0].message));
    }

    // 2. Input Validation for Body
    const { error, value } = updateNftBodySchema.validate(req.body);
    if (error) {
        const errors = error.details.map(detail => detail.message);
        logger.warn(`Validation error during NFT update for ID ${id}: ${errors.join(', ')}`);
        return next(ApiError.badRequest('Validation Error', errors));
    }

    const nftService = req.container.resolve('nftService');
    const cacheService = req.container.resolve('cacheService');
    const eventService = req.container.resolve('eventService'); // Also need eventService for updates

    const nft = await nftService.getNftById(id);

    if (!nft) {
        logger.warn(`NFT not found for update: ${id}`);
        return next(ApiError.notFound('NFT not found.'));
    }

    // 3. Authorization: Only owner or Admin can update metadata
    if (!req.user || (req.user.role !== ROLES.ADMIN && nft.owner !== req.user.walletAddress)) {
        logger.warn(`Unauthorized attempt to update NFT ${id} by user ${req.user ? req.user.walletAddress : 'N/A'} (Role: ${req.user ? req.user.role : 'N/A'}). Owner: ${nft.owner}`);
        return next(ApiError.forbidden('Not authorized to update this NFT. Only the owner or an administrator can modify NFT metadata.'));
    }

    // Apply updates from validated body
    Object.assign(nft, value); // Directly assign validated properties

    if (req.file) {
        nft.image = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
        logger.info(`NFT ${id} image updated to: ${nft.image}`);
    }

    // Mark history entry for metadata update (optional, but good for tracking)
    // nft.history.push({ type: 'METADATA_UPDATED', by: req.user.walletAddress, timestamp: new Date() });

    await nft.save();

    // Invalidate cache for the specific NFT and general listings/searches
    await cacheService.invalidateCache(`nft:${id}`);
    await cacheService.invalidateCacheByPattern('nfts:search:*');

    eventService.publishEvent('nftUpdated', {
        _id: nft._id,
        mint: nft.mint,
        name: nft.name,
        updatedBy: req.user.walletAddress,
        updatedFields: Object.keys(value).concat(req.file ? ['image'] : [])
    });
    logger.info(`NFT updated: ${nft._id} by ${req.user.walletAddress}.`);
    res.status(200).json({ success: true, message: 'NFT updated successfully', data: nft });
});

/**
 * @desc Delete an NFT (Simulated Burn)
 * @route DELETE /api/v1/nfts/:id
 * @access Private (Admin only)
 * @param {object} req - The Express request object.
 * @param {object} req.params - The request parameters containing the 'id' of the NFT.
 * @param {object} req.user - The authenticated user object (from authMiddleware).
 * @param {object} res - The Express response object.
 * @param {function} next - The Express next middleware function.
 * @returns {object} 200 - An object with success status and message.
 * @throws {ApiError} 400 - If ID is invalid.
 * @throws {ApiError} 403 - If the user is not authorized.
 * @throws {ApiError} 404 - If the NFT is not found.
 * @throws {ApiError} 500 - If an unexpected error occurs during deletion.
 */
const deleteNft = asyncHandler(async (req, res, next) => {
    const { id } = req.params;

    // 1. Authorization: Only Admin can delete/burn NFTs
    if (!req.user || req.user.role !== ROLES.ADMIN) {
        logger.warn(`Unauthorized attempt to delete NFT ${id} by user ${req.user ? req.user.walletAddress : 'N/A'}.`);
        return next(ApiError.forbidden('Only administrators can delete NFTs.'));
    }

    // 2. Input Validation for ID
    const { error: idError } = nftIdSchema.validate(id);
    if (idError) {
        return next(ApiError.badRequest(idError.details[0].message));
    }

    const nftService = req.container.resolve('nftService');
    const cacheService = req.container.resolve('cacheService');
    const eventService = req.container.resolve('eventService');

    const nft = await nftService.getNftById(id);

    if (!nft) {
        logger.warn(`NFT not found for deletion: ${id}`);
        return next(ApiError.notFound('NFT not found.'));
    }

    // Simulate blockchain interaction (e.g., calling a burn program)
    // In a real dApp, you'd perform the on-chain burn here and only delete from DB upon confirmation.
    logger.info(`Simulating blockchain burn for NFT: ${nft.mint}`);
    // try {
    //     const burnSignature = await solanaSimulator.simulateSendTransaction({ type: 'burn_nft', mint: nft.mint, owner: nft.owner }, []);
    //     logger.info(`Simulated NFT burn transaction signature: ${burnSignature}`);
    // } catch (blockchainError) {
    //     logger.error(`Failed to simulate blockchain burn for ${nft.mint}:`, blockchainError);
    //     // Decide if you want to abort deletion or just log the warning
    //     return next(ApiError.internal('Failed to simulate blockchain burn. NFT not deleted.'));
    // }


    await Nft.findByIdAndDelete(id); // Use the validated ID

    // Invalidate cache for the specific NFT and general listings/searches
    await cacheService.invalidateCache(`nft:${id}`);
    await cacheService.invalidateCacheByPattern('nfts:search:*');

    eventService.publishEvent('nftBurned', {
        _id: nft._id,
        mint: nft.mint,
        name: nft.name,
        owner: nft.owner, // Useful for auditing who owned it before burn
        deletedBy: req.user.walletAddress
    });
    logger.info(`NFT deleted and simulated burn: ${nft._id} (${nft.mint}) by ${req.user.walletAddress}`);
    res.status(200).json({ success: true, message: 'NFT deleted and simulated burn successfully' });
});

module.exports = {
    getNfts,
    getNft,
    createNft,
    listNftForSale,
    buyNft,
    updateNft,
    deleteNft,
};
