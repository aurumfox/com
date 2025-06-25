// =========================================================================
// script.js (Frontend Code - to be placed in your public/script.js file)
// =========================================================================

// Assumes you have already linked the @solana/web3.js and @solana/wallet-adapter-phantom libraries
// in your HTML, e.g.:
// <script src="https://unpkg.com/@solana/web3.js@latest/lib/index.iife.js"></script>
// <script src="https://unpkg.com/@solana/wallet-adapter-base@latest/lib/index.iife.js"></script>
// <script src="https://unpkg.com/@solana/wallet-adapter-phantom@latest/lib/index.iife.js"></script>

// --- DOM Element References ---
const connectWalletBtnWeb3 = document.getElementById('connectWalletBtnWeb3');
const walletAddressDisplayWeb3 = document.getElementById('walletAddressDisplayWeb3');
const connectWalletNftBtn = document.getElementById('connectWalletNftBtn');
const walletAddressDisplayNft = document.getElementById('walletAddressDisplayNft');

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


// --- Global Variables for Wallet Connection ---
let walletPublicKey = null; // Stores the public key of the connected wallet
let provider = null; // For accessing the Phantom/Solflare window (the wallet adapter instance)
let connection = null; // Solana connection object

// --- Wallet Setup ---
const network = SolanaWeb3.WalletAdapterNetwork.Devnet; // Change to 'Mainnet-beta' for production
const wallets = [
    new SolanaWalletAdapterPhantom.PhantomWalletAdapter(),
    // Add other wallets here if desired, e.g.:
    // new SolanaWalletAdapterWallets.SolflareWalletAdapter({ network }),
];

