// --- CONSTANTS AND SETTINGS ---
const AFOX_TOKEN_MINT_ADDRESS = new SolanaWeb3.PublicKey('GLkewtq8s2Yr24o5LT5mzzEeccKuSsy8H5RCHaE9uRAd'); // Replace with your actual AFOX mint address
const STAKING_PROGRAM_ID = new SolanaWeb3.PublicKey('3GcDUxoH4yhFeM3aBkaUfjNu7xGTat8ojXLPHttz2o9f'); // REPLACE WITH YOUR ACTUAL STAKING PROGRAM ID
const JUPITER_API_URL = 'https://quote-api.jup.ag/v6'; // V6 API from Jupiter

// Addresses of popular Solana tokens (MINT ADDRESSES)
const TOKEN_MINT_ADDRESSES = {
    'SOL': new SolanaWeb3.PublicKey('So11111111111111111111111111111111111111112'), // Native SOL "mint"
    'AFOX': AFOX_TOKEN_MINT_ADDRESS,
    // Add other tokens as needed
    // 'USDC': new SolanaWeb3.PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapT8G4AV6Z6P5YDgJLK'),
};

const afoxDecimals = 6; // Standard number of decimal places for SPL tokens like AFOX

// --- GLOBAL WALLET & CONNECTION STATE ---
let walletPublicKey = null; // Stores the public key of the connected wallet
let provider = null; // For accessing the Phantom/Solflare window (the wallet adapter instance)
let connection = null; // Solana connection object
const network = SolanaWeb3.WalletAdapterNetwork.Devnet; // Change to 'Mainnet-beta' for production
const wallets = [
    new SolanaWalletAdapterPhantom.PhantomWalletAdapter(),
    // Add other wallets here if desired, e.g.:
    // new SolanaWalletAdapterWallets.SolflareWalletAdapter({ network }),
];
let areProviderListenersAttached = false; // Flag to ensure provider listeners are attached only once

// ### API BASE URL CONFIGURATION ###
const API_BASE_URL = 'http://localhost:3000'; // THIS ADDRESS IS USED FOR LOCAL DEVELOPMENT.

// --- UI ELEMENTS ---
// General Wallet & Display
const connectWalletBtnWeb3 = document.getElementById('connectWalletBtnWeb3');
const walletAddressDisplayWeb3 = document.getElementById('walletAddressDisplayWeb3');
const walletAddressDisplayNft = document.getElementById('walletAddressDisplayNft');
const walletAddressDisplayDao = document.getElementById('walletAddressDisplayDao');
const connectWalletNftBtn = document.getElementById('connectWalletNftBtn'); // Assuming this is the same as connectWalletBtnWeb3 for consistency

// Modals
const nftDetailsModal = document.getElementById('nftDetailsModal');
const nftModal = document.getElementById('nftModal');
const mintNftModal = document.getElementById('mintNftModal');
const createProposalModal = document.getElementById('createProposalModal');

// Close buttons for modals
const closeNftDetailsModalCross = document.getElementById('closeNftDetailsModalCross');
const closeNftModalCross = document.getElementById('closeNftModalCross');
const closeMintNftModalCross = document.getElementById('closeMintNftModalCross');
const closeProposalModalCross = document.getElementById('closeProposalModalCross');
const closeMainMenuCross = document.getElementById('closeMainMenuCross'); // NEW: Close button for Main Menu

// Menu Elements
const mainNav = document.querySelector('.nav ul') || document.getElementById('mainNav');
const menuToggle = document.getElementById('menuToggle');
const navLinks = mainNav ? mainNav.querySelectorAll('a') : [];

// NFT Section
const userNftList = document.getElementById('user-nft-list');
const nftToSellSelect = document.getElementById('nftToSell');
const listNftForm = document.getElementById('listNftForm');
const mintNftForm = document.getElementById('mintNftForm');
const marketplaceNftList = document.getElementById('marketplace-nft-list');

// NFT Details Modal elements
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

// Copy Button (generic)
const copyBtn = document.querySelector('.copy-btn');

// Announcements Section
const announcementsList = document.getElementById('announcementsList');
const announcementInput = document.getElementById('announcementInput');
const publishButton = document.getElementById('publishButton');

// Games & Ads Section
const gameList = document.getElementById('game-list');
const uploadGameBtnWeb3 = document.getElementById('uploadGameBtnWeb3');
const adList = document.getElementById('ad-list');
const postAdBtnWeb3 = document.getElementById('postAdBtnWeb3');

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

// SWAP SECTION UI ELEMENTS
const connectWalletSwapBtn = document.getElementById('connectWalletSwapBtn');
const walletAddressDisplaySwap = document.getElementById('walletAddressDisplaySwap');
const swapFromAmountInput = document.getElementById('swapFromAmount');
const swapFromTokenSelect = document.getElementById('swapFromToken');
const swapFromBalanceSpan = document.getElementById('swapFromBalance');
const swapDirectionBtn = document.getElementById('swapDirectionBtn');
const swapToAmountInput = document.getElementById('swapToAmount');
const swapToTokenSelect = document.getElementById('swapToToken');
const priceImpactSpan = document.getElementById('priceImpact');
const lpFeeSpan = document.getElementById('lpFee');
const minReceivedSpan = document.getElementById('minReceived');
const getQuoteBtn = document.getElementById('getQuoteBtn');
const executeSwapBtn = document.getElementById('executeSwapBtn');
const maxAmountBtns = document.querySelectorAll('.max-amount-btn');

let currentQuote = null; // Will store the last quote received from Jupiter
let currentOpenNft = null; // Store the currently open NFT for modal actions

// --- Arrays for convenient modal management ---
const allModals = [
    { element: nftDetailsModal, closeBtn: closeNftDetailsModalCross },
    { element: nftModal, closeBtn: closeNftModalCross },
    { element: mintNftModal, closeBtn: closeMintNftModalCross },
    { element: createProposalModal, closeBtn: closeProposalModalCross }
].filter(m => m.element); // Filter out any modals that weren't found in the DOM

// --- HELPER FUNCTIONS ---

/**
 * Universal function to display notifications.
 * @param {string} message The message to display.
 * @param {string} type The type of notification ('info', 'success', 'warning', 'error').
 * @param {number} duration The display duration in ms (default 3000).
 */
function showNotification(message, type = 'info', duration = 3000) {
    const notificationContainer = document.getElementById('notificationContainer');
    if (!notificationContainer) {
        console.warn('Notification container not found. Cannot display notification.');
        alert(message); // Fallback to alert if container not found
        return;
    }

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;

    notificationContainer.prepend(notification); // Add to the top

    // Automatically remove notification
    setTimeout(() => {
        notification.remove();
    }, duration);
}

/**
 * Formats a BigInt amount given its decimals.
 * @param {BN | string | number} amount - The amount as BN, string, or number.
 * @param {number} decimals - The number of decimal places for the token.
 * @returns {string} The formatted number as a string.
 */
