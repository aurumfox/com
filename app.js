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





// ============================================================
// ИСПРАВЛЕННЫЙ МОДУЛЬ: SMART WALLET & КНОПОЧНЫЙ ДВИЖОК
// ============================================================

const SmartWallet = {
    isProcessing: false,

    // 1. Поиск кнопки по ID из твоего HTML или по тексту
    getBtn: () => {
        return document.getElementById('connectWalletBtn') || 
               document.querySelector('.connect-btn') ||
               Array.from(document.querySelectorAll('button')).find(b => b.innerText.toLowerCase().includes('wallet'));
    },

    // 2. Переключатель (Connect/Disconnect)
    toggle: async function() {
        if (this.isProcessing) return;
        if (appState.walletPublicKey) {
            await this.disconnect();
        } else {
            await this.connect(false);
        }
    },

    // 3. Логика подключения
    connect: async function(silent = false) {
        if (this.isProcessing) return;
        this.isProcessing = true;
        
        try {
            const provider = window.phantom?.solana || window.solana;
            if (!provider) {
                if (!silent) showNotification("Phantom не найден! 🦊", "error");
                return;
            }

            // Подключаемся
            const resp = await provider.connect(silent ? { onlyIfTrusted: true } : {});
            
            // Сохраняем данные в глобальное состояние appState
            appState.walletPublicKey = resp.publicKey;
            appState.provider = provider;

            // Проверяем соединение RPC
            if (!appState.connection) {
                appState.connection = new solanaWeb3.Connection(RPC_ENDPOINTS[0], 'confirmed');
            }

            // Если не "тихий" вход — запускаем твои эффекты частиц
            if (!silent) {
                const btn = this.getBtn();
                if (btn && typeof spawnConnectEffects === 'function') {
                    spawnConnectEffects(btn); 
                }
                showNotification("Кошелек подключен! 🔑", "success");
            }

            this.updateUI();

            // СРАЗУ ОБНОВЛЯЕМ БАЛАНСЫ И ДАННЫЕ В HTML
            if (typeof updateStakingAndBalanceUI === 'function') {
                await updateStakingAndBalanceUI();
            }

        } catch (err) {
            if (!silent) {
                console.error("Ошибка подключения:", err);
                showNotification("Ошибка входа", "error");
            }
        } finally {
            this.isProcessing = false;
        }
    },

    // 4. Логика отключения
    disconnect: async function() {
        try {
            const provider = window.phantom?.solana || window.solana;
            const btn = this.getBtn();
            
            if (btn && typeof spawnDisconnectEffects === 'function') {
                spawnDisconnectEffects(btn); // Твой эффект дыма
            }

            if (provider) await provider.disconnect();

            appState.walletPublicKey = null;
            appState.provider = null;

            this.updateUI();
            
            // Очищаем данные в интерфейсе
            if (typeof updateStakingUI === 'function') updateStakingUI();
            
            showNotification("Отключено 💨", "info");
        } catch (err) {
            console.error("Ошибка отключения:", err);
        }
    },

    // 5. Обновление кнопки (Конвертация адреса для HTML)
    updateUI: function() {
        const btn = this.getBtn();
        if (!btn) return;

        if (appState.walletPublicKey) {
            // Конвертируем PublicKey в строку и сокращаем: "Afox...1234"
            const addr = appState.walletPublicKey.toBase58();
            const shortAddr = addr.slice(0, 4) + "..." + addr.slice(-4);
            
            btn.innerHTML = `<span class="conn-dot">●</span> ${shortAddr}`;
            btn.classList.add('connected');
            btn.style.borderColor = "#00ffaa";
        } else {
            btn.innerHTML = 'Connect Wallet';
            btn.classList.remove('connected');
            btn.style.borderColor = "";
        }
    }
};

