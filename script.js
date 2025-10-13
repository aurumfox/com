// script.js - Fully implemented code for interacting with Solana without a backend (MOCK mode).
// Requires SolanaWeb3, Anchor, and Wallet Adapters libraries to be included in the HTML.

// =========================================================================================
// 🚨 ⚠️ ⚠️ REQUIRED CHANGES (Leave stubs for standalone operation) ⚠️ ⚠️ 🚨
// =========================================================================================

// 1. INSERT YOUR IDL (JSON schema of the staking program)
// ⚠️ ВАЖНО: ЗАМЕНИТЕ ЭТОТ IDL НА ПОЛНЫЙ IDL, СГЕНЕРИРОВАННЫЙ ВАШИМ RUST-КОНТРАКТОМ!
const STAKING_IDL = {
    version: "0.1.0",
    name: "alphafox_staking",
    instructions: [
        {
            name: "stake",
            accounts: [
                { name: "staker", isMut: true, isSigner: true },
                { name: "userStakingAccount", isMut: true, isSigner: false },
                { name: "tokenFrom", isMut: true, isSigner: false },
                { name: "poolState", isMut: false, isSigner: false }, // NEW
                { name: "poolVault", isMut: true, isSigner: false },   // NEW
                { name: "tokenProgram", isMut: false, isSigner: false },
                { name: "systemProgram", isMut: false, isSigner: false },
            ],
            args: [{ name: "amount", type: "u64" }],
        },
        {
            name: "claimRewards",
            accounts: [
                { name: "staker", isMut: false, isSigner: true },
                { name: "userStakingAccount", isMut: true, isSigner: false },
                { name: "userRewardTokenAccount", isMut: true, isSigner: false },
                { name: "poolState", isMut: false, isSigner: false }, // NEW
                { name: "rewardsVault", isMut: true, isSigner: false }, // NEW
                { name: "tokenProgram", isMut: false, isSigner: false },
            ],
            args: [],
        },
        {
            name: "unstake",
            accounts: [
                { name: "staker", isMut: false, isSigner: true },
                { name: "userStakingAccount", isMut: true, isSigner: false },
                { name: "tokenTo", isMut: true, isSigner: false },
                { name: "poolState", isMut: false, isSigner: false }, // NEW
                { name: "poolVault", isMut: true, isSigner: false },   // NEW
                { name: "daoTreasuryVault", isMut: true, isSigner: false }, // NEW
                { name: "tokenProgram", isMut: false, isSigner: false },
            ],
            args: [],
        }
    ],
    accounts: [
        {
            name: "userStakingAccount",
            type: {
                kind: "struct",
                fields: [
                    { name: "staker", type: "publicKey" },
                    { name: "poolId", type: "publicKey" }, // NEW
                    { name: "stakedAmount", type: "u64" },
                    { name: "rewardsAmount", type: "u64" },
                    { name: "lastStakeTime", type: "i64" },
                    // ⚠️ ADD lockup_end_time и lending
                ],
            },
        },
    ]
};

// 2. INSERT YOUR SEED (Keyword for the staking account PDA from your Rust program)
const STAKING_ACCOUNT_SEED = "alphafox_staking_pda";

// 3. 🔑 SECURE CHANGES: Helius API Key removed, HELIUS_BASE_URL replaced with your Cloudflare Worker
// ⚠️ Your public Helius key has been removed from this file.
// const HELIUS_API_KEY = '2ed0cb0f-85fc-410d-98da-59729966ec05'; 
// 👇 USING YOUR CLOUDFLARE WORKER AS A PROXY
const HELIUS_BASE_URL = 'https://solana-api-proxy.wnikolay28.workers.dev/v0/addresses/'; 

// =========================================================================================
// PROJECT CONSTANTS (С ИСПРАВЛЕНИЯМИ)
// =========================================================================================

// --- КРИТИЧЕСКИ ВАЖНЫЕ КЛЮЧИ ПУЛА (ИСПРАВЛЕНО) ---
// ⚠️ ЗАМЕНИТЕ ЭТИ ЗАГЛУШКИ РЕАЛЬНЫМИ АДРЕСАМИ ПОСЛЕ ДЕПЛОЯ
const AFOX_POOL_STATE_PUBKEY = new SolanaWeb3.PublicKey('PoolStateAddressPlaceholder___________________'); 
const AFOX_POOL_VAULT_PUBKEY = new SolanaWeb3.PublicKey('PoolVaultAddressPlaceholder____________________');
const AFOX_REWARDS_VAULT_PUBKEY = new SolanaWeb3.PublicKey('RewardsVaultAddressPlaceholder________________'); 
const DAO_TREASURY_VAULT_PUBKEY = new SolanaWeb3.PublicKey('DAOTreasuryVaultAddressPlaceholder_________'); 
// -----------------------------------------------------------------------------------------

const FIREBASE_PROXY_URL = 'https://firebasejs-key--snowy-cherry-0a92.wnikolay28.workers.dev/api/log-data';

const AFOX_MINT = 'GLkewtq8s2Yr24o5LT5mzzEeccKuPfy8H5RCHaE9uRAd'; // Changed for greater MOCK uniqueness
const SOL_MINT = 'So11111111111111111111111111111111111111112';
const JUPITER_RPC_ENDPOINT = 'https://rpc.jup.ag';
const BACKUP_RPC_ENDPOINT = 'https://api.mainnet-beta.solana.com';
const TXN_FEE_RESERVE_SOL = 0.005;

const AFOX_TOKEN_MINT_ADDRESS = new SolanaWeb3.PublicKey(AFOX_MINT);
const STAKING_PROGRAM_ID = new SolanaWeb3.PublicKey('3GcDUxoH4yhFeM3aBkaUfjNu7xGTat8ojXLPHttz2o9f');
const JUPITER_API_URL = 'https://quote-api.jup.ag/v6';
const TOKEN_PROGRAM_ID = new SolanaWeb3.PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const ASSOCIATED_TOKEN_PROGRAM_ID = new SolanaWeb3.PublicKey('ATokenGPvbdGVxr1b2hvZbnPUb4A5L5EyrgFP1G8AtiT');
const SYSTEM_PROGRAM_ID = SolanaWeb3.SystemProgram.programId;

const TOKEN_MINT_ADDRESSES = {
    'SOL': new SolanaWeb3.PublicKey(SOL_MINT),
    'AFOX': AFOX_TOKEN_MINT_ADDRESS,
};
const AFOX_DECIMALS = 6;
const SOL_DECIMALS = 9;
const NETWORK = SolanaWeb3.WalletAdapterNetwork.Mainnet;

// --- GLOBAL APP STATE & WALLET ADAPTERS ---
const appState = {
    walletPublicKey: null,
    provider: null,
    connection: null,
    currentJupiterQuote: null,
    currentOpenNft: null,
    areProviderListenersAttached: false,
    userBalances: { SOL: BigInt(0), AFOX: BigInt(0) },
    userStakingData: { stakedAmount: BigInt(0), rewards: BigInt(0) },
    userNFTs: [],
    marketplaceNFTs: []
};
const uiElements = {};
const WALLETS = [new SolanaWalletAdapterPhantom.PhantomWalletAdapter()];

// --- LOCAL BACKEND SIMULATION (MOCK DB) ---
const MOCK_DB = {
    nfts: [
        // Initial MOCK data for standalone operation
        { mint: 'NFT1_MOCK_MINT', name: 'Alpha Fox #001 (Listed)', description: 'Rare Alpha Fox NFT. Buy me!', owner: 'NO_WALLET_CONNECTED', price: 5.5, isListed: true, image: 'https://via.placeholder.com/180x180/007bff/ffffff?text=Fox+001', attributes: [{ trait_type: 'Rarity', value: 'Epic' }, { trait_type: 'Edition', value: 'First' }] },
        { mint: 'NFT2_MOCK_MINT', name: 'Alpha Fox #002 (Owned)', description: 'Common Alpha Fox NFT. My personal collection.', owner: 'NO_WALLET_CONNECTED', price: 0, isListed: false, image: 'https://via.placeholder.com/180x180/17a2b8/ffffff?text=Fox+002', attributes: [{ trait_type: 'Rarity', value: 'Common' }] }
    ],
    announcements: [
        { text: 'Welcome to the standalone simulation! Staking and NFT-Marketplace run on MOCK data.', date: new Date(Date.now() - 3600000).toISOString() },
        { text: 'Swap uses the real Jupiter API for quotes, but the transaction is simulated.', date: new Date().toISOString() }
    ],
    games: [
        { title: 'Solana Runner (MOCK)', description: 'Infinite runner, game simulation.', url: '#' }
    ],
    nftHistory: {
        'NFT1_MOCK_MINT': [{ type: 'Mint', timestamp: new Date(Date.now() - 86400000).toISOString(), to: 'INITIAL_OWNER' }],
        'NFT2_MOCK_MINT': [{ type: 'Mint', timestamp: new Date(Date.now() - 7200000).toISOString(), to: 'INITIAL_OWNER' }]
    },
    staking: {} // { address: { stakedAmount: 'BigIntStr', rewards: 'BigIntStr', stakeHistory: [] } }
};

/**
 * MOCK: Persists the current state of MOCK_DB (memory-only).
 */
function persistMockData() {
    // In real code, this would involve real Solana program calls.
}

// =========================================================================================
// 🟢 NEW FUNCTION: SECURE LOG SENDING VIA PROXY
// =========================================================================================

/**
 * Sends log data via a Cloudflare Worker (proxy) that uses the hidden FIREBASE_API_KEY.
 *
 * @param {string} walletAddress - The user's wallet public key.
 * @param {string} actionType - The type of action ('STAKE', 'UNSTAKE', 'CLAIM').
 * @param {bigint | string | number} amount - The transaction amount.
 */
async function sendLogToFirebase(walletAddress, actionType, amount) {
    if (!walletAddress || !actionType) return; 
    
    // Convert amount to string for JSON
    const amountString = (typeof amount === 'bigint') ? amount.toString() : String(amount);
    
    try {
        await fetch(FIREBASE_PROXY_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                wallet: walletAddress,
                action: actionType,
                amount: amountString 
            })
        });
        // Success! Logging went through the proxy.
        console.log(`Log sent via Worker: ${actionType} by ${walletAddress.substring(0, 8)}...`);
    } catch (error) {
        console.error("Error sending log via Worker:", error);
    }
}

// =========================================================================================
// --- HELPER UTILITIES (Fully implemented) ---
// =========================================================================================

