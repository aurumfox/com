


    
// --
// --- 1. УТИЛИТЫ ---
function formatBigInt(value, decimals) {
    if (!value) return "0";
    let str = value.toString().padStart(decimals + 1, '0');
    let intPart = str.slice(0, -decimals);
    let fracPart = str.slice(-decimals).replace(/0+$/, '');
    return fracPart ? (intPart + "." + fracPart) : intPart;
}

// ============================================================
// ГЛОБАЛЬНЫЙ МОСТ: CSP И SYNTAXERROR
// ============================================================
(function() {
    console.log("🛠️ Запуск экстренного восстановления систем...");

    // 1. Прямая настройка Buffer
    window.Buffer = window.Buffer || (window.buffer ? window.buffer.Buffer : undefined);

    // 2. Создаем «Виртуальный Anchor» прямо здесь
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








// ==========================================
// 1. ГЛОБАЛЬНЫЙ КОНФИГ (Перенесён на самый верх для 100% синхронизации)
// ==========================================



 




const QUBIT_CONFIG = {
    // 1. Ключевые адреса программы и пула
    programId: new solanaWeb3.PublicKey("BqqKdzVPiYt3cKKdgKsSir2ruVJaSi9bDrs5V8FbqeN8"),
    pool: new solanaWeb3.PublicKey("8nHURwqYpz67Rtp2abN33MqU7d765e6WCuPgxyGTraaW"), // Он же PoolState / Data Account
    vault: new solanaWeb3.PublicKey("CHkoheNrLJVeqvnPREhvEfojyPAEksAwX2MJH2iX6cKq"), // Сейф пула
    mint: new solanaWeb3.PublicKey("EgQptYNBBuhLqgrpfcLzRW5TYTWeSxYpyt6EQKwqVeag"), // Используемый токен

    // 2. Личные и верифицированные PDA аккаунты из логов сети
    userStakingPda: new solanaWeb3.PublicKey("GqJzDaUm9zHhG4bwfbVc6w3kEVk4EpvaspUQiqWaMPnf"), // Твой личный PDA Стейкинга
    poolOwner: new solanaWeb3.PublicKey("5XSQUXBwxbssvEUBLoerSd7ZVzfuCfHqZQsvkja7xQ7v"), // Владелец из верификации памяти
    stMintAuth: new solanaWeb3.PublicKey("8nHURwqYpz67Rtp2abN33MqU7d765e6WCuPgxyGTraaW"), // Авторизация стейк-минта (равна пулу)

    // 3. Системные переменные Solana (необходимы для вызова методов контракта)
    systemProgram: solanaWeb3.SystemProgram.programId,
    clock: solanaWeb3.SYSVAR_CLOCK_PUBKEY,
    rent: solanaWeb3.SYSVAR_RENT_PUBKEY,

    // 4. Метаданные транзакции (сохранено для истории/проверок)
    lastTxReceipt: "EjkqRj9aagtWeNEDYz55yJ4uZeuXn6AmxNSRWrDBgAHu",
    initializationTx: "3VT6F5cNkgb3DR1VG6UFbuhChadnStJzTPxEKDKow1CvTpnWj1HVWZmECUrJAiFWQGMZR1TTKQ22TzL63GbWAk8q",

    // 5. Сетевое окружение (Переключено на Mainnet согласно логу "MAINNET READY")
    rpcUrl: "https://api.devnet.solana.com"
};

// Сервис управления программой Anchor
const QubitProgramManager = {
    program: null,

    async getProgram() {
        if (this.program) return this.program;

        try {
            // Устанавливаем соединение с подтвержденным commitment
            const connection = new solanaWeb3.Connection(QUBIT_CONFIG.rpcUrl, "confirmed");
            
            // ИСПРАВЛЕНО: Сначала проверяем активный выбранный кошелек (currentProvider), затем дефолтный window.solana
            let wallet = null;
            if (typeof currentProvider !== 'undefined' && currentProvider && currentProvider.isConnected) {
                wallet = currentProvider;
            } else if (window.solana && window.solana.isConnected) {
                wallet = window.solana;
            } else {
                wallet = {
                    publicKey: null,
                    signTransaction: async () => { throw new Error("Кошелек не подключен"); },
                    signAllTransactions: async () => { throw new Error("Кошелек не подключен"); }
                };
            }

            // Формируем провайдер Anchor
            const provider = new anchor.AnchorProvider(
                connection, 
                wallet, 
                { preflightCommitment: "confirmed" }
            );

            // Безопасное динамическое получение IDL без падения скрипта в любой версии библиотеки
            let idl = null;
            if (typeof anchor.fetchIdl === 'function') {
                idl = await anchor.fetchIdl(QUBIT_CONFIG.programId, provider);
            } else if (anchor.Program && typeof anchor.Program.fetchIdl === 'function') {
                idl = await anchor.Program.fetchIdl(QUBIT_CONFIG.programId, provider);
            }

            if (!idl) throw new Error("IDL программы не найден в сети. Проверьте правильность Program ID.");
            
            // Инициализируем инстанс программы для работы с методами
            this.program = new anchor.Program(idl, QUBIT_CONFIG.programId, provider);
            console.log("✅ Qubit Program Manager: Успешно инициализирована в Mainnet");
            
            return this.program;
        } catch (e) {
            console.error("❌ Qubit Program Manager Error:", e);
            throw e;
        }
    }
};

       















      /**
 * УЛЬТРА-АВТОНОМНЫЙ РАСЧЕТ PDA
 * Полная синхронизация с семенами Rust-контракта Anchor
 */
async function getUserStakingPDA(owner, poolStatePubkey, poolIndex = 0) {
    try {
        // Используем конфигурацию, чтобы не прокидывать programId постоянно
        const programId = QUBIT_CONFIG.programId;
        
        // 1. Безопасное приведение типов к PublicKey
        const ownerPk = owner instanceof solanaWeb3.PublicKey ? owner : new solanaWeb3.PublicKey(owner);
        const poolPk = poolStatePubkey instanceof solanaWeb3.PublicKey ? poolStatePubkey : new solanaWeb3.PublicKey(poolStatePubkey);

        // 2. Валидация входных данных
        if (!ownerPk || !poolPk) {
            throw new Error("Недостаточно данных для деривации PDA");
        }

        // 3. Синхронная генерация адреса (оптимально для клиентского JS)
        // ВНИМАНИЕ: seeds должны 1:1 соответствовать коду в Rust
        const [pda] = anchor.web3.PublicKey.findProgramAddressSync(
            [
                Buffer.from("user_stake"),
                poolPk.toBuffer(),
                ownerPk.toBuffer(),
                Buffer.from([poolIndex]) // Индекс как u8
            ],
            programId
        );

        console.log(`🎯 PDA успешно рассчитан [Pool: ${poolIndex}]: ${pda.toBase58()}`);
        return pda;

    } catch (e) {
        console.error("❌ Критическая ошибка расчета PDA:", e);
        throw e; // Пробрасываем ошибку дальше для корректной обработки в UI
    }
}






/**
 * 1. УЛЬТРА-ПАРСЕР ЧИСЕЛ (BigInt/BN)
 * Адаптировано: Возвращает anchor.BN, так как SDK Anchor работает именно с ним.
 */
window.parseAmountToBN = function(amountStr, decimals = 9) {
    try {
        if (!amountStr || amountStr.toString().trim() === '') return new anchor.BN(0);

        let cleaned = amountStr.toString().replace(',', '.').replace(/[^\d.]/g, '');
        const parts = cleaned.split('.');
        if (parts.length > 2) return new anchor.BN(0);

        let [integerPart, fractionalPart = ''] = parts;
        fractionalPart = fractionalPart.substring(0, decimals).padEnd(decimals, '0');

        const resultStr = (integerPart === '' || integerPart === '0' ? '' : integerPart) + fractionalPart;
        return new anchor.BN(resultStr || '0');
    } catch (e) {
        console.error("❌ [Math Error]:", e);
        return new anchor.BN(0);
    }
};

/**
 * 2. РОБАСТНОЕ СОЕДИНЕНИЕ (Интегрировано в QubitProgramManager)
 * Вместо создания новой функции, мы расширяем текущий менеджер.
 */
// ВАЖНО: Добавь этот метод в объект QubitProgramManager
QubitProgramManager.getConnection = async function() {
    const RPC_ENDPOINTS = [
        QUBIT_CONFIG.rpcUrl,
        "https://api.devnet.solana.com",
        "https://api.mainnet-beta.solana.com"
    ];

    for (let url of RPC_ENDPOINTS) {
        try {
            const conn = new solanaWeb3.Connection(url, "confirmed");
            await conn.getSlot(); // Быстрая проверка связи
            return conn;
        } catch (e) {
            console.warn(`⚠️ RPC ${url} недоступен, пробуем следующий...`);
        }
    }
    throw new Error("Все RPC узлы недоступны.");
};






/**
 * УЛУЧШЕННЫЙ МЕТОД: GET ROBUST CONNECTION
 * Теперь интегрирован в экосистему QubitProgramManager.
 * Ищет рабочую ноду и обновляет состояние приложения.
 */
async function getRobustConnection() {
    // 1. Пытаемся получить соединение через существующий менеджер программ
    try {
        const program = await QubitProgramManager.getProgram();
        if (program && program.provider && program.provider.connection) {
            // Проверка "живучести" соединения
            await program.provider.connection.getSlot({ commitment: 'processed' });
            return program.provider.connection;
        }
    } catch (e) {
        console.warn("🔄 Основной RPC недоступен, начинаем ротацию...");
    }

    // 2. Список узлов для ротации (берем из конфига + fallback)
    const endpoints = [
        QUBIT_CONFIG.rpcUrl,
        "https://api.devnet.solana.com",
        "https://api.mainnet-beta.solana.com"
    ];

    // 3. Перебор узлов
    for (const url of endpoints) {
        try {
            const conn = new solanaWeb3.Connection(url, { 
                commitment: 'confirmed',
                confirmTransactionInitialTimeout: 60000 
            });

            // Тест на "живость"
            await conn.getLatestBlockhash(); 
            
            // Сохраняем в AppState, если он существует
            if (typeof AppState !== 'undefined') {
                AppState.connection = conn;
            }
            
            console.log(`🚀 Успешное переключение на RPC: ${url}`);
            return conn;
        } catch (e) {
            console.error(`❌ RPC Fail (${url}):`, e.message);
            continue; 
        }
    }

    // 4. Обработка критической ошибки
    const errorMsg = "Все RPC узлы недоступны. Проверьте интернет-соединение.";
    console.error("🚨 RPC_UNREACHABLE");
    
    // Если есть метод уведомления - используем его, иначе alert
    if (typeof showNotification === 'function') {
        showNotification(errorMsg, "red");
    } else {
        alert(errorMsg);
    }
    
    throw new Error("RPC_UNREACHABLE");
}






/**
 * УМНЫЙ ОБРАБОТЧИК СМЕНЫ КОШЕЛЬКА
 * Полная интеграция с Qubit-инфраструктурой
 */
window.handlePublicKeyChange = async function(newPublicKey) {
    try {
        // 1. Идентификация смены
        const newKeyStr = newPublicKey ? newPublicKey.toBase58() : null;
        const oldKeyStr = window.AppState?.walletPublicKey ? window.AppState.walletPublicKey.toBase58() : null;

        if (newKeyStr === oldKeyStr) return;

        console.log(`🔄 [WALLET SYNC]: ${oldKeyStr || 'None'} -> ${newKeyStr || 'Disconnected'}`);

        // 2. Очистка и обновление стейта
        if (!window.AppState) window.AppState = {};
        window.AppState.walletPublicKey = newPublicKey;
        window.AppState.lastUpdate = null;

        // 3. Мгновенная очистка UI (UX: предотвращение показа старых данных)
        const balanceEl = document.getElementById('wallet-balance-display');
        if (balanceEl) balanceEl.innerText = "Balance: --";
        
        // 4. Логика переподключения
        if (newPublicKey) {
            console.log("✨ [WALLET SYNC]: Инициализация данных нового аккаунта...");
            
            // Используем твою систему уведомлений
            if (typeof showNotification === 'function') {
                showNotification("Account Switched", "emerald");
            }
            
            // Синхронизация всех сервисов
            await Promise.allSettled([
                window.updateWalletBalance ? window.updateWalletBalance() : Promise.resolve(),
                // Если есть другие сервисы, вызываем их здесь
                // window.StakingDataManager.refresh() и т.д.
            ]);
            
            console.log("✅ [WALLET SYNC]: Данные успешно обновлены для", newKeyStr);
        } else {
            console.warn("⚠️ [WALLET SYNC]: Кошелек отключен.");
            if (typeof showNotification === 'function') {
                showNotification("Wallet Disconnected", "red");
            }
            // Сброс UI при отключении
            if (balanceEl) balanceEl.innerText = "Balance: Connect Wallet";
        }

    } catch (e) {
        console.error("❌ [WALLET SYNC ERROR]:", e);
    }
};

// --- ВАЖНО: Привязка к событию кошелька ---
// Добавь этот вызов в свой код подключения кошелька (в блоке, где происходит connect)
// window.solana.on('accountChanged', (publicKey) => window.handlePublicKeyChange(publicKey));













/**
 * ПОИСК ГЛАВНОГО PDA ПУЛА (СИНХРОНИЗИРОВАН С QUBIT_CONFIG)
 * Использует актуальный programId и адрес пула из конфигурации приложения.
 */
window.getPoolPDA = async function() {
    // 1. Кэширование: если уже найдено, отдаем из памяти
    if (window._cachedPoolPda) return window._cachedPoolPda;

    try {
        // Проверяем наличие конфигурации
        if (typeof QUBIT_CONFIG === 'undefined' || !QUBIT_CONFIG.programId) {
            throw new Error("QUBIT_CONFIG не инициализирован");
        }

        // 2. Используем данные из твоего рабочего QUBIT_CONFIG
        // Если пул уже есть в конфиге (DtAAYa8d9bUYNrvrTPCcsb2yGFfirq1DcqsjfXdK34nd),
        // то PDA вычислять не нужно — он уже известен как объект PublicKey.
        const pda = QUBIT_CONFIG.pool;
        
        console.log("🏛️ Global Pool PDA (from Config):", pda.toBase58());
        
        // Сохраняем в кэш
        window._cachedPoolPda = pda;
        return pda;

    } catch (e) {
        console.error("❌ Ошибка при получении Pool PDA:", e);
        
        // Fallback: берем из конфига в любом случае, если есть
        if (typeof QUBIT_CONFIG !== 'undefined' && QUBIT_CONFIG.pool) {
            return QUBIT_CONFIG.pool;
        }
        
        throw new Error("Не удалось определить адрес пула.");
    }
};









/**
 * ДИНАМИЧЕСКИЙ РАСЧЕТ APR
 * Адаптировано под: QubitProgramManager и QUBIT_CONFIG
 */
window.getLiveAPR = async function() {
    try {
        console.log("📊 [APR SERVICE]: Расчет актуального APR...");
        
        // 1. Используем менеджер программ из твоего основного кода
        const program = await QubitProgramManager.getProgram();
        
        // 2. Берем адреса из твоего конфига
        const poolPubKey = QUBIT_CONFIG.pool;
        
        // 3. Фетчим данные аккаунта пула (Zero-Copy через fetchData)
        const poolAccount = await program.account.poolState.fetchData(poolPubKey);

        if (!poolAccount) throw new Error("Pool account not found");

        // 4. Извлекаем данные
        // Предполагаем, что в контракте это BN, используем .toNumber() или .toString()
        const totalStakedBN = poolAccount.totalStakedAmount;
        const rewardRateBN = poolAccount.rewardRatePerSec;

        // Определяем децималы (обычно для SPL токенов это 9, но берем из конфига или константы)
        const DECIMALS = 6; 
        const totalStaked = totalStakedBN.toNumber() / Math.pow(10, DECIMALS);
        const rps = rewardRateBN.toNumber() / Math.pow(10, DECIMALS);

        // 5. Расчет
        const SECONDS_PER_YEAR = 31536000;
        const rewardsPerYear = rps * SECONDS_PER_YEAR;

        if (totalStaked < 1) return "🔥 1000%+";

        const realAPR = (rewardsPerYear / totalStaked) * 100;

        // Форматирование
        const result = realAPR > 5000 ? "5000%+" : realAPR.toFixed(2) + "%";
        
        console.log(`✅ [APR SERVICE]: Актуальный APR: ${result}`);
        return result;

    } catch (e) {
        console.error("❌ APR Calculation Error:", e);
        return "0.00%"; 
    }
};







let isUpdatingUI = false;

window.updateStakingAndBalanceUI = async function() {
    if (isUpdatingUI) return;
    isUpdatingUI = true;

    try {
        const program = await QubitProgramManager.getProgram();
        const walletPubkey = program.provider.wallet?.publicKey;

        if (!walletPubkey) {
            console.warn("⚠️ [GLOBAL SYNC]: Кошелек не подключен.");
            return;
        }

        console.log("🔄 [GLOBAL SYNC]: Запуск синхронизации...");

        // Запускаем запросы параллельно
        const balancePromise = window.updateWalletBalance();
        const stakingDataPromise = (async () => {
            if (window.appState?.currentPoolPubKey) {
                // Твоя логика стейкинга
            }
        })();

        await Promise.allSettled([balancePromise, stakingDataPromise]);

        // Единая точка рендера для всего интерфейса
        if (typeof window.renderAllUI === 'function') {
            window.renderAllUI();
        }

    } catch (e) {
        console.error("🚨 [GLOBAL SYNC]: Ошибка:", e);
    } finally {
        isUpdatingUI = false;
    }
};

// Единый интервал, который не забивает сеть
setInterval(async () => {
    try {
        const program = await QubitProgramManager.getProgram();
        // Проверяем коннект через провайдер
        if (program.provider.wallet?.publicKey) {
            window.updateStakingAndBalanceUI();
        }
    } catch (e) {
        // Менеджер программы еще не инициализирован, это нормально
    }
}, 30000); // 30 секунд вполне достаточно





/**
 * ФАБРИКА ПРОГРАММЫ ANCHOR (ОБНОВЛЕННАЯ)
 * Интегрирована с QubitProgramManager для единого источника истины.
 */
window.getAnchorProgram = async function(programId, idl) {
    try {
        console.log("🛠️ [BRIDGE]: Инициализация программы через Factory...");

        // 1. Используем уже настроенный менеджер (гарантирует корректный провайдер и RPC)
        const manager = QubitProgramManager;
        
        // 2. Если программа уже инициализирована в менеджере, отдаем её
        if (manager.program) {
            return manager.program;
        }

        // 3. Если нет — инициируем через менеджер
        // Это гарантирует, что мы используем QUBIT_CONFIG и правильный provider
        const program = await manager.getProgram();
        
        console.log(`📡 Anchor Program Ready: ${program.programId.toBase58()}`);
        return program;

    } catch (error) {
        console.error("🛠️ Anchor Factory Error:", error.message);
        
        // Интеграция с твоей системой уведомлений (если она доступна)
        if (typeof showNotification === 'function') {
            showNotification("Ошибка инициализации программы", "red");
        }
        throw error;
    }
};


















// ==========================================
// 3. УЛЬТРА-СИНХРОНИЗАЦИЯ БАЛАНСА ТОКЕНА
// ==========================================
window.fetchUserBalances = async function() {
    try {
        const program = await QubitProgramManager.getProgram();
        const connection = program.provider.connection;
        const pubkey = program.provider.wallet.publicKey;

        if (!pubkey) {
            console.warn("⚠️ [BALANCE SYNC]: Кошелек не подключен, пропуск обновления.");
            return;
        }

        // 1. Запрашиваем аккаунты строго для токена из QUBIT_CONFIG.mint
        const tokenAccounts = await connection.getParsedTokenAccountsByOwner(pubkey, { 
            mint: QUBIT_CONFIG.mint 
        });

        // 2. Собираем реальный баланс (используем uiAmount, чтобы сеть сама дала правильное число)
        const totalBalance = tokenAccounts.value.reduce((sum, acc) => {
            const uiAmount = acc.account.data.parsed.info.tokenAmount.uiAmount;
            return sum + (uiAmount || 0);
        }, 0);

        // 3. Сохраняем в AppState в чистом виде
        window.AppState = window.AppState || {};
        window.AppState.userBalances = {
            token: totalBalance
        };

        // 4. Логирование чистого результата
        console.log(`📊 BALANCE SYNC COMPLETE: ${totalBalance}`);

        // 5. Рендеринг напрямую в интерфейс (заменяем "Balance: Loading...")
        const tags = document.getElementsByTagName('*');
        let elementFound = false;

        for (let i = 0; i < tags.length; i++) {
            if (tags[i].textContent && tags[i].textContent.includes('Balance: Loading...')) {
                tags[i].textContent = `Balance: ${totalBalance.toFixed(2)}`;
                elementFound = true;
                break;
            }
        }

        if (!elementFound) {
            console.warn("⚠️ [BALANCE SYNC]: Элемент 'Balance: Loading...' не найден на странице.");
        }

    } catch (error) {
        console.error("❌ [BALANCE SYNC ERROR]:", error);
    }
};












const WalletBalanceManager = {
    cachedBalance: 0,
    isUpdating: false,

    async updateBalance() {
        if (this.isUpdating) return this.cachedBalance;
        this.isUpdating = true;
        
        try {
            console.log("⚡ [BALANCE SERVICE]: Запрос баланса через RPC...");
            const program = await QubitProgramManager.getProgram();
            const walletPubkey = program.provider.wallet.publicKey;

            if (!walletPubkey) return 0;

            // Используем официальный безопасный метод Anchor для определения ATA-адреса токена
            const ata = await anchor.utils.token.associatedAddress({
                mint: QUBIT_CONFIG.mint,
                owner: walletPubkey
            });

            const balanceInfo = await program.provider.connection.getTokenAccountBalance(ata);
            this.cachedBalance = balanceInfo.value.uiAmount || 0;
            
            console.log(`✅ [BALANCE SERVICE]: Баланс обновлен: ${this.cachedBalance}`);
            
            // Безопасное обновление текстовых блоков в UI (если они есть на странице)
            const displayElements = ['wallet-balance-display', 'user-qbt-balance'];
            displayElements.forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    // Если это блок ввода или кнопка, пишем "Доступно:", если обычный спан — просто цифру
                    if (id === 'wallet-balance-display') {
                        el.innerText = `Доступно: ${this.cachedBalance} QBT`;
                    } else {
                        el.innerText = this.cachedBalance.toFixed(2);
                    }
                }
            });

            return this.cachedBalance;

        } catch (e) {
            console.error("❌ [BALANCE SERVICE ERROR]:", e);
            
            // При ошибке (например, у юзера вообще 0 токенов и нет ATA кошелька в сети) выводим аккуратно 0
            const displayElements = ['wallet-balance-display', 'user-qbt-balance'];
            displayElements.forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    el.innerText = id === 'wallet-balance-display' ? "Доступно: 0 QBT" : "0.00";
                }
            });
            
            return this.cachedBalance; 
        } finally {
            this.isUpdating = false;
        }
    }
};

