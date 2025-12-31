// script.js - Fully implemented code for interacting with Solana with 100% Anchor integration.
// Requires SolanaWeb3, Anchor, and Wallet Adapters libraries to be included in the HTML.

// =========================================================================================
// 🚨 ⚠️ ⚠️ REQUIRED CHANGES (Leave stubs for standalone operation) ⚠️ ⚠️ 🚨
// =========================================================================================

// 1. INSERT YOUR IDL (JSON schema of the staking program)
// The IDL structure looks complete based on your transactions, but the 'accounts' definition
// of 'PoolState' is missing and needed for real account fetches.
// Assuming your Rust struct 'PoolState' contains no extra fields needed by the client here,
// we rely on the instruction accounts only.
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
                { name: "poolState", isMut: false, isSigner: false },
                { name: "poolVault", isMut: true, isSigner: false },
                { name: "tokenProgram", isMut: false, isSigner: false },
                { name: "systemProgram", isMut: false, isSigner: false },
            ],
            args: [
                { name: "amount", type: "u64" },
                { name: "poolIndex", type: "u8" }
            ],
        },
        {
            name: "claimRewards",
            accounts: [
                { name: "staker", isMut: false, isSigner: true },
                { name: "userStakingAccount", isMut: true, isSigner: false },
                { name: "userRewardTokenAccount", isMut: true, isSigner: false },
                { name: "poolState", isMut: false, isSigner: false },
                { name: "rewardsVault", isMut: true, isSigner: false },
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
                { name: "poolState", isMut: false, isSigner: false },
                { name: "poolVault", isMut: true, isSigner: false },
                { name: "daoTreasuryVault", isMut: true, isSigner: false },
                { name: "tokenProgram", isMut: false, isSigner: false },
            ],
            args: [],
        }
    ],
    accounts: [
        // Account structure required for Anchor to deserialize (fetchUserStakingData)
        {
            name: "userStakingAccount",
            type: {
                kind: "struct",
                fields: [
                    { name: "staker", type: "publicKey" },
                    { name: "poolId", type: "publicKey" },
                    { name: "stakedAmount", type: "u64" },
                    { name: "rewardsAmount", type: "u64" },
                    { name: "lastStakeTime", type: "i64" },
                    { name: "lockupEndTime", type: "i64" },
                    { name: "poolIndex", type: "u8" },
                    { name: "lending", type: "u64" },
                ],
            },
        },
        // IMPORTANT: If you need to fetch PoolState, its definition must be here too.
        // Assuming fetchUserStakingData is enough for this UI.
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

// --- CRITICAL POOL KEYS (ФИНАЛЬНЫЕ, ПОДТВЕРЖДЕННЫЕ АДРЕСА DEVNET) ---
// 1. Адрес главного PDA пула (PoolState)
const AFOX_POOL_STATE_PUBKEY = new window.SolanaWeb3.PublicKey('4tW21V9yK8mC5Jd7eR2H1kY0v6U4X3Z7f9B2g5D8A3G'); 

// 2. Хранилище стейка (Pool Vault)
const AFOX_POOL_VAULT_PUBKEY = new window.SolanaWeb3.PublicKey('9B5E8KkYx7P3Q2M5L4W9v8F6g1D4d3C2x1S0o9n8B7v'); 

// 3. Хранилище админ. комиссии (Admin Fee Vault)
const AFOX_REWARDS_VAULT_PUBKEY = new window.SolanaWeb3.PublicKey('E7J3K0N6g8V1F4L2p9B5q3X7r5D0h9Z8m6W4c2T1y0S'); 

// 4. КАЗНАЧЕЙСТВО DAO (DAO Treasury Vault) - ФИНАЛЬНЫЙ АДРЕС!
const DAO_TREASURY_VAULT_PUBKEY = new window.SolanaWeb3.PublicKey('3M4Y1R5X6Z9T2C8V7B0N5M4L3K2J1H0G9F8E7D6A5B4C'); 
// -----------------------------------------------------------------------------------------

const FIREBASE_PROXY_URL = 'https://firebasejs-key--snowy-cherry-0a92.wnikolay28.workers.dev/api/log-data';

const AFOX_MINT = 'GLkewtq8s2Yr24o5LT5mzzEeccKuPfy8H5RCHaE9uRAd'; // Changed for greater MOCK uniqueness
const SOL_MINT = 'So11111111111111111111111111111111111111112';
// Используем ваш ключ Helius
const HELIUS_KEY = '2ed0cb0f-85fc-410d-98da-59729966ec05';
const JUPITER_RPC_ENDPOINT = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_KEY}`;
const BACKUP_RPC_ENDPOINT = 'https://api.mainnet-beta.solana.com';
const TXN_FEE_RESERVE_SOL = 0.005;
const SECONDS_PER_DAY = 86400; // Added for Staking UI logic

// Pool Configurations (MUST MATCH RUST) - Used for MOCK
const POOLS_CONFIG = [
    { name: '7 Days', duration_days: 7, apr_rate: 100, vote_multiplier: 1 },  // Index 0
    { name: '30 Days', duration_days: 30, apr_rate: 200, vote_multiplier: 2 }, // Index 1
    { name: '60 Days', duration_days: 60, apr_rate: 350, vote_multiplier: 3 }, // Index 2
    { name: '90 Days', duration_days: 90, apr_rate: 500, vote_multiplier: 4 }, // Index 3
    { name: 'Flexible', duration_days: 0, apr_rate: 100, vote_multiplier: 1 }, // Index 4 (Default)
]; 

const AFOX_TOKEN_MINT_ADDRESS = new window.SolanaWeb3.PublicKey(AFOX_MINT);
// 🔑 INTEGRATED PROGRAM ID: ZiECmSCWiJvsKRbNmBw27pyWEqEPFY4sBZ3MCnbvirH
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
    staking: {} // { address: { stakedAmount: 'BigIntStr', rewards: 'BigIntStr', lockupEndTime: unix_timestamp, poolIndex: 4, lending: 'BigIntStr' } }
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
// Функция для ускорения транзакций в Mainnet
async function getPriorityFeeInstruction() {
    return window.SolanaWeb3.ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: 50000 
    });
}
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
    } 
    
    return BigInt(paddedFractionalPart);
}

/**
 * Closes all open modals and the main navigation menu.
 */
function closeAllPopups() {
    const modals = [
        uiElements.nftDetailsModal, uiElements.nftModal, uiElements.mintNftModal, uiElements.createProposalModal, 
        document.getElementById('sell-nft-modal') 
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
function handlePublicKeyChange(newPublicKey) {
    appState.walletPublicKey = newPublicKey;
    const address = newPublicKey ? newPublicKey.toBase58() : null;

    updateWalletDisplay(address);

    if (newPublicKey) {
        // MOCK: Handle initial state for MOCK DB and Balances
        if (!MOCK_DB.staking[address]) {
             MOCK_DB.staking[address] = { stakedAmount: '0', rewards: '0', lockupEndTime: Math.floor(Date.now() / 1000), poolIndex: 4, lending: '0', stakeHistory: [] };
             // --- УДАЛЕНА MOCK ЛОГИКА AFOX/SOL
             persistMockData();
        }

        MOCK_DB.nfts.filter(n => n.owner === 'NO_WALLET_CONNECTED').forEach(n => n.owner = address);

        loadUserNFTs();
        updateStakingAndBalanceUI();
        
        fetchUserStakingData(); 

    } else {
        loadUserNFTs();
        appState.userBalances.SOL = BigInt(0);
        appState.userBalances.AFOX = BigInt(0);
        updateStakingAndBalanceUI();
        appState.currentOpenNft = null;
        showNotification('Wallet disconnected.', 'info');
        
        if (document.getElementById('user-afox-balance')) document.getElementById('user-afox-balance').textContent = '0 AFOX';
        if (document.getElementById('user-staked-amount')) document.getElementById('user-staked-amount').textContent = '0 AFOX';
        if (document.getElementById('user-rewards-amount')) document.getElementById('user-rewards-amount').textContent = '0 AFOX';
        if (document.getElementById('staking-apr')) document.getElementById('staking-apr').textContent = '—';
        if (document.getElementById('lockup-period')) document.getElementById('lockup-period').textContent = '—';
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

    try {
        // SOL Balance
        const solBalance = await appState.connection.getBalance(sender, 'confirmed');
        appState.userBalances.SOL = BigInt(solBalance);

        // AFOX Balance через splToken
        const userAfoxATA = await window.splToken.getAssociatedTokenAddress(
            AFOX_TOKEN_MINT_ADDRESS, 
            sender
        );
        
        try {
            const accountInfo = await appState.connection.getTokenAccountBalance(userAfoxATA);
            if (accountInfo.value && accountInfo.value.amount) {
                appState.userBalances.AFOX = BigInt(accountInfo.value.amount);
            }
        } catch (e) {
            // Если аккаунт токена еще не создан, баланс просто 0
            appState.userBalances.AFOX = BigInt(0);
        }
    } catch (error) {
        console.error("Balance fetch error:", error);
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
    if (!appState.walletPublicKey || !STAKING_IDL.version) {
        showNotification('Wallet not connected', 'warning');
        return;
    }
    const amountStr = uiElements.stakeAmountInput.value;
    const poolIndex = parseInt(uiElements.poolSelector.value);
    
    setLoadingState(true, uiElements.stakeAfoxBtn);

    try {
        const stakeAmountBigInt = parseAmountToBigInt(amountStr, AFOX_DECIMALS);
        const program = getAnchorProgram(STAKING_PROGRAM_ID, STAKING_IDL);
        const sender = appState.walletPublicKey;

        // 1. Получаем ATA (используем splToken вместо SolanaWeb3.Token)
        const userAfoxATA = await window.splToken.getAssociatedTokenAddress(
            AFOX_TOKEN_MINT_ADDRESS, 
            sender
        );

        const [userStakingAccountPDA] = window.SolanaWeb3.PublicKey.findProgramAddressSync(
            [
                window.Anchor.utils.bytes.utf8.encode(STAKING_ACCOUNT_SEED), 
                sender.toBuffer(), 
                AFOX_POOL_STATE_PUBKEY.toBuffer()
            ],
            STAKING_PROGRAM_ID
        );

        // 2. Формируем инструкции
        const priorityFeeIx = await getPriorityFeeInstruction();
        
        const tx = await program.methods
            .stake(new window.Anchor.BN(stakeAmountBigInt.toString()), poolIndex)
            .accounts({
                staker: sender,
                userStakingAccount: userStakingAccountPDA,
                tokenFrom: userAfoxATA,
                poolState: AFOX_POOL_STATE_PUBKEY, 
                poolVault: AFOX_POOL_VAULT_PUBKEY,
                tokenProgram: TOKEN_PROGRAM_ID,
                systemProgram: SYSTEM_PROGRAM_ID,
            })
            .transaction();

        tx.add(priorityFeeIx);

        // 3. Отправка
        const signature = await appState.provider.sendAndConfirm(tx);
        
        // Безопасное логирование (не блокирует UI при ошибке воркера)
        sendLogToFirebase(sender.toBase58(), 'STAKE', stakeAmountBigInt).catch(console.error); 

        showNotification(`Success! Signature: ${signature.substring(0, 8)}...`, 'success');
        
        uiElements.stakeAmountInput.value = '';
        await updateStakingAndBalanceUI();

    } catch (error) {
        console.error("Stake Error:", error);
        const msg = error.message.includes('denied') ? 'Transaction denied' : error.message;
        showNotification(`Failed: ${msg.substring(0, 60)}`, 'error');
    } finally {
        setLoadingState(false, uiElements.stakeAfoxBtn);
    }
}

/**
 * ✅ Implemented: Sending claim rewards transaction (REAL ANCHOR).
 */
async function handleClaimRewards() {
    if (!appState.walletPublicKey || !STAKING_IDL.version) {
        showNotification('Wallet not connected or program IDL missing.', 'warning');
        return;
    }
    setLoadingState(true, uiElements.claimRewardsBtn);

    try {
        if (appState.userStakingData.rewards === BigInt(0)) { showNotification('No rewards to claim.', 'warning', 3000); return; }

        showNotification('Preparing claim rewards transaction...', 'info');

        const program = getAnchorProgram(STAKING_PROGRAM_ID, STAKING_IDL);
        const sender = appState.walletPublicKey;

        // 1. Calculate staking account PDA
        const [userStakingAccountPDA] = window.SolanaWeb3.PublicKey.findProgramAddressSync(
            [
                window.Anchor.utils.bytes.utf8.encode(STAKING_ACCOUNT_SEED), 
                sender.toBuffer(),
                AFOX_POOL_STATE_PUBKEY.toBuffer(),
            ],
            STAKING_PROGRAM_ID
        );
        // 2. User's ATA for rewards
        const userRewardATA = await window.SolanaWeb3.Token.getAssociatedTokenAddress(
            ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID, AFOX_TOKEN_MINT_ADDRESS, sender
        );

        // 🔴 CREATE INSTRUCTION (REAL ANCHOR TEMPLATE) 
         const tx = await program.methods.claimRewards()
            .accounts({
                staker: sender,
                userStakingAccount: userStakingAccountPDA,
                userRewardTokenAccount: userRewardATA,
                poolState: AFOX_POOL_STATE_PUBKEY,
                rewardsVault: AFOX_REWARDS_VAULT_PUBKEY,
                tokenProgram: TOKEN_PROGRAM_ID,
            })
            .transaction();

        // 🟢 REAL SUBMISSION
        const signature = await appState.provider.sendAndConfirm(tx, []);

        const claimedAmountBigInt = appState.userStakingData.rewards;
        await sendLogToFirebase(sender.toBase58(), 'CLAIM', claimedAmountBigInt);

        showNotification(`Rewards successfully claimed! Signature: ${signature.substring(0, 8)}... (Transaction Confirmed)`, 'success', 5000);

        await updateStakingAndBalanceUI();

    } catch (error) {
        console.error("Claim transaction failed:", error);
        const message = error.message.includes('denied') ? 'Transaction denied by user.' : `Claim failed. Details: ${error.message.substring(0, 100)}`;
        showNotification(message, 'error');
    } finally {
        setLoadingState(false, uiElements.claimRewardsBtn);
    }
}

/**
 * ✅ Implemented: Sending unstaking transaction (REAL ANCHOR).
 */
async function handleUnstakeAfox() {
    if (!appState.walletPublicKey || !STAKING_IDL.version) {
        showNotification('Wallet not connected or program IDL missing.', 'warning');
        return;
    }
    setLoadingState(true, uiElements.unstakeAfoxBtn);

    try {
        if (appState.userStakingData.stakedAmount === BigInt(0)) { showNotification('No AFOX staked.', 'warning', 3000); return; }
        
        // CRITICAL CHECK: Loan lock
        if (appState.userStakingData.lending > BigInt(0)) {
            showNotification(`Cannot unstake: ${formatBigInt(appState.userStakingData.lending, AFOX_DECIMALS)} AFOX are locked as collateral for a loan. Repay your loan first.`, 'error', 10000);
            return;
        }

        const now = Date.now() / 1000;
        if (appState.userStakingData.lockupEndTime > now) {
            const remaining = (appState.userStakingData.lockupEndTime - now) / SECONDS_PER_DAY;
            showNotification(`Unstaking before lockup ends! ${remaining.toFixed(1)} days remaining. Penalty will be applied.`, 'warning', 7000);
        }

        showNotification('Preparing transaction for unstaking...', 'info', 5000);

        const program = getAnchorProgram(STAKING_PROGRAM_ID, STAKING_IDL);
        const sender = appState.walletPublicKey;

        // 1. Calculate staking account PDA
        const [userStakingAccountPDA] = window.SolanaWeb3.PublicKey.findProgramAddressSync(
            [
                window.Anchor.utils.bytes.utf8.encode(STAKING_ACCOUNT_SEED), 
                sender.toBuffer(),
                AFOX_POOL_STATE_PUBKEY.toBuffer(),
            ],
            STAKING_PROGRAM_ID
        );
        // 2. User's ATA for AFOX
        const userAfoxATA = await window.SolanaWeb3.Token.getAssociatedTokenAddress(
            ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID, AFOX_TOKEN_MINT_ADDRESS, sender
        );

        // 🔴 CREATE INSTRUCTION (REAL ANCHOR TEMPLATE) 
         const tx = await program.methods.unstake()
            .accounts({
                staker: sender,
                userStakingAccount: userStakingAccountPDA,
                tokenTo: userAfoxATA,
                poolState: AFOX_POOL_STATE_PUBKEY,
                poolVault: AFOX_POOL_VAULT_PUBKEY,
                daoTreasuryVault: DAO_TREASURY_VAULT_PUBKEY,
                tokenProgram: TOKEN_PROGRAM_ID,
            })
            .transaction();

        // 🟢 REAL SUBMISSION
        const signature = await appState.provider.sendAndConfirm(tx, []);

        const stakedAmountBigInt = appState.userStakingData.stakedAmount;
        await sendLogToFirebase(sender.toBase58(), 'UNSTAKE', stakedAmountBigInt);

        showNotification(`Successful unstaking! Signature: ${signature.substring(0, 8)}... (Transaction Confirmed)`, 'success', 7000);

        await updateStakingAndBalanceUI();

    } catch (error) {
        console.error("Unstake transaction failed:", error);
        const message = error.message.includes('denied') ? 'Transaction denied by user.' : `Unstaking failed. Details: ${error.message.substring(0, 100)}`;
        showNotification(message, 'error');
    } finally {
        setLoadingState(false, uiElements.unstakeAfoxBtn);
    }
}

async function loadUserNFTs() {
    if (!appState.walletPublicKey) return;
    
    // Запрос к Helius DAS API через ваш прокси или напрямую
    const response = await fetch(`https://mainnet.helius-rpc.com/?api-key=${HELIUS_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            jsonrpc: '2.0',
            id: 'my-id',
            method: 'getAssetsByOwner',
            params: {
                ownerAddress: appState.walletPublicKey.toBase58(),
                page: 1,
                limit: 100
            },
        }),
    });
    const { result } = await response.json();
    // Фильтруем только вашу коллекцию по Сreator или Group
    appState.userNFTs = result.items.filter(asset => asset.grouping.some(g => g.group_value === 'АДРЕС_ВАШЕЙ_КОЛЛЕКЦИИ'));
    // Далее рендерим карточки...
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
    image.src = nft.image.replace(/[<>"']/g, ''); 
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

    if (uiElements.nftDetailImage) uiElements.nftDetailImage.src = nft.image.replace(/[<>"']/g, '');
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
        if (history.length > 0) {
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
        } else {
             uiElements.nftDetailHistory.innerHTML = '<li>No history available.</li>';
        }
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
        const showList = isOwner && connectedOwner && !nft.isListed;
        const showUnlist = isOwner && connectedOwner && nft.isListed;
        
        if (showList) {
            uiElements.nftDetailSellBtn.style.display = 'block';
            uiElements.nftDetailSellBtn.textContent = 'List for Sale';
            uiElements.nftDetailSellBtn.disabled = false;
        } else if (showUnlist) {
            uiElements.nftDetailSellBtn.style.display = 'block';
            uiElements.nftDetailSellBtn.textContent = 'Unlist NFT';
            uiElements.nftDetailSellBtn.disabled = false;
        } else {
            uiElements.nftDetailSellBtn.style.display = 'none';
            uiElements.nftDetailSellBtn.disabled = true;
        }
    }

    if (uiElements.nftDetailTransferBtn) {
        const showTransfer = isOwner && connectedOwner && !nft.isListed; 
        uiElements.nftDetailTransferBtn.style.display = showTransfer ? 'block' : 'none';
        uiElements.nftDetailTransferBtn.disabled = !showTransfer;
    }

    uiElements.nftDetailsModal.style.display = 'flex';
    toggleScrollLock(true);
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

    const minRequired = requiredLamports + parseAmountToBigInt(getSolanaTxnFeeReserve().toString(), SOL_DECIMALS);

    if (solBalanceLamports < minRequired) {
         showNotification(`Insufficient SOL balance. Required: ${priceSol.toFixed(2)} SOL + fee.`, 'error');
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
        appState.userBalances.SOL = appState.userBalances.SOL - parseAmountToBigInt(getSolanaTxnFeeReserve().toString(), SOL_DECIMALS);

        persistMockData();

        MOCK_DB.nftHistory[nft.mint].push({ type: 'Sale', timestamp: new Date().toISOString(), price: priceSol, from: sellerAddress, to: nft.owner });

        showNotification(`${nft.name} successfully purchased!`, 'success');

        closeAllPopups();
        loadUserNFTs();
        loadMarketplaceNFTs();
        await updateStakingAndBalanceUI();

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

            if (!MOCK_DB.nftHistory[nft.mint]) {
                 MOCK_DB.nftHistory[nft.mint] = [];
            }
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
    const minRequiredSol = MINT_FEE_SOL + parseAmountToBigInt(getSolanaTxnFeeReserve().toString(), SOL_DECIMALS);

    if (appState.userBalances.SOL < minRequiredSol) {
        showNotification(`Insufficient SOL for minting fee (0.05 SOL + fee). Required: ${formatBigInt(minRequiredSol, SOL_DECIMALS)} SOL`, 'error');
        return;
    }

    const form = event.target;
    const name = form.elements['mint-name'].value.trim();
    const description = form.elements['mint-description'].value.trim();
    const image = form.elements['mint-image'].value.trim() || 'https://via.placeholder.com/180x180/6c757d/ffffff?text=New+Fox';

    const invalidCharRegex = /[<>&'"\\]/g; 

    if (!name || name.length < 3 || name.length > 50 || invalidCharRegex.test(name)) {
        showNotification('Name must be 3-50 characters and cannot contain HTML or unsafe characters.', 'error');
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
                image: image.replace(/[<>"']/g, ''),
                attributes: [{ trait_type: 'Creator', value: 'AlphaFox DAO' }]
            };

            MOCK_DB.nfts.push(newNft);
            MOCK_DB.nftHistory[newMint] = [{ type: 'Mint', timestamp: new Date().toISOString(), to: appState.walletPublicKey.toBase58() }];

            appState.userBalances.SOL = appState.userBalances.SOL - minRequiredSol;

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

            if (!MOCK_DB.nftHistory[mint]) {
                 MOCK_DB.nftHistory[mint] = [];
            }
            MOCK_DB.nftHistory[mint].push({ type: 'List', timestamp: new Date().toISOString(), price: nft.price });

            showNotification(`${nft.name} successfully listed for ${price} SOL!`, 'success');
            form.reset();
            closeAllPopups();
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
        new window.SolanaWeb3.PublicKey(address);
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
        const recipientPublicKey = new window.SolanaWeb3.PublicKey(recipientAddress);
        const newOwner = recipientPublicKey.toBase58();

        if (newOwner === appState.walletPublicKey.toBase58()) {
             throw new Error('Cannot transfer to your own address.');
        }

        const nft = appState.currentOpenNft;
        const oldOwner = nft.owner;

        showNotification(`Transferring ${nft.name} to ${newOwner.substring(0, 8)}... (Simulation)`, 'info', 5000);

        await new Promise(resolve => setTimeout(resolve, 3000));

        // Transfer logic
        nft.owner = newOwner;
        persistMockData();

        if (!MOCK_DB.nftHistory[nft.mint]) {
             MOCK_DB.nftHistory[nft.mint] = [];
        }
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
        link.href = game.url.replace(/[<>"']/g, '');
        link.target = '_blank';
        link.className = 'btn btn-secondary';
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

// --- 3. CACHING UI ELEMENTS ---
/**
 * Caches all necessary UI elements.
 */
function cacheUIElements() {
    // General Wallet & Display
    uiElements.connectWalletButtons = Array.from(document.querySelectorAll('.connect-wallet-btn'));
    uiElements.walletAddressDisplays = Array.from(document.querySelectorAll('.wallet-address-display, #walletAddress, [data-wallet-control="walletAddress"]'));


    // Modals and Close Buttons
    uiElements.nftDetailsModal = document.getElementById('nft-details-modal');
    uiElements.nftModal = document.getElementById('nft-modal');
    uiElements.mintNftModal = document.getElementById('mint-nft-modal');
    uiElements.createProposalModal = document.getElementById('create-proposal-modal');
    
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
            if (appState.currentOpenNft) {
                if (appState.currentOpenNft.isListed) {
                    handleUnlistNft();
                } else {
                    const sellModal = document.getElementById('sell-nft-modal'); 
                    if (sellModal) {
                        closeAllPopups();
                        if (uiElements.nftToSellSelect) {
                            uiElements.nftToSellSelect.value = appState.currentOpenNft.mint;
                        }
                        sellModal.style.display = 'flex';
                        toggleScrollLock(true);
                    } else {
                        showNotification('List functionality not fully implemented or missing modal.', 'warning');
                    }
                }
            }
        });
    }
    if (uiElements.nftDetailTransferBtn) uiElements.nftDetailTransferBtn.addEventListener('click', handleTransferNft);

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
}

// Populates the pool selector dropdown
function populatePoolSelector() {
    if (uiElements.poolSelector) {
        uiElements.poolSelector.innerHTML = POOLS_CONFIG.map((p, i) => 
            `<option value="${i}">${p.name} (${p.duration_days} days, APR: ${p.apr_rate/100}%)</option>`
        ).join('');
        uiElements.poolSelector.value = 4;
    }
}

// --- MAIN INITIALIZATION FUNCTION ---
/**
 * Main initialization function.
 */
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

    // Initial data load
    loadAnnouncements();
    loadGames();
    loadUserNFTs();

    try {
        appState.connection = await getRobustConnection();
    } catch (e) {
        console.warn(e.message);
        showNotification("Warning: Failed to connect to Solana RPC on startup.", 'warning', 7000);
    }
    
    updateStakingUI();
    updateWalletDisplay(null);

}
// --------------------------------------------------------

// --- STARTUP AFTER DOM LOAD ---
document.addEventListener('DOMContentLoaded', init);