/**
 * 💡 ИСПРАВЛЕННАЯ ФУНКЦИЯ ДЛЯ ГАМБУРГЕР-МЕНЮ (Должна быть вызвана после DOMContentLoaded)
 */
function setupHamburgerMenu() {
    // 1. АБСОЛЮТНО КРИТИЧНО: ID должны совпадать с HTML
    // ИСПОЛЬЗУЕМ menuToggle (как более вероятно в разметке) и closeMenuButton
    const menuToggle = document.getElementById('menuToggle');
    const closeMenuButton = document.getElementById('closeMenuButton'); 
    const mainNav = document.getElementById('mainNav'); // ID вашего тега <nav>
    const navOverlay = document.getElementById('navOverlay'); 
    const body = document.body;

    // Проверка, что элементы найдены 
    if (!menuToggle || !mainNav || !navOverlay || !closeMenuButton) {
        console.error("КРИТИЧЕСКАЯ ОШИБКА МЕНЮ: Проверьте ID в HTML! Один или несколько элементов не найдены.");
        return; 
    }

    function openMenu() {
        mainNav.classList.add('is-open'); 
        navOverlay.classList.add('is-open'); 
        menuToggle.classList.add('is-active'); 
        body.classList.add('menu-open'); // Блокировка скролла через CSS
        menuToggle.setAttribute('aria-expanded', 'true');
        // Дополнительная логика блокировки скролла (если CSS не сработает)
        toggleScrollLock(true);
    }

    function closeMenu() {
        mainNav.classList.remove('is-open');
        navOverlay.classList.remove('is-open');
        menuToggle.classList.remove('is-active');
        body.classList.remove('menu-open'); // Разблокировка скролла через CSS
        menuToggle.setAttribute('aria-expanded', 'false');
        // Дополнительная логика разблокировки скролла
        toggleScrollLock(false);
    }

    // 1. ПЕРЕКЛЮЧЕНИЕ: Главный обработчик гамбургера
    menuToggle.addEventListener('click', () => {
        if (mainNav.classList.contains('is-open')) {
            closeMenu();
        } else {
            openMenu();
        }
    });

    // 2. ОБРАБОТЧИКИ ЗАКРЫТИЯ
    closeMenuButton.addEventListener('click', closeMenu);
    navOverlay.addEventListener('click', closeMenu);
    
    // 3. ФУНКЦИЯ ДЛЯ ЗАКРЫТИЯ ПО ССЫЛКЕ
    window.closeMenuOnLinkClick = function() {
        if (window.innerWidth <= 992) { // Используем более общее значение для мобильных устройств
            closeMenu();
        }
    };
}
// =========================================================


// --------------------------------------------------------
// Добавлена функция для блокировки/разблокировки прокрутки
function toggleScrollLock(lock) {
    // Используем CSS-класс, который вы должны определить в стилях:
    // .menu-open { overflow: hidden; }
    document.body.classList.toggle('menu-open', lock);
}
// --------------------------------------------------------

/**
 * Manages the global loading state and button disabling.
 * @param {boolean} isLoading
 * @param {HTMLElement} [button] - Specific button to disable/enable.
 */
function setLoadingState(isLoading, button = null) {
    if (uiElements.pageLoader) {
        uiElements.pageLoader.style.display = isLoading ? 'flex' : 'none';
    }

    const actionButtons = [
        uiElements.stakeAfoxBtn, uiElements.claimRewardsBtn, uiElements.unstakeAfoxBtn,
        uiElements.getQuoteBtn, uiElements.executeSwapBtn,
        uiElements.nftDetailBuyBtn, uiElements.nftDetailSellBtn, uiElements.nftDetailTransferBtn
    ].filter(Boolean);

    actionButtons.forEach(btn => {
        if (btn !== button) {
            btn.disabled = isLoading;
        }
    });

    if (button) {
        button.disabled = isLoading;
        if (isLoading && !button.originalText) {
            button.originalText = button.textContent;
            button.textContent = '...Loading';
        } else if (!isLoading && button.originalText) {
            button.textContent = button.originalText;
            delete button.originalText;
        }
    }
}

/**
 * Utility to run a fetch request with a timeout.
 */
async function fetchWithTimeout(url, options = {}, timeout = 8000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(id);
        return response;
    } catch (error) {
        clearTimeout(id);
        if (error.name === 'AbortError') {
            throw new Error('Network request timed out.');
        }
        throw error;
    }
}

/**
 * Utility function to debounce repeated function calls.
 */
function debounce(func, delay) {
    let timeoutId;
    return function(...args) {
        const context = this;
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            func.apply(context, args);
        }, delay);
    };
}

/**
 * Universal function to display notifications.
 */
function showNotification(message, type = 'info', duration = null) {
    if (!uiElements.notificationContainer) {
        console.warn('Notification container not found. Cannot display notification.');
        return;
    }

    const finalDuration = duration || (type === 'error' || type === 'warning' ? 7000 : 3500);

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;

    if (message.includes('<a') && message.includes('</a>')) {
        notification.innerHTML = message;
    } else {
        notification.textContent = message;
    }

    uiElements.notificationContainer.prepend(notification);

    setTimeout(() => {
        notification.remove();
    }, finalDuration);
}

/**
 * Formats BigInt considering decimal places.
 */
function formatBigInt(amount, decimals) {
    if (amount === undefined || amount === null || decimals === undefined || decimals === null || isNaN(decimals)) return '0';
    let bigIntAmount;
    try {
        bigIntAmount = BigInt(amount);
    } catch (e) {
        return '0';
    }

    const str = bigIntAmount.toString();
    if (str === '0') return '0';

    if (str.length <= decimals) {
        const paddedStr = '0'.repeat(decimals - str.length) + str;
        const fractionalPart = paddedStr.slice(-decimals).replace(/0+$/, '');
        return '0' + (fractionalPart.length > 0 ? '.' + fractionalPart : '');
    } else {
        const integerPart = str.slice(0, str.length - decimals);
        const fractionalPart = str.slice(str.length - decimals).replace(/0+$/, '');
        return integerPart + (fractionalPart.length > 0 ? '.' + fractionalPart : '');
    }
}

/**
 * Converts a string value (user input) into BigInt.
 */
function parseAmountToBigInt(amountStr, decimals) {
    if (!amountStr || amountStr.trim() === '') return BigInt(0);

    const cleanedStr = amountStr.trim().replace(/[^\d.]/g, '');

    if (cleanedStr.split('.').length > 2) {
        throw new Error('Invalid number format: multiple decimal points.');
    }

    const parts = cleanedStr.split('.');
    const integerPart = parts[0] || '0';
    let fractionalPart = parts.length > 1 ? parts[1] : '';

    if (fractionalPart.length > decimals) {
        throw new Error(`Amount exceeds maximum precision of ${decimals} decimal places.`);
    }

    const paddedFractionalPart = fractionalPart.padEnd(decimals, '0');

    if (integerPart === '0' && BigInt(paddedFractionalPart) === BigInt(0) && amountStr !== '0' && amountStr !== '0.') {
         return BigInt(0);
    }

    return BigInt(integerPart + paddedFractionalPart);
}

/**
 * Closes all open modals and the main navigation menu.
 */
function closeAllPopups() {
    const modals = [
        uiElements.nftDetailsModal, uiElements.nftModal, uiElements.mintNftModal, uiElements.createProposalModal
    ].filter(Boolean);

    let wasModalOpen = false;

    modals.forEach(modal => {
        if (modal && modal.style.display === 'flex') {
            modal.style.display = 'none';
            modal.classList.remove('is-open'); 
            wasModalOpen = true;
        }
    });
    
    // Также закрываем гамбургер-меню, если оно открыто
    const mainNav = document.getElementById('mainNav'); // Использование прямого ID для надежности
    const navOverlay = document.getElementById('navOverlay'); 
    const menuToggle = document.getElementById('menuToggle');

    if (mainNav && mainNav.classList.contains('is-open')) {
        mainNav.classList.remove('is-open');
        navOverlay.classList.remove('is-open');
        if (menuToggle) {
             menuToggle.classList.remove('is-active');
             menuToggle.setAttribute('aria-expanded', 'false');
        }
        wasModalOpen = true; 
    }

    // Разблокировать прокрутку, если что-то было закрыто.
    if (wasModalOpen) {
        toggleScrollLock(false); 
    }
}
// --------------------------------------------------------

/**
 * Updates staking and balance UI elements after a transaction.
 */
async function updateStakingAndBalanceUI() {
    try {
        await Promise.all([
            fetchUserBalances(), // Update MOCK/real balances
            updateStakingUI(),
            updateSwapBalances() // Use updated MOCK/real balances
        ]);
    } catch (error) {
        console.error("Error refreshing staking/balance UI after transaction:", error);
        showNotification("Error updating staking and balance displays.", 'error');
    }
}

/**
 * Returns an Anchor program instance.
 */
function getAnchorProgram(programId, idl) {
    if (!appState.connection || !appState.provider) {
        throw new Error("Wallet not connected or connection unavailable for Anchor.");
    }
    const anchorProvider = new Anchor.AnchorProvider(
        appState.connection,
        appState.provider,
        { commitment: "confirmed" }
    );
    if (!idl || !idl.version) {
        throw new Error("STAKING_IDL is missing or empty. Cannot interact with the program.");
    }
    return new Anchor.Program(idl, programId, anchorProvider);
}

/**
 * Gets the decimal count for a given token mint address.
 */
function getTokenDecimals(mintAddress) {
    if (mintAddress.equals(TOKEN_MINT_ADDRESSES['SOL'])) {
        return SOL_DECIMALS;
    }
    if (mintAddress.equals(TOKEN_MINT_ADDRESSES['AFOX'])) {
        return AFOX_DECIMALS;
    }
    return 9;
}

function getSolanaTxnFeeReserve() {
    return TXN_FEE_RESERVE_SOL;
}

// =========================================================================================
// --- WALLET & CONNECTION FUNCTIONS (Fully implemented) ---
// =========================================================================================

/**
 * Checks RPC connection status.
 */
async function checkRpcHealth(connection) {
    try {
        await connection.getLatestBlockhash('confirmed');
        return true;
    } catch (rpcError) {
        console.error('RPC endpoint failed health check:', rpcError);
        return false;
    }
}

/**
 * Robust function to get a working RPC connection.
 */
