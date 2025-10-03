// ==============================================
// 1. JUPITER TERMINAL & RPC FIX
// ----------------------------------------------
const JUPITER_RPC_ENDPOINT = 'https://rpc.jup.ag'; // Jupiter's recommended RPC (often Helius)
const BACKUP_RPC_ENDPOINT = 'https://api.mainnet-beta.solana.com';
const AFOX_MINT = 'GLkewtq8s2Yr24o5LT5mzzEeccKuSsy8H5RCHaE9uRAd';
const SOL_MINT = 'So11111111111111111111111111111111111111112';

// State variables for chart overlay fix (для iFrame)
let birdeyeContainer = null;
let birdeyeContainerOriginalDisplay = 'block';

/**
 * Агрессивно скрывает iFrame графика для предотвращения блокировки модального окна кошелька.
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
 * Восстанавливает видимость iFrame графика.
 */
function restoreBirdeyeChart() {
    if (birdeyeContainer && birdeyeContainer.style.display === 'none') {
        birdeyeContainer.style.display = birdeyeContainerOriginalDisplay;
        console.log("Trading chart **RESTORED**.");
    }
}


function initializeJupiterTerminal(useBackupRpc = false) {
    const rpcToUse = useBackupRpc ? BACKUP_RPC_ENDPOINT : JUPITER_RPC_ENDPOINT;
    console.log(`Initializing Jupiter Terminal with RPC: ${rpcToUse}`);

    if (window.Jupiter && document.getElementById('jupiter-swap-widget')) {
        try {
            window.Jupiter.init({
                displayMode: 'widget',
                widgetStyle: {
                    'container.id': 'jupiter-swap-widget',
                    'container.zIndex': 9999,
                },
                theme: 'dark',
                formProps: {
                    // ✅ ИСПРАВЛЕНИЕ: Убираем фиксирование токена.
                    // Оставляем только начальные значения.
                    // fixedOutputMint: true, // Эта строка удалена/неактивна
                    initialOutputMint: AFOX_MINT,
                    initialInputMint: SOL_MINT,
                },
                strictTokenList: false,

                // Используем выбранный RPC endpoint
                endpoint: rpcToUse,

                // iFrame OVERLAY FIX: Скрытие графика при открытии модалки кошелька
                onConnectWallet: (callback) => {
                    hideBirdeyeChart(); 
                    setTimeout(callback, 50);
                },

                // iFrame OVERLAY FIX: Восстановление графика после завершения/ошибки
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
        } catch(e) {
            console.error("Failed to call Jupiter.init:", e);
        }
    } else {
        // Повторная попытка инициализации
        setTimeout(() => initializeJupiterTerminal(useBackupRpc), 500);
    }
}


// ==============================================
// 2. MAIN APPLICATION LOGIC (afox-portal-logic.js)
// ==============================================

// ==============================================
// AFOX SHOP LOGIC
// ==============================================

const afoxProducts = [
    { id: 1, name: "Aurum Fox T-Shirt", price: 500, description: "Premium cotton t-shirt with AFOX logo.", image: "https://via.placeholder.com/150/ffd700/000000?text=AFOX+T-Shirt" },
    { id: 2, name: "Golden Fox NFT Art", price: 1500, description: "Exclusive digital art NFT from the Golden Fox collection.", image: "https://via.placeholder.com/150/c0c0c0/000000?text=AFOX+NFT+Art" },
    { id: 3, name: "AFOX Sticker Pack", price: 100, description: "Pack of 5 vinyl stickers for your laptop or phone.", image: "https://via.placeholder.com/150/ff4500/000000?text=AFOX+Stickers" },
    { id: 4, name: "Decentralized Ad Slot (1 Month)", price: 3000, description: "1-month slot for a prominent ad display on the portal.", image: "https://via.placeholder.com/150/32cd32/000000?text=AFOX+Ad+Slot" }
];

let cart = [];
let currentAfoxBalance = 0; // Global state for AFOX balance in the shop

// ==============================================
// CORE SHOP FUNCTIONS (Web3 Integration)
// ==============================================

/**
 * Fetches the user's AFOX token balance from the connected wallet and updates the shop UI.
 */
async function updateShopAfoxBalance() {
    // Use the existing global connection and walletPublicKey
    const shopAfoxBalanceEl = document.getElementById('shopAfoxBalance');
    if (!walletPublicKey || !connection || !shopAfoxBalanceEl) {
        currentAfoxBalance = 0;
        if (shopAfoxBalanceEl) {
            shopAfoxBalanceEl.textContent = '0 AFOX (Connect Wallet)';
        }
        return;
    }

    try {
        // Find the user's AFOX token account
        const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
            walletPublicKey,
            { mint: AFOX_TOKEN_MINT_ADDRESS }
        );

        if (tokenAccounts.value.length > 0) {
            // Use the uiAmount from the parsed data
            currentAfoxBalance = tokenAccounts.value[0].account.data.parsed.info.tokenAmount.uiAmount;
        } else {
            currentAfoxBalance = 0;
        }

        shopAfoxBalanceEl.textContent = `${currentAfoxBalance.toLocaleString('en-US', { maximumFractionDigits: AFOX_DECIMALS })} AFOX`;

    } catch (error) {
        console.error('Error fetching AFOX balance for shop:', error);
        currentAfoxBalance = 0;
        if (shopAfoxBalanceEl) shopAfoxBalanceEl.textContent = 'Error';
    }
}


/**
 * Renders the product list in the shop UI.
 */
function renderProducts() {
    const productList = document.getElementById('product-list');
    if (!productList) return;

    productList.innerHTML = afoxProducts.map(product => `
        <div class="shop-product-card" data-id="${product.id}">
            <img src="${product.image}" alt="${product.name}" class="product-image">
            <h4>${product.name}</h4>
            <p class="product-description">${product.description}</p>
            <p class="product-price">Price: <strong>${product.price.toLocaleString()} AFOX</strong></p>
            <button class="web3-btn small-btn add-to-cart-btn" data-id="${product.id}" aria-label="Add ${product.name} to cart">
                Add to Cart
            </button>
        </div>
    `).join('');
}

/**
 * Updates the cart item count, total price, and the list of items.
 */
function updateCartDisplay() {
    const cartItemsList = document.getElementById('cart-items-list');
    const cartItemCount = document.getElementById('cartItemCount');
    const cartTotalPrice = document.getElementById('cartTotalPrice');
    const checkoutBtn = document.getElementById('checkoutBtn');
    const clearCartBtn = document.getElementById('clearCartBtn');
    if (!cartItemsList || !cartItemCount || !cartTotalPrice || !checkoutBtn || !clearCartBtn) return;

    let totalItems = 0;
    let totalPrice = 0;
    cartItemsList.innerHTML = '';

    if (cart.length === 0) {
        cartItemsList.innerHTML = '<li id="empty-cart-message">Your cart is empty.</li>';
        checkoutBtn.disabled = true;
        clearCartBtn.disabled = true;
    } else {
        checkoutBtn.disabled = false;
        clearCartBtn.disabled = false;

        cart.forEach(item => {
            totalItems += item.quantity;
            totalPrice += item.product.price * item.quantity;

            const cartItemEl = document.createElement('li');
            cartItemEl.className = 'cart-item';
            cartItemEl.innerHTML = `
                <span>${item.product.name} x${item.quantity}</span>
                <span class="cart-price">${(item.product.price * item.quantity).toLocaleString()} AFOX</span>
                <button class="remove-item-btn" data-id="${item.product.id}" aria-label="Remove one ${item.product.name}">&times;</button>
            `;
            cartItemsList.appendChild(cartItemEl);
        });
    }

    cartItemCount.textContent = totalItems;
    cartTotalPrice.textContent = `${totalPrice.toLocaleString()} AFOX`;
}

/**
 * Adds an item to the cart.
 * @param {number} productId - ID of the product.
 */
function addToCart(productId) {
    const product = afoxProducts.find(p => p.id === productId);
    if (!product) return;

    const existingItem = cart.find(item => item.product.id === productId);

    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({ product, quantity: 1 });
    }

    showNotification(`Added 1x ${product.name} to cart.`, 'success');
    updateCartDisplay();
}