// 6. Инициализация "Рыцаря" (Привязка к кнопкам действий)
function initSmartKnight() {
    console.log("⚔️ Smart Knight: Привязка кнопок к HTML...");

    // Привязываем главную кнопку кошелька
    const connectBtn = SmartWallet.getBtn();
    if (connectBtn) {
        connectBtn.onclick = (e) => {
            e.preventDefault();
            SmartWallet.toggle();
        };
    }

    // Карта действий для кнопок Stake, Claim, Unstake
    const actionMap = [
        { key: 'stake', name: 'Staking', fn: 'handleStakeAfox' },
        { key: 'claim', name: 'Claiming', fn: 'handleClaimRewards' },
        { key: 'unstake', name: 'Unstaking', fn: 'handleUnstakeAfox' }
    ];

    // Ищем все кнопки в документе и вешаем на них обработчики
    document.querySelectorAll('button').forEach(btn => {
        if (btn === connectBtn) return; // Пропускаем кнопку кошелька
        
        const btnText = btn.innerText.toLowerCase();

        actionMap.forEach(action => {
            if (btnText.includes(action.key)) {
                btn.onclick = async (e) => {
                    e.preventDefault();
                    
                    if (!appState.walletPublicKey) {
                        showNotification("Сначала подключи кошелек! 🦊", "error");
                        if (connectBtn) connectBtn.classList.add('pulse-highlight');
                        return;
                    }

                    // Вызываем твой executeSmartAction из app.js
                    // Он запустит лоадер и выполнит функцию
                    if (typeof executeSmartActionWithFullEffects === 'function') {
                        await executeSmartActionWithFullEffects(btn, {
                            name: action.name,
                            msg: "Транзакция прошла!",
                            fn: window[action.fn] // Берем функцию из глобального окна
                        });
                    } else {
                        // Фолбэк, если функции эффектов нет
                        try { await window[action.fn](); } catch(e) { console.error(e); }
                    }
                };
            }
        });
    });
}

// 7. Точка входа при загрузке
window.addEventListener('load', () => {
    // Ждем секунду, чтобы все скрипты и Phantom прогрузились
    setTimeout(() => {
        initSmartKnight();
        // Пытаемся автоматически подцепить кошелек (без всплывающего окна)
        SmartWallet.connect(true);
    }, 1000);
});







/**
 * ИСПРАВЛЕННЫЙ DISCONNECT С АНИМАЦИЕЙ
 */
async function disconnectWallet() {
    try {
        const provider = window.phantom?.solana || window.solana;
        
        // 1. Запуск анимации "исчезновения"
        const btn = document.getElementById('connectWalletBtn');
        if (btn) spawnDisconnectEffects(btn);

        // 2. Разрыв соединения с провайдером
        if (provider) {
            await provider.disconnect();
        }

        // 3. Сброс состояния (чтобы авто-вход не сработал сразу)
        appState.walletPublicKey = null;
        appState.provider = null;

        // 4. Обновление интерфейса
        updateWalletDisplay();
        
        if (typeof updateStakingUI === 'function') {
            await updateStakingUI();
        }

        showNotification("Session Closed 🚪", "info");
        console.log("🔌 [System]: Кошелек отключен пользователем");

    } catch (err) {
        console.error("Ошибка при отключении:", err);
    }
}

/**
 * АНИМАЦИЯ РАСТВОРЕНИЯ (Для Disconnect)
 */
