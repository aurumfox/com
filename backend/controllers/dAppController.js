// /controllers/dAppController.js

// ВНИМАНИЕ: В этом файле нет зависимостей, так как он использует моки.
// В рабочем проекте вам нужно будет получить службы (services) через req.container.resolve()

// --- МОКИРОВАННЫЕ ДАННЫЕ ---
const mockNftHistory = [
    { type: 'Minted (Выпуск)', price: 'N/A', date: '2024-08-01', wallet: 'AFOX_MINT_AUTHORITY' },
    { type: 'Listed (Выставлен)', price: '5 SOL', date: '2024-08-05', wallet: '4Kk...Kj8' },
    { type: 'Sold (Продан)', price: '4.8 SOL', date: '2024-08-07', wallet: 'AFOX_COLLECTOR_01' },
    { type: 'Transfer (Передан)', price: 'N/A', date: '2024-09-10', wallet: 'AFOX_COLLECTOR_02' },
];

const mockLeaderboard = [
    { wallet: 'AFOX_COLLECTOR_01', stakedAmount: 50000, nftCount: 3, rank: 1 },
    { wallet: '8s7...Qp9', stakedAmount: 45200, nftCount: 1, rank: 2 },
    { wallet: 'D4e...Tz5', stakedAmount: 39800, nftCount: 5, rank: 3 },
    { wallet: 'P2o...Lg6', stakedAmount: 31000, nftCount: 2, rank: 4 },
];

/**
 * 🚀 1. NFT History Controller
 * В реальном проекте: Запрос к индексатору (Helius/QuickNode) или агрегированной БД.
 */
exports.getNftHistory = (req, res) => {
    const mintId = req.params.mintId;
    // logger можно получить из req.container.resolve('logger')
    // console.log(`[NFT HISTORY] Запрос истории для: ${mintId}`); 
    
    if (mintId === 'AFOX-NFT-007') {
        return res.json({ mintId, history: mockNftHistory });
    }
    res.json({ mintId, history: [], message: 'История для этого NFT пока недоступна.' });
};

/**
 * 🌉 2. Cross-chain Swaps Controller
 * В реальном проекте: Реальный вызов Jupiter API.
 */
exports.getSwapQuote = async (req, res) => {
    const { fromMint, toMint, amount } = req.body;
    
    // Имитация ответа Jupiter
    const mockQuote = {
        inputMint: fromMint,
        outputMint: toMint,
        inAmount: amount,
        outAmount: (parseFloat(amount) * 0.998).toFixed(4),
        priceImpact: '0.05%',
        route: 'Simulated_Best_Route_Through_Jupiter'
    };
    
    await new Promise(resolve => setTimeout(resolve, 800)); 
    res.json(mockQuote);
};

/**
 * 📊 3. Advanced Analytics Controller
 * В реальном проекте: Запрос к агрегированной БД.
 */
exports.getLeaderboard = (req, res) => {
    res.json({ title: 'Топ-4 Стейкеров AFOX', data: mockLeaderboard });
};
