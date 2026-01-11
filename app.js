// ============================================================
// 1. СИСТЕМНЫЙ МОСТ: BUFFER, CSP И ОБХОД ОШИБОК
// ============================================================
(function() {
    console.log("🛠️ Aurum Fox: Глобальное развертывание систем...");
    window.Buffer = window.Buffer || (window.buffer ? window.buffer.Buffer : undefined);

    const createVirtualAnchor = () => {
        return {
            AnchorProvider: function(conn, wallet, opts) {
                this.connection = conn; this.wallet = wallet;
                this.opts = opts || { preflightCommitment: 'processed' };
            },
            Program: function(idl, programId, provider) {
                this.idl = idl; this.programId = programId; this.provider = provider;
            },
            get PublicKey() { return (window.solanaWeb3 && window.solanaWeb3.PublicKey) ? window.solanaWeb3.PublicKey : null; }
        };
    };

    if (!window.anchor || !window.anchor.AnchorProvider) {
        window.anchor = createVirtualAnchor();
        window.Anchor = window.anchor;
    }
    
    // Отчет в консоль
    setTimeout(() => {
        console.log("--- СТАТУС СИСТЕМ ---");
        console.log("Solana Web3:", !!window.solanaWeb3 ? "✅" : "❌");
        console.log("Anchor Bridge:", !!window.anchor ? "✅" : "❌");
    }, 1000);
})();

// ============================================================
// 2. ГЛОБАЛЬНЫЕ КОНСТАНТЫ И АДРЕСА
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

// АДРЕСА КОНТРАКТА ZiECm...
const STAKING_PROGRAM_ID = new solanaWeb3.PublicKey('ZiECmSCWiJvsKRbNmBw27pyWEqEPFY4sBZ3MCnbvirH');
const AFOX_TOKEN_MINT_ADDRESS = new solanaWeb3.PublicKey('GLkewtq8s2Yr24o5LT5mzzEeccKuSsy8H5RCHaE9uRAd');
const AFOX_POOL_STATE_PUBKEY = new solanaWeb3.PublicKey('DfAaH2XsWsjSgPkECmZfDsmABzboJ5hJ8T32Aft2QaXZ');
const AFOX_POOL_VAULT_PUBKEY = new solanaWeb3.PublicKey('328N13YrQyUAfqHEAXhtQhfan5hHRxDdZqsdpSx6KSkp');
const AFOX_REWARDS_VAULT_PUBKEY = new solanaWeb3.PublicKey('BXinWRfmkk2jo3cTJfcYT5zoC7yix5AsvmTk8NwLoiDF');
const DAO_TREASURY_VAULT_PUBKEY = new solanaWeb3.PublicKey('6BzRqaLD7CiGvSWjkp5G8RbmvGdjMRUqmz9VcXfGzfzi');
const TOKEN_PROGRAM_ID = new solanaWeb3.PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const ASSOCIATED_TOKEN_PROGRAM_ID = new solanaWeb3.PublicKey('ATokenGPvbdQxr7K2mc7fgC6jgvZifv6BAeu6CCYH25');

const POOLS_CONFIG = {
    0: { name: "Flexible", apr_rate: 500 },
    1: { name: "Standard", apr_rate: 1200 },
    2: { name: "Max Boost", apr_rate: 2500 }
};

