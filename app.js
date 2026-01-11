/**
 * 🦊 AURUM FOX (AFOX) - UNIFIED CORE SYSTEM
 * [Staking + DAO + Lending + Wallet Bridge]
 * Version: 2.0.0-PRO (Full Integration)
 */

// ============================================================
// БЛОК 0: ГЛОБАЛЬНЫЙ МОСТ (CSP & BUFFER FIX)
// ============================================================
(function() {
    console.log("🛠️ [System]: Инициализация Aurum Fox Core...");

    // Фикс Buffer для работы Solana Web3 в браузере
    window.Buffer = window.Buffer || (window.buffer ? window.buffer.Buffer : undefined);

    // Обход блокировок CSP через виртуальный мост Anchor
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

    if (!window.anchor || !window.anchor.AnchorProvider) {
        window.anchor = createVirtualAnchor();
        window.Anchor = window.anchor;
        console.log("⚓ [Bridge]: Режим совместимости активирован.");
    }
})();

// ============================================================
// БЛОК 1: КОНСТАНТЫ И КОНФИГУРАЦИЯ
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

// Адреса программы и пулов
let STAKING_PROGRAM_ID, AFOX_TOKEN_MINT_ADDRESS, AFOX_POOL_STATE_PUBKEY, 
    AFOX_POOL_VAULT_PUBKEY, AFOX_REWARDS_VAULT_PUBKEY, DAO_TREASURY_VAULT_PUBKEY, 
    TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, SYSTEM_PROGRAM_ID;

// IDL Стейкинга (ZiECm...)
const STAKING_IDL = {
    "version": "0.1.0",
    "name": "my_new_afox_project",
    "instructions": [
        { "name": "initializeUserStake", "accounts": [
            { "name": "poolState", "isMut": true }, { "name": "userStaking", "isMut": true },
            { "name": "owner", "isMut": true, "isSigner": true }, { "name": "rewardMint", "isMut": false },
            { "name": "systemProgram", "isMut": false }, { "name": "clock", "isMut": false }
        ], "args": [{ "name": "poolIndex", "type": "u8" }] },
        { "name": "deposit", "accounts": [
            { "name": "poolState", "isMut": true }, { "name": "userStaking", "isMut": true },
            { "name": "owner", "isMut": true, "isSigner": true }, { "name": "userSourceAta", "isMut": true },
            { "name": "vault", "isMut": true }, { "name": "rewardMint", "isMut": false },
            { "name": "tokenProgram", "isMut": false }, { "name": "clock", "isMut": false }
        ], "args": [{ "name": "amount", "type": "u64" }] },
        { "name": "claimRewards", "accounts": [
            { "name": "poolState", "isMut": true }, { "name": "userStaking", "isMut": true },
            { "name": "owner", "isMut": true, "isSigner": true }, { "name": "vault", "isMut": true },
            { "name": "adminFeeVault", "isMut": true }, { "name": "userRewardsAta", "isMut": true },
            { "name": "rewardMint", "isMut": false }, { "name": "tokenProgram", "isMut": false },
            { "name": "clock", "isMut": false }
        ]},
        { "name": "unstake", "accounts": [
            { "name": "poolState", "isMut": true }, { "name": "userStaking", "isMut": true },
            { "name": "owner", "isMut": true, "isSigner": true }, { "name": "vault", "isMut": true },
            { "name": "daoTreasuryVault", "isMut": true }, { "name": "adminFeeVault", "isMut": true },
            { "name": "userRewardsAta", "isMut": true }, { "name": "rewardMint", "isMut": false },
            { "name": "tokenProgram", "isMut": false }, { "name": "clock", "isMut": false }
        ], "args": [{ "name": "amount", "type": "u64" }, { "name": "isEarlyExit", "type": "bool" }] }
    ],
    "accounts": [
        { "name": "userStakingAccount", "type": { "kind": "struct", "fields": [
            {"name": "owner", "type": "publicKey"}, {"name": "stakedAmount", "type": "u64"},
            {"name": "rewards", "type": "u64"}, {"name": "lastStakeTime", "type": "i64"},
            {"name": "lockupEndTime", "type": "i64"}, {"name": "poolIndex", "type": "u8"}
        ]}}
    ]
};

