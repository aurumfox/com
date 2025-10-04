// --- Global Constants and Configuration ---

// AFOX Contract Address (Mint)
const AFOX_MINT = 'GLkewtq8s2Yr24o5LT5mzzEeccKuSsy8H5RCHaE9uRAd';
// SOL Mint Address (Native Token)
const SOL_MINT = 'So11111111111111111111111111111111111111112';

// --- AI FORECAST CONFIGURATION (MOCK) ---
// Эти URL теперь используются только для консольного вывода (MOCK).
const AI_FORECAST_API_URL = 'MOCK_URL';
const DIAGNOSTICS_API_URL = 'MOCK_URL';

// ------------------------------------------------------------------
// **RPC Fix Configuration** (Оставлено, так как это запросы к Solana, а не к вашему бэкенду)
// ------------------------------------------------------------------
const JUPITER_RPC_ENDPOINT = 'https://rpc.jup.ag'; // Jupiter's recommended RPC (often Helius)
const BACKUP_RPC_ENDPOINT = 'https://api.mainnet-beta.solana.com';

// State variables for chart overlay fix
let birdeyeContainer = null;
let birdeyeContainerOriginalDisplay = 'block'; // To store the original display style

// --- CONSTANTS AND SETTINGS ---
const AFOX_TOKEN_MINT_ADDRESS = new SolanaWeb3.PublicKey('GLkewtq8s2Yr24o5LT5mzzEeccKuSsy8H5RCHaE9uRAd');
const STAKING_PROGRAM_ID = new SolanaWeb3.PublicKey('3GcDUxoH4yhFeM3aBkaUfjNu7xGTat8ojXLPHttz2o9f');
const JUPITER_API_URL = 'https://quote-api.jup.ag/v6'; // Оставлено, так как это внешний API
const API_BASE_URL = 'MOCK_BASE_URL'; // Заглушка
const AFOX_MINT_ADDRESS_STRING = 'GLkewtq8s2Yr24o5LT5mzzEeccKuSsy8H5RCHaE9uRAd';

// Mint addresses for tokens supported in the swap functionality
const TOKEN_MINT_ADDRESSES = {
    'SOL': new SolanaWeb3.PublicKey('So11111111111111111111111111111111111111112'),
    'AFOX': AFOX_TOKEN_MINT_ADDRESS,
};

const AFOX_DECIMALS = 6;
const SOL_DECIMALS = 9;

const NETWORK = SolanaWeb3.WalletAdapterNetwork.Mainnet;

// --- GLOBAL WALLET & CONNECTION STATE ---
let walletPublicKey = null;
let provider = null;
let connection = null;
const WALLETS = [
    new SolanaWalletAdapterPhantom.PhantomWalletAdapter(),
];
let areProviderListenersAttached = false;
let currentJupiterQuote = null;
let currentOpenNft = null;

// --- UI ELEMENT CACHING (Не изменено) ---
const uiElements = {
    // General Wallet & Display
    connectWalletButtons: [],
    walletAddressDisplays: [],
    // Modals
    nftDetailsModal: null, nftModal: null, mintNftModal: null, createProposalModal: null,
    closeModalButtons: {},
    closeMainMenuCross: null,
    // Menu Elements
    mainNav: null, menuToggle: null, navLinks: [],
    // NFT Section
    userNftList: null, nftToSellSelect: null, listNftForm: null, mintNftForm: null, marketplaceNftList: null,
    // NFT Details Modal elements
    nftDetailImage: null, nftDetailName: null, nftDetailDescription: null, nftDetailOwner: null,
    nftDetailMint: null, attributesList: null, nftDetailSolscanLink: null, nftDetailBuyBtn: null,
    nftDetailSellBtn: null, nftDetailTransferBtn: null, nftDetailHistory: null,
    // Announcements Section
    announcementsList: null, announcementInput: null, publishButton: null,
    // Games & Ads Section
    gameList: null, uploadGameBtnWeb3: null, adList: null, postAdBtnWeb3: null,
    // Staking Section Elements
    userAfoxBalance: null, userStakedAmount: null, userRewardsAmount: null, stakingApr: null,
    stakeAmountInput: null, stakeAfoxBtn: null, claimRewardsBtn: null, unstakeAfoxBtn: null,
    minStakeAmountDisplay: null, lockupPeriodDisplay: null, unstakeFeeDisplay: null, rewardCalculationDisplay: null,
    // SWAP SECTION UI ELEMENTS
    swapFromAmountInput: null, swapFromTokenSelect: null, swapFromBalanceSpan: null,
    swapDirectionBtn: null, swapToAmountInput: null, swapToTokenSelect: null, priceImpactSpan: null,
    lpFeeSpan: null, minReceivedSpan: null, getQuoteBtn: null, executeSwapBtn: null, maxAmountBtns: [],
    // Copy Button (generic)
    copyButtons: [],
    // Contact Form
    contactForm: null, contactNameInput: null, contactEmailInput: null, contactSubjectInput: null, contactMessageInput: null,
    notificationContainer: null,
    // AI Forecast Section
    aiPriceForecast: null,
};


// --- ЛОКАЛЬНАЯ СИМУЛЯЦИЯ БЭКЕНДА (MOCK DB) ---

const MOCK_DB = {
    // Начальные NFT. 'NO_WALLET_CONNECTED' - заглушка, которая будет заменена на адрес пользователя при подключении.
    nfts: JSON.parse(localStorage.getItem('mockNfts')) || [
        { mint: 'NFT1_MOCK_MINT', name: 'Alpha Fox #001 (Listed)', description: 'Rare Alpha Fox NFT. Buy me!', owner: 'NO_WALLET_CONNECTED', price: 5.5, isListed: true, image: 'https://via.placeholder.com/180x180/007bff/ffffff?text=Fox+001', attributes: [{ trait_type: 'Rarity', value: 'Epic' }, { trait_type: 'Edition', value: 'First' }] },
        { mint: 'NFT2_MOCK_MINT', name: 'Alpha Fox #002 (Owned)', description: 'Common Alpha Fox NFT. My personal collection.', owner: 'NO_WALLET_CONNECTED', price: 0, isListed: false, image: 'https://via.placeholder.com/180x180/17a2b8/ffffff?text=Fox+002', attributes: [{ trait_type: 'Rarity', value: 'Common' }] }
    ],
    announcements: JSON.parse(localStorage.getItem('mockAnnouncements')) || [
        { text: 'Добро пожаловать в автономную симуляцию! Данные сохраняются в localStorage.', date: new Date(Date.now() - 3600000).toISOString() },
        { text: 'Этот код работает без бэкенда. Все API вызовы заменены заглушками.', date: new Date().toISOString() }
    ],
    games: [
        { title: 'Solana Runner (MOCK)', description: 'Бесконечный раннер, симуляция игры.', url: '#' }
    ],
    ads: [
        { title: 'Купи AFOX (MOCK Ad)', content: 'Лучший токен на Solana!', imageUrl: 'https://via.placeholder.com/300x100/dc3545/ffffff?text=MOCK+AD', link: '#' }
    ],
    // Симуляция истории транзакций
    nftHistory: JSON.parse(localStorage.getItem('mockNftHistory')) || {
        'NFT1_MOCK_MINT': [{ type: 'Mint', timestamp: new Date(Date.now() - 86400000).toISOString(), to: 'INITIAL_OWNER' }],
        'NFT2_MOCK_MINT': [{ type: 'Mint', timestamp: new Date(Date.now() - 7200000).toISOString(), to: 'INITIAL_OWNER' }],
    },
    // Симуляция данных стейкинга
    staking: JSON.parse(localStorage.getItem('mockStaking')) || {
        // Ключом будет адрес кошелька
    }
};

/**
 * Сохраняет текущее состояние MOCK_DB (NFT, объявления, история) в localStorage.
 */
function persistMockData() {
    localStorage.setItem('mockNfts', JSON.stringify(MOCK_DB.nfts));
    localStorage.setItem('mockAnnouncements', JSON.stringify(MOCK_DB.announcements));
    localStorage.setItem('mockNftHistory', JSON.stringify(MOCK_DB.nftHistory));
    localStorage.setItem('mockStaking', JSON.stringify(MOCK_DB.staking));
}


/**
 * Aggressively hides the trading chart iFrame to prevent it from blocking the
 * wallet connection modal (which often has a lower z-index than iFrames).
 */
function hideBirdeyeChart() {
    if (!birdeyeContainer) {
        birdeyeContainer = document.getElementById('afoxChartContainer');
    }
    if (birdeyeContainer && birdeyeContainer.style.display !== 'none') {
        birdeyeContainerOriginalDisplay = birdeyeContainer.style.display || 'block';
        birdeyeContainer.style.display = 'none';
        console.log("Trading chart **HIDDEN** to allow wallet modal interaction.");
    }
}

/**
 * Restores the trading chart iFrame's visibility.
 */
function restoreBirdeyeChart() {
    if (birdeyeContainer && birdeyeContainer.style.display === 'none') {
        birdeyeContainer.style.display = birdeyeContainerOriginalDisplay;
        console.log("Trading chart **RESTORED**.");
    }
}


function initializeJupiterTerminal(useBackupRpc = false) {
    // ------------------------------------------------------------------
    // **RPC Fix Implementation** (Не изменено)
    // ------------------------------------------------------------------
    const rpcToUse = useBackupRpc ? BACKUP_RPC_ENDPOINT : JUPITER_RPC_ENDPOINT;
    console.log(`Initializing Jupiter Terminal with RPC: ${rpcToUse}`);

    // Check if Jupiter Terminal is already loaded
    if (window.Jupiter && document.getElementById('jupiter-swap-widget')) {

        window.Jupiter.init({
            displayMode: 'widget',
            widgetStyle: {
                'container.id': 'jupiter-swap-widget',
                // Set a high zIndex for the *widget itself* (not the wallet modal)
                'container.zIndex': 9999,
            },
            theme: 'dark',
            formProps: {
                fixedOutputMint: true,
                initialOutputMint: AFOX_MINT,
                initialInputMint: SOL_MINT,
            },
            strictTokenList: false,

            // ✅ RPC FIX: Use the selected stable RPC endpoint
            endpoint: rpcToUse,

            // --------------------------------------------------------------
            // ✅ iFrame OVERLAY FIX: Hide chart before connecting wallet
            // --------------------------------------------------------------
            onConnectWallet: (callback) => {
                hideBirdeyeChart(); // Hide iFrame before the modal opens
                // Small delay to ensure the hide operation completes before modal starts opening
                setTimeout(callback, 50);
            },

            // ✅ iFrame OVERLAY FIX: Restore chart after closing wallet modal
            onSuccess: () => {
                 restoreBirdeyeChart();
            },
            onError: (error) => {
                 console.error("Jupiter Terminal error:", error);
                 restoreBirdeyeChart();
            },
            onSwapError: () => {
                 restoreBirdeyeChart();
            },
            onDisconnected: () => {
                 restoreBirdeyeChart();
            }
        });
        console.log(`Jupiter Terminal successfully initialized with RPC: ${rpcToUse}`);
    } else {
        // If Jupiter is not loaded yet, try again after a delay
        setTimeout(() => initializeJupiterTerminal(useBackupRpc), 500);
    }
}


/**
 * Initializes UI element references. Called once on DOMContentLoaded. (Не изменено)
 */
