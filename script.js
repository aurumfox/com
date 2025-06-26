// --- Global Variables for Wallet Connection ---
let walletPublicKey = null;
let provider = null;
let connection = null; // Solana connection object
let providerListenersInitialized = false;

// --- Wallet Setup ---
const network = SolanaWeb3.WalletAdapterNetwork.Devnet; // Change to 'Mainnet-beta' for production
const wallets = [
    new SolanaWalletAdapterPhantom.PhantomWalletAdapter(),
    // new SolanaWalletAdapterWallets.SolflareWalletAdapter({ network }), // Add other wallets as needed
];

// --- Your Staking Smart Contract Constant ---
const STAKING_PROGRAM_ID = new SolanaWeb3.PublicKey('YOUR_STAKING_PROGRAM_ID_HERE'); // <-- REPLACE WITH YOUR STAKING SMART CONTRACT ADDRESS!
const AFOX_TOKEN_MINT_ADDRESS = new SolanaWeb3.PublicKey('YourAFOXTokenMintAddressHere'); // <-- REPLACE WITH YOUR AFOX TOKEN ADDRESS!
const AFOX_TOKEN_DECIMALS = 9; // <-- REPLACE WITH THE DECIMAL PLACES OF YOUR AFOX TOKEN!

// --- Your Marketplace Smart Contract Constant (if separate) ---
const MARKETPLACE_PROGRAM_ID = new SolanaWeb3.PublicKey('YOUR_MARKETPLACE_PROGRAM_ID_HERE'); // <-- REPLACE WITH YOUR MARKETPLACE SMART CONTRACT ADDRESS!

// --- UI Elements (Placeholders, assume these are defined in your HTML) ---
// For a complete setup, ensure these are correctly linked to your HTML elements, e.g.:
const connectWalletBtn = document.getElementById('connectWalletBtn');
const stakeAfoxBtn = document.getElementById('stakeAfoxBtn');
const claimRewardsBtn = document.getElementById('claimRewardsBtn');
const unstakeAfoxBtn = document.getElementById('unstakeAfoxBtn');
const stakeAmountInput = document.getElementById('stakeAmountInput');
const walletAddressDisplayWeb3 = document.getElementById('walletAddressDisplayWeb3');
const walletAddressDisplayNft = document.getElementById('walletAddressDisplayNft');
const walletAddressDisplayDao = document.getElementById('walletAddressDisplayDao');
const nftDetailsModal = document.getElementById('nftDetailsModal');
const nftDetailImage = document.getElementById('nftDetailImage');
const nftDetailName = document.getElementById('nftDetailName');
const nftDetailDescription = document.getElementById('nftDetailDescription');
const nftDetailOwner = document.getElementById('nftDetailOwner');
const nftDetailMint = document.getElementById('nftDetailMint');
const nftDetailSolscanLink = document.getElementById('nftDetailSolscanLink');
const attributesList = document.getElementById('attributesList');
const nftDetailBuyBtn = document.getElementById('nftDetailBuyBtn');
const nftDetailSellBtn = document.getElementById('nftDetailSellBtn');
const nftDetailTransferBtn = document.getElementById('nftDetailTransferBtn');
const nftDetailHistory = document.getElementById('nftDetailHistory');
const mintNftForm = document.getElementById('mintNftForm');
const listNftForm = document.getElementById('listNftForm');
const nftToSellSelect = document.getElementById('nftToSell'); // Assuming this is your select element for NFTs
const nftGallery = document.getElementById('nftGallery');
const marketplaceGallery = document.getElementById('marketplaceGallery');


/**
 * Helper to show notifications.
 * @param {string} message
 * @param {'success'|'error'|'info'|'warning'} type
 * @param {number} duration - in milliseconds
 */
function showNotification(message, type = 'info', duration = 3000) {
    const notificationContainer = document.getElementById('notificationContainer'); // Assume you have this container
    if (!notificationContainer) {
        console.warn('Notification container not found. Message:', message);
        return;
    }

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = message;
    notificationContainer.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, duration);
}

/**
 * Handles wallet disconnection.
 */
function handleWalletDisconnect() {
    walletPublicKey = null;
    provider = null;
    if (walletAddressDisplayWeb3) walletAddressDisplayWeb3.textContent = 'Not Connected';
    if (walletAddressDisplayNft) walletAddressDisplayNft.textContent = 'Not Connected';
    if (walletAddressDisplayDao) walletAddressDisplayDao.textContent = 'Not Connected';
    showNotification('Wallet disconnected.', 'info');
    // Clear any wallet-specific UI elements
    updateStakingUI(); // Clear staking info
    loadUserNFTs('disconnected'); // Clear user NFTs
}

/**
 * Sets up listeners for provider events (connect, disconnect, account change).
 */
function setupProviderListeners() {
    if (provider && !providerListenersInitialized) {
        provider.on('connect', () => {
            walletPublicKey = provider.publicKey;
            console.log('Wallet reconnected:', walletPublicKey.toBase58());
            showNotification('Wallet reconnected!', 'success');
            if (walletAddressDisplayWeb3) walletAddressDisplayWeb3.textContent = walletPublicKey.toBase58();
            if (walletAddressDisplayNft) walletAddressDisplayNft.textContent = walletPublicKey.toBase58();
            if (walletAddressDisplayDao) walletAddressDisplayDao.textContent = walletPublicKey.toBase58();
            loadUserNFTs(walletPublicKey.toBase58());
            updateStakingUI();
        });
        provider.on('disconnect', () => {
            console.log('Wallet disconnected from DApp.');
            handleWalletDisconnect();
        });
        providerListenersInitialized = true;
    }
}

/**
 * Initializes the Solana blockchain connection.
 * Called on page load and when the wallet connects.
 */
function initializeSolanaConnection() {
    if (!connection) {
        connection = new SolanaWeb3.Connection(SolanaWeb3.clusterApiUrl(network), 'confirmed');
        console.log('Solana connection initialized.');
    }
}

/**
 * Connects the user's wallet.
 */
async function connectWallet() {
    try {
        const selectedWallet = wallets[0];
        if (!selectedWallet) {
            showNotification('Wallet adapter not found. Please ensure Phantom is installed.', 'error');
            return;
        }

        if (!selectedWallet.connected) {
            await selectedWallet.connect();
        }

        walletPublicKey = selectedWallet.publicKey;
        provider = selectedWallet;
        console.log('Wallet connected:', walletPublicKey.toBase58());
        showNotification('Wallet connected successfully!', 'success');

        if (walletAddressDisplayWeb3) walletAddressDisplayWeb3.textContent = walletPublicKey.toBase58();
        if (walletAddressDisplayNft) walletAddressDisplayNft.textContent = walletPublicKey.toBase58();
        if (walletAddressDisplayDao) walletAddressDisplayDao.textContent = walletPublicKey.toBase58();

        initializeSolanaConnection(); // Ensure connection is established

        setupProviderListeners();

        await loadUserNFTs(walletPublicKey.toBase58());
        await updateStakingUI();

    } catch (error) {
        console.error('Failed to connect wallet:', error);
        showNotification(`Failed to connect wallet: ${error.message || error}`, 'error');
        handleWalletDisconnect();
    }
}

// Attach event listener for connect wallet button if it exists
if (connectWalletBtn) {
    connectWalletBtn.addEventListener('click', connectWallet);
}


// --- Staking Logic ---
// "Stake" button handler (REAL SMART CONTRACT INTERACTION)
if (stakeAfoxBtn) {
    stakeAfoxBtn.addEventListener('click', async () => {
        if (!walletPublicKey) {
            showNotification('Please connect your wallet.', 'info');
            return;
        }
        if (!connection) {
            showNotification('Solana connection not established. Please try again.', 'error');
            return;
        }

        const amount = parseFloat(stakeAmountInput.value);
        if (isNaN(amount) || amount <= 0) {
            showNotification('Please enter a valid amount to stake.', 'warning');
            return;
        }

        console.log(`Attempting to stake ${amount} AFOX...`);
        showNotification('Initiating staking transaction... Please confirm in your wallet.', 'info', 5000);

        try {
            // 1. Get user's ATA (Associated Token Account) for AFOX
            const userAfoxTokenAccount = await SolanaSPL.getAssociatedTokenAddress(
                AFOX_TOKEN_MINT_ADDRESS,
                walletPublicKey
            );

            // 2. Check if user's ATA exists. If not, suggest creating or warn.
            const userAfoxAccountInfo = await connection.getAccountInfo(userAfoxTokenAccount);
            if (!userAfoxAccountInfo) {
                showNotification('You do not have an AFOX token account. Please get one first (e.g., receive some AFOX).', 'warning');
                // In a real dApp, you might offer to create the ATA:
                /*
                const transaction = new SolanaWeb3.Transaction().add(
                    SolanaSPL.createAssociatedTokenAccountInstruction(
                        walletPublicKey, // Payer
                        userAfoxTokenAccount, // ATA address to create
                        walletPublicKey, // Owner of ATA
                        AFOX_TOKEN_MINT_ADDRESS // Token Mint
                    )
                );
                // Add staking instruction after ATA creation
                // ...
                */
                return;
            }

            // 3. Calculate the amount in smallest units (lamports for tokens)
            const amountInSmallestUnits = amount * (10 ** AFOX_TOKEN_DECIMALS);

            // 4. PREPARING INSTRUCTIONS FOR YOUR STAKING SMART CONTRACT
            // This is PSEUDO-CODE, which you need to replace with the real logic of your contract!

            // Example: Getting PDA for user's staking account
            const [userStakingAccountPDA, userStakingBump] = SolanaWeb3.PublicKey.findProgramAddressSync(
                [
                    walletPublicKey.toBuffer(),
                    AFOX_TOKEN_MINT_ADDRESS.toBuffer(), // If your staking is for a specific token
                    Buffer.from("stake") // A label you use for the staking PDA
                ],
                STAKING_PROGRAM_ID
            );

            // Example: Getting PDA for AFOX token account of your staking pool (Vault)
            const [stakingVaultPDA, stakingVaultBump] = SolanaWeb3.PublicKey.findProgramAddressSync(
                [
                    AFOX_TOKEN_MINT_ADDRESS.toBuffer(),
                    Buffer.from("vault") // Label for the Vault
                ],
                STAKING_PROGRAM_ID
            );

            // Create an instruction for staking from your contract
            // THIS IS A HIGHLY SIMPLIFIED EXAMPLE! The real instruction depends on your program.
            // It might take arguments (e.g., `amountInSmallestUnits`) and require a signature.
            const stakeInstruction = new SolanaWeb3.TransactionInstruction({
                keys: [
                    { pubkey: walletPublicKey, isSigner: true, isWritable: true }, // User, signing
                    { pubkey: userAfoxTokenAccount, isSigner: false, isWritable: true }, // User's ATA (where tokens are debited from)
                    { pubkey: userStakingAccountPDA, isSigner: false, isWritable: true }, // User's staking account (will be created/modified)
                    { pubkey: stakingVaultPDA, isSigner: false, isWritable: true }, // Staking pool's Vault account (where tokens are transferred to)
                    { pubkey: AFOX_TOKEN_MINT_ADDRESS, isSigner: false, isWritable: false }, // AFOX Mint address
                    { pubkey: SolanaWeb3.SystemProgram.programId, isSigner: false, isWritable: false }, // System Program for account creation
                    { pubkey: SolanaSPL.TOKEN_PROGRAM_ID, isSigner: false, isWritable: false }, // SPL Token Program for transfer
                    { pubkey: SolanaWeb3.SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false }, // Rent sysvar for account creation
                ],
                programId: STAKING_PROGRAM_ID,
                // `data` - serialized arguments for your instruction (e.g., amount)
                // You will need to define the data format for your "Stake" instruction
                // For example, Buffer.from(Uint8Array.of(0, ...amountAsBytes)) where 0 is the "stake" instruction discriminator
                data: Buffer.alloc(8) // Placeholder: 8 bytes for u64, if amount is passed as u64
            });
            // Serialize amount into Buffer and place in data
            stakeInstruction.data = Buffer.concat([
                stakeInstruction.data.slice(0, 0), // Leave space for instruction discriminator (if any)
                new SolanaWeb3.BN(amountInSmallestUnits).toArrayLike(Buffer, 'le', 8) // Convert amount to Buffer (u64 Little Endian)
            ]);


            const transaction = new SolanaWeb3.Transaction().add(stakeInstruction);
            transaction.feePayer = walletPublicKey;
            transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

            const signedTransaction = await provider.signTransaction(transaction);
            const signature = await connection.sendRawTransaction(signedTransaction.serialize());
            await connection.confirmTransaction(signature, 'confirmed');

            console.log('Staking transaction signature:', signature);
            showNotification(`You successfully staked ${amount} AFOX! Transaction: <a href="https://solscan.io/tx/${signature}?cluster=${network}" target="_blank">${signature.substring(0, 10)}...</a>`, 'success', 10000);
            if (stakeAmountInput) stakeAmountInput.value = '';
            await updateStakingUI(); // Update UI after transaction
        } catch (error) {
            console.error('Error during staking:', error);
            showNotification(`Failed to stake tokens: ${error.message}. Check the console for details.`, 'error');
        }
    });
}

