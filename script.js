// --- GLOBAL CONSTANTS AND CONFIGURATION ---
const AFOX_MINT = 'GLkewtq8s2Yr24o5LT5mzzEeccKuSsy8H5RCHaE9uRAd';
const SOL_MINT = 'So11111111111111111111111111111111111111112';
// ------------------------------------------------------------------
const JUPITER_RPC_ENDPOINT = 'https://rpc.jup.ag'; 
const BACKUP_RPC_ENDPOINT = 'https://api.mainnet-beta.solana.com';
const TXN_FEE_RESERVE_SOL = 0.005; // 0.005 SOL reserve for transaction fees and ATA rent

// --- CONSTANTS AND SETTINGS ---
// ПРЕДПОЛАГАЕТСЯ, что библиотеки SolanaWeb3 и SolanaWalletAdapterPhantom 
// загружаются через <script> теги в HTML.
const AFOX_TOKEN_MINT_ADDRESS = new SolanaWeb3.PublicKey(AFOX_MINT);
const STAKING_PROGRAM_ID = new SolanaWeb3.PublicKey('3GcDUxoH4yhFeM3aBkaUfjNu7xGTat8ojXLPHttz2o9f');
const JUPITER_API_URL = 'https://quote-api.jup.ag/v6'; 
const AFOX_MINT_ADDRESS_STRING = AFOX_MINT;
const TOKEN_PROGRAM_ID = new SolanaWeb3.PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');

// Mint addresses for tokens supported in the swap functionality
const TOKEN_MINT_ADDRESSES = {
    'SOL': new SolanaWeb3.PublicKey(SOL_MINT),
    'AFOX': AFOX_TOKEN_MINT_ADDRESS,
};

const AFOX_DECIMALS = 6;
const SOL_DECIMALS = 9;

const NETWORK = SolanaWeb3.WalletAdapterNetwork.Mainnet;

// --- GLOBAL APP STATE (УЛУЧШЕНИЕ: Состояние RPC и кошелька) ---
const appState = {
    walletPublicKey: null,
    provider: null,
    connection: null, 
    currentJupiterQuote: null,
    currentOpenNft: null,
    areProviderListenersAttached: false,
    // ДОБАВЛЕНО: Кэш для пользовательских балансов (для MOCK)
    userBalances: {
        SOL: BigInt(0), 
        AFOX: BigInt(0), 
    }
};


// --- WALLET ADAPTERS (NO CHANGE) ---
const WALLETS = [
    new SolanaWalletAdapterPhantom.PhantomWalletAdapter(),
];


// --- UI ELEMENT CACHING (Инициализация пустым объектом) ---
const uiElements = {}; 
uiElements.closeModalButtons = {};


// --- ЛОКАЛЬНАЯ СИМУЛЯЦИЯ БЭКЕНДА (MOCK DB) ---
// ✅ ИСПРАВЛЕНИЕ 1: Отключение localStorage. Данные хранятся только в памяти.
const MOCK_DB = {
    nfts: [], 
    announcements: [
        { text: 'Добро пожаловать в автономную симуляцию! Данные НЕ сохраняются в localStorage.', date: new Date(Date.now() - 3600000).toISOString() },
        { text: 'Этот код работает без бэкенда. Все API вызовы заменены заглушками.', date: new Date().toISOString() }
    ],
    games: [
        { title: 'Solana Runner (MOCK)', description: 'Бесконечный раннер, симуляция игры.', url: '#' }
    ],
    nftHistory: {},
    staking: {} // { address: { stakedAmount: 'BigIntStr', rewards: 'BigIntStr', stakeHistory: [] } }
};

/**
 * MOCK: Сохраняет текущее состояние MOCK_DB (только в памяти).
 */
function persistMockData() {
    // В реальном коде здесь были бы реальные вызовы Solana программ.
}

// --- HELPER UTILITIES (IMPROVED) ---

/**
 * Manages the global loading state and button disabling.
 * @param {boolean} isLoading 
 * @param {HTMLElement} [button] - Specific button to disable/enable.
 */
function setLoadingState(isLoading, button = null) {
    if (uiElements.pageLoader) {
        uiElements.pageLoader.style.display = isLoading ? 'flex' : 'none';
    }

    // List of all action buttons to disable
    const actionButtons = [
        uiElements.stakeAfoxBtn, uiElements.claimRewardsBtn, uiElements.unstakeAfoxBtn,
        uiElements.getQuoteBtn, uiElements.executeSwapBtn, 
        uiElements.nftDetailBuyBtn, uiElements.nftDetailSellBtn, uiElements.nftDetailTransferBtn
    ].filter(Boolean);

    actionButtons.forEach(btn => {
        if (btn !== button) { 
            btn.disabled = isLoading;
        }
    });

    if (button) {
        button.disabled = isLoading;
    }
}


/**
 * Utility to run a fetch request with a timeout.
 */
async function fetchWithTimeout(url, options = {}, timeout = 8000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(id);
        return response;
    } catch (error) {
        clearTimeout(id);
        if (error.name === 'AbortError') {
            throw new Error('Network request timed out.');
        }
        throw error;
    }
}

/**
 * Utility function to debounce repeated function calls.
 */
function debounce(func, delay) {
    let timeoutId;
    return function(...args) {
        const context = this; 
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            func.apply(context, args);
        }, delay);
    };
}


/**
 * Возвращает необходимый резерв SOL для комиссий.
 */
function getSolanaTxnFeeReserve() {
    return TXN_FEE_RESERVE_SOL;
}

/**
 * Universal function to display notifications. 
 * ✅ ИСПРАВЛЕНИЕ 10/16: Улучшенное управление временем и сообщениями об ошибках.
 */
function showNotification(message, type = 'info', duration = null) {
    if (!uiElements.notificationContainer) {
        console.warn('Notification container not found. Cannot display notification.');
        return; 
    }
    
    // Определяем длительность в зависимости от типа сообщения
    const finalDuration = duration || (type === 'error' || type === 'warning' ? 7000 : 3500);

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    // Используем innerHTML для поддержки ссылок в ошибках (например, "Install Phantom")
    notification.innerHTML = message; 

    uiElements.notificationContainer.prepend(notification); 

    setTimeout(() => {
        notification.remove();
    }, finalDuration);
}

/**
 * Форматирует BigInt с учетом десятичных знаков.
 */
function formatBigInt(amount, decimals) {
    if (amount === undefined || amount === null || decimals === undefined || decimals === null || isNaN(decimals)) return '0';
    let bigIntAmount;
    try {
        bigIntAmount = BigInt(amount);
    } catch (e) {
        return '0';
    }

    const str = bigIntAmount.toString();
    if (str === '0') return '0';

    if (str.length <= decimals) {
        const paddedStr = '0'.repeat(decimals - str.length) + str;
        const fractionalPart = paddedStr.slice(-decimals).replace(/0+$/, ''); 
        return '0' + (fractionalPart.length > 0 ? '.' + fractionalPart : '');
    } else {
        const integerPart = str.slice(0, str.length - decimals);
        const fractionalPart = str.slice(str.length - decimals).replace(/0+$/, ''); 
        return integerPart + (fractionalPart.length > 0 ? '.' + fractionalPart : '');
    }
}

/**
 * Преобразует строковое значение (ввод пользователя) в BigInt. 
 * ✅ ИСПРАВЛЕНИЕ 8: Бросаем ошибку при превышении точности.
 */
function parseAmountToBigInt(amountStr, decimals) {
    if (!amountStr || amountStr.trim() === '') return BigInt(0);

    const cleanedStr = amountStr.trim().replace(/[^\d.]/g, '');
    
    if (cleanedStr.split('.').length > 2) {
        throw new Error('Invalid number format: multiple decimal points.');
    }
    
    const parts = cleanedStr.split('.');
    const integerPart = parts[0] || '0';
    let fractionalPart = parts.length > 1 ? parts[1] : '';

    if (fractionalPart.length > decimals) {
        throw new Error(`Amount exceeds maximum precision of ${decimals} decimal places.`);
    }

    const paddedFractionalPart = fractionalPart.padEnd(decimals, '0');
    
    // Проверка на очень маленькие числа, которые могут быть введены
    if (integerPart === '0' && BigInt(paddedFractionalPart) === BigInt(0) && amountStr !== '0' && amountStr !== '0.') {
         return BigInt(0);
    }

    return BigInt(integerPart + paddedFractionalPart);
}


/**
 * Closes all open modals and the main navigation menu.
 */
