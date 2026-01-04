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
// Используем публичный RPC узел, который реже блокируют
const connection = new solanaWeb3.Connection("https://api.mainnet-beta.solana.com", "confirmed");

// Проверка загрузки
const check = setInterval(() => {
    if (typeof solanaWeb3 !== 'undefined' && typeof anchor !== 'undefined') {
        document.getElementById('status').innerText = "Готов";
        clearInterval(check);
    }
}, 500);

async function connect() {
    const provider_wallet = window.phantom?.solana || window.solana;
    if (!provider_wallet) return window.location.href = "https://phantom.app/ul/browse/" + encodeURIComponent(window.location.href);

    try {
        const resp = await provider_wallet.connect();
        wallet = resp.publicKey;
        
        provider = new anchor.AnchorProvider(connection, provider_wallet, { commitment: "confirmed" });
        program = new anchor.Program(IDL, new solanaWeb3.PublicKey(PRG_ID), provider);

        [userPDA] = solanaWeb3.PublicKey.findProgramAddressSync(
            [wallet.toBuffer(), new solanaWeb3.PublicKey(POOL).toBuffer()],
            program.programId
        );

        document.getElementById('btn-connect').style.display = 'none';
        document.getElementById('ui').style.display = 'block';
        document.getElementById('btn-stake').style.display = 'block';
        document.getElementById('status').innerText = "Подключено";
        
        updateBal();
    } catch (e) { document.getElementById('status').innerText = "Ошибка"; }
}

async function updateBal() {
    try {
        const [ata] = solanaWeb3.PublicKey.findProgramAddressSync(
            [wallet.toBuffer(), new solanaWeb3.PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA").toBuffer(), new solanaWeb3.PublicKey(MINT).toBuffer()],
            new solanaWeb3.PublicKey("ATokenGPvbdQxr7K2mc7fgC6jgvZifv6BAeu6CCYH25")
        );
        const b = await connection.getTokenAccountBalance(ata);
        document.getElementById('user-bal').innerText = b.value.uiAmount.toFixed(2);
    } catch (e) {}
}

async function stake() {
    const amount = document.getElementById('amt').value;
    if (!amount || amount <= 0) return;

    try {
        document.getElementById('status').innerText = "Транзакция...";
        const tx = new solanaWeb3.Transaction();
        const amountBN = new anchor.BN(amount * 1e6);

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
        await connection.confirmTransaction(signature);
        document.getElementById('status').innerText = "Успех!";
        updateBal();
    } catch (e) { document.getElementById('status').innerText = "Ошибка"; }
}

document.getElementById('btn-connect').onclick = connect;
document.getElementById('btn-stake').onclick = stake;