// "Claim Rewards" button handler (REAL SMART CONTRACT INTERACTION)
if (claimRewardsBtn) {
    claimRewardsBtn.addEventListener('click', async () => {
        if (!walletPublicKey) {
            showNotification('Please connect your wallet.', 'info');
            return;
        }
        if (!connection) {
            showNotification('Solana connection not established. Please try again.', 'error');
            return;
        }

        console.log('Attempting to claim rewards...');
        showNotification('Initiating claim rewards transaction... Please confirm in your wallet.', 'info', 5000);

        try {
            // PREPARING INSTRUCTIONS FOR YOUR STAKING SMART CONTRACT
            // This is PSEUDO-CODE, which you need to replace with the real logic of your contract!

            const userAfoxTokenAccount = await SolanaSPL.getAssociatedTokenAddress(
                AFOX_TOKEN_MINT_ADDRESS,
                walletPublicKey
            );

            const [userStakingAccountPDA, userStakingBump] = SolanaWeb3.PublicKey.findProgramAddressSync(
                [walletPublicKey.toBuffer(), AFOX_TOKEN_MINT_ADDRESS.toBuffer(), Buffer.from("stake")],
                STAKING_PROGRAM_ID
            );

            const [stakingVaultPDA, stakingVaultBump] = SolanaWeb3.PublicKey.findProgramAddressSync(
                [AFOX_TOKEN_MINT_ADDRESS.toBuffer(), Buffer.from("vault")],
                STAKING_PROGRAM_ID
            );

            // Create an instruction to claim rewards
            const claimRewardsInstruction = new SolanaWeb3.TransactionInstruction({
                keys: [
                    { pubkey: walletPublicKey, isSigner: true, isWritable: true }, // User
                    { pubkey: userStakingAccountPDA, isSigner: false, isWritable: true }, // User's staking account
                    { pubkey: stakingVaultPDA, isSigner: false, isWritable: true }, // Staking pool's Vault account
                    { pubkey: userAfoxTokenAccount, isSigner: false, isWritable: true }, // Where to send rewards
                    { pubkey: AFOX_TOKEN_MINT_ADDRESS, isSigner: false, isWritable: false }, // AFOX Mint
                    { pubkey: SolanaSPL.TOKEN_PROGRAM_ID, isSigner: false, isWritable: false }, // SPL Token Program
                    // If your contract has a separate account for rewards (Rewards Mint), add it here
                    // { pubkey: YOUR_REWARDS_MINT_ADDRESS, isSigner: false, isWritable: false },
                ],
                programId: STAKING_PROGRAM_ID,
                data: Buffer.from(Uint8Array.of(1)) // Example: 1 - discriminator for "claim_rewards" instruction
            });

            const transaction = new SolanaWeb3.Transaction().add(claimRewardsInstruction);
            transaction.feePayer = walletPublicKey;
            transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

            const signedTransaction = await provider.signTransaction(transaction);
            const signature = await connection.sendRawTransaction(signedTransaction.serialize());
            await connection.confirmTransaction(signature, 'confirmed');

            console.log('Claim rewards transaction signature:', signature);
            showNotification(`Rewards successfully claimed! Transaction: <a href="https://solscan.io/tx/${signature}?cluster=${network}" target="_blank">${signature.substring(0, 10)}...</a>`, 'success');
            await updateStakingUI();
        } catch (error) {
            console.error('Error claiming rewards:', error);
            showNotification(`Failed to claim rewards: ${error.message}. Check the console.`, 'error');
        }
    });
}

// "Unstake Tokens" button handler (REAL SMART CONTRACT INTERACTION)
if (unstakeAfoxBtn) {
    unstakeAfoxBtn.addEventListener('click', async () => {
        if (!walletPublicKey) {
            showNotification('Please connect your wallet.', 'info');
            return;
        }
        if (!connection) {
            showNotification('Solana connection not established. Please try again.', 'error');
            return;
        }

        // In a more complex implementation, you might ask for the amount to unstake
        // const amountToUnstake = parseFloat(prompt('How much AFOX do you want to unstake?'));
        // ... validation ...

        console.log('Attempting to unstake tokens...');
        showNotification('Initiating unstake transaction... Please confirm in your wallet.', 'info', 5000);

        try {
            // PREPARING INSTRUCTIONS FOR YOUR STAKING SMART CONTRACT
            // This is PSEUDO-CODE, which you need to replace with the real logic of your contract!

            const userAfoxTokenAccount = await SolanaSPL.getAssociatedTokenAddress(
                AFOX_TOKEN_MINT_ADDRESS,
                walletPublicKey
            );

            const [userStakingAccountPDA, userStakingBump] = SolanaWeb3.PublicKey.findProgramAddressSync(
                [walletPublicKey.toBuffer(), AFOX_TOKEN_MINT_ADDRESS.toBuffer(), Buffer.from("stake")],
                STAKING_PROGRAM_ID
            );

            const [stakingVaultPDA, stakingVaultBump] = SolanaWeb3.PublicKey.findProgramAddressSync(
                [AFOX_TOKEN_MINT_ADDRESS.toBuffer(), Buffer.from("vault")],
                STAKING_PROGRAM_ID
            );

            // Create an instruction to unstake
            const unstakeInstruction = new SolanaWeb3.TransactionInstruction({
                keys: [
                    { pubkey: walletPublicKey, isSigner: true, isWritable: true }, // User
                    { pubkey: userStakingAccountPDA, isSigner: false, isWritable: true }, // User's staking account
                    { pubkey: stakingVaultPDA, isSigner: false, isWritable: true }, // Staking pool's Vault account
                    { pubkey: userAfoxTokenAccount, isSigner: false, isWritable: true }, // Where to return tokens
                    { pubkey: AFOX_TOKEN_MINT_ADDRESS, isSigner: false, isWritable: false }, // AFOX Mint
                    { pubkey: SolanaSPL.TOKEN_PROGRAM_ID, isSigner: false, isWritable: false }, // SPL Token Program
                ],
                programId: STAKING_PROGRAM_ID,
                data: Buffer.from(Uint8Array.of(2)) // Example: 2 - discriminator for "unstake" instruction
                // If you're passing an amount, add its serialization here.
            });

            const transaction = new SolanaWeb3.Transaction().add(unstakeInstruction);
            transaction.feePayer = walletPublicKey;
            transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

            const signedTransaction = await provider.signTransaction(transaction);
            const signature = await connection.sendRawTransaction(signedTransaction.serialize());
            await connection.confirmTransaction(signature, 'confirmed');

            console.log('Unstake transaction signature:', signature);
            showNotification(`Staked tokens successfully unstaked! Transaction: <a href="https://solscan.io/tx/${signature}?cluster=${network}" target="_blank">${signature.substring(0, 10)}...</a>`, 'success');
            await updateStakingUI();
        } catch (error) {
            console.error('Error unstaking tokens:', error);
            showNotification(`Failed to unstake tokens: ${error.message}. Check the console.`, 'error');
        }
    });
}

// Helper functions for Staking UI
async function updateStakingUI() {
    const userStakedAmountDisplay = document.getElementById('userStakedAmount');
    const userRewardsDisplay = document.getElementById('userRewards');
    const stakingAprDisplay = document.getElementById('stakingApr');
    const stakingMinStakeDisplay = document.getElementById('stakingMinStake');
    const stakingLockupDaysDisplay = document.getElementById('stakingLockupDays');
    const stakingUnstakeFeeDisplay = document.getElementById('stakingUnstakeFee');
    const stakingRewardCalcMethodDisplay = document.getElementById('stakingRewardCalcMethod');

    if (!walletPublicKey) {
        if (userStakedAmountDisplay) userStakedAmountDisplay.textContent = 'N/A';
        if (userRewardsDisplay) userRewardsDisplay.textContent = 'N/A';
        // Clear staking pool info or set to default if no wallet
        if (stakingAprDisplay) stakingAprDisplay.textContent = 'N/A';
        if (stakingMinStakeDisplay) stakingMinStakeDisplay.textContent = 'N/A';
        if (stakingLockupDaysDisplay) stakingLockupDaysDisplay.textContent = 'N/A';
        if (stakingUnstakeFeeDisplay) stakingUnstakeFeeDisplay.textContent = 'N/A';
        if (stakingRewardCalcMethodDisplay) stakingRewardCalcMethodDisplay.textContent = 'N/A';
        return;
    }

    // Fetch user staking data
    const userStakingData = await getUserStakingAccount(walletPublicKey);
    if (userStakingData) {
        if (userStakedAmountDisplay) userStakedAmountDisplay.textContent = userStakingData.stakedAmount.toFixed(2);
        if (userRewardsDisplay) userRewardsDisplay.textContent = userStakingData.rewards.toFixed(2);
    } else {
        if (userStakedAmountDisplay) userStakedAmountDisplay.textContent = '0.00';
        if (userRewardsDisplay) userRewardsDisplay.textContent = '0.00';
    }

    // Fetch staking pool info
    const poolInfo = await getStakingPoolInfo();
    if (poolInfo) {
        if (stakingAprDisplay) stakingAprDisplay.textContent = `${poolInfo.apr}%`;
        if (stakingMinStakeDisplay) stakingMinStakeDisplay.textContent = `${poolInfo.minStake} AFOX`;
        if (stakingLockupDaysDisplay) stakingLockupDaysDisplay.textContent = `${poolInfo.lockupDays} days`;
        if (stakingUnstakeFeeDisplay) stakingUnstakeFeeDisplay.textContent = `${poolInfo.unstakeFee}%`;
        if (stakingRewardCalcMethodDisplay) stakingRewardCalcMethodDisplay.textContent = poolInfo.rewardCalcMethod;
    } else {
        // Fallback or default values if pool info cannot be fetched
        if (stakingAprDisplay) stakingAprDisplay.textContent = 'N/A';
        if (stakingMinStakeDisplay) stakingMinStakeDisplay.textContent = 'N/A';
        if (stakingLockupDaysDisplay) stakingLockupDaysDisplay.textContent = 'N/A';
        if (stakingUnstakeFeeDisplay) stakingUnstakeFeeDisplay.textContent = 'N/A';
        if (stakingRewardCalcMethodDisplay) stakingRewardCalcMethodDisplay.textContent = 'N/A';
    }
}

// REAL FUNCTIONS for interacting with the smart contract
async function getUserStakingAccount(publicKey) {
    if (!connection || !STAKING_PROGRAM_ID || !publicKey) {
        console.warn('Cannot fetch user staking account: connection, program ID, or public key missing.');
        return null;
    }
    try {
        // Example: Get PDA for user's staking account
        // Important: This PDA logic must match the PDA generation logic in your smart contract!
        const [userStakingPda, bump] = SolanaWeb3.PublicKey.findProgramAddressSync(
            [
                publicKey.toBuffer(),
                AFOX_TOKEN_MINT_ADDRESS.toBuffer(), // Use if your staking account is tied to a specific token
                Buffer.from("stake")
            ],
            STAKING_PROGRAM_ID
        );

        const accountInfo = await connection.getAccountInfo(userStakingPda);

        if (accountInfo && accountInfo.data) {
            // DESERIALIZATION OF YOUR STAKING ACCOUNT DATA
            // You will need to define the structure of your account (e.g., using Borsh, Anchor)
            // This is just a placeholder:
            const data = accountInfo.data;
            // Example: if you have simple u64 for staked_amount and rewards, then:
            // const stakedAmount = new SolanaWeb3.BN(data.slice(0, 0 + 8), 'le').toNumber() / (10 ** AFOX_TOKEN_DECIMALS);
            // const rewards = new SolanaWeb3.BN(data.slice(8, 8 + 8), 'le').toNumber() / (10 ** AFOX_TOKEN_DECIMALS);
            // return { stakedAmount, rewards };

            console.log('Raw user staking account data:', data.toString('hex')); // For debugging
            // Placeholder, replace with actual deserialization:
            return { stakedAmount: 100, rewards: 5.25 }; // Mock data
        }
        return null; // Staking account not found
    } catch (error) {
        console.error('Error fetching user staking account:', error);
        return null;
    }
}

