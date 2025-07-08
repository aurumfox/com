// backend/routes/nfts.js
const express = require('express');
const router = express.Router();

// --- Import Controller Functions ---
// These functions contain the core logic for handling each NFT-related request,
// including database interactions, Solana blockchain calls, and error handling.
const {
    getMarketplaceNfts,   // Retrieves all NFTs listed for sale
    getUserNfts,          // Retrieves NFTs owned by a specific user wallet
    getNftListingDetails, // Retrieves details of a single NFT listing
    mintNft,              // Handles minting a new NFT (blockchain + DB)
    listNftForSale,       // Handles listing an NFT for sale
    buyNft,               // Handles purchasing an NFT
    transferNft,          // Handles transferring an NFT
    // Optional Admin/Dev CRUD operations (uncomment as needed in router)
    // getNfts,             // For getting all NFTs (e.g., for admin panel)
    // updateNft,           // For updating NFT metadata
    // deleteNft            // For deleting an NFT record
} = require('../controllers/nftController');

// --- Import Middleware & Utilities ---
// Centralized authentication, authorization, file upload, and validation.
const { authenticateToken, authorizeRole } = require('../middleware/authMiddleware');
const upload = require('../utils/multer'); // Configured Multer instance for file uploads
const { ROLES } = require('../utils/constants'); // Constants for user roles (e.g., ADMIN, DEVELOPER)
const { validate, schemas } = require('../middleware/validationMiddleware'); // Joi schemas for request body validation

// --- Public NFT Endpoints ---
// These routes are accessible without authentication.
router.get('/marketplace', getMarketplaceNfts);
router.get('/user/:walletAddress', getUserNfts);
router.get('/listing/:nftId', getNftListingDetails);

// --- Authenticated NFT Endpoints ---
// These routes require a valid JWT token. Some also require specific user roles.

// POST /api/nfts/mint
// Handles the minting of a new NFT. Requires an image file upload and specific roles.
router.post(
    '/mint',
    authenticateToken,                             // Ensures user is logged in
    authorizeRole([ROLES.ADMIN, ROLES.DEVELOPER]), // Restricts access to Admin/Developer
    upload.single('nftFile'),                      // Handles single file upload with field name 'nftFile'
    validate(schemas.nfts.create),                 // Validates the request body for NFT creation
    mintNft                                        // Calls the controller function to execute minting logic
);

// POST /api/nfts/list
// Endpoint to list an NFT for sale. Requires authentication.
router.post(
    '/list',
    authenticateToken,                      // Ensures user is logged in
    validate(schemas.nfts.list),            // Validates the request body for listing (nftId, price, sellerWallet)
    listNftForSale                          // Calls the controller function to handle listing logic
);

// POST /api/nfts/buy
// Processes the purchase of an NFT. Requires authentication and transaction signature.
router.post(
    '/buy',
    authenticateToken,                      // Ensures user is logged in
    validate(schemas.nfts.buy),             // Validates the request body for purchase (nftId, newOwnerWallet, transactionSignature)
    buyNft                                  // Calls the controller function to handle purchase logic
);

// POST /api/nfts/transfer
// Updates NFT ownership after an on-chain transfer. Requires authentication and transaction signature.
router.post(
    '/transfer',
    authenticateToken,                      // Ensures user is logged in
    validate(schemas.nfts.transfer),        // Validates the request body for transfer
    transferNft                             // Calls the controller function to handle transfer logic
);

// --- Optional Admin/Developer NFT Management Endpoints ---
// These routes provide full CRUD operations, typically for administrative purposes.
// Uncomment and implement in `nftController.js` if you need these functionalities.

/*
// GET /api/nfts/ - Retrieves all NFTs (potentially including unlisted ones for admin view)
router.get(
    '/',
    authenticateToken, // Or authorizeRole([ROLES.ADMIN]) for stricter control
    getNfts
);

// PUT /api/nfts/:id - Updates NFT metadata (e.g., description, image, attributes)
router.put(
    '/:id',
    authenticateToken,
    authorizeRole([ROLES.ADMIN, ROLES.DEVELOPER]),
    upload.single('image'), // If allowing image updates
    validate(schemas.nfts.update),
    updateNft
);

// DELETE /api/nfts/:id - Deletes an NFT record from the database. Use with extreme caution.
router.delete(
    '/:id',
    authenticateToken,
    authorizeRole([ROLES.ADMIN]),
    deleteNft
);
*/

module.exports = router;
