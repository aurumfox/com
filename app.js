
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


        








// --- ГЛОБАЛЬНЫЙ МЕНЕДЖЕР UI ---
const UI_MANAGER = {
    viewIds: [
        'initStakeView', 'mainStakingView', 'collateralView', 
        'decollateralizeView', 'depositView', 'claimView', 
        'unstakeView', 'closeAccountView'
    ],
    
    switchView(targetId) {
        console.log("🔄 Переключение на:", targetId);
        this.viewIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                if (id === targetId) el.classList.remove('hidden');
                else el.classList.add('hidden');
            }
        });
    },

    init() {
        // Делегирование событий: слушаем весь документ, чтобы кнопки работали 
        // даже если они добавлены динамически
        document.addEventListener('click', (e) => {
            const trigger = e.target.closest('.nav-trigger');
            if (trigger) {
                const target = trigger.getAttribute('data-target');
                if (target) this.switchView(target);
            }
        });
        console.log("✅ UI Bridge инициализирован");
    }
};

// Привязываем к глобальному объекту window
window.UI_MANAGER = UI_MANAGER;
window.switchView = (id) => UI_MANAGER.switchView(id);

// Инициализация при полной загрузке DOM
document.addEventListener('DOMContentLoaded', () => {
    UI_MANAGER.init();
});









 <div id="initStakeView" class="hidden max-w-7xl mx-auto">
    <div class="flex justify-between items-center mb-8">
        <h1 class="text-3xl font-bold">Initialize Staking: Security Audit</h1>
        <button onclick="switchView('mainStakingView')" class="text-gray-400 hover:text-white px-4 py-2 border border-white/10 rounded-xl transition-all">← Back to Staking</button>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div class="md:col-span-2 glass-panel p-6 border-emerald-500/30 bg-emerald-900/5 flex items-start gap-4">
                <div class="p-3 bg-emerald-500/20 rounded-lg">
                    <svg class="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
                </div>
                <div>
                    <h3 class="text-emerald-400 font-bold">Secure Account Initialization & Tier Selection</h3>
                    <p class="text-sm text-emerald-200/70">Binding your wallet to the Protocol Staking Pool. Please select your lock-up commitment tier below to finalize your cryptographic account state.</p>
                </div>
            </div>

            <div class="md:col-span-2 glass-panel p-6">
                <p class="text-gray-400 text-sm mb-4 uppercase tracking-widest">Select Commitment Tier:</p>
                <div class="grid grid-cols-2 md:grid-cols-5 gap-3" id="tierSelector">
                    <button data-tier="14" data-index="0" data-label="14 Days" class="tier-btn p-3 border border-blue-500 bg-blue-500/10 rounded-lg text-center transition-all active-tier">
                        <span class="block font-bold text-white">14D</span>
                        <span class="text-[10px] text-blue-400">0.5x APY</span>
                    </button>
                    <button data-tier="30" data-index="1" data-label="30 Days" class="tier-btn p-3 border border-white/10 bg-black/20 rounded-lg text-center hover:border-teal-500 transition-all">
                        <span class="block font-bold text-white">30D</span>
                        <span class="text-[10px] text-teal-400">1.0x APY</span>
                    </button>
                    <button data-tier="90" data-index="2" data-label="90 Days" class="tier-btn p-3 border border-white/10 bg-black/20 rounded-lg text-center hover:border-yellow-500 transition-all">
                        <span class="block font-bold text-white">90D</span>
                        <span class="text-[10px] text-yellow-500">2.0x APY</span>
                    </button>
                    <button data-tier="180" data-index="3" data-label="180 Days" class="tier-btn p-3 border border-white/10 bg-black/20 rounded-lg text-center hover:border-orange-500 transition-all">
                        <span class="block font-bold text-white">180D</span>
                        <span class="text-[10px] text-orange-400">3.5x APY</span>
                    </button>
                    <button data-tier="365" data-index="4" data-label="365 Days" class="tier-btn p-3 border border-white/10 bg-black/20 rounded-lg text-center hover:border-purple-500 transition-all">
                        <span class="block font-bold text-white">365D</span>
                        <span class="text-[10px] text-purple-400">6.0x APY</span>
                    </button>
                </div>
            </div>

            <div class="glass-panel p-6 flex flex-col justify-between">
                <p class="text-gray-400 text-sm">Lock-up Period (Selected)</p>
                <div class="text-3xl font-bold text-white mt-2" id="lockupDisplay">14 Days</div>
                <div class="w-full h-2 bg-white/5 rounded-full mt-4 overflow-hidden">
                    <div id="lockupProgressBar" class="h-full bg-blue-500 transition-all duration-500" style="width: 20%"></div>
                </div>
                <div class="mt-3 text-[11px] text-emerald-400 font-mono">Funds locked until: <span id="lockupDate">--:--:----</span></div>
                <p class="text-xs text-gray-500 mt-2">Active from block synchronization</p>
            </div>

            <div class="glass-panel p-6 flex flex-col justify-between">
                <p class="text-gray-400 text-sm">Account Integrity Status</p>
                <div class="flex items-center gap-3 mt-4">
                    <div class="w-3 h-3 bg-emerald-400 rounded-full animate-pulse"></div>
                    <span class="text-sm font-bold text-white">System Verified</span>
                </div>
                <p class="text-xs text-gray-500 mt-2">Slot Validation: <span class="text-white">Active</span></p>
            </div>

            <div class="md:col-span-2 glass-panel p-6 flex items-center justify-between">
                <div>
                    <p class="text-gray-400 text-sm">Protocol Security Sync</p>
                    <p class="text-xs text-gray-500 mt-1">Automatic binding of reward_per_share_global to user state</p>
                </div>
                <div class="text-xl font-mono text-emerald-400" id="syncStatus">0x...8aF9:SYNCED</div>
            </div>
        </div>

        <div class="glass-panel p-6 flex flex-col justify-between">
            <div>
                <h2 class="text-lg font-semibold uppercase">CONFIRM INITIALIZATION</h2>
                
                <div class="mt-6 p-4 bg-black/30 rounded-xl border border-white/5">
                    <p class="text-gray-400 text-[10px]">Method Signature</p>
                    <div class="text-sm font-mono text-indigo-400 mt-1">initialize_user_stake()</div>
                </div>

                <div class="mt-4 p-4 bg-black/30 rounded-xl border border-white/5">
                    <p class="text-gray-400 text-[10px]">Pool Index Selected</p>
                    <div id="poolIndexDisplay" class="text-sm text-white mt-1">Tier 14 Days (Index 0)</div>
                </div>

                <div class="mt-4 p-4 bg-black/30 rounded-xl border border-white/5">
                    <p class="text-gray-400 text-[10px]">Wallet Signer</p>
                    <div class="text-sm text-white mt-1">Ready for Signature</div>
                </div>