async function getStakingPoolInfo() {
    if (!connection || !STAKING_PROGRAM_ID) {
        console.warn('Cannot fetch staking pool info: connection or program ID missing.');
        return null;
    }
    try {
        // Example: Get PDA for the global staking pool account
        // This PDA logic must match the PDA generation logic in your smart contract!
        const [poolInfoPda, bump] = SolanaWeb3.PublicKey.findProgramAddressSync(
            [Buffer.from("pool_info")], // Label you use for the global account
            STAKING_PROGRAM_ID
        );

        const accountInfo = await connection.getAccountInfo(poolInfoPda);

        if (accountInfo && accountInfo.data) {
            // DESERIALIZATION OF YOUR GLOBAL POOL ACCOUNT DATA
            // You will need to define the structure of your account
            const data = accountInfo.data;
            // Example:
            // const apr = data.readUInt16LE(0); // 2 bytes for APR
            // const minStake = new SolanaWeb3.BN(data.slice(2, 10), 'le').toNumber() / (10 ** AFOX_TOKEN_DECIMALS);
            // const lockupDays = data.readUInt16LE(10);
            // const unstakeFee = data.readUInt16LE(12);
            // const rewardCalcMethod = "Daily"; // Or from data
            // return { apr, minStake, lockupDays, unstakeFee, rewardCalcMethod };

            console.log('Raw staking pool info data:', data.toString('hex')); // For debugging
            // Placeholder, replace with actual deserialization:
            return { apr: 15, minStake: 1, lockupDays: 0, unstakeFee: 0, rewardCalcMethod: "Daily" }; // Mock data
        }
        return null; // Pool account not found
    } catch (error) {
        console.error('Error fetching staking pool info:', error);
        return null;
    }
}


// --- NFT Section Logic ---

/**
 * Loads NFTs owned by the current user from the backend.
 * @param {string} walletAddress
 */
async function loadUserNFTs(walletAddress) {
    const userNftGallery = document.getElementById('nftGallery');
    if (!userNftGallery) return; // Ensure element exists

    userNftGallery.innerHTML = '<p>Loading your NFTs...</p>';
    if (walletAddress === 'disconnected') {
        userNftGallery.innerHTML = '<p>Connect your wallet to see your NFTs.</p>';
        return;
    }
    if (!walletAddress) {
        userNftGallery.innerHTML = '<p>Wallet address not available.</p>';
        return;
    }

    try {
        const response = await fetch(`http://localhost:3000/api/nfts/marketplace?owner=${walletAddress}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        const userNfts = data.nfts.filter(nft => nft.owner === walletAddress);

        userNftGallery.innerHTML = ''; // Clear previous NFTs
        if (nftToSellSelect) {
            nftToSellSelect.innerHTML = '<option value="">Select an NFT to sell</option>';
        }

        if (userNfts.length > 0) {
            userNfts.forEach(nft => {
                const nftCard = createNftCard(nft, walletAddress);
                userNftGallery.appendChild(nftCard);

                if (nftToSellSelect && !nft.isListed) { // Only allow listing unlisted NFTs
                    const option = document.createElement('option');
                    option.value = nft.mint;
                    option.textContent = nft.name;
                    nftToSellSelect.appendChild(option);
                }
            });
        } else {
            userNftGallery.innerHTML = '<p>You don\'t own any NFTs yet.</p>';
        }
    } catch (error) {
        console.error('Error loading user NFTs:', error);
        userNftGallery.innerHTML = '<p>Error loading NFTs. Please try again later.</p>';
        showNotification('Failed to load your NFTs.', 'error');
    }
}

/**
 * Loads NFTs listed on the marketplace from the backend.
 */
async function loadMarketplaceNFTs() {
    const marketplaceGallery = document.getElementById('marketplaceGallery');
    if (!marketplaceGallery) return; // Ensure element exists

    marketplaceGallery.innerHTML = '<p>Loading marketplace NFTs...</p>';

    try {
        const response = await fetch('http://localhost:3000/api/nfts/marketplace');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        const listedNfts = data.nfts.filter(nft => nft.isListed);

        marketplaceGallery.innerHTML = ''; // Clear previous NFTs

        if (listedNfts.length > 0) {
            listedNfts.forEach(nft => {
                const nftCard = createNftCard(nft, walletPublicKey ? walletPublicKey.toBase58() : null);
                marketplaceGallery.appendChild(nftCard);
            });
        } else {
            marketplaceGallery.innerHTML = '<p>No NFTs currently listed on the marketplace.</p>';
        }
    } catch (error) {
        console.error('Error loading marketplace NFTs:', error);
        marketplaceGallery.innerHTML = '<p>Error loading marketplace NFTs. Please try again later.</p>';
        showNotification('Failed to load marketplace NFTs.', 'error');
    }
}

/**
 * Creates an NFT card element.
 * @param {object} nft - The NFT object.
 * @param {string|null} currentUserWallet - The public key of the currently connected wallet.
 * @returns {HTMLElement} The created NFT card.
 */
function createNftCard(nft, currentUserWallet) {
    const card = document.createElement('div');
    card.className = 'nft-card';

    const img = document.createElement('img');
    img.src = nft.image || 'https://via.placeholder.com/180x180?text=NFT';
    img.alt = nft.name || 'NFT Image';
    card.appendChild(img);

    const name = document.createElement('h3');
    name.textContent = nft.name || 'Untitled NFT';
    card.appendChild(name);

    if (nft.isListed && nft.price) {
        const price = document.createElement('p');
        price.className = 'nft-price';
        price.textContent = `Price: ${nft.price} SOL`;
        card.appendChild(price);
    }

    const owner = document.createElement('p');
    owner.textContent = `Owner: ${nft.owner.substring(0, 6)}...${nft.owner.slice(-4)}`;
    card.appendChild(owner);

    card.addEventListener('click', () => showNftDetails(nft, currentUserWallet));
    return card;
}


const closeNftDetailsBtn = document.getElementById('closeNftDetailsBtn');

if (closeNftDetailsBtn) {
    closeNftDetailsBtn.addEventListener('click', () => {
        if (nftDetailsModal) nftDetailsModal.style.display = 'none';
    });
}
// Close modal if clicking outside
if (nftDetailsModal) {
    window.addEventListener('click', (event) => {
        if (event.target === nftDetailsModal) {
            nftDetailsModal.style.display = 'none';
        }
    });
}

/**
 * Displays a modal window with detailed NFT information.
 * Manages the visibility of action buttons based on NFT ownership.
 * @param {NftMetadata} nft - The NFT object with its metadata.
 * @param {string|null} currentUserWallet - The public key of the currently connected wallet in string format, or null if not connected.
 * @returns {Promise<void>}
 */
async function showNftDetails(nft, currentUserWallet) {
    if (!nftDetailsModal) {
        console.error("NFT details modal element not found!");
        return;
    }

    nftDetailImage.src = nft.image || 'https://via.placeholder.com/250x150?text=NFT';
    nftDetailName.textContent = nft.name || 'Untitled NFT';
    nftDetailDescription.textContent = nft.description || 'No description available.';
    nftDetailOwner.textContent = nft.owner || 'Unknown';
    nftDetailMint.textContent = nft.mint || 'N/A';
    nftDetailSolscanLink.href = `https://solscan.io/token/${nft.mint}?cluster=${network}`;

    if (attributesList) {
        attributesList.innerHTML = '';
        if (nft.attributes && Array.isArray(nft.attributes)) {
            nft.attributes.forEach(attr => {
                const li = document.createElement('li');
                li.textContent = `${attr.trait_type || attr.key}: ${attr.value}`;
                attributesList.appendChild(li);
            });
        } else {
            attributesList.innerHTML = '<li>No attributes.</li>';
        }
    }

    // Show/hide action buttons based on ownership and listing status
    if (nftDetailBuyBtn) nftDetailBuyBtn.style.display = 'none';
    if (nftDetailSellBtn) nftDetailSellBtn.style.display = 'none';
    if (nftDetailTransferBtn) nftDetailTransferBtn.style.display = 'none';

    if (currentUserWallet && nft.owner === currentUserWallet) {
        // If the user owns the NFT
        if (nftDetailTransferBtn) nftDetailTransferBtn.style.display = 'inline-block';
        if (!nft.isListed && nftDetailSellBtn) {
            nftDetailSellBtn.style.display = 'inline-block';
        }
    } else if (nft.isListed && nftDetailBuyBtn) {
        // If the NFT is listed by another user
        nftDetailBuyBtn.style.display = 'inline-block';
    }

    if (nftDetailHistory) {
        nftDetailHistory.textContent = 'Not implemented in this simulation.'; // Requires further development
    } else {
        console.warn('Element with ID "nftDetailHistory" not found!');
    }

    // Event handlers for buttons inside the modal
    if (nftDetailBuyBtn) {
        // "Buy" button
        nftDetailBuyBtn.onclick = async () => {
            if (!walletPublicKey) {
                showNotification('Connect your wallet to buy this NFT.', 'info');
                return;
            }
            showNotification(`Attempting to buy ${nft.name} for ${nft.price} SOL... Confirm in wallet.`, 'info', 5000);
            try {
                // Here will be the call to your marketplace smart contract for buying an NFT
                // This is a VERY simplified example. Real logic is more complex.
                // You will need to pass: NFT mint, seller account, price, your account.
                // The contract should transfer SOL from buyer to seller and NFT from seller to buyer.

                // Example instruction (pseudocode):
                /*
                const buyInstruction = new SolanaWeb3.TransactionInstruction({
                    keys: [
                        { pubkey: walletPublicKey, isSigner: true, isWritable: true }, // Buyer
                        { pubkey: new SolanaWeb3.PublicKey(nft.owner), isSigner: false, isWritable: true }, // Seller
                        { pubkey: new SolanaWeb3.PublicKey(nft.mint), isSigner: false, isWritable: true }, // NFT Mint
                        // Other accounts required by your contract (listing account, token accounts, etc.)
                    ],
                    programId: MARKETPLACE_PROGRAM_ID, // ID of your marketplace smart contract
                    data: Buffer.from(Uint8Array.of(0, ...new SolanaWeb3.BN(nft.price * SolanaWeb3.LAMPORTS_PER_SOL).toArrayLike(Buffer, 'le', 8))) // "buy" instruction and price
                });

                const transaction = new SolanaWeb3.Transaction().add(buyInstruction);
                transaction.feePayer = walletPublicKey;
                transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
                const signedTransaction = await provider.signTransaction(transaction);
                const signature = await connection.sendRawTransaction(signedTransaction.serialize());
                await connection.confirmTransaction(signature, 'confirmed');

                showNotification(`Successfully bought ${nft.name}! Tx: <a href="https://solscan.io/tx/${signature}?cluster=${network}" target="_blank">${signature.substring(0, 10)}...</a>`, 'success', 10000);
                await loadUserNFTs(walletPublicKey.toBase58());
                await loadMarketplaceNFTs();
                nftDetailsModal.style.display = 'none';
                */
                showNotification(`Simulating purchase of ${nft.name}. Requires real blockchain interaction.`, 'info');

            } catch (error) {
                console.error('Error buying NFT:', error);
                showNotification(`Failed to buy NFT: ${error.message}.`, 'error');
            }
        };
    }

    if (nftDetailSellBtn) {
        // "Sell" button
        nftDetailSellBtn.onclick = () => {
            if (nftToSellSelect) document.getElementById('nftToSell').value = nft.mint;
            if (nftDetailsModal) nftDetailsModal.style.display = 'none';
            const nftSection = document.getElementById('nft-section'); // Assuming an element with this ID exists to scroll to
            if (nftSection) nftSection.scrollIntoView({ behavior: 'smooth' });
        };
    }

    if (nftDetailTransferBtn) {
        // "Transfer" button
        nftDetailTransferBtn.onclick = async () => {
            if (!walletPublicKey) {
                showNotification('Connect your wallet to transfer this NFT.', 'info');
                return;
            }
            const recipientAddress = prompt('Enter recipient Solana address:');
            if (!recipientAddress) {
                showNotification('Transfer cancelled.', 'info');
                return;
            }
            try {
                const recipientPublicKey = new SolanaWeb3.PublicKey(recipientAddress);
                showNotification(`Attempting to transfer ${nft.name} to ${recipientAddress}... Confirm in wallet.`, 'info', 5000);

                // Get sender's and recipient's ATA
                const senderTokenAccount = await SolanaSPL.getAssociatedTokenAddress(
                    new SolanaWeb3.PublicKey(nft.mint),
                    walletPublicKey
                );
                const recipientTokenAccount = await SolanaSPL.getAssociatedTokenAddress(
                    new SolanaWeb3.PublicKey(nft.mint),
                    recipientPublicKey
                );

                const transaction = new SolanaWeb3.Transaction();

                // Check if recipient's ATA exists, if not, create it
                const recipientAtaInfo = await connection.getAccountInfo(recipientTokenAccount);
                if (!recipientAtaInfo) {
                    transaction.add(
                        SolanaSPL.createAssociatedTokenAccountInstruction(
                            walletPublicKey, // Payer (payer for ATA creation)
                            recipientTokenAccount,
                            recipientPublicKey,
                            new SolanaWeb3.PublicKey(nft.mint)
                        )
                    );
                }

                // Instruction to transfer the token (NFT)
                transaction.add(
                    SolanaSPL.createTransferInstruction(
                        senderTokenAccount,
                        recipientTokenAccount,
                        walletPublicKey, // Authority (owner of sender_token_account)
                        1 // NFT is always 1 token
                    )
                );

                transaction.feePayer = walletPublicKey;
                transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

                const signedTransaction = await provider.signTransaction(transaction);
                const signature = await connection.sendRawTransaction(signedTransaction.serialize());
                await connection.confirmTransaction(signature, 'confirmed');

                showNotification(`NFT ${nft.name} successfully transferred! Tx: <a href="https://solscan.io/tx/${signature}?cluster=${network}" target="_blank">${signature.substring(0, 10)}...</a>`, 'success', 10000);
                await loadUserNFTs(walletPublicKey.toBase58());
                await loadMarketplaceNFTs(); // May need update if your marketplace tracks owners
                nftDetailsModal.style.display = 'none';

            } catch (error) {
                console.error('Error transferring NFT:', error);
                showNotification(`Failed to transfer NFT: ${error.message}.`, 'error');
            }
        };
    }

    // Finally, make the modal visible
    nftDetailsModal.style.display = 'flex';
    console.log('NFT details modal displayed.');
}


// --- Mint NFT Form Submission ---
if (mintNftForm) {
    mintNftForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!walletPublicKey) {
            showNotification('Please connect your Solana wallet first to mint an NFT.', 'info');
            return;
        }
        if (!connection) {
            showNotification('Solana connection not established. Please try again.', 'error');
            return;
        }

        const formData = new FormData(mintNftForm);
        const name = formData.get('nftName'); // Make sure your input has name="nftName"
        const description = formData.get('nftDescription'); // name="nftDescription"
        const imageFile = formData.get('imageFile'); // name="imageFile"

        if (!name || !description || !imageFile) {
            showNotification('Please fill all NFT details and select an image.', 'warning');
            return;
        }

        showNotification('Preparing NFT for minting... Please confirm in your wallet.', 'info', 7000);

        try {
            // STEP 1: Upload image and metadata to backend (for uploading to IPFS/Arweave)
            // Ensure you have a 'creatorWallet' input or pass it from `walletPublicKey`
            formData.append('creatorWallet', walletPublicKey.toBase58());

            const uploadResponse = await fetch('http://localhost:3000/api/nfts/prepare-mint', {
                method: 'POST',
                body: formData, // FormData automatically sets Content-Type: multipart/form-data
            });

            if (!uploadResponse.ok) {
                const errorData = await uploadResponse.json();
                throw new Error(errorData.error || `HTTP error! status: ${uploadResponse.status}`);
            }

            const uploadResult = await uploadResponse.json();
            const { uri: metadataUri, mintAddress: simulatedMintAddress } = uploadResult;

            // STEP 2: CREATE INSTRUCTIONS FOR REAL NFT MINTING ON SOLANA
            // This is a VERY simplified example. In the real world, you'd use @metaplex-foundation/mpl-token-metadata
            // and/or Token Metadata Program.

            // 1. Create a new Mint account for the NFT
            const mint = SolanaWeb3.Keypair.generate();
            const lamportsForMint = await connection.getMinimumBalanceForRentExemption(SolanaSPL.MINT_SIZE);

            const createMintAccountInstruction = SolanaWeb3.SystemProgram.createAccount({
                fromPubkey: walletPublicKey,
                newAccountPubkey: mint.publicKey,
                space: SolanaSPL.MINT_SIZE,
                lamports: lamportsForMint,
                programId: SolanaSPL.TOKEN_PROGRAM_ID,
            });

            // 2. Initialize the Mint account
            const initializeMintInstruction = SolanaSPL.createInitializeMintInstruction(
                mint.publicKey,
                0, // NFTs always have 0 decimal places
                walletPublicKey, // Mint Authority
                walletPublicKey, // Freeze Authority (can be null)
                SolanaSPL.TOKEN_PROGRAM_ID
            );

            // 3. Create Associated Token Account (ATA) for the owner (user)
            const ownerTokenAccount = await SolanaSPL.getAssociatedTokenAddress(
                mint.publicKey,
                walletPublicKey
            );

            const createAssociatedTokenAccountInstruction = SolanaSPL.createAssociatedTokenAccountInstruction(
                walletPublicKey, // Payer
                ownerTokenAccount,
                walletPublicKey, // Owner
                mint.publicKey // Mint
            );

            // 4. Mint 1 token into the owner's ATA
            const mintToInstruction = SolanaSPL.createMintToCheckedInstruction(
                mint.publicKey,
                ownerTokenAccount,
                walletPublicKey, // Mint Authority
                1, // Amount (always 1 for NFT)
                0, // Decimals (always 0 for NFT)
                [], // Signers
                SolanaSPL.TOKEN_PROGRAM_ID
            );

            // 5. Create Metadata account (Metaplex Token Metadata)
            // This requires the @metaplex-foundation/mpl-token-metadata package
            // For simplicity, this is just a placeholder.
            // You will need to install `@metaplex-foundation/mpl-token-metadata` and import `createCreateMetadataAccountV3Instruction`
            const METAPLEX_PROGRAM_ID = new SolanaWeb3.PublicKey("metaqbxxUerdq28cj1RbTGWuhtQgypSZKdAVbZfkddws");
            const [metadataPda] = SolanaWeb3.PublicKey.findProgramAddressSync(
                [
                    Buffer.from("metadata"),
                    METAPLEX_PROGRAM_ID.toBuffer(),
                    mint.publicKey.toBuffer(),
                ],
                METAPLEX_PROGRAM_ID
            );

            // Example instruction for creating metadata (requires actual implementation from Metaplex)
            // const createMetadataInstruction = Metaplex.createCreateMetadataAccountV3Instruction(
            //     {
            //         metadata: metadataPda,
            //         mint: mint.publicKey,
            //         mintAuthority: walletPublicKey,
            //         payer: walletPublicKey,
            //         updateAuthority: walletPublicKey, // Can be different
            //     },
            //     {
            //         createMetadataAccountArgsV3: {
            //             data: {
            //                 name: name,
            //                 symbol: "AFOXNFT", // Your symbol
            //                 uri: metadataUri,
            //                 sellerFeeBasisBasisPoints: 500, // 5% royalty
            //                 creators: [{ address: walletPublicKey, share: 100, verified: true }],
            //                 collection: null,
            //                 uses: null,
            //             },
            //             isMutable: true,
            //             collectionDetails: null,
            //         }
            //     }
            // );

            const transaction = new SolanaWeb3.Transaction();
            transaction.add(
                createMintAccountInstruction,
                initializeMintInstruction,
                createAssociatedTokenAccountInstruction,
                mintToInstruction,
                // Add createMetadataInstruction here if you are using Metaplex
            );

            transaction.feePayer = walletPublicKey;
            transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

            // Sign the transaction
            const signedTransaction = await provider.signTransaction(transaction);
            // Sign the transaction with the mint keypair, as it is the mint authority
            signedTransaction.partialSign(mint);

            const signature = await connection.sendRawTransaction(signedTransaction.serialize());
            await connection.confirmTransaction(signature, 'confirmed');

            console.log('NFT mint transaction signature:', signature);
            showNotification(`NFT minted successfully! Mint Address: <a href="https://solscan.io/token/${mint.publicKey.toBase58()}?cluster=${network}" target="_blank">${mint.publicKey.toBase58().substring(0, 10)}...</a>`, 'success', 10000);

            mintNftForm.reset();
            await loadUserNFTs(walletPublicKey.toBase58());
            await loadMarketplaceNFTs();

        } catch (error) {
            console.error('Error minting NFT:', error);
            showNotification(`Failed to mint NFT: ${error.message}`, 'error');
        }
    });
}

