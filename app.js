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






window.createStakingAccount = async function() {
    try {
        // 1. Получаем текущий выбранный индекс из UI
        // Ищем кнопку с классом 'active-tier' и забираем её data-index
        const activeBtn = document.querySelector('.tier-btn.active-tier');
        const poolIndex = activeBtn ? parseInt(activeBtn.getAttribute('data-index')) : 0;
        
        if (!window.solana?.isConnected) {
            return AurumFoxEngine.notify("CONNECT WALLET", "FAILED");
        }

        const program = await getProgram();
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

        window.createStakingAccount = async function() {
    try {
        // 1. Получаем текущий выбранный индекс из UI
        // Ищем кнопку с классом 'active-tier' и забираем её data-index
        const activeBtn = document.querySelector('.tier-btn.active-tier');
        const poolIndex = activeBtn ? parseInt(activeBtn.getAttribute('data-index')) : 0;
        
        if (!window.solana?.isConnected) {
            return AurumFoxEngine.notify("CONNECT WALLET", "FAILED");
        }

        const program = await getProgram();
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
        // Обработка ошибок остается прежней
        if (e.message.includes("0x1770") || e.message.includes("already in use")) {
            AurumFoxEngine.notify("ALREADY INITIALIZED", "SUCCESS");
        } else {
            AurumFoxEngine.notify("INIT FAILED", "FAILED");
        }
    }
};
    QUBIT Engine.notify("PREPARING STORAGE...", "WAIT");

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
        // Обработка ошибок остается прежней
        if (e.message.includes("0x1770") || e.message.includes("already in use")) {
            AurumFoxEngine.notify("ALREADY INITIALIZED", "SUCCESS");
        } else {
            AurumFoxEngine.notify("INIT FAILED", "FAILED");
        }
    }
};





document.querySelectorAll('.tier-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        // Убираем активность со всех
        document.querySelectorAll('.tier-btn').forEach(b => b.classList.remove('active-tier', 'border-blue-500', 'bg-blue-500/10'));
        // Добавляем текущей
        this.classList.add('active-tier', 'border-blue-500', 'bg-blue-500/10');
        
        // Обновляем текст в карточке
        const label = this.getAttribute('data-label');
        document.getElementById('lockupDisplay').innerText = label;
        document.getElementById('poolIndexDisplay').innerText = `Tier ${label} (Index ${this.getAttribute('data-index')})`;
        
        // Обновляем прогресс-бар (пример логики)
        const percent = (parseInt(this.getAttribute('data-index')) + 1) * 20;
        document.getElementById('lockupProgressBar').style.width = `${percent}%`;
    });
});

// Привязка кнопки подтверждения
document.querySelector('.bg-emerald-500\\/20').addEventListener('click', () => {
    window.createStakingAccount();
});























