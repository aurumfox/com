const STAKING_IDL = {
    version: "0.1.0",
    name: "alphafox_staking",
    instructions: [
        {
            name: "initializeUserStake",
            accounts: [
                { name: "poolState", isMut: true },
                { name: "userStaking", isMut: true },
                { name: "owner", isMut: true, isSigner: true },
                { name: "rewardMint", isMut: false },
                { name: "systemProgram", isMut: false },
                { name: "clock", isMut: false }
            ],
            args: [{ name: "poolIndex", type: "u8" }]
        },
        {
            name: "deposit",
            accounts: [
                { name: "poolState", isMut: true },
                { name: "userStaking", isMut: true },
                { name: "owner", isMut: true, isSigner: true },
                { name: "userSourceAta", isMut: true },
                { name: "vault", isMut: true },
                { name: "rewardMint", isMut: false },
                { name: "tokenProgram", isMut: false },
                { name: "clock", isMut: false }
            ],
            args: [{ name: "amount", type: "u64" }]
        },
        {
            name: "claimRewards",
            accounts: [
                { name: "poolState", isMut: true },
                { name: "userStaking", isMut: true },
                { name: "owner", isMut: true, isSigner: true },
                { name: "vault", isMut: true },
                { name: "adminFeeVault", isMut: true },
                { name: "userRewardsAta", isMut: true },
                { name: "rewardMint", isMut: false },
                { name: "tokenProgram", isMut: false },
                { name: "clock", isMut: false }
            ],
            args: []
        },
        {
            name: "unstake",
            accounts: [
                { name: "poolState", isMut: true },
                { name: "userStaking", isMut: true },
                { name: "owner", isMut: true, isSigner: true },
                { name: "vault", isMut: true },
                { name: "daoTreasuryVault", isMut: true },
                { name: "adminFeeVault", isMut: true },
                { name: "userRewardsAta", isMut: true },
                { name: "rewardMint", isMut: false },
                { name: "tokenProgram", isMut: false },
                { name: "clock", isMut: false }
            ],
            args: [{ name: "amount", type: "u64" }, { name: "isEarlyExit", type: "bool" }]
        }
    ],
    accounts: [
        {
            name: "UserStakingAccount",
            type: {
                kind: "struct",
                fields: [
                    { name: "isInitialized", type: "bool" },
                    { name: "stakeBump", type: "u8" },
                    { name: "poolIndex", type: "u8" },
                    { name: "paddingA", type: { array: ["u8", 5] } },
                    { name: "owner", type: "publicKey" },
                    { name: "stakedAmount", type: "u64" },
                    { name: "lockupEndTime", type: "i64" },
                    { name: "rewardPerShareUser", type: "u128" },
                    { name: "rewardsToClaim", type: "u64" },
                    { name: "pendingRewardsDueToLimit", type: "u64" },
                    { name: "lending", type: "u64" },
                    { name: "lendingUnlockTime", type: "i64" },
                    { name: "lastUpdateTime", type: "i64" }
                ]
            }
        }
    ]
};


// 2. INSERT YOUR SEED (Keyword for the staking account PDA from your Rust program)
// This is used for the User's PDA (UserStakingAccount)
const STAKING_ACCOUNT_SEED = "alphafox_staking_pda";

// 3. 🔑 SECURE CHANGES: Helius API Key removed, HELIUS_BASE_URL replaced with your Cloudflare Worker
const HELIUS_BASE_URL = 'https://solana-api-proxy.wnikolay28.workers.dev/v0/addresses/';

// =========================================================================================
// PROJECT CONSTANTS (CRITICAL FIXES APPLIED)
// =========================================================================================

 // --- КРИТИЧЕСКИЕ АДРЕСА MAINNET ---
const STAKING_PROGRAM_ID = new window.SolanaWeb3.PublicKey('ZiECmSCWiJvsKRbNmBw27pyWEqEPFY4sBZ3MCnbvirH');
const AFOX_MINT = 'GLkewtq8s2Yr24o5LT5mzzEeccKuPfy8H5RCHaE9uRAd';
const AFOX_TOKEN_MINT_ADDRESS = new window.SolanaWeb3.PublicKey(AFOX_MINT);

// Эти адреса должны быть созданы тобой (PoolState и Vaults)
const AFOX_POOL_STATE_PUBKEY = new window.SolanaWeb3.PublicKey('4tW21V9yK8mC5Jd7eR2H1kY0v6U4X3Z7f9B2g5D8A3G'); 
const AFOX_POOL_VAULT_PUBKEY = new window.SolanaWeb3.PublicKey('9B5E8KkYx7P3Q2M5L4W9v8F6g1D4d3C2x1S0o9n8B7v'); 
const AFOX_REWARDS_VAULT_PUBKEY = new window.SolanaWeb3.PublicKey('E7J3K0N6g8V1F4L2p9B5q3X7r5D0h9Z8m6W4c2T1y0S'); 
const DAO_TREASURY_VAULT_PUBKEY = new window.SolanaWeb3.PublicKey('3M4Y1R5X6Z9T2C8V7B0N5M4L3K2J1H0G9F8E7D6A5B4C'); 

// Функция для получения адреса стейкинга пользователя (синхронно с Rust)
async function getUserStakingAccountPDA(userPubkey) {
    const [pda] = window.SolanaWeb3.PublicKey.findProgramAddressSync(
        [
            userPubkey.toBuffer(),
            AFOX_POOL_STATE_PUBKEY.toBuffer()
        ],
        STAKING_PROGRAM_ID
    );
    return pda;
}

// -----------------------------------------------------------------------------------------

const FIREBASE_PROXY_URL = 'https://firebasejs-key--snowy-cherry-0a92.wnikolay28.workers.dev/api/log-data';

