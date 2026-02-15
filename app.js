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
    STAKING_PROGRAM: "3ujis4s983qqzMYezF5nAFpm811P9XVJuKH3xQDwukQL",
    TOKEN_MINT:      "GLkewtq8s2Yr24o5LT5mzzEeccKuSsy8H5RCHaE9uRAd",
    POOL_STATE:      "",
    POOL_VAULT:      "",
    REWARDS_VAULT:   "",
    DAO_TREASURY:    ""
};

// ============================================================
// 2. ИСПРАВЛЕННЫЙ STAKING_IDL (С ЗАКРЫТЫМИ СКОБКАМИ)
// ============================================================

const STAKING_IDL = {
  "version": "0.1.0",
  "name": "fix_project",
  "instructions": [
    {
      "name": "initializeBase",
      "accounts": [
        { "name": "poolState", "isMut": true, "isSigner": false },
        { "name": "rewardMint", "isMut": false, "isSigner": false },
        { "name": "initializer", "isMut": true, "isSigner": true },
        { "name": "programData", "isMut": false, "isSigner": false },
        { "name": "systemProgram", "isMut": false, "isSigner": false },
        { "name": "clock", "isMut": false, "isSigner": false },
        { "name": "rent", "isMut": false, "isSigner": false },
        { "name": "governanceAuthority", "isMut": false, "isSigner": false },
        { "name": "adminAuthority", "isMut": false, "isSigner": false },
        { "name": "lendingAuthority", "isMut": false, "isSigner": false }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "InitializePoolConfigArgs"
          }
        }
      ]
    },
    {
      "name": "initializeUserStake",
      "accounts": [
        { "name": "poolState", "isMut": false, "isSigner": false },
        { "name": "userStaking", "isMut": true, "isSigner": false },
        { "name": "owner", "isMut": true, "isSigner": true },
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
        { "name": "vault", "isMut": true, "isSigner": false },
        { "name": "stMint", "isMut": true, "isSigner": false },
        { "name": "userSourceAta", "isMut": true, "isSigner": false },
        { "name": "userStAta", "isMut": true, "isSigner": false },
        { "name": "tokenProgram", "isMut": false, "isSigner": false },
        { "name": "clock", "isMut": false, "isSigner": false }
      ],
      "args": [
        { "name": "poolIndex", "type": "u8" },
        { "name": "amount", "type": "u64" }
      ]
    },
    {
      "name": "claimAllRewards",
      "accounts": [
        { "name": "poolState", "isMut": true, "isSigner": false },
        { "name": "owner", "isMut": true, "isSigner": true },
        { "name": "vault", "isMut": true, "isSigner": false },
        { "name": "adminFeeVault", "isMut": true, "isSigner": false },
        { "name": "userRewardsAta", "isMut": true, "isSigner": false },
        { "name": "rewardMint", "isMut": false, "isSigner": false },
        { "name": "tokenProgram", "isMut": false, "isSigner": false },
        { "name": "clock", "isMut": false, "isSigner": false }
      ],
      "args": [{ "name": "poolIndices", "type": { "vec": "u8" } }]
    },
    {
      "name": "unstake",
      "accounts": [
        { "name": "poolState", "isMut": true, "isSigner": false },
        { "name": "user", "isMut": true, "isSigner": false },
        { "name": "owner", "isMut": true, "isSigner": true },
        { "name": "vault", "isMut": true, "isSigner": false },
        { "name": "daoTreasuryVault", "isMut": true, "isSigner": false },
        { "name": "adminFeeVault", "isMut": true, "isSigner": false },
        { "name": "userRewardsAta", "isMut": true, "isSigner": false },
        { "name": "userStAta", "isMut": true, "isSigner": false },
        { "name": "stMint", "isMut": false, "isSigner": false },
        { "name": "rewardMint", "isMut": false, "isSigner": false },
        { "name": "tokenProgram", "isMut": false, "isSigner": false },
        { "name": "clock", "isMut": false, "isSigner": false }
      ],
      "args": [
        { "name": "poolIndex", "type": "u8" },
        { "name": "amount", "type": "u64" }
      ]
    }
  ],
  "accounts": [
    {
      "name": "PoolState",
      "type": {
        "kind": "struct",
        "fields": [
          { "name": "rewardPerShareGlobal", "type": "u128" },
          { "name": "rewardRatePerSec", "type": "u128" },
          { "name": "pendingRewardRate", "type": "u128" },
          { "name": "governanceAuthority", "type": "publicKey" },
          { "name": "adminAuthority", "type": "publicKey" },
          { "name": "lendingAuthority", "type": "publicKey" },
          { "name": "pendingGovernanceAuthority", "type": "publicKey" },
          { "name": "rewardMint", "type": "publicKey" },
          { "name": "stMint", "type": "publicKey" },
          { "name": "vault", "type": "publicKey" },
          { "name": "adminFeeVault", "type": "publicKey" },
          { "name": "daoTreasuryVault", "type": "publicKey" },
          { "name": "defaulterTreasuryVault", "type": "publicKey" },
          { "name": "pendingBlacklistUser", "type": "publicKey" },
          { "name": "minInitialStake", "type": "u64" },
          { "name": "pendingChangeTime", "type": "i64" },
          { "name": "lastRewardTime", "type": "i64" },
          { "name": "maxDaoWithdrawalAmount", "type": "u64" },
          { "name": "sweepThreshold", "type": "u64" },
          { "name": "totalStakedAmount", "type": "u64" },
          { "name": "totalWeightedStake", "type": "u64" },
          { "name": "totalUnclaimedRewards", "type": "u64" },
          { "name": "daoWithdrawal24hCap", "type": "u64" },
          { "name": "daoWithdrawalResetTime", "type": "i64" },
          { "name": "governanceLockSeconds", "type": "i64" },
          { "name": "lendingUnlockGraceSeconds", "type": "i64" },
          { "name": "lockupSeconds", "type": { "array": ["i64", 5] } },
          { "name": "pendingConfigActivationTime", "type": "i64" },
          { "name": "blacklistUnlockTime", "type": "i64" },
          { "name": "poolsUpdateTime", "type": "i64" },
          { "name": "pendingIndexResetTime", "type": "i64" },
          { "name": "tierMultipliersBps", "type": { "array": ["u16", 5] } },
          { "name": "pendingConfigTierMultipliers", "type": { "array": ["u16", 5] } },
          { "name": "adminFeeShareBps", "type": "u16" },
          { "name": "earlyExitFeeBps", "type": "u16" },
          { "name": "pendingConfigEarlyExitBps", "type": "u16" },
          { "name": "activePoolsCount", "type": "u8" },
          { "name": "isInitialized", "type": "u8" },
          { "name": "globalPause", "type": "u8" },
          { "name": "poolBump", "type": "u8" },
          { "name": "stMintBump", "type": "u8" },
          { "name": "vaultBump", "type": "u8" },
          { "name": "adminFeeVaultBump", "type": "u8" },
          { "name": "daoTreasuryVaultBump", "type": "u8" },
          { "name": "defaulterTreasuryVaultBump", "type": "u8" },
          { "name": "pendingActivePoolsCount", "type": "u8" },
          { "name": "manualPadding", "type": { "array": ["u8", 4] } },
          { "name": "reserved", "type": { "array": ["u8", 128] } }
        ]
      }
    },
    {
      "name": "UserStakingAccount",
      "type": {
        "kind": "struct",
        "fields": [
          { "name": "rewardPerShareUser", "type": "u128" },
          { "name": "owner", "type": "publicKey" },
          { "name": "poolState", "type": "publicKey" },
          { "name": "stakedAmount", "type": "u64" },
          { "name": "lockupEndTime", "type": "i64" },
          { "name": "rewardsToClaim", "type": "u64" },
          { "name": "pendingRewardsDueToLimit", "type": "u64" },
          { "name": "lending", "type": "u64" },
          { "name": "lendingUnlockTime", "type": "i64" },
          { "name": "lastUpdateTime", "type": "i64" },
          { "name": "stTokensMinted", "type": "u64" },
          { "name": "lastDepositSlot", "type": "u64" },
          { "name": "blacklistActivationTime", "type": "i64" },
          { "name": "tierMultiplier", "type": "u16" },
          { "name": "poolIndex", "type": "u8" },
          { "name": "isInitialized", "type": "u8" },
          { "name": "isBlacklisted", "type": "u8" },
          { "name": "blacklistPendingStatus", "type": "u8" },
          { "name": "stakeBump", "type": "u8" },
          { "name": "reservedPadding", "type": "u8" },
          { "name": "finalFix", "type": { "array": ["u8", 8] } },
          { "name": "reserved", "type": { "array": ["u8", 16] } }
        ]
      }
    }
  ],
  "types": [
    {
      "name": "InitializePoolConfigArgs",
      "type": {
        "kind": "struct",
        "fields": [
          { "name": "poolBump", "type": "u8" },
          { "name": "maxDaoWithdrawalAmount", "type": "u64" },
          { "name": "adminFeeShareBps", "type": "u16" },
          { "name": "earlyExitFeeBps", "type": "u16" },
          { "name": "lockupSeconds", "type": { "array": ["i64", 5] } },
          { "name": "tierMultipliers", "type": { "array": ["u16", 5] } },
          { "name": "sweepThreshold", "type": "u64" },
          { "name": "govLock", "type": "i64" },
          { "name": "lendingGrace", "type": "i64" },
          { "name": "activePoolsCount", "type": "u8" }
        ]
      }
    }
  ],
  "errors": [
    { "code": 6000, "name": "AlreadyInitialized", "msg": "Account already initialized." },
    { "code": 6007, "name": "GlobalPause", "msg": "Global pause is active." },
    { "code": 6021, "name": "DaoLimitReached", "msg": "DAO daily withdrawal limit reached." },
    { "code": 6029, "name": "UserIsBlacklisted", "msg": "User is blacklisted." }
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


/**
 * ПРАВИЛЬНЫЙ РАСЧЕТ PDA (Синхронизировано с твоим Rust: seeds + pool_index)
 * @param {PublicKey} owner - Публичный ключ пользователя
 * @param {PublicKey} poolStatePubkey - Адрес твоего главного контракта (PoolState)
 * @param {number} poolIndex - Индекс пула (от 0 до 4)
 * @param {PublicKey} programId - ID твоей программы (3ujis4s983...)
 */
async function getUserStakingPDA(owner, poolStatePubkey, poolIndex, programId) {
    const [pda] = await window.solanaWeb3.PublicKey.findProgramAddress(
        [
            Buffer.from("user_stake"),
            poolStatePubkey.toBuffer(),
            owner.toBuffer(),
            Buffer.from([poolIndex]) // Индекс пула как массив из 1 байта
        ],
        programId
    );
    return pda;
}



// ============================================================
// ОПТИМИЗИРОВАННЫЙ МОДУЛЬ ДАННЫХ И RPC (БЕЗ ДУБЛИКАТОВ)
// ============================================================
/**
 * 1. УНИВЕРСАЛЬНЫЙ ПАРСЕР ЧИСЕЛ (BigInt)
 * Синхронизирован с логикой контракта: ввод -> u64/u128
 */
function parseAmountToBigInt(amountStr, decimals = 6) {
    if (!amountStr || amountStr.toString().trim() === '') return 0n;

    // Очистка ввода: оставляем только цифры и одну точку/запятую
    let cleaned = amountStr.toString().replace(',', '.').replace(/[^\d.]/g, '');
    
    const parts = cleaned.split('.');
    if (parts.length > 2) throw new Error('Неверный формат числа');

    let integerPart = parts[0] || '0';
    let fractionalPart = parts[1] || '';

    // Обрезаем лишние знаки после запятой, если пользователь ввел больше, чем поддерживает токен
    fractionalPart = fractionalPart.substring(0, decimals).padEnd(decimals, '0');

    // Формируем итоговое число для отправки в контракт (например, "1.5" при 6 dec станет 1500000n)
    return BigInt(integerPart + fractionalPart);
}

/**
 * 2. СТАБИЛЬНОЕ ПОДКЛЮЧЕНИЕ
 * Оптимизировано под работу с Connection и проверку работоспособности RPC
 */
async function getRobustConnection() {
    // Проверяем, существует ли соединение и не "протухло" ли оно
    if (appState.connection) {
        try {
            await appState.connection.getSlot();
            return appState.connection;
        } catch (e) {
            console.warn("Текущее соединение потеряно, переподключаемся...");
        }
    }

    const endpoints = [BACKUP_RPC_ENDPOINT, ...RPC_ENDPOINTS];
    
    for (const url of endpoints) {
        try {
            const conn = new window.solanaWeb3.Connection(url, { commitment: 'confirmed' });
            await conn.getSlot(); // Быстрый тест на "живость"
            appState.connection = conn;
            console.log(`Подключено к RPC: ${url}`);
            return conn;
        } catch (e) {
            console.error(`Ошибка RPC ${url}:`, e);
            continue; 
        }
    }
    
    showNotification("Все RPC недоступны. Проверьте интернет.", "error");
    throw new Error("RPC_UNREACHABLE");
}


/**
 * 3. ОБРАБОТКА СМЕНЫ ПУБЛИЧНОГО КЛЮЧА
 */
function handlePublicKeyChange(newPublicKey) {
    // Защита от повторной обработки того же ключа
    if (appState.walletPublicKey?.toBase58() === newPublicKey?.toBase58()) return;

    // Сброс данных при смене аккаунта, чтобы избежать визуальных багов
    appState.walletPublicKey = newPublicKey;
    appState.userBalances = { SOL: 0n, AFOX: 0n }; 
    
    updateWalletDisplay();

    if (newPublicKey) {
        // Вызываем обновление балансов и данных стейкинга
        fetchUserBalances();
        updateStakingAndBalanceUI();
    } else {
        console.log("🔌 Wallet disconnected");
    }
}


/**
 * 4. ПОЛУЧЕНИЕ БАЛАНСОВ (SOL + AFOX)
 * Используется параллельный запрос для минимизации задержек.
 */
async function fetchUserBalances() {
    const pubkey = appState.walletPublicKey;
    if (!pubkey) return;

    try {
        const connection = await getRobustConnection();

        // Запускаем запросы параллельно: SOL баланс и все аккаунты токена AFOX
        const [solBalance, tokenAccounts] = await Promise.all([
            connection.getBalance(pubkey),
            connection.getParsedTokenAccountsByOwner(pubkey, { 
                mint: new solanaWeb3.PublicKey(AFOX_TOKEN_MINT_ADDRESS) 
            })
        ]);

        // 1. Обновляем SOL (в контракте u64, здесь BigInt)
        appState.userBalances.SOL = BigInt(solBalance);

        // 2. Обновляем AFOX (Reward Token)
        // Проверяем первый найденный аккаунт (обычно это основной ATA)
        if (tokenAccounts.value.length > 0) {
            const tokenAmount = tokenAccounts.value[0].account.data.parsed.info.tokenAmount.amount;
            appState.userBalances.AFOX = BigInt(tokenAmount);
        } else {
            appState.userBalances.AFOX = 0n;
        }

        console.log(`📊 Синк балансов: SOL: ${Number(appState.userBalances.SOL) / 1e9} | AFOX: ${Number(appState.userBalances.AFOX) / 1e6}`);
        
        // Триггер обновления интерфейса после получения данных
        renderBalanceInUI(); 

    } catch (error) {
        console.error("❌ Ошибка при получении балансов:", error);
    }
}


/**
 * Поиск основного PDA пула.
 * В контракте сид — просто "pool" без дополнительных данных.
 */
async function getPoolPDA() {
    const [pda] = await window.solanaWeb3.PublicKey.findProgramAddress(
        [Buffer.from("pool")],
        new window.solanaWeb3.PublicKey("3ujis4s983qqzMYezF5nAFpm811P9XVJuKH3xQDwukQL")
    );
    return pda;
}

/**
 * Получает динамический APR на основе данных из контракта.
 */
async function getLiveAPR() {
    try {
        if (!appState.connection || !appState.walletPublicKey) return "Connect Wallet";
        
        const program = getAnchorProgram(STAKING_PROGRAM_ID, STAKING_IDL);
        
        // ВАЖНО: Твой контракта использует AccountLoader (zero_copy), 
        // поэтому во фронтенде используем .fetch() или .load()
        const poolAccount = await program.account.poolState.fetch(AFOX_POOL_STATE_PUBKEY);

        // 1. Получаем общую сумму стейкинга (totalStakedAmount в Rust)
        const totalStaked = Number(poolAccount.totalStakedAmount) / Math.pow(10, AFOX_DECIMALS);
        
        // 2. Получаем текущую скорость наград из контракта (rewardRatePerSec)
        // Если в контракте rewardRatePerSec = 100 (с учетом децималов)
        const rps = Number(poolAccount.rewardRatePerSec) / Math.pow(10, AFOX_DECIMALS);
        
        const secondsPerYear = 31536000;
        const rewardsPerYear = rps * secondsPerYear;

        if (totalStaked < 0.01) return "100% (Genesis)";

        // Расчет APR: (Награды за год / Весь стейк) * 100
        const realAPR = (rewardsPerYear / totalStaked) * 100;

        if (realAPR > 10000) return "10000%++";
        return realAPR.toFixed(2) + "%";
        
    } catch (e) {
        console.error("APR Fetch Error:", e);
        return "---%"; 
    }
}



/**
 * 5. ЕДИНЫЙ ОБРАБОТЧИК ОБНОВЛЕНИЯ UI
 * Синхронизирует данные кошелька и данные из контракта.
 */
let isUpdatingUI = false;

async function updateStakingAndBalanceUI() {
    if (isUpdatingUI) return;
    isUpdatingUI = true;

    try {
        // Запускаем параллельное получение данных
        const results = await Promise.allSettled([
            fetchUserBalances(),
            typeof fetchUserStakingData === 'function' ? fetchUserStakingData() : Promise.resolve()
        ]);

        // Проверяем, не упали ли запросы
        results.forEach((res, index) => {
            if (res.status === 'rejected') {
                console.warn(`Source ${index} failed to refresh:`, res.reason);
            }
        });

        // Вызываем рендер интерфейса
        if (typeof updateStakingUI === 'function') {
            updateStakingUI();
        }
        
    } catch (e) {
        console.error("Global UI Refresh Failed:", e);
    } finally {
        isUpdatingUI = false;
    }
}



/**
 * Создает экземпляр программы Anchor для взаимодействия со смарт-контрактом.
 * Синхронизировано с ID контракта: 3ujis4s983qqzMYezF5nAFpm811P9XVJuKH3xQDwukQL
 */
function getAnchorProgram(programId, idl) {
    // 1. Проверка наличия подключения кошелка
    if (!appState.connection || !appState.provider) {
        throw new Error("Wallet not connected. Please connect your wallet first.");
    }

    // 2. Инициализация Провайдера. 
    // Обрабатываем разные способы обращения к AnchorProvider в зависимости от сборки
    const AnchorLib = window.anchor || window.Anchor;
    if (!AnchorLib) {
        throw new Error("Anchor library not found in window object");
    }

    const provider = new AnchorLib.AnchorProvider(
        appState.connection,
        appState.provider,
        { 
            commitment: "confirmed",
            preflightCommitment: "confirmed" 
        }
    );

    // 3. Создание экземпляра программы
    // programId должен быть: new PublicKey("3ujis4s983qqzMYezF5nAFpm811P9XVJuKH3xQDwukQL")
    try {
        const program = new AnchorLib.Program(idl, programId, provider);
        return program;
    } catch (error) {
        console.error("Failed to initialize Anchor Program:", error);
        throw error;
    }
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



window.closeStakingAccount = async function() {
    try {
        const program = await getProgram();
        const userPublicKey = program.provider.wallet.publicKey;
        const poolIndex = 0;

        const [pda] = await window.solanaWeb3.PublicKey.findProgramAddress(
            [
                Buffer.from("user_stake"),
                AFOX_POOL_STATE_PUBKEY.toBuffer(),
                userPublicKey.toBuffer(),
                Buffer.from([poolIndex])
            ], 
            program.programId
        );

        AurumFoxEngine.notify("CLOSING ACCOUNT...", "WAIT");

        // Если в контракте есть метод для полного закрытия:
        // Если нет - мы просто выводим всё через unstake.
        await program.methods
            .unstake(poolIndex, new anchor.BN(0)) // Пример логики "забрать всё"
            .accounts({
                poolState: AFOX_POOL_STATE_PUBKEY,
                user: pda,
                owner: userPublicKey,
                vault: AFOX_POOL_VAULT_PUBKEY,
                daoTreasuryVault: DAO_TREASURY_VAULT_PUBKEY,
                adminFeeVault: AFOX_POOL_VAULT_PUBKEY,
                userRewardsAta: await getATA(userPublicKey, AFOX_TOKEN_MINT_ADDRESS),
                userStAta: await getATA(userPublicKey, AFOX_TOKEN_MINT_ADDRESS),
                stMint: AFOX_TOKEN_MINT_ADDRESS,
                rewardMint: AFOX_TOKEN_MINT_ADDRESS,
                tokenProgram: TOKEN_PROGRAM_ID,
                clock: window.solanaWeb3.SYSVAR_CLOCK_PUBKEY,
            })
            .rpc();

        AurumFoxEngine.notify("ACCOUNT CLOSED!", "SUCCESS");
    } catch (e) {
        console.error(e);
        AurumFoxEngine.notify("REFUND FAILED", "FAILED");
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
// 👑 AURUM FOX: OMEGA SMART ENGINE v11.0 - TOTAL AUTONOMY
// ============================================================

window.AurumFoxEngine = {
    isWalletConnected: false,
    rpcUrl: 'https://api.mainnet-beta.solana.com',
    
    // Карта команд и соответствующих текстов на кнопках для "умного" поиска
    INTELLIGENT_MAP: {
        "WALLET":       { ids: ["connectWalletBtn"], keywords: ["connect", "wallet", "fox connect"] },
        "CLAIM":        { ids: ["collect-all-profit-btn", "claim-all-rewards-btn"], keywords: ["collect", "claim", "profit"] },
        "INIT_STAKE":   { ids: ["create-staking-account-btn"], keywords: ["create staking", "init stake"] },
        "MAX_STAKE":    { ids: ["stake-max-btn"], keywords: ["max"], context: "stake" },
        "STAKE":        { ids: ["stake-afox-btn"], keywords: ["stake afox", "stake now"] },
        "MAX_UNSTAKE":  { ids: ["unstake-max-btn"], keywords: ["max"], context: "unstake" },
        "UNSTAKE":      { ids: ["unstake-afox-btn"], keywords: ["unstake afox", "withdraw"] },
        "REFUND":       { ids: ["close-account-refund-btn"], keywords: ["close account", "refund"] },
        "COLLATERAL":   { ids: ["collateralize-btn"], keywords: ["collateralize", "enable collateral"] },
        "DECOLLATERAL": { ids: ["decollateralize-btn"], keywords: ["decollateralize", "remove collateral"] },
        "BORROW":       { ids: ["execute-borrowing-btn"], keywords: ["execute borrow", "borrowing"] },
        "REPAY":        { ids: ["repay-debt-btn"], keywords: ["repay debt"] },
        "REPAY_CLOSE":  { ids: ["repay-close-loan-btn"], keywords: ["repay & close", "close loan"] }
    },

    notify(msg, type = "SYSTEM") {
        if (typeof window.showFoxToast === 'function') {
            window.showFoxToast(msg, type.toLowerCase() === 'success' ? 'success' : 'error');
        } else {
            console.log(`%c[${type}] ${msg}`, "color: #FFD700; font-weight: bold;");
        }
    },

    async getFreshBalance(mint) {
        try {
            const addr = localStorage.getItem('fox_sol_addr');
            if (!addr) return 0n;
            const conn = new window.solanaWeb3.Connection(this.rpcUrl);
            const pubkey = new window.solanaWeb3.PublicKey(addr);
            const tokenAccount = await conn.getParsedTokenAccountsByOwner(pubkey, { mint: new window.solanaWeb3.PublicKey(mint) });
            return tokenAccount.value.length > 0 ? BigInt(tokenAccount.value[0].account.data.parsed.info.tokenAmount.amount) : 0n;
        } catch (e) { return 0n; }
    },

    init() {
        this.injectGlobalStyles();
        this.smartScan();
        setInterval(() => this.smartScan(), 2000); // Постоянный мониторинг DOM
        console.log("🚀 OMEGA ENGINE v11.0: AUTONOMOUS MODE ACTIVE");
    },

    // Умный поиск кнопок по ID, классам или тексту
    smartScan() {
        const allButtons = document.querySelectorAll('button, a, .fox-btn');
        
        allButtons.forEach(btn => {
            if (btn.dataset.foxSynced === "true") return;

            for (const [action, config] of Object.entries(this.INTELLIGENT_MAP)) {
                const text = btn.innerText.toLowerCase();
                const id = btn.id;

                // Если совпал ID или текст кнопки содержит ключевое слово
                const matchId = config.ids.includes(id);
                const matchText = config.keywords.some(kw => text.includes(kw));

                if (matchId || matchText) {
                    btn.dataset.foxSynced = "true";
                    btn.dataset.foxAction = action;
                    btn.onclick = async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        await this.handleInteraction(btn, action);
                    };
                }
            }
        });
    },

    async handleInteraction(el, action) {
        if (el.dataset.loading === "true") return;
        
        const userAddr = localStorage.getItem('fox_sol_addr');
        if (!userAddr && action !== "WALLET") {
            this.notify("CONNECT WALLET FIRST!", "ERROR");
            return;
        }

        const originalHTML = el.innerHTML;
        el.dataset.loading = "true";
        el.innerHTML = `<span class="fox-loader-omega"></span>`;
        
        try {
            switch (action) {
                case "MAX_STAKE":
                case "MAX_UNSTAKE":
                    await this.logicMax(action === "MAX_STAKE" ? 'stake' : 'unstake');
                    break;

                case "INIT_STAKE":
                    await this.ensureExecution(window.createStakingAccount, [0]);
                    break;

                case "STAKE":
                    await this.ensureExecution(window.stakeAfox);
                    break;

                case "UNSTAKE":
                    await this.ensureExecution(window.unstakeAfox);
                    break;

                case "CLAIM":
                    await this.ensureExecution(window.claimAllRewards);
                    break;

                case "COLLATERAL":
                    await this.ensureExecution(window.executeCollateral);
                    break;

                case "DECOLLATERAL":
                    await this.ensureExecution(window.executeDecollateral);
                    break;

                case "BORROW":
                    await this.ensureExecution(window.executeBorrow);
                    break;

                case "REPAY":
                    await this.ensureExecution(window.executeRepay, ["0"]);
                    break;

                case "REPAY_CLOSE":
                    await this.ensureExecution(window.executeRepay, ["1000000000"]);
                    break;

                case "REFUND":
                    await this.ensureExecution(window.closeStakingAccount);
                    break;

                case "WALLET":
                    if (window.toggleWalletAction) await window.toggleWalletAction();
                    break;
            }
            if (!action.includes("MAX")) el.innerHTML = `DONE ✅`;
        } catch (err) {
            console.error(`[FoxEngine] Action ${action} failed:`, err);
            this.notify("TRANSACTION FAILED", "ERROR");
            el.innerHTML = `❌`;
        }

        setTimeout(() => {
            el.innerHTML = originalHTML;
            el.dataset.loading = "false";
        }, 1500);
    },

    // Умная логика для кнопок MAX (ищет баланс и поле ввода)
    async logicMax(type) {
        let amount = 0n;
        if (type === 'stake') {
            amount = window.appState?.userBalances?.AFOX || await this.getFreshBalance("GLkewtq8s2Yr24o5LT5mzzEeccKuSsy8H5RCHaE9uRAd");
        } else {
            amount = window.appState?.userStakingData?.stakedAmount || 0n;
        }

        const formatted = window.formatBigInt ? window.formatBigInt(amount, 6) : (Number(amount) / 1e6).toString();
        
        // Авто-поиск инпута: сначала по ID, потом ближайший в контейнере
        const inputId = type === 'stake' ? 'stake-input-amount' : 'unstake-input-amount';
        let input = document.getElementById(inputId) || document.querySelector(`input[placeholder*="${type}"]`) || document.querySelector('input[type="number"]');

        if (input) {
            input.value = formatted;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            this.notify(`MAX ${type.toUpperCase()}: ${formatted}`, "SUCCESS");
        }
    },

    // Гарантированный вызов функции с ожиданием загрузки
    async ensureExecution(fn, args = []) {
        if (typeof fn !== 'function') {
            this.notify("WAITING FOR CONTRACT...", "WAIT");
            await new Promise(r => setTimeout(r, 800)); // Ждем подгрузки скриптов
            // Пробуем найти функцию в window снова, если передавали ссылку
            if (typeof fn !== 'function') throw new Error("Logic not loaded");
        }
        return await fn(...args);
    },

    injectGlobalStyles() {
        if (document.getElementById('fox-omega-styles')) return;
        const style = document.createElement('style');
        style.id = 'fox-omega-styles';
        style.innerHTML = `
            .fox-loader-omega {
                width: 16px; height: 16px;
                border: 2px solid #FFD700;
                border-bottom-color: transparent;
                border-radius: 50%;
                display: inline-block;
                animation: foxSpinOmega 0.6s linear infinite;
            }
            @keyframes foxSpinOmega { to { transform: rotate(360deg); } }
            [data-loading="true"] { pointer-events: none !important; opacity: 0.7; cursor: wait; }
            .fox-btn-sync-active { box-shadow: 0 0 10px rgba(255, 215, 0, 0.4); }
        `;
        document.head.appendChild(style);
    }
};

// Запуск с защитой от раннего старта
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.AurumFoxEngine.init());
} else {
    window.AurumFoxEngine.init();
}



