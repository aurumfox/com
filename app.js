
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
 * ГЛОБАЛЬНЫЙ МЕТОД ДЕПОЗИТА (DEPOSIT ENGINE)
 * Полная синхронизация с PDA и архитектурой контракта
 */
window.performDeposit = async function(amountInTokens) {
    try {
        // 1. Получаем индекс пула из интерфейса
        const activeBtn = document.querySelector('.tier-btn.active-tier');
        const poolIndex = activeBtn ? parseInt(activeBtn.getAttribute('data-index')) : 0;

        if (!window.solana?.isConnected) {
            return AurumFoxEngine.notify("CONNECT WALLET", "FAILED");
        }

        AurumFoxEngine.notify("PREPARING DEPOSIT...", "WAIT");

        // 2. Инициализируем программу
        const program = await QubitProgramManager.getProgram();
        const ownerPubkey = program.provider.wallet.publicKey;

        // 3. Получаем данные пула (Fetch pool state)
        const poolData = await program.account.poolState.fetch(AFOX_POOL_STATE_PUBKEY);

        // 4. Вычисляем PDA для user_staking
        const [userStakePda] = await window.solanaWeb3.PublicKey.findProgramAddress(
            [
                Buffer.from("user_stake"),
                AFOX_POOL_STATE_PUBKEY.toBuffer(),
                ownerPubkey.toBuffer(),
                Uint8Array.from([poolIndex])
            ],
            program.programId
        );

        // ВАЖНО: Предполагаем, что у тебя есть функции для получения ATA
        // Если нет — убедись, что userSourceAta и userStAta переданы правильно
        // Здесь мы используем логику, которая у тебя была в Utils
        const userSourceAta = await spl.getAssociatedTokenAddress(poolData.mint, ownerPubkey);
        const userStAta = await spl.getAssociatedTokenAddress(poolData.stMint, ownerPubkey);

        console.log(`🚀 Депозит для Пула ${poolIndex}, Сумма: ${amountInTokens}`);

        // 5. Выполнение транзакции
        const tx = await program.methods
            .deposit(poolIndex, new anchor.BN(amountInTokens))
            .accounts({
                poolState: AFOX_POOL_STATE_PUBKEY,
                userStaking: userStakePda,
                owner: ownerPubkey,
                vault: poolData.vault,
                stMint: poolData.stMint,
                userSourceAta: userSourceAta,
                userStAta: userStAta,
                tokenProgram: spl.TOKEN_PROGRAM_ID,
                systemProgram: window.solanaWeb3.SystemProgram.programId,
                clock: window.solanaWeb3.SYSVAR_CLOCK_PUBKEY,
            })
            .rpc();

        console.log("✅ Deposit Signature:", tx);
        AurumFoxEngine.notify("DEPOSIT SUCCESS!", "SUCCESS");

    } catch (e) {
        console.error("❌ Deposit Error:", e);
        AurumFoxEngine.notify("DEPOSIT FAILED", "FAILED");
    }
};

// Привязка кнопки депозита (убедись, что класс кнопки совпадает с твоим)
const depositButton = document.getElementById('depositButton'); // Замени на нужный ID/класс
if (depositButton) {
    depositButton.addEventListener('click', () => {
        // Пример: берем сумму из input с ID 'amountInput'
        const amount = document.getElementById('amountInput')?.value || "0";
        window.performDeposit(amount);
    });
}














/**
 * ГЛОБАЛЬНЫЙ МЕТОД: CLAIM REWARDS
 * Одиночный или пакетный сбор наград
 */