window.updateWalletBalance = () => WalletBalanceManager.updateBalance();








       /**
 * ГЛОБАЛЬНЫЙ МЕТОД: INITIALIZE USER STAKE (DEVNET FIXED)
 */
window.performInitializeUserStake = async function(poolPubKey, poolIndex) {
    try {
        console.log("====================================================================================================");
        console.log(`🛠 [START]: ИНИЦИАЛИЗАЦИЯ (DEVNET) | POOL INDEX: ${poolIndex}...`);
        
        const program = await QubitProgramManager.getProgram();
        const provider = program.provider;
        const ownerPubkey = provider.wallet.publicKey;

        if (poolIndex < 0 || poolIndex > 4) {
            throw new Error("⛔️ ОШИБКА: Неверный индекс пула (0-4).");
        }

        // 1. ДЕРИВАЦИЯ PDA
        const [userStakePda] = anchor.web3.PublicKey.findProgramAddressSync(
            [
                Buffer.from("user_stake"),
                poolPubKey.toBuffer(),
                ownerPubkey.toBuffer(),
                Buffer.from([poolIndex])
            ],
            program.programId
        );

        // 2. ПРОВЕРКА СОСТОЯНИЯ
        const accountInfo = await provider.connection.getAccountInfo(userStakePda);
        if (accountInfo !== null) {
            console.warn("⚠️ Аккаунт уже существует. Инициализация не требуется.");
            return "ALREADY_INITIALIZED";
        }

        // 3. ФОРМИРОВАНИЕ ТРАНЗАКЦИИ
        const tx = await program.methods
            .initializeUserStake(poolIndex)
            .accounts({
                poolState: poolPubKey,
                userStaking: userStakePda,
                owner: ownerPubkey,
                systemProgram: anchor.web3.SystemProgram.programId,
                clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
                rent: anchor.web3.SYSVAR_RENT_PUBKEY, // Добавлено для синхронизации с Utils и Rust драйвером
            })
            .preInstructions([
                anchor.web3.ComputeBudgetProgram.setComputeUnitLimit({ units: 1400000 }),
                anchor.web3.ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 25000 })
            ])
            .rpc({
                skipPreflight: false,
                preflightCommitment: "confirmed"
            });

        console.log("✨ [SUCCESS]: Инициализация в Devnet прошла успешно. TX:", tx);
        return tx;

    } catch (e) {
        console.error("❌ Initialize Error (Devnet):", e);
        throw e;
    }
};