function cacheUIElements() {
    // Filter out nulls to ensure no errors if an element is missing
    uiElements.connectWalletButtons = [
        document.getElementById('connectWalletBtnWeb3'),
        document.getElementById('connectWalletNftBtn'),
        document.getElementById('connectWalletSwapBtn'),
    ].filter(Boolean);

    uiElements.walletAddressDisplays = [
        document.getElementById('walletAddressDisplayWeb3'),
        document.getElementById('walletAddressDisplayNft'),
        document.getElementById('walletAddressDisplayDao'),
        document.getElementById('walletAddressDisplaySwap'),
    ].filter(Boolean);

    uiElements.nftDetailsModal = document.getElementById('nftDetailsModal');
    uiElements.nftModal = document.getElementById('nftModal');
    uiElements.mintNftModal = document.getElementById('mintNftModal');
    uiElements.createProposalModal = document.getElementById('createProposalModal');

    uiElements.closeModalButtons = {
        nftDetails: document.getElementById('closeNftDetailsModalCross'),
        nft: document.getElementById('closeNftModalCross'),
        mintNft: document.getElementById('closeMintNftModalCross'),
        createProposal: document.getElementById('closeProposalModalCross'),
    };
    uiElements.closeMainMenuCross = document.getElementById('closeMainMenuCross');

    // Use querySelector for more flexible selection if IDs are not consistently applied
    uiElements.mainNav = document.querySelector('.nav ul') || document.getElementById('mainNav');
    uiElements.menuToggle = document.getElementById('menuToggle');
    if (uiElements.mainNav) {
        uiElements.navLinks = Array.from(uiElements.mainNav.querySelectorAll('a'));
    }

    uiElements.userNftList = document.getElementById('user-nft-list');
    uiElements.nftToSellSelect = document.getElementById('nftToSell');
    uiElements.listNftForm = document.getElementById('listNftForm');
    uiElements.mintNftForm = document.getElementById('mintNftForm');
    uiElements.marketplaceNftList = document.getElementById('marketplace-nft-list');

    uiElements.nftDetailImage = document.getElementById('nftDetailImage');
    uiElements.nftDetailName = document.getElementById('nftDetailName');
    uiElements.nftDetailDescription = document.getElementById('nftDetailDescription');
    uiElements.nftDetailOwner = document.getElementById('nftDetailOwner');
    uiElements.nftDetailMint = document.getElementById('nftDetailMint');
    uiElements.attributesList = document.getElementById('attributesList');
    uiElements.nftDetailSolscanLink = document.getElementById('nftDetailSolscanLink');
    uiElements.nftDetailBuyBtn = document.getElementById('nftDetailBuyBtn');
    uiElements.nftDetailSellBtn = document.getElementById('nftDetailSellBtn');
    uiElements.nftDetailTransferBtn = document.getElementById('nftDetailTransferBtn');
    uiElements.nftDetailHistory = document.getElementById('nftDetailHistory');

    uiElements.announcementsList = document.getElementById('announcementsList');
    uiElements.announcementInput = document.getElementById('announcementInput');
    uiElements.publishButton = document.getElementById('publishButton');

    uiElements.gameList = document.getElementById('game-list');
    uiElements.uploadGameBtnWeb3 = document.getElementById('uploadGameBtnWeb3');
    uiElements.adList = document.getElementById('ad-list');
    uiElements.postAdBtnWeb3 = document.getElementById('postAdBtnWeb3');

    uiElements.userAfoxBalance = document.getElementById('userAfoxBalance');
    uiElements.userStakedAmount = document.getElementById('userStakedAmount');
    uiElements.userRewardsAmount = document.getElementById('userRewardsAmount');
    uiElements.stakingApr = document.getElementById('stakingApr');
    uiElements.stakeAmountInput = document.getElementById('stakeAmountInput');
    uiElements.stakeAfoxBtn = document.getElementById('stakeAfoxBtn');
    uiElements.claimRewardsBtn = document.getElementById('claimRewardsBtn');
    uiElements.unstakeAfoxBtn = document.getElementById('unstakeAfoxBtn');
    uiElements.minStakeAmountDisplay = document.getElementById('minStakeAmount');
    uiElements.lockupPeriodDisplay = document.getElementById('lockupPeriod');
    uiElements.unstakeFeeDisplay = document.getElementById('unstakeFee');
    uiElements.rewardCalculationDisplay = document.getElementById('rewardCalculation');

    uiElements.swapFromAmountInput = document.getElementById('swapFromAmount');
    uiElements.swapFromTokenSelect = document.getElementById('swapFromToken');
    uiElements.swapFromBalanceSpan = document.getElementById('swapFromBalance');
    uiElements.swapDirectionBtn = document.getElementById('swapDirectionBtn');
    uiElements.swapToAmountInput = document.getElementById('swapToAmount');
    uiElements.swapToTokenSelect = document.getElementById('swapToToken');
    uiElements.priceImpactSpan = document.getElementById('priceImpact');
    uiElements.lpFeeSpan = document.getElementById('lpFee');
    uiElements.minReceivedSpan = document.getElementById('minReceived');
    uiElements.getQuoteBtn = document.getElementById('getQuoteBtn');
    uiElements.executeSwapBtn = document.getElementById('executeSwapBtn');
    uiElements.maxAmountBtns = Array.from(document.querySelectorAll('.max-amount-btn'));

    uiElements.copyButtons = Array.from(document.querySelectorAll('.copy-btn'));

    uiElements.contactForm = document.getElementById('contactForm');
    uiElements.contactNameInput = document.getElementById('contact-name');
    uiElements.contactEmailInput = document.getElementById('contact-email');
    uiElements.contactSubjectInput = document.getElementById('contact-subject');
    uiElements.contactMessageInput = document.getElementById('contact-message');

    uiElements.notificationContainer = document.getElementById('notificationContainer');

    // ✅ NEW: AI Price Forecast Element
    uiElements.aiPriceForecast = document.getElementById('aiPriceForecast');
}

// --- HELPER UTILITIES (Не изменено) ---

/**
 * Universal function to display notifications.
 * @param {string} message The message to display.
 * @param {'info' | 'success' | 'warning' | 'error'} type The type of notification.
 * @param {number} duration The display duration in ms (default 3000).
 */
function showNotification(message, type = 'info', duration = 3000) {
    if (!uiElements.notificationContainer) {
        console.warn('Notification container not found. Cannot display notification.');
        alert(message); // Fallback
        return;
    }

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;

    uiElements.notificationContainer.prepend(notification); // Add to top

    setTimeout(() => {
        notification.remove();
    }, duration);
}

/**
 * Formats a BigNumber amount given its decimals.
 * @param {BN | string | number} amount - The amount as BN, string, or number.
 * @param {number} decimals - The number of decimal places for the token.
 * @returns {string} The formatted number as a string.
 */
function formatBigInt(amount, decimals) {
    if (amount === undefined || amount === null || decimals === undefined || decimals === null || isNaN(decimals)) return '0';
    let bnAmount;
    try {
        // Ensure conversion to string for BN if it's a number
        bnAmount = new BN(String(amount));
    } catch (e) {
        console.error("Invalid amount for BN conversion:", amount, e);
        return '0';
    }

    let str = bnAmount.toString();
    // Pad with leading zeros if amount is smaller than 1.0
    if (str.length <= decimals) {
        str = '0.' + '0'.repeat(decimals - str.length) + str;
    } else {
        str = str.slice(0, str.length - decimals) + '.' + str.slice(str.length - decimals);
    }
    // Remove trailing zeros and decimal point if it's an integer
    return str.replace(/\.?0+$/, '');
}

/**
 * Closes all open modals and the main navigation menu.
 */
function closeAllPopups() {
    // Array of modals to close
    const modals = [
        uiElements.nftDetailsModal,
        uiElements.nftModal,
        uiElements.mintNftModal,
        uiElements.createProposalModal
    ].filter(Boolean); // Filter out any null elements if they don't exist in the DOM

    modals.forEach(modal => {
        if (modal.style.display === 'flex') {
            modal.style.display = 'none';
        }
    });

    if (uiElements.mainNav && uiElements.mainNav.classList.contains('active')) {
        uiElements.mainNav.classList.remove('active');
        if (uiElements.menuToggle) uiElements.menuToggle.classList.remove('active');
    }
}

/**
 * Helper function to run both staking UI update and balance update in parallel
 * to ensure all UI elements related to AFOX and staking are refreshed after a transaction.
 * @async
 */
async function updateStakingAndBalanceUI() {
    try {
        await Promise.all([
            updateStakingUI(),
            updateSwapBalances()
        ]);
    } catch (error) {
        console.error("Error refreshing staking/balance UI after transaction:", error);
        showNotification("Error updating staking and balance displays.", 'error');
    }
}

/**
 * ✅ ИЗМЕНЕНИЕ: PSEUDO-FUNCTION: Заглушка для диагностики AI.
 * @async
 */
async function diagnoseCodeIssue(functionName, errorDetails) {
    // В автономном режиме просто логируем ошибку в консоль
    console.error(`[AI Diagnostic MOCK Triggered] Function: ${functionName}, Details: ${errorDetails}`);
    console.log(`[AI Diagnostic MOCK Result]: Error analysis logged to console.`);
}


// --- WALLET CONNECTION & STATE MANAGEMENT (Не изменено) ---

/**
 * Updates all wallet address display elements across the UI.
 * @param {string | null} address - The wallet public key as a string, or null if disconnected.
 */
function updateWalletUI(address) {
    const displayAddress = address ? `${address.substring(0, 4)}...${address.substring(address.length - 4)}` : 'Not Connected';
    const connectedState = address !== null;

    uiElements.walletAddressDisplays.forEach(display => {
        if (display) { // Check if element exists before manipulating
            display.textContent = displayAddress;
            display.style.display = connectedState ? 'block' : 'none';
            display.style.color = connectedState ? '#ffd700' : 'inherit';
        }
    });

    uiElements.connectWalletButtons.forEach(btn => {
        if (btn) btn.style.display = connectedState ? 'none' : 'block';
    });
}

/**
 * Handles changes in the wallet's public key (e.g., user switches accounts).
 * @param {SolanaWeb3.PublicKey | null} publicKey
 */
async function handlePublicKeyChange(publicKey) {
    if (publicKey) {
        walletPublicKey = publicKey;
        updateWalletUI(publicKey.toBase58());

        // ✅ ДОБАВЛЕНИЕ: Обновление владельцев моковых NFT и стейкинга
        MOCK_DB.nfts.forEach(nft => {
             // Если NFT был назначен заглушке, переназначаем его новому владельцу
            if (nft.owner === 'NO_WALLET_CONNECTED' || nft.owner.startsWith('MOCK_MINT')) {
                 nft.owner = walletPublicKey.toBase58();
            }
        });
        persistMockData();
        // ---------------------------------------------------------------------

        // Trigger reloads for all sections with a slight delay to avoid UI flicker
        await Promise.all([
            loadUserNFTs(walletPublicKey.toBase58()),
            loadMarketplaceNFTs(), // Также обновить маркетплейс, чтобы показать, что NFT теперь принадлежат пользователю
            updateStakingUI(),
            updateSwapBalances()
        ]);
        showNotification('Wallet account changed!', 'info');
    } else {
        // If publicKey is null, it means the wallet disconnected or switched to no account
        handleWalletDisconnect();
    }
}

/**
 * Handles explicit wallet disconnection.
 */
function handleDisconnect() {
    console.log('Wallet explicitly disconnected by user.');
    handleWalletDisconnect();
    showNotification('Wallet disconnected.', 'info');
}

/**
 * Registers event listeners for the wallet provider.
 */
function registerProviderListeners() {
    if (provider) {
        // Detach existing listeners to prevent duplicates
        if (areProviderListenersAttached) {
            provider.off('publicKey', handlePublicKeyChange);
            provider.off('disconnect', handleDisconnect);
        }
        provider.on('publicKey', handlePublicKeyChange);
        provider.on('disconnect', handleDisconnect);
        areProviderListenersAttached = true;
        console.log('Provider listeners attached.');
    } else {
        areProviderListenersAttached = false;
        console.log('No provider to attach listeners to.');
    }
}

/**
 * Central function to connect a Solana wallet.
 */