// --- List NFT Form Submission ---
if (listNftForm) {
    listNftForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!walletPublicKey) {
            showNotification('Please connect your Solana wallet first to list an NFT.', 'info');
            return;
        }
        if (!connection) {
            showNotification('Solana connection not established. Please try again.', 'error');
            return;
        }

        const mintAddressStr = document.getElementById('nftToSell').value;
        const salePrice = parseFloat(document.getElementById('salePrice').value);
        const listingDuration = parseInt(document.getElementById('listingDuration').value, 10); // In days

        if (!mintAddressStr || isNaN(salePrice) || salePrice <= 0 || isNaN(listingDuration) || listingDuration <= 0) {
            showNotification('Please select an NFT and enter a valid price and duration.', 'warning');
            return;
        }

        const mintAddress = new SolanaWeb3.PublicKey(mintAddressStr);

        showNotification(`Listing NFT ${mintAddressStr.substring(0, 10)}... for ${salePrice} SOL. Confirm in wallet.`, 'info', 5000);

        try {
            // PREPARE INSTRUCTIONS FOR YOUR MARKETPLACE SMART CONTRACT
            // This is PSEUDO-CODE. The real logic depends on your program.

            // 1. Get user's ATA for the NFT
            const userNftTokenAccount = await SolanaSPL.getAssociatedTokenAddress(
                mintAddress,
                walletPublicKey
            );

            // 2. Get marketplace's ATA for the NFT (where the NFT will be transferred upon listing)
            // This could be a PDA if NFTs are stored on the marketplace program
            const [marketplaceEscrowAccountPDA, escrowBump] = SolanaWeb3.PublicKey.findProgramAddressSync(
                [
                    mintAddress.toBuffer(),
                    walletPublicKey.toBuffer(), // If the listing is tied to a specific seller
                    Buffer.from("listing") // Label for the listing account
                ],
                MARKETPLACE_PROGRAM_ID
            );

            // Create instruction for listing the NFT
            // This instruction typically transfers the NFT from the user to the marketplace contract
            // and creates a "listing" account that stores sale information (price, seller).
            const listInstruction = new SolanaWeb3.TransactionInstruction({
                keys: [
                    { pubkey: walletPublicKey, isSigner: true, isWritable: true }, // Seller
                    { pubkey: userNftTokenAccount, isSigner: false, isWritable: true }, // Seller's ATA (where NFT comes from)
                    { pubkey: marketplaceEscrowAccountPDA, isSigner: false, isWritable: true }, // Escrow account for NFT on the marketplace
                    { pubkey: mintAddress, isSigner: false, isWritable: false }, // NFT Mint
                    { pubkey: SolanaSPL.TOKEN_PROGRAM_ID, isSigner: false, isWritable: false }, // SPL Token Program
                    { pubkey: SolanaWeb3.SystemProgram.programId, isSigner: false, isWritable: false }, // System Program for account creation
                    { pubkey: SolanaWeb3.SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false }, // Rent sysvar
                ],
                programId: MARKETPLACE_PROGRAM_ID,
                data: Buffer.alloc(8) // Placeholder for instruction data
            });
            // Serialize amount and duration into data buffer
            listInstruction.data = Buffer.concat([
                Buffer.from(Uint8Array.of(0)), // Example discriminator (0 for "list" instruction)
                new SolanaWeb3.BN(salePrice * SolanaWeb3.LAMPORTS_PER_SOL).toArrayLike(Buffer, 'le', 8), // Price in lamports (u64)
                new SolanaWeb3.BN(listingDuration).toArrayLike(Buffer, 'le', 4) // Duration (e.g., in days, u32)
            ]);


            const transaction = new SolanaWeb3.Transaction().add(listInstruction);
            transaction.feePayer = walletPublicKey;
            transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

            const signedTransaction = await provider.signTransaction(transaction);
            const signature = await connection.sendRawTransaction(signedTransaction.serialize());
            await connection.confirmTransaction(signature, 'confirmed');

            console.log('NFT listing transaction signature:', signature);
            showNotification(`NFT ${mintAddressStr.substring(0, 10)}... listed for ${salePrice} SOL. Tx: <a href="https://solscan.io/tx/${signature}?cluster=${network}" target="_blank">${signature.substring(0, 10)}...</a>`, 'success', 10000);

            listNftForm.reset();
            await loadUserNFTs(walletPublicKey.toBase58()); // NFTs should disappear from user's list
            await loadMarketplaceNFTs(); // NFTs should appear on the marketplace
        } catch (error) {
            console.error('Error listing NFT:', error);
            showNotification(`Failed to list NFT: ${error.message}`, 'error');
        }
    });
}

