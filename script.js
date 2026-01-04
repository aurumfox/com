// Константы
const PROGRAM_ID = "ZiECmSCWiJvsKRbNmBw27pyWEqEPFY4sBZ3MCnbvirH";
const AFOX_MINT = "GLkewtq8s2Yr24o5LT5mzzEeccKuSsy8H5RCHaE9uRAd";
const POOL_PDA = "DfAaH2XsWsjSgPkECmZfDsmABzboJ5hJ8T32Aft2QaXZ";
const VAULT_PDA = "328N13YrQyUAfqHEAXhtQhfan5hHRxDdZqsdpSx6KSkp";

const IDL = {
    "version": "0.1.0", "name": "alphafox_staking",
    "instructions": [
        { "name": "initializeUserStake", "accounts": [{ "name": "poolState", "isMut": true }, { "name": "userStaking", "isMut": true }, { "name": "owner", "isMut": true }, { "name": "rewardMint", "isMut": false }, { "name": "systemProgram", "isMut": false }, { "name": "clock", "isMut": false }], "args": [{ "name": "poolIndex", "type": "u8" }] },
        { "name": "deposit", "accounts": [{ "name": "poolState", "isMut": true }, { "name": "userStaking", "isMut": true }, { "name": "owner", "isMut": true }, { "name": "userSourceAta", "isMut": true }, { "name": "vault", "isMut": true }, { "name": "rewardMint", "isMut": false }, { "name": "tokenProgram", "isMut": false }, { "name": "clock", "isMut": false }], "args": [{ "name": "amount", "type": "u64" }] }
    ],
    "accounts": [{ "name": "UserStakingAccount", "type": { "kind": "struct", "fields": [{ "name": "stakedAmount", "type": "u64" }, { "name": "rewardsToClaim", "type": "u64" }] } }]
};

let provider, program, walletPubKey, userPDA;
const connection = new solanaWeb3.Connection("https://api.mainnet-beta.solana.com", "confirmed");

// 1. Коннект
async function connect() {
    const phantom = window.solana || window.phantom?.solana;
    if (!phantom) return alert("ОТКРОЙ ВНУТРИ PHANTOM!");

    try {
        const resp = await phantom.connect();
        walletPubKey = resp.publicKey;
        
        provider = new anchor.AnchorProvider(connection, phantom, { commitment: "confirmed" });
        program = new anchor.Program(IDL, new solanaWeb3.PublicKey(PROGRAM_ID), provider);

        [userPDA] = solanaWeb3.PublicKey.findProgramAddressSync(
            [walletPubKey.toBuffer(), new solanaWeb3.PublicKey(POOL_PDA).toBuffer()],
            program.programId
        );

        document.getElementById("connectBtn").style.display = "none";
        document.getElementById("ui").style.display = "block";
        document.getElementById("stakeBtn").style.display = "block";
        document.getElementById("status").innerText = "Подключено: " + walletPubKey.toBase58().slice(0,4);
    } catch (e) { alert("Ошибка коннекта"); }
}

// 2. Стейк
async function stake() {
    const val = document.getElementById("amount").value;
    if (!val) return;
    
    try {
        document.getElementById("status").innerText = "Подтвердите транзакцию...";
        const tx = new solanaWeb3.Transaction();
        const info = await connection.getAccountInfo(userPDA);
        
        if (!info) {
            tx.add(await program.methods.initializeUserStake(0).accounts({
                poolState: new solanaWeb3.PublicKey(POOL_PDA), userStaking: userPDA, owner: walletPubKey,
                rewardMint: new solanaWeb3.PublicKey(AFOX_MINT), systemProgram: solanaWeb3.SystemProgram.programId,
                clock: solanaWeb3.SYSVAR_CLOCK_PUBKEY
            }).instruction());
        }

        const [uAta] = solanaWeb3.PublicKey.findProgramAddressSync(
            [walletPubKey.toBuffer(), new solanaWeb3.PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA").toBuffer(), new solanaWeb3.PublicKey(AFOX_MINT).toBuffer()],
            new solanaWeb3.PublicKey("ATokenGPvbdQxr7K2mc7fgC6jgvZifv6BAeu6CCYH25")
        );

        tx.add(await program.methods.deposit(new anchor.BN(val * 1e6)).accounts({
            poolState: new solanaWeb3.PublicKey(POOL_PDA), userStaking: userPDA, owner: walletPubKey, userSourceAta: uAta,
            vault: new solanaWeb3.PublicKey(VAULT_PDA), rewardMint: new solanaWeb3.PublicKey(AFOX_MINT),
            tokenProgram: new solanaWeb3.PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
            clock: solanaWeb3.SYSVAR_CLOCK_PUBKEY
        }).instruction());

        const phantom = window.solana || window.phantom?.solana;
        const { signature } = await phantom.signAndSendTransaction(tx);
        await connection.confirmTransaction(signature);
        document.getElementById("status").innerText = "УСПЕХ!";
    } catch (e) { document.getElementById("status").innerText = "Ошибка"; }
}

document.getElementById("connectBtn").onclick = connect;
document.getElementById("stakeBtn").onclick = stake;