async function getRobustConnection() {
    const connectionOptions = { commitment: 'confirmed' };

    const primaryConnection = new SolanaWeb3.Connection(JUPITER_RPC_ENDPOINT, connectionOptions);

    if (await checkRpcHealth(primaryConnection)) {
        console.log('Using Primary RPC:', JUPITER_RPC_ENDPOINT);
        return primaryConnection;
    }

    console.warn('Primary RPC failed check. Using backup endpoint.');
    const backupConnection = new SolanaWeb3.Connection(BACKUP_RPC_ENDPOINT, connectionOptions);

    if (await checkRpcHealth(backupConnection)) {
        console.log('Using Backup RPC:', BACKUP_RPC_ENDPOINT);
        return backupConnection;
    }

    throw new Error('Both primary and backup RPC endpoints failed to connect or are unhealthy.');
}

/**
 * Updates the UI with the connected wallet address.
 */
function updateWalletUI(address) {
    const shortAddress = address ? `${address.substring(0, 4)}...${address.substring(address.length - 4)}` : 'Connect Wallet';

    uiElements.walletAddressDisplays.forEach(el => {
        el.textContent = shortAddress;
        el.classList.toggle('connected', !!address);
    });
}

/**
 * Handles changes to the wallet public key (connect/disconnect).
 */
function handlePublicKeyChange(newPublicKey) {
    appState.walletPublicKey = newPublicKey;

    if (newPublicKey) {
        const address = newPublicKey.toBase58();
        updateWalletUI(address);

        // MOCK: Handle initial state for MOCK DB and Balances
        if (!MOCK_DB.staking[address]) {
             MOCK_DB.staking[address] = { stakedAmount: '0', rewards: '0', stakeHistory: [] };
             // Initialize MOCK balances on first connection
             appState.userBalances.AFOX = parseAmountToBigInt('1000.0', AFOX_DECIMALS);
             appState.userBalances.SOL = parseAmountToBigInt('1.0', SOL_DECIMALS);
             persistMockData();
        }

        // Update MOCK NFT owners from 'NO_WALLET_CONNECTED' to the actual user
        MOCK_DB.nfts.filter(n => n.owner === 'NO_WALLET_CONNECTED').forEach(n => n.owner = address);

        loadUserNFTs();
        updateStakingAndBalanceUI();
    } else {
        updateWalletUI(null);
        loadUserNFTs();
        appState.userBalances.SOL = BigInt(0);
        appState.userBalances.AFOX = BigInt(0);
        updateStakingAndBalanceUI();
        appState.currentOpenNft = null;
        showNotification('Wallet disconnected.', 'info');
    }
}

/**
 * Attaches event listeners to the wallet provider.
 */
function registerProviderListeners() {
    if (appState.provider && !appState.areProviderListenersAttached) {
        appState.provider.on('connect', () => handlePublicKeyChange(appState.provider.publicKey));
        appState.provider.on('disconnect', () => handlePublicKeyChange(null));
        appState.areProviderListenersAttached = true;
    }
}

/**
 * Connects the wallet using the provided adapter.
 */
async function connectWallet(adapter) {
    let shouldSetLoading = true;
    if (uiElements.connectWalletButtons && uiElements.connectWalletButtons.find(btn => btn.textContent === 'Подключение...')) {
         shouldSetLoading = false; 
    }
    if (shouldSetLoading) setLoadingState(true);

    try {
        const selectedAdapter = WALLETS.find(w => w.name === adapter.name);

        if (adapter.name === 'Phantom' && !window.solana) {
             const installUrl = 'https://phantom.app/';
            showNotification(`Phantom wallet not found. Please install it: <a href="${installUrl}" target="_blank">Install Phantom</a>`, 'warning', 10000);
            return;
        } else if (!selectedAdapter) {
             showNotification(`Wallet adapter for ${adapter.name} not found.`, 'warning', 5000);
             return;
        }

        appState.provider = selectedAdapter;

        appState.connection = await getRobustConnection();

        if (appState.provider.publicKey) {
             handlePublicKeyChange(appState.provider.publicKey);
        } else {
            await appState.provider.connect();
        }

        registerProviderListeners();
        closeAllPopups();
        showNotification('Wallet successfully connected! 🦊', 'success');

    } catch (error) {
        console.error('Wallet connection failed:', error);
        appState.provider = null;
        appState.connection = null;
        appState.walletPublicKey = null;
        updateWalletUI(null);
        const message = error.message.includes('Both primary and backup') ? error.message : `Connection failed: ${error.message.substring(0, 70)}...`;
        showNotification(message, 'error');
        throw error; // Re-throw error for the wrapper to handle button text cleanup
    } finally {
        if (shouldSetLoading) setLoadingState(false);
    }
}

/**
 * Fetches real balances from RPC (SOL) and MOCK balances (AFOX) and updates appState.userBalances.
 */
async function fetchUserBalances() {
    if (!appState.walletPublicKey || !appState.connection) {
        appState.userBalances.SOL = BigInt(0);
        return;
    }

    try {
        const solBalance = await appState.connection.getBalance(appState.walletPublicKey, 'confirmed');
        appState.userBalances.SOL = BigInt(solBalance);
    } catch (error) {
        console.error("Failed to fetch real SOL balance, using MOCK fallback:", error);
        if (appState.userBalances.SOL === BigInt(0)) {
            appState.userBalances.SOL = parseAmountToBigInt('0.05', SOL_DECIMALS);
        }
        showNotification("Warning: Could not fetch real SOL balance. Using MOCK fallback.", 'warning');
    }

    // MOCK AFOX: Update MOCK AFOX balance if not present in MOCK_DB
    const userKey = appState.walletPublicKey.toBase58();
    if (!MOCK_DB.staking[userKey] && appState.userBalances.AFOX === BigInt(0)) {
         appState.userBalances.AFOX = parseAmountToBigInt('1000.0', AFOX_DECIMALS);
    }
}


// =========================================================================================
// --- STAKING FUNCTIONS (ANCHOR TEMPLATES + MOCK LOGIC) ---
// =========================================================================================

/**
 * Updates the staking UI elements with current user data (MOCK).
 */
async function updateStakingUI() {
    if (!appState.walletPublicKey) {
        const elements = [uiElements.userAfoxBalance, uiElements.userStakedAmount, uiElements.userRewardsAmount];
        elements.forEach(el => { if (el) el.textContent = '0 AFOX'; });
        [uiElements.stakeAfoxBtn, uiElements.claimRewardsBtn, uiElements.unstakeAfoxBtn].filter(Boolean).forEach(btn => btn.disabled = true);
        if (uiElements.stakingApr) uiElements.stakingApr.textContent = '—';
        return;
    }

    // 1. **MOCK** FETCH
    await fetchUserStakingData();

    const afoxBalanceBigInt = appState.userBalances.AFOX;
    const stakedAmountBigInt = appState.userStakingData.stakedAmount;
    const rewardsAmountBigInt = appState.userStakingData.rewards;

    if (uiElements.userAfoxBalance) uiElements.userAfoxBalance.textContent = `${formatBigInt(afoxBalanceBigInt, AFOX_DECIMALS)} AFOX`;
    if (uiElements.userStakedAmount) uiElements.userStakedAmount.textContent = `${formatBigInt(stakedAmountBigInt, AFOX_DECIMALS)} AFOX`;
    if (uiElements.userRewardsAmount) uiElements.userRewardsAmount.textContent = `${formatBigInt(rewardsAmountBigInt, AFOX_DECIMALS)} AFOX`;
    if (uiElements.stakingApr) uiElements.stakingApr.textContent = '12% APR (MOCK)';

    if (uiElements.stakeAfoxBtn) uiElements.stakeAfoxBtn.disabled = false;
    if (uiElements.claimRewardsBtn) uiElements.claimRewardsBtn.disabled = rewardsAmountBigInt === BigInt(0);
    if (uiElements.unstakeAfoxBtn) uiElements.unstakeAfoxBtn.disabled = stakedAmountBigInt === BigInt(0);
}

/**
 * ✅ Implemented: Reading staking data from the blockchain (MOCK ANCHOR).
 */
async function fetchUserStakingData() {
    if (!appState.walletPublicKey || !STAKING_IDL.version) {
        appState.userStakingData.stakedAmount = BigInt(0);
        appState.userStakingData.rewards = BigInt(0);
        return;
    }

    try {
        const program = getAnchorProgram(STAKING_PROGRAM_ID, STAKING_IDL);
        const sender = appState.walletPublicKey;

        // 1. PDA calculation (ИСПРАВЛЕНО: Добавлен Pool State Pubkey)
        const [userStakingAccountPDA] = SolanaWeb3.PublicKey.findProgramAddressSync(
            [
                Anchor.utils.bytes.utf8.encode(STAKING_ACCOUNT_SEED),
                sender.toBuffer(),
                AFOX_POOL_STATE_PUBKEY.toBuffer(), // 👈 КРИТИЧНОЕ ИЗМЕНЕНИЕ
            ],
            STAKING_PROGRAM_ID
        );

        // 2. Deserialization (MOCK-READ: If the real account is not found, use MOCK_DB)
        try {
            // In real code: const stakingData = await program.account.userStakingAccount.fetch(userStakingAccountPDA);
            // MOCK:
            const userKey = sender.toBase58();
            const mockData = MOCK_DB.staking[userKey];

            if (!mockData) throw new Error("MOCK data not initialized.");

            // ⚠️ CHANGE: FIELD NAMES MUST MATCH YOUR IDL!
            appState.userStakingData.stakedAmount = BigInt(mockData.stakedAmount.toString());
            appState.userStakingData.rewards = BigInt(mockData.rewards.toString());
        } catch (e) {
            // Account not found (or MOCK not initialized)
            appState.userStakingData.stakedAmount = BigInt(0);
            appState.userStakingData.rewards = BigInt(0);
        }

    } catch (e) {
        console.error("Failed to fetch staking data:", e);
        appState.userStakingData.stakedAmount = BigInt(0);
        appState.userStakingData.rewards = BigInt(0);
    }
}


/**
 * ✅ Implemented: Sending AFOX staking transaction (ANCHOR TEMPLATE + MOCK).
 */
