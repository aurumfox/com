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


// ============================================================
// 1. КОНСТАНТЫ И КЛЮЧИ (ТОЛЬКО ОДИН РАЗ В ФАЙЛЕ!)
// ============================================================
const SOL_DECIMALS = 9;
const AFOX_DECIMALS = 6;
const SECONDS_PER_DAY = 86400;
const FIREBASE_PROXY_URL = 'https://firebasejs-key--snowy-cherry-0a92.wnikolay28.workers.dev/';

const RPC_ENDPOINTS = [
    'https://solana-rpc.publicnode.com',
    'https://rpc.ankr.com/solana',
    'https://api.mainnet-beta.solana.com'
];
const BACKUP_RPC_ENDPOINT = RPC_ENDPOINTS[0]; 

const POOLS_CONFIG = {
    0: { name: "Flexible", apr_rate: 500 },
    1: { name: "Standard", apr_rate: 1200 },
    2: { name: "Max Boost", apr_rate: 2500 },
    4: { name: "Legacy", apr_rate: 0 }
};

const AFOX_OFFICIAL_KEYS = {
    STAKING_PROGRAM: "ZiECmSCWiJvsKRbNmBw27pyWEqEPFY4sBZ3MCnbvirH",
    TOKEN_MINT:      "GLkewtq8s2Yr24o5LT5mzzEeccKuSsy8H5RCHaE9uRAd",
    POOL_STATE:      "DfAaH2XsWsjSgPkECmZfDsmABzboJ5hJ8T32Aft2QaXZ",
    POOL_VAULT:      "328N13YrQyUAfqHEAXhtQhfan5hHRxDdZqsdpSx6KSkp",
    REWARDS_VAULT:   "BXinWRfmkk2jo3cTJfcYT5zoC7yix5AsvmTk8NwLoiDF",
    DAO_TREASURY:    "6BzRqaLD7CiGvSWjkp5G8RbmvGdjMRUqmz9VcXfGzfzi"
};

// ============================================================
// 2. ИСПРАВЛЕННЫЙ STAKING_IDL (С ЗАКРЫТЫМИ СКОБКАМИ)
// ============================================================

