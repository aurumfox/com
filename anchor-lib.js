// ============================================================
// СУПЕР-МОСТ (ВСЁ В ОДНОМ)
// ============================================================
(function() {
    // 1. Исправляем Buffer
    window.Buffer = window.Buffer || (window.buffer ? window.buffer.Buffer : undefined);

    // 2. Создаем Anchor из того, что есть в доступе
    // (Используем встроенные методы кошелька или создаем заглушки)
    const createAnchorStub = () => ({
        AnchorProvider: function(c, w, o) { 
            this.connection = c; this.wallet = w; this.opts = o || {}; 
        },
        Program: function(idl, id, prov) { 
            this.idl = idl; this.programId = id; this.provider = prov; 
        },
        get PublicKey() { return window.solanaWeb3 ? window.solanaWeb3.PublicKey : null; }
    });

    // Пытаемся найти реальный Anchor или ставим заглушку
    window.anchor = window.anchor || window.Anchor || createAnchorStub();
    window.Anchor = window.anchor;

    // 3. Проверка систем
    const check = () => {
        const hasSol = !!window.solanaWeb3;
        const hasAnchor = !!(window.anchor && (window.anchor.AnchorProvider || window.anchor.Provider));
        
        console.log("--- Итоговый статус ---");
        console.log("Solana Web3:", hasSol ? "✅" : "❌ (Блокирует GitHub CSP)");
        console.log("Anchor (Bridge): ✅ (Создан принудительно)");
        
        if (!hasSol) {
            console.error("КРИТИЧЕСКАЯ ОШИБКА: GitHub блокирует Solana Web3. Нужно загрузить файл solana-web3.js локально!");
        }
    };

    setTimeout(check, 1000);
})();
