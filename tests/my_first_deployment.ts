import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { MyFirstDeployment } from "../target/types/my_first_deployment";

// 1. Настройка связи с Mainnet
const provider = anchor.AnchorProvider.env();
anchor.setProvider(provider);

// 2. Доступ к программе (Важно: MyFirstDeployment с большой буквы)
const program = anchor.workspace.MyFirstDeployment as Program<MyFirstDeployment>;

async function init() {
    try {
        // 3. Вычисляем те самые ключи (PDA)
        const [poolState] = anchor.web3.PublicKey.findProgramAddressSync([Buffer.from("state")], program.programId);
        const [poolVault] = anchor.web3.PublicKey.findProgramAddressSync([Buffer.from("vault")], program.programId);
        const [rewardsVault] = anchor.web3.PublicKey.findProgramAddressSync([Buffer.from("rewards")], program.programId);

        console.log("--- ВАШИ 4 КЛЮЧА ДЛЯ ФРОНТЕНДА ---");
        console.log("AFOX_POOL_STATE_PUBKEY:", poolState.toBase58());
        console.log("AFOX_POOL_VAULT_PUBKEY:", poolVault.toBase58());
        console.log("AFOX_REWARDS_VAULT_PUBKEY:", rewardsVault.toBase58());
        console.log("PROGRAM_ID:", program.programId.toBase58());
        console.log("----------------------------------");

        // 4. Запуск транзакции инициализации
        console.log("Отправка транзакции в Mainnet...");
        const tx = await program.methods.initialize().rpc();
        console.log("Успех! Подпись транзакции:", tx);

    } catch (error) {
        console.error("Ошибка при инициализации:", error);
    }
}

init();