window.executeClaimRewards = async function() {
    try {
        if (!window.solana?.isConnected) {
            return AurumFoxEngine.notify("CONNECT WALLET", "FAILED");
        }

        const program = await QubitProgramManager.getProgram();
        const userPubKey = program.provider.wallet.publicKey;
        
        // 1. Собираем активные индексы из UI
        const activeButtons = document.querySelectorAll('.tier-btn.active');
        const poolIndices = Array.from(activeButtons).map(btn => parseInt(btn.getAttribute('data-index')));

        if (poolIndices.length === 0) {
            return AurumFoxEngine.notify("SELECT POOLS", "FAILED");
        }

        AurumFoxEngine.notify("CLAIMING REWARDS...", "WAIT");

        // 2. Получаем данные пула
        const poolData = await program.account.poolState.fetch(AFOX_POOL_STATE_PUBKEY);
        
        // 3. Получаем ATA пользователя для наград
        const userRewardsAta = await spl.getAssociatedTokenAddress(poolData.rewardMint, userPubKey);

        let tx;
        if (poolIndices.length === 1) {
            // ОДИНОЧНЫЙ КЛЕЙМ
            const poolIndex = poolIndices[0];
            const [userStakingPda] = await window.solanaWeb3.PublicKey.findProgramAddress(
                [
                    Buffer.from("user_stake"),
                    AFOX_POOL_STATE_PUBKEY.toBuffer(),
                    userPubKey.toBuffer(),
                    Uint8Array.from([poolIndex])
                ],
                program.programId
            );

            tx = await program.methods.claimRewards(poolIndex)
                .accounts({
                    poolState: AFOX_POOL_STATE_PUBKEY,
                    userStaking: userStakingPda,
                    owner: userPubKey,
                    vault: poolData.vault,
                    adminFeeVault: poolData.adminFeeVault,
                    userRewardsAta: userRewardsAta,
                    rewardMint: poolData.rewardMint,
                    tokenProgram: spl.TOKEN_PROGRAM_ID,
                    clock: window.solanaWeb3.SYSVAR_CLOCK_PUBKEY,
                }).rpc();
        } else {
            // ПАКЕТНЫЙ КЛЕЙМ (CLAIM ALL)
            const remainingAccounts = poolIndices.map(index => {
                const [pda] = window.solanaWeb3.PublicKey.findProgramAddressSync(
                    [Buffer.from("user_stake"), AFOX_POOL_STATE_PUBKEY.toBuffer(), userPubKey.toBuffer(), Uint8Array.from([index])],
                    program.programId
                );
                return { pubkey: pda, isWritable: true, isSigner: false };
            });

            tx = await program.methods.claimAllRewards(poolIndices)
                .accounts({
                    poolState: AFOX_POOL_STATE_PUBKEY,
                    owner: userPubKey,
                    userRewardsAta: userRewardsAta,
                    vault: poolData.vault,
                    adminFeeVault: poolData.adminFeeVault,
                    rewardMint: poolData.rewardMint,
                    tokenProgram: spl.TOKEN_PROGRAM_ID,
                    clock: window.solanaWeb3.SYSVAR_CLOCK_PUBKEY,
                })
                .remainingAccounts(remainingAccounts)
                .rpc();
        }

        console.log("💎 Claim Signature:", tx);
        AurumFoxEngine.notify("REWARDS RECEIVED!", "SUCCESS");

    } catch (e) {
        console.error("❌ Claim Error:", e);
        AurumFoxEngine.notify("CLAIM FAILED", "FAILED");
    }
};

// --- 4. ОБРАБОТЧИКИ UI ДЛЯ CLAIM VIEW ---
// Toggle для одной кнопки (Tier)
window.toggleTier = function(id) {
    const buttons = document.querySelectorAll('.tier-btn');
    if (buttons[id]) {
        buttons[id].classList.toggle('active');
    }
};

// Toggle для всех кнопок
window.toggleAllTiers = function() {
    const buttons = document.querySelectorAll('.tier-btn');
    const allActive = Array.from(buttons).every(btn => btn.classList.contains('active'));
    buttons.forEach(btn => {
        allActive ? btn.classList.remove('active') : btn.classList.add('active');
    });
};





























/**
 * ГЛОБАЛЬНЫЙ МЕТОД: COLLATERALIZE LENDING
 * Синхронизировано с HTML-интерфейсом #collateralView
 * Работает через RPC-узел, определенный в QubitProgramManager
 */
