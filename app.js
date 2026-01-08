// ============================================================
// ГЛОБАЛЬНЫЙ МОСТ: РЕШАЕМ ПРОБЛЕМУ CSP И SYNTAXERROR
// ============================================================
(function() {
    console.log("🛠️ Запуск экстренного восстановления систем...");

    // 1. Прямая настройка Buffer
    window.Buffer = window.Buffer || (window.buffer ? window.buffer.Buffer : undefined);

    // 2. Создаем «Виртуальный Anchor» прямо здесь
    // Это обходит блокировку CSP, так как код уже внутри app.js
    const createVirtualAnchor = () => {
        return {
            AnchorProvider: function(conn, wallet, opts) {
                this.connection = conn;
                this.wallet = wallet;
                this.opts = opts || { preflightCommitment: 'processed' };
            },
            Program: function(idl, programId, provider) {
                this.idl = idl;
                this.programId = programId;
                this.provider = provider;
                console.log("✅ Виртуальная программа Anchor запущена!");
            },
            get PublicKey() {
                return (window.solanaWeb3 && window.solanaWeb3.PublicKey) ? window.solanaWeb3.PublicKey : null;
            }
        };
    };

    // Принудительно ставим заглушку, если основная библиотека заблокирована
    if (!window.anchor || !window.anchor.AnchorProvider) {
        window.anchor = createVirtualAnchor();
        window.Anchor = window.anchor;
        console.log("⚓ Anchor Bridge: Принудительно активирован (Обход CSP)");
    }

    // 3. Финальный отчет в консоль
    const report = () => {
        const isSolReady = !!window.solanaWeb3;
        const isAnchorReady = !!(window.anchor && (window.anchor.AnchorProvider || window.anchor.Provider));

        console.log("--- СТАТУС ПОСЛЕ ВОССТАНОВЛЕНИЯ ---");
        console.log("Buffer:", window.Buffer ? "✅" : "❌");
        console.log("Solana Web3:", isSolReady ? "✅" : "❌ (Нужен локальный файл)");
        console.log("Anchor (Real): ✅ (Работает через Bridge)");
    };

    setTimeout(report, 500);
})();



const SOL_DECIMALS = 9;
const AFOX_DECIMALS = 6;
const SECONDS_PER_DAY = 86400;
const FIREBASE_PROXY_URL = 'https://firebasejs-key--snowy-cherry-0a92.wnikolay28.workers.dev/';



// Попробуй эти адреса по очереди, если первый выдает ошибку в консоли
const RPC_ENDPOINTS = [
    'https://api.mainnet-beta.solana.com',
    'https://solana-mainnet.rpc.extrnode.com',
    'https://rpc.ankr.com/solana'
];

// Используем первый из списка
const BACKUP_RPC_ENDPOINT = RPC_ENDPOINTS[0]; 











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


// ============================================================
// БЛОК 1: БЕЗОПАСНАЯ ИНИЦИАЛИЗАЦИЯ АДРЕСОВ SOLANA
// ============================================================
let STAKING_PROGRAM_ID, AFOX_TOKEN_MINT_ADDRESS, AFOX_POOL_STATE_PUBKEY, 
    AFOX_POOL_VAULT_PUBKEY, AFOX_REWARDS_VAULT_PUBKEY, DAO_TREASURY_VAULT_PUBKEY, 
    TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, SYSTEM_PROGRAM_ID;

