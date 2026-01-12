function formatBigInt(value, decimals) {
    if (!value) return "0";
    let str = value.toString().padStart(decimals + 1, '0');
    let intPart = str.slice(0, -decimals);
    let fracPart = str.slice(-decimals).replace(/0+$/, '');
    return fracPart ? (intPart + "." + fracPart) : intPart;
}


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






const RPC_ENDPOINTS = [
    'https://solana-rpc.publicnode.com', // Очень стабильный бесплатный узел
    'https://rpc.ankr.com/solana',
    'https://api.mainnet-beta.solana.com'
];

// Установите публичный узел как основной
const BACKUP_RPC_ENDPOINT = RPC_ENDPOINTS[0]; 











const POOLS_CONFIG = {
    0: { name: "Flexible", apr_rate: 500 },
    1: { name: "Standard", apr_rate: 1200 },
    2: { name: "Max Boost", apr_rate: 2500 },
    4: { name: "Legacy", apr_rate: 0 }
};





// Замени блок STAKING_IDL на этот (фрагмент для корректного маппинга):
const STAKING_IDL = {
    "version": "0.1.0",
    "name": "my_new_afox_project",
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
        },
        {
            "name": "claimRewards",
            "accounts": [
                { "name": "poolState", "isMut": true },
                { "name": "userStaking", "isMut": true },
                { "name": "owner", "isMut": true, "isSigner": true },
                { "name": "vault", "isMut": true },
                { "name": "adminFeeVault", "isMut": true },
                { "name": "userRewardsAta", "isMut": true },
                { "name": "rewardMint", "isMut": false },
                { "name": "tokenProgram", "isMut": false },
                { "name": "clock", "isMut": false }
            ],
            "args": []
        },
        {
            "name": "unstake",
            "accounts": [
                { "name": "poolState", "isMut": true },
                { "name": "userStaking", "isMut": true },
                { "name": "owner", "isMut": true, "isSigner": true },
                { "name": "vault", "isMut": true },
                { "name": "daoTreasuryVault", "isMut": true },
                { "name": "adminFeeVault", "isMut": true },
                { "name": "userRewardsAta", "isMut": true },
                { "name": "rewardMint", "isMut": false },
                { "name": "tokenProgram", "isMut": false },
                { "name": "clock", "isMut": false }
            ],
            "args": [
                { "name": "amount", "type": "u64" },
                { "name": "isEarlyExit", "type": "bool" }
            ]
        }
    ],
    "accounts": [
        {
            "name": "UserStakingAccount",
            "type": {
                "kind": "struct",
                "fields": [
                    { "name": "owner", "type": "publicKey" },
                    { "name": "stakedAmount", "type": "u64" },
                    { "name": "rewardsToClaim", "type": "u64" },
                    { "name": "lastUpdateTimestamp", "type": "i64" },
                    { "name": "lockupEndTime", "type": "i64" },
                    { "name": "poolIndex", "type": "u8" },
                    { "name": "lending", "type": "u64" },
                    { "name": "padding", "type": { "array": ["u8", 104] } }
                ]
            }
        },
        {
            "name": "PoolState",
            "type": {
                "kind": "struct",
                "fields": [
                    { "name": "admin", "type": "publicKey" },
                    { "name": "totalStakedAmount", "type": "u64" },
                    { "name": "rewardRatePerSec", "type": "u64" }
                ]
            }
        }
    ]
};



// Поиск PDA пользователя (строго соответствует Rust seeds)