function closeAllPopups() {
    const modals = [
        uiElements.nftDetailsModal, uiElements.nftModal, uiElements.mintNftModal, uiElements.createProposalModal
    ].filter(Boolean);

    modals.forEach(modal => {
        if (modal && modal.style.display === 'flex') {
            modal.style.display = 'none';
        }
    });

    if (uiElements.mainNav && uiElements.mainNav.classList.contains('active')) {
        uiElements.mainNav.classList.remove('active');
        if (uiElements.menuToggle) uiElements.menuToggle.classList.remove('active');
    }
}

async function updateStakingAndBalanceUI() {
    try {
        await Promise.all([
            fetchUserBalances(), // Сначала обновляем MOCK/реальные балансы
            updateStakingUI(),
            updateSwapBalances() // Используем обновленные MOCK/реальные балансы
        ]);
    } catch (error) {
        console.error("Error refreshing staking/balance UI after transaction:", error);
        showNotification("Error updating staking and balance displays.", 'error');
    }
}

/**
 * Gets the decimal count for a given token mint address.
 */
function getTokenDecimals(mintAddress) {
    if (mintAddress.equals(TOKEN_MINT_ADDRESSES['SOL'])) {
        return SOL_DECIMALS;
    }
    if (mintAddress.equals(TOKEN_MINT_ADDRESSES['AFOX'])) {
        return AFOX_DECIMALS;
    }
    return 9; 
}

function clearSwapQuote() {
    appState.currentJupiterQuote = null;
    if (uiElements.swapToAmountInput) uiElements.swapToAmountInput.value = '';
    if (uiElements.priceImpactSpan) uiElements.priceImpactSpan.textContent = '0%';
    if (uiElements.lpFeeSpan) uiElements.lpFeeSpan.textContent = '0';
    if (uiElements.minReceivedSpan) uiElements.minReceivedSpan.textContent = '0';
    if (uiElements.executeSwapBtn) uiElements.executeSwapBtn.style.display = 'none';
}

function handleSwapDirectionChange() {
    const fromToken = uiElements.swapFromTokenSelect.value;
    const toToken = uiElements.swapToTokenSelect.value;

    uiElements.swapFromTokenSelect.value = toToken;
    uiElements.swapToTokenSelect.value = fromToken;

    if (uiElements.swapFromAmountInput) uiElements.swapFromAmountInput.value = '';
    if (uiElements.swapToAmountInput) uiElements.swapToAmountInput.value = '';

    clearSwapQuote();
    updateSwapBalances();
}


// --- WALLET & CONNECTION FUNCTIONS (IMPROVED) ---

/**
 * Checks RPC connection status.
 */
async function checkRpcHealth(connection) {
    try {
        // УЛУЧШЕНИЕ: Проверяем getLatestBlockhash, так как он более надежен, чем getSlot
        await connection.getLatestBlockhash('confirmed'); 
        return true;
    } catch (rpcError) {
        console.error('RPC endpoint failed health check:', rpcError);
        return false;
    }
}

/**
 * ✅ ИСПРАВЛЕНИЕ 5, 6: Надежная функция для получения рабочего соединения RPC.
 */
async function getRobustConnection() {
    // УЛУЧШЕНИЕ: Используем один и тот же уровень коммитмента
    const connectionOptions = { commitment: 'confirmed' }; 
    
    // 1. Пробуем Primary JUPITER
    const primaryConnection = new SolanaWeb3.Connection(JUPITER_RPC_ENDPOINT, connectionOptions);

    if (await checkRpcHealth(primaryConnection)) {
        console.log('Using Primary RPC:', JUPITER_RPC_ENDPOINT);
        return primaryConnection;
    }

    // 2. Пробуем Backup Solana
    console.warn('Primary RPC failed check. Using backup endpoint.');
    const backupConnection = new SolanaWeb3.Connection(BACKUP_RPC_ENDPOINT, connectionOptions);

    if (await checkRpcHealth(backupConnection)) {
        console.log('Using Backup RPC:', BACKUP_RPC_ENDPOINT);
        return backupConnection;
    }
    
    throw new Error('Both primary and backup RPC endpoints failed to connect or are unhealthy.');
}


/**
 * Updates the UI with the connected wallet address.
 */
function updateWalletUI(address) {
    const shortAddress = address ? `${address.substring(0, 4)}...${address.substring(address.length - 4)}` : 'Connect Wallet';

    uiElements.walletAddressDisplays.forEach(el => {
        el.textContent = shortAddress;
        el.classList.toggle('connected', !!address);
    });
}

/**
 * Handles changes to the wallet public key (connect/disconnect).
 */
function handlePublicKeyChange(newPublicKey) {
    appState.walletPublicKey = newPublicKey; 

    if (newPublicKey) {
        const address = newPublicKey.toBase58();
        updateWalletUI(address);
        
        // MOCK: Handle initial state for MOCK DB and Balances
        if (!MOCK_DB.staking[address]) {
             MOCK_DB.staking[address] = { stakedAmount: '0', rewards: '0', stakeHistory: [] };
             appState.userBalances.AFOX = parseAmountToBigInt('1000.0', AFOX_DECIMALS); // Initial MOCK AFOX
             // MOCK: Для первоначального подключения даем немного SOL, если его нет в MOCK_DB
             if (appState.userBalances.SOL === BigInt(0)) {
                 // Установка SOL для MOCK-операций, если не удалось получить реальный баланс
                 appState.userBalances.SOL = parseAmountToBigInt('1.0', SOL_DECIMALS); 
             }
             persistMockData();
        }

        loadUserNFTs();
        updateStakingAndBalanceUI();
    } else {
        updateWalletUI(null);
        loadUserNFTs(); 
        // Сброс балансов при отключении
        appState.userBalances.SOL = BigInt(0); 
        appState.userBalances.AFOX = BigInt(0); 
        updateStakingAndBalanceUI();
        appState.currentOpenNft = null; 
        showNotification('Wallet disconnected.', 'info');
    }
}

/**
 * Attaches event listeners to the wallet provider.
 */
function registerProviderListeners() {
    if (appState.provider && !appState.areProviderListenersAttached) {
        appState.provider.on('connect', () => handlePublicKeyChange(appState.provider.publicKey));
        appState.provider.on('disconnect', () => handlePublicKeyChange(null));
        appState.areProviderListenersAttached = true;
    }
}

/**
 * Connects the wallet using the provided adapter. 
 */
async function connectWallet(adapter) {
    setLoadingState(true);
    try {
        const selectedAdapter = WALLETS.find(w => w.name === adapter.name);
        
        // ✅ ИСПРАВЛЕНИЕ 15: Улучшенная проверка на наличие Phantom
        if (adapter.name === 'Phantom' && !window.solana) {
             const installUrl = 'https://phantom.app/';
            showNotification(`Phantom wallet not found. Please install it: <a href="${installUrl}" target="_blank">Install Phantom</a>`, 'warning', 10000);
            return;
        } else if (!selectedAdapter) {
             showNotification(`Wallet adapter for ${adapter.name} not found.`, 'warning', 5000);
             return;
        }

        appState.provider = selectedAdapter;
        
        // ✅ ИСПРАВЛЕНИЕ 5, 6: Устанавливаем соединение через надежный метод
        appState.connection = await getRobustConnection();

        if (appState.provider.publicKey) {
             handlePublicKeyChange(appState.provider.publicKey);
        } else {
            await appState.provider.connect();
        }

        registerProviderListeners();
        closeAllPopups();
        showNotification('Wallet successfully connected! 🦊', 'success');
        
    } catch (error) {
        console.error('Wallet connection failed:', error);
        appState.provider = null;
        appState.connection = null; 
        appState.walletPublicKey = null;
        updateWalletUI(null);
        // ✅ ИСПРАВЛЕНИЕ 16: Улучшенная обработка ошибок
        const message = error.message.includes('Both primary and backup') ? error.message : `Connection failed: ${error.message.substring(0, 70)}...`;
        showNotification(message, 'error');
    } finally {
        setLoadingState(false);
    }
}

/**
 * Handles wallet disconnection.
 */
function handleWalletDisconnect() {
    if (appState.provider) {
        if (appState.provider.connected) {
             appState.provider.disconnect();
        } else {
            handlePublicKeyChange(null);
        }
    }
}


// --- NFT MARKETPLACE FUNCTIONS (IMPROVED: XSS Prevention) ---