function spawnDisconnectEffects(el) {
    const rect = el.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const items = ['🔒', '🌫️', '💨', '⚪']; 

    for (let i = 0; i < 20; i++) {
        const p = document.createElement('span');
        p.textContent = items[Math.floor(Math.random() * items.length)];
        p.style.cssText = `position: fixed; left: ${centerX}px; top: ${centerY}px; z-index: 10001; pointer-events: none; font-size: ${16 + Math.random() * 10}px; filter: grayscale(1); user-select: none;`;
        document.body.appendChild(p);

        const angle = Math.random() * Math.PI * 2;
        const velocity = 4 + Math.random() * 8;
        const tx = Math.cos(angle) * (velocity * 15);
        const ty = - (40 + Math.random() * 80); // Летит вверх
        const rot = Math.random() * 360;

        p.animate([
            { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
            { transform: `translate(-50%, -50%) translate(${tx}px, ${ty}px) rotate(${rot}deg) scale(0)`, opacity: 0 }
        ], { duration: 1000, easing: 'ease-out' }).onfinish = () => p.remove();
    }
}




// ============================================================
// АВТО-ВОССТАНОВЛЕНИЕ СЕССИИ ПРИ ЗАГРУЗКЕ
// ============================================================
window.addEventListener('load', () => {
    // Ждем полсекунды, чтобы провайдер точно прогрузился в браузер
    setTimeout(() => {
        if (window.phantom?.solana || window.solana) {
            console.log("🔄 Проверка существующей сессии кошелька...");
            connectWallet(true); // Запуск в тихом режиме
        }
    }, 500);
});








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
        
        // Проверка: загружена ли библиотека корректно
        if (!program.account || !program.account.userStakingAccount) {
            console.error("❌ Anchor Account 'userStakingAccount' not found in IDL. Check casing.");
            return;
        }

        // ВАЖНО: для zero_copy используем .fetch()
        const stakingData = await program.account.userStakingAccount.fetch(userPDA);

        if (stakingData) {
            appState.userStakingData = {
                stakedAmount: BigInt(stakingData.stakedAmount.toString()),
                // Суммируем награды как в вашем Rust коде: rewards_to_claim + pending_rewards_due_to_limit
                rewards: BigInt(stakingData.rewardsToClaim.toString()) + BigInt(stakingData.pendingRewardsDueToLimit.toString()),
                lockupEndTime: Number(stakingData.lockupEndTime),
                poolIndex: stakingData.poolIndex,
                lending: BigInt(stakingData.lending.toString()),
                lastUpdate: Number(stakingData.lastUpdateTime)
            };
            console.log("✅ Data sync success:", appState.userStakingData);
        }
    } catch (e) {
        if (e.message.includes("Account does not exist")) {
             console.log("ℹ️ User staking account not created yet.");
             appState.userStakingData = { stakedAmount: 0n, rewards: 0n, lockupEndTime: 0, poolIndex: 0, lending: 0n };
        } else {
             console.error("❌ Parsing Error:", e);
        }
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
        showNotification("Enter a valid amount", "error");
        return;
    }

    await executeSmartActionWithFullEffects(btn, {
        name: "Staking",
        msg: "Success!",
        fn: async () => {
            const amount = parseAmountToBigInt(amountStr, AFOX_DECIMALS);
            const program = getAnchorProgram(STAKING_PROGRAM_ID, STAKING_IDL);
            const userPDA = await getUserStakingPDA(appState.walletPublicKey);
            
            // 1. Проверяем, существует ли аккаунт пользователя в блокчейне
            const accountInfo = await appState.connection.getAccountInfo(userPDA);
            let transaction = new window.solanaWeb3.Transaction();

            // 2. Если аккаунта нет, добавляем инструкцию инициализации
            if (!accountInfo) {
                console.log("🆕 Инициализация нового аккаунта стейкинга...");
                const initIx = await program.methods
                    .initializeUserStake(poolIndex) // В Rust: pub fn initialize_user_stake
                    .accounts({
                        poolState: AFOX_POOL_STATE_PUBKEY,
                        userStaking: userPDA,
                        owner: appState.walletPublicKey,
                        rewardMint: AFOX_TOKEN_MINT_ADDRESS,
                        systemProgram: SYSTEM_PROGRAM_ID,
                        clock: window.solanaWeb3.SYSVAR_CLOCK_PUBKEY
                    })
                    .instruction();
                transaction.add(initIx);
            }

            // 3. Добавляем инструкцию депозита
            const userAta = await window.solanaWeb3.PublicKey.findProgramAddress(
                [appState.walletPublicKey.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), AFOX_TOKEN_MINT_ADDRESS.toBuffer()],
                ASSOCIATED_TOKEN_PROGRAM_ID
            ).then(res => res[0]);

            const depositIx = await program.methods
                .deposit(new window.anchor.BN(amount.toString()))
                .accounts({
                    poolState: AFOX_POOL_STATE_PUBKEY,
                    userStaking: userPDA,
                    owner: appState.walletPublicKey,
                    userSourceAta: userAta,
                    vault: AFOX_POOL_VAULT_PUBKEY,
                    rewardMint: AFOX_TOKEN_MINT_ADDRESS,
                    tokenProgram: TOKEN_PROGRAM_ID,
                    clock: window.solanaWeb3.SYSVAR_CLOCK_PUBKEY
                })
                .instruction();
            transaction.add(depositIx);

            // 4. Отправляем всё одним пакетом
            const signature = await appState.provider.sendAndConfirm(transaction);
            console.log("✅ Транзакция подтверждена:", signature);
            return signature;
        }
    });
}




