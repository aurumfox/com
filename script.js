// --- КОНФИГУРАЦИЯ ---
const PROGRAM_ID = new solanaWeb3.PublicKey("ZiECmSCWiJvsKRbNmBw27pyWEqEPFY4sBZ3MCnbvirH");
const AFOX_MINT = new solanaWeb3.PublicKey("GLkewtq8s2Yr24o5LT5mzzEeccKuSsy8H5RCHaE9uRAd");
const POOL_STATE = new solanaWeb3.PublicKey("DfAaH2XsWsjSgPkECmZfDsmABzboJ5hJ8T32Aft2QaXZ");
const VAULT = new solanaWeb3.PublicKey("328N13YrQyUAfqHEAXhtQhfan5hHRxDdZqsdpSx6KSkp");
const ADMIN_FEE_VAULT = new solanaWeb3.PublicKey("BXinWRfmkk2jo3cTJfcYT5zoC7yix5AsvmTk8NwLoiDF");
const DAO_TREASURY = new solanaWeb3.PublicKey("6BzRqaLD7CiGvSWjkp5G8RbmvGdjMRUqmz9VcXfGzfzi");

const RPC_URL = "https://api.mainnet-beta.solana.com";
const WORKER_URL = "https://firebasejs-key--snowy-cherry-0a92.wnikolay28.workers.dev/";

// Ссылки на программы
const TOKEN_PROG = new solanaWeb3.PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const ASSOC_PROG = new solanaWeb3.PublicKey("ATokenGPvbdQxr7K2mc7fgC6jgvZifv6BAeu6CCYH25");

// Состояние приложения
let wallet, connection, program, userPDA;

// IDL из твоего Rust контракта
const IDL = {
    "version": "0.1.0", "name": "alphafox_staking",
    "instructions": [
        { "name": "initializeUserStake", "accounts": [{ "name": "poolState", "isMut": true }, { "name": "userStaking", "isMut": true }, { "name": "owner", "isMut": true }, { "name": "rewardMint", "isMut": false }, { "name": "systemProgram", "isMut": false }, { "name": "clock", "isMut": false }], "args": [{ "name": "poolIndex", "type": "u8" }] },
        { "name": "deposit", "accounts": [{ "name": "poolState", "isMut": true }, { "name": "userStaking", "isMut": true }, { "name": "owner", "isMut": true }, { "name": "userSourceAta", "isMut": true }, { "name": "vault", "isMut": true }, { "name": "rewardMint", "isMut": false }, { "name": "tokenProgram", "isMut": false }, { "name": "clock", "isMut": false }], "args": [{ "name": "amount", "type": "u64" }] },
        { "name": "claimRewards", "accounts": [{ "name": "poolState", "isMut": true }, { "name": "userStaking", "isMut": true }, { "name": "owner", "isMut": true }, { "name": "vault", "isMut": true }, { "name": "adminFeeVault", "isMut": true }, { "name": "userRewardsAta", "isMut": true }, { "name": "rewardMint", "isMut": false }, { "name": "tokenProgram", "isMut": false }, { "name": "clock", "isMut": false }], "args": [] },
        { "name": "unstake", "accounts": [{ "name": "poolState", "isMut": true }, { "name": "userStaking", "isMut": true }, { "name": "owner", "isMut": true }, { "name": "vault", "isMut": true }, { "name": "daoTreasuryVault", "isMut": true }, { "name": "adminFeeVault", "isMut": true }, { "name": "userRewardsAta", "isMut": true }, { "name": "rewardMint", "isMut": false }, { "name": "tokenProgram", "isMut": false }, { "name": "clock", "isMut": false }], "args": [{ "name": "amount", "type": "u64" }, { "name": "isEarlyExit", "type": "bool" }] }
    ],
    "accounts": [{ "name": "UserStakingAccount", "type": { "kind": "struct", "fields": [{ "name": "stakedAmount", "type": "u64" }, { "name": "rewardsToClaim", "type": "u64" }, { "name": "lockupEndTime", "type": "i64" }] } }]
};

// --- ОСНОВНАЯ ЛОГИКА ---

async function connect() {
    try {
        const isPhantomInstalled = window.solana && window.solana.isPhantom;
        if (!isPhantomInstalled) return alert("Install Phantom!");

        const resp = await window.solana.connect();
        wallet = resp.publicKey;
        connection = new solanaWeb3.Connection(RPC_URL, "confirmed");

        // Инициализация Anchor
        const provider = new anchor.AnchorProvider(connection, window.solana, { commitment: "confirmed" });
        program = new anchor.Program(IDL, PROGRAM_ID, provider);

        // Расчет PDA пользователя (owner + pool_state)
        [userPDA] = solanaWeb3.PublicKey.findProgramAddressSync(
            [wallet.toBuffer(), POOL_STATE.toBuffer()],
            PROGRAM_ID
        );

        document.getElementById("connectBtn").style.display = "none";
        document.getElementById("userAddr").style.display = "block";
        document.getElementById("userAddr").innerText = wallet.toBase58().slice(0, 4) + "..." + wallet.toBase58().slice(-4);

        showNotify("Wallet Connected", "success");
        refreshData();
    } catch (err) {
        console.error(err);
        showNotify("Connection Failed", "error");
    }
}

