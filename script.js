// Настройки контракта
const PRG_ID = "ZiECmSCWiJvsKRbNmBw27pyWEqEPFY4sBZ3MCnbvirH";
const AFOX_MINT = "GLkewtq8s2Yr24o5LT5mzzEeccKuSsy8H5RCHaE9uRAd";
const POOL_STATE = "DfAaH2XsWsjSgPkECmZfDsmABzboJ5hJ8T32Aft2QaXZ";
const VAULT = "328N13YrQyUAfqHEAXhtQhfan5hHRxDdZqsdpSx6KSkp";

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

// 1. Подключение Phantom
async function connectWallet() {
    try {
        if (!window.solana) return alert("Установите Phantom!");
        const resp = await window.solana.connect();
        wallet = resp.publicKey;

        provider = new anchor.AnchorProvider(connection, window.solana, { commitment: "confirmed" });
        program = new anchor.Program(IDL, new solanaWeb3.PublicKey(PRG_ID), provider);

        [userPDA] = solanaWeb3.PublicKey.findProgramAddressSync(
            [wallet.toBuffer(), new solanaWeb3.PublicKey(POOL_STATE).toBuffer()],
            program.programId
        );

        document.getElementById("connectBtn").style.display = "none";
        document.getElementById("ui").style.display = "block";
        document.getElementById("stakeBtn").style.display = "block";
        document.getElementById("status").innerText = "Кошелек подключен";
        
        fetchBalances();
    } catch (err) {
        document.getElementById("status").innerText = "Ошибка: " + err.message;
    }
}

// 2. Получение данных
async function fetchBalances() {
    try {
        const mintPub = new solanaWeb3.PublicKey(AFOX_MINT);
        const [ata] = solanaWeb3.PublicKey.findProgramAddressSync(
            [wallet.toBuffer(), new solanaWeb3.PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA").toBuffer(), mintPub.toBuffer()],
            new solanaWeb3.PublicKey("ATokenGPvbdQxr7K2mc7fgC6jgvZifv6BAeu6CCYH25")
        );

        const bal = await connection.getTokenAccountBalance(ata);
        document.getElementById("user-bal").innerText = bal.value.uiAmount.toFixed(2);

        const stakeData = await program.account.userStakingAccount.fetch(userPDA);
        document.getElementById("staked-bal").innerText = (stakeData.stakedAmount / 1e6).toFixed(2);
    } catch (e) { console.log("Account check..."); }
}

// 3. Функция стейкинга
async function runStake() {
    const amount = document.getElementById("stakeAmount").value;
    if (!amount) return;

    try {
        document.getElementById("status").innerText = "Транзакция...";
        const amountBN = new anchor.BN(amount * 1e6);
        const tx = new solanaWeb3.Transaction();

        const info = await connection.getAccountInfo(userPDA);
        if (!info) {
            tx.add(await program.methods.initializeUserStake(0).accounts({
                poolState: new solanaWeb3.PublicKey(POOL_STATE),
                userStaking: userPDA,
                owner: wallet,
                rewardMint: new solanaWeb3.PublicKey(AFOX_MINT),
                systemProgram: solanaWeb3.SystemProgram.programId,
                clock: solanaWeb3.SYSVAR_CLOCK_PUBKEY
            }).instruction());
        }

        const [uAta] = solanaWeb3.PublicKey.findProgramAddressSync(
            [wallet.toBuffer(), new solanaWeb3.PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA").toBuffer(), new solanaWeb3.PublicKey(AFOX_MINT).toBuffer()],
            new solanaWeb3.PublicKey("ATokenGPvbdQxr7K2mc7fgC6jgvZifv6BAeu6CCYH25")
        );

        tx.add(await program.methods.deposit(amountBN).accounts({
            poolState: new solanaWeb3.PublicKey(POOL_STATE),
            userStaking: userPDA,
            owner: wallet,
            userSourceAta: uAta,
            vault: new solanaWeb3.PublicKey(VAULT),
            rewardMint: new solanaWeb3.PublicKey(AFOX_MINT),
            tokenProgram: new solanaWeb3.PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
            clock: solanaWeb3.SYSVAR_CLOCK_PUBKEY
        }).instruction());

        const { signature } = await window.solana.signAndSendTransaction(tx);
        await connection.confirmTransaction(signature);
        document.getElementById("status").innerText = "Успех!";
        fetchBalances();
    } catch (err) {
        document.getElementById("status").innerText = "Ошибка стейкинга";
    }
}

// Привязка действий
document.getElementById("connectBtn").onclick = connectWallet;
document.getElementById("stakeBtn").onclick = runStake;