// Initial loads when the DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    initializeSolanaConnection();
    await loadMarketplaceNFTs();
    await updateStakingUI(); // Initial update of staking UI
    // loadUserNFTs will be called on wallet connect
});
// =========================================================================
// script.js (Frontend Code - to be placed in your public/script.js file)
// =========================================================================

// Assumes you have already linked the @solana/web3.js, @solana/wallet-adapter-phantom, and @solana/spl-token libraries
// in your HTML, e.g.:
// <script src="https://unpkg.com/@solana/web3.js@latest/lib/index.iife.js"></script>
// <script src="https://unpkg.com/@solana/wallet-adapter-base@latest/lib/index.iife.js"></script>
// <script src="https://unpkg.com/@solana/wallet-adapter-phantom@latest/lib/index.iife.js"></script>
// <script src="https://unpkg.com/@solana/spl-token@latest/lib/index.iife.js"></script>

// --- DOM Element References ---
const connectWalletBtnWeb3 = document.getElementById('connectWalletBtnWeb3');
const walletAddressDisplayWeb3 = document.getElementById('walletAddressDisplayWeb3');
const connectWalletNftBtn = document.getElementById('connectWalletNftBtn');
const walletAddressDisplayNft = document.getElementById('walletAddressDisplayNft');
const walletAddressDisplayDao = document.getElementById('walletAddressDisplayDao'); // Added for DAO/Staking section

// NFT Section
const userNftList = document.getElementById('user-nft-list'); // Corrected ID based on common practice
const nftToSellSelect = document.getElementById('nftToSell');
const listNftForm = document.getElementById('listNftForm');
const mintNftForm = document.getElementById('mintNftForm');
const marketplaceNftList = document.getElementById('marketplace-nft-list'); // For displaying marketplace NFTs

// Announcements Section
const announcementsList = document.getElementById('announcementsList');
const announcementInput = document.getElementById('announcementInput'); // Ensure your HTML uses this ID
const publishButton = document.getElementById('publishButton'); // Ensure your HTML uses this ID

// Multimedia Section (Photos & Posts)
const photoUploadForm = document.getElementById('photoUploadForm'); // Assuming ID for the form
const photoGallery = document.getElementById('photo-gallery'); // Assuming ID for the gallery container
const postForm = document.getElementById('postForm'); // Assuming ID for the post form
const postsList = document.getElementById('posts-list'); // Assuming ID for the posts container

// Games & Ads Section
const gameList = document.getElementById('game-list');
const uploadGameBtnWeb3 = document.getElementById('uploadGameBtnWeb3');
const adList = document.getElementById('ad-list');
const postAdBtnWeb3 = document.getElementById('postAdBtnWeb3');

// NFT Details Modal
const nftDetailsModal = document.getElementById('nftDetailsModal');
const closeButton = nftDetailsModal ? nftDetailsModal.querySelector('.close-button') : null;
const nftDetailImage = document.getElementById('nftDetailImage');
const nftDetailName = document.getElementById('nftDetailName');
const nftDetailDescription = document.getElementById('nftDetailDescription');
const nftDetailOwner = document.getElementById('nftDetailOwner');
const nftDetailMint = document.getElementById('nftDetailMint');
const attributesList = document.getElementById('attributesList');
const nftDetailSolscanLink = document.getElementById('nftDetailSolscanLink');
const nftDetailBuyBtn = document.getElementById('nftDetailBuyBtn');
const nftDetailSellBtn = document.getElementById('nftDetailSellBtn');
const nftDetailTransferBtn = document.getElementById('nftDetailTransferBtn');
const nftDetailHistory = document.getElementById('nftDetailHistory');

// Copy Button
const copyBtn = document.querySelector('.copy-btn');

// Staking Section Elements
const userAfoxBalance = document.getElementById('userAfoxBalance');
const userStakedAmount = document.getElementById('userStakedAmount');
const userRewardsAmount = document.getElementById('userRewardsAmount');
const stakingApr = document.getElementById('stakingApr');
const stakeAmountInput = document.getElementById('stakeAmountInput');
const stakeAfoxBtn = document.getElementById('stakeAfoxBtn');
const claimRewardsBtn = document.getElementById('claimRewardsBtn');
const unstakeAfoxBtn = document.getElementById('unstakeAfoxBtn');
const minStakeAmountDisplay = document.getElementById('minStakeAmount');
const lockupPeriodDisplay = document.getElementById('lockupPeriod');
const unstakeFeeDisplay = document.getElementById('unstakeFee');
const rewardCalculationDisplay = document.getElementById('rewardCalculation');


// --- Global Variables for Wallet Connection ---
let walletPublicKey = null; // Stores the public key of the connected wallet
let provider = null; // For accessing the Phantom/Solflare window (the wallet adapter instance)
let connection = null; // Solana connection object
let providerListenersInitialized = false; // New flag for provider listeners

// --- Wallet Setup ---
const network = SolanaWeb3.WalletAdapterNetwork.Devnet; // Change to 'Mainnet-beta' for production
const wallets = [
    new SolanaWalletAdapterPhantom.PhantomWalletAdapter(),
    // Add other wallets here if desired, e.g.:
    // new SolanaWalletAdapterWallets.SolflareWalletAdapter({ network }),
];

// Example Addresses (REPLACE WITH YOUR PROJECT'S ACTUAL ADDRESSES)
// IMPORTANT: These are placeholders. You MUST replace them with your actual Solana program IDs and token mint addresses.
const AFOX_TOKEN_MINT_ADDRESS_GLOBAL = new SolanaWeb3.PublicKey('YourAFOXTokenMintAddressHere'); // <-- YOUR AFOX TOKEN MINT ADDRESS
const STAKING_PROGRAM_ID_GLOBAL = new SolanaWeb3.PublicKey('YourStakingProgramIdHere'); // <-- YOUR STAKING SMART CONTRACT (PROGRAM) ID
const AFOX_TOKEN_DECIMALS_GLOBAL = 9; // <-- REPLACE THIS WITH THE ACTUAL DECIMAL PLACES OF YOUR AFOX TOKEN!
// Replace with the address of your real staking vault (or a PDA for your staking program)
const DUMMY_STAKING_VAULT_ADDRESS = new SolanaWeb3.PublicKey('SomeDummyStakingVaultAddressHere');

/**
 * @typedef {object} NftMetadata
 * @property {string} name - Name of the NFT.
 * @property {string} description - Description of the NFT.
 * @property {string} image - URL of the NFT image.
 * @property {string} mint - Mint address of the NFT.
 * @property {string} owner - Address of the current NFT owner.
 * @property {number} [price] - Price of the NFT if it's listed for sale.
 * @property {boolean} [isListed] - Flag indicating if the NFT is listed for sale.
 * @property {Array<Object>} [attributes] - Array of NFT attributes.
 */

// =========================================================================
// --- NFT Details Modal Functions (Consolidated Block) ---
// =========================================================================

// Added console.log for debugging (these will run when script.js loads)
console.log('nftDetailsModal:', nftDetailsModal);
console.log('closeButton:', closeButton);
console.log('nftDetailHistory (initial check):', nftDetailHistory);

// Check if closeButton exists before attaching the event listener
if (closeButton) {
    // FIXED: Using addEventListener instead of onclick
    closeButton.addEventListener('click', function() {
        // Ensure nftDetailsModal exists before trying to hide it
        if (nftDetailsModal) {
            nftDetailsModal.style.display = 'none';
            console.log('Modal closed via close button.'); // For debugging
        }
    });
}

// Handler to close the modal when clicking outside of its content (on the modal overlay itself)
// FIXED: Using addEventListener instead of onclick on window
window.addEventListener('click', function(event) {
    if (event.target == nftDetailsModal) {
        nftDetailsModal.style.display = 'none';
        console.log('Modal closed via outside click.'); // For debugging
    }
});

// Add an event listener for the Escape key to close the modal
document.addEventListener('keydown', (event) => {
    // Check if the Escape key is pressed and the modal is currently visible (using 'flex' as you use it for display)
    if (event.key === 'Escape' && nftDetailsModal && nftDetailsModal.style.display === 'flex') {
        nftDetailsModal.style.display = 'none';
        console.log('Modal closed via Escape key.');
    }
});


/**
 * Displays a modal window with detailed NFT information.
 * Manages the visibility of action buttons based on NFT ownership.
 * @param {NftMetadata} nft - The NFT object with its metadata.
 * @param {string|null} currentUserWallet - The public key of the currently connected wallet in string format, or null if not connected.
 * @returns {Promise<void>}
 */
async function showNftDetails(nft, currentUserWallet) {
    // Return early if the modal element cannot be found in the DOM
    if (!nftDetailsModal) {
        console.error("NFT details modal element not found!");
        return;
    }

    nftDetailImage.src = nft.image || 'https://via.placeholder.com/250x150?text=NFT';
    nftDetailName.textContent = nft.name || 'Untitled NFT';
    nftDetailDescription.textContent = nft.description || 'No description available.';
    nftDetailOwner.textContent = nft.owner || 'Unknown';
    nftDetailMint.textContent = nft.mint || 'N/A';
    nftDetailSolscanLink.href = `https://solscan.io/token/${nft.mint}?cluster=${network}`;

    if (attributesList) {
        attributesList.innerHTML = '';
        if (nft.attributes && Array.isArray(nft.attributes)) {
            nft.attributes.forEach(attr => {
                const li = document.createElement('li');
                li.textContent = `${attr.trait_type || attr.key}: ${attr.value}`;
                attributesList.appendChild(li);
            });
        } else {
            attributesList.innerHTML = '<li>No attributes.</li>';
        }
    }

    // Show/hide action buttons based on ownership and listing status
    if (nftDetailBuyBtn) nftDetailBuyBtn.style.display = 'none';
    if (nftDetailSellBtn) nftDetailSellBtn.style.display = 'none';
    if (nftDetailTransferBtn) nftDetailTransferBtn.style.display = 'none';

    if (currentUserWallet && nft.owner === currentUserWallet) {
        if (nftDetailTransferBtn) nftDetailTransferBtn.style.display = 'inline-block';
        if (!nft.isListed && nftDetailSellBtn) { // If it's not currently listed for sale
            nftDetailSellBtn.style.display = 'inline-block';
        }
    } else if (nft.isListed && nftDetailBuyBtn) { // It's listed for sale by someone else
        nftDetailBuyBtn.style.display = 'inline-block';
    }

    if (nftDetailHistory) {
        nftDetailHistory.textContent = 'Not implemented in this simulation.';
        console.log('nftDetailHistory text updated to:', nftDetailHistory.textContent); // For debugging
    } else {
        console.warn('Element with ID "nftDetailHistory" not found!');
    }


    // Attach event listeners for actions (these onclick handlers can remain, as they are specific to elements inside the modal and won't overwrite general close handlers)
    if (nftDetailBuyBtn) nftDetailBuyBtn.onclick = () => showNotification(`Simulating purchase of ${nft.name} for ${nft.price} SOL. (Requires real blockchain interaction)`, 'info');
    if (nftDetailSellBtn) {
        nftDetailSellBtn.onclick = () => {
            if (nftToSellSelect) document.getElementById('nftToSell').value = nft.mint;
            if (nftDetailsModal) nftDetailsModal.style.display = 'none';
            // Smooth scroll to the NFT section
            const nftSection = document.getElementById('nft-section');
            if (nftSection) nftSection.scrollIntoView({ behavior: 'smooth' });
        };
    }
    if (nftDetailTransferBtn) nftDetailTransferBtn.onclick = () => showNotification(`Simulating transfer of ${nft.name}. (Requires real blockchain interaction)`, 'info');

    // Finally, make the modal visible
    nftDetailsModal.style.display = 'flex'; // Ensure your CSS for .modal uses display: flex; to show it
    console.log('NFT details modal displayed.'); // For debugging
}