async function handleStakeAfox() {
    if (!appState.walletPublicKey || !STAKING_IDL.version) {
        showNotification('Wallet not connected or program IDL missing.', 'warning');
        return;
    }
    const amountStr = uiElements.stakeAmountInput.value;
    setLoadingState(true, uiElements.stakeAfoxBtn);

    try {
        const stakeAmountBigInt = parseAmountToBigInt(amountStr, AFOX_DECIMALS);
        if (stakeAmountBigInt === BigInt(0)) throw new Error('Enter a valid amount for staking.');
        if (appState.userBalances.AFOX < stakeAmountBigInt) throw new Error('Insufficient AFOX for staking.');

        showNotification(`Preparing transaction to stake ${formatBigInt(stakeAmountBigInt, AFOX_DECIMALS)} AFOX... (Simulation)`, 'info', 5000);

        const program = getAnchorProgram(STAKING_PROGRAM_ID, STAKING_IDL);
        const sender = appState.walletPublicKey;

        // 1. Get user's ATA
        const userAfoxATA = await SolanaWeb3.Token.getAssociatedTokenAddress(
            ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID, AFOX_TOKEN_MINT_ADDRESS, sender
        );
        // 2. Calculate staking account PDA (ИСПРАВЛЕНО: Добавлен Pool State Pubkey)
        const [userStakingAccountPDA] = SolanaWeb3.PublicKey.findProgramAddressSync(
            [
                Anchor.utils.bytes.utf8.encode(STAKING_ACCOUNT_SEED), 
                sender.toBuffer(),
                AFOX_POOL_STATE_PUBKEY.toBuffer(), // 👈 ИСПРАВЛЕНО
            ],
            STAKING_PROGRAM_ID
        );

        // 🔴 ВАШ КОД: Create instruction (ANCHOR TEMPLATE) 
        const tx = await program.methods.stake(new Anchor.BN(stakeAmountBigInt.toString()))
            .accounts({
                staker: sender,
                userStakingAccount: userStakingAccountPDA,
                tokenFrom: userAfoxATA,
                // НОВЫЕ КЛЮЧИ:
                poolState: AFOX_POOL_STATE_PUBKEY, 
                poolVault: AFOX_POOL_VAULT_PUBKEY, // PDA-хранилище пула
                tokenProgram: TOKEN_PROGRAM_ID,
                systemProgram: SYSTEM_PROGRAM_ID,
                // ... другие необходимые ключи (например, rent)
            })
            .transaction();

        // 🟢 REAL SUBMISSION (Replaced by MOCK logic)
        // const signature = await appState.provider.sendAndConfirm(tx, []);

        // --- MOCK LOGIC START ---
        await new Promise(resolve => setTimeout(resolve, 3000));
        const userKey = sender.toBase58();
        const stakedAmountOldBigInt = BigInt(MOCK_DB.staking[userKey].stakedAmount || '0');
        const rewardsOldBigInt = BigInt(MOCK_DB.staking[userKey].rewards || '0');

        const stakedAmountNewBigInt = stakedAmountOldBigInt + stakeAmountBigInt;
        const mockRewardIncreaseBigInt = (stakedAmountNewBigInt * BigInt(1)) / BigInt(1000); // 0.1% increase for MOCK
        const rewardsNewBigInt = rewardsOldBigInt + mockRewardIncreaseBigInt;

        MOCK_DB.staking[userKey].stakedAmount = stakedAmountNewBigInt.toString();
        MOCK_DB.staking[userKey].rewards = rewardsNewBigInt.toString();
        appState.userBalances.AFOX = appState.userBalances.AFOX - stakeAmountBigInt;
        persistMockData();
        const signature = 'MOCK_STAKE_SIG_' + Date.now();
        // --- MOCK LOGIC END ---

        // 🟢 SECURE LOGGING VIA WORKER
        await sendLogToFirebase(userKey, 'STAKE', stakeAmountBigInt); 

        showNotification(`Successful staking! Signature: ${signature.substring(0, 8)}... (Simulation Confirmed)`, 'success', 7000);

        uiElements.stakeAmountInput.value = '';
        await updateStakingAndBalanceUI();

    } catch (error) {
        showNotification(`Staking failed: ${error.message.substring(0, 100)}`, 'error');
    } finally {
        setLoadingState(false, uiElements.stakeAfoxBtn);
    }
}

/**
 * ✅ Implemented: Sending claim rewards transaction (ANCHOR TEMPLATE + MOCK).
 */
async function handleClaimRewards() {
    if (!appState.walletPublicKey || !STAKING_IDL.version) {
        showNotification('Wallet not connected or program IDL missing.', 'warning');
        return;
    }
    setLoadingState(true, uiElements.claimRewardsBtn);

    try {
        if (appState.userStakingData.rewards === BigInt(0)) { showNotification('No rewards to claim.', 'warning', 3000); return; }

        showNotification('Preparing claim rewards transaction... (Simulation)', 'info');

        const program = getAnchorProgram(STAKING_PROGRAM_ID, STAKING_IDL);
        const sender = appState.walletPublicKey;

        // 1. Calculate staking account PDA (ИСПРАВЛЕНО: Добавлен Pool State Pubkey)
        const [userStakingAccountPDA] = SolanaWeb3.PublicKey.findProgramAddressSync(
            [
                Anchor.utils.bytes.utf8.encode(STAKING_ACCOUNT_SEED), 
                sender.toBuffer(),
                AFOX_POOL_STATE_PUBKEY.toBuffer(), // 👈 ИСПРАВЛЕНО
            ],
            STAKING_PROGRAM_ID
        );
        // 2. User's ATA for rewards
        const userRewardATA = await SolanaWeb3.Token.getAssociatedTokenAddress(
            ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID, AFOX_TOKEN_MINT_ADDRESS, sender
        );

        // 🔴 ВАШ КОД: Create instruction (ANCHOR TEMPLATE) 
         const tx = await program.methods.claimRewards()
            .accounts({
                staker: sender,
                userStakingAccount: userStakingAccountPDA,
                userRewardTokenAccount: userRewardATA,
                // НОВЫЕ КЛЮЧИ:
                poolState: AFOX_POOL_STATE_PUBKEY,
                rewardsVault: AFOX_REWARDS_VAULT_PUBKEY, // PDA-хранилище наград
                tokenProgram: TOKEN_PROGRAM_ID,
            })
            .transaction();

        // 🟢 REAL SUBMISSION (Replaced by MOCK logic)
        // const signature = await appState.provider.sendAndConfirm(tx, []);

        // --- MOCK LOGIC START ---
        await new Promise(resolve => setTimeout(resolve, 2500));
        const userKey = sender.toBase58();
        const claimedAmountBigInt = BigInt(MOCK_DB.staking[userKey].rewards || '0');

        MOCK_DB.staking[userKey].rewards = '0';
        appState.userBalances.AFOX = appState.userBalances.AFOX + claimedAmountBigInt;
        persistMockData();
        const signature = 'MOCK_CLAIM_SIG_' + Date.now();
        // --- MOCK LOGIC END ---

        // 🟢 SECURE LOGGING VIA WORKER
        await sendLogToFirebase(userKey, 'CLAIM', claimedAmountBigInt);

        showNotification(`Rewards successfully claimed! Signature: ${signature.substring(0, 8)}... (Simulation Confirmed)`, 'success', 5000);

        await updateStakingAndBalanceUI();

    } catch (error) {
        showNotification(`Claim failed. Details: ${error.message.substring(0, 100)}`, 'error');
    } finally {
        setLoadingState(false, uiElements.claimRewardsBtn);
    }
}

/**
 * ✅ Implemented: Sending unstaking transaction (ANCHOR TEMPLATE + MOCK).
 */
async function handleUnstakeAfox() {
    if (!appState.walletPublicKey || !STAKING_IDL.version) {
        showNotification('Wallet not connected or program IDL missing.', 'warning');
        return;
    }
    setLoadingState(true, uiElements.unstakeAfoxBtn);

    try {
        if (appState.userStakingData.stakedAmount === BigInt(0)) { showNotification('No AFOX staked.', 'warning', 3000); return; }

        showNotification('Preparing transaction for unstaking... (Simulation)', 'info', 5000);

        const program = getAnchorProgram(STAKING_PROGRAM_ID, STAKING_IDL);
        const sender = appState.walletPublicKey;

        // 1. Calculate staking account PDA (ИСПРАВЛЕНО: Добавлен Pool State Pubkey)
        const [userStakingAccountPDA] = SolanaWeb3.PublicKey.findProgramAddressSync(
            [
                Anchor.utils.bytes.utf8.encode(STAKING_ACCOUNT_SEED), 
                sender.toBuffer(),
                AFOX_POOL_STATE_PUBKEY.toBuffer(), // 👈 ИСПРАВЛЕНО
            ],
            STAKING_PROGRAM_ID
        );
        // 2. User's ATA for AFOX
        const userAfoxATA = await SolanaWeb3.Token.getAssociatedTokenAddress(
            ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID, AFOX_TOKEN_MINT_ADDRESS, sender
        );

        // 🔴 ВАШ КОД: Create instruction (ANCHOR TEMPLATE) 
         const tx = await program.methods.unstake()
            .accounts({
                staker: sender,
                userStakingAccount: userStakingAccountPDA,
                tokenTo: userAfoxATA, // User's ATA
                // НОВЫЕ КЛЮЧИ:
                poolState: AFOX_POOL_STATE_PUBKEY,
                poolVault: AFOX_POOL_VAULT_PUBKEY, // PDA-хранилище пула (откуда выводятся токены)
                daoTreasuryVault: DAO_TREASURY_VAULT_PUBKEY, // 👈 Куда идут штрафы
                tokenProgram: TOKEN_PROGRAM_ID,
            })
            .transaction();

        // 🟢 REAL SUBMISSION (Replaced by MOCK logic)
        // const signature = await appState.provider.sendAndConfirm(tx, []);

        // --- MOCK LOGIC START ---
        await new Promise(resolve => setTimeout(resolve, 3000));
        const userKey = sender.toBase58();
        const stakedAmountBigInt = BigInt(MOCK_DB.staking[userKey].stakedAmount || '0');

        // MOCK: Simulate penalty logic if needed, but for now, full unstake in MOCK
        MOCK_DB.staking[userKey].stakedAmount = '0';
        appState.userBalances.AFOX = appState.userBalances.AFOX + stakedAmountBigInt;
        persistMockData();
        const signature = 'MOCK_UNSTAKE_SIG_' + Date.now();
        // --- MOCK LOGIC END ---

        // 🟢 SECURE LOGGING VIA WORKER
        await sendLogToFirebase(userKey, 'UNSTAKE', stakedAmountBigInt);

        showNotification(`Successful unstaking! Signature: ${signature.substring(0, 8)}... (Simulation Confirmed)`, 'success', 7000);

        await updateStakingAndBalanceUI();

    } catch (error) {
        showNotification(`Unstaking failed. Details: ${error.message.substring(0, 100)}`, 'error');
    } finally {
        setLoadingState(false, uiElements.unstakeAfoxBtn);
    }
}