// --- Wallet Connection Function ---
async function connectWallet() {
    try {
        const selectedWallet = wallets[0]; // For simplicity, always pick Phantom
        if (!selectedWallet) {
            alert('No wallet adapter found. Please ensure Phantom is installed and enabled.');
            return;
        }

        // Check if the wallet is already connected and authorized for the current site
        if (selectedWallet.connected && selectedWallet.publicKey) {
            walletPublicKey = selectedWallet.publicKey;
            provider = selectedWallet; // Set provider if already connected
            console.log('Wallet already connected:', walletPublicKey.toBase58());
        } else {
            // If not connected, request connection
            await selectedWallet.connect();
            walletPublicKey = selectedWallet.publicKey;
            provider = selectedWallet; // Set provider after successful connection
            console.log('Wallet connected:', walletPublicKey.toBase58());
        }

        // Update display elements
        if (walletAddressDisplayWeb3) walletAddressDisplayWeb3.textContent = walletPublicKey.toBase58();
        if (walletAddressDisplayNft) walletAddressDisplayNft.textContent = walletPublicKey.toBase58();

        // Initialize Solana Connection
        connection = new SolanaWeb3.Connection(
            SolanaWeb3.clusterApiUrl(network),
            'confirmed'
        );

        // Load user-specific data after wallet connection
        await loadUserNFTs(walletPublicKey.toBase58());

        // Listen for account changes (only works if `solana` object is globally available)
        // Note: The `window.solana` object for Phantom is often deprecated in favor of adapter events.
        // The wallet adapter itself provides 'publicKey' and 'disconnect' events.
        if (provider) {
             provider.on('publicKey', (publicKey) => {
                if (publicKey) {
                    console.log('Account changed to:', publicKey.toBase58());
                    walletPublicKey = publicKey;
                    if (walletAddressDisplayWeb3) walletAddressDisplayWeb3.textContent = walletPublicKey.toBase58();
                    if (walletAddressDisplayNft) walletAddressDisplayNft.textContent = walletPublicKey.toBase58();
                    loadUserNFTs(walletPublicKey.toBase58()); // Reload NFTs for new account
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
        }


    } catch (error) {
        console.error('Failed to connect wallet:', error);
        alert(`Failed to connect wallet: ${error.message || error}`);
        handleWalletDisconnect();
    }
}

function handleWalletDisconnect() {
    walletPublicKey = null;
    provider = null;
    connection = null;
    if (walletAddressDisplayWeb3) walletAddressDisplayWeb3.textContent = 'Not Connected';
    if (walletAddressDisplayNft) walletAddressDisplayNft.textContent = 'Not Connected';
    if (userNftList) userNftList.innerHTML = '<p class="placeholder-item web3-placeholder">Connect your wallet to see your NFTs.</p>';
    if (nftToSellSelect) nftToSellSelect.innerHTML = '<option value="">-- Please select an NFT --</option>';
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
    }
}

// --- NFT Details Modal Functions ---
if (closeButton) {
    closeButton.onclick = function() {
        if (nftDetailsModal) nftDetailsModal.style.display = 'none';
    };
}

window.onclick = function(event) {
    if (event.target == nftDetailsModal) {
        nftDetailsModal.style.display = 'none';
    }
};

async function showNftDetails(nft, currentUserWallet) {
    if (!nftDetailsModal) return; // Ensure modal elements exist

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

    if (nftDetailHistory) nftDetailHistory.textContent = 'Not implemented in this simulation.';

    // Attach event listeners for actions
    if (nftDetailBuyBtn) nftDetailBuyBtn.onclick = () => alert(`Simulating purchase of ${nft.name} for ${nft.price} SOL. (Requires real blockchain interaction)`);
    if (nftDetailSellBtn) {
        nftDetailSellBtn.onclick = () => {
            if (nftToSellSelect) document.getElementById('nftToSell').value = nft.mint;
            if (nftDetailsModal) nftDetailsModal.style.display = 'none';
            // Smooth scroll to the NFT section
            const nftSection = document.getElementById('nft-section');
            if (nftSection) nftSection.scrollIntoView({ behavior: 'smooth' });
        };
    }
    if (nftDetailTransferBtn) nftDetailTransferBtn.onclick = () => alert(`Simulating transfer of ${nft.name}. (Requires real blockchain interaction)`);

    nftDetailsModal.style.display = 'flex';
}

// --- Event Listeners for Wallet Connect Buttons ---
if (connectWalletBtnWeb3) connectWalletBtnWeb3.addEventListener('click', connectWallet);
if (connectWalletNftBtn) connectWalletNftBtn.addEventListener('click', connectWallet);

// --- Mint NFT Form Submission ---
if (mintNftForm) {
    mintNftForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!walletPublicKey) {
            alert('Please connect your Solana wallet first to mint an NFT.');
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
            alert(`NFT minted successfully (simulated)! Metadata URI: ${result.uri}, Mint Address: ${result.mintAddress}`);
            mintNftForm.reset(); // Clear the form
            await loadUserNFTs(walletPublicKey.toBase58()); // Reload user's NFTs
            await loadMarketplaceNFTs(); // Also refresh marketplace
        } catch (error) {
            console.error('Error minting NFT:', error);
            alert(`Failed to mint NFT: ${error.message}`);
        }
    });
}

// --- List NFT Form Submission ---
if (listNftForm) {
    listNftForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!walletPublicKey) {
            alert('Please connect your Solana wallet first to list an NFT.');
            return;
        }

        const mintAddress = document.getElementById('nftToSell').value;
        const salePrice = parseFloat(document.getElementById('salePrice').value);
        const listingDuration = parseInt(document.getElementById('listingDuration').value, 10);

        if (!mintAddress || isNaN(salePrice) || salePrice <= 0 || isNaN(listingDuration) || listingDuration <= 0) {
            alert('Please select an NFT and enter a valid price and duration.');
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
            alert(result.message);
            listNftForm.reset(); // Clear the form
            await loadUserNFTs(walletPublicKey.toBase58()); // Reload user's NFTs (it should now be "listed")
            await loadMarketplaceNFTs(); // Refresh marketplace listings
        } catch (error) {
            console.error('Error listing NFT:', error);
            alert(`Failed to list NFT: ${error.message}`);
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
                    alert('Announcement published!');
                } else {
                    alert('Failed to publish announcement. (Admin only in real app)');
                }
            } catch (error) {
                console.error('Error publishing announcement:', error);
                alert('Error connecting to server.');
            }
        } else {
            alert('Please enter an announcement.');
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
    }
}