const AFOX_MINT = 'GLkewtq8s2Yr24o5LT5mzzEeccKuPfy8H5RCHaE9uRAd'; // Changed for greater MOCK uniqueness
const SOL_MINT = 'So11111111111111111111111111111111111111112';
const JUPITER_RPC_ENDPOINT = 'https://rpc.jupag';
const BACKUP_RPC_ENDPOINT = 'https://api.mainnet-beta.solana.com';
const TXN_FEE_RESERVE_SOL = 0.005;
const SECONDS_PER_DAY = 86400; // Added for Staking UI logic

// Pool Configurations (MUST MATCH RUST) - Used for MOCK
const POOLS_CONFIG = [
    // Соответствует вашему [i64; 3] в Rust: 0 - Flexible, 1 - 30 дней, 2 - 90 дней
const POOLS_CONFIG = [
    { name: 'Flexible', duration_days: 0, apr_rate: 100 }, // Index 0
    { name: 'Standard', duration_days: 30, apr_rate: 200 }, // Index 1
    { name: 'Max Boost', duration_days: 90, apr_rate: 500 }, // Index 2
];

const AFOX_TOKEN_MINT_ADDRESS = new window.SolanaWeb3.PublicKey(AFOX_MINT);
const STAKING_PROGRAM_ID = new window.SolanaWeb3.PublicKey('ZiECmSCWiJvsKRbNmBw27pyWEqEPFY4sBZ3MCnbvirH'); 
const JUPITER_API_URL = 'https://quote-api.jup.ag/v6';
const TOKEN_PROGRAM_ID = new window.SolanaWeb3.PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const ASSOCIATED_TOKEN_PROGRAM_ID = new window.SolanaWeb3.PublicKey('ATokenGPvbdGVxr1b2hvZbnPUb4A5L5EyrgFP1G8AtiT');
const SYSTEM_PROGRAM_ID = window.SolanaWeb3.SystemProgram.programId;

const TOKEN_MINT_ADDRESSES = {
    'SOL': new window.SolanaWeb3.PublicKey(SOL_MINT),
    'AFOX': AFOX_TOKEN_MINT_ADDRESS,
};
const AFOX_DECIMALS = 6;
const SOL_DECIMALS = 9;
const NETWORK = window.SolanaWeb3.WalletAdapterNetwork.Mainnet;

// --- GLOBAL APP STATE & WALLET ADAPTERS ---
const appState = {
    walletPublicKey: null,
    provider: null,
    connection: null,
    currentJupiterQuote: null,
    currentOpenNft: null,
    areProviderListenersAttached: false,
    userBalances: { SOL: BigInt(0), AFOX: BigInt(0) },
    userStakingData: { 
        stakedAmount: BigInt(0), 
        rewards: BigInt(0), 
        lockupEndTime: 0,
        poolIndex: 4,     // Pool Index
        lending: BigInt(0) // Tokens locked as collateral
    }, 
    userNFTs: [],
    marketplaceNFTs: []
};
const uiElements = {};
// Using window.SolanaWalletAdapterPhantom for universality
const WALLETS = [new window.SolanaWalletAdapterPhantom.PhantomWalletAdapter()];

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

// --- 1. Global function for menu state management ---
function toggleMenuState(forceClose = false) {
    const menuToggle = document.getElementById('menuToggle');
    const navOverlay = document.querySelector('.nav-mobile-overlay');
    const mainNav = document.getElementById('mainNav');
    const body = document.body; 

    if (!menuToggle || !navOverlay || !mainNav) {
        return;
    }

    const isCurrentlyOpen = menuToggle.classList.contains('open');
    const newState = forceClose ? false : !isCurrentlyOpen;

    navOverlay.classList.toggle('active', newState);
    menuToggle.classList.toggle('open', newState); 
    mainNav.classList.toggle('is-open', newState);
    
    menuToggle.setAttribute('aria-expanded', String(newState));
    mainNav.setAttribute('aria-hidden', String(!newState));
    
    body.classList.toggle('menu-open', newState);
}

// --- 2. Hamburger menu logic ---
function setupHamburgerMenu() {
    const menuToggle = document.getElementById('menuToggle');
    const closeMenuCross = document.getElementById('closeMainMenuCross');
    const mainNavLinks = document.querySelectorAll('.main-nav a'); 

    if (!menuToggle) {
        console.warn('Hamburger Menu button (menuToggle) not found. Check HTML ID.');
        return;
    }
    
    if (!closeMenuCross) {
        console.warn('Close Menu button (closeMainMenuCross) not found. Menu can only be closed via the toggle button or link click.');
    }

    const handleToggle = (e) => {
        if (e && e.preventDefault && e.target.tagName !== 'A') {
            e.preventDefault();
        }
        toggleMenuState();
    };

    menuToggle.addEventListener('click', handleToggle);
    menuToggle.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            handleToggle(e);
        }
    });

    if (closeMenuCross) {
        closeMenuCross.addEventListener('click', handleToggle);
        closeMenuCross.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                handleToggle(e);
            }
        });
    }

    mainNavLinks.forEach(link => {
        link.addEventListener('click', () => {
            toggleMenuState(true); // Force close
        });
    });
}
// --- /HAMBURGER MENU LOGIC ---