// MOCK: Load user NFTs (owned)
function loadUserNFTs() {
    if (!uiElements.userNftList) return;

    const userAddress = appState.walletPublicKey ? appState.walletPublicKey.toBase58() : 'NO_WALLET_CONNECTED';
    // УЛУЧШЕНИЕ: Убедимся, что владельцем является именно текущий пользователь
    const userNfts = MOCK_DB.nfts.filter(n => n.owner === userAddress && !n.isListed);

    uiElements.userNftList.innerHTML = '';
    
    if (userNfts.length === 0) {
        uiElements.userNftList.innerHTML = `<p class="empty-list-message">${appState.walletPublicKey ? 'You currently own no unlisted AlphaFox NFTs.' : 'Connect your wallet to see your NFTs.'}</p>`;
        if (uiElements.nftToSellSelect) uiElements.nftToSellSelect.innerHTML = '<option value="">Select an NFT</option>';
        return;
    }

    // УЛУЧШЕНИЕ: Заполняем список для продажи только теми, что не выставлены
    if (uiElements.nftToSellSelect) {
        const unlistedNfts = MOCK_DB.nfts.filter(n => n.owner === userAddress && !n.isListed);
        uiElements.nftToSellSelect.innerHTML = '<option value="">Select an NFT</option>' + 
            unlistedNfts.map(nft => `<option value="${nft.mint}">${nft.name}</option>`).join('');
    }

    userNfts.forEach(nft => {
        const card = createNftCard(nft);
        uiElements.userNftList.appendChild(card);
    });
}

// MOCK: Load NFTs listed for sale
function loadMarketplaceNFTs() {
    if (!uiElements.marketplaceNftList) return;

    const connectedOwner = appState.walletPublicKey ? appState.walletPublicKey.toBase58() : null;
    // УЛУЧШЕНИЕ: Не показываем NFT, которые выставил сам пользователь
    const marketplaceNfts = MOCK_DB.nfts.filter(n => n.isListed === true && n.owner !== connectedOwner);

    uiElements.marketplaceNftList.innerHTML = '';
    
    if (marketplaceNfts.length === 0) {
        uiElements.marketplaceNftList.innerHTML = '<p class="empty-list-message">No NFTs are currently listed for sale.</p>';
        return;
    }

    marketplaceNfts.forEach(nft => {
        const card = createNftCard(nft);
        uiElements.marketplaceNftList.appendChild(card);
    });
}

/**
 * Creates the HTML element for an NFT card. (IMPROVED: XSS Prevention)
 */
function createNftCard(nft) {
    const card = document.createElement('div');
    card.className = 'nft-card';
    card.dataset.mint = nft.mint;

    const image = document.createElement('img');
    image.src = nft.image;
    image.alt = nft.name;
    image.loading = 'lazy';

    const title = document.createElement('h3');
    title.className = 'nft-name';
    title.textContent = nft.name; // XSS Prevention

    const priceP = document.createElement('p');
    priceP.className = 'nft-price';
    if (nft.isListed && nft.price > 0) {
        priceP.textContent = `${nft.price.toFixed(2)} SOL`; // XSS Prevention
    } else {
        priceP.textContent = 'Not Listed';
        priceP.classList.add('nft-unlisted');
    }

    const detailsBtn = document.createElement('button');
    detailsBtn.className = 'view-details-btn';
    detailsBtn.textContent = 'Details'; // XSS Prevention

    card.appendChild(image);
    card.appendChild(title);
    card.appendChild(priceP);
    card.appendChild(detailsBtn);

    return card;
}

/**
 * Handles click events on NFT lists (delegation).
 */
function handleNftItemClick(event, isUserNft) {
    const card = event.target.closest('.nft-card');
    if (card) {
        const mint = card.dataset.mint;
        const nft = MOCK_DB.nfts.find(n => n.mint === mint);
        if (nft) {
            showNftDetails(nft, isUserNft);
        }
    }
}

/**
 * Displays the details modal for a selected NFT.
 */
function showNftDetails(nft, isUserNft) {
    if (!uiElements.nftDetailsModal) return;

    appState.currentOpenNft = nft; 

    // Set basic details
    if (uiElements.nftDetailImage) uiElements.nftDetailImage.src = nft.image;
    if (uiElements.nftDetailName) uiElements.nftDetailName.textContent = nft.name;
    if (uiElements.nftDetailDescription) uiElements.nftDetailDescription.textContent = nft.description;
    if (uiElements.nftDetailOwner) uiElements.nftDetailOwner.textContent = `${nft.owner.substring(0, 8)}...`;
    if (uiElements.nftDetailMint) uiElements.nftDetailMint.textContent = `${nft.mint.substring(0, 8)}...`;

    const copyBtn = document.querySelector('[data-copy-target]');
    if (copyBtn) copyBtn.dataset.copyTarget = nft.mint;

    // Attributes (IMPROVED: XSS Prevention)
    if (uiElements.attributesList) {
        uiElements.attributesList.innerHTML = '';
        const attributes = nft.attributes || [];
        attributes.forEach(attr => {
            const li = document.createElement('li');
            const traitType = document.createElement('strong');
            traitType.textContent = attr.trait_type + ':'; 
            
            const valueSpan = document.createElement('span');
            valueSpan.textContent = ` ${attr.value}`; 
            
            li.appendChild(traitType);
            li.appendChild(valueSpan);
            uiElements.attributesList.appendChild(li);
        });
        if (attributes.length === 0) uiElements.attributesList.innerHTML = '<li>No attributes listed.</li>';
    }

    // History (IMPROVED: XSS Prevention)
    if (uiElements.nftDetailHistory) {
        const history = MOCK_DB.nftHistory[nft.mint] || [];
        
        uiElements.nftDetailHistory.innerHTML = '';
        history.reverse().forEach(item => {
            const date = new Date(item.timestamp).toLocaleDateString();
            const toShort = item.to ? `${item.to.substring(0, 8)}...` : '';
            const fromShort = item.from ? `${item.from.substring(0, 8)}...` : '';
            let text = '';

            if (item.type === 'Mint') text = `${date}: Minted to ${toShort}`;
            else if (item.type === 'Transfer') text = `${date}: Transferred to ${toShort}`;
            else if (item.type === 'List') text = `${date}: Listed for ${item.price} SOL`;
            else if (item.type === 'Sale') text = `${date}: Sold for ${item.price} SOL to ${toShort}`;
            else if (item.type === 'Unlist') text = `${date}: Unlisted`;
            else text = `${date}: ${item.type} event.`;

            const li = document.createElement('li');
            li.textContent = text; // XSS Prevention
            uiElements.nftDetailHistory.appendChild(li);
        });
    }

    // Action Buttons
    const connectedOwner = appState.walletPublicKey ? appState.walletPublicKey.toBase58() : null;
    const isOwner = connectedOwner === nft.owner;
    
    if (uiElements.nftDetailBuyBtn) {
        const showBuy = nft.isListed && !isOwner && connectedOwner;
        uiElements.nftDetailBuyBtn.style.display = showBuy ? 'block' : 'none';
        uiElements.nftDetailBuyBtn.textContent = `Buy for ${nft.price.toFixed(2)} SOL`;
        uiElements.nftDetailBuyBtn.disabled = !showBuy;
    }

    if (uiElements.nftDetailSellBtn) {
        const showSell = isOwner && connectedOwner;
        // УЛУЧШЕНИЕ: Более четкая логика отображения кнопки "Unlist"
        uiElements.nftDetailSellBtn.style.display = (showSell && nft.isListed) ? 'block' : 'none';
        uiElements.nftDetailSellBtn.textContent = 'Unlist NFT'; 
        uiElements.nftDetailSellBtn.disabled = !(showSell && nft.isListed);
    }
    
    if (uiElements.nftDetailTransferBtn) {
        const showTransfer = isOwner && connectedOwner && !nft.isListed;
        uiElements.nftDetailTransferBtn.style.display = showTransfer ? 'block' : 'none';
        uiElements.nftDetailTransferBtn.disabled = !showTransfer;
    }

    uiElements.nftDetailsModal.style.display = 'flex';
}

/**
 * MOCK: Handles buying an NFT from the marketplace.
 */
async function handleBuyNft() {
    if (!appState.walletPublicKey || !appState.currentOpenNft || !appState.currentOpenNft.isListed) {
        showNotification('Please connect your wallet or NFT is not listed.', 'warning');
        return;
    }

    const nft = appState.currentOpenNft;
    const priceSol = nft.price;
    const solBalanceLamports = appState.userBalances.SOL;
    const requiredLamports = parseAmountToBigInt(priceSol.toString(), SOL_DECIMALS);

    if (solBalanceLamports < requiredLamports) {
         showNotification(`Insufficient SOL balance. Required: ${priceSol.toFixed(2)} SOL.`, 'error');
         return;
    }

    setLoadingState(true, uiElements.nftDetailBuyBtn);

    showNotification(`Buying ${nft.name} for ${nft.price} SOL... (Simulation)`, 'info', 5000);

    try {
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const sellerAddress = nft.owner;
        nft.owner = appState.walletPublicKey.toBase58();
        nft.isListed = false; 
        nft.price = 0;
        
        // MOCK: Обновление балансов
        appState.userBalances.SOL = solBalanceLamports - requiredLamports;

        persistMockData();

        MOCK_DB.nftHistory[nft.mint].push({ type: 'Sale', timestamp: new Date().toISOString(), price: priceSol, from: sellerAddress, to: nft.owner });

        showNotification(`${nft.name} successfully purchased!`, 'success');
        
        closeAllPopups();
        loadUserNFTs(); 
        loadMarketplaceNFTs(); 
        await fetchUserBalances(); // Обновляем баланс после покупки
        updateSwapBalances();

    } catch (error) {
        showNotification(`Purchase failed: ${error.message.substring(0, 70)}...`, 'error');
    } finally {
        setLoadingState(false, uiElements.nftDetailBuyBtn);
    }
}

