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

// Example Addresses (REPLACE WITH YOUR PROJECT'S ACTUAL ADDRESSES)
// IMPORTANT: These are placeholders. You MUST replace them with your actual Solana program IDs and token mint addresses.
// Placeholder: Replace with your actual AFOX Token Mint Address
const AFOX_TOKEN_MINT_ADDRESS = new SolanaWeb3.PublicKey('YourAFOXTokenMintAddressHere');
// Placeholder: Replace with your actual Staking Smart Contract (Program) ID
const STAKING_PROGRAM_ID = new SolanaWeb3.PublicKey('YourStakingProgramIdHere');

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
const connectWalletNftBtn = document.getElementById('connectWalletNftBtn');
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
        if (walletAddressDisplayNft) walletAddressDisplayNft.textContent = walletPublicKey.toBase58(); // Assuming this is correct
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
            showNotification('Solana Web3 или библиотеки Wallet Adapter не загружены. Пожалуйста, проверьте импорты скриптов.', 'error');
            return;
        }

        const selectedWallet = wallets[0]; // For simplicity, always pick Phantom
        if (!selectedWallet) {
            showNotification('Адаптер кошелька не найден. Пожалуйста, убедитесь, что Phantom установлен и включен.', 'error');
            return;
        }

        if (selectedWallet.connected && selectedWallet.publicKey) {
            walletPublicKey = selectedWallet.publicKey;
            provider = selectedWallet;
            console.log('Кошелек уже подключен:', walletPublicKey.toBase58());
        } else {
            await selectedWallet.connect();
            walletPublicKey = selectedWallet.publicKey;
            provider = selectedWallet;
            console.log('Кошелек подключен:', walletPublicKey.toBase58());
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

        showNotification('Кошелек успешно подключен!', 'success');

    } catch (error) {
        console.error('Не удалось подключить кошелек:', error);
        showNotification(`Не удалось подключить кошелек: ${error.message || error}`, 'error');
        handleWalletDisconnect();
    }
}

function handleWalletDisconnect() {
    walletPublicKey = null;
    provider = null;
    connection = null;
    if (walletAddressDisplayWeb3) walletAddressDisplayWeb3.textContent = 'Не подключено';
    if (walletAddressDisplayNft) walletAddressDisplayNft.textContent = 'Не подключено';
    if (walletAddressDisplayDao) walletAddressDisplayDao.textContent = 'Не подключено';
    if (userNftList) userNftList.innerHTML = '<p class="placeholder-item web3-placeholder">Подключите свой кошелек, чтобы увидеть свои NFT.</p>';
    if (nftToSellSelect) nftToSellSelect.innerHTML = '<option value="">-- Выберите NFT --</option>';
    updateStakingUI(); // Reset staking UI on disconnect

    // Important: detach listeners on disconnect
    if (areProviderListenersAttached && provider) { // Check provider for null, as it might be cleared
        try {
            provider.off('publicKey', handlePublicKeyChange);
            provider.off('disconnect', handleDisconnect);
        } catch (e) {
            console.warn("Ошибка при отсоединении слушателей провайдера при отключении:", e);
        }
        areProviderListenersAttached = false;
        console.log('Слушатели провайдера отсоединены при отключении.');
    }
}