// ============================================================
// БЛОК 2: СОСТОЯНИЕ И UI
// ============================================================
let appState = { 
    connection: null, 
    provider: null, 
    walletPublicKey: null, 
    userBalances: { SOL: 0n, AFOX: 0n }, 
    userStakingData: { stakedAmount: 0n, rewards: 0n, lockupEndTime: 0, poolIndex: 0, lending: 0n } 
};

let uiElements = {};

const UI_EFFECTS = {
    sounds: {
        click: new Audio('https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3'),
        success: new Audio('https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3'),
        error: new Audio('https://assets.mixkit.co/active_storage/sfx/2535/2535-preview.mp3')
    },
    play(name) { this.sounds[name].volume = 0.3; this.sounds[name].play().catch(() => {}); },
    spawnPrize(btn, emoji) {
        const rect = btn.getBoundingClientRect();
        for(let i = 0; i < 12; i++) {
            const part = document.createElement('div');
            part.textContent = emoji;
            part.style.cssText = `position:fixed; left:${rect.left + rect.width/2}px; top:${rect.top}px; z-index:1000; pointer-events:none; transition:all 1s ease-out;`;
            document.body.appendChild(part);
            const x = (Math.random() - 0.5) * 200;
            const y = -Math.random() * 150;
            setTimeout(() => {
                part.style.transform = `translate(${x}px, ${y}px) rotate(${Math.random()*360}deg) scale(2)`;
                part.style.opacity = '0';
            }, 20);
            setTimeout(() => part.remove(), 1000);
        }
    }
};

// ============================================================
// БЛОК 3: УТИЛИТЫ И ПОМОЩНИКИ
// ============================================================
function setupAddresses() {
    if (!window.solanaWeb3) return false;
    try {
        const pk = window.solanaWeb3.PublicKey;
        STAKING_PROGRAM_ID = new pk('ZiECmSCWiJvsKRbNmBw27pyWEqEPFY4sBZ3MCnbvirH');
        AFOX_TOKEN_MINT_ADDRESS = new pk('GLkewtq8s2Yr24o5LT5mzzEeccKuSsy8H5RCHaE9uRAd');
        AFOX_POOL_STATE_PUBKEY = new pk('DfAaH2XsWsjSgPkECmZfDsmABzboJ5hJ8T32Aft2QaXZ');
        AFOX_POOL_VAULT_PUBKEY = new pk('328N13YrQyUAfqHEAXhtQhfan5hHRxDdZqsdpSx6KSkp');
        AFOX_REWARDS_VAULT_PUBKEY = new pk('BXinWRfmkk2jo3cTJfcYT5zoC7yix5AsvmTk8NwLoiDF');
        DAO_TREASURY_VAULT_PUBKEY = new pk('6BzRqaLD7CiGvSWjkp5G8RbmvGdjMRUqmz9VcXfGzfzi');
        TOKEN_PROGRAM_ID = new pk('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
        ASSOCIATED_TOKEN_PROGRAM_ID = new pk('ATokenGPvbdQxr7K2mc7fgC6jgvZifv6BAeu6CCYH25');
        SYSTEM_PROGRAM_ID = window.solanaWeb3.SystemProgram.programId;
        return true;
    } catch (e) { return false; }
}

function showNotification(message, type = 'info') {
    const container = document.getElementById('notification-container');
    if (!container) return;
    const note = document.createElement('div');
    note.className = `notification ${type}`;
    note.textContent = message;
    container.prepend(note);
    setTimeout(() => note.remove(), 4000);
}

function formatBigInt(amount, decimals) {
    if (!amount) return '0';
    const s = amount.toString();
    if (s.length <= decimals) return "0." + s.padStart(decimals, '0').replace(/0+$/, '') || "0";
    const intPart = s.slice(0, -decimals);
    const fracPart = s.slice(-decimals).replace(/0+$/, '');
    return fracPart ? `${intPart}.${fracPart}` : intPart;
}

function parseAmountToBigInt(amountStr, decimals) {
    if (!amountStr) return 0n;
    const [int, frac = ""] = amountStr.split(".");
    const fracPadded = frac.padEnd(decimals, "0").slice(0, decimals);
    return BigInt(int + fracPadded);
}

function setBtnState(btn, isLoading, text = "Wait...") {
    if (!btn) return;
    btn.disabled = isLoading;
    if (isLoading) {
        btn.dataset.old = btn.innerHTML;
        btn.innerHTML = `<span class="spinner"></span> ${text}`;
    } else {
        btn.innerHTML = btn.dataset.old || btn.innerHTML;
    }
}

async function sendLogToFirebase(wallet, action, amount) {
    try {
        await fetch(FIREBASE_PROXY_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ wallet, action, amount: amount.toString() })
        });
    } catch (e) { console.error("Log error"); }
}