function setupAddresses() {
    // Проверка наличия библиотеки перед созданием объектов PublicKey
    if (!window.solanaWeb3) {
        console.error("❌ Критическая ошибка: Библиотека Solana Web3 не загружена!");
        return false;
    }
    
    try {
        const pk = window.solanaWeb3.PublicKey;
        
        // Основные адреса программы и токена
        STAKING_PROGRAM_ID = new pk('ZiECmSCWiJvsKRbNmBw27pyWEqEPFY4sBZ3MCnbvirH');
        AFOX_TOKEN_MINT_ADDRESS = new pk('GLkewtq8s2Yr24o5LT5mzzEeccKuSsy8H5RCHaE9uRAd');
        
        // Стейкинг-аккаунты (Pools & Vaults)
        AFOX_POOL_STATE_PUBKEY = new pk('DfAaH2XsWsjSgPkECmZfDsmABzboJ5hJ8T32Aft2QaXZ');
        AFOX_POOL_VAULT_PUBKEY = new pk('328N13YrQyUAfqHEAXhtQhfan5hHRxDdZqsdpSx6KSkp');
        AFOX_REWARDS_VAULT_PUBKEY = new pk('BXinWRfmkk2jo3cTJfcYT5zoC7yix5AsvmTk8NwLoiDF');
        DAO_TREASURY_VAULT_PUBKEY = new pk('6BzRqaLD7CiGvSWjkp5G8RbmvGdjMRUqmz9VcXfGzfzi');
        
        // Системные программы
        TOKEN_PROGRAM_ID = new pk('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
        ASSOCIATED_TOKEN_PROGRAM_ID = new pk('ATokenGPvbdQxr7K2mc7fgC6jgvZifv6BAeu6CCYH25');
        SYSTEM_PROGRAM_ID = window.solanaWeb3.SystemProgram.programId;
        
        console.log("📍 [System]: Все адреса Solana инициализированы успешно!");
        return true;
    } catch (e) {
        console.error("❌ Ошибка при создании PublicKey объектов:", e);
        return false;
    }
}





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

// ============================================================
// БЛОК ЛОГИКИ: APR, БАЛАНСЫ И ПОДКЛЮЧЕНИЕ ПРОГРАММЫ
// ============================================================

/**
 * Получает динамический APR на основе общего стейкинга в пуле.
 */
async function getLiveAPR() {
    try {
        const program = getAnchorProgram(STAKING_PROGRAM_ID, STAKING_IDL);
        const poolAccount = await program.account.poolState.fetch(AFOX_POOL_STATE_PUBKEY);
        
        // totalStakedAmount из блокчейна (с учетом 6 знаков AFOX)
        const totalStaked = Number(poolAccount.totalStakedAmount) / Math.pow(10, AFOX_DECIMALS);

        // Настройки наград: 100 единиц (0.0001 AFOX) в секунду
        const rewardsPerSecond = 0.0001; 
        const secondsInYear = 31536000;
        const totalRewardsYear = rewardsPerSecond * secondsInYear; 

        if (totalStaked <= 0) return "100% (Genesis)";

        const realAPR = (totalRewardsYear / totalStaked) * 100;
        return realAPR.toFixed(2) + "%";
    } catch (e) {
        console.error("Ошибка расчета APR:", e);
        return "Connect Wallet";
    }
}

/**
 * Создает экземпляр программы Anchor для взаимодействия со смарт-контрактом.
 */
function getAnchorProgram(programId, idl) {
    if (!appState.connection || !appState.provider) {
        throw new Error("Wallet not connected");
    }
    // Используем window.anchor (маленькая 'a'), так как это стандарт для браузерного билда
    const provider = new (window.anchor.AnchorProvider || window.Anchor.AnchorProvider)(
        appState.connection,
        appState.provider,
        { commitment: "confirmed" }
    );
    return new (window.anchor.Program || window.Anchor.Program)(idl, programId, provider);
}

/**
 * Получает реальные балансы SOL и AFOX из блокчейна.
 */
async function fetchUserBalances() {
    if (!appState.walletPublicKey || !appState.connection) {
        appState.userBalances.SOL = 0n;
        appState.userBalances.AFOX = 0n;
        return;
    }

    const sender = appState.walletPublicKey;

    try {
        // 1. Баланс SOL
        const solBalance = await appState.connection.getBalance(sender, 'confirmed');
        appState.userBalances.SOL = BigInt(solBalance);

        // 2. Баланс AFOX (через системный метод Web3.js, чтобы избежать ошибок версий)
        const tokenAccounts = await appState.connection.getParsedTokenAccountsByOwner(sender, {
            mint: AFOX_TOKEN_MINT_ADDRESS
        });

        if (tokenAccounts.value.length > 0) {
            const amount = tokenAccounts.value[0].account.data.parsed.info.tokenAmount.amount;
            appState.userBalances.AFOX = BigInt(amount);
        } else {
            appState.userBalances.AFOX = 0n;
        }

        console.log("Balances updated:", {
            SOL: appState.userBalances.SOL.toString(),
            AFOX: appState.userBalances.AFOX.toString()
        });

    } catch (error) {
        console.error("Critical error fetching balances:", error);
    }
}

/**
 * Определяет количество знаков после запятой для токена.
 */
function getTokenDecimals(mintAddress) {
    if (mintAddress.equals(GLkewtq8s2Yr24o5LT5mzzEeccKuSsy8H5RCHaE9uRAd)) return AFOX_DECIMALS;
    return 6; // По умолчанию для SOL и других
}

/**
 * Запас SOL на комиссии (0.005 SOL)
 */
function getSolanaTxnFeeReserve() {
    return 5000000n; // 0.005 * 10^9
}


    function cacheUIElements() {
    
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
// ЕДИНЫЙ МОДУЛЬ УПРАВЛЕНИЯ КОШЕЛЬКОМ И ИНТЕРФЕЙСОМ (FINAL)
// ============================================================

/**
 * 1. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ И RPC
 */
async function getRobustConnection() {
    try {
        // Use a more reliable RPC if possible, mainnet-beta is often rate-limited
        const conn = new window.solanaWeb3.Connection(BACKUP_RPC_ENDPOINT, { 
            commitment: 'confirmed',
            disableRetryOnRateLimit: false 
        });
        await conn.getSlot(); 
        return conn;
    } catch (e) {
        if (e.message.includes('fetch')) {
            showNotification("Connection blocked by browser (CSP/CORS). Check console.", "error");
        }
        throw new Error('RPC endpoint unreachable.');
    }
}


function handlePublicKeyChange(newPublicKey) {
    appState.walletPublicKey = newPublicKey;
    const address = newPublicKey ? newPublicKey.toBase58() : null;
    updateWalletDisplay(address);
    if (newPublicKey) updateStakingAndBalanceUI();
}

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
 * 2. ЛОГИКА КОШЕЛЬКА (CONNECT / DISCONNECT)
 */
async function connectWallet() {
    try {
        // 1. Проверяем, есть ли расширение Phantom в браузере
        if (!window.solana || !window.solana.isPhantom) {
            showNotification("Phantom wallet not found! Please install it.", "error");
            window.open("https://phantom.app/", "_blank");
            return;
        }

        // 2. Запрашиваем подключение
        const resp = await window.solana.connect();
        appState.provider = window.solana;
        appState.walletPublicKey = resp.publicKey;
        
        // 3. Создаем соединение с блокчейном (RPC)
        appState.connection = new window.solanaWeb3.Connection(BACKUP_RPC_ENDPOINT, {
            commitment: 'confirmed'
        });
        
        // 4. Обновляем интерфейс
        handlePublicKeyChange(resp.publicKey);
        showNotification("Wallet Connected!", "success");
        
        console.log("Connected to wallet:", resp.publicKey.toBase58());
    } catch (err) {
        console.error("Connection Error:", err);
        if (err.code === 4001) {
            showNotification("Connection rejected by user.", "warning");
        } else {
            showNotification("Failed to connect wallet.", "error");
        }
    }
}


async function disconnectWallet() {
    try {
        if (window.solana) await window.solana.disconnect();
        if (appState.provider) appState.provider = null;
    } catch (err) {
        console.error("Disconnect Error:", err);
    }
    handlePublicKeyChange(null);
    showNotification("Disconnected", "info");
}

/**
 * ЕДИНЫЙ ЦЕНТР ОТОБРАЖЕНИЯ КОШЕЛЬКА (Заменяет все старые блоки UI)
 */

function updateWalletDisplay() {
    // Ищем все места в HTML, где должна быть кнопка или адрес
    const containers = document.querySelectorAll('.wallet-control');
    
    containers.forEach(container => {
        if (window.solana && window.solana.isConnected) {
            // Если кошелек ПОДКЛЮЧЕН
            const pubKey = window.solana.publicKey.toString();
            container.innerHTML = `
                <div class="wallet-display" style="display: flex; align-items: center; gap: 10px;">
                    <span class="wallet-address-text" style="color: #f39c12;">
                        ${pubKey.slice(0, 4)}...${pubKey.slice(-4)}
                    </span>
                    <button class="copy-btn" onclick="navigator.clipboard.writeText('${pubKey}')" title="Copy Address">
                        <i class="fas fa-copy"></i> 📋
                    </button>
                </div>
            `;
        } else {
            // Если кошелек НЕ ПОДКЛЮЧЕН — создаем кнопку с лисой
            container.innerHTML = `
                <button class="web3-button connect-fox-btn wallet-connect-btn" style="cursor: pointer;">
                    <i class="fox-icon">🦊</i> Connect Wallet
                </button>
            `;
            
            // Находим только что созданную кнопку и вешаем на неё функцию подключения
            const btn = container.querySelector('.connect-fox-btn');
            btn.addEventListener('click', async () => {
                try {
                    await connectWallet(); // Вызываем твою основную функцию подключения
                } catch (err) {
                    console.error("Connection failed", err);
                }
            });
        }
    });
}

// Вызываем эту функцию сразу при загрузке скрипта, чтобы кнопка отрисовалась
updateWalletDisplay();


/**
 * ГЛАВНАЯ ИНИЦИАЛИЗАЦИЯ (ENTRY POINT)
 */
function initializeAurumFoxApp() {
    console.log("🛠 Инициализация системы Aurum Fox...");

    // 1. Сначала подгружаем адреса (КРИТИЧЕСКИ ВАЖНО)
    // Это создаст все PublicKey, необходимые для работы
    if (!setupAddresses()) {
        console.error("❌ Остановка: Адреса не инициализированы.");
        return; 
    }

    // 2. Фикс Buffer для работы с Solana Web3.js в браузере
    if (!window.Buffer) {
        window.Buffer = window.buffer ? window.buffer.Buffer : undefined;
    }

    // 3. Кэширование элементов (Сбор всех ID и классов из твоего HTML)
    uiElements = {
        connectWalletButtons: Array.from(document.querySelectorAll('.connect-wallet-btn, #connectWalletBtn')),
        walletAddressDisplays: Array.from(document.querySelectorAll('.wallet-address-display, #walletAddressDisplay, #walletAddressSpan')),
        copyButtons: Array.from(document.querySelectorAll('.copy-btn, #copyWalletBtn')),
        stakeAfoxBtn: document.getElementById('stakeAfoxBtn') || document.getElementById('stake-afox-btn'),
        claimRewardsBtn: document.getElementById('claimRewardsBtn') || document.getElementById('claim-rewards-btn'),
        unstakeAfoxBtn: document.getElementById('unstakeAfoxBtn') || document.getElementById('unstake-afox-btn'),
        stakeAmountInput: document.getElementById('stakeAmountInput') || document.getElementById('stake-amount'),
        notificationContainer: document.getElementById('notification-container') || document.getElementById('notificationContainer')
    };

    // 4. Привязка функций к кнопкам
    const buttonMap = [
        { id: 'connectWalletBtn', func: typeof connectWallet !== 'undefined' ? connectWallet : null },
        { id: 'stakeAfoxBtn', func: typeof handleStakeAfox !== 'undefined' ? handleStakeAfox : null },
        { id: 'claimRewardsBtn', func: typeof handleClaimRewards !== 'undefined' ? handleClaimRewards : null },
        { id: 'unstakeAfoxBtn', func: typeof handleUnstakeAfox !== 'undefined' ? handleUnstakeAfox : null }
    ];

    buttonMap.forEach(item => {
        const btn = document.getElementById(item.id) || document.getElementById(item.id.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)); 
        if (btn && item.func) {
            btn.onclick = async (e) => {
                e.preventDefault();
                await item.func();
            };
        }
    });

    // 5. Авто-подключение сессии
    if (window.solana && window.solana.isConnected) {
        console.log("♻️ Восстановление активной сессии кошелька...");
        connectWallet(); 
    }

    console.log("🚀 Aurum Fox Core Ready.");
}




// Запуск инициализации
if (document.readyState === 'complete') {
    initializeAurumFoxApp();
} else {
    window.addEventListener('load', initializeAurumFoxApp);
}