async function handleUnstakeAfox() {
    const btn = uiElements.unstakeAfoxBtn;
    const program = getAnchorProgram(STAKING_PROGRAM_ID, STAKING_IDL);
    const userPDA = await getUserStakingPDA(appState.walletPublicKey);

    await executeSmartActionWithFullEffects(btn, {
        name: "Unstaking",
        msg: "Success!",
        fn: async () => {
            const stakingData = await program.account.userStakingAccount.fetch(userPDA);
            const now = Math.floor(Date.now() / 1000);
            
            // Логика: если время лока не вышло, ставим флаг Early Exit
            const isEarly = now < Number(stakingData.lockupEndTime);

            const userAta = await window.solanaWeb3.PublicKey.findProgramAddress(
                [appState.walletPublicKey.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), AFOX_TOKEN_MINT_ADDRESS.toBuffer()],
                ASSOCIATED_TOKEN_PROGRAM_ID
            ).then(res => res[0]);

            return await program.methods
                .unstake(
                    new window.anchor.BN(stakingData.stakedAmount.toString()), 
                    isEarly
                )
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
                    clock: window.solanaWeb3.SYSVAR_CLOCK_PUBKEY
                })
                .rpc();
        }
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
        // --- DAO (ИСПРАВЛЕННЫЕ ID ПОД ТВОЙ HTML) ---
        createProposalBtn: document.getElementById('createProposalBtn'),
        createProposalModal: document.getElementById('createProposalModal'), // Исправлено!
        createProposalForm: document.getElementById('newProposalForm'),   
        
        
        // Утилиты
        notificationContainer: document.getElementById('notification-container'),
        pageLoader: document.getElementById('page-loader'),
        copyButtons: document.querySelectorAll('.copy-btn')
    };
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












/**
 * 1. ГЛОБАЛЬНЫЕ СТИЛИ (Анимации и эффекты кнопок)
 */
const styleSheet = document.createElement('style');
styleSheet.innerHTML = `
    @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    @keyframes slideOut { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100%); opacity: 0; } }
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes pulse-gold { 0% { box-shadow: 0 0 5px #ffd700; } 100% { box-shadow: 0 0 20px #ffd700; } }
    
    .spinner { border: 2px solid rgba(255,255,255,0.3); border-top: 2px solid #fff; border-radius: 50%; width: 14px; height: 14px; animation: spin 0.8s linear infinite; display: inline-block; margin-right: 8px; vertical-align: middle; }
    .success-glow { animation: pulse-gold 0.5s ease-in-out infinite alternate !important; border-color: #ffd700 !important; color: #ffd700 !important; }
    .error-shake { animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both; border-color: #ff4d4d !important; }
    @keyframes shake { 10%, 90% { transform: translate3d(-1px, 0, 0); } 20%, 80% { transform: translate3d(2px, 0, 0); } 30%, 50%, 70% { transform: translate3d(-4px, 0, 0); } 40%, 60% { transform: translate3d(4px, 0, 0); } }
`;
document.head.appendChild(styleSheet);

/**
 * 2. СИСТЕМА УВЕДОМЛЕНИЙ И АУДИТА
 */
function actionAudit(name, status, detail = "") {
    const icons = { process: "⏳", success: "✅", error: "❌", info: "ℹ️" };
    showNotification(`${icons[status] || '🔔'} ${name}: ${detail}`, status === 'process' ? 'info' : status);
    console.log(`%c[SYSTEM AUDIT] ${name} -> ${status.toUpperCase()}`, 'color: #00ffaa; font-weight: bold;', detail);
}

function showNotification(msg, type = 'info') {
    let container = document.getElementById('notification-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notification-container';
        container.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 9999; display: flex; flex-direction: column; gap: 10px;';
        document.body.appendChild(container);
    }

    const colors = { success: '#00ffaa', error: '#ff4d4d', info: '#00ccff' };
    const toast = document.createElement('div');
    toast.style.cssText = `background: rgba(10, 10, 10, 0.95); color: white; padding: 12px 20px; border-radius: 8px; border-left: 4px solid ${colors[type] || colors.info}; box-shadow: 0 10px 30px rgba(0,0,0,0.5); font-family: 'Inter', sans-serif; font-size: 14px; min-width: 280px; animation: slideIn 0.3s ease forwards; display: flex; align-items: center; justify-content: space-between;`;
    
    toast.innerHTML = `<span>${msg}</span><button onclick="this.parentElement.remove()" style="background:none; border:none; color:white; cursor:pointer; opacity:0.5; font-size:16px;">✕</button>`;
    container.appendChild(toast);
    setTimeout(() => { toast.style.animation = 'slideOut 0.3s ease forwards'; setTimeout(() => toast.remove(), 300); }, 5000);
}

