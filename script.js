// Настройки
const PROGRAM_ID = "ZiECmSCWiJvsKRbNmBw27pyWEqEPFY4sBZ3MCnbvirH";
const MINT_ADDR = "GLkewtq8s2Yr24o5LT5mzzEeccKuSsy8H5RCHaE9uRAd";
const POOL_ADDR = "DfAaH2XsWsjSgPkECmZfDsmABzboJ5hJ8T32Aft2QaXZ";
const VAULT_ADDR = "328N13YrQyUAfqHEAXhtQhfan5hHRxDdZqsdpSx6KSkp";

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

// Функция подключения
async function connect() {
    // Проверка наличия Phantom
    const isPhantomInstalled = window.solana && window.solana.isPhantom;

    if (!isPhantomInstalled) {
        document.getElementById("status").innerText = "Ошибка: Phantom не найден!";
        window.open("https://phantom.app/", "_blank");
        return;
    }

    try {
        const resp = await window.solana.connect();
        wallet = resp.publicKey;

        // Настройка Anchor
        provider = new anchor.AnchorProvider(connection, window.solana, { commitment: "confirmed" });
        program = new anchor.Program(IDL, new solanaWeb3.PublicKey(PROGRAM_ID), provider);

        // PDA
        [userPDA] = solanaWeb3.PublicKey.findProgramAddressSync(
            [wallet.toBuffer(), new solanaWeb3.PublicKey(POOL_ADDR).toBuffer()],
            program.programId
        );

        document.getElementById("connectBtn").style.display = "none";
        document.getElementById("stakingUI").style.display = "block";
        document.getElementById("stakeBtn").style.display = "block";
        document.getElementById("status").innerText = "Кошелек: " + wallet.toBase58().slice(0,6) + "...";
        
        refreshData();
    } catch (err) {
        document.getElementById("status").innerText = "Ошибка входа: " + err.message;
    }
}

async function refreshData() {
    try {
        const mint = new solanaWeb3.PublicKey(MINT_ADDR);
        const [ata] = solanaWeb3.PublicKey.findProgramAddressSync(
            [wallet.toBuffer(), new solanaWeb3.PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA").toBuffer(), mint.toBuffer()],
            new solanaWeb3.PublicKey("ATokenGPvbdQxr7K2mc7fgC6jgvZifv6BAeu6CCYH25")
        );

        const balInfo = await connection.getTokenAccountBalance(ata);
        document.getElementById("user-bal").innerText = balInfo.value.uiAmount.toFixed(2);

        const stakeAcc = await program.account.userStakingAccount.fetch(userPDA);
        document.getElementById("staked-bal").innerText = (stakeAcc.stakedAmount / 1e6).toFixed(2);
    } catch (e) { console.log("Account not found yet"); }
}

async function handleStake() {
    const amt = document.getElementById("stakeAmount").value;
    if (!amt || amt <= 0) return;

    try {
        document.getElementById("status").innerText = "Подпись транзакции...";
        const amountBN = new anchor.BN(amt * 1e6);
        const tx = new solanaWeb3.Transaction();

        const info = await connection.getAccountInfo(userPDA);
        if (!info) {
            tx.add(await program.methods.initializeUserStake(0).accounts({
                poolState: new solanaWeb3.PublicKey(POOL_ADDR),
                userStaking: userPDA,
                owner: wallet,
                rewardMint: new solanaWeb3.PublicKey(MINT_ADDR),
                systemProgram: solanaWeb3.SystemProgram.programId,
                clock: solanaWeb3.SYSVAR_CLOCK_PUBKEY
            }).instruction());
        }

        const [uAta] = solanaWeb3.PublicKey.findProgramAddressSync(
            [wallet.toBuffer(), new solanaWeb3.PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA").toBuffer(), new solanaWeb3.PublicKey(MINT_ADDR).toBuffer()],
            new solanaWeb3.PublicKey("ATokenGPvbdQxr7K2mc7fgC6jgvZifv6BAeu6CCYH25")
        );

        tx.add(await program.methods.deposit(amountBN).accounts({
            poolState: new solanaWeb3.PublicKey(POOL_ADDR),
            userStaking: userPDA,
            owner: wallet,
            userSourceAta: uAta,
            vault: new solanaWeb3.PublicKey(VAULT_ADDR),
            rewardMint: new solanaWeb3.PublicKey(MINT_ADDR),
            tokenProgram: new solanaWeb3.PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
            clock: solanaWeb3.SYSVAR_CLOCK_PUBKEY
        }).instruction());

        const { signature } = await window.solana.signAndSendTransaction(tx);
        document.getElementById("status").innerText = "Ждем сеть...";
        await connection.confirmTransaction(signature);
        document.getElementById("status").innerText = "Успешно застейкано!";
        refreshData();
    } catch (e) {
        document.getElementById("status").innerText = "Ошибка транзакции";
    }
}

// Привязка кликов
document.getElementById("connectBtn").addEventListener("click", connect);
document.getElementById("stakeBtn").addEventListener("click", handleStake);