async function connectWallet() {
    try {
        if (!SolanaWeb3 || !SolanaWalletAdapterPhantom) {
            showNotification('Solana Web3 or Wallet Adapter libraries not loaded. Check script imports.', 'error');
            return;
        }

        const selectedWallet = WALLETS[0]; // Currently always picking Phantom
        if (!selectedWallet) {
            showNotification('Wallet adapter not found. Make sure Phantom is installed and enabled.', 'error');
            return;
        }

        // Initialize connection here if not already done.
        // It's good to have a single connection instance that persists.
        if (!connection) {
            // Use the backup RPC for general connection tasks (more stable for general use)
            connection = new SolanaWeb3.Connection(BACKUP_RPC_ENDPOINT, 'confirmed');
        }

        if (selectedWallet.connected && selectedWallet.publicKey) {
            walletPublicKey = selectedWallet.publicKey;
            provider = selectedWallet;
            console.log('Wallet already connected:', walletPublicKey.toBase58());
        } else {
            await selectedWallet.connect();
            walletPublicKey = selectedWallet.publicKey;
            provider = selectedWallet;
            console.log('Wallet connected:', walletPublicKey.toBase58());
        }

        updateWalletUI(walletPublicKey.toBase58());
        registerProviderListeners();

        // ✅ ДОБАВЛЕНИЕ: Обновление владельцев моковых NFT и стейкинга
        MOCK_DB.nfts.forEach(nft => {
            if (nft.owner === 'NO_WALLET_CONNECTED') {
                nft.owner = walletPublicKey.toBase58();
            }
        });
        persistMockData();
        // ---------------------------------------------------------------------

        // Load data for all sections
        await Promise.all([
            loadUserNFTs(walletPublicKey.toBase58()),
            loadMarketplaceNFTs(),
            updateStakingUI(),
            updateSwapBalances()
        ]);

        showNotification('Wallet successfully connected!', 'success');

    } catch (error) {
        console.error('Failed to connect wallet:', error);
        showNotification(`Failed to connect wallet: ${error.message || error}`, 'error');
        handleWalletDisconnect(); // Ensure UI reflects disconnected state on error
    }
}

/**
 * Handles the logic for wallet disconnection, resetting UI and data. (Не изменено)
 */
function handleWalletDisconnect() {
    walletPublicKey = null;
    provider = null;
    connection = null; // Reset connection to force re-initialization on next connect
    updateWalletUI(null);

    // Reset NFT section
    if (uiElements.userNftList) uiElements.userNftList.innerHTML = '<p class="placeholder-item web3-placeholder">Connect your wallet to see your NFTs.</p>';
    if (uiElements.nftToSellSelect) uiElements.nftToSellSelect.innerHTML = '<option value="">-- Select NFT --</option>';
    if (uiElements.marketplaceNftList) uiElements.marketplaceNftList.innerHTML = '<p class="placeholder-item web3-placeholder">Connect wallet to see listed NFTs.</p>'; // Reset MP

    // Reset Staking section
    updateStakingUI(); // This function handles resetting itself if walletPublicKey is null

    // Reset Swap section
    if (uiElements.swapFromBalanceSpan) uiElements.swapFromBalanceSpan.textContent = '0';
    if (uiElements.swapFromAmountInput) uiElements.swapFromAmountInput.value = '';
    if (uiElements.swapToAmountInput) uiElements.swapToAmountInput.value = '';
    if (uiElements.priceImpactSpan) uiElements.priceImpactSpan.textContent = '0%';
    if (uiElements.lpFeeSpan) uiElements.lpFeeSpan.textContent = '0';
    if (uiElements.minReceivedSpan) uiElements.minReceivedSpan.textContent = '0';
    if (uiElements.executeSwapBtn) uiElements.executeSwapBtn.style.display = 'none';
    currentJupiterQuote = null;

    // Detach listeners on disconnect
    if (areProviderListenersAttached && provider) {
        try {
            provider.off('publicKey', handlePublicKeyChange);
            provider.off('disconnect', handleDisconnect);
        } catch (e) {
            console.warn("Error detaching provider listeners on disconnect:", e);
        }
        areProviderListenersAttached = false;
    }
}


// --- SWAP FUNCTIONS (Оставлены, так как они взаимодействуют с Solana/Jupiter) ---

/**
 * Fetches the token decimals for a given mint address.
 * @param {SolanaWeb3.PublicKey} mintAddress
 * @returns {number}
 */
function getTokenDecimals(mintAddress) {
    if (mintAddress.equals(TOKEN_MINT_ADDRESSES['SOL'])) {
        return SOL_DECIMALS;
    }
    if (mintAddress.equals(AFOX_TOKEN_MINT_ADDRESS)) {
        return AFOX_DECIMALS;
    }
    // Fallback for other SPL tokens not explicitly defined
    console.warn(`Decimals for mint ${mintAddress.toBase58()} not explicitly defined. Using default ${AFOX_DECIMALS}.`);
    return AFOX_DECIMALS;
}

/**
 * Updates balances for the "From" token in the swap section.
 */
async function updateSwapBalances() {
    // Не изменено, так как это запрос к RPC Solana
    if (!walletPublicKey || !connection) {
        if (uiElements.swapFromBalanceSpan) uiElements.swapFromBalanceSpan.textContent = '0';
        return;
    }

    const fromTokenMint = TOKEN_MINT_ADDRESSES[uiElements.swapFromTokenSelect.value];
    if (!fromTokenMint) {
        console.error('Selected "From" token mint address not found.');
        if (uiElements.swapFromBalanceSpan) uiElements.swapFromBalanceSpan.textContent = '0';
        return;
    }

    try {
        if (fromTokenMint.equals(TOKEN_MINT_ADDRESSES['SOL'])) {
            const solBalance = await connection.getBalance(walletPublicKey);
            if (uiElements.swapFromBalanceSpan) {
                uiElements.swapFromBalanceSpan.textContent = `${(solBalance / SolanaWeb3.LAMPORTS_PER_SOL).toFixed(4)} SOL`;
            }
        } else {
            const tokenAccount = await connection.getParsedTokenAccountsByOwner(
                walletPublicKey,
                { mint: fromTokenMint }
            );
            if (tokenAccount.value.length > 0) {
                const amount = tokenAccount.value[0].account.data.parsed.info.tokenAmount.amount;
                const decimals = tokenAccount.value[0].account.data.parsed.info.tokenAmount.decimals;
                if (uiElements.swapFromBalanceSpan) {
                    // Use a common formatting style that is human-readable
                    const formattedAmount = (Number(amount) / (10 ** decimals)).toFixed(4).replace(/\.?0+$/, '');
                    uiElements.swapFromBalanceSpan.textContent = `${formattedAmount} ${uiElements.swapFromTokenSelect.value}`;
                }
            } else {
                if (uiElements.swapFromBalanceSpan) {
                    uiElements.swapFromBalanceSpan.textContent = `0 ${uiElements.swapFromTokenSelect.value}`;
                }
            }
        }
    } catch (error) {
        console.error('Error fetching token balance:', error);
        showNotification(`Error fetching ${uiElements.swapFromTokenSelect.value} balance.`, 'error');
        if (uiElements.swapFromBalanceSpan) uiElements.swapFromBalanceSpan.textContent = `Error`;
    }
}

/**
 * Fetches a swap quote from Jupiter Aggregator. (Не изменено)
 */
async function getQuote() {
    // ... (Оставлено как есть - взаимодействует с Jupiter API, не с вашим бэкендом)
    if (!walletPublicKey) {
        showNotification('Please connect your wallet first.', 'warning');
        return;
    }
    if (!uiElements.swapFromTokenSelect || !uiElements.swapToTokenSelect || !uiElements.swapFromAmountInput) {
        console.error("Swap UI elements not found.");
        showNotification("Swap functionality UI is not fully initialized.", "error");
        return;
    }

    const fromMint = TOKEN_MINT_ADDRESSES[uiElements.swapFromTokenSelect.value];
    const toMint = TOKEN_MINT_ADDRESSES[uiElements.swapToTokenSelect.value];
    const amount = parseFloat(uiElements.swapFromAmountInput.value);

    if (isNaN(amount) || amount <= 0) {
        showNotification('Please enter a valid amount for the swap.', 'warning');
        return;
    }

    if (!fromMint || !toMint) {
        showNotification('Please select valid tokens for the swap.', 'warning');
        return;
    }

    if (fromMint.equals(toMint)) {
        showNotification('Cannot swap between the same tokens.', 'warning');
        return;
    }

    const decimalsFrom = getTokenDecimals(fromMint);
    const inputAmountLamports = (amount * (10 ** decimalsFrom)).toFixed(0);

    showNotification('Getting the best swap quote...', 'info');
    if (uiElements.getQuoteBtn) uiElements.getQuoteBtn.disabled = true;
    if (uiElements.executeSwapBtn) uiElements.executeSwapBtn.style.display = 'none';

    try {
        const response = await fetch(`${JUPITER_API_URL}/quote?inputMint=${fromMint.toBase58()}&outputMint=${toMint.toBase58()}&amount=${inputAmountLamports}&slippageBps=50`);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Failed to get quote: ${errorData.error || response.statusText}`);
        }
        const data = await response.json();
        currentJupiterQuote = data;

        const outputDecimals = getTokenDecimals(toMint);

        // Update UI with quote details
        if (uiElements.swapToAmountInput) uiElements.swapToAmountInput.value = formatBigInt(currentJupiterQuote.outAmount, outputDecimals);
        if (uiElements.priceImpactSpan) uiElements.priceImpactSpan.textContent = `${(currentJupiterQuote.priceImpactPct * 100).toFixed(2)}%`;
        if (uiElements.lpFeeSpan) {
            const lpFeeAmount = currentJupiterQuote.lpFee && currentJupiterQuote.lpFee.amount ? currentJupiterQuote.lpFee.amount : '0';
            uiElements.lpFeeSpan.textContent = `${formatBigInt(lpFeeAmount, outputDecimals)} ${uiElements.swapToTokenSelect.value}`;
        }
        if (uiElements.minReceivedSpan) uiElements.minReceivedSpan.textContent = `${formatBigInt(currentJupiterQuote.otherAmountThreshold, outputDecimals)} ${uiElements.swapToTokenSelect.value}`;

        showNotification('Quote successfully received!', 'success');
        if (uiElements.executeSwapBtn) uiElements.executeSwapBtn.style.display = 'block';
    } catch (error) {
        console.error('Error fetching quote:', error);
        showNotification(`Error fetching quote: ${error.message}. Please try again.`, 'error');
        currentJupiterQuote = null;
        if (uiElements.swapToAmountInput) uiElements.swapToAmountInput.value = '';
        if (uiElements.priceImpactSpan) uiElements.priceImpactSpan.textContent = '0%';
        if (uiElements.lpFeeSpan) uiElements.lpFeeSpan.textContent = '0';
        if (uiElements.minReceivedSpan) uiElements.minReceivedSpan.textContent = '0';
        if (uiElements.executeSwapBtn) uiElements.executeSwapBtn.style.display = 'none';
    } finally {
        if (uiElements.getQuoteBtn) uiElements.getQuoteBtn.disabled = false;
    }
}

/**
 * Executes the swap transaction via Jupiter Aggregator. (Не изменено)
 */
async function executeSwap() {
    // ... (Оставлено как есть - взаимодействует с Jupiter API и Solana RPC)
    if (!currentJupiterQuote) {
        showNotification('Please get a quote first.', 'warning');
        return;
    }
    if (!walletPublicKey) {
        showNotification('Wallet not connected.', 'warning');
        return;
    }
    if (!provider) {
        showNotification('Wallet provider not found. Please reconnect your wallet.', 'error');
        return;
    }
    // Ensure connection is established, though it should be if wallet is connected
    if (!connection) {
        connection = new SolanaWeb3.Connection(BACKUP_RPC_ENDPOINT, 'confirmed');
    }

    showNotification('Preparing swap transaction...', 'info');
    if (uiElements.executeSwapBtn) uiElements.executeSwapBtn.disabled = true;

    try {
        const response = await fetch(`${JUPITER_API_URL}/swap`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                quoteResponse: currentJupiterQuote,
                userPublicKey: walletPublicKey.toBase58(),
                wrapUnwrapSOL: true, // Handle SOL wrapping/unwrapping automatically for convenience
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Failed to get swap transaction: ${errorData.error || response.statusText}`);
        }

        const { swapTransaction } = await response.json();
        const transactionBuf = Buffer.from(swapTransaction, 'base64');
        const transaction = SolanaWeb3.Transaction.from(transactionBuf);

        // Fetch recent blockhash dynamically for transaction
        transaction.recentBlockhash = (await connection.getLatestBlockhash('finalized')).blockhash;
        transaction.feePayer = walletPublicKey; // Set the fee payer to the user's wallet

        // Sign and send the transaction using the connected wallet
        const signature = await provider.sendAndConfirm(transaction);

        showNotification('Transaction sent! Waiting for confirmation...', 'info', 10000); // Longer duration for network confirmation
        console.log('Swap transaction sent:', signature);

        // Confirm the transaction
        const confirmation = await connection.confirmTransaction(signature, 'confirmed');

        if (confirmation.value.err) {
            throw new Error(`Transaction failed: ${confirmation.value.err.toString()}`);
        }

        showNotification('Swap successfully executed!', 'success');
        console.log('Swap confirmed:', signature);

        // Clear fields and update balances after successful swap
        if (uiElements.swapFromAmountInput) uiElements.swapFromAmountInput.value = '';
        if (uiElements.swapToAmountInput) uiElements.swapToAmountInput.value = '';
        if (uiElements.priceImpactSpan) uiElements.priceImpactSpan.textContent = '0%';
        if (uiElements.lpFeeSpan) uiElements.lpFeeSpan.textContent = '0';
        if (uiElements.minReceivedSpan) uiElements.minReceivedSpan.textContent = '0';
        if (uiElements.executeSwapBtn) uiElements.executeSwapBtn.style.display = 'none';
        currentJupiterQuote = null;
        await updateSwapBalances(); // Refresh balances

    } catch (error) {
        console.error('Error during swap execution:', error);
        showNotification(`Swap failed: ${error.message}. Check console for details.`, 'error');
        await diagnoseCodeIssue('executeSwap', `Swap transaction failed. Error: ${error.message}.`);
    } finally {
        if (uiElements.executeSwapBtn) uiElements.executeSwapBtn.disabled = false;
    }
}