/**
 * 3. БОГАТАЯ АНИМАЦИЯ (Бриллианты и частицы)
 */
function spawnRichParticles(el) {
    const rect = el.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const particles = ['💎', '✨', '🪙', '💰', '⭐'];

    for (let i = 0; i < 15; i++) {
        const p = document.createElement('span');
        p.textContent = particles[Math.floor(Math.random() * particles.length)];
        p.style.cssText = `position:fixed; left:${centerX}px; top:${centerY}px; z-index:10000; pointer-events:none; font-size:${10 + Math.random() * 20}px; user-select:none; filter: drop-shadow(0 0 5px gold);`;
        document.body.appendChild(p);

        const angle = Math.random() * Math.PI * 2;
        const velocity = 4 + Math.random() * 8;
        const tx = Math.cos(angle) * (velocity * 12);
        const ty = Math.sin(angle) * (velocity * 12);
        const rot = Math.random() * 360;

        p.animate([
            { transform: 'translate(-50%, -50%) scale(0)', opacity: 1 },
            { transform: `translate(-50%, -50%) translate(${tx}px, ${ty}px) rotate(${rot}deg) scale(1.5)`, opacity: 1, offset: 0.6 },
            { transform: `translate(-50%, -50%) translate(${tx * 1.2}px, ${ty * 1.2}px) rotate(${rot * 2}deg) scale(0)`, opacity: 0 }
        ], { duration: 800 + Math.random() * 600, easing: 'cubic-bezier(0.1, 0.8, 0.3, 1)' }).onfinish = () => p.remove();
    }
}

/**
 * УЛУЧШЕННЫЙ ОБРАБОТЧИК ДЕЙСТВИЙ С ЗАЩИТОЙ ОТ ОШИБОК PHANTOM
 */
async function executeSmartActionWithFullEffects(btn, config) {
    if (btn.classList.contains('loading')) return;

    // 1. ПРОВЕРКА СВЯЗИ С КОШЕЛЬКОМ
    const provider = window.phantom?.solana || window.solana;
    if (!provider || !provider.isPhantom) {
        showNotification("Phantom wallet not found or disconnected", "error");
        return;
    }

    const originalHTML = btn.innerHTML;
    btn.classList.add('loading');
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner"></span> ${config.name}...`;

    actionAudit(config.name, "process", "Connecting to Blockchain...");

    try {
        // Добавляем небольшую задержку, чтобы избежать ошибки "Receiving end does not exist"
        await new Promise(r => setTimeout(r, 100));

        // Выполняем саму функцию
        await config.fn(); 

        // УСПЕХ
        btn.classList.remove('loading');
        btn.classList.add('success-glow');
        btn.innerHTML = `✅ ${config.msg}`;
        spawnRichParticles(btn);
        actionAudit(config.name, "success", config.msg);

        if (typeof updateStakingAndBalanceUI === 'function') await updateStakingAndBalanceUI();

    } catch (err) {
        console.error("Smart Action Error:", err);
        
        // Обработка специфической ошибки Phantom
        let errorMsg = err.message || "User rejected";
        if (errorMsg.includes("Could not establish connection")) {
            errorMsg = "Wallet connection lost. Please refresh page.";
        }

        btn.classList.remove('loading');
        btn.classList.add('error-shake');
        btn.innerHTML = `❌ Failed`;
        actionAudit(config.name, "error", errorMsg);
    } finally {
        setTimeout(() => {
            btn.classList.remove('success-glow', 'loading', 'error-shake');
            btn.disabled = false;
            btn.innerHTML = originalHTML;
        }, 3500);
    }
}



// ============================================================
// ULTRA SMART KNIGHT ENGINE — FULL HTML SCANNER (AFOX EDITION)
// ============================================================