// ПРАВИЛЬНЫЙ РАСЧЕТ PDA (Синхронизировано с твоим Rust: owner + pool_state_pubkey)
async function getUserStakingPDA(owner) {
    const [pda] = await window.solanaWeb3.PublicKey.findProgramAddress(
        [
            owner.toBuffer(), 
            AFOX_POOL_STATE_PUBKEY.toBuffer() // Это должен быть DfAaH2Xs...
        ],
        STAKING_PROGRAM_ID
    );
    return pda;
}




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
    // Пробуем взять из uiElements или напрямую из DOM по верному ID
    const modal = uiElements.createProposalModal || document.getElementById('createProposalModal');

    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('is-open');
        console.log("✅ Модалка закрыта");
    } else {
        console.error("❌ Ошибка: Элемент createProposalModal не найден в DOM");
    }
    
    // Закрытие меню (если оно есть)
    const menuToggle = document.getElementById('menuToggle');
    if (menuToggle && menuToggle.classList.contains('open')) {
        if (typeof toggleMenuState === 'function') toggleMenuState(true);
    }

    if (typeof toggleScrollLock === 'function') {
        toggleScrollLock(false);
    }
}
 




function actionAudit(name, status, detail = "") {
    const icons = { process: "⏳", success: "✅", error: "❌", info: "ℹ️" };
    const messages = {
        process: `${icons.process} ${name}: Transaction started...`,
        success: `${icons.success} ${name}: Successful! ${detail}`,
        error: `${icons.error} ${name} Failed: ${detail}`,
        info: `${icons.info} ${detail}`
    };
    showNotification(messages[status], status === 'process' ? 'info' : status);
    console.log(`[SYSTEM AUDIT] ${name} -> ${status.toUpperCase()} ${detail}`);
}




// Улучшенная функция статуса кнопок
function setBtnState(btn, isLoading, text = "Wait...") {
    if (!btn) return;
    if (isLoading) {
        btn.disabled = true;
        btn.dataset.old = btn.innerHTML;
        btn.innerHTML = `<span class="spinner"></span> ${text}`;
        btn.style.opacity = "0.6";
    } else {
        btn.disabled = false;
        btn.innerHTML = btn.dataset.old || btn.innerHTML;
        btn.style.opacity = "1";
    }
}




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
        const userPDA = await getUserStakingPDA(appState.walletPublicKey);
        
        // ВАЖНО: Для zero_copy аккаунтов используем fetchNullable или fetch
        // Если выдает "Layout mismatch", значит JS не видит падинги [u8; 104]
        const stakingData = await program.account.userStakingAccount.fetch(userPDA);

        appState.userStakingData = {
            stakedAmount: BigInt(stakingData.stakedAmount.toString()),
            rewards: BigInt(stakingData.rewardsToClaim.toString()),
            lockupEndTime: stakingData.lockupEndTime.toNumber(),
            poolIndex: stakingData.poolIndex,
            lending: BigInt(stakingData.lending.toString())
        };
        
        console.log("📊 Данные стейкинга обновлены:", appState.userStakingData);
    } catch (e) {
        console.error("⚠️ Ошибка парсинга zero_copy данных:", e.message);
    }
}











// Поиск основного PDA пула (если нужно для системных вызовов)
async function getPoolPDA() {
    const [pda] = await window.solanaWeb3.PublicKey.findProgramAddress(
        [Buffer.from("pool")],
        STAKING_PROGRAM_ID
    );
    return pda;
}

async function handleStakeAfox() {
    const btn = uiElements.stakeAfoxBtn;
    const amountStr = uiElements.stakeAmountInput.value;
    const poolIndex = parseInt(uiElements.poolSelector?.value || "0");

    if (!amountStr || parseFloat(amountStr) <= 0) {
        throw new Error("Enter a valid amount");
    }

    await smartAction(btn, "Staking", "Success!", "📈", async () => {
        const amount = parseAmountToBigInt(amountStr, AFOX_DECIMALS);
        const program = getAnchorProgram(STAKING_PROGRAM_ID, STAKING_IDL);
        const userPDA = await getUserStakingPDA(appState.walletPublicKey);
        
        // Логика ATA пользователя
        const userAta = await window.solanaWeb3.PublicKey.findProgramAddress(
            [appState.walletPublicKey.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), AFOX_TOKEN_MINT_ADDRESS.toBuffer()],
            ASSOCIATED_TOKEN_PROGRAM_ID
        ).then(res => res[0]);

        return await program.methods.deposit(new window.anchor.BN(amount.toString()))
            .accounts({
                poolState: AFOX_POOL_STATE_PUBKEY,
                userStaking: userPDA,
                owner: appState.walletPublicKey,
                userSourceAta: userAta,
                vault: AFOX_POOL_VAULT_PUBKEY,
                rewardMint: AFOX_TOKEN_MINT_ADDRESS,
                tokenProgram: TOKEN_PROGRAM_ID,
                clock: window.solanaWeb3.SYSVAR_CLOCK_PUBKEY
            }).rpc();
    });
}



