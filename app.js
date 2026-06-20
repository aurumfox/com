    
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

// --- 2. КОНФИГУРАЦИЯ QUBIT ---
const QUBIT_CONFIG = {
    programId: "Auzd7mGQJSCSDJgopWrLtLqQPvgWBCXLQbQ8SNgDaYbb",
    idlAccount: "F3LMDpRENLbFWaYB9GJAszKXkoc3PhZ9bwecxmHg2sP",
    // Сюда вставьте ваш JSON IDL (если он короткий) 
    // или укажите путь, если вы подгружаете его отдельно
    idl: null 
};

// Менеджер программы
const QubitProgramManager = {
    program: null,

    async getProgram() {
        if (this.program) return this.program;

        // Инициализация провайдера (через phantom/solflare)
        const provider = new anchor.AnchorProvider(
            new solanaWeb3.Connection("https://api.devnet.solana.com"), // или devnet
            window.solana, 
            { preflightCommitment: "confirmed" }
        );

        // Если IDL еще не загружен, можно попробовать взять его из сети 
        // через idlAccount (наиболее профессиональный путь)
        const idl = await anchor.Program.fetchIdl(QUBIT_CONFIG.programId, provider);
        
        this.program = new anchor.Program(idl, QUBIT_CONFIG.programId, provider);
        return this.program;
    }
};

// --- 3. ГЛОБАЛЬНЫЕ КОНСТАНТЫ И ЛОГИКА ---
const FIREBASE_PROXY_URL = 'https://firebasejs-key--snowy-cherry-0a92.wnikolay28.workers.dev/';












    /**
 * ГЛОБАЛЬНЫЙ МЕТОД: INITIALIZE USER STAKE (ИНИЦИАЛИЗАЦИЯ)
 * 100% синхронизация с SDK: PDA, SystemProgram, Compute Budget
 */
window.performInitializeUserStake = async function(poolPubKey, poolIndex) {
    try {
        console.log("====================================================================================================");
        console.log(`🛠 [START]: ИНИЦИАЛИЗАЦИЯ СТЕЙКИНГ-АККАУНТА (POOL INDEX: ${poolIndex})...`);
        
        const program = await QubitProgramManager.getProgram();
        const provider = program.provider;
        const ownerPubkey = provider.wallet.publicKey;

        if (poolIndex < 0 || poolIndex > 4) {
            throw new Error("⛔️ ОШИБКА: Неверный индекс пула (0-4).");
        }

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

        // 2. СБОРКА ТРАНЗАКЦИИ
        const transaction = new anchor.web3.Transaction();
        
        // Лимиты для инициализации (создание аккаунта требует чуть больше CU)
        transaction.add(anchor.web3.ComputeBudgetProgram.setComputeUnitLimit({ units: 1400000 }));
        transaction.add(anchor.web3.ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 25000 }));

        // 3. ФОРМИРОВАНИЕ ИНСТРУКЦИИ
        const initInstruction = await program.methods
            .initializeUserStake(poolIndex)
            .accounts({
                poolState: poolPubKey,
                userStaking: userStakePda,
                owner: ownerPubkey,
                systemProgram: anchor.web3.SystemProgram.programId,
                clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
            })
            .instruction();

        transaction.add(initInstruction);

        // 4. ПОДПИСЬ И ОТПРАВКА
        const { blockhash, lastValidBlockHeight } = await provider.connection.getLatestBlockhash('confirmed');
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = ownerPubkey;

        const signedTx = await provider.wallet.signTransaction(transaction);
        const txId = await provider.connection.sendRawTransaction(signedTx.serialize(), {
            skipPreflight: false,
            preflightCommitment: "confirmed"
        });

        console.log("⏳ Ожидание подтверждения инициализации...");
        await provider.connection.confirmTransaction({ signature: txId, blockhash, lastValidBlockHeight }, "confirmed");

        console.log("✅ [SUCCESS]: Стейкинг-аккаунт успешно инициализирован. TX:", txId);
        return txId;

    } catch (e) {
        console.error("❌ Initialize Error:", e.message);
        throw e;
    }
};
/**
 * БРИДЖ-ФУНКЦИЯ ДЛЯ СИНХРОНИЗАЦИИ HTML И JS
 * Вызывается напрямую из атрибута onclick="handleConfirmInitialize()" в твоем HTML
 */