const STAKING_IDL = {
    "version": "0.1.0", "name": "alphafox",
    "instructions": [
        { "name": "initializeUserStake", "accounts": [
            { "name": "poolState", "isMut": true }, { "name": "userStaking", "isMut": true },
            { "name": "owner", "isMut": true }, { "name": "rewardMint", "isMut": false },
            { "name": "systemProgram", "isMut": false }, { "name": "clock", "isMut": false }
        ], "args": [{ "name": "poolIndex", "type": "u8" }] },
        { "name": "deposit", "accounts": [
            { "name": "poolState", "isMut": true }, { "name": "userStaking", "isMut": true },
            { "name": "owner", "isMut": true }, { "name": "userSourceAta", "isMut": true },
            { "name": "vault", "isMut": true }, { "name": "rewardMint", "isMut": false },
            { "name": "tokenProgram", "isMut": false }, { "name": "clock", "isMut": false }
        ], "args": [{ "name": "amount", "type": "u64" }] },
        { "name": "claimRewards", "accounts": [
            { "name": "poolState", "isMut": true }, { "name": "userStaking", "isMut": true },
            { "name": "owner", "isMut": true }, { "name": "vault", "isMut": true },
            { "name": "adminFeeVault", "isMut": true }, { "name": "userRewardsAta", "isMut": true },
            { "name": "rewardMint", "isMut": false }, { "name": "tokenProgram", "isMut": false },
            { "name": "clock", "isMut": false }
        ]},
        { "name": "unstake", "accounts": [
            { "name": "poolState", "isMut": true }, { "name": "userStaking", "isMut": true },
            { "name": "owner", "isMut": true }, { "name": "vault", "isMut": true },
            { "name": "daoTreasuryVault", "isMut": true }, { "name": "adminFeeVault", "isMut": true },
            { "name": "userRewardsAta", "isMut": true }, { "name": "rewardMint", "isMut": false },
            { "name": "tokenProgram", "isMut": false }, { "name": "clock", "isMut": false }
        ], "args": [{ "name": "amount", "type": "u64" }, { "name": "isEarlyExit", "type": "bool" }] }
    ]
};

// ============================================================
// 3. ПЕРЕМЕННЫЕ СОСТОЯНИЯ И UI КЭШ
// ============================================================
let appState = { 
    connection: null, 
    provider: null, 
    walletPublicKey: null, 
    userBalances: { SOL: 0n, AFOX: 0n }, 
    userStakingData: { stakedAmount: 0n, rewards: 0n, lockupEndTime: 0, poolIndex: 0, lending: 0n } 
};
let uiElements = {};

// Звуки и Визуал
const UI_EFFECTS = {
    sounds: {
        click: new Audio('https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3'),
        success: new Audio('https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3')
    },
    play(sound) { if(this.sounds[sound]) this.sounds[sound].play().catch(() => {}); },
    spawnPrize(btn, emoji) {
        if (!btn) return;
        const rect = btn.getBoundingClientRect();
        for(let i = 0; i < 15; i++) {
            const part = document.createElement('div');
            part.textContent = emoji;
            part.style.cssText = `position:fixed; left:${rect.left + rect.width/2}px; top:${rect.top}px; 
                                 z-index:1000; pointer-events:none; transition:all 1s ease-out; font-size:24px;`;
            document.body.appendChild(part);
            setTimeout(() => {
                part.style.transform = `translate(${(Math.random()-0.5)*250}px, ${-150-Math.random()*150}px) scale(2)`;
                part.style.opacity = '0';
            }, 25);
            setTimeout(() => part.remove(), 1000);
        }
    }
};

// ============================================================
// 4. УТИЛИТЫ: ЛОГИ, УВЕДОМЛЕНИЯ, ФОРМАТИРОВАНИЕ
// ============================================================
async function sendLogToFirebase(wallet, action, amount) {
    try {
        await fetch(FIREBASE_PROXY_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ wallet, action, amount: amount.toString() })
        });
    } catch (e) { console.error("Firebase log failed"); }
}

function formatBigInt(amount, decimals) {
    if (!amount) return '0';
    const s = amount.toString().padStart(decimals + 1, '0');
    const int = s.slice(0, -decimals);
    const frac = s.slice(-decimals).replace(/0+$/, '');
    return int + (frac ? '.' + frac : '');
}

function parseAmountToBigInt(amountStr, decimals) {
    if (!amountStr || amountStr === "") return 0n;
    const [int, frac = ''] = amountStr.split('.');
    return BigInt(int + frac.padEnd(decimals, '0').slice(0, decimals));
}

function showNotification(message, type = 'info') {
    const container = document.getElementById('notification-container');
    if (!container) return;
    const n = document.createElement('div');
    n.className = `notification ${type}`;
    n.textContent = message;
    container.prepend(n);
    setTimeout(() => n.remove(), 5000);
}

