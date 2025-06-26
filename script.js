// --- Global Variables for Wallet Connection ---
let walletPublicKey = null;
let provider = null;
let connection = null;
let providerListenersInitialized = false;

// --- Wallet Setup ---
const network = SolanaWeb3.WalletAdapterNetwork.Devnet;
const wallets = [
    new SolanaWalletAdapterPhantom.PhantomWalletAdapter(),
    // ... other wallets
];

// --- Your Smart Contract Constants (REPLACE WITH REAL ONES!) ---
const STAKING_PROGRAM_ID = new SolanaWeb3.PublicKey('YOUR_STAKING_PROGRAM_ID_HERE');
const AFOX_TOKEN_MINT_ADDRESS = new SolanaWeb3.PublicKey('YourAFOXTokenMintAddressHere');
const AFOX_TOKEN_DECIMALS = 9;
const MARKETPLACE_PROGRAM_ID = new SolanaWeb3.PublicKey('YOUR_MARKETPLACE_PROGRAM_ID_HERE');
const DUMMY_STAKING_VAULT_ADDRESS = new SolanaWeb3.PublicKey('SomeDummyStakingVaultAddressHere'); // REMOVE/REPLACE IN REAL APP

// --- UI Elements (All defined here) ---
const connectWalletBtn = document.getElementById('connectWalletBtn'); // Use one consistent ID
const connectWalletBtnWeb3 = document.getElementById('connectWalletBtnWeb3'); // If you really need multiple buttons
const connectWalletNftBtn = document.getElementById('connectWalletNftBtn');
// ... all other UI elements from both blocks
const walletAddressDisplayWeb3 = document.getElementById('walletAddressDisplayWeb3');
const walletAddressDisplayNft = document.getElementById('walletAddressDisplayNft');
const walletAddressDisplayDao = document.getElementById('walletAddressDisplayDao');

const nftDetailsModal = document.getElementById('nftDetailsModal');
const closeNftDetailsBtn = document.getElementById('closeNftDetailsBtn'); // Or use closeButton
const nftDetailImage = document.getElementById('nftDetailImage');
// ... etc.

const userNftList = document.getElementById('user-nft-list');
const marketplaceNftList = document.getElementById('marketplace-nft-list');

// Staking UI elements
const userAfoxBalance = document.getElementById('userAfoxBalance');
// ... all other staking elements

// Announcement, multimedia, games, ads elements
const announcementsList = document.getElementById('announcementsList');
// ... etc.

// --- Helper Functions ---
function showNotification(message, type = 'info', duration = 3000) { /* ... implementation ... */ }
function handleWalletDisconnect() { /* ... implementation ... */ }
function setupProviderListeners() { /* ... implementation ... */ }
function initializeSolanaConnection() { /* ... implementation ... */ }
function createNftCard(nft, currentUserWallet) { /* ... implementation ... */ }

// --- Wallet Connection Logic ---
async function connectWallet() { /* ... implementation ... */ }

// --- Staking Logic (Real & Pseudo) ---
async function updateStakingUI() { /* ... implementation ... */ }
async function getUserStakingAccount(publicKey) { /* ... implementation ... */ }
async function getStakingPoolInfo() { /* ... implementation ... */ }

// --- NFT Section Logic ---
async function loadUserNFTs(walletAddress) { /* ... implementation ... */ }
async function loadMarketplaceNFTs() { /* ... implementation ... */ }
async function showNftDetails(nft, currentUserWallet) { /* ... implementation ... */ }

// --- Dynamic Content Loading (Announcements, Photos, Posts, Games, Ads) ---
async function loadAnnouncements() { /* ... implementation ... */ }
async function loadGames() { /* ... implementation ... */ }
async function loadAds() { /* ... implementation ... */ }
async function loadPhotos() { /* ... implementation ... */ }
async function loadPosts() { /* ... implementation ... */ }

// --- Event Listeners ---
if (connectWalletBtn) connectWalletBtn.addEventListener('click', connectWallet);
if (connectWalletBtnWeb3) connectWalletBtnWeb3.addEventListener('click', connectWallet); // If you have multiple buttons
if (connectWalletNftBtn) connectWalletNftBtn.addEventListener('click', connectWallet); // If you have multiple buttons

if (stakeAfoxBtn) { /* ... event listener for stake ... */ }
if (claimRewardsBtn) { /* ... event listener for claim ... */ }
if (unstakeAfoxBtn) { /* ... event listener for unstake ... */ }

if (mintNftForm) { /* ... event listener for mint form ... */ }
if (listNftForm) { /* ... event listener for list form ... */ }

if (closeNftDetailsBtn) { /* ... event listener for closing modal ... */ }
window.addEventListener('click', (event) => { /* ... event listener for closing modal outside click ... */ });
document.addEventListener('keydown', (event) => { /* ... event listener for Escape key ... */ });

if (publishButton && announcementInput) { /* ... event listener for announcements ... */ }
if (photoUploadForm) { /* ... event listener for photo upload ... */ }
if (postForm) { /* ... event listener for post form ... */ }
if (uploadGameBtnWeb3) { /* ... event listener for game upload ... */ }
if (postAdBtnWeb3) { /* ... event listener for ad post ... */ }
if (copyBtn) { /* ... event listener for copy button ... */ }


// --- Initial Data Load on Page Ready ---
document.addEventListener('DOMContentLoaded', async () => {
    // Add notification container and styles
    const notificationContainer = document.createElement('div');
    notificationContainer.id = 'notificationContainer';
    document.body.appendChild(notificationContainer);
    const style = document.createElement('style');
    // ... add notification styles
    document.head.appendChild(style);

    initializeSolanaConnection(); // Initialize Solana connection once

    // Load static content
    await loadAnnouncements();
    await loadGames();
    await loadAds();
    await loadPhotos();
    await loadPosts();
    await loadMarketplaceNFTs();

    // Attempt to auto-connect wallet
    try {
        const selectedWallet = wallets[0];
        if (selectedWallet && selectedWallet.connected && selectedWallet.publicKey) {
            walletPublicKey = selectedWallet.publicKey;
            provider = selectedWallet;
            if (walletAddressDisplayWeb3) walletAddressDisplayWeb3.textContent = walletPublicKey.toBase58();
            if (walletAddressDisplayNft) walletAddressDisplayNft.textContent = walletPublicKey.toBase58();
            if (walletAddressDisplayDao) walletAddressDisplayDao.textContent = walletPublicKey.toBase58();

            setupProviderListeners(); // Setup listeners on auto-connect

            await loadUserNFTs(walletPublicKey.toBase58());
            await updateStakingUI(); // Update staking UI on auto-connect
            showNotification('Wallet auto-connected!', 'info');
        } else {
             // If not auto-connected, ensure staking UI is reset to default (0 values)
             updateStakingUI();
        }
    } catch (e) {
        console.warn("Auto-connect failed or wallet not found/authorized:", e);
        handleWalletDisconnect(); // Reset UI if auto-connect fails
    }
});