/**
 * MOCK: Handles unlisting an NFT.
 */
function handleUnlistNft() {
    if (!appState.walletPublicKey || !appState.currentOpenNft || appState.currentOpenNft.owner !== appState.walletPublicKey.toBase58() || !appState.currentOpenNft.isListed) {
        showNotification('Invalid NFT or you are not the owner/it is not listed.', 'error');
        return;
    }

    const nft = appState.currentOpenNft;

    setLoadingState(true, uiElements.nftDetailSellBtn);
    showNotification(`Unlisting ${nft.name}... (Simulation)`, 'info');

    try {
        setTimeout(() => {
            nft.isListed = false;
            nft.price = 0;
            persistMockData();

            MOCK_DB.nftHistory[nft.mint].push({ type: 'Unlist', timestamp: new Date().toISOString() });
            
            showNotification(`${nft.name} successfully unlisted!`, 'success');
            
            closeAllPopups();
            loadUserNFTs(); 
            loadMarketplaceNFTs(); 
            setLoadingState(false, uiElements.nftDetailSellBtn);
        }, 2000);
    } catch (e) {
        showNotification('Unlisting failed.', 'error');
        setLoadingState(false, uiElements.nftDetailSellBtn);
    }
}

/**
 * MOCK: Handles the form submission for minting a new NFT. (IMPROVED: Validation)
 */
function handleMintNftSubmit(event) {
    event.preventDefault();

    if (!appState.walletPublicKey) {
        showNotification('Please connect your wallet to mint an NFT.', 'warning');
        return;
    }
    
    // ДОБАВЛЕНО: Проверка баланса SOL для минта
    const MINT_FEE_SOL = parseAmountToBigInt('0.05', SOL_DECIMALS);
    if (appState.userBalances.SOL < MINT_FEE_SOL) {
        showNotification('Insufficient SOL for minting fee (0.05 SOL).', 'error');
        return;
    }

    const form = event.target;
    const name = form.elements['mint-name'].value.trim();
    const description = form.elements['mint-description'].value.trim();
    const image = form.elements['mint-image'].value.trim() || 'https://via.placeholder.com/180x180/6c757d/ffffff?text=New+Fox';

    const htmlRegex = /[<>]/g;
    
    if (!name || name.length < 3 || name.length > 50 || htmlRegex.test(name)) {
        showNotification('Name must be 3-50 characters and cannot contain HTML.', 'warning');
        return;
    }
    if (!description || description.length < 10 || description.length > 200 || htmlRegex.test(description)) {
        showNotification('Description must be 10-200 characters and cannot contain HTML.', 'warning');
        return;
    }

    setLoadingState(true);
    showNotification('Minting NFT... (Simulation in progress)', 'info');

    try {
        setTimeout(async () => {
            const newMint = `NFT_MINT_${Date.now()}`;
            const newNft = {
                mint: newMint,
                name: name,
                description: description,
                owner: appState.walletPublicKey.toBase58(),
                price: 0,
                isListed: false,
                image: image,
                attributes: [{ trait_type: 'Creator', value: 'AlphaFox DAO' }]
            };

            MOCK_DB.nfts.push(newNft);
            MOCK_DB.nftHistory[newMint] = [{ type: 'Mint', timestamp: new Date().toISOString(), to: appState.walletPublicKey.toBase58() }];
            
            // MOCK: Списывание комиссии
            appState.userBalances.SOL = appState.userBalances.SOL - MINT_FEE_SOL;

            persistMockData();

            showNotification(`NFT "${name}" successfully minted!`, 'success');
            form.reset();
            closeAllPopups();
            loadUserNFTs(); 
            await fetchUserBalances(); // Обновляем баланс после минта
            updateSwapBalances();
            setLoadingState(false);
        }, 3000);
    } catch (e) {
        showNotification('Minting failed during simulation.', 'error');
        setLoadingState(false);
    }
}


/**
 * MOCK: Handles listing an NFT for sale.
 */
function handleListNftSubmit(event) {
    event.preventDefault();

    if (!appState.walletPublicKey) {
        showNotification('Please connect your wallet.', 'warning');
        return;
    }

    const form = event.target;
    const mint = form.elements['nft-to-sell'].value;
    const price = form.elements['list-price'].value;

    if (!mint) {
        showNotification('Please select an NFT to list.', 'warning');
        return;
    }

    const priceRegex = /^\d+(\.\d{1,9})?$/;
    if (!priceRegex.test(price) || parseFloat(price) <= 0) {
        showNotification('Please enter a valid listing price (up to 9 decimal places).', 'error');
        return;
    }

    const nft = MOCK_DB.nfts.find(n => n.mint === mint);
    if (!nft || nft.owner !== appState.walletPublicKey.toBase58() || nft.isListed) {
        showNotification('Invalid NFT or NFT is already listed.', 'error');
        return;
    }

    setLoadingState(true);
    showNotification(`Listing ${nft.name} for ${price} SOL... (Simulation)`, 'info');

    try {
        setTimeout(() => {
            nft.isListed = true;
            nft.price = parseFloat(price);
            persistMockData();

            MOCK_DB.nftHistory[mint].push({ type: 'List', timestamp: new Date().toISOString(), price: nft.price });
            
            showNotification(`${nft.name} successfully listed for ${price} SOL!`, 'success');
            form.reset();
            loadUserNFTs(); 
            loadMarketplaceNFTs(); 
            setLoadingState(false);
        }, 3000);
    } catch (e) {
        showNotification('Listing failed.', 'error');
        setLoadingState(false);
    }
}

/**
 * Helper: Basic Solana Public Key validation (to reduce MOCK errors)
 */
function isValidSolanaAddress(address) {
    try {
        new SolanaWeb3.PublicKey(address);
        return true;
    } catch (e) {
        return false;
    }
}


/**
 * MOCK: Handles transferring an NFT to a new owner.
 */
async function handleTransferNft() {
    if (!appState.walletPublicKey) {
        showNotification('Please connect your wallet.', 'warning');
        return;
    }
    
    if (!appState.connection) {
         showNotification('RPC connection not established. Try reconnecting wallet.', 'error');
         return;
    }


    if (!appState.currentOpenNft || appState.currentOpenNft.isListed || appState.currentOpenNft.owner !== appState.walletPublicKey.toBase58()) {
        showNotification('NFT is listed or you are not the owner.', 'error');
        return;
    }

    const recipientAddress = prompt("Enter the recipient's Solana address:");

    if (!recipientAddress) {
        showNotification('Transfer cancelled.', 'info');
        return;
    }
    
    if (!isValidSolanaAddress(recipientAddress)) {
        showNotification('Invalid Solana address entered.', 'error');
        return;
    }

    setLoadingState(true, uiElements.nftDetailTransferBtn);

    try {
        const recipientPublicKey = new SolanaWeb3.PublicKey(recipientAddress);
        const newOwner = recipientPublicKey.toBase58();

        const KNOWN_PROGRAM_IDS = [
            TOKEN_PROGRAM_ID.toBase58(), 
            STAKING_PROGRAM_ID.toBase58(),
            '11111111111111111111111111111111',
        ];

        if (KNOWN_PROGRAM_IDS.includes(newOwner)) {
            throw new Error('Cannot transfer to a known Solana Program ID.');
        }

        if (newOwner === appState.walletPublicKey.toBase58()) {
             throw new Error('Cannot transfer to your own address.');
        }

        // В реальном коде здесь была бы проверка: isExecutable/isATA
        const accountInfo = await appState.connection.getAccountInfo(recipientPublicKey, 'confirmed');
        
        if (accountInfo && accountInfo.executable) {
            throw new Error('Cannot transfer to a Solana Program ID (executable account).');
        }

        const nft = appState.currentOpenNft;
        const oldOwner = nft.owner;
        
        showNotification(`Transferring ${nft.name} to ${newOwner.substring(0, 8)}... (Simulation)`, 'info', 5000);

        await new Promise(resolve => setTimeout(resolve, 3000));

        // Transfer logic
        nft.owner = newOwner;
        persistMockData();

        MOCK_DB.nftHistory[nft.mint].push({ type: 'Transfer', timestamp: new Date().toISOString(), from: oldOwner, to: newOwner });

        showNotification(`${nft.name} successfully transferred!`, 'success');
        
        closeAllPopups();
        loadUserNFTs();
        loadMarketplaceNFTs();

    } catch (error) {
        console.error('Error during NFT transfer:', error);
        // ✅ ИСПРАВЛЕНИЕ 16: Улучшенная обработка ошибок
        showNotification(`Transfer failed: ${error.message}`, 'error');
    } finally {
        setLoadingState(false, uiElements.nftDetailTransferBtn);
    }
}