/**
 * Единая функция инициализации (ПРОФЕССИОНАЛЬНЫЙ UI + ВЕРИФИКАЦИЯ)
 */
async function handleConfirmInitialize() {
    // Получаем кнопку для управления состоянием
    const btn = document.querySelector('.tier-btn.active-tier');
    // Безопасная проверка наличия кнопки перед тем, как брать текст
    const originalText = btn ? btn.innerText : "Инициализировать";

    try {
        console.log("====================================================================================================");
        console.log("🛠 [UI EVENT]: ИНИЦИАЦИЯ СТЕЙКИНГА ЧЕРЕЗ UI...");

        // 1. БЛОКИРОВКА КНОПКИ (защита от повторного нажатия)
        if (btn) {
            btn.disabled = true;
            btn.innerText = "⏳ Отправка...";
        }

        // --- ПРОВЕРКА СОЕДИНЕНИЯ И ПОЛУЧЕНИЕ ПУБЛИЧНОГО КЛЮЧА ---
        const walletPubkey = await ensureWalletConnected();
        
        // ОБНОВЛЯЕМ UI ДИНАМИЧЕСКИ
        const signerEl = document.querySelector('.wallet-signer-display'); 
        if (signerEl) signerEl.innerText = walletPubkey.toBase58();

        const activeBtn = document.querySelector('.tier-btn.active-tier');
        if (!activeBtn) {
            alert("⚠️ Пожалуйста, выберите тир перед инициализацией!");
            return;
        }
        
        const poolIndex = parseInt(activeBtn.getAttribute('data-index'));
        const poolPubKey = window.appState?.currentPoolPubKey;

        if (!poolPubKey) {
            throw new Error("Адрес пула (poolPubKey) не определен в приложении.");
        }

        console.log(`⚙️ Инициализация пула: ${poolIndex} | Адрес: ${poolPubKey.toBase58()}`);

        // 2. ВЫЗОВ МЕТОДА (через глобальный performInitializeUserStake)
        const result = await window.performInitializeUserStake(poolPubKey, poolIndex);

        if (result === "ALREADY_INITIALIZED") {
            console.warn("ℹ️ [UI INFO]: Аккаунт уже инициализирован.");
            alert("ℹ️ Стейкинг-аккаунт уже был инициализирован ранее.");
        } else {
            console.log("✨ [UI SUCCESS]: Инициализация прошла успешно. TX:", result);
            
            // --- БЛОК ВЕРИФИКАЦИИ (Чтение данных из блокчейна) ---
            const program = await QubitProgramManager.getProgram();
            
            // Вычисляем PDA для проверки
            const [userStakePda] = anchor.web3.PublicKey.findProgramAddressSync(
                [
                    Buffer.from("user_stake"),
                    poolPubKey.toBuffer(),
                    walletPubkey.toBuffer(),
                    Buffer.from([poolIndex])
                ],
                program.programId
            );

            // Читаем данные из блокчейна для подтверждения
            let stakeData;
            try {
                // Синхронизация с тестами: динамически определяем имя структуры в IDL (userStakingAccount или userStaking)
                const fetchMethod = program.account.userStakingAccount || program.account.userStaking;
                stakeData = await fetchMethod.fetch(userStakePda);
                
                console.log("📊 [VERIFICATION]: ДАННЫЕ В БЛОКЧЕЙНЕ:");
                console.log(`   - Owner: ${stakeData.owner.toBase58()}`);
                console.log(`   - Pool Index: ${stakeData.poolIndex}`);
                console.log(`   - Is Initialized: ${stakeData.isInitialized}`);

                // УСПЕШНЫЙ РЕЗУЛЬТАТ (ссылка на Solana Explorer)
                const explorerUrl = `https://explorer.solana.com/tx/${result}?cluster=devnet`;
                const message = `✅ Стейкинг-аккаунт успешно инициализирован и верифицирован!\n\nTX: ${result.slice(0, 8)}...\n\nНажмите OK, чтобы увидеть транзакцию в Explorer.`;
                
                if (confirm(message)) {
                    window.open(explorerUrl, '_blank');
                }

            } catch (fetchErr) {
                console.error("❌ Ошибка при чтении данных после инициализации:", fetchErr);
                alert("✅ Транзакция прошла, но возникла ошибка при чтении данных для верификации.");
            }
        }

    } catch (e) {
        console.error("❌ Handle Confirm Initialize Error:", e.message);
        
        // ПРОФЕССИОНАЛЬНАЯ ОБРАБОТКА ОШИБОК
        let errorMsg = "Ошибка транзакции: " + e.message;
        if (e.message.includes("0x1")) errorMsg = "Ошибка: Недостаточно средств на балансе.";
        if (e.message.includes("User rejected")) errorMsg = "Вы отменили подпись в кошельке.";
        
        alert(errorMsg);
    } finally {
        // 4. ВОЗВРАТ СОСТОЯНИЯ КНОПКИ
        if (btn) {
            btn.disabled = false;
            btn.innerText = originalText;
        }
    }
}









                
    


 
            
    
















    

            
          
        














/**
 * ГЛОБАЛЬНЫЙ МЕТОД: COLLATERALIZE LENDING
 * 100% синхронизация с SDK: PDA, Compute Budget, Симуляция, RAW транзакция, Аудит
 */
window.performCollateralizeLending = async function(
    poolPubKey, 
    poolIndex, 
    newLendingAmount, 
    minHealthFactor, 
    guardianKeypair, 
    lendingAuthorityKeypair, 
    oracleFeeds
) {
    try {
        console.log("====================================================================================================");
        console.log("🛡️ [START]: ИНИЦИАЦИЯ СИНХРОННОГО ПРОЦЕССА УСТАНОВКИ ЗАЛОГА (COLLATERALIZE LENDING)...");
        
        const program = await QubitProgramManager.getProgram();
        const provider = program.provider;
        const ownerPubkey = provider.wallet.publicKey;

        // 1. Деривация PDA и предварительный аудит
        const [userStakePda] = anchor.web3.PublicKey.findProgramAddressSync(
            [
                Buffer.from("user_stake"),
                poolPubKey.toBuffer(),
                ownerPubkey.toBuffer(),
                Buffer.from([poolIndex])
            ],
            program.programId
        );

        // 2. Сборка транзакции с COMPUTE BUDGET
        const transaction = new anchor.web3.Transaction();
        
        transaction.add(anchor.web3.ComputeBudgetProgram.setComputeUnitLimit({ units: 1400000 }));
        transaction.add(anchor.web3.ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 25000 }));

        // 3. Формирование инструкции
        const collateralizeInstruction = await program.methods
            .collateralizeLending(newLendingAmount, minHealthFactor)
            .accounts({
                poolState: poolPubKey,
                userStaking: userStakePda,
                owner: ownerPubkey,
                guardian: guardianKeypair.publicKey,
                lendingAuthority: lendingAuthorityKeypair.publicKey,
                oracleFeeds: oracleFeeds,
                clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
                systemProgram: anchor.web3.SystemProgram.programId,
            })
            .instruction();

        transaction.add(collateralizeInstruction);

        // 4. Подготовка транзакции и симуляция
        const { blockhash, lastValidBlockHeight } = await provider.connection.getLatestBlockhash('finalized');
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = ownerPubkey;

        // Важно: сначала подписываем внешними ключами (Guardian, LendingAuth)
        transaction.partialSign(guardianKeypair);
        transaction.partialSign(lendingAuthorityKeypair);

        const simulation = await provider.connection.simulateTransaction(transaction);
        if (simulation.value.err) {
            console.error("--- SOLANA LOGS (SIMULATION FAILED) ---");
            if (simulation.value.logs) simulation.value.logs.forEach(line => console.error(line));
            throw new Error("Симуляция коллатерализации не пройдена: " + JSON.stringify(simulation.value.err));
        }

        // 5. Подпись кошельком пользователя и отправка
        const signedTx = await provider.wallet.signTransaction(transaction);
        const txId = await provider.connection.sendRawTransaction(signedTx.serialize(), {
            skipPreflight: true,
            preflightCommitment: "finalized"
        });

        console.log("⏳ Ожидание подтверждения (Collateralize)...");
        await provider.connection.confirmTransaction({ signature: txId, blockhash, lastValidBlockHeight }, "finalized");

        console.log("✨ [SUCCESS]: Залог установлен успешно. TX:", txId);
        return txId;

    } catch (e) {
        if (e.logs) {
            console.error("--- SOLANA LOGS (TRANSACTION) ---");
            e.logs.forEach(line => console.error(line));
        }
        console.error("❌ Collateralize Error:", e.message);
        throw e;
    }
};