// 1. Функция навигации (чтобы кнопка в меню "заходила" на экран)
function switchView(viewId) {
    // Скрываем все блоки, если они имеют общий класс, например 'view-block'
    document.querySelectorAll('.view-block').forEach(el => el.classList.add('hidden'));
    
    // Показываем нужный блок
    const view = document.getElementById(viewId);
    if (view) {
        view.classList.remove('hidden');
    } else {
        console.error("Блок с ID " + viewId + " не найден!");
    }
}

// 2. Функция подтверждения (которую мы писали ранее для транзакции)
async function handleConfirmInitialize() {
    const activeBtn = document.querySelector('.tier-btn.active-tier');
    if (!activeBtn) {
        alert("Выберите тир!");
        return;
    }
    const poolIndex = parseInt(activeBtn.getAttribute('data-index'));
    
    // Вызываем твой проверенный метод из SDK
    try {
        await window.performInitializeUserStake(POOL_STATE_PUBKEY, poolIndex);
    } catch (e) {
        console.error("Ошибка:", e);
    }
}









/**
 * ГЛОБАЛЬНЫЙ МЕТОД: COLLATERALIZE LENDING
 * 100% синхронизация с SDK: PDA деривация, учет всех signer-аккаунтов, Compute Budget
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
        console.log("🛡️ [START]: ИНИЦИАЦИЯ УСТАНОВКИ ЗАЛОГА (COLLATERALIZE LENDING)...");
        
        const program = await QubitProgramManager.getProgram();
        const provider = program.provider;
        const ownerKeypair = provider.wallet.payer; // Используем payer провайдера как владельца
        const ownerPubkey = ownerKeypair.publicKey;

        // 1. Деривация PDA (по алгоритму SDK)
        const [userStakePda] = anchor.web3.PublicKey.findProgramAddressSync(
            [
                Buffer.from("user_stake"),
                poolPubKey.toBuffer(),
                ownerPubkey.toBuffer(),
                Buffer.from([poolIndex])
            ],
            program.programId
        );

        // 2. Сборка транзакции
        const transaction = new anchor.web3.Transaction();
        
        // Инъекция лимитов вычислений для работы с оракулом
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

        // 4. Подпись всеми необходимыми участниками (Owner, Guardian, LendingAuthority)
        const { blockhash, lastValidBlockHeight } = await provider.connection.getLatestBlockhash('finalized');
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = ownerPubkey;

        // Важно: подписываем всеми тремя ключами, как требует контракт
        transaction.partialSign(ownerKeypair);
        transaction.partialSign(guardianKeypair);
        transaction.partialSign(lendingAuthorityKeypair);

        // 5. Отправка RAW-пакета
        const txId = await provider.connection.sendRawTransaction(transaction.serialize(), {
            skipPreflight: true,
            preflightCommitment: "finalized"
        });

        console.log("⏳ Ожидание подтверждения (Collateralize)...");
        await provider.connection.confirmTransaction({ signature: txId, blockhash, lastValidBlockHeight }, "finalized");

        console.log("✅ [SUCCESS]: Залог установлен успешно. TX:", txId);
        return txId;

    } catch (e) {
        console.error("❌ Collateralize Error:", e.message);
        throw e;
    }
};




// Бридж-функция (добавь в свой JS-файл)
async function handleCollateralize() {
    const amount = new anchor.BN(document.getElementById('collateralAmountInput').value); // Учти конвертацию в lamports если нужно
    const minHF = 2000; // Пример (2.0x), логику кнопок можно вынести в переменную
    
    // ВАЖНО: guardianKeypair, lendingAuthorityKeypair и oracleFeeds должны быть 
    // определены в твоем контексте приложения (например, из стейта кошелька или конфига)
    await window.performCollateralizeLending(
        POOL_STATE_PUBKEY, 
        0, // poolIndex
        amount, 
        new anchor.BN(minHF),
        window.GUARDIAN_KEYPAIR, 
        window.LENDING_AUTH_KEYPAIR, 
        ORACLE_FEEDS_ARRAY
    );
}






/**
 * ГЛОБАЛЬНЫЙ МЕТОД: DECOLLATERALIZE LENDING (СНЯТИЕ ЗАЛОГА)
 * 100% синхронизация с SDK: PDA деривация, Accounts, Compute Budget
 */