// --- ANNOUNCEMENT AND GAMES FUNCTIONS (IMPROVED: XSS Prevention) ---

/**
 * MOCK: Loads and displays announcements. (IMPROVED: XSS Prevention)
 */
function loadAnnouncements() {
    if (!uiElements.announcementsList) return;
    uiElements.announcementsList.innerHTML = '';
    MOCK_DB.announcements.forEach(ann => {
        const item = document.createElement('div');
        item.className = 'announcement-item';

        const p = document.createElement('p');
        p.textContent = ann.text; // XSS Prevention

        const span = document.createElement('span');
        span.className = 'announcement-date';
        span.textContent = new Date(ann.date).toLocaleDateString(); // XSS Prevention

        item.appendChild(p);
        item.appendChild(span);
        uiElements.announcementsList.appendChild(item);
    });
}

/**
 * MOCK: Loads and displays games/ads. (IMPROVED: XSS Prevention)
 */
function loadGames() {
    if (!uiElements.gameList) return;
    uiElements.gameList.innerHTML = '';
    MOCK_DB.games.forEach(game => {
        const card = document.createElement('div');
        card.className = 'game-card';
        
        const title = document.createElement('h3');
        title.textContent = game.title; // XSS Prevention
        
        const description = document.createElement('p');
        description.textContent = game.description; // XSS Prevention

        const link = document.createElement('a');
        link.href = game.url;
        link.target = '_blank';
        link.className = 'btn btn-secondary';
        link.textContent = 'Play Now (MOCK)'; // XSS Prevention

        card.appendChild(title);
        card.appendChild(description);
        card.appendChild(link);
        uiElements.gameList.appendChild(card);
    });
}


// --- BALANCE FETCHING (УЛУЧШЕНИЕ: Динамический MOCK баланс AFOX) ---

/**
 * Fetches real balances from RPC (SOL) and MOCK balances (AFOX) and updates appState.userBalances.
 */
async function fetchUserBalances() {
    if (!appState.walletPublicKey || !appState.connection) {
        appState.userBalances.SOL = BigInt(0);
        return;
    }
    
    // УЛУЧШЕНИЕ: Убедимся, что соединение рабочее перед запросом
    try {
        await appState.connection.getLatestBlockhash('confirmed');
    } catch (e) {
        appState.connection = await getRobustConnection();
    }


    try {
        const solBalance = await appState.connection.getBalance(appState.walletPublicKey, 'confirmed');
        appState.userBalances.SOL = BigInt(solBalance);
    } catch (error) {
        console.error("Failed to fetch SOL balance:", error);
        // В случае неудачи оставляем SOL баланс как есть или сбрасываем в 0, если не было MOCK
        if (appState.userBalances.SOL === BigInt(0)) {
            appState.userBalances.SOL = parseAmountToBigInt('0.05', SOL_DECIMALS); // Минимальный MOCK для комиссий
        }
        showNotification("Warning: Could not fetch real SOL balance. Using MOCK fallback.", 'warning');
    }

    // MOCK AFOX: already managed by MOCK_DB initialization and transaction updates
}


// --- STAKING FUNCTIONS (IMPROVED: Loading State, Error Handling, Dynamic Balance) ---

/**
 * Updates the staking UI elements with current user data (MOCK).
 */
async function updateStakingUI() {
    if (!appState.walletPublicKey) {
        const elements = [uiElements.userAfoxBalance, uiElements.userStakedAmount, uiElements.userRewardsAmount];
        elements.forEach(el => { if (el) el.textContent = '0 AFOX'; });
        [uiElements.stakeAfoxBtn, uiElements.claimRewardsBtn, uiElements.unstakeAfoxBtn].filter(Boolean).forEach(btn => btn.disabled = true);
        if (uiElements.stakingApr) uiElements.stakingApr.textContent = '—';
        return;
    }

    const userKey = appState.walletPublicKey.toBase58();
    const userData = MOCK_DB.staking[userKey];

    const afoxBalanceBigInt = appState.userBalances.AFOX;
    const stakedAmountBigInt = BigInt(userData.stakedAmount || '0');
    const rewardsAmountBigInt = BigInt(userData.rewards || '0');


    if (uiElements.userAfoxBalance) uiElements.userAfoxBalance.textContent = `${formatBigInt(afoxBalanceBigInt, AFOX_DECIMALS)} AFOX`;
    if (uiElements.userStakedAmount) uiElements.userStakedAmount.textContent = `${formatBigInt(stakedAmountBigInt, AFOX_DECIMALS)} AFOX`;
    if (uiElements.userRewardsAmount) uiElements.userRewardsAmount.textContent = `${formatBigInt(rewardsAmountBigInt, AFOX_DECIMALS)} AFOX`;
    if (uiElements.stakingApr) uiElements.stakingApr.textContent = '12% APR (MOCK)';
    
    if (uiElements.stakeAfoxBtn) uiElements.stakeAfoxBtn.disabled = false;
    if (uiElements.claimRewardsBtn) uiElements.claimRewardsBtn.disabled = rewardsAmountBigInt === BigInt(0);
    if (uiElements.unstakeAfoxBtn) uiElements.unstakeAfoxBtn.disabled = stakedAmountBigInt === BigInt(0);
}

/**
 * Handles the transaction for staking AFOX tokens (MOCK with BigInt).
 */
async function handleStakeAfox() {
    if (!appState.walletPublicKey || !uiElements.stakeAmountInput) {
        showNotification('Wallet not connected or input missing.', 'warning');
        return;
    }

    const amountStr = uiElements.stakeAmountInput.value;
    setLoadingState(true, uiElements.stakeAfoxBtn);

    try {
        // ✅ ИСПРАВЛЕНИЕ 8: Ошибка здесь будет поймана, если превышена точность.
        const stakeAmountBigInt = parseAmountToBigInt(amountStr, AFOX_DECIMALS);
        
        if (stakeAmountBigInt === BigInt(0)) {
            showNotification('Please enter a valid amount to stake.', 'warning');
            return;
        }

        // ДОБАВЛЕНО: Проверка баланса AFOX
        if (appState.userBalances.AFOX < stakeAmountBigInt) {
            throw new Error('Insufficient AFOX balance for staking.');
        }

        const amountForDisplay = formatBigInt(stakeAmountBigInt, AFOX_DECIMALS); 
        showNotification(`Initiating staking of ${amountForDisplay} AFOX... (Simulation)`, 'info', 5000);

        await new Promise(resolve => setTimeout(resolve, 3000));
        const userKey = appState.walletPublicKey.toBase58();
        
        // MOCK Update
        const stakedAmountOldBigInt = BigInt(MOCK_DB.staking[userKey].stakedAmount || '0');
        const rewardsOldBigInt = BigInt(MOCK_DB.staking[userKey].rewards || '0');

        const stakedAmountNewBigInt = stakedAmountOldBigInt + stakeAmountBigInt;
        
        // УЛУЧШЕНИЕ: Простая имитация начисления вознаграждения
        const mockRewardIncreaseBigInt = (stakeAmountBigInt * BigInt(1)) / BigInt(1000); 
        const rewardsNewBigInt = rewardsOldBigInt + mockRewardIncreaseBigInt;

        MOCK_DB.staking[userKey].stakedAmount = stakedAmountNewBigInt.toString();
        MOCK_DB.staking[userKey].rewards = rewardsNewBigInt.toString();
        
        // MOCK: Списывание AFOX с баланса пользователя
        appState.userBalances.AFOX = appState.userBalances.AFOX - stakeAmountBigInt;

        persistMockData();

        showNotification(`You successfully staked ${amountForDisplay} AFOX! (Simulation Confirmed)`, 'success', 7000);

        uiElements.stakeAmountInput.value = '';
        await updateStakingAndBalanceUI();

    } catch (error) {
        console.error('Error during staking (MOCK):', error);
        // ✅ ИСПРАВЛЕНИЕ 16: Улучшенная обработка ошибок
        const errorMessage = error.message.includes('precision') 
            ? `Input Error: ${error.message}` 
            : error.message.includes('Insufficient') 
            ? error.message : "An unknown error occurred during staking simulation.";
        showNotification(`Staking failed: ${errorMessage}`, 'error');
    } finally {
        setLoadingState(false, uiElements.stakeAfoxBtn);
    }
}