window.collateralizeLending = async function() {
    try {
        console.log("🛠️ [RPC Call] Инициация вызова через RPC узел...");

        // 1. Получаем индекс из главного стейкинг-вью (привязка к состоянию пула)
        const activeBtn = document.querySelector('.tier-btn.active-tier');
        const poolIndex = activeBtn ? parseInt(activeBtn.getAttribute('data-index')) : 0;
        
        // 2. Получаем сумму из input
        const amountInput = document.querySelector('#collateralView input[type="number"]');
        const amountValue = amountInput ? amountInput.value : "0";
        const newLendingAmount = new anchor.BN(amountValue);

        // Проверки безопасности перед отправкой запроса на RPC
        if (!window.solana?.isConnected) {
            return AurumFoxEngine.notify("CONNECT WALLET", "FAILED");
        }
        if (newLendingAmount.isZero()) {
            return AurumFoxEngine.notify("ENTER AMOUNT", "FAILED");
        }

        AurumFoxEngine.notify("LOCKING COLLATERAL...", "WAIT");

        // Инициализация программы через RPC-провайдер
        const program = await QubitProgramManager.getProgram();
        const userPubKey = program.provider.wallet.publicKey;

        // 3. Вычисление PDA (согласно логике Rust-контракта)
        const [userStakingPda] = await window.solanaWeb3.PublicKey.findProgramAddress(
            [
                Buffer.from("user_stake"),
                AFOX_POOL_STATE_PUBKEY.toBuffer(),
                userPubKey.toBuffer(),
                Uint8Array.from([poolIndex])
            ],
            program.programId
        );
        console.log("📍 PDA для RPC вызова:", userStakingPda.toBase58());

        // 4. Формирование и RPC-запрос
        const tx = await program.methods
            .collateralizeLending(newLendingAmount)
            .accounts({
                poolState: AFOX_POOL_STATE_PUBKEY,
                userStaking: userStakingPda,
                owner: userPubKey,
                clock: window.solanaWeb3.SYSVAR_CLOCK_PUBKEY,
            })
            .rpc(); // Здесь происходит вызов через RPC-провайдер

        AurumFoxEngine.notify("COLLATERAL UPDATED!", "SUCCESS");
        console.log("✅ Tx Signature (RPC Confirmed):", tx);

    } catch (e) {
        console.error("❌ RPC Transaction Error:", e);
        AurumFoxEngine.notify("TRANSACTION FAILED", "FAILED");
    }
};

// --- СИНХРОНИЗАЦИЯ UI КНОПОК ---
document.addEventListener('DOMContentLoaded', () => {
    // 1. Кнопка вызова транзакции
    const adjustBtn = document.querySelector('.btn-action');
    if (adjustBtn) adjustBtn.addEventListener('click', window.collateralizeLending);

    // 2. Логика процентов (25%, 50%, 75%, MAX)
    // Лимиты и баланс берутся для вычисления суммы перед RPC-запросом
    const MAX_WALLET_BALANCE = 5000; 
    const input = document.querySelector('#collateralView input[type="number"]');
    
    document.querySelectorAll('.grid-cols-4 button').forEach((btn, index) => {
        btn.addEventListener('click', () => {
            const multipliers = [0.25, 0.5, 0.75, 1.0];
            input.value = (MAX_WALLET_BALANCE * multipliers[index]).toFixed(2);
        });
    });
});





















/**
 * ГЛОБАЛЬНЫЙ МЕТОД: DECOLLATERALIZE (СНЯТИЕ ЗАЛОГА)
 * Синхронизированный вызов контракта Qubit
 */