// =========================================================================================
// --- NFT MARKETPLACE FUNCTIONS (MOCK) ---
// =========================================================================================

/**
 * MOCK: Load user NFTs (owned)
 */
function loadUserNFTs() {
    if (!uiElements.userNftList) return;

    const userAddress = appState.walletPublicKey ? appState.walletPublicKey.toBase58() : 'NO_WALLET_CONNECTED';
    const userNfts = MOCK_DB.nfts.filter(n => n.owner === userAddress && !n.isListed);

    uiElements.userNftList.innerHTML = '';

    if (userNfts.length === 0) {
        uiElements.userNftList.innerHTML = `<p class="empty-list-message">${appState.walletPublicKey ? 'You currently own no unlisted AlphaFox NFTs.' : 'Connect your wallet to see your NFTs.'}</p>`;
        if (uiElements.nftToSellSelect) uiElements.nftToSellSelect.innerHTML = '<option value="">Select an NFT</option>';
        return;
    }

    if (uiElements.nftToSellSelect) {
        const unlistedNfts = MOCK_DB.nfts.filter(n => n.owner === userAddress && !n.isListed);
        uiElements.nftToSellSelect.innerHTML = '<option value="">Select an NFT</option>' +
            unlistedNfts.map(nft => `<option value="${nft.mint}">${nft.name}</option>`).join('');
    }

    userNfts.forEach(nft => {
        const card = createNftCard(nft);
        uiElements.userNftList.appendChild(card);
    });
}

/**
 * MOCK: Load NFTs listed for sale
 */
function loadMarketplaceNFTs() {
    if (!uiElements.marketplaceNftList) return;

    const connectedOwner = appState.walletPublicKey ? appState.walletPublicKey.toBase58() : null;
    const marketplaceNfts = MOCK_DB.nfts.filter(n => n.isListed === true && n.owner !== connectedOwner);

    uiElements.marketplaceNftList.innerHTML = '';

    if (marketplaceNfts.length === 0) {
        uiElements.marketplaceNftList.innerHTML = '<p class="empty-list-message">No NFTs are currently listed for sale.</p>';
        return;
    }

    marketplaceNfts.forEach(nft => {
        const card = createNftCard(nft);
        uiElements.marketplaceNftList.appendChild(card);
    });
}

/**
 * Creates the HTML element for an NFT card.
 */
function createNftCard(nft) {
    const card = document.createElement('div');
    card.className = 'nft-card';
    card.dataset.mint = nft.mint;

    const image = document.createElement('img');
    image.src = nft.image;
    image.alt = nft.name;
    image.loading = 'lazy';

    const title = document.createElement('h3');
    title.className = 'nft-name';
    title.textContent = nft.name;

    const priceP = document.createElement('p');
    priceP.className = 'nft-price';
    if (nft.isListed && nft.price > 0) {
        priceP.textContent = `${nft.price.toFixed(2)} SOL`;
    } else {
        priceP.textContent = 'Not Listed';
        priceP.classList.add('nft-unlisted');
    }

    const detailsBtn = document.createElement('button');
    detailsBtn.className = 'view-details-btn';
    detailsBtn.textContent = 'Details';

    card.appendChild(image);
    card.appendChild(title);
    card.appendChild(priceP);
    card.appendChild(detailsBtn);

    return card;
}

/**
 * Displays the details modal for a selected NFT.
 */
function showNftDetails(nft, isUserNft) {
    if (!uiElements.nftDetailsModal) return;

    appState.currentOpenNft = nft;

    if (uiElements.nftDetailImage) uiElements.nftDetailImage.src = nft.image;
    if (uiElements.nftDetailName) uiElements.nftDetailName.textContent = nft.name;
    if (uiElements.nftDetailDescription) uiElements.nftDetailDescription.textContent = nft.description;
    if (uiElements.nftDetailOwner) uiElements.nftDetailOwner.textContent = `${nft.owner.substring(0, 8)}...`;
    if (uiElements.nftDetailMint) uiElements.nftDetailMint.textContent = `${nft.mint.substring(0, 8)}...`;

    const copyBtn = document.querySelector('[data-copy-target]');
    if (copyBtn) copyBtn.dataset.copyTarget = nft.mint;

    // Attributes
    if (uiElements.attributesList) {
        uiElements.attributesList.innerHTML = '';
        const attributes = nft.attributes || [];
        attributes.forEach(attr => {
            const li = document.createElement('li');
            const traitType = document.createElement('strong');
            traitType.textContent = attr.trait_type + ':';

            const valueSpan = document.createElement('span');
            valueSpan.textContent = ` ${attr.value}`;

            li.appendChild(traitType);
            li.appendChild(valueSpan);
            uiElements.attributesList.appendChild(li);
        });
        if (attributes.length === 0) uiElements.attributesList.innerHTML = '<li>No attributes listed.</li>';
    }

    // History
    if (uiElements.nftDetailHistory) {
        const history = MOCK_DB.nftHistory[nft.mint] || [];

        uiElements.nftDetailHistory.innerHTML = '';
        history.reverse().forEach(item => {
            const date = new Date(item.timestamp).toLocaleDateString();
            const toShort = item.to ? `${item.to.substring(0, 8)}...` : '';
            const fromShort = item.from ? `${item.from.substring(0, 8)}...` : '';
            let text = '';

            if (item.type === 'Mint') text = `${date}: Minted to ${toShort}`;
            else if (item.type === 'Transfer') text = `${date}: Transferred to ${toShort}`;
            else if (item.type === 'List') text = `${date}: Listed for ${item.price} SOL`;
            else if (item.type === 'Sale') text = `${date}: Sold for ${item.price} SOL to ${toShort}`;
            else if (item.type === 'Unlist') text = `${date}: Unlisted`;
            else text = `${date}: ${item.type} event.`;

            const li = document.createElement('li');
            li.textContent = text;
            uiElements.nftDetailHistory.appendChild(li);
        });
    }

    // Action Buttons
    const connectedOwner = appState.walletPublicKey ? appState.walletPublicKey.toBase58() : null;
    const isOwner = connectedOwner === nft.owner;

    if (uiElements.nftDetailBuyBtn) {
        const showBuy = nft.isListed && !isOwner && connectedOwner;
        uiElements.nftDetailBuyBtn.style.display = showBuy ? 'block' : 'none';
        uiElements.nftDetailBuyBtn.textContent = `Buy for ${nft.price.toFixed(2)} SOL`;
        uiElements.nftDetailBuyBtn.disabled = !showBuy;
    }

    if (uiElements.nftDetailSellBtn) {
        const showSell = isOwner && connectedOwner;
        uiElements.nftDetailSellBtn.style.display = (showSell && nft.isListed) ? 'block' : 'none';
        uiElements.nftDetailSellBtn.textContent = 'Unlist NFT';
        uiElements.nftDetailSellBtn.disabled = !(showSell && nft.isListed);
    }

    if (uiElements.nftDetailTransferBtn) {
        const showTransfer = isOwner && connectedOwner && !nft.isListed;
        uiElements.nftDetailTransferBtn.style.display = showTransfer ? 'block' : 'none';
        uiElements.nftDetailTransferBtn.disabled = !showTransfer;
    }

    uiElements.nftDetailsModal.style.display = 'flex';
    toggleScrollLock(true); // Блокировка прокрутки при открытии модального окна
}

/**
 * MOCK: Handles buying an NFT from the marketplace.
 */
async function handleBuyNft() {
    if (!appState.walletPublicKey || !appState.currentOpenNft || !appState.currentOpenNft.isListed) {
        showNotification('Please connect your wallet or NFT is not listed.', 'warning');
        return;
    }

    const nft = appState.currentOpenNft;
    const priceSol = nft.price;
    const solBalanceLamports = appState.userBalances.SOL;
    const requiredLamports = parseAmountToBigInt(priceSol.toString(), SOL_DECIMALS);

    if (solBalanceLamports < requiredLamports) {
         showNotification(`Insufficient SOL balance. Required: ${priceSol.toFixed(2)} SOL.`, 'error');
         return;
    }

    setLoadingState(true, uiElements.nftDetailBuyBtn);

    showNotification(`Buying ${nft.name} for ${nft.price} SOL... (Simulation)`, 'info', 5000);

    try {
        await new Promise(resolve => setTimeout(resolve, 3000));

        const sellerAddress = nft.owner;
        nft.owner = appState.walletPublicKey.toBase58();
        nft.isListed = false;
        nft.price = 0;

        appState.userBalances.SOL = solBalanceLamports - requiredLamports;

        persistMockData();

        MOCK_DB.nftHistory[nft.mint].push({ type: 'Sale', timestamp: new Date().toISOString(), price: priceSol, from: sellerAddress, to: nft.owner });

        showNotification(`${nft.name} successfully purchased!`, 'success');

        closeAllPopups();
        loadUserNFTs();
        loadMarketplaceNFTs();
        await updateStakingAndBalanceUI(); // Update balances

    } catch (error) {
        showNotification(`Purchase failed: ${error.message.substring(0, 70)}...`, 'error');
    } finally {
        setLoadingState(false, uiElements.nftDetailBuyBtn);
    }
}

/**
 * MOCK: Handles unlisting an NFT.
 */
function handleUnlistNft() {
    if (!appState.walletPublicKey || !appState.currentOpenNft || appState.currentOpenNft.owner !== appState.walletPublicKey.toBase58() || !appState.currentOpenNft.isListed) {
        showNotification('Invalid NFT or you are not the owner/it is not listed.', 'error');
        return;
    }

    const nft = appState.currentOpenNft;

    setLoadingState(true, uiElements.nftDetailSellBtn);
    showNotification(`Unlisting ${nft.name}... (Simulation)`, 'info');

    try {
        setTimeout(() => {
            nft.isListed = false;
            nft.price = 0;
            persistMockData();

            MOCK_DB.nftHistory[nft.mint].push({ type: 'Unlist', timestamp: new Date().toISOString() });

            showNotification(`${nft.name} successfully unlisted!`, 'success');

            closeAllPopups();
            loadUserNFTs();
            loadMarketplaceNFTs();
            setLoadingState(false, uiElements.nftDetailSellBtn);
        }, 2000);
    } catch (e) {
        showNotification('Unlisting failed.', 'error');
        setLoadingState(false, uiElements.nftDetailSellBtn);
    }
}

/**
 * MOCK: Handles the form submission for minting a new NFT.
 */