// Added function to lock/unlock scroll
function toggleScrollLock(lock) {
    document.body.classList.toggle('menu-open', lock);
}

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
            const isConnectBtn = btn.classList.contains('connect-wallet-btn') && !btn.classList.contains('connected');
            if (isConnectBtn) {
                 btn.disabled = false;
            } else {
                 btn.disabled = isLoading;
            }
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
        // SECURITY: Use textContent for safety
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
        let fractionalPart = paddedStr.slice(-decimals);
        fractionalPart = fractionalPart.replace(/0+$/, ''); 

        return '0' + (fractionalPart.length > 0 ? '.' + fractionalPart : '');
    } else {
        const integerPart = str.slice(0, str.length - decimals);
        let fractionalPart = str.slice(str.length - decimals);
        
        fractionalPart = fractionalPart.replace(/0+$/, '');
        
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
        fractionalPart = fractionalPart.substring(0, decimals);
    }

    const paddedFractionalPart = fractionalPart.padEnd(decimals, '0');

    if (integerPart === '0' && paddedFractionalPart.replace(/0/g, '').length === 0) {
         return BigInt(0);
    }
    
        if (integerPart !== '0') {
        return BigInt(integerPart + paddedFractionalPart);
    } else {
        return BigInt(paddedFractionalPart);
    }
} 
    
function closeAllPopups() {
    const modals = [
        uiElements.createProposalModal 
    ].filter(Boolean);

    let wasModalOpen = false;

    modals.forEach(modal => {
        if (modal && modal.style.display === 'flex') {
            modal.style.display = 'none';
            modal.classList.remove('is-open'); 
            wasModalOpen = true;
        }
    });
    
    const menuToggle = document.getElementById('menuToggle');
    if (menuToggle && menuToggle.classList.contains('open')) {
        toggleMenuState(true);
        wasModalOpen = true; 
    }

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
            fetchUserBalances(),
            updateStakingUI(),
            updateSwapBalances()
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
    // Using window.Anchor for universality
    const anchorProvider = new window.Anchor.AnchorProvider(
        appState.connection,
        appState.provider,
        { commitment: "confirmed" }
    );
    if (!idl || !idl.version) {
        throw new Error("STAKING_IDL is missing or empty. Cannot interact with the program.");
    }
    return new window.Anchor.Program(idl, programId, anchorProvider);
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
        await connection.getSlot('confirmed');
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
    const primaryConnection = new window.SolanaWeb3.Connection(JUPITER_RPC_ENDPOINT, connectionOptions);

    if (await checkRpcHealth(primaryConnection)) {
        console.log('Using Primary RPC:', JUPITER_RPC_ENDPOINT);
        return primaryConnection;
    }

    console.warn('Primary RPC failed check. Using backup endpoint.');
    const backupConnection = new window.SolanaWeb3.Connection(BACKUP_RPC_ENDPOINT, connectionOptions);

    if (await checkRpcHealth(backupConnection)) {
        console.log('Using Backup RPC:', BACKUP_RPC_ENDPOINT);
        return backupConnection;
    }

    throw new Error('Both primary and backup RPC endpoints failed to connect or are unhealthy.');
}

// 🟢 Corrected and simplified function to update wallet UI
function updateWalletDisplay(address) {
    const connectBtns = uiElements.connectWalletButtons;
    const walletDisplays = Array.from(document.querySelectorAll('.wallet-display, [data-wallet-control="walletDisplay"]'));
    const walletAddresses = uiElements.walletAddressDisplays;
    const copyBtns = uiElements.copyButtons; 
    
    const fullAddressDisplay = document.getElementById('walletAddressDisplay');


    if (address) {
        const shortAddress = `${address.substring(0, 4)}...${address.slice(-4)}`;
        
        // 2. STATE: CONNECTED
        connectBtns.forEach(btn => {
             btn.style.display = 'none';
             btn.classList.add('connected'); 
        });
        walletDisplays.forEach(display => {
            display.style.display = 'flex';
            display.removeEventListener('click', disconnectWallet);
            display.addEventListener('click', disconnectWallet);
        });
        walletAddresses.forEach(span => span.textContent = shortAddress);

        if (fullAddressDisplay) {
            fullAddressDisplay.textContent = address;
            fullAddressDisplay.classList.add('connected');
        }
        
        copyBtns.forEach(copyBtn => {
             copyBtn.dataset.copyTarget = address; 
             copyBtn.style.display = 'block';
        });

    } else {
        // 3. STATE: DISCONNECTED
        
        connectBtns.forEach(btn => {
             btn.style.display = 'block';
             btn.classList.remove('connected');
        });
        walletDisplays.forEach(display => {
            display.style.display = 'none';
            display.removeEventListener('click', disconnectWallet);
        });
        
        if (fullAddressDisplay) {
            fullAddressDisplay.textContent = 'Not Connected';
            fullAddressDisplay.classList.remove('connected');
        }

        copyBtns.forEach(copyBtn => {
            delete copyBtn.dataset.copyTarget;
            copyBtn.style.display = 'none';
        });
    }
}


/**
 * Handles changes to the wallet public key (connect/disconnect).
 */
// --- Исправленный обработчик ключа ---
function handlePublicKeyChange(newPublicKey) {
    appState.walletPublicKey = newPublicKey;
    const address = newPublicKey ? newPublicKey.toBase58() : null;

    updateWalletDisplay(address);

    if (newPublicKey) {
        updateStakingAndBalanceUI();
    }
}

/**
 * Attaches event listeners to the wallet provider.
 */
function registerProviderListeners() {
    if (appState.provider && !appState.areProviderListenersAttached) {
        appState.provider.on('connect', () => {
            if (appState.provider.publicKey) {
                handlePublicKeyChange(appState.provider.publicKey);
            }
        });
        appState.provider.on('disconnect', () => handlePublicKeyChange(null));
        appState.areProviderListenersAttached = true;
    }
}

/**
 * Connects the wallet using the provided adapter.
 */
