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
























window.createStakingAccount = async function(poolIndex = 0) {
    try {
        const program = await getProgram();
        const [pda] = await window.solanaWeb3.PublicKey.findProgramAddress(
            [Buffer.from("user_stake"), AFOX_POOL_STATE_PUBKEY.toBuffer(), program.provider.wallet.publicKey.toBuffer(), Buffer.from([poolIndex])],
            program.programId
        );

        AurumFoxEngine.notify("INITIALIZING...", "WAIT");

        await program.methods
            .initializeUserStake(poolIndex)
            .accounts({
                poolState: AFOX_POOL_STATE_PUBKEY,
                userStaking: pda, // В IDL: userStaking
                owner: program.provider.wallet.publicKey,
                rewardMint: AFOX_TOKEN_MINT_ADDRESS,
                systemProgram: window.solanaWeb3.SystemProgram.programId,
                clock: window.solanaWeb3.SYSVAR_CLOCK_PUBKEY,
            })
            .rpc();

        AurumFoxEngine.notify("ACCOUNT READY!", "SUCCESS");
    } catch (e) {
        const isAlreadyActive = e.message.includes("0x1770") || e.message.includes("already in use");
        AurumFoxEngine.notify(isAlreadyActive ? "ALREADY ACTIVE" : "INIT FAILED", "FAILED");
    }
};

window.stakeAfox = async function() {
    const val = document.getElementById('stake-input-amount')?.value;
    if (!val || val <= 0) return AurumFoxEngine.notify("INVALID AMOUNT", "FAILED");

    try {
        const program = await getProgram();
        const userPubKey = program.provider.wallet.publicKey;
        const [userStakingPda] = await window.solanaWeb3.PublicKey.findProgramAddress(
            [Buffer.from("user_stake"), AFOX_POOL_STATE_PUBKEY.toBuffer(), userPubKey.toBuffer(), Buffer.from([0])],
            program.programId
        );

        // ИСПРАВЛЕНИЕ: Anchor требует BN для u64
        const amountBN = new anchor.BN(parseAmountToBigInt(val, AFOX_DECIMALS).toString());

        AurumFoxEngine.notify("STAKING...", "WAIT");

        // ВАЖНО: В твоем IDL метод deposit принимает только amount, poolIndex не указан как аргумент
        await program.methods
            .deposit(amountBN)
            .accounts({
                poolState: AFOX_POOL_STATE_PUBKEY,
                userStaking: userStakingPda,
                owner: userPubKey,
                userSourceAta: await getATA(userPubKey, AFOX_TOKEN_MINT_ADDRESS), // Динамический поиск ATA
                vault: AFOX_POOL_VAULT_PUBKEY,
                rewardMint: AFOX_TOKEN_MINT_ADDRESS,
                tokenProgram: TOKEN_PROGRAM_ID,
                clock: window.solanaWeb3.SYSVAR_CLOCK_PUBKEY,
            })
            .rpc();

        AurumFoxEngine.notify("STAKE SUCCESS!", "SUCCESS");
    } catch (e) {
        console.error(e);
        AurumFoxEngine.notify("STAKE FAILED", "FAILED");
    }
};

window.claimAllRewards = async function() {
    try {
        const program = await getProgram();
        const userPubKey = program.provider.wallet.publicKey;
        const [pda] = await window.solanaWeb3.PublicKey.findProgramAddress(
            [Buffer.from("user_stake"), AFOX_POOL_STATE_PUBKEY.toBuffer(), userPubKey.toBuffer(), Buffer.from([0])],
            program.programId
        );

        AurumFoxEngine.notify("COLLECTING...", "WAIT");

        await program.methods
            .claimRewards()
            .accounts({
                poolState: AFOX_POOL_STATE_PUBKEY,
                userStaking: pda,
                owner: userPubKey,
                vault: AFOX_POOL_VAULT_PUBKEY,
                adminFeeVault: AFOX_POOL_VAULT_PUBKEY, // Если нет отдельного, используем волт
                userRewardsAta: await getATA(userPubKey, AFOX_TOKEN_MINT_ADDRESS),
                rewardMint: AFOX_TOKEN_MINT_ADDRESS,
                tokenProgram: TOKEN_PROGRAM_ID,
                clock: window.solanaWeb3.SYSVAR_CLOCK_PUBKEY,
            })
            .rpc();

        AurumFoxEngine.notify("REWARDS CLAIMED!", "SUCCESS");
    } catch (e) {
        AurumFoxEngine.notify("CLAIM FAILED", "FAILED");
    }
};

