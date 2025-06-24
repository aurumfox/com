document.addEventListener('DOMContentLoaded', () => {
    // Smooth scrolling for navigation links
    document.querySelectorAll('nav a').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();

            const targetId = this.getAttribute('href');
            if (targetId) { // Check if href is not empty
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
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('nav a');

    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.7 // Highlight when 70% of the section is visible
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

    // Copy to clipboard functionality for contract address
    const copyButton = document.querySelector('.copy-btn');
    if (copyButton) {
        copyButton.addEventListener('click', async () => {
            const contractAddressElement = document.getElementById('contractAddress');
            if (contractAddressElement) {
                try {
                    await navigator.clipboard.writeText(contractAddressElement.textContent);
                    copyButton.textContent = 'Copied!';
                    setTimeout(() => {
                        copyButton.textContent = 'Copy';
                    }, 2000);
                } catch (err) {
                    console.error('Failed to copy text:', err);
                    alert('Failed to copy address. Please copy it manually: ' + contractAddressElement.textContent);
                }
            }
        });
    }

    // Announcement Feature
    const announcementInput = document.getElementById('announcementInput');
    const publishButton = document.getElementById('publishButton');
    const announcementsList = document.getElementById('announcementsList');

    // Load announcements when the page loads
    loadAnnouncements();

    if (publishButton) { // Ensure the button exists before adding listener
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
                saveAnnouncement(newAnnouncement);

                // Display the announcement on the page
                displayAnnouncement(newAnnouncement);

                // Clear the input field
                announcementInput.value = '';
            } else {
                alert('Please enter announcement text.');
            }
        });
    }

    function saveAnnouncement(announcement) {
        let announcements = JSON.parse(localStorage.getItem('aurumFoxAnnouncements')) || [];
        announcements.unshift(announcement); // Add new announcement to the beginning
        localStorage.setItem('aurumFoxAnnouncements', JSON.stringify(announcements));
    }

    function loadAnnouncements() {
        let announcements = JSON.parse(localStorage.getItem('aurumFoxAnnouncements')) || [];
        announcements.forEach(announcement => displayAnnouncement(announcement));
    }

    function displayAnnouncement(announcement) {
        const announcementItem = document.createElement('div');
        announcementItem.classList.add('announcement-item');
        announcementItem.innerHTML = `
            <p>${announcement.text}</p>
            <div class="announcement-date">${announcement.date}</div>
        `;
        // Prepend to add the newest announcement at the top
        if (announcementsList) {
            announcementsList.prepend(announcementItem);
        }
    }
});