// --- NFT DISPLAY & ACTIONS (MOCK IMPLEMENTATION) ---

/**
 * ✅ ИЗМЕНЕНИЕ: Загружает и отображает NFT, принадлежащие подключенному пользователю (из MOCK_DB).
 * @param {string} walletAddress - The public key of the connected wallet.
 */
async function loadUserNFTs(walletAddress) {
    if (!uiElements.userNftList) return;

    uiElements.userNftList.innerHTML = '<p class="placeholder-item web3-placeholder">Loading your NFTs...</p>';
    if (uiElements.nftToSellSelect) uiElements.nftToSellSelect.innerHTML = '<option value="">-- Select NFT --</option>';

    try {
        // --- ЗАМЕНА FETCH НА ЛОКАЛЬНЫЕ ДАННЫЕ ---
        // Имитируем успешный ответ API
        const allNfts = MOCK_DB.nfts;
        // Фильтруем: принадлежат текущему кошельку И не выставлены на продажу
        const userOwnedNfts = allNfts.filter(nft => nft.owner === walletAddress && !nft.isListed);
        // ------------------------------------------

        uiElements.userNftList.innerHTML = ''; // Clear loading message

        if (userOwnedNfts.length === 0) {
            uiElements.userNftList.innerHTML = '<p class="placeholder-item web3-placeholder">No NFTs found in your wallet.</p>';
            return;
        }

        userOwnedNfts.forEach(nft => {
            const nftItem = document.createElement('div');
            nftItem.className = 'nft-item';
            nftItem.innerHTML = `
                <img src="${nft.image || 'https://via.placeholder.com/180x180?text=NFT'}" alt="${nft.name || 'NFT Image'}">
                <h4>${nft.name || 'Untitled NFT'}</h4>
                <p>${nft.description || 'No description'}</p>
                <p>Mint: <span style="font-size:0.8em; word-break:break-all;">${nft.mint ? `${nft.mint.substring(0, 6)}...${nft.mint.substring(nft.mint.length - 4)}` : 'N/A'}</span></p>
            `;
            nftItem.addEventListener('click', () => window.showNftDetails(nft));
            uiElements.userNftList.appendChild(nftItem);

            if (uiElements.nftToSellSelect) {
                const option = document.createElement('option');
                option.value = nft.mint;
                option.textContent = nft.name;
                uiElements.nftToSellSelect.appendChild(option);
            }
        });

    } catch (error) {
        console.error('Error loading user NFTs (MOCK):', error);
        showNotification(`Failed to load your NFTs: ${error.message}. (MOCK)`, 'error');
        uiElements.userNftList.innerHTML = `<p class="placeholder-item web3-placeholder">Error loading NFTs: ${error.message}.</p>`;
    }
}

/**
 * ✅ ИЗМЕНЕНИЕ: Загружает и отображает NFT, выставленные на продажу (из MOCK_DB).
 */
async function loadMarketplaceNFTs() {
    if (!uiElements.marketplaceNftList) return;

    uiElements.marketplaceNftList.innerHTML = '<p class="placeholder-item web3-placeholder">Loading marketplace NFTs...</p>';

    try {
        // --- ЗАМЕНА FETCH НА ЛОКАЛЬНЫЕ ДАННЫЕ ---
        const allNfts = MOCK_DB.nfts;
        // Фильтруем: выставлены на продажу И имеют цену
        const listedNfts = allNfts.filter(nft => nft.price && nft.isListed);
        // ------------------------------------------

        uiElements.marketplaceNftList.innerHTML = ''; // Clear loading message

        if (listedNfts.length === 0) {
            uiElements.marketplaceNftList.innerHTML = '<p class="placeholder-item web3-placeholder">No NFTs listed on the marketplace yet.</p>';
            return;
        }

        listedNfts.forEach(nft => {
            const nftItem = document.createElement('div');
            nftItem.className = 'nft-item';
            nftItem.innerHTML = `
                <img src="${nft.image || 'https://via.placeholder.com/180x180?text=NFT'}" alt="${nft.name || 'NFT Image'}">
                <h4>${nft.name || 'Untitled NFT'}</h4>
                <p>${nft.description || 'No description'}</p>
                <p>Price: <strong>${nft.price ? `${nft.price} SOL` : 'N/A'}</strong></p>
                <p>Mint: <span style="font-size:0.8em; word-break:break-all;">${nft.mint ? `${nft.mint.substring(0, 6)}...${nft.mint.substring(nft.mint.length - 4)}` : 'N/A'}</span></p>
            `;
            nftItem.addEventListener('click', () => window.showNftDetails(nft));
            uiElements.marketplaceNftList.appendChild(nftItem);
        });

    } catch (error) {
        console.error('Error loading marketplace NFTs (MOCK):', error);
        showNotification(`Failed to load marketplace NFTs: ${error.message}. (MOCK)`, 'error');
        uiElements.marketplaceNftList.innerHTML = `<p class="placeholder-item web3-placeholder">Error loading marketplace NFTs: ${error.message}.</p>`;
    }
}

/**
 * ✅ ИЗМЕНЕНИЕ: Отображает детали NFT, включая историю из MOCK_DB.
 * @param {object} nft - The NFT object to display.
 */
window.showNftDetails = async function(nft) {
    if (!uiElements.nftDetailsModal) return;

    closeAllPopups();
    currentOpenNft = nft; // Store the NFT object for actions

    // Populate static NFT details (Не изменено)
    if (uiElements.nftDetailImage) uiElements.nftDetailImage.src = nft.image || 'https://via.placeholder.com/250x150?text=NFT';
    if (uiElements.nftDetailName) uiElements.nftDetailName.textContent = nft.name || 'Untitled NFT';
    if (uiElements.nftDetailDescription) uiElements.nftDetailDescription.textContent = nft.description || 'No description provided.';
    if (uiElements.nftDetailOwner) uiElements.nftDetailOwner.textContent = nft.owner || 'Unknown';
    if (uiElements.nftDetailMint) uiElements.nftDetailMint.textContent = nft.mint || 'N/A';
    if (uiElements.nftDetailSolscanLink) {
        uiElements.nftDetailSolscanLink.href = nft.mint ? `https://solscan.io/token/${nft.mint}?cluster=${NETWORK.toLowerCase()}` : '#';
        uiElements.nftDetailSolscanLink.style.display = nft.mint ? 'inline-block' : 'none';
    }

    // Populate attributes list (Не изменено)
    if (uiElements.attributesList) {
        uiElements.attributesList.innerHTML = '';
        if (nft.attributes && Array.isArray(nft.attributes) && nft.attributes.length > 0) {
            nft.attributes.forEach(attr => {
                const li = document.createElement('li');
                li.textContent = `${attr.trait_type || attr.key || 'Trait'}: ${attr.value || 'N/A'}`;
                uiElements.attributesList.appendChild(li);
            });
        } else {
            uiElements.attributesList.innerHTML = '<li>No attributes.</li>';
        }
    }

    // Show/hide action buttons based on ownership and listing status (Не изменено)
    if (uiElements.nftDetailBuyBtn) uiElements.nftDetailBuyBtn.style.display = 'none';
    if (uiElements.nftDetailSellBtn) uiElements.nftDetailSellBtn.style.display = 'none';
    if (uiElements.nftDetailTransferBtn) uiElements.nftDetailTransferBtn.style.display = 'none';

    const currentUserWalletAddress = walletPublicKey ? walletPublicKey.toBase58() : null;

    if (currentUserWalletAddress && nft.owner === currentUserWalletAddress) {
        if (uiElements.nftDetailTransferBtn) uiElements.nftDetailTransferBtn.style.display = 'inline-block';
        if (!nft.isListed && uiElements.nftDetailSellBtn) {
            uiElements.nftDetailSellBtn.style.display = 'inline-block';
        }
    } else if (nft.isListed && uiElements.nftDetailBuyBtn) {
        if (currentUserWalletAddress && nft.owner !== currentUserWalletAddress) {
            uiElements.nftDetailBuyBtn.style.display = 'inline-block';
        }
    }

    uiElements.nftDetailsModal.style.display = 'flex'; // Display the modal

    // ✅ ИЗМЕНЕНИЕ: Загрузка NFT transaction history из MOCK_DB
    if (uiElements.nftDetailHistory && nft.mint) {
        uiElements.nftDetailHistory.textContent = 'Loading history...';
        try {
            // --- ЗАМЕНА FETCH НА ЛОКАЛЬНЫЕ ДАННЫЕ ---
            const historyData = MOCK_DB.nftHistory[nft.mint] || [];
            // ------------------------------------------

            if (historyData && historyData.length > 0) {
                uiElements.nftDetailHistory.innerHTML = '<h4>Transaction History (MOCK):</h4>';
                // Sort by date in descending order (most recent first)
                historyData.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

                historyData.forEach(event => {
                    const p = document.createElement('p');
                    let eventText = `${new Date(event.timestamp).toLocaleString()}: `;
                    const from = event.from ? `${event.from.substring(0, 6)}...${event.from.substring(event.from.length - 4)}` : 'N/A';
                    const to = event.to ? `${event.to.substring(0, 6)}...${event.to.substring(event.to.length - 4)}` : 'N/A';

                    switch (event.type) {
                        case "Mint":
                            eventText += `Minted to address ${to}`;
                            break;
                        case "Transfer":
                            eventText += `Transferred from ${from} to ${to}`;
                            break;
                        case "Sale":
                            eventText += `Sold from ${from} to ${to} for ${event.price || 'N/A'} SOL`;
                            break;
                        default:
                            eventText += `Event: ${event.type}`;
                            if (event.from) eventText += ` from ${from}`;
                            if (event.to) eventText += ` to ${to}`;
                            break;
                    }
                    p.textContent = eventText;
                    uiElements.nftDetailHistory.appendChild(p);
                });
            } else {
                uiElements.nftDetailHistory.textContent = 'No transaction history for this NFT.';
            }
        } catch (error) {
            console.error('Error loading NFT history for modal (MOCK):', error);
            showNotification(`Error loading NFT history: ${error.message}. (MOCK)`, 'error');
            uiElements.nftDetailHistory.textContent = `Error loading history: ${error.message}.`;
        }
    }
};

// --- STAKING FUNCTIONS (MOCK IMPLEMENTATION) ---

/**
 * ✅ ИЗМЕНЕНИЕ: Обновляет все данные о стейкинге (MOCK).
 */