function handleMintNftSubmit(event) {
    event.preventDefault();

    if (!appState.walletPublicKey) {
        showNotification('Please connect your wallet to mint an NFT.', 'warning');
        return;
    }

    const MINT_FEE_SOL = parseAmountToBigInt('0.05', SOL_DECIMALS);
    if (appState.userBalances.SOL < MINT_FEE_SOL) {
        showNotification('Insufficient SOL for minting fee (0.05 SOL).', 'error');
        return;
    }

    const form = event.target;
    const name = form.elements['mint-name'].value.trim();
    const description = form.elements['mint-description'].value.trim();
    const image = form.elements['mint-image'].value.trim() || 'https://via.placeholder.com/180x180/6c757d/ffffff?text=New+Fox';

    // ✅ SECURITY FIX: Stronger check for dangerous characters to prevent XSS/Injection.
    const invalidCharRegex = /[<>&'"\\]/g; 

    if (!name || name.length < 3 || name.length > 50 || invalidCharRegex.test(name)) {
        showNotification('Name must be 3-50 characters and cannot contain HTML or unsafe characters (<, >, &, \', ", \\).', 'error');
        return;
    }
    if (!description || description.length < 10 || description.length > 200 || invalidCharRegex.test(description)) {
        showNotification('Description must be 10-200 characters and cannot contain HTML or unsafe characters.', 'error');
        return;
    }

    setLoadingState(true);
    showNotification('Minting NFT... (Simulation in progress)', 'info');

    try {
        setTimeout(async () => {
            const newMint = `NFT_MINT_${Date.now()}`;
            const newNft = {
                mint: newMint,
                name: name,
                description: description,
                owner: appState.walletPublicKey.toBase58(),
                price: 0,
                isListed: false,
                image: image,
                attributes: [{ trait_type: 'Creator', value: 'AlphaFox DAO' }]
            };

            MOCK_DB.nfts.push(newNft);
            MOCK_DB.nftHistory[newMint] = [{ type: 'Mint', timestamp: new Date().toISOString(), to: appState.walletPublicKey.toBase58() }];

            appState.userBalances.SOL = appState.userBalances.SOL - MINT_FEE_SOL;

            persistMockData();

            showNotification(`NFT "${name}" successfully minted!`, 'success');
            form.reset();
            closeAllPopups();
            loadUserNFTs();
            await updateStakingAndBalanceUI();
            setLoadingState(false);
        }, 3000);
    } catch (e) {
        showNotification('Minting failed during simulation.', 'error');
        setLoadingState(false);
    }
}


/**
 * MOCK: Handles listing an NFT for sale.
 */
function handleListNftSubmit(event) {
    event.preventDefault();

    if (!appState.walletPublicKey) {
        showNotification('Please connect your wallet.', 'warning');
        return;
    }

    const form = event.target;
    const mint = form.elements['nft-to-sell'].value;
    const price = form.elements['list-price'].value;

    if (!mint) {
        showNotification('Please select an NFT to list.', 'warning');
        return;
    }

    const priceRegex = /^\d+(\.\d{1,9})?$/;
    if (!priceRegex.test(price) || parseFloat(price) <= 0) {
        showNotification('Please enter a valid listing price (up to 9 decimal places).', 'error');
        return;
    }

    const nft = MOCK_DB.nfts.find(n => n.mint === mint);
    if (!nft || nft.owner !== appState.walletPublicKey.toBase58() || nft.isListed) {
        showNotification('Invalid NFT or NFT is already listed.', 'error');
        return;
    }

    setLoadingState(true);
    showNotification(`Listing ${nft.name} for ${price} SOL... (Simulation)`, 'info');

    try {
        setTimeout(() => {
            nft.isListed = true;
            nft.price = parseFloat(price);
            persistMockData();

            MOCK_DB.nftHistory[mint].push({ type: 'List', timestamp: new Date().toISOString(), price: nft.price });

            showNotification(`${nft.name} successfully listed for ${price} SOL!`, 'success');
            form.reset();
            loadUserNFTs();
            loadMarketplaceNFTs();
            setLoadingState(false);
        }, 3000);
    } catch (e) {
        showNotification('Listing failed.', 'error');
        setLoadingState(false);
    }
}

/**
 * Helper: Basic Solana Public Key validation.
 */
function isValidSolanaAddress(address) {
    try {
        new SolanaWeb3.PublicKey(address);
        return true;
    } catch (e) {
        return false;
    }
}

/**
 * MOCK: Handles transferring an NFT to a new owner (Simulates the transaction logic).
 */
async function handleTransferNft() {
    if (!appState.walletPublicKey) {
        showNotification('Please connect your wallet.', 'warning');
        return;
    }

    if (!appState.connection) {
         showNotification('RPC connection not established. Try reconnecting wallet.', 'error');
         return;
    }

    if (!appState.currentOpenNft || appState.currentOpenNft.isListed || appState.currentOpenNft.owner !== appState.walletPublicKey.toBase58()) {
        showNotification('NFT is listed or you are not the owner.', 'error');
        return;
    }

    const recipientAddress = prompt("Enter the recipient's Solana address:");

    if (!recipientAddress) {
        showNotification('Transfer cancelled.', 'info');
        return;
    }

    if (!isValidSolanaAddress(recipientAddress)) {
        showNotification('Invalid Solana address entered.', 'error');
        return;
    }

    setLoadingState(true, uiElements.nftDetailTransferBtn);

    try {
        const recipientPublicKey = new SolanaWeb3.PublicKey(recipientAddress);
        const newOwner = recipientPublicKey.toBase58();

        // Check for sending to self is kept.
        if (newOwner === appState.walletPublicKey.toBase58()) {
             throw new Error('Cannot transfer to your own address.');
        }

        // In real code, this would be the logic for creating an SPL Token transaction
        // Here, MOCK logic is used to update MOCK_DB
        const nft = appState.currentOpenNft;
        const oldOwner = nft.owner;

        showNotification(`Transferring ${nft.name} to ${newOwner.substring(0, 8)}... (Simulation)`, 'info', 5000);

        await new Promise(resolve => setTimeout(resolve, 3000));

        // Transfer logic
        nft.owner = newOwner;
        persistMockData();

        MOCK_DB.nftHistory[nft.mint].push({ type: 'Transfer', timestamp: new Date().toISOString(), from: oldOwner, to: newOwner });

        showNotification(`${nft.name} successfully transferred!`, 'success');

        closeAllPopups();
        loadUserNFTs();
        loadMarketplaceNFTs();

    } catch (error) {
        console.error('Error during NFT transfer:', error);
        showNotification(`Transfer failed: ${error.message}`, 'error');
    } finally {
        setLoadingState(false, uiElements.nftDetailTransferBtn);
    }
}

// =========================================================================================
// --- SWAP FUNCTIONS (JUPITER API + MOCK TRANSACTION) ---
// =========================================================================================

/**
 * Updates balances for the "From" token in the swap section.
 */
async function updateSwapBalances() {
    if (!appState.walletPublicKey || !appState.provider) {
        if (uiElements.swapFromBalanceSpan) uiElements.swapFromBalanceSpan.textContent = '0';
        return;
    }

    const fromToken = uiElements.swapFromTokenSelect.value;

    let displayBalance = '0';
    const fromTokenMint = TOKEN_MINT_ADDRESSES[fromToken];

    if (fromTokenMint && fromTokenMint.equals(TOKEN_MINT_ADDRESSES['SOL'])) {
        const solBalance = appState.userBalances.SOL;
        displayBalance = formatBigInt(solBalance, SOL_DECIMALS);
    } else if (fromTokenMint && fromTokenMint.equals(TOKEN_MINT_ADDRESSES['AFOX'])) {
        const afoxBalance = appState.userBalances.AFOX;
        displayBalance = formatBigInt(afoxBalance, AFOX_DECIMALS);
    }

    if (uiElements.swapFromBalanceSpan) {
        uiElements.swapFromBalanceSpan.textContent = `${displayBalance} ${fromToken}`;
    }

    if (uiElements.swapFromAmountInput && uiElements.swapFromAmountInput.value.trim() !== '' && !appState.currentJupiterQuote) {
         const debouncedGetQuote = debounce(getQuote, 500);
         debouncedGetQuote();
    }
}

function clearSwapQuote() {
    appState.currentJupiterQuote = null;
    if (uiElements.swapToAmountInput) uiElements.swapToAmountInput.value = '';
    if (uiElements.priceImpactSpan) uiElements.priceImpactSpan.textContent = '0%';
    if (uiElements.lpFeeSpan) uiElements.lpFeeSpan.textContent = '0';
    if (uiElements.minReceivedSpan) uiElements.minReceivedSpan.textContent = '0';
    if (uiElements.executeSwapBtn) uiElements.executeSwapBtn.style.display = 'none';
}

function handleSwapDirectionChange() {
    const fromToken = uiElements.swapFromTokenSelect.value;
    const toToken = uiElements.swapToTokenSelect.value;

    uiElements.swapFromTokenSelect.value = toToken;
    uiElements.swapToTokenSelect.value = fromToken;

    if (uiElements.swapFromAmountInput) uiElements.swapFromAmountInput.value = '';
    if (uiElements.swapToAmountInput) uiElements.swapToAmountInput.value = '';

    clearSwapQuote();
    updateSwapBalances();
}

/**
 * Fetches a swap quote from Jupiter Aggregator (REAL API CALL).
 */
async function getQuote() {
    if (!appState.walletPublicKey || !appState.provider || !appState.connection) {
        clearSwapQuote();
        return;
    }

    const fromToken = uiElements.swapFromTokenSelect.value;
    const toToken = uiElements.swapToTokenSelect.value;
    const amountStr = uiElements.swapFromAmountInput.value;

    if (fromToken === toToken || !amountStr || amountStr.trim() === '') {
        clearSwapQuote();
        return;
    }

    const fromMint = TOKEN_MINT_ADDRESSES[fromToken];
    const toMint = TOKEN_MINT_ADDRESSES[toToken];
    const decimalsFrom = getTokenDecimals(fromMint);

    setLoadingState(true, uiElements.getQuoteBtn);

    try {
        const inputAmountBigInt = parseAmountToBigInt(amountStr, decimalsFrom);

        const balanceToCheck = fromMint.equals(TOKEN_MINT_ADDRESSES['SOL']) ?
            appState.userBalances.SOL - parseAmountToBigInt(getSolanaTxnFeeReserve().toString(), SOL_DECIMALS) :
            appState.userBalances.AFOX;

        if (inputAmountBigInt > balanceToCheck) {
             throw new Error(`Insufficient ${fromToken} balance.`);
        }

        const inputAmountLamports = inputAmountBigInt.toString();

        if (inputAmountBigInt === BigInt(0)) {
            clearSwapQuote();
            return;
        }

        const response = await fetchWithTimeout(`${JUPITER_API_URL}/quote?inputMint=${fromMint.toBase58()}&outputMint=${toMint.toBase58()}&amount=${inputAmountLamports}&slippageBps=50`, {}, 8000);

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Failed to get quote: ${errorData.error || response.statusText}`);
        }
        const data = await response.json();
        appState.currentJupiterQuote = data;

        const outputDecimals = getTokenDecimals(toMint);

        if (uiElements.swapToAmountInput) uiElements.swapToAmountInput.value = formatBigInt(appState.currentJupiterQuote.outAmount, outputDecimals);
        if (uiElements.priceImpactSpan) uiElements.priceImpactSpan.textContent = `${(appState.currentJupiterQuote.priceImpactPct * 100).toFixed(2)}%`;

        const lpFeeAmount = appState.currentJupiterQuote.lpFee && appState.currentJupiterQuote.lpFee.amount ? appState.currentJupiterQuote.lpFee.amount : '0';
        if (uiElements.lpFeeSpan) uiElements.lpFeeSpan.textContent = `${formatBigInt(lpFeeAmount, outputDecimals)} ${uiElements.swapToTokenSelect.value}`;
        if (uiElements.minReceivedSpan) uiElements.minReceivedSpan.textContent = `${formatBigInt(appState.currentJupiterQuote.otherAmountThreshold, outputDecimals)} ${uiElements.swapToTokenSelect.value}`;

        if (uiElements.executeSwapBtn) uiElements.executeSwapBtn.style.display = 'block';

    } catch (error) {
        console.error('Error fetching quote:', error);
        let message = error.message.includes('timed out') ? "Request timed out. Try again." : error.message;

        if (error.message.includes('Insufficient')) {
            message = error.message;
        }

        showNotification(`Error fetching quote: ${message.substring(0, 100)}`, 'error');
        clearSwapQuote();
    } finally {
        setLoadingState(false, uiElements.getQuoteBtn);
    }
}

/**
 * Executes the swap transaction (MOCK TRANSACTION).
 */
async function executeSwap() {
    if (!appState.walletPublicKey || !appState.currentJupiterQuote || !appState.provider || !appState.connection) {
        showNotification('Missing required connection details.', 'error');
        return;
    }

    setLoadingState(true, uiElements.executeSwapBtn);
    showNotification('Preparing swap transaction...', 'info');

    const fromToken = uiElements.swapFromTokenSelect.value;
    const toToken = uiElements.swapToTokenSelect.value;
    const inputAmountBigInt = BigInt(appState.currentJupiterQuote.inAmount);
    const outputAmountBigInt = BigInt(appState.currentJupiterQuote.outAmount);

    try {
        // Call /swap and get the transaction (REAL API CALL)
        const response = await fetchWithTimeout(`${JUPITER_API_URL}/swap`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                quoteResponse: appState.currentJupiterQuote,
                userPublicKey: appState.walletPublicKey.toBase58(),
                wrapUnwrapSOL: true,
            }),
        }, 10000);

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Failed to get swap transaction: ${errorData.error || response.statusText}`);
        }

        // const { swapTransaction } = await response.json(); // Deserialize the real transaction
        // const transactionBuf = Buffer.from(swapTransaction, 'base64');
        // const transaction = SolanaWeb3.Transaction.from(transactionBuf);
        // const signature = await appState.provider.sendAndConfirm(transaction); // Real submission

        // --- MOCK LOGIC START ---
        const signature = 'MOCK_TXN_SIG_' + Date.now();
        await new Promise(resolve => setTimeout(resolve, 5000));

        // MOCK: Update balances after successful swap
        if (fromToken === 'AFOX') {
            appState.userBalances.AFOX = appState.userBalances.AFOX - inputAmountBigInt;
        }
        if (toToken === 'AFOX') {
            appState.userBalances.AFOX = appState.userBalances.AFOX + outputAmountBigInt;
        }
        persistMockData();
        // --- MOCK LOGIC END ---

        showNotification('Swap successfully executed! 🎉 (Simulation)', 'success');

        if (uiElements.swapFromAmountInput) uiElements.swapFromAmountInput.value = '';
        if (uiElements.swapToAmountInput) uiElements.swapToAmountInput.value = '';
        clearSwapQuote();
        await updateStakingAndBalanceUI();

    } catch (error) {
        console.error('Error during swap execution:', error);
        let errorMessage = `Swap failed: ${error.message.substring(0, 100)}`;
        showNotification(errorMessage, 'error');
    } finally {
        setLoadingState(false, uiElements.executeSwapBtn);
    }
}