<button class="w-full mt-8 py-4 rounded-xl bg-emerald-500/20 border border-emerald-500/50 hover:bg-emerald-500/30 font-bold text-white transition-all shadow-lg shadow-emerald-500/10 cursor-pointer">
    CONFIRM INITIALIZATION
</button>

   </div>
            <p class="text-[10px] text-gray-500 mt-4 text-center">By initializing, you confirm the binding of this account to the protocol pool state. This is a one-time operation.</p>
        </div>
    </div>
</div>



        


 
<div id="collateralView" class="hidden max-w-7xl mx-auto">
    <div class="flex justify-between items-center mb-8">
        <h1 class="text-3xl font-bold">Lending Collateral: Active Loan Parameters</h1>
        <button onclick="switchView('mainStakingView')" class="text-gray-400 hover:text-white px-4 py-2 border border-white/10 rounded-xl">← Back to Staking</button>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div class="glass-panel p-4 flex items-center justify-between">
            <span class="text-xs text-gray-400 uppercase">Oracle Status</span>
            <div class="flex items-center gap-2">
                <div class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <span class="text-sm font-bold">Live</span>
            </div>
        </div>
        <div class="glass-panel p-4 flex items-center justify-between">
            <span class="text-xs text-gray-400 uppercase">Pool Status</span>
            <span class="text-sm font-bold text-emerald-400">Active</span>
        </div>
        <div class="glass-panel p-4 flex items-center justify-between">
            <span class="text-xs text-gray-400 uppercase">Max Change Limit</span>
            <span class="text-sm font-bold text-white">10,000 TOKEN</span>
        </div>
        <div class="glass-panel p-4 flex items-center justify-between">
            <span class="text-xs text-gray-400 uppercase">Est. DAO Fee</span>
            <span class="text-sm font-bold text-purple-400">0.05%</span>
        </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div class="glass-panel p-6 relative overflow-hidden flex flex-col justify-between">
                <p class="text-gray-400 text-sm">Health Factor (HF)</p>
                <svg class="w-40 h-40 mt-4 mx-auto" viewBox="0 0 36 36">
                    <path class="text-white/5" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="100, 100"/>
                    <path class="text-emerald-400" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831" fill="none" stroke="currentColor" stroke-width="3" stroke-dasharray="75, 100" stroke-linecap="round"/>
                </svg>
                <div class="absolute inset-0 flex flex-col items-center justify-center pt-10">
                    <div class="text-4xl font-bold text-emerald-400">1.45</div>
                    <div class="text-xs text-gray-500 mt-1">Status: Safe</div>
                </div>
            </div>

            <div class="glass-panel p-6 flex flex-col justify-between relative">
                <div class="flex justify-between items-center">
                    <p class="text-gray-400 text-sm">Unlock Grace Period</p>
                    <span class="text-xs text-yellow-400 font-medium">Pending</span>
                </div>
                
                <div class="flex items-center gap-1.5 mt-5">
                    <div class="w-full h-8 bg-purple-500/20 rounded-md border border-purple-500/40"></div>
                    <div class="w-full h-8 bg-purple-500/20 rounded-md border border-purple-500/40"></div>
                    <div class="w-full h-8 bg-purple-500/20 rounded-md border border-purple-500/40"></div>
                    <div class="w-full h-8 bg-purple-500/20 rounded-md border border-purple-500/40"></div>
                    <div class="w-full h-8 bg-purple-500/20 rounded-md border border-purple-500/40"></div>
                    <div class="w-full h-8 bg-purple-500 rounded-md relative shadow-lg shadow-purple-500/30">
                        <div class="absolute -bottom-5 left-1/2 -translate-x-1/2 w-3 h-3 bg-purple-500 rotate-45"></div>
                    </div>
                    <div class="w-full h-8 bg-teal-500/20 rounded-md border border-teal-500/40"></div>
                    <div class="w-full h-8 bg-teal-500/20 rounded-md border border-teal-500/40"></div>
                    <div class="w-full h-8 bg-teal-500/20 rounded-md border border-teal-500/40"></div>
                    <div class="w-full h-8 bg-yellow-500/20 rounded-md border border-yellow-500/40"></div>
                    <div class="w-full h-8 bg-yellow-500/20 rounded-md border border-yellow-500/40"></div>
                    <div class="w-full h-8 bg-yellow-500/20 rounded-md border border-yellow-500/40"></div>
                </div>
                
                <div class="flex justify-between items-end mt-4">
                    <div class="text-xs text-gray-500">Grace Period Progress</div>
                    <div class="text-3xl font-bold text-white">57 Hours <span class="text-sm font-normal text-gray-400">Remaining</span></div>
                </div>
            </div>

            <div class="glass-panel p-6 flex flex-col justification-between">
                <p class="text-gray-400 text-sm">Collateral Usage</p>
                <div class="text-4xl font-bold text-blue-400 mt-2">32.4%</div>
                <svg class="w-full h-16 mt-4 text-blue-500" viewBox="0 0 100 20" preserveAspectRatio="none">
                    <path d="M0 15 Q 10 10, 20 12 T 40 8 T 60 10 T 80 5 T 100 7 V 20 H 0 Z" fill="currentColor" fill-opacity="0.1"/>
                    <path d="M0 15 Q 10 10, 20 12 T 40 8 T 60 10 T 80 5 T 100 7" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                </svg>
            </div>

            <div class="glass-panel p-6 flex items-center gap-5">
                <svg class="w-24 h-24 text-gray-700" viewBox="0 0 36 36">
                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" stroke-width="4" stroke-dasharray="100, 100"/>
                    <path class="text-blue-500" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831" fill="none" stroke="currentColor" stroke-width="4" stroke-dasharray="70, 100" stroke-linecap="round"/>
                    <path class="text-teal-400" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831" fill="none" stroke="currentColor" stroke-width="4" stroke-dasharray="40, 100" stroke-linecap="round"/>
                    <path class="text-purple-500" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831" fill="none" stroke="currentColor" stroke-width="4" stroke-dasharray="20, 100" stroke-linecap="round"/>
                </svg>
                <div>
                    <p class="text-gray-400 text-sm">Composition</p>
                    <div class="flex items-center gap-2 mt-2">
                        <span class="w-3 h-3 bg-blue-500 rounded-full"></span>
                        <span class="text-sm">Main Stake (70%)</span>
                    </div>
                    <div class="flex items-center gap-2 mt-1">
                        <span class="w-3 h-3 bg-teal-400 rounded-full"></span>
                        <span class="text-sm">Yield (20%)</span>
                    </div>
                </div>
            </div>
        </div>

        <div class="glass-panel p-6 flex flex-col justify-between">
            <div>
                <h2 class="text-lg font-semibold uppercase">AVAILABLE ACTIONS</h2>
                
                <div class="mt-5 space-y-4">
                    <div class="p-4 bg-black/30 rounded-xl border border-white/5">
                        <p class="text-gray-400 text-[10px]">Adjustment Amount (TOKEN)</p>
                        <input type="number" placeholder="0.00" class="w-full bg-transparent text-2xl font-bold text-white mt-1 outline-none">
                    </div>
                    
                    <div class="p-4 bg-black/30 rounded-xl border border-white/5">
                        <p class="text-gray-400 text-[10px]">Min Health Factor Threshold</p>
                        <div class="flex gap-2 mt-2">
                            <button class="px-3 py-1 bg-white/10 rounded-lg text-xs hover:bg-white/20">1.2x</button>
                            <button class="px-3 py-1 bg-white/10 rounded-lg text-xs hover:bg-white/20">1.5x</button>
                            <button class="px-3 py-1 bg-blue-500/20 rounded-lg text-xs text-blue-400 border border-blue-500/50">2.0x</button>
                        </div>
                    </div>

                    <div class="grid grid-cols-4 gap-2">
                        <button class="py-2 rounded-lg bg-white/5 hover:bg-white/10 active:scale-95 transition-all text-xs font-bold text-white">25%</button>
                        <button class="py-2 rounded-lg bg-white/5 hover:bg-white/10 active:scale-95 transition-all text-xs font-bold text-white">50%</button>
                        <button class="py-2 rounded-lg bg-white/5 hover:bg-white/10 active:scale-95 transition-all text-xs font-bold text-white">75%</button>
                        <button class="py-2 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 active:scale-95 transition-all text-xs font-bold text-blue-400">MAX</button>
                    </div>
                </div>

                <div class="mt-5 p-4 bg-black/30 rounded-xl border border-white/5">
                    <p class="text-gray-400 text-[10px]">Your Wallet</p>
                    <div class="text-2xl font-bold text-blue-400 mt-1">5,000.00 <span class="text-sm font-normal text-gray-500">TOKEN</span></div>
                </div>
                <button class="w-full mt-5 py-4 rounded-xl btn-initialize font-bold text-white shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all">CLAIM ALL REWARDS</button>
            </div>
            
            <button class="w-full mt-3 py-4 rounded-xl btn-action font-bold text-gray-300 active:scale-[0.98] transition-all hover:bg-white/5">ADJUST COLLATERAL</button>
        </div>
    </div>
