// Гарантируем наличие Buffer глобально
if (typeof window !== 'undefined' && window.buffer) {
    window.Buffer = window.buffer.Buffer;
}

// Настройка библиотек с проверкой на существование
window.Buffer = window.Buffer || (window.buffer ? window.buffer.Buffer : undefined);

// Принудительное назначение, если загрузились разные версии
const solLib = window.solanaWeb3 || window.SolanaWeb3;
if (solLib) {
    window.solanaWeb3 = solLib;
}

const anchorLib = window.anchor || window.Anchor || window.anchorjs;
if (anchorLib) {
    window.anchor = anchorLib;
    window.Anchor = anchorLib;
}

console.log("Buffer:", window.Buffer ? "✅" : "❌");
console.log("Solana Web3:", window.solanaWeb3 ? "✅" : "❌");
console.log("Anchor:", window.anchor ? "✅" : "❌");


const SOL_DECIMALS = 9;
const AFOX_DECIMALS = 6;
const SECONDS_PER_DAY = 86400;
const FIREBASE_PROXY_URL = 'https://firebasejs-key--snowy-cherry-0a92.wnikolay28.workers.dev/';
const BACKUP_RPC_ENDPOINT = 'https://api.mainnet-beta.solana.com';


const POOLS_CONFIG = {
    0: { name: "Flexible", apr_rate: 500 },
    1: { name: "Standard", apr_rate: 1200 },
    2: { name: "Max Boost", apr_rate: 2500 },
    4: { name: "Legacy", apr_rate: 0 }
};

const STAKING_IDL = {
    "version": "0.1.0",
    "name": "alphafox_staking",
    "instructions": [
        {
            "name": "initializeUserStake",
            "accounts": [
                { "name": "poolState", "isMut": true },
                { "name": "userStaking", "isMut": true },
                { "name": "owner", "isMut": true, "isSigner": true },
                { "name": "rewardMint", "isMut": false },
                { "name": "systemProgram", "isMut": false },
                { "name": "clock", "isMut": false }
            ],
            "args": [{ "name": "poolIndex", "type": "u8" }]
        },
        {
            "name": "deposit",
            "accounts": [
                { "name": "poolState", "isMut": true },
                { "name": "userStaking", "isMut": true },
                { "name": "owner", "isMut": true, "isSigner": true },
                { "name": "userSourceAta", "isMut": true },
                { "name": "vault", "isMut": true },
                { "name": "rewardMint", "isMut": false },
                { "name": "tokenProgram", "isMut": false },
                { "name": "clock", "isMut": false }
            ],
            "args": [{ "name": "amount", "type": "u64" }]
        }
    ],
    "accounts": [
        {
            "name": "UserStakingAccount",
            "type": {
                "kind": "struct",
                "fields": [
                    { "name": "isInitialized", "type": "bool" },
                    { "name": "stakeBump", "type": "u8" },
                    { "name": "poolIndex", "type": "u8" },
                    { "name": "paddingA", "type": { "array": ["u8", 5] } },
                    { "name": "owner", "type": "publicKey" },
                    { "name": "stakedAmount", "type": "u64" },
                    { "name": "lockupEndTime", "type": "i64" },
                    { "name": "rewardPerShareUser", "type": "u128" },
                    { "name": "rewardsToClaim", "type": "u64" },
                    { "name": "pendingRewardsDueToLimit", "type": "u64" },
                    { "name": "lending", "type": "u64" },
                    { "name": "lendingUnlockTime", "type": "i64" },
                    { "name": "lastUpdateTime", "type": "i64" },
                    { "name": "paddingFinal", "type": { "array": ["u8", 104] } }
                ]
            }
        }
    ]
};


// Исправленные адреса
const STAKING_PROGRAM_ID = new window.solanaWeb3.PublicKey('ZiECmSCWiJvsKRbNmBw27pyWEqEPFY4sBZ3MCnbvirH');
const AFOX_TOKEN_MINT_ADDRESS = new window.solanaWeb3.PublicKey('GLkewtq8s2Yr24o5LT5mzzEeccKuSsy8H5RCHaE9uRAd');
const AFOX_POOL_STATE_PUBKEY = new window.solanaWeb3.PublicKey('DfAaH2XsWsjSgPkECmZfDsmABzboJ5hJ8T32Aft2QaXZ'); 
const AFOX_POOL_VAULT_PUBKEY = new window.solanaWeb3.PublicKey('328N13YrQyUAfqHEAXhtQhfan5hHRxDdZqsdpSx6KSkp'); 
const AFOX_REWARDS_VAULT_PUBKEY = new window.solanaWeb3.PublicKey('BXinWRfmkk2jo3cTJfcYT5zoC7yix5AsvmTk8NwLoiDF');
const DAO_TREASURY_VAULT_PUBKEY = new window.solanaWeb3.PublicKey('6BzRqaLD7CiGvSWjkp5G8RbmvGdjMRUqmz9VcXfGzfzi'); 