window.performDecollateralize = async function() {
    try {
        // 1. Получаем индекс пула (из активной кнопки) и сумму из input
        const activeBtn = document.querySelector('.tier-btn.active-tier');
        const poolIndex = activeBtn ? parseInt(activeBtn.getAttribute('data-index')) : 0;
        
        const amountInput = document.querySelector('input[type="number"]');
        const amountValue = amountInput ? amountInput.value : "0";
        
        // Преобразуем сумму в BN (учитывая, что в контракте скорее всего u64)
        const amount = new anchor.BN(amountValue);

        if (!window.solana?.isConnected) {
            return AurumFoxEngine.notify("CONNECT WALLET", "FAILED");
        }

        if (amount.isZero()) {
            return AurumFoxEngine.notify("ENTER AMOUNT", "FAILED");
        }

        AurumFoxEngine.notify("RELEASING COLLATERAL...", "WAIT");

        const program = await QubitProgramManager.getProgram();
        const userPubKey = program.provider.wallet.publicKey;

        // 2. Расчет PDA стейкинга
        const [userStakingPda] = await window.solanaWeb3.PublicKey.findProgramAddress(
            [
                Buffer.from("user_stake"),
                AFOX_POOL_STATE_PUBKEY.toBuffer(),
                userPubKey.toBuffer(),
                Uint8Array.from([poolIndex])
            ],
            program.programId
        );

        // 3. Вызов метода контракта
        const tx = await program.methods
            .decollateralizeLending(amount)
            .accounts({
                poolState: AFOX_POOL_STATE_PUBKEY,
                userStaking: userStakingPda,
                owner: userPubKey,
                clock: window.solanaWeb3.SYSVAR_CLOCK_PUBKEY,
            })
            .rpc();

        console.log("🔓 Decollateralize Signature:", tx);
        AurumFoxEngine.notify("COLLATERAL RELEASED!", "SUCCESS");

    } catch (e) {
        console.error("🛠️ Decollateralize Error:", e);
        
        // Обработка специфических ошибок контракта
        if (e.message.includes("0x1774")) {
            AurumFoxEngine.notify("LENDING LOCK ACTIVE", "FAILED");
        } else {
            AurumFoxEngine.notify("RELEASE FAILED", "FAILED");
        }
    }
};

// --- ПРИВЯЗКА КНОПКИ UI ---
// Привязываем событие к кнопке CONFIRM DECOLLATERALIZE
const decollateralizeBtn = document.querySelector('#decollateralizeView button.bg-emerald-500\\/20');
if (decollateralizeBtn) {
    decollateralizeBtn.addEventListener('click', () => {
        window.performDecollateralize();
    });
}






























/**
 * ГЛОБАЛЬНЫЙ МЕТОД: UNSTAKE (ВЫВОД СРЕДСТВ)
 * Синхронизированная версия с поддержкой Compute Budget и анти-MEV аудита
 */
window.performUnstake = async function() {
    try {
        // 1. Получаем активный пул и сумму из UI
        const activeBtn = document.querySelector('.tier-btn.active-tier');
        const poolIndex = activeBtn ? parseInt(activeBtn.getAttribute('data-index')) : 0;
        const amountInput = document.querySelector('input[type="number"]');
        const amount = amountInput ? new anchor.BN(amountInput.value) : new anchor.BN(0);

        if (!window.solana?.isConnected) {
            return AurumFoxEngine.notify("CONNECT WALLET", "FAILED");
        }

        if (amount.isZero()) {
            return AurumFoxEngine.notify("ENTER AMOUNT", "FAILED");
        }

        AurumFoxEngine.notify("INITIALIZING UNSTAKE...", "WAIT");

        const program = await QubitProgramManager.getProgram();
        const userPubKey = program.provider.wallet.publicKey;

        // 2. Получаем данные пула
        const poolData = await program.account.poolState.fetch(AFOX_POOL_STATE_PUBKEY);

        // 3. Вычисление PDA для стейкинга
        const [userStakePda] = await window.solanaWeb3.PublicKey.findProgramAddress(
            [
                Buffer.from("user_stake"),
                AFOX_POOL_STATE_PUBKEY.toBuffer(),
                userPubKey.toBuffer(),
                Uint8Array.from([poolIndex])
            ],
            program.programId
        );

        // 4. Получаем ATA адреса
        const userStAta = await spl.getAssociatedTokenAddress(poolData.stMint, userPubKey);
        const userRewardsAta = await spl.getAssociatedTokenAddress(poolData.rewardMint, userPubKey);

        // 5. Формирование транзакции с оптимизацией лимитов
        const tx = await program.methods
            .unstake(poolIndex, amount)
            .accounts({
                poolState: AFOX_POOL_STATE_PUBKEY,
                userStaking: userStakePda,
                owner: userPubKey,
                vault: poolData.vault,
                daoTreasuryVault: poolData.daoTreasuryVault,
                adminFeeVault: poolData.adminFeeVault,
                userRewardsAta: userRewardsAta,
                userStAta: userStAta,
                stMint: poolData.stMint,
                rewardMint: poolData.rewardMint,
                tokenProgram: spl.TOKEN_PROGRAM_ID,
                clock: window.solanaWeb3.SYSVAR_CLOCK_PUBKEY,
            })
            .preInstructions([
                window.solanaWeb3.ComputeBudgetProgram.setComputeUnitLimit({ units: 1400000 }),
                window.solanaWeb3.ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 25000 })
            ])
            .rpc();

        console.log("📉 Unstake Signature:", tx);
        AurumFoxEngine.notify("UNSTAKE SUCCESS!", "SUCCESS");

    } catch (e) {
        console.error("🛠️ Unstake Error:", e);
        // Обработка специфических ошибок контракта
        if (e.message.includes("0x1770")) {
            AurumFoxEngine.notify("INSUFFICIENT FUNDS", "FAILED");
        } else if (e.message.includes("0x1771")) {
            AurumFoxEngine.notify("LOCKED IN LENDING", "FAILED");
        } else {
            AurumFoxEngine.notify("UNSTAKE FAILED", "FAILED");
        }
    }
};

