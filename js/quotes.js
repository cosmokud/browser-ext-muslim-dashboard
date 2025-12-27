/**
 * Quotes Manager
 * Handles Quran and Hadith quotes
 */

class QuotesManager {
  constructor(storage) {
    this.storage = storage;
    this.defaultQuotes = [];
    this.userQuotes = [];
    this.currentQuote = null;
    this.quoteText = document.getElementById('quoteText');
    this.quoteSource = document.getElementById('quoteSource');
    this.quoteRefresh = document.getElementById('quoteRefresh');
  }

  /**
   * Initialize quotes
   */
  async init() {
    await this.loadDefaultQuotes();
    this.loadUserQuotes();
    this.displayRandomQuote();
    this.setupEventListeners();
  }

  /**
   * Load default quotes from JSON
   */
  async loadDefaultQuotes() {
    try {
      const response = await fetch('data/quotes_default.json');
      if (response.ok) {
        this.defaultQuotes = await response.json();
      }
    } catch (e) {
      console.error('Failed to load default quotes:', e);
      // Fallback quotes
      this.defaultQuotes = [
        {
          text: "Indeed, with hardship comes ease.",
          source: "Quran 94:6",
          type: "quran"
        },
        {
          text: "And He found you lost and guided you.",
          source: "Quran 93:7",
          type: "quran"
        },
        {
          text: "So remember Me; I will remember you.",
          source: "Quran 2:152",
          type: "quran"
        }
      ];
    }
  }

  /**
   * Load user quotes from storage
   */
  loadUserQuotes() {
    this.userQuotes = this.storage.getUserQuotes();
  }

  /**
   * Get all available quotes based on settings
   */
  getAvailableQuotes() {
    const settings = this.storage.getSettings();
    let quotes = [];

    if (settings.useDefaultQuotes && this.defaultQuotes.length > 0) {
      quotes = quotes.concat(this.defaultQuotes);
    }

    if (settings.useUserQuotes && this.userQuotes.length > 0) {
      quotes = quotes.concat(this.userQuotes);
    }

    // If both are disabled, use default
    if (quotes.length === 0) {
      quotes = this.defaultQuotes;
    }

    return quotes;
  }

  /**
   * Display random quote
   */
  displayRandomQuote() {
    const quotes = this.getAvailableQuotes();
    if (quotes.length === 0) {
      this.quoteText.textContent = "Add some inspiring quotes in settings!";
      this.quoteSource.textContent = "";
      return;
    }

    // Get random quote different from current
    let newQuote;
    if (quotes.length === 1) {
      newQuote = quotes[0];
    } else {
      do {
        const randomIndex = Math.floor(Math.random() * quotes.length);
        newQuote = quotes[randomIndex];
      } while (newQuote === this.currentQuote && quotes.length > 1);
    }

    this.currentQuote = newQuote;
    this.animateQuote(newQuote);
  }

  /**
   * Animate quote change
   */
  animateQuote(quote) {
    this.quoteText.style.opacity = '0';
    this.quoteSource.style.opacity = '0';

    setTimeout(() => {
      this.quoteText.textContent = quote.text;
      this.quoteSource.textContent = `— ${quote.source}`;
      this.quoteText.style.opacity = '1';
      this.quoteSource.style.opacity = '1';
    }, 300);
  }

  /**
   * Add user quote
   */
  addUserQuote(text, source) {
    const quote = {
      id: Date.now(),
      text: text.trim(),
      source: source.trim(),
      type: 'user'
    };

    this.userQuotes.push(quote);
    this.storage.saveUserQuotes(this.userQuotes);
    return quote;
  }

  /**
   * Delete user quote
   */
  deleteUserQuote(id) {
    this.userQuotes = this.userQuotes.filter(q => q.id !== id);
    this.storage.saveUserQuotes(this.userQuotes);
  }

  /**
   * Get user quotes
   */
  getUserQuotes() {
    return this.userQuotes;
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    this.quoteRefresh.addEventListener('click', () => {
      this.quoteRefresh.style.transform = 'rotate(360deg)';
      setTimeout(() => {
        this.quoteRefresh.style.transform = '';
      }, 300);
      this.displayRandomQuote();
    });
  }
}

// Export for use
window.QuotesManager = QuotesManager;
