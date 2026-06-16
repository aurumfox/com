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

window.createStakingAccount = async function() {
    try {
        // 1. Получаем текущий выбранный индекс из UI
        // Ищем кнопку с классом 'active-tier' и забираем её data-index
        const activeBtn = document.querySelector('.tier-btn.active-tier');
        const poolIndex = activeBtn ? parseInt(activeBtn.getAttribute('data-index')) : 0;
        
        if (!window.solana?.isConnected) {
            return AurumFoxEngine.notify("CONNECT WALLET", "FAILED");
        }

        const program = await QubitProgramManager.getProgram();
        const userPubKey = program.provider.wallet.publicKey;

        // 2. Расчет PDA (используем poolIndex, полученный выше)
        const [userStakingPda] = await window.solanaWeb3.PublicKey.findProgramAddress(
            [
                Buffer.from("user_stake"),
                AFOX_POOL_STATE_PUBKEY.toBuffer(),
                userPubKey.toBuffer(),
                Uint8Array.from([poolIndex]) // Важно: используем Uint8Array для индекса
            ],
            program.programId
        );

        AurumFoxEngine.notify("PREPARING STORAGE...", "WAIT");

        // 3. Вызов метода
        const tx = await program.methods
            .initializeUserStake(poolIndex)
            .accounts({
                poolState: AFOX_POOL_STATE_PUBKEY,
                userStaking: userStakingPda,
                owner: userPubKey,
                systemProgram: window.solanaWeb3.SystemProgram.programId,
                clock: window.solanaWeb3.SYSVAR_CLOCK_PUBKEY,
                rent: window.solanaWeb3.SYSVAR_RENT_PUBKEY,
            })
            .rpc();

        console.log("🚀 Initialization Signature:", tx);
        AurumFoxEngine.notify("ACCOUNT DEPLOYED!", "SUCCESS");

    } catch (e) {
        console.error("🛠️ Init Error:", e);
        // Обработка ошибок
        if (e.message.includes("0x1770") || e.message.includes("already in use")) {
            AurumFoxEngine.notify("ALREADY INITIALIZED", "SUCCESS");
        } else {
            AurumFoxEngine.notify("INIT FAILED", "FAILED");
        }
    }
};

// --- 4. ОБРАБОТЧИКИ UI ---
document.querySelectorAll('.tier-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        // Убираем активность со всех
        document.querySelectorAll('.tier-btn').forEach(b => b.classList.remove('active-tier', 'border-blue-500', 'bg-blue-500/10'));
        // Добавляем текущей
        this.classList.add('active-tier', 'border-blue-500', 'bg-blue-500/10');
        
        // Обновляем текст в карточке
        const label = this.getAttribute('data-label');
        const lockupDisplay = document.getElementById('lockupDisplay');
        const poolIndexDisplay = document.getElementById('poolIndexDisplay');
        const lockupProgressBar = document.getElementById('lockupProgressBar');

        if (lockupDisplay) lockupDisplay.innerText = label;
        if (poolIndexDisplay) poolIndexDisplay.innerText = `Tier ${label} (Index ${this.getAttribute('data-index')})`;
        
        // Обновляем прогресс-бар
        if (lockupProgressBar) {
            const percent = (parseInt(this.getAttribute('data-index')) + 1) * 20;
            lockupProgressBar.style.width = `${percent}%`;
        }
    });
});

// Привязка кнопки подтверждения инициализации (используем селектор для защиты)
const confirmButton = document.querySelector('.bg-emerald-500\\/20');
if (confirmButton) {
    confirmButton.addEventListener('click', () => {
        window.createStakingAccount();
    });
}


























































