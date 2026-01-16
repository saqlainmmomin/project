// RSVP Speed Reader Application
class RSVPReader {
    constructor() {
        // DOM Elements
        this.textInput = document.getElementById('textInput');
        this.urlInput = document.getElementById('urlInput');
        this.fetchBtn = document.getElementById('fetchBtn');
        this.wordDisplay = document.getElementById('wordDisplay');
        this.playBtn = document.getElementById('playBtn');
        this.pauseBtn = document.getElementById('pauseBtn');
        this.resetBtn = document.getElementById('resetBtn');
        this.wpmSlider = document.getElementById('wpmSlider');
        this.wpmValue = document.getElementById('wpmValue');
        this.progressBar = document.getElementById('progressFill');
        this.wordCounter = document.getElementById('wordCounter');
        this.urlStatus = document.getElementById('urlStatus');
        this.tabBtns = document.querySelectorAll('.tab-btn');

        // State
        this.words = [];
        this.currentWordIndex = 0;
        this.isPlaying = false;
        this.intervalId = null;
        this.wpm = 250;

        // Initialize
        this.init();
    }

    init() {
        // Tab switching
        this.tabBtns.forEach(btn => {
            btn.addEventListener('click', () => this.switchTab(btn));
        });

        // Event listeners
        this.playBtn.addEventListener('click', () => this.play());
        this.pauseBtn.addEventListener('click', () => this.pause());
        this.resetBtn.addEventListener('click', () => this.reset());
        this.wpmSlider.addEventListener('input', (e) => this.updateWPM(e.target.value));
        this.fetchBtn.addEventListener('click', () => this.fetchFromURL());
        this.urlInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.fetchFromURL();
        });

        // Load text from textarea on change
        this.textInput.addEventListener('input', () => {
            this.loadText(this.textInput.value);
        });

        // Load sample text
        this.loadSampleText();
    }

    switchTab(clickedBtn) {
        const targetTab = clickedBtn.dataset.tab;

        // Update tab buttons
        this.tabBtns.forEach(btn => btn.classList.remove('active'));
        clickedBtn.classList.add('active');

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${targetTab}-tab`).classList.add('active');
    }

    loadSampleText() {
        const sampleText = `Welcome to the RSVP Speed Reader! This application uses Rapid Serial Visual Presentation to help you read faster. Simply paste your text or fetch an article from a URL, adjust your preferred reading speed using the slider below, and hit play. The technique works by displaying one word at a time, eliminating the need for eye movement and allowing you to focus entirely on comprehension. Start with a comfortable speed and gradually increase it as you become more proficient. Happy reading!`;
        this.textInput.value = sampleText;
        this.loadText(sampleText);
    }

    loadText(text) {
        if (!text || text.trim() === '') {
            this.words = [];
            this.updateWordCounter();
            return;
        }

        // Split text into words and filter empty strings
        this.words = text
            .split(/\s+/)
            .filter(word => word.length > 0)
            .map(word => word.trim());

        this.currentWordIndex = 0;
        this.updateWordCounter();
        this.updateProgress();

        if (this.words.length > 0) {
            this.wordDisplay.textContent = 'Ready to Start';
        }
    }

    async fetchFromURL() {
        const url = this.urlInput.value.trim();

        if (!url) {
            this.showStatus('Please enter a valid URL', 'error');
            return;
        }

        this.showStatus('Fetching article...', 'info');
        this.fetchBtn.disabled = true;
        this.fetchBtn.textContent = 'Fetching...';

        try {
            // Try to fetch the URL directly
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const html = await response.text();
            const text = this.extractTextFromHTML(html);

            if (text.length < 50) {
                // If extracted text is too short, try using a CORS proxy
                throw new Error('Could not extract enough text from the page');
            }

            this.textInput.value = text;
            this.loadText(text);
            this.showStatus(`Successfully loaded ${this.words.length} words!`, 'success');

            // Switch to text tab to show the loaded content
            this.tabBtns[0].click();

        } catch (error) {
            console.error('Fetch error:', error);

            // Try with CORS proxy
            try {
                const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
                const response = await fetch(proxyUrl);
                const html = await response.text();
                const text = this.extractTextFromHTML(html);

                if (text.length < 50) {
                    throw new Error('Could not extract enough text');
                }

                this.textInput.value = text;
                this.loadText(text);
                this.showStatus(`Successfully loaded ${this.words.length} words!`, 'success');
                this.tabBtns[0].click();

            } catch (proxyError) {
                console.error('Proxy fetch error:', proxyError);
                this.showStatus(
                    'Could not fetch the article. Please try copying and pasting the text directly, or check if the URL is accessible.',
                    'error'
                );
            }
        } finally {
            this.fetchBtn.disabled = false;
            this.fetchBtn.textContent = 'Fetch';
        }
    }

    extractTextFromHTML(html) {
        // Create a temporary DOM element to parse HTML
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // Remove script and style elements
        const scripts = doc.querySelectorAll('script, style, nav, footer, header');
        scripts.forEach(el => el.remove());

        // Try to find the main content
        const article = doc.querySelector('article') ||
                       doc.querySelector('main') ||
                       doc.querySelector('.post-content') ||
                       doc.querySelector('.article-content') ||
                       doc.querySelector('.content') ||
                       doc.body;

        // Get text content and clean it up
        let text = article.textContent || '';

        // Clean up the text
        text = text
            .replace(/\s+/g, ' ')  // Replace multiple spaces with single space
            .replace(/\n+/g, ' ')   // Replace newlines with space
            .trim();

        return text;
    }

    showStatus(message, type) {
        this.urlStatus.textContent = message;
        this.urlStatus.className = `status-message show ${type}`;

        setTimeout(() => {
            this.urlStatus.classList.remove('show');
        }, 5000);
    }

    play() {
        if (this.words.length === 0) {
            alert('Please enter some text first!');
            return;
        }

        if (this.currentWordIndex >= this.words.length) {
            this.currentWordIndex = 0;
        }

        this.isPlaying = true;
        this.playBtn.disabled = true;
        this.pauseBtn.disabled = false;

        this.displayWord();

        const msPerWord = 60000 / this.wpm;
        this.intervalId = setInterval(() => {
            this.currentWordIndex++;

            if (this.currentWordIndex >= this.words.length) {
                this.pause();
                this.wordDisplay.textContent = 'Finished! 🎉';
                return;
            }

            this.displayWord();
        }, msPerWord);
    }

    pause() {
        this.isPlaying = false;
        this.playBtn.disabled = false;
        this.pauseBtn.disabled = true;

        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    reset() {
        this.pause();
        this.currentWordIndex = 0;
        this.wordDisplay.textContent = this.words.length > 0 ? 'Ready to Start' : 'Start Reading';
        this.updateProgress();
        this.updateWordCounter();
    }

    displayWord() {
        if (this.currentWordIndex < this.words.length) {
            const word = this.words[this.currentWordIndex];
            this.wordDisplay.textContent = word;
            this.updateProgress();
            this.updateWordCounter();

            // Adjust font size based on word length
            const baseSize = 3.5;
            const wordLength = word.length;
            let fontSize = baseSize;

            if (wordLength > 15) {
                fontSize = baseSize * 0.6;
            } else if (wordLength > 10) {
                fontSize = baseSize * 0.75;
            } else if (wordLength > 7) {
                fontSize = baseSize * 0.9;
            }

            this.wordDisplay.style.fontSize = `${fontSize}rem`;
        }
    }

    updateProgress() {
        if (this.words.length === 0) {
            this.progressBar.style.width = '0%';
            return;
        }

        const progress = (this.currentWordIndex / this.words.length) * 100;
        this.progressBar.style.width = `${progress}%`;
    }

    updateWordCounter() {
        this.wordCounter.textContent = `${this.currentWordIndex} / ${this.words.length}`;
    }

    updateWPM(value) {
        this.wpm = parseInt(value);
        this.wpmValue.textContent = `${this.wpm} WPM`;

        // If currently playing, restart with new speed
        if (this.isPlaying) {
            this.pause();
            this.play();
        }
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new RSVPReader();
});