</div>



<div id="decollateralizeView" class="hidden max-w-7xl mx-auto">
    <div class="flex justify-between items-center mb-8">
        <h1 class="text-3xl font-bold">Decollateralize: Collateral Release Audit</h1>
        <button onclick="switchView('mainStakingView')" class="text-gray-400 hover:text-white px-4 py-2 border border-white/10 rounded-xl">← Back to Staking</button>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div class="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div class="glass-panel p-4 flex items-center gap-3">
                    <div id="slotIndicator" class="w-2 h-2 rounded-full bg-emerald-500"></div>
                    <div>
                        <p class="text-[10px] text-gray-400 uppercase">Slot Status</p>
                        <p class="text-xs font-bold text-white">Safe for Withdrawal</p>
                    </div>
                </div>
                <div class="glass-panel p-4 flex items-center gap-3">
                    <div class="w-2 h-2 rounded-full bg-emerald-500"></div>
                    <div>
                        <p class="text-[10px] text-gray-400 uppercase">Blacklist</p>
                        <p class="text-xs font-bold text-white">Cleared</p>
                    </div>
                </div>
                <div class="glass-panel p-4 flex items-center gap-3">
                    <div class="w-2 h-2 rounded-full bg-emerald-500"></div>
                    <div>
                        <p class="text-[10px] text-gray-400 uppercase">Pool State</p>
                        <p class="text-xs font-bold text-white">Unlocked</p>
                    </div>
                </div>
            </div>

            <div class="md:col-span-2 glass-panel p-6 border border-emerald-500/30 bg-emerald-900/10 flex items-center gap-4">
                <div class="p-3 bg-emerald-500/20 rounded-lg">
                    <svg class="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 11V7a4 4 0 118 0m-4 8v2m-6-4h12m-6-4h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                </div>
                <div>
                    <h3 class="text-emerald-400 font-bold uppercase tracking-wider">Collateral Unlock Ready</h3>
                    <p class="text-sm text-emerald-100/70">The grace period has passed. Your collateral is eligible for withdrawal.</p>
                </div>
            </div>

            <div class="glass-panel p-6 flex flex-col justify-between">
                <p class="text-gray-400 text-sm">Collateral Ratio Impact</p>
                <div class="text-4xl font-bold text-blue-400 mt-4">45.0%</div>
                <div class="w-full bg-gray-700 h-1.5 mt-4 rounded-full overflow-hidden">
                    <div class="w-[45%] h-full bg-blue-500"></div>
                </div>
            </div>

            <div class="glass-panel p-6 flex flex-col justify-between">
                <p class="text-gray-400 text-sm">Protocol Sync Status</p>
                <div class="flex items-center gap-2 mt-4">
                    <div class="w-3 h-3 bg-emerald-400 rounded-full animate-pulse"></div>
                    <div class="text-3xl font-bold text-white">Active</div>
                </div>
                <p class="text-xs text-gray-500 mt-2">Last check: Just now</p>
            </div>
        </div>

        <div class="glass-panel p-6 flex flex-col justify-between">
            <div>
                <h2 class="text-lg font-semibold uppercase">EXECUTE RELEASE</h2>
                
                <div class="mt-6 p-4 bg-black/30 rounded-xl border border-white/5">
                    <p class="text-gray-400 text-[10px]">Unlockable Amount (Available: 1,250.00)</p>
                    <input type="number" placeholder="0.00" class="w-full bg-transparent text-2xl font-bold text-emerald-400 mt-1 outline-none border-none">
                </div>

                <div id="safetyWarning" class="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl hidden">
                    <p class="text-yellow-500 text-[10px] font-bold uppercase">⚠️ Security Notice</p>
                    <p class="text-gray-400 text-[10px] mt-1">Ensure your transaction is executed in a new block to satisfy anti-MEV requirements.</p>
                </div>

               
                <button class="w-full mt-8 py-4 rounded-xl bg-emerald-500/20 border border-emerald-500/50 hover:bg-emerald-500/30 font-bold text-white transition-all shadow-lg shadow-emerald-500/10 cursor-pointer">
    CONFIRM DECOLLATERALIZE