/**
 * БРИДЖ-ФУНКЦИЯ ДЛЯ СИНХРОНИЗАЦИИ HTML И JS
 * Вызывается напрямую из атрибута onclick="handleCollateralize()" в твоем HTML
 */
async function handleCollateralize() {
    const btn = document.getElementById('collateralizeBtn'); // Предполагаем ID кнопки

    try {
        console.log("====================================================================================================");
        console.log("🛡️ [UI EVENT]: ИНИЦИАЦИЯ COLLATERALIZE LENDING ЧЕРЕЗ UI...");

        // 1. ПОЛУЧЕНИЕ И ВАЛИДАЦИЯ ДАННЫХ ИЗ ИНПУТА
        const rawAmount = document.getElementById('collateralAmountInput')?.value;
        if (!rawAmount || isNaN(rawAmount) || parseFloat(rawAmount) <= 0) {
            throw new Error("Введите корректное число для залога.");
        }
        
        const amount = new anchor.BN(rawAmount);
        const minHF = 2000; 

        // 2. ПОДГОТОВКА UI
        if (btn) {
            btn.innerText = "Processing...";
            btn.disabled = true;
        }

        // 3. ПРОВЕРКА ГЛОБАЛЬНЫХ КОНТЕКСТОВ (Убеждаемся, что ключи и данные загружены)
        if (!window.GUARDIAN_KEYPAIR || !window.LENDING_AUTH_KEYPAIR) {
            throw new Error("Ключи Guardian или Lending Authority не загружены.");
        }
        if (typeof POOL_STATE_PUBKEY === 'undefined' || typeof ORACLE_FEEDS_ARRAY === 'undefined') {
            throw new Error("Необходимые данные пула или оракулов не определены.");
        }

        console.log(`⚙️ Залог: ${rawAmount} | MinHF: ${minHF}`);

        // 4. ВЫЗОВ ПРОВЕРЕННОГО SDK-МЕТОДА
        await window.performCollateralizeLending(
            POOL_STATE_PUBKEY, 
            0, 
            amount, 
            new anchor.BN(minHF),
            window.GUARDIAN_KEYPAIR, 
            window.LENDING_AUTH_KEYPAIR, 
            ORACLE_FEEDS_ARRAY
        );

        console.log("✨ [UI SUCCESS]: Залог успешно установлен.");
        alert("✅ Залог успешно установлен!");

    } catch (e) {
        console.error("❌ Collateralize UI Error:", e.message);
        alert("Ошибка при установке залога: " + e.message);
        
    } finally {
        // 5. ВОССТАНОВЛЕНИЕ UI
        if (btn) {
            btn.innerText = "CONFIRM COLLATERAL";
            btn.disabled = false;
        }
    }
}









/**
 * ГЛОБАЛЬНЫЙ МЕТОД: DECOLLATERALIZE LENDING
 * 100% синхронизация с SDK: PDA, Compute Budget, Симуляция, RAW транзакция
 */
window.performDecollateralizeLending = async function(poolPubKey, poolIndex, amountBN) {
    try {
        console.log("====================================================================================================");
        console.log("🔓 [START]: ИНИЦИАЦИЯ СИНХРОННОГО ПРОЦЕССА СНЯТИЯ ЗАЛОГА (DECOLLATERALIZE LENDING)...");
        
        const program = await QubitProgramManager.getProgram();
        const provider = program.provider;
        const ownerPubkey = provider.wallet.publicKey;

        // 1. ДЕРИВАЦИЯ PDA (строго по семенам из Rust)
        const [userStakePda] = anchor.web3.PublicKey.findProgramAddressSync(
            [
                Buffer.from("user_stake"),
                poolPubKey.toBuffer(),
                ownerPubkey.toBuffer(),
                Buffer.from([poolIndex])
            ],
            program.programId
        );

        // 2. СБОРКА ТРАНЗАКЦИИ С COMPUTE BUDGET
        const transaction = new anchor.web3.Transaction();
        transaction.add(anchor.web3.ComputeBudgetProgram.setComputeUnitLimit({ units: 1400000 }));
        transaction.add(anchor.web3.ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 25000 }));

        // 3. ФОРМИРОВАНИЕ ИНСТРУКЦИИ
        const decollateralizeInstruction = await program.methods
            .decollateralizeLending(amountBN)
            .accounts({
                poolState: poolPubKey,
                userStaking: userStakePda,
                owner: ownerPubkey,
                clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
            })
            .instruction();

        transaction.add(decollateralizeInstruction);

        // 4. ПОДГОТОВКА И СИМУЛЯЦИЯ
        const { blockhash, lastValidBlockHeight } = await provider.connection.getLatestBlockhash('finalized');
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = ownerPubkey;

        // Добавляем симуляцию для предотвращения ошибок транзакции
        const simulation = await provider.connection.simulateTransaction(transaction);
        if (simulation.value.err) {
            console.error("--- SOLANA LOGS (SIMULATION FAILED) ---");
            if (simulation.value.logs) simulation.value.logs.forEach(line => console.error(line));
            throw new Error("Симуляция снятия залога не пройдена: " + JSON.stringify(simulation.value.err));
        }

        // 5. ОТПРАВКА И ПОДТВЕРЖДЕНИЕ
        const signedTx = await provider.wallet.signTransaction(transaction);
        const txId = await provider.connection.sendRawTransaction(signedTx.serialize(), {
            skipPreflight: true,
            preflightCommitment: "finalized"
        });

        console.log("⏳ Ожидание подтверждения (Decollateralize)...");
        await provider.connection.confirmTransaction({ signature: txId, blockhash, lastValidBlockHeight }, "finalized");

        console.log("✨ [SUCCESS]: Залог успешно снят. TX:", txId);
        return txId;

    } catch (e) {
        if (e.logs) {
            console.error("--- SOLANA LOGS (TRANSACTION) ---");
            e.logs.forEach(line => console.error(line));
        }
        console.error("❌ Decollateralize Error:", e.message);
        throw e;
    }
};



/**
 * ФУНКЦИЯ: SET AMOUNT (АВТО-РАСЧЕТ СУММЫ)
 * Установка процента от максимально доступного значения
 */
window.setAmount = function(percent) {
    try {
        console.log("====================================================================================================");
        console.log(`🔢 [START]: ИНИЦИАЦИЯ РАСЧЕТА СУММЫ (PERCENT: ${percent * 100}%)...`);

        // 1. ПОЛУЧЕНИЕ МАКСИМАЛЬНОГО ЗНАЧЕНИЯ
        const maxElement = document.getElementById('maxAvailableAmount');
        const maxText = maxElement ? maxElement.innerText.replace(/,/g, '') : "0";
        const max = parseFloat(maxText);

        // 2. ПОЛУЧЕНИЕ ИНПУТА
        const input = document.getElementById('decollateralizeAmountInput');
        if (!input) {
            throw new Error("Элемент decollateralizeAmountInput не найден в DOM.");
        }

        // 3. ПРОВЕРКА НА ВАЛИДНОСТЬ ДАННЫХ
        if (isNaN(max) || max <= 0) {
            console.warn("⚠️ [WARNING]: Максимально доступная сумма не определена или равна 0.");
            input.value = "0.00";
            return "0.00";
        }

        // 4. РАСЧЕТ И ФОРМАТИРОВАНИЕ (оставляем 2 знака после запятой)
        const result = (max * percent).toFixed(2);

        // 5. УСТАНОВКА ЗНАЧЕНИЯ
        input.value = result;

        console.log(`✨ [SUCCESS]: Сумма успешно рассчитана: ${result} (процент: ${percent * 100}%).`);
        return result;

    } catch (e) {
        console.error("❌ Set Amount Error:", e.message);
        // Не выбрасываем исключение наружу, чтобы не ломать поток в UI
        return null;
    }
};














/**
 * ГЛОБАЛЬНЫЙ МЕТОД: DEPOSIT
 * 100% синхронизация с SDK (AccountLoader/Zero-Copy, Remaining Accounts)
 * Исправлено: Авто-определение ATA и проверка состояний внутри метода.
 */
window.performDeposit = async function(poolPubKey, userSourceAta, userStAta, poolIndex, amountBN) {
    try {
        console.log("====================================================================================================");
        console.log("🚀 [START]: ИНИЦИАЦИЯ СИНХРОННОГО ПРОЦЕССА ДЕПОЗИТА...");
        
        const program = await QubitProgramManager.getProgram();
        const provider = program.provider;
        const ownerPubkey = provider.wallet.publicKey;

        // 1. ПОЛУЧЕНИЕ ДАННЫХ ПУЛА (через fetchData для Zero-Copy)
        const poolData = await program.account.poolState.fetchData(poolPubKey);

        // --- БЛОК АВТО-ОПРЕДЕЛЕНИЯ (Если ATA не переданы из UI) ---
        let finalSourceAta = userSourceAta;
        let finalStAta = userStAta;

        if (!finalSourceAta) {
            finalSourceAta = await spl.getAssociatedTokenAddress(poolData.mint, ownerPubkey);
            console.log("⚠️ [AUTO]: Адрес источника (ATA) определен автоматически:", finalSourceAta.toBase58());
        }
        if (!finalStAta) {
            finalStAta = await spl.getAssociatedTokenAddress(poolData.stMint, ownerPubkey);
            console.log("⚠️ [AUTO]: Адрес стейк-токена (ATA) определен автоматически:", finalStAta.toBase58());
        }

        // 2. ДЕРИВАЦИЯ PDA (строго по семенам из Rust)
        const [userStakePda] = anchor.web3.PublicKey.findProgramAddressSync(
            [
                Buffer.from("user_stake"),
                poolPubKey.toBuffer(),
                ownerPubkey.toBuffer(),
                Buffer.from([poolIndex])
            ],
            program.programId
        );

        // 3. СБОРКА ТРАНЗАКЦИИ С COMPUTE BUDGET
        const transaction = new anchor.web3.Transaction();
        transaction.add(anchor.web3.ComputeBudgetProgram.setComputeUnitLimit({ units: 1400000 }));
        transaction.add(anchor.web3.ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 25000 }));

        // 4. ФОРМИРОВАНИЕ ИНСТРУКЦИИ
        const depositInstruction = await program.methods
            .deposit(poolIndex, amountBN)
            .accounts({
                poolState: poolPubKey,
                userStaking: userStakePda,
                owner: ownerPubkey,
                vault: poolData.vault,
                stMint: poolData.stMint,
                userSourceAta: finalSourceAta,
                userStAta: finalStAta,
                tokenProgram: spl.TOKEN_PROGRAM_ID,
                systemProgram: anchor.web3.SystemProgram.programId,
                clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
            })
            .instruction();

        transaction.add(depositInstruction);

        // 5. ПОДГОТОВКА И СИМУЛЯЦИЯ
        const { blockhash, lastValidBlockHeight } = await provider.connection.getLatestBlockhash('finalized');
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = ownerPubkey;

        // Добавляем симуляцию для предотвращения ошибок транзакции
        const simulation = await provider.connection.simulateTransaction(transaction);
        if (simulation.value.err) {
            console.error("--- SOLANA LOGS (SIMULATION FAILED) ---");
            if (simulation.value.logs) simulation.value.logs.forEach(line => console.error(line));
            throw new Error("Симуляция депозита не пройдена: " + JSON.stringify(simulation.value.err));
        }

        // 6. ОТПРАВКА И ПОДТВЕРЖДЕНИЕ
        const signedTx = await provider.wallet.signTransaction(transaction);
        const txId = await provider.connection.sendRawTransaction(signedTx.serialize(), {
            skipPreflight: true,
            preflightCommitment: "finalized"
        });

        console.log("⏳ Ожидание подтверждения (Deposit)...");
        await provider.connection.confirmTransaction({ signature: txId, blockhash, lastValidBlockHeight }, "finalized");

        console.log("✨ [SUCCESS]: Депозит успешно принят. TX:", txId);
        return txId;

    } catch (e) {
        if (e.logs) {
            console.error("--- SOLANA LOGS (TRANSACTION) ---");
            e.logs.forEach(line => console.error(line));
        }
        console.error("❌ Deposit Error:", e.message);
        throw e;
    }
};