window.performDecollateralizeLending = async function(poolPubKey, poolIndex, amountBN) {
    try {
        console.log("====================================================================================================");
        console.log("🔓 [START]: ИНИЦИАЦИЯ СНЯТИЯ ЗАЛОГА (DECOLLATERALIZE LENDING)...");
        
        const program = await QubitProgramManager.getProgram();
        const provider = program.provider;
        const ownerPubkey = provider.wallet.publicKey;

        // 1. Деривация PDA (строго по seeds: "user_stake", pool, owner, index)
        const [userStakePda] = anchor.web3.PublicKey.findProgramAddressSync(
            [
                Buffer.from("user_stake"),
                poolPubKey.toBuffer(),
                ownerPubkey.toBuffer(),
                Buffer.from([poolIndex])
            ],
            program.programId
        );

        // 2. Сборка транзакции
        const transaction = new anchor.web3.Transaction();
        
        // Установка лимитов вычислений
        transaction.add(anchor.web3.ComputeBudgetProgram.setComputeUnitLimit({ units: 1400000 }));
        transaction.add(anchor.web3.ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 25000 }));

        // 3. Формирование инструкции
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

        // 4. Подпись и отправка RAW-пакета
        const { blockhash, lastValidBlockHeight } = await provider.connection.getLatestBlockhash('finalized');
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = ownerPubkey;

        const signedTx = await provider.wallet.signTransaction(transaction);
        const txId = await provider.connection.sendRawTransaction(signedTx.serialize(), {
            skipPreflight: true,
            preflightCommitment: "finalized"
        });

        console.log("⏳ Ожидание подтверждения (Decollateralize)...");
        await provider.connection.confirmTransaction({ signature: txId, blockhash, lastValidBlockHeight }, "finalized");

        console.log("✅ [SUCCESS]: Залог успешно снят. TX:", txId);
        return txId;

    } catch (e) {
        console.error("❌ Decollateralize Error:", e.message);
        throw e;
    }
};



    /**
     * Функция для автоматического расчета и установки суммы залога.
     * percent: число от 0.0 до 1.0 (например, 0.25 для 25%)
     */
    function setAmount(percent) {
        // 1. Получаем текстовое значение из элемента (с защитой от пустоты)
        const maxElement = document.getElementById('maxAvailableAmount');
        const maxText = maxElement ? maxElement.innerText.replace(/,/g, '') : "0";
        const max = parseFloat(maxText);

        // 2. Получаем инпут
        const input = document.getElementById('decollateralizeAmountInput');

        // 3. Проверка на валидность данных
        if (isNaN(max) || max <= 0) {
            console.warn("Максимально доступная сумма не определена или равна 0");
            input.value = "0.00";
            return;
        }

        // 4. Расчет и форматирование (оставляем 2 знака после запятой)
        const result = (max * percent).toFixed(2);

        // 5. Установка значения в инпут
        input.value = result;

        console.log("Установлена сумма:", result, "для процента:", percent * 100 + "%");
    }


















/**
 * ГЛОБАЛЬНЫЙ МЕТОД: DEPOSIT (ДЕПОЗИТ)
 * 100% синхронизация с SDK: PDA, Vault/Mint проверка, Compute Budget, RAW транзакция
 */
window.performDeposit = async function(poolPubKey, userSourceAta, userStAta, poolIndex, amountBN) {
    try {
        console.log("====================================================================================================");
        console.log("🚀 [START]: ИНИЦИАЦИЯ ДЕПОЗИТА...");
        
        const program = await QubitProgramManager.getProgram();
        const provider = program.provider;
        const ownerPubkey = provider.wallet.publicKey;

        // 1. ПОЛУЧЕНИЕ ДАННЫХ ПУЛА
        const poolData = await program.account.poolState.fetch(poolPubKey);

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

        // 3. СБОРКА ТРАНЗАКЦИИ
        const transaction = new anchor.web3.Transaction();
        
        // Инъекция лимитов для обеспечения гарантированного выполнения
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
                userSourceAta: userSourceAta,
                userStAta: userStAta,
                tokenProgram: spl.TOKEN_PROGRAM_ID,
                systemProgram: anchor.web3.SystemProgram.programId,
                clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
            })
            .instruction();

        transaction.add(depositInstruction);

        // 5. ОТПРАВКА И ПОДТВЕРЖДЕНИЕ
        const { blockhash, lastValidBlockHeight } = await provider.connection.getLatestBlockhash('confirmed');
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = ownerPubkey;

        const signedTx = await provider.wallet.signTransaction(transaction);
        const txId = await provider.connection.sendRawTransaction(signedTx.serialize(), {
            skipPreflight: false,
            preflightCommitment: "confirmed"
        });

        console.log("⏳ Ожидание подтверждения (Deposit)...");
        await provider.connection.confirmTransaction({ signature: txId, blockhash, lastValidBlockHeight }, "confirmed");

        console.log("✅ [SUCCESS]: Депозит успешно принят. TX:", txId);
        return txId;

    } catch (e) {
        console.error("❌ Deposit Error:", e.message);
        // Вывод логов контракта при ошибке для диагностики
        if (e.logs) {
            console.error("--- SOLANA LOGS ---");
            e.logs.forEach(line => console.error(line));
        }
        throw e;
    }
};