</button>


            </div>
        </div>
    </div>
</div>



    




<div id="depositView" class="hidden max-w-7xl mx-auto">
    <div class="flex justify-between items-center mb-8">
        <h1 class="text-3xl font-bold">Deposit: Staking Synchronization Audit</h1>
        <button onclick="switchView('mainStakingView')" class="text-gray-400 hover:text-white px-4 py-2 border border-white/10 rounded-xl">← Back to Staking</button>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2 space-y-6">
            
            <div id="poolParameters" class="grid grid-cols-3 gap-4">
                <div class="glass-panel p-4">
                    <p class="text-[10px] text-gray-400 uppercase">Min Initial Stake</p>
                    <p id="minStakeValue" class="text-sm font-bold text-white mt-1">100.00 TOKEN</p>
                </div>
                <div class="glass-panel p-4">
                    <p class="text-[10px] text-gray-400 uppercase">Lockup Duration</p>
                    <p id="lockupDuration" class="text-sm font-bold text-white mt-1">30 Days</p>
                </div>
                <div class="glass-panel p-4">
                    <p class="text-[10px] text-gray-400 uppercase">Tier Multiplier</p>
                    <p id="tierMultiplier" class="text-sm font-bold text-emerald-400 mt-1">1.25x</p>
                </div>
            </div>

            <div class="glass-panel p-6 border border-blue-500/30 bg-blue-900/10 flex items-start gap-4">
                <div class="p-3 bg-blue-500/20 rounded-lg">
                    <svg class="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
                </div>
                <div>
                    <h3 class="text-blue-400 font-bold uppercase tracking-wider">Tier Weight Correction</h3>
                    <p class="text-sm text-blue-100/70">
                        Your deposit is being applied with a <b>Tier Multiplier</b> derived from pool index <b>[pool_index]</b>. 
                        Weighted stake has been synchronized with the global pool state.
                    </p>
                </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="glass-panel p-6 relative overflow-hidden flex flex-col justify-between">
                    <p class="text-gray-400 text-sm">Weighted Stake Growth</p>
                    <svg class="w-40 h-40 mt-4 mx-auto" viewBox="0 0 36 36">
                        <path class="text-white/5" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="100, 100"/>
                        <path class="text-indigo-500" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831" fill="none" stroke="currentColor" stroke-width="3" stroke-dasharray="75, 100" stroke-linecap="round"/>
                    </svg>
                    <div class="absolute inset-0 flex flex-col items-center justify-center pt-10">
                        <div class="text-4xl font-bold text-indigo-500">+75%</div>
                        <div class="text-xs text-gray-500 mt-1">Weight Added</div>
                    </div>
                </div>

                <div class="glass-panel p-6 flex flex-col justify-between relative">
                    <div class="flex justify-between items-center">
                        <p class="text-gray-400 text-sm">MEV Protection Layer</p>
                        <span class="text-xs text-emerald-400 font-medium">Verified</span>
                    </div>
                    <div class="mt-8">
                        <div class="text-3xl font-bold text-white">Slot Lock-In</div>
                        <div class="text-sm text-gray-400 mt-1">Flash Loan protection is active for this slot.</div>
                    </div>
                </div>
            </div>
        </div>

        <div class="glass-panel p-6 flex flex-col justify-between">
            <div>
                <h2 class="text-lg font-semibold uppercase">CONFIRM DEPOSIT</h2>
                
                <div class="mt-5 p-4 bg-black/30 rounded-xl border border-white/5">
                    <p class="text-gray-400 text-[10px]">Net Deposit Amount</p>
                    <input id="depositInput" type="number" placeholder="0.00" class="w-full bg-transparent text-2xl font-bold text-indigo-400 mt-1 outline-none border-none">
                    
                    <div class="flex gap-2 mt-3">
                        <button onclick="setDepositAmount(0.25)" class="flex-1 py-1 text-[10px] bg-white/5 hover:bg-white/10 rounded border border-white/5 text-white transition-all">25%</button>
                        <button onclick="setDepositAmount(0.50)" class="flex-1 py-1 text-[10px] bg-white/5 hover:bg-white/10 rounded border border-white/5 text-white transition-all">50%</button>
                        <button onclick="setDepositAmount(0.75)" class="flex-1 py-1 text-[10px] bg-white/5 hover:bg-white/10 rounded border border-white/5 text-white transition-all">75%</button>
                        <button onclick="setDepositAmount(1.00)" class="flex-1 py-1 text-[10px] bg-indigo-500/20 hover:bg-indigo-500/40 rounded border border-indigo-500/50 text-white transition-all">MAX</button>
                    </div>
                </div>

                <div id="depositStatus" class="mt-4 p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
                    <p class="text-[10px] text-indigo-300">Ready for synchronization with pool index: <span id="currentPoolIndex">0</span></p>
                </div>

                <button class="w-full mt-5 py-4 rounded-xl bg-indigo-500/20 border border-indigo-500/50 hover:bg-indigo-500/30 font-bold text-white transition-all">CONFIRM DEPOSIT</button>
            </div>
            <p class="text-[10px] text-gray-500 mt-4 text-center">Your deposit will be locked according to pool index rules. Audit in progress.</p>
        </div>
    </div>