// ============================================================
// БЛОК 4: ЛОГИКА SOLANA (PDA & RPC)
// ============================================================
async function getUserStakingPDA(owner) {
    const [pda] = await window.solanaWeb3.PublicKey.findProgramAddress(
        [owner.toBuffer(), AFOX_POOL_STATE_PUBKEY.toBuffer()],
        STAKING_PROGRAM_ID
    );
    return pda;
}

function getAnchorProgram() {
    const provider = new window.anchor.AnchorProvider(appState.connection, window.solana, { commitment: "confirmed" });
    return new window.anchor.Program(STAKING_IDL, STAKING_PROGRAM_ID, provider);
}

async function fetchUserBalances() {
    if (!appState.walletPublicKey) return;
    try {
        const solBal = await appState.connection.getBalance(appState.walletPublicKey);
        appState.userBalances.SOL = BigInt(solBal);

        const tokenAccounts = await appState.connection.getParsedTokenAccountsByOwner(appState.walletPublicKey, { mint: AFOX_TOKEN_MINT_ADDRESS });
        if (tokenAccounts.value.length > 0) {
            appState.userBalances.AFOX = BigInt(tokenAccounts.value[0].account.data.parsed.info.tokenAmount.amount);
        } else {
            appState.userBalances.AFOX = 0n;
        }
    } catch (e) { console.error("Balance fetch error", e); }
}

async function updateStakingUI() {
    if (!appState.walletPublicKey) {
        const fields = ['user-afox-balance', 'user-staked-amount', 'user-rewards-amount'];
        fields.forEach(id => { const el = document.getElementById(id); if (el) el.textContent = '0 AFOX'; });
        return;
    }

    try {
        const program = getAnchorProgram();
        const pda = await getUserStakingPDA(appState.walletPublicKey);
        const account = await program.account.userStakingAccount.fetch(pda);
        
        appState.userStakingData = {
            stakedAmount: BigInt(account.stakedAmount.toString()),
            rewards: BigInt(account.rewards.toString()),
            lockupEndTime: account.lockupEndTime.toNumber(),
            poolIndex: account.poolIndex
        };

        document.getElementById('user-afox-balance').textContent = `${formatBigInt(appState.userBalances.AFOX, AFOX_DECIMALS)} AFOX`;
        document.getElementById('user-staked-amount').textContent = `${formatBigInt(appState.userStakingData.stakedAmount, AFOX_DECIMALS)} AFOX`;
        document.getElementById('user-rewards-amount').textContent = `${formatBigInt(appState.userStakingData.rewards, AFOX_DECIMALS)} AFOX`;
        
        const apr = POOLS_CONFIG[appState.userStakingData.poolIndex]?.apr_rate || 500;
        document.getElementById('staking-apr').textContent = `${apr/100}%`;
    } catch (e) { console.log("Account not found yet"); }
}