function formatBigInt(amount, decimals) {
    if (!amount || !decimals) return '0';
    const bnAmount = (typeof amount === 'string' || typeof amount === 'number') ? new BN(amount) : amount;

    let str = bnAmount.toString();
    if (str.length <= decimals) {
        str = '0.'.padEnd(decimals - str.length + 2, '0') + str;
    } else {
        str = str.slice(0, str.length - decimals) + '.' + str.slice(str.length - decimals);
    }
    // Remove trailing zeros and decimal point if it's an integer
    str = str.replace(/\.?0+$/, '');
    return str;
}

/**
 * Closes all open modals and the main navigation menu.
 */
function closeAllPopups() {
    allModals.forEach(modalItem => {
        if (modalItem.element && modalItem.element.style.display === 'flex') {
            modalItem.element.style.display = 'none';
        }
    });

    if (mainNav && mainNav.classList.contains('active')) {
        mainNav.classList.remove('active');
        if (menuToggle) menuToggle.classList.remove('active');
    }
}

// --- WALLET CONNECTION & STATE MANAGEMENT ---

/**
 * Handles changes in the wallet's public key (e.g., user switches accounts).
 */
function handlePublicKeyChange(publicKey) {
    if (publicKey) {
        walletPublicKey = publicKey;
        updateWalletUI(publicKey.toBase58());
        // Trigger reloads for all sections
        loadUserNFTs(walletPublicKey.toBase58());
        updateStakingUI();
        updateSwapBalances();
        showNotification('Wallet account changed!', 'info');
    } else {
        handleWalletDisconnect();
    }
}

/**
 * Handles explicit wallet disconnection.
 */
function handleDisconnect() {
    console.log('Wallet explicitly disconnected by user.');
    handleWalletDisconnect();
    showNotification('Wallet disconnected.', 'info');
}

/**
 * Registers event listeners for the wallet provider.
 */
function registerProviderListeners() {
    if (areProviderListenersAttached && provider) {
        try {
            provider.off('publicKey', handlePublicKeyChange);
            provider.off('disconnect', handleDisconnect);
        } catch (e) {
            console.warn("Failed to detach old provider listeners:", e);
        }
    }

    if (provider) {
        provider.on('publicKey', handlePublicKeyChange);
        provider.on('disconnect', handleDisconnect);
        areProviderListenersAttached = true;
        console.log('Provider listeners attached.');
    } else {
        areProviderListenersAttached = false;
        console.log('No provider to attach listeners to.');
    }
}

/**
 * Updates all wallet address display elements across the UI.
 * @param {string} address - The wallet public key as a string.
 */
function updateWalletUI(address) {
    const displayAddress = address ? `${address.substring(0, 4)}...${address.substring(address.length - 4)}` : 'Not Connected';

    if (walletAddressDisplayWeb3) walletAddressDisplayWeb3.textContent = displayAddress;
    if (walletAddressDisplayNft) walletAddressDisplayNft.textContent = displayAddress;
    if (walletAddressDisplayDao) walletAddressDisplayDao.textContent = displayAddress;
    if (walletAddressDisplaySwap) walletAddressDisplaySwap.textContent = displayAddress;

    // Show/hide connect buttons vs. address display
    const connectedState = address !== null;
    [connectWalletBtnWeb3, connectWalletNftBtn, connectWalletSwapBtn].forEach(btn => {
        if (btn) btn.style.display = connectedState ? 'none' : 'block';
    });
    [walletAddressDisplayWeb3, walletAddressDisplayNft, walletAddressDisplayDao, walletAddressDisplaySwap].forEach(display => {
        if (display) display.style.display = connectedState ? 'block' : 'none';
    });
}

/**
 * Central function to connect a Solana wallet.
 */
async function connectWallet() {
    try {
        if (typeof SolanaWeb3 === 'undefined' || typeof SolanaWalletAdapterPhantom === 'undefined') {
            showNotification('Solana Web3 or Wallet Adapter libraries not loaded. Check script imports.', 'error');
            return;
        }

        const selectedWallet = wallets[0]; // For simplicity, always pick Phantom
        if (!selectedWallet) {
            showNotification('Wallet adapter not found. Make sure Phantom is installed and enabled.', 'error');
            return;
        }

        if (selectedWallet.connected && selectedWallet.publicKey) {
            walletPublicKey = selectedWallet.publicKey;
            provider = selectedWallet;
            console.log('Wallet already connected:', walletPublicKey.toBase58());
        } else {
            await selectedWallet.connect();
            walletPublicKey = selectedWallet.publicKey;
            provider = selectedWallet;
            console.log('Wallet connected:', walletPublicKey.toBase58());
        }

        // Initialize Solana Connection (or re-use if already initialized)
        if (!connection) {
            connection = new SolanaWeb3.Connection(
                SolanaWeb3.clusterApiUrl(network),
                'confirmed'
            );
        }

        updateWalletUI(walletPublicKey.toBase58());
        registerProviderListeners();

        // Load data for all sections
        await loadUserNFTs(walletPublicKey.toBase58());
        await updateStakingUI();
        await updateSwapBalances(); // Update swap balances on connect

        showNotification('Wallet successfully connected!', 'success');

    } catch (error) {
        console.error('Failed to connect wallet:', error);
        showNotification(`Failed to connect wallet: ${error.message || error}`, 'error');
        handleWalletDisconnect();
    }
}

/**
 * Handles the logic for wallet disconnection, resetting UI and data.
 */
function handleWalletDisconnect() {
    walletPublicKey = null;
    provider = null;
    connection = null;
    updateWalletUI(null); // Reset all wallet displays

    // Reset NFT section
    if (userNftList) userNftList.innerHTML = '<p class="placeholder-item web3-placeholder">Connect your wallet to see your NFTs.</p>';
    if (nftToSellSelect) nftToSellSelect.innerHTML = '<option value="">-- Select NFT --</option>';

    // Reset Staking section
    updateStakingUI(); // This function handles resetting itself if walletPublicKey is null

    // Reset Swap section
    swapFromBalanceSpan.textContent = '0';
    swapFromAmountInput.value = '';
    swapToAmountInput.value = '';
    priceImpactSpan.textContent = '0%';
    lpFeeSpan.textContent = '0';
    minReceivedSpan.textContent = '0';
    executeSwapBtn.style.display = 'none';
    currentQuote = null;

    // Detach listeners on disconnect
    if (areProviderListenersAttached && provider) {
        try {
            provider.off('publicKey', handlePublicKeyChange);
            provider.off('disconnect', handleDisconnect);
        } catch (e) {
            console.warn("Error detaching provider listeners on disconnect:", e);
        }
        areProviderListenersAttached = false;
    }
}


// --- SWAP FUNCTIONS ---

/**
 * Updates balances for the "From" token in the swap section.
 */