const TOKEN_PROGRAM_ID = new window.solanaWeb3.PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const ASSOCIATED_TOKEN_PROGRAM_ID = new window.solanaWeb3.PublicKey('ATokenGPvbdQxr7K2mc7fgC6jgvZifv6BAeu6CCYH25');
const SYSTEM_PROGRAM_ID = window.solanaWeb3.SystemProgram.programId;


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
    try {
        const connection = new window.solanaWeb3.Connection(BACKUP_RPC_ENDPOINT, connectionOptions);
        const slot = await connection.getSlot();
        console.log("RPC Connected, slot:", slot);
        return connection;
    } catch (error) {
        console.error('RPC Error:', error);
        throw new Error('RPC endpoint is unhealthy.');
    }
}


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
const liveAprValue = await getLiveAPR();
if (uiElements.stakingApr) {
    uiElements.stakingApr.textContent = liveAprValue;
}

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

// Функция получения PDA адреса (строго по Rust: owner + pool_state)
async function getUserStakingAccountPDA(owner) {
    const [pda] = await window.solanaWeb3.PublicKey.findProgramAddress(
        [owner.toBuffer(), AFOX_POOL_STATE_PUBKEY.toBuffer()],
        STAKING_PROGRAM_ID
    );
    return pda;
}

async function getUserStakingPDA(owner) {
    // ВАЖНО: Seeds должны быть точно как в Rust [owner, pool_state]
    const [pda] = await window.solanaWeb3.PublicKey.findProgramAddress(
        [owner.toBuffer(), AFOX_POOL_STATE_PUBKEY.toBuffer()],
        STAKING_PROGRAM_ID
    );
    return pda;
}


/**
 * ГЛАВНАЯ ФУНКЦИЯ: СТЕЙКИНГ (STAKE)
 */
async function handleStakeAfox() {
    if (!appState.walletPublicKey) return showNotification("Connect Wallet first!", "warning");
    setLoadingState(true, uiElements.stakeAfoxBtn);
    try {
        const provider = new window.anchor.AnchorProvider(appState.connection, window.solana, { commitment: "confirmed" });
        const program = new window.anchor.Program(STAKING_IDL, STAKING_PROGRAM_ID, provider);
        const amountInput = uiElements.stakeAmountInput.value;
        const amountBN = new window.anchor.BN(parseAmountToBigInt(amountInput, AFOX_DECIMALS).toString());
        const userStakingPDA = await getUserStakingAccountPDA(appState.walletPublicKey);
        const userAfoxATA = await getATA(appState.walletPublicKey);

        await program.methods.deposit(amountBN).accounts({
            poolState: AFOX_POOL_STATE_PUBKEY,
            userStaking: userStakingPDA,
            owner: appState.walletPublicKey,
            userSourceAta: userAfoxATA,
            vault: AFOX_POOL_VAULT_PUBKEY,
            rewardMint: AFOX_TOKEN_MINT_ADDRESS,
            tokenProgram: TOKEN_PROGRAM_ID,
            clock: window.solanaWeb3.SYSVAR_CLOCK_PUBKEY,
        }).rpc();

        showNotification("Stake Success!", "success");
        await updateStakingAndBalanceUI();
    } catch (err) {
        showNotification("Error: " + err.message, "error");
    } finally {
        setLoadingState(false, uiElements.stakeAfoxBtn);
    }
}


/**
 * ФУНКЦИЯ: ЗАБРАТЬ НАГРАДЫ (CLAIM)
 */