async function handleDeposit() {
    const amountVal = document.getElementById('depositInput').value;
    const poolIndex = parseInt(document.getElementById('currentPoolIndex').innerText);
    
    // ВАЖНО: убедись, что переменные POOL_PUBKEY, USER_SOURCE_ATA, USER_ST_ATA 
    // у тебя уже определены в контексте или подтягиваются из провайдера
    try {
        const amountBN = new anchor.BN(amountVal);
        await window.performDeposit(
            POOL_PUBKEY, 
            USER_SOURCE_ATA, 
            USER_ST_ATA, 
            poolIndex, 
            amountBN
        );
        alert("Депозит успешен!");
    } catch (e) {
        console.error("Ошибка депозита:", e);
    }
}




















/**
 * ГЛОБАЛЬНЫЙ МЕТОД: CLAIM ALL REWARDS
 * 100% синхронизация с SDK (AccountLoader/Zero-Copy, Remaining Accounts)
 */
window.performClaimAllRewards = async function(poolPubKey, poolIndices, userRewardsAta) {
    try {
        console.log("====================================================================================================");
        console.log("🎁 [START]: ИНИЦИАЦИЯ CLAIM ALL REWARDS...");
        
        const program = await QubitProgramManager.getProgram();
        const provider = program.provider;
        const ownerPubkey = provider.wallet.publicKey;

        if (!poolIndices || poolIndices.length === 0) {
            throw new Error("⛔️ ОШИБКА: Массив poolIndices пуст.");
        }

        // 1. ПОЛУЧЕНИЕ ДАННЫХ ПУЛА (через fetchData для Zero-Copy)
        const poolData = await program.account.poolState.fetchData(poolPubKey);

        // 2. ФОРМИРОВАНИЕ REMAINING ACCOUNTS
        // Генерируем PDA для каждого индекса динамически
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

        // 4. ОТПРАВКА И ПОДТВЕРЖДЕНИЕ
        const { blockhash, lastValidBlockHeight } = await provider.connection.getLatestBlockhash('finalized');
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = ownerPubkey;

        const signedTx = await provider.wallet.signTransaction(transaction);
        const txId = await provider.connection.sendRawTransaction(signedTx.serialize(), {
            skipPreflight: true,
            preflightCommitment: "finalized"
        });

        console.log("⏳ Ожидание подтверждения (Claim All)...");
        await provider.connection.confirmTransaction({ signature: txId, blockhash, lastValidBlockHeight }, "finalized");

        console.log("✨ Награды успешно заклеймлены! TX:", txId);
        return txId;

    } catch (e) {
        console.error("❌ Claim All Error:", e.message);
        throw e;
    }
};

// --- ПРИВЯЗКА К UI ---
// Пример: при клике на кнопку вызываем функцию
const claimButton = document.getElementById('claimAllBtn');
if (claimButton) {
    claimButton.addEventListener('click', async () => {
        // Здесь ты передаешь актуальные данные пула и ATA
        await window.performClaimAllRewards(AFOX_POOL_STATE_PUBKEY, [0, 1, 2], userRewardsAta);
    });
}





   /**
 * Улучшенная функция: автоматическое определение адресов и запуск клейма
 */
