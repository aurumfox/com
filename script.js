// AFOX Contract Address (Mint)
const AFOX_MINT = 'GLkewtq8s2Yr24o5LT5mzzEeccKuSsy8H5RCHaE9uRAd';
// SOL Mint Address (Native Token)
const SOL_MINT = 'So11111111111111111111111111111111111111112';

// ------------------------------------------------------------------
// **RPC Fix Configuration**
// Using a better-performing RPC for Jupiter (Helius/custom) or a public one.
// We prioritize a robust one for the terminal.
// ------------------------------------------------------------------
const JUPITER_RPC_ENDPOINT = 'https://rpc.jup.ag'; // Jupiter's recommended RPC (often Helius)
const BACKUP_RPC_ENDPOINT = 'https://api.mainnet-beta.solana.com';

// State variables for chart overlay fix
let birdeyeContainer = null;
let birdeyeContainerOriginalDisplay = 'block'; // To store the original display style

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
    // **RPC Fix Implementation**
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
                setTimeout(callback, 50); 
            },

            // ✅ iFrame OVERLAY FIX: Restore chart after closing wallet modal
            onSuccess: () => {
                 restoreBirdeyeChart();
            },
            onError: (error) => {
                 console.error("Jupiter Terminal error:", error);
                 // If RPC failure, try re-initializing with the backup RPC
                 if (error && error.message.includes("RPC") && !useBackupRpc) {
                    console.warn("RPC failed. Retrying Jupiter Terminal initialization with backup RPC.");
                    // Attempt re-initialization with the backup RPC
                    // Note: This might require destroying the current instance first in a real setup.
                    // For a simple widget, we'll just try to re-init.
                    // initializeJupiterTerminal(true); // Self-call to retry. Disabled for now to avoid loop.
                 }
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


// --- REST OF YOUR CODE (Unchanged boilerplate for context) ---

// --- Imports (Conceptual, if using ES6 Modules) ---
const SolanaWeb3 = window.SolanaWeb3;
const SolanaWalletAdapterPhantom = window.SolanaWalletAdapterPhantom;
const SolanaToken = window.SolanaToken;
const BN = window.BN; 

// --- CONSTANTS AND SETTINGS ---
const AFOX_TOKEN_MINT_ADDRESS = new SolanaWeb3.PublicKey('GLkewtq8s2Yr24o5LT5mzzEeccKuSsy8H5RCHaE9uRAd');
const STAKING_PROGRAM_ID = new SolanaWeb3.PublicKey('3GcDUxoH4yhFeM3aBkaUfjNu7xGTat8ojXLPHttz2o9f');
const JUPITER_API_URL = 'https://quote-api.jup.ag/v6';
const API_BASE_URL = 'http://localhost:3000'; // For local development

// Mint addresses for tokens supported in the swap functionality
const TOKEN_MINT_ADDRESSES = {
    'SOL': new SolanaWeb3.PublicKey('So11111111111111111111111111111111111111112'),
    'AFOX': AFOX_TOKEN_MINT_ADDRESS,
};

const AFOX_DECIMALS = 6; 
const SOL_DECIMALS = 9;

const NETWORK = SolanaWeb3.WalletAdapterNetwork.Devnet; // Change to 'Mainnet-beta' for production

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

// --- UI ELEMENT CACHING ---
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
};

/**
 * Initializes UI element references. Called once on DOMContentLoaded.
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
}

// --- HELPER UTILITIES ---

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
        bnAmount = new BN(amount);
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

// --- WALLET CONNECTION & STATE MANAGEMENT ---

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
        // Trigger reloads for all sections with a slight delay to avoid UI flicker
        await Promise.all([
            loadUserNFTs(walletPublicKey.toBase58()),
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

        // Load data for all sections
        await Promise.all([
            loadUserNFTs(walletPublicKey.toBase58()),
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
 * Handles the logic for wallet disconnection, resetting UI and data.
 */