/**
 * Handles the transaction for claiming rewards (MOCK with BigInt).
 */
async function handleClaimRewards() {
    if (!appState.walletPublicKey) {
        showNotification('Please connect your wallet to claim rewards.', 'warning');
        return;
    }
    setLoadingState(true, uiElements.claimRewardsBtn);

    try {
        showNotification('Attempting to claim rewards... (Simulation)', 'info');
        
        await new Promise(resolve => setTimeout(resolve, 2500));
        const userKey = appState.walletPublicKey.toBase58();
        const claimedAmountBigInt = BigInt(MOCK_DB.staking[userKey].rewards || '0');
        const amountForDisplay = formatBigInt(claimedAmountBigInt, AFOX_DECIMALS);

        if (claimedAmountBigInt > BigInt(0)) {
            // MOCK Update
            MOCK_DB.staking[userKey].rewards = '0'; 
            appState.userBalances.AFOX = appState.userBalances.AFOX + claimedAmountBigInt;

            persistMockData();
            showNotification(`Rewards of ${amountForDisplay} AFOX successfully claimed! (Simulation Confirmed)`, 'success', 5000);
        } else {
             showNotification('No rewards to claim.', 'warning', 3000);
        }

        await updateStakingAndBalanceUI();

    } catch (error) {
        console.error('Error claiming rewards (MOCK):', error);
        const errorMessage = error.message || "An unknown network error occurred.";
        showNotification(`Claiming failed. Details: ${errorMessage}`, 'error');

    } finally {
        setLoadingState(false, uiElements.claimRewardsBtn);
    }
}

/**
 * Handles the transaction for unstaking AFOX tokens (MOCK).
 */
async function handleUnstakeAfox() {
    if (!appState.walletPublicKey) {
        showNotification('Please connect your wallet.', 'warning');
        return;
    }
    setLoadingState(true, uiElements.unstakeAfoxBtn);

    try {
        showNotification('Initiating unstaking process... (Simulation)', 'info', 5000);

        await new Promise(resolve => setTimeout(resolve, 3000));
        const userKey = appState.walletPublicKey.toBase58();
        const stakedAmountBigInt = BigInt(MOCK_DB.staking[userKey].stakedAmount || '0');
        const stakedAmountForDisplay = formatBigInt(stakedAmountBigInt, AFOX_DECIMALS);
        
        if (stakedAmountBigInt > BigInt(0)) {
            // MOCK Update
            MOCK_DB.staking[userKey].stakedAmount = '0'; 
            appState.userBalances.AFOX = appState.userBalances.AFOX + stakedAmountBigInt;

            persistMockData();
            showNotification(`Successfully unstaked ${stakedAmountForDisplay} AFOX!`, 'success', 7000);
        } else {
             showNotification('No AFOX currently staked.', 'warning', 3000);
        }

        await updateStakingAndBalanceUI();

    } catch (error) {
        console.error('Error during unstaking (MOCK):', error);
        const errorMessage = error.message || "An unknown network error occurred.";
        showNotification(`Unstaking failed. Details: ${errorMessage}`, 'error');

    } finally {
        setLoadingState(false, uiElements.unstakeAfoxBtn);
    }
}


// --- SWAP FUNCTIONS (IMPROVED: Loading State, Error Handling, Dynamic Balance) ---

/**
 * Updates balances for the "From" token in the swap section.
 */
async function updateSwapBalances() {
    if (!appState.walletPublicKey || !appState.provider) {
        if (uiElements.swapFromBalanceSpan) uiElements.swapFromBalanceSpan.textContent = '0';
        return;
    }

    const fromToken = uiElements.swapFromTokenSelect.value;
    
    let displayBalance = '0';
    const fromTokenMint = TOKEN_MINT_ADDRESSES[fromToken];
    
    // Используем MOCK/реальные балансы из appState
    if (fromTokenMint.equals(TOKEN_MINT_ADDRESSES['SOL'])) {
        const solBalance = appState.userBalances.SOL;
        displayBalance = formatBigInt(solBalance, SOL_DECIMALS);
    } else if (fromTokenMint.equals(TOKEN_MINT_ADDRESSES['AFOX'])) {
        const afoxBalance = appState.userBalances.AFOX;
        displayBalance = formatBigInt(afoxBalance, AFOX_DECIMALS);
    }
    
    if (uiElements.swapFromBalanceSpan) {
        uiElements.swapFromBalanceSpan.textContent = `${displayBalance} ${fromToken}`;
    }

    if (uiElements.swapFromAmountInput && uiElements.swapFromAmountInput.value.trim() !== '' && !appState.currentJupiterQuote) {
         // Debouncing the quote call ensures it only runs after a user pauses typing
         const debouncedGetQuote = debounce(getQuote, 500); 
         debouncedGetQuote();
    }
}


/**
 * Fetches a swap quote from Jupiter Aggregator.
 */