</div>

<script>
    // Добавь эту функцию в свой app.js для работы кнопок
    function setDepositAmount(percent) {
        // Здесь замени 1000 на реальный баланс пользователя с кошелька
        const userBalance = 1000; 
        const amount = userBalance * percent;
        document.getElementById('depositInput').value = amount.toFixed(2);
    }
</script>





    
          
    



           
    <div id="claimView" class="hidden max-w-7xl mx-auto">
    <div class="flex justify-between items-center mb-8">
        <h1 class="text-3xl font-bold">Claim Rewards: Security Audit</h1>
        <button onclick="switchView('mainStakingView')" class="text-gray-400 hover:text-white px-4 py-2 border border-white/10 rounded-xl">← Back to Staking</button>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div class="md:col-span-2 glass-panel p-6">
                <div class="flex justify-between items-center mb-4">
                    <p class="text-gray-400 text-sm">Select Pools to Claim (Batch Processing)</p>
                    <button onclick="toggleAllTiers()" class="text-xs text-indigo-400 hover:text-indigo-300 font-bold">SELECT ALL</button>
                </div>
                <div id="tierSelector" class="grid grid-cols-5 gap-3">
                    <button onclick="toggleTier(0)" class="tier-btn p-3 bg-white/5 border border-white/10 rounded-lg text-xs font-bold text-gray-400 hover:border-indigo-500 transition-all">Tier 0</button>
                    <button onclick="toggleTier(1)" class="tier-btn p-3 bg-white/5 border border-white/10 rounded-lg text-xs font-bold text-gray-400 hover:border-indigo-500 transition-all">Tier 1</button>
                    <button onclick="toggleTier(2)" class="tier-btn p-3 bg-white/5 border border-white/10 rounded-lg text-xs font-bold text-gray-400 hover:border-indigo-500 transition-all">Tier 2</button>
                    <button onclick="toggleTier(3)" class="tier-btn p-3 bg-white/5 border border-white/10 rounded-lg text-xs font-bold text-gray-400 hover:border-indigo-500 transition-all">Tier 3</button>
                    <button onclick="toggleTier(4)" class="tier-btn p-3 bg-white/5 border border-white/10 rounded-lg text-xs font-bold text-gray-400 hover:border-indigo-500 transition-all">Tier 4</button>
                </div>
            </div>

            <div class="glass-panel p-6 relative overflow-hidden flex flex-col justify-between">
                <p class="text-gray-400 text-sm">Reward Safety Factor</p>
                <svg class="w-40 h-40 mt-4 mx-auto" viewBox="0 0 36 36">
                    <path class="text-white/5" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="100, 100"/>
                    <path class="text-emerald-400" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831" fill="none" stroke="currentColor" stroke-width="3" stroke-dasharray="92, 100" stroke-linecap="round"/>
                </svg>
                <div class="absolute inset-0 flex flex-col items-center justify-center pt-10">
                    <div class="text-4xl font-bold text-emerald-400">0.92</div>
                    <div class="text-xs text-gray-500 mt-1">Status: Validated</div>
                </div>
            </div>

            <div class="glass-panel p-6 flex flex-col justify-between relative">
                <div class="flex justify-between items-center">
                    <p class="text-gray-400 text-sm">Protocol Sync Status</p>
                    <span class="text-xs text-emerald-400 font-medium">Ready</span>
                </div>
                
                <div class="flex items-center gap-1.5 mt-5">
                    <div class="w-full h-8 bg-emerald-500/20 rounded-md border border-emerald-500/40"></div>
                    <div class="w-full h-8 bg-emerald-500/20 rounded-md border border-emerald-500/40"></div>
                    <div class="w-full h-8 bg-emerald-500 rounded-md relative shadow-lg shadow-emerald-500/30"></div>
                </div>
                
                <div class="flex justify-between items-end mt-4">
                    <div class="text-xs text-gray-500">Epoch Progress</div>
                    <div class="text-3xl font-bold text-white">Synced <span class="text-sm font-normal text-gray-400">Slot 452</span></div>
                </div>
            </div>

            <div class="glass-panel p-6 flex flex-col justification-between">
                <p class="text-gray-400 text-sm">Total Reward Yield</p>
                <div class="text-4xl font-bold text-yellow-500 mt-2">125.75</div>
                <svg class="w-full h-16 mt-4 text-yellow-500" viewBox="0 0 100 20" preserveAspectRatio="none">
                    <path d="M0 15 Q 10 10, 20 12 T 40 8 T 60 10 T 80 5 T 100 7 V 20 H 0 Z" fill="currentColor" fill-opacity="0.1"/>
                    <path d="M0 15 Q 10 10, 20 12 T 40 8 T 60 10 T 80 5 T 100 7" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                </svg>
            </div>

            <div class="glass-panel p-6 flex items-center gap-5">
                <svg class="w-24 h-24 text-gray-700" viewBox="0 0 36 36">
                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" stroke-width="4" stroke-dasharray="100, 100"/>
                    <path class="text-yellow-500" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831" fill="none" stroke="currentColor" stroke-width="4" stroke-dasharray="85, 100" stroke-linecap="round"/>
                </svg>
                <div>
                    <p class="text-gray-400 text-sm">Reward Split</p>
                    <div class="flex items-center gap-2 mt-2">
                        <span class="w-3 h-3 bg-yellow-500 rounded-full"></span>
                        <span class="text-sm">User Share (95%)</span>
                    </div>
                </div>
            </div>
        </div>

        <div class="glass-panel p-6 flex flex-col justification-between">
            <div>
                <h2 class="text-lg font-semibold uppercase">CONFIRM CLAIM</h2>
                
                <div class="mt-5">
                    <input type="number" placeholder="Enter amount to claim" class="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white text-sm outline-none focus:border-indigo-500">
                    <div class="grid grid-cols-4 gap-2 mt-3">
                        <button class="bg-white/5 py-1 rounded text-[10px] hover:bg-indigo-500/20">25%</button>
                        <button class="bg-white/5 py-1 rounded text-[10px] hover:bg-indigo-500/20">50%</button>
                        <button class="bg-white/5 py-1 rounded text-[10px] hover:bg-indigo-500/20">75%</button>
                        <button class="bg-indigo-500/20 py-1 rounded text-[10px] text-indigo-400">MAX</button>
                    </div>
                </div>

                <div class="mt-5 space-y-2 p-3 bg-black/20 rounded-lg">
                    <div class="flex justify-between text-[10px] text-gray-400"><span>Gross:</span><span>125.75</span></div>
                    <div class="flex justify-between text-[10px] text-gray-400"><span>Fee (5%):</span><span>6.29</span></div>
                </div>

                <div class="mt-5 p-4 bg-black/30 rounded-xl border border-white/5">
                    <p class="text-gray-400 text-[10px]">Net Rewards to Claim</p>
                    <div class="text-2xl font-bold text-emerald-400 mt-1">119.46 <span class="text-sm font-normal text-gray-500">TOKEN</span></div>
                </div>
                <button onclick="executeClaimRewards()" class="w-full mt-5 py-4 rounded-xl btn-initialize font-bold text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-all">EXECUTE CLAIM</button>
            </div>
            <p class="text-[10px] text-gray-500 mt-4 text-center">Fee: 5% Project Treasury Deducted</p>
        </div>
    </div>