async function updateStakingUI() {
    // Reset UI if wallet is disconnected or no data can be fetched
    if (!walletPublicKey) {
        if (uiElements.userAfoxBalance) uiElements.userAfoxBalance.textContent = '0 AFOX';
        if (uiElements.userStakedAmount) uiElements.userStakedAmount.textContent = '0 AFOX';
        if (uiElements.userRewardsAmount) uiElements.userRewardsAmount.textContent = '0 AFOX';
        // Mock default pool info even if disconnected
        if (uiElements.stakingApr) uiElements.stakingApr.textContent = '10%';
        if (uiElements.minStakeAmountDisplay) uiElements.minStakeAmountDisplay.textContent = '5 AFOX';
        if (uiElements.lockupPeriodDisplay) uiElements.lockupPeriodDisplay.textContent = '30 days';
        if (uiElements.unstakeFeeDisplay) uiElements.unstakeFeeDisplay.textContent = '0.5%';
        if (uiElements.rewardCalculationDisplay) uiElements.rewardCalculationDisplay.textContent = 'Daily';
        return;
    }

    // Ensure connection is active
    if (!connection) {
        connection = new SolanaWeb3.Connection(BACKUP_RPC_ENDPOINT, 'confirmed');
    }

    try {
        // Fetch AFOX balance (Solana RPC, не изменено)
        let afoxBalance = 0;
        try {
            const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
                walletPublicKey,
                { mint: AFOX_TOKEN_MINT_ADDRESS }
            );
            if (tokenAccounts.value.length > 0) {
                 const ata = tokenAccounts.value.find(acc => acc.account.data.parsed.info.owner === walletPublicKey.toBase58());
                if (ata) {
                    afoxBalance = ata.account.data.parsed.info.tokenAmount.uiAmount;
                } else {
                    afoxBalance = tokenAccounts.value[0].account.data.parsed.info.tokenAmount.uiAmount;
                }
            }
        } catch (tokenError) {
            console.warn('Failed to get AFOX token balance (possibly no token account):', tokenError.message);
            afoxBalance = 0;
        }
        if (uiElements.userAfoxBalance) uiElements.userAfoxBalance.textContent = `${afoxBalance.toFixed(4).replace(/\.?0+$/, '')} AFOX`;

        // ✅ ИЗМЕНЕНИЕ: Fetch user staking account info (MOCK)
        const userStakingAccount = await getUserStakingAccount(walletPublicKey);
        if (userStakingAccount) {
            if (uiElements.userStakedAmount) uiElements.userStakedAmount.textContent = `${userStakingAccount.stakedAmount.toFixed(4).replace(/\.?0+$/, '')} AFOX`;
            if (uiElements.userRewardsAmount) uiElements.userRewardsAmount.textContent = `${userStakingAccount.rewards.toFixed(4).replace(/\.?0+$/, '')} AFOX`;
        } else {
            if (uiElements.userStakedAmount) uiElements.userStakedAmount.textContent = '0 AFOX';
            if (uiElements.userRewardsAmount) uiElements.userRewardsAmount.textContent = '0 AFOX';
        }

        // ✅ ИЗМЕНЕНИЕ: Fetch staking pool info (MOCK)
        const stakingPoolInfo = await getStakingPoolInfo();
        if (stakingPoolInfo) {
            if (uiElements.stakingApr) uiElements.stakingApr.textContent = `${stakingPoolInfo.apr}%`;
            if (uiElements.minStakeAmountDisplay) uiElements.minStakeAmountDisplay.textContent = `${stakingPoolInfo.minStake} AFOX`;
            if (uiElements.lockupPeriodDisplay) uiElements.lockupPeriodDisplay.textContent = `${stakingPoolInfo.lockupDays} days`;
            if (uiElements.unstakeFeeDisplay) uiElements.unstakeFeeDisplay.textContent = `${stakingPoolInfo.unstakeFee}%`;
            if (uiElements.rewardCalculationDisplay) uiElements.rewardCalculationDisplay.textContent = stakingPoolInfo.rewardCalcMethod;
        }

    } catch (error) {
        console.error('Error updating staking UI:', error);
        showNotification('Failed to load staking data. Check console for details.', 'error');
    }
}

/**
 * ✅ ИЗМЕНЕНИЕ: PSEUDO-FUNCTION: Симулирует получение информации о стейкинге пользователя (MOCK).
 * @returns {Promise<{stakedAmount: number, rewards: number} | null>}
 */
async function getUserStakingAccount(userPublicKey) {
    const userKey = userPublicKey.toBase58();
    // Инициализация/получение данных стейкинга из MOCK_DB
    MOCK_DB.staking[userKey] = MOCK_DB.staking[userKey] || { stakedAmount: 0, rewards: 0 };
    return MOCK_DB.staking[userKey];
}

/**
 * ✅ ИЗМЕНЕНИЕ: PSEUDO-FUNCTION: Симулирует получение информации о пуле стейкинга (MOCK).
 * @returns {Promise<{apr: number, minStake: number, lockupDays: number, unstakeFee: number, rewardCalcMethod: string} | null>}
 */
async function getStakingPoolInfo() {
    // Не нужно взаимодействовать с RPC, просто возвращаем моковые данные пула
    return { apr: 10, minStake: 5, lockupDays: 30, unstakeFee: 0.5, rewardCalcMethod: "Daily" };
}

/**
 * ✅ ИЗМЕНЕНИЕ: Handles the transaction for staking AFOX tokens (MOCK).
 * @async
 * @global
 */
async function handleStakeAfox() {
    if (!walletPublicKey) {
        showNotification('Please connect your wallet.', 'warning');
        return;
    }
    if (!uiElements.stakeAmountInput) {
        showNotification('Stake amount input not found.', 'error');
        return;
    }

    const amount = parseFloat(uiElements.stakeAmountInput.value);
    if (isNaN(amount) || amount <= 0) {
        showNotification('Please enter a valid amount to stake (greater than 0).', 'warning');
        return;
    }

    if (uiElements.stakeAfoxBtn) uiElements.stakeAfoxBtn.disabled = true;

    try {
        showNotification(`Initiating staking of ${amount} AFOX... (Simulation)`, 'info', 5000);

        // --- MOCKING TRANSACTION LOGIC ---
        await new Promise(resolve => setTimeout(resolve, 3000)); // Simulate delay
        const userKey = walletPublicKey.toBase58();
        MOCK_DB.staking[userKey].stakedAmount += amount;
        // Добавляем моковую награду, чтобы показать, что это работает
        MOCK_DB.staking[userKey].rewards += (amount * 0.01);
        persistMockData();
        const signature = "MOCK_SIGNATURE_STAKE_" + Date.now();
        // --- END MOCKING ---

        showNotification(`You successfully staked ${amount} AFOX! (Simulation Confirmed)`, 'success', 7000);

        uiElements.stakeAmountInput.value = '';
        await updateStakingAndBalanceUI();

    } catch (error) {
        console.error('Error during staking (MOCK):', error);
        const errorMessage = error.message || "An unknown network error occurred.";
        showNotification(`Staking failed. Details: ${errorMessage.substring(0, 50)}...`, 'error');
        await diagnoseCodeIssue('handleStakeAfox', `Staking transaction for ${amount} AFOX failed. Error: ${error.message}.`);
    } finally {
        if (uiElements.stakeAfoxBtn) uiElements.stakeAfoxBtn.disabled = false;
    }
}

/**
 * ✅ ИЗМЕНЕНИЕ: Handles the transaction for claiming rewards (MOCK).
 * @async
 * @global
 */
async function handleClaimRewards() {
    if (!walletPublicKey) {
        showNotification('Please connect your wallet to claim rewards.', 'warning');
        return;
    }
    if (uiElements.claimRewardsBtn) uiElements.claimRewardsBtn.disabled = true;

    try {
        showNotification('Attempting to claim rewards... (Simulation)', 'info');

        // --- MOCKING TRANSACTION LOGIC ---
        await new Promise(resolve => setTimeout(resolve, 2500));
        const userKey = walletPublicKey.toBase58();
        const claimedAmount = MOCK_DB.staking[userKey].rewards;
        MOCK_DB.staking[userKey].rewards = 0; // Сбрасываем награды
        persistMockData();
        const signature = "MOCK_SIGNATURE_CLAIM_REWARDS_" + Date.now();
        // --- END MOCKING ---

        showNotification(`Rewards of ${claimedAmount.toFixed(4)} AFOX successfully claimed! (Simulation Confirmed)`, 'success', 5000);

        await updateStakingAndBalanceUI();

    } catch (error) {
        console.error('Error claiming rewards (MOCK):', error);
        const errorMessage = error.message || "An unknown network error occurred.";
        showNotification(`Claiming failed. Details: ${errorMessage.substring(0, 50)}...`, 'error');
        await diagnoseCodeIssue('handleClaimRewards', `Claim rewards transaction failed. Error: ${error.message}.`);

    } finally {
        if (uiElements.claimRewardsBtn) uiElements.claimRewardsBtn.disabled = false;
    }
}

/**
 * ✅ ИЗМЕНЕНИЕ: Handles the transaction for unstaking AFOX tokens (MOCK).
 * @async
 * @global
 */
async function handleUnstakeAfox() {
    if (!walletPublicKey) {
        showNotification('Please connect your wallet.', 'warning');
        return;
    }

    const userKey = walletPublicKey.toBase58();
    const amount = MOCK_DB.staking[userKey].stakedAmount; // Unstake all staked for simplicity

    if (amount <= 0) {
        showNotification('You have no tokens staked to unstake.', 'warning');
        return;
    }

    if (uiElements.unstakeAfoxBtn) uiElements.unstakeAfoxBtn.disabled = true;

    try {
        showNotification(`Attempting to unstake ${amount.toFixed(4)} tokens... (Simulation)`, 'info');

        // --- MOCKING TRANSACTION LOGIC ---
        await new Promise(resolve => setTimeout(resolve, 3000));
        MOCK_DB.staking[userKey].stakedAmount = 0; // Сбрасываем стейкинг
        persistMockData();
        const signature = "MOCK_SIGNATURE_UNSTAKE_" + Date.now();
        // --- END MOCKING ---

        showNotification(`Staked tokens successfully unstaked! (Simulation Confirmed)`, 'success', 5000);

        await updateStakingAndBalanceUI();

    } catch (error) {
        console.error('Error unstaking tokens (MOCK):', error);
        const errorMessage = error.message || "An unknown network error occurred.";
        showNotification(`Unstaking failed. Details: ${errorMessage.substring(0, 50)}...`, 'error');
        await diagnoseCodeIssue('handleUnstakeAfox', `Unstake transaction failed. Error: ${error.message}.`);

    } finally {
        if (uiElements.unstakeAfoxBtn) uiElements.unstakeAfoxBtn.disabled = false;
    }
}


// --- DYNAMIC CONTENT LOADING (MOCK IMPLEMENTATION) ---

/**
 * ✅ ИЗМЕНЕНИЕ: Загрузка объявлений из MOCK_DB.
 */
async function loadAnnouncements() {
    if (!uiElements.announcementsList) return;
    uiElements.announcementsList.innerHTML = '<p class="placeholder-item">Loading announcements...</p>';
    try {
        // --- ЗАМЕНА FETCH НА ЛОКАЛЬНЫЕ ДАННЫЕ ---
        const data = MOCK_DB.announcements;
        // ------------------------------------------

        uiElements.announcementsList.innerHTML = ''; // Clear loading message

        if (!Array.isArray(data) || data.length === 0) {
            uiElements.announcementsList.innerHTML = '<p class="placeholder-item">No announcements yet.</p>';
            return;
        }
        // Sort by date in descending order (most recent first)
        data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        data.forEach(announcement => {
            const div = document.createElement('div');
            div.className = 'announcement-item';
            div.innerHTML = `
                <p>${announcement.text || 'No text'}</p>
                <p class="announcement-date">${announcement.date ? new Date(announcement.date).toLocaleString() : 'N/A'}</p>
            `;
            uiElements.announcementsList.appendChild(div);
        });
    } catch (error) {
        console.error('Error loading announcements (MOCK):', error);
        showNotification(`Failed to load announcements: ${error.message}. (MOCK)`, 'error');
        uiElements.announcementsList.innerHTML = '<p class="placeholder-item">Failed to load announcements.</p>';
    }
}

/**
 * ✅ ИЗМЕНЕНИЕ: Загрузка игр из MOCK_DB.
 */