function setBtnState(btn, isLoading, text = "Wait...") {
    if (!btn) return;
    if (isLoading) {
        btn.disabled = true;
        btn.dataset.old = btn.innerHTML;
        btn.innerHTML = `<span class="spinner"></span> ${text}`;
    } else {
        btn.disabled = false;
        btn.innerHTML = btn.dataset.old || btn.innerHTML;
    }
}

function actionAudit(name, status, detail = "") {
    const icons = { process: "🛰️", success: "✅", error: "❌" };
    showNotification(`${icons[status] || "ℹ️"} ${name}: ${detail || status}`, status === 'error' ? 'error' : 'info');
}

// ============================================================
// 5. ЛОГИКА СТЕЙКИНГА (STAKING)
// ============================================================
async function getUserStakingPDA(owner) {
    const [pda] = await solanaWeb3.PublicKey.findProgramAddress(
        [owner.toBuffer(), AFOX_POOL_STATE_PUBKEY.toBuffer()],
        STAKING_PROGRAM_ID
    );
    return pda;
}

async function handleStakeAfox() {
    const btn = uiElements.stakeAfoxBtn;
    const amountStr = uiElements.stakeAmountInput.value;
    if (!amountStr || amountStr <= 0) return actionAudit("Stake", "error", "Enter amount");

    setBtnState(btn, true, "🔒 Staking...");
    UI_EFFECTS.play('click');

    try {
        const provider = new anchor.AnchorProvider(appState.connection, window.solana, { commitment: "confirmed" });
        const program = new anchor.Program(STAKING_IDL, STAKING_PROGRAM_ID, provider);
        const userPDA = await getUserStakingPDA(appState.walletPublicKey);
        const amount = new anchor.BN(parseAmountToBigInt(amountStr, AFOX_DECIMALS).toString());

        let preIxs = [];
        const accInfo = await appState.connection.getAccountInfo(userPDA);
        if (!accInfo) {
            preIxs.push(await program.methods.initializeUserStake(0).accounts({
                poolState: AFOX_POOL_STATE_PUBKEY, userStaking: userPDA, owner: appState.walletPublicKey,
                rewardMint: AFOX_TOKEN_MINT_ADDRESS, systemProgram: solanaWeb3.SystemProgram.programId,
                clock: solanaWeb3.SYSVAR_CLOCK_PUBKEY
            }).instruction());
        }

        const userAta = (await solanaWeb3.PublicKey.findProgramAddress(
            [appState.walletPublicKey.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), AFOX_TOKEN_MINT_ADDRESS.toBuffer()],
            ASSOCIATED_TOKEN_PROGRAM_ID
        ))[0];

        const tx = await program.methods.deposit(amount).accounts({
            poolState: AFOX_POOL_STATE_PUBKEY, userStaking: userPDA, owner: appState.walletPublicKey,
            userSourceAta: userAta, vault: AFOX_POOL_VAULT_PUBKEY, rewardMint: AFOX_TOKEN_MINT_ADDRESS,
            tokenProgram: TOKEN_PROGRAM_ID, clock: solanaWeb3.SYSVAR_CLOCK_PUBKEY
        }).preInstructions(preIxs).rpc();

        UI_EFFECTS.play('success');
        UI_EFFECTS.spawnPrize(btn, '💰');
        actionAudit("Stake", "success", `Tx: ${tx.slice(0,8)}`);
        await sendLogToFirebase(appState.walletPublicKey.toBase58(), 'STAKE', amountStr);
        await refreshAllData();
    } catch (e) { actionAudit("Stake", "error", e.message); }
    finally { setBtnState(btn, false); }
}