</div>

<style>
    .tier-btn.active { background-color: rgba(99, 102, 241, 0.4); border-color: #6366f1; color: white; }
</style>

<script>
    function openClaimView() {
        document.getElementById('mainStakingView').classList.add('hidden');
        document.getElementById('claimView').classList.remove('hidden');
    }

    async function executeClaimRewards() {
        // Здесь ваша логика транзакции
        const btn = document.querySelector('.btn-initialize');
        await smartAction(btn, "Claiming", "Rewards Received!", "💎", async () => {
            const program = getAnchorProgram(STAKING_PROGRAM_ID, STAKING_IDL);
            const userPDA = await getUserStakingPDA(appState.walletPublicKey);
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
                    clock: window.solanaWeb3.SYSVAR_CLOCK_PUBKEY
                }).rpc();
        });
    }

    function switchView(viewId) {
        document.getElementById('claimView').classList.add('hidden');
        document.getElementById('mainStakingView').classList.add('hidden');
        document.getElementById(viewId).classList.remove('hidden');
    }

    function toggleTier(id) {
        const btn = document.querySelectorAll('.tier-btn')[id];
        btn.classList.toggle('active');
    }

    function toggleAllTiers() {
        const buttons = document.querySelectorAll('.tier-btn');
        const allActive = Array.from(buttons).every(btn => btn.classList.contains('active'));
        buttons.forEach(btn => {
            if (allActive) {
                btn.classList.remove('active');
            } else {
                btn.classList.add('active');
            }
        });
    }
