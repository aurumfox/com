// --- КОНФИГУРАЦИЯ ПРОГРАММЫ ---
const PROGRAM_ID = "ZiECmSCWiJvsKRbNmBw27pyWEqEPFY4sBZ3MCnbvirH";
const AFOX_MINT = "GLkewtq8s2Yr24o5LT5mzzEeccKuSsy8H5RCHaE9uRAd";
const POOL_STATE = "DfAaH2XsWsjSgPkECmZfDsmABzboJ5hJ8T32Aft2QaXZ";
const VAULT = "328N13YrQyUAfqHEAXhtQhfan5hHRxDdZqsdpSx6KSkp";
const PROXY_URL = "https://firebasejs-key--snowy-cherry-0a92.wnikolay28.workers.dev/";

const IDL = {
    "version": "0.1.0", "name": "alphafox_staking",
    "instructions": [
        { "name": "initializeUserStake", "accounts": [{ "name": "poolState", "isMut": true }, { "name": "userStaking", "isMut": true }, { "name": "owner", "isMut": true }, { "name": "rewardMint", "isMut": false }, { "name": "systemProgram", "isMut": false }, { "name": "clock", "isMut": false }], "args": [{ "name": "poolIndex", "type": "u8" }] },
        { "name": "deposit", "accounts": [{ "name": "poolState", "isMut": true }, { "name": "userStaking", "isMut": true }, { "name": "owner", "isMut": true }, { "name": "userSourceAta", "isMut": true }, { "name": "vault", "isMut": true }, { "name": "rewardMint", "isMut": false }, { "name": "tokenProgram", "isMut": false }, { "name": "clock", "isMut": false }], "args": [{ "name": "amount", "type": "u64" }] }
    ],
    "accounts": [{ "name": "UserStakingAccount", "type": { "kind": "struct", "fields": [{ "name": "stakedAmount", "type": "u64" }, { "name": "rewardsToClaim", "type": "u64" }] } }]
};

let wallet, provider, program, userPDA;
const connection = new solanaWeb3.Connection("https://api.mainnet-beta.solana.com", "confirmed");

function updateLog(msg, isErr = false) {
    const logDiv = document.getElementById("status-log");
    logDiv.innerText = msg;
    logDiv.className = isErr ? "err" : "ok";
    logDiv.style.display = "block";
}

// 1. ПОДКЛЮЧЕНИЕ
async function connect() {
    try {
        if (!window.solana) return alert("Phantom не найден!");
        const resp = await window.solana.connect();
        wallet = resp.publicKey;

        provider = new anchor.AnchorProvider(connection, window.solana, { commitment: "confirmed" });
        program = new anchor.Program(IDL, new solanaWeb3.PublicKey(PROGRAM_ID), provider);

        [userPDA] = solanaWeb3.PublicKey.findProgramAddressSync(
            [wallet.toBuffer(), new solanaWeb3.PublicKey(POOL_STATE).toBuffer()],
            program.programId
        );

        document.getElementById("connectBtn").style.display = "none";
        document.getElementById("staking-ui").style.display = "block";
        document.getElementById("wallet-addr").innerText = "Wallet: " + wallet.toBase58().slice(0, 8) + "...";
        
        updateLog("Кошелек подключен!");
        refresh();
    } catch (e) { updateLog("Ошибка входа: " + e.message, true); }
}

// 2. ОБНОВЛЕНИЕ ДАННЫХ
async function refresh() {
    if (!wallet) return;
    try {
        const mint = new solanaWeb3.PublicKey(AFOX_MINT);
        const [ata] = solanaWeb3.PublicKey.findProgramAddressSync(
            [wallet.toBuffer(), new solanaWeb3.PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA").toBuffer(), mint.toBuffer()],
            new solanaWeb3.PublicKey("ATokenGPvbdQxr7K2mc7fgC6jgvZifv6BAeu6CCYH25")
        );

        try {
            const b = await connection.getTokenAccountBalance(ata);
            document.getElementById("ui-bal").innerText = b.value.uiAmount.toFixed(2);
        } catch { document.getElementById("ui-bal").innerText = "0.00"; }

        const acc = await program.account.userStakingAccount.fetch(userPDA);
        document.getElementById("ui-staked").innerText = (acc.stakedAmount / 1e6).toFixed(2);
    } catch (e) { console.warn("Stake account not active"); }
}

// 3. ДЕПОЗИТ
async function doStake() {
    const amount = document.getElementById("stake-amount").value;
    if (!amount || amount <= 0) return updateLog("Введите сумму", true);

    try {
        updateLog("Создание транзакции...");
        const amountBN = new anchor.BN(amount * 1e6);
        const tx = new solanaWeb3.Transaction();

        const info = await connection.getAccountInfo(userPDA);
        if (!info) {
            tx.add(await program.methods.initializeUserStake(parseInt(document.getElementById("pool-select").value))
                .accounts({
                    poolState: new solanaWeb3.PublicKey(POOL_STATE),
                    userStaking: userPDA,
                    owner: wallet,
                    rewardMint: new solanaWeb3.PublicKey(AFOX_MINT),
                    systemProgram: solanaWeb3.SystemProgram.programId,
                    clock: solanaWeb3.SYSVAR_CLOCK_PUBKEY
                }).instruction());
        }

        const [userAta] = solanaWeb3.PublicKey.findProgramAddressSync(
            [wallet.toBuffer(), new solanaWeb3.PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA").toBuffer(), new solanaWeb3.PublicKey(AFOX_MINT).toBuffer()],
            new solanaWeb3.PublicKey("ATokenGPvbdQxr7K2mc7fgC6jgvZifv6BAeu6CCYH25")
        );

        tx.add(await program.methods.deposit(amountBN).accounts({
            poolState: new solanaWeb3.PublicKey(POOL_STATE),
            userStaking: userPDA,
            owner: wallet,
            userSourceAta: userAta,
            vault: new solanaWeb3.PublicKey(VAULT),
            rewardMint: new solanaWeb3.PublicKey(AFOX_MINT),
            tokenProgram: new solanaWeb3.PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
            clock: solanaWeb3.SYSVAR_CLOCK_PUBKEY
        }).instruction());

        const { signature } = await window.solana.signAndSendTransaction(tx);
        updateLog("Подтверждение...");
        await connection.confirmTransaction(signature);
        
        fetch(PROXY_URL, { method: 'POST', body: JSON.stringify({ wallet: wallet.toBase58(), action: "STAKE", amount }) });
        updateLog("Стейкинг успешен!");
        refresh();
    } catch (e) { updateLog(e.message, true); }
}

// Слушатели
document.getElementById("connectBtn").onclick = connect;
document.getElementById("stakeBtn").onclick = doStake;

