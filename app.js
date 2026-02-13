/**
 * 🦊 AURUM FOX - ABSOLUTE WEB3 ENGINE (PRO EDITION)
 * Поддерживает: Staking, DAO, Lending, Advanced UI, Solana Web3 & Anchor.
 */

(function() {
    "use strict";

    // --- 1. ТЕРМИНАЛЬНЫЕ КОНСТАНТЫ ---
    const AFOX_CFG = {
        PROGRAM_ID: "ZiECmSCWiJvsKRbNmBw27pyWEqEPFY4sBZ3MCnbvirH",
        MINT: "GLkewtq8s2Yr24o5LT5mzzEeccKuSsy8H5RCHaE9uRAd",
        POOL_STATE: "DfAaH2XsWsjSgPkECmZfDsmABzboJ5hJ8T32Aft2QaXZ",
        VAULT: "328N13YrQyUAfqHEAXhtQhfan5hHRxDdZqsdpSx6KSkp",
        REWARDS_VAULT: "BXinWRfmkk2jo3cTJfcYT5zoC7yix5AsvmTk8NwLoiDF",
        DAO_TREASURY: "6BzRqaLD7CiGvSWjkp5G8RbmvGdjMRUqmz9VcXfGzfzi",
        RPC: "https://api.mainnet-beta.solana.com",
        DECIMALS: 6
    };

    // Глобальное состояние
    window.foxState = {
        connection: null,
        provider: null,
        wallet: null,
        data: {
            balance: 0n,
            staked: 0n,
            rewards: 0n,
            lockup: 0,
            poolIndex: 0,
            lending: 0n
        },
        isPending: false
    };

    // --- 2. ГЛАВНЫЙ ОРКЕСТРАТОР ---
    const FoxEngine = {
        async init() {
            console.log("%c🦊 AURUM FOX ENGINE ACTIVATED", "color: #FFD700; font-weight: bold; font-size: 1.2rem;");
            this.setupEnvironment();
            this.bindAllActions();
            this.startBackgroundSync();
            
            // Авто-подключение Phantom (тихое)
            setTimeout(() => this.trySilentConnect(), 500);
        },

        setupEnvironment() {
            window.Buffer = window.Buffer || (window.buffer ? window.buffer.Buffer : undefined);
            window.foxState.connection = new solanaWeb3.Connection(AFOX_CFG.RPC, 'confirmed');
        },

        // --- АВТОМАТИЧЕСКАЯ ПРИВЯЗКА К HTML ---
        bindAllActions() {
            const handlers = {
                'connectWalletBtn': () => this.toggleWallet(),
                'stake-afox-btn': () => this.executeStaking('deposit'),
                'unstake-afox-btn': () => this.executeStaking('unstake'),
                'claim-rewards-btn': () => this.executeStaking('claim'),
                'max-stake-btn': () => this.autoFillMax('stake-amount'),
                // DAO
                'createProposalBtn': () => this.toggleModal('createProposalModal', true),
                'closeProposalModal': () => this.toggleModal('createProposalModal', false),
                'submitProposalBtn': (e) => this.handleDAO(e),
                // Lending
                'lend-btn': () => this.handleLending('Lend'),
                'borrow-btn': () => this.handleLending('Borrow'),
                'repay-btn': () => this.handleLending('Repay')
            };

            Object.keys(handlers).forEach(id => {
                const el = document.getElementById(id);
                if (el) el.onclick = handlers[id];
            });

            // Делегирование для динамических кнопок голосования
            document.addEventListener('click', (e) => {
                if (e.target.closest('.dao-vote-btn')) {
                    const side = e.target.dataset.vote;
                    this.executeVote(side);
                }
            });
        },

        // --- WALLET LOGIC ---
        async trySilentConnect() {
            const provider = window.phantom?.solana || window.solana;
            if (provider?.isPhantom) {
                try {
                    const resp = await provider.connect({ onlyIfTrusted: true });
                    this.onConnected(resp.publicKey, provider);
                } catch (e) {}
            }
        },

        async toggleWallet() {
            if (window.foxState.wallet) {
                await window.foxState.provider.disconnect();
                this.onDisconnected();
            } else {
                const provider = window.phantom?.solana || window.solana;
                if (!provider) return UI.notify("Please install Phantom!", "error");
                const resp = await provider.connect();
                this.onConnected(resp.publicKey, provider);
            }
        },

        onConnected(pubkey, provider) {
            window.foxState.wallet = pubkey;
            window.foxState.provider = provider;
            UI.updateWalletUI(pubkey.toBase58());
            UI.notify("Connected to Aurum Fox", "success");
            this.fullSync();
        },

        onDisconnected() {
            window.foxState.wallet = null;
            UI.updateWalletUI(null);
            UI.notify("Wallet Disconnected", "info");
        },

        // --- BLOCKCHAIN CORE ACTIONS ---
        async getProgram() {
            const provider = new anchor.AnchorProvider(
                window.foxState.connection, 
                window.foxState.provider, 
                { commitment: 'confirmed' }
            );
            return new anchor.Program(window.STAKING_IDL, new solanaWeb3.PublicKey(AFOX_CFG.PROGRAM_ID), provider);
        },

        async executeStaking(action) {
            if (window.foxState.isPending) return;
            const btn = document.getElementById(`${action}-afox-btn`) || document.getElementById('stake-afox-btn');
            
            await UI.runWithLoader(btn, action.toUpperCase(), async () => {
                const program = await this.getProgram();
                const poolPk = new solanaWeb3.PublicKey(AFOX_CFG.POOL_STATE);
                const [userPDA] = await solanaWeb3.PublicKey.findProgramAddress(
                    [window.foxState.wallet.toBuffer(), poolPk.toBuffer()],
                    program.programId
                );

                const tx = new solanaWeb3.Transaction();

                // 1. Проверка инициализации
                const info = await window.foxState.connection.getAccountInfo(userPDA);
                if (!info && action === 'deposit') {
                    const poolIdx = parseInt(document.getElementById('pool-selector')?.value || 0);
                    tx.add(await program.methods.initializeUserStake(poolIdx).accounts({
                        poolState: poolPk, userStaking: userPDA, owner: window.foxState.wallet,
                        rewardMint: new solanaWeb3.PublicKey(AFOX_CFG.MINT),
                        systemProgram: solanaWeb3.SystemProgram.programId,
                        clock: solanaWeb3.SYSVAR_CLOCK_PUBKEY
                    }).instruction());
                }

                // 2. Логика действий
                if (action === 'deposit') {
                    const amount = Utils.toBN(document.getElementById('stake-amount').value, AFOX_CFG.DECIMALS);
                    tx.add(await program.methods.deposit(new anchor.BN(amount.toString())).accounts({
                        poolState: poolPk, userStaking: userPDA, owner: window.foxState.wallet,
                        vault: new solanaWeb3.PublicKey(AFOX_CFG.VAULT),
                        rewardMint: new solanaWeb3.PublicKey(AFOX_CFG.MINT),
                        tokenProgram: new solanaWeb3.PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
                        clock: solanaWeb3.SYSVAR_CLOCK_PUBKEY
                    }).instruction());
                } else if (action === 'claim') {
                    tx.add(await program.methods.claimRewards().accounts({
                        poolState: poolPk, userStaking: userPDA, owner: window.foxState.wallet,
                        vault: new solanaWeb3.PublicKey(AFOX_CFG.VAULT),
                        adminFeeVault: new solanaWeb3.PublicKey(AFOX_CFG.REWARDS_VAULT),
                        rewardMint: new solanaWeb3.PublicKey(AFOX_CFG.MINT),
                        tokenProgram: new solanaWeb3.PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
                        clock: solanaWeb3.SYSVAR_CLOCK_PUBKEY
                    }).instruction());
                } else if (action === 'unstake') {
                    const isEarly = Date.now()/1000 < window.foxState.data.lockup;
                    tx.add(await program.methods.unstake(new anchor.BN(window.foxState.data.staked.toString()), isEarly).accounts({
                        poolState: poolPk, userStaking: userPDA, owner: window.foxState.wallet,
                        vault: new solanaWeb3.PublicKey(AFOX_CFG.VAULT),
                        daoTreasuryVault: new solanaWeb3.PublicKey(AFOX_CFG.DAO_TREASURY),
                        adminFeeVault: new solanaWeb3.PublicKey(AFOX_CFG.REWARDS_VAULT),
                        rewardMint: new solanaWeb3.PublicKey(AFOX_CFG.MINT),
                        tokenProgram: new solanaWeb3.PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
                        clock: solanaWeb3.SYSVAR_CLOCK_PUBKEY
                    }).instruction());
                }

                const sig = await window.foxState.provider.sendAndConfirm(tx);
                console.log("Tx Success:", sig);
                await this.fullSync();
            });
        },

        // --- DATA SYNC ---
        async fullSync() {
            if (!window.foxState.wallet) return;
            try {
                const pk = window.foxState.wallet;
                const conn = window.foxState.connection;
                
                // Balances
                const [sol, tokens] = await Promise.all([
                    conn.getBalance(pk),
                    conn.getParsedTokenAccountsByOwner(pk, { mint: new solanaWeb3.PublicKey(AFOX_CFG.MINT) })
                ]);
                
                window.foxState.data.balance = tokens.value[0] ? BigInt(tokens.value[0].account.data.parsed.info.tokenAmount.amount) : 0n;

                // Staking Data
                const program = await this.getProgram();
                const [userPDA] = await solanaWeb3.PublicKey.findProgramAddress(
                    [pk.toBuffer(), new solanaWeb3.PublicKey(AFOX_CFG.POOL_STATE).toBuffer()],
                    program.programId
                );

                const stakeAcc = await program.account.userStakingAccount.fetch(userPDA);
                window.foxState.data.staked = BigInt(stakeAcc.stakedAmount.toString());
                window.foxState.data.rewards = BigInt(stakeAcc.rewardsToClaim.toString()) + BigInt(stakeAcc.pendingRewardsDueToLimit.toString());
                window.foxState.data.lockup = Number(stakeAcc.lockupEndTime);
                window.foxState.data.lending = BigInt(stakeAcc.lending.toString());

                UI.refreshDisplay();
            } catch (e) {
                console.warn("Sync Error (Account might be empty)");
            }
        },

        startBackgroundSync() {
            setInterval(() => { if(window.foxState.wallet) this.fullSync(); }, 30000);
        }
    };

    // --- 3. UI ENGINE ---
    const UI = {
        refreshDisplay() {
            const d = window.foxState.data;
            this.set('user-afox-balance', Utils.format(d.balance));
            this.set('user-staked-amount', Utils.format(d.staked));
            this.set('user-rewards-amount', Utils.format(d.rewards));
            
            const lockup = document.getElementById('lockup-period');
            if (lockup) {
                const now = Date.now()/1000;
                lockup.innerText = d.lockup > now ? `Locked for ${((d.lockup - now)/86400).toFixed(1)} days` : "Flexible";
            }

            // Кнопки
            const unstakeBtn = document.getElementById('unstake-afox-btn');
            if (unstakeBtn) {
                unstakeBtn.disabled = d.staked === 0n || d.lending > 0n;
                if (d.lending > 0n) unstakeBtn.innerText = "❌ Locked by Loan";
            }
        },

        updateWalletUI(addr) {
            const btn = document.getElementById('connectWalletBtn');
            if (btn) {
                btn.innerHTML = addr ? `<span>●</span> ${addr.slice(0,4)}...${addr.slice(-4)}` : "Connect Wallet";
                btn.style.borderColor = addr ? "#00ffa3" : "";
            }
        },

        async runWithLoader(btn, label, fn) {
            const old = btn.innerHTML;
            try {
                window.foxState.isPending = true;
                btn.disabled = true;
                btn.innerHTML = `<span class="fox-spinner"></span> ${label}...`;
                await fn();
                this.notify(`${label} Success!`, "success");
                this.spawnFx(btn);
            } catch (e) {
                this.notify(e.message, "error");
                btn.classList.add('shake');
                setTimeout(() => btn.classList.remove('shake'), 500);
            } finally {
                btn.disabled = false;
                btn.innerHTML = old;
                window.foxState.isPending = false;
            }
        },

        notify(msg, type) {
            const container = document.getElementById('notification-container');
            const toast = document.createElement('div');
            toast.className = `web3-toast ${type}`;
            toast.style.cssText = `background:#0b1426; color:white; padding:1rem; margin:0.5rem; border-left:4px solid ${type==='success'?'#00ffa3':'#ff4d4d'}; border-radius:8px; box-shadow:0 10px 30px rgba(0,0,0,0.5); animation:toastIn 0.4s ease-out;`;
            toast.innerText = msg;
            container.appendChild(toast);
            setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 500); }, 4000);
        },

        spawnFx(el) {
            const rect = el.getBoundingClientRect();
            for (let i = 0; i < 15; i++) {
                const p = document.createElement('div');
                p.innerText = ['💎', '🦊', '✨'][Math.floor(Math.random()*3)];
                p.style.cssText = `position:fixed; left:${rect.left + rect.width/2}px; top:${rect.top}px; pointer-events:none; z-index:9999; font-size:20px;`;
                document.body.appendChild(p);
                p.animate([
                    { transform: 'translate(0,0) scale(1)', opacity: 1 },
                    { transform: `translate(${(Math.random()-0.5)*300}px, ${-200-Math.random()*200}px) rotate(${Math.random()*360}deg) scale(0)`, opacity: 0 }
                ], { duration: 1000 + Math.random()*500, easing: 'cubic-bezier(0, .9, .57, 1)' }).onfinish = () => p.remove();
            }
        },

        set(id, val) {
            const el = document.getElementById(id);
            if (el) el.innerText = val + " AFOX";
        },

        toggleModal(id, show) {
            const m = document.getElementById(id);
            if (m) m.style.display = show ? 'flex' : 'none';
        }
    };

    // --- 4. UTILS ---
    const Utils = {
        format(val) {
            if (!val) return "0.00";
            const s = val.toString().padStart(AFOX_CFG.DECIMALS + 1, '0');
            const int = s.slice(0, -AFOX_CFG.DECIMALS);
            const frac = s.slice(-AFOX_CFG.DECIMALS).slice(0, 2);
            return `${parseInt(int).toLocaleString()}.${frac}`;
        },
        toBN(amount, dec) {
            if (!amount) return 0n;
            const parts = amount.toString().split('.');
            let res = BigInt(parts[0]) * BigInt(10 ** dec);
            if (parts[1]) res += BigInt(parts[1].padEnd(dec, '0').slice(0, dec));
            return res;
        }
    };

    // --- 5. RUN ENGINE ---
    window.addEventListener('DOMContentLoaded', () => FoxEngine.init());

    // Доп. стили для спиннера
    const style = document.createElement('style');
    style.innerHTML = `
        .fox-spinner { width: 14px; height: 14px; border: 2px solid #ffffff33; border-top-color: #fff; border-radius: 50%; display: inline-block; animation: fox-spin 0.8s linear infinite; margin-right: 8px; vertical-align: middle; }
        @keyframes fox-spin { to { transform: rotate(360deg); } }
        @keyframes toastIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        .shake { animation: fox-shake 0.4s; }
        @keyframes fox-shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }
    `;
    document.head.appendChild(style);

})();