async function connectWallet(adapter) {
    setLoadingState(true);

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
            registerProviderListeners(); 
            await appState.provider.connect();
        }

        closeAllPopups();

    } catch (error) {
        console.error('Wallet connection failed:', error);
        appState.provider = null;
        appState.connection = null;
        appState.walletPublicKey = null;
        updateWalletDisplay(null); 
        const message = error.message.includes('Both primary and backup') ? error.message : `Connection failed: ${error.message.substring(0, 70)}...`;
        showNotification(message, 'error');
        throw error;
    } finally {
        // Loading state is handled in the wrapper (simulateConnectButtonUpdate)
    }
}

/**
 * Fetches real balances from RPC (SOL and AFOX) and updates appState.userBalances.
 * 🟢 ИСПРАВЛЕНО: УДАЛЕНА ВСЯ MOCK-ЛОГИКА ДЛЯ AFOX И SOL.
 */
async function fetchUserBalances() {
    if (!appState.walletPublicKey || !appState.connection) {
        appState.userBalances.SOL = BigInt(0);
        appState.userBalances.AFOX = BigInt(0);
        return;
    }

    const sender = appState.walletPublicKey;

    // --- 1. ФЕТЧ БАЛАНСА SOL ---
    try {
        const solBalance = await appState.connection.getBalance(sender, 'confirmed');
        appState.userBalances.SOL = BigInt(solBalance);
    } catch (error) {
        console.error("Failed to fetch SOL balance:", error);
        appState.userBalances.SOL = BigInt(0); 
        showNotification("Warning: Could not fetch real SOL balance.", 'warning');
    }

    // --- 2. ФЕТЧ БАЛАНСА AFOX (РЕАЛИЗАЦИЯ) ---
    try {
        // 2a. Получаем адрес Associated Token Account (ATA) пользователя для токена AFOX
        const userAfoxATA = await window.SolanaWeb3.Token.getAssociatedTokenAddress(
            ASSOCIATED_TOKEN_PROGRAM_ID, 
            TOKEN_PROGRAM_ID, 
            AFOX_TOKEN_MINT_ADDRESS, 
            sender
        );
        
        // 2b. Запрашиваем баланс этого токен-аккаунта
        const accountInfo = await appState.connection.getTokenAccountBalance(userAfoxATA);
        
        if (accountInfo.value && accountInfo.value.amount) {
            appState.userBalances.AFOX = BigInt(accountInfo.value.amount);
        } else {
            // Если ATA не существует или не имеет баланса (пользователь не владеет AFOX)
            appState.userBalances.AFOX = BigInt(0);
        }
        
    } catch (tokenError) {
        console.warn("Failed to fetch AFOX token balance, setting to 0:", tokenError);
        appState.userBalances.AFOX = BigInt(0); 
    }
}


// =========================================================================================
// --- STAKING FUNCTIONS (ANCHOR TEMPLATES + REAL LOGIC) ---
// =========================================================================================

/**
 * Updates the staking UI elements with current user data (REAL).
 */
async function updateStakingUI() {
    if (!appState.walletPublicKey) {
        const elements = [uiElements.userAfoxBalance, uiElements.userStakedAmount, uiElements.userRewardsAmount];
        elements.forEach(el => { if (el) el.textContent = '0 AFOX'; });
        [uiElements.stakeAfoxBtn, uiElements.claimRewardsBtn, uiElements.unstakeAfoxBtn].filter(Boolean).forEach(btn => btn.disabled = true);
        if (uiElements.stakingApr) uiElements.stakingApr.textContent = '—';
        if (uiElements.lockupPeriod) uiElements.lockupPeriod.textContent = '—'; 
        return;
    }

    await fetchUserStakingData(); 

    const data = appState.userStakingData;
    const afoxBalanceBigInt = appState.userBalances.AFOX;
    const stakedAmountBigInt = data.stakedAmount;
    const rewardsAmountBigInt = data.rewards;
    const lockupEndTime = data.lockupEndTime;
    const poolIndex = data.poolIndex; 
    const lendingAmountBigInt = data.lending;

    if (uiElements.userAfoxBalance) uiElements.userAfoxBalance.textContent = `${formatBigInt(afoxBalanceBigInt, AFOX_DECIMALS)} AFOX`;
    if (uiElements.userStakedAmount) uiElements.userStakedAmount.textContent = `${formatBigInt(stakedAmountBigInt, AFOX_DECIMALS)} AFOX`;
    if (uiElements.userRewardsAmount) uiElements.userRewardsAmount.textContent = `${formatBigInt(rewardsAmountBigInt, AFOX_DECIMALS)} AFOX`;
    
    const currentPool = POOLS_CONFIG[poolIndex] || POOLS_CONFIG[4];
    if (uiElements.stakingApr) uiElements.stakingApr.textContent = `${currentPool.apr_rate / 100}% APR (${currentPool.name})`;
    
    // 2. Logic checks
    const now = Date.now() / 1000;
    const isLockedByTime = lockupEndTime > now;
    const hasStakedAmount = stakedAmountBigInt > BigInt(0);
    const hasRewards = rewardsAmountBigInt > BigInt(0);
    const isLockedByLoan = lendingAmountBigInt > BigInt(0);

    // 3. Button Management
    if (uiElements.stakeAfoxBtn) uiElements.stakeAfoxBtn.disabled = false;
    if (uiElements.claimRewardsBtn) uiElements.claimRewardsBtn.disabled = !hasRewards;

    if (uiElements.unstakeAfoxBtn) {
        uiElements.unstakeAfoxBtn.disabled = true;
        uiElements.unstakeAfoxBtn.textContent = 'Unstake';
        
        if (!hasStakedAmount) {
            uiElements.unstakeAfoxBtn.textContent = 'No Stake';
        } else if (isLockedByLoan) {
             uiElements.unstakeAfoxBtn.disabled = true;
             uiElements.unstakeAfoxBtn.textContent = `❌ Locked by Loan (${formatBigInt(lendingAmountBigInt, AFOX_DECIMALS)} AFOX)`;
        } else if (isLockedByTime) {
            const remainingSeconds = lockupEndTime - now;
            const remainingDays = (remainingSeconds / SECONDS_PER_DAY).toFixed(1);
            uiElements.unstakeAfoxBtn.disabled = false; 
            uiElements.unstakeAfoxBtn.textContent = `Unstake (${remainingDays} days, with penalty)`;
        } else {
            uiElements.unstakeAfoxBtn.disabled = false;
            uiElements.unstakeAfoxBtn.textContent = 'Unstake (No penalty)';
        }
    }
    
    // 4. Update Lockup Period
    const lockupDisplay = uiElements.lockupPeriod;

    if (lockupDisplay) {
        let loanInfo = '';
        if (isLockedByLoan) {
             loanInfo = ` (Collateral: ${formatBigInt(lendingAmountBigInt, AFOX_DECIMALS)} AFOX)`;
        }
        
        if (isLockedByTime) {
            const currentPool = POOLS_CONFIG[poolIndex] || POOLS_CONFIG[4];
            const remainingSeconds = lockupEndTime - now;
            const remainingDays = (remainingSeconds / SECONDS_PER_DAY).toFixed(1);
            lockupDisplay.textContent = `${currentPool.name}: ${remainingDays} days remaining${loanInfo}`;
        } else {
            lockupDisplay.textContent = `${currentPool.name}: Flexible${loanInfo}`;
        }
    }
}

