document.addEventListener('DOMContentLoaded', () => {
    // Smooth scrolling for navigation links
    document.querySelectorAll('nav ul li a').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            document.querySelector(this.getAttribute('href')).scrollIntoView({
                behavior: 'smooth'
            });
        });
    });

    // Hide the No-JavaScript message if JavaScript is enabled
    const noScriptMessage = document.querySelector('noscript');
    if (noScriptMessage) {
        noScriptMessage.style.display = 'none';
    }

    // --- Aurum Fox Section ---

    // Copy Contract Address functionality
    const copyBtn = document.querySelector('.contract-address .copy-btn');
    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            const contractAddress = document.getElementById('contractAddress').textContent;
            navigator.clipboard.writeText(contractAddress).then(() => {
                alert('AFOX Contract Address copied to clipboard!');
            }).catch(err => {
                console.error('Failed to copy text: ', err);
            });
        });
    }

    // Handle Contact Form Submission
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            // In a real application, you'd send this data to a backend server.
            console.log('Contact Form Submitted:', {
                name: this['contact-name'].value,
                email: this['contact-email'].value,
                subject: this['contact-subject'].value,
                message: this['contact-message'].value
            });
            alert('Your message has been sent successfully!');
            this.reset();
        });
    }

    // Admin Announcement Publishing (Placeholder for client-side logic)
    const publishButton = document.getElementById('publishButton');
    const announcementInput = document.getElementById('announcementInput');
    const announcementsList = document.getElementById('announcementsList');

    if (publishButton && announcementInput && announcementsList) {
        publishButton.addEventListener('click', () => {
            const newAnnouncementText = announcementInput.value.trim();
            if (newAnnouncementText) {
                const now = new Date();
                const dateString = now.toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                });

                const newAnnouncementDiv = document.createElement('div');
                newAnnouncementDiv.classList.add('announcement-item');
                newAnnouncementDiv.innerHTML = `
                    <h4>New Announcement:</h4>
                    <p>${newAnnouncementText}</p>
                    <small>${dateString}</small>
                `;
                announcementsList.prepend(newAnnouncementDiv); // Add to the top
                announcementInput.value = ''; // Clear input
                alert('Announcement published successfully (client-side simulation)!');
            } else {
                alert('Please enter an announcement.');
            }
        });
    }


    // --- Web3 Portal Section ---

    // Generic Wallet Connection Function (Placeholder)
    const connectWallet = (displayElementId) => {
        return new Promise((resolve) => {
            // In a real dApp, you'd integrate with Solana wallet providers like Phantom
            // For this example, we'll simulate a connected address
            setTimeout(() => {
                const simulatedWalletAddress = '0x' + Math.random().toString(16).substring(2, 42);
                document.getElementById(displayElementId).textContent = simulatedWalletAddress;
                console.log(`Wallet connected: ${simulatedWalletAddress} for ${displayElementId}`);
                alert(`Wallet Connected: ${simulatedWalletAddress}`);
                resolve(simulatedWalletAddress);
            }, 500);
        });
    };

    // Connect Wallet for Web3 Home
    const connectWalletBtnWeb3 = document.getElementById('connectWalletBtnWeb3');
    if (connectWalletBtnWeb3) {
        connectWalletBtnWeb3.addEventListener('click', () => connectWallet('walletAddressDisplayWeb3'));
    }

    // Connect Wallet for NFT Section
    const connectWalletNftBtn = document.getElementById('connectWalletNftBtn');
    if (connectWalletNftBtn) {
        connectWalletNftBtn.addEventListener('click', async () => {
            const address = await connectWallet('walletAddressDisplayNft');
            if (address) {
                // Simulate loading user NFTs
                const userNftList = document.getElementById('user-nft-list');
                if (userNftList) {
                    userNftList.innerHTML = `
                        <div class="nft-item dynamic-nft-card">
                            <img src="https://via.placeholder.com/150/007bff/FFFFFF?text=My+NFT+1" alt="Custom NFT with abstract art">
                            <h4>My Personal NFT Art #001</h4>
                            <p><strong>Коллекция:</strong> Personal Creations</p>
                            <p><strong>Минт:</strong> <span class="nft-mint-address">ExAmPlE123...456AdDrEsS</span></p>
                            <p><strong>Владелец:</strong> <span class="nft-owner-address">${address}</span></p>
                            <button class="web3-btn small-btn view-nft-details" data-nft-id="my-nft-001">Показать детали</button>
                            <button class="web3-btn red-btn sell-nft-btn" data-nft-id="my-nft-001">Продать</button>
                        </div>
                        <div class="nft-item dynamic-nft-card">
                            <img src="https://via.placeholder.com/150/28a745/FFFFFF?text=AFOX+Badge" alt="Aurum Fox Community Badge NFT">
                            <h4>AFOX Community Badge</h4>
                            <p><strong>Коллекция:</strong> Aurum Fox Official</p>
                            <p><strong>Минт:</strong> <span class="nft-mint-address">AFOX_BADGE_MINT</span></p>
                            <p><strong>Владелец:</strong> <span class="nft-owner-address">${address}</span></p>
                            <button class="web3-btn small-btn view-nft-details" data-nft-id="afox-badge">Показать детали</button>
                            <button class="web3-btn red-btn sell-nft-btn" data-nft-id="afox-badge">Продать</button>
                        </div>
                    `;
                }
            }
        });
    }

    // NFT Minting Modal (Basic Show/Hide)
    const mintNftBtn = document.getElementById('mintNftBtn');
    const mintNftModal = document.getElementById('mintNftModal');
    const closeMintModal = document.getElementById('closeMintModal');

    if (mintNftBtn && mintNftModal && closeMintModal) {
        mintNftBtn.addEventListener('click', () => {
            mintNftModal.style.display = 'block';
        });
        closeMintModal.addEventListener('click', () => {
            mintNftModal.style.display = 'none';
        });
        window.addEventListener('click', (event) => {
            if (event.target == mintNftModal) {
                mintNftModal.style.display = 'none';
            }
        });
    }

    // Handle NFT Listing Form
    const listNftForm = document.getElementById('listNftForm');
    if (listNftForm) {
        listNftForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const nftToSell = this.nftToSell.value;
            const salePrice = this.salePrice.value;
            const listingDuration = this.listingDuration.value;
            console.log(`Listing NFT: ${nftToSell} for ${salePrice} SOL for ${listingDuration} days`);
            alert(`NFT "${nftToSell}" listed for sale at ${salePrice} SOL! (Simulation)`);
            this.reset();
        });
    }

    // DAO Section: Connect Wallet
    const connectWalletBtnDao = document.getElementById('connectWalletBtnDao');
    if (connectWalletBtnDao) {
        connectWalletBtnDao.addEventListener('click', () => connectWallet('walletAddressDisplayDao'));
    }

    // DAO Section: Create Proposal Modal (Basic Show/Hide)
    const createProposalBtn = document.getElementById('createProposalBtn');
    const createProposalModal = document.getElementById('createProposalModal');
    const closeProposalModal = document.getElementById('closeProposalModal');

    if (createProposalBtn && createProposalModal && closeProposalModal) {
        createProposalBtn.addEventListener('click', () => {
            createProposalModal.style.display = 'block';
        });
        closeProposalModal.addEventListener('click', () => {
            createProposalModal.style.display = 'none';
        });
        window.addEventListener('click', (event) => {
            if (event.target == createProposalModal) {
                createProposalModal.style.display = 'none';
            }
        });
    }

    // Handle New DAO Proposal Form
    const newProposalForm = document.getElementById('newProposalForm');
    if (newProposalForm) {
        newProposalForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const title = this.proposalTitle.value;
            const description = this.proposalDescription.value;
            console.log('New Proposal Submitted:', {
                title,
                description
            });
            alert(`Proposal "${title}" submitted! (Simulation)`);
            createProposalModal.style.display = 'none'; // Close modal
            this.reset();
            // In a real DAO, this would interact with a smart contract
        });
    }

    // DAO Section: Vote on Proposals (Client-side simulation)
    document.querySelectorAll('.dao-vote-btn').forEach(button => {
        button.addEventListener('click', function() {
            const proposalId = this.dataset.proposalId;
            const voteType = this.dataset.voteType; // 'for' or 'against'
            const votesForSpan = this.closest('.dao-proposal-item').querySelector('.dao-votes-for');
            const votesAgainstSpan = this.closest('.dao-proposal-item').querySelector('.dao-votes-against');

            if (voteType === 'for') {
                votesForSpan.textContent = parseInt(votesForSpan.textContent) + 1;
            } else if (voteType === 'against') {
                votesAgainstSpan.textContent = parseInt(votesAgainstSpan.textContent) + 1;
            }
            alert(`Voted ${voteType} on Proposal #${proposalId}! (Simulation)`);
            // In a real DAO, this would interact with a smart contract
        });
    });

    // Staking Section (Client-side simulation)
    const userAfoxBalanceSpan = document.getElementById('userAfoxBalance');
    const userStakedAmountSpan = document.getElementById('userStakedAmount');
    const userRewardsAmountSpan = document.getElementById('userRewardsAmount');
    const stakingAprSpan = document.getElementById('stakingApr');
    const stakeAmountInput = document.getElementById('stakeAmountInput');
    const stakeAfoxBtn = document.getElementById('stakeAfoxBtn');
    const claimRewardsBtn = document.getElementById('claimRewardsBtn');
    const unstakeAfoxBtn = document.getElementById('unstakeAfoxBtn');

    let currentAfoxBalance = 1000; // Simulated balance
    let currentStakedAmount = 0;
    let currentRewards = 0;
    const simulatedAPR = 10; // 10% APR

    const updateStakingUI = () => {
        if (userAfoxBalanceSpan) userAfoxBalanceSpan.textContent = `${currentAfoxBalance} AFOX`;
        if (userStakedAmountSpan) userStakedAmountSpan.textContent = `${currentStakedAmount} AFOX`;
        if (userRewardsAmountSpan) userRewardsAmountSpan.textContent = `${currentRewards.toFixed(2)} AFOX`;
        if (stakingAprSpan) stakingAprSpan.textContent = `${simulatedAPR}%`;
    };

    if (stakeAfoxBtn) {
        stakeAfoxBtn.addEventListener('click', () => {
            const amount = parseFloat(stakeAmountInput.value);
            if (isNaN(amount) || amount <= 0) {
                alert('Please enter a valid amount to stake.');
                return;
            }
            if (amount > currentAfoxBalance) {
                alert('Insufficient AFOX balance.');
                return;
            }
            currentAfoxBalance -= amount;
            currentStakedAmount += amount;
            updateStakingUI();
            alert(`${amount} AFOX staked successfully! (Simulation)`);
            stakeAmountInput.value = '';
        });
    }

    if (claimRewardsBtn) {
        claimRewardsBtn.addEventListener('click', () => {
            if (currentRewards > 0) {
                currentAfoxBalance += currentRewards;
                alert(`${currentRewards.toFixed(2)} AFOX rewards claimed! (Simulation)`);
                currentRewards = 0;
                updateStakingUI();
            } else {
                alert('No rewards to claim.');
            }
        });
    }

    if (unstakeAfoxBtn) {
        unstakeAfoxBtn.addEventListener('click', () => {
            if (currentStakedAmount > 0) {
                currentAfoxBalance += currentStakedAmount;
                alert(`${currentStakedAmount} AFOX unstaked successfully! (Simulation)`);
                currentStakedAmount = 0;
                currentRewards = 0; // Rewards usually reset on unstake
                updateStakingUI();
            } else {
                alert('No AFOX currently staked.');
            }
        });
    }

    // Simulate daily reward accrual (for demonstration purposes)
    setInterval(() => {
        if (currentStakedAmount > 0) {
            const dailyReward = (currentStakedAmount * (simulatedAPR / 100)) / 365;
            currentRewards += dailyReward;
            updateStakingUI();
        }
    }, 24 * 60 * 60 * 1000); // Once every 24 hours (in real ms)

    // Initial UI update for staking
    updateStakingUI();


    // --- Multimedia Portal Section ---

    // Handle Photo Upload Form (Client-side simulation)
    const photoUploadForm = document.getElementById('photoUploadForm');
    const photoGallery = document.getElementById('photo-gallery');

    if (photoUploadForm && photoGallery) {
        photoUploadForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const photoTitle = this['photo-title'].value.trim();
            const photoDescription = this['photo-description'].value.trim();
            const photoFile = this['photo-upload'].files[0];

            if (!photoTitle || !photoFile) {
                alert('Please provide a title and select an image file.');
                return;
            }

            // Simulate file reading for display
            const reader = new FileReader();
            reader.onload = (event) => {
                const imageUrl = event.target.result;
                const now = new Date();
                const dateString = now.toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                });

                const newPhotoDiv = document.createElement('div');
                newPhotoDiv.classList.add('photo-item', 'dynamic-photo-card');
                newPhotoDiv.innerHTML = `
                    <img src="${imageUrl}" alt="${photoTitle}">
                    <h3>${photoTitle}</h3>
                    <p>${photoDescription || 'No description provided.'}</p>
                    <small>Загружено: ${dateString}</small>
                `;
                photoGallery.prepend(newPhotoDiv); // Add to the top
                alert('Photo uploaded successfully (client-side simulation)!');
                this.reset();
            };
            reader.readAsDataURL(photoFile);
        });
    }

    // Handle Post Creation Form (Client-side simulation)
    const postForm = document.getElementById('postForm');
    const postsList = document.getElementById('posts-list');

    if (postForm && postsList) {
        postForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const postTitle = this['post-title'].value.trim();
            const postContent = this['post-content'].value.trim();

            if (!postTitle || !postContent) {
                alert('Please provide both a title and content for your post.');
                return;
            }

            const now = new Date();
            const dateString = now.toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric'
            });

            const newPostDiv = document.createElement('div');
            newPostDiv.classList.add('post-item', 'dynamic-post-card');
            newPostDiv.innerHTML = `
                <h3>${postTitle}</h3>
                <p>${postContent.substring(0, 150)}...</p> <small>Опубликовано: ${dateString}</small>
                <a href="#" class="multimedia-btn read-more-post" data-post-id="${Date.now()}">Читать далее</a>
            `;
            postsList.prepend(newPostDiv); // Add to the top
            alert('Post published successfully (client-side simulation)!');
            this.reset();
        });
    }

    // Simple Guess the Number Game logic
    const guessNumberGameSection = document.getElementById('guess-number-game');
    if (guessNumberGameSection) {
        const gameContent = guessNumberGameSection.querySelector('.game-content');
        let secretNumber = Math.floor(Math.random() * 100) + 1;
        let attempts = 0;

        gameContent.innerHTML = `
            <p>I'm thinking of a number between 1 and 100. Can you guess it?</p>
            <input type="number" id="guessInput" min="1" max="100" placeholder="Enter your guess">
            <button id="submitGuessBtn" class="multimedia-btn">Guess</button>
            <p id="guessMessage"></p>
            <p>Attempts: <span id="attemptsCount">0</span></p>
            <button id="resetGameBtn" class="multimedia-btn" style="display:none;">Play Again</button>
        `;

        const guessInput = document.getElementById('guessInput');
        const submitGuessBtn = document.getElementById('submitGuessBtn');
        const guessMessage = document.getElementById('guessMessage');
        const attemptsCountSpan = document.getElementById('attemptsCount');
        const resetGameBtn = document.getElementById('resetGameBtn');

        const resetGame = () => {
            secretNumber = Math.floor(Math.random() * 100) + 1;
            attempts = 0;
            guessMessage.textContent = '';
            attemptsCountSpan.textContent = attempts;
            guessInput.value = '';
            guessInput.disabled = false;
            submitGuessBtn.style.display = 'inline-block';
            resetGameBtn.style.display = 'none';
        };

        submitGuessBtn.addEventListener('click', () => {
            const playerGuess = parseInt(guessInput.value);

            if (isNaN(playerGuess) || playerGuess < 1 || playerGuess > 100) {
                guessMessage.textContent = 'Please enter a number between 1 and 100.';
                return;
            }

            attempts++;
            attemptsCountSpan.textContent = attempts;

            if (playerGuess === secretNumber) {
                guessMessage.textContent = `Congratulations! You guessed the number ${secretNumber} in ${attempts} attempts!`;
                guessMessage.style.color = 'green';
                guessInput.disabled = true;
                submitGuessBtn.style.display = 'none';
                resetGameBtn.style.display = 'inline-block';
            } else if (playerGuess < secretNumber) {
                guessMessage.textContent = 'Too low! Try again.';
                guessMessage.style.color = 'orange';
            } else {
                guessMessage.textContent = 'Too high! Try again.';
                guessMessage.style.color = 'orange';
            }
        });

        resetGameBtn.addEventListener('click', resetGame);
    }

    // Basic "Load More Games" functionality (placeholder)
    const loadMoreGamesBtn = document.getElementById('loadMoreGamesBtn');
    if (loadMoreGamesBtn) {
        loadMoreGamesBtn.addEventListener('click', () => {
            const gameList = document.getElementById('game-list');
            if (gameList) {
                // Simulate loading more games
                const newGames = [
                    `<div class="game-item dynamic-game-card"><img src="https://via.placeholder.com/200x120?text=More+Game+4" alt="Screenshot of another blockchain game"><h3>Adventure Quest</h3><p>Embark on an epic journey.</p><button class="web3-btn play-game-btn">Играть</button></div>`,
                    `<div class="game-item dynamic-game-card"><img src="https://via.placeholder.com/200x120?text=Puzzle+Game+5" alt="Screenshot of a puzzle game"><h3>Brain Teaser</h3><p>Solve challenging puzzles.</p><button class="web3-btn play-game-btn">Играть</button></div>`
                ];
                newGames.forEach(gameHtml => {
                    const div = document.createElement('div');
                    div.innerHTML = gameHtml;
                    gameList.appendChild(div.firstElementChild);
                });
                alert('More games loaded (client-side simulation)!');
                // In a real scenario, you'd fetch more games from a database or API
            }
        });
    }

});