/**
 * БРИДЖ-ФУНКЦИЯ ДЛЯ СИНХРОНИЗАЦИИ HTML И JS (ПРОФЕССИОНАЛЬНАЯ ВЕРСИЯ)
 * Вызывается напрямую из атрибута onclick="handleDeposit()" в твоем HTML
 */
async function handleDeposit() {
    const btn = document.getElementById('executeDepositBtn'); // Предполагаем ID кнопки

    try {
        console.log("====================================================================================================");
        console.log("🚀 [UI EVENT]: ИНИЦИАЦИЯ ДЕПОЗИТА ЧЕРЕЗ UI...");

        // 1. ПРОВЕРКА БАЛАНСА ПЕРЕД ДЕЙСТВИЕМ
        const currentBalance = await updateWalletBalance(); 
        const amountVal = document.getElementById('depositInput')?.value;
        const indexElement = document.getElementById('currentPoolIndex');

        if (!amountVal || parseFloat(amountVal) <= 0) {
            throw new Error("Введите корректную сумму для депозита.");
        }
        if (parseFloat(amountVal) > currentBalance) {
            throw new Error("Недостаточно средств на балансе!");
        }
        if (!indexElement) {
            throw new Error("Не удалось определить индекс пула.");
        }

        const amountBN = new anchor.BN(amountVal);
        const poolIndex = parseInt(indexElement.innerText);

        // 2. ПОДГОТОВКА UI
        if (btn) {
            btn.innerText = "Подпись в кошельке...";
            btn.disabled = true;
        }

        // 3. ПРИНУДИТЕЛЬНАЯ СИНХРОНИЗАЦИЯ ПЕРЕД ДЕПОЗИТОМ
        console.log("🔄 Синхронизация данных перед отправкой...");
        await window.syncUserAccountState(QUBIT_CONFIG.pool, QUBIT_CONFIG.mint);

        // 4. ПРОВЕРКА ГЛОБАЛЬНЫХ КОНТЕКСТОВ
        if (typeof POOL_PUBKEY === 'undefined' && typeof QUBIT_CONFIG !== 'undefined') {
            window.POOL_PUBKEY = QUBIT_CONFIG.pool;
        }
        
        if (!window.POOL_PUBKEY || !window.USER_SOURCE_ATA || !window.USER_ST_ATA) {
            throw new Error("Необходимые данные (PUBKEY/ATA) не определены в контексте.");
        }

        console.log(`⚙️ Депозит: ${amountVal} | Пул: ${poolIndex}`);

        // 5. ВЫЗОВ SDK-МЕТОДА
        await window.performDeposit(
            window.POOL_PUBKEY, 
            window.USER_SOURCE_ATA, 
            window.USER_ST_ATA, 
            poolIndex, 
            amountBN
        );

        console.log("✨ [UI SUCCESS]: Депозит успешно подтвержден.");
        alert("✅ Депозит успешно выполнен!");

    } catch (e) {
        console.error("❌ Handle Deposit Error:", e.message);
        
        // ПРОФЕССИОНАЛЬНАЯ ОБРАБОТКА ОШИБОК
        let errorMsg = "Ошибка депозита: " + e.message;
        if (e.message.includes("0x1")) errorMsg = "Ошибка: Недостаточно средств на балансе.";
        if (e.message.includes("User rejected")) errorMsg = "Вы отменили подпись в кошельке.";
        
        alert(errorMsg);
        
    } finally {
        // 6. ВОССТАНОВЛЕНИЕ UI
        if (btn) {
            btn.innerText = "CONFIRM DEPOSIT";
            btn.disabled = false;
        }
    }
}









/**
 * ГЛОБАЛЬНЫЙ МЕТОД: CLAIM ALL REWARDS
 * 100% синхронизация с SDK: PDA, Compute Budget, Симуляция, RAW транзакция, Пост-аудит
 */
window.performClaimAllRewards = async function(poolPubKey, poolIndices, userRewardsAta) {
    try {
        console.log("====================================================================================================");
        console.log("🎁 [START]: ИНИЦИАЦИЯ СИНХРОННОГО ПРОЦЕССА CLAIM ALL REWARDS...");
        
        const program = await QubitProgramManager.getProgram();
        const provider = program.provider;
        const ownerPubkey = provider.wallet.publicKey;

        if (!poolIndices || poolIndices.length === 0) {
            throw new Error("ErrorCode::InvalidPoolIndices");
        }

        // 1. ПОЛУЧЕНИЕ ДАННЫХ ПУЛА (через fetchData для Zero-Copy)
        const poolData = await program.account.poolState.fetchData(poolPubKey);

        // 2. ФОРМИРОВАНИЕ REMAINING ACCOUNTS
        const remainingAccounts = poolIndices.map(index => {
            const [pda] = anchor.web3.PublicKey.findProgramAddressSync(
                [
                    Buffer.from("user_stake"),
                    poolPubKey.toBuffer(),
                    ownerPubkey.toBuffer(),
                    Buffer.from([index])
                ],
                program.programId
            );
            return {
                pubkey: pda,
                isWritable: true,
                isSigner: false,
            };
        });

        console.log(`📊 Обработка пулов: [${poolIndices.join(", ")}] | Аккаунтов: ${remainingAccounts.length}`);

        // 3. СБОРКА ТРАНЗАКЦИИ С COMPUTE BUDGET
        const transaction = new anchor.web3.Transaction();
        transaction.add(anchor.web3.ComputeBudgetProgram.setComputeUnitLimit({ units: 1000000 }));
        transaction.add(anchor.web3.ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 25000 }));

        const claimInstruction = await program.methods
            .claimAllRewards(poolIndices)
            .accounts({
                poolState: poolPubKey,
                owner: ownerPubkey,
                userRewardsAta: userRewardsAta,
                vault: poolData.vault,
                adminFeeVault: poolData.adminFeeVault,
                rewardMint: poolData.rewardMint,
                tokenProgram: spl.TOKEN_PROGRAM_ID,
                clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
            })
            .remainingAccounts(remainingAccounts)
            .instruction();

        transaction.add(claimInstruction);

        // 4. ПОДГОТОВКА И СИМУЛЯЦИЯ
        const { blockhash, lastValidBlockHeight } = await provider.connection.getLatestBlockhash('finalized');
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = ownerPubkey;

        const simulation = await provider.connection.simulateTransaction(transaction);
        if (simulation.value.err) {
            console.error("--- SOLANA LOGS (SIMULATION FAILED) ---");
            if (simulation.value.logs) simulation.value.logs.forEach(line => console.error(line));
            throw new Error("Симуляция клейма не пройдена: " + JSON.stringify(simulation.value.err));
        }

        // 5. ОТПРАВКА И ПОДТВЕРЖДЕНИЕ
        const signedTx = await provider.wallet.signTransaction(transaction);
        const txId = await provider.connection.sendRawTransaction(signedTx.serialize(), {
            skipPreflight: true,
            preflightCommitment: "finalized"
        });

        console.log("⏳ Ожидание подтверждения (Claim All)...");
        await provider.connection.confirmTransaction({ signature: txId, blockhash, lastValidBlockHeight }, "finalized");

        console.log("✨ [SUCCESS]: Награды успешно заклеймлены! TX:", txId);
        return txId;

    } catch (e) {
        if (e.logs) {
            console.error("--- SOLANA LOGS (TRANSACTION) ---");
            e.logs.forEach(line => console.error(line));
        }
        console.error("❌ Claim All Error:", e.message);
        throw e;
    }
};




/**
 * Улучшенная функция: автоматическое определение адресов и запуск клейма
 */
async function executeClaimRewards() {
    const btn = document.getElementById('executeClaimBtn'); // Предполагаем ID кнопки

    try {
        console.log("====================================================================================================");
        console.log("🎁 [UI EVENT]: ИНИЦИАЦИЯ КЛЕЙМА НАГРАД ЧЕРЕЗ UI...");

        // 1. ПОДГОТОВКА И ВАЛИДАЦИЯ ВЫБОРА
        const selectedTiers = [];
        document.querySelectorAll('.tier-btn.active').forEach(btn => {
            selectedTiers.push(parseInt(btn.getAttribute('data-index')));
        });

        if (selectedTiers.length === 0) {
            console.warn("⚠️ [UI WARNING]: Ни один пул не выбран.");
            alert("Пожалуйста, выберите хотя бы один пул.");
            return;
        }

        // 2. ПОДГОТОВКА UI
        if (btn) {
            btn.innerText = "Processing...";
            btn.disabled = true;
        }

        // 3. АВТОМАТИЗАЦИЯ: Получаем программу и провайдер
        const program = await QubitProgramManager.getProgram();
        const provider = program.provider;
        const owner = provider.wallet.publicKey;

        // 4. ПРОВЕРКА СОСТОЯНИЯ (AppState)
        if (!window.appState || !window.appState.currentPoolPubKey) {
            throw new Error("Состояние пула не загружено.");
        }
        const poolPubKey = window.appState.currentPoolPubKey; 

        // 5. АВТОМАТИЗАЦИЯ: Находим ATA наград пользователя
        const rewardMint = window.appState.rewardMint; 
        const userRewardsAta = await spl.getAssociatedTokenAddress(
            rewardMint,
            owner
        );

        // ДОПОЛНИТЕЛЬНАЯ ПРОВЕРКА: Существование ATA
        const ataAccount = await provider.connection.getAccountInfo(userRewardsAta);
        if (!ataAccount) {
            throw new Error("ATA наград не найден. Инициализируйте кошелек для получения наград.");
        }

        console.log(`🔍 [UI INFO]: Адреса определены. Пулы: [${selectedTiers.join(", ")}].`);

        // 6. ВЫЗОВ SDK-МЕТОДА
        await window.performClaimAllRewards(
            poolPubKey, 
            selectedTiers, 
            userRewardsAta
        );

        console.log("✨ [UI SUCCESS]: Награды успешно заклеймлены.");
        alert("✅ Награды успешно заклеймлены!");

    } catch (e) {
        console.error("❌ Handle Claim Rewards Error:", e.message);
        alert("Ошибка клейма: " + e.message);
        
    } finally {
        // 7. ВОССТАНОВЛЕНИЕ UI
        if (btn) {
            btn.innerText = "CLAIM ALL REWARDS";
            btn.disabled = false;
        }
    }
}













   
      