async function handleClaimRewards() {
    if (!appState.walletPublicKey) return;
    setLoadingState(true, uiElements.claimRewardsBtn);
    try {
        const provider = new window.anchor.AnchorProvider(appState.connection, window.solana, { commitment: "confirmed" });
        const program = new window.anchor.Program(STAKING_IDL, STAKING_PROGRAM_ID, provider);
        const userStakingPDA = await getUserStakingAccountPDA(appState.walletPublicKey);
        
        // Получаем ATA (Associated Token Account)
        const userAfoxATA = await window.solanaWeb3.PublicKey.findProgramAddress(
            [appState.walletPublicKey.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), AFOX_TOKEN_MINT_ADDRESS.toBuffer()],
            ASSOCIATED_TOKEN_PROGRAM_ID
        ).then(res => res[0]);

        await program.methods.claimRewards().accounts({
            poolState: AFOX_POOL_STATE_PUBKEY,
            userStaking: userStakingPDA,
            owner: appState.walletPublicKey,
            vault: AFOX_POOL_VAULT_PUBKEY,
            adminFeeVault: AFOX_REWARDS_VAULT_PUBKEY,
            userRewardsAta: userAfoxATA,
            rewardMint: AFOX_TOKEN_MINT_ADDRESS,
            tokenProgram: TOKEN_PROGRAM_ID,
            clock: window.solanaWeb3.SYSVAR_CLOCK_PUBKEY,
        }).rpc();

        showNotification("Rewards claimed!", "success");
        await updateStakingAndBalanceUI();
    } catch (err) {
        showNotification("Claim failed: " + err.message, "error");
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

async function getLiveAPR() {
    try {
        const program = getAnchorProgram(STAKING_PROGRAM_ID, STAKING_IDL);
        
        // 1. Получаем данные о состоянии пула из блокчейна
        const poolAccount = await program.account.poolState.fetch(AFOX_POOL_STATE_PUBKEY);
        
        // 2. Достаем total_staked (сколько всего монет люди уже вложили)
        const totalStaked = Number(poolAccount.totalStakedAmount) / 1000000; // Делим на 10^6 знаков

        // 3. Твои настройки: 100 единиц в секунду = 0.0001 монеты
        const rewardsPerSecond = 0.0001; 
        const secondsInYear = 31536000;
        const totalRewardsYear = rewardsPerSecond * secondsInYear; // 3,153.6 AFX в год

        if (totalStaked === 0) return "—";

        // 4. Считаем реальный процент
        const realAPR = (totalRewardsYear / totalStaked) * 100;
        
        return realAPR.toFixed(2) + "%";
    } catch (e) {
        console.error("Ошибка расчета APR:", e);
        return "Error";
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
    // Buttons
    uiElements.connectWalletButtons = Array.from(document.querySelectorAll('.connect-wallet-btn, #connectWalletBtn'));
    uiElements.stakeAfoxBtn = document.getElementById('stake-afox-btn') || document.getElementById('stakeAfoxBtn');
    uiElements.claimRewardsBtn = document.getElementById('claim-rewards-btn') || document.getElementById('claimRewardsBtn');
    uiElements.unstakeAfoxBtn = document.getElementById('unstake-afox-btn') || document.getElementById('unstakeAfoxBtn');
    
    // Inputs & Display
    uiElements.stakeAmountInput = document.getElementById('stake-amount') || document.getElementById('stakeAmountInput');
    uiElements.userAfoxBalance = document.getElementById('user-afox-balance') || document.getElementById('userAfoxBalance');
    uiElements.userStakedAmount = document.getElementById('user-staked-amount') || document.getElementById('userStakedAmount');
    uiElements.userRewardsAmount = document.getElementById('user-rewards-amount') || document.getElementById('userRewardsAmount');
    uiElements.stakingApr = document.getElementById('staking-apr') || document.getElementById('stakingApr');
    uiElements.lockupPeriod = document.getElementById('lockup-period');
    
    // Global Elements
    uiElements.notificationContainer = document.getElementById('notification-container') || document.getElementById('notificationContainer');
    uiElements.pageLoader = document.getElementById('page-loader');
    uiElements.copyButtons = Array.from(document.querySelectorAll('.copy-btn'));
    
    // DAO
    uiElements.createProposalBtn = document.getElementById('createProposalBtn');
    uiElements.createProposalModal = document.getElementById('dao-modal');
}


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
            console.log("DAO Proposal Form submitted"); 
            showNotification('Proposal creation simulated!', 'success', 3000);
            e.target.reset();
            closeAllPopups();
        });
    }


// ==========================================
// БЛОК 3: DAO (ГОЛОСОВАНИЕ)
// ==============================
function setupDAO() {
    if (uiElements.createProposalBtn && uiElements.createProposalModal) {
        uiElements.createProposalBtn.addEventListener('click', () => {
            uiElements.createProposalModal.style.display = 'flex';
        });
        
        const closeBtn = document.getElementById('closeProposalModal') || document.getElementById('close-dao-modal');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                uiElements.createProposalModal.style.display = 'none';
            });
        }
    }
}


// ============================================================
// ГЛОБАЛЬНЫЙ МОДУЛЬ УПРАВЛЕНИЯ ИНТЕРФЕЙСОМ (ALL-IN-ONE)
// ============================================================

/**
 * 1. Состояние загрузки (блокировка кнопок)
 */
function setLoadingState(isLoading, button = null) {
    if (uiElements.pageLoader) uiElements.pageLoader.style.display = isLoading ? 'flex' : 'none';
    
    const btns = [uiElements.stakeAfoxBtn, uiElements.claimRewardsBtn, uiElements.unstakeAfoxBtn];
    btns.forEach(btn => { if (btn) btn.disabled = isLoading; });

    if (button) {
        button.disabled = isLoading;
        if (isLoading) {
            button.dataset.oldText = button.textContent;
            button.textContent = '...Wait';
        } else if (button.dataset.oldText) {
            button.textContent = button.dataset.oldText;
        }
    }
}