function handleWalletDisconnect() {
    walletPublicKey = null;
    provider = null;
    connection = null; // Reset connection to force re-initialization on next connect
    updateWalletUI(null);

    // Reset NFT section
    if (uiElements.userNftList) uiElements.userNftList.innerHTML = '<p class="placeholder-item web3-placeholder">Connect your wallet to see your NFTs.</p>';
    if (uiElements.nftToSellSelect) uiElements.nftToSellSelect.innerHTML = '<option value="">-- Select NFT --</option>';

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


// --- SWAP FUNCTIONS ---

/**
 * Fetches the token decimals for a given mint address.
 * In a real app, this might involve fetching from a token list or a dedicated API.
 * For this example, we use predefined decimals or a fallback.
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
                    uiElements.swapFromBalanceSpan.textContent = `${formatBigInt(new BN(amount), decimals)} ${uiElements.swapFromTokenSelect.value}`;
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
 * Fetches a swap quote from Jupiter Aggregator.
 */
async function getQuote() {
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
    // Convert float amount to BigNumber string for Jupiter API
    const inputAmountLamports = new BN(amount * (10 ** decimalsFrom)).toString();

    showNotification('Getting the best swap quote...', 'info');
    if (uiElements.getQuoteBtn) uiElements.getQuoteBtn.disabled = true;
    if (uiElements.executeSwapBtn) uiElements.executeSwapBtn.style.display = 'none';

    try {
        const response = await fetch(`${JUPITER_API_URL}/quote?inputMint=${fromMint.toBase58()}&outputMint=${toMint.toBase58()}&amount=${inputAmountLamports}&slippageBps=50`); // 0.5% slippage
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Failed to get quote: ${errorData.error || response.statusText}`);
        }
        const data = await response.json();
        currentJupiterQuote = data;

        const outputDecimals = getTokenDecimals(toMint);

        if (uiElements.swapToAmountInput) uiElements.swapToAmountInput.value = formatBigInt(new BN(currentJupiterQuote.outAmount), outputDecimals);
        if (uiElements.priceImpactSpan) uiElements.priceImpactSpan.textContent = `${(currentJupiterQuote.priceImpactPct * 100).toFixed(2)}%`;
        if (uiElements.lpFeeSpan) uiElements.lpFeeSpan.textContent = `${formatBigInt(new BN(currentJupiterQuote.lpFee.amount), outputDecimals)} ${uiElements.swapToTokenSelect.value}`;
        // Jupiter's `otherAmountThreshold` is already in "lamports" based on output token decimals
        if (uiElements.minReceivedSpan) uiElements.minReceivedSpan.textContent = `${formatBigInt(new BN(currentJupiterQuote.otherAmountThreshold), outputDecimals)} ${uiElements.swapToTokenSelect.value}`;

        showNotification('Quote successfully received!', 'success');
        if (uiElements.executeSwapBtn) uiElements.executeSwapBtn.style.display = 'block';
    } catch (error) {
        console.error('Error fetching quote:', error);
        showNotification(`Error fetching quote: ${error.message}. Please try again.`, 'error');
        currentJupiterQuote = null;
        // Clear all quote-related display fields
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
 * Executes the swap transaction via Jupiter Aggregator.
 */
async function executeSwap() {
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
    } finally {
        if (uiElements.executeSwapBtn) uiElements.executeSwapBtn.disabled = false;
    }
}


// --- NFT DISPLAY & ACTIONS (Unchanged boilerplate for context) ---

/**
 * Loads and displays NFTs owned by the connected user.
 * @param {string} walletAddress - The public key of the connected wallet.
 */
async function loadUserNFTs(walletAddress) {
    if (!uiElements.userNftList) return;

    uiElements.userNftList.innerHTML = '<p class="placeholder-item web3-placeholder">Loading your NFTs...</p>';
    if (uiElements.nftToSellSelect) uiElements.nftToSellSelect.innerHTML = '<option value="">-- Select NFT --</option>';

    try {
        const response = await fetch(`${API_BASE_URL}/api/nfts/marketplace`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        // Ensure data.nfts exists and is an array before filtering
        const userOwnedNfts = Array.isArray(data.nfts) ? data.nfts.filter(nft => nft.owner === walletAddress && !nft.isListed) : [];

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
            nftItem.addEventListener('click', () => showNftDetails(nft));
            uiElements.userNftList.appendChild(nftItem);

            if (uiElements.nftToSellSelect) {
                const option = document.createElement('option');
                option.value = nft.mint;
                option.textContent = nft.name;
                uiElements.nftToSellSelect.appendChild(option);
            }
        });

    } catch (error) {
        console.error('Error loading user NFTs:', error);
        showNotification(`Failed to load your NFTs: ${error.message}.`, 'error');
        uiElements.userNftList.innerHTML = `<p class="placeholder-item web3-placeholder">Error loading NFTs: ${error.message}.</p>`;
    }
}

/**
 * Loads and displays NFTs listed on the marketplace.
 */
async function loadMarketplaceNFTs() {
    if (!uiElements.marketplaceNftList) return;

    uiElements.marketplaceNftList.innerHTML = '<p class="placeholder-item web3-placeholder">Loading marketplace NFTs...</p>';

    try {
        const response = await fetch(`${API_BASE_URL}/api/nfts/marketplace`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        const listedNfts = Array.isArray(data.nfts) ? data.nfts.filter(nft => nft.price && nft.isListed) : [];

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
            nftItem.addEventListener('click', () => showNftDetails(nft));
            uiElements.marketplaceNftList.appendChild(nftItem);
        });

    } catch (error) {
        console.error('Error loading marketplace NFTs:', error);
        showNotification(`Failed to load marketplace NFTs: ${error.message}.`, 'error');
        uiElements.marketplaceNftList.innerHTML = `<p class="placeholder-item web3-placeholder">Error loading marketplace NFTs: ${error.message}.</p>`;
    }
}

/**
 * Displays the NFT details modal and populates its content.
 * @param {object} nft - The NFT object to display.
 */
window.showNftDetails = async function(nft) {
    if (!uiElements.nftDetailsModal) return;

    closeAllPopups();
    currentOpenNft = nft; // Store the NFT object for actions

    // Populate static NFT details
    if (uiElements.nftDetailImage) uiElements.nftDetailImage.src = nft.image || 'https://via.placeholder.com/250x150?text=NFT';
    if (uiElements.nftDetailName) uiElements.nftDetailName.textContent = nft.name || 'Untitled NFT';
    if (uiElements.nftDetailDescription) uiElements.nftDetailDescription.textContent = nft.description || 'No description provided.';
    if (uiElements.nftDetailOwner) uiElements.nftDetailOwner.textContent = nft.owner || 'Unknown';
    if (uiElements.nftDetailMint) uiElements.nftDetailMint.textContent = nft.mint || 'N/A';
    if (uiElements.nftDetailSolscanLink) {
        uiElements.nftDetailSolscanLink.href = nft.mint ? `https://solscan.io/token/${nft.mint}?cluster=${NETWORK.toLowerCase()}` : '#';
        uiElements.nftDetailSolscanLink.style.display = nft.mint ? 'inline-block' : 'none';
    }

    // Populate attributes list
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

    // Show/hide action buttons based on ownership and listing status
    // Set all to none first to ensure correct state
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
        uiElements.nftDetailBuyBtn.style.display = 'inline-block';
    }

    uiElements.nftDetailsModal.style.display = 'flex'; // Display the modal

    // Load NFT transaction history
    if (uiElements.nftDetailHistory && nft.mint) {
        uiElements.nftDetailHistory.textContent = 'Loading history...';
        try {
            const historyResponse = await fetch(`${API_BASE_URL}/api/nfts/${nft.mint}/history`);
            if (!historyResponse.ok) {
                const errorData = await historyResponse.json();
                throw new Error(errorData.error || `Failed to get history: ${historyResponse.status}`);
            }
            const historyData = await historyResponse.json();

            if (historyData && historyData.length > 0) {
                uiElements.nftDetailHistory.innerHTML = '<h4>Transaction History:</h4>';
                // Sort by date in descending order (most recent first)
                historyData.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

                historyData.forEach(event => {
                    const p = document.createElement('p');
                    let eventText = `${new Date(event.timestamp).toLocaleString()}: `;
                    // Use optional chaining and nullish coalescing for robustness
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
            console.error('Error loading NFT history for modal:', error);
            showNotification(`Error loading NFT history: ${error.message}.`, 'error');
            uiElements.nftDetailHistory.textContent = `Error loading history: ${error.message}.`;
        }
    }
};

// --- STAKING FUNCTIONS (Unchanged boilerplate for context) ---

/**
 * Updates all staking data in the UI.
 */
async function updateStakingUI() {
    // Reset UI if wallet is disconnected or no data can be fetched
    if (!walletPublicKey) {
        if (uiElements.userAfoxBalance) uiElements.userAfoxBalance.textContent = '0 AFOX';
        if (uiElements.userStakedAmount) uiElements.userStakedAmount.textContent = '0 AFOX';
        if (uiElements.userRewardsAmount) uiElements.userRewardsAmount.textContent = '0 AFOX';
        if (uiElements.stakingApr) uiElements.stakingApr.textContent = '--%';
        if (uiElements.minStakeAmountDisplay) uiElements.minStakeAmountDisplay.textContent = '1 AFOX';
        if (uiElements.lockupPeriodDisplay) uiElements.lockupPeriodDisplay.textContent = '0 days (flexible)';
        if (uiElements.unstakeFeeDisplay) uiElements.unstakeFeeDisplay.textContent = '0%';
        if (uiElements.rewardCalculationDisplay) uiElements.rewardCalculationDisplay.textContent = 'Daily';
        return;
    }

    // Ensure connection is active
    if (!connection) {
        connection = new SolanaWeb3.Connection(BACKUP_RPC_ENDPOINT, 'confirmed');
    }

    try {
        // Fetch AFOX balance
        let afoxBalance = 0;
        try {
            const userAfoxTokenAccountPubKey = await SolanaToken.getAssociatedTokenAddress(
                AFOX_TOKEN_MINT_ADDRESS,
                walletPublicKey
            );
            const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
                walletPublicKey,
                { mint: AFOX_TOKEN_MINT_ADDRESS }
            );

            if (tokenAccounts.value.length > 0) {
                afoxBalance = tokenAccounts.value[0].account.data.parsed.info.tokenAmount.uiAmount;
            }
        } catch (tokenError) {
            // This warning is fine if the user simply doesn't have an AFOX token account yet.
            console.warn('Failed to get AFOX token balance (possibly no token account):', tokenError.message);
            afoxBalance = 0;
        }
        if (uiElements.userAfoxBalance) uiElements.userAfoxBalance.textContent = `${afoxBalance} AFOX`;

        // Fetch user staking account info
        const userStakingAccount = await getUserStakingAccount(walletPublicKey);
        if (userStakingAccount) {
            if (uiElements.userStakedAmount) uiElements.userStakedAmount.textContent = `${userStakingAccount.stakedAmount} AFOX`;
            if (uiElements.userRewardsAmount) uiElements.userRewardsAmount.textContent = `${userStakingAccount.rewards} AFOX`;
        } else {
            // Set to zero if account does not exist or fetch failed
            if (uiElements.userStakedAmount) uiElements.userStakedAmount.textContent = '0 AFOX';
            if (uiElements.userRewardsAmount) uiElements.userRewardsAmount.textContent = '0 AFOX';
        }

        // Fetch staking pool info
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
 * PSEUDO-FUNCTION: Gets user's staking account information.
 * This needs to be replaced with actual Solana program interaction (e.g., using Anchor or raw Web3.js).
 * @param {SolanaWeb3.PublicKey} userPublicKey
 * @returns {Promise<{stakedAmount: number, rewards: number} | null>}
 */
async function getUserStakingAccount(userPublicKey) {
    if (!connection) return null; // Ensure connection is available

    try {
        const [userStakingAccountPubKey] = SolanaWeb3.PublicKey.findProgramAddressSync(
            [userPublicKey.toBuffer(), Buffer.from("stake_account_seed")],
            STAKING_PROGRAM_ID
        );

        const accountInfo = await connection.getAccountInfo(userStakingAccountPubKey);

        if (accountInfo && accountInfo.data) {
            // !!! IMPORTANT: Replace this with actual deserialization based on your smart contract's account structure.
            console.warn("Staking user account data deserialization is a placeholder. Implement actual smart contract interaction.");
            // Mock data for demonstration:
            return { stakedAmount: 100, rewards: 1.5 }; // Example mock
        } else {
            // Return default/zero values if account doesn't exist
            return { stakedAmount: 0, rewards: 0 };
        }
    } catch (error) {
        console.error("Error getting user staking account (might not exist or deserialization issue):", error);
        return null;
    }
}

/**
 * PSEUDO-FUNCTION: Gets staking pool information.
 * This needs to be replaced with actual Solana program interaction.
 * @returns {Promise<{apr: number, minStake: number, lockupDays: number, unstakeFee: number, rewardCalcMethod: string} | null>}
 */
async function getStakingPoolInfo() {
    if (!connection) return null; // Ensure connection is available

    try {
        const [poolAccountPubKey] = SolanaWeb3.PublicKey.findProgramAddressSync(
            [Buffer.from("pool_config_seed")],
            STAKING_PROGRAM_ID
        );

        const accountInfo = await connection.getAccountInfo(poolAccountPubKey);

        if (accountInfo && accountInfo.data) {
            // !!! IMPORTANT: Replace this with actual deserialization based on your smart contract's account structure.
            console.warn("Staking pool data deserialization is a placeholder. Implement actual smart contract interaction.");
            // Mock data for demonstration:
            return { apr: 10, minStake: 5, lockupDays: 30, unstakeFee: 0.5, rewardCalcMethod: "Daily" }; // Example mock
        } else {
            // Return default values if pool config doesn't exist
            return { apr: 0, minStake: 0, lockupDays: 0, unstakeFee: 0, rewardCalcMethod: "N/A" };
        }
    } catch (error) {
        console.error("Error getting staking pool information (might not exist or deserialization issue):", error);
        return null;
    }
}


// --- DYNAMIC CONTENT LOADING (ANNOUNCEMENTS, GAMES, ADS) (Unchanged boilerplate for context) ---

async function loadAnnouncements() {
    if (!uiElements.announcementsList) return;
    uiElements.announcementsList.innerHTML = '<p class="placeholder-item">Loading announcements...</p>';
    try {
        const response = await fetch(`${API_BASE_URL}/api/announcements`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
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
        console.error('Error loading announcements:', error);
        showNotification(`Failed to load announcements: ${error.message}.`, 'error');
        uiElements.announcementsList.innerHTML = '<p class="placeholder-item">Failed to load announcements.</p>';
    }
}

async function loadGames() {
    if (!uiElements.gameList) return;
    uiElements.gameList.innerHTML = '<p class="placeholder-item web3-placeholder">Loading games...</p>';
    try {
        const response = await fetch(`${API_BASE_URL}/api/games`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
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
        console.error('Error loading games:', error);
        showNotification(`Failed to load games: ${error.message}.`, 'error');
        uiElements.gameList.innerHTML = '<p class="placeholder-item web3-placeholder">Failed to load games.</p>';
    }
}

async function loadAds() {
    if (!uiElements.adList) return;
    uiElements.adList.innerHTML = '<p class="placeholder-item ad web3-placeholder">Loading ads...</p>';
    try {
        const response = await fetch(`${API_BASE_URL}/api/ads`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
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
        console.error('Error loading ads:', error);
        showNotification(`Failed to load ads: ${error.message}.`, 'error');
        uiElements.adList.innerHTML = '<p class="placeholder-item ad web3-placeholder">Failed to load ads.</p>';
    }
}


// --- EVENT LISTENERS INITIALIZATION (Unchanged boilerplate for context) ---

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
            // If mainNav is not already active, close other popups before opening
            if (uiElements.mainNav && !uiElements.mainNav.classList.contains('active')) {
                closeAllPopups();
            }
            if (uiElements.mainNav) uiElements.mainNav.classList.toggle('active');
            uiElements.menuToggle.classList.toggle('active');
        });
    }

    // Nav links (for closing menu after click)
    uiElements.navLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (uiElements.mainNav && uiElements.mainNav.classList.contains('active')) {
                uiElements.mainNav.classList.remove('active');
                if (uiElements.menuToggle) uiElements.menuToggle.classList.remove('active');
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
            showNotification('Game upload is a placeholder. Implement backend logic for file uploads and database storage.', 'info', 5000);
        });
    }
    if (uiElements.postAdBtnWeb3) {
        uiElements.postAdBtnWeb3.addEventListener('click', () => {
            showNotification('Ad posting is a placeholder. Implement backend logic for handling ad creatives and details.', 'info', 5000);
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

// --- Specific Event Handler Functions (Unchanged boilerplate for context) ---

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
    formData.append('creatorWallet', walletPublicKey.toBase58());

    try {
        showNotification('Minting NFT (simulation)...', 'info', 5000);
        const response = await fetch(`${API_BASE_URL}/api/nfts/prepare-mint`, {
            method: 'POST',
            body: formData, // FormData sends as multipart/form-data
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        showNotification(`NFT successfully minted (simulation)! Metadata URI: ${result.uri}, Mint Address: ${result.mintAddress}`, 'success', 7000);
        uiElements.mintNftForm.reset();
        await Promise.all([
            loadUserNFTs(walletPublicKey.toBase58()),
            loadMarketplaceNFTs()
        ]);
        if (uiElements.mintNftModal) uiElements.mintNftModal.style.display = 'none'; // Close modal after successful mint
    } catch (error) {
        console.error('Error minting NFT:', error);
        showNotification(`Failed to mint NFT: ${error.message}`, 'error');
    }
}

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
    if (isNaN(listingDuration) || listingDuration <= 0) {
        showNotification('Please enter a valid listing duration (greater than 0).', 'warning');
        return;
    }

    try {
        showNotification('Listing NFT for sale...', 'info');
        const response = await fetch(`${API_BASE_URL}/api/nfts/list`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                mintAddress: mintAddress,
                price: salePrice,
                duration: listingDuration,
                sellerWallet: walletPublicKey.toBase58(),
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        showNotification(result.message, 'success');
        uiElements.listNftForm.reset();
        await Promise.all([
            loadUserNFTs(walletPublicKey.toBase58()),
            loadMarketplaceNFTs()
        ]);
    } catch (error) {
        console.error('Error listing NFT for sale:', error);
        showNotification(`Failed to list NFT for sale: ${error.message}`, 'error');
    }
}

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
        showNotification('Publishing announcement...', 'info');
        const response = await fetch(`${API_BASE_URL}/api/announcements`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: text, date: new Date().toISOString() })
        });
        if (response.ok) {
            uiElements.announcementInput.value = '';
            await loadAnnouncements();
            showNotification('Announcement published successfully!', 'success');
        } else {
            const errorData = await response.json();
            showNotification(`Failed to publish announcement: ${errorData.error || response.statusText}. (Admin only in a real application)`, 'error');
        }
    } catch (error) {
        console.error('Error publishing announcement:', error);
        showNotification('Server connection error while publishing announcement.', 'error');
    } finally {
        uiElements.publishButton.disabled = false; // Re-enable button
    }
}

async function handleStakeAfox() {
    if (!walletPublicKey) {
        showNotification('Please connect your wallet to stake.', 'warning');
        return;
    }
    if (!connection) {
        showNotification('Solana connection not established. Please connect your wallet again.', 'error');
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

    try {
        uiElements.stakeAfoxBtn.disabled = true;
        showNotification(`Initiating staking of ${amount} AFOX...`, 'info', 5000);

        const [userStakingAccountPubKey] = SolanaWeb3.PublicKey.findProgramAddressSync(
            [walletPublicKey.toBuffer(), Buffer.from("stake_account_seed")],
            STAKING_PROGRAM_ID
        );
        const [poolAccountPubKey] = SolanaWeb3.PublicKey.findProgramAddressSync(
            [Buffer.from("pool_config_seed")],
            STAKING_PROGRAM_ID
        );

        const userAfoxTokenAccountPubKey = await SolanaToken.getAssociatedTokenAddress(
            AFOX_TOKEN_MINT_ADDRESS,
            walletPublicKey
        );

        // Check user AFOX balance
        let userAfoxBalanceInfo;
        try {
            userAfoxBalanceInfo = await connection.getTokenAccountBalance(userAfoxTokenAccountPubKey);
        } catch (e) {
            // This error implies the ATA might not exist or connection issue.
            // If the ATA doesn't exist, balance is effectively 0 for the purpose of staking.
            throw new Error(`Failed to fetch AFOX token account for user. Does it exist? ${e.message}`);
        }

        if (userAfoxBalanceInfo.value.uiAmount < amount) {
            showNotification('Insufficient AFOX balance for staking.', 'error');
            return;
        }

        const transaction = new SolanaWeb3.Transaction();

        // If user's staking account doesn't exist, create it.
        const userStakingAccountInfo = await connection.getAccountInfo(userStakingAccountPubKey);
        if (!userStakingAccountInfo) {
            // !!! IMPORTANT: Replace `space` with the exact size of your `UserStakeAccount` struct in bytes.
            const space = 8 + 8 + 8 + 32 + 8 + 8 + 8; // Example: discriminator (8) + stakedAmount (8) + rewards (8) + owner (32) + lastStakeTime (8) + lockupEnd (8) + padding... (this will vary)
            const lamports = await connection.getMinimumBalanceForRentExemption(space);
            transaction.add(
                SolanaWeb3.SystemProgram.createAccount({
                    fromPubkey: walletPublicKey,
                    newAccountPubkey: userStakingAccountPubKey,
                    lamports,
                    space,
                    programId: STAKING_PROGRAM_ID,
                })
            );
        }

        const stakeAmountBN = new BN(amount * (10 ** AFOX_DECIMALS));

        // !!! IMPORTANT: Replace this with your actual instruction from your staking program.
        transaction.add({
            keys: [
                { pubkey: walletPublicKey, isSigner: true, isWritable: false },
                { pubkey: poolAccountPubKey, isSigner: false, isWritable: true },
                { pubkey: userStakingAccountPubKey, isSigner: false, isWritable: true },
                { pubkey: AFOX_TOKEN_MINT_ADDRESS, isSigner: false, isWritable: false }, // Token mint
                { pubkey: userAfoxTokenAccountPubKey, isSigner: false, isWritable: true }, // User's AFOX ATA
                // You might need a program derived address (PDA) for the pool's token account if it holds the staked tokens
                { pubkey: SolanaToken.TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
                { pubkey: SolanaWeb3.SystemProgram.programId, isSigner: false, isWritable: false },
                { pubkey: SolanaWeb3.SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
            ],
            programId: STAKING_PROGRAM_ID,
            // Example instruction data: assumes a simple "stake" instruction with a u64 amount
            data: Buffer.from([0, ...stakeAmountBN.toArray('le', 8)]),
        });

        transaction.recentBlockhash = (await connection.getLatestBlockhash('finalized')).blockhash;
        transaction.feePayer = walletPublicKey;

        const signature = await provider.sendAndConfirm(transaction);
        console.log("Staking transaction successful:", signature);

        showNotification(`You successfully staked ${amount} AFOX! Transaction ID: ${signature}`, 'success', 7000);
        if (uiElements.stakeAmountInput) uiElements.stakeAmountInput.value = '';
        await updateStakingUI();
        await updateSwapBalances(); // Staking affects AFOX balance
    } catch (error) {
        console.error('Error during staking:', error);
        showNotification(`Failed to stake tokens: ${error.message}. See console for details.`, 'error');
    } finally {
        if (uiElements.stakeAfoxBtn) uiElements.stakeAfoxBtn.disabled = false;
    }
}

async function handleClaimRewards() {
    if (!walletPublicKey) {
        showNotification('Please connect your wallet to claim rewards.', 'warning');
        return;
    }
    if (!connection) {
        showNotification('Solana connection not established. Please connect your wallet again.', 'error');
        return;
    }
    if (!provider) {
        showNotification('Wallet provider not found. Please reconnect your wallet.', 'error');
        return;
    }

    showNotification('Attempting to claim rewards...', 'info');
    try {
        if (uiElements.claimRewardsBtn) uiElements.claimRewardsBtn.disabled = true;

        // !!! IMPORTANT: Implement actual claim rewards transaction here.
        console.warn("Claim rewards functionality is a placeholder. Implement actual smart contract interaction.");

        const signature = "MOCK_SIGNATURE_CLAIM_REWARDS"; // Mock signature for demo

        showNotification(`Rewards successfully claimed! Transaction ID: ${signature} (Requires staking smart contract implementation)`, 'success', 5000);
        await updateStakingUI();
        await updateSwapBalances(); // Claiming rewards affects balance
    } catch (error) {
        console.error('Error claiming rewards:', error);
        showNotification(`Failed to claim rewards: ${error.message}. Check console.`, 'error');
    } finally {
        if (uiElements.claimRewardsBtn) uiElements.claimRewardsBtn.disabled = false;
    }
}

async function handleUnstakeAfox() {
    if (!walletPublicKey) {
        showNotification('Please connect your wallet.', 'warning');
        return;
    }
    if (!connection) {
        showNotification('Solana connection not established. Please connect your wallet again.', 'error');
        return;
    }
    if (!provider) {
        showNotification('Wallet provider not found. Please reconnect your wallet.', 'error');
        return;
    }

    showNotification('Attempting to unstake tokens...', 'info');
    try {
        if (uiElements.unstakeAfoxBtn) uiElements.unstakeAfoxBtn.disabled = true;

        // !!! IMPORTANT: Implement actual unstake transaction here.
        console.warn("Unstake functionality is a placeholder. Implement actual smart contract interaction.");

        const signature = "MOCK_SIGNATURE_UNSTAKE"; // Mock signature for demo


        showNotification(`Staked tokens successfully unstaked! Transaction ID: ${signature} (Requires staking smart contract implementation)`, 'success', 5000);
        await updateStakingUI();
        await updateSwapBalances(); // Unstaking affects AFOX balance
    } catch (error) {
        console.error('Error unstaking tokens:', error);
        showNotification(`Failed to unstake tokens: ${error.message}. Check console.`, 'error');
    } finally {
        if (uiElements.unstakeAfoxBtn) uiElements.unstakeAfoxBtn.disabled = false;
    }
}

async function handleBuyNft() {
    if (!walletPublicKey) {
        showNotification('Please connect your wallet to buy an NFT.', 'warning');
        return;
    }
    if (!currentOpenNft) {
        showNotification('No NFT selected for purchase.', 'warning');
        return;
    }
    if (currentOpenNft.owner === walletPublicKey.toBase58()) {
        showNotification('You cannot buy your own NFT.', 'warning');
        return;
    }
    if (!currentOpenNft.isListed || !currentOpenNft.price) {
        showNotification('This NFT is no longer listed for sale or has no price.', 'error');
        return;
    }
    if (!connection) {
        connection = new SolanaWeb3.Connection(BACKUP_RPC_ENDPOINT, 'confirmed');
    }
    if (!provider) {
        showNotification('Wallet provider not found. Please reconnect your wallet.', 'error');
        return;
    }
    if (!uiElements.nftDetailBuyBtn) {
        showNotification('Buy button not found.', 'error');
        return;
    }

    try {
        uiElements.nftDetailBuyBtn.disabled = true; // Disable button during purchase
        showNotification(`Buying ${currentOpenNft.name} for ${currentOpenNft.price} SOL...`, 'info', 5000);

        const response = await fetch(`${API_BASE_URL}/api/nfts/buy`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                mintAddress: currentOpenNft.mint,
                buyerWallet: walletPublicKey.toBase58(),
                sellerWallet: currentOpenNft.owner,
                price: currentOpenNft.price
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP error during purchase: ${response.status}`);
        }
        const transactionData = await response.json();

        // Reconstruct transaction from base64 string provided by backend
        const transaction = SolanaWeb3.Transaction.from(Buffer.from(transactionData.serializedTransaction, 'base64'));
        transaction.recentBlockhash = (await connection.getLatestBlockhash('finalized')).blockhash;
        transaction.feePayer = walletPublicKey; // Ensure feePayer is set to the buyer

        // Send and confirm the transaction
        const signature = await provider.sendAndConfirm(transaction);
        console.log("NFT purchase transaction successful:", signature);

        showNotification(`Successfully purchased ${currentOpenNft.name}! Transaction ID: ${signature}`, 'success', 7000);
        if (uiElements.nftDetailsModal) uiElements.nftDetailsModal.style.display = 'none';
        await Promise.all([
            loadMarketplaceNFTs(),
            loadUserNFTs(walletPublicKey.toBase58()),
            updateSwapBalances() // SOL balance might change due to purchase
        ]);
        currentOpenNft = null; // Clear the currently open NFT
    } catch (error) {
        console.error('Error purchasing NFT:', error);
        showNotification(`Failed to purchase NFT: ${error.message}. Check console.`, 'error');
    } finally {
        if (uiElements.nftDetailBuyBtn) uiElements.nftDetailBuyBtn.disabled = false; // Re-enable button
    }
}

async function handleTransferNft() {
    if (!walletPublicKey) {
        showNotification('Please connect your wallet to transfer an NFT.', 'warning');
        return;
    }
    if (!currentOpenNft) {
        showNotification('No NFT selected for transfer.', 'warning');
        return;
    }
    if (currentOpenNft.owner !== walletPublicKey.toBase58()) {
        showNotification('You are not the owner of this NFT to transfer it.', 'warning');
        return;
    }
    if (!connection) {
        connection = new SolanaWeb3.Connection(BACKUP_RPC_ENDPOINT, 'confirmed');
    }
    if (!provider) {
        showNotification('Wallet provider not found. Please reconnect your wallet.', 'error');
        return;
    }
    if (!uiElements.nftDetailTransferBtn) {
        showNotification('Transfer button not found.', 'error');
        return;
    }

    const recipientAddress = prompt("Enter the recipient's public address for the NFT:");
    if (!recipientAddress) {
        showNotification('Transfer cancelled. Recipient address not provided.', 'info');
        return;
    }
    let recipientPublicKey;
    try {
        recipientPublicKey = new SolanaWeb3.PublicKey(recipientAddress);
        if (recipientPublicKey.toBase58() === walletPublicKey.toBase58()) {
            showNotification("Cannot transfer NFT to your own address.", "warning");
            return;
        }
    } catch (e) {
        showNotification('Invalid recipient address format. Please enter a valid Solana public key.', 'error');
        return;
    }

    try {
        uiElements.nftDetailTransferBtn.disabled = true; // Disable button during transfer
        showNotification(`Preparing to transfer ${currentOpenNft.name} to ${recipientAddress}...`, 'info', 5000);

        const nftMintPublicKey = new SolanaWeb3.PublicKey(currentOpenNft.mint);

        const ownerTokenAccount = await SolanaToken.getAssociatedTokenAddress(
            nftMintPublicKey,
            walletPublicKey
        );

        // Ensure the owner actually has the token account for the NFT
        const ownerTokenAccountInfo = await connection.getAccountInfo(ownerTokenAccount);
        if (!ownerTokenAccountInfo) {
            throw new Error(`Owner does not have the associated token account for NFT mint ${currentOpenNft.mint}.`);
        }

        const destinationTokenAccount = await SolanaToken.getAssociatedTokenAddress(
            nftMintPublicKey,
            recipientPublicKey
        );

        const instructions = [];

        // Check if recipient's associated token account exists. If not, create it as part of the transaction.
        // The payer for creating the ATA is the current walletPublicKey (sender).
        const destAccountInfo = await connection.getAccountInfo(destinationTokenAccount);
        if (!destAccountInfo) {
            instructions.push(
                SolanaToken.createAssociatedTokenAccountInstruction(
                    walletPublicKey, // Payer
                    destinationTokenAccount,
                    recipientPublicKey,
                    nftMintPublicKey,
                    SolanaToken.TOKEN_PROGRAM_ID,
                    SolanaWeb3.SystemProgram.programId
                )
            );
        }

        // Add the SPL Token transfer instruction
        instructions.push(
            SolanaToken.createTransferInstruction(
                ownerTokenAccount, // Source token account (owner's ATA for this NFT)
                destinationTokenAccount, // Destination token account (recipient's ATA for this NFT)
                walletPublicKey, // Owner of the source token account (sender)
                1, // Amount to transfer (NFTs are non-fungible, so amount is 1)
                [], // Signers for approval (empty if owner is the signer)
                SolanaToken.TOKEN_PROGRAM_ID
            )
        );

        const transaction = new SolanaWeb3.Transaction().add(...instructions);
        transaction.feePayer = walletPublicKey;
        transaction.recentBlockhash = (await connection.getLatestBlockhash('finalized')).blockhash;

        const signature = await provider.sendAndConfirm(transaction);
        console.log("NFT transfer successful:", signature);

        showNotification(`NFT ${currentOpenNft.name} successfully transferred to ${recipientAddress}! Transaction ID: ${signature}`, 'success', 7000);
        if (uiElements.nftDetailsModal) uiElements.nftDetailsModal.style.display = 'none';
        await Promise.all([
            loadUserNFTs(walletPublicKey.toBase58()), // Refresh user's NFTs
            loadMarketplaceNFTs() // The NFT's listing status might change (e.g., delisted if transferred), so refresh
        ]);
        currentOpenNft = null; // Clear the currently open NFT
    } catch (error) {
        console.error('Error transferring NFT:', error);
        showNotification(`Failed to transfer NFT: ${error.message}. Check console.`, 'error');
    } finally {
        if (uiElements.nftDetailTransferBtn) uiElements.nftDetailTransferBtn.disabled = false; // Re-enable button
    }
}

function handleCopyText(event) {
    const button = event.currentTarget;
    // Get the text from the previous sibling element with class 'highlight-text'
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
    currentJupiterQuote = null;
    if (uiElements.executeSwapBtn) uiElements.executeSwapBtn.style.display = 'none';
    if (uiElements.swapToAmountInput) uiElements.swapToAmountInput.value = '';
    if (uiElements.priceImpactSpan) uiElements.priceImpactSpan.textContent = '0%';
    if (uiElements.lpFeeSpan) uiElements.lpFeeSpan.textContent = '0';
    if (uiElements.minReceivedSpan) uiElements.minReceivedSpan.textContent = '0';
}

async function updateSwapSection() {
    await updateSwapBalances();
    clearSwapQuote();
}

async function handleMaxAmount(event) {
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
            inputElement.value = Math.max(0, maxSol).toFixed(4); // Ensure non-negative
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
        console.log('Contact form data:', { name, email, subject, message });
        // In a real application, you would send this data to a backend API
        // For now, just simulate success
        showNotification('Message sent successfully! (This is a simulation, integrate with backend for real functionality)', 'success', 5000);
        uiElements.contactForm.reset();
    } else {
        showNotification(`Validation error:\n${errorMessages.join('\n')}`, 'error', 5000);
    }
}


// =================================================================
// 5. ФУНКЦИИ ДЛЯ LIVE TRADING DATA
// =================================================================

// Using the string literal of the mint address for the external API call
const AFOX_MINT_ADDRESS_STRING = 'GLkewtq8s2Yr24o5LT5mzzEeccKuSsy8H5RCHaE9uRAd';

/**
 * Fetches and displays trading data for the AFOX/SOL pair from Dexscreener.
 * It also embeds a TradingView chart widget.
 */
async function fetchAndDisplayTradingData() {
    // The Dexscreener API allows searching for pairs by token address.
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
    };

    try {
        const response = await fetch(dexscreenerApiUrl);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        // Check if pairs exist and select the main pair
        if (!data.pairs || data.pairs.length === 0) {
            resetUI();
            console.warn("AFOX/SOL pair not found on Dexscreener.");
            showNotification("AFOX/SOL trading pair not found.", 'warning', 3000);
            return;
        }

        // Selecting the first (presumably main) pair
        const pair = data.pairs[0]; 
        
        // Get necessary data
        // Price in the native token (SOL in this case, as we queried on Solana)
        const priceSol = parseFloat(pair.priceNative).toFixed(9).replace(/\.?0+$/, ''); // Remove trailing zeros
        // Price change in 24 hours in percentage
        const priceChange24h = parseFloat(pair.priceChange.h24).toFixed(2); 
        // Total liquidity in USD, rounded
        const liquidityUsd = Math.round(pair.liquidity.usd).toLocaleString('en-US'); 
        
        // Update price data in HTML
        if (livePriceElement) livePriceElement.textContent = priceSol;
        if (liquidityElement) liquidityElement.textContent = `$${liquidityUsd}`;
        
        // Update price change and color
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

        // **Integrate Chart (TradingView Widget from Dexscreener)**
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
        
    } catch (error) {
        console.error("Failed to fetch trading data:", error);
        resetUI('Error');
        showNotification(`Failed to load trading data: ${error.message}`, 'error', 5000);
    }
}

// =================================================================
// 6. ДОБАВЛЕНИЕ В DOMContentLoaded (INTEGRATION)
// =================================================================

document.addEventListener('DOMContentLoaded', async () => {
    cacheUIElements(); 
    
    // ✅ iFrame OVERLAY FIX: Cache the chart container element
    birdeyeContainer = document.getElementById('afoxChartContainer');

    initializeEventListeners(); 
    initializeJupiterTerminal(); // Initialize Jupiter Terminal with the primary RPC

    // --- Initial Data Loads on Page Ready & Auto-Connect ---
    await Promise.all([
        loadAnnouncements(),
        loadGames(),
        loadAds(),
        loadMarketplaceNFTs()
    ]);

    // Attempt to auto-connect wallet (Existing logic)
    try {
        const selectedWallet = WALLETS[0];
        if (selectedWallet && selectedWallet.connected && selectedWallet.publicKey) {
            walletPublicKey = selectedWallet.publicKey;
            provider = selectedWallet;
            // Use the backup RPC for general connection tasks
            connection = new SolanaWeb3.Connection(BACKUP_RPC_ENDPOINT, 'confirmed');

            updateWalletUI(walletPublicKey.toBase58());
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
        showNotification(`Auto-connect failed: ${e.message || e}. Please connect manually.`, 'error');
        handleWalletDisconnect();
    }
    
    // Launching the load of real-time trading data
    fetchAndDisplayTradingData();
    
    // Optional: Refresh data every 60 seconds
    // Note: Be mindful of API rate limits if using a free tier.
    setInterval(fetchAndDisplayTradingData, 60000); 

});