// =========================================================================
// --- End NFT Details Modal Functions ---
// =========================================================================

/**
 * Function to display popup notifications.
 * @param {string} message - The message to display.
 * @param {'info'|'success'|'error'|'warning'} [type='info'] - The type of notification (for styling).
 * @param {number} [duration=3000] - The duration in milliseconds the notification will be displayed.
 */
function showNotification(message, type = 'info', duration = 3000) {
    const container = document.getElementById('notificationContainer');
    if (!container) {
        console.warn('Notification container not found, falling back to alert:', message);
        alert(message); // Fallback to alert if container is not found
        return;
    }

    const notification = document.createElement('div');
    notification.className = `notification ${type}`; // Add CSS classes for styling
    notification.innerHTML = message; // Use innerHTML to allow for links
    container.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, duration);
}


/**
 * Sets up event listeners for the wallet provider (publicKeyChange, disconnect).
 * Called once after a successful connection or auto-connection.
 */
function setupProviderListeners() {
    if (provider && !providerListenersInitialized) {
        provider.on('publicKey', (publicKey) => {
            if (publicKey) {
                console.log('Account changed to:', publicKey.toBase58());
                walletPublicKey = publicKey;
                if (walletAddressDisplayWeb3) walletAddressDisplayWeb3.textContent = walletPublicKey.toBase58();
                if (walletAddressDisplayNft) walletAddressDisplayNft.textContent = walletPublicKey.toBase58();
                if (walletAddressDisplayDao) walletAddressDisplayDao.textContent = walletPublicKey.toBase58();
                loadUserNFTs(walletPublicKey.toBase58()); // Reload NFTs for new account
                updateStakingUI(); // Reload staking data for new account
            } else {
                // This event fires if the wallet is locked or disconnected by the user
                console.log('Wallet account removed or locked.');
                handleWalletDisconnect();
            }
        });
        provider.on('disconnect', () => {
            console.log('Wallet explicitly disconnected by user.');
            handleWalletDisconnect();
        });
        providerListenersInitialized = true; // Set the flag to prevent adding duplicates
        console.log('Provider listeners set up.');
    }
}


/**
 * Connects the user's Solana wallet (Phantom).
 * Updates the wallet address display and loads user data.
 * @returns {Promise<void>}
 */
async function connectWallet() {
    try {
        const selectedWallet = wallets[0]; // For simplicity, always pick Phantom
        if (!selectedWallet) {
            showNotification('No wallet adapter found. Please ensure Phantom is installed and enabled.', 'error');
            return;
        }

        // If not connected, request connection
        if (!selectedWallet.connected) {
            await selectedWallet.connect();
        }

        walletPublicKey = selectedWallet.publicKey;
        provider = selectedWallet;
        console.log('Wallet connected:', walletPublicKey.toBase58());
        showNotification('Wallet connected successfully!', 'success');


        // Update display elements
        if (walletAddressDisplayWeb3) walletAddressDisplayWeb3.textContent = walletPublicKey.toBase58();
        if (walletAddressDisplayNft) walletAddressDisplayNft.textContent = walletPublicKey.toBase58();
        if (walletAddressDisplayDao) walletAddressDisplayDao.textContent = walletPublicKey.toBase58(); // Update for DAO/Staking

        // Initialize Solana Connection
        initializeSolanaConnection(); // Ensure connection is initialized

        // Set up listeners only after the first successful connection
        setupProviderListeners();

        // Load user-specific data after wallet connection
        await loadUserNFTs(walletPublicKey.toBase58());
        await updateStakingUI(); // Load staking data


    } catch (error) {
        console.error('Failed to connect wallet:', error);
        showNotification(`Failed to connect wallet: ${error.message || error}`, 'error');
        handleWalletDisconnect();
    }
}

function handleWalletDisconnect() {
    walletPublicKey = null;
    provider = null;
    connection = null;
    providerListenersInitialized = false; // Reset flag on disconnect
    if (walletAddressDisplayWeb3) walletAddressDisplayWeb3.textContent = 'Not Connected';
    if (walletAddressDisplayNft) walletAddressDisplayNft.textContent = 'Not Connected';
    if (walletAddressDisplayDao) walletAddressDisplayDao.textContent = 'Not Connected';
    if (userNftList) userNftList.innerHTML = '<p class="placeholder-item web3-placeholder">Connect your wallet to see your NFTs.</p>';
    if (nftToSellSelect) nftToSellSelect.innerHTML = '<option value="">-- Please select an NFT --</option>';
    updateStakingUI(); // Reset staking UI on disconnect
    showNotification('Wallet disconnected.', 'info');
}

// --- NFT Display Functions ---

async function loadUserNFTs(walletAddress) {
    if (!userNftList) return; // Ensure element exists

    userNftList.innerHTML = '<p class="placeholder-item web3-placeholder">Loading your NFTs...</p>';
    if (nftToSellSelect) nftToSellSelect.innerHTML = '<option value="">-- Please select an NFT --</option>';

    try {
        const response = await fetch('http://localhost:3000/api/nfts/marketplace'); // Fetch all known NFTs from backend
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        // Filter for NFTs specifically owned by the connected wallet and not listed for sale
        const userOwnedNfts = data.nfts.filter(nft => nft.owner === walletAddress && !nft.isListed);

        userNftList.innerHTML = '';
        if (userOwnedNfts.length === 0) {
            userNftList.innerHTML = '<p class="placeholder-item web3-placeholder">No NFTs found in your wallet.</p>';
            return;
        }

        userOwnedNfts.forEach(nft => {
            const nftItem = document.createElement('div');
            nftItem.className = 'nft-item';
            nftItem.innerHTML = `
                <img src="${nft.image || 'https://via.placeholder.com/180x180?text=NFT'}" alt="${nft.name}">
                <h4>${nft.name}</h4>
                <p>${nft.description || 'No description'}</p>
                <p>Mint: <span style="font-size:0.8em; word-break:break-all;">${nft.mint.substring(0, 10)}...</span></p>
            `;
            nftItem.addEventListener('click', () => showNftDetails(nft, walletAddress));
            userNftList.appendChild(nftItem);

            // Add to sell dropdown
            if (nftToSellSelect) {
                const option = document.createElement('option');
                option.value = nft.mint;
                option.textContent = nft.name;
                nftToSellSelect.appendChild(option);
            }
        });

    } catch (error) {
        console.error('Error loading user NFTs:', error);
        userNftList.innerHTML = `<p class="placeholder-item web3-placeholder">Error loading NFTs: ${error.message}.</p>`;
        showNotification(`Error loading your NFTs: ${error.message}`, 'error');
    }
}

async function loadMarketplaceNFTs() {
    if (!marketplaceNftList) return; // Ensure element exists

    marketplaceNftList.innerHTML = '<p class="placeholder-item web3-placeholder">Loading NFTs from marketplace...</p>';

    try {
        const response = await fetch('http://localhost:3000/api/nfts/marketplace');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        // Filter for NFTs that are listed for sale (have a price)
        const listedNfts = data.nfts.filter(nft => nft.price && nft.isListed);

        marketplaceNftList.innerHTML = '';
        if (listedNfts.length === 0) {
            marketplaceNftList.innerHTML = '<p class="placeholder-item web3-placeholder">No NFTs currently listed on the marketplace.</p>';
            return;
        }

        listedNfts.forEach(nft => {
            const nftItem = document.createElement('div');
            nftItem.className = 'nft-item';
            nftItem.innerHTML = `
                <img src="${nft.image || 'https://via.placeholder.com/180x180?text=NFT'}" alt="${nft.name}">
                <h4>${nft.name}</h4>
                <p>${nft.description || 'No description'}</p>
                <p>Price: <strong>${nft.price} SOL</strong></p>
                <p>Mint: <span style="font-size:0.8em; word-break:break-all;">${nft.mint.substring(0, 10)}...</span></p>
            `;
            nftItem.addEventListener('click', () => showNftDetails(nft, walletPublicKey ? walletPublicKey.toBase58() : null));
            marketplaceNftList.appendChild(nftItem);
        });

    } catch (error) {
        console.error('Error loading marketplace NFTs:', error);
        marketplaceNftList.innerHTML = `<p class="placeholder-item web3-placeholder">Error loading marketplace NFTs: ${error.message}.</p>`;
        showNotification(`Error loading marketplace NFTs: ${error.message}`, 'error');
    }
}

// --- Event Listeners for Wallet Connect Buttons ---
if (connectWalletBtnWeb3) connectWalletBtnWeb3.addEventListener('click', connectWallet);
if (connectWalletNftBtn) connectWalletNftBtn.addEventListener('click', connectWallet);

// --- Mint NFT Form Submission ---
if (mintNftForm) {
    mintNftForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!walletPublicKey) {
            showNotification('Please connect your Solana wallet first to mint an NFT.', 'info');
            return;
        }

        const formData = new FormData(mintNftForm);
        formData.append('creatorWallet', walletPublicKey.toBase58()); // Add connected wallet as creator

        try {
            const response = await fetch('http://localhost:3000/api/nfts/prepare-mint', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            showNotification(`NFT minted successfully (simulated)! Mint Address: ${result.mintAddress}`, 'success');
            mintNftForm.reset(); // Clear the form
            await loadUserNFTs(walletPublicKey.toBase58()); // Reload user's NFTs
            await loadMarketplaceNFTs(); // Also refresh marketplace
        } catch (error) {
            console.error('Error minting NFT:', error);
            showNotification(`Failed to mint NFT: ${error.message}`, 'error');
        }
    });
}

// --- List NFT Form Submission ---
if (listNftForm) {
    listNftForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!walletPublicKey) {
            showNotification('Please connect your Solana wallet first to list an NFT.', 'info');
            return;
        }

        const mintAddress = document.getElementById('nftToSell').value;
        const salePrice = parseFloat(document.getElementById('salePrice').value);
        const listingDuration = parseInt(document.getElementById('listingDuration').value, 10);

        if (!mintAddress || isNaN(salePrice) || salePrice <= 0 || isNaN(listingDuration) || listingDuration <= 0) {
            showNotification('Please select an NFT and enter a valid price and duration.', 'warning');
            return;
        }

        try {
            const response = await fetch('http://localhost:3000/api/nfts/list', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    mintAddress: mintAddress,
                    price: salePrice,
                    duration: listingDuration,
                    sellerWallet: walletPublicKey.toBase58(),
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            showNotification(result.message, 'success');
            listNftForm.reset(); // Clear the form
            await loadUserNFTs(walletPublicKey.toBase58()); // Reload user's NFTs (it should now be "listed")
            await loadMarketplaceNFTs(); // Refresh marketplace listings
        } catch (error) {
            console.error('Error listing NFT:', error);
            showNotification(`Failed to list NFT: ${error.message}`, 'error');
        }
    });
}

// --- Dynamic Content Loading (Announcements, Games, Ads, Photos, Posts) ---

// Announcements
async function loadAnnouncements() {
    if (!announcementsList) return;

    try {
        const response = await fetch('http://localhost:3000/api/announcements');
        const data = await response.json();
        announcementsList.innerHTML = '';
        if (data.length === 0) {
            announcementsList.innerHTML = '<p class="placeholder-item">No announcements yet.</p>';
            return;
        }
        data.reverse().forEach(announcement => {
            const div = document.createElement('div');
            div.className = 'announcement-item';
            div.innerHTML = `
                <p>${announcement.text}</p>
                <p class="announcement-date">${new Date(announcement.date).toLocaleString()}</p>
            `;
            announcementsList.appendChild(div);
        });
    } catch (error) {
        console.error('Error loading announcements:', error);
        announcementsList.innerHTML = '<p class="placeholder-item">Failed to load announcements.</p>';
        showNotification('Failed to load announcements.', 'error');
    }
}