async function updateSwapBalances() {
    if (!walletPublicKey) {
        swapFromBalanceSpan.textContent = '0';
        return;
    }

    if (!connection) { // Ensure connection is established
        connection = new SolanaWeb3.Connection(SolanaWeb3.clusterApiUrl(network), 'confirmed');
    }

    const fromTokenMint = TOKEN_MINT_ADDRESSES[swapFromTokenSelect.value];

    if (fromTokenMint.toBase58() === TOKEN_MINT_ADDRESSES['SOL'].toBase58()) {
        const solBalance = await connection.getBalance(walletPublicKey);
        swapFromBalanceSpan.textContent = `${(solBalance / SolanaWeb3.LAMPORTS_PER_SOL).toFixed(4)} SOL`;
    } else {
        try {
            const tokenAccount = await connection.getParsedTokenAccountsByOwner(
                walletPublicKey,
                { mint: fromTokenMint }
            );
            if (tokenAccount.value.length > 0) {
                const amount = tokenAccount.value[0].account.data.parsed.info.tokenAmount.amount;
                const decimals = tokenAccount.value[0].account.data.parsed.info.tokenAmount.decimals;
                swapFromBalanceSpan.textContent = `${formatBigInt(new BN(amount), decimals)} ${swapFromTokenSelect.value}`;
            } else {
                swapFromBalanceSpan.textContent = `0 ${swapFromTokenSelect.value}`;
            }
        } catch (error) {
            console.error('Error fetching token balance:', error);
            swapFromBalanceSpan.textContent = `Error ${swapFromTokenSelect.value}`;
        }
    }
}

/**
 * Fetches a swap quote from Jupiter Aggregator.
 */
async function getQuote() {
    if (!walletPublicKey) {
        showNotification('Please connect your wallet first.', 'warning');
        return;
    }

    const fromMint = TOKEN_MINT_ADDRESSES[swapFromTokenSelect.value];
    const toMint = TOKEN_MINT_ADDRESSES[swapToTokenSelect.value];
    const amount = parseFloat(swapFromAmountInput.value);

    if (isNaN(amount) || amount <= 0) {
        showNotification('Please enter a valid amount for the swap.', 'warning');
        return;
    }

    // Determine the number of decimal places for the input token dynamically
    let decimalsFrom;
    if (fromMint.toBase58() === TOKEN_MINT_ADDRESSES['SOL'].toBase58()) {
        decimalsFrom = 9; // SOL has 9 decimals
    } else if (fromMint.toBase58() === AFOX_TOKEN_MINT_ADDRESS.toBase58()) {
        decimalsFrom = afoxDecimals;
    } else {
        // Attempt to get decimals from the token mint directly if needed, or assume a default
        // For simplicity, hardcode for known tokens or fetch dynamically via API if complex.
        // For now, let's assume all other SPL tokens also have `afoxDecimals` or define them in TOKEN_MINT_ADDRESSES.
        decimalsFrom = afoxDecimals; // Placeholder, refine if other tokens have different decimals
    }
    const inputAmountLamports = new BN(amount * (10 ** decimalsFrom)).toString();

    showNotification('Getting the best swap quote...', 'info');
    getQuoteBtn.disabled = true;
    executeSwapBtn.style.display = 'none';

    try {
        const response = await fetch(`${JUPITER_API_URL}/quote?inputMint=${fromMint.toBase55()}&outputMint=${toMint.toBase55()}&amount=${inputAmountLamports}&slippageBps=50`);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Failed to get quote: ${errorData.error || response.statusText}`);
        }
        const data = await response.json();
        currentQuote = data;

        let outputDecimals;
        if (toMint.toBase58() === TOKEN_MINT_ADDRESSES['SOL'].toBase58()) {
            outputDecimals = 9; // SOL has 9 decimals
        } else if (toMint.toBase58() === AFOX_TOKEN_MINT_ADDRESS.toBase58()) {
            outputDecimals = afoxDecimals;
        } else {
            outputDecimals = afoxDecimals; // Placeholder
        }

        const formattedOutput = formatBigInt(new BN(currentQuote.outAmount), outputDecimals);

        swapToAmountInput.value = formattedOutput;
        priceImpactSpan.textContent = `${(currentQuote.priceImpactPct * 100).toFixed(2)}%`;
        lpFeeSpan.textContent = `${formatBigInt(new BN(currentQuote.lpFee.amount), outputDecimals)} ${swapToTokenSelect.value}`;
        minReceivedSpan.textContent = `${formatBigInt(new BN(currentQuote.otherAmountThreshold), outputDecimals)} ${swapToTokenSelect.value}`;

        showNotification('Quote successfully received!', 'success');
        executeSwapBtn.style.display = 'block';
    } catch (error) {
        console.error('Error fetching quote:', error);
        showNotification(`Error fetching quote: ${error.message}`, 'error');
        currentQuote = null;
        swapToAmountInput.value = '';
        priceImpactSpan.textContent = '0%';
        lpFeeSpan.textContent = '0';
        minReceivedSpan.textContent = '0';
        executeSwapBtn.style.display = 'none';
    } finally {
        getQuoteBtn.disabled = false;
    }
}

/**
 * Executes the swap transaction via Jupiter Aggregator.
 */
async function executeSwap() {
    if (!currentQuote) {
        showNotification('Please get a quote first.', 'warning');
        return;
    }
    if (!walletPublicKey) {
        showNotification('Wallet not connected.', 'warning');
        return;
    }

    showNotification('Preparing swap transaction...', 'info');
    executeSwapBtn.disabled = true;

    try {
        const response = await fetch(`${JUPITER_API_URL}/swap`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                quoteResponse: currentQuote,
                userPublicKey: walletPublicKey.toBase58(),
                wrapUnwrapSOL: true,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Failed to get swap transaction: ${errorData.error || response.statusText}`);
        }

        const { swapTransaction } = await response.json();

        const transactionBuf = Buffer.from(swapTransaction, 'base64');
        const transaction = SolanaWeb3.Transaction.from(transactionBuf);

        // Ensure the connection is initialized
        if (!connection) {
             connection = new SolanaWeb3.Connection(SolanaWeb3.clusterApiUrl(network), 'confirmed');
        }

        // Phantom Wallet requires signAndSendTransaction
        const signedTransaction = await provider.signAndSendTransaction(transaction);

        showNotification('Transaction sent! Waiting for confirmation...', 'info');
        console.log('Swap transaction sent:', signedTransaction.signature);

        const confirmation = await connection.confirmTransaction(signedTransaction.signature, 'confirmed');

        if (confirmation.value.err) {
            throw new Error('Transaction failed: ' + confirmation.value.err.toString());
        }

        showNotification('Swap successfully executed!', 'success');
        console.log('Swap confirmed:', signedTransaction.signature);

        // Clear fields and update balances after successful swap
        swapFromAmountInput.value = '';
        swapToAmountInput.value = '';
        priceImpactSpan.textContent = '0%';
        lpFeeSpan.textContent = '0';
        minReceivedSpan.textContent = '0';
        executeSwapBtn.style.display = 'none';
        currentQuote = null;
        updateSwapBalances();

    } catch (error) {
        console.error('Error during swap execution:', error);
        showNotification(`Swap failed: ${error.message}`, 'error');
    } finally {
        executeSwapBtn.disabled = false;
    }
}

// --- NFT DISPLAY & ACTIONS ---

