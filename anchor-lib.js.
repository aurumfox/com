// Минимальная браузерная сборка-заглушка для Anchor
(function() {
    const AnchorStub = {
        get Provider() {
            return window.solanaWeb3 ? {
                anchorProvider: (conn, wallet, opts) => ({
                    connection: conn,
                    wallet: wallet,
                    opts: opts
                })
            } : null;
        },
        get AnchorProvider() {
            return this.Provider;
        },
        PublicKey: (window.solanaWeb3 && window.solanaWeb3.PublicKey) ? window.solanaWeb3.PublicKey : null,
        Program: function(idl, programId, provider) {
            console.log("Anchor Program Initialized locally");
            this.idl = idl;
            this.programId = programId;
            this.provider = provider;
        }
    };

    window.anchor = AnchorStub;
    window.Anchor = AnchorStub;
    console.log("⚓ Локальная мини-библиотека Anchor загружена!");
})();