/**
 * Removes one unit of an item from the cart.
 * @param {number} productId - ID of the product.
 */
function removeItemFromCart(productId) {
    const existingIndex = cart.findIndex(item => item.product.id === productId);

    if (existingIndex !== -1) {
        if (cart[existingIndex].quantity > 1) {
            cart[existingIndex].quantity -= 1;
            showNotification(`Removed 1x ${cart[existingIndex].product.name} from cart.`, 'info');
        } else {
            cart.splice(existingIndex, 1);
            showNotification(`Removed item from cart.`, 'info');
        }
    }
    updateCartDisplay();
}

/**
 * Handles the Web3-powered checkout process (simulated).
 */
async function handleCheckout() {
    if (!walletPublicKey || !connection || !provider) {
        showNotification("Please connect your wallet to purchase items.", 'warning');
        return;
    }

    const checkoutBtn = document.getElementById('checkoutBtn');
    if (!checkoutBtn) return;

    const totalCost = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

    // 1. Check cart status and balance
    if (totalCost === 0) {
        showNotification("Your cart is empty. Add items to proceed.", 'error');
        return;
    }

    // Update balance right before checkout for the most accurate check
    await updateShopAfoxBalance();

    if (currentAfoxBalance < totalCost) {
        showNotification(`Insufficient AFOX balance. You need ${totalCost.toLocaleString()} AFOX.`, 'error');
        return;
    }

    // 2. Prepare and send Solana Transaction (Simulation Placeholder)
    showNotification("Initiating AFOX transfer transaction (Simulated)...", 'info', 5000);
    checkoutBtn.disabled = true;

    try {
        const purchasedItems = cart.map(item => `${item.quantity}x ${item.product.name}`).join(', ');

        // --- SIMULATION ---
        // In a real application, the Solana logic for transfer would be here:
        // 1. Calculate amount in lamports: new BN(totalCost * (10 ** AFOX_DECIMALS))
        // 2. Get ATA addresses for sender and receiver (shop)
        // 3. Build a Transfer instruction
        // 4. Build and send the Transaction
        await new Promise(resolve => setTimeout(resolve, 2500)); // Simulate transaction delay

        // 3. Update state upon success (Simulated)
        cart = []; // Clear cart
        updateCartDisplay();
        // Since this is a mock environment, we can't reliably update the balance via a mock transfer.
        // We'll call the update function to refresh the display, which might still show the old value
        // if the mock library doesn't simulate the balance change.
        await updateShopAfoxBalance();

        showNotification(`✅ Purchase successful! Items: ${purchasedItems}. Total: ${totalCost.toLocaleString()} AFOX. Transaction hash: [SIMULATED HASH]`, 'success', 7000);

    } catch (error) {
        console.error('Error during shop checkout:', error);
        showNotification(`❌ Purchase failed: ${error.message || 'Check console for details.'}`, 'error');
    } finally {
        checkoutBtn.disabled = false;
    }
}

// ==============================================
// SHOP EVENT LISTENERS & INITIALIZATION
// ==============================================

/**
 * Initializes the shop UI and attaches event listeners.
 * This should be called from the main application's DOMContentLoaded.
 */
function initializeShop() {
    renderProducts();
    updateShopAfoxBalance(); // Initial balance fetch (will show 0 if not connected)
    updateCartDisplay();

    const productList = document.getElementById('product-list');
    const checkoutBtn = document.getElementById('checkoutBtn');
    const clearCartBtn = document.getElementById('clearCartBtn');
    const cartItemsList = document.getElementById('cart-items-list');

    if (productList) {
        // Event delegation for "Add to Cart"
        productList.addEventListener('click', (e) => {
            if (e.target.classList.contains('add-to-cart-btn')) {
                const productId = parseInt(e.target.getAttribute('data-id'));
                if (!isNaN(productId)) {
                    addToCart(productId);
                }
            }
        });
    }

    if (cartItemsList) {
        // Event delegation for "Remove item"
        cartItemsList.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-item-btn')) {
                const productId = parseInt(e.target.getAttribute('data-id'));
                if (!isNaN(productId)) {
                    removeItemFromCart(productId);
                }
            }
        });
    }

    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', handleCheckout);
    }

    if (clearCartBtn) {
        clearCartBtn.addEventListener('click', () => {
            cart = [];
            updateCartDisplay();
            showNotification("Cart has been cleared.", 'info');
        });
    }
}

// Global function to be called by the main wallet connection flow
window.updateShopAfoxBalance = updateShopAfoxBalance;

// ==========================================================
// ** DUPLICATE JUPITER TERMINAL BLOCK REMOVED HERE **
// (The previous block at the beginning of the file is the correct one)
// ==========================================================