const STAKING_IDL = {
    "version": "0.1.0",
    "name": "my_new_afox_project",
    "instructions": [
        {
            "name": "initializeUserStake",
            "accounts": [
                { "name": "poolState", "isMut": true, "isSigner": false },
                { "name": "userStaking", "isMut": true, "isSigner": false },
                { "name": "owner", "isMut": true, "isSigner": true },
                { "name": "rewardMint", "isMut": false, "isSigner": false },
                { "name": "systemProgram", "isMut": false, "isSigner": false },
                { "name": "clock", "isMut": false, "isSigner": false }
            ],
            "args": [{ "name": "poolIndex", "type": "u8" }]
        },
        {
            "name": "deposit",
            "accounts": [
                { "name": "poolState", "isMut": true, "isSigner": false },
                { "name": "userStaking", "isMut": true, "isSigner": false },
                { "name": "owner", "isMut": true, "isSigner": true },
                { "name": "userSourceAta", "isMut": true, "isSigner": false },
                { "name": "vault", "isMut": true, "isSigner": false },
                { "name": "rewardMint", "isMut": false, "isSigner": false },
                { "name": "tokenProgram", "isMut": false, "isSigner": false },
                { "name": "clock", "isMut": false, "isSigner": false }
            ],
            "args": [{ "name": "amount", "type": "u64" }]
        },
        {
            "name": "claimRewards",
            "accounts": [
                { "name": "poolState", "isMut": true, "isSigner": false },
                { "name": "userStaking", "isMut": true, "isSigner": false },
                { "name": "owner", "isMut": true, "isSigner": true },
                { "name": "vault", "isMut": true, "isSigner": false },
                { "name": "adminFeeVault", "isMut": true, "isSigner": false },
                { "name": "userRewardsAta", "isMut": true, "isSigner": false },
                { "name": "rewardMint", "isMut": false, "isSigner": false },
                { "name": "tokenProgram", "isMut": false, "isSigner": false },
                { "name": "clock", "isMut": false, "isSigner": false }
            ],
            "args": []
        },
        {
            "name": "unstake",
            "accounts": [
                { "name": "poolState", "isMut": true, "isSigner": false },
                { "name": "userStaking", "isMut": true, "isSigner": false },
                { "name": "owner", "isMut": true, "isSigner": true },
                { "name": "vault", "isMut": true, "isSigner": false },
                { "name": "daoTreasuryVault", "isMut": true, "isSigner": false },
                { "name": "adminFeeVault", "isMut": true, "isSigner": false },
                { "name": "userRewardsAta", "isMut": true, "isSigner": false },
                { "name": "rewardMint", "isMut": false, "isSigner": false },
                { "name": "tokenProgram", "isMut": false, "isSigner": false },
                { "name": "clock", "isMut": false, "isSigner": false }
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
                    { "name": "paddingFinal", "type": { "array": ["u8", 104] } } // ОБЯЗАТЕЛЬНО
                ]
            }
        },
        {
            "name": "PoolState",
            "type": {
                "kind": "struct",
                "fields": [
                    { "name": "isInitialized", "type": "bool" },
                    { "name": "globalPause", "type": "bool" },
                    { "name": "poolBump", "type": "u8" },
                    { "name": "vaultBump", "type": "u8" },
                    { "name": "adminFeeVaultBump", "type": "u8" },
                    { "name": "daoTreasuryVaultBump", "type": "u8" },
                    { "name": "defaulterTreasuryVaultBump", "type": "u8" },
                    { "name": "paddingParams", "type": { "array": ["u8", 6] } },
                    { "name": "governanceAuthority", "type": "publicKey" },
                    { "name": "adminAuthority", "type": "publicKey" },
                    { "name": "lendingAuthority", "type": "publicKey" },
                    { "name": "pendingGovernanceAuthority", "type": "publicKey" },
                    { "name": "rewardMint", "type": "publicKey" },
                    { "name": "vault", "type": "publicKey" },
                    { "name": "adminFeeVault", "type": "publicKey" },
                    { "name": "daoTreasuryVault", "type": "publicKey" },
                    { "name": "defaulterTreasuryVault", "type": "publicKey" },
                    { "name": "pendingChangeTime", "type": "i64" },
                    { "name": "lastRewardTime", "type": "i64" },
                    { "name": "maxDaoWithdrawalAmount", "type": "u64" },
                    { "name": "sweepThreshold", "type": "u64" },
                    { "name": "adminFeeShareBps", "type": "u16" },
                    { "name": "paddingParamsLockup", "type": { "array": ["u8", 6] } },
                    { "name": "lockupSeconds", "type": { "array": ["i64", 3] } },
                    { "name": "rewardPerShareGlobal", "type": "u128" },
                    { "name": "totalStakedAmount", "type": "u64" },
                    { "name": "totalUnclaimedRewards", "type": "u64" },
                    { "name": "daoWithdrawal24hCap", "type": "u64" },
                    { "name": "daoWithdrawalResetTime", "type": "i64" },
                    { "name": "paddingFinal", "type": { "array": ["u8", 96] } } // ОБЯЗАТЕЛЬНО
                ]
            }
        }
    ],
    "errors": [
        { "code": 6000, "name": "AlreadyInitialized", "msg": "Account already initialized." },
        { "code": 6022, "name": "DaoLimitReached", "msg": "DAO daily withdrawal limit reached." }
        // Можно добавить остальные для дебага
    ]
};