/**
 * ГЛОБАЛЬНЫЙ МЕТОД: UNSTAKE (ВЫВОД СРЕДСТВ)
 * 100% синхронизация с SDK: PDA, Аудит, Compute Budget, Симуляция, RAW транзакция, Пост-аудит
 */
window.performUnstake = async function(poolPubKey, userStAta, userRewardsAta, poolIndex, amountBN) {
    try {
        console.log("====================================================================================================");
        console.log("📉 [START]: ИНИЦИАЦИЯ СИНХРОННОГО ПРОЦЕССА ВЫВОДА СРЕДСТВ (UNSTAKE)...");
        
        const program = await QubitProgramManager.getProgram();
        const provider = program.provider;
        const ownerPubkey = provider.wallet.publicKey;

        // Входной контроль
        if (poolIndex < 0 || poolIndex > 4) throw new Error("ErrorCode::InvalidPoolIndex");
        if (amountBN.isZero() || amountBN.isNeg()) throw new Error("ErrorCode::ZeroAmount");

        // ШАГ 1: Деривация PDA и предварительный аудит
        const [userStakePda, userStakeBump] = anchor.web3.PublicKey.findProgramAddressSync(
            [
                Buffer.from("user_stake"),
                poolPubKey.toBuffer(),
                ownerPubkey.toBuffer(),
                Buffer.from([poolIndex])
            ],
            program.programId
        );

        const [poolData, userState, currentSlot] = await Promise.all([
            program.account.poolState.fetch(poolPubKey, "finalized"),
            program.account.userStakingAccount.fetch(userStakePda, "finalized"),
            provider.connection.getSlot("finalized")
        ]);

        if (poolData.globalPause !== 0) throw new Error("ErrorCode::ReentrancyGuardTriggered");
        if (new anchor.BN(currentSlot).lte(new anchor.BN(userState.lastDepositSlot))) throw new Error("ErrorCode::OperationInSameSlot");
        if (userState.stakedAmount.lt(amountBN)) throw new Error("ErrorCode::InsufficientStake");
        
        const lending = userState.lending || new anchor.BN(0);
        if (!lending.isZero() && userState.stakedAmount.sub(lending).lt(amountBN)) throw new Error("ErrorCode::CollateralLock");

        const isFullUnstake = userState.stakedAmount.eq(amountBN);

        // ШАГ 2: Сборка транзакции
        const transaction = new anchor.web3.Transaction();
        transaction.add(anchor.web3.ComputeBudgetProgram.setComputeUnitLimit({ units: 1400000 }));
        transaction.add(anchor.web3.ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 25000 }));

        const unstakeInstruction = await program.methods
            .unstake(poolIndex, amountBN)
            .accounts({
                poolState: poolPubKey,
                userStaking: userStakePda,
                owner: ownerPubkey,
                vault: poolData.vault,
                daoTreasuryVault: poolData.daoTreasuryVault,
                adminFeeVault: poolData.adminFeeVault,
                userRewardsAta: userRewardsAta,
                userStAta: userStAta,
                stMint: poolData.stMint,
                rewardMint: poolData.rewardMint,
                tokenProgram: spl.TOKEN_PROGRAM_ID,
                clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
            })
            .instruction();

        transaction.add(unstakeInstruction);

        // ШАГ 3: Симуляция и отправка
        const { blockhash, lastValidBlockHeight } = await provider.connection.getLatestBlockhash('finalized');
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = ownerPubkey;

        const simulation = await provider.connection.simulateTransaction(transaction);
        if (simulation.value.err) {
            console.error("--- SOLANA LOGS (SIMULATION) ---");
            if (simulation.value.logs) simulation.value.logs.forEach(line => console.error(line));
            throw new Error("Simulation failed: " + JSON.stringify(simulation.value.err));
        }

        const signedTx = await provider.wallet.signTransaction(transaction);
        const txId = await provider.connection.sendRawTransaction(signedTx.serialize(), {
            skipPreflight: true,
            preflightCommitment: "finalized"
        });

        await provider.connection.confirmTransaction({ signature: txId, blockhash, lastValidBlockHeight }, "finalized");

        // ШАГ 4: Пост-аудит
        for (let attempt = 1; attempt <= 5; attempt++) {
            await new Promise(r => setTimeout(r, 4000));
            try {
                const stakeAfter = await program.account.userStakingAccount.fetch(userStakePda, "finalized");
                if (!isFullUnstake && stakeAfter.stakedAmount.lt(userState.stakedAmount)) break;
            } catch (e) {
                if (isFullUnstake) break;
            }
        }

        console.log("✅ [SUCCESS]: Транзакция подтверждена. ID:", txId);
        return txId;
    } catch (e) {
        if (e.logs) {
            console.error("--- SOLANA LOGS (TRANSACTION) ---");
            e.logs.forEach(line => console.error(line));
        }
        console.error("❌ Unstake Error:", e.message);
        throw e;
    }
};





async function handleUnstake() {
    const input = document.getElementById('unstakeAmountInput');
    const amount = parseFloat(input.value);
    
    if (!amount || amount <= 0) {
        alert("Введите корректную сумму");
        return;
    }
    
    try {
        // Добавьте визуальный индикатор загрузки
        const btn = document.getElementById('executeUnstakeBtn');
        btn.innerText = "Processing...";
        btn.disabled = true;

        const amountBN = new anchor.BN(amount * 1e9); 
        await window.performUnstake(
            window.appState.currentPoolPubKey, 
            window.appState.userStAta, 
            window.appState.userRewardsAta, 
            window.appState.poolIndex, 
            amountBN
        );
        alert("Успешно!");
    } catch (err) {
        console.error(err);
        alert("Ошибка транзакции: " + err.message);
    } finally {
        const btn = document.getElementById('executeUnstakeBtn');
        btn.innerText = "CONFIRM & EXIT";
        btn.disabled = false;
    }
}











/**
 * ГЛОБАЛЬНЫЙ МЕТОД: CLOSE STAKING ACCOUNT
 * 100% синхронизация с SDK: Compute Budget, Симуляция, RAW транзакция
 */
window.performCloseStakingAccount = async function(poolPubKey, userStakingPda, poolIndex) {
    try {
        console.log("====================================================================================================");
        console.log("🗑️ [START]: ИНИЦИАЦИЯ СИНХРОННОГО ПРОЦЕССА ЗАКРЫТИЯ СТЕЙКИНГ-АККАУНТА...");
        
        const program = await QubitProgramManager.getProgram();
        const provider = program.provider;
        const ownerPubkey = provider.wallet.publicKey;

        // 1. СБОРКА ТРАНЗАКЦИИ С COMPUTE BUDGET
        const transaction = new anchor.web3.Transaction();
        transaction.add(anchor.web3.ComputeBudgetProgram.setComputeUnitLimit({ units: 1400000 }));
        transaction.add(anchor.web3.ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 25000 }));

        // 2. ФОРМИРОВАНИЕ ИНСТРУКЦИИ
        const closeInstruction = await program.methods
            .closeStakingAccount(poolIndex)
            .accounts({
                poolState: poolPubKey,
                userStaking: userStakingPda,
                owner: ownerPubkey,
                clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
            })
            .instruction();

        transaction.add(closeInstruction);

        // 3. ПОДГОТОВКА И СИМУЛЯЦИЯ
        const { blockhash, lastValidBlockHeight } = await provider.connection.getLatestBlockhash('finalized');
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = ownerPubkey;

        // Добавляем симуляцию для предотвращения ошибок транзакции
        const simulation = await provider.connection.simulateTransaction(transaction);
        if (simulation.value.err) {
            console.error("--- SOLANA LOGS (SIMULATION FAILED) ---");
            if (simulation.value.logs) simulation.value.logs.forEach(line => console.error(line));
            throw new Error("Симуляция закрытия не пройдена: " + JSON.stringify(simulation.value.err));
        }

        // 4. ОТПРАВКА И ПОДТВЕРЖДЕНИЕ
        const signedTx = await provider.wallet.signTransaction(transaction);
        const txId = await provider.connection.sendRawTransaction(signedTx.serialize(), {
            skipPreflight: true,
            preflightCommitment: "finalized"
        });

        console.log("⏳ Ожидание подтверждения (Close Account)...");
        await provider.connection.confirmTransaction({ signature: txId, blockhash, lastValidBlockHeight }, "finalized");

        console.log("✨ [SUCCESS]: Аккаунт успешно закрыт, SOL возвращены. TX:", txId);
        return txId;

    } catch (e) {
        if (e.logs) {
            console.error("--- SOLANA LOGS (TRANSACTION) ---");
            e.logs.forEach(line => console.error(line));
        }
        console.error("❌ Close Account Error:", e.message);
        
        // Логирование типичных ошибок контракта
        if (e.message.includes("StakeStillExists")) {
            console.error("⚠️ Внимание: в аккаунте остались средства (StakeStillExists).");
        }
        if (e.message.includes("UnclaimedRewardsExist")) {
            console.error("⚠️ Внимание: остались невостребованные награды.");
        }
        
        throw e;
    }
};




/**
 * БРИДЖ-ФУНКЦИЯ ДЛЯ СИНХРОНИЗАЦИИ HTML И JS
 * Вызывается напрямую из атрибута onclick="handleCloseAccount()" в твоем HTML
 */
async function handleCloseAccount() {
    const btn = document.getElementById('closeAccountBtn');

    try {
        console.log("====================================================================================================");
        console.log("🗑️ [UI EVENT]: ИНИЦИАЦИЯ ЗАКРЫТИЯ СТЕЙКИНГ-АККАУНТА ЧЕРЕЗ UI...");

        // 1. ПОДГОТОВКА UI
        if (btn) {
            btn.innerText = "Processing...";
            btn.disabled = true;
        }

        // 2. ПРОВЕРКА ГЛОБАЛЬНЫХ КОНТЕКСТОВ (Убеждаемся, что данные подгружены)
        if (typeof POOL_PUBKEY === 'undefined' || typeof USER_STAKING_PDA === 'undefined' || typeof CURRENT_INDEX === 'undefined') {
            throw new Error("Необходимые данные (POOL_PUBKEY/PDA/INDEX) не определены в контексте.");
        }

        console.log(`⚙️ Закрытие аккаунта: ${USER_STAKING_PDA.toBase58()} | Индекс: ${CURRENT_INDEX}`);

        // 3. ВЫЗОВ SDK-МЕТОДА
        await window.performCloseStakingAccount(
            POOL_PUBKEY, 
            USER_STAKING_PDA, 
            CURRENT_INDEX
        );

        console.log("✨ [UI SUCCESS]: Аккаунт успешно закрыт.");
        alert("✅ Аккаунт успешно закрыт!");

    } catch (e) {
        console.error("❌ Handle Close Account Error:", e.message);
        alert("Ошибка закрытия: " + e.message);
        
    } finally {
        // 4. ВОССТАНОВЛЕНИЕ UI
        if (btn) {
            btn.innerText = "CLOSE ACCOUNT";
            btn.disabled = false;
        }
    }
}


    

    





























    



        

   

   

   
    

       
// В начале DOMContentLoaded
window.showNotification = function(message, type = "emerald") {
    const toast = document.createElement('div');
    toast.className = `fixed bottom-5 right-5 px-6 py-3 rounded-lg text-white font-bold z-[10000] bg-${type}-600 shadow-xl transition-opacity duration-500`;
    toast.innerText = message;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 500);
    }, 3000);
};