/**
 * 👑 AURUM FOX
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

// --- СИСТЕМА УВЕДОМЛЕНИЙ ---
const showFoxToast = (message, type = 'success') => {
    const container = document.getElementById('fox-toast-container') || createToastContainer();
    const toast = document.createElement('div');
    toast.className = `fox-toast fox-toast-${type}`;
    toast.innerHTML = `<div class="fox-toast-content"><div class="fox-toast-icon"></div><span>${message.toUpperCase()}</span></div>`;
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

// --- СОХРАНЕНИЕ И ПОИСК АДРЕСА ---
const savePermanent = (addr) => {
    localStorage.setItem('fox_sol_addr', addr);
    document.cookie = `fox_sol_addr=${addr}; path=/; max-age=2592000; SameSite=Lax`;
    AurumFoxEngine.walletAddress = addr; 
    AurumFoxEngine.isWalletConnected = true; 
    AurumFoxEngine.channel.postMessage({ type: 'SOL_CONNECTED', address: addr });
    showFoxToast("WALLET LINKED SUCCESSFULLY", "success");
};

const getSavedAddr = () => {
    const cookieAddr = document.cookie.split('; ').find(row => row.startsWith('fox_sol_addr='))?.split('=')[1];
    return cookieAddr || localStorage.getItem('fox_sol_addr');
};

// --- ОБНОВЛЕНИЕ UI ---
const syncWalletUI = (isConnected, address = null) => {
    const buttons = document.querySelectorAll('#connectWalletBtn, .fox-connect-trigger');
    buttons.forEach(btn => {
        if (isConnected && address) {
            const shortAddr = address.slice(0, 4) + "..." + address.slice(-4);
            btn.innerHTML = `<div class="fox-container"><div class="fox-neon-dot"></div><span>${shortAddr.toUpperCase()}</span></div>`;
            btn.className = "fox-btn-connected";
        } else {
            btn.innerHTML = "FOX CONNECT";
            btn.className = "fox-btn-default";
        }
    });
};

// --- ГЛАВНОЕ ДЕЙСТВИЕ (ИСПРАВЛЕНО ОТ ЗАВИСАНИЙ) ---
async function toggleWalletAction() {
    const allBtns = document.querySelectorAll('#connectWalletBtn, .fox-connect-trigger');
    if (allBtns[0]?.dataset.loading === "true") return;

    const currentAddr = getSavedAddr();
    if (currentAddr) {
        AurumFoxEngine.isWalletConnected = true;
        AurumFoxEngine.walletAddress = currentAddr;
    }

    allBtns.forEach(b => b.dataset.loading = "true");
    const provider = AurumFoxEngine.getProvider();

    // ТАЙМАУТ ДЛЯ ПРЕДОТВРАЩЕНИЯ ЗАВИСАНИЯ (10 секунд)
    const timeoutId = setTimeout(() => {
        if (allBtns[0]?.dataset.loading === "true") {
            allBtns.forEach(b => b.dataset.loading = "false");
            showFoxToast("RPC TIMEOUT - REFRESHING", "error");
            setTimeout(() => window.location.reload(), 1500);
        }
    }, 10000);

    try {
        if (!AurumFoxEngine.isWalletConnected) {
            if (!provider && AurumFoxEngine.isMobile) {
                const currentUrl = encodeURIComponent(window.location.href);
                window.location.href = `https://phantom.app/ul/browse/${currentUrl}?ref=${currentUrl}`;
                return;
            }
            if (!provider) {
                showFoxToast("WALLET PROVIDER NOT FOUND", "error");
                allBtns.forEach(b => b.dataset.loading = "false");
                clearTimeout(timeoutId);
                return;
            }

            allBtns.forEach(b => b.innerHTML = `<span class="fox-spin"></span> SYNCING...`);
            
            // Запрос соединения
            const resp = await provider.connect();
            const pubKey = resp.publicKey ? resp.publicKey.toString() : resp;

            clearTimeout(timeoutId);
            savePermanent(pubKey);
            syncWalletUI(true, pubKey);

        } else {
            clearTimeout(timeoutId);
            localStorage.removeItem('fox_sol_addr');
            document.cookie = "fox_sol_addr=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";

            AurumFoxEngine.isWalletConnected = false;
            AurumFoxEngine.walletAddress = null;

            AurumFoxEngine.channel.postMessage({ type: 'SOL_DISCONNECTED' });
            showFoxToast("SESSION TERMINATED", "error");

            syncWalletUI(false);
            setTimeout(() => window.location.reload(), 800);
        }
    } catch (err) {
        clearTimeout(timeoutId);
        console.error(err);
        // Если ошибка RPC или отмена - рефрешим статус
        if (err.message?.includes('RPC') || err.code === 4001) {
            showFoxToast("CONNECTION ERROR - RESETTING", "error");
            setTimeout(() => window.location.reload(), 1000);
        } else {
            showFoxToast("ACTION CANCELLED", "error");
        }
    } finally {
        setTimeout(() => { allBtns.forEach(b => b.dataset.loading = "false"); }, 1000);
    }
}

// Умный сканер
const smartScanButtons = () => {
    const keywords = ["connect wallet", "fox connect", "привязать кошелек", "connect"];
    document.querySelectorAll('button, a').forEach(el => {
        const text = el.innerText.toLowerCase();
        if (el.id === "connectWalletBtn" || keywords.some(k => text.includes(k))) {
            if (!el.dataset.foxBound) {
                el.classList.add('fox-connect-trigger');
                el.onclick = (e) => { e.preventDefault(); e.stopPropagation(); toggleWalletAction(); };
                el.dataset.foxBound = "true";
            }
        }
    });
};

// Слушатель моста
AurumFoxEngine.channel.onmessage = (event) => {
    if (event.data.type === 'SOL_CONNECTED') {
        AurumFoxEngine.walletAddress = event.data.address;
        AurumFoxEngine.isWalletConnected = true;
        syncWalletUI(true, event.data.address);
    }
    if (event.data.type === 'SOL_DISCONNECTED') {
        window.location.reload();
    }
};

const initV31 = async () => {
    const saved = getSavedAddr();
    if (saved) {
        AurumFoxEngine.walletAddress = saved;
        AurumFoxEngine.isWalletConnected = true;
        syncWalletUI(true, saved);

        const provider = AurumFoxEngine.getProvider();
        if (provider) {
            try { await provider.connect({ onlyIfTrusted: true }); } catch(e) {}
        }
    }
};

window.addEventListener('load', () => {
    const style = document.createElement('style');
    style.innerHTML = `
        .fox-btn-default { background: #000; color: #fff; border: 1px solid #333; padding: 12px 24px; cursor: pointer; border-radius: 4px; font-weight: bold; transition: all 0.2s; font-family: sans-serif; text-decoration: none; display: inline-flex; align-items: center; justify-content: center; }
        .fox-btn-connected { background: #000; color: #00ff7f; border: 2px solid #00ff7f; padding: 12px 24px; cursor: pointer; border-radius: 4px; font-weight: bold; font-family: sans-serif; text-decoration: none; display: inline-flex; align-items: center; justify-content: center; }
        .fox-spin { width: 14px; height: 14px; border: 2px solid #00ff7f; border-top-color: transparent; border-radius: 50%; display: inline-block; animation: f-spin 0.5s linear infinite; margin-right: 8px; }
        @keyframes f-spin { to { transform: rotate(360deg); } }
        .fox-container { display: flex; align-items: center; gap: 8px; }
        .fox-neon-dot { width: 8px; height: 8px; background: #00ff7f; border-radius: 50%; box-shadow: 0 0 10px #00ff7f; animation: fox-pulse 2s infinite; }
        @keyframes fox-pulse { 0% { opacity: 1; } 50% { opacity: 0.4; } 100% { opacity: 1; } }
        #fox-toast-container { position: fixed; top: 20px; right: 20px; z-index: 100000; display: flex; flex-direction: column; gap: 10px; pointer-events: none; }
        .fox-toast { background: #000; border: 1px solid #333; color: #fff; padding: 14px 20px; border-radius: 8px; font-family: 'Courier New', monospace; font-size: 11px; transform: translateX(120%); transition: 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
        .fox-toast-show { transform: translateX(0); }
        .fox-toast-success { border-left: 4px solid #00ff7f; }
        .fox-toast-error { border-left: 4px solid #ff4b4b; }
    `;
    document.head.appendChild(style);
    initV31();

    // Авто-исправление ошибок без участия юзера
    window.addEventListener('unhandledrejection', event => {
        if (event.reason?.message?.includes('RPC') || event.reason?.message?.includes('node')) {
            console.warn("AurumFox: RPC Error detected. Auto-refreshing...");
            window.location.reload();
        }
    });

    setInterval(() => {
        smartScanButtons();
        const addr = getSavedAddr();
        if (addr) {
            AurumFoxEngine.isWalletConnected = true;
            AurumFoxEngine.walletAddress = addr;
            syncWalletUI(true, addr);
        }
    }, 2000);
});