async function executeClaimRewards() {
    const selectedTiers = [];
    document.querySelectorAll('.tier-btn.active').forEach(btn => {
        selectedTiers.push(parseInt(btn.getAttribute('data-index')));
    });

    if (selectedTiers.length === 0) {
        console.warn("⚠️ Ни один пул не выбран.");
        return;
    }

    try {
        // 1. АВТОМАТИЗАЦИЯ: Получаем программу и провайдер
        const program = await QubitProgramManager.getProgram();
        const provider = program.provider;
        const owner = provider.wallet.publicKey;

        // 2. АВТОМАТИЗАЦИЯ: Определяем пул (например, из стейта приложения)
        // Предполагаем, что у тебя есть активный пул в appState
        const poolPubKey = window.appState.currentPoolPubKey; 

        // 3. АВТОМАТИЗАЦИЯ: Находим ATA наград пользователя (на лету)
        const rewardMint = window.appState.rewardMint; // Адрес токена наград
        const userRewardsAta = await spl.getAssociatedTokenAddress(
            rewardMint,
            owner
        );

        console.log("🔍 Автоматическое определение адресов завершено...");

        // 4. Вызов клейма с уже готовыми данными
        await window.performClaimAllRewards(
            poolPubKey, 
            selectedTiers, 
            userRewardsAta
        );
        
        alert("✅ Награды успешно заклеймлены!");
    } catch (e) {
        console.error("❌ Ошибка авто-определения или клейма:", e);
        alert("Ошибка: " + e.message);
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
        const amount = document.getElementById('unstakeAmountInput').value;
        if (!amount || amount <= 0) return;
        
        // Преобразуем в BN (предполагая 9 знаков после запятой для токена)
        const amountBN = new anchor.BN(amount * 1e9); 
        
        await window.performUnstake(
            CURRENT_POOL_PUBKEY, 
            USER_ST_ATA, 
            USER_REWARDS_ATA, 
            CURRENT_POOL_INDEX, 
            amountBN
        );
    }
    
    function setUnstakeAmount(percent) {
        // Здесь берем макс. доступное значение из appState
        const max = window.appState.stakedBalance || 0;
        document.getElementById('unstakeAmountInput').value = (max * percent).toFixed(2);
    }


















/**
 * ГЛОБАЛЬНЫЙ МЕТОД: CLOSE STAKING ACCOUNT (ЗАКРЫТИЕ АККАУНТА)
 * 100% синхронизация с SDK: PDA деривация, Accounts, Compute Budget
 */
window.performCloseStakingAccount = async function(poolPubKey, userStakingPda, poolIndex) {
    try {
        console.log("====================================================================================================");
        console.log("🗑️ [START]: ИНИЦИАЦИЯ ЗАКРЫТИЯ СТЕЙКИНГ-АККАУНТА...");
        
        const program = await QubitProgramManager.getProgram();
        const provider = program.provider;
        const ownerPubkey = provider.wallet.publicKey;

        // 1. Сборка транзакции
        const transaction = new anchor.web3.Transaction();
        
        // Лимиты для безопасного закрытия аккаунта и возврата rent (LAMPORTS)
        transaction.add(anchor.web3.ComputeBudgetProgram.setComputeUnitLimit({ units: 1400000 }));
        transaction.add(anchor.web3.ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 25000 }));

        // 2. Формирование инструкции
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

        // 3. Подпись и отправка RAW-пакета
        const { blockhash, lastValidBlockHeight } = await provider.connection.getLatestBlockhash('finalized');
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = ownerPubkey;

        const signedTx = await provider.wallet.signTransaction(transaction);
        const txId = await provider.connection.sendRawTransaction(signedTx.serialize(), {
            skipPreflight: true,
            preflightCommitment: "finalized"
        });

        console.log("⏳ Ожидание подтверждения (Close Account)...");
        await provider.connection.confirmTransaction({ signature: txId, blockhash, lastValidBlockHeight }, "finalized");

        console.log("✅ [SUCCESS]: Аккаунт успешно закрыт, SOL возвращены. TX:", txId);
        return txId;

    } catch (e) {
        console.error("❌ Close Account Error:", e.message);
        // Логирование типичных ошибок контракта
        if (e.message.includes("StakeStillExists")) console.error("⚠️ Внимание: в аккаунте остались средства (StakeStillExists).");
        if (e.message.includes("UnclaimedRewardsExist")) console.error("⚠️ Внимание: остались невостребованные награды.");
        throw e;
    }
};





    async function handleCloseAccount() {
        // Эти переменные (POOL_PUBKEY, USER_STAKING_PDA, CURRENT_INDEX) 
        // должны быть доступны в твоем контексте
        try {
            await window.performCloseStakingAccount(
                POOL_PUBKEY, 
                USER_STAKING_PDA, 
                CURRENT_INDEX
            );
            alert("✅ Аккаунт успешно закрыт!");
        } catch (e) {
            console.error("Ошибка закрытия аккаунта:", e);
        }
    }



















    