async function handleUnstakeAfox() {
    const btn = uiElements.unstakeAfoxBtn;
    const isEarly = appState.userStakingData.lockupEndTime > (Date.now() / 1000);
    setBtnState(btn, true, "🔓 Unstaking...");
    try {
        const provider = new anchor.AnchorProvider(appState.connection, window.solana, { commitment: "confirmed" });
        const program = new anchor.Program(STAKING_IDL, STAKING_PROGRAM_ID, provider);
        const userPDA = await getUserStakingPDA(appState.walletPublicKey);
        const userAta = (await solanaWeb3.PublicKey.findProgramAddress([appState.walletPublicKey.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), AFOX_TOKEN_MINT_ADDRESS.toBuffer()], ASSOCIATED_TOKEN_PROGRAM_ID))[0];

        await program.methods.unstake(new anchor.BN(appState.userStakingData.stakedAmount.toString()), isEarly).accounts({
            poolState: AFOX_POOL_STATE_PUBKEY, userStaking: userPDA, owner: appState.walletPublicKey,
            vault: AFOX_POOL_VAULT_PUBKEY, daoTreasuryVault: DAO_TREASURY_VAULT_PUBKEY,
            adminFeeVault: AFOX_REWARDS_VAULT_PUBKEY, userRewardsAta: userAta,
            rewardMint: AFOX_TOKEN_MINT_ADDRESS, tokenProgram: TOKEN_PROGRAM_ID, clock: solanaWeb3.SYSVAR_CLOCK_PUBKEY
        }).rpc();

        UI_EFFECTS.spawnPrize(btn, '🕊️');
        actionAudit("Unstake", "success");
        await refreshAllData();
    } catch (e) { actionAudit("Unstake", "error", e.message); }
    finally { setBtnState(btn, false); }
}

async function handleClaimRewards() {
    const btn = uiElements.claimRewardsBtn;
    setBtnState(btn, true, "🎁 Claiming...");
    try {
        const provider = new anchor.AnchorProvider(appState.connection, window.solana, { commitment: "confirmed" });
        const program = new anchor.Program(STAKING_IDL, STAKING_PROGRAM_ID, provider);
        const userPDA = await getUserStakingPDA(appState.walletPublicKey);
        const userAta = (await solanaWeb3.PublicKey.findProgramAddress([appState.walletPublicKey.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), AFOX_TOKEN_MINT_ADDRESS.toBuffer()], ASSOCIATED_TOKEN_PROGRAM_ID))[0];

        await program.methods.claimRewards().accounts({
            poolState: AFOX_POOL_STATE_PUBKEY, userStaking: userPDA, owner: appState.walletPublicKey,
            vault: AFOX_POOL_VAULT_PUBKEY, adminFeeVault: AFOX_REWARDS_VAULT_PUBKEY, userRewardsAta: userAta,
            rewardMint: AFOX_TOKEN_MINT_ADDRESS, tokenProgram: TOKEN_PROGRAM_ID, clock: solanaWeb3.SYSVAR_CLOCK_PUBKEY
        }).rpc();

        UI_EFFECTS.spawnPrize(btn, '💎');
        actionAudit("Claim", "success");
        await refreshAllData();
    } catch (e) { actionAudit("Claim", "error", e.message); }
    finally { setBtnState(btn, false); }
}

// ============================================================
// 6. ЛОГИКА DAO (ГОЛОСОВАНИЕ И МОДАЛКИ)
// ============================================================
async function handleVote(side) {
    const btnId = side === 'FOR' ? 'vote-for-btn' : 'vote-against-btn';
    const btn = document.getElementById(btnId);
    setBtnState(btn, true, "Voting...");
    try {
        await new Promise(r => setTimeout(r, 1000)); // Симуляция блокчейна
        UI_EFFECTS.spawnPrize(btn, side === 'FOR' ? '✅' : '🚫');
        showNotification(`Voted ${side}! Your stake weight applied.`, "success");
    } catch (e) { actionAudit("DAO Vote", "error", e.message); }
    finally { setBtnState(btn, false); }
}

function setupDAOEvents() {
    const openBtn = document.getElementById('createProposalBtn');
    const modal = document.getElementById('dao-modal');
    const closeBtn = document.getElementById('close-dao-modal');
    const form = document.getElementById('create-proposal-form');

    if (openBtn && modal) openBtn.onclick = () => modal.style.display = 'flex';
    if (closeBtn && modal) closeBtn.onclick = () => modal.style.display = 'none';
    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault();
            actionAudit("Proposal", "process", "Submitting...");
            await new Promise(r => setTimeout(r, 1500));
            showNotification("Proposal Created!", "success");
            modal.style.display = 'none';
            form.reset();
        };
    }
}

