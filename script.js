// ==========================================
// 1. КОНСТАНТЫ И КОНФИГ (СИНХРОНИЗАЦИЯ С RUST)
// ==========================================
const SOL_DECIMALS = 9;
const AFOX_DECIMALS = 6;
const FIREBASE_PROXY_URL = 'https://firebasejs-key--snowy-cherry-0a92.wnikolay28.workers.dev/'; // Твой рабочий URL
const BACKUP_RPC_ENDPOINT = 'https://api.mainnet-beta.solana.com';

const PROGRAM_ID = new window.solanaWeb3.PublicKey('ZiECmSCWiJvsKRbNmBw27pyWEqEPFY4sBZ3MCnbvirH');
const AFOX_MINT = new window.solanaWeb3.PublicKey('GLkewtq8s2Yr24o5LT5mzzEeccKuSsy8H5RCHaE9uRAd');
const POOL_STATE_PDA = new window.solanaWeb3.PublicKey('DfAaH2XsWsjSgPkECmZfDsmABzboJ5hJ8T32Aft2QaXZ');
const POOL_VAULT = new window.solanaWeb3.PublicKey('328N13YrQyUAfqHEAXhtQhfan5hHRxDdZqsdpSx6KSkp');
const ADMIN_FEE_VAULT = new window.solanaWeb3.PublicKey('BXinWRfmkk2jo3cTJfcYT5zoC7yix5AsvmTk8NwLoiDF');
const DAO_VAULT = new window.solanaWeb3.PublicKey('6BzRqaLD7CiGvSWjkp5G8RbmvGdjMRUqmz9VcXfGzfzi');

const TOKEN_PROGRAM = new window.solanaWeb3.PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const ASSOCIATED_TOKEN_PROGRAM = new window.solanaWeb3.PublicKey('ATokenGPvbdQxr7K2mc7fgC6jgvZifv6BAeu6CCYH25');

// ОДИН ОБЪЕКТ СОСТОЯНИЯ
let appState = {
    connection: new window.solanaWeb3.Connection(BACKUP_RPC_ENDPOINT, 'confirmed'),
    provider: null,
    wallet: null,
    userStakingData: null
};

let ui = {};

// IDL (Минимальный для депозита/клейма согласно твоему Rust)
const STAKING_IDL = {
    "version": "0.1.0", "name": "my_new_afox_project",
    "instructions": [
        { "name": "initializeUserStake", "accounts": [{ "name": "poolState", "isMut": true }, { "name": "userStaking", "isMut": true }, { "name": "owner", "isMut": true, "isSigner": true }, { "name": "rewardMint", "isMut": false }, { "name": "systemProgram", "isMut": false }, { "name": "clock", "isMut": false }], "args": [{ "name": "poolIndex", "type": "u8" }] },
        { "name": "deposit", "accounts": [{ "name": "poolState", "isMut": true }, { "name": "userStaking", "isMut": true }, { "name": "owner", "isMut": true, "isSigner": true }, { "name": "userSourceAta", "isMut": true }, { "name": "vault", "isMut": true }, { "name": "rewardMint", "isMut": false }, { "name": "tokenProgram", "isMut": false }, { "name": "clock", "isMut": false }], "args": [{ "name": "amount", "type": "u64" }] },
        { "name": "claimRewards", "accounts": [{ "name": "poolState", "isMut": true }, { "name": "userStaking", "isMut": true }, { "name": "owner", "isMut": true, "isSigner": true }, { "name": "vault", "isMut": true }, { "name": "adminFeeVault", "isMut": true }, { "name": "userRewardsAta", "isMut": true }, { "name": "rewardMint", "isMut": false }, { "name": "tokenProgram", "isMut": false }, { "name": "clock", "isMut": false }], "args": [] },
        { "name": "unstake", "accounts": [{ "name": "poolState", "isMut": true }, { "name": "userStaking", "isMut": true }, { "name": "owner", "isMut": true, "isSigner": true }, { "name": "vault", "isMut": true }, { "name": "daoTreasuryVault", "isMut": true }, { "name": "adminFeeVault", "isMut": true }, { "name": "userRewardsAta", "isMut": true }, { "name": "rewardMint", "isMut": false }, { "name": "tokenProgram", "isMut": false }, { "name": "clock", "isMut": false }], "args": [{ "name": "amount", "type": "u64" }, { "name": "isEarlyExit", "type": "bool" }] }
    ],
    "accounts": [{ "name": "UserStakingAccount", "type": { "kind": "struct", "fields": [{ "name": "stakedAmount", "type": "u64" }, { "name": "rewardsToClaim", "type": "u64" }, { "name": "lockupEndTime", "type": "i64" }] } }]
};