/**
 * Handles setting the MAX amount for a swap.
 */
async function handleMaxAmount(event) {
    const inputId = event.target.dataset.inputId;
    const inputElement = document.getElementById(inputId);

    if (!inputElement || !appState.walletPublicKey) return;

    const fromToken = uiElements.swapFromTokenSelect.value;
    const fromTokenMint = TOKEN_MINT_ADDRESSES[fromToken];
    if (!fromTokenMint) {
        showNotification('Selected "From" token is invalid.', 'error');
        return;
    }

    try {
        let maxAmount;
        let decimals;

        if (fromTokenMint.equals(TOKEN_MINT_ADDRESSES['SOL'])) {
            const solBalance = appState.userBalances.SOL;
            const reserveLamports = parseAmountToBigInt(getSolanaTxnFeeReserve().toString(), SOL_DECIMALS);
            maxAmount = solBalance > reserveLamports ? solBalance - reserveLamports : BigInt(0);
            decimals = SOL_DECIMALS;
        } else if (fromTokenMint.equals(TOKEN_MINT_ADDRESSES['AFOX'])) {
            maxAmount = appState.userBalances.AFOX;
            decimals = AFOX_DECIMALS;
        } else {
             maxAmount = BigInt(0);
             decimals = 9;
        }

        inputElement.value = formatBigInt(maxAmount, decimals);

    } catch (error) {
        console.error('Error getting max token balance:', error);
        showNotification('Error getting maximum balance.', 'error');
        inputElement.value = '0';
    }
    clearSwapQuote();
    if (inputElement.value !== '0') {
        getQuote();
    }
}


// =========================================================================================
// --- NEW WRAPPER FOR BUTTON 
// =========================================================================================

/**
 * Simulates the connect button update logic
 * and calls the main connectWallet function.
 * @param {HTMLElement} btn - The HTML button element.
 */
async function simulateConnectButtonUpdate(btn) {
    if (!btn) return;

    const originalText = btn.textContent;
    btn.disabled = true;
    // Original text was 'Подключение...', translated to 'Connecting...'
    btn.textContent = 'Connecting...';
    btn.classList.remove('connected');

    try {
        // Call your main, integrated connectWallet function
        await connectWallet({ name: 'Phantom' });
        
        // After successful connection (handled by the main script)
        if (appState.walletPublicKey) {
            const publicKey = appState.walletPublicKey.toBase58();
            // Original text was 'Подключен: ...', translated to 'Connected: ...'
            btn.textContent = `Connected: ${publicKey.substring(0, 4)}...${publicKey.slice(-4)}`;
            btn.classList.add('connected');
        } else {
             // If connection failed (but didn't throw an error)
             btn.textContent = originalText;
        }

    } catch (error) {
        // Errors that weren't caught in the main function (or are UI-specific)
        let errorMessage = 'Connection Error';

        if (error.message.includes('Phantom wallet not found')) {
            errorMessage = 'Please install Phantom Wallet.';
        } else if (error.message.includes('Connection denied by user')) {
            errorMessage = 'Connection denied by user.';
        }
        
        btn.textContent = errorMessage;
        setTimeout(() => {
            btn.textContent = originalText;
            btn.classList.remove('connected');
        }, 3000);

    } finally {
        btn.disabled = false;
    }
}


// =========================================================================================
// --- INITIALIZATION AND EVENT LISTENERS (Fully implemented) ---
// =========================================================================================

/**
 * MOCK: Loads and displays announcements.
 */
function loadAnnouncements() {
    if (!uiElements.announcementsList) return;
    uiElements.announcementsList.innerHTML = '';
    MOCK_DB.announcements.forEach(ann => {
        const item = document.createElement('div');
        item.className = 'announcement-item';

        const p = document.createElement('p');
        p.textContent = ann.text;

        const span = document.createElement('span');
        span.className = 'announcement-date';
        span.textContent = new Date(ann.date).toLocaleDateString();

        item.appendChild(p);
        item.appendChild(span);
        uiElements.announcementsList.appendChild(item);
    });
}

/**
 * MOCK: Loads and displays games/ads.
 */
function loadGames() {
    if (!uiElements.gameList) return;
    uiElements.gameList.innerHTML = '';
    MOCK_DB.games.forEach(game => {
        const card = document.createElement('div');
        card.className = 'game-card';

        const title = document.createElement('h3');
        title.textContent = game.title;

        const description = document.createElement('p');
        description.textContent = game.description;

        const link = document.createElement('a');
        link.href = game.url;
        link.target = '_blank';
        link.className = 'btn btn-secondary';
        // Original text was 'Play Now (MOCK)', no translation needed
        link.textContent = 'Play Now (MOCK)';

        card.appendChild(title);
        card.appendChild(description);
        uiElements.gameList.appendChild(card);
    });
}

/**
 * Handles click events on NFT lists (delegation).
 */
function handleNftItemClick(event, isUserNft) {
    const card = event.target.closest('.nft-card');
    if (card) {
        const mint = card.dataset.mint;
        const nft = MOCK_DB.nfts.find(n => n.mint === mint);
        if (nft) {
            showNftDetails(nft, isUserNft);
        }
    }
}

// --- 3. КЭШИРОВАНИЕ ЭЛЕМЕНТОВ UI ---
/**
 * Caches all necessary UI elements.
 */
