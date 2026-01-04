// Конфигурация контракта
const PRG_ID = "ZiECmSCWiJvsKRbNmBw27pyWEqEPFY4sBZ3MCnbvirH";
const MINT = "GLkewtq8s2Yr24o5LT5mzzEeccKuSsy8H5RCHaE9uRAd";
const POOL = "DfAaH2XsWsjSgPkECmZfDsmABzboJ5hJ8T32Aft2QaXZ";
const VAULT = "328N13YrQyUAfqHEAXhtQhfan5hHRxDdZqsdpSx6KSkp";

const IDL = {
    "version": "0.1.0", "name": "alphafox_staking",
    "instructions": [
        { "name": "initializeUserStake", "accounts": [{"name":"poolState","isMut":true},{"name":"userStaking","isMut":true},{"name":"owner","isMut":true},{"name":"rewardMint","isMut":false},{"name":"systemProgram","isMut":false},{"name":"clock","isMut":false}], "args": [{"name":"poolIndex","type":"u8"}] },
        { "name": "deposit", "accounts": [{"name":"poolState","isMut":true},{"name":"userStaking","isMut":true},{"name":"owner","isMut":true},{"name":"userSourceAta","isMut":true},{"name":"vault","isMut":true},{"name":"rewardMint","isMut":false},{"name":"tokenProgram","isMut":false},{"name":"clock","isMut":false}], "args": [{"name":"amount","type":"u64"}] },
        { "name": "withdraw", "accounts": [{"name":"poolState","isMut":true},{"name":"userStaking","isMut":true},{"name":"owner","isMut":true},{"name":"userRewardAta","isMut":true},{"name":"vault","isMut":true},{"name":"rewardMint","isMut":false},{"name":"tokenProgram","isMut":false},{"name":"clock","isMut":false}], "args": [] }
    ]
};

let wallet, provider, program, userPDA;
const connection = new solanaWeb3.Connection("https://api.mainnet-beta.solana.com", "confirmed");

// Проверка загрузки модулей
window.onload = () => {
    const checkInterval = setInterval(() => {
        if (window.solanaWeb3 && window.anchor) {
            document.getElementById('status').innerText = "Готов к подключению";
            clearInterval(checkInterval);
        }
    }, 500);
};

// Функция подключения
async function connectWallet() {
    const status = document.getElementById('status');
    const solana = window.phantom?.solana || window.solana;

    if (!solana) {
        status.innerText = "Перенаправление в Phantom...";
        window.location.href = "https://phantom.app/ul/browse/" + encodeURIComponent(window.location.href);
        return;
    }

    try {
        status.innerText = "Установка связи...";
        const resp = await solana.connect();
        wallet = resp.publicKey;

        provider = new anchor.AnchorProvider(connection, solana, { commitment: "confirmed" });
        program = new anchor.Program(IDL, new solanaWeb3.PublicKey(PRG_ID), provider);

        [userPDA] = solanaWeb3.PublicKey.findProgramAddressSync(
            [wallet.toBuffer(), new solanaWeb3.PublicKey(POOL).toBuffer()],
            program.programId
        );

        document.getElementById('connect-btn').classList.add('hidden');
        document.getElementById('staking-ui').classList.remove('hidden');
        status.innerText = "Кошелек: " + wallet.toString().slice(0, 4) + "..." + wallet.toString().slice(-4);
        
        loadBalances();
    } catch (err) {
        console.error(err);
        status.innerText = "Ошибка: попробуйте еще раз";
    }
}

async function loadBalances() {
    try {
        // Баланс токенов AFOX
        const [ata] = solanaWeb3.PublicKey.findProgramAddressSync(
            [wallet.toBuffer(), new solanaWeb3.PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA").toBuffer(), new solanaWeb3.PublicKey(MINT).toBuffer()],
            new solanaWeb3.PublicKey("ATokenGPvbdQxr7K2mc7fgC6jgvZifv6BAeu6CCYH25")
        );
        const b = await connection.getTokenAccountBalance(ata);
        document.getElementById('user-bal').innerText = b.value.uiAmount.toFixed(2);

        // Баланс в стейкинге
        const acc = await program.account.userStaking.fetch(userPDA);
        document.getElementById('staked-bal').innerText = (acc.amount.toNumber() / 1e6).toFixed(2);
    } catch (e) {
        document.getElementById('staked-bal').innerText = "0.00";
    }
}

async function startStake() {
    const amt = document.getElementById('amount-input').value;
    if (!amt || amt <= 0) return alert("Введите сумму");
    
    const status = document.getElementById('status');
    try {
        status.innerText = "Создание транзакции...";
        const tx = new solanaWeb3.Transaction();
        
        // 1. Инициализация если нужно
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

        // 2. Депозит
        const [uAta] = solanaWeb3.PublicKey.findProgramAddressSync(
            [wallet.toBuffer(), new solanaWeb3.PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA").toBuffer(), new solanaWeb3.PublicKey(MINT).toBuffer()],
            new solanaWeb3.PublicKey("ATokenGPvbdQxr7K2mc7fgC6jgvZifv6BAeu6CCYH25")
        );

        tx.add(await program.methods.deposit(new anchor.BN(amt * 1e6)).accounts({
            poolState: new solanaWeb3.PublicKey(POOL),
            userStaking: userPDA,
            owner: wallet,
            userSourceAta: uAta,
            vault: new solanaWeb3.PublicKey(VAULT),
            rewardMint: new solanaWeb3.PublicKey(MINT),
            tokenProgram: new solanaWeb3.PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
            clock: solanaWeb3.SYSVAR_CLOCK_PUBKEY
        }).instruction());

        status.innerText = "Подтвердите в кошельке...";
        const { signature } = await window.solana.signAndSendTransaction(tx);
        status.innerText = "Сеть подтверждает...";
        await connection.confirmTransaction(signature);
        status.innerText = "Успех! Стейк принят.";
        loadBalances();
    } catch (e) {
        status.innerText = "Транзакция отменена";
    }
}

// Привязка кнопок
document.getElementById('connect-btn').onclick = connectWallet;
document.getElementById('stake-btn').onclick = startStake;
