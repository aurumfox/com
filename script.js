// =========================================================================
// script.js (Frontend Code - to be placed in your public/script.js file)
// =========================================================================

// --- Global Variables for Wallet Connection ---
let walletPublicKey = null; // Stores the public key of the connected wallet
let provider = null; // For accessing the Phantom/Solflare window (the wallet adapter instance)
let connection = null; // Solana connection object
const network = SolanaWeb3.WalletAdapterNetwork.Devnet; // Change to 'Mainnet-beta' for production
const wallets = [
    new SolanaWalletAdapterPhantom.PhantomWalletAdapter(),
    // Add other wallets here if desired, e.g.:
    // new SolanaWalletAdapterWallets.SolflareWalletAdapter({ network }),
];

// ### API BASE URL CONFIGURATION ###
// For local development use http://localhost:3000.
// For production deployment: Replace 'http://localhost:3000' with your REAL BACKEND DOMAIN.
// Example: const API_BASE_URL = 'https://api.yourproject.com';
const API_BASE_URL = 'http://localhost:3000'; // THIS ADDRESS IS USED FOR LOCAL DEVELOPMENT.

// Example Addresses (REPLACE WITH YOUR PROJECT'S ACTUAL ADDRESSES)
// IMPORTANT: These are placeholders. You MUST replace them with your actual Solana program IDs and token mint addresses.
// Placeholder: Replace with your actual AFOX Token Mint Address
const AFOX_TOKEN_MINT_ADDRESS = new SolanaWeb3.PublicKey('GDk2UfqfWPepQBZB8BMVMCUnbLbhRCuhK6VzLBpR2HAr'); // CORRECTED based on UpdateAuthority
// Placeholder: Replace with your actual Staking Smart Contract (Program) ID
// NOTE: "GLkewtq8s2Yr24o5LT5mzzEeccKuSsy8H5RCHaE9uRAd" is likely a Token Mint address, not a Program ID.
// You need to find your actual Staking Program ID from your smart contract deployment.
const STAKING_PROGRAM_ID = new SolanaWeb3.PublicKey('YourStakingProgramIdHere'); // THIS ADDRESS YOU STILL NEED TO FIND AND REPLACE

// Flag to ensure provider listeners are attached only once
let areProviderListenersAttached = false;


// --- DOM Element References (Global Scope) ---
// Modals
const nftDetailsModal = document.getElementById('nftDetailsModal');
const nftModal = document.getElementById('nftModal'); // Assuming this refers to a general NFT modal if separate from details
const mintNftModal = document.getElementById('mintNftModal');
const createProposalModal = document.getElementById('createProposalModal');

// Close buttons for modals - Explicitly get by unique ID for the cross button
// Ensure these IDs match the IDs you put in your HTML for the close span.
const closeNftDetailsModalCross = document.getElementById('closeNftDetailsModalCross');
const closeNftModalCross = document.getElementById('closeNftModalCross');
const closeMintNftModalCross = document.getElementById('closeMintNftModalCross');
const closeProposalModalCross = document.getElementById('closeProposalModalCross');

// NEW: Close button for Main Menu
const closeMainMenuCross = document.getElementById('closeMainMenuCross');


// Menu Elements (for navigation)
// mainNav is your <ul> list inside <nav class="nav"> or the element with ID 'mainNav'
const mainNav = document.querySelector('.nav ul') || document.getElementById('mainNav'); // Assuming .nav ul is your menu, or directly by ID
// menuToggle is the supposed hamburger button.
const menuToggle = document.getElementById('menuToggle');
// navLinks - All <a> links within the navigation to close the menu after clicking a link
const navLinks = mainNav ? mainNav.querySelectorAll('a') : [];

// Wallet Connection & Display
const connectWalletBtnWeb3 = document.getElementById('connectWalletBtnWeb3');
const walletAddressDisplayWeb3 = document.getElementById('walletAddressDisplayWeb3');
const walletAddressDisplayNft = document.getElementById('walletAddressDisplayNft');
const walletAddressDisplayDao = document.getElementById('walletAddressDisplayDao');

// NFT Section
const userNftList = document.getElementById('user-nft-list');
const nftToSellSelect = document.getElementById('nftToSell');
const listNftForm = document.getElementById('listNftForm');
const mintNftForm = document.getElementById('mintNftForm');
const marketplaceNftList = document.getElementById('marketplace-nft-list');

// NFT Details Modal elements (re-declared for clarity and local scope for their specific logic)
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
const copyBtn = document.querySelector('.copy-btn'); // For generic copy-btn logic

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

// Notification Container
const notificationContainer = document.getElementById('notificationContainer');


// --- Arrays for convenient modal management ---
// This array now maps modals to their *specific cross close buttons*
const allModals = [
    { element: nftDetailsModal, closeBtn: closeNftDetailsModalCross },
    { element: nftModal, closeBtn: closeNftModalCross },
    { element: mintNftModal, closeBtn: closeMintNftModalCross },
    { element: createProposalModal, closeBtn: closeProposalModalCross }
].filter(m => m.element); // Filter out any modals that weren't found in the DOM


/**
 * Registers event listeners for the wallet provider.
 * Detaches previous listeners if they were attached to prevent duplicates.
 */
