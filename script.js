const STAKING_IDL = {
    version: "0.1.0",
    name: "alphafox_staking",
    instructions: [
        { name: "initializeUserStake", accounts: [{ name: "poolState", isMut: true }, { name: "userStaking", isMut: true }, { name: "owner", isMut: true, isSigner: true }, { name: "rewardMint", isMut: false }, { name: "systemProgram", isMut: false }, { name: "clock", isMut: false }], args: [{ name: "poolIndex", type: "u8" }] },
        { name: "deposit", accounts: [{ name: "poolState", isMut: true }, { name: "userStaking", isMut: true }, { name: "owner", isMut: true, isSigner: true }, { name: "userSourceAta", isMut: true }, { name: "vault", isMut: true }, { name: "rewardMint", isMut: false }, { name: "tokenProgram", isMut: false }, { name: "clock", isMut: false }], args: [{ name: "amount", type: "u64" }] },
        { name: "claimRewards", accounts: [{ name: "poolState", isMut: true }, { name: "userStaking", isMut: true }, { name: "owner", isMut: true, isSigner: true }, { name: "vault", isMut: true }, { name: "adminFeeVault", isMut: true }, { name: "userRewardsAta", isMut: true }, { name: "rewardMint", isMut: false }, { name: "tokenProgram", isMut: false }, { name: "clock", isMut: false }], args: [] },
        { name: "unstake", accounts: [{ name: "poolState", isMut: true }, { name: "userStaking", isMut: true }, { name: "owner", isMut: true, isSigner: true }, { name: "vault", isMut: true }, { name: "daoTreasuryVault", isMut: true }, { name: "adminFeeVault", isMut: true }, { name: "userRewardsAta", isMut: true }, { name: "rewardMint", isMut: false }, { name: "tokenProgram", isMut: false }, { name: "clock", isMut: false }], args: [{ name: "amount", type: "u64" }, { name: "isEarlyExit", type: "bool" }] }
    ],
    accounts: [{ name: "UserStakingAccount", type: { kind: "struct", fields: [{ name: "isInitialized", type: "bool" }, { name: "stakeBump", type: "u8" }, { name: "poolIndex", type: "u8" }, { name: "paddingA", type: { array: ["u8", 5] } }, { name: "owner", type: "publicKey" }, { name: "stakedAmount", type: "u64" }, { name: "lockupEndTime", type: "i64" }, { name: "rewardPerShareUser", type: "u128" }, { name: "rewardsToClaim", type: "u64" }, { name: "pendingRewardsDueToLimit", type: "u64" }, { name: "lending", type: "u64" }, { name: "lendingUnlockTime", type: "i64" }, { name: "lastUpdateTime", type: "i64" }, { name: "paddingFinal", type: { array: ["u8", 104] } }] } }]
};

const STAKING_PROGRAM_ID = new window.SolanaWeb3.PublicKey('ZiECmSCWiJvsKRbNmBw27pyWEqEPFY4sBZ3MCnbvirH');
const AFOX_TOKEN_MINT_ADDRESS = new window.SolanaWeb3.PublicKey('GLkewtq8s2Yr24o5LT5mzzEeccKuPfy8H5RCHaE9uRAd');
const AFOX_POOL_STATE_PUBKEY = new window.SolanaWeb3.PublicKey('DfAaH2XsWsjSgPkECmZfDsmABzboJ5hJ8T32Aft2QaXZ'); 
const AFOX_POOL_VAULT_PUBKEY = new window.SolanaWeb3.PublicKey('328N13YrQyUAfqHEAXhtQhfan5hHRxDdZqsdpSx6KSkp'); 
const AFOX_REWARDS_VAULT_PUBKEY = new window.SolanaWeb3.PublicKey('BXinWRfmkk2jo3cTJfcYT5zoC7yix5AsvmTk8NwLoiDF');
const DAO_TREASURY_VAULT_PUBKEY = new window.SolanaWeb3.PublicKey('6BzRqaLD7CiGvSWjkp5G8RbmvGdjMRUqmz9VcXfGzfzi'); 
const TOKEN_PROGRAM_ID = new window.SolanaWeb3.PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const ASSOCIATED_TOKEN_PROGRAM_ID = new window.SolanaWeb3.PublicKey('ATokenGPvbdQxr7K2mc7fgC6jgvZifv6BAeu6CCYH25');
const SYSTEM_PROGRAM_ID = window.SolanaWeb3.SystemProgram.programId;
const BACKUP_RPC_ENDPOINT = 'https://api.mainnet-beta.solana.com';