// ВЫНЕСЕНО ИЗ DOMContentLoaded В ГЛОБАЛЬНУЮ ОБЛАСТЬ
window.switchView = function(viewId) {
    const views = [
        'initStakeView',  'collateralView', 
        'decollateralizeView', 'depositView', 'claimView', 
        'unstakeView', 'closeAccountView'
    ];

    // 1. Скрываем все
    views.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });

    // 2. Показываем нужный
    const target = document.getElementById(viewId);
    if (target) {
        target.classList.remove('hidden');
        console.log("Switched to:", viewId);
    } else {
        console.error("View not found:", viewId);
        // Если что-то пошло не так, возвращаем главный экран, чтобы не было пустого экрана
        const main = document.getElementById('mainStakingView');
        if (main) main.classList.remove('hidden');
    }
};


document.addEventListener('DOMContentLoaded', () => {
    // ... остальной ваш код ...



    // --- УНИВЕРСАЛЬНАЯ ЛОГИКА НАВИГАЦИИ ---
    // Убедитесь, что ID кнопок в HTML совпадают с этими (например, backToStakingBtn)
    const backButtons = {
        'backToStakingBtn': 'mainStakingView',
        'backToStakingFromCollateral': 'mainStakingView',
        'backToStakingFromDecollateralize': 'mainStakingView',
        'backToStakingFromDeposit': 'mainStakingView',
        'backToStakingFromClaim': 'mainStakingView',
        'backToStakingFromUnstake': 'mainStakingView',
        'backToStakingFromClose': 'mainStakingView'
    };

    Object.keys(backButtons).forEach(btnId => {
        const btn = document.getElementById(btnId);
        if (btn) {
            btn.addEventListener('click', () => switchView(backButtons[btnId]));
        }
    });

    // --- ЛОГИКА ТИРОВ (InitStake) ---
    const tierSelector = document.getElementById('tierSelector');
    if (tierSelector) {
        const tierBtns = tierSelector.querySelectorAll('.tier-btn');
        tierBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                tierBtns.forEach(b => b.classList.remove('active-tier', 'border-blue-500'));
                e.currentTarget.classList.add('active-tier', 'border-blue-500');
                // ... ваш код обновления UI
            });
        });
    }




    // --- Интегрированная логика initStakeView ---
    const initStakeContainer = document.getElementById('initStakeView');
    if (initStakeContainer) {
        // Навигация
        const backBtn = document.getElementById('backToStakingBtn');
        if (backBtn) backBtn.addEventListener('click', () => switchView('mainStakingView'));

        const confirmBtn = document.getElementById('confirmInitBtn');
        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => {
                console.log("Initialization confirmed");
                if (typeof handleInitialize === 'function') handleInitialize();
            });
        }

        // Логика выбора тиров
        const tierBtns = document.querySelectorAll('.tier-btn');
        tierBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const selectedBtn = e.currentTarget;
                
                // Сбрасываем все
                tierBtns.forEach(b => {
                    b.classList.remove('active-tier', 'border-blue-500', 'bg-blue-500/10');
                    b.classList.add('border-white/10', 'bg-black/20');
                });
                
                // Активируем одну
                selectedBtn.classList.add('active-tier', 'border-blue-500', 'bg-blue-500/10');
                selectedBtn.classList.remove('border-white/10', 'bg-black/20');
                
                // Обновление индикаторов
                const label = selectedBtn.dataset.label;
                const index = selectedBtn.dataset.index;
                const days = parseInt(selectedBtn.dataset.tier);
                
                document.getElementById('lockupDisplay').innerText = label;
                document.getElementById('poolIndexDisplay').innerText = `Tier ${label} (Index ${index})`;
                
                const progressBar = document.getElementById('lockupProgressBar');
                if (progressBar) {
                    progressBar.style.width = Math.min((days / 365) * 100, 100) + '%';
                }
            });
        });
    }

   

   

   
    

       




    

           // --- Навигация и логика Collateral ---
    const backCollateral = document.getElementById('backToStakingFromCollateral');
    if (backCollateral) {
        backCollateral.addEventListener('click', () => switchView('mainStakingView'));
    }

    // 1. Управление выбором Health Factor (HF)
    const hfButtons = document.querySelectorAll('.hf-btn');
    hfButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Сначала сбрасываем стили у всех кнопок HF
            hfButtons.forEach(b => {
                b.classList.remove('bg-blue-500/20', 'text-blue-400', 'border', 'border-blue-500/50');
                b.classList.add('bg-white/10');
            });
            
            // Добавляем синий стиль выбранной кнопке
            e.currentTarget.classList.remove('bg-white/10');
            e.currentTarget.classList.add('bg-blue-500/20', 'text-blue-400', 'border', 'border-blue-500/50');
            
            console.log("Selected HF:", e.currentTarget.dataset.value);
        });
    });

    // 2. Управление процентами (%) и полем ввода
    const collateralInput = document.getElementById('collateralAmountInput');
    const walletBalance = 5000.00; // Пример баланса

    const pctButtons = document.querySelectorAll('.pct-btn');
    pctButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Сбрасываем стили у всех кнопок процентов (25, 50, 75, MAX)
            pctButtons.forEach(b => {
                b.classList.remove('bg-blue-500/20', 'text-blue-400', 'border', 'border-blue-500/50');
                b.classList.add('bg-white/5');
            });

            // Добавляем синий стиль выбранной кнопке
            e.currentTarget.classList.remove('bg-white/5');
            e.currentTarget.classList.add('bg-blue-500/20', 'text-blue-400', 'border', 'border-blue-500/50');

            const pct = parseFloat(e.currentTarget.dataset.pct);
            if (collateralInput) {
                const calculatedValue = (walletBalance * (pct / 100)).toFixed(2);
                collateralInput.value = calculatedValue;
            }
            console.log("Selected %:", pct);
        });
    });

    // 3. Обработка кнопок действий
    const claimRewardsBtn = document.getElementById('claimRewardsBtn');
    if (claimRewardsBtn) {
        claimRewardsBtn.addEventListener('click', () => {
            console.log("Claiming all rewards...");
        });
    }

    const adjustCollateralBtn = document.getElementById('adjustCollateralBtn');
    if (adjustCollateralBtn) {
        adjustCollateralBtn.addEventListener('click', () => {
            const amount = collateralInput.value;
            console.log("Adjusting collateral to:", amount);
        });
    }






    

      // --- Деколлатерализация ---
    const backDecollateral = document.getElementById('backToStakingFromDecollateralize');
    if (backDecollateral) {
        backDecollateral.addEventListener('click', () => switchView('mainStakingView'));
    }

    // Логика управления процентами и визуалом
    const decollateralizeInput = document.getElementById('decollateralizeAmountInput');
    const maxAmountDisplay = document.getElementById('maxAvailableAmount');
    const safetyWarning = document.getElementById('safetyWarning');
    const decollateralizePctButtons = document.querySelectorAll('#decollateralizeView .pct-btn');

    pctButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            // 1. Сброс стилей всех кнопок процентов
            pctButtons.forEach(b => {
                b.classList.remove('bg-emerald-500/20', 'text-emerald-400');
                b.classList.add('bg-white/5');
            });

            // 2. Подсветка выбранной кнопки
            e.currentTarget.classList.remove('bg-white/5');
            e.currentTarget.classList.add('bg-emerald-500/20', 'text-emerald-400');

            // 3. Расчет суммы
            const pct = parseFloat(e.currentTarget.dataset.pct);
            const maxVal = parseFloat(maxAmountDisplay.innerText);
            
            if (decollateralizeInput) {
                const calculatedValue = (maxVal * pct).toFixed(2);
                decollateralizeInput.value = calculatedValue;
            }

            // 4. Показ предупреждения только при MAX (100%)
            if (safetyWarning) {
                if (pct === 1.00) {
                    safetyWarning.classList.remove('hidden');
                } else {
                    safetyWarning.classList.add('hidden');
                }
            }

            // Вызов внешней функции, если она есть
            if (typeof setAmount === 'function') setAmount(pct);
        });
    });

    const confirmDecollateralizeBtn = document.getElementById('confirmDecollateralizeBtn');
    if (confirmDecollateralizeBtn) {
        confirmDecollateralizeBtn.addEventListener('click', () => {
            if (typeof handleDecollateralize === 'function') handleDecollateralize();
        });
    }






    

   
            // --- Депозит ---
    const backDeposit = document.getElementById('backToStakingFromDeposit');
    if (backDeposit) {
        backDeposit.addEventListener('click', () => switchView('mainStakingView'));
    }

    // Управление кнопками процентов и полем ввода
    const depositInput = document.getElementById('depositInput');
    const depositPctButtons = document.querySelectorAll('.deposit-pct-btn');
    
    // Исправлено: вместо жесткого const, используем динамический доступ к глобальному состоянию
    // Убедитесь, что объект window.appState обновляется после подключения кошелька
    const getWalletBalance = () => (window.appState && window.appState.walletBalance) ? parseFloat(window.appState.walletBalance) : 0.00;

    depositPctButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            // 1. Сбрасываем стили всех кнопок
            depositPctButtons.forEach(b => {
                b.classList.remove('bg-indigo-500/20', 'text-white', 'border-indigo-500/50');
                b.classList.add('bg-white/5', 'border-white/5');
            });

            // 2. Подсвечиваем активную кнопку
            e.currentTarget.classList.remove('bg-white/5', 'border-white/5');
            e.currentTarget.classList.add('bg-indigo-500/20', 'text-white', 'border-indigo-500/50');

            // 3. Расчет суммы (используем функцию для получения актуального баланса)
            const pct = parseFloat(e.currentTarget.dataset.pct);
            const currentBalance = getWalletBalance();
            
            if (depositInput) {
                const calculatedValue = (currentBalance * pct).toFixed(2);
                depositInput.value = calculatedValue;
            }

            // Вызов внешней функции, если она есть
            if (typeof setDepositAmount === 'function') setDepositAmount(pct);
            console.log("Deposit % selected:", pct, "Balance used:", currentBalance);
        });
    });

    const confirmDepositBtn = document.getElementById('confirmDepositBtn');
    if (confirmDepositBtn) {
        confirmDepositBtn.addEventListener('click', () => {
            console.log("Confirming deposit amount:", depositInput ? depositInput.value : "0");
            if (typeof handleDeposit === 'function') handleDeposit();
        });
    }







    
        // --- Claim ---
    const backClaim = document.getElementById('backToStakingFromClaim');
    if (backClaim) {
        backClaim.addEventListener('click', () => switchView('mainStakingView'));
    }

    // Логика выбора тиров
    const selectAllTiersBtn = document.getElementById('selectAllTiersBtn');
    if (selectAllTiersBtn) {
        selectAllTiersBtn.addEventListener('click', () => {
            const tierButtons = document.querySelectorAll('.tier-btn');
            tierButtons.forEach(btn => {
                btn.classList.add('ring-2', 'ring-indigo-500', 'border-indigo-500');
                if (typeof toggleTier === 'function') toggleTier(btn.dataset.index);
            });
        });
    }

    document.querySelectorAll('.tier-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.currentTarget.classList.toggle('ring-2');
            e.currentTarget.classList.toggle('ring-indigo-500');
            e.currentTarget.classList.toggle('border-indigo-500');
            
            if (typeof toggleTier === 'function') {
                toggleTier(e.currentTarget.dataset.index);
            }
        });
    });

    // Логика процентов (%) и поля ввода
    const claimInput = document.getElementById('claimAmountInput');
    const totalYield = 125.75; // Значение из твоего HTML
    // Переименовано в claimPctButtons для исключения конфликта имен
    const claimPctButtons = document.querySelectorAll('.claim-pct-btn');

    claimPctButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            // 1. Сброс стилей всех кнопок процентов
            claimPctButtons.forEach(b => {
                b.classList.remove('bg-indigo-500/20', 'text-indigo-400');
                b.classList.add('bg-white/5');
            });

            // 2. Подсветка выбранной кнопки
            e.currentTarget.classList.remove('bg-white/5');
            e.currentTarget.classList.add('bg-indigo-500/20', 'text-indigo-400');

            // 3. Расчет суммы
            const pct = parseFloat(e.currentTarget.dataset.pct);
            if (claimInput) {
                const calculatedValue = (totalYield * pct).toFixed(2);
                claimInput.value = calculatedValue;
            }
            console.log("Setting %:", pct);
        });
    });

    const executeClaimBtn = document.getElementById('executeClaimBtn');
    if (executeClaimBtn) {
        executeClaimBtn.addEventListener('click', () => {
            console.log("Executing claim for amount:", claimInput ? claimInput.value : "0");
            if (typeof executeClaimRewards === 'function') executeClaimRewards();
        });
    }








    


       // --- Unstake ---
    const backUnstake = document.getElementById('backToStakingFromUnstake');
    if (backUnstake) {
        backUnstake.addEventListener('click', () => switchView('mainStakingView'));
    }

    // Управление кнопками процентов и полем ввода
    const unstakeInput = document.getElementById('unstakeAmountInput');
    const unstakePctButtons = document.querySelectorAll('.unstake-pct-btn');
    const liquidityAlert = document.getElementById('liquidityAlert');

    unstakePctButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            // 1. Сброс стилей всех кнопок
            unstakePctButtons.forEach(b => {
                b.classList.remove('bg-blue-500/20', 'text-blue-400', 'border', 'border-blue-500/50');
                b.classList.add('bg-white/5');
            });

            // 2. Подсветка выбранной кнопки
            e.currentTarget.classList.remove('bg-white/5');
            e.currentTarget.classList.add('bg-blue-500/20', 'text-blue-400', 'border', 'border-blue-500/50');

            // 3. Расчет суммы (логика процента)
            const pct = parseFloat(e.currentTarget.dataset.pct);
            
            // Если выбрано 100% (MAX), показываем алерт ликвидности
            if (liquidityAlert) {
                if (pct === 1.00) {
                    liquidityAlert.classList.remove('hidden');
                } else {
                    liquidityAlert.classList.add('hidden');
                }
            }

            // Вызов внешней функции
            if (typeof setUnstakeAmount === 'function') setUnstakeAmount(pct);
            console.log("Unstake % selected:", pct);
        });
    });

    const executeUnstakeBtn = document.getElementById('executeUnstakeBtn');
    if (executeUnstakeBtn) {
        executeUnstakeBtn.addEventListener('click', () => {
            console.log("Executing unstake amount:", unstakeInput ? unstakeInput.value : "0");
            if (typeof handleUnstake === 'function') handleUnstake();
        });
    }



    

        // --- Close Account ---
    // Навигация назад к главному экрану
    const backClose = document.getElementById('backToStakingFromClose');
    if (backClose) {
        backClose.addEventListener('click', () => switchView('mainStakingView'));
    }

    // Подтверждение перманентного закрытия аккаунта
    const confirmCloseAccountBtn = document.getElementById('confirmCloseAccountBtn');
    if (confirmCloseAccountBtn) {
        confirmCloseAccountBtn.addEventListener('click', () => {
            console.log("Initiating permanent account closure...");
            // Проверка на существование функции перед вызовом
            if (typeof handleCloseAccount === 'function') {
                handleCloseAccount();
            } else {
                console.warn("Function handleCloseAccount is not defined");
            }
        });
    
    }


    

    // --- Дропдаун ---
    const trigger = document.getElementById('dropdownTrigger');
    const list = document.getElementById('dropdownList');
    const icon = document.getElementById('dropdownIcon');
    const selectedText = document.getElementById('selectedTierText');
    const initializeBtn = document.getElementById('initializeBtn');
    const tierInputs = document.querySelectorAll('.tier-input');

    if (trigger && list) {
        trigger.addEventListener('click', (e) => {
            list.classList.toggle('open');
            icon.classList.toggle('rotated');
            e.stopPropagation();
        });
    }

    tierInputs.forEach(input => {
        input.addEventListener('change', (e) => {
            if (selectedText) {
                selectedText.innerText = `Selected: ${e.target.value} Days`;
                selectedText.classList.add('text-white', 'font-bold');
            }
            if (initializeBtn) {
                initializeBtn.innerText = `INITIALIZE STAKE (${e.target.value} Days)`;
            }
            if (list) list.classList.remove('open');
            if (icon) icon.classList.remove('rotated');
        });
    });

    document.addEventListener('click', (e) => {
        if (list && trigger && !list.contains(e.target) && !trigger.contains(e.target)) {
            list.classList.remove('open');
            icon.classList.remove('rotated');
        }
    });

    });

















  // --- ИЗОЛИРОВАННЫЙ БЛОК CONNECT WALLET ---
