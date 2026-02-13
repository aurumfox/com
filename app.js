/**
 * 🦊 AURUM FOX - THE ULTIMATE TITAN ENGINE (RITTER EDITION)
 * Содержит: Wallet, Staking, DAO, Lending, Smart UI, Particle FX
 * Версия: 2.0 (Максимальная синхронизация)
 */

(function() {
    "use strict";

    // ==========================================
    // 1. КОНФИГУРАЦИЯ И ГЛОБАЛЬНОЕ СОСТОЯНИЕ
    // ==========================================
    const CONFIG = {
        PROGRAM_ID: "ZiECmSCWiJvsKRbNmBw27pyWEqEPFY4sBZ3MCnbvirH",
        MINT: "GLkewtq8s2Yr24o5LT5mzzEeccKuSsy8H5RCHaE9uRAd",
        POOL_STATE: "DfAaH2XsWsjSgPkECmZfDsmABzboJ5hJ8T32Aft2QaXZ",
        VAULT: "328N13YrQyUAfqHEAXhtQhfan5hHRxDdZqsdpSx6KSkp",
        REWARDS_VAULT: "BXinWRfmkk2jo3cTJfcYT5zoC7yix5AsvmTk8NwLoiDF",
        DAO_TREASURY: "6BzRqaLD7CiGvSWjkp5G8RbmvGdjMRUqmz9VcXfGzfzi",
        RPC: "https://solana-rpc.publicnode.com",
        AFOX_DECIMALS: 6,
        SOL_DECIMALS: 9
    };

    window.appState = {
        connection: null,
        provider: null,
        wallet: null,
        isProcessing: false,
        data: {
            balance: 0n,
            staked: 0n,
            rewards: 0n,
            lockup: 0,
            poolIndex: 0,
            lending: 0n
        }
    };

    // ==========================================
    // 2. БРИДЖ ДЛЯ ОБХОДА ОШИБОК (CSP/BUFFER)
    // ==========================================
    const Bridge = {
        init() {
            window.Buffer = window.Buffer || (window.buffer ? window.buffer.Buffer : undefined);
            if (!window.anchor) {
                window.anchor = {
                    AnchorProvider: function(c, w, o) { this.connection = c; this.wallet = w; this.opts = o; },
                    Program: function(i, p, pr) { this.idl = i; this.programId = p; this.provider = pr; }
                };
            }
            console.log("🛡️ Bridge: Systems Stabilized");
        }
    };

    // ==========================================
    // 3. ЯДРО СМАРТ-КОНТРАКТА (STAKING IDL)
    // ==========================================
    const STAKING_IDL = {
        "version": "0.1.0", "name": "afox_staking",
        "instructions": [
            { "name": "initializeUserStake", "accounts": [ { "name": "poolState", "isMut": true }, { "name": "userStaking", "isMut": true }, { "name": "owner", "isMut": true }, { "name": "rewardMint", "isMut": false }, { "name": "systemProgram", "isMut": false }, { "name": "clock", "isMut": false } ], "args": [{ "name": "poolIndex", "type": "u8" }] },
            { "name": "deposit", "accounts": [ { "name": "poolState", "isMut": true }, { "name": "userStaking", "isMut": true }, { "name": "owner", "isMut": true }, { "name": "userSourceAta", "isMut": true }, { "name": "vault", "isMut": true }, { "name": "rewardMint", "isMut": false }, { "name": "tokenProgram", "isMut": false }, { "name": "clock", "isMut": false } ], "args": [{ "name": "amount", "type": "u64" }] },
            { "name": "claimRewards", "accounts": [ { "name": "poolState", "isMut": true }, { "name": "userStaking", "isMut": true }, { "name": "owner", "isMut": true }, { "name": "vault", "isMut": true }, { "name": "adminFeeVault", "isMut": true }, { "name": "userRewardsAta", "isMut": true }, { "name": "rewardMint", "isMut": false }, { "name": "tokenProgram", "isMut": false }, { "name": "clock", "isMut": false } ], "args": [] },
            { "name": "unstake", "accounts": [ { "name": "poolState", "isMut": true }, { "name": "userStaking", "isMut": true }, { "name": "owner", "isMut": true }, { "name": "vault", "isMut": true }, { "name": "daoTreasuryVault", "isMut": true }, { "name": "adminFeeVault", "isMut": true }, { "name": "userRewardsAta", "isMut": true }, { "name": "rewardMint", "isMut": false }, { "name": "tokenProgram", "isMut": false }, { "name": "clock", "isMut": false } ], "args": [{ "name": "amount", "type": "u64" }, { "name": "isEarlyExit", "type": "bool" }] }
        ],
        "accounts": [ { "name": "UserStakingAccount", "type": { "kind": "struct", "fields": [ { "name": "isInitialized", "type": "bool" }, { "name": "stakeBump", "type": "u8" }, { "name": "poolIndex", "type": "u8" }, { "name": "paddingA", "type": { "array": ["u8", 5] } }, { "name": "owner", "type": "publicKey" }, { "name": "stakedAmount", "type": "u64" }, { "name": "lockupEndTime", "type": "i64" }, { "name": "rewardPerShareUser", "type": "u128" }, { "name": "rewardsToClaim", "type": "u64" }, { "name": "pendingRewardsDueToLimit", "type": "u64" }, { "name": "lending", "type": "u64" }, { "name": "lendingUnlockTime", "type": "i64" }, { "name": "lastUpdateTime", "type": "i64" }, { "name": "paddingFinal", "type": { "array": ["u8", 104] } } ] } } ]
    };

    // ==========================================
    // 4. УТИЛИТЫ И ФОРМАТИРОВАНИЕ
    // ==========================================
    const Utils = {
        format(val, dec = CONFIG.AFOX_DECIMALS) {
            if (!val) return "0.00";
            const s = val.toString().padStart(dec + 1, '0');
            const int = s.slice(0, -dec);
            const frac = s.slice(-dec).slice(0, 2);
            return `${parseInt(int).toLocaleString()}.${frac}`;
        },
        toBN(str, dec = CONFIG.AFOX_DECIMALS) {
            if (!str) return 0n;
            const parts = str.split('.');
            let res = BigInt(parts[0]) * BigInt(10 ** dec);
            if (parts[1]) res += BigInt(parts[1].padEnd(dec, '0').slice(0, dec));
            return res;
        }
    };

    // ==========================================
    // 5. ГЛАВНЫЙ "РЫЦАРЬ" (Action Engine)
    // ==========================================
    const Ritter = {
        async init() {
            Bridge.init();
            this.bindEvents();
            window.appState.connection = new solanaWeb3.Connection(CONFIG.RPC, 'confirmed');
            setTimeout(() => this.connect(true), 500);
        },

        bindEvents() {
            // Авто-поиск кнопок по ID и тексту
            document.addEventListener('click', async (e) => {
                const btn = e.target.closest('button');
                if (!btn) return;
                
                const id = btn.id;
                const txt = btn.innerText.toLowerCase();

                if (id === 'connectWalletBtn' || txt.includes('wallet')) this.toggleWallet();
                else if (id === 'stake-afox-btn' || txt.includes('stake')) this.handleStake();
                else if (id === 'claim-rewards-btn' || txt.includes('claim')) this.handleClaim();
                else if (id === 'unstake-afox-btn' || txt.includes('unstake')) this.handleUnstake();
                else if (txt.includes('max')) this.fillMax(btn);
            });
        },

        async connect(silent = false) {
            try {
                const provider = window.phantom?.solana || window.solana;
                if (!provider) return;
                const resp = await provider.connect(silent ? { onlyIfTrusted: true } : {});
                window.appState.wallet = resp.publicKey;
                window.appState.provider = provider;
                UI.refreshWallet();
                this.sync();
            } catch (e) { if(!silent) console.error("Conn failed", e); }
        },

        async toggleWallet() {
            if (window.appState.wallet) {
                await window.appState.provider.disconnect();
                window.appState.wallet = null;
                UI.refreshWallet();
                UI.notify("Disconnected", "info");
            } else {
                await this.connect(false);
            }
        },

        async sync() {
            if (!window.appState.wallet) return;
            try {
                const pk = window.appState.wallet;
                const conn = window.appState.connection;
                
                const [bal, tokens] = await Promise.all([
                    conn.getBalance(pk),
                    conn.getParsedTokenAccountsByOwner(pk, { mint: new solanaWeb3.PublicKey(CONFIG.MINT) })
                ]);

                window.appState.data.balance = tokens.value[0] ? BigInt(tokens.value[0].account.data.parsed.info.tokenAmount.amount) : 0n;

                const program = this.getProgram();
                const [userPDA] = await solanaWeb3.PublicKey.findProgramAddress(
                    [pk.toBuffer(), new solanaWeb3.PublicKey(CONFIG.POOL_STATE).toBuffer()],
                    program.programId
                );

                const stakeData = await program.account.userStakingAccount.fetch(userPDA);
                window.appState.data.staked = BigInt(stakeData.stakedAmount.toString());
                window.appState.data.rewards = BigInt(stakeData.rewardsToClaim.toString()) + BigInt(stakeData.pendingRewardsDueToLimit.toString());
                window.appState.data.lockup = Number(stakeData.lockupEndTime);
                window.appState.data.lending = BigInt(stakeData.lending.toString());

                UI.updateStats();
            } catch (e) { console.warn("Sync: Account new/empty"); }
        },

        getProgram() {
            const provider = new anchor.AnchorProvider(window.appState.connection, window.appState.provider, { commitment: 'confirmed' });
            return new anchor.Program(STAKING_IDL, new solanaWeb3.PublicKey(CONFIG.PROGRAM_ID), provider);
        },

        // --- ДЕЙСТВИЯ ---
        async handleStake() {
            const amtStr = document.getElementById('stake-amount')?.value;
            if (!amtStr || amtStr <= 0) return UI.notify("Enter amount", "error");

            await UI.run(document.getElementById('stake-afox-btn'), "Staking", async () => {
                const program = this.getProgram();
                const amt = Utils.toBN(amtStr);
                const pk = window.appState.wallet;
                const [userPDA] = await solanaWeb3.PublicKey.findProgramAddress([pk.toBuffer(), new solanaWeb3.PublicKey(CONFIG.POOL_STATE).toBuffer()], program.programId);

                const tx = new solanaWeb3.Transaction();
                const info = await window.appState.connection.getAccountInfo(userPDA);
                
                if (!info) {
                    tx.add(await program.methods.initializeUserStake(0).accounts({
                        poolState: CONFIG.POOL_STATE, userStaking: userPDA, owner: pk,
                        rewardMint: CONFIG.MINT, systemProgram: solanaWeb3.SystemProgram.programId,
                        clock: solanaWeb3.SYSVAR_CLOCK_PUBKEY
                    }).instruction());
                }

                tx.add(await program.methods.deposit(new anchor.BN(amt.toString())).accounts({
                    poolState: CONFIG.POOL_STATE, userStaking: userPDA, owner: pk,
                    vault: CONFIG.VAULT, rewardMint: CONFIG.MINT,
                    tokenProgram: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
                    clock: solanaWeb3.SYSVAR_CLOCK_PUBKEY
                }).instruction());

                await window.appState.provider.sendAndConfirm(tx);
                await this.sync();
            });
        },

        async handleClaim() {
            await UI.run(document.getElementById('claim-rewards-btn'), "Claiming", async () => {
                const program = this.getProgram();
                const pk = window.appState.wallet;
                const [userPDA] = await solanaWeb3.PublicKey.findProgramAddress([pk.toBuffer(), new solanaWeb3.PublicKey(CONFIG.POOL_STATE).toBuffer()], program.programId);

                await program.methods.claimRewards().accounts({
                    poolState: CONFIG.POOL_STATE, userStaking: userPDA, owner: pk,
                    vault: CONFIG.VAULT, adminFeeVault: CONFIG.REWARDS_VAULT,
                    rewardMint: CONFIG.MINT, tokenProgram: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
                    clock: solanaWeb3.SYSVAR_CLOCK_PUBKEY
                }).rpc();
                await this.sync();
            });
        },

        async handleUnstake() {
            await UI.run(document.getElementById('unstake-afox-btn'), "Unstaking", async () => {
                const program = this.getProgram();
                const pk = window.appState.wallet;
                const [userPDA] = await solanaWeb3.PublicKey.findProgramAddress([pk.toBuffer(), new solanaWeb3.PublicKey(CONFIG.POOL_STATE).toBuffer()], program.programId);
                const isEarly = Date.now()/1000 < window.appState.data.lockup;

                await program.methods.unstake(new anchor.BN(window.appState.data.staked.toString()), isEarly).accounts({
                    poolState: CONFIG.POOL_STATE, userStaking: userPDA, owner: pk,
                    vault: CONFIG.VAULT, daoTreasuryVault: CONFIG.DAO_TREASURY,
                    adminFeeVault: CONFIG.REWARDS_VAULT, rewardMint: CONFIG.MINT,
                    tokenProgram: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
                    clock: solanaWeb3.SYSVAR_CLOCK_PUBKEY
                }).rpc();
                await this.sync();
            });
        },

        fillMax(btn) {
            const input = document.getElementById('stake-amount');
            if (input) input.value = Utils.format(window.appState.data.balance).replace(',', '');
        }
    };

    // ==========================================
    // 6. UI И ВИЗУАЛЬНЫЕ ЭФФЕКТЫ
    // ==========================================
    const UI = {
        refreshWallet() {
            const btn = document.getElementById('connectWalletBtn');
            if (!btn) return;
            const pk = window.appState.wallet;
            btn.innerHTML = pk ? `<span>●</span> ${pk.toBase58().slice(0,4)}...${pk.toBase58().slice(-4)}` : "Connect Wallet";
            btn.style.borderColor = pk ? "#00ffa3" : "";
        },

        updateStats() {
            const d = window.appState.data;
            this.set('user-afox-balance', Utils.format(d.balance));
            this.set('user-staked-amount', Utils.format(d.staked));
            this.set('user-rewards-amount', Utils.format(d.rewards));
            
            const unstakeBtn = document.getElementById('unstake-afox-btn');
            if (unstakeBtn) {
                if (d.lending > 0n) {
                    unstakeBtn.disabled = true;
                    unstakeBtn.innerText = "Locked by Loan";
                } else {
                    unstakeBtn.disabled = d.staked === 0n;
                    unstakeBtn.innerText = "Unstake";
                }
            }
        },

        set(id, val) {
            const el = document.getElementById(id);
            if (el) el.innerText = val + " AFOX";
        },

        async run(btn, label, fn) {
            const old = btn.innerHTML;
            try {
                btn.disabled = true;
                btn.innerHTML = `<span class="fox-loader"></span> ${label}...`;
                await fn();
                this.notify(label + " Success!", "success");
                this.fx(btn);
            } catch (e) {
                this.notify("Error: " + (e.message || "Rejected"), "error");
            } finally {
                btn.disabled = false;
                btn.innerHTML = old;
            }
        },

        notify(msg, type) {
            const toast = document.createElement('div');
            toast.className = `afox-toast ${type}`;
            toast.innerHTML = msg;
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 4000);
        },

        fx(el) {
            const rect = el.getBoundingClientRect();
            for (let i = 0; i < 12; i++) {
                const p = document.createElement('div');
                p.innerText = ['🦊', '💎', '✨'][Math.floor(Math.random()*3)];
                p.style.cssText = `position:fixed; left:${rect.left + rect.width/2}px; top:${rect.top}px; pointer-events:none; z-index:9999;`;
                document.body.appendChild(p);
                p.animate([
                    { transform: 'translate(0,0) scale(1)', opacity: 1 },
                    { transform: `translate(${(Math.random()-0.5)*200}px, -150px) scale(0)`, opacity: 0 }
                ], { duration: 1000 }).onfinish = () => p.remove();
            }
        }
    };

    // Запуск
    window.addEventListener('DOMContentLoaded', () => Ritter.init());

    // Стили
    const style = document.createElement('style');
    style.innerHTML = `
        .fox-loader { width: 14px; height: 14px; border: 2px solid #ffffff33; border-top-color: #fff; border-radius: 50%; display: inline-block; animation: fspin 0.6s linear infinite; vertical-align: middle; margin-right: 8px; }
        @keyframes fspin { to { transform: rotate(360deg); } }
        .afox-toast { position: fixed; bottom: 20px; right: 20px; background: #0b1426; color: white; padding: 12px 24px; border-radius: 8px; border-left: 4px solid #00ffa3; box-shadow: 0 10px 30px rgba(0,0,0,0.5); z-index: 10000; animation: fin 0.3s ease-out; font-family: sans-serif; }
        .afox-toast.error { border-left-color: #ff4d4d; }
        @keyframes fin { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    `;
    document.head.appendChild(style);

})();
