const btn = document.getElementById('btn-connect');
const status = document.getElementById('status');

// Проверка загрузки библиотеки Solana
const checkLib = setInterval(() => {
    if (window.solanaWeb3) {
        status.innerText = "Готов";
        clearInterval(checkLib);
    }
}, 500);

async function connect() {
    // 1. Проверяем, есть ли Phantom
    const provider = window.phantom?.solana || window.solana;

    if (!provider) {
        status.innerText = "Открой в Phantom!";
        // Перекидываем в приложение, если открыто в обычном браузере
        window.location.href = "https://phantom.app/ul/browse/" + encodeURIComponent(window.location.href);
        return;
    }

    try {
        status.innerText = "Соединение...";
        const resp = await provider.connect();
        status.innerText = "OK: " + resp.publicKey.toString().slice(0, 6);
        btn.style.display = 'none';
    } catch (err) {
        status.innerText = "Отклонено";
        console.error(err);
    }
}

btn.onclick = connect;