if (publishButton && announcementInput) {
    publishButton.addEventListener('click', async () => {
        const text = announcementInput.value.trim();
        if (text) {
            try {
                const response = await fetch('http://localhost:3000/api/announcements', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text: text, date: new Date().toISOString() })
                });
                if (response.ok) {
                    announcementInput.value = '';
                    await loadAnnouncements();
                    showNotification('Announcement published!', 'success');
                } else {
                    showNotification('Failed to publish announcement. (Admin only in real app)', 'error');
                }
            } catch (error) {
                console.error('Error publishing announcement:', error);
                showNotification('Error connecting to server to publish announcement.', 'error');
            }
        } else {
            showNotification('Please enter an announcement.', 'warning');
        }
    });
}

// Games
async function loadGames() {
    if (!gameList) return;
    try {
        const response = await fetch('http://localhost:3000/api/games');
        const data = await response.json();
        gameList.innerHTML = '';
        if (data.length === 0) {
            gameList.innerHTML = '<p class="placeholder-item web3-placeholder">No games uploaded yet.</p>';
            return;
        }
        data.forEach(game => {
            const div = document.createElement('div');
            div.className = 'placeholder-item web3-placeholder';
            div.innerHTML = `
                <h3>${game.title}</h3>
                <p>${game.description}</p>
                ${game.url ? `<a href="${game.url}" target="_blank" class="web3-btn small-btn">Play Game</a>` : ''}
            `;
            gameList.appendChild(div);
        });
    } catch (error) {
        console.error('Error loading games:', error);
        gameList.innerHTML = '<p class="placeholder-item web3-placeholder">Failed to load games.</p>';
        showNotification('Failed to load games.', 'error');
    }
}

if (uploadGameBtnWeb3) {
    uploadGameBtnWeb3.addEventListener('click', () => {
        showNotification('Game upload functionality requires a form and backend integration to handle files.', 'info');
    });
}

// Ads
async function loadAds() {
    if (!adList) return;
    try {
        const response = await fetch('http://localhost:3000/api/ads');
        const data = await response.json();
        adList.innerHTML = '';
        if (data.length === 0) {
            adList.innerHTML = '<p class="placeholder-item ad web3-placeholder">No ads posted yet.</p>';
            return;
        }
        data.forEach(ad => {
            const div = document.createElement('div');
            div.className = 'placeholder-item ad web3-placeholder';
            div.innerHTML = `
                <h3>${ad.title}</h3>
                <p>${ad.content}</p>
                ${ad.imageUrl ? `<img src="${ad.imageUrl}" alt="Ad Creative" style="max-width:100%; height:auto; margin-top:10px; border-radius:5px;">` : ''}
                ${ad.link ? `<a href="${ad.link}" target="_blank" class="web3-btn small-btn" style="margin-top:10px;">Learn More</a>` : ''}
            `;
            adList.appendChild(div);
        });
    } catch (error) {
        console.error('Error loading ads:', error);
        adList.innerHTML = '<p class="placeholder-item ad web3-placeholder">Failed to load ads.</p>';
        showNotification('Failed to load ads.', 'error');
    }
}

if (postAdBtnWeb3) {
    postAdBtnWeb3.addEventListener('click', () => {
        showNotification('Ad posting functionality requires a form and backend integration to handle details and creative files.', 'info');
    });
}

// Photos
async function loadPhotos() {
    if (!photoGallery) return;
    try {
        const response = await fetch('http://localhost:3000/api/photos');
        const data = await response.json();
        photoGallery.innerHTML = '';
        if (data.length === 0) {
            photoGallery.innerHTML = '<p class="placeholder-item multimedia-item">No photos uploaded yet.</p>';
            return;
        }
        data.reverse().forEach(photo => {
            const div = document.createElement('div');
            div.className = 'item multimedia-item';
            div.innerHTML = `
                <img src="${photo.imageUrl}" alt="${photo.title}">
                <h3>${photo.title}</h3>
                <p>${photo.description || ''}</p>
                <small>Uploaded: ${new Date(photo.date).toLocaleDateString()}</small>
            `;
            photoGallery.appendChild(div);
        });
    } catch (error) {
        console.error('Error loading photos:', error);
        photoGallery.innerHTML = '<p class="placeholder-item multimedia-item">Failed to load photos.</p>';
        showNotification('Failed to load photos.', 'error');
    }
}

if (photoUploadForm) {
    photoUploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(photoUploadForm);
        if (walletPublicKey) {
            formData.append('creatorWallet', walletPublicKey.toBase58());
        }

        try {
            const response = await fetch('http://localhost:3000/api/photos/upload', {
                method: 'POST',
                body: formData,
            });
            if (response.ok) {
                showNotification('Photo uploaded successfully!', 'success');
                photoUploadForm.reset();
                await loadPhotos();
            } else {
                const errorData = await response.json();
                showNotification(`Failed to upload photo: ${errorData.error || response.statusText}`, 'error');
            }
        } catch (error) {
            console.error('Error uploading photo:', error);
            showNotification('Error connecting to server to upload photo.', 'error');
        }
    });
}

// Posts
async function loadPosts() {
    if (!postsList) return;
    try {
        const response = await fetch('http://localhost:3000/api/posts');
        const data = await response.json();
        postsList.innerHTML = '';
        if (data.length === 0) {
            postsList.innerHTML = '<p class="placeholder-item multimedia-item">No posts yet.</p>';
            return;
        }
        data.reverse().forEach(post => {
            const div = document.createElement('div');
            div.className = 'item multimedia-item';
            div.innerHTML = `
                <h3>${post.title}</h3>
                <p>${post.content}</p>
                <small>Published: ${new Date(post.date).toLocaleDateString()}</small>
                ${post.authorWallet ? `<small> | Author: ${post.authorWallet.substring(0, 8)}...</small>` : ''}
            `;
            postsList.appendChild(div);
        });
    } catch (error) {
        console.error('Error loading posts:', error);
        postsList.innerHTML = '<p class="placeholder-item multimedia-item">Failed to load posts.</p>';
        showNotification('Failed to load posts.', 'error');
    }
}

if (postForm) {
    postForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('post-title').value.trim();
        const content = document.getElementById('post-content').value.trim();

        if (!title || !content) {
            showNotification('Please enter both title and content for your post.', 'warning');
            return;
        }

        try {
            const response = await fetch('http://localhost:3000/api/posts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: title,
                    content: content,
                    date: new Date().toISOString(),
                    authorWallet: walletPublicKey ? walletPublicKey.toBase58() : 'UNKNOWN_WALLET'
                })
            });
            if (response.ok) {
                showNotification('Post published successfully!', 'success');
                postForm.reset();
                await loadPosts();
            } else {
                showNotification('Failed to publish post.', 'error');
            }
        } catch (error) {
            console.error('Error publishing post:', error);
            showNotification('Error connecting to server to publish post.', 'error');
        }
    });
}

// --- Solana Connection Initialization for Staking ---
function initializeSolanaConnection() {
    // This function can be called on page load or wallet connection.
    // It's good practice to ensure 'connection' is only initialized once
    // or updated when the network changes.
    if (!connection) {
        connection = new SolanaWeb3.Connection(SolanaWeb3.clusterApiUrl(network), 'confirmed');
        console.log('Solana connection initialized.');
    }
}

// Function to update all staking data in the UI
async function updateStakingUI() {
    if (!walletPublicKey) {
        userAfoxBalance.textContent = '0 AFOX';
        userStakedAmount.textContent = '0 AFOX';
        userRewardsAmount.textContent = '0 AFOX';
        // Update other info fields to default values
        if (stakingApr) stakingApr.textContent = '--%';
        if (minStakeAmountDisplay) minStakeAmountDisplay.textContent = '1 AFOX'; // Default value
        if (lockupPeriodDisplay) lockupPeriodDisplay.textContent = '0 days (flexible)'; // Default value
        if (unstakeFeeDisplay) unstakeFeeDisplay.textContent = '0%'; // Default value
        if (rewardCalculationDisplay) rewardCalculationDisplay.textContent = 'Daily'; // Default value
        return;
    }

    try {
        // Ensure connection is initialized
        initializeSolanaConnection();

        // 1. Get user's AFOX token balance
        let afoxBalance = 0;
        try {
            const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
                walletPublicKey,
                { mint: AFOX_TOKEN_MINT_ADDRESS_GLOBAL }
            );

            if (tokenAccounts.value.length > 0) {
                // Assume the user has only one account for this token
                afoxBalance = tokenAccounts.value[0].account.data.parsed.info.tokenAmount.uiAmount;
            }
        } catch (tokenError) {
            console.warn('Could not fetch AFOX token balance (might not have any):', tokenError);
            // Default to 0 if balance fetch fails (e.g., token account doesn't exist)
            afoxBalance = 0;
        }
        if (userAfoxBalance) userAfoxBalance.textContent = `${afoxBalance} AFOX`;

        // 2. Get user's staked amount and accumulated rewards
        // THIS IS PSEUDO-CODE! You'll need to call your staking smart contract
        // to retrieve this data. For example, via a PDA (Program Derived Address)
        // associated with the user's wallet and the staking program.
        const userStakingAccount = await getUserStakingAccount(walletPublicKey); // Your function to get staking data
        if (userStakingAccount) {
            if (userStakedAmount) userStakedAmount.textContent = `${userStakingAccount.stakedAmount} AFOX`;
            if (userRewardsAmount) userRewardsAmount.textContent = `${userStakingAccount.rewards} AFOX`;
        } else {
            if (userStakedAmount) userStakedAmount.textContent = '0 AFOX';
            if (userRewardsAmount) userRewardsAmount.textContent = '0 AFOX';
        }

        // 3. Get general staking parameters (APR, lockup period, etc.)
        // THIS IS PSEUDO-CODE! This data should also be retrieved from your smart contract
        const stakingPoolInfo = await getStakingPoolInfo(); // Your function to get general pool info
        if (stakingPoolInfo) {
            if (stakingApr) stakingApr.textContent = `${stakingPoolInfo.apr}%`;
            if (minStakeAmountDisplay) minStakeAmountDisplay.textContent = `${stakingPoolInfo.minStake} AFOX`;
            if (lockupPeriodDisplay) lockupPeriodDisplay.textContent = `${stakingPoolInfo.lockupDays} days`;
            if (unstakeFeeDisplay) unstakeFeeDisplay.textContent = `${stakingPoolInfo.unstakeFee}%`;
            if (rewardCalculationDisplay) rewardCalculationDisplay.textContent = stakingPoolInfo.rewardCalcMethod;
        }

    } catch (error) {
        console.error('Error updating staking UI:', error);
        showNotification('Failed to load staking data. Please check the console.', 'error');
    }
}

// PSEUDO-FUNCTIONS for smart contract interaction
async function getUserStakingAccount(publicKey) {
    // This will contain the logic to read data from your staking smart contract
    // For example, get the PDA for the user's staking account
    // const [userStakingPda, bump] = await SolanaWeb3.PublicKey.findProgramAddress(
    //     [publicKey.toBuffer(), Buffer.from("staking_account")],
    //     STAKING_PROGRAM_ID_GLOBAL
    // );
    // const accountInfo = await connection.getAccountInfo(userStakingPda);
    // if (accountInfo) {
    //     // Deserialize the account data
    //     // return deserializedData;
    // }
    // For demonstration:
    return { stakedAmount: 100, rewards: 5.25 }; // Mock data
}

async function getStakingPoolInfo() {
    // This will contain the logic to read global staking pool parameters
    // For example, get the PDA for the global pool account
    // For demonstration:
    return { apr: 15, minStake: 1, lockupDays: 0, unstakeFee: 0, rewardCalcMethod: "Daily" }; // Mock data
}