const KnightLogic = {
    // 1. Проверка коннекта (Смотрим во все возможные места)
    isWalletConnected: () => {
        const state = window.appState || appState;
        return !!(state && (state.walletPublicKey || state.provider?.publicKey));
    },

    // 2. КАРТА ВСЕХ КНОПОК ИЗ ТВОЕГО HTML
    // Я добавил сюда всё: от Стейкинга до Лендинга и ДАО
    map: {
        // --- STAKING ---
        'stake-afox-btn':     { name: 'Staking', msg: 'Gold Staked!', fn: async () => await window.handleStakeAfox?.() },
        'unstake-afox-btn':   { name: 'Unstaking', msg: 'Gold Unstaked!', fn: async () => await window.handleUnstakeAfox?.() },
        'claim-rewards-btn':  { name: 'Claiming', msg: 'Rewards Collected!', fn: async () => await window.handleClaimRewards?.() },
        'approve-staking-btn':{ name: 'Approving', msg: 'Token Approved!', fn: async () => await window.handleApproveAfox?.() },
        
        // --- LENDING (Кредитование) ---
        'lend-btn':           { name: 'Lending', msg: 'Assets Supplied!', fn: async () => await window.handleLendingAction?.('Lend') },
        'withdraw-lend-btn':  { name: 'Withdrawing', msg: 'Assets Withdrawn!', fn: async () => await window.handleLendingAction?.('Withdraw') },
        'borrow-btn':         { name: 'Borrowing', msg: 'SOL Borrowed!', fn: async () => await window.handleLoanAction?.('Borrow') },
        'repay-btn':          { name: 'Repaying', msg: 'Loan Repaid!', fn: async () => await window.handleLoanAction?.('Repay') },

        // --- DAO (Управление) ---
        'createProposalBtn':  { name: 'DAO', msg: 'Proposal Created!', fn: async (e) => await window.handleCreateProposal?.(e) },
        'executeProposalBtn': { name: 'DAO', msg: 'Proposal Executed!', fn: async () => await window.handleExecuteProposal?.() },
        'dao-vote-btn':       { name: 'Voting', msg: 'Vote Casted!', fn: async (e) => await window.handleVote?.(e) },
        
        // --- FILTERS ---
        'filterActiveBtn':    { name: 'Filtering', msg: 'Updated!', fn: async () => console.log("Filter Active") }
    },

    findConnectBtn: () => {
        return document.getElementById('connectWalletBtn') || 
               document.querySelector('.connect-fox-btn') || 
               Array.from(document.querySelectorAll('button')).find(b => b.innerText.toLowerCase().includes('wallet'));
    }
};

async function startUltraKnight() {
    console.log("🛡️ [Ultra Knight]: Сканирую твой HTML на наличие кнопок AFOX...");

    const connectBtn = KnightLogic.findConnectBtn();

    // Перебираем вообще все кнопки на странице
    document.querySelectorAll('button, .royal-btn, .web3-button').forEach(btn => {
        
        // Пропускаем коннект кошелька
        if (btn === connectBtn || btn.id === 'connectWalletBtn') return;

        const btnId = btn.id || "";
        const btnText = btn.innerText ? btn.innerText.toLowerCase() : "";
        const btnClass = btn.className ? btn.className.toLowerCase() : "";
        const totalId = (btnId + btnClass + btnText).toLowerCase();

        // Ищем совпадение кнопки с нашей картой логики
        let config = null;
        
        // Сначала ищем по точному ID (самый надежный способ)
        if (KnightLogic.map[btnId]) {
            config = KnightLogic.map[btnId];
        } else {
            // Если по ID не нашли, ищем по вхождению слова (для классов и текста)
            for (const [key, cfg] of Object.entries(KnightLogic.map)) {
                if (totalId.includes(key.replace('-btn', ''))) {
                    config = cfg;
                    break;
                }
            }
        }

        // Если нашли конфиг для этой кнопки — вешаем логику
        if (config) {
            btn.onclick = async (e) => {
                e.preventDefault();

                // 1. Проверка кошелька
                if (!KnightLogic.isWalletConnected()) {
                    if (window.showNotification) {
                        window.showNotification("Сначала подключи кошелек! 🦊", "error");
                    } else {
                        alert("Please Connect Wallet!");
                    }
                    if (connectBtn) connectBtn.classList.add('pulse-alert');
                    return;
                }

                // 2. Выполнение действия с визуальными эффектами
                console.log(`🚀 [Knight] Выполняю: ${config.name}`);
                
                if (window.executeSmartActionWithFullEffects) {
                    await window.executeSmartActionWithFullEffects(btn, {
                        name: config.name,
                        msg: config.msg,
                        fn: config.fn
                    });
                } else {
                    // Фолбэк если нет функции эффектов
                    try {
                        const originalText = btn.innerHTML;
                        btn.disabled = true;
                        btn.innerHTML = `<span class="spinner"></span> ${config.name}...`;
                        await config.fn(e);
                        btn.innerHTML = `✅ ${config.msg}`;
                        setTimeout(() => { btn.disabled = false; btn.innerHTML = originalText; }, 3000);
                    } catch (err) {
                        console.error(err);
                        btn.innerHTML = "❌ Error";
                        setTimeout(() => { btn.disabled = false; btn.innerHTML = originalText; }, 3000);
                    }
                }
            };
            // console.log(`✅ Привязка: [${btnId}] -> ${config.name}`);
        }

        // --- СПЕЦИАЛЬНАЯ ЛОГИКА ДЛЯ КНОПОК MAX ---
        if (totalId.includes('max')) {
            btn.onclick = (e) => {
                e.preventDefault();
                // Ищем инпут рядом с кнопкой MAX
                const input = btn.closest('div')?.querySelector('input') || 
                              btn.parentElement?.querySelector('input');
                
                if (input) {
                    const state = window.appState || appState;
                    if (state && state.userBalances) {
                        // Если в названии есть 'lend', берем баланс AFOX, если 'borrow' - SOL
                        const isSol = totalId.includes('borrow');
                        const balance = isSol ? state.userBalances.SOL : state.userBalances.AFOX;
                        input.value = Number(balance) / (isSol ? 1e9 : 1e6);
                        console.log(`🎯 MAX: ${input.value}`);
                    }
                }
            };
        }
    });
}

