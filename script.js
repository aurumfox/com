const PRG_ID = "ZiECmSCWiJvsKRbNmBw27pyWEqEPFY4sBZ3MCnbvirH";
const MINT = "GLkewtq8s2Yr24o5LT5mzzEeccKuSsy8H5RCHaE9uRAd";
const POOL = "DfAaH2XsWsjSgPkECmZfDsmABzboJ5hJ8T32Aft2QaXZ";
const VAULT = "328N13YrQyUAfqHEAXhtQhfan5hHRxDdZqsdpSx6KSkp";

const IDL = {
    "version": "0.1.0", "name": "alphafox_staking",
    "instructions": [
        { "name": "initializeUserStake", "accounts": [{"name":"poolState","isMut":true},{"name":"userStaking","isMut":true},{"name":"owner","isMut":true},{"name":"rewardMint","isMut":false},{"name":"systemProgram","isMut":false},{"name":"clock","isMut":false}], "args": [{"name":"poolIndex","type":"u8"}] },
        { "name": "deposit", "accounts": [{"name":"poolState","isMut":true},{"name":"userStaking","isMut":true},{"name":"owner","isMut":true},{"name":"userSourceAta","isMut":true},{"name":"vault","isMut":true},{"name":"rewardMint","isMut":false},{"name":"tokenProgram","isMut":false},{"name":"clock","isMut":false}], "args": [{"name":"amount","type":"u64"}] }
    ]
};

let wallet, provider, program, userPDA;
const connection = new solanaWeb3.Connection("https://api.mainnet-beta.solana.com", "confirmed");

// Проверка готовности библиотек
const timer = setInterval(() => {
    if (window.solanaWeb3 && window.anchor) {
        document.getElementById('status').innerText = "Готов";
        clearInterval(timer);
    }
}, 500);

async function connect() {
    const solana = window.phantom?.solana || window.solana;
    if (!solana) return window.location.href = "https://phantom.app/ul/browse/" + encodeURIComponent(window.location.href);

    try {
        const resp = await solana.connect();
        wallet = resp.publicKey;
        
        provider = new anchor.AnchorProvider(connection, solana, { commitment: "confirmed" });
        program = new anchor.Program(IDL, new solanaWeb3.PublicKey(PRG_ID), provider);

        [userPDA] = solanaWeb3.PublicKey.findProgramAddressSync(
            [wallet.toBuffer(), new solanaWeb3.PublicKey(POOL).toBuffer()],
            program.programId
        );

        document.getElementById('btn-connect').style.display = 'none';
        document.getElementById('ui-staking').style.display = 'block';
        document.getElementById('btn-stake').style.display = 'block';
        document.getElementById('status').innerText = "Кошелек: " + wallet.toString().slice(0, 6);
        
        updateBalances();
    } catch (e) { document.getElementById('status').innerText = "Ошибка входа"; }
}

async function updateBalances() {
    try {
        const [ata] = solanaWeb3.PublicKey.findProgramAddressSync(
            [wallet.toBuffer(), new solanaWeb3.PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA").toBuffer(), new solanaWeb3.PublicKey(MINT).toBuffer()],
            new solanaWeb3.PublicKey("ATokenGPvbdQxr7K2mc7fgC6jgvZifv6BAeu6CCYH25")
        );
        const b = await connection.getTokenAccountBalance(ata);
        document.getElementById('user-bal').innerText = b.value.uiAmount.toFixed(2);
    } catch (e) { console.log("Баланс 0"); }
}

async function stake() {
    const amount = document.getElementById('stake-amount').value;
    if (!amount || amount <= 0) return alert("Введите сумму");

    try {
        document.getElementById('status').innerText = "Подтвердите транзакцию...";
        const tx = new solanaWeb3.Transaction();
        const amountBN = new anchor.BN(amount * 1e6); // 6 знаков после запятой для токена

        // Проверяем, создан ли аккаунт стейкинга
        const info = await connection.getAccountInfo(userPDA);
        if (!info) {
            tx.add(await program.methods.initializeUserStake(0).accounts({
                poolState: new solanaWeb3.PublicKey(POOL),
                userStaking: userPDA,
                owner: wallet,
                rewardMint: new solanaWeb3.PublicKey(MINT),
                systemProgram: solanaWeb3.SystemProgram.programId,
                clock: solanaWeb3.SYSVAR_CLOCK_PUBKEY
            }).instruction());
        }

        const [uAta] = solanaWeb3.PublicKey.findProgramAddressSync(
            [wallet.toBuffer(), new solanaWeb3.PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA").toBuffer(), new solanaWeb3.PublicKey(MINT).toBuffer()],
            new solanaWeb3.PublicKey("ATokenGPvbdQxr7K2mc7fgC6jgvZifv6BAeu6CCYH25")
        );

        tx.add(await program.methods.deposit(amountBN).accounts({
            poolState: new solanaWeb3.PublicKey(POOL),
            userStaking: userPDA,
            owner: wallet,
            userSourceAta: uAta,
            vault: new solanaWeb3.PublicKey(VAULT),
            rewardMint: new solanaWeb3.PublicKey(MINT),
            tokenProgram: new solanaWeb3.PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
            clock: solanaWeb3.SYSVAR_CLOCK_PUBKEY
        }).instruction());

        const { signature } = await window.solana.signAndSendTransaction(tx);
        document.getElementById('status').innerText = "Транзакция отправлена...";
        await connection.confirmTransaction(signature);
        document.getElementById('status').innerText = "Успех! Стейк принят.";
        updateBalances();
    } catch (e) { 
        document.getElementById('status').innerText = "Ошибка: недостаточно средств или отказ";
    }
}

document.getElementById('btn-connect').onclick = connect;
document.getElementById('btn-stake').onclick = stake;