// --- NFT Display Functions ---
async function loadUserNFTs(walletAddress) {
    if (!userNftList) return;

    userNftList.innerHTML = '<p class="placeholder-item web3-placeholder">Загрузка ваших NFT...</p>';
    if (nftToSellSelect) nftToSellSelect.innerHTML = '<option value="">-- Выберите NFT --</option>';

    try {
        const response = await fetch('http://localhost:3000/api/nfts/marketplace');
        if (!response.ok) {
            throw new Error(`Ошибка HTTP! статус: ${response.status}`);
        }
        const data = await response.json();
        const userOwnedNfts = data.nfts.filter(nft => nft.owner === walletAddress && !nft.isListed);

        userNftList.innerHTML = '';
        if (userOwnedNfts.length === 0) {
            userNftList.innerHTML = '<p class="placeholder-item web3-placeholder">В вашем кошельке не найдено NFT.</p>';
            return;
        }

        userOwnedNfts.forEach(nft => {
            const nftItem = document.createElement('div');
            nftItem.className = 'nft-item';
            nftItem.innerHTML = `
                <img src="${nft.image || 'https://via.placeholder.com/180x180?text=NFT'}" alt="${nft.name}">
                <h4>${nft.name}</h4>
                <p>${nft.description || 'Нет описания'}</p>
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
        console.error('Ошибка при загрузке пользовательских NFT:', error);
        userNftList.innerHTML = `<p class="placeholder-item web3-placeholder">Ошибка при загрузке NFT: ${error.message}.</p>`;
    }
}

async function loadMarketplaceNFTs() {
    if (!marketplaceNftList) return;

    marketplaceNftList.innerHTML = '<p class="placeholder-item web3-placeholder">Загрузка NFT с маркетплейса...</p>';

    try {
        const response = await fetch('http://localhost:3000/api/nfts/marketplace');
        if (!response.ok) {
            throw new Error(`Ошибка HTTP! статус: ${response.status}`);
        }
        const data = await response.json();
        const listedNfts = data.nfts.filter(nft => nft.price && nft.isListed);

        marketplaceNftList.innerHTML = '';
        if (listedNfts.length === 0) {
            marketplaceNftList.innerHTML = '<p class="placeholder-item web3-placeholder">В настоящее время на маркетплейсе нет перечисленных NFT.</p>';
            return;
        }

        listedNfts.forEach(nft => {
            const nftItem = document.createElement('div');
            nftItem.className = 'nft-item';
            nftItem.innerHTML = `
                <img src="${nft.image || 'https://via.placeholder.com/180x180?text=NFT'}" alt="${nft.name}">
                <h4>${nft.name}</h4>
                <p>${nft.description || 'Нет описания'}</p>
                <p>Цена: <strong>${nft.price} SOL</strong></p>
                <p>Mint: <span style="font-size:0.8em; word-break:break-all;">${nft.mint.substring(0, 10)}...</span></p>
            `;
            nftItem.addEventListener('click', () => showNftDetails(nft, walletPublicKey ? walletPublicKey.toBase58() : null));
            marketplaceNftList.appendChild(nftItem);
        });

    } catch (error) {
        console.error('Ошибка при загрузке NFT маркетплейса:', error);
        marketplaceNftList.innerHTML = `<p class="placeholder-item web3-placeholder">Ошибка при загрузке NFT маркетплейса: ${error.message}.</p>`;
    }
}


// Function to display the NFT details modal and populate its content
// This function is made available globally so it can be called from dynamically created elements.
window.showNftDetails = async function(nft, currentUserWallet) {
    if (!nftDetailsModal) {
        console.error("Элемент модального окна деталей NFT не найден!");
        return;
    }

    closeAllPopups(); // Close any other open popups first

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
            attributesList.innerHTML = '<li>Нет атрибутов.</li>';
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
        nftDetailHistory.textContent = '(функциональность истории транзакций не реализована)';
    }

    // Attach event listeners for actions (these onclick handlers can remain)
    if (nftDetailBuyBtn) nftDetailBuyBtn.onclick = () => showNotification(`Имитация покупки ${nft.name} за ${nft.price} SOL. (Требует реального взаимодействия с блокчейном)`, 'info');
    if (nftDetailSellBtn) {
        nftDetailSellBtn.onclick = () => {
            if (nftToSellSelect) document.getElementById('nftToSell').value = nft.mint;
            closeAllPopups(); // Close the details modal
            // Smooth scroll to the NFT section after closing details
            const nftSection = document.getElementById('nft-section');
            if (nftSection) nftSection.scrollIntoView({ behavior: 'smooth' });
        };
    }
    if (nftDetailTransferBtn) nftDetailTransferBtn.onclick = () => showNotification(`Имитация передачи ${nft.name}. (Требует реального взаимодействия с блокчейном)`, 'info');

    // Finally, make the modal visible
    nftDetailsModal.style.display = 'flex';
    console.log('Модальное окно деталей NFT отображено.');
};


// --- Dynamic Content Loading (Announcements, Games, Ads) ---

async function loadAnnouncements() {
    if (!announcementsList) return;
    announcementsList.innerHTML = '<p class="placeholder-item">Загрузка объявлений...</p>';
    try {
        const response = await fetch('http://localhost:3000/api/announcements');
        const data = await response.json();
        announcementsList.innerHTML = '';
        if (data.length === 0) {
            announcementsList.innerHTML = '<p class="placeholder-item">Объявлений пока нет.</p>';
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
        console.error('Ошибка при загрузке объявлений:', error);
        announcementsList.innerHTML = '<p class="placeholder-item">Не удалось загрузить объявления.</p>';
    }
}

async function loadGames() {
    if (!gameList) return;
    gameList.innerHTML = '<p class="placeholder-item web3-placeholder">Загрузка игр...</p>';
    try {
        const response = await fetch('http://localhost:3000/api/games');
        const data = await response.json();
        gameList.innerHTML = '';
        if (data.length === 0) {
            gameList.innerHTML = '<p class="placeholder-item web3-placeholder">Игры пока не загружены.</p>';
            return;
        }
        data.forEach(game => {
            const div = document.createElement('div');
            div.className = 'placeholder-item web3-placeholder';
            div.innerHTML = `
                <h3>${game.title}</h3>
                <p>${game.description}</p>
                ${game.url ? `<a href="${game.url}" target="_blank" class="web3-btn small-btn">Играть</a>` : ''}
            `;
            gameList.appendChild(div);
        });
    } catch (error) {
        console.error('Ошибка при загрузке игр:', error);
        gameList.innerHTML = '<p class="placeholder-item web3-placeholder">Не удалось загрузить игры.</p>';
    }
}

async function loadAds() {
    if (!adList) return;
    adList.innerHTML = '<p class="placeholder-item ad web3-placeholder">Загрузка объявлений...</p>';
    try {
        const response = await fetch('http://localhost:3000/api/ads');
        const data = await response.json();
        adList.innerHTML = '';
        if (data.length === 0) {
            adList.innerHTML = '<p class="placeholder-item ad web3-placeholder">Объявлений пока нет.</p>';
            return;
        }
        data.forEach(ad => {
            const div = document.createElement('div');
            div.className = 'placeholder-item ad web3-placeholder';
            div.innerHTML = `
                <h3>${ad.title}</h3>
                <p>${ad.content}</p>
                ${ad.imageUrl ? `<img src="${ad.imageUrl}" alt="Ad Creative" style="max-width:100%; height:auto; margin-top:10px; border-radius:5px;">` : ''}
                ${ad.link ? `<a href="${ad.link}" target="_blank" class="web3-btn small-btn" style="margin-top:10px;">Узнать больше</a>` : ''}
            `;
            adList.appendChild(div);
        });
    } catch (error) {
        console.error('Ошибка при загрузке объявлений:', error);
        adList.innerHTML = '<p class="placeholder-item ad web3-placeholder">Не удалось загрузить объявления.</p>';
    }
}

// --- Solana Connection Initialization for Staking ---
function initializeSolanaConnection() {
    if (!connection && typeof SolanaWeb3 !== 'undefined') {
        connection = new SolanaWeb3.Connection(SolanaWeb3.clusterApiUrl(network), 'confirmed');
        console.log('Соединение с Solana инициализировано.');
    } else if (typeof SolanaWeb3 === 'undefined') {
        console.warn('Библиотека Solana Web3 не загружена. Невозможно инициализировать соединение.');
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
        if (lockupPeriodDisplay) lockupPeriodDisplay.textContent = '0 дней (гибко)';
        if (unstakeFeeDisplay) unstakeFeeDisplay.textContent = '0%';
        if (rewardCalculationDisplay) rewardCalculationDisplay.textContent = 'Ежедневно';
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
            console.warn('Не удалось получить баланс токена AFOX (возможно, его нет):', tokenError);
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
            if (lockupPeriodDisplay) lockupPeriodDisplay.textContent = `${stakingPoolInfo.lockupDays} дней`;
            if (unstakeFeeDisplay) unstakeFeeDisplay.textContent = `${stakingPoolInfo.unstakeFee}%`;
            if (rewardCalculationDisplay) rewardCalculationDisplay.textContent = stakingPoolInfo.rewardCalcMethod;
        }

    } catch (error) {
        console.error('Ошибка при обновлении интерфейса стейкинга:', error);
        showNotification('Не удалось загрузить данные стейкинга. Пожалуйста, проверьте консоль.', 'error');
    }
}

// PSEUDO-FUNCTIONS for smart contract interaction (replace with your actual contract calls)
async function getUserStakingAccount(publicKey) {
    // This is mock data. Replace with actual smart contract interaction
    return { stakedAmount: 100, rewards: 5.25 };
}

async function getStakingPoolInfo() {
    // This is mock data. Replace with actual smart contract interaction
    return { apr: 15, minStake: 1, lockupDays: 0, unstakeFee: 0, rewardCalcMethod: "Daily" };
}


// --- DOMContentLoaded: Ensures the DOM is fully loaded before executing the script ---
document.addEventListener('DOMContentLoaded', async () => {

    // --- General Event Listeners for Modals and Menu ---

    // 1. Event handlers for modal close buttons (the 'cross' buttons)
    allModals.forEach(modalItem => {
        if (modalItem.closeBtn) { // Ensure the specific close button (cross) was found
            modalItem.closeBtn.addEventListener('click', () => {
                modalItem.element.style.display = 'none';
                console.log(`Модальное окно ${modalItem.element.id || modalItem.element.className} закрыто кнопкой-крестиком.`);
            });
        }
    });

    // NEW: Event handler for the Main Menu close cross button
    if (closeMainMenuCross) {
        closeMainMenuCross.addEventListener('click', () => {
            if (mainNav) {
                mainNav.classList.remove('active');
                if (menuToggle) menuToggle.classList.remove('active');
                console.log('Главное меню навигации закрыто кнопкой-крестиком.');
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
                console.log(`Модальное окно ${modalItem.element.id || modalItem.element.className} закрыто кликом вне его.`);
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
            console.log('Главное меню навигации закрыто кликом вне его.');
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
                    console.log(`Модальное окно ${modalItem.element.id || modalItem.element.className} закрыто клавишей Escape.`);
                    popupClosed = true;
                    break;
                }
            }

            // If no modal was closed, and the main menu is active, then close it.
            if (!popupClosed && mainNav && mainNav.classList.contains('active')) {
                mainNav.classList.remove('active');
                if (menuToggle) menuToggle.classList.remove('active');
                console.log('Главное меню навигации закрыто клавишей Escape.');
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
            console.log('Кнопка меню нажата. Меню активно:', mainNav.classList.contains('active'));
        });
    } else {
        console.warn("Элемент с ID 'menuToggle' не найден. Функциональность меню-гамбургера может быть неполной.");
    }

    // 5. Event handlers for clicks on menu links (to close the menu after navigation)
    if (navLinks.length > 0) {
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                if (mainNav && mainNav.classList.contains('active')) {
                    mainNav.classList.remove('active');
                    if (menuToggle) menuToggle.classList.remove('active');
                    console.log('Главное меню навигации закрыто после клика по ссылке.');
                }
            });
        });
    } else {
        console.warn("Ссылки навигации не найдены. Меню может не закрываться после клика по ссылке.");
    }

    // --- Wallet Connect Buttons ---
    if (connectWalletBtnWeb3) connectWalletBtnWeb3.addEventListener('click', connectWallet);
    if (connectWalletNftBtn) connectWalletNftBtn.addEventListener('click', connectWallet);

    // --- Mint NFT Form Submission ---
    if (mintNftForm) {
        mintNftForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!walletPublicKey) {
                showNotification('Пожалуйста, сначала подключите свой кошелек Solana, чтобы создать NFT.', 'warning');
                return;
            }
            const formData = new FormData(mintNftForm);
            formData.append('creatorWallet', walletPublicKey.toBase58());
            try {
                const response = await fetch('http://localhost:3000/api/nfts/prepare-mint', {
                    method: 'POST',
                    body: formData,
                });
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || `Ошибка HTTP! статус: ${response.status}`);
                }
                const result = await response.json();
                showNotification(`NFT успешно создан (имитация)! URI метаданных: ${result.uri}, Адрес минта: ${result.mintAddress}`, 'success', 5000);
                mintNftForm.reset();
                await loadUserNFTs(walletPublicKey.toBase58());
                await loadMarketplaceNFTs();
            } catch (error) {
                console.error('Ошибка при создании NFT:', error);
                showNotification(`Не удалось создать NFT: ${error.message}`, 'error');
            }
        });
    }

    // --- List NFT Form Submission ---
    if (listNftForm) {
        listNftForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!walletPublicKey) {
                showNotification('Пожалуйста, сначала подключите свой кошелек Solana, чтобы выставить NFT на продажу.', 'warning');
                return;
            }
            const mintAddress = document.getElementById('nftToSell').value;
            const salePrice = parseFloat(document.getElementById('salePrice').value);
            const listingDuration = parseInt(document.getElementById('listingDuration').value, 10);

            if (!mintAddress || isNaN(salePrice) || salePrice <= 0 || isNaN(listingDuration) || listingDuration <= 0) {
                showNotification('Пожалуйста, выберите NFT и введите действительную цену и продолжительность.', 'warning');
                return;
            }

            try {
                const response = await fetch('http://localhost:3000/api/nfts/list', {
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
                    throw new Error(errorData.error || `Ошибка HTTP! статус: ${response.status}`);
                }

                const result = await response.json();
                showNotification(result.message, 'success');
                listNftForm.reset();
                await loadUserNFTs(walletPublicKey.toBase58());
                await loadMarketplaceNFTs();
            } catch (error) {
                console.error('Ошибка при выставлении NFT на продажу:', error);
                showNotification(`Не удалось выставить NFT на продажу: ${error.message}`, 'error');
            }
        });
    }

    // --- Announcement Publish Button ---
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
                        showNotification('Объявление опубликовано!', 'success');
                    } else {
                        showNotification('Не удалось опубликовать объявление. (Только для администраторов в реальном приложении)', 'error');
                    }
                } catch (error) {
                    console.error('Ошибка при публикации объявления:', error);
                    showNotification('Ошибка подключения к серверу.', 'error');
                }
            } else {
                showNotification('Пожалуйста, введите объявление.', 'warning');
            }
        });
    }

    // --- Game Upload Button (Placeholder) ---
    if (uploadGameBtnWeb3) {
        uploadGameBtnWeb3.addEventListener('click', () => {
            showNotification('Функциональность загрузки игр требует формы и бэкэнд-интеграции для обработки файлов.', 'info', 5000);
        });
    }

    // --- Ad Post Button (Placeholder) ---
    if (postAdBtnWeb3) {
        postAdBtnWeb3.addEventListener('click', () => {
            showNotification('Функциональность размещения объявлений требует формы и бэкэнд-интеграции для обработки деталей и креативных файлов.', 'info', 5000);
        });
    }

    // --- Staking Button Handlers (Pseudo-code) ---
    if (stakeAfoxBtn) {
        stakeAfoxBtn.addEventListener('click', async () => {
            if (!walletPublicKey) {
                showNotification('Пожалуйста, подключите свой кошелек.', 'warning');
                return;
            }
            const amount = parseFloat(stakeAmountInput.value);
            if (isNaN(amount) || amount <= 0) {
                showNotification('Пожалуйста, введите действительную сумму для стейкинга.', 'warning');
                return;
            }
            console.log(`Попытка застейкать ${amount} AFOX...`);
            try {
                showNotification(`Вы успешно застейкали ${amount} AFOX! (Эта функция требует реализации смарт-контракта стейкинга)`, 'success', 5000);
                if (stakeAmountInput) stakeAmountInput.value = '';
                updateStakingUI();
            } catch (error) {
                console.error('Ошибка во время стейкинга:', error);
                showNotification('Не удалось застейкать токены. Подробности смотрите в консоли.', 'error');
            }
        });
    }

    if (claimRewardsBtn) {
        claimRewardsBtn.addEventListener('click', async () => {
            if (!walletPublicKey) {
                showNotification('Пожалуйста, подключите свой кошелек.', 'warning');
                return;
            }
            console.log('Попытка забрать награды...');
            try {
                showNotification('Награды успешно получены! (Эта функция требует реализации смарт-контракта стейкинга)', 'success', 5000);
                updateStakingUI();
            } catch (error) {
                console.error('Ошибка при получении наград:', error);
                showNotification('Не удалось получить награды. Проверьте консоль.', 'error');
            }
        });
    }

    if (unstakeAfoxBtn) {
        unstakeAfoxBtn.addEventListener('click', async () => {
            if (!walletPublicKey) {
                showNotification('Пожалуйста, подключите свой кошелек.', 'warning');
                return;
            }
            console.log('Попытка вывести токены из стейкинга...');
            try {
                showNotification('Застейканные токены успешно выведены из стейкинга! (Эта функция требует реализации смарт-контракта стейкинга)', 'success', 5000);
                updateStakingUI();
            } catch (error) {
                console.error('Ошибка при выводе токенов из стейкинга:', error);
                showNotification('Не удалось вывести токены из стейкинга. Проверьте консоль.', 'error');
            }
        });
    }

    // --- Contract Address Copy Functionality ---
    const copyButtons = document.querySelectorAll('.copy-btn');
    copyButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Find the element to copy from, either by ID 'contractAddress' or a preceding sibling with 'highlight-text'
            // NOTE: Original code had duplicate 'contractAddress' IDs. This is fixed by using data-target-id.
            const textToCopyElement = this.previousElementSibling; // Assuming the span is immediately before the button

            if (textToCopyElement && textToCopyElement.classList.contains('highlight-text')) {
                const textToCopy = textToCopyElement.textContent;
                navigator.clipboard.writeText(textToCopy).then(() => {
                    showNotification('Текст скопирован в буфер обмена!', 'info', 2000);
                    // Optional: Change button text temporarily
                    const originalText = button.textContent;
                    button.textContent = 'Скопировано!';
                    setTimeout(() => {
                        button.textContent = originalText;
                    }, 2000);
                }).catch(err => {
                    console.error('Не удалось скопировать текст: ', err);
                    showNotification('Не удалось скопировать текст.', 'error');
                });
            } else {
                console.warn('Целевой элемент для копирования не найден. Убедитесь, что кнопка .copy-btn находится сразу после .highlight-text span.');
            }
        });
    });


    // --- Initial Data Loads on Page Ready ---
    await loadAnnouncements();
    await loadGames();
    await loadAds();
    // await loadPhotos(); // REMOVED
    // await loadPosts();  // REMOVED
    await loadMarketplaceNFTs();

    // Initialize Solana connection for staking/wallet features
    initializeSolanaConnection();

    // Attempt to auto-connect wallet if already authorized (Phantom's behavior)
    try {
        if (typeof SolanaWeb3 === 'undefined' || typeof SolanaWalletAdapterPhantom === 'undefined') {
            console.warn('Библиотеки Solana Web3 или Wallet Adapter не загружены для автоподключения. Попытка автоподключения пропущена.');
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
            showNotification('Кошелек автоматически подключен!', 'success');
        } else {
             updateStakingUI(); // Ensure staking UI is reset if not auto-connected
        }
    } catch (e) {
        console.warn("Автоподключение не удалось или кошелек не найден/не авторизован:", e);
        showNotification(`Автоподключение не удалось: ${e.message || e}`, 'error');
        handleWalletDisconnect(); // Ensure UI is reset if auto-connect fails
    }

    // Example for opening createProposalModal (from DAO section)
    const createProposalBtn = document.getElementById('createProposalBtn');
    if (createProposalBtn) {
        createProposalBtn.addEventListener('click', () => {
            if (createProposalModal) {
                closeAllPopups(); // Close all other popups
                createProposalModal.style.display = 'flex';
                console.log('Модальное окно создания предложения отображено.');
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
                console.log('Модальное окно создания NFT отображено.');
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
                errorMessage += 'Требуется имя.\n';
            }
            if (email === '') {
                isValid = false;
                errorMessage += 'Требуется адрес электронной почты.\n';
            } else if (!/\S+@\S+\.\S+/.test(email)) {
                isValid = false;
                errorMessage += 'Пожалуйста, введите действительный адрес электронной почты.\n';
            }
            if (message === '') {
                isValid = false;
                errorMessage += 'Требуется сообщение.\n';
            }

            if (isValid) {
                console.log('Данные формы:', { name, email, subject, message });
                showNotification('Сообщение успешно отправлено!', 'success');
                contactForm.reset();
            } else {
                showNotification(`Ошибка валидации:\n${errorMessage}`, 'error', 5000);
            }
        });
    }

}); // End of DOMContentLoaded