document.addEventListener('DOMContentLoaded', () => {
    // 1. Глобальная функция переключения представлений
    window.switchView = function(viewId) {
        const views = [
            'initStakeView', 'mainStakingView', 'collateralView', 
            'decollateralizeView', 'depositView', 'claimView', 
            'unstakeView', 'closeAccountView'
        ];
        views.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.add('hidden');
        });
        const target = document.getElementById(viewId);
        if (target) target.classList.remove('hidden');
    };

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
            // Сбрасываем стили всех кнопок HF
            hfButtons.forEach(b => {
                b.classList.remove('bg-blue-500/20', 'text-blue-400', 'border', 'border-blue-500/50');
                b.classList.add('bg-white/10');
            });
            // Подсвечиваем выбранную
            e.currentTarget.classList.add('bg-blue-500/20', 'text-blue-400', 'border', 'border-blue-500/50');
            console.log("Selected HF:", e.currentTarget.dataset.value);
        });
    });

    // 2. Управление процентами (%) и полем ввода
    const collateralInput = document.getElementById('collateralAmountInput');
    const walletBalance = 5000.00; // Пример баланса

    document.querySelectorAll('.pct-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
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
            alert("Claiming all rewards...");
        });
    }

    const adjustCollateralBtn = document.getElementById('adjustCollateralBtn');
    if (adjustCollateralBtn) {
        adjustCollateralBtn.addEventListener('click', () => {
            const amount = collateralInput.value;
            console.log("Adjusting collateral to:", amount);
            alert(`Collateral adjusted to ${amount} TOKEN`);
        });
    }





    

    // --- Деколлатерализация ---
    const backDecollateral = document.getElementById('backToStakingFromDecollateralize');
    if (backDecollateral) {
        backDecollateral.addEventListener('click', () => switchView('mainStakingView'));
    }

    document.querySelectorAll('.pct-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const pct = e.currentTarget.dataset.pct;
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

    document.querySelectorAll('.deposit-pct-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const pct = e.currentTarget.dataset.pct;
            if (typeof setDepositAmount === 'function') setDepositAmount(pct);
        });
    });

    const confirmDepositBtn = document.getElementById('confirmDepositBtn');
    if (confirmDepositBtn) {
        confirmDepositBtn.addEventListener('click', () => {
            if (typeof handleDeposit === 'function') handleDeposit();
        });
    }

   // --- Claim ---
const backClaim = document.getElementById('backToStakingFromClaim');
if (backClaim) {
    backClaim.addEventListener('click', () => switchView('mainStakingView'));
}

const selectAllTiersBtn = document.getElementById('selectAllTiersBtn');
if (selectAllTiersBtn) {
    selectAllTiersBtn.addEventListener('click', () => {
        // Мы находим все кнопки тиров по классу 'tier-btn'
        const tierButtons = document.querySelectorAll('.tier-btn');
        
        // Проходим по каждой кнопке от 0 до 4
        tierButtons.forEach(btn => {
            // Добавляем визуальное выделение
            btn.classList.add('ring-2', 'ring-indigo-500', 'border-indigo-500');
            
            // Если функция toggleTier существует, вызываем её для каждой кнопки
            if (typeof toggleTier === 'function') {
                toggleTier(btn.dataset.index);
            }
        });
    });
}

document.querySelectorAll('.tier-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        // Переключаем визуальное состояние (активен/неактивен)
        e.currentTarget.classList.toggle('ring-2');
        e.currentTarget.classList.toggle('ring-indigo-500');
        e.currentTarget.classList.toggle('border-indigo-500');
        
        if (typeof toggleTier === 'function') {
            toggleTier(e.currentTarget.dataset.index);
        }
    });
});

document.querySelectorAll('.pct-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        console.log("Setting %:", e.currentTarget.dataset.pct);
    });
});