async function loadUserNFTs(walletAddress) {
    if (!userNftList) return;

    userNftList.innerHTML = '<p class="placeholder-item web3-placeholder">Loading your NFTs...</p>';
    if (nftToSellSelect) nftToSellSelect.innerHTML = '<option value="">-- Select NFT --</option>';

    try {
        const response = await fetch(`${API_BASE_URL}/api/nfts/marketplace`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
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
            nftItem.addEventListener('click', () => showNftDetails(nft)); // Pass the NFT object
            userNftList.appendChild(nftItem);

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
    }
}

async function loadMarketplaceNFTs() {
    if (!marketplaceNftList) return;

    marketplaceNftList.innerHTML = '<p class="placeholder-item web3-placeholder">Loading marketplace NFTs...</p>';

    try {
        const response = await fetch(`${API_BASE_URL}/api/nfts/marketplace`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        const listedNfts = data.nfts.filter(nft => nft.price && nft.isListed);

        marketplaceNftList.innerHTML = '';
        if (listedNfts.length === 0) {
            marketplaceNftList.innerHTML = '<p class="placeholder-item web3-placeholder">No NFTs listed on the marketplace yet.</p>';
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
            nftItem.addEventListener('click', () => showNftDetails(nft));
            marketplaceNftList.appendChild(nftItem);
        });

    } catch (error) {
        console.error('Error loading marketplace NFTs:', error);
        marketplaceNftList.innerHTML = `<p class="placeholder-item web3-placeholder">Error loading marketplace NFTs: ${error.message}.</p>`;
    }
}

/**
 * Displays the NFT details modal and populates its content.
 * @param {object} nft - The NFT object to display.
 */
window.showNftDetails = async function(nft) {
    if (!nftDetailsModal) return;

    closeAllPopups();
    currentOpenNft = nft; // Store the NFT object

    if (nftDetailImage) nftDetailImage.src = nft.image || 'https://via.placeholder.com/250x150?text=NFT';
    if (nftDetailName) nftDetailName.textContent = nft.name || 'Untitled NFT';
    if (nftDetailDescription) nftDetailDescription.textContent = nft.description || 'No description provided.';
    if (nftDetailOwner) nftDetailOwner.textContent = nft.owner || 'Unknown';
    if (nftDetailMint) nftDetailMint.textContent = nft.mint || 'N/A';
    if (nftDetailSolscanLink) {
        nftDetailSolscanLink.href = `https://solscan.io/token/${nft.mint}?cluster=${network.toLowerCase()}`;
        nftDetailSolscanLink.style.display = nft.mint ? 'inline-block' : 'none';
    }

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

    const currentUserWalletAddress = walletPublicKey ? walletPublicKey.toBase58() : null;

    if (currentUserWalletAddress && nft.owner === currentUserWalletAddress) {
        if (nftDetailTransferBtn) nftDetailTransferBtn.style.display = 'inline-block';
        if (!nft.isListed && nftDetailSellBtn) {
            nftDetailSellBtn.style.display = 'inline-block';
        }
    } else if (nft.isListed && nftDetailBuyBtn) {
        nftDetailBuyBtn.style.display = 'inline-block';
    }

    // Attach event listeners for actions (defined below in DOMContentLoaded)
    nftDetailsModal.style.display = 'flex';

    // Load NFT transaction history
    if (nftDetailHistory && nft.mint) {
        nftDetailHistory.textContent = 'Loading history...';
        try {
            const historyResponse = await fetch(`${API_BASE_URL}/api/nfts/${nft.mint}/history`);
            if (!historyResponse.ok) {
                const errorData = await historyResponse.json();
                throw new Error(errorData.error || `Failed to get history: ${historyResponse.status}`);
            }
            const historyData = await historyResponse.json();

            if (historyData && historyData.length > 0) {
                nftDetailHistory.innerHTML = '<h4>Transaction History:</h4>';
                historyData.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

                historyData.forEach(event => {
                    const p = document.createElement('p');
                    let eventText = `${new Date(event.timestamp).toLocaleString()}: `;
                    switch (event.type) {
                        case "Mint": eventText += `Minted to address ${event.to.substring(0, 6)}...`; break;
                        case "Transfer": eventText += `Transferred from ${event.from.substring(0, 6)}... to ${event.to.substring(0, 6)}...`; break;
                        case "Sale": eventText += `Sold from ${event.from.substring(0, 6)}... to ${event.to.substring(0, 6)}... for ${event.price} SOL`; break;
                        default:
                            eventText += `Event: ${event.type}`;
                            if (event.from) eventText += ` from ${event.from.substring(0, 6)}...`;
                            if (event.to) eventText += ` to ${event.to.substring(0, 6)}...`;
                            break;
                    }
                    p.textContent = eventText;
                    nftDetailHistory.appendChild(p);
                });
            } else {
                nftDetailHistory.textContent = 'No transaction history for this NFT.';
            }
        } catch (error) {
            console.error('Error loading NFT history for modal:', error);
            nftDetailHistory.textContent = `Error loading history: ${error.message}.`;
        }
    }
};

// --- STAKING FUNCTIONS ---

/**
 * Updates all staking data in the UI.
 */
async function updateStakingUI() {
    if (!walletPublicKey) {
        if (userAfoxBalance) userAfoxBalance.textContent = '0 AFOX';
        if (userStakedAmount) userStakedAmount.textContent = '0 AFOX';
        if (userRewardsAmount) userRewardsAmount.textContent = '0 AFOX';
        if (stakingApr) stakingApr.textContent = '--%';
        if (minStakeAmountDisplay) minStakeAmountDisplay.textContent = '1 AFOX';
        if (lockupPeriodDisplay) lockupPeriodDisplay.textContent = '0 days (flexible)';
        if (unstakeFeeDisplay) unstakeFeeDisplay.textContent = '0%';
        if (rewardCalculationDisplay) rewardCalculationDisplay.textContent = 'Daily';
        return;
    }

    if (!connection) { // Ensure connection is established
        connection = new SolanaWeb3.Connection(SolanaWeb3.clusterApiUrl(network), 'confirmed');
    }

    try {
        let afoxBalance = 0;
        try {
            const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
                walletPublicKey,
                { mint: AFOX_TOKEN_MINT_ADDRESS }
            );

            if (tokenAccounts.value.length > 0) {
                afoxBalance = tokenAccounts.value[0].account.data.parsed.info.tokenAmount.uiAmount;
            }
        } catch (tokenError) {
            console.warn('Failed to get AFOX token balance (possibly none):', tokenError);
            afoxBalance = 0;
        }
        if (userAfoxBalance) userAfoxBalance.textContent = `${afoxBalance} AFOX`;

        const userStakingAccount = await getUserStakingAccount(walletPublicKey);
        if (userStakingAccount) {
            if (userStakedAmount) userStakedAmount.textContent = `${userStakingAccount.stakedAmount} AFOX`;
            if (userRewardsAmount) userRewardsAmount.textContent = `${userStakingAccount.rewards} AFOX`;
        } else {
            if (userStakedAmount) userStakedAmount.textContent = '0 AFOX';
            if (userRewardsAmount) userRewardsAmount.textContent = '0 AFOX';
        }

        const stakingPoolInfo = await getStakingPoolInfo();
        if (stakingPoolInfo) {
            if (stakingApr) stakingApr.textContent = `${stakingPoolInfo.apr}%`;
            if (minStakeAmountDisplay) minStakeAmountDisplay.textContent = `${stakingPoolInfo.minStake} AFOX`;
            if (lockupPeriodDisplay) lockupPeriodDisplay.textContent = `${stakingPoolInfo.lockupDays} days`;
            if (unstakeFeeDisplay) unstakeFeeDisplay.textContent = `${stakingPoolInfo.unstakeFee}%`;
            if (rewardCalculationDisplay) rewardCalculationDisplay.textContent = stakingPoolInfo.rewardCalcMethod;
        }

    } catch (error) {
        console.error('Error updating staking UI:', error);
        showNotification('Failed to load staking data. Check console.', 'error');
    }
}