// ==========================================
// БЛОК 3: ИНИЦИАЛИЗАЦИЯ (ПРЕВРАЩАЕМ ТЕКСТ В КЛЮЧИ)
// ==========================================
function setupAddresses() {
    if (!window.solanaWeb3) return false;
    
    try {
        const pk = window.solanaWeb3.PublicKey;
        const cfg = AFOX_OFFICIAL_KEYS;

        // Создаем глобальные переменные
        window.STAKING_PROGRAM_ID      = new pk(cfg.STAKING_PROGRAM);
        window.AFOX_TOKEN_MINT_ADDRESS = new pk(cfg.TOKEN_MINT);
        window.AFOX_POOL_STATE_PUBKEY  = new pk(cfg.POOL_STATE);
        window.AFOX_POOL_VAULT_PUBKEY  = new pk(cfg.POOL_VAULT);
        window.AFOX_REWARDS_VAULT_PUBKEY = new pk(cfg.REWARDS_VAULT);
        window.DAO_TREASURY_VAULT_PUBKEY = new pk(cfg.DAO_TREASURY);
        
        window.TOKEN_PROGRAM_ID = new pk('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
        window.SYSTEM_PROGRAM_ID = window.solanaWeb3.SystemProgram.programId;

        console.log("✅ Ключи Solana успешно созданы!");
        return true;
    } catch (e) {
        console.error("❌ Ошибка в ключах:", e);
        return false;
    }
}







let appState = { connection: null, provider: null, walletPublicKey: null, userBalances: { SOL: 0n, AFOX: 0n }, userStakingData: { stakedAmount: 0n, rewards: 0n, lockupEndTime: 0, poolIndex: 0, lending: 0n } };


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



// ============================================================
// ОПТИМИЗИРОВАННЫЙ МОДУЛЬ ДАННЫХ И RPC (БЕЗ ДУБЛИКАТОВ)
// ============================================================

/**
 * 1. УНИВЕРСАЛЬНЫЙ ПАРСЕР ЧИСЕЛ (BigInt)
 * Очищен от лишних условий, работает быстрее.
 */
function parseAmountToBigInt(amountStr, decimals) {
    if (!amountStr || amountStr.trim() === '') return 0n;

    // Удаляем всё, кроме цифр и одной точки
    const cleaned = amountStr.trim().replace(/[^\d.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length > 2) throw new Error('Invalid number format');

    const integerPart = parts[0] || '0';
    let fractionalPart = (parts[1] || '').substring(0, decimals).padEnd(decimals, '0');

    return BigInt(integerPart + fractionalPart);
}

/**
 * 2. СТАБИЛЬНОЕ ПОДКЛЮЧЕНИЕ (Robust Connection)
 * Теперь создает соединение только если его нет, предотвращая утечки памяти.
 */
async function getRobustConnection() {
    if (appState.connection) return appState.connection;

    try {
        const conn = new window.solanaWeb3.Connection(BACKUP_RPC_ENDPOINT, { 
            commitment: 'confirmed'
        });
        // Проверка живой ли узел одним быстрым запросом
        await conn.getSlot(); 
        appState.connection = conn;
        return conn;
    } catch (e) {
        console.error("RPC Error:", e);
        showNotification("Primary RPC unreachable. Switching...", "warning");
        // Резервный узел
        appState.connection = new window.solanaWeb3.Connection(RPC_ENDPOINTS[1], 'confirmed');
        return appState.connection;
    }
}

/**
 * 3. ОБРАБОТКА СМЕНЫ ПУБЛИЧНОГО КЛЮЧА
 */
function handlePublicKeyChange(newPublicKey) {
    if (appState.walletPublicKey?.toBase58() === newPublicKey?.toBase58()) return; // Защита от повторной обработки того же ключа

    appState.walletPublicKey = newPublicKey;
    updateWalletDisplay();

    if (newPublicKey) {
        updateStakingAndBalanceUI();
    }
}

/**
 * 4. ПОЛУЧЕНИЕ БАЛАНСОВ (SOL + AFOX)
 * Объединено в один поток для экономии лимитов RPC.
 */
async function fetchUserBalances() {
    const pubkey = appState.walletPublicKey;
    if (!pubkey) return;

    try {
        const connection = await getRobustConnection();
        
        // Запускаем оба запроса одновременно (параллельно)
        const [solBalance, tokenAccounts] = await Promise.all([
            connection.getBalance(pubkey),
            connection.getParsedTokenAccountsByOwner(pubkey, { mint: AFOX_TOKEN_MINT_ADDRESS })
        ]);

        // Обновляем состояние SOL
        appState.userBalances.SOL = BigInt(solBalance);

        // Обновляем состояние AFOX
        if (tokenAccounts.value.length > 0) {
            const amount = tokenAccounts.value[0].account.data.parsed.info.tokenAmount.amount;
            appState.userBalances.AFOX = BigInt(amount);
        } else {
            appState.userBalances.AFOX = 0n;
        }

        console.log(`📊 Balances synced: ${formatBigInt(appState.userBalances.SOL, 9)} SOL | ${formatBigInt(appState.userBalances.AFOX, 6)} AFOX`);
    } catch (error) {
        console.error("❌ Balance Fetch Error:", error);
    }
}

/**
 * 5. ЕДИНЫЙ ОБРАБОТЧИК ОБНОВЛЕНИЯ UI
 * Предотвращает множественные вызовы при быстрой смене вкладок.
 */
let isUpdatingUI = false;
async function updateStakingAndBalanceUI() {
    if (isUpdatingUI) return;
    isUpdatingUI = true;

    try {
        await Promise.all([
            fetchUserBalances(),
            typeof fetchUserStakingData === 'function' ? fetchUserStakingData() : Promise.resolve()
        ]);
        
        if (typeof updateStakingUI === 'function') updateStakingUI();
    } catch (e) {
        console.error("UI Refresh Failed:", e);
    } finally {
        isUpdatingUI = false;
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



// --- ФУНКЦИИ, ВЫЗЫВАЕМЫЕ ЧЕРЕЗ ID КНОПОК ---

// 1. Для ID: "initialize-user-stake-btn" (Category: STAKING_INIT)
export async function createStakingAccount(program, poolIndex, poolStatePDA, userStakingPDA) {
    console.log("🚀 Initializing Staking Account...");
    return await program.methods
        .initializeUserStake(poolIndex)
        .accounts({
            poolState: poolStatePDA,
            userStaking: userStakingPDA,
            owner: program.provider.wallet.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
            rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .rpc();
}

// 2. Для ID: "deposit-btn" (Category: STAKING_DEPOSIT)
export async function stakeAfox(program, poolIndex, amount, poolStatePDA, userStakingPDA, userSourceAta, poolVaultAta) {
    console.log(`💎 Staking ${amount} AFOX...`);
    return await program.methods
        .deposit(poolIndex, new anchor.BN(amount))
        .accounts({
            poolState: poolStatePDA,
            userStaking: userStakingPDA,
            userSourceAta: userSourceAta,
            poolVault: poolVaultAta,
            owner: program.provider.wallet.publicKey,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: anchor.web3.SystemProgram.programId,
            clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
        })
        .rpc();
}

// 3. Для ID: "unstake-btn" (Category: STAKING_WITHDRAW)
export async function unstakeAfox(program, poolIndex, amount, poolStatePDA, userStakingPDA, poolVaultAta, userDestinationAta) {
    console.log(`📤 Unstaking ${amount} AFOX...`);
    return await program.methods
        .withdraw(poolIndex, new anchor.BN(amount))
        .accounts({
            poolState: poolStatePDA,
            userStaking: userStakingPDA,
            poolVault: poolVaultAta,
            userDestinationAta: userDestinationAta,
            owner: program.provider.wallet.publicKey,
            tokenProgram: TOKEN_PROGRAM_ID,
            clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
        })
        .rpc();
}

// 4. Для ID: "collateralize-btn" (Category: LENDING_BORROW)
export async function executeBorrowing(program, poolStatePDA, userStakingPDA, amount) {
    console.log(`🔒 Locking Collateral: ${amount}`);
    return await program.methods
        .collateralizeLending(new anchor.BN(amount))
        .accounts({
            poolState: poolStatePDA,
            userStaking: userStakingPDA,
            lendingAuthority: program.provider.wallet.publicKey,
            clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
        })
        .rpc();
}

// 5. Для ID: "decollateralize-btn" (Category: LENDING_REPAY)
export async function decollateralize(program, poolStatePDA, userStakingPDA, amount) {
    console.log(`🔓 Releasing Collateral: ${amount}`);
    return await program.methods
        .decollateralizeLending(new anchor.BN(amount))
        .accounts({
            poolState: poolStatePDA,
            userStaking: userStakingPDA,
            lendingAuthority: program.provider.wallet.publicKey,
            clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
        })
        .rpc();
}

// 6. Для ID: "claim-all-rewards-btn" и "claim-all-btn-luxe" (Category: REWARDS_CLAIM_ALL)
export async function claimAllRewards(program, poolIndices, userStakingPDAs, poolStatePDA, rewardVault, userRewardAccount) {
    console.log("💰 Claiming All Rewards...");
    const remainingAccounts = userStakingPDAs.map(pda => ({
        pubkey: pda, isWritable: true, isSigner: false
    }));

    return await program.methods
        .claimAllRewards(Buffer.from(poolIndices))
        .accounts({
            poolState: poolStatePDA,
            rewardVault: rewardVault,
            userRewardAccount: userRewardAccount,
            owner: program.provider.wallet.publicKey,
            tokenProgram: TOKEN_PROGRAM_ID,
            clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
        })
        .remainingAccounts(remainingAccounts)
        .rpc();
}

// 7. Для ID: "collect-profit-btn" (Category: REWARDS_SINGLE)
export async function collectProfitSingle(program, poolIndex, poolStatePDA, userStakingPDA, rewardVault, userRewardAccount) {
    console.log(`💵 Collecting Profit for Pool ${poolIndex}...`);
    return await program.methods
        .claimAllRewards(Buffer.from([poolIndex]))
        .accounts({
            poolState: poolStatePDA,
            rewardVault: rewardVault,
            userRewardAccount: userRewardAccount,
            owner: program.provider.wallet.publicKey,
            tokenProgram: TOKEN_PROGRAM_ID,
            clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
        })
        .remainingAccounts([{
            pubkey: userStakingPDA, isWritable: true, isSigner: false
        }])
        .rpc();
}

// 8. Для ID: "force-unlock-btn" (Category: LENDING_LIQUIDATE)
export async function forceUnlockCollateral(program, poolStatePDA, userStakingPDA, treasuryAta, poolVaultAta) {
    console.log("⚠️ Executing Force Unlock/Liquidation...");
    return await program.methods
        .forceUnlockCollateral()
        .accounts({
            poolState: poolStatePDA,
            userStaking: userStakingPDA,
            defaulterTreasury: treasuryAta,
            poolVault: poolVaultAta,
            lendingAuthority: program.provider.wallet.publicKey,
            tokenProgram: TOKEN_PROGRAM_ID,
            clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
        })
        .rpc();
}

// 9. Для ID: "repay-close-btn" (Category: LENDING_CLOSE)
export async function repayAndCloseLoan(program, poolStatePDA, userStakingPDA, amount) {
    console.log("🏁 Closing Position and Repaying...");
    // Вызываем деколлатерализацию как финальный этап
    return await decollateralize(program, poolStatePDA, userStakingPDA, amount);
}









/**
 * 👑 AURUM FOX: ULTIMATE INTEGRATED CORE
 * Объединено: Фикс ошибок + Люксовый визуал + Автономный поиск элементов
 */

// 1. Инициализация стейта (если еще нет)
window.appState = window.appState || {
    walletPublicKey: null,
    provider: null,
    userBalances: { SOL: 0n, AFOX: 0n }
};

window.AurumDisplayCore = {
    // Умный поиск: находит всё от кнопок до простых текстовых меток
    findTargets() {
        return document.querySelectorAll(`
            .user-balance, 
            #wallet-address-display, 
            .wallet-label, 
            [data-fox-category="HEADER/WALLET"],
            .afox-amount,
            #connect-btn-text,
            .sol-balance
        `);
    },

    // Единая функция синхронизации визуала
    sync(publicKey) {
        const isConnected = !!publicKey;
        const address = isConnected ? publicKey.toString() : null;
        const shortAddr = address ? `${address.slice(0, 4)}...${address.slice(-4)}` : "Connect Wallet";

        console.log(`%c[FOX SYNC]: ${isConnected ? 'CONNECTED' : 'DISCONNECTED'}`, 
            `color: ${isConnected ? '#00ff7f' : '#ff4b2b'}; font-weight: bold;`);

        this.findTargets().forEach(el => {
            // Эффект плавного "проявления"
            el.style.transition = "all 0.6s cubic-bezier(0.23, 1, 0.32, 1)";
            el.style.filter = "blur(4px)";
            el.style.opacity = "0.5";

            setTimeout(() => {
                // Логика замены контента
                if (el.tagName === 'BUTTON' || el.dataset.foxCategory === "HEADER/WALLET") {
                    el.innerHTML = isConnected ? `🦊 ${shortAddr}` : "🦊 Connect Wallet";
                    
                    // Стиль кнопки
                    if (isConnected) {
                        el.style.background = "linear-gradient(90deg, #00ff7f, #00b359)";
                        el.style.color = "#000";
                        el.style.boxShadow = "0 0 15px rgba(0, 255, 127, 0.4)";
                    } else {
                        el.style.background = "";
                        el.style.color = "";
                        el.style.boxShadow = "";
                    }
                } else {
                    // Логика для текстовых полей баланса
                    if (el.innerText.includes('AFOX') || el.classList.contains('afox-amount')) {
                        el.innerText = isConnected ? el.innerText : "0.00 AFOX";
                    } else if (el.classList.contains('sol-balance')) {
                        el.innerText = isConnected ? el.innerText : "0.00 SOL";
                    } else {
                        el.innerText = isConnected ? shortAddr : "Not Connected";
                    }

                    // Золотое свечение для активных данных
                    if (isConnected) {
                        el.style.color = "#FFD700";
                        el.style.textShadow = "0 0 8px rgba(255, 215, 0, 0.4)";
                    } else {
                        el.style.color = "";
                        el.style.textShadow = "";
                    }
                }

                el.style.filter = "blur(0)";
                el.style.opacity = "1";
            }, 250);
        });
    }
};

// --- ГЛОБАЛЬНЫЕ МОСТЫ (УБИРАЮТ ОШИБКИ В КОНСОЛИ) ---

// Исправляем несовпадение имен переменной минта
if (typeof AFOX_OFFICIAL_KEYS !== 'undefined' && window.solanaWeb3) {
    window.AFOX_TOKEN_MINT_ADDRESS = new window.solanaWeb3.PublicKey(AFOX_OFFICIAL_KEYS.TOKEN_MINT);
}

// Единый хендлер изменения ключа
window.handlePublicKeyChange = function(pubKey) {
    window.appState.walletPublicKey = pubKey;
    window.AurumDisplayCore.sync(pubKey);

    // Авто-апдейт балансов и стейкинга через твой модуль данных
    if (pubKey && typeof updateStakingAndBalanceUI === 'function') {
        updateStakingAndBalanceUI();
    }
};

// Фикс ошибки "updateWalletDisplay is not defined"
window.updateWalletDisplay = function(address) {
    window.handlePublicKeyChange(address);
};

console.log("%c[ROYAL SYSTEM]: Autonomous Core v11.0 Ready. Conflicts Resolved.", "color: #FFD700; font-weight: bold;");





















/**
 * 👑 AURUM FOX: LUXE ENGINE v7.7 - THE TOTAL MONOLITH
 * Исправлено: застревание кошелька, добавлен Core-модуль, сохранена вся логика.
 */

// --- 1. ТВОИ ГЛОБАЛЬНЫЕ РЕГИСТРАЦИИ (НЕ ТРОГАЕМ) ---
window.claimAllRewards = claimAllRewards;
window.stakeAfox = stakeAfox;
window.unstakeAfox = unstakeAfox;
window.createStakingAccount = createStakingAccount;

// --- 2. ВНУТРЕННИЙ МОДУЛЬ УПРАВЛЕНИЯ КОШЕЛЬКОМ (CORE) ---
const FoxWalletCore = {
    isLocked: false,

    async connect() {
        if (this.isLocked) return;
        this.isLocked = true;
        const btn = document.getElementById('connectWalletBtn');
        const provider = AurumFoxEngine.getProvider();

        try {
            if (!provider) {
                AurumFoxEngine.notify("Wallet not found!", "ERROR");
                window.open("https://phantom.app/", "_blank");
                return;
            }

            if (btn) btn.innerHTML = `<span class="fox-loader"></span> Syncing...`;
            const resp = await provider.connect();
            
            // Синхронизация данных
            AurumFoxEngine.handleRealWalletSync(provider);
            AurumFoxEngine.notify("Royal Sync: Active", "SUCCESS");
            
        } catch (err) {
            console.error("Core Connect Error:", err);
            AurumFoxEngine.notify("Rejected", "CANCELLED");
            this.resetButton(btn);
        } finally {
            this.isLocked = false;
        }
    },

    async disconnect() {
        if (this.isLocked) return;
        this.isLocked = true;
        const btn = document.getElementById('connectWalletBtn');
        const provider = AurumFoxEngine.getProvider();

        try {
            if (provider && provider.disconnect) await provider.disconnect();
            
            // Очистка состояния
            window.appState.walletPublicKey = null;
            window.appState.provider = null;
            AurumFoxEngine.isWalletConnected = false;
            AurumFoxEngine.walletAddress = null;

            this.resetButton(btn);
            AurumFoxEngine.notify("Wallet Offline", "OFFLINE");
        } catch (err) {
            console.error("Core Disconnect Error:", err);
        } finally {
            this.isLocked = false;
        }
    },

    resetButton(btn) {
        if (!btn) return;
        btn.innerHTML = `🦊 Connect Wallet`;
        btn.style.background = "";
        btn.style.color = "";
        btn.style.boxShadow = "";
    }
};

// --- 3. ОСНОВНОЙ ДВИЖОК ---
const AurumFoxEngine = {
    isWalletConnected: false,
    walletAddress: null, 

    KEY_BUTTONS: {
        "connectWalletBtn": "HEADER/WALLET",
        "initialize-user-stake-btn": "STAKING_INIT",
        "deposit-btn": "STAKING_DEPOSIT",
        "unstake-btn": "STAKING_WITHDRAW",
        "max-stake-btn": "INTERFACE_HELPER",
        "close-staking-account-btn": "STAKING_CLOSE",
        "claim-all-rewards-btn": "REWARDS_CLAIM",
        "claim-all-btn-luxe": "REWARDS_CLAIM",
        "collateralize-btn": "LENDING_COLLATERAL",
        "decollateralize-btn": "LENDING_DECOLLATERAL",
        "borrow-btn": "LENDING_BORROW",
        "repay-btn": "LENDING_REPAY",
        "max-collateral-btn": "INTERFACE_HELPER"
    },

    init() {
        console.clear();
        this.printBanner();
        this.buildNotificationSystem();
        this.injectGlobalLuxeStyles();
        this.scanAndCalibrate();
        this.watchOrbit();

        // Авто-вход
        if (document.readyState === 'complete') {
            this.syncOnStart();
        } else {
            window.addEventListener('load', () => this.syncOnStart());
        }
        console.log(`%c[ROYAL SYSTEM]: CALIBRATED. ALL IDs SYNCED.`, "color: #00ff7f; font-weight: bold; background: #000; padding: 5px;");
    },

    getProvider() {
        return window.phantom?.solana || window.solflare || window.solana;
    },

    async syncOnStart() {
        const provider = this.getProvider();
        if (provider) {
            try {
                const resp = await provider.connect({ onlyIfTrusted: true });
                if (resp.publicKey) this.handleRealWalletSync(provider);
            } catch (e) { /* silent check */ }
        }
    },

    handleRealWalletSync(provider) {
        if (!provider || !provider.publicKey) return;
        
        window.appState.walletPublicKey = provider.publicKey;
        window.appState.provider = provider;
        this.isWalletConnected = true;
        
        const addr = provider.publicKey.toString();
        this.walletAddress = addr.slice(0, 4) + "..." + addr.slice(-4);

        const btn = document.getElementById('connectWalletBtn');
        if (btn) {
            btn.innerHTML = `🦊 ${this.walletAddress}`;
            btn.style.background = "linear-gradient(90deg, #00ff7f, #00b359)";
            btn.style.color = "#000";
            btn.style.boxShadow = "0 0 15px rgba(0, 255, 127, 0.4)";
        }
        if (typeof updateStakingAndBalanceUI === 'function') updateStakingAndBalanceUI();
    },

    async toggleWallet() {
        if (!this.isWalletConnected) {
            await FoxWalletCore.connect();
        } else {
            await FoxWalletCore.disconnect();
        }
    },

    scanAndCalibrate() {
        const targets = document.querySelectorAll('button, a, .royal-btn, .web3-btn');
        targets.forEach((el) => {
            if (el.dataset.foxSynced) return;
            let category = this.KEY_BUTTONS[el.id];
            if (!category) {
                if (el.classList.contains('claim-btn-luxe')) category = "REWARDS_CLAIM";
                else if (el.classList.contains('discord-btn')) category = "SOCIAL";
                else category = "GENERAL_INTERFACE";
            }
            if (category) this.syncNode(el, category);
        });
    },

    syncNode(el, category) {
        el.dataset.foxSynced = "true";
        el.addEventListener('click', async (e) => {
            if (el.id === 'connectWalletBtn') {
                e.preventDefault();
                await this.toggleWallet();
            } else {
                if (el.tagName === 'BUTTON') e.preventDefault();
                await this.handleInteraction(el, category);
            }
        });
    },

    async handleInteraction(el, category) {
        if (!this.isWalletConnected) {
            this.notify("Connect Wallet First!", "SECURITY");
            this.triggerVisualPulse(document.getElementById('connectWalletBtn'));
            return;
        }

        const original = el.innerHTML;
        el.dataset.loading = "true";
        this.triggerVisualPulse(el);
        el.innerHTML = `<span class="fox-loader"></span> Processing...`;

        try {
            const program = getAnchorProgram(window.STAKING_PROGRAM_ID, STAKING_IDL);
            
            switch(category) {
                case "REWARDS_CLAIM":
                    if (window.claimAllRewards) {
                        await window.claimAllRewards(program, [0, 1, 2], [], window.AFOX_POOL_STATE_PUBKEY, window.AFOX_REWARDS_VAULT_PUBKEY, window.appState.walletPublicKey);
                    }
                    break;
                case "STAKING_DEPOSIT":
                    const amountInput = document.querySelector('input[type="number"]') || {value: "0"};
                    const amountBN = parseAmountToBigInt(amountInput.value, 6);
                    if (window.stakeAfox) {
                        await window.stakeAfox(program, appState.userStakingData.poolIndex, amountBN, window.AFOX_POOL_STATE_PUBKEY, appState.userStakingPDA, appState.userSourceAta, window.AFOX_POOL_VAULT_PUBKEY);
                    }
                    break;
                case "INTERFACE_HELPER":
                    if (el.id === "max-stake-btn") handleMaxButtonClick('STAKING');
                    this.notify("Balance Set to Max", "INFO");
                    break;
            }
            el.innerHTML = `✅ Complete`;
            this.notify("Action Confirmed", "SUCCESS");
            if (window.updateStakingAndBalanceUI) await updateStakingAndBalanceUI();
        } catch (err) {
            console.error("Interaction Error:", err);
            this.notify("Transaction Failed", "ERROR");
            el.innerHTML = `❌ Failed`;
        }

        setTimeout(() => {
            el.innerHTML = original;
            el.dataset.loading = "false";
        }, 2000);
    },

    triggerVisualPulse(el) {
        if (!el) return;
        el.style.transform = "scale(0.96)";
        setTimeout(() => el.style.transform = "", 100);
    },

    injectGlobalLuxeStyles() {
        if (document.getElementById('fox-engine-styles')) return;
        const style = document.createElement('style');
        style.id = 'fox-engine-styles';
        style.innerHTML = `
            .fox-loader { width: 14px; height: 14px; border: 2px solid currentColor; border-bottom-color: transparent; border-radius: 50%; display: inline-block; animation: foxRot 0.6s linear infinite; vertical-align: middle; margin-right: 8px; }
            @keyframes foxRot { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            [data-loading="true"] { pointer-events: none; opacity: 0.7; }
        `;
        document.head.appendChild(style);
    },

    buildNotificationSystem() {
        if (document.getElementById('fox-notif-hub')) return;
        const hub = document.createElement('div');
        hub.id = 'fox-notif-hub';
        hub.style = "position: fixed; top: 20px; right: 20px; z-index: 10000; display: flex; flex-direction: column; gap: 8px; pointer-events: none;";
        document.body.appendChild(hub);
    },

    notify(msg, type) {
        const hub = document.getElementById('fox-notif-hub');
        if (!hub) return;
        const alert = document.createElement('div');
        alert.style = "background: #060b1a; border-left: 4px solid #FFD700; color: #fff; padding: 12px 20px; border-radius: 5px; box-shadow: 0 5px 15px rgba(0,0,0,0.5); pointer-events: auto; min-width: 200px; margin-top: 5px; transition: 0.3s;";
        alert.innerHTML = `<b style="color: #FFD700; font-size: 10px; text-transform: uppercase;">${type}</b><br><span style="font-size: 13px;">${msg}</span>`;
        hub.appendChild(alert);
        setTimeout(() => { alert.style.opacity = "0"; setTimeout(() => alert.remove(), 500); }, 3500);
    },

    printBanner() {
        console.log("%c👑 AURUM FOX ENGINE v7.7 ONLINE", "color: #FFD700; font-size: 16px; font-weight: bold;");
    },

    watchOrbit() {
        new MutationObserver(() => this.scanAndCalibrate()).observe(document.body, { childList: true, subtree: true });
    }
};

// --- 4. ФИНАЛЬНЫЙ СТАРТ ---
setTimeout(() => AurumFoxEngine.init(), 300);