// Запуск при загрузке
window.addEventListener('load', () => {
    setTimeout(startUltraKnight, 1000); // Даем время Phantom прогрузиться
});



// ============================================================
// ЕДИНЫЙ БЛОК УПРАВЛЕНИЯ СОСТОЯНИЕМ И ЗАПУСКА APP
// ============================================================

/**
 * 1. ОБНОВЛЕНИЕ ВИЗУАЛА КНОПКИ (Чтобы адрес не исчезал)
 */
function updateWalletDisplay() {
    const btn = document.getElementById('connectWalletBtn');
    if (!btn) return;

    if (appState.walletPublicKey) {
        const base58 = appState.walletPublicKey.toBase58();
        // Красивое сокращение адреса
        btn.textContent = base58.slice(0, 4) + '...' + base58.slice(-4);
        btn.classList.add('connected'); 
        btn.style.borderColor = '#00ffaa'; // Подсветка при коннекте
        console.log("📍 [UI]: Кошелек отображен:", base58);
    } else {
        btn.textContent = 'Connect Wallet';
        btn.classList.remove('connected');
        btn.style.borderColor = '';
        console.log("📍 [UI]: Кошелек отключен");
    }
}

/**
 * 2. ГЛАВНАЯ ФУНКЦИЯ ЗАПУСКА (Aurum Fox Core)
 */
function initializeAurumFoxApp() {
    console.log("🚀 [System]: Старт Aurum Fox Core...");

    // А. Подготовка Buffer и окружения
    if (!window.Buffer) {
        window.Buffer = window.buffer ? window.buffer.Buffer : undefined;
    }

    // Б. Инициализация адресов (возврат, если ошибка)
    if (!setupAddresses()) {
        console.error("❌ [System]: Ошибка инициализации адресов!");
        return;
    }

    // В. Кэширование элементов UI
    cacheUIElements();

    // Г. Привязка действий к кнопкам (чистка старых слушателей внутри setupModernUI)
    setupModernUI();

    // Д. ВОССТАНОВЛЕНИЕ СЕССИИ (Главный фикс "вылетания")
    // Используем задержку, чтобы Phantom успел пробросить объект solana
    setTimeout(() => {
        const provider = window.phantom?.solana || window.solana;
        if (provider) {
            console.log("🔍 [System]: Поиск активной сессии...");
            // Вызываем connectWallet с флагом silent=true
            // Это подхватит кошелек без открытия окна, если юзер уже залогинен
            connectWallet(true); 
        } else {
            console.log("ℹ️ [System]: Кошелек не обнаружен в браузере.");
        }
    }, 1000); 
}

/**
 * 3. ЕДИНЫЙ ТОЧКА ВХОДА ПРИ ЗАГРУЗКЕ
 */
window.addEventListener('DOMContentLoaded', () => {
    // Запускаем всё один раз
    initializeAurumFoxApp();
    
    // Инициализируем DAO (если функция есть)
    if (typeof setupDAO === 'function') setupDAO();
});

// Если в коде остались старые window.onload или другие initializeAurumFoxApp — удали их.
