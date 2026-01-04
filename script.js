// Настройки контракта
const PROGRAM_ID = "ZiECmSCWiJvsKRbNmBw27pyWEqEPFY4sBZ3MCnbvirH";
const AFOX_MINT = "GLkewtq8s2Yr24o5LT5mzzEeccKuSsy8H5RCHaE9uRAd";
const POOL_PDA = "DfAaH2XsWsjSgPkECmZfDsmABzboJ5hJ8T32Aft2QaXZ";
const VAULT_PDA = "328N13YrQyUAfqHEAXhtQhfan5hHRxDdZqsdpSx6KSkp";

const IDL = {
    "version": "0.1.0", "name": "alphafox_staking",
    "instructions": [
        { "name": "initializeUserStake", "accounts": [{ "name": "poolState", "isMut": true }, { "name": "userStaking", "isMut": true }, { "name": "owner", "isMut": true }, { "name": "rewardMint", "isMut": false }, { "name": "systemProgram", "isMut": false }, { "name": "clock", "isMut": false }], "args": [{ "name": "poolIndex", "type": "u8" }] },
        { "name": "deposit", "accounts": [{ "name": "poolState", "isMut": true }, { "name": "userStaking", "isMut": true }, { "name": "owner", "isMut": true }, { "name": "userSourceAta", "isMut": true }, { "name": "vault", "isMut": true }, { "name": "rewardMint", "isMut": false }, { "name": "tokenProgram", "isMut": false }, { "name": "clock", "isMut": false }], "args": [{ "name": "amount", "type": "u64" }] }
    ]
};

let wallet, provider, program, userPDA;
const connection = new solanaWeb3.Connection("https://api.mainnet-beta.solana.com", "confirmed");

// Функция поиска провайдера (Phantom)
const getProvider = () => {
    if ('phantom' in window) {
        const provider = window.phantom?.solana;
        if (provider?.isPhantom) return provider;
    }
    return window.solana;
};

async function connect() {
    const solana = getProvider();

    if (!solana) {
        document.getElementById("status").innerText = "Phantom не найден! Открой в приложении.";
        // Если это мобильный браузер, пробуем вызвать приложение
        window.location.href = "https://phantom.app/ul/browse/" + encodeURIComponent(window.location.href);
        return;
    }

    try {
        document.getElementById("status").innerText = "Подключение...";
        const resp = await solana.connect();
        wallet = resp.publicKey;

        provider = new anchor.AnchorProvider(connection, solana, { commitment: "confirmed" });
        program = new anchor.Program(IDL, new solanaWeb3.PublicKey(PROGRAM_ID), provider);

        [userPDA] = solanaWeb3.PublicKey.findProgramAddressSync(
            [wallet.toBuffer(), new solanaWeb3.PublicKey(POOL_PDA).toBuffer()],
            program.programId
        );

        document.getElementById("connectBtn").style.display = "none";
        document.getElementById("ui").style.display = "block";
        document.getElementById("stakeBtn").style.display = "block";
        document.getElementById("status").innerText = "Подключен: " + wallet.toBase58().slice(0, 6) + "...";
        
        updateBalance();
    } catch (err) {
        document.getElementById("status").innerText = "Ошибка: " + err.message;
    }
}

async function updateBalance() {
    try {
        const mint = new solanaWeb3.PublicKey(AFOX_MINT);
        const [ata] = solanaWeb3.PublicKey.findProgramAddressSync(
            [wallet.toBuffer(), new solanaWeb3.PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA").toBuffer(), mint.toBuffer()],
            new solanaWeb3.PublicKey("ATokenGPvbdQxr7K2mc7fgC6jgvZifv6BAeu6CCYH25")
        );
        const bal = await connection.getTokenAccountBalance(ata);
        document.getElementById("user-bal").innerText = bal.value.uiAmount.toFixed(2);
    } catch (e) { console.log("Баланс не найден"); }
}

async function stake() {
    const amt = document.getElementById("stakeAmt").value;
    if (!amt || amt <= 0) return alert("Введите сумму");

    try {
        document.getElementById("status").innerText = "Подтвердите в Phantom...";
        const tx = new solanaWeb3.Transaction();
        const amountBN = new anchor.BN(amt * 1e6);

        // Проверка аккаунта стейкинга
        const info = await connection.getAccountInfo(userPDA);
        if (!info) {
            tx.add(await program.methods.initializeUserStake(0).accounts({
                poolState: new solanaWeb3.PublicKey(POOL_PDA),
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
            poolState: new solanaWeb3.PublicKey(POOL_PDA),
            userStaking: userPDA,
            owner: wallet,
            userSourceAta: uAta,
            vault: new solanaWeb3.PublicKey(VAULT_PDA),
            rewardMint: new solanaWeb3.PublicKey(AFOX_MINT),
            tokenProgram: new solanaWeb3.PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
            clock: solanaWeb3.SYSVAR_CLOCK_PUBKEY
        }).instruction());

        const solana = getProvider();
        const { signature } = await solana.signAndSendTransaction(tx);
        document.getElementById("status").innerText = "Ждем подтверждения...";
        await connection.confirmTransaction(signature);
        document.getElementById("status").innerText = "Успех! Монеты в стейке.";
        updateBalance();
    } catch (err) {
        document.getElementById("status").innerText = "Ошибка транзакции";
    }
}

document.getElementById("connectBtn").addEventListener("click", connect);
document.getElementById("stakeBtn").addEventListener("click", stake);
