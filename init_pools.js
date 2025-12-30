const anchor = require("@project-serum/anchor");
const { PublicKey, SystemProgram } = require("@solana/web3.js");
const { TOKEN_PROGRAM_ID, BN } = require("@solana/spl-token");

async function main() {
    // Настройка подключения к Devnet
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);
    const program = anchor.workspace.AlphafoxStaking; // Убедись, что имя совпадает с Lib.rs

    console.log("Начинаем инициализацию пулов...");

    // 1. Генерация ключей для состояния пула (PoolState)
    // В реальном проекте это обычно PDA, но для теста можно использовать Keypair
    const poolState = anchor.web3.Keypair.generate();

    try {
        await program.methods.initialize()
            .accounts({
                admin: provider.wallet.publicKey,
                poolState: poolState.publicKey,
                stakingMint: new PublicKey("35dyS78g2XvJTKugFYxQq0U8zD6EKhr1n1CMa4nDT5xp"), // Твой AFOX Mint
                poolVault: anchor.web3.Keypair.generate().publicKey, // В реальном коде тут должен быть PDA vault
                systemProgram: SystemProgram.programId,
                tokenProgram: TOKEN_PROGRAM_ID,
            })
            .signers([poolState])
            .rpc();

        console.log("✅ Пулы успешно инициализированы!");
        console.log("--- СКОПИРУЙ ЭТИ АДРЕСА В script.js ---");
        console.log("AFOX_POOL_STATE_PUBKEY:", poolState.publicKey.toBase58());
    } catch (err) {
        console.error("Ошибка:", err);
    }
}

main();