// ==========================================
// 2. ИНИЦИАЛИЗАЦИЯ И UI
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    cacheUI();
    initEvents();
});

function cacheUI() {
    ui = {
        connectBtn: document.getElementById('connectWalletBtn'),
        walletBox: document.getElementById('walletDisplay'),
        addrDisplay: document.getElementById('walletAddressDisplay'),
        afoxBal: document.getElementById('userAfoxBalance'),
        stakedBal: document.getElementById('userStakedAmount'),
        rewardBal: document.getElementById('userRewardsAmount'),
        stakeInput: document.getElementById('stakeAmountInput'),
        poolSelect: document.getElementById('poolSelector'),
        aprText: document.getElementById('stakingApr'),
        lockText: document.getElementById('lockupPeriod'),
        loader: document.getElementById('page-loader'),
        notify: document.getElementById('notificationContainer')
    };
}

function initEvents() {
    ui.connectBtn.onclick = connectWallet;
    document.getElementById('disconnectBtn').onclick = () => location.reload();
    document.getElementById('stakeAfoxBtn').onclick = handleDeposit;
    document.getElementById('claimRewardsBtn').onclick = handleClaim;
    document.getElementById('unstakeAfoxBtn').onclick = handleUnstake;
}

// ==========================================
// 3. ФУНКЦИИ КОШЕЛЬКА И БЛОКЧЕЙНА
// ==========================================
async function connectWallet() {
    try {
        if (!window.solana) return alert("Phantom not found!");
        const resp = await window.solana.connect();
        appState.wallet = resp.publicKey;
        appState.provider = new window.anchor.AnchorProvider(appState.connection, window.solana, { commitment: "confirmed" });
        
        ui.connectBtn.style.display = 'none';
        ui.walletBox.style.display = 'flex';
        ui.addrDisplay.innerText = appState.wallet.toBase58().slice(0, 6) + "...";
        
        showNotification("Wallet Connected!", "success");
        await refreshAllData();
    } catch (err) {
        console.error("Connect error", err);
    }
}

async function refreshAllData() {
    if (!appState.wallet) return;
    setLoading(true);
    try {
        // 1. Получаем баланс токенов
        const ata = await getATA(appState.wallet);
        try {
            const bal = await appState.connection.getTokenAccountBalance(ata);
            ui.afoxBal.innerText = `${(bal.value.uiAmount).toFixed(2)} AFOX`;
        } catch { ui.afoxBal.innerText = "0 AFOX"; }

        // 2. Получаем данные стейкинга
        const program = new window.anchor.Program(STAKING_IDL, PROGRAM_ID, appState.provider);
        const [userPDA] = window.solanaWeb3.PublicKey.findProgramAddressSync(
            [appState.wallet.toBuffer(), POOL_STATE_PDA.toBuffer()], PROGRAM_ID
        );

        try {
            const acc = await program.account.userStakingAccount.fetch(userPDA);
            appState.userStakingData = acc;
            ui.stakedBal.innerText = `${(acc.stakedAmount / 10**AFOX_DECIMALS).toFixed(2)} AFOX`;
            ui.rewardBal.innerText = `${(acc.rewardsToClaim / 10**AFOX_DECIMALS).toFixed(2)} AFOX`;
            
            const remaining = Number(acc.lockupEndTime) - Math.floor(Date.now()/1000);
            ui.lockText.innerText = remaining > 0 ? `${(remaining/86400).toFixed(1)} days` : "Unlocked";
        } catch (e) {
            console.log("No stake found");
        }
    } finally {
        setLoading(false);
    }
}

