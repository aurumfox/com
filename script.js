const PROGRAM_ID = "ZiECmSCWiJvsKRbNmBw27pyWEqEPFY4sBZ3MCnbvirH";
const MINT = "GLkewtq8s2Yr24o5LT5mzzEeccKuSsy8H5RCHaE9uRAd";
const POOL = "DfAaH2XsWsjSgPkECmZfDsmABzboJ5hJ8T32Aft2QaXZ";
const VAULT = "328N13YrQyUAfqHEAXhtQhfan5hHRxDdZqsdpSx6KSkp";

const IDL = {
    "version": "0.1.0", "name": "alphafox_staking",
    "instructions": [
        { "name": "initializeUserStake", "accounts": [{ "name": "poolState", "isMut": true }, { "name": "userStaking", "isMut": true }, { "name": "owner", "isMut": true }, { "name": "rewardMint", "isMut": false }, { "name": "systemProgram", "isMut": false }, { "name": "clock", "isMut": false }], "args": [{ "name": "poolIndex", "type": "u8" }] },
        { "name": "deposit", "accounts": [{ "name": "poolState", "isMut": true }, { "name": "userStaking", "isMut": true }, { "name": "owner", "isMut": true }, { "name": "userSourceAta", "isMut": true }, { "name": "vault", "isMut": true }, { "name": "rewardMint", "isMut": false }, { "name": "tokenProgram", "isMut": false }, { "name": "clock", "isMut": false }], "args": [{ "name": "amount", "type": "u64" }] }
    ],
    "accounts": [{ "name": "UserStakingAccount", "type": { "kind": "struct", "fields": [{ "name": "stakedAmount", "type": "u64" }, { "name": "rewardsToClaim", "type": "u64" }] } }]
};

let wal, prj, prog, pda;
const conn = new solanaWeb3.Connection("https://api.mainnet-beta.solana.com", "confirmed");

async function connect() {
    // Проверяем Phantom
    const sol = window.solana || window.phantom?.solana;
    
    if (!sol) {
        // Если кошелька нет, пробуем перебросить в приложение Phantom
        const url = encodeURIComponent(window.location.href);
        window.location.href = `https://phantom.app/ul/browse/${url}`;
        return;
    }

    try {
        const r = await sol.connect();
        wal = r.publicKey;
        prj = new anchor.AnchorProvider(conn, sol, { commitment: "confirmed" });
        prog = new anchor.Program(IDL, new solanaWeb3.PublicKey(PROGRAM_ID), prj);

        [pda] = solanaWeb3.PublicKey.findProgramAddressSync(
            [wal.toBuffer(), new solanaWeb3.PublicKey(POOL).toBuffer()],
            prog.programId
        );

        document.getElementById("connectBtn").style.display = "none";
        document.getElementById("ui").style.display = "block";
        document.getElementById("stakeBtn").style.display = "block";
        document.getElementById("status").innerText = "Подключено: " + wal.toBase58().slice(0,4);
    } catch (e) {
        document.getElementById("status").innerText = "Ошибка: " + e.message;
    }
}

async function stake() {
    const v = document.getElementById("amt").value;
    if (!v) return;
    try {
        document.getElementById("status").innerText = "Подтвердите транзакцию...";
        const tx = new solanaWeb3.Transaction();
        const info = await conn.getAccountInfo(pda);
        
        if (!info) {
            tx.add(await prog.methods.initializeUserStake(0).accounts({
                poolState: new solanaWeb3.PublicKey(POOL), userStaking: pda, owner: wal,
                rewardMint: new solanaWeb3.PublicKey(MINT), systemProgram: solanaWeb3.SystemProgram.programId,
                clock: solanaWeb3.SYSVAR_CLOCK_PUBKEY
            }).instruction());
        }

        const [uAta] = solanaWeb3.PublicKey.findProgramAddressSync(
            [wal.toBuffer(), new solanaWeb3.PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA").toBuffer(), new solanaWeb3.PublicKey(MINT).toBuffer()],
            new solanaWeb3.PublicKey("ATokenGPvbdQxr7K2mc7fgC6jgvZifv6BAeu6CCYH25")
        );

        tx.add(await prog.methods.deposit(new anchor.BN(v * 1e6)).accounts({
            poolState: new solanaWeb3.PublicKey(POOL), userStaking: pda, owner: wal, userSourceAta: uAta,
            vault: new solanaWeb3.PublicKey(VAULT), rewardMint: new solanaWeb3.PublicKey(MINT),
            tokenProgram: new solanaWeb3.PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
            clock: solanaWeb3.SYSVAR_CLOCK_PUBKEY
        }).instruction());

        const sol = window.solana || window.phantom?.solana;
        const { signature } = await sol.signAndSendTransaction(tx);
        await conn.confirmTransaction(signature);
        document.getElementById("status").innerText = "Успешно!";
    } catch (e) {
        document.getElementById("status").innerText = "Ошибка транзакции";
    }
}

document.getElementById("connectBtn").onclick = connect;
document.getElementById("stakeBtn").onclick = stake;
