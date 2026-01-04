const PRG_ID = "ZiECmSCWiJvsKRbNmBw27pyWEqEPFY4sBZ3MCnbvirH";
const MINT = "GLkewtq8s2Yr24o5LT5mzzEeccKuSsy8H5RCHaE9uRAd";
const POOL = "DfAaH2XsWsjSgPkECmZfDsmABzboJ5hJ8T32Aft2QaXZ";

let wallet, provider;
const connection = new solanaWeb3.Connection("https://api.mainnet-beta.solana.com", "confirmed");

// Проверка загрузки модулей
const checkInterval = setInterval(() => {
    if (typeof solanaWeb3 !== 'undefined') {
        document.getElementById("status").innerText = "Готов к подключению";
        clearInterval(checkInterval);
    }
}, 500);

async function connect() {
    const solana = window.phantom?.solana || window.solana;
    
    if (!solana) {
        document.getElementById("status").innerText = "Используйте браузер Phantom!";
        window.location.href = "https://phantom.app/ul/browse/" + encodeURIComponent(window.location.href);
        return;
    }

    try {
        const resp = await solana.connect();
        wallet = resp.publicKey;
        
        document.getElementById('connectBtn').style.display = 'none';
        document.getElementById('ui').style.display = 'block';
        document.getElementById('status').innerText = "Подключено: " + wallet.toBase58().slice(0,6);
        
        updateBal();
    } catch (err) {
        document.getElementById('status').innerText = "Ошибка: " + err.message;
    }
}

async function updateBal() {
    try {
        const [ata] = solanaWeb3.PublicKey.findProgramAddressSync(
            [wallet.toBuffer(), new solanaWeb3.PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA").toBuffer(), new solanaWeb3.PublicKey(MINT).toBuffer()],
            new solanaWeb3.PublicKey("ATokenGPvbdQxr7K2mc7fgC6jgvZifv6BAeu6CCYH25")
        );
        const b = await connection.getTokenAccountBalance(ata);
        document.getElementById('bal').innerText = b.value.uiAmount.toFixed(2);
    } catch (e) {
        console.log("Токен не найден на кошельке");
    }
}

document.getElementById('connectBtn').onclick = connect;