async function loadGames() {
    if (!uiElements.gameList) return;
    uiElements.gameList.innerHTML = '<p class="placeholder-item web3-placeholder">Loading games...</p>';
    try {
        // --- ЗАМЕНА FETCH НА ЛОКАЛЬНЫЕ ДАННЫЕ ---
        const data = MOCK_DB.games;
        // ------------------------------------------

        uiElements.gameList.innerHTML = ''; // Clear loading message

        if (!Array.isArray(data) || data.length === 0) {
            uiElements.gameList.innerHTML = '<p class="placeholder-item web3-placeholder">No games uploaded yet.</p>';
            return;
        }
        data.forEach(game => {
            const div = document.createElement('div');
            div.className = 'game-item web3-placeholder'; // Specific class for games
            div.innerHTML = `
                <h3>${game.title || 'Untitled Game'}</h3>
                <p>${game.description || 'No description'}</p>
                ${game.url ? `<a href="${game.url}" target="_blank" rel="noopener noreferrer" class="web3-btn small-btn">Play</a>` : ''}
            `;
            uiElements.gameList.appendChild(div);
        });
    } catch (error) {
        console.error('Error loading games (MOCK):', error);
        showNotification(`Failed to load games: ${error.message}. (MOCK)`, 'error');
        uiElements.gameList.innerHTML = '<p class="placeholder-item web3-placeholder">Failed to load games.</p>';
    }
}

/**
 * ✅ ИЗМЕНЕНИЕ: Загрузка рекламы из MOCK_DB.
 */
async function loadAds() {
    if (!uiElements.adList) return;
    uiElements.adList.innerHTML = '<p class="placeholder-item ad web3-placeholder">Loading ads...</p>';
    try {
        // --- ЗАМЕНА FETCH НА ЛОКАЛЬНЫЕ ДАННЫЕ ---
        const data = MOCK_DB.ads;
        // ------------------------------------------

        uiElements.adList.innerHTML = ''; // Clear loading message

        if (!Array.isArray(data) || data.length === 0) {
            uiElements.adList.innerHTML = '<p class="placeholder-item ad web3-placeholder">No ads yet.</p>';
            return;
        }
        data.forEach(ad => {
            const div = document.createElement('div');
            div.className = 'ad-item web3-placeholder'; // Specific class for ads
            div.innerHTML = `
                <h3>${ad.title || 'Untitled Ad'}</h3>
                <p>${ad.content || 'No content'}</p>
                ${ad.imageUrl ? `<img src="${ad.imageUrl}" alt="Advertisement image" style="max-width:100%; height:auto; margin-top:10px; border-radius:5px;">` : ''}
                ${ad.link ? `<a href="${ad.link}" target="_blank" rel="noopener noreferrer" class="web3-btn small-btn" style="margin-top:10px;">Learn more</a>` : ''}
            `;
            uiElements.adList.appendChild(div);
        });
    } catch (error) {
        console.error('Error loading ads (MOCK):', error);
        showNotification(`Failed to load ads: ${error.message}. (MOCK)`, 'error');
        uiElements.adList.innerHTML = '<p class="placeholder-item ad web3-placeholder">Failed to load ads.</p>';
    }
}


// --- EVENT LISTENERS INITIALIZATION (Не изменено) ---

/**
 * Initializes all global event listeners.
 */
function initializeEventListeners() {
    // Modal close buttons
    Object.values(uiElements.closeModalButtons).forEach(btn => {
        if (btn) btn.addEventListener('click', closeAllPopups);
    });

    // Main menu close button
    if (uiElements.closeMainMenuCross) {
        uiElements.closeMainMenuCross.addEventListener('click', () => {
            if (uiElements.mainNav) {
                uiElements.mainNav.classList.remove('active');
                if (uiElements.menuToggle) uiElements.menuToggle.classList.remove('active');
                document.body.classList.remove('menu-open'); // Remove class to enable scrolling
            }
        });
    }

    // Close modals/menu on outside click
    window.addEventListener('click', (event) => {
        const modals = [uiElements.nftDetailsModal, uiElements.nftModal, uiElements.mintNftModal, uiElements.createProposalModal].filter(Boolean);
        let popupClosed = false;
        for (const modal of modals) {
            // Check if the click occurred directly on the modal background (not inside the modal content)
            if (modal.style.display === 'flex' && event.target === modal) {
                modal.style.display = 'none';
                popupClosed = true;
                break;
            }
        }
        // Close main nav if open and click is outside of it or its toggle button
        if (!popupClosed && uiElements.mainNav && uiElements.mainNav.classList.contains('active') &&
            !uiElements.mainNav.contains(event.target) && !(uiElements.menuToggle && uiElements.menuToggle.contains(event.target))) {
            uiElements.mainNav.classList.remove('active');
            if (uiElements.menuToggle) uiElements.menuToggle.classList.remove('active');
            document.body.classList.remove('menu-open');
        }
    });

    // Close popups/menu on Escape key
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            closeAllPopups();
        }
    });

    // Menu toggle
    if (uiElements.menuToggle) {
        uiElements.menuToggle.addEventListener('click', () => {
            const isActive = uiElements.mainNav.classList.contains('active');
            // If mainNav is not already active, close other popups before opening
            if (uiElements.mainNav && !isActive) {
                closeAllPopups();
            }
            if (uiElements.mainNav) uiElements.mainNav.classList.toggle('active');
            uiElements.menuToggle.classList.toggle('active');
            document.body.classList.toggle('menu-open', !isActive); // Toggle body scroll lock
        });
    }

    // Nav links (for closing menu after click)
    uiElements.navLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (uiElements.mainNav && uiElements.mainNav.classList.contains('active')) {
                uiElements.mainNav.classList.remove('active');
                if (uiElements.menuToggle) uiElements.menuToggle.classList.remove('active');
                document.body.classList.remove('menu-open');
            }
        });
    });

    // Wallet Connect Buttons
    uiElements.connectWalletButtons.forEach(btn => {
        if (btn) btn.addEventListener('click', connectWallet);
    });

    // Mint NFT Form Submission
    if (uiElements.mintNftForm) {
        uiElements.mintNftForm.addEventListener('submit', handleMintNftSubmit);
    }

    // List NFT Form Submission
    if (uiElements.listNftForm) {
        uiElements.listNftForm.addEventListener('submit', handleListNftSubmit);
    }

    // Announcement Publish Button
    if (uiElements.publishButton) {
        uiElements.publishButton.addEventListener('click', handlePublishAnnouncement);
    }

    // Game Upload & Ad Post Buttons (Placeholders)
    if (uiElements.uploadGameBtnWeb3) {
        uiElements.uploadGameBtnWeb3.addEventListener('click', () => {
            showNotification('Game upload is a placeholder. (MOCK)', 'info', 5000);
        });
    }
    if (uiElements.postAdBtnWeb3) {
        uiElements.postAdBtnWeb3.addEventListener('click', () => {
            showNotification('Ad posting is a placeholder. (MOCK)', 'info', 5000);
        });
    }

    // Staking Button Handlers
    if (uiElements.stakeAfoxBtn) uiElements.stakeAfoxBtn.addEventListener('click', handleStakeAfox);
    if (uiElements.claimRewardsBtn) uiElements.claimRewardsBtn.addEventListener('click', handleClaimRewards);
    if (uiElements.unstakeAfoxBtn) uiElements.unstakeAfoxBtn.addEventListener('click', handleUnstakeAfox);

    // NFT Buy button handler
    if (uiElements.nftDetailBuyBtn) uiElements.nftDetailBuyBtn.addEventListener('click', handleBuyNft);

    // NFT Sell button handler (direct link to list form)
    if (uiElements.nftDetailSellBtn) {
        uiElements.nftDetailSellBtn.addEventListener('click', () => {
            if (currentOpenNft && uiElements.nftToSellSelect) {
                uiElements.nftToSellSelect.value = currentOpenNft.mint;
            }
            closeAllPopups();
            const nftSection = document.getElementById('nft-section'); // Scroll to NFT section
            if (nftSection) nftSection.scrollIntoView({ behavior: 'smooth' });
        });
    }

    // NFT Transfer button handler
    if (uiElements.nftDetailTransferBtn) uiElements.nftDetailTransferBtn.addEventListener('click', handleTransferNft);

    // Contract Address Copy Functionality
    uiElements.copyButtons.forEach(button => {
        button.addEventListener('click', handleCopyText);
    });

    // SWAP SECTION EVENT HANDLERS
    if (uiElements.swapDirectionBtn) uiElements.swapDirectionBtn.addEventListener('click', handleSwapDirection);
    // Listen for input and change events to clear quote
    if (uiElements.swapFromAmountInput) uiElements.swapFromAmountInput.addEventListener('input', clearSwapQuote);
    if (uiElements.swapFromTokenSelect) uiElements.swapFromTokenSelect.addEventListener('change', updateSwapSection);
    if (uiElements.swapToTokenSelect) uiElements.swapToTokenSelect.addEventListener('change', clearSwapQuote);
    if (uiElements.getQuoteBtn) uiElements.getQuoteBtn.addEventListener('click', getQuote);
    if (uiElements.executeSwapBtn) uiElements.executeSwapBtn.addEventListener('click', executeSwap);
    uiElements.maxAmountBtns.forEach(button => {
        button.addEventListener('click', handleMaxAmount);
    });

    // DAO/Proposal Modals
    const createProposalBtn = document.getElementById('createProposalBtn');
    if (createProposalBtn) {
        createProposalBtn.addEventListener('click', () => {
            if (uiElements.createProposalModal) {
                closeAllPopups();
                uiElements.createProposalModal.style.display = 'flex';
            }
        });
    }

    // Mint NFT Open Modal Button
    const mintNftOpenBtn = document.getElementById('mintNftOpenBtn');
    if (mintNftOpenBtn) {
        mintNftOpenBtn.addEventListener('click', () => {
            if (uiElements.mintNftModal) {
                closeAllPopups();
                uiElements.mintNftModal.style.display = 'flex';
            }
        });
    }

    // Contact Form Validation
    if (uiElements.contactForm) {
        uiElements.contactForm.addEventListener('submit', handleContactFormSubmit);
    }
}

// --- Specific Event Handler Functions (MOCK IMPLEMENTATION) ---

/**
 * ✅ ИЗМЕНЕНИЕ: Симуляция минта NFT (MOCK).
 */
async function handleMintNftSubmit(e) {
    e.preventDefault();
    if (!walletPublicKey) {
        showNotification('Please connect your Solana wallet first to mint an NFT.', 'warning');
        return;
    }
    if (!uiElements.mintNftForm) {
        showNotification('Mint NFT form not found.', 'error');
        return;
    }

    const formData = new FormData(uiElements.mintNftForm);

    try {
        showNotification('Minting NFT (simulation)...', 'info', 5000);

        // --- MOCKING TRANSACTION LOGIC ---
        await new Promise(resolve => setTimeout(resolve, 1500)); // Имитация задержки

        const newMintAddress = 'MINT_' + Date.now().toString().substring(5);
        const newNft = {
            mint: newMintAddress,
            name: formData.get('nftName') || `Minted NFT #${MOCK_DB.nfts.length + 1}`,
            description: formData.get('nftDescription') || 'User minted NFT (MOCK).',
            owner: walletPublicKey.toBase58(),
            price: 0,
            isListed: false,
            image: 'https://via.placeholder.com/180x180/ffd700/000000?text=NEW+MINT',
            attributes: [{ trait_type: 'Creator', value: walletPublicKey.toBase58().substring(0, 8) }],
        };

        MOCK_DB.nfts.push(newNft);
        MOCK_DB.nftHistory[newMintAddress] = [{ type: 'Mint', timestamp: new Date().toISOString(), to: walletPublicKey.toBase58() }];
        persistMockData(); // Сохраняем в localStorage
        const result = { uri: 'MOCK_URI', mintAddress: newMintAddress };
        // --- END MOCKING ---

        showNotification(`NFT successfully minted (simulation)! Mint Address: ${result.mintAddress}`, 'success', 7000);
        uiElements.mintNftForm.reset();
        await Promise.all([
            loadUserNFTs(walletPublicKey.toBase58()),
            loadMarketplaceNFTs()
        ]);
        if (uiElements.mintNftModal) uiElements.mintNftModal.style.display = 'none'; // Close modal after successful mint
    } catch (error) {
        console.error('Error minting NFT (MOCK):', error);
        showNotification(`Failed to mint NFT: ${error.message}`, 'error');
        await diagnoseCodeIssue('handleMintNftSubmit', `NFT minting failed. Error: ${error.message}.`);
    }
}