async function getQuote() {
    if (!appState.walletPublicKey || !appState.provider || !appState.connection) {
        clearSwapQuote();
        return;
    }

    const fromToken = uiElements.swapFromTokenSelect.value;
    const toToken = uiElements.swapToTokenSelect.value;
    const amountStr = uiElements.swapFromAmountInput.value;

    if (fromToken === toToken || !amountStr || amountStr.trim() === '') {
        clearSwapQuote();
        return;
    }

    const fromMint = TOKEN_MINT_ADDRESSES[fromToken];
    const toMint = TOKEN_MINT_ADDRESSES[toToken];
    const decimalsFrom = getTokenDecimals(fromMint);

    setLoadingState(true, uiElements.getQuoteBtn);

    try {
        const inputAmountBigInt = parseAmountToBigInt(amountStr, decimalsFrom);
        
        // ДОБАВЛЕНО: Проверка на превышение баланса
        const balanceToCheck = fromMint.equals(TOKEN_MINT_ADDRESSES['SOL']) ? 
            appState.userBalances.SOL - parseAmountToBigInt(getSolanaTxnFeeReserve().toString(), SOL_DECIMALS) : 
            appState.userBalances.AFOX;

        if (inputAmountBigInt > balanceToCheck) {
             throw new Error(`Insufficient ${fromToken} balance.`);
        }

        const inputAmountLamports = inputAmountBigInt.toString();

        if (inputAmountBigInt === BigInt(0)) {
            clearSwapQuote();
            return;
        }
        
        // УЛУЧШЕНИЕ: Убедимся, что соединение рабочее перед запросом API
        try {
            await appState.connection.getLatestBlockhash('confirmed');
        } catch (e) {
            appState.connection = await getRobustConnection();
        }

        const response = await fetchWithTimeout(`${JUPITER_API_URL}/quote?inputMint=${fromMint.toBase58()}&outputMint=${toMint.toBase58()}&amount=${inputAmountLamports}&slippageBps=50`, {}, 8000);
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Failed to get quote: ${errorData.error || response.statusText}`);
        }
        const data = await response.json();
        appState.currentJupiterQuote = data;

        const outputDecimals = getTokenDecimals(toMint);

        if (uiElements.swapToAmountInput) uiElements.swapToAmountInput.value = formatBigInt(appState.currentJupiterQuote.outAmount, outputDecimals);
        if (uiElements.priceImpactSpan) uiElements.priceImpactSpan.textContent = `${(appState.currentJupiterQuote.priceImpactPct * 100).toFixed(2)}%`;
        
        const lpFeeAmount = appState.currentJupiterQuote.lpFee && appState.currentJupiterQuote.lpFee.amount ? appState.currentJupiterQuote.lpFee.amount : '0';
        if (uiElements.lpFeeSpan) uiElements.lpFeeSpan.textContent = `${formatBigInt(lpFeeAmount, outputDecimals)} ${uiElements.swapToTokenSelect.value}`;
        if (uiElements.minReceivedSpan) uiElements.minReceivedSpan.textContent = `${formatBigInt(appState.currentJupiterQuote.otherAmountThreshold, outputDecimals)} ${uiElements.swapToTokenSelect.value}`;

        if (uiElements.executeSwapBtn) uiElements.executeSwapBtn.style.display = 'block';

    } catch (error) {
        console.error('Error fetching quote:', error);
        let message = error.message.includes('timed out') ? "Request timed out. Try again." : error.message;
        
        if (error.message.includes('Insufficient')) {
            message = error.message;
        }

        // ✅ ИСПРАВЛЕНИЕ 16: Предотвращение обрезания важного сообщения
        showNotification(`Error fetching quote: ${message.substring(0, 100)}`, 'error');
        clearSwapQuote();
    } finally {
        setLoadingState(false, uiElements.getQuoteBtn);
    }
}

/**
 * Executes the swap transaction via Jupiter Aggregator.
 */
async function executeSwap() {
    if (!appState.walletPublicKey || !appState.currentJupiterQuote || !appState.provider || !appState.connection) {
        showNotification('Missing required connection details.', 'error');
        return;
    }
    
    setLoadingState(true, uiElements.executeSwapBtn);
    showNotification('Preparing swap transaction...', 'info');

    const fromToken = uiElements.swapFromTokenSelect.value;
    const toToken = uiElements.swapToTokenSelect.value;
    const inputAmountBigInt = BigInt(appState.currentJupiterQuote.inAmount);
    const outputAmountBigInt = BigInt(appState.currentJupiterQuote.outAmount);

    try {
        // УЛУЧШЕНИЕ: Убедимся, что соединение рабочее перед запросом API
        try {
            await appState.connection.getLatestBlockhash('finalized');
        } catch (e) {
            appState.connection = await getRobustConnection();
        }

        const response = await fetchWithTimeout(`${JUPITER_API_URL}/swap`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                quoteResponse: appState.currentJupiterQuote,
                userPublicKey: appState.walletPublicKey.toBase58(),
                wrapUnwrapSOL: true, 
            }),
        }, 10000); 

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Failed to get swap transaction: ${errorData.error || response.statusText}`);
        }

        const { swapTransaction } = await response.json();
        const transactionBuf = Buffer.from(swapTransaction, 'base64');
        const transaction = SolanaWeb3.Transaction.from(transactionBuf);

        transaction.recentBlockhash = (await appState.connection.getLatestBlockhash('finalized')).blockhash;
        transaction.feePayer = appState.walletPublicKey;

        // В РЕАЛЬНОМ КОДЕ: Замена на appState.provider.sendAndConfirm
        // const signature = await appState.provider.sendAndConfirm(transaction);

        // MOCK: Имитация успешной транзакции
        const signature = 'MOCK_TXN_SIG_' + Date.now();
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        showNotification(`Transaction simulated. Signature: ${signature.substring(0, 8)}... (Waiting for confirmation...)`, 'info', 10000);

        // MOCK: Обновление балансов после успешного свапа
        if (fromToken === 'AFOX') {
            appState.userBalances.AFOX = appState.userBalances.AFOX - inputAmountBigInt;
        }
        if (toToken === 'AFOX') {
            appState.userBalances.AFOX = appState.userBalances.AFOX + outputAmountBigInt;
        }
        // SOL баланс будет обновлен реальным запросом в fetchUserBalances() или через MOCK

        showNotification('Swap successfully executed! 🎉 (Simulation)', 'success');
        
        if (uiElements.swapFromAmountInput) uiElements.swapFromAmountInput.value = '';
        if (uiElements.swapToAmountInput) uiElements.swapToAmountInput.value = '';
        clearSwapQuote(); 
        await updateStakingAndBalanceUI(); // Обновляет SOL и AFOX

    } catch (error) {
        console.error('Error during swap execution:', error);
        let errorMessage = 'Swap failed due to an unknown error.';
        if (error.message.includes('timed out')) {
            errorMessage = "Transaction preparation timed out. Try again.";
        } else if (error.message.includes('Transaction failed')) {
            errorMessage = "Swap transaction failed on chain.";
        } else {
            errorMessage = `Swap failed: ${error.message.substring(0, 100)}`;
        }
        // ✅ ИСПРАВЛЕНИЕ 16: Предотвращение обрезания важного сообщения
        showNotification(errorMessage, 'error');
    } finally {
        setLoadingState(false, uiElements.executeSwapBtn);
    }
}


/**
 * Handles setting the MAX amount for a swap (IMPROVED SAFETY).
 * ✅ ИСПРАВЛЕНИЕ 9: Уточнен расчет MAX SOL.
 */
async function handleMaxAmount(event) {
    const inputId = event.target.dataset.inputId;
    const inputElement = document.getElementById(inputId);

    if (!inputElement || !appState.walletPublicKey) return;

    const fromToken = uiElements.swapFromTokenSelect.value;
    const fromTokenMint = TOKEN_MINT_ADDRESSES[fromToken];
    if (!fromTokenMint) {
        showNotification('Selected "From" token is invalid.', 'error');
        return;
    }

    try {
        let maxAmount;
        let decimals;

        if (fromTokenMint.equals(TOKEN_MINT_ADDRESSES['SOL'])) {
            const solBalance = appState.userBalances.SOL;
            // ✅ ИСПРАВЛЕНИЕ 9: Используем более точный расчет MAX SOL
            const reserveLamports = parseAmountToBigInt(getSolanaTxnFeeReserve().toString(), SOL_DECIMALS);
            maxAmount = solBalance > reserveLamports ? solBalance - reserveLamports : BigInt(0);
            decimals = SOL_DECIMALS;
        } else if (fromTokenMint.equals(TOKEN_MINT_ADDRESSES['AFOX'])) {
            maxAmount = appState.userBalances.AFOX;
            decimals = AFOX_DECIMALS;
        } else {
             maxAmount = BigInt(0);
             decimals = 9;
        }
        
        inputElement.value = formatBigInt(maxAmount, decimals);

    } catch (error) {
        console.error('Error getting max token balance:', error);
        showNotification('Error getting maximum balance.', 'error');
        inputElement.value = '0';
    }
    clearSwapQuote();
    if (inputElement.value !== '0') {
        getQuote();
    }
}


// --- JUPITER TERMINAL INTEGRATION (Удалены хрупкие хаки iFrame) ---

/**
 * Initializes the Jupiter Terminal and adds event listeners.
 */
function initializeJupiterTerminal() {
    if (typeof window.Jupiter === 'undefined') {
        return;
    }
    
    // Jupiter Terminal setup (assuming it's loaded via a separate script tag)
    window.Jupiter.init({
        endpoint: JUPITER_RPC_ENDPOINT,
        formProps: {
            fixedOutputMint: true,
            initialOutputMint: AFOX_MINT_ADDRESS_STRING,
            initialInputMint: SOL_MINT,
        },
    });

    if (uiElements.swapDirectionBtn) {
        uiElements.swapDirectionBtn.addEventListener('click', handleSwapDirectionChange);
    }
}

// --- INITIALIZATION AND EVENT LISTENERS ---

/**
 * Caches all necessary UI elements.
 */