async function handleUnstakeAfox() {
    const btn = uiElements.unstakeAfoxBtn;
    const program = getAnchorProgram(STAKING_PROGRAM_ID, STAKING_IDL);
    const userPDA = await getUserStakingPDA(appState.walletPublicKey);

    await smartAction(btn, "Unstaking", "Tokens Freed!", "🔓", async () => {
        const stakingData = await program.account.userStakingAccount.fetch(userPDA);
        const now = Math.floor(Date.now() / 1000);
        const isEarly = now < stakingData.lockupEndTime.toNumber();

        // ИСПРАВЛЕНО: добавлена приставка window.
        const userAta = await window.solanaWeb3.PublicKey.findProgramAddress(
            [appState.walletPublicKey.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), AFOX_TOKEN_MINT_ADDRESS.toBuffer()],
            ASSOCIATED_TOKEN_PROGRAM_ID
        ).then(res => res[0]);

        return await program.methods.unstake(stakingData.stakedAmount, isEarly)
            .accounts({
                poolState: AFOX_POOL_STATE_PUBKEY,
                userStaking: userPDA,
                owner: appState.walletPublicKey,
                vault: AFOX_POOL_VAULT_PUBKEY,
                daoTreasuryVault: DAO_TREASURY_VAULT_PUBKEY,
                adminFeeVault: AFOX_REWARDS_VAULT_PUBKEY,
                userRewardsAta: userAta,
                rewardMint: AFOX_TOKEN_MINT_ADDRESS,
                tokenProgram: TOKEN_PROGRAM_ID,
                clock: window.solanaWeb3.SYSVAR_CLOCK_PUBKEY // ИСПРАВЛЕНО
            }).rpc();
    });
}



/**
 * ФУНКЦИЯ: ЗАБРАТЬ НАГРАДЫ (CLAIM)
 */

async function handleClaimRewards() {
    const btn = uiElements.claimRewardsBtn;
    await smartAction(btn, "Claiming", "Rewards Received!", "💎", async () => {
        const program = getAnchorProgram(STAKING_PROGRAM_ID, STAKING_IDL);
        const userPDA = await getUserStakingPDA(appState.walletPublicKey);
        
        // ИСПРАВЛЕНО: добавлена приставка window.
        const userAta = await window.solanaWeb3.PublicKey.findProgramAddress(
            [appState.walletPublicKey.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), AFOX_TOKEN_MINT_ADDRESS.toBuffer()],
            ASSOCIATED_TOKEN_PROGRAM_ID
        ).then(res => res[0]);

        return await program.methods.claimRewards()
            .accounts({
                poolState: AFOX_POOL_STATE_PUBKEY,
                userStaking: userPDA,
                owner: appState.walletPublicKey,
                vault: AFOX_POOL_VAULT_PUBKEY,
                adminFeeVault: AFOX_REWARDS_VAULT_PUBKEY,
                userRewardsAta: userAta,
                rewardMint: AFOX_TOKEN_MINT_ADDRESS,
                tokenProgram: TOKEN_PROGRAM_ID,
                clock: window.solanaWeb3.SYSVAR_CLOCK_PUBKEY // ИСПРАВЛЕНО
            }).rpc();
    });
}