// ============================================================
// БЛОК 5: ОСНОВНЫЕ ДЕЙСТВИЯ (STAKE, CLAIM, UNSTAKE)
// ============================================================
async function handleStakeAfox() {
    const btn = document.getElementById('stake-afox-btn');
    const input = document.getElementById('stake-amount');
    const amountRaw = input.value;
    if (!amountRaw || amountRaw <= 0) return showNotification("Enter amount", "error");

    setBtnState(btn, true, "🔒 Staking...");
    UI_EFFECTS.play('click');

    try {
        const program = getAnchorProgram();
        const pda = await getUserStakingPDA(appState.walletPublicKey);
        const amount = new window.anchor.BN(parseAmountToBigInt(amountRaw, AFOX_DECIMALS).toString());
        
        const accountInfo = await appState.connection.getAccountInfo(pda);
        let instructions = [];

        if (!accountInfo) {
            const plan = document.getElementById('staking-plan-select')?.value || 0;
            instructions.push(await program.methods.initializeUserStake(parseInt(plan)).accounts({
                poolState: AFOX_POOL_STATE_PUBKEY, userStaking: pda, owner: appState.walletPublicKey,
                rewardMint: AFOX_TOKEN_MINT_ADDRESS, systemProgram: SYSTEM_PROGRAM_ID, clock: window.solanaWeb3.SYSVAR_CLOCK_PUBKEY
            }).instruction());
        }

        const userAta = await window.solanaWeb3.PublicKey.findProgramAddress(
            [appState.walletPublicKey.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), AFOX_TOKEN_MINT_ADDRESS.toBuffer()],
            ASSOCIATED_TOKEN_PROGRAM_ID
        ).then(res => res[0]);

        await program.methods.deposit(amount).accounts({
            poolState: AFOX_POOL_STATE_PUBKEY, userStaking: pda, owner: appState.walletPublicKey,
            userSourceAta: userAta, vault: AFOX_POOL_VAULT_PUBKEY, rewardMint: AFOX_TOKEN_MINT_ADDRESS,
            tokenProgram: TOKEN_PROGRAM_ID, clock: window.solanaWeb3.SYSVAR_CLOCK_PUBKEY
        }).preInstructions(instructions).rpc();

        UI_EFFECTS.play('success');
        UI_EFFECTS.spawnPrize(btn, '💰');
        showNotification("Stake Successful!", "success");
        await fetchUserBalances();
        await updateStakingUI();
    } catch (e) { 
        UI_EFFECTS.play('error');
        showNotification(e.message, "error"); 
    } finally { setBtnState(btn, false); }
}

async function handleClaimRewards() {
    const btn = document.getElementById('claim-rewards-btn');
    setBtnState(btn, true, "💎 Claiming...");
    try {
        const program = getAnchorProgram();
        const pda = await getUserStakingPDA(appState.walletPublicKey);
        const userAta = await window.solanaWeb3.PublicKey.findProgramAddress(
            [appState.walletPublicKey.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), AFOX_TOKEN_MINT_ADDRESS.toBuffer()],
            ASSOCIATED_TOKEN_PROGRAM_ID
        ).then(res => res[0]);

        await program.methods.claimRewards().accounts({
            poolState: AFOX_POOL_STATE_PUBKEY, userStaking: pda, owner: appState.walletPublicKey,
            vault: AFOX_POOL_VAULT_PUBKEY, adminFeeVault: AFOX_REWARDS_VAULT_PUBKEY,
            userRewardsAta: userAta, rewardMint: AFOX_TOKEN_MINT_ADDRESS,
            tokenProgram: TOKEN_PROGRAM_ID, clock: window.solanaWeb3.SYSVAR_CLOCK_PUBKEY
        }).rpc();

        UI_EFFECTS.spawnPrize(btn, '💎');
        showNotification("Rewards Claimed!", "success");
        await updateStakingUI();
    } catch (e) { showNotification(e.message, "error"); }
    finally { setBtnState(btn, false); }
}