/**
 * PSEUDO-FUNCTION: Gets user's staking account information.
 * REPLACE WITH YOUR ACTUAL SMART CONTRACT INTERACTION LOGIC.
 */
async function getUserStakingAccount(userPublicKey) {
    try {
        const [userStakingAccountPubKey] = await SolanaWeb3.PublicKey.findProgramAddress(
            [userPublicKey.toBuffer(), Buffer.from("stake_account_seed")],
            STAKING_PROGRAM_ID
        );

        const accountInfo = await connection.getAccountInfo(userStakingAccountPubKey);

        if (accountInfo && accountInfo.data) {
            // Replace with actual deserialization based on your smart contract's account structure
            console.warn("Staking data deserialization not implemented. Returning placeholder data.");
            // Example if you have an Anchor program instance named `program`:
            // const decodedAccount = await program.account.userStakeAccount.fetch(userStakingAccountPubKey);
            // return {
            //     stakedAmount: decodedAccount.stakedAmount.toNumber() / (10 ** afoxDecimals),
            //     rewards: decodedAccount.pendingRewards.toNumber() / (10 ** afoxDecimals),
            // };
            return { stakedAmount: 0, rewards: 0 };
        } else {
            return { stakedAmount: 0, rewards: 0 };
        }
    } catch (error) {
        console.error("Error getting user staking account:", error);
        return { stakedAmount: 0, rewards: 0 };
    }
}

/**
 * PSEUDO-FUNCTION: Gets staking pool information.
 * REPLACE WITH YOUR ACTUAL SMART CONTRACT INTERACTION LOGIC.
 */
async function getStakingPoolInfo() {
    try {
        const [poolAccountPubKey] = await SolanaWeb3.PublicKey.findProgramAddress(
            [Buffer.from("pool_config_seed")],
            STAKING_PROGRAM_ID
        );

        const accountInfo = await connection.getAccountInfo(poolAccountPubKey);

        if (accountInfo && accountInfo.data) {
            // Replace with actual deserialization based on your smart contract's account structure
            console.warn("Staking pool data deserialization not implemented. Returning placeholder data.");
            // Example if you have an Anchor program instance named `program`:
            // const decodedPool = await program.account.stakingPool.fetch(poolAccountPubKey);
            // return {
            //     apr: decodedPool.apr / 100,
            //     minStake: decodedPool.minStake.toNumber() / (10 ** afoxDecimals),
            //     lockupDays: decodedPool.lockupPeriodDays,
            //     unstakeFee: decodedPool.unstakeFeeBps / 100,
            //     rewardCalcMethod: decodedPool.rewardCalcMethod
            // };
            return { apr: 0, minStake: 0, lockupDays: 0, unstakeFee: 0, rewardCalcMethod: "N/A" };
        } else {
            return { apr: 0, minStake: 0, lockupDays: 0, unstakeFee: 0, rewardCalcMethod: "N/A" };
        }
    } catch (error) {
        console.error("Error getting staking pool information:", error);
        return { apr: 0, minStake: 0, lockupDays: 0, unstakeFee: 0, rewardCalcMethod: "N/A" };
    }
}


// --- DYNAMIC CONTENT LOADING (ANNOUNCEMENTS, GAMES, ADS) ---

async function loadAnnouncements() {
    if (!announcementsList) return;
    announcementsList.innerHTML = '<p class="placeholder-item">Loading announcements...</p>';
    try {
        const response = await fetch(`${API_BASE_URL}/api/announcements`);
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
    }
}