/**
 * ✅ ИЗМЕНЕНИЕ: Симуляция листинга NFT (MOCK).
 */
async function handleListNftSubmit(e) {
    e.preventDefault();
    if (!walletPublicKey) {
        showNotification('Please connect your Solana wallet first to list an NFT for sale.', 'warning');
        return;
    }
    if (!uiElements.nftToSellSelect || !document.getElementById('salePrice') || !document.getElementById('listingDuration')) {
        showNotification('NFT listing form elements not found.', 'error');
        return;
    }

    const mintAddress = uiElements.nftToSellSelect.value;
    const salePrice = parseFloat(document.getElementById('salePrice').value);
    const listingDuration = parseInt(document.getElementById('listingDuration').value, 10);

    if (!mintAddress) {
        showNotification('Please select an NFT to list.', 'warning');
        return;
    }
    if (isNaN(salePrice) || salePrice <= 0) {
        showNotification('Please enter a valid sale price (greater than 0).', 'warning');
        return;
    }
    // duration validation omitted for mock simplicity

    try {
        showNotification('Listing NFT for sale (simulation)...', 'info');

        // --- MOCKING TRANSACTION LOGIC ---
        await new Promise(resolve => setTimeout(resolve, 1500)); // Имитация задержки

        const nftIndex = MOCK_DB.nfts.findIndex(n => n.mint === mintAddress && n.owner === walletPublicKey.toBase58());

        if (nftIndex === -1) {
            throw new Error('NFT not found or you are not the owner.');
        }

        MOCK_DB.nfts[nftIndex].isListed = true;
        MOCK_DB.nfts[nftIndex].price = salePrice;
        MOCK_DB.nfts[nftIndex].listingDuration = listingDuration; // Сохраняем длительность
        persistMockData(); // Сохраняем в localStorage

        const result = { message: `NFT ${MOCK_DB.nfts[nftIndex].name} successfully listed for ${salePrice} SOL (Simulation).` };
        // --- END MOCKING ---

        showNotification(result.message, 'success');
        uiElements.listNftForm.reset();
        await Promise.all([
            loadUserNFTs(walletPublicKey.toBase58()),
            loadMarketplaceNFTs()
        ]);
    } catch (error) {
        console.error('Error listing NFT for sale (MOCK):', error);
        showNotification(`Failed to list NFT for sale: ${error.message}`, 'error');
        await diagnoseCodeIssue('handleListNftSubmit', `NFT listing failed. Error: ${error.message}.`);
    }
}

/**
 * ✅ ИЗМЕНЕНИЕ: Симуляция публикации объявления (MOCK).
 */
async function handlePublishAnnouncement() {
    if (!uiElements.announcementInput || !uiElements.publishButton) {
        showNotification('Announcement form elements not found.', 'error');
        return;
    }
    const text = uiElements.announcementInput.value.trim();
    if (!text) {
        showNotification('Please enter an announcement before publishing.', 'warning');
        return;
    }

    try {
        uiElements.publishButton.disabled = true; // Disable button to prevent multiple submissions
        showNotification('Publishing announcement (simulation)...', 'info');

        // --- ЗАМЕНА FETCH НА ЛОКАЛЬНУЮ ЛОГИКУ ---
        await new Promise(resolve => setTimeout(resolve, 1000));
        MOCK_DB.announcements.push({ text: text, date: new Date().toISOString() });
        persistMockData(); // Сохраняем в localStorage
        // ------------------------------------------

        uiElements.announcementInput.value = '';
        await loadAnnouncements();
        showNotification('Announcement published successfully (Simulation)!', 'success');
    } catch (error) {
        console.error('Error publishing announcement (MOCK):', error);
        showNotification('Server connection error while publishing announcement (MOCK).', 'error');
        await diagnoseCodeIssue('handlePublishAnnouncement', `Network error publishing announcement. Error: ${error.message}.`);
    } finally {
        uiElements.publishButton.disabled = false; // Re-enable button
    }
}

/**
 * ✅ ИЗМЕНЕНИЕ: Симуляция покупки NFT (MOCK).
 */
async function handleBuyNft() {
    if (!walletPublicKey) {
        showNotification('Please connect your wallet to buy an NFT.', 'warning');
        return;
    }
    if (!currentOpenNft || !currentOpenNft.isListed || !currentOpenNft.price) {
        showNotification('NFT is not listed for sale or no price is set.', 'error');
        return;
    }
    const buyerWallet = walletPublicKey.toBase58();
    if (currentOpenNft.owner === buyerWallet) {
        showNotification('You are the owner of this NFT.', 'warning');
        return;
    }

    showNotification(`Buying ${currentOpenNft.name} for ${currentOpenNft.price} SOL... (Simulation)`, 'info', 5000);

    try {
        if (uiElements.nftDetailBuyBtn) uiElements.nftDetailBuyBtn.disabled = true;

        // --- MOCKING TRANSACTION LOGIC ---
        await new Promise(resolve => setTimeout(resolve, 3000));
        const signature = "MOCK_SIGNATURE_BUY";

        const nftIndex = MOCK_DB.nfts.findIndex(n => n.mint === currentOpenNft.mint);
        if (nftIndex === -1) {
            throw new Error('NFT not found in mock database.');
        }

        const sellerWallet = MOCK_DB.nfts[nftIndex].owner;

        // Обновление статуса NFT
        MOCK_DB.nfts[nftIndex].owner = buyerWallet;
        MOCK_DB.nfts[nftIndex].isListed = false;
        MOCK_DB.nfts[nftIndex].price = 0; // Сбрасываем цену

        // Добавление в историю транзакций
        MOCK_DB.nftHistory[currentOpenNft.mint] = MOCK_DB.nftHistory[currentOpenNft.mint] || [];
        MOCK_DB.nftHistory[currentOpenNft.mint].push({
            type: 'Sale',
            timestamp: new Date().toISOString(),
            from: sellerWallet,
            to: buyerWallet,
            price: currentOpenNft.price
        });

        persistMockData(); // Сохраняем в localStorage
        // --- END MOCKING ---

        showNotification(`Successfully purchased ${currentOpenNft.name}! (Simulation Confirmed)`, 'success', 7000);
        if (uiElements.nftDetailsModal) uiElements.nftDetailsModal.style.display = 'none';

        // Обновляем списки
        await Promise.all([
            loadMarketplaceNFTs(),
            loadUserNFTs(walletPublicKey.toBase58()),
            updateSwapBalances() // SOL balance might change due to purchase
        ]);
        currentOpenNft = null; // Clear the currently open NFT
    } catch (error) {
        console.error('Error purchasing NFT (MOCK):', error);
        showNotification(`Failed to purchase NFT: ${error.message}. (MOCK)`, 'error');
        await diagnoseCodeIssue('handleBuyNft', `NFT purchase failed. Error: ${error.message}.`);
    } finally {
        if (uiElements.nftDetailBuyBtn) uiElements.nftDetailBuyBtn.disabled = false; // Re-enable button
    }
}

/**
 * ✅ ИЗМЕНЕНИЕ: Симуляция перевода NFT (MOCK).
 */
async function handleTransferNft() {
    if (!walletPublicKey) {
        showNotification('Please connect your wallet to transfer an NFT.', 'warning');
        return;
    }
    if (!currentOpenNft) {
        showNotification('No NFT selected for transfer.', 'warning');
        return;
    }
    const senderWallet = walletPublicKey.toBase58();
    if (currentOpenNft.owner !== senderWallet) {
        showNotification('You are not the owner of this NFT to transfer it.', 'warning');
        return;
    }

    const recipientAddress = prompt("Enter the recipient's public address for the NFT (MOCK):");
    if (!recipientAddress) {
        showNotification('Transfer cancelled. Recipient address not provided.', 'info');
        return;
    }
    let recipientPublicKey;
    try {
        recipientPublicKey = new SolanaWeb3.PublicKey(recipientAddress);
        if (recipientPublicKey.toBase58() === senderWallet) {
            showNotification("Cannot transfer NFT to your own address.", "warning");
            return;
        }
    } catch (e) {
        showNotification('Invalid recipient address format. Please enter a valid Solana public key.', 'error');
        return;
    }

    try {
        uiElements.nftDetailTransferBtn.disabled = true; // Disable button during transfer
        showNotification(`Preparing to transfer ${currentOpenNft.name} to ${recipientAddress}... (Simulation)`, 'info', 5000);

        // --- MOCKING TRANSACTION LOGIC ---
        await new Promise(resolve => setTimeout(resolve, 3000));
        const signature = "MOCK_SIGNATURE_TRANSFER";

        const nftIndex = MOCK_DB.nfts.findIndex(n => n.mint === currentOpenNft.mint);
        if (nftIndex === -1) {
            throw new Error('NFT not found in mock database.');
        }

        // Обновление статуса NFT
        MOCK_DB.nfts[nftIndex].owner = recipientAddress;
        MOCK_DB.nfts[nftIndex].isListed = false; // Снимаем с листинга при переводе
        MOCK_DB.nfts[nftIndex].price = 0;

        // Добавление в историю транзакций
        MOCK_DB.nftHistory[currentOpenNft.mint] = MOCK_DB.nftHistory[currentOpenNft.mint] || [];
        MOCK_DB.nftHistory[currentOpenNft.mint].push({
            type: 'Transfer',
            timestamp: new Date().toISOString(),
            from: senderWallet,
            to: recipientAddress
        });

        persistMockData(); // Сохраняем в localStorage
        // --- END MOCKING ---

        showNotification(`NFT ${currentOpenNft.name} successfully transferred! (Simulation Confirmed)`, 'success', 7000);
        if (uiElements.nftDetailsModal) uiElements.nftDetailsModal.style.display = 'none';
        await Promise.all([
            loadUserNFTs(walletPublicKey.toBase58()),
            loadMarketplaceNFTs()
        ]);
        currentOpenNft = null;
    } catch (error) {
        console.error('Error transferring NFT (MOCK):', error);
        showNotification(`Failed to transfer NFT: ${error.message}. (MOCK)`, 'error');
        await diagnoseCodeIssue('handleTransferNft', `NFT transfer failed. Error: ${error.message}.`);
    } finally {
        if (uiElements.nftDetailTransferBtn) uiElements.nftDetailTransferBtn.disabled = false;
    }
}