if (uploadGameBtnWeb3) {
    uploadGameBtnWeb3.addEventListener('click', () => {
        alert('Game upload functionality requires a form and backend integration to handle files.');
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
    }
}

if (postAdBtnWeb3) {
    postAdBtnWeb3.addEventListener('click', () => {
        alert('Ad posting functionality requires a form and backend integration to handle details and creative files.');
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
                alert('Photo uploaded successfully!');
                photoUploadForm.reset();
                await loadPhotos();
            } else {
                const errorData = await response.json();
                alert(`Failed to upload photo: ${errorData.error || response.statusText}`);
            }
        } catch (error) {
            console.error('Error uploading photo:', error);
            alert('Error connecting to server to upload photo.');
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
    }
}

if (postForm) {
    postForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('post-title').value.trim();
        const content = document.getElementById('post-content').value.trim();

        if (!title || !content) {
            alert('Please enter both title and content for your post.');
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
                alert('Post published successfully!');
                postForm.reset();
                await loadPosts();
            } else {
                alert('Failed to publish post.');
            }
        } catch (error) {
            console.error('Error publishing post:', error);
            alert('Error connecting to server to publish post.');
        }
    });
}

// --- Initial Data Load on Page Ready ---
document.addEventListener('DOMContentLoaded', async () => {
    // Initial loads of static content and marketplace NFTs
    await loadAnnouncements();
    await loadGames();
    await loadAds();
    await loadPhotos();
    await loadPosts();
    await loadMarketplaceNFTs();

    // Attempt to auto-connect wallet if already authorized (Phantom's behavior)
    try {
        const selectedWallet = wallets[0];
        if (selectedWallet && selectedWallet.connected && selectedWallet.publicKey) {
            walletPublicKey = selectedWallet.publicKey;
            provider = selectedWallet;
            if (walletAddressDisplayWeb3) walletAddressDisplayWeb3.textContent = walletPublicKey.toBase58();
            if (walletAddressDisplayNft) walletAddressDisplayNft.textContent = walletPublicKey.toBase58();
            connection = new SolanaWeb3.Connection(SolanaWeb3.clusterApiUrl(network), 'confirmed');
            await loadUserNFTs(walletPublicKey.toBase58());

            // Re-attach event listeners for auto-connected wallet
            if (provider) {
                 provider.on('publicKey', (publicKey) => {
                    if (publicKey) {
                        console.log('Account changed to:', publicKey.toBase58());
                        walletPublicKey = publicKey;
                        if (walletAddressDisplayWeb3) walletAddressDisplayWeb3.textContent = walletPublicKey.toBase58();
                        if (walletAddressDisplayNft) walletAddressDisplayNft.textContent = walletPublicKey.toBase58();
                        loadUserNFTs(walletPublicKey.toBase58());
                    } else {
                        console.log('Wallet account removed or locked.');
                        handleWalletDisconnect();
                    }
                });
                provider.on('disconnect', () => {
                    console.log('Wallet explicitly disconnected by user.');
                    handleWalletDisconnect();
                });
            }
        }
    } catch (e) {
        console.warn("Auto-connect failed or wallet not found/authorized:", e);
    }
});


// --- Copy Button for Contract Address (Example) ---
if (copyBtn) {
    copyBtn.addEventListener('click', () => {
        const contractAddressSpan = document.getElementById('contractAddress');
        if (contractAddressSpan) {
            const textToCopy = contractAddressSpan.textContent;
            navigator.clipboard.writeText(textToCopy).then(() => {
                alert('Contract address copied to clipboard!');
            }).catch(err => {
                console.error('Failed to copy text: ', err);
            });
        }
    });
}