/**
 * ✅ Implemented: Reading staking data from the blockchain (REAL ANCHOR).
 */
async function fetchUserStakingData() {
    if (!appState.walletPublicKey || !STAKING_IDL.version || !appState.connection) {
        appState.userStakingData.stakedAmount = BigInt(0);
        appState.userStakingData.rewards = BigInt(0);
        appState.userStakingData.lockupEndTime = 0;
        appState.userStakingData.poolIndex = 4;
        appState.userStakingData.lending = BigInt(0);
        return;
    }

    try {
        const program = getAnchorProgram(STAKING_PROGRAM_ID, STAKING_IDL);
        const sender = appState.walletPublicKey;

        // 1. PDA calculation
        const [userStakingAccountPDA] = window.SolanaWeb3.PublicKey.findProgramAddressSync(
            [
                window.Anchor.utils.bytes.utf8.encode(STAKING_ACCOUNT_SEED),
                sender.toBuffer(),
                AFOX_POOL_STATE_PUBKEY.toBuffer(), // Pool ID is part of the seed
            ],
            STAKING_PROGRAM_ID
        );

        // 2. Deserialization (REAL ANCHOR FETCH)
        try {
            const stakingData = await program.account.userStakingAccount.fetch(userStakingAccountPDA);
            
            // Note: .toBigInt() and .toNumber() are methods on Anchor's BN object
            appState.userStakingData.stakedAmount = stakingData.stakedAmount.toBigInt();
            appState.userStakingData.rewards = stakingData.rewardsAmount.toBigInt();
            appState.userStakingData.lockupEndTime = stakingData.lockupEndTime.toNumber();
            appState.userStakingData.poolIndex = stakingData.poolIndex;
            appState.userStakingData.lending = stakingData.lending.toBigInt();

        } catch (e) {
            // Account not found or deserialization failed means user has not staked yet.
            if (e.message && (e.message.includes('Account does not exist') || e.message.includes('301'))) {
                // Not staked yet: Reset to zero state
                appState.userStakingData.stakedAmount = BigInt(0);
                appState.userStakingData.rewards = BigInt(0);
                appState.userStakingData.lockupEndTime = 0;
                appState.userStakingData.poolIndex = 4;
                appState.userStakingData.lending = BigInt(0);
            } else {
                 throw e; // Propagate critical error
            }
        }

    } catch (e) {
        console.error("Failed to fetch staking data:", e);
        // On error, reset to zero state
        appState.userStakingData.stakedAmount = BigInt(0);
        appState.userStakingData.rewards = BigInt(0);
        appState.userStakingData.lockupEndTime = 0;
        appState.userStakingData.poolIndex = 4;
        appState.userStakingData.lending = BigInt(0);
    }
}


/**
 * ✅ Implemented: Sending AFOX staking transaction (REAL ANCHOR).
 */