function handleCopyText(event) {
    // ... (Не изменено)
    const button = event.currentTarget;
    const textToCopyElement = button.previousElementSibling;
    if (textToCopyElement && textToCopyElement.classList.contains('highlight-text')) {
        const textToCopy = textToCopyElement.textContent;
        navigator.clipboard.writeText(textToCopy).then(() => {
            showNotification('Text copied to clipboard!', 'info', 2000);
            const originalText = button.textContent;
            button.textContent = 'Copied!';
            setTimeout(() => {
                button.textContent = originalText;
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy text: ', err);
            showNotification('Failed to copy text. Please copy manually.', 'error');
        });
    } else {
        console.warn('Target element for copying not found.');
        showNotification('Could not find text to copy.', 'warning');
    }
}

function handleSwapDirection() {
    // ... (Не изменено)
    if (!uiElements.swapFromTokenSelect || !uiElements.swapToTokenSelect) {
        console.error("Swap direction UI elements not found.");
        return;
    }

    const fromVal = uiElements.swapFromTokenSelect.value;
    const toVal = uiElements.swapToTokenSelect.value;

    uiElements.swapFromTokenSelect.value = toVal;
    uiElements.swapToTokenSelect.value = fromVal;

    // Clear previous quote and update balances for new selection
    updateSwapSection();
}

function clearSwapQuote() {
    // ... (Не изменено)
    currentJupiterQuote = null;
    if (uiElements.executeSwapBtn) uiElements.executeSwapBtn.style.display = 'none';
    if (uiElements.swapToAmountInput) uiElements.swapToAmountInput.value = '';
    if (uiElements.priceImpactSpan) uiElements.priceImpactSpan.textContent = '0%';
    if (uiElements.lpFeeSpan) uiElements.lpFeeSpan.textContent = '0';
    if (uiElements.minReceivedSpan) uiElements.minReceivedSpan.textContent = '0';
}

async function updateSwapSection() {
    // ... (Не изменено)
    await updateSwapBalances();
    clearSwapQuote();
}

async function handleMaxAmount(event) {
    // ... (Не изменено)
    const inputId = event.target.dataset.inputId;
    const inputElement = document.getElementById(inputId);

    if (!inputElement) {
        console.warn(`Input element with ID ${inputId} not found for max amount button.`);
        return;
    }

    if (!walletPublicKey) {
        showNotification('Please connect your wallet to use MAX.', 'warning');
        return;
    }
    if (!connection) {
        connection = new SolanaWeb3.Connection(BACKUP_RPC_ENDPOINT, 'confirmed');
    }
    if (!uiElements.swapFromTokenSelect) {
        console.error("Swap from token select not found.");
        showNotification("Swap functionality UI is not fully initialized.", "error");
        return;
    }

    const fromTokenMint = TOKEN_MINT_ADDRESSES[uiElements.swapFromTokenSelect.value];
    if (!fromTokenMint) {
        showNotification('Selected "From" token is invalid.', 'error');
        return;
    }

    try {
        if (fromTokenMint.equals(TOKEN_MINT_ADDRESSES['SOL'])) {
            const solBalance = await connection.getBalance(walletPublicKey);
            // Leave a small amount for transaction fees (e.g., 0.005 SOL)
            const maxSol = (solBalance / SolanaWeb3.LAMPORTS_PER_SOL) - 0.005;
            inputElement.value = Math.max(0, maxSol).toFixed(4).replace(/\.?0+$/, ''); // Ensure non-negative and clean trailing zeros
        } else {
            const tokenAccount = await connection.getParsedTokenAccountsByOwner(
                walletPublicKey,
                { mint: fromTokenMint }
            );
            if (tokenAccount.value.length > 0) {
                const amount = tokenAccount.value[0].account.data.parsed.info.tokenAmount.amount;
                const decimals = tokenAccount.value[0].account.data.parsed.info.tokenAmount.decimals;
                inputElement.value = formatBigInt(new BN(amount), decimals);
            } else {
                inputElement.value = '0';
            }
        }
    } catch (error) {
        console.error('Error getting max token balance:', error);
        showNotification('Error getting maximum balance.', 'error');
        inputElement.value = '0'; // Reset value on error
    }
    clearSwapQuote(); // Always clear the quote when amount changes
}

function handleContactFormSubmit(e) {
    e.preventDefault();

    if (!uiElements.contactForm || !uiElements.contactNameInput || !uiElements.contactEmailInput || !uiElements.contactSubjectInput || !uiElements.contactMessageInput) {
        showNotification('Contact form elements not found.', 'error');
        return;
    }

    const name = uiElements.contactNameInput.value.trim();
    const email = uiElements.contactEmailInput.value.trim();
    const subject = uiElements.contactSubjectInput.value.trim();
    const message = uiElements.contactMessageInput.value.trim();

    let isValid = true;
    const errorMessages = [];

    if (name === '') {
        isValid = false;
        errorMessages.push('Name is required.');
    }
    if (email === '') {
        isValid = false;
        errorMessages.push('Email address is required.');
    } else if (!/\S+@\S+\.\S+/.test(email)) {
        isValid = false;
        errorMessages.push('Please enter a valid email address.');
    }
    if (message === '') {
        isValid = false;
        errorMessages.push('Message is required.');
    }

    if (isValid) {
        console.log('Contact form data (MOCK):', { name, email, subject, message });
        showNotification('Message sent successfully! (This is a simulation)', 'success', 5000);
        uiElements.contactForm.reset();
    } else {
        // Display validation errors
        showNotification(`Validation error:\n${errorMessages.join('\n')}`, 'error', 5000);
    }
}


// --- LIVE TRADING DATA AND AI FORECAST FUNCTIONS (Остаются внешними или MOCK) ---

/**
 * ✅ ИЗМЕНЕНИЕ: PSEUDO-FUNCTION: Fetches an AI-driven price forecast for AFOX (MOCK).
 */
async function fetchAIForecast(currentMarketData) {
    if (!uiElements.aiPriceForecast) return;

    uiElements.aiPriceForecast.innerHTML = '<span style="color:#aaa;">AI is calculating (MOCK)...</span>';

    // --- MOCK AI LOGIC (Simulated Heuristic) ---
    try {
        const change = parseFloat(currentMarketData.priceChange.h24);

        let forecastMessage;
        let styleColor;

        if (change > 5) {
            forecastMessage = "STRONG BUY: AI detects strong upward momentum (Bullish).";
            styleColor = 'var(--color-success, #28a745)'; // Green
        } else if (change > 0.5) {
            forecastMessage = "BUY: AI suggests a likely slight price increase.";
            styleColor = 'var(--color-info, #17a2b8)'; // Blue/Cyan
        } else if (change < -5) {
            forecastMessage = "SELL/WAIT: AI warns of strong downward pressure (Bearish).";
            styleColor = 'var(--color-error, #dc3545)'; // Red
        } else {
            forecastMessage = "NEUTRAL: AI predicts continued sideways trading (Stable).";
            styleColor = 'var(--color-warning, #ffc107)'; // Yellow
        }

        const currentPrice = parseFloat(currentMarketData.priceNative);
        const next24hPrice = (currentPrice * (1 + change / 100)).toFixed(9).replace(/\.?0+$/, '');

        // Display result in UI
        uiElements.aiPriceForecast.innerHTML = `
            <strong>24H Outlook (MOCK):</strong> <span style="color:${styleColor}; font-weight:bold;">${forecastMessage}</span><br>
            *Projected price in 24h: ≈ <span style="font-weight:bold;">${next24hPrice} SOL</span>
        `;

    } catch (error) {
        console.error("Failed to fetch AI forecast (MOCK):", error);
        uiElements.aiPriceForecast.innerHTML = 'AI Forecast: <span style="color:#dc3545;">Service Unavailable.</span>';
    }
}

/**
 * Fetches and displays trading data for the AFOX/SOL pair from Dexscreener. (Не изменено)
 */
async function fetchAndDisplayTradingData() {
    // Это внешний API, его оставляем
    const dexscreenerApiUrl = `https://api.dexscreener.com/latest/dex/tokens/${AFOX_MINT_ADDRESS_STRING}`;

    const livePriceElement = document.getElementById('livePriceAfoxSol');
    const priceChangeElement = document.getElementById('priceChange24h');
    const liquidityElement = document.getElementById('totalLiquidity');
    const chartContainer = document.getElementById('afoxChartContainer');

    // Helper to reset UI on error
    const resetUI = (message = 'N/A') => {
        if (livePriceElement) livePriceElement.textContent = message;
        if (priceChangeElement) {
            priceChangeElement.textContent = '--%';
            priceChangeElement.style.color = 'gray';
        }
        if (liquidityElement) liquidityElement.textContent = message;
        if (chartContainer) chartContainer.innerHTML = `<p class="placeholder-item">Failed to load chart.</p>`;
        if (uiElements.aiPriceForecast) uiElements.aiPriceForecast.innerHTML = 'AI Forecast: <span style="color:#dc3545;">No Data.</span>'; // Reset AI on error
    };

    try {
        const response = await fetch(dexscreenerApiUrl);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();

        if (!data.pairs || data.pairs.length === 0) {
            resetUI();
            console.warn("AFOX/SOL pair not found on Dexscreener.");
            showNotification("AFOX/SOL trading pair not found.", 'warning', 3000);
            return;
        }

        const pair = data.pairs.find(p => p.quoteToken.symbol === 'SOL') || data.pairs[0];

        const priceSol = parseFloat(pair.priceNative).toFixed(9).replace(/\.?0+$/, '');
        const priceChange24h = parseFloat(pair.priceChange.h24).toFixed(2);
        const liquidityUsd = Math.round(pair.liquidity.usd).toLocaleString('en-US');

        if (livePriceElement) livePriceElement.textContent = priceSol;
        if (liquidityElement) liquidityElement.textContent = `$${liquidityUsd}`;

        if (priceChangeElement) {
            priceChangeElement.textContent = `${priceChange24h}%`;
            if (priceChange24h > 0) {
                priceChangeElement.style.color = 'var(--color-success, green)';
            } else if (priceChange24h < 0) {
                priceChangeElement.style.color = 'var(--color-error, red)';
            } else {
                 priceChangeElement.style.color = 'var(--color-info, gray)';
            }
        }

        if (chartContainer) {
             chartContainer.innerHTML = `
                <iframe
                    src="https://widget.dexscreener.com/embed/solana/${pair.pairAddress}?module=chart&theme=dark"
                    width="100%"
                    height="300"
                    style="border-radius: 10px; border: 1px solid #333;"
                    frameborder="0"
                    title="AFOX/SOL Trading Chart"
                ></iframe>
            `;
        }

        // ✅ AI INTEGRATION: Call the AI forecast function
        await fetchAIForecast(pair);

    } catch (error) {
        console.error("Failed to fetch trading data:", error);
        resetUI('Error');
        showNotification(`Failed to load trading data (Dexscreener): ${error.message}`, 'error', 5000);
    }
}

// --- DOMContentLoaded EXECUTION (Не изменено, кроме добавления loadMarketplaceNFTs) ---

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Initialize UI elements and cache references
    cacheUIElements();

    // ✅ iFrame OVERLAY FIX: Cache the chart container element globally
    birdeyeContainer = document.getElementById('afoxChartContainer');

    // 2. Setup all event listeners
    initializeEventListeners();

    // 3. Initialize Jupiter Terminal for the swap section
    initializeJupiterTerminal();

    // 4. --- Initial Data Loads on Page Ready & Auto-Connect ---
    await Promise.all([
        loadAnnouncements(),
        loadGames(),
        loadAds(),
        loadMarketplaceNFTs()
    ]);

    // Attempt to auto-connect wallet
    try {
        const selectedWallet = WALLETS[0];
        if (selectedWallet && selectedWallet.connected && selectedWallet.publicKey) {
            walletPublicKey = selectedWallet.publicKey;
            provider = selectedWallet;
            connection = new SolanaWeb3.Connection(BACKUP_RPC_ENDPOINT, 'confirmed');

            updateWalletUI(walletPublicKey.toBase58());

            // ✅ ДОБАВЛЕНИЕ: Обновление владельцев моковых NFT при автоподключении
            MOCK_DB.nfts.forEach(nft => {
                if (nft.owner === 'NO_WALLET_CONNECTED') {
                    nft.owner = walletPublicKey.toBase58();
                }
            });
            persistMockData();
            // ---------------------------------------------------------------------

            // Load all user-specific data
            await Promise.all([
                loadUserNFTs(walletPublicKey.toBase58()),
                updateStakingUI(),
                updateSwapBalances()
            ]);
            registerProviderListeners();
            showNotification('Wallet automatically connected!', 'success');
        } else {
            handleWalletDisconnect();
        }
    } catch (e) {
        console.warn("Auto-connect failed or wallet not found/authorized:", e);
        handleWalletDisconnect();
    }

    // 5. Launching the load of real-time trading data (and AI forecast)
    fetchAndDisplayTradingData();

    // Optional: Refresh data every 60 seconds
    setInterval(fetchAndDisplayTradingData, 60000);

    // Final Mobile Menu Fix (Ensuring scroll lock is handled by the first event listener block)
    const menuToggle = document.getElementById('menuToggle');
    const mainNav = document.getElementById('mainNav');
    if (menuToggle && mainNav) {
        const toggleMenu = () => {
             const isActive = mainNav.classList.contains('active');
             document.body.classList.toggle('menu-open', !isActive);
        };
        menuToggle.addEventListener('click', toggleMenu);
        mainNav.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                if (mainNav.classList.contains('active')) {
                    document.body.classList.remove('menu-open');
                }
            });
        });
        if (uiElements.closeMainMenuCross) {
             uiElements.closeMainMenuCross.addEventListener('click', () => {
                 document.body.classList.remove('menu-open');
             });
        }
    }
});