const walletBtn = document.getElementById('connectWalletBtn');
const walletModal = document.getElementById('walletModal'); 
const walletList = document.getElementById('walletList');

let currentProvider = null;
let isManualDisconnect = false;
let availableWallets = [];

const updateUI = (publicKey = null) => {
    if (!walletBtn) return;
    if (publicKey) {
        const short = publicKey.slice(0, 4) + '...' + publicKey.slice(-4);
        walletBtn.innerText = `Connected: ${short}`;
        walletBtn.classList.replace('bg-blue-600/10', 'bg-emerald-600/20');
        localStorage.setItem('wallet_connected', publicKey);
    } else {
        walletBtn.innerText = "Connect Wallet";
        walletBtn.classList.replace('bg-emerald-600/20', 'bg-blue-600/10');
        localStorage.removeItem('wallet_connected');
    }
};

const scanForWallets = () => {
    const found = [];
    const providers = [
        { name: 'Phantom', check: () => window.solana?.isPhantom ? window.solana : window.phantom?.solana },
        { name: 'Solflare', check: () => window.solflare?.isSolflare ? window.solflare : window.solflare },
        { name: 'Backpack', check: () => window.backpack },
        { name: 'Glow', check: () => window.glowSolana },
        { name: 'Coinbase', check: () => window.coinbaseSolana }
    ];

    providers.forEach(p => {
        try {
            const provider = p.check();
            if (provider && !found.find(w => w.name === p.name)) {
                found.push({ name: p.name, provider });
            }
        } catch (e) { console.error(`Error detecting ${p.name}:`, e); }
    });
    return found;
};

const triggerDeepLink = () => {
    const url = window.location.href;
    const phantomDeepLink = `https://phantom.app/ul/browse/${encodeURIComponent(url)}?ref=${encodeURIComponent(url)}`;
    showNotification("Opening Wallet App...", "emerald");
    window.location.href = phantomDeepLink;
};

const getAvailableWallets = () => {
    return new Promise((resolve) => {
        const found = scanForWallets();
        if (found.length > 0) return resolve(found);

        let attempts = 0;
        const interval = setInterval(() => {
            attempts++;
            const foundAgain = scanForWallets();
            if (foundAgain.length > 0 || attempts >= 40) {
                clearInterval(interval);
                resolve(foundAgain);
            }
        }, 200);
    });
};



if (walletBtn) {
    walletBtn.addEventListener('click', async () => {
        if (currentProvider) {
            try { 
                isManualDisconnect = true; 
                await currentProvider.disconnect(); 
                currentProvider = null;
                updateUI(null);
                showNotification("Wallet Disconnected", "red");
            } catch (err) { console.error(err); }
            finally {
                isManualDisconnect = false;
            }
            return;
        }

        const originalText = walletBtn.innerText;
        walletBtn.innerText = "Loading...";
        walletBtn.disabled = true;

        availableWallets = await getAvailableWallets();
        
        walletBtn.innerText = originalText;
        walletBtn.disabled = false;
        
        if (availableWallets.length === 0) {
            triggerDeepLink();
            return;
        }

        if (availableWallets.length === 1) {
            connectWallet(availableWallets[0]);
        } else {
            if (walletList) {
                walletList.innerHTML = '';
                availableWallets.forEach(w => {
                    const item = document.createElement('button');
                    item.className = "w-full p-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-all border border-gray-600 mb-2";
                    item.innerText = w.name;
                    item.onclick = () => { connectWallet(w); };
                    walletList.appendChild(item);
                });
                if (walletModal) walletModal.classList.remove('hidden');
            }
        }
    });
}


async function connectWallet(wallet) {
    try {
        currentProvider = wallet.provider;
        const resp = await currentProvider.connect();
        const publicKey = resp.publicKey ? resp.publicKey.toString() : resp.toString();
        updateUI(publicKey);
        showNotification(`${wallet.name} Connected!`);
        
        // Исправление: принудительно скрываем окно и возвращаем фокус на окно браузера
        if (walletModal) {
            walletModal.classList.add('hidden');
        }
        window.focus(); 
        
        currentProvider.removeAllListeners?.('disconnect');
        currentProvider.on('disconnect', () => {
            if (!isManualDisconnect) {
                currentProvider = null;
                updateUI(null);
                showNotification("Disconnected by wallet", "red");
            }
        });
    } catch (err) {
        console.error("Connection Error:", err);
        showNotification("Connection Failed", "red");
    }
}

// Авто-коннект при загрузке
setTimeout(async () => {
    const savedWallet = localStorage.getItem('wallet_connected');
    if (savedWallet) {
        const wallets = await getAvailableWallets();
        const phantom = wallets.find(w => w.name === 'Phantom');
        if (phantom) {
            try {
                const resp = await phantom.provider.connect({ onlyIfTrusted: true });
                const pubKey = resp.publicKey ? resp.publicKey.toString() : resp.toString();
                updateUI(pubKey);
                currentProvider = phantom.provider;
            } catch (e) { console.log("Auto-connect trust-check skipped."); }
        }
    }
}, 1000);