async function handleStakeAfox() {
    if (!appState.walletPublicKey || !STAKING_IDL.version) return;

    // 1. Получаем индекс из выпадающего списка (уже есть в вашем кеше)
    const poolIndex = parseInt(uiElements.poolSelector.value); 
    const amountStr = uiElements.stakeAmountInput.value;
    
    setLoadingState(true, uiElements.stakeAfoxBtn);

    try {
        const stakeAmountBigInt = parseAmountToBigInt(amountStr, AFOX_DECIMALS);
        const program = getAnchorProgram(STAKING_PROGRAM_ID, STAKING_IDL);
        const sender = appState.walletPublicKey;
        
        const userStakingPDA = await getUserStakingAccountPDA(sender);
        
        // ATA пользователя (откуда берем токены)
        const userAfoxATA = await window.SolanaWeb3.Token.getAssociatedTokenAddress(
            ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID, AFOX_TOKEN_MINT_ADDRESS, sender
        );

        let instructions = [];
        const accountInfo = await appState.connection.getAccountInfo(userStakingPDA);

        // Если аккаунт стейкинга еще не создан — создаем (передаем выбранный индекс)
        if (!accountInfo) {
            console.log("Initializing staking account with pool index:", poolIndex);
            instructions.push(
                await program.methods.initializeUserStake(poolIndex) // Передаем 0, 1 или 2
                    .accounts({
                        poolState: AFOX_POOL_STATE_PUBKEY,
                        userStaking: userStakingPDA,
                        owner: sender,
                        rewardMint: AFOX_TOKEN_MINT_ADDRESS,
                        systemProgram: SYSTEM_PROGRAM_ID,
                        clock: window.SolanaWeb3.SYSVAR_CLOCK_PUBKEY,
                    }).instruction()
            );
        }

        // Добавляем инструкцию депозита
        instructions.push(
            await program.methods.deposit(new window.Anchor.BN(stakeAmountBigInt.toString()))
                .accounts({
                    poolState: AFOX_POOL_STATE_PUBKEY,
                    userStaking: userStakingPDA,
                    owner: sender,
                    userSourceAta: userAfoxATA,
                    vault: AFOX_POOL_VAULT_PUBKEY,
                    rewardMint: AFOX_TOKEN_MINT_ADDRESS,
                    tokenProgram: TOKEN_PROGRAM_ID,
                    clock: window.SolanaWeb3.SYSVAR_CLOCK_PUBKEY,
                }).instruction()
        );

        const transaction = new window.SolanaWeb3.Transaction().add(...instructions);
        const signature = await appState.provider.sendAndConfirm(transaction);

        await sendLogToFirebase(sender.toBase58(), 'STAKE', stakeAmountBigInt);
        showNotification(`Success! TX: ${signature.substring(0, 8)}`, 'success');
        await updateStakingAndBalanceUI();

    } catch (error) {
        console.error("Stake Error:", error);
        showNotification(`Error: ${error.message}`, 'error');
    } finally {
        setLoadingState(false, uiElements.stakeAfoxBtn);
    }
}


/**
 * ✅ Implemented: Sending claim rewards transaction (REAL ANCHOR).
 */

async function handleClaimRewards() {
    if (!appState.walletPublicKey) return;
    setLoadingState(true, uiElements.claimRewardsBtn);

    try {
        const program = getAnchorProgram(STAKING_PROGRAM_ID, STAKING_IDL);
        const sender = appState.walletPublicKey;
        const userStakingPDA = await getUserStakingAccountPDA(sender);
        const userAfoxATA = await window.SolanaWeb3.Token.getAssociatedTokenAddress(
            ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID, AFOX_TOKEN_MINT_ADDRESS, sender
        );

        const tx = await program.methods.claimRewards()
            .accounts({
                poolState: AFOX_POOL_STATE_PUBKEY,
                userStaking: userStakingPDA,
                owner: sender,
                vault: AFOX_POOL_VAULT_PUBKEY,
                adminFeeVault: AFOX_REWARDS_VAULT_PUBKEY,
                userRewardsAta: userAfoxATA,
                rewardMint: AFOX_TOKEN_MINT_ADDRESS,
                tokenProgram: TOKEN_PROGRAM_ID,
                clock: window.SolanaWeb3.SYSVAR_CLOCK_PUBKEY,
            })
            .transaction();

        const signature = await appState.provider.sendAndConfirm(tx);
        showNotification(`Rewards Claimed: ${signature.substring(0, 8)}`, 'success');
        await updateStakingAndBalanceUI();
    } catch (error) {
        showNotification(`Claim failed: ${error.message}`, 'error');
    } finally {
        setLoadingState(false, uiElements.claimRewardsBtn);
    }
}

/**
 * ✅ Implemented: Sending unstaking transaction (REAL ANCHOR).
 */
async function handleUnstakeAfox() {
    if (!appState.walletPublicKey) return;
    setLoadingState(true, uiElements.unstakeAfoxBtn);

    try {
        const program = getAnchorProgram(STAKING_PROGRAM_ID, STAKING_IDL);
        const sender = appState.walletPublicKey;
        const userStakingPDA = await getUserStakingAccountPDA(sender);

        const now = Math.floor(Date.now() / 1000);
        const isEarlyExit = appState.userStakingData.lockupEndTime > now;
        const amountToUnstake = appState.userStakingData.stakedAmount;

        const userAfoxATA = await window.SolanaWeb3.Token.getAssociatedTokenAddress(
            ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID, AFOX_TOKEN_MINT_ADDRESS, sender
        );

        const tx = await program.methods.unstake(
            new window.Anchor.BN(amountToUnstake.toString()), 
            isEarlyExit
        )
        .accounts({
            poolState: AFOX_POOL_STATE_PUBKEY,
            userStaking: userStakingPDA,
            owner: sender,
            vault: AFOX_POOL_VAULT_PUBKEY,
            daoTreasuryVault: DAO_TREASURY_VAULT_PUBKEY,
            adminFeeVault: AFOX_REWARDS_VAULT_PUBKEY,
            userRewardsAta: userAfoxATA,
            rewardMint: AFOX_TOKEN_MINT_ADDRESS,
            tokenProgram: TOKEN_PROGRAM_ID,
            clock: window.SolanaWeb3.SYSVAR_CLOCK_PUBKEY,
        })
        .transaction();

        const signature = await appState.provider.sendAndConfirm(tx);
        showNotification(`Unstake Success! TX: ${signature.substring(0, 8)}`, 'success');
        await updateStakingAndBalanceUI();

    } catch (error) {
        console.error("Unstake Error:", error);
        showNotification(`Unstake failed: ${error.message}`, 'error');
    } finally {
        setLoadingState(false, uiElements.unstakeAfoxBtn);
    }
}

/**
 * Helper: Basic Solana Public Key validation.
 */
