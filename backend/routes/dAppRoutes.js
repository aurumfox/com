// routes/dAppRoutes.js

const express = require('express');
const router = express.Router();
const dAppController = require('../controllers/dAppController');

// История NFT: GET /api/v1/nft/history/:mintId
router.get('/nft/history/:mintId', dAppController.getNftHistory);

// Котировка Свопа: POST /api/v1/bridge/quote
router.post('/bridge/quote', dAppController.getSwapQuote);

// Таблица Лидеров: GET /api/v1/analytics/leaderboard
router.get('/analytics/leaderboard', dAppController.getLeaderboard);

module.exports = router;