// "Stake" button handler (PSEUDO-CODE for real interaction)
if (stakeAfoxBtn) {
    stakeAfoxBtn.addEventListener('click', async () => {
        if (!walletPublicKey) {
            showNotification('Please connect your wallet.', 'info');
            return;
        }
        if (!connection) {
            showNotification('Solana connection not established. Please try again.', 'error');
            return;
        }

        const amount = parseFloat(stakeAmountInput.value);
        if (isNaN(amount) || amount <= 0) {
            showNotification('Please enter a valid amount to stake.', 'warning');
            return;
        }

        console.log(`Attempting to stake ${amount} AFOX...`);
        showNotification('Initiating staking transaction... Please confirm in your wallet.', 'info', 5000);

        try {
            // --- REAL BLOCKCHAIN INTERACTION CODE (VERY SIMPLIFIED EXAMPLE FOR DEMO) ---
            // You will need to get the user's Associated Token Account for AFOX
            const userAfoxTokenAccount = await SolanaSPL.getAssociatedTokenAddress(
                AFOX_TOKEN_MINT_ADDRESS_GLOBAL,
                walletPublicKey
            );

            // Check if the token account exists
            const accountInfo = await connection.getAccountInfo(userAfoxTokenAccount);
            if (!accountInfo) {
                showNotification('You do not have an AFOX token account. Please get one first (e.g., receive some AFOX).', 'warning');
                // In a real dApp, you might offer to create the ATA for the user here:
                // const createAtaIx = SolanaSPL.createAssociatedTokenAccountInstruction(
                //     walletPublicKey, // Payer
                //     userAfoxTokenAccount, // ATA address to create
                //     walletPublicKey, // Owner of ATA
                //     AFOX_TOKEN_MINT_ADDRESS_GLOBAL // Token Mint
                // );
                // transaction.add(createAtaIx);
                return;
            }

            // Amount in smallest units (lamports for tokens)
            const amountInSmallestUnits = amount * (10 ** AFOX_TOKEN_DECIMALS_GLOBAL);

            // This is a PSEUDO-IMPLEMENTATION for your staking smart contract.
            // For a real staking contract, you would typically call an instruction
            // on your STAKING_PROGRAM_ID_GLOBAL that transfers tokens from the user's ATA
            // to a vault controlled by the staking program, and updates a user's
            // staking account within your program's state.

            // FOR DEMONSTRATION, we will simulate a direct transfer to a DUMMY_STAKING_VAULT_ADDRESS.
            // **YOU MUST REPLACE THIS WITH YOUR ACTUAL STAKING PROGRAM'S INSTRUCTION.**
            // This example simply moves tokens out of the user's wallet,
            // it doesn't manage staking state, rewards, or unstaking.

            const dummyStakingVaultATA = await SolanaSPL.getAssociatedTokenAddress(
                AFOX_TOKEN_MINT_ADDRESS_GLOBAL,
                DUMMY_STAKING_VAULT_ADDRESS,
                true // allowOwnerOffCurve: Set to true if your vault address might not be a valid PDA derived from a program ID
            );

            // Check if the dummy staking vault's ATA exists, if not, you'd need to create it
            // (or ensure it's created by your staking program)
            const vaultAccountInfo = await connection.getAccountInfo(dummyStakingVaultATA);
            if (!vaultAccountInfo) {
                showNotification('Dummy staking vault token account does not exist. This is a setup error.', 'error');
                console.error("The AFOX token account for the DUMMY_STAKING_VAULT_ADDRESS was not found.");
                return;
            }


            // Create an instruction to transfer AFOX tokens to the "staking vault"
            const transferInstruction = SolanaSPL.createTransferInstruction(
                userAfoxTokenAccount, // Source token account (user's AFOX ATA)
                dummyStakingVaultATA, // Destination token account (your staking program's vault ATA)
                walletPublicKey,      // Owner of the source token account (the user)
                amountInSmallestUnits // Amount to transfer in lamports (smallest units)
            );

            const transaction = new SolanaWeb3.Transaction().add(transferInstruction);
            transaction.feePayer = walletPublicKey;
            transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

            const signedTransaction = await provider.signTransaction(transaction);
            const signature = await connection.sendRawTransaction(signedTransaction.serialize());
            await connection.confirmTransaction(signature, 'confirmed');

            console.log('Staking (simulated transfer) transaction signature:', signature);
            showNotification(`You successfully staked ${amount} AFOX! Transaction: <a href="https://solscan.io/tx/${signature}?cluster=${network}" target="_blank">${signature.substring(0, 10)}...</a> (This requires YOUR staking smart contract implementation)`, 'success', 10000);
            if (stakeAmountInput) stakeAmountInput.value = '';
            updateStakingUI(); // Update UI after transaction
        } catch (error) {
            console.error('Error during staking:', error);
            showNotification(`Failed to stake tokens: ${error.message}. Check the console for details.`, 'error');
        }
    });
}

// "Claim Rewards" button handler (PSEUDO-CODE for real interaction)
if (claimRewardsBtn) {
    claimRewardsBtn.addEventListener('click', async () => {
        if (!walletPublicKey) {
            showNotification('Please connect your wallet.', 'info');
            return;
        }
        if (!connection) {
            showNotification('Solana connection not established. Please try again.', 'error');
            return;
        }

        console.log('Attempting to claim rewards...');
        showNotification('Initiating claim rewards transaction... Please confirm in your wallet.', 'info', 5000);

        try {
            // --- REAL BLOCKCHAIN INTERACTION CODE ---
            // This will contain the logic to call the "claim rewards" instruction in your smart contract.
            // Your smart contract will likely:
            // 1. Calculate the rewards due to the user.
            // 2. Transfer the reward tokens from the staking program's vault to the user's AFOX ATA.
            // 3. Update the user's staking account state (resetting rewards).

            // Example placeholder for your smart contract instruction:
            // const claimRewardsInstruction = new SolanaWeb3.TransactionInstruction({
            //     keys: [
            //         { pubkey: walletPublicKey, isSigner: true, isWritable: false },
            //         // Other keys required by your claim instruction (staking account PDA, program's token vault, AFOX mint, etc.)
            //     ],
            //     programId: STAKING_PROGRAM_ID_GLOBAL,
            //     data: Buffer.from([2]) // Example instruction data (e.g., 2 for "claim")
            // });
            // const transaction = new SolanaWeb3.Transaction().add(claimRewardsInstruction);
            // transaction.feePayer = walletPublicKey;
            // transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
            // const signedTransaction = await provider.signTransaction(transaction);
            // const signature = await connection.sendRawTransaction(signedTransaction.serialize());
            // await connection.confirmTransaction(signature, 'confirmed');
            // console.log('Claim rewards transaction signature:', signature);

            showNotification('Rewards successfully claimed! (This function requires YOUR staking smart contract implementation)', 'success');
            updateStakingUI();
        } catch (error) {
            console.error('Error claiming rewards:', error);
            showNotification(`Failed to claim rewards: ${error.message}. Check the console.`, 'error');
        }
    });
}

// "Unstake Tokens" button handler (PSEUDO-CODE for real interaction)
if (unstakeAfoxBtn) {
    unstakeAfoxBtn.addEventListener('click', async () => {
        if (!walletPublicKey) {
            showNotification('Please connect your wallet.', 'info');
            return;
        }
        if (!connection) {
            showNotification('Solana connection not established. Please try again.', 'error');
            return;
        }

        // In a more complex implementation, you might prompt for the unstake amount
        // const amountToUnstake = parseFloat(prompt('How much AFOX do you want to unstake?'));
        // if (isNaN(amountToUnstake) || amountToUnstake <= 0) {
        //     showNotification('Please enter a valid amount to unstake.', 'warning');
        //     return;
        // }

        console.log('Attempting to unstake tokens...');
        showNotification('Initiating unstake transaction... Please confirm in your wallet.', 'info', 5000);

        try {
            // --- REAL BLOCKCHAIN INTERACTION CODE ---
            // This will contain the logic to call the "unstake" instruction in your smart contract.
            // Your smart contract will likely:
            // 1. Verify the unstaking request (e.g., lockup period, fees).
            // 2. Transfer the staked tokens back from the staking program's vault to the user's AFOX ATA.
            // 3. Update the user's staking account state (reducing staked amount).

            // Example placeholder for your smart contract instruction:
            // const unstakeInstruction = new SolanaWeb3.TransactionInstruction({
            //     keys: [
            //         { pubkey: walletPublicKey, isSigner: true, isWritable: false },
            //         // Other keys required by your unstake instruction (staking account PDA, program's token vault, AFOX mint, etc.)
            //     ],
            //     programId: STAKING_PROGRAM_ID_GLOBAL,
            //     data: Buffer.from([3]) // Example instruction data (e.g., 3 for "unstake")
            // });
            // const transaction = new SolanaWeb3.Transaction().add(unstakeInstruction);
            // transaction.feePayer = walletPublicKey;
            // transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
            // const signedTransaction = await provider.signTransaction(transaction);
            // const signature = await connection.sendRawTransaction(signedTransaction.serialize());
            // await connection.confirmTransaction(signature, 'confirmed');
            // console.log('Unstake transaction signature:', signature);

            showNotification('Staked tokens successfully unstaked! (This function requires YOUR staking smart contract implementation)', 'success');
            updateStakingUI();
        } catch (error) {
            console.error('Error unstaking tokens:', error);
            showNotification(`Failed to unstake tokens: ${error.message}. Check the console.`, 'error');
        }
    });
}


// --- Initial Data Load on Page Ready ---
document.addEventListener('DOMContentLoaded', async () => {
    // Add notification container to the body for `showNotification` function
    const notificationContainer = document.createElement('div');
    notificationContainer.id = 'notificationContainer';
    // Basic inline styling for notifications (consider moving to CSS file)
    notificationContainer.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 1000;
        display: flex;
        flex-direction: column;
        align-items: flex-end;
    `;
    document.body.appendChild(notificationContainer);

    // Basic CSS for notifications (consider moving to your main CSS file)
    const style = document.createElement('style');
    style.innerHTML = `
        .notification {
            background-color: #333;
            color: white;
            padding: 10px 20px;
            border-radius: 5px;
            margin-bottom: 10px;
            opacity: 0;
            transition: opacity 0.5s ease-in-out;
            box-shadow: 0 4px 8px rgba(0,0,0,0.2);
            max-width: 300px;
            word-wrap: break-word;
        }
        .notification.info { background-color: #2196F3; }
        .notification.success { background-color: #4CAF50; }
        .notification.error { background-color: #f44336; }
        .notification.warning { background-color: #ff9800; }
        .notification.success, .notification.info, .notification.error, .notification.warning {
             opacity: 1; /* Make visible when added */
        }
        .notification a { color: yellow; text-decoration: underline; }
    `;
    document.head.appendChild(style);


    // Initial loads of static content and marketplace NFTs
    await loadAnnouncements();
    await loadGames();
    await loadAds();
    await loadPhotos();
    await loadPosts();
    await loadMarketplaceNFTs();

    // Initialize Solana connection on DOMContentLoaded
    initializeSolanaConnection();

    // Attempt to auto-connect wallet if already authorized (Phantom's behavior)
    try {
        const selectedWallet = wallets[0];
        if (selectedWallet && selectedWallet.connected && selectedWallet.publicKey) {
            walletPublicKey = selectedWallet.publicKey;
            provider = selectedWallet;
            if (walletAddressDisplayWeb3) walletAddressDisplayWeb3.textContent = walletPublicKey.toBase58();
            if (walletAddressDisplayNft) walletAddressDisplayNft.textContent = walletPublicKey.toBase58();
            if (walletAddressDisplayDao) walletAddressDisplayDao.textContent = walletPublicKey.toBase58();

            // Set up listeners upon auto-connection
            setupProviderListeners();

            await loadUserNFTs(walletPublicKey.toBase58());
            await updateStakingUI(); // Update staking UI on auto-connect
            showNotification('Wallet auto-connected!', 'info');

        } else {
             // If not auto-connected, ensure staking UI is reset to default (0 values)
             updateStakingUI();
        }
    } catch (e) {
        console.warn("Auto-connect failed or wallet not found/authorized:", e);
        // Ensure UI is reset if auto-connect fails
        handleWalletDisconnect();
    }
});


// --- Copy Button for Contract Address (Example) ---
if (copyBtn) {
    copyBtn.addEventListener('click', () => {
        const contractAddressSpan = document.getElementById('contractAddress');
        if (contractAddressSpan) {
            const textToCopy = contractAddressSpan.textContent;
            navigator.clipboard.writeText(textToCopy).then(() => {
                showNotification('Contract address copied to clipboard!', 'success');
            }).catch(err => {
                console.error('Failed to copy text: ', err);
                showNotification('Failed to copy text.', 'error');
            });
        }
    });
}
