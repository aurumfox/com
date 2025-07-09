const express = require('express');
const router = express.Router();

// --- Import Controller Functions ---
// These functions encapsulate the business logic for each NFT-related operation.
const {
    getMarketplaceNfts,   // Retrieves all NFTs listed for sale
    getUserNfts,          // Retrieves NFTs owned by a specific user wallet
    getNftListingDetails, // Retrieves details of a single NFT listing
    mintNft,              // Handles minting a new NFT (blockchain interaction + DB record creation)
    listNftForSale,       // Handles listing an existing NFT for sale on the marketplace
    buyNft,               // Handles the purchase of an NFT
    transferNft,          // Handles updating NFT ownership in DB after an on-chain transfer
    // Optional Admin/Dev CRUD operations (uncomment and implement as needed in controller)
    // getNfts,
    // updateNft,
    // deleteNft
} = require('../controllers/nftController');

// --- Import Middleware & Utilities ---
// Essential components for authentication, authorization, file handling, and validation.
const { authenticateToken, authorizeRole } = require('../middleware/authMiddleware');
const upload = require('../utils/multer'); // Configured Multer instance for handling file uploads
const { ROLES } = require('../utils/constants'); // Constants for user roles (e.g., ADMIN, DEVELOPER)
const { validate, schemas } = require('../middleware/validationMiddleware'); // Joi schemas and validation middleware

// --- Public NFT Endpoints ---
// These routes do not require any user authentication.
router.get('/marketplace', getMarketplaceNfts);
router.get('/user/:walletAddress', getUserNfts); // :walletAddress should be validated in controller or a Joi param schema
router.get('/listing/:nftId', getNftListingDetails); // :nftId should be validated in controller or a Joi param schema

// --- Authenticated & Authorized NFT Endpoints ---
// These routes require a valid JWT token. Some also require specific user roles.

// POST /api/nfts/mint
// Handles the minting of a new NFT. Requires an image file upload and specific roles.
// Expects 'nftFile' as the field name for the file in multipart/form-data.
router.post(
    '/mint',
    authenticateToken,                             // 1. Authenticate the requesting user.
    authorizeRole([ROLES.ADMIN, ROLES.DEVELOPER]), // 2. Authorize based on roles.
    upload.single('nftFile'),                      // 3. Process file upload. File details are in req.file.
    validate(schemas.nfts.create),                 // 4. Validate request body (e.g., title, description, creatorWallet).
                                                   //    req.body is available here even with multer.
                                                   //    req.validatedBody will contain the validated non-file fields.
    mintNft                                        // 5. Controller handles the minting logic, accessing req.file and req.validatedBody.
);

// POST /api/nfts/list
// Endpoint to list an NFT for sale. Requires authentication.
router.post(
    '/list',
    authenticateToken,                      // 1. Authenticate the requesting user.
    validate(schemas.nfts.list),            // 2. Validate request body (e.g., nftId, price, sellerWallet, and CRITICALLY, a signature).
    listNftForSale                          // 3. Controller handles listing logic, including on-chain signature verification if required.
);

// POST /api/nfts/buy
// Processes the purchase of an NFT. Requires authentication.
router.post(
    '/buy',
    authenticateToken,                      // 1. Authenticate the requesting user.
    validate(schemas.nfts.buy),             // 2. Validate request body (e.g., nftId, newOwnerWallet, CRITICALLY, transactionSignature).
    buyNft                                  // 3. Controller handles purchase logic, including on-chain transaction verification.
);

// POST /api/nfts/transfer
// Updates NFT ownership after an on-chain transfer. Requires authentication.
router.post(
    '/transfer',
    authenticateToken,                      // 1. Authenticate the requesting user.
    validate(schemas.nfts.transfer),        // 2. Validate request body (e.g., nftId, fromWallet, toWallet, CRITICALLY, transactionSignature).
    transferNft                             // 3. Controller handles transfer logic, including on-chain transaction verification.
);

// --- Optional Admin/Developer NFT Management Endpoints ---
// These routes provide full CRUD operations, typically for administrative purposes.
// Uncomment and implement in `nftController.js` and extend your Joi schemas if you need these functionalities.

/*
// GET /api/nfts/ - Retrieves all NFTs (potentially including unlisted ones for admin view)
router.get(
    '/',
    authenticateToken, // Or authorizeRole([ROLES.ADMIN]) for stricter control
    getNfts
);

// PUT /api/nfts/:id - Updates NFT metadata (e.g., description, image, attributes)
// :id would need to be validated, potentially via a Joi params schema or directly in the controller.
router.put(
    '/:id',
    authenticateToken,
    authorizeRole([ROLES.ADMIN, ROLES.DEVELOPER]),
    upload.single('image'), // If allowing image updates
    validate(schemas.nfts.update), // Schema should validate fields like title, description, new image URL, etc.
    updateNft
);

// DELETE /api/nfts/:id - Deletes an NFT record from the database. Use with extreme caution.
// :id would need to be validated.
router.delete(
    '/:id',
    authenticateToken,
    authorizeRole([ROLES.ADMIN]),
    deleteNft
);
*/

module.exports = router;