async function loadGames() {
    if (!gameList) return;
    gameList.innerHTML = '<p class="placeholder-item web3-placeholder">Loading games...</p>';
    try {
        const response = await fetch(`${API_BASE_URL}/api/games`);
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
                ${game.url ? `<a href="${game.url}" target="_blank" class="web3-btn small-btn">Play</a>` : ''}
            `;
            gameList.appendChild(div);
        });
    } catch (error) {
        console.error('Error loading games:', error);
        gameList.innerHTML = '<p class="placeholder-item web3-placeholder">Failed to load games.</p>';
    }
}

async function loadAds() {
    if (!adList) return;
    adList.innerHTML = '<p class="placeholder-item ad web3-placeholder">Loading ads...</p>';
    try {
        const response = await fetch(`${API_BASE_URL}/api/ads`);
        const data = await response.json();
        adList.innerHTML = '';
        if (data.length === 0) {
            adList.innerHTML = '<p class="placeholder-item ad web3-placeholder">No ads yet.</p>';
            return;
        }
        data.forEach(ad => {
            const div = document.createElement('div');
            div.className = 'placeholder-item ad web3-placeholder';
            div.innerHTML = `
                <h3>${ad.title}</h3>
                <p>${ad.content}</p>
                ${ad.imageUrl ? `<img src="${ad.imageUrl}" alt="Advertisement image" style="max-width:100%; height:auto; margin-top:10px; border-radius:5px;">` : ''}
                ${ad.link ? `<a href="${ad.link}" target="_blank" class="web3-btn small-btn" style="margin-top:10px;">Learn more</a>` : ''}
            `;
            adList.appendChild(div);
        });
    } catch (error) {
        console.error('Error loading ads:', error);
        adList.innerHTML = '<p class="placeholder-item ad web3-placeholder">Failed to load ads.</p>';
    }
}


// --- DOMContentLoaded: Ensures the DOM is fully loaded before executing the script ---
document.addEventListener('DOMContentLoaded', async () => {

    // --- General Event Listeners for Modals and Menu ---
    allModals.forEach(modalItem => {
        if (modalItem.closeBtn) {
            modalItem.closeBtn.addEventListener('click', () => {
                modalItem.element.style.display = 'none';
            });
        }
    });

    if (closeMainMenuCross) {
        closeMainMenuCross.addEventListener('click', () => {
            if (mainNav) {
                mainNav.classList.remove('active');
                if (menuToggle) menuToggle.classList.remove('active');
            }
        });
    }

    window.addEventListener('click', function(event) {
        let popupClosed = false;
        for (let i = allModals.length - 1; i >= 0; i--) {
            const modalItem = allModals[i];
            if (modalItem.element && event.target === modalItem.element && modalItem.element.style.display === 'flex') {
                modalItem.element.style.display = 'none';
                popupClosed = true;
                break;
            }
        }
        if (!popupClosed && mainNav && mainNav.classList.contains('active') &&
            !mainNav.contains(event.target) && !(menuToggle && menuToggle.contains(event.target))) {
            mainNav.classList.remove('active');
            if (menuToggle) menuToggle.classList.remove('active');
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            let popupClosed = false;
            for (let i = allModals.length - 1; i >= 0; i--) {
                const modalItem = allModals[i];
                if (modalItem.element && modalItem.element.style.display === 'flex') {
                    modalItem.element.style.display = 'none';
                    popupClosed = true;
                    break;
                }
            }
            if (!popupClosed && mainNav && mainNav.classList.contains('active')) {
                mainNav.classList.remove('active');
                if (menuToggle) menuToggle.classList.remove('active');
            }
        }
    });

    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            if (!mainNav.classList.contains('active')) {
                closeAllPopups();
            }
            mainNav.classList.toggle('active');
            menuToggle.classList.toggle('active');
        });
    }

    if (navLinks.length > 0) {
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                if (mainNav && mainNav.classList.contains('active')) {
                    mainNav.classList.remove('active');
                    if (menuToggle) menuToggle.classList.remove('active');
                }
            });
        });
    }

    // --- Wallet Connect Buttons ---
    // All connect buttons now point to the single connectWallet function
    [connectWalletBtnWeb3, connectWalletNftBtn, connectWalletSwapBtn].forEach(btn => {
        if (btn) btn.addEventListener('click', connectWallet);
    });

    // --- Mint NFT Form Submission ---
    if (mintNftForm) {
        mintNftForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!walletPublicKey) {
                showNotification('Please connect your Solana wallet first to mint an NFT.', 'warning');
                return;
            }
            const formData = new FormData(mintNftForm);
            formData.append('creatorWallet', walletPublicKey.toBase58());
            try {
                const response = await fetch(`${API_BASE_URL}/api/nfts/prepare-mint`, {
                    method: 'POST',
                    body: formData,
                });
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
                }
                const result = await response.json();
                showNotification(`NFT successfully minted (simulation)! Metadata URI: ${result.uri}, Mint Address: ${result.mintAddress}`, 'success', 5000);
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
                showNotification('Please connect your Solana wallet first to list an NFT for sale.', 'warning');
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
                const response = await fetch(`${API_BASE_URL}/api/nfts/list`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
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
                listNftForm.reset();
                await loadUserNFTs(walletPublicKey.toBase58());
                await loadMarketplaceNFTs();
            } catch (error) {
                console.error('Error listing NFT for sale:', error);
                showNotification(`Failed to list NFT for sale: ${error.message}`, 'error');
            }
        });
    }

    // --- Announcement Publish Button ---
    if (publishButton && announcementInput) {
        publishButton.addEventListener('click', async () => {
            const text = announcementInput.value.trim();
            if (text) {
                try {
                    const response = await fetch(`${API_BASE_URL}/api/announcements`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ text: text, date: new Date().toISOString() })
                    });
                    if (response.ok) {
                        announcementInput.value = '';
                        await loadAnnouncements();
                        showNotification('Announcement published!', 'success');
                    } else {
                        showNotification('Failed to publish announcement. (Admin only in a real application)', 'error');
                    }
                } catch (error) {
                    console.error('Error publishing announcement:', error);
                    showNotification('Server connection error.', 'error');
                }
            } else {
                showNotification('Please enter an announcement.', 'warning');
            }
        });
    }

    // --- Game Upload & Ad Post Buttons (Placeholders) ---
    if (uploadGameBtnWeb3) {
        uploadGameBtnWeb3.addEventListener('click', () => {
            showNotification('Game upload functionality requires a form and backend integration for file handling.', 'info', 5000);
        });
    }

    if (postAdBtnWeb3) {
        postAdBtnWeb3.addEventListener('click', () => {
            showNotification('Ad posting functionality requires a form and backend integration for handling details and creative files.', 'info', 5000);
        });
    }

    // --- Staking Button Handlers ---
    if (stakeAfoxBtn) {
        stakeAfoxBtn.addEventListener('click', async () => {
            if (!walletPublicKey) {
                showNotification('Please connect your wallet to stake.', 'warning');
                return;
            }
            if (!connection) {
                showNotification('Solana connection not established. Please connect your wallet again.', 'error');
                return;
            }

            const amount = parseFloat(stakeAmountInput.value);
            if (isNaN(amount) || amount <= 0) {
                showNotification('Please enter a valid amount to stake.', 'warning');
                return;
            }

            try {
                showNotification(`Initiating staking of ${amount} AFOX...`, 'info', 5000);

                const [userStakingAccountPubKey] = await SolanaWeb3.PublicKey.findProgramAddress(
                    [walletPublicKey.toBuffer(), Buffer.from("stake_account_seed")],
                    STAKING_PROGRAM_ID
                );
                const [poolAccountPubKey] = await SolanaWeb3.PublicKey.findProgramAddress(
                    [Buffer.from("pool_config_seed")],
                    STAKING_PROGRAM_ID
                );

                const userAfoxTokenAccountPubKey = await SolanaToken.getAssociatedTokenAddress(
                    AFOX_TOKEN_MINT_ADDRESS,
                    walletPublicKey
                );

                const userAfoxBalanceInfo = await connection.getTokenAccountBalance(userAfoxTokenAccountPubKey);
                if (userAfoxBalanceInfo.value.uiAmount < amount) {
                    showNotification('Insufficient AFOX balance for staking.', 'error');
                    return;
                }

                const transaction = new SolanaWeb3.Transaction();
                const userStakingAccountInfo = await connection.getAccountInfo(userStakingAccountPubKey);
                if (!userStakingAccountInfo) {
                    const space = 100; // Example size, REPLACE WITH ACTUAL SIZE FROM YOUR CONTRACT
                    const lamports = await connection.getMinimumBalanceForRentExemption(space);
                    transaction.add(
                        SolanaWeb3.SystemProgram.createAccount({
                            fromPubkey: walletPublicKey,
                            newAccountPubkey: userStakingAccountPubKey,
                            lamports,
                            space,
                            programId: STAKING_PROGRAM_ID,
                        })
                    );
                }

                const stakeAmountBN = new BN(amount * (10 ** afoxDecimals));
                transaction.add({
                    keys: [
                        { pubkey: walletPublicKey, isSigner: true, isWritable: false },
                        { pubkey: poolAccountPubKey, isSigner: false, isWritable: true },
                        { pubkey: userStakingAccountPubKey, isSigner: false, isWritable: true },
                        { pubkey: AFOX_TOKEN_MINT_ADDRESS, isSigner: false, isWritable: false },
                        { pubkey: userAfoxTokenAccountPubKey, isSigner: false, isWritable: true },
                        { pubkey: SolanaToken.TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
                        { pubkey: SolanaWeb3.SystemProgram.programId, isSigner: false, isWritable: false },
                        { pubkey: SolanaWeb3.SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
                    ],
                    programId: STAKING_PROGRAM_ID,
                    data: Buffer.from([0, ...stakeAmountBN.toArray('le', 8)]),
                });

                transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
                transaction.feePayer = walletPublicKey;

                const signature = await provider.sendAndConfirm(transaction);
                console.log("Staking transaction successful:", signature);

                showNotification(`You successfully staked ${amount} AFOX!`, 'success');
                if (stakeAmountInput) stakeAmountInput.value = '';
                await updateStakingUI();
                await updateSwapBalances(); // Staking affects AFOX balance
            } catch (error) {
                console.error('Error during staking:', error);
                showNotification(`Failed to stake tokens: ${error.message}. See console for details.`, 'error');
            }
        });
    }

    if (claimRewardsBtn) {
        claimRewardsBtn.addEventListener('click', async () => {
            if (!walletPublicKey) {
                showNotification('Please connect your wallet.', 'warning');
                return;
            }
            if (!connection) {
                showNotification('Solana connection not established. Please connect your wallet again.', 'error');
                return;
            }
            showNotification('Attempting to claim rewards...', 'info');
            try {
                // Placeholder for actual claim rewards transaction
                // Example: Construct a transaction calling your smart contract's `claim_rewards`
                showNotification('Rewards successfully claimed! (This feature requires staking smart contract implementation)', 'success', 5000);
                await updateStakingUI();
                await updateSwapBalances(); // Claiming rewards might affect balance
            } catch (error) {
                console.error('Error claiming rewards:', error);
                showNotification(`Failed to claim rewards: ${error.message}. Check console.`, 'error');
            }
        });
    }

    if (unstakeAfoxBtn) {
        unstakeAfoxBtn.addEventListener('click', async () => {
            if (!walletPublicKey) {
                showNotification('Please connect your wallet.', 'warning');
                return;
            }
            if (!connection) {
                showNotification('Solana connection not established. Please connect your wallet again.', 'error');
                return;
            }
            showNotification('Attempting to unstake tokens...', 'info');
            try {
                // Placeholder for actual unstake transaction
                // Example: Construct a transaction calling your smart contract's `unstake`
                showNotification('Staked tokens successfully unstaked! (This feature requires staking smart contract implementation)', 'success', 5000);
                await updateStakingUI();
                await updateSwapBalances(); // Unstaking affects AFOX balance
            } catch (error) {
                console.error('Error unstaking tokens:', error);
                showNotification(`Failed to unstake tokens: ${error.message}. Check console.`, 'error');
            }
        });
    }

    // --- NFT Buy button handler ---
    if (nftDetailBuyBtn) {
        nftDetailBuyBtn.onclick = async () => {
            if (!walletPublicKey) {
                showNotification('Please connect your wallet to buy an NFT.', 'warning');
                return;
            }
            if (!currentOpenNft || currentOpenNft.owner === walletPublicKey.toBase58()) {
                showNotification('You cannot buy your own NFT or NFT data is missing.', 'warning');
                return;
            }
            if (!currentOpenNft.isListed || !currentOpenNft.price) {
                showNotification('This NFT is no longer listed for sale.', 'error');
                return;
            }
            if (!connection) {
                showNotification('Solana connection not established. Please connect your wallet again.', 'error');
                return;
            }

            try {
                showNotification(`Buying ${currentOpenNft.name} for ${currentOpenNft.price} SOL...`, 'info', 5000);

                const response = await fetch(`${API_BASE_URL}/api/nfts/buy`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        mintAddress: currentOpenNft.mint,
                        buyerWallet: walletPublicKey.toBase58(),
                        sellerWallet: currentOpenNft.owner,
                        price: currentOpenNft.price
                    }),
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || `HTTP error during purchase: ${response.status}`);
                }
                const transactionData = await response.json();

                const transaction = SolanaWeb3.Transaction.from(Buffer.from(transactionData.serializedTransaction, 'base64'));
                transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
                transaction.feePayer = walletPublicKey;

                const signature = await provider.sendAndConfirm(transaction);
                console.log("NFT purchase successful:", signature);

                showNotification(`Successfully purchased ${currentOpenNft.name}!`, 'success', 5000);
                nftDetailsModal.style.display = 'none';
                await loadMarketplaceNFTs();
                await loadUserNFTs(walletPublicKey.toBase58());
                await updateSwapBalances(); // SOL balance might change
                currentOpenNft = null;
            } catch (error) {
                console.error('Error purchasing NFT:', error);
                showNotification(`Failed to purchase NFT: ${error.message}`, 'error');
            }
        };
    }

    // NFT Sell button handler (direct link to list form)
    if (nftDetailSellBtn) {
        nftDetailSellBtn.onclick = () => {
            if (currentOpenNft && nftToSellSelect) {
                document.getElementById('nftToSell').value = currentOpenNft.mint;
            }
            closeAllPopups();
            const nftSection = document.getElementById('nft-section');
            if (nftSection) nftSection.scrollIntoView({ behavior: 'smooth' });
        };
    }

    // NFT Transfer button handler
    if (nftDetailTransferBtn) {
        nftDetailTransferBtn.onclick = async () => {
            if (!walletPublicKey) {
                showNotification('Please connect your wallet to transfer an NFT.', 'warning');
                return;
            }
            if (!currentOpenNft || currentOpenNft.owner !== walletPublicKey.toBase58()) {
                showNotification('You are not the owner of this NFT to transfer it, or NFT data is missing.', 'warning');
                return;
            }
            if (!connection) {
                showNotification('Solana connection not established. Please connect your wallet again.', 'error');
                return;
            }

            const recipientAddress = prompt("Enter the recipient's public address for the NFT:");
            if (!recipientAddress) {
                showNotification('Transfer cancelled. Recipient address not provided.', 'info');
                return;
            }
            let recipientPublicKey;
            try {
                recipientPublicKey = new SolanaWeb3.PublicKey(recipientAddress);
            } catch (e) {
                showNotification('Invalid recipient address.', 'error');
                return;
            }

            try {
                showNotification(`Transferring ${currentOpenNft.name} to ${recipientAddress}...`, 'info', 5000);

                const ownerTokenAccounts = await connection.getParsedTokenAccountsByOwner(
                    walletPublicKey,
                    { mint: new SolanaWeb3.PublicKey(currentOpenNft.mint) }
                );

                if (!ownerTokenAccounts.value || ownerTokenAccounts.value.length === 0) {
                    throw new Error("Could not find NFT token account for owner.");
                }
                const sourceTokenAccount = ownerTokenAccounts.value[0].pubkey;

                const destinationTokenAccount = await SolanaToken.getAssociatedTokenAddress(
                    new SolanaWeb3.PublicKey(currentOpenNft.mint),
                    recipientPublicKey
                );

                let instructions = [];
                const destAccountInfo = await connection.getAccountInfo(destinationTokenAccount);
                if (!destAccountInfo) {
                    instructions.push(
                        SolanaToken.createAssociatedTokenAccountInstruction(
                            walletPublicKey,
                            destinationTokenAccount,
                            recipientPublicKey,
                            new SolanaWeb3.PublicKey(currentOpenNft.mint),
                            SolanaToken.TOKEN_PROGRAM_ID,
                            SolanaWeb3.SystemProgram.programId
                        )
                    );
                }

                instructions.push(
                    SolanaToken.createTransferInstruction(
                        sourceTokenAccount,
                        destinationTokenAccount,
                        walletPublicKey,
                        1,
                        [],
                        SolanaToken.TOKEN_PROGRAM_ID
                    )
                );

                const transaction = new SolanaWeb3.Transaction().add(...instructions);
                transaction.feePayer = walletPublicKey;
                transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

                const signature = await provider.sendAndConfirm(transaction);
                console.log("NFT transfer successful:", signature);

                showNotification(`NFT ${currentOpenNft.name} successfully transferred!`, 'success', 5000);
                nftDetailsModal.style.display = 'none';
                await loadUserNFTs(walletPublicKey.toBase58());
                await loadMarketplaceNFTs();
                currentOpenNft = null;
            } catch (error) {
                console.error('Error transferring NFT:', error);
                showNotification(`Failed to transfer NFT: ${error.message}`, 'error');
            }
        };
    }

    // --- Contract Address Copy Functionality ---
    const copyButtons = document.querySelectorAll('.copy-btn');
    copyButtons.forEach(button => {
        button.addEventListener('click', function() {
            const textToCopyElement = this.previousElementSibling;
            if (textToCopyElement && textToCopyElement.classList.contains('highlight-text')) {
                const textToCopy = textToCopyElement.textContent;
                navigator.clipboard.writeText(textToCopy).then(() => {
                    showNotification('Text copied to clipboard!', 'info', 2000);
                    const originalText = button.textContent;
                    button.textContent = 'Copied!';
                    setTimeout(() => {
                        button.textContent = originalText;
                    }, 2000);
                }).catch(err => {
                    console.error('Failed to copy text: ', err);
                    showNotification('Failed to copy text.', 'error');
                });
            } else {
                console.warn('Target element for copying not found.');
            }
        });
    });

    // --- SWAP SECTION EVENT HANDLERS ---
    swapDirectionBtn.addEventListener('click', () => {
        const fromVal = swapFromTokenSelect.value;
        const toVal = swapToTokenSelect.value;

        swapFromTokenSelect.value = toVal;
        swapToTokenSelect.value = fromVal;

        // Optionally swap amounts, but it's often better to re-fetch quote
        // const tempFromAmount = swapFromAmountInput.value;
        // swapFromAmountInput.value = swapToAmountInput.value;

        updateSwapBalances();
        currentQuote = null;
        executeSwapBtn.style.display = 'none';
        swapToAmountInput.value = '';
    });

    swapFromAmountInput.addEventListener('input', () => {
        currentQuote = null;
        executeSwapBtn.style.display = 'none';
        swapToAmountInput.value = '';
    });

    swapFromTokenSelect.addEventListener('change', () => {
        updateSwapBalances();
        currentQuote = null;
        executeSwapBtn.style.display = 'none';
        swapToAmountInput.value = '';
    });

    swapToTokenSelect.addEventListener('change', () => {
        currentQuote = null;
        executeSwapBtn.style.display = 'none';
        swapToAmountInput.value = '';
    });

    getQuoteBtn.addEventListener('click', getQuote);
    executeSwapBtn.addEventListener('click', executeSwap);

    maxAmountBtns.forEach(button => {
        button.addEventListener('click', async (event) => {
            const inputId = event.target.dataset.inputId;
            const inputElement = document.getElementById(inputId);

            if (!walletPublicKey) {
                showNotification('Please connect your wallet to use MAX.', 'warning');
                return;
            }
            if (!connection) {
                showNotification('Solana connection not established. Please connect your wallet again.', 'error');
                return;
            }

            const fromTokenMint = TOKEN_MINT_ADDRESSES[swapFromTokenSelect.value];

            if (fromTokenMint.toBase58() === TOKEN_MINT_ADDRESSES['SOL'].toBase58()) {
                const solBalance = await connection.getBalance(walletPublicKey);
                const maxSol = (solBalance / SolanaWeb3.LAMPORTS_PER_SOL) - 0.005; // Leave 0.005 SOL for fees
                inputElement.value = Math.max(0, maxSol).toFixed(4);
            } else {
                try {
                    const tokenAccount = await connection.getParsedTokenAccountsByOwner(
                        walletPublicKey,
                        { mint: fromTokenMint }
                    );
                    if (tokenAccount.value.length > 0) {
                        const amount = tokenAccount.value[0].account.data.parsed.info.tokenAmount.amount;
                        const decimals = tokenAccount.value[0].account.data.parsed.info.tokenAmount.decimals;
                        inputElement.value = formatBigInt(new BN(amount), decimals);
                    } else {
                        inputElement.value = '0';
                    }
                } catch (error) {
                    console.error('Error getting max token balance:', error);
                    showNotification('Error getting maximum balance.', 'error');
                    inputElement.value = '0';
                }
            }
            currentQuote = null;
            executeSwapBtn.style.display = 'none';
            swapToAmountInput.value = '';
        });
    });

    // --- DAO/Proposal Modals ---
    const createProposalBtn = document.getElementById('createProposalBtn');
    if (createProposalBtn) {
        createProposalBtn.addEventListener('click', () => {
            if (createProposalModal) {
                closeAllPopups();
                createProposalModal.style.display = 'flex';
            }
        });
    }

    // --- Mint NFT Open Modal Button ---
    const mintNftOpenBtn = document.getElementById('mintNftOpenBtn');
    if (mintNftOpenBtn) {
        mintNftOpenBtn.addEventListener('click', () => {
            if (mintNftModal) {
                closeAllPopups();
                mintNftModal.style.display = 'flex';
            }
        });
    }

    // --- Contact Form Validation ---
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const name = document.getElementById('contact-name').value.trim();
            const email = document.getElementById('contact-email').value.trim();
            const subject = document.getElementById('contact-subject').value.trim();
            const message = document.getElementById('contact-message').value.trim();

            let isValid = true;
            let errorMessage = '';

            if (name === '') {
                isValid = false;
                errorMessage += 'Name is required.\n';
            }
            if (email === '') {
                isValid = false;
                errorMessage += 'Email address is required.\n';
            } else if (!/\S+@\S+\.\S+/.test(email)) {
                isValid = false;
                errorMessage += 'Please enter a valid email address.\n';
            }
            if (message === '') {
                isValid = false;
                errorMessage += 'Message is required.\n';
            }

            if (isValid) {
                console.log('Form data:', { name, email, subject, message });
                showNotification('Message sent successfully!', 'success');
                contactForm.reset();
            } else {
                showNotification(`Validation error:\n${errorMessage}`, 'error', 5000);
            }
        });
    }

    // --- Initial Data Loads on Page Ready & Auto-Connect ---
    await loadAnnouncements();
    await loadGames();
    await loadAds();
    await loadMarketplaceNFTs();

    // Attempt to auto-connect wallet if already authorized (Phantom's behavior)
    try {
        const selectedWallet = wallets[0];
        if (selectedWallet && selectedWallet.connected && selectedWallet.publicKey) {
            walletPublicKey = selectedWallet.publicKey;
            provider = selectedWallet;
            connection = new SolanaWeb3.Connection(SolanaWeb3.clusterApiUrl(network), 'confirmed');

            updateWalletUI(walletPublicKey.toBase58());
            await loadUserNFTs(walletPublicKey.toBase58());
            await updateStakingUI();
            await updateSwapBalances();
            registerProviderListeners();
            showNotification('Wallet automatically connected!', 'success');
        } else {
            // If not auto-connected, ensure UI reflects disconnected state
            handleWalletDisconnect();
        }
    } catch (e) {
        console.warn("Auto-connect failed or wallet not found/authorized:", e);
        showNotification(`Auto-connect failed: ${e.message || e}`, 'error');
        handleWalletDisconnect();
    }
});
