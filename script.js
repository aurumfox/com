document.addEventListener('DOMContentLoaded', () => {
    // --- Common Functions for Navigation ---

    // Smooth scrolling for navigation links
    document.querySelectorAll('nav a').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();

            const targetId = this.getAttribute('href');
            if (targetId) {
                document.querySelector(targetId).scrollIntoView({
                    behavior: 'smooth'
                });
            }

            // Optional: Add active class to navigation link
            document.querySelectorAll('nav a').forEach(link => link.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // Intersection Observer for header active state
    // This will highlight the current section in the navigation
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('nav a');

    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.3 // Highlight when 30% of the section is visible
    };

    const sectionObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const currentSectionId = entry.target.id;
                navLinks.forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === `#${currentSectionId}`) {
                        link.classList.add('active');
                    }
                });
            }
        });
    }, observerOptions);

    sections.forEach(section => {
        sectionObserver.observe(section);
    });

    // --- Aurum Fox Specific Functionality ---

    // Copy to clipboard functionality for contract address
    const aurumFoxCopyButton = document.querySelector('.contract-address .copy-btn');
    if (aurumFoxCopyButton) {
        aurumFoxCopyButton.addEventListener('click', async () => {
            const contractAddressElement = document.getElementById('contractAddress');
            if (contractAddressElement) {
                try {
                    await navigator.clipboard.writeText(contractAddressElement.textContent);
                    aurumFoxCopyButton.textContent = 'Copied!';
                    setTimeout(() => {
                        aurumFoxCopyButton.textContent = 'Copy';
                    }, 2000);
                } catch (err) {
                    console.error('Failed to copy text:', err);
                    alert('Failed to copy address. Please copy it manually: ' + contractAddressElement.textContent);
                }
            }
        });
    }

    // Aurum Fox Announcement Feature
    const announcementInput = document.getElementById('announcementInput');
    const publishButton = document.getElementById('publishButton');
    const announcementsList = document.getElementById('announcementsList');

    // Load announcements when the page loads
    loadAurumFoxAnnouncements();

    if (publishButton) {
        publishButton.addEventListener('click', () => {
            const announcementText = announcementInput.value.trim();

            if (announcementText) {
                const now = new Date();
                const dateString = now.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });

                const newAnnouncement = {
                    text: announcementText,
                    date: dateString
                };

                // Save the announcement
                saveAurumFoxAnnouncement(newAnnouncement);

                // Display the announcement on the page
                displayAurumFoxAnnouncement(newAnnouncement);

                // Clear the input field
                announcementInput.value = '';
            } else {
                alert('Please enter announcement text.');
            }
        });
    }

    function saveAurumFoxAnnouncement(announcement) {
        let announcements = JSON.parse(localStorage.getItem('aurumFoxAnnouncements')) || [];
        announcements.unshift(announcement); // Add new announcement to the beginning
        localStorage.setItem('aurumFoxAnnouncements', JSON.stringify(announcements));
    }

    function loadAurumFoxAnnouncements() {
        // Clear existing announcements to prevent duplicates on reload
        if (announcementsList) {
            announcementsList.innerHTML = '';
        }
        let announcements = JSON.parse(localStorage.getItem('aurumFoxAnnouncements')) || [];
        announcements.forEach(announcement => displayAurumFoxAnnouncement(announcement));
    }

    function displayAurumFoxAnnouncement(announcement) {
        const announcementItem = document.createElement('div');
        announcementItem.classList.add('announcement-item');
        announcementItem.innerHTML = `
            <p>${announcement.text}</p>
            <div class="announcement-date">${announcement.date}</div>
        `;
        if (announcementsList) {
            announcementsList.prepend(announcementItem); // Add newest to top
        }
    }

    // --- Web3 Site Specific Functionality ---

    // CONSTANTS AND SETTINGS (REPLACE WITH YOUR ACTUAL VALUES)
    const NFT_CONTRACT_ADDRESS = "0xYourNFTContractAddressHere"; // Your ERC-721 NFT contract address
    const NFT_ABI = [
        // Minimal ABI for transferFrom and ownerOf (for ownership check)
        {
            "constant": true,
            "inputs": [
                { "name": "tokenId", "type": "uint256" }
            ],
            "name": "ownerOf",
            "outputs": [
                { "name": "", "type": "address" }
            ],
            "payable": false,
            "stateMutability": "view",
            "type": "function"
        },
        {
            "constant": false,
            "inputs": [
                { "name": "from", "type": "address" },
                { "name": "to", "type": "address" },
                { "name": "tokenId", "type": "uint256" }
            ],
            "name": "transferFrom",
            "outputs": [],
            "payable": false,
            "stateMutability": "nonpayable",
            "type": "function"
        }
    ];

    // DOM ELEMENTS for Web3 Site
    const connectWalletBtnWeb3 = document.getElementById('connectWalletBtnWeb3');
    const walletAddressDisplayWeb3 = document.getElementById('walletAddressDisplayWeb3');
    const uploadGameBtnWeb3 = document.getElementById('uploadGameBtnWeb3');
    const transferNftBtnWeb3 = document.getElementById('transferNftBtnWeb3');
    const listNftOnOpenSeaBtnWeb3 = document.getElementById('listNftOnOpenSeaBtnWeb3');
    const postAdBtnWeb3 = document.getElementById('postAdBtnWeb3');
    const nftListDiv = document.getElementById('nft-list');

    let currentAccount = null; // To store the connected wallet address for Web3 site

    // BLOCKCHAIN FUNCTIONS

    // Connect to the user's wallet (MetaMask)
    async function connectWallet() {
        if (typeof window.ethereum !== 'undefined') {
            try {
                const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
                currentAccount = accounts[0];
                console.log("Connected account:", currentAccount);
                if (walletAddressDisplayWeb3) walletAddressDisplayWeb3.textContent = currentAccount;
                alert(`Wallet connected: ${currentAccount}`);
                // Once connected, try to display user's NFTs
                await displayUserNFTs(currentAccount);
                return currentAccount;
            } catch (error) {
                console.error("Error connecting wallet:", error);
                if (walletAddressDisplayWeb3) walletAddressDisplayWeb3.textContent = "Connection Error";
                alert("Could not connect wallet. Make sure MetaMask is installed and active.");
                return null;
            }
        } else {
            alert("MetaMask (or another Web3 wallet) not detected. Please install one.");
            return null;
        }
    }

    // Transfer an ERC-721 NFT
    async function transferNFT() {
        if (!currentAccount) {
            alert("Please connect your wallet first.");
            return;
        }

        const recipientAddress = prompt("Enter the recipient's wallet address for the NFT:");
        if (!recipientAddress) return;

        const tokenIdToTransfer = prompt("Enter the ID of the NFT you want to transfer:");
        if (!tokenIdToTransfer) return;

        if (!ethers.utils.isAddress(recipientAddress)) {
            alert("Invalid recipient address.");
            return;
        }

        try {
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const signer = provider.getSigner();

            const nftContract = new ethers.Contract(NFT_CONTRACT_ADDRESS, NFT_ABI, signer);

            // Check if the current user actually owns this NFT
            const owner = await nftContract.ownerOf(tokenIdToTransfer);
            if (owner.toLowerCase() !== currentAccount.toLowerCase()) {
                alert(`You are not the owner of NFT ID ${tokenIdToTransfer}. Current owner: ${owner}`);
                return;
            }

            console.log(`Attempting to transfer NFT ${tokenIdToTransfer} from ${currentAccount} to ${recipientAddress}...`);
            const tx = await nftContract.transferFrom(currentAccount, recipientAddress, tokenIdToTransfer);

            console.log("Transaction sent, hash:", tx.hash);
            alert(`Transaction sent! Hash: ${tx.hash}\nPlease wait for blockchain confirmation.`);

            await tx.wait(); // Wait for transaction confirmation
            console.log("Transaction confirmed.");
            alert("NFT successfully transferred!");
            await displayUserNFTs(currentAccount); // Refresh NFT list

        } catch (error) {
            console.error("Error transferring NFT:", error);
            alert("Error transferring NFT. Check console for details or ensure you have enough ETH for gas fees.");
        }
    }

    // Simplified concept for OpenSea listing (NOT COMPLETE CODE!)
    async function listNftOnOpenSea() {
        if (!currentAccount) {
            alert("Please connect your wallet first.");
            return;
        }

        alert("This function is conceptual and requires integration with the OpenSea Seaport SDK for full implementation. In a real application, this would interact with OpenSea to create a sell order.");
        const nftId = prompt("Enter the NFT ID you want to list on OpenSea (demo only):");
        if (nftId) {
            const price = prompt(`For what price (in ETH) do you want to list NFT #${nftId}?`);
            if (price) {
                console.log(`[DEMO] User ${currentAccount} wants to list NFT #${nftId} for ${price} ETH on OpenSea.`);
                alert(`Request to list NFT #${nftId} for ${price} ETH sent (conceptually).`);
            }
        }
    }

    // Function to display user's NFTs (requires an external API, e.g., Alchemy, Moralis, OpenSea)
    async function displayUserNFTs(accountAddress) {
        if (!nftListDiv) return; // Ensure the element exists

        nftListDiv.innerHTML = '<p class="placeholder-item web3-placeholder">Loading your NFTs...</p>'; // Clear and show placeholder

        // IMPORTANT: For real NFT loading, an external API is needed.
        // Example with Alchemy NFT API (you need your own API key)
        const ALCHEMY_API_KEY = "YOUR_ALCHEMY_API_KEY"; // Replace with your actual Alchemy API key
        const NETWORK = "eth-mainnet"; // or eth-goerli, polygon-mainnet, etc.

        // Ensure ALCHEMY_API_KEY is replaced
        if (ALCHEMY_API_KEY === "YOUR_ALCHEMY_API_KEY" || !ALCHEMY_API_KEY) {
            console.warn("Alchemy API Key not set. NFT display will not work.");
            nftListDiv.innerHTML = '<p class="placeholder-item web3-placeholder">Alchemy API Key not configured to load NFTs.</p>';
            return;
        }

        const url = `https://${NETWORK}.g.alchemy.com/nft/v2/${ALCHEMY_API_KEY}/getNFTsForOwner?owner=${accountAddress}`;

        try {
            const response = await fetch(url, { method: 'GET' });
            const data = await response.json();

            nftListDiv.innerHTML = ''; // Clear existing content
            if (data.ownedNfts && data.ownedNfts.length > 0) {
                data.ownedNfts.forEach(nft => {
                    const nftDiv = document.createElement('div');
                    nftDiv.className = 'nft-item';
                    // Check if an image is available
                    const imageUrl = nft.media.length > 0 && nft.media[0].gateway ? nft.media[0].gateway : 'https://via.placeholder.com/100?text=No+Image';
                    nftDiv.innerHTML = `
                        <img src="${imageUrl}" alt="${nft.title || 'NFT'}" width="100">
                        <p><strong>${nft.title || `NFT #${parseInt(nft.id.tokenId, 16)}`}</strong></p>
                        <p>ID: ${parseInt(nft.id.tokenId, 16)}</p>
                        <p>${nft.description ? nft.description.substring(0, 50) + '...' : ''}</p>
                    `;
                    nftListDiv.appendChild(nftDiv);
                });
            } else {
                nftListDiv.innerHTML = '<p class="placeholder-item web3-placeholder">You do not have any NFTs in this wallet yet.</p>';
            }
        } catch (error) {
            console.error("Error loading NFTs:", error);
            nftListDiv.innerHTML = '<p class="placeholder-item web3-placeholder">Could not load NFTs. Check API key or contract address.</p>';
        }
    }

    // PLACEHOLDER FUNCTIONS FOR GAMES AND ADS (Web3 section)
    function uploadGameWeb3() {
        alert("Web3 Game Upload Function: This will be a form to upload game files and their descriptions. A backend will be required for file storage and potentially blockchain integration.");
    }

    function postAdWeb3() {
        alert("Web3 Ad Placement Function: This will be a form to input ad text, images, and links, possibly integrating with smart contracts for payment or ad display logic.");
    }

    // EVENT LISTENERS for Web3 Site
    if (connectWalletBtnWeb3) connectWalletBtnWeb3.addEventListener('click', connectWallet);
    if (uploadGameBtnWeb3) uploadGameBtnWeb3.addEventListener('click', uploadGameWeb3);
    if (transferNftBtnWeb3) transferNftBtnWeb3.addEventListener('click', transferNFT);
    if (listNftOnOpenSeaBtnWeb3) listNftOnOpenSeaBtnWeb3.addEventListener('click', listNftOnOpenSea);
    if (postAdBtnWeb3) postAdBtnWeb3.addEventListener('click', postAdWeb3);

    // Optional: Monitor account changes in MetaMask
    if (typeof window.ethereum !== 'undefined') {
        window.ethereum.on('accountsChanged', (accounts) => {
            if (accounts.length === 0) {
                console.log("Wallet disconnected.");
                currentAccount = null;
                if (walletAddressDisplayWeb3) walletAddressDisplayWeb3.textContent = "Not Connected";
                if (nftListDiv) nftListDiv.innerHTML = '<p class="placeholder-item web3-placeholder">Connect your wallet to see your NFTs.</p>';
            } else {
                currentAccount = accounts[0];
                console.log("Account changed to:", currentAccount);
                if (walletAddressDisplayWeb3) walletAddressDisplayWeb3.textContent = currentAccount;
                displayUserNFTs(currentAccount); // Update NFTs when account changes
            }
        });

        window.ethereum.on('chainChanged', (chainId) => {
            console.log("Chain changed to:", chainId);
            // It's recommended to reload the page or reinitialize the provider
            // window.location.reload();
            alert(`Blockchain network changed to ${chainId}. You might need to reload the page.`);
        });
    }

    // --- Multimedia Portal Specific Functionality ---

    // For the image upload form (front-end only, backend is needed for actual upload)
    const photoUploadForm = document.querySelector('#photo-section .upload-form');
    if (photoUploadForm) {
        photoUploadForm.addEventListener('submit', (event) => {
            event.preventDefault(); // Prevent default form submission

            const photoTitle = document.getElementById('photo-title').value.trim();
            const photoFile = document.getElementById('photo-upload').files[0];

            if (!photoFile) {
                alert('Please select a photo to upload.');
                return;
            }

            // In a real application, you would send this data to a server using fetch or XMLHttpRequest.
            console.log('Simulating photo upload:');
            console.log('Title:', photoTitle);
            console.log('File:', photoFile.name, photoFile.type, photoFile.size, 'bytes');

            alert('Photo upload simulated! (A backend is needed for actual file storage)');
            photoUploadForm.reset(); // Clear the form
        });
    }

    // For the new post form (front-end only, backend is needed for actual storage)
    const postForm = document.querySelector('#post-section .upload-form'); // Target the post form specifically
    if (postForm) {
        postForm.addEventListener('submit', (event) => {
            event.preventDefault(); // Prevent default form submission

            const postTitle = document.getElementById('post-title').value.trim();
            const postContent = document.getElementById('post-content').value.trim();

            if (!postTitle || !postContent) {
                alert('Please enter both a title and content for your post.');
                return;
            }

            // In a real application, you would send this data to a server.
            console.log('Simulating new post creation:');
            console.log('Title:', postTitle);
            console.log('Content:', postContent);

            alert('Post creation simulated! (A backend is needed for actual post storage)');
            postForm.reset(); // Clear the form
        });
    }

    // For the multimedia portal games (placeholder actions)
    document.querySelectorAll('#portal-games-section .item a').forEach(gameLink => {
        gameLink.addEventListener('click', (e) => {
            e.preventDefault();
            alert(`You clicked to play: "${gameLink.previousElementSibling.previousElementSibling.textContent}". This would launch a game!`);
        });
    });
});
