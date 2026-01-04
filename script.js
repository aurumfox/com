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

// Проверка готовности библиотек
window.onload = () => {
    document.getElementById("status").innerText = "Готов к подключению";
};

async function connect() {
    // Проверка, загрузился ли Anchor
    if (typeof anchor === 'undefined') {
        return alert("Библиотека Anchor еще грузится. Подождите 5 секунд и попробуйте снова.");
    }

    const solana = window.phantom?.solana || window.solana;

    if (!solana) {
        window.location.href = "https://phantom.app/ul/browse/" + encodeURIComponent(window.location.href);
        return;
    }

    try {
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
        document.getElementById("status").innerText = "Кошелек: " + wallet.toBase58().slice(0, 6) + "...";
    } catch (err) {
        document.getElementById("status").innerText = "Ошибка: " + err.message;
    }
}

async function stake() {
    const amt = document.getElementById("stakeAmt").value;
    if (!amt) return;

    try {
        const tx = new solanaWeb3.Transaction();
        const amountBN = new anchor.BN(amt * 1e6);

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

        const solana = window.phantom?.solana || window.solana;
        const { signature } = await solana.signAndSendTransaction(tx);
        document.getElementById("status").innerText = "Транзакция отправлена...";
        await connection.confirmTransaction(signature);
        document.getElementById("status").innerText = "Стейкинг успешен!";
    } catch (err) {
        document.getElementById("status").innerText = "Ошибка транзакции";
    }
}

document.getElementById("connectBtn").onclick = connect;
document.getElementById("stakeBtn").onclick = stake;