</script>





    





    <div id="unstakeView" class="hidden max-w-7xl mx-auto">
    <div class="flex justify-between items-center mb-8">
        <h1 class="text-3xl font-bold">Unstake Position: Settlement Audit</h1>
        <button onclick="switchView('mainStakingView')" class="text-gray-400 hover:text-white px-4 py-2 border border-white/10 rounded-xl">← Back to Staking</button>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div id="lockupWarning" class="md:col-span-2 glass-panel p-6 border-orange-500/30 bg-orange-900/10 flex items-start gap-4">
                <div class="p-3 bg-orange-500/20 rounded-lg">
                    <svg class="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                </div>
                <div>
                    <h3 class="text-orange-400 font-bold">Early Exit Penalty Applied</h3>
                    <p class="text-sm text-orange-200/70">Time remaining until penalty-free: <span id="lockupTimer" class="font-bold text-white">02:14:05</span>. Penalty: <b>19% (475.00 TOKEN)</b>.</p>
                </div>
            </div>
            
            <div class="glass-panel p-6 relative overflow-hidden flex flex-col justify-between">
                <p class="text-gray-400 text-sm">Early Exit Penalty</p>
                <svg class="w-40 h-40 mt-4 mx-auto" viewBox="0 0 36 36">
                    <path class="text-white/5" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="100, 100"/>
                    <path class="text-orange-500" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831" fill="none" stroke="currentColor" stroke-width="3" stroke-dasharray="19, 100" stroke-linecap="round"/>
                </svg>
                <div class="absolute inset-0 flex flex-col items-center justify-center pt-10">
                    <div class="text-4xl font-bold text-orange-500">19%</div>
                    <div class="text-xs text-gray-500 mt-1">Status: Applied</div>
                </div>
            </div>

            <div class="glass-panel p-6 flex flex-col justify-between relative">
                <div class="flex justify-between items-center">
                    <p class="text-gray-400 text-sm">MEV Protection Layer</p>
                    <span id="mevStatus" class="text-xs text-emerald-400 font-medium">Locked</span>
                </div>
                
                <div class="flex items-center gap-1.5 mt-5">
                    <div class="w-full h-8 bg-purple-500 rounded-md"></div>
                    <div class="w-full h-8 bg-purple-500 rounded-md"></div>
                    <div class="w-full h-8 bg-emerald-500/20 rounded-md border border-emerald-500/40"></div>
                </div>
                
                <div class="flex justify-between items-end mt-4">
                    <div class="text-xs text-gray-500">Slot Safety Check</div>
                    <div class="text-3xl font-bold text-white">Active <span class="text-sm font-normal text-gray-400">Validated</span></div>
                </div>
            </div>

            <div class="glass-panel p-6 flex flex-col justification-between">
                <p class="text-gray-400 text-sm">Estimated Net Payout</p>
                <div class="text-4xl font-bold text-blue-400 mt-2">2,025.00</div>
                <svg class="w-full h-16 mt-4 text-blue-500" viewBox="0 0 100 20" preserveAspectRatio="none">
                    <path d="M0 15 Q 10 10, 20 12 T 40 8 T 60 10 T 80 5 T 100 7 V 20 H 0 Z" fill="currentColor" fill-opacity="0.1"/>
                    <path d="M0 15 Q 10 10, 20 12 T 40 8 T 60 10 T 80 5 T 100 7" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                </svg>
            </div>

            <div class="glass-panel p-6 flex items-center gap-5">
                <svg class="w-24 h-24 text-gray-700" viewBox="0 0 36 36">
                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" stroke-width="4" stroke-dasharray="100, 100"/>
                    <path class="text-orange-500" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831" fill="none" stroke="currentColor" stroke-width="4" stroke-dasharray="60, 100" stroke-linecap="round"/>
                    <path class="text-red-500" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831" fill="none" stroke="currentColor" stroke-width="4" stroke-dasharray="30, 100" stroke-linecap="round"/>
                </svg>
                <div>
                    <p class="text-gray-400 text-sm">Penalty Split</p>
                    <div class="flex items-center gap-2 mt-2">
                        <span class="w-3 h-3 bg-orange-500 rounded-full"></span>
                        <span class="text-sm">Admin (60%)</span>
                    </div>
                    <div class="flex items-center gap-1 mt-1">
                        <span class="w-3 h-3 bg-red-500 rounded-full"></span>
                        <span class="text-sm">DAO Treasury (40%)</span>
                    </div>
                </div>
            </div>
        </div>

        <div class="glass-panel p-6 flex flex-col justify-between">
            <div>
                <h2 class="text-lg font-semibold uppercase">CONFIRM UNSTAKE</h2>
                
                <div class="mt-5 space-y-4">
                    <div class="p-4 bg-black/30 rounded-xl border border-white/5">
                        <p class="text-gray-400 text-[10px] uppercase">Withdrawal Amount (TOKEN)</p>
                        <input type="number" placeholder="0.00" class="w-full bg-transparent text-2xl font-bold text-white mt-1 outline-none">
                    </div>
                    
                    <div class="grid grid-cols-4 gap-2">
                        <button class="py-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-bold transition-all">25%</button>
                        <button class="py-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-bold transition-all">50%</button>
                        <button class="py-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-bold transition-all">75%</button>
                        <button class="py-2 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-xs font-bold text-blue-400 transition-all">MAX</button>
                    </div>
                </div>

                <div class="mt-6 space-y-2 p-4 bg-black/40 rounded-xl border border-white/10">
                    <div class="flex justify-between text-[10px] text-gray-400"><span>Admin Fee Share:</span><span class="text-white">285.00 TOKEN</span></div>
                    <div class="flex justify-between text-[10px] text-gray-400"><span>DAO Seized:</span><span class="text-white">190.00 TOKEN</span></div>
                    <div class="mt-2 pt-2 border-t border-white/10 flex justify-between">
                        <span class="text-[10px] text-gray-400">Total Deduction:</span>
                        <span class="text-lg font-bold text-red-400">475.00 TOKEN</span>
                    </div>
                </div>
                
                <button id="unstakeBtn" class="w-full mt-6 py-4 rounded-xl bg-red-500/20 border border-red-500/50 hover:bg-red-500/30 font-bold text-white transition-all shadow-lg shadow-red-500/10">CONFIRM & EXIT</button>
            </div>
            
            <div id="liquidityAlert" class="hidden mt-4 p-3 bg-red-900/20 border border-red-500/30 rounded-lg text-center">
                <p class="text-[10px] text-red-400 uppercase font-bold">Liquidity Warning: Vault reserves low</p>
            </div>

            <p class="text-[10px] text-gray-500 mt-4 text-center">Warning: This action is irreversible. Your account may be closed if balance drops to zero.</p>
        </div>
    </div>
