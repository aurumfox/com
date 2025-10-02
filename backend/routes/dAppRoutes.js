// /routes/dAppRoutes.js

const express = require('express');
const router = express.Router();
const dAppController = require('../controllers/dAppController'); 

// NFT History: GET /api/v1/dapp/nft/history/:mintId
router.get('/nft/history/:mintId', dAppController.getNftHistory);

// Swap Quote: POST /api/v1/dapp/bridge/quote
router.post('/bridge/quote', dAppController.getSwapQuote);

// Leaderboard: GET /api/v1/dapp/analytics/leaderboard
router.get('/analytics/leaderboard', dAppController.getLeaderboard);

module.exports = router;