function cacheUIElements() {
    // General Wallet & Display
    uiElements.connectWalletButtons = Array.from(document.querySelectorAll('.connect-wallet-btn'));
    uiElements.walletAddressDisplays = Array.from(document.querySelectorAll('.wallet-address-display'));

    // Modals and Close Buttons
    uiElements.nftDetailsModal = document.getElementById('nft-details-modal');
    uiElements.nftModal = document.getElementById('nft-modal');
    uiElements.mintNftModal = document.getElementById('mint-nft-modal');
    uiElements.createProposalModal = document.getElementById('create-proposal-modal');
    
    // ↓↓↓ DAO ЭЛЕМЕНТЫ ↓↓↓
    uiElements.createProposalForm = document.getElementById('create-proposal-form');
    uiElements.createProposalBtn = document.getElementById('createProposalBtn'); 
    // ↑↑↑
    
    Array.from(document.querySelectorAll('.close-modal')).forEach(btn => {
        btn.addEventListener('click', closeAllPopups);
    });

    // Menu Elements (ID должны соответствовать HTML)
    uiElements.mainNav = document.getElementById('mainNav'); // ID вашего тега <nav>
    // 💡 Используем ID из функции setupHamburgerMenu()
    uiElements.menuToggle = document.getElementById('menuToggle'); 
    uiElements.closeMenuButton = document.getElementById('closeMenuButton'); // ID кнопки закрытия
    uiElements.navOverlay = document.getElementById('navOverlay'); 

    // NFT Section
    uiElements.userNftList = document.getElementById('user-nft-list');
    uiElements.marketplaceNftList = document.getElementById('marketplace-nft-list');
    uiElements.nftToSellSelect = document.getElementById('nft-to-sell');
    uiElements.listNftForm = document.getElementById('list-nft-form');
    uiElements.mintNftForm = document.getElementById('mint-nft-form');

    // NFT Details Modal elements
    uiElements.nftDetailImage = document.getElementById('nft-detail-image');
    uiElements.nftDetailName = document.getElementById('nft-detail-name');
    uiElements.nftDetailDescription = document.getElementById('nft-detail-description');
    uiElements.nftDetailOwner = document.getElementById('nft-detail-owner');
    uiElements.nftDetailMint = document.getElementById('nft-detail-mint');
    uiElements.attributesList = document.getElementById('attributes-list');
    uiElements.nftDetailBuyBtn = document.getElementById('nft-detail-buy-btn');
    uiElements.nftDetailSellBtn = document.getElementById('nft-detail-sell-btn');
    uiElements.nftDetailTransferBtn = document.getElementById('nft-detail-transfer-btn');
    uiElements.nftDetailHistory = document.getElementById('nft-detail-history');

    // Announcements & Games
    uiElements.announcementsList = document.getElementById('announcements-list');
    uiElements.gameList = document.getElementById('game-list');

    // Staking Section
    uiElements.userAfoxBalance = document.getElementById('user-afox-balance');
    uiElements.userStakedAmount = document.getElementById('user-staked-amount');
    uiElements.userRewardsAmount = document.getElementById('user-rewards-amount');
    uiElements.stakingApr = document.getElementById('staking-apr');
    uiElements.stakeAmountInput = document.getElementById('stake-amount');
    uiElements.stakeAfoxBtn = document.getElementById('stake-afox-btn');
    uiElements.claimRewardsBtn = document.getElementById('claim-rewards-btn');
    uiElements.unstakeAfoxBtn = document.getElementById('unstake-afox-btn');

    // SWAP Section
    uiElements.swapFromAmountInput = document.getElementById('swap-from-amount');
    uiElements.swapFromTokenSelect = document.getElementById('swap-from-token');
    uiElements.swapFromBalanceSpan = document.getElementById('swap-from-balance');
    uiElements.swapDirectionBtn = document.getElementById('swap-direction-btn');
    uiElements.swapToAmountInput = document.getElementById('swap-to-amount');
    uiElements.swapToTokenSelect = document.getElementById('swap-to-token');
    uiElements.priceImpactSpan = document.getElementById('price-impact');
    uiElements.lpFeeSpan = document.getElementById('lp-fee');
    uiElements.minReceivedSpan = document.getElementById('min-received');
    uiElements.getQuoteBtn = document.getElementById('get-quote-btn');
    uiElements.executeSwapBtn = document.getElementById('execute-swap-btn');
    uiElements.maxAmountBtns = Array.from(document.querySelectorAll('.max-amount-btn'));


    // Utility
    uiElements.copyButtons = Array.from(document.querySelectorAll('.copy-btn'));
    uiElements.notificationContainer = document.getElementById('notification-container');
    uiElements.pageLoader = document.getElementById('page-loader');
    uiElements.contactForm = document.getElementById('contact-form');
}
// --------------------------------------------------------


// --- 4. ИНИЦИАЛИЗАЦИЯ ОБРАБОТЧИКОВ СОБЫТИЙ ---
/**
 * Initializes all event listeners.
 */
function initEventListeners() {
    // Wallet Connection
    uiElements.connectWalletButtons.forEach(btn => {
        btn.addEventListener('click', () => { 
             simulateConnectButtonUpdate(btn);
        });
    });

    // NFT Marketplace (Delegation)
    if (uiElements.userNftList) {
        uiElements.userNftList.addEventListener('click', (e) => handleNftItemClick(e, true));
    }
    if (uiElements.marketplaceNftList) {
        uiElements.marketplaceNftList.addEventListener('click', (e) => handleNftItemClick(e, false));
    }

    // NFT Forms and Actions
    if (uiElements.mintNftForm) uiElements.mintNftForm.addEventListener('submit', handleMintNftSubmit);
    if (uiElements.listNftForm) uiElements.listNftForm.addEventListener('submit', handleListNftSubmit);
    if (uiElements.nftDetailBuyBtn) uiElements.nftDetailBuyBtn.addEventListener('click', handleBuyNft);
    if (uiElements.nftDetailSellBtn) {
        uiElements.nftDetailSellBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (appState.currentOpenNft && appState.currentOpenNft.isListed) {
                handleUnlistNft();
            }
        });
    }
    if (uiElements.nftDetailTransferBtn) uiElements.nftDetailTransferBtn.addEventListener('click', handleTransferNft);

    // Staking Actions
    if (uiElements.stakeAfoxBtn) uiElements.stakeAfoxBtn.addEventListener('click', handleStakeAfox);
    if (uiElements.claimRewardsBtn) uiElements.claimRewardsBtn.addEventListener('click', handleClaimRewards);
    if (uiElements.unstakeAfoxBtn) uiElements.unstakeAfoxBtn.addEventListener('click', handleUnstakeAfox);
    
    // ↓↓↓ DAO ACTIONS (КНОПКА & ФОРМА SUBMIT) ↓↓↓
    if (uiElements.createProposalBtn) {
        uiElements.createProposalBtn.addEventListener('click', () => {
            if (uiElements.createProposalModal) {
                closeAllPopups(); // Закрываем все другие модальные окна
                uiElements.createProposalModal.style.display = 'flex';
                uiElements.createProposalModal.classList.add('is-open');
                toggleScrollLock(true); // !!! БЛОКИРУЕМ ПРОКРУТКУ !!!
            }
        });
    }

    if (uiElements.createProposalForm) {
        uiElements.createProposalForm.addEventListener('submit', (e) => {
            e.preventDefault();
            console.log("DAO Proposal Form submitted (MOCK)"); 
            showNotification('Proposal creation simulated!', 'success', 3000);
            e.target.reset();
            closeAllPopups();
        });
    }
    // ↑↑↑

    // SWAP Actions
    const debouncedGetQuote = debounce(getQuote, 500);

    if (uiElements.swapFromTokenSelect) {
        uiElements.swapFromTokenSelect.addEventListener('change', () => {
            updateSwapBalances();
            clearSwapQuote();
        });
    }
    if (uiElements.swapToTokenSelect) {
        uiElements.swapToTokenSelect.addEventListener('change', () => {
            clearSwapQuote();
            if (uiElements.swapFromAmountInput.value.trim() !== '') debouncedGetQuote();
        });
    }
    if (uiElements.swapFromAmountInput) {
        uiElements.swapFromAmountInput.addEventListener('input', () => {
             clearSwapQuote();
             debouncedGetQuote();
        });
    }
    if (uiElements.getQuoteBtn) uiElements.getQuoteBtn.addEventListener('click', getQuote);
    if (uiElements.executeSwapBtn) uiElements.executeSwapBtn.addEventListener('click', executeSwap);
    uiElements.maxAmountBtns.forEach(btn => {
        btn.addEventListener('click', handleMaxAmount);
    });
    if (uiElements.swapDirectionBtn) {
        uiElements.swapDirectionBtn.addEventListener('click', handleSwapDirectionChange);
    }

    // General Copy Button
    uiElements.copyButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const textToCopy = btn.dataset.copyTarget;
            navigator.clipboard.writeText(textToCopy)
                .then(() => showNotification('Address copied to clipboard!', 'success', 2000))
                .catch(err => console.error('Could not copy text: ', err));
        });
    });

    // Contact Form (MOCK)
    if (uiElements.contactForm) {
        uiElements.contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            showNotification('Thank you! Your message has been sent. (MOCK)', 'success', 5000);
            uiElements.contactForm.reset();
        });
    }
}
// --------------------------------------------------------

/**
 * Initializes the Jupiter Terminal and adds event listeners.
 */
function initializeJupiterTerminal() {
    if (typeof window.Jupiter === 'undefined') {
        return;
    }

    window.Jupiter.init({
        endpoint: JUPITER_RPC_ENDPOINT,
        formProps: {
            fixedOutputMint: true,
            initialOutputMint: AFOX_MINT,
            initialInputMint: SOL_MINT,
        },
    });

    if (uiElements.swapDirectionBtn) {
        uiElements.swapDirectionBtn.addEventListener('click', handleSwapDirectionChange);
    }
}

// --- ГЛАВНАЯ ФУНКЦИЯ ИНИЦИАЛИЗАЦИИ ---
/**
 * Main initialization function.
 */
async function init() {
    cacheUIElements();
    
    // 🟢 ВЫЗОВ ФУНКЦИИ ГАМБУРГЕР-МЕНЮ (КЛЮЧЕВОЙ МОМЕНТ)
    setupHamburgerMenu(); 
    
    initEventListeners();
    initializeJupiterTerminal();

    // Initial data load
    loadAnnouncements();
    loadGames();
    loadUserNFTs();
    loadMarketplaceNFTs();
    updateStakingUI();
    updateWalletUI(null);

    // Attempt to establish connection immediately on startup
    try {
        appState.connection = await getRobustConnection();
    } catch (e) {
        console.warn(e.message);
        showNotification("Warning: Failed to connect to Solana RPC on startup.", 'warning', 7000);
    }
}
// --------------------------------------------------------

// Ensure the script runs after the entire document is loaded
document.addEventListener('DOMContentLoaded', init);