async function handleUnstakeAfox() {
    const btn = document.getElementById('unstake-afox-btn');
    setBtnState(btn, true, "🔓 Unstaking...");
    try {
        const program = getAnchorProgram();
        const pda = await getUserStakingPDA(appState.walletPublicKey);
        const amount = new window.anchor.BN(appState.userStakingData.stakedAmount.toString());
        const userAta = await window.solanaWeb3.PublicKey.findProgramAddress(
            [appState.walletPublicKey.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), AFOX_TOKEN_MINT_ADDRESS.toBuffer()],
            ASSOCIATED_TOKEN_PROGRAM_ID
        ).then(res => res[0]);

        await program.methods.unstake(amount, false).accounts({
            poolState: AFOX_POOL_STATE_PUBKEY, userStaking: pda, owner: appState.walletPublicKey,
            vault: AFOX_POOL_VAULT_PUBKEY, daoTreasuryVault: DAO_TREASURY_VAULT_PUBKEY,
            adminFeeVault: AFOX_REWARDS_VAULT_PUBKEY, userRewardsAta: userAta,
            rewardMint: AFOX_TOKEN_MINT_ADDRESS, tokenProgram: TOKEN_PROGRAM_ID, 
            clock: window.solanaWeb3.SYSVAR_CLOCK_PUBKEY
        }).rpc();

        showNotification("Unstake Successful!", "success");
        await fetchUserBalances();
        await updateStakingUI();
    } catch (e) { showNotification(e.message, "error"); }
    finally { setBtnState(btn, false); }
}

// ============================================================
// БЛОК 6: КОШЕЛЕК И ИНТЕРФЕЙС
// ============================================================
async function connectWallet() {
    try {
        if (!window.solana) return showNotification("Install Phantom!", "error");
        const resp = await window.solana.connect();
        appState.walletPublicKey = resp.publicKey;
        appState.connection = new window.solanaWeb3.Connection(BACKUP_RPC_ENDPOINT, 'confirmed');
        
        updateWalletDisplay();
        await fetchUserBalances();
        await updateStakingUI();
        showNotification("Wallet Connected!", "success");
    } catch (e) { showNotification("Connection Failed", "error"); }
}

function updateWalletDisplay() {
    const containers = document.querySelectorAll('.wallet-control');
    const pubKey = appState.walletPublicKey?.toString();

    containers.forEach(container => {
        if (pubKey) {
            container.innerHTML = `
                <div class="wallet-display">
                    <span style="color: #f39c12;">${pubKey.slice(0, 4)}...${pubKey.slice(-4)}</span>
                    <button class="copy-btn" onclick="navigator.clipboard.writeText('${pubKey}')">📋</button>
                </div>`;
        } else {
            container.innerHTML = `<button class="web3-btn connect-fox-btn">🦊 Connect Wallet</button>`;
            container.querySelector('.connect-fox-btn').onclick = connectWallet;
        }
    });
}

// ============================================================
// БЛОК 7: ИНИЦИАЛИЗАЦИЯ И СЛУШАТЕЛИ
// ============================================================
function initializeAurumFoxApp() {
    console.log("🚀 [Core]: Starting App...");
    if (!setupAddresses()) return console.error("Solana SDK missing");

    // Привязка кнопок
    const actions = [
        { id: 'stake-afox-btn', fn: handleStakeAfox },
        { id: 'unstake-afox-btn', fn: handleUnstakeAfox },
        { id: 'claim-rewards-btn', fn: handleClaimRewards },
        { id: 'createProposalBtn', fn: () => document.getElementById('dao-modal').style.display = 'flex' },
        { id: 'close-dao-modal', fn: () => document.getElementById('dao-modal').style.display = 'none' },
        { id: 'lend-btn', fn: () => showNotification("Lending coming soon!", "info") },
        { id: 'borrow-btn', fn: () => showNotification("Borrowing coming soon!", "info") }
    ];

    actions.forEach(item => {
        const el = document.getElementById(item.id);
        if (el) el.onclick = (e) => { e.preventDefault(); item.fn(); };
    });

    updateWalletDisplay();

    // Авто-коннект
    if (window.solana?.isConnected) connectWallet();
}

// Старт при загрузке
window.addEventListener('load', initializeAurumFoxApp);