// --- CORE IMPORTS AND CONSTANTS ---
const SolanaWeb3 = window.SolanaWeb3;
const SolanaWalletAdapterPhantom = window.SolanaWalletAdapterPhantom;
const SolanaToken = window.SolanaToken;
const BN = window.BN;

const AFOX_TOKEN_MINT_ADDRESS = new SolanaWeb3.PublicKey('GLkewtq8s2Yr24o5LT5mzzEeccKuSsy8H5RCHaE9uRAd');
const STAKING_PROGRAM_ID = new SolanaWeb3.PublicKey('3GcDUxoH4yhFeM3aBkaUfjNu7xGTat8ojXLPHttz2o9f');
const JUPITER_API_URL = 'https://quote-api.jup.ag/v6';
const API_BASE_URL = 'http://localhost:3000';

const TOKEN_MINT_ADDRESSES = {
    'SOL': new SolanaWeb3.PublicKey('So11111111111111111111111111111111111111112'),
    'AFOX': AFOX_TOKEN_MINT_ADDRESS,
};

const AFOX_DECIMALS = 6;
const SOL_DECIMALS = 9;

const NETWORK = SolanaWeb3.WalletAdapterNetwork.Devnet;

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
    if (str.length <= decimals) {
        str = '0.' + '0'.repeat(decimals - str.length) + str;
    } else {
        str = str.slice(0, str.length - decimals) + '.' + str.slice(str.length - decimals);
    }
    return str.replace(/\.?0+$/, '');
}

/**
 * Closes all open modals and the main navigation menu.
 */