function isValidSolanaAddress(address) {
    try {
        new window.SolanaWeb3.PublicKey(address);
        return true;
    } catch (e) {
        return false;
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

    const fromToken = uiElements.swapFromTokenSelect?.value;
    if (!fromToken) return;

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
    if (!uiElements.swapFromTokenSelect || !uiElements.swapToTokenSelect) return;
    
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
        showNotification("Connect your wallet to get a quote.", 'warning', 3000);
        return;
    }

    const fromToken = uiElements.swapFromTokenSelect?.value;
    const toToken = uiElements.swapToTokenSelect?.value;
    const amountStr = uiElements.swapFromAmountInput?.value;

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

        let balanceToCheck;
        if (fromMint.equals(TOKEN_MINT_ADDRESSES['SOL'])) {
            const reserve = parseAmountToBigInt(getSolanaTxnFeeReserve().toString(), SOL_DECIMALS);
            balanceToCheck = appState.userBalances.SOL > reserve ? appState.userBalances.SOL - reserve : BigInt(0);
        } else {
             balanceToCheck = appState.userBalances.AFOX;
        }

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

        const lpFeeAmount = appState.currentJupiterQuote.platformFee ? appState.currentJupiterQuote.platformFee.amount : '0';
        if (uiElements.lpFeeSpan) uiElements.lpFeeSpan.textContent = `${formatBigInt(lpFeeAmount, outputDecimals)} ${uiElements.swapToTokenSelect?.value || ''}`;
        
        if (uiElements.minReceivedSpan) {
            const minReceived = appState.currentJupiterQuote.otherAmountThreshold || appState.currentJupiterQuote.outAmount;
            uiElements.minReceivedSpan.textContent = `${formatBigInt(minReceived, outputDecimals)} ${uiElements.swapToTokenSelect?.value || ''}`;
        }

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
 * Executes the swap transaction (REAL TRANSACTION using Jupiter's instructions).
 */
async function executeSwap() {
    if (!appState.walletPublicKey || !appState.currentJupiterQuote || !appState.provider || !appState.connection) {
        showNotification('Missing required connection details.', 'error');
        return;
    }

    setLoadingState(true, uiElements.executeSwapBtn);
    showNotification('Preparing swap transaction...', 'info');

    const fromToken = uiElements.swapFromTokenSelect?.value;
    const toToken = uiElements.swapToTokenSelect?.value;
    const inputAmountBigInt = BigInt(appState.currentJupiterQuote.inAmount);
    const outputAmountBigInt = BigInt(appState.currentJupiterQuote.outAmount);

    try {
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
        
        const { swapTransaction } = await response.json(); 
        
        const transaction = window.SolanaWeb3.Transaction.from(Buffer.from(swapTransaction, 'base64'));
        
        const signature = await appState.provider.sendAndConfirm(transaction);

        // --- MOCK BALANCE UPDATE (For immediate UI refresh, actual balances will fetch real data on next update) ---
        // Это остается как МОК, потому что Jupiter не обновляет локальный BigInt напрямую.
        // Следующий вызов fetchUserBalances() получит реальные данные, но это ускоряет UI.
        
        if (fromToken === 'AFOX') {
            appState.userBalances.AFOX = appState.userBalances.AFOX - inputAmountBigInt;
        } else if (fromToken === 'SOL') {
            appState.userBalances.SOL = appState.userBalances.SOL - inputAmountBigInt;
        }
        
        // MOCK: assuming a positive outcome for immediate UI update
        if (toToken === 'AFOX') {
            appState.userBalances.AFOX = appState.userBalances.AFOX + outputAmountBigInt;
        } else if (toToken === 'SOL') {
            appState.userBalances.SOL = appState.userBalances.SOL + outputAmountBigInt;
        }
        
        appState.userBalances.SOL = appState.userBalances.SOL - parseAmountToBigInt(getSolanaTxnFeeReserve().toString(), SOL_DECIMALS);
        
        persistMockData(); 
        // --- MOCK LOGIC END ---

        showNotification('Swap successfully executed! 🎉', 'success');

        if (uiElements.swapFromAmountInput) uiElements.swapFromAmountInput.value = '';
        if (uiElements.swapToAmountInput) uiElements.swapToAmountInput.value = '';
        clearSwapQuote();
        await updateStakingAndBalanceUI();

    } catch (error) {
        console.error('Error during swap execution:', error);
        let errorMessage = error.message.includes('denied') ? 'Transaction denied by user.' : `Swap failed: ${error.message.substring(0, 100)}`;
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

    const fromToken = uiElements.swapFromTokenSelect?.value;
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
    btn.textContent = 'Connecting...';
    btn.classList.remove('connected');
    
    setLoadingState(true);

    try {
        await connectWallet({ name: 'Phantom' });
        
        if (appState.walletPublicKey) {
            const publicKey = appState.walletPublicKey.toBase58();
            btn.classList.add('connected');
            showNotification('Wallet successfully connected! 🦊', 'success');
        } else {
             btn.textContent = originalText;
        }

    } catch (error) {
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
        setLoadingState(false); 
    }
}

async function disconnectWallet() {
     if (appState.provider) {
        try {
            await appState.provider.disconnect();
        } catch (error) {
             console.error("Error during manual disconnect:", error);
             handlePublicKeyChange(null);
        }
     } else {
        handlePublicKeyChange(null);
     }
}

// --- 3. CACHING UI ELEMENTS ---
/**
 * Caches all necessary UI elements.
 */
function cacheUIElements() {
    // General Wallet & Display
    uiElements.connectWalletButtons = Array.from(document.querySelectorAll('.connect-wallet-btn'));
    uiElements.walletAddressDisplays = Array.from(document.querySelectorAll('.wallet-address-display, #walletAddress, [data-wallet-control="walletAddress"]'));

    
    // DAO Elements
    uiElements.createProposalForm = document.getElementById('create-proposal-form');
    uiElements.createProposalBtn = document.getElementById('createProposalBtn'); 
    
    Array.from(document.querySelectorAll('.close-modal')).forEach(btn => {
        btn.addEventListener('click', closeAllPopups);
    });

    // Menu Elements
    uiElements.mainNav = document.getElementById('mainNav');
    uiElements.menuToggle = document.getElementById('menuToggle'); 
    uiElements.closeMenuButton = document.getElementById('closeMainMenuCross');
    uiElements.navOverlay = document.querySelector('.nav-mobile-overlay');

    // Staking Section
    uiElements.userAfoxBalance = document.getElementById('user-afox-balance');
    uiElements.userStakedAmount = document.getElementById('user-staked-amount');
    uiElements.userRewardsAmount = document.getElementById('user-rewards-amount');
    uiElements.stakingApr = document.getElementById('staking-apr');
    uiElements.stakeAmountInput = document.getElementById('stake-amount');
    uiElements.stakeAfoxBtn = document.getElementById('stake-afox-btn');
    uiElements.claimRewardsBtn = document.getElementById('claim-rewards-btn');
    uiElements.unstakeAfoxBtn = document.getElementById('unstake-afox-btn');
    uiElements.lockupPeriod = document.getElementById('lockup-period');
    uiElements.poolSelector = document.getElementById('pool-selector'); 

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


// --- 4. INITIALIZING EVENT LISTENERS ---
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

    // Staking Actions
    if (uiElements.stakeAfoxBtn) uiElements.stakeAfoxBtn.addEventListener('click', handleStakeAfox);
    if (uiElements.claimRewardsBtn) uiElements.claimRewardsBtn.addEventListener('click', handleClaimRewards);
    if (uiElements.unstakeAfoxBtn) uiElements.unstakeAfoxBtn.addEventListener('click', handleUnstakeAfox);
    
    // DAO Actions
    if (uiElements.createProposalBtn) {
        uiElements.createProposalBtn.addEventListener('click', () => {
            if (uiElements.createProposalModal) {
                closeAllPopups();
                uiElements.createProposalModal.style.display = 'flex';
                uiElements.createProposalModal.classList.add('is-open');
                toggleScrollLock(true);
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
            if (uiElements.swapFromAmountInput?.value.trim() !== '') debouncedGetQuote();
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
            if (textToCopy) {
                navigator.clipboard.writeText(textToCopy)
                    .then(() => showNotification('Address copied to clipboard!', 'success', 2000))
                    .catch(err => console.error('Could not copy text: ', err));
            } else {
                 showNotification('Nothing to copy.', 'warning', 2000);
            }
        });
    });

// --------------------------------------------------------

/**
 * Initializes the Jupiter Terminal and adds event listeners.
 */
/**
 * Настройка терминала Jupiter: МИНИМАЛИСТИЧНЫЙ ВИД БЕЗ ГРАФИКОВ
 */
function initializeJupiterTerminal() {
    if (typeof window.Jupiter === 'undefined') {
        console.warn('Jupiter SDK not loaded');
        return;
    }

    window.Jupiter.init({
        // Указываем ID контейнера из вашего HTML
        displayMode: "integrated",
        integratedTargetId: "jupiter-swap-widget", 
        
        // Используем ваши константы
        endpoint: JUPITER_RPC_ENDPOINT, 
        
        // Облегченный стиль без лишних графиков
        widgetStyle: "basic", 

        // Настройка токенов
        formProps: {
            fixedOutputMint: false,
            initialOutputMint: AFOX_MINT, // Подставляем ваш AFOX
            initialInputMint: "So11111111111111111111111111111111111111112", // SOL
        },
        strictTokenList: false,

        // --- ВИЗУАЛЬНОЕ СЛИЯНИЕ С ВАШИМ CSS ---
        theme: "dark",
        customTheme: {
            widgetBg: "transparent",    // Сливается с фоном сайта
            mainBg: "#1a1a2e",          // Ваша переменная --color-bg-dark
            secondaryBg: "#2a2a3a",     // Ваша переменная --color-bg-input
            primary: "#ffd700",         // Ваше ЗОЛОТО --primary-color
            accent: "#007bff",          // Синий акцент --accent-color
            onPrimary: "#1a1a2e",       // Темный текст на золотой кнопке (читабельно)
            interactiveBg: "#3a3a5e",   // Ваша карточка --color-bg-card
            tokenRowHover: "#2c2c4d",   // Подсветка при наведении
            text: "#E0E0E0",            // Светлый текст --text-color-light
            subText: "#B0B0B0",         // Приглушенный текст
        },
    });
}

// --- MAIN INITIALIZATION FUNCTION ---
async function init() {
    if (typeof window.SolanaWeb3 === 'undefined' || typeof window.Anchor === 'undefined' || typeof window.SolanaWalletAdapterPhantom === 'undefined') {
        setTimeout(init, 100); 
        return;
    }

    cacheUIElements();
    populatePoolSelector();
    setupHamburgerMenu(); 
    initEventListeners();
    initializeJupiterTerminal();

    try {
        appState.connection = await getRobustConnection();
        if (appState.walletPublicKey) {
            updateStakingAndBalanceUI();
        }
    } catch (e) {
        console.warn("RPC Connection issue:", e.message);
    }
    
    updateStakingUI();
    updateWalletDisplay(appState.walletPublicKey ? appState.walletPublicKey.toBase58() : null);
}

// --------------------------------------------------------

// --- STARTUP AFTER DOM LOAD ---
document.addEventListener('DOMContentLoaded', init);