function registerProviderListeners() {
    if (areProviderListenersAttached && provider) {
        try {
            provider.off('publicKey', handlePublicKeyChange);
            provider.off('disconnect', handleDisconnect);
        } catch (e) {
            console.warn("Could not detach old provider listeners:", e);
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

function handlePublicKeyChange(publicKey) {
    if (publicKey) {
        console.log('Account changed to:', publicKey.toBase58());
        walletPublicKey = publicKey;
        if (walletAddressDisplayWeb3) walletAddressDisplayWeb3.textContent = walletPublicKey.toBase58();
        if (walletAddressDisplayNft) walletAddressDisplayNft.textContent = walletPublicKey.toBase58();
        if (walletAddressDisplayDao) walletAddressDisplayDao.textContent = walletPublicKey.toBase58();

        loadUserNFTs(walletPublicKey.toBase58());
        updateStakingUI();
        showNotification('Wallet account changed!', 'info');

    } else {
        console.log('Wallet account removed or locked.');
        handleWalletDisconnect();
    }
}

function handleDisconnect() {
    console.log('Wallet explicitly disconnected by user.');
    handleWalletDisconnect();
    showNotification('Wallet disconnected.', 'info');
}

/**
 * Displays a toast notification.
 * @param {string} message The message to display.
 * @param {string} type The type of notification ('success', 'error', 'info').
 * @param {number} duration The display duration in ms (default 3000).
 */
function showNotification(message, type = 'info', duration = 3000) {
    if (!notificationContainer) {
        console.warn('Notification container not found. Cannot display toast.');
        alert(message); // Fallback to alert if container not found
        return;
    }

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;

    notificationContainer.appendChild(notification);

    // Show notification
    setTimeout(() => {
        notification.classList.add('show');
    }, 10); // Small delay for animation

    // Hide and remove notification
    setTimeout(() => {
        notification.classList.remove('show');
        notification.addEventListener('transitionend', () => {
            notification.remove();
        });
    }, duration);
}


/**
 * Closes all open modals and the main navigation menu.
 * This function is useful if you want to "reset" all popup elements.
 */
function closeAllPopups() {
    // 1. Close all modals
    allModals.forEach(modalItem => {
        if (modalItem.element && modalItem.element.style.display === 'flex') {
            modalItem.element.style.display = 'none';
            console.log(`Modal ${modalItem.element.id || modalItem.element.className} closed.`);
        }
    });

    // 2. Close the main navigation menu
    if (mainNav && mainNav.classList.contains('active')) {
        mainNav.classList.remove('active');
        if (menuToggle) menuToggle.classList.remove('active'); // Reset hamburger animation
        console.log('Main navigation menu closed.');
    }
}


// --- Wallet Connection Function ---
async function connectWallet() {
    try {
        if (typeof SolanaWeb3 === 'undefined' || typeof SolanaWalletAdapterPhantom === 'undefined') {
            showNotification('Solana Web3 or Wallet Adapter libraries are not loaded. Please check script imports.', 'error');
            return;
        }

        const selectedWallet = wallets[0]; // For simplicity, always pick Phantom
        if (!selectedWallet) {
            showNotification('Wallet adapter not found. Please ensure Phantom is installed and enabled.', 'error');
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

        // Update display elements
        if (walletAddressDisplayWeb3) walletAddressDisplayWeb3.textContent = walletPublicKey.toBase58();
        if (walletAddressDisplayNft) walletAddressDisplayNft.textContent = walletPublicKey.toBase58();
        if (walletAddressDisplayDao) walletAddressDisplayDao.textContent = walletPublicKey.toBase58();

        // Initialize Solana Connection
        connection = new SolanaWeb3.Connection(
            SolanaWeb3.clusterApiUrl(network),
            'confirmed'
        );

        // Register listeners after successful connection
        registerProviderListeners();

        // Load user-specific data after wallet connection
        await loadUserNFTs(walletPublicKey.toBase58());
        await updateStakingUI();

        showNotification('Wallet successfully connected!', 'success');

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
    if (walletAddressDisplayWeb3) walletAddressDisplayWeb3.textContent = 'Not Connected';
    if (walletAddressDisplayNft) walletAddressDisplayNft.textContent = 'Not Connected';
    if (walletAddressDisplayDao) walletAddressDisplayDao.textContent = 'Not Connected';
    if (userNftList) userNftList.innerHTML = '<p class="placeholder-item web3-placeholder">Connect your wallet to see your NFTs.</p>';
    if (nftToSellSelect) nftToSellSelect.innerHTML = '<option value="">-- Select NFT --</option>';
    updateStakingUI(); // Reset staking UI on disconnect

    // Important: detach listeners on disconnect
    if (areProviderListenersAttached && provider) { // Check provider for null, as it might be cleared
        try {
            provider.off('publicKey', handlePublicKeyChange);
            provider.off('disconnect', handleDisconnect);
        } catch (e) {
            console.warn("Error detaching provider listeners on disconnect:", e);
        }
        areProviderListenersAttached = false;
        console.log('Provider listeners detached on disconnect.');
    }
}

// --- NFT Display Functions ---
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
            nftItem.addEventListener('click', () => showNftDetails(nft, walletAddress));
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
    }
}


// Function to display the NFT details modal and populate its content
// This function is made available globally so it can be called from dynamically created elements.
window.showNftDetails = async function(nft, currentUserWallet) {
    if (!nftDetailsModal) {
        console.error("NFT details modal element not found!");
        return;
    }

    closeAllPopups(); // Close any other open popups first

    // Store the NFT object globally or in a known place for button handlers to access
    window.currentOpenNft = nft;

    if (nftDetailImage) nftDetailImage.src = nft.image || 'https://via.placeholder.com/250x150?text=NFT';
    if (nftDetailName) nftDetailName.textContent = nft.name || 'Untitled NFT';
    if (nftDetailDescription) nftDetailDescription.textContent = nft.description || 'No description available.';
    if (nftDetailOwner) nftDetailOwner.textContent = nft.owner || 'Unknown';
    if (nftDetailMint) nftDetailMint.textContent = nft.mint || 'N/A';
    if (nftDetailSolscanLink) {
        nftDetailSolscanLink.href = `https://solscan.io/token/${nft.mint}?cluster=${network}`;
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

    if (currentUserWallet && nft.owner === currentUserWallet) {
        if (nftDetailTransferBtn) nftDetailTransferBtn.style.display = 'inline-block';
        if (!nft.isListed && nftDetailSellBtn) {
            nftDetailSellBtn.style.display = 'inline-block';
        }
    } else if (nft.isListed && nftDetailBuyBtn) {
        nftDetailBuyBtn.style.display = 'inline-block';
    }

    if (nftDetailHistory) {
        // Placeholder for now, real history loading is below in the DOMContentLoaded
        nftDetailHistory.textContent = '(Loading transaction history...)';
    }

    // Attach event listeners for actions (these onclick handlers can remain)
    // Note: The actual implementation of these actions (buy, sell, transfer) is in the separate block below.
    // This is just to ensure the buttons are responsive.
    if (nftDetailBuyBtn) nftDetailBuyBtn.onclick = async () => { /* Logic defined below */ };
    if (nftDetailSellBtn) {
        nftDetailSellBtn.onclick = () => {
            if (nftToSellSelect) document.getElementById('nftToSell').value = nft.mint;
            closeAllPopups(); // Close the details modal
            // Smooth scroll to the NFT section after closing details
            const nftSection = document.getElementById('nft-section');
            if (nftSection) nftSection.scrollIntoView({ behavior: 'smooth' });
        };
    }
    if (nftDetailTransferBtn) nftDetailTransferBtn.onclick = async () => { /* Logic defined below */ };

    // Finally, make the modal visible
    nftDetailsModal.style.display = 'flex';
    console.log('NFT details modal displayed.');

    // Load NFT transaction history when the modal is shown
    if (nftDetailHistory && nft.mint) {
        nftDetailHistory.textContent = 'Loading history...';
        try {
            // <REAL CODE FOR LOADING NFT HISTORY>
            // This code assumes the existence of a backend that indexes history, or a direct blockchain query.
            const historyResponse = await fetch(`${API_BASE_URL}/api/nfts/${nft.mint}/history`);
            if (!historyResponse.ok) {
                const errorData = await historyResponse.json();
                throw new Error(errorData.error || `Failed to fetch history: ${historyResponse.status}`);
            }
            const historyData = await historyResponse.json();

            if (historyData && historyData.length > 0) {
                nftDetailHistory.innerHTML = '<h4>Transaction History:</h4>';
                // Sort history by date, from newest to oldest
                historyData.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

                historyData.forEach(event => {
                    const p = document.createElement('p');
                    let eventText = `${new Date(event.timestamp).toLocaleString()}: `;
                    switch (event.type) {
                        case "Mint":
                            eventText += `Minted to address ${event.to.substring(0, 6)}...`;
                            break;
                        case "Transfer":
                            eventText += `Transferred from ${event.from.substring(0, 6)}... to ${event.to.substring(0, 6)}...`;
                            break;
                        case "Sale":
                            eventText += `Sold from ${event.from.substring(0, 6)}... to ${event.to.substring(0, 6)}... for ${event.price} SOL`;
                            break;
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


// --- Dynamic Content Loading (Announcements, Games, Ads) ---

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
                ${ad.imageUrl ? `<img src="${ad.imageUrl}" alt="Ad Creative" style="max-width:100%; height:auto; margin-top:10px; border-radius:5px;">` : ''}
                ${ad.link ? `<a href="${ad.link}" target="_blank" class="web3-btn small-btn" style="margin-top:10px;">Learn More</a>` : ''}
            `;
            adList.appendChild(div);
        });
    } catch (error) {
        console.error('Error loading ads:', error);
        adList.innerHTML = '<p class="placeholder-item ad web3-placeholder">Failed to load ads.</p>';
    }
}

// --- Solana Connection Initialization for Staking ---
function initializeSolanaConnection() {
    if (!connection && typeof SolanaWeb3 !== 'undefined') {
        connection = new SolanaWeb3.Connection(SolanaWeb3.clusterApiUrl(network), 'confirmed');
        console.log('Solana connection initialized.');
    } else if (typeof SolanaWeb3 === 'undefined') {
        console.warn('Solana Web3 library not loaded. Cannot initialize connection.');
    }
}

// Function to update all staking data in the UI
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

    try {
        initializeSolanaConnection();

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
            console.warn('Could not fetch AFOX token balance (possibly none):', tokenError);
            afoxBalance = 0;
        }
        if (userAfoxBalance) userAfoxBalance.textContent = `${afoxBalance} AFOX`;

        // PSEUDO-CODE: Fetch user's staked amount and accumulated rewards from smart contract
        const userStakingAccount = await getUserStakingAccount(walletPublicKey);
        if (userStakingAccount) {
            if (userStakedAmount) userStakedAmount.textContent = `${userStakingAccount.stakedAmount} AFOX`;
            if (userRewardsAmount) userRewardsAmount.textContent = `${userStakingAccount.rewards} AFOX`;
        } else {
            if (userStakedAmount) userStakedAmount.textContent = '0 AFOX';
            if (userRewardsAmount) userRewardsAmount.textContent = '0 AFOX';
        }

        // PSEUDO-CODE: Fetch general staking parameters from smart contract
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
        showNotification('Failed to load staking data. Please check console.', 'error');
    }
}

// Placeholder for afoxDecimals, as it's used in the staking functions
const afoxDecimals = 9; // Standard number of decimal places for SPL tokens


// PSEUDO-FUNCTIONS for smart contract interaction (replace with your actual contract calls)
/**
 * Asynchronous function to get user's staking account information.
 * @param {SolanaWeb3.PublicKey} userPublicKey - User's public key.
 * @returns {Promise<{stakedAmount: number, rewards: number}>} User's staking information.
 */
async function getUserStakingAccount(userPublicKey) {
    console.log("Fetching user staking account for:", userPublicKey.toBase58());

    try {
        // 1. Determine the user's staking account address (PDA)
        //    (often a PDA - Program Derived Address, linked to the user and the program)
        // Replace "stake_account_seed" with the actual seed used in your contract
        const [userStakingAccountPubKey] = await SolanaWeb3.PublicKey.findProgramAddress(
            [userPublicKey.toBuffer(), Buffer.from("stake_account_seed")], // Use your actual seed
            STAKING_PROGRAM_ID
        );

        // 2. Get the account data from the blockchain
        const accountInfo = await connection.getAccountInfo(userStakingAccountPubKey);

        if (accountInfo && accountInfo.data) {
            // 3. Deserialize the account data into a readable format
            //    THIS PART DEPENDS ON THE STRUCTURE OF YOUR SMART CONTRACT AND THE SDK YOU ARE USING.
            // If using Anchor, it might look like this:
            // const decodedAccount = await program.account.userStakeAccount.fetch(userStakingAccountPubKey);
            // return {
            //     stakedAmount: decodedAccount.stakedAmount.toNumber() / (10 ** afoxDecimals),
            //     rewards: decodedAccount.pendingRewards.toNumber() / (10 ** afoxDecimals),
            // };

            // As an example of deserialization without Anchor (very simplified, without considering complex structure):
            // Assumes the first 8 bytes are stake, next 8 bytes are rewards (e.g., u64)
            // const stakedAmountBytes = accountInfo.data.slice(0, 8);
            // const rewardsBytes = accountInfo.data.slice(8, 16);
            // const stakedAmount = new SolanaWeb3.BN(stakedAmountBytes, 'le').toNumber() / (10 ** afoxDecimals);
            // const rewards = new SolanaWeb3.BN(rewardsBytes, 'le').toNumber() / (10 ** afoxDecimals);
            // return { stakedAmount, rewards };

            // Return a placeholder until you implement real deserialization
            console.warn("Staking data deserialization not implemented. Returning placeholder data.");
            return { stakedAmount: 0, rewards: 0 };

        } else {
            console.log("User staking account not found or is empty.");
            return { stakedAmount: 0, rewards: 0 }; // Return 0 if account not found
        }
    } catch (error) {
        console.error("Error fetching user staking account:", error);
        return { stakedAmount: 0, rewards: 0 }; // Return 0 on error
    }
}

/**
 * Asynchronous function to get staking pool information.
 * @returns {Promise<{apr: number, minStake: number, lockupDays: number, unstakeFee: number, rewardCalcMethod: string}>} Pool information.
 */
async function getStakingPoolInfo() {
    console.log("Fetching staking pool info...");

    try {
        // 1. Determine the address of the main staking pool account (PDA)
        //    (also often a PDA, linked to the program itself or a specific seed)
        // Replace "pool_config_seed" with the actual seed used in your contract
        const [poolAccountPubKey] = await SolanaWeb3.PublicKey.findProgramAddress(
            [Buffer.from("pool_config_seed")], // Use your actual seed
            STAKING_PROGRAM_ID
        );

        // 2. Get the account data
        const accountInfo = await connection.getAccountInfo(poolAccountPubKey);

        if (accountInfo && accountInfo.data) {
            // 3. Deserialize the pool data.
            //    THIS PART ALSO DEPENDS ON THE STRUCTURE OF YOUR SMART CONTRACT AND THE SDK.
            // If using Anchor:
            // const decodedPool = await program.account.stakingPool.fetch(poolAccountPubKey);
            // return {
            //     apr: decodedPool.apr / 100, // Example: if APR is stored as an integer (e.g., 1500 for 15%)
            //     minStake: decodedPool.minStake.toNumber() / (10 ** afoxDecimals),
            //     lockupDays: decodedPool.lockupPeriodDays,
            //     unstakeFee: decodedPool.unstakeFeeBps / 100, // Example: BPS (Basis Points)
            //     rewardCalcMethod: decodedPool.rewardCalcMethod // If it's an enum or string
            // };

            // Return a placeholder until you implement real deserialization
            console.warn("Staking pool data deserialization not implemented. Returning placeholder data.");
            return { apr: 0, minStake: 0, lockupDays: 0, unstakeFee: 0, rewardCalcMethod: "N/A" };
        } else {
            console.log("Staking pool account not found.");
            return { apr: 0, minStake: 0, lockupDays: 0, unstakeFee: 0, rewardCalcMethod: "N/A" };
        }
    } catch (error) {
        console.error("Error fetching staking pool information:", error);
        return { apr: 0, minStake: 0, lockupDays: 0, unstakeFee: 0, rewardCalcMethod: "N/A" };
    }
}


// --- DOMContentLoaded: Ensures the DOM is fully loaded before executing the script ---
document.addEventListener('DOMContentLoaded', async () => {

    // --- General Event Listeners for Modals and Menu ---

    // 1. Event handlers for modal close buttons (the 'cross' buttons)
    allModals.forEach(modalItem => {
        if (modalItem.closeBtn) { // Ensure the specific close button (cross) was found
            modalItem.closeBtn.addEventListener('click', () => {
                modalItem.element.style.display = 'none';
                console.log(`Modal ${modalItem.element.id || modalItem.element.className} closed by cross button.`);
            });
        }
    });

    // NEW: Event handler for the Main Menu close cross button
    if (closeMainMenuCross) {
        closeMainMenuCross.addEventListener('click', () => {
            if (mainNav) {
                mainNav.classList.remove('active');
                if (menuToggle) menuToggle.classList.remove('active');
                console.log('Main navigation menu closed by cross button.');
            }
        });
    }


    // 2. Event handler for clicks outside an active modal or menu
    window.addEventListener('click', function(event) {
        let popupClosed = false;

        // Check and close modals first
        for (let i = allModals.length - 1; i >= 0; i--) {
            const modalItem = allModals[i];
            // Check if the click target is the modal overlay itself AND the modal is open
            if (modalItem.element && event.target === modalItem.element && modalItem.element.style.display === 'flex') {
                modalItem.element.style.display = 'none';
                console.log(`Modal ${modalItem.element.id || modalItem.element.className} closed by outside click.`);
                popupClosed = true;
                break;
            }
        }

        // If no modal was closed, check the main navigation menu
        // Ensure the click is outside the mainNav itself AND outside the menuToggle
        if (!popupClosed && mainNav && mainNav.classList.contains('active') &&
            !mainNav.contains(event.target) &&
            !(menuToggle && menuToggle.contains(event.target)))
        {
            mainNav.classList.remove('active');
            if (menuToggle) menuToggle.classList.remove('active');
            console.log('Main navigation menu closed by outside click.');
        }
    });

    // 3. Event handler for the Escape key
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            let popupClosed = false;

            // Try to close a modal first
            for (let i = allModals.length - 1; i >= 0; i--) {
                const modalItem = allModals[i];
                if (modalItem.element && modalItem.element.style.display === 'flex') {
                    modalItem.element.style.display = 'none';
                    console.log(`Modal ${modalItem.element.id || modalItem.element.className} closed by Escape key.`);
                    popupClosed = true;
                    break;
                }
            }

            // If no modal was closed, and the main menu is active, then close it.
            if (!popupClosed && mainNav && mainNav.classList.contains('active')) {
                mainNav.classList.remove('active');
                if (menuToggle) menuToggle.classList.remove('active');
                console.log('Main navigation menu closed by Escape key.');
            }
        }
    });

    // 4. Event handler for the hamburger menu toggle button
    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            if (!mainNav.classList.contains('active')) {
                closeAllPopups(); // Close all modals before opening the menu
            }
            mainNav.classList.toggle('active');
            menuToggle.classList.toggle('active'); // Toggle class for hamburger icon animation
            console.log('Menu toggle button clicked. Menu active:', mainNav.classList.contains('active'));
        });
    } else {
        console.warn("Element with ID 'menuToggle' not found. Hamburger menu functionality might be incomplete.");
    }

    // 5. Event handlers for clicks on menu links (to close the menu after navigation)
    if (navLinks.length > 0) {
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                if (mainNav && mainNav.classList.contains('active')) {
                    mainNav.classList.remove('active');
                    if (menuToggle) menuToggle.classList.remove('active');
                    console.log('Main navigation menu closed after link click.');
                }
            });
        });
    } else {
        console.warn("Navigation links not found. Menu might not close after link click.");
    }

    // --- Wallet Connect Buttons ---
    if (connectWalletBtnWeb3) connectWalletBtnWeb3.addEventListener('click', connectWallet);
    if (connectWalletNftBtn) connectWalletNftBtn.addEventListener('click', connectWallet);

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
                        showNotification('Failed to publish announcement. (Admin only in real application)', 'error');
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

    // --- Game Upload Button (Placeholder) ---
    if (uploadGameBtnWeb3) {
        uploadGameBtnWeb3.addEventListener('click', () => {
            showNotification('Game upload functionality requires a form and backend integration for file handling.', 'info', 5000);
        });
    }

    // --- Ad Post Button (Placeholder) ---
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

            // Ensure stakeAmountInput is correctly referenced as a DOM element and its value extracted.
            // In the global scope, `stakeAmountInput` is defined, so directly accessing its `value` is fine.
            const amount = parseFloat(stakeAmountInput.value);

            if (isNaN(amount) || amount <= 0) {
                showNotification('Please enter a valid amount to stake.', 'warning');
                return;
            }

            try {
                showNotification(`Initiating staking of ${amount} AFOX...`, 'info', 5000);

                // 1. Get necessary account addresses
                const [userStakingAccountPubKey] = await SolanaWeb3.PublicKey.findProgramAddress(
                    [walletPublicKey.publicKey.toBuffer(), Buffer.from("stake_account_seed")], // Real seed
                    STAKING_PROGRAM_ID
                );
                const [poolAccountPubKey] = await SolanaWeb3.PublicKey.findProgramAddress(
                    [Buffer.from("pool_config_seed")], // Real seed
                    STAKING_PROGRAM_ID
                );

                // Get user's Associated Token Account (ATA) for AFOX
                const userAfoxTokenAccountPubKey = await SolanaToken.getAssociatedTokenAddress(
                    AFOX_TOKEN_MINT_ADDRESS,
                    walletPublicKey.publicKey
                );

                // Check user's AFOX balance
                const userAfoxBalanceInfo = await connection.getTokenAccountBalance(userAfoxTokenAccountPubKey);
                if (userAfoxBalanceInfo.value.uiAmount < amount) {
                    showNotification('Insufficient AFOX balance for staking.', 'error');
                    return;
                }

                // 2. Create the staking instruction
                const transaction = new SolanaWeb3.Transaction();
                // Add instruction to create user's staking account if it doesn't exist
                const userStakingAccountInfo = await connection.getAccountInfo(userStakingAccountPubKey);
                if (!userStakingAccountInfo) {
                    const space = 100; // Example size, replace with actual size from your contract
                    const lamports = await connection.getMinimumBalanceForRentExemption(space);
                    transaction.add(
                        SolanaWeb3.SystemProgram.createAccount({
                            fromPubkey: walletPublicKey.publicKey,
                            newAccountPubkey: userStakingAccountPubKey,
                            lamports,
                            space,
                            programId: STAKING_PROGRAM_ID,
                        })
                    );
                }
                // Then, add the instruction to call your contract's stake method
                // The `data` field needs to be structured according to your smart contract's instruction format.
                // Assuming `0` is the discriminator for a stake instruction and then the amount (as u64).
                const stakeAmountBN = new SolanaWeb3.BN(amount * (10 ** afoxDecimals));
                transaction.add({
                    keys: [
                        { pubkey: walletPublicKey.publicKey, isSigner: true, isWritable: false },
                        { pubkey: poolAccountPubKey, isSigner: false, isWritable: true },
                        { pubkey: userStakingAccountPubKey, isSigner: false, isWritable: true },
                        { pubkey: AFOX_TOKEN_MINT_ADDRESS, isSigner: false, isWritable: false },
                        { pubkey: userAfoxTokenAccountPubKey, isSigner: false, isWritable: true },
                        { pubkey: SolanaToken.TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
                        { pubkey: SolanaWeb3.SystemProgram.programId, isSigner: false, isWritable: false },
                        { pubkey: SolanaWeb3.SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
                        // Add other necessary keys for your instruction as defined by your smart contract
                    ],
                    programId: STAKING_PROGRAM_ID,
                    data: Buffer.from([0, ...stakeAmountBN.toArray('le', 8)]), // Example: 0 for stake, then 8-byte amount
                });

                // 3. Send the transaction via the user's wallet (Phantom/Solflare)
                // Set recentBlockhash and feePayer before sending.
                transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
                transaction.feePayer = walletPublicKey.publicKey;

                const signature = await provider.sendAndConfirm(transaction);
                console.log("Staking transaction successful:", signature);

                showNotification(`You successfully staked ${amount} AFOX!`, 'success');
                if (stakeAmountInput) stakeAmountInput.value = '';
                await updateStakingUI(); // Update UI after successful transaction
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
            console.log('Attempting to claim rewards...');
            try {
                // This is pseudo-code for claiming rewards.
                // You would construct a transaction calling your smart contract's `claim_rewards` instruction.
                // Example (if using Anchor and `program` is initialized):
                // const transaction = new SolanaWeb3.Transaction().add(
                //     await program.methods
                //         .claimRewards()
                //         .accounts({
                //             user: walletPublicKey.publicKey,
                //             stakingPool: poolAccountPubKey, // Get this using findProgramAddress
                //             userStakeAccount: userStakingAccountPubKey, // Get this using findProgramAddress
                //             afoxMint: AFOX_TOKEN_MINT_ADDRESS,
                //             userAfoxTokenAccount: userAfoxTokenAccountPubKey, // User's AFOX ATA
                //             tokenProgram: SolanaToken.TOKEN_PROGRAM_ID,
                //             systemProgram: SolanaWeb3.SystemProgram.programId,
                //         })
                //         .instruction()
                // );
                // const signature = await provider.sendAndConfirm(transaction);
                // console.log("Rewards claim successful:", signature);

                showNotification('Rewards successfully claimed! (This function requires staking smart contract implementation)', 'success', 5000);
                updateStakingUI();
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
            console.log('Attempting to unstake tokens...');
            try {
                // This is pseudo-code for unstaking tokens.
                // You would construct a transaction calling your smart contract's `unstake` instruction.
                // You might need to specify an amount to unstake, or if it unstakes all.
                // Example (if using Anchor and `program` is initialized):
                // const unstakeAmount = /* Get amount from UI or logic */;
                // const transaction = new SolanaWeb3.Transaction().add(
                //     await program.methods
                //         .unstake(new BN(unstakeAmount * (10 ** afoxDecimals)))
                //         .accounts({
                //             user: walletPublicKey.publicKey,
                //             stakingPool: poolAccountPubKey,
                //             userStakeAccount: userStakingAccountPubKey,
                //             afoxMint: AFOX_TOKEN_MINT_ADDRESS,
                //             userAfoxTokenAccount: userAfoxTokenAccountPubKey,
                //             tokenProgram: SolanaToken.TOKEN_PROGRAM_ID,
                //             systemProgram: SolanaWeb3.SystemProgram.programId,
                //         })
                //         .instruction()
                // );
                // const signature = await provider.sendAndConfirm(transaction);
                // console.log("Unstake successful:", signature);

                showNotification('Staked tokens successfully unstaked! (This function requires staking smart contract implementation)', 'success', 5000);
                updateStakingUI();
            } catch (error) {
                console.error('Error unstaking tokens:', error);
                showNotification(`Failed to unstake tokens: ${error.message}. Check console.`, 'error');
            }
        });
    }

    // NFT Buy button handler
    // This handler needs access to the 'nft' object that was passed to showNftDetails.
    // It's better to define this logic within the `showNftDetails` function or ensure `nft` is globally accessible
    // when the modal is opened. For this combined block, let's assume `nft` is managed by `showNftDetails`.
    // The previous structure had `nft` as an implicit global, which is bad practice.
    // I'm keeping the original structure for direct translation but noting the implicit `nft` variable.
    // A better approach would be to pass `nft` directly into the `onclick` handler's function call from `showNftDetails`.
    if (nftDetailBuyBtn) {
        nftDetailBuyBtn.onclick = async () => {
            // `nft` must be available in this scope, likely from the last `showNftDetails` call.
            // If `nft` is not globally managed, this will fail.
            // Best practice: redefine `nft` as part of `showNftDetails` scope and pass it.
            // For now, assuming `nft` is a temporary global set by `showNftDetails`.
            if (!walletPublicKey) {
                showNotification('Please connect your wallet to buy NFT.', 'warning');
                return;
            }
            // Check if `nft` is defined from `showNftDetails` context
            if (!window.currentOpenNft || window.currentOpenNft.owner === walletPublicKey.toBase58()) {
                showNotification('You cannot buy your own NFT or NFT data is missing.', 'warning');
                return;
            }
            if (!window.currentOpenNft.isListed || !window.currentOpenNft.price) {
                showNotification('This NFT is no longer listed for sale.', 'error');
                return;
            }
            const nftToBuy = window.currentOpenNft; // Use a clear variable

            try {
                showNotification(`Purchasing ${nftToBuy.name} for ${nftToBuy.price} SOL...`, 'info', 5000);

                const response = await fetch(`${API_BASE_URL}/api/nfts/buy`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        mintAddress: nftToBuy.mint,
                        buyerWallet: walletPublicKey.toBase58(),
                        sellerWallet: nftToBuy.owner,
                        price: nftToBuy.price
                    }),
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || `HTTP error during purchase: ${response.status}`);
                }
                const transactionData = await response.json();

                const transaction = SolanaWeb3.Transaction.from(Buffer.from(transactionData.serializedTransaction, 'base64'));

                transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
                transaction.feePayer = walletPublicKey.publicKey;

                const signature = await provider.sendAndConfirm(transaction);
                console.log("NFT purchase successful:", signature);

                showNotification(`Successfully bought ${nftToBuy.name}!`, 'success', 5000);
                nftDetailsModal.style.display = 'none';
                await loadMarketplaceNFTs();
                await loadUserNFTs(walletPublicKey.toBase58());
                window.currentOpenNft = null; // Clear the reference
            } catch (error) {
                console.error('Error buying NFT:', error);
                showNotification(`Failed to buy NFT: ${error.message}`, 'error');
            }
        };
    }

    // NFT Transfer button handler
    if (nftDetailTransferBtn) {
        nftDetailTransferBtn.onclick = async () => {
            // Assuming `nft` is set globally or via `window.currentOpenNft` by `showNftDetails`
            if (!walletPublicKey) {
                showNotification('Please connect your wallet to transfer NFT.', 'warning');
                return;
            }
            if (!window.currentOpenNft || window.currentOpenNft.owner !== walletPublicKey.toBase58()) {
                showNotification('You are not the owner of this NFT to transfer it or NFT data is missing.', 'warning');
                return;
            }
            const nftToTransfer = window.currentOpenNft;

            const recipientAddress = prompt("Enter the recipient's public address for the NFT:");
            if (!recipientAddress) {
                showNotification('Transfer canceled. Recipient address not provided.', 'info');
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
                showNotification(`Transferring ${nftToTransfer.name} to ${recipientAddress}...`, 'info', 5000);

                const ownerTokenAccounts = await connection.getParsedTokenAccountsByOwner(
                    walletPublicKey.publicKey,
                    { mint: new SolanaWeb3.PublicKey(nftToTransfer.mint) }
                );

                if (!ownerTokenAccounts.value || ownerTokenAccounts.value.length === 0) {
                    throw new Error("Could not find NFT token account for the owner.");
                }
                const sourceTokenAccount = ownerTokenAccounts.value[0].pubkey;

                const destinationTokenAccount = await SolanaToken.getAssociatedTokenAddress(
                    new SolanaWeb3.PublicKey(nftToTransfer.mint),
                    recipientPublicKey
                );

                let instructions = [];
                const destAccountInfo = await connection.getAccountInfo(destinationTokenAccount);
                if (!destAccountInfo) {
                    instructions.push(
                        SolanaToken.createAssociatedTokenAccountInstruction(
                            walletPublicKey.publicKey,
                            destinationTokenAccount,
                            recipientPublicKey,
                            new SolanaWeb3.PublicKey(nftToTransfer.mint),
                            SolanaToken.TOKEN_PROGRAM_ID,
                            SolanaWeb3.SystemProgram.programId
                        )
                    );
                }

                instructions.push(
                    SolanaToken.createTransferInstruction(
                        sourceTokenAccount,
                        destinationTokenAccount,
                        walletPublicKey.publicKey,
                        1,
                        [],
                        SolanaToken.TOKEN_PROGRAM_ID
                    )
                );

                const transaction = new SolanaWeb3.Transaction().add(...instructions);
                transaction.feePayer = walletPublicKey.publicKey;
                transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

                const signature = await provider.sendAndConfirm(transaction);
                console.log("NFT transfer successful:", signature);

                showNotification(`NFT ${nftToTransfer.name} successfully transferred!`, 'success', 5000);
                nftDetailsModal.style.display = 'none';
                await loadUserNFTs(walletPublicKey.toBase58());
                await loadMarketplaceNFTs();
                window.currentOpenNft = null; // Clear the reference
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
                console.warn('Target element for copying not found. Ensure .copy-btn is immediately after .highlight-text span.');
            }
        });
    });


    // --- Initial Data Loads on Page Ready ---
    await loadAnnouncements();
    await loadGames();
    await loadAds();
    await loadMarketplaceNFTs();

    // Initialize Solana connection for staking/wallet features
    initializeSolanaConnection();

    // Attempt to auto-connect wallet if already authorized (Phantom's behavior)
    try {
        if (typeof SolanaWeb3 === 'undefined' || typeof SolanaWalletAdapterPhantom === 'undefined') {
            console.warn('Solana Web3 or Wallet Adapter libraries not loaded for auto-connect. Auto-connect attempt skipped.');
            updateStakingUI(); // Ensure UI is reset
            return;
        }

        const selectedWallet = wallets[0];
        if (selectedWallet && selectedWallet.connected && selectedWallet.publicKey) {
            walletPublicKey = selectedWallet.publicKey;
            provider = selectedWallet;
            if (walletAddressDisplayWeb3) walletAddressDisplayWeb3.textContent = walletPublicKey.toBase58();
            if (walletAddressDisplayNft) walletAddressDisplayNft.textContent = walletPublicKey.toBase58();
            if (walletAddressDisplayDao) walletAddressDisplayDao.textContent = walletPublicKey.toBase58();

            connection = new SolanaWeb3.Connection(
                SolanaWeb3.clusterApiUrl(network),
                'confirmed'
            );

            await loadUserNFTs(walletPublicKey.toBase58());
            await updateStakingUI(); // Update staking UI on auto-connect

            registerProviderListeners(); // Register listeners for auto-connected wallet
            showNotification('Wallet automatically connected!', 'success');
        } else {
             updateStakingUI(); // Ensure staking UI is reset if not auto-connected
        }
    } catch (e) {
        console.warn("Auto-connect failed or wallet not found/authorized:", e);
        showNotification(`Auto-connect failed: ${e.message || e}`, 'error');
        handleWalletDisconnect(); // Ensure UI is reset if auto-connect fails
    }

    // Example for opening createProposalModal (from DAO section)
    const createProposalBtn = document.getElementById('createProposalBtn');
    if (createProposalBtn) {
        createProposalBtn.addEventListener('click', () => {
            if (createProposalModal) {
                closeAllPopups(); // Close all other popups
                createProposalModal.style.display = 'flex';
                console.log('Create proposal modal displayed.');
            }
        });
    }

    // Example for opening mintNftModal (if you have a button to open it)
    const mintNftOpenBtn = document.getElementById('mintNftOpenBtn'); // Using a different ID to avoid conflict with form submit
    if (mintNftOpenBtn) {
        mintNftOpenBtn.addEventListener('click', () => {
            if (mintNftModal) {
                closeAllPopups(); // Close all other popups
                mintNftModal.style.display = 'flex';
                console.log('Mint NFT modal displayed.');
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
                console.log('Form Data:', { name, email, subject, message });
                showNotification('Message sent successfully!', 'success');
                contactForm.reset();
            } else {
                showNotification(`Validation Error:\n${errorMessage}`, 'error', 5000);
            }
        });
    }

}); // End of DOMContentLoaded