let appState = { connection: null, provider: null, walletPublicKey: null, userBalances: { SOL: 0n, AFOX: 0n }, userStakingData: { stakedAmount: 0n, rewards: 0n, lockupEndTime: 0, poolIndex: 0, lending: 0n } };
let uiElements = {};


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
        uiElements.stakeAfoxBtn, 
        uiElements.claimRewardsBtn, 
        uiElements.unstakeAfoxBtn
    ].filter(Boolean);

    actionButtons.forEach(btn => {
        btn.disabled = isLoading;
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
            updateStakingUI()
        ]);
    } catch (error) {
        console.error("Error refreshing UI:", error);
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
    // Используем BACKUP_RPC_ENDPOINT, так как JUPITER_RPC удален
    const connection = new window.SolanaWeb3.Connection(BACKUP_RPC_ENDPOINT, connectionOptions);

    if (await checkRpcHealth(connection)) {
        return connection;
    }

    throw new Error('RPC endpoint is unhealthy.');
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
async function connectWallet() {
    try {
        if (!window.solana) return alert("Please install Phantom!");
        const resp = await window.solana.connect();
        appState.provider = window.solana;
        appState.walletPublicKey = resp.publicKey;
        appState.connection = new window.SolanaWeb3.Connection(BACKUP_RPC_ENDPOINT, 'confirmed');
        updateWalletDisplay(resp.publicKey.toBase58());
        await updateStakingAndBalanceUI();
    } catch (err) { console.error("Connection error:", err); }
}

async function handleLoan() {
    if (!appState.walletPublicKey) return alert("Connect wallet first!");
    const amount = prompt("Enter AFOX amount to borrow:");
    if (amount) {
        showNotification(`Loan request for ${amount} AFOX initialized...`, "info");
        // Здесь будет вызов метода твоего контракта
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
    if (!appState.walletPublicKey || !appState.connection) return;

    try {
        const program = getAnchorProgram(STAKING_PROGRAM_ID, STAKING_IDL);
        const userStakingPDA = await getUserStakingAccountPDA(appState.walletPublicKey);
        
        const stakingData = await program.account.userStakingAccount.fetch(userStakingPDA);
        
        appState.userStakingData = {
            stakedAmount: stakingData.stakedAmount.toBigInt(),
            rewards: stakingData.rewardsToClaim.toBigInt(), 
            lockupEndTime: stakingData.lockupEndTime.toNumber(),
            poolIndex: stakingData.poolIndex,
            lending: stakingData.lending.toBigInt()
        };
    } catch (e) {
        console.warn("Аккаунт не найден или ошибка десериализации, сбрасываем данные.");
        appState.userStakingData = { 
            stakedAmount: 0n, 
            rewards: 0n, 
            lockupEndTime: 0, 
            poolIndex: 4, 
            lending: 0n 
        };
    }
} 

async function handleStakeAfox() {
    if (!appState.walletPublicKey) {
        showNotification("Please connect your wallet first", "warning");
        return;
    }
    
    const poolIndex = parseInt(uiElements.poolSelector.value); 
    const amountStr = uiElements.stakeAmountInput.value;
    
    if (!amountStr || parseFloat(amountStr) <= 0) {
        showNotification("Enter a valid amount", "warning");
        return;
    }

    setLoadingState(true, uiElements.stakeAfoxBtn);
    
    try {
        const stakeAmountBigInt = parseAmountToBigInt(amountStr, AFOX_DECIMALS);
        const program = getAnchorProgram(STAKING_PROGRAM_ID, STAKING_IDL);
        const sender = appState.walletPublicKey;
        const userStakingPDA = await getUserStakingAccountPDA(sender);
        
        const userAfoxATA = await window.SolanaWeb3.Token.getAssociatedTokenAddress(
            ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID, AFOX_TOKEN_MINT_ADDRESS, sender
        );

        let tx = new window.SolanaWeb3.Transaction();

        const accountInfo = await appState.connection.getAccountInfo(userStakingPDA);
        if (!accountInfo) {
            const initIx = await program.methods.initializeUserStake(poolIndex)
                .accounts({
                    poolState: AFOX_POOL_STATE_PUBKEY,
                    userStaking: userStakingPDA,
                    owner: sender,
                    rewardMint: AFOX_TOKEN_MINT_ADDRESS,
                    systemProgram: SYSTEM_PROGRAM_ID,
                    clock: window.SolanaWeb3.SYSVAR_CLOCK_PUBKEY,
                }).instruction();
            tx.add(initIx);
        }

        const depositIx = await program.methods.deposit(new window.Anchor.BN(stakeAmountBigInt.toString()))
            .accounts({
                poolState: AFOX_POOL_STATE_PUBKEY,
                userStaking: userStakingPDA,
                owner: sender,
                userSourceAta: userAfoxATA,
                vault: AFOX_POOL_VAULT_PUBKEY,
                rewardMint: AFOX_TOKEN_MINT_ADDRESS,
                tokenProgram: TOKEN_PROGRAM_ID,
                clock: window.SolanaWeb3.SYSVAR_CLOCK_PUBKEY,
            }).instruction();
        tx.add(depositIx);

        const signature = await appState.provider.sendAndConfirm(tx);
        await sendLogToFirebase(sender.toBase58(), 'STAKE', stakeAmountBigInt);
        showNotification(`Staked Successfully!`, 'success');
        
        uiElements.stakeAmountInput.value = ""; 
        await updateStakingAndBalanceUI();

    } catch (error) {
        console.error("Stake Error:", error);
        showNotification(`Error: ${error.message.substring(0, 60)}`, 'error');
    } finally {
        setLoadingState(false, uiElements.stakeAfoxBtn);
    }
}

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
            }).transaction();

        await appState.provider.sendAndConfirm(tx);
        showNotification(`Rewards Claimed!`, 'success');
        await updateStakingAndBalanceUI();
    } catch (error) {
        showNotification(`Claim failed: ${error.message}`, 'error');
    } finally {
        setLoadingState(false, uiElements.claimRewardsBtn);
    }
}