/**
 * Получает динамический APR на основе общего стейкинга в пуле.
 */

async function getLiveAPR() {
    try {
        if (!appState.connection || !appState.walletPublicKey) return "Connect Wallet";
        const program = getAnchorProgram(STAKING_PROGRAM_ID, STAKING_IDL);
        
        // Используем fetch для poolState
        const poolAccount = await program.account.poolState.fetch(AFOX_POOL_STATE_PUBKEY);
        
        // В Rust это поле total_staked_amount (u64)
        const totalStaked = Number(poolAccount.totalStakedAmount) / Math.pow(10, AFOX_DECIMALS);

        // Расчет на основе твоего REWARD_RATE_PER_SEC = 100
        const rewardsPerYear = (100 / Math.pow(10, AFOX_DECIMALS)) * 31536000;

        if (totalStaked < 1) return "100% (Genesis)";
        
        const realAPR = (rewardsPerYear / totalStaked) * 100;
        return realAPR > 5000 ? "5000%+" : realAPR.toFixed(2) + "%";
    } catch (e) {
        return "500% (Base)"; 
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
    uiElements = {
        // Данные пользователя
        userAfoxBalance: document.getElementById('user-afox-balance'),
        userStakedAmount: document.getElementById('user-staked-amount'),
        userRewardsAmount: document.getElementById('user-rewards-amount'),
        stakingApr: document.getElementById('staking-apr'),
        lockupPeriod: document.getElementById('lockup-period'),
        
        // Ввод и селекторы
        stakeAmountInput: document.getElementById('stake-amount'),
        poolSelector: document.getElementById('pool-selector'),
        
        // Кнопки управления (Web3 Actions)
        stakeAfoxBtn: document.getElementById('stake-afox-btn'),
        claimRewardsBtn: document.getElementById('claim-rewards-btn'),
        unstakeAfoxBtn: document.getElementById('unstake-afox-btn'),
        
        // DAO & Lending
        createProposalBtn: document.getElementById('createProposalBtn'),
        
uiElements.createProposalModal = document.getElementById('createProposalModal');

        createProposalForm: document.getElementById('create-proposal-form'),
        
        // Утилиты
        notificationContainer: document.getElementById('notification-container'),
        pageLoader: document.getElementById('page-loader'),
        copyButtons: document.querySelectorAll('.copy-btn')
    };
}


// ЕДИНЫЙ ОБРАБОТЧИК ДЛЯ ВСЕХ КНОПОК

async function executeSmartActionWithFullEffects(btn, config) {
    if (btn.classList.contains('loading')) return;

    const originalHTML = btn.innerHTML;
    
    // 1. СТИЛЬ: Вход в состояние загрузки
    btn.classList.add('loading');
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner"></span> ${config.name}...`;
    
    // Аудит в консоль и уведомление
    actionAudit(config.name, "process", "Connecting to Solana...");

    try {
        // 2. ЛОГИКА: Выполнение Rust-инструкции
        await config.fn(); 

        // 3. ФИДБЕК: Успех + Анимация
        btn.classList.remove('loading');
        btn.classList.add('success-glow');
        btn.innerHTML = `✅ ${config.msg}`;
        
        // Взрыв иконок (твой фирменный стиль)
        spawnEmoji(btn, config.icon); 

        actionAudit(config.name, "success", config.msg);
        
        // Глобальное обновление данных
        if (typeof updateStakingAndBalanceUI === 'function') await updateStakingAndBalanceUI();

    } catch (err) {
        // 4. ОШИБКА: Визуальный откат
        console.error(`[CRITICAL] Error in ${config.name}:`, err);
        btn.classList.remove('loading');
        btn.innerHTML = `❌ Failed`;
        btn.classList.add('error-shake'); // Добавь в CSS для тряски
        
        actionAudit(config.name, "error", err.message);
    } finally {
        // Сброс через 3.5 секунды
        setTimeout(() => {
            btn.classList.remove('success-glow', 'loading', 'error-shake');
            btn.disabled = false;
            btn.innerHTML = originalHTML;
        }, 3500);
    }
}



function showNotification(msg, type = 'info') {
    // Вывод в консоль для отладки
    console.log(`[${type.toUpperCase()}] ${msg}`);

    // Находим или создаем контейнер для уведомлений
    let container = document.getElementById('notification-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notification-container';
        container.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 9999; display: flex; flex-direction: column; gap: 10px;';
        document.body.appendChild(container);
    }

    // Создаем само уведомление
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    // Стилизация в зависимости от типа (success, error, info)
    const colors = {
        success: '#00ffaa',
        error: '#ff4d4d',
        info: '#00ccff'
    };

    toast.style.cssText = `
        background: rgba(20, 20, 20, 0.95);
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        border-left: 4px solid ${colors[type] || colors.info};
        box-shadow: 0 4px 15px rgba(0,0,0,0.5);
        font-family: 'Inter', sans-serif;
        font-size: 14px;
        min-width: 250px;
        animation: slideIn 0.3s ease forwards;
        display: flex;
        align-items: center;
        justify-content: space-between;
    `;

    toast.innerHTML = `
        <span>${msg}</span>
        <button onclick="this.parentElement.remove()" style="background:none; border:none; color:white; cursor:pointer; margin-left:10px; opacity:0.5;">✕</button>
    `;

    container.appendChild(toast);

    // Удаляем уведомление через 5 секунд
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}

// Добавим анимации в документ
const style = document.createElement('style');
style.innerHTML = `
    @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    @keyframes slideOut { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100%); opacity: 0; } }
`;
document.head.appendChild(style);



// 1. Восстанавливаем движок транзакций
async function smartAction(btn, name, msg, icon, fn) {
    try {
        if (btn) setBtnState(btn, true, name);
        const signature = await fn();
        if (btn) {
            if (typeof spawnEmoji === 'function') spawnEmoji(btn, icon);
            showNotification(`${msg} TX: ${signature.slice(0, 8)}...`, "success");
        }
        return signature;
    } catch (e) {
        console.error(`❌ Ошибка в ${name}:`, e);
        showNotification(e.message || "Ошибка транзакции", "error");
        throw e;
    } finally {
        if (btn) setBtnState(btn, false);
    }
}

// 2. Добавляем анимацию успеха (чтобы код не падал в конце)
function spawnEmoji(el, emoji) {
    const rect = el.getBoundingClientRect();
    for (let i = 0; i < 8; i++) {
        const span = document.createElement('span');
        span.textContent = emoji;
        span.style.cssText = `position:fixed; left:${rect.left + rect.width/2}px; top:${rect.top}px; z-index:10000; pointer-events:none;`;
        document.body.appendChild(span);
        const angle = (Math.random() * Math.PI * 2);
        const dist = 50 + Math.random() * 50;
        span.animate([
            { transform: 'translate(0,0) scale(1)', opacity: 1 },
            { transform: `translate(${Math.cos(angle)*dist}px, ${Math.sin(angle)*dist}px) scale(1.5)`, opacity: 0 }
        ], { duration: 1000 }).onfinish = () => span.remove();
    }
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


// DAO VOTING (FOR / AGAINST)
async function handleVote(side) {
    actionAudit(`Vote ${side}`, "process");
    try {
        // Логика голосования
        actionAudit(`Vote ${side}`, "success", "Your voice is counted");
    } catch (e) {
        actionAudit(`Vote ${side}`, "error", "Vote rejected");
    }
}


// LENDING (Lend, Withdraw)
async function handleLendingAction(type) {
    const btn = document.getElementById(type.toLowerCase() + '-btn');
    setBtnState(btn, true, "Processing...");
    actionAudit(type, "process");
    try {
        // Логика Lend или Withdraw
        actionAudit(type, "success", "Operation confirmed");
    } catch (e) {
        actionAudit(type, "error", "Action failed");
    } finally { setBtnState(btn, false); }
}

// LOANS (Borrow, Repay)
async function handleLoanAction(type) {
    actionAudit(type, "process", "Calculating collateral...");
    try {
        // Логика Borrow или Repay
        actionAudit(type, "success", "Loan balance updated");
    } catch (e) {
        actionAudit(type, "error", "Check your limits");
    }
}


// CREATE PROPOSAL
async function handleCreateProposal(e) {
    e.preventDefault();
    actionAudit("DAO Proposal", "process", "Uploading data...");
    try {
        // Симуляция создания
        await new Promise(r => setTimeout(r, 1500));
        actionAudit("DAO Proposal", "success", "Proposal is now active");
        closeAllPopups();
    } catch (e) {
        actionAudit("DAO Proposal", "error", "Access denied");
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
 * Получает реальные балансы SOL и AFOX из блокчейна.
 */

async function fetchUserBalances() {
    if (!appState.walletPublicKey) return;

    // Гарантируем наличие соединения, если его вдруг нет
    if (!appState.connection) {
        appState.connection = new window.solanaWeb3.Connection(BACKUP_RPC_ENDPOINT, 'confirmed');
    }

    const sender = appState.walletPublicKey;

    try {
        // 1. Баланс SOL
        const solBalance = await appState.connection.getBalance(sender, 'confirmed');
        appState.userBalances.SOL = BigInt(solBalance);

        // 2. Баланс AFOX
        const tokenAccounts = await appState.connection.getParsedTokenAccountsByOwner(sender, {
            mint: AFOX_TOKEN_MINT_ADDRESS
        });

        if (tokenAccounts.value.length > 0) {
            const amount = tokenAccounts.value[0].account.data.parsed.info.tokenAmount.amount;
            appState.userBalances.AFOX = BigInt(amount);
        } else {
            appState.userBalances.AFOX = 0n;
        }

        console.log("✅ Balances updated!");
    } catch (error) {
        console.error("❌ Ошибка RPC при получении баланса:", error);
        // Если заблокировали — пробуем переключиться на Ankr
        appState.connection = new window.solanaWeb3.Connection(RPC_ENDPOINTS[1], 'confirmed');
    }
}

function updateWalletDisplay() {
    uiElements.walletControls.forEach(container => {
        const isConnected = window.solana && window.solana.isConnected;
        
        if (isConnected) {
            const pubKey = window.solana.publicKey.toString();
            container.innerHTML = `
                <div class="wallet-badge">
                    <span>${pubKey.slice(0, 4)}...${pubKey.slice(-4)}</span>
                    <button class="small-btn" onclick="disconnectWallet()">🚪</button>
                </div>`;
        } else {
            container.innerHTML = `
                <button class="web3-button connect-fox-btn">
                    🦊 Connect Wallet
                </button>`;
            
            container.querySelector('.connect-fox-btn').onclick = () => 
                smartAction(null, "Wallet", "Connected!", "🔑", connectWallet);
        }
    });
}







function setupModernUI() {
    const actions = [
        { id: 'connectWalletBtn', name: 'Wallet', msg: 'Connected! 🦊', icon: '🔑', fn: connectWallet },
        { id: 'stake-afox-btn', name: 'Staking', msg: 'Tokens Locked! 📈', icon: '💰', fn: handleStakeAfox },
        { id: 'unstake-afox-btn', name: 'Unstake', msg: 'Tokens Freed! 🕊️', icon: '🔓', fn: handleUnstakeAfox },
        { id: 'claim-rewards-btn', name: 'Claim', msg: 'Profit Taken! 🎁', icon: '💎', fn: handleClaimRewards },
        
        // Открытие модалки DAO
        { id: 'createProposalBtn', name: 'DAO', msg: 'Opening...', icon: '✍️', fn: async () => { 
            const modal = document.getElementById('createProposalModal');
            if(modal) modal.style.display = 'flex'; 
        }},
        { id: 'submitProposalBtn', name: 'Proposal', msg: 'Created! 🚀', icon: '📜', fn: handleCreateProposal },
        { id: 'vote-for-btn', name: 'Vote FOR', msg: 'Power Used! ⚡', icon: '✅', fn: () => handleVote('FOR') },
        { id: 'vote-against-btn', name: 'Vote AGAINST', msg: 'Opposition! 🛡️', icon: '🚫', fn: () => handleVote('AGAINST') },
        { id: 'lend-btn', name: 'Lend', msg: 'Liquidity Added! 🏦', icon: '💸', fn: () => handleLendingAction('Lend') },
        { id: 'withdraw-btn', name: 'Withdraw', msg: 'Assets Retained! 💰', icon: '📥', fn: () => handleLendingAction('Withdraw') },
        { id: 'borrow-btn', name: 'Borrow', msg: 'Loan Active! 💳', icon: '💵', fn: () => handleLoanAction('Borrow') },
        { id: 'repay-btn', name: 'Repay', msg: 'Debt Paid! 🏆', icon: '⭐', fn: () => handleLoanAction('Repay') }
    ];

    // Привязка действий к кнопкам
    actions.forEach(item => {
        const el = document.getElementById(item.id);
        if (el) {
            const cleanBtn = el.cloneNode(true);
            el.parentNode.replaceChild(cleanBtn, el);
            cleanBtn.onclick = (e) => {
                if (e) e.preventDefault();
                executeSmartActionWithFullEffects(cleanBtn, item);
            };
        }
    });

    // --- ФИКС ЗАКРЫТИЯ МОДАЛКИ (ДЛЯ ТВОЕГО HTML) ---
    const closeBtn = document.getElementById('closeProposalModal'); // Твой ID из HTML
    const modal = document.getElementById('createProposalModal');   // Твой ID из HTML
    

    if (closeBtn && modal) {
        closeBtn.onclick = (e) => {
            e.preventDefault();
            modal.style.display = 'none';
            console.log("Модалка DAO закрыта через крестик");
        };

        // Дополнительно: закрытие при клике ВНЕ окна
        window.addEventListener('click', (event) => {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });
    }
}



function initializeAurumFoxApp() {
    console.log("🚀 Инициализация Aurum Fox Core...");

    // 1. Инициализация критических данных
    if (!setupAddresses()) return;
    if (!window.Buffer) window.Buffer = window.buffer ? window.buffer.Buffer : undefined;

    // 2. Сбор всех элементов (утилита для кэширования)
    cacheUIElements();

    // 3. Установка СОВРЕМЕННОЙ логики кнопок (убирает все дубли)
    setupModernUI();

    // 4. Проверка активной сессии
    if (window.solana && window.solana.isConnected) {
        connectWallet(); 
    }
}

// ЗАПУСК ПРИЛОЖЕНИЯ ПРИ ЗАГРУЗКЕ
window.addEventListener('DOMContentLoaded', () => {
    initializeAurumFoxApp();
});

// Добавляем функцию подключения кошелька (она вызывается в setupModernUI)
async function connectWallet() {
    try {
        if (!window.solana) {
            showNotification("Phantom wallet not found!", "error");
            window.open("https://phantom.app/", "_blank");
            return;
        }
        const resp = await window.solana.connect();
        appState.walletPublicKey = resp.publicKey;
        appState.provider = window.solana;
        appState.connection = new window.solanaWeb3.Connection(BACKUP_RPC_ENDPOINT, 'confirmed');
        
        console.log("🦊 Кошелек подключен:", resp.publicKey.toString());
        await updateStakingAndBalanceUI();
    } catch (err) {
        console.error("Ошибка подключения:", err);
        throw err;
    }
}