async function refreshData() {
    if (!wallet) return;
    try {
        // Баланс токенов
        const ata = await getATA(wallet);
        try {
            const bal = await connection.getTokenAccountBalance(ata);
            document.getElementById("bal-afox").innerText = bal.value.uiAmount + " AFOX";
        } catch (e) { document.getElementById("bal-afox").innerText = "0 AFOX"; }

        // Данные стейкинга из блокчейна
        const acc = await program.account.userStakingAccount.fetch(userPDA);
        document.getElementById("staked-afox").innerText = (acc.stakedAmount / 1e6).toFixed(2) + " AFOX";
        document.getElementById("reward-afox").innerText = (acc.rewardsToClaim / 1e6).toFixed(2) + " AFOX";
        
        const now = Math.floor(Date.now() / 1000);
        const remaining = Number(acc.lockupEndTime) - now;
        document.getElementById("lock-timer").innerText = remaining > 0 ? (remaining / 86400).toFixed(1) + " days left" : "Unlocked";
    } catch (e) {
        console.log("No stake data yet");
    }
}

async function handleStake() {
    const amount = document.getElementById("stakeAmount").value;
    const pool = parseInt(document.getElementById("poolIdx").value);
    if (!amount || amount <= 0) return;

    try {
        showNotify("Processing Transaction...", "success");
        const amountBN = new anchor.BN(amount * 1e6);
        const userAta = await getATA(wallet);
        const tx = new solanaWeb3.Transaction();

        // Проверка: нужно ли создать аккаунт стейкинга
        const info = await connection.getAccountInfo(userPDA);
        if (!info) {
            tx.add(await program.methods.initializeUserStake(pool).accounts({
                poolState: POOL_STATE, userStaking: userPDA, owner: wallet,
                rewardMint: AFOX_MINT, systemProgram: solanaWeb3.SystemProgram.programId,
                clock: solanaWeb3.SYSVAR_CLOCK_PUBKEY
            }).instruction());
        }

        tx.add(await program.methods.deposit(amountBN).accounts({
            poolState: POOL_STATE, userStaking: userPDA, owner: wallet,
            userSourceAta: userAta, vault: VAULT, rewardMint: AFOX_MINT,
            tokenProgram: TOKEN_PROG, clock: solanaWeb3.SYSVAR_CLOCK_PUBKEY
        }).instruction());

        const sig = await window.solana.signAndSendTransaction(tx);
        await connection.confirmTransaction(sig.signature);
        
        // Отправка в Firebase через прокси
        await fetch(WORKER_URL, {
            method: 'POST',
            body: JSON.stringify({ wallet: wallet.toBase58(), action: "STAKE", amount })
        });

        showNotify("Stake Success!", "success");
        refreshData();
    } catch (err) {
        showNotify(err.message, "error");
    }
}

async function handleClaim() {
    try {
        const userAta = await getATA(wallet);
        await program.methods.claimRewards().accounts({
            poolState: POOL_STATE, userStaking: userPDA, owner: wallet,
            vault: VAULT, adminFeeVault: ADMIN_FEE_VAULT, userRewardsAta: userAta,
            rewardMint: AFOX_MINT, tokenProgram: TOKEN_PROG, clock: solanaWeb3.SYSVAR_CLOCK_PUBKEY
        }).rpc();
        showNotify("Rewards Claimed!", "success");
        refreshData();
    } catch (err) { showNotify("Claim failed: Limit or Error", "error"); }
}

// Вспомогательные
async function getATA(owner) {
    const [addr] = solanaWeb3.PublicKey.findProgramAddressSync(
        [owner.toBuffer(), TOKEN_PROG.toBuffer(), AFOX_MINT.toBuffer()],
        ASSOC_PROG
    );
    return addr;
}

function showNotify(msg, type) {
    const div = document.getElementById("notify");
    div.innerText = msg;
    div.className = "notification " + type;
    setTimeout(() => div.innerText = "", 5000);
}

// Слушатели событий
document.getElementById("connectBtn").onclick = connect;
document.getElementById("btnStake").onclick = handleStake;
document.getElementById("btnClaim").onclick = handleClaim;