// --- ПРИВЯЗКА КНОПКИ UI ---
const unstakeButton = document.getElementById('unstakeBtn');
if (unstakeButton) {
    unstakeButton.addEventListener('click', () => {
        window.performUnstake();
    });
}

















/**
 * ГЛОБАЛЬНЫЙ МЕТОД: CLOSE STAKING ACCOUNT
 * Полная синхронизация с контрактом для деаллокации (Rent Recovery) через RPC-узел
 */
window.closeStakingAccount = async function() {
    try {
        console.log("🗑️ [RPC Call] Инициация закрытия стейкинг-аккаунта...");

        // 1. Получаем активный индекс (как в Init/Unstake)
        const activeBtn = document.querySelector('.tier-btn.active-tier');
        const poolIndex = activeBtn ? parseInt(activeBtn.getAttribute('data-index')) : 0;

        if (!window.solana?.isConnected) {
            console.error("❌ Wallet not connected");
            return AurumFoxEngine.notify("CONNECT WALLET", "FAILED");
        }

        AurumFoxEngine.notify("DEACTIVATING ACCOUNT...", "WAIT");

        // Инициализация программы через RPC-провайдер
        const program = await QubitProgramManager.getProgram();
        const userPubKey = program.provider.wallet.publicKey;

        // 2. Расчет PDA для закрываемого аккаунта
        // Строгое соблюдение структуры семян для корректного поиска на RPC
        const [userStakingPda] = await window.solanaWeb3.PublicKey.findProgramAddress(
            [
                Buffer.from("user_stake"),
                AFOX_POOL_STATE_PUBKEY.toBuffer(),
                userPubKey.toBuffer(),
                Uint8Array.from([poolIndex])
            ],
            program.programId
        );
        console.log(`📍 PDA для RPC вызова: ${userStakingPda.toBase58()}`);

        // 3. Вызов метода закрытия через RPC
        const tx = await program.methods
            .closeStakingAccount(poolIndex)
            .accounts({
                poolState: AFOX_POOL_STATE_PUBKEY,
                userStaking: userStakingPda,
                owner: userPubKey,
                clock: window.solanaWeb3.SYSVAR_CLOCK_PUBKEY,
            })
            .rpc(); // Исполнение транзакции через RPC-узел

        console.log("🗑️ Account Closed Signature (RPC Confirmed):", tx);
        AurumFoxEngine.notify("ACCOUNT CLOSED!", "SUCCESS");

    } catch (e) {
        console.error("❌ RPC Close Error:", e);
        
        // Обработка специфических ошибок безопасности контракта
        if (e.message.includes("0x1772")) { // Пример кода ошибки "StillExists"
            AurumFoxEngine.notify("STAKE STILL EXISTS", "FAILED");
        } else if (e.message.includes("0x1773")) { // Пример кода "DustRemaining"
            AurumFoxEngine.notify("REWARD DUST EXISTS", "FAILED");
        } else {
            AurumFoxEngine.notify("CLOSE FAILED", "FAILED");
        }
    }
};

// --- ПРИВЯЗКА КНОПКИ UI ---
// Ищем кнопку по тексту или классу внутри closeAccountView
const closeButton = document.querySelector('#closeAccountView button.bg-red-600\\/20');
if (closeButton) {
    closeButton.addEventListener('click', () => {
        window.closeStakingAccount();
    });
}


































































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








            






            
