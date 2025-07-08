const Nft = require('../models/Nft'); // Still needed for Mongoose model definition
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const logger = require('../config/logger');

// @desc    Get all NFTs
// @route   GET /api/v1/nfts
// @access  Public
const getNfts = asyncHandler(async (req, res, next) => {
    const nftService = req.container.resolve('nftService');
    const { owner, isListed } = req.query; // Allow filtering by owner or listing status

    const query = {};
    if (owner) {
        query.owner = owner;
    }
    if (isListed !== undefined) {
        query.isListed = isListed === 'true'; // Convert string to boolean
    }

    const nfts = await nftService.searchNfts(query);
    res.json({ success: true, count: nfts.length, data: nfts });
});

// @desc    Get single NFT by ID
// @route   GET /api/v1/nfts/:id
// @access  Public
const getNft = asyncHandler(async (req, res, next) => {
    const nftService = req.container.resolve('nftService');
    const nft = await nftService.getNftById(req.params.id);

    if (!nft) {
        return next(new ApiError('NFT not found', 404));
    }
    res.json({ success: true, data: nft });
});

// @desc    Create a new NFT (Simulated Mint)
// @route   POST /api/v1/nfts
// @access  Private (Admin/Developer only)
const createNft = asyncHandler(async (req, res, next) => {
    const nftService = req.container.resolve('nftService');
    const { name, description, owner, attributes } = req.body; // owner is the initial owner
    let image = req.body.image; // Can be a URL or placeholder

    if (!req.file && !image) {
        return next(new ApiError('Image file or URL is required for NFT creation.', 400));
    }
    if (req.file) {
        // Assume image is uploaded to /uploads
        image = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    }

    // Simulate a mint address (in a real scenario, this comes from the Solana program)
    const mintAddress = `AFOX_NFT_MINT_${Date.now()}`;

    // Simulate blockchain interaction (e.g., calling a mint program)
    const blockchainData = await nftService.fetchNftFromBlockchain(mintAddress);
    logger.info(`Simulated blockchain mint for ${mintAddress}: ${JSON.stringify(blockchainData)}`);

    const newNft = new Nft({
        name,
        description,
        image,
        mint: mintAddress,
        owner: owner || blockchainData.blockchainData.owner, // Use provided owner or simulated
        isListed: false,
        history: [{ type: 'Mint', to: owner || blockchainData.blockchainData.owner, timestamp: new Date() }],
        attributes: attributes || [],
    });

    await newNft.save();
    // Invalidate cache for NFT listings/searches
    const cacheService = req.container.resolve('cacheService');
    await cacheService.invalidateCacheByPattern('nfts:search:*');
    await cacheService.invalidateCache(`nft:${newNft._id}`);

    const eventService = req.container.resolve('eventService');
    eventService.publishEvent('nftMinted', newNft);

    logger.info(`New NFT created and simulated mint: ${newNft._id} (${newNft.mint})`);
    res.status(201).json({ success: true, message: 'NFT created and simulated mint successfully', data: newNft });
});

// @desc    List an NFT for sale
// @route   POST /api/v1/nfts/:id/list
// @access  Private (Owner only)
const listNftForSale = asyncHandler(async (req, res, next) => {
    const nftService = req.container.resolve('nftService');
    const { price, duration } = req.body;
    const { id } = req.params;

    if (!price || price <= 0) {
        return next(new ApiError('Price must be a positive number', 400));
    }
    if (!duration || duration <= 0) {
        return next(new ApiError('Listing duration must be a positive number', 400));
    }

    // In a real app, req.user.walletAddress would come from authenticated user
    // For simulation, we assume req.user.walletAddress is available.
    const sellerWallet = req.user.walletAddress || "SIMULATED_USER_WALLET_ADDRESS";

    const listedNft = await nftService.listNft(id, sellerWallet, price, duration);

    res.json({ success: true, message: 'NFT listed for sale successfully', data: listedNft });
});

// @desc    Buy an NFT
// @route   POST /api/v1/nfts/:id/buy
// @access  Private (Authenticated user)
const buyNft = asyncHandler(async (req, res, next) => {
    const nftService = req.container.resolve('nftService');
    const { id } = req.params;

    // In a real app, req.user.walletAddress would come from authenticated user
    const buyerWallet = req.user.walletAddress || "SIMULATED_USER_WALLET_ADDRESS_BUYER";

    const purchasedNft = await nftService.buyNft(id, buyerWallet);

    res.json({ success: true, message: 'NFT purchased successfully', data: purchasedNft });
});


// @desc    Update an NFT (e.g., change description, image - not blockchain owner)
// @route   PUT /api/v1/nfts/:id
// @access  Private (Admin or Owner)
const updateNft = asyncHandler(async (req, res, next) => {
    const nftService = req.container.resolve('nftService');
    const { id } = req.params;
    const updates = req.body; // name, description, attributes

    const nft = await nftService.getNftById(id);

    if (!nft) {
        return next(new ApiError('NFT not found', 404));
    }

    // Authorization: Only owner or admin can update metadata (not ownership)
    // if (req.user.role !== 'admin' && nft.owner !== req.user.walletAddress) {
    //     return next(new ApiError('Not authorized to update this NFT', 403));
    // }

    // Apply updates, excluding fields that shouldn't be changed via this route
    const fieldsToUpdate = ['name', 'description', 'attributes'];
    fieldsToUpdate.forEach(field => {
        if (updates[field] !== undefined) {
            nft[field] = updates[field];
        }
    });

    if (req.file) {
        nft.image = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    }

    await nft.save();
    const cacheService = req.container.resolve('cacheService');
    await cacheService.invalidateCache(`nft:${id}`);
    await cacheService.invalidateCacheByPattern('nfts:search:*');

    logger.info(`NFT updated: ${nft._id}`);
    res.json({ success: true, message: 'NFT updated successfully', data: nft });
});

// @desc    Delete an NFT (Simulated Burn)
// @route   DELETE /api/v1/nfts/:id
// @access  Private (Admin only)
const deleteNft = asyncHandler(async (req, res, next) => {
    const nftService = req.container.resolve('nftService');
    const nft = await nftService.getNftById(req.params.id);

    if (!nft) {
        return next(new ApiError('NFT not found', 404));
    }

    // Simulate blockchain interaction (e.g., calling a burn program)
    logger.info(`Simulating blockchain burn for NFT: ${nft.mint}`);
    // const burnSignature = await solanaSimulator.simulateSendTransaction({ type: 'burn_nft', mint: nft.mint }, []);
    // logger.info(`Simulated NFT burn transaction signature: ${burnSignature}`);

    await Nft.findByIdAndDelete(req.params.id);
    const cacheService = req.container.resolve('cacheService');
    await cacheService.invalidateCache(`nft:${req.params.id}`);
    await cacheService.invalidateCacheByPattern('nfts:search:*');

    const eventService = req.container.resolve('eventService');
    eventService.publishEvent('nftBurned', nft._id); // Example: new event type

    logger.info(`NFT deleted and simulated burn: ${req.params.id}`);
    res.json({ success: true, message: 'NFT deleted and simulated burn successfully' });
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