function closeAllPopups() {
    const modals = [
        uiElements.nftDetailsModal,
        uiElements.nftModal,
        uiElements.mintNftModal,
        uiElements.createProposalModal
    ].filter(Boolean);

    modals.forEach(modal => {
        if (modal && modal.style.display === 'flex') {
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
 */
function updateWalletUI(address) {
    const displayAddress = address ? `${address.substring(0, 4)}...${address.substring(address.length - 4)}` : 'Not Connected';
    const connectedState = address !== null;

    uiElements.walletAddressDisplays.forEach(display => {
        if (display) {
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
 */
async function handlePublicKeyChange(publicKey) {
    if (publicKey) {
        walletPublicKey = publicKey;
        updateWalletUI(publicKey.toBase58());
        // Trigger reloads for all sections with a slight delay to avoid UI flicker
        await Promise.all([
            loadUserNFTs(walletPublicKey.toBase58()),
            updateStakingUI(),
            updateSwapBalances(),
            updateShopAfoxBalance() // ✅ SHOP INTEGRATION: Update shop balance
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

        const selectedWallet = WALLETS[0];
        if (!selectedWallet) {
            showNotification('Wallet adapter not found. Make sure Phantom is installed and enabled.', 'error');
            return;
        }

        if (!connection) {
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
            updateSwapBalances(),
            updateShopAfoxBalance() // ✅ SHOP INTEGRATION: Update shop balance
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
    connection = null;
    updateWalletUI(null);

    // Reset NFT section
    if (uiElements.userNftList) uiElements.userNftList.innerHTML = '<p class="placeholder-item web3-placeholder">Connect your wallet to see your NFTs.</p>';
    if (uiElements.nftToSellSelect) uiElements.nftToSellSelect.innerHTML = '<option value="">-- Select NFT --</option>';

    // Reset Staking section
    updateStakingUI();

    // Reset Swap section
    if (uiElements.swapFromBalanceSpan) uiElements.swapFromBalanceSpan.textContent = '0';
    if (uiElements.swapFromAmountInput) uiElements.swapFromAmountInput.value = '';
    if (uiElements.swapToAmountInput) uiElements.swapToAmountInput.value = '';
    if (uiElements.priceImpactSpan) uiElements.priceImpactSpan.textContent = '0%';
    if (uiElements.lpFeeSpan) uiElements.lpFeeSpan.textContent = '0';
    if (uiElements.minReceivedSpan) uiElements.minReceivedSpan.textContent = '0';
    if (uiElements.executeSwapBtn) uiElements.executeSwapBtn.style.display = 'none';
    currentJupiterQuote = null;

    // Reset Shop section
    updateShopAfoxBalance(); // ✅ SHOP INTEGRATION: Update shop balance (resets to 0)

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
 */
function getTokenDecimals(mintAddress) {
    if (mintAddress.equals(TOKEN_MINT_ADDRESSES['SOL'])) {
        return SOL_DECIMALS;
    }
    if (mintAddress.equals(AFOX_TOKEN_MINT_ADDRESS)) {
        return AFOX_DECIMALS;
    }
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
        if (uiElements.minReceivedSpan) uiElements.minReceivedSpan.textContent = `${formatBigInt(new BN(currentJupiterQuote.otherAmountThreshold), outputDecimals)} ${uiElements.swapToTokenSelect.value}`;

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
 * Executes the swap transaction via Jupiter Aggregator.
 */
async function executeSwap() {
    if (!currentJupiterQuote || !walletPublicKey || !provider || !connection) {
        showNotification('Wallet or quote is missing. Please connect wallet and get a quote.', 'warning');
        return;
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
                wrapUnwrapSOL: true,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Failed to get swap transaction: ${errorData.error || response.statusText}`);
        }

        const { swapTransaction } = await response.json();
        const transactionBuf = Buffer.from(swapTransaction, 'base64');
        const transaction = SolanaWeb3.Transaction.from(transactionBuf);

        transaction.recentBlockhash = (await connection.getLatestBlockhash('finalized')).blockhash;
        transaction.feePayer = walletPublicKey;

        const signature = await provider.sendAndConfirm(transaction);

        showNotification('Transaction sent! Waiting for confirmation...', 'info', 10000);
        console.log('Swap transaction sent:', signature);

        const confirmation = await connection.confirmTransaction(signature, 'confirmed');

        if (confirmation.value.err) {
            throw new Error(`Transaction failed: ${confirmation.value.err.toString()}`);
        }

        showNotification('Swap successfully executed!', 'success');
        console.log('Swap confirmed:', signature);

        if (uiElements.swapFromAmountInput) uiElements.swapFromAmountInput.value = '';
        if (uiElements.swapToAmountInput) uiElements.swapToAmountInput.value = '';
        if (uiElements.priceImpactSpan) uiElements.priceImpactSpan.textContent = '0%';
        if (uiElements.lpFeeSpan) uiElements.lpFeeSpan.textContent = '0';
        if (uiElements.minReceivedSpan) uiElements.minReceivedSpan.textContent = '0';
        if (uiElements.executeSwapBtn) uiElements.executeSwapBtn.style.display = 'none';
        currentJupiterQuote = null;
        await updateSwapBalances();
        await updateShopAfoxBalance(); // ✅ SHOP INTEGRATION: Update shop AFOX balance since it can change
    } catch (error) {
        console.error('Error during swap execution:', error);
        showNotification(`Swap failed: ${error.message}. Check console for details.`, 'error');
    } finally {
        if (uiElements.executeSwapBtn) uiElements.executeSwapBtn.disabled = false;
    }
}


// --- NFT DISPLAY & ACTIONS ---

/**
 * Loads and displays NFTs owned by the connected user.
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
        const userOwnedNfts = Array.isArray(data.nfts) ? data.nfts.filter(nft => nft.owner === walletAddress && !nft.isListed) : [];

        uiElements.userNftList.innerHTML = '';

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

        uiElements.marketplaceNftList.innerHTML = '';

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
 */
window.showNftDetails = async function(nft) {
    if (!uiElements.nftDetailsModal) return;

    closeAllPopups();
    currentOpenNft = nft;

    if (uiElements.nftDetailImage) uiElements.nftDetailImage.src = nft.image || 'https://via.placeholder.com/250x150?text=NFT';
    if (uiElements.nftDetailName) uiElements.nftDetailName.textContent = nft.name || 'Untitled NFT';
    if (uiElements.nftDetailDescription) uiElements.nftDetailDescription.textContent = nft.description || 'No description provided.';
    if (uiElements.nftDetailOwner) uiElements.nftDetailOwner.textContent = nft.owner || 'Unknown';
    if (uiElements.nftDetailMint) uiElements.nftDetailMint.textContent = nft.mint || 'N/A';
    if (uiElements.nftDetailSolscanLink) {
        uiElements.nftDetailSolscanLink.href = nft.mint ? `https://solscan.io/token/${nft.mint}?cluster=${NETWORK.toLowerCase()}` : '#';
        uiElements.nftDetailSolscanLink.style.display = nft.mint ? 'inline-block' : 'none';
    }

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

    uiElements.nftDetailsModal.style.display = 'flex';

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
            console.error('Error loading NFT history for modal:', error);
            showNotification(`Error loading NFT history: ${error.message}.`, 'error');
            uiElements.nftDetailHistory.textContent = `Error loading history: ${error.message}.`;
        }
    }
};

// --- STAKING FUNCTIONS ---

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

    if (!connection) {
        connection = new SolanaWeb3.Connection(BACKUP_RPC_ENDPOINT, 'confirmed');
    }

    try {
        // Fetch AFOX balance
        let afoxBalance = 0;
        try {
            const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
                walletPublicKey,
                { mint: AFOX_TOKEN_MINT_ADDRESS }
            );

            if (tokenAccounts.value.length > 0) {
                afoxBalance = tokenAccounts.value[0].account.data.parsed.info.tokenAmount.uiAmount;
            }
        } catch (tokenError) {
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
 */
async function getUserStakingAccount(userPublicKey) {
    if (!connection) return null;

    try {
        const [userStakingAccountPubKey] = SolanaWeb3.PublicKey.findProgramAddressSync(
            [userPublicKey.toBuffer(), Buffer.from("stake_account_seed")],
            STAKING_PROGRAM_ID
        );

        const accountInfo = await connection.getAccountInfo(userStakingAccountPubKey);

        if (accountInfo && accountInfo.data) {
            // Mock data for demonstration:
            return { stakedAmount: 100, rewards: 1.5 };
        } else {
            return { stakedAmount: 0, rewards: 0 };
        }
    } catch (error) {
        console.error("Error getting user staking account:", error);
        return null;
    }
}

/**
 * PSEUDO-FUNCTION: Gets staking pool information.
 */
async function getStakingPoolInfo() {
    if (!connection) return null;

    try {
        const [poolAccountPubKey] = SolanaWeb3.PublicKey.findProgramAddressSync(
            [Buffer.from("pool_config_seed")],
            STAKING_PROGRAM_ID
        );

        const accountInfo = await connection.getAccountInfo(poolAccountPubKey);

        if (accountInfo && accountInfo.data) {
            // Mock data for demonstration:
            return { apr: 10, minStake: 5, lockupDays: 30, unstakeFee: 0.5, rewardCalcMethod: "Daily" };
        } else {
            return { apr: 0, minStake: 0, lockupDays: 0, unstakeFee: 0, rewardCalcMethod: "N/A" };
        }
    } catch (error) {
        console.error("Error getting staking pool information:", error);
        return null;
    }
}


// --- DYNAMIC CONTENT LOADING (ANNOUNCEMENTS, GAMES, ADS) ---

async function loadAnnouncements() {
    if (!uiElements.announcementsList) return;
    uiElements.announcementsList.innerHTML = '<p class="placeholder-item">Loading announcements...</p>';
    try {
        const response = await fetch(`${API_BASE_URL}/api/announcements`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        uiElements.announcementsList.innerHTML = '';

        if (!Array.isArray(data) || data.length === 0) {
            uiElements.announcementsList.innerHTML = '<p class="placeholder-item">No announcements yet.</p>';
            return;
        }
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
        uiElements.gameList.innerHTML = '';

        if (!Array.isArray(data) || data.length === 0) {
            uiElements.gameList.innerHTML = '<p class="placeholder-item web3-placeholder">No games uploaded yet.</p>';
            return;
        }
        data.forEach(game => {
            const div = document.createElement('div');
            div.className = 'game-item web3-placeholder';
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
        uiElements.adList.innerHTML = '';

        if (!Array.isArray(data) || data.length === 0) {
            uiElements.adList.innerHTML = '<p class="placeholder-item ad web3-placeholder">No ads yet.</p>';
            return;
        }
        data.forEach(ad => {
            const div = document.createElement('div');
            div.className = 'ad-item web3-placeholder';
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


// --- EVENT LISTENERS INITIALIZATION ---

/**
 * Initializes all global event listeners.
 */
function initializeEventListeners() {
    Object.values(uiElements.closeModalButtons).forEach(btn => {
        if (btn) btn.addEventListener('click', closeAllPopups);
    });

    if (uiElements.closeMainMenuCross) {
        uiElements.closeMainMenuCross.addEventListener('click', () => {
            if (uiElements.mainNav) {
                uiElements.mainNav.classList.remove('active');
                if (uiElements.menuToggle) uiElements.menuToggle.classList.remove('active');
            }
        });
    }

    window.addEventListener('click', (event) => {
        const modals = [uiElements.nftDetailsModal, uiElements.nftModal, uiElements.mintNftModal, uiElements.createProposalModal].filter(Boolean);
        let popupClosed = false;
        for (const modal of modals) {
            if (modal && modal.style.display === 'flex' && event.target === modal) {
                modal.style.display = 'none';
                popupClosed = true;
                break;
            }
        }
        if (!popupClosed && uiElements.mainNav && uiElements.mainNav.classList.contains('active') &&
            !uiElements.mainNav.contains(event.target) && !(uiElements.menuToggle && uiElements.menuToggle.contains(event.target))) {
            uiElements.mainNav.classList.remove('active');
            if (uiElements.menuToggle) uiElements.menuToggle.classList.remove('active');
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            closeAllPopups();
        }
    });

    if (uiElements.menuToggle) {
        uiElements.menuToggle.addEventListener('click', () => {
            if (uiElements.mainNav && !uiElements.mainNav.classList.contains('active')) {
                closeAllPopups();
            }
            if (uiElements.mainNav) uiElements.mainNav.classList.toggle('active');
            uiElements.menuToggle.classList.toggle('active');
        });
    }

    uiElements.navLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (uiElements.mainNav && uiElements.mainNav.classList.contains('active')) {
                uiElements.mainNav.classList.remove('active');
                if (uiElements.menuToggle) uiElements.menuToggle.classList.remove('active');
            }
        });
    });

    uiElements.connectWalletButtons.forEach(btn => {
        if (btn) btn.addEventListener('click', connectWallet);
    });

    if (uiElements.mintNftForm) {
        uiElements.mintNftForm.addEventListener('submit', handleMintNftSubmit);
    }

    if (uiElements.listNftForm) {
        uiElements.listNftForm.addEventListener('submit', handleListNftSubmit);
    }

    if (uiElements.publishButton) {
        uiElements.publishButton.addEventListener('click', handlePublishAnnouncement);
    }

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

    if (uiElements.stakeAfoxBtn) uiElements.stakeAfoxBtn.addEventListener('click', handleStakeAfox);
    if (uiElements.claimRewardsBtn) uiElements.claimRewardsBtn.addEventListener('click', handleClaimRewards);
    if (uiElements.unstakeAfoxBtn) uiElements.unstakeAfoxBtn.addEventListener('click', handleUnstakeAfox);

    if (uiElements.nftDetailBuyBtn) uiElements.nftDetailBuyBtn.addEventListener('click', handleBuyNft);

    if (uiElements.nftDetailSellBtn) {
        uiElements.nftDetailSellBtn.addEventListener('click', () => {
            if (currentOpenNft && uiElements.nftToSellSelect) {
                uiElements.nftToSellSelect.value = currentOpenNft.mint;
            }
            closeAllPopups();
            const nftSection = document.getElementById('nft-section');
            if (nftSection) nftSection.scrollIntoView({ behavior: 'smooth' });
        });
    }

    if (uiElements.nftDetailTransferBtn) uiElements.nftDetailTransferBtn.addEventListener('click', handleTransferNft);

    uiElements.copyButtons.forEach(button => {
        button.addEventListener('click', handleCopyText);
    });

    if (uiElements.swapDirectionBtn) uiElements.swapDirectionBtn.addEventListener('click', handleSwapDirection);
    if (uiElements.swapFromAmountInput) uiElements.swapFromAmountInput.addEventListener('input', clearSwapQuote);
    if (uiElements.swapFromTokenSelect) uiElements.swapFromTokenSelect.addEventListener('change', updateSwapSection);
    if (uiElements.swapToTokenSelect) uiElements.swapToTokenSelect.addEventListener('change', clearSwapQuote);
    if (uiElements.getQuoteBtn) uiElements.getQuoteBtn.addEventListener('click', getQuote);
    if (uiElements.executeSwapBtn) uiElements.executeSwapBtn.addEventListener('click', executeSwap);
    uiElements.maxAmountBtns.forEach(button => {
        button.addEventListener('click', handleMaxAmount);
    });

    const createProposalBtn = document.getElementById('createProposalBtn');
    if (createProposalBtn) {
        createProposalBtn.addEventListener('click', () => {
            if (uiElements.createProposalModal) {
                closeAllPopups();
                uiElements.createProposalModal.style.display = 'flex';
            }
        });
    }

    const mintNftOpenBtn = document.getElementById('mintNftOpenBtn');
    if (mintNftOpenBtn) {
        mintNftOpenBtn.addEventListener('click', () => {
            if (uiElements.mintNftModal) {
                closeAllPopups();
                uiElements.mintNftModal.style.display = 'flex';
            }
        });
    }

    if (uiElements.contactForm) {
        uiElements.contactForm.addEventListener('submit', handleContactFormSubmit);
    }
}

// --- Specific Event Handler Functions ---

async function handleMintNftSubmit(e) {
    e.preventDefault();
    if (!walletPublicKey || !uiElements.mintNftForm) {
        showNotification('Please connect your Solana wallet first.', 'warning');
        return;
    }

    const formData = new FormData(uiElements.mintNftForm);
    formData.append('creatorWallet', walletPublicKey.toBase58());

    try {
        showNotification('Minting NFT (simulation)...', 'info', 5000);
        const response = await fetch(`${API_BASE_URL}/api/nfts/prepare-mint`, {
            method: 'POST',
            body: formData,
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
        if (uiElements.mintNftModal) uiElements.mintNftModal.style.display = 'none';
    } catch (error) {
        console.error('Error minting NFT:', error);
        showNotification(`Failed to mint NFT: ${error.message}`, 'error');
    }
}

async function handleListNftSubmit(e) {
    e.preventDefault();
    if (!walletPublicKey || !uiElements.nftToSellSelect || !document.getElementById('salePrice') || !document.getElementById('listingDuration')) {
        showNotification('Wallet or form elements are missing.', 'warning');
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
        uiElements.publishButton.disabled = true;
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
        uiElements.publishButton.disabled = false;
    }
}

async function handleStakeAfox() {
    if (!walletPublicKey || !connection || !uiElements.stakeAmountInput) {
        showNotification('Please connect your wallet and ensure staking UI is loaded.', 'warning');
        return;
    }

    const amount = parseFloat(uiElements.stakeAmountInput.value);
    if (isNaN(amount) || amount <= 0) {
        showNotification('Please enter a valid amount to stake (greater than 0).', 'warning');
        return;
    }

    try {
        uiElements.stakeAfoxBtn.disabled = true;
        showNotification(`Initiating staking of ${amount} AFOX (Simulation)...`, 'info', 5000);

        // --- SIMULATION ---
        const userStakingAccount = await getUserStakingAccount(walletPublicKey);
        if (userStakingAccount && userStakingAccount.stakedAmount + amount > 1000) { // Arbitrary mock limit
            throw new Error("Staking limit reached in simulation.");
        }
        await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate tx delay
        // --- END SIMULATION ---

        showNotification(`You successfully staked ${amount} AFOX! Transaction ID: [MOCK_SIGNATURE]`, 'success', 7000);
        if (uiElements.stakeAmountInput) uiElements.stakeAmountInput.value = '';
        await updateStakingUI();
        await updateSwapBalances();
        await updateShopAfoxBalance(); // ✅ SHOP INTEGRATION: Update shop AFOX balance since it changes
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

    showNotification('Attempting to claim rewards (Simulation)...', 'info');
    try {
        if (uiElements.claimRewardsBtn) uiElements.claimRewardsBtn.disabled = true;
        await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate tx delay

        showNotification(`Rewards successfully claimed! Transaction ID: [MOCK_SIGNATURE]`, 'success', 5000);
        await updateStakingUI();
        await updateSwapBalances();
        await updateShopAfoxBalance(); // ✅ SHOP INTEGRATION: Update shop AFOX balance since it changes
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

    showNotification('Attempting to unstake tokens (Simulation)...', 'info');
    try {
        if (uiElements.unstakeAfoxBtn) uiElements.unstakeAfoxBtn.disabled = true;
        await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate tx delay

        showNotification(`Staked tokens successfully unstaked! Transaction ID: [MOCK_SIGNATURE]`, 'success', 5000);
        await updateStakingUI();
        await updateSwapBalances();
        await updateShopAfoxBalance(); // ✅ SHOP INTEGRATION: Update shop AFOX balance since it changes
    } catch (error) {
        console.error('Error unstaking tokens:', error);
        showNotification(`Failed to unstake tokens: ${error.message}. Check console.`, 'error');
    } finally {
        if (uiElements.unstakeAfoxBtn) uiElements.unstakeAfoxBtn.disabled = false;
    }
}

async function handleBuyNft() {
    if (!walletPublicKey || !currentOpenNft || !currentOpenNft.isListed || !currentOpenNft.price) {
        showNotification('Wallet or NFT not properly selected/listed.', 'warning');
        return;
    }

    if (!connection) connection = new SolanaWeb3.Connection(BACKUP_RPC_ENDPOINT, 'confirmed');
    if (!provider) {
        showNotification('Wallet provider not found. Please reconnect your wallet.', 'error');
        return;
    }
    if (!uiElements.nftDetailBuyBtn) return;

    try {
        uiElements.nftDetailBuyBtn.disabled = true;
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

        const transaction = SolanaWeb3.Transaction.from(Buffer.from(transactionData.serializedTransaction, 'base64'));
        transaction.recentBlockhash = (await connection.getLatestBlockhash('finalized')).blockhash;
        transaction.feePayer = walletPublicKey;

        const signature = await provider.sendAndConfirm(transaction);
        console.log("NFT purchase transaction successful:", signature);

        showNotification(`Successfully purchased ${currentOpenNft.name}! Transaction ID: ${signature}`, 'success', 7000);
        if (uiElements.nftDetailsModal) uiElements.nftDetailsModal.style.display = 'none';
        await Promise.all([
            loadMarketplaceNFTs(),
            loadUserNFTs(walletPublicKey.toBase58()),
            updateSwapBalances(),
            updateShopAfoxBalance() // ✅ SHOP INTEGRATION: SOL balance might change due to purchase
        ]);
        currentOpenNft = null;
    } catch (error) {
        console.error('Error purchasing NFT:', error);
        showNotification(`Failed to purchase NFT: ${error.message}. Check console.`, 'error');
    } finally {
        if (uiElements.nftDetailBuyBtn) uiElements.nftDetailBuyBtn.disabled = false;
    }
}

async function handleTransferNft() {
    if (!walletPublicKey || !currentOpenNft) {
        showNotification('Wallet or NFT not selected.', 'warning');
        return;
    }

    if (currentOpenNft.owner !== walletPublicKey.toBase58()) {
        showNotification('You are not the owner of this NFT to transfer it.', 'warning');
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

    if (!connection || !provider || !uiElements.nftDetailTransferBtn) return;

    try {
        uiElements.nftDetailTransferBtn.disabled = true;
        showNotification(`Preparing to transfer ${currentOpenNft.name} to ${recipientAddress}...`, 'info', 5000);

        const nftMintPublicKey = new SolanaWeb3.PublicKey(currentOpenNft.mint);

        const ownerTokenAccount = await SolanaToken.getAssociatedTokenAddress(nftMintPublicKey, walletPublicKey);
        const destinationTokenAccount = await SolanaToken.getAssociatedTokenAddress(nftMintPublicKey, recipientPublicKey);

        const instructions = [];
        const destAccountInfo = await connection.getAccountInfo(destinationTokenAccount);
        if (!destAccountInfo) {
            instructions.push(
                SolanaToken.createAssociatedTokenAccountInstruction(
                    walletPublicKey,
                    destinationTokenAccount,
                    recipientPublicKey,
                    nftMintPublicKey,
                    SolanaToken.TOKEN_PROGRAM_ID,
                    SolanaWeb3.SystemProgram.programId
                )
            );
        }

        instructions.push(
            SolanaToken.createTransferInstruction(
                ownerTokenAccount,
                destinationTokenAccount,
                walletPublicKey,
                1,
                [],
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
            loadUserNFTs(walletPublicKey.toBase58()),
            loadMarketplaceNFTs()
        ]);
        currentOpenNft = null;
    } catch (error) {
        console.error('Error transferring NFT:', error);
        showNotification(`Failed to transfer NFT: ${error.message}. Check console.`, 'error');
    } finally {
        if (uiElements.nftDetailTransferBtn) uiElements.nftDetailTransferBtn.disabled = false;
    }
}

function handleCopyText(event) {
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
    if (!uiElements.swapFromTokenSelect || !uiElements.swapToTokenSelect) return;

    const fromVal = uiElements.swapFromTokenSelect.value;
    const toVal = uiElements.swapToTokenSelect.value;

    uiElements.swapFromTokenSelect.value = toVal;
    uiElements.swapToTokenSelect.value = fromVal;

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

    if (!inputElement || !walletPublicKey || !connection || !uiElements.swapFromTokenSelect) return;

    const fromTokenMint = TOKEN_MINT_ADDRESSES[uiElements.swapFromTokenSelect.value];
    if (!fromTokenMint) {
        showNotification('Selected "From" token is invalid.', 'error');
        return;
    }

    try {
        if (fromTokenMint.equals(TOKEN_MINT_ADDRESSES['SOL'])) {
            const solBalance = await connection.getBalance(walletPublicKey);
            const maxSol = (solBalance / SolanaWeb3.LAMPORTS_PER_SOL) - 0.005;
            inputElement.value = Math.max(0, maxSol).toFixed(4);
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
        inputElement.value = '0';
    }
    clearSwapQuote();
}

function handleContactFormSubmit(e) {
    e.preventDefault();

    if (!uiElements.contactForm || !uiElements.contactNameInput || !uiElements.contactEmailInput || !uiElements.contactMessageInput) {
        showNotification('Contact form elements not found.', 'error');
        return;
    }

    const name = uiElements.contactNameInput.value.trim();
    const email = uiElements.contactEmailInput.value.trim();
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
        console.log('Contact form data:', { name, email, subject: uiElements.contactSubjectInput.value.trim(), message });
        showNotification('Message sent successfully! (This is a simulation, integrate with backend for real functionality)', 'success', 5000);
        uiElements.contactForm.reset();
    } else {
        showNotification(`Validation error:\n${errorMessages.join('\n')}`, 'error', 5000);
    }
}


// =================================================================
// 3. LIVE TRADING DATA FUNCTIONS
// =================================================================

const AFOX_MINT_ADDRESS_STRING = 'GLkewtq8s2Yr24o5LT5mzzEeccKuSsy8H5RCHaE9uRAd';

/**
 * Fetches and displays trading data for the AFOX/SOL pair from Dexscreener.
 */
async function fetchAndDisplayTradingData() {
    const dexscreenerApiUrl = `https://api.dexscreener.com/latest/dex/tokens/${AFOX_MINT_ADDRESS_STRING}`;

    const livePriceElement = document.getElementById('livePriceAfoxSol');
    const priceChangeElement = document.getElementById('priceChange24h');
    const liquidityElement = document.getElementById('totalLiquidity');
    const chartContainer = document.getElementById('afoxChartContainer');

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

        if (!data.pairs || data.pairs.length === 0) {
            resetUI();
            console.warn("AFOX/SOL pair not found on Dexscreener.");
            showNotification("AFOX/SOL trading pair not found.", 'warning', 3000);
            return;
        }

        const pair = data.pairs[0];
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

    } catch (error) {
        console.error("Failed to fetch trading data:", error);
        resetUI('Error');
        showNotification(`Failed to load trading data: ${error.message}`, 'error', 5000);
    }
}

// =================================================================
// 4. DOMContentLoaded (INTEGRATION)
// =================================================================

document.addEventListener('DOMContentLoaded', async () => {
    cacheUIElements();

    // ✅ iFrame OVERLAY FIX: Cache the chart container element
    birdeyeContainer = document.getElementById('afoxChartContainer');

    initializeEventListeners();
    initializeJupiterTerminal();

    // ✅ SHOP INTEGRATION: Initialize the shop functions
    initializeShop();

    // --- Initial Data Loads on Page Ready & Auto-Connect ---
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
            // Load all user-specific data
            await Promise.all([
                loadUserNFTs(walletPublicKey.toBase58()),
                updateStakingUI(),
                updateSwapBalances(),
                updateShopAfoxBalance() // ✅ SHOP INTEGRATION: Update shop balance on auto-connect
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

    fetchAndDisplayTradingData();
    setInterval(fetchAndDisplayTradingData, 60000);
});

// ==============================================
// 5. MOCK LIBRARY SIMULATION (mock-web3-libs.js)
// NOTE: This must be included in the HTML *before* the main logic.
// ==============================================

if (typeof window.SolanaWeb3 === 'undefined') {

    // --- MOCK CONSTANTS ---
    const MOCK_WALLET_KEY = '9kEw9pQh7c1p4s7T9m7y6d1j9h3e7o5t2k4i6j8l0n2v4b6m8c0x2z4q6w8e';
    const MOCK_AFOX_MINT = 'GLkewtq8s2Yr24o5LT5mzzEeccKuSsy8H5RCHaE9uRAd';
    const MOCK_SOL_MINT = 'So11111111111111111111111111111111111111112';

    // --- MOCK PublicKey & BN ---
    class MockPublicKey {
        constructor(key) {
            this.key = key;
        }
        toBase58() { return this.key; }
        equals(other) { return this.key === other.key; }
        toBuffer() { return Buffer.from(this.key); }
        toString() { return this.key; }
        static findProgramAddressSync(seeds, programId) { return [new MockPublicKey('PDA' + seeds[1].toString().substring(0, 5)), 255]; }
    }
    class MockBN {
        constructor(val) { this.val = BigInt(val); }
        toString() { return this.val.toString(); }
        toNumber() { return Number(this.val); }
        toArray(endian, len) { return Array(len).fill(0); } // Simplistic mock for instruction data
    }

    // --- MOCK Connection ---
    class MockConnection {
        constructor(endpoint, commitment) { console.log(`Mock Connection to ${endpoint}`); }
        async getBalance(publicKey) {
            if (publicKey.toBase58() === MOCK_WALLET_KEY) {
                return 10 * 10 ** 9; // 10 SOL
            }
            return 0;
        }
        async getParsedTokenAccountsByOwner(owner, { mint }) {
            if (owner.toBase58() === MOCK_WALLET_KEY && mint.toBase58() === MOCK_AFOX_MINT) {
                return {
                    value: [{
                        account: {
                            data: {
                                parsed: {
                                    info: {
                                        tokenAmount: {
                                            amount: (5000 * 10 ** 6).toString(), // 5000 AFOX
                                            decimals: 6,
                                            uiAmount: 5000,
                                        }
                                    }
                                }
                            }
                        }
                    }]
                };
            }
            return { value: [] };
        }
        async getTokenAccountBalance(tokenAccountPubKey) {
            if (tokenAccountPubKey.toBase58().startsWith('ATA' + MOCK_AFOX_MINT)) {
                return { value: { uiAmount: 5000, amount: (5000 * 10 ** 6).toString() } };
            }
            return { value: { uiAmount: 0, amount: '0' } };
        }
        async getAccountInfo(publicKey) { return publicKey.toBase58().startsWith('PDA') ? { data: true } : null; }
        async getLatestBlockhash(commitment) { return { blockhash: 'MockBlockhash', lastValidBlockHeight: 1000 }; }
        async confirmTransaction(signature, commitment) { return { value: { err: null } }; }
        async getMinimumBalanceForRentExemption(space) { return 2039280; }
    }

    // --- MOCK Wallet Adapter ---
    class MockPhantomWalletAdapter {
        constructor() {
            this.publicKey = new MockPublicKey(MOCK_WALLET_KEY);
            this.connected = false;
            this.listeners = {};
        }
        async connect() {
            return new Promise((resolve) => {
                setTimeout(() => {
                    this.connected = true;
                    if (this.listeners['publicKey']) this.listeners['publicKey'](this.publicKey);
                    resolve();
                }, 500);
            });
        }
        async disconnect() {
            this.connected = false;
            if (this.listeners['disconnect']) this.listeners['disconnect']();
        }
        async sendAndConfirm(transaction) {
            console.log('Mock Transaction sent:', transaction);
            return new Promise(resolve => setTimeout(() => resolve('MockTxSignature'), 1500));
        }
        on(event, handler) { this.listeners[event] = handler; }
        off(event, handler) { delete this.listeners[event]; }
    }

    // --- MOCK SPL Token Functions ---
    const MockToken = {
        TOKEN_PROGRAM_ID: new MockPublicKey('TokenProgram11111111111111111111111111111'),
        getAssociatedTokenAddress: async (mint, owner) => new MockPublicKey('ATA' + mint.toBase58().substring(0, 5) + owner.toBase58().substring(0, 5)),
        createTransferInstruction: (source, destination, owner, amount, signers, programId) => ({ instruction: 'MockTransfer' }),
        createAssociatedTokenAccountInstruction: (payer, ata, owner, mint, tokenProgramId, systemProgramId) => ({ instruction: 'MockCreateATA' }),
    };

    // --- MOCK Transaction & Instruction ---
    class MockTransaction {
        constructor() { this.instructions = []; this.recentBlockhash = ''; this.feePayer = null; }
        add(...instructions) { this.instructions.push(...instructions); return this; }
        static from(buffer) { return new MockTransaction(); }
    }
    const MockSystemProgram = { programId: new MockPublicKey('SystemProgram111111111111111111111111111'), createAccount: (params) => ({ instruction: 'MockCreateAccount' }) };
    const MockSysvarRent = { SYSVAR_RENT_PUBKEY: new MockPublicKey('SysvarRent1111111111111111111111111111111') };
    const MockWalletAdapterNetwork = { Devnet: 'devnet', MainnetBeta: 'mainnet-beta' };

    // --- Globalize Mocks ---
    window.Buffer = { from: (str, enc) => ({ toString: () => str }) };
    window.BN = MockBN;
    window.SolanaWeb3 = {
        PublicKey: MockPublicKey,
        Connection: MockConnection,
        Transaction: MockTransaction,
        SystemProgram: MockSystemProgram,
        SYSVAR_RENT_PUBKEY: MockSysvarRent.SYSVAR_RENT_PUBKEY,
        WalletAdapterNetwork: MockWalletAdapterNetwork,
        LAMPORTS_PER_SOL: 10 ** 9,
    };
    window.SolanaWalletAdapterPhantom = { PhantomWalletAdapter: MockPhantomWalletAdapter };
    window.SolanaToken = MockToken;
    window.Jupiter = {
        init: (config) => { console.log("Mock Jupiter Terminal Initialized. Config:", config); },
    };
    window.fetch = async (url, options) => {
        console.log(`Mock FETCH: ${url}`);
        if (url.includes('api.dexscreener.com')) {
            return {
                ok: true,
                json: async () => ({
                    pairs: [{
                        pairAddress: 'MockPairAddress',
                        priceNative: '0.0000005', // AFOX/SOL mock price
                        priceChange: { h24: 1.25 },
                        liquidity: { usd: 500000 },
                    }]
                })
            };
        } else if (url.includes(`${API_BASE_URL}/api/nfts`)) {
            const mockNfts = [
                { mint: 'NFT1MintAddress', owner: MOCK_WALLET_KEY, name: 'User NFT 1', isListed: false, image: 'https://via.placeholder.com/180/0000ff/ffffff?text=U+NFT+1' },
                { mint: 'NFT2MintAddress', owner: 'MarketplaceSellerKey', name: 'Listed NFT 2', isListed: true, price: 1.5, image: 'https://via.placeholder.com/180/ff0000/ffffff?text=L+NFT+2' },
            ];
            if (url.includes('/marketplace')) {
                return { ok: true, json: async () => ({ nfts: mockNfts }) };
            } else if (url.includes('/history')) {
                 return { ok: true, json: async () => ([{ type: "Mint", timestamp: new Date().toISOString(), to: MOCK_WALLET_KEY }]) };
            } else if (url.includes('/buy')) {
                return { ok: true, json: async () => ({ serializedTransaction: 'MockBase64Tx' }) };
            }
        } else if (url.includes(`${API_BASE_URL}/api/announcements`)) {
            return { ok: true, json: async () => ([{ text: "Mock Announcement", date: new Date().toISOString() }]) };
        } else if (url.includes(`${API_BASE_URL}/api/games`)) {
            return { ok: true, json: async () => ([{ title: "Mock Game", description: "Fun Game", url: "#" }]) };
        } else if (url.includes(`${API_BASE_URL}/api/ads`)) {
            return { ok: true, json: async () => ([{ title: "Mock Ad", content: "Buy our stuff!", imageUrl: 'https://via.placeholder.com/180/00ff00/ffffff?text=AD' }]) };
        } else if (url.includes(JUPITER_API_URL + '/quote')) {
            return {
                ok: true,
                json: async () => ({
                    outAmount: '100000000', // Mock output amount in lamports
                    priceImpactPct: 0.001, // 0.1%
                    lpFee: { amount: '1000' },
                    otherAmountThreshold: '99000000', // Min received mock
                })
            };
        } else if (url.includes(JUPITER_API_URL + '/swap')) {
            return { ok: true, json: async () => ({ swapTransaction: 'MockBase64Tx' }) };
        }

        return { ok: false, status: 404, json: async () => ({ error: 'Mock Not Found' }) };
    };
    console.warn("MOCK Web3 Libraries Initialized: Code will simulate Solana and Wallet interactions.");
}