function cacheUIElements() {
    // General Wallet & Display
    uiElements.connectWalletButtons = Array.from(document.querySelectorAll('.connect-wallet-btn'));
    uiElements.walletAddressDisplays = Array.from(document.querySelectorAll('.wallet-address-display'));
    
    // Modals and Close Buttons
    uiElements.nftDetailsModal = document.getElementById('nft-details-modal');
    uiElements.nftModal = document.getElementById('nft-modal');
    uiElements.mintNftModal = document.getElementById('mint-nft-modal');
    uiElements.createProposalModal = document.getElementById('create-proposal-modal');
    
    Array.from(document.querySelectorAll('.close-modal')).forEach(btn => {
        btn.addEventListener('click', closeAllPopups);
    });

    // Menu Elements
    uiElements.mainNav = document.querySelector('nav');
    uiElements.menuToggle = document.getElementById('menu-toggle');
    uiElements.closeMainMenuCross = document.querySelector('.close-menu');
    uiElements.navLinks = Array.from(document.querySelectorAll('nav a'));

    // NFT Section
    uiElements.userNftList = document.getElementById('user-nft-list');
    uiElements.marketplaceNftList = document.getElementById('marketplace-nft-list');
    uiElements.nftToSellSelect = document.getElementById('nft-to-sell');
    uiElements.listNftForm = document.getElementById('list-nft-form');
    uiElements.mintNftForm = document.getElementById('mint-nft-form');
    
    // NFT Details Modal elements
    uiElements.nftDetailImage = document.getElementById('nft-detail-image');
    uiElements.nftDetailName = document.getElementById('nft-detail-name');
    uiElements.nftDetailDescription = document.getElementById('nft-detail-description');
    uiElements.nftDetailOwner = document.getElementById('nft-detail-owner');
    uiElements.nftDetailMint = document.getElementById('nft-detail-mint');
    uiElements.attributesList = document.getElementById('attributes-list');
    uiElements.nftDetailBuyBtn = document.getElementById('nft-detail-buy-btn');
    uiElements.nftDetailSellBtn = document.getElementById('nft-detail-sell-btn');
    uiElements.nftDetailTransferBtn = document.getElementById('nft-detail-transfer-btn');
    uiElements.nftDetailHistory = document.getElementById('nft-detail-history');

    // Announcements & Games
    uiElements.announcementsList = document.getElementById('announcements-list');
    uiElements.gameList = document.getElementById('game-list');

    // Staking Section
    uiElements.userAfoxBalance = document.getElementById('user-afox-balance');
    uiElements.userStakedAmount = document.getElementById('user-staked-amount');
    uiElements.userRewardsAmount = document.getElementById('user-rewards-amount');
    uiElements.stakingApr = document.getElementById('staking-apr');
    uiElements.stakeAmountInput = document.getElementById('stake-amount');
    uiElements.stakeAfoxBtn = document.getElementById('stake-afox-btn');
    uiElements.claimRewardsBtn = document.getElementById('claim-rewards-btn');
    uiElements.unstakeAfoxBtn = document.getElementById('unstake-afox-btn');
    
    // SWAP Section
    uiElements.swapFromAmountInput = document.getElementById('swap-from-amount');
    uiElements.swapFromTokenSelect = document.getElementById('swap-from-token');
    uiElements.swapFromBalanceSpan = document.getElementById('swap-from-balance');
    uiElements.swapDirectionBtn = document.getElementById('swap-direction-btn');
    uiElements.swapToAmountInput = document.getElementById('swap-to-amount');
    uiElements.swapToTokenSelect = document.getElementById('swap-to-token');
    uiElements.priceImpactSpan = document.getElementById('price-impact');
    uiElements.lpFeeSpan = document.getElementById('lp-fee');
    uiElements.minReceivedSpan = document.getElementById('min-received');
    uiElements.getQuoteBtn = document.getElementById('get-quote-btn');
    uiElements.executeSwapBtn = document.getElementById('execute-swap-btn');
    uiElements.maxAmountBtns = Array.from(document.querySelectorAll('.max-amount-btn'));


    // Utility
    uiElements.copyButtons = Array.from(document.querySelectorAll('.copy-btn'));
    uiElements.notificationContainer = document.getElementById('notification-container');
    uiElements.pageLoader = document.getElementById('page-loader');
    uiElements.contactForm = document.getElementById('contact-form');
}

/**
 * Initializes all event listeners.
 */
function initEventListeners() {
    // Wallet Connection
    uiElements.connectWalletButtons.forEach(btn => {
        btn.addEventListener('click', () => { connectWallet({ name: 'Phantom' }); });
    });

    // Menu Toggle
    if (uiElements.menuToggle) {
        uiElements.menuToggle.addEventListener('click', () => {
            uiElements.mainNav.classList.toggle('active');
            uiElements.menuToggle.classList.toggle('active');
        });
    }
    if (uiElements.closeMainMenuCross) uiElements.closeMainMenuCross.addEventListener('click', closeAllPopups);
    uiElements.navLinks.forEach(link => link.addEventListener('click', closeAllPopups));


    // NFT Marketplace (Delegation)
    if (uiElements.userNftList) {
        uiElements.userNftList.addEventListener('click', (e) => handleNftItemClick(e, true)); 
    }
    if (uiElements.marketplaceNftList) {
        uiElements.marketplaceNftList.addEventListener('click', (e) => handleNftItemClick(e, false)); 
    }
    
    // NFT Forms and Actions
    if (uiElements.mintNftForm) uiElements.mintNftForm.addEventListener('submit', handleMintNftSubmit);
    if (uiElements.listNftForm) uiElements.listNftForm.addEventListener('submit', handleListNftSubmit);
    if (uiElements.nftDetailBuyBtn) uiElements.nftDetailBuyBtn.addEventListener('click', handleBuyNft);
    if (uiElements.nftDetailSellBtn) {
        // УЛУЧШЕНИЕ: Теперь кнопка Unlist видна только когда NFT выставлен
        uiElements.nftDetailSellBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (appState.currentOpenNft && appState.currentOpenNft.isListed) {
                handleUnlistNft();
            }
        });
    }
    if (uiElements.nftDetailTransferBtn) uiElements.nftDetailTransferBtn.addEventListener('click', handleTransferNft);

    // Staking Actions
    if (uiElements.stakeAfoxBtn) uiElements.stakeAfoxBtn.addEventListener('click', handleStakeAfox);
    if (uiElements.claimRewardsBtn) uiElements.claimRewardsBtn.addEventListener('click', handleClaimRewards);
    if (uiElements.unstakeAfoxBtn) uiElements.unstakeAfoxBtn.addEventListener('click', handleUnstakeAfox);


    // SWAP Actions
    const debouncedGetQuote = debounce(getQuote, 500);

    if (uiElements.swapFromTokenSelect) {
        uiElements.swapFromTokenSelect.addEventListener('change', () => {
            updateSwapBalances();
            clearSwapQuote(); 
        });
    }
    if (uiElements.swapToTokenSelect) {
        uiElements.swapToTokenSelect.addEventListener('change', () => {
            clearSwapQuote(); 
            if (uiElements.swapFromAmountInput.value.trim() !== '') debouncedGetQuote();
        });
    }
    if (uiElements.swapFromAmountInput) {
        uiElements.swapFromAmountInput.addEventListener('input', () => {
             clearSwapQuote();
             debouncedGetQuote();
        });
    }
    if (uiElements.getQuoteBtn) uiElements.getQuoteBtn.addEventListener('click', getQuote);
    if (uiElements.executeSwapBtn) uiElements.executeSwapBtn.addEventListener('click', executeSwap);
    uiElements.maxAmountBtns.forEach(btn => {
        btn.addEventListener('click', handleMaxAmount);
    });
    if (uiElements.swapDirectionBtn) {
        uiElements.swapDirectionBtn.addEventListener('click', handleSwapDirectionChange);
    }

    // General Copy Button
    uiElements.copyButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const textToCopy = btn.dataset.copyTarget;
            navigator.clipboard.writeText(textToCopy)
                .then(() => showNotification('Address copied to clipboard!', 'success', 2000))
                .catch(err => console.error('Could not copy text: ', err));
        });
    });

    // Contact Form (MOCK)
    if (uiElements.contactForm) {
        uiElements.contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            showNotification('Thank you! Your message has been sent. (MOCK)', 'success', 5000);
            uiElements.contactForm.reset();
        });
    }
}

/**
 * Main initialization function.
 */
async function init() {
    cacheUIElements();
    initEventListeners();
    initializeJupiterTerminal(); 
    
    // MOCK Data Initialization (Safely populating initial MOCK data if empty)
    if (MOCK_DB.nfts.length === 0) {
        // Улучшение: Делаем первого владельца 'NO_WALLET_CONNECTED' для простоты
        const initialNfts = [
            { mint: 'NFT1_MOCK_MINT', name: 'Alpha Fox #001 (Listed)', description: 'Rare Alpha Fox NFT. Buy me!', owner: 'NO_WALLET_CONNECTED', price: 5.5, isListed: true, image: 'https://via.placeholder.com/180x180/007bff/ffffff?text=Fox+001', attributes: [{ trait_type: 'Rarity', value: 'Epic' }, { trait_type: 'Edition', value: 'First' }] },
            { mint: 'NFT2_MOCK_MINT', name: 'Alpha Fox #002 (Owned)', description: 'Common Alpha Fox NFT. My personal collection.', owner: 'NO_WALLET_CONNECTED', price: 0, isListed: false, image: 'https://via.placeholder.com/180x180/17a2b8/ffffff?text=Fox+002', attributes: [{ trait_type: 'Rarity', value: 'Common' }] }
        ];
        MOCK_DB.nfts.push(...initialNfts);
        MOCK_DB.nftHistory['NFT1_MOCK_MINT'] = [{ type: 'Mint', timestamp: new Date(Date.now() - 86400000).toISOString(), to: 'INITIAL_OWNER' }];
        MOCK_DB.nftHistory['NFT2_MOCK_MINT'] = [{ type: 'Mint', timestamp: new Date(Date.now() - 7200000).toISOString(), to: 'INITIAL_OWNER' }];
        persistMockData();
    }

    // Initial data load
    loadAnnouncements();
    loadGames();
    loadUserNFTs(); 
    loadMarketplaceNFTs(); 
    updateStakingUI();
    updateWalletUI(null); 
    
    // ДОБАВЛЕНО: Пытаемся установить соединение сразу при запуске
    try {
        appState.connection = await getRobustConnection();
    } catch (e) {
        console.warn(e.message);
        showNotification("Warning: Failed to connect to Solana RPC on startup.", 'warning', 7000);
    }
}

// Ensure the script runs after the entire document is loaded
document.addEventListener('DOMContentLoaded', init);