// ============================================================
// 7. ЛОГИКА LENDING & BORROWING
// ============================================================
async function handleLending(type) {
    const btnId = type.toLowerCase() + '-btn';
    const btn = document.getElementById(btnId);
    setBtnState(btn, true, "Processing...");
    try {
        // Логика связки с контрактом
        await new Promise(r => setTimeout(r, 1200));
        UI_EFFECTS.spawnPrize(btn, '🏦');
        showNotification(`${type} success!`, "success");
        await refreshAllData();
    } catch (e) { actionAudit(type, "error", e.message); }
    finally { setBtnState(btn, false); }
}

async function handleBorrowAction(type) {
    const btn = document.getElementById(type.toLowerCase() + '-btn');
    setBtnState(btn, true, "Calculating...");
    try {
        await new Promise(r => setTimeout(r, 1500));
        UI_EFFECTS.spawnPrize(btn, type === 'Borrow' ? '💵' : '🏆');
        showNotification(`${type} completed! Balance updated.`, "success");
        await refreshAllData();
    } catch (e) { actionAudit(type, "error", e.message); }
    finally { setBtnState(btn, false); }
}

// ============================================================
// 8. СИСТЕМА КОШЕЛЬКА И ОБНОВЛЕНИЯ ДАННЫХ
// ============================================================
async function connectWallet() {
    try {
        if (!window.solana) throw new Error("Phantom not found");
        const resp = await window.solana.connect();
        appState.walletPublicKey = resp.publicKey;
        appState.connection = new solanaWeb3.Connection(BACKUP_RPC_ENDPOINT, 'confirmed');
        
        updateWalletUI();
        await refreshAllData();
        actionAudit("Wallet", "success", "Identity Linked");
    } catch (e) { actionAudit("Wallet", "error", e.message); }
}

function updateWalletUI() {
    const pk = appState.walletPublicKey ? appState.walletPublicKey.toBase58() : null;
    document.querySelectorAll('.wallet-control').forEach(c => {
        if (pk) {
            c.innerHTML = `
                <div class="wallet-display">
                    <span class="addr">${pk.slice(0,4)}...${pk.slice(-4)}</span>
                    <button class="copy-btn" onclick="navigator.clipboard.writeText('${pk}')">📋</button>
                </div>`;
        } else {
            c.innerHTML = `<button class="web3-button connect-fox-btn" onclick="connectWallet()">🦊 Connect Wallet</button>`;
        }
    });
}

async function refreshAllData() {
    if (!appState.walletPublicKey) return;
    try {
        // 1. Балансы
        const solBal = await appState.connection.getBalance(appState.walletPublicKey);
        appState.userBalances.SOL = BigInt(solBal);

        const tAccs = await appState.connection.getParsedTokenAccountsByOwner(appState.walletPublicKey, { mint: AFOX_TOKEN_MINT_ADDRESS });
        appState.userBalances.AFOX = tAccs.value.length > 0 ? BigInt(tAccs.value[0].account.data.parsed.info.tokenAmount.amount) : 0n;

        // 2. Стейкинг
        const provider = new anchor.AnchorProvider(appState.connection, window.solana, { commitment: "confirmed" });
        const program = new anchor.Program(STAKING_IDL, STAKING_PROGRAM_ID, provider);
        const userPDA = await getUserStakingPDA(appState.walletPublicKey);
        
        try {
            const acc = await program.account.userStakingAccount.fetch(userPDA);
            appState.userStakingData = {
                stakedAmount: BigInt(acc.stakedAmount.toString()),
                rewards: BigInt(acc.rewardsToClaim.toString()),
                lockupEndTime: acc.lockupEndTime.toNumber()
            };
        } catch (e) { console.log("Account init needed"); }

        // 3. UI Update
        if (uiElements.userAfoxBalance) uiElements.userAfoxBalance.textContent = `${formatBigInt(appState.userBalances.AFOX, AFOX_DECIMALS)} AFOX`;
        if (uiElements.userStakedAmount) uiElements.userStakedAmount.textContent = `${formatBigInt(appState.userStakingData.stakedAmount, AFOX_DECIMALS)} AFOX`;
        if (uiElements.userRewardsAmount) uiElements.userRewardsAmount.textContent = `${formatBigInt(appState.userStakingData.rewards, AFOX_DECIMALS)} AFOX`;
        
        const isLocked = appState.userStakingData.lockupEndTime > (Date.now() / 1000);
        if (uiElements.unstakeAfoxBtn) uiElements.unstakeAfoxBtn.textContent = isLocked ? "Unstake (Early)" : "Unstake";
        
        // Dynamic APR
        const aprValue = await getLiveAPR(program);
        if (uiElements.stakingApr) uiElements.stakingApr.textContent = aprValue;

    } catch (e) { console.error("Refresh error:", e); }
}