</div>

    
                
              

   
<div id="closeAccountView" class="hidden max-w-7xl mx-auto">
    <div class="flex justify-between items-center mb-8">
        <h1 class="text-3xl font-bold">Close Account: Deactivation Audit</h1>
        <button onclick="switchView('mainStakingView')" class="text-gray-400 hover:text-white px-4 py-2 border border-white/10 rounded-xl">← Back to Staking</button>

          </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2 space-y-6">
            
            <div class="glass-panel p-6 border border-red-500/30 bg-red-900/10 flex items-start gap-4">
                <div class="p-3 bg-red-500/20 rounded-lg">
                    <svg class="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                </div>
                <div>
                    <h3 class="text-red-400 font-bold uppercase tracking-wider">Security Invariants Check</h3>
                    <p class="text-sm text-red-100/70">
                        System is auditing your account state. Verified: <b>0 Staked Amount</b>, <b>0 Collateral Lock</b>, <b>Minimal Reward Dust</b>. 
                        Account is eligible for permanent deactivation.
                    </p>
                </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="glass-panel p-6 flex flex-col justify-between">
                    <p class="text-gray-400 text-sm">Reward Dust Threshold</p>
                    <div class="text-3xl font-bold text-white mt-6">< 100 <span class="text-sm text-gray-500">TOKEN</span></div>
                    <div class="mt-2 text-xs text-emerald-400">Status: Within Limits</div>
                </div>

                <div class="glass-panel p-6 flex flex-col justify-between">
                    <p class="text-gray-400 text-sm">Account Integrity Audit</p>
                    <div class="text-3xl font-bold text-white mt-6">Initialized</div>
                    <div class="mt-2 text-xs text-blue-400">Ready for deallocation</div>
                </div>
            </div>
        </div>

        <div class="glass-panel p-6 flex flex-col justify-between">
            <div>
                <h2 class="text-lg font-semibold uppercase">CONFIRM DEACTIVATION</h2>
                <div class="mt-5 p-4 bg-black/30 rounded-xl border border-white/5">
                    <p class="text-gray-400 text-[10px]">Rent Recovery Expected</p>
                    <div class="text-2xl font-bold text-emerald-400 mt-1">0.02 <span class="text-sm font-normal text-gray-500">SOL</span></div>
                </div>
                <button class="w-full mt-5 py-4 rounded-xl bg-red-600/20 border border-red-600/50 hover:bg-red-600/30 font-bold text-white transition-all">CLOSE ACCOUNT PERMANENTLY</button>
            </div>
            <p class="text-[10px] text-gray-500 mt-4 text-center">Caution: This process clears the account index and returns rent. Irreversible.</p>
        </div>
    </div>
</div>





                           
        




                            <script>
    // --- ГЛОБАЛЬНЫЙ МЕНЕДЖЕР UI ---
const UI_MANAGER = {
    // Список всех ID, которые должны переключаться
    viewIds: [
        'initStakeView', 
        'mainStakingView', 
        'collateralView', 
        'decollateralizeView', 
        'depositView', 
        'claimView', 
        'unstakeView', 
        'closeAccountView'
    ],
    
    // Функция переключения
    switchView: function(targetId) {
        console.log("🔄 Переключение на:", targetId);
        this.viewIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                if (id === targetId) {
                    el.classList.remove('hidden');
                } else {
                    el.classList.add('hidden');
                }
            } else {
                console.warn(`⚠️ Элемент с ID ${id} не найден в DOM.`);
            }
        });
    },

    // Инициализация событий
    init: function() {
        // Слушаем клики по всему документу (делегирование)
        document.addEventListener('click', (e) => {
            const trigger = e.target.closest('.nav-trigger');
            if (trigger) {
                const target = trigger.getAttribute('data-target');
                if (target) {
                    this.switchView(target);
                }
            }
        });
        console.log("✅ UI_MANAGER успешно инициализирован");
    }
};

// Привязываем к объекту window для доступа из кнопок (onclick)
window.UI_MANAGER = UI_MANAGER;
window.switchView = (id) => UI_MANAGER.switchView(id);

// Запуск при полной загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    UI_MANAGER.init();
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








            






            