async function handleUnstakeAfox() {
    if (!appState.walletPublicKey) return;
    setLoadingState(true, uiElements.unstakeAfoxBtn);
    try {
        const program = getAnchorProgram(STAKING_PROGRAM_ID, STAKING_IDL);
        const sender = appState.walletPublicKey;
        const userStakingPDA = await getUserStakingAccountPDA(sender);
        const userAfoxATA = await window.SolanaWeb3.Token.getAssociatedTokenAddress(
            ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID, AFOX_TOKEN_MINT_ADDRESS, sender
        );
        const amountToUnstake = new window.Anchor.BN(appState.userStakingData.stakedAmount.toString());

        const tx = await program.methods.unstake(amountToUnstake, false)
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
            }).transaction();

        await appState.provider.sendAndConfirm(tx);
        showNotification(`Unstake success!`, 'success');
        await updateStakingAndBalanceUI();
    } catch (error) {
        showNotification(`Unstake failed: ${error.message}`, 'error');
    } finally {
        setLoadingState(false, uiElements.unstakeAfoxBtn);
    }
}

async function disconnectWallet() {
    if (appState.provider) {
        try {
            await appState.provider.disconnect();
        } catch (error) {
            console.error("Error during disconnect:", error);
        }
    }
    handlePublicKeyChange(null);
}

function cacheUIElements() {
    uiElements.connectWalletButtons = Array.from(document.querySelectorAll('.connect-wallet-btn'));
    uiElements.walletAddressDisplays = Array.from(document.querySelectorAll('.wallet-address-display'));
    uiElements.stakeAfoxBtn = document.getElementById('stakeAfoxBtn');
    uiElements.claimRewardsBtn = document.getElementById('claimRewardsBtn');
    uiElements.unstakeAfoxBtn = document.getElementById('unstakeAfoxBtn');
    uiElements.stakeAmountInput = document.getElementById('stake-amount');
    uiElements.poolSelector = document.getElementById('pool-selector');
    uiElements.notificationContainer = document.getElementById('notification-container');
    uiElements.copyButtons = Array.from(document.querySelectorAll('.copy-btn'));
}

function initEventListeners() {
    uiElements.connectWalletButtons.forEach(btn => {
        btn.addEventListener('click', connectWallet);
    });

    if (uiElements.stakeAfoxBtn) uiElements.stakeAfoxBtn.addEventListener('click', handleStakeAfox);
    if (uiElements.claimRewardsBtn) uiElements.claimRewardsBtn.addEventListener('click', handleClaimRewards);
    if (uiElements.unstakeAfoxBtn) uiElements.unstakeAfoxBtn.addEventListener('click', handleUnstakeAfox);

    uiElements.copyButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const textToCopy = btn.dataset.copyTarget;
            if (textToCopy) {
                navigator.clipboard.writeText(textToCopy).then(() => showNotification('Copied!', 'success'));
            }
        });
    });
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
    }); // <-- Закрыли forEach
} // <-- Закрыли функцию initEventListeners

// ==========================================
// БЛОК 3: DAO (ГОЛОСОВАНИЕ)
// ==========================================
function setupDAO() {
    const daoBtn = document.getElementById('createProposalBtn');
    const daoModal = document.getElementById('dao-modal');
    const closeBtn = document.querySelector('.close-modal');

    if (daoBtn && daoModal) {
        daoBtn.addEventListener('click', () => {
            daoModal.style.display = 'flex';
        });
    }

    if (closeBtn && daoModal) {
        closeBtn.addEventListener('click', () => {
            daoModal.style.display = 'none';
        });
    }
}

// --- MAIN INITIALIZATION FUNCTION ---
function init() {
    // 1. Кнопка подключения кошелька (ID из твоего HTML)
    const connectBtn = document.getElementById('connectWalletBtn');
    if (connectBtn) {
        connectBtn.addEventListener('click', connectWallet);
    }

    // 2. Кнопки Стейкинга (ID из твоего HTML)
    const stakeBtn = document.getElementById('stakeAfoxBtn');
    if (stakeBtn) stakeBtn.addEventListener('click', handleStake);

    const unstakeBtn = document.getElementById('unstakeAfoxBtn');
    if (unstakeBtn) unstakeBtn.addEventListener('click', handleUnstake);

    const claimBtn = document.getElementById('claimRewardsBtn');
    if (claimBtn) claimBtn.addEventListener('click', handleClaim);

    // 3. Кнопка Лендинга (Берем из секции lending-section)
    const lendBtn = document.getElementById('lendAfoxBtn');
    if (lendBtn) lendBtn.addEventListener('click', handleLoan); // handleLoan — это функция из прошлого сообщения

    console.log("AlphaFox System Ready. All IDs linked.");
}

document.addEventListener('DOMContentLoaded', init);