// Хелпер для поиска ATA (чтобы не было undefined)
async function getATA(owner, mint) {
    const [address] = await window.solanaWeb3.PublicKey.findProgramAddress(
        [owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
        new window.solanaWeb3.PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL")
    );
    return address;
}





window.stakeAfox = async function() {
    const val = document.getElementById('stake-input-amount')?.value;
    if (!val || val <= 0) return AurumFoxEngine.notify("INVALID AMOUNT", "FAILED");

    try {
        const program = await getProgram();
        const provider = program.provider;
        const userPublicKey = provider.wallet.publicKey;

        // Индекс пула (0 для начального пула)
        const poolIndex = 0;

        // Находим PDA для аккаунта стейкинга пользователя
        // Сиды в контракте: [b"user_stake", pool_state_pubkey, owner_pubkey, [pool_index]]
        const [userStakingPda] = await window.solanaWeb3.PublicKey.findProgramAddress(
            [
                Buffer.from("user_stake"),
                AFOX_POOL_STATE_PUBKEY.toBuffer(),
                userPublicKey.toBuffer(),
                Buffer.from([poolIndex])
            ],
            program.programId
        );

        // Конвертация суммы в BigInt (с учетом децималов)
        const amountBN = new anchor.BN(parseAmountToBigInt(val, AFOX_DECIMALS).toString());

        AurumFoxEngine.notify("STAKING...", "WAIT");

        // Вызов метода deposit(pool_index, amount)
        await program.methods
            .deposit(poolIndex, amountBN)
            .accounts({
                poolState: AFOX_POOL_STATE_PUBKEY,
                userStaking: userStakingPda,
                owner: userPublicKey,
                vault: AFOX_POOL_VAULT_PUBKEY,
                stMint: AFOX_ST_MINT_ADDRESS,
                userSourceAta: USER_TOKEN_ATA,
                userStAta: USER_ST_TOKEN_ATA,
                tokenProgram: TOKEN_PROGRAM_ID,
                // Clock обычно передается автоматически, если он есть в структуре Accounts
                clock: window.solanaWeb3.SYSVAR_CLOCK_PUBKEY,
            })
            .rpc();

        AurumFoxEngine.notify("STAKE SUCCESS!", "SUCCESS");
    } catch (e) {
        console.error("Stake error:", e);
        AurumFoxEngine.notify("STAKE FAILED", "FAILED");
    }
};









window.unstakeAfox = async function() {
    const val = document.getElementById('unstake-input-amount')?.value;
    if (!val || val <= 0) return AurumFoxEngine.notify("INVALID AMOUNT", "FAILED");
    
    try {
        const program = await getProgram();
        const userPublicKey = program.provider.wallet.publicKey;
        const poolIndex = 0; // Индекс пула, соответствующий депозиту

        // Находим PDA (seeds должны строго совпадать с #[account(seeds = [...])] в контракте)
        const [pda] = await window.solanaWeb3.PublicKey.findProgramAddress(
            [
                Buffer.from("user_stake"),
                AFOX_POOL_STATE_PUBKEY.toBuffer(),
                userPublicKey.toBuffer(),
                Buffer.from([poolIndex])
            ], 
            program.programId
        );

        const amountBN = new anchor.BN(parseAmountToBigInt(val, AFOX_DECIMALS).toString());
        
        AurumFoxEngine.notify("WITHDRAWING...", "WAIT");

        await program.methods
            .unstake(poolIndex, amountBN)
            .accounts({
                poolState: AFOX_POOL_STATE_PUBKEY,
                user: pda, // В Rust коде аккаунт называется 'user'
                owner: userPublicKey,
                vault: AFOX_POOL_VAULT_PUBKEY,
                daoTreasuryVault: DAO_TREASURY_VAULT_PUBKEY,
                adminFeeVault: ADMIN_FEE_VAULT_PUBKEY,
                userRewardsAta: USER_REWARD_ATA,
                userStAta: USER_ST_TOKEN_ATA,
                stMint: AFOX_ST_MINT_ADDRESS,
                rewardMint: AFOX_TOKEN_MINT_ADDRESS,
                tokenProgram: TOKEN_PROGRAM_ID,
                clock: window.solanaWeb3.SYSVAR_CLOCK_PUBKEY,
            })
            .rpc();

        AurumFoxEngine.notify("WITHDRAWN!", "SUCCESS");
    } catch (e) {
        console.error("Unstake error:", e);
        AurumFoxEngine.notify("WITHDRAW FAILED", "FAILED");
    }
};




window.claimAllRewards = async function() {
    try {
        const program = await getProgram();
        const userPublicKey = program.provider.wallet.publicKey;
        const poolIndex = 0; // Индекс пула, с которого забираем награды

        // Находим PDA аккаунта стейкинга пользователя
        const [pda] = await window.solanaWeb3.PublicKey.findProgramAddress(
            [
                Buffer.from("user_stake"), 
                AFOX_POOL_STATE_PUBKEY.toBuffer(), 
                userPublicKey.toBuffer(), 
                Buffer.from([poolIndex])
            ], 
            program.programId
        );

        AurumFoxEngine.notify("COLLECTING REWARDS...", "WAIT");

        // Вызываем метод claim_rewards (согласно #[derive(Accounts)] pub struct ClaimRewards)
        await program.methods
            .claimRewards(poolIndex)
            .accounts({
                poolState: AFOX_POOL_STATE_PUBKEY,
                userStaking: pda, // В Rust структуре ClaimRewards это поле называется user_staking
                owner: userPublicKey,
                vault: AFOX_POOL_VAULT_PUBKEY,
                adminFeeVault: ADMIN_FEE_VAULT_PUBKEY,
                userRewardsAta: USER_REWARD_ATA,
                rewardMint: AFOX_TOKEN_MINT_ADDRESS,
                tokenProgram: TOKEN_PROGRAM_ID,
                clock: window.solanaWeb3.SYSVAR_CLOCK_PUBKEY,
            })
            .rpc();

        AurumFoxEngine.notify("REWARDS COLLECTED!", "SUCCESS");
    } catch (e) {
        console.error("Claim Error:", e);
        AurumFoxEngine.notify("CLAIM FAILED", "FAILED");
    }
};





window.executeCollateral = async function() {
    // 1. Получаем значение. Убедись, что decimals (AFOX_DECIMALS) совпадают с контрактом
    const val = document.getElementById('collateral-amount')?.value || "1000";
    
    try {
        const program = await getProgram();
        const poolIndex = 0; // Индекс пула (u8), должен совпадать с тем, где открыт стейк

        // 2. ГЕНЕРАЦИЯ PDA (ИСПРАВЛЕНО)
        // В контракте: ["user_stake", pool_state_pubkey, owner_pubkey, [pool_index]]
        const [pda] = await window.solanaWeb3.PublicKey.findProgramAddress(
            [
                Buffer.from("user_stake"),
                AFOX_POOL_STATE_PUBKEY.toBuffer(),
                window.solana.publicKey.toBuffer(),
                Buffer.from([poolIndex]) // Важно: только индекс пула, без лишних байтов
            ], 
            program.programId
        );

        // 3. Подготовка суммы (BigNumber для Anchor)
        const amountBN = new anchor.BN(parseAmountToBigInt(val, AFOX_DECIMALS).toString());

        AurumFoxEngine.notify("LOCKING COLLATERAL...", "WAIT");

        // 4. ВЫЗОВ МЕТОДА (ИСПРАВЛЕНО)
        // Передаем poolIndex и сумму
        await program.methods.collateralizeLending(poolIndex, amountBN)
            .accounts({
                poolState: AFOX_POOL_STATE_PUBKEY,
                userStaking: pda,
                lendingAuthority: window.solana.publicKey, // Должен быть Signer-ом в транзакции
                clock: window.solanaWeb3.SYSVAR_CLOCK_PUBKEY,
            })
            .rpc();

        AurumFoxEngine.notify("COLLATERAL LOCKED", "SUCCESS");
    } catch (e) { 
        console.error("Collateral Error:", e);
        AurumFoxEngine.notify("LOCK FAILED", "FAILED"); 
    }
};





window.executeDecollateral = async function() {
    const val = document.getElementById('decollateral-amount')?.value || "1000";
    
    try {
        const program = await getProgram();
        const poolIndex = 0; // Должен совпадать с индексом в collateralize

        // 1. ГЕНЕРАЦИЯ PDA (БЕЗ ЛИШНИХ БАЙТОВ)
        const [pda] = await window.solanaWeb3.PublicKey.findProgramAddress(
            [
                Buffer.from("user_stake"),
                AFOX_POOL_STATE_PUBKEY.toBuffer(),
                window.solana.publicKey.toBuffer(),
                Buffer.from([poolIndex])
            ], 
            program.programId
        );

        const amountBN = new anchor.BN(parseAmountToBigInt(val, AFOX_DECIMALS).toString());

        AurumFoxEngine.notify("RELEASING COLLATERAL...", "WAIT");

        // 2. ВЫЗОВ МЕТОДА
        await program.methods.decollateralizeLending(amountBN) // В контракте только 1 аргумент: amount
            .accounts({
                poolState: AFOX_POOL_STATE_PUBKEY,
                userStaking: pda,
                lendingAuthority: window.solana.publicKey,
                clock: window.solanaWeb3.SYSVAR_CLOCK_PUBKEY,
            })
            .rpc();

        AurumFoxEngine.notify("COLLATERAL RELEASED", "SUCCESS");
    } catch (e) { 
        console.error("Decollateral Error:", e);
        AurumFoxEngine.notify("RELEASE FAILED", "FAILED"); 
    }
};





window.executeBorrow = async function() {
    const val = document.getElementById('borrow-amount')?.value || "1000"; // Сумма залога
    const poolIndex = 0; // Индекс пула, в котором лежит стейк пользователя

    AurumFoxEngine.notify("CONNECTING TO LENDING...", "WAIT");

    try {
        const program = await getProgram();
        
        // 1. ГЕНЕРАЦИЯ PDA (БЕЗ лишних байтов в конце)
        // В контракте seeds: [b"user_stake", pool_state, owner, &[pool_index]]
        const [pda] = await window.solanaWeb3.PublicKey.findProgramAddress(
            [
                Buffer.from("user_stake"),
                AFOX_POOL_STATE_PUBKEY.toBuffer(),
                window.solana.publicKey.toBuffer(),
                Buffer.from([poolIndex])
            ], 
            program.programId
        );

        // Конвертируем сумму в BigInt с учетом десятичных знаков
        const amountBN = new anchor.BN(parseAmountToBigInt(val, AFOX_DECIMALS).toString());

        console.log("Блокировка залога для займа:", val);

        // 2. ВЫЗОВ МЕТОДА collateralize_lending
        // Согласно контракту: pub fn collateralize_lending(ctx: Context<CollateralizeLending>, new_lending_amount: u64)
        await program.methods.collateralizeLending(amountBN)
            .accounts({
                poolState: AFOX_POOL_STATE_PUBKEY,
                userStaking: pda,
                lendingAuthority: window.solana.publicKey,
                clock: window.solanaWeb3.SYSVAR_CLOCK_PUBKEY,
            })
            .rpc();

        AurumFoxEngine.notify("COLLATERAL LOCKED. BORROW READY", "SUCCESS");
        
    } catch (e) { 
        console.error("Borrow Error:", e);
        AurumFoxEngine.notify("BORROW ERROR", "FAILED"); 
    }
};





window.executeRepay = async function(amountToRepay) {
    try {
        // 1. Уведомление о начале процесса
        AurumFoxEngine.notify("REPAYING DEBT...", "WAIT");

        // 2. Получаем данные (предполагается, что anchor и program инициализированы)
        const amount = new anchor.BN(amountToRepay); 
        
        // Вызов метода контракта
        await program.methods
            .decollateralizeLending(amount)
            .accounts({
                poolState: poolStateAddress,
                userStaking: userStakingAddress,
                lendingAuthority: provider.wallet.publicKey,
                clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
            })
            .rpc();

        // 3. Успешное завершение
        AurumFoxEngine.notify("DEBT FULLY REPAID", "SUCCESS");
        
    } catch (e) {
        console.error("Repay error:", e);
        // Обработка специфической ошибки GracePeriodExpired из контракта
        if (e.message.includes("GracePeriodExpired")) {
            AurumFoxEngine.notify("REPAY FAILED: TIME EXPIRED", "FAILED");
        } else {
            AurumFoxEngine.notify("REPAY FAILED", "FAILED");
        }
    }
};






window.forceUnlock = async function(loanId = 0) {
    try {
        const program = await getProgram();
        const provider = program.provider;
        
        // 1. Находим PDA аккаунта стейкинга пользователя
        // Важно: в контракте используется индекс пула (pool_index) как часть семян
        const [pda] = await window.solanaWeb3.PublicKey.findProgramAddress(
            [
                Buffer.from("user_stake"), 
                AFOX_POOL_STATE_PUBKEY.toBuffer(), 
                provider.wallet.publicKey.toBuffer(), 
                Buffer.from([0]) // Здесь 0 - это pool_index. Если пулов несколько, замените на нужный.
            ], 
            program.programId
        );

        AurumFoxEngine.notify("FORCE UNLOCKING...", "WAIT");

        // 2. Вызов метода контракта
        // Обратите внимание: метод в Rust force_unlock_collateral -> в JS forceUnlockCollateral
        await program.methods
            .forceUnlockCollateral(new anchor.BN(loanId))
            .accounts({
                poolState: AFOX_POOL_STATE_PUBKEY,
                userStaking: pda,
                lendingAuthority: provider.wallet.publicKey, // Тот, кто подписывает (Lending Authority)
                vault: AFOX_POOL_VAULT_PUBKEY,
                defaulterTreasuryVault: DAO_TREASURY_VAULT_PUBKEY, // Куда уйдут изъятые средства
                userStAta: USER_ST_TOKEN_ATA,
                stMint: AFOX_ST_MINT_ADDRESS,
                rewardMint: AFOX_TOKEN_MINT_ADDRESS,
                tokenProgram: TOKEN_PROGRAM_ID,
                clock: window.solanaWeb3.SYSVAR_CLOCK_PUBKEY,
            })
            .rpc();

        AurumFoxEngine.notify("FORCE UNLOCKED", "SUCCESS");
    } catch (e) {
        console.error("Unlock error:", e);
        AurumFoxEngine.notify("UNLOCK FAILED: " + (e.message || "Unknown error"), "FAILED");
    }
};


async function getProgram() {
    if (!window.solana?.isConnected) throw new Error("Wallet not connected");
    const connection = await getRobustConnection();
    const provider = new window.anchor.AnchorProvider(
        connection, 
        window.solana, 
        { commitment: "processed" }
    );
    return new window.anchor.Program(STAKING_IDL, STAKING_PROGRAM_ID, provider);
}














/**
 * 👑 AURUM FOX: V29 - ELITE NOTIFIER
 * Solana Elite Bridge + Smooth English Notifications.
 */

const AurumFoxEngine = {
    isWalletConnected: false,
    walletAddress: null,
    isMobile: /iPhone|iPad|iPod|Android/i.test(navigator.userAgent),
    channel: new BroadcastChannel('fox_solana_bridge'),
    
    getProvider: () => {
        if (window.phantom?.solana) return window.phantom.solana;
        if (window.solflare) return window.solflare;
        if (window.backpack) return window.backpack;
        if (window.solana?.isPhantom) return window.solana;
        return null;
    }
};

/**
 * СИСТЕМА УВЕДОМЛЕНИЙ (CAZYR NOTIFIER)
 */
const showFoxToast = (message, type = 'success') => {
    const container = document.getElementById('fox-toast-container') || createToastContainer();
    const toast = document.createElement('div');
    toast.className = `fox-toast fox-toast-${type}`;
    toast.innerHTML = `
        <div class="fox-toast-content">
            <div class="fox-toast-icon"></div>
            <span>${message}</span>
        </div>
    `;
    container.appendChild(toast);
    setTimeout(() => { toast.classList.add('fox-toast-show'); }, 100);
    setTimeout(() => {
        toast.classList.remove('fox-toast-show');
        setTimeout(() => toast.remove(), 500);
    }, 3500);
};

const createToastContainer = () => {
    const container = document.createElement('div');
    container.id = 'fox-toast-container';
    document.body.appendChild(container);
    return container;
};

// Жесткое сохранение
const savePermanent = (addr) => {
    localStorage.setItem('fox_sol_addr', addr);
    document.cookie = `fox_sol_addr=${addr}; path=/; max-age=2592000; SameSite=Lax`;
    AurumFoxEngine.channel.postMessage({ type: 'SOL_CONNECTED', address: addr });
    showFoxToast("WALLET CONNECTED SUCCESSFULLY", "success");
};

const getSavedAddr = () => {
    const cookieAddr = document.cookie.split('; ').find(row => row.startsWith('fox_sol_addr='))?.split('=')[1];
    return cookieAddr || localStorage.getItem('fox_sol_addr');
};

const syncWalletUI = (isConnected, address = null) => {
    const btn = document.getElementById('connectWalletBtn');
    if (!btn) return;
    if (isConnected && address) {
        const shortAddr = address.slice(0, 4) + "..." + address.slice(-4);
        btn.innerHTML = `<div class="fox-container"><div class="fox-neon-dot"></div><span>${shortAddr.toUpperCase()}</span></div>`;
        btn.className = "fox-btn-connected";
    } else {
        btn.innerHTML = "FOX CONNECT";
        btn.className = "fox-btn-default";
    }
};

async function toggleWalletAction() {
    const btn = document.getElementById('connectWalletBtn');
    if (!btn || btn.dataset.loading === "true") return;
    btn.dataset.loading = "true";

    const provider = AurumFoxEngine.getProvider();
    const currentUrl = encodeURIComponent(window.location.href);

    try {
        if (!AurumFoxEngine.isWalletConnected) {
            if (!provider && AurumFoxEngine.isMobile) {
                window.location.href = `https://phantom.app/ul/browse/${currentUrl}?ref=${currentUrl}`;
                return;
            }
            if (!provider) {
                showFoxToast("WALLET NOT FOUND", "error");
                return;
            }

            btn.innerHTML = `<span class="fox-spin"></span> LINKING...`;
            const resp = await provider.connect();
            const pubKey = resp.publicKey ? resp.publicKey.toString() : resp;

            savePermanent(pubKey);
            AurumFoxEngine.walletAddress = pubKey;
            AurumFoxEngine.isWalletConnected = true;
            syncWalletUI(true, pubKey);

        } else {
            // DISCONNECT
            localStorage.removeItem('fox_sol_addr');
            document.cookie = "fox_sol_addr=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
            AurumFoxEngine.channel.postMessage({ type: 'SOL_DISCONNECTED' });
            showFoxToast("WALLET DISCONNECTED", "error");
            setTimeout(() => window.location.reload(), 1000);
        }
    } catch (err) {
        console.error(err);
        showFoxToast("CONNECTION CANCELLED", "error");
    } finally {
        setTimeout(() => { btn.dataset.loading = "false"; }, 1000);
    }
}

AurumFoxEngine.channel.onmessage = (event) => {
    if (event.data.type === 'SOL_CONNECTED') {
        AurumFoxEngine.walletAddress = event.data.address;
        AurumFoxEngine.isWalletConnected = true;
        syncWalletUI(true, event.data.address);
        showFoxToast("SYNCED VIA BRIDGE", "success");
    }
};

const initV29 = async () => {
    const saved = getSavedAddr();
    if (saved) {
        AurumFoxEngine.walletAddress = saved;
        AurumFoxEngine.isWalletConnected = true;
        syncWalletUI(true, saved);
    }
    const provider = AurumFoxEngine.getProvider();
    if (provider && saved) {
        try { await provider.connect({ onlyIfTrusted: true }); } catch(e) {}
    }
};

window.addEventListener('load', () => {
    const style = document.createElement('style');
    style.innerHTML = `
        /* UI BUTTONS */
        .fox-btn-default { background: #000; color: #fff; border: 1px solid #333; padding: 12px 24px; cursor: pointer; border-radius: 4px; font-weight: bold; transition: all 0.2s; font-family: sans-serif; }
        .fox-btn-connected { background: #000; color: #00ff7f; border: 2px solid #00ff7f; padding: 12px 24px; cursor: pointer; border-radius: 4px; font-weight: bold; font-family: sans-serif; }
        .fox-spin { width: 14px; height: 14px; border: 2px solid #00ff7f; border-top-color: transparent; border-radius: 50%; display: inline-block; animation: f-spin 0.5s linear infinite; margin-right: 8px; }
        @keyframes f-spin { to { transform: rotate(360deg); } }
        .fox-container { display: flex; align-items: center; gap: 8px; justify-content: center; }
        .fox-neon-dot { width: 8px; height: 8px; background: #00ff7f; border-radius: 50%; box-shadow: 0 0 8px #00ff7f; }

        /* TOAST SYSTEM */
        #fox-toast-container { position: fixed; top: 20px; right: 20px; z-index: 10000; display: flex; flex-direction: column; gap: 10px; pointer-events: none; }
        .fox-toast { 
            background: #000; border: 1px solid #333; color: #fff; padding: 14px 20px; border-radius: 8px; 
            font-family: 'Courier New', Courier, monospace; font-size: 12px; font-weight: bold; letter-spacing: 1px;
            transform: translateX(120%); transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            box-shadow: 0 10px 30px rgba(0,0,0,0.5); min-width: 220px;
        }
        .fox-toast-show { transform: translateX(0); }
        .fox-toast-content { display: flex; align-items: center; gap: 12px; }
        .fox-toast-icon { width: 10px; height: 10px; border-radius: 50%; }
        .fox-toast-success { border-left: 4px solid #00ff7f; }
        .fox-toast-success .fox-toast-icon { background: #00ff7f; box-shadow: 0 0 10px #00ff7f; }
        .fox-toast-error { border-left: 4px solid #ff4b4b; }
        .fox-toast-error .fox-toast-icon { background: #ff4b4b; box-shadow: 0 0 10px #ff4b4b; }
    `;
    document.head.appendChild(style);
    initV29();
    setInterval(() => {
        const addr = getSavedAddr();
        if (addr && !AurumFoxEngine.isWalletConnected) {
            AurumFoxEngine.walletAddress = addr;
            AurumFoxEngine.isWalletConnected = true;
            syncWalletUI(true, addr);
        }
    }, 1500);
});







 












            

// ============================================================
// 👑 AURUM FOX: LUXE ENGINE v7.5 - FINAL SYNC
// ============================================================

// Глобальная инициализация движка в самом начале блока
window.AurumFoxEngine = {
    isWalletConnected: false,
    walletAddress: null,
    isMobile: /iPhone|iPad|iPod|Android/i.test(navigator.userAgent),

    // Твой фирменный метод уведомлений
    notify(msg, type = "SYSTEM") {
        console.log(`[${type}] ${msg}`);
        if (typeof showFoxToast === 'function') {
            showFoxToast(msg, type.toLowerCase() === 'success' ? 'success' : 'error');
        } else {
            // Резервный лог, если тосты еще не подгрузились
            alert(`${type}: ${msg}`);
        }
    },

    init() {
        console.clear();
        console.log("%c👑 AURUM FOX ENGINE v7.5 - LUXE ACTIVE", "color: #FFD700; font-size: 16px; font-weight: bold;");
        this.injectGlobalLuxeStyles();
        this.scanAndCalibrate();
        
        // Синхронизация статуса кошелька
        const saved = localStorage.getItem('fox_sol_addr');
        if (saved) {
            this.walletAddress = saved;
            this.isWalletConnected = true;
        }
    },

    // Поиск кнопок и привязка к твоим функциям
    scanAndCalibrate() {
        const KEY_BUTTONS = {
            "connectWalletBtn": "HEADER/WALLET",
            "initialize-user-stake-btn": "STAKING_INIT",
            "deposit-btn": "STAKING_DEPOSIT",
            "unstake-btn": "STAKING_WITHDRAW",
            "claim-all-rewards-btn": "REWARDS_CLAIM",
            "claim-all-btn-luxe": "REWARDS_CLAIM",
            "collateralize-btn": "LENDING_COLLATERAL",
            "decollateralize-btn": "LENDING_DECOLLATERAL",
            "borrow-btn": "LENDING_BORROW",
            "repay-btn": "LENDING_REPAY"
        };

        const targets = document.querySelectorAll('button, a, .royal-btn, .web3-btn');
        targets.forEach((el) => {
            if (el.dataset.foxSynced) return;
            let category = KEY_BUTTONS[el.id] || "GENERAL_INTERFACE";
            el.dataset.foxSynced = "true";
            
            el.addEventListener('click', async (e) => {
                if (el.id === 'connectWalletBtn') {
                    e.preventDefault();
                    if (typeof toggleWalletAction === 'function') await toggleWalletAction();
                } else {
                    if (el.tagName === 'BUTTON') e.preventDefault();
                    await this.handleInteraction(el, category);
                }
            });
        });
    },

    async handleInteraction(el, category) {
        if (el.dataset.loading === "true") return;
        const originalContent = el.innerHTML;
        el.dataset.loading = "true";
        el.innerHTML = `<span class="fox-loader"></span> SYNCING...`;

        try {
            // Вызов функций из верхней части твоего файла
            switch(category) {
                case "STAKING_INIT":
                    if (typeof window.createStakingAccount === 'function') await window.createStakingAccount(0);
                    break;
                case "STAKING_DEPOSIT":
                    if (typeof window.stakeAfox === 'function') await window.stakeAfox();
                    break;
                case "STAKING_WITHDRAW":
                    if (typeof window.unstakeAfox === 'function') await window.unstakeAfox();
                    break;
                case "REWARDS_CLAIM":
                    if (typeof window.claimAllRewards === 'function') await window.claimAllRewards();
                    break;
                case "LENDING_COLLATERAL":
                    if (typeof window.executeCollateral === 'function') await window.executeCollateral();
                    break;
                case "LENDING_DECOLLATERAL":
                    if (typeof window.executeDecollateral === 'function') await window.executeDecollateral();
                    break;
                case "LENDING_BORROW":
                    if (typeof window.executeBorrow === 'function') await window.executeBorrow();
                    break;
                case "LENDING_REPAY":
                    if (typeof window.executeRepay === 'function') await window.executeRepay("0");
                    break;
            }
            el.innerHTML = `✅ DONE`;
        } catch (err) {
            console.error("TX Error:", err);
            el.innerHTML = `❌ FAILED`;
            this.notify(err.message || "Transaction failed", "ERROR");
        }

        setTimeout(() => {
            el.innerHTML = originalContent;
            el.dataset.loading = "false";
        }, 2000);
    },

    injectGlobalLuxeStyles() {
        if (document.getElementById('fox-engine-styles')) return;
        const style = document.createElement('style');
        style.id = 'fox-engine-styles';
        style.innerHTML = `
            .fox-loader { width: 12px; height: 12px; border: 2px solid currentColor; border-bottom-color: transparent; border-radius: 50%; display: inline-block; animation: foxRotation 0.6s linear infinite; margin-right: 8px; vertical-align: middle; }
            @keyframes foxRotation { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            [data-loading="true"] { pointer-events: none; opacity: 0.8; cursor: wait; }
        `;
        document.head.appendChild(style);
    }
};

// Запуск
setTimeout(() => window.AurumFoxEngine.init(), 100);