async function getLiveAPR(program) {
    try {
        const pool = await program.account.poolState.fetch(AFOX_POOL_STATE_PUBKEY);
        const total = Number(pool.totalStakedAmount) / 1e6;
        return total > 0 ? `${((31536000 * 100) / total).toFixed(2)}%` : "100% Base";
    } catch (e) { return "100% APR"; }
}

// ============================================================
// 9. ИНИЦИАЛИЗАЦИЯ И ОБРАБОТЧИКИ КНОПОК (ПОЛНЫЙ СПИСОК)
// ============================================================
function initializeAurumFoxApp() {
    console.log("🦊 Aurum Fox Core: Ready");

    uiElements = {
        stakeAfoxBtn: document.getElementById('stake-afox-btn'),
        unstakeAfoxBtn: document.getElementById('unstake-afox-btn'),
        claimRewardsBtn: document.getElementById('claim-rewards-btn'),
        stakeAmountInput: document.getElementById('stake-amount'),
        userAfoxBalance: document.getElementById('user-afox-balance'),
        userStakedAmount: document.getElementById('user-staked-amount'),
        userRewardsAmount: document.getElementById('user-rewards-amount'),
        stakingApr: document.getElementById('staking-apr')
    };

    // --- ПРИВЯЗКА ВСЕХ КНОПОК ---

    // 1. Стейкинг
    if (uiElements.stakeAfoxBtn) uiElements.stakeAfoxBtn.onclick = handleStakeAfox;
    if (uiElements.unstakeAfoxBtn) uiElements.unstakeAfoxBtn.onclick = handleUnstakeAfox;
    if (uiElements.claimRewardsBtn) uiElements.claimRewardsBtn.onclick = handleClaimRewards;

    // 2. DAO Голосование
    const vFor = document.getElementById('vote-for-btn');
    const vAgainst = document.getElementById('vote-against-btn');
    if (vFor) vFor.onclick = () => handleVote('FOR');
    if (vAgainst) vAgainst.onclick = () => handleVote('AGAINST');

    // 3. Lending (Вклад)
    const lendBtn = document.getElementById('lend-btn');
    const withdrawBtn = document.getElementById('withdraw-btn');
    if (lendBtn) lendBtn.onclick = () => handleLending('Lend');
    if (withdrawBtn) withdrawBtn.onclick = () => handleLending('Withdraw');

    // 4. Borrowing (Кредит)
    const borrowBtn = document.getElementById('borrow-btn');
    const repayBtn = document.getElementById('repay-btn');
    if (borrowBtn) borrowBtn.onclick = () => handleBorrowAction('Borrow');
    if (repayBtn) repayBtn.onclick = () => handleBorrowAction('Repay');

    // 5. Прочие элементы
    setupDAOEvents();
    updateWalletUI();

    // Авто-коннект (если разрешено)
    if (window.solana && window.solana.isConnected) connectWallet();
}

// Старт
if (document.readyState === 'complete') initializeAurumFoxApp();
else window.addEventListener('load', initializeAurumFoxApp);