/**
 * 2. Обновление визуального состояния кошелька
 */
function updateWalletDisplay(address) {
    const connectBtns = uiElements.connectWalletButtons || [];
    const walletDisplays = document.querySelectorAll('.wallet-display, [data-wallet-control="walletDisplay"]');
    const walletAddresses = uiElements.walletAddressDisplays || [];
    const fullAddressDisplay = document.getElementById('walletAddressDisplay');

    if (address) {
        const short = `${address.substring(0, 4)}...${address.slice(-4)}`;
        connectBtns.forEach(btn => { btn.style.display = 'none'; btn.classList.add('connected'); });
        walletDisplays.forEach(div => { div.style.display = 'flex'; div.onclick = disconnectWallet; });
        walletAddresses.forEach(span => span.textContent = short);
        if (fullAddressDisplay) {
            fullAddressDisplay.textContent = address;
            fullAddressDisplay.classList.add('connected');
        }
        uiElements.copyButtons?.forEach(btn => { 
            btn.dataset.copyTarget = address; 
            btn.style.display = 'block'; 
        });
    } else {
        connectBtns.forEach(btn => { btn.style.display = 'block'; btn.classList.remove('connected'); });
        walletDisplays.forEach(div => { div.style.display = 'none'; div.onclick = null; });
        if (fullAddressDisplay) {
            fullAddressDisplay.textContent = 'Not Connected';
            fullAddressDisplay.classList.remove('connected');
        }
        uiElements.copyButtons?.forEach(btn => { btn.style.display = 'none'; });
    }
}

/**
 * 3. Логика подключения кошелька
 */
async function connectWallet() {
    try {
        if (!window.solana) return showNotification("Install Phantom!", "error");
        const resp = await window.solana.connect();
        appState.provider = window.solana;
        appState.walletPublicKey = resp.publicKey;
        appState.connection = new window.solanaWeb3.Connection(BACKUP_RPC_ENDPOINT, 'confirmed');
        
        updateWalletDisplay(resp.publicKey.toBase58());
        await updateStakingAndBalanceUI();
        showNotification("Connected!", "success");
    } catch (err) {
        console.error("Conn Error:", err);
        showNotification("Failed to connect", "error");
    }
}

/**
 * 4. Главная инициализация приложения
 */
function initializeAurumFoxApp() {
    console.log("🛠 Начало инициализации...");

    // А. Кэширование всех элементов
    uiElements = {
        connectWalletButtons: Array.from(document.querySelectorAll('.connect-wallet-btn, #connectWalletBtn')),
        walletAddressDisplays: Array.from(document.querySelectorAll('.wallet-address-display')),
        copyButtons: Array.from(document.querySelectorAll('.copy-btn')),
        stakeAfoxBtn: document.getElementById('stake-afox-btn'),
        claimRewardsBtn: document.getElementById('claim-rewards-btn'),
        unstakeAfoxBtn: document.getElementById('unstake-afox-btn'),
        pageLoader: document.getElementById('page-loader'),
        notificationContainer: document.getElementById('notification-container')
    };

    // Б. Привязка действий (onclick исключает дубликаты)
    const actions = [
        { id: 'connectWalletBtn', func: connectWallet },
        { id: 'stake-afox-btn', func: typeof handleStakeAfox !== 'undefined' ? handleStakeAfox : null },
        { id: 'claim-rewards-btn', func: typeof handleClaimRewards !== 'undefined' ? handleClaimRewards : null },
        { id: 'unstake-afox-btn', func: typeof handleUnstakeAfox !== 'undefined' ? handleUnstakeAfox : null }
    ];

    actions.forEach(item => {
        const btn = document.getElementById(item.id);
        if (btn && item.func) {
            btn.onclick = null;
            btn.onclick = async (e) => {
                e.preventDefault();
                await item.func();
            };
        }
    });

    // В. Логика кнопок копирования
    uiElements.copyButtons.forEach(btn => {
        btn.onclick = () => {
            if (btn.dataset.copyTarget) {
                navigator.clipboard.writeText(btn.dataset.copyTarget);
                showNotification('Copied!', 'success');
            }
        };
    });

    // Г. Проверка существующего сеанса
    if (window.solana?.isConnected && window.solana?.publicKey) {
        handlePublicKeyChange(window.solana.publicKey);
    }

    console.log("🚀 Приложение Aurum Fox готово.");
}

// 5. Запуск
if (document.readyState === 'complete') {
    initializeAurumFoxApp();
} else {
    window.addEventListener('load', initializeAurumFoxApp);
}