// ==========================================
// 4. ТРАНЗАКЦИИ (DEPOSIT / CLAIM / UNSTAKE)
// ==========================================
async function handleDeposit() {
    const amount = parseFloat(ui.stakeInput.value);
    if (!amount || amount <= 0) return alert("Invalid amount");

    const program = new window.anchor.Program(STAKING_IDL, PROGRAM_ID, appState.provider);
    const amountBN = new window.anchor.BN(amount * 10**AFOX_DECIMALS);
    const poolIdx = parseInt(ui.poolSelect.value);
    
    const [userPDA] = window.solanaWeb3.PublicKey.findProgramAddressSync(
        [appState.wallet.toBuffer(), POOL_STATE_PDA.toBuffer()], PROGRAM_ID
    );

    try {
        setLoading(true);
        let tx = new window.solanaWeb3.Transaction();

        // Проверка инициализации
        const info = await appState.connection.getAccountInfo(userPDA);
        if (!info) {
            tx.add(await program.methods.initializeUserStake(poolIdx).accounts({
                poolState: POOL_STATE_PDA, userStaking: userPDA, owner: appState.wallet,
                rewardMint: AFOX_MINT, systemProgram: window.solanaWeb3.SystemProgram.programId,
                clock: window.solanaWeb3.SYSVAR_CLOCK_PUBKEY
            }).instruction());
        }

        const userAta = await getATA(appState.wallet);
        tx.add(await program.methods.deposit(amountBN).accounts({
            poolState: POOL_STATE_PDA, userStaking: userPDA, owner: appState.wallet,
            userSourceAta: userAta, vault: POOL_VAULT, rewardMint: AFOX_MINT,
            tokenProgram: TOKEN_PROGRAM, clock: window.solanaWeb3.SYSVAR_CLOCK_PUBKEY
        }).instruction());

        const sig = await appState.provider.sendAndConfirm(tx);
        await sendLogToFirebase(appState.wallet.toBase58(), "STAKE", amount);
        showNotification("Deposit Successful!", "success");
        refreshAllData();
    } catch (err) {
        showNotification(err.message, "error");
    } finally {
        setLoading(false);
    }
}

async function handleClaim() {
    const program = new window.anchor.Program(STAKING_IDL, PROGRAM_ID, appState.provider);
    const [userPDA] = window.solanaWeb3.PublicKey.findProgramAddressSync(
        [appState.wallet.toBuffer(), POOL_STATE_PDA.toBuffer()], PROGRAM_ID
    );
    const userAta = await getATA(appState.wallet);

    try {
        setLoading(true);
        await program.methods.claimRewards().accounts({
            poolState: POOL_STATE_PDA, userStaking: userPDA, owner: appState.wallet,
            vault: POOL_VAULT, adminFeeVault: ADMIN_FEE_VAULT, userRewardsAta: userAta,
            rewardMint: AFOX_MINT, tokenProgram: TOKEN_PROGRAM, clock: window.solanaWeb3.SYSVAR_CLOCK_PUBKEY
        }).rpc();
        
        showNotification("Rewards Claimed!", "success");
        refreshAllData();
    } catch (err) {
        showNotification("DAO Limit reached or error", "error");
    } finally {
        setLoading(false);
    }
}

async function handleUnstake() {
    const program = new window.anchor.Program(STAKING_IDL, PROGRAM_ID, appState.provider);
    const [userPDA] = window.solanaWeb3.PublicKey.findProgramAddressSync(
        [appState.wallet.toBuffer(), POOL_STATE_PDA.toBuffer()], PROGRAM_ID
    );
    const userAta = await getATA(appState.wallet);

    const isEarly = appState.userStakingData.lockupEndTime > (Date.now()/1000);
    if (isEarly && !confirm("Warning: 40% early exit fee! Continue?")) return;

    try {
        setLoading(true);
        const amountBN = appState.userStakingData.stakedAmount;
        await program.methods.unstake(amountBN, isEarly).accounts({
            poolState: POOL_STATE_PDA, userStaking: userPDA, owner: appState.wallet,
            vault: POOL_VAULT, daoTreasuryVault: DAO_VAULT, adminFeeVault: ADMIN_FEE_VAULT,
            userRewardsAta: userAta, rewardMint: AFOX_MINT, tokenProgram: TOKEN_PROGRAM,
            clock: window.solanaWeb3.SYSVAR_CLOCK_PUBKEY
        }).rpc();

        showNotification("Unstake Done!", "success");
        refreshAllData();
    } catch (err) {
        showNotification(err.message, "error");
    } finally {
        setLoading(false);
    }
}

// ==========================================
// 5. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ==========================================
async function getATA(owner) {
    const [address] = window.solanaWeb3.PublicKey.findProgramAddressSync(
        [owner.toBuffer(), TOKEN_PROGRAM.toBuffer(), AFOX_MINT.toBuffer()],
        ASSOCIATED_TOKEN_PROGRAM
    );
    return address;
}

async function sendLogToFirebase(wallet, action, amount) {
    try {
        await fetch(FIREBASE_PROXY_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ wallet, action, amount: amount.toString() })
        });
    } catch (e) { console.warn("Firebase logging failed"); }
}

function showNotification(msg, type) {
    const n = document.createElement('div');
    n.className = `notification ${type}`;
    n.innerText = msg;
    ui.notify.appendChild(n);
    setTimeout(() => n.remove(), 4000);
}

function setLoading(val) {
    ui.loader.style.display = val ? 'flex' : 'none';
}