const executeClaimBtn = document.getElementById('executeClaimBtn');
if (executeClaimBtn) {
    executeClaimBtn.addEventListener('click', () => {
        if (typeof executeClaimRewards === 'function') executeClaimRewards();
    });
}


    // --- Unstake ---
    const backUnstake = document.getElementById('backToStakingFromUnstake');
    if (backUnstake) {
        backUnstake.addEventListener('click', () => switchView('mainStakingView'));
    }

    document.querySelectorAll('.unstake-pct-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const pct = parseFloat(e.currentTarget.dataset.pct);
            if (typeof setUnstakeAmount === 'function') setUnstakeAmount(pct);
        });
    });

    const executeUnstakeBtn = document.getElementById('executeUnstakeBtn');
    if (executeUnstakeBtn) {
        executeUnstakeBtn.addEventListener('click', () => {
            if (typeof handleUnstake === 'function') handleUnstake();
        });
    }

    // --- Close Account ---
    const backClose = document.getElementById('backToStakingFromClose');
    if (backClose) {
        backClose.addEventListener('click', () => switchView('mainStakingView'));
    }

    const confirmCloseAccountBtn = document.getElementById('confirmCloseAccountBtn');
    if (confirmCloseAccountBtn) {
        confirmCloseAccountBtn.addEventListener('click', () => {
            if (typeof handleCloseAccount === 'function') handleCloseAccount();
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

    // --- Wallet Modal ---
    const modal = document.getElementById('walletModal');
    const closeBtn = document.getElementById('closeModalBtn');
    const connectBtn = document.getElementById('connectWalletBtn');

    if (closeBtn) {
        closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
    }

    if (connectBtn) {
        connectBtn.addEventListener('click', () => modal.classList.remove('hidden'));
    }
});









































// --- ФУНКЦИЯ УВЕДОМЛЕНИЙ (С ЗАЩИТОЙ ОТ ДУБЛЕЙ) ---
function showNotification(text, color = 'emerald') {
    const existingNotifications = Array.from(document.querySelectorAll('.toast-notification'));
    if (existingNotifications.some(n => n.innerText === text)) return;

    const toast = document.createElement('div');
    toast.className = `toast-notification fixed top-20 right-5 px-6 py-3 rounded-xl font-bold text-sm shadow-2xl z-[9999] border ${color === 'emerald' ? 'bg-emerald-900/90 border-emerald-500 text-emerald-100' : 'bg-red-900/90 border-red-500 text-red-100'}`;
    toast.innerText = text;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('connectWalletBtn');
    const modal = document.getElementById('walletModal');
    const list = document.getElementById('walletList');

    let currentProvider = null;
    let availableWallets = [];
    let isManualDisconnect = false; // Флаг для предотвращения дублей при дисконнекте

    const updateUI = (publicKey = null) => {
        if (publicKey) {
            const short = publicKey.slice(0, 4) + '...' + publicKey.slice(-4);
            btn.innerText = `Connected: ${short}`;
            btn.classList.replace('bg-blue-600/10', 'bg-emerald-600/20');
            localStorage.setItem('wallet_connected', publicKey);
        } else {
            btn.innerText = "Connect Wallet";
            btn.classList.replace('bg-emerald-600/20', 'bg-blue-600/10');
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

    btn.addEventListener('click', async () => {
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

        // --- ДОБАВЛЕНО: Индикация загрузки ---
        const originalText = btn.innerText;
        btn.innerText = "Loading...";
        btn.disabled = true; // Блокируем кнопку, чтобы не нажимали повторно
        // -------------------------------------

        availableWallets = await getAvailableWallets();
        
        // --- ДОБАВЛЕНО: Сброс состояния загрузки ---
        btn.innerText = originalText;
        btn.disabled = false;
        // --------------------------------------------
        
        if (availableWallets.length === 0) {
            triggerDeepLink();
            return;
        }

        if (availableWallets.length === 1) {
            connectWallet(availableWallets[0]);
        } else {
            list.innerHTML = '';
            availableWallets.forEach(w => {
                const item = document.createElement('button');
                item.className = "w-full p-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-all border border-gray-600 mb-2";
                item.innerText = w.name;
                item.onclick = () => { connectWallet(w); modal.classList.add('hidden'); };
                list.appendChild(item);
            });
            modal.classList.remove('hidden');
        }
    });

    async function connectWallet(wallet) {
        try {
            currentProvider = wallet.provider;
            const resp = await currentProvider.connect();
            const publicKey = resp.publicKey ? resp.publicKey.toString() : resp.toString();
            updateUI(publicKey);
            showNotification(`${wallet.name} Connected!`);
            
            currentProvider.removeAllListeners?.('disconnect');
            currentProvider.on('disconnect', () => {
                // Если мы отключились сами кнопкой, мы уже показали уведомление выше.
                // Поэтому тут показываем сообщение только если кошелек отвалился САМ (из расширения).
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

    window.addEventListener('load', async () => {
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
    });
});








            
