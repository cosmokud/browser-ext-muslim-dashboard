/**
 * Quotes Manager
 * Handles Quran and Hadith quotes with pagination and import/export
 */

class QuotesManager {
  constructor(storage) {
    this.storage = storage;
    this.defaultQuotes = [];
    this.userQuotes = [];
    this.currentQuote = null;
    this.currentPage = 1;
    this.quotesPerPage = 10;

    // Quote display elements
    this.quoteText = document.getElementById("quoteText");
    this.quoteSource = document.getElementById("quoteSource");
    this.quoteRefresh = document.getElementById("quoteRefresh");

    // Quotes settings elements
    this.quotesListContainer = document.getElementById("userQuotesList");
    this.paginationContainer = document.getElementById("quotesPagination");
    this.importBtn = document.getElementById("importQuotesBtn");
    this.exportBtn = document.getElementById("exportQuotesBtn");
    this.importInput = document.getElementById("importQuotesInput");
  }

  /**
   * Initialize quotes
   */
  async init() {
    await this.loadDefaultQuotes();
    this.loadUserQuotes();
    this.displayRandomQuote();
    this.setupEventListeners();
    this.renderQuotesList();
  }

  /**
   * Load default quotes from JSON
   */
  async loadDefaultQuotes() {
    try {
      const response = await fetch("data/quotes_default.json");
      if (response.ok) {
        this.defaultQuotes = await response.json();
      }
    } catch (e) {
      console.error("Failed to load default quotes:", e);
      // Fallback quotes
      this.defaultQuotes = [
        {
          text: "Indeed, with hardship comes ease.",
          source: "Quran 94:6",
          type: "quran",
        },
        {
          text: "And He found you lost and guided you.",
          source: "Quran 93:7",
          type: "quran",
        },
        {
          text: "So remember Me; I will remember you.",
          source: "Quran 2:152",
          type: "quran",
        },
      ];
    }
  }

  /**
   * Load user quotes from storage
   */
  loadUserQuotes() {
    this.userQuotes = this.storage.getUserQuotes();
    const settings = this.storage.getSettings();
    this.quotesPerPage = settings.quotesPerPage || 10;
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
      if (this.quoteText) {
        this.quoteText.textContent = "Add some inspiring quotes in settings!";
      }
      if (this.quoteSource) {
        this.quoteSource.textContent = "";
      }
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
    if (!this.quoteText || !this.quoteSource) return;

    this.quoteText.style.opacity = "0";
    this.quoteSource.style.opacity = "0";

    setTimeout(() => {
      this.quoteText.textContent = quote.text;
      this.quoteSource.textContent = `— ${quote.source}`;
      this.quoteText.style.opacity = "1";
      this.quoteSource.style.opacity = "1";
    }, 300);
  }

  /**
   * Add user quote
   */
  addUserQuote(text, source, isArabic = false) {
    const quote = {
      id: Date.now(),
      text: text.trim(),
      source: source.trim(),
      type: "user",
      isArabic: isArabic,
    };

    this.userQuotes.push(quote);
    this.storage.saveUserQuotes(this.userQuotes);
    this.renderQuotesList();
    return quote;
  }

  /**
   * Delete user quote
   */
  deleteUserQuote(id) {
    this.userQuotes = this.userQuotes.filter((q) => q.id !== id);
    this.storage.saveUserQuotes(this.userQuotes);

    // Adjust current page if needed
    const totalPages = Math.ceil(this.userQuotes.length / this.quotesPerPage);
    if (this.currentPage > totalPages && totalPages > 0) {
      this.currentPage = totalPages;
    }

    this.renderQuotesList();
  }

  /**
   * Get user quotes
   */
  getUserQuotes() {
    return this.userQuotes;
  }

  /**
   * Get paginated quotes
   */
  getPaginatedQuotes() {
    const startIndex = (this.currentPage - 1) * this.quotesPerPage;
    const endIndex = startIndex + this.quotesPerPage;
    return this.userQuotes.slice(startIndex, endIndex);
  }

  /**
   * Get total pages
   */
  getTotalPages() {
    return Math.ceil(this.userQuotes.length / this.quotesPerPage);
  }

  /**
   * Go to page
   */
  goToPage(page) {
    const totalPages = this.getTotalPages();
    if (page >= 1 && page <= totalPages) {
      this.currentPage = page;
      this.renderQuotesList();
    }
  }

  /**
   * Render quotes list with pagination
   */
  renderQuotesList() {
    if (!this.quotesListContainer) return;

    const quotes = this.getPaginatedQuotes();
    const totalPages = this.getTotalPages();

    // Clear container
    this.quotesListContainer.innerHTML = "";

    if (this.userQuotes.length === 0) {
      this.quotesListContainer.innerHTML = `
        <div class="quotes-empty">
          <p>No custom quotes yet.</p>
          <p class="quotes-empty-hint">Add your own quotes or import from JSON.</p>
        </div>
      `;
    } else {
      // Render quotes
      quotes.forEach((quote, index) => {
        const globalIndex =
          (this.currentPage - 1) * this.quotesPerPage + index + 1;
        const quoteEl = document.createElement("div");
        quoteEl.className = "quote-item";
        quoteEl.innerHTML = `
          <div class="quote-item-number">${globalIndex}</div>
          <div class="quote-item-content">
            <p class="quote-item-text ${
              quote.isArabic ? "arabic-text" : ""
            }">${this.escapeHtml(quote.text)}</p>
            <p class="quote-item-source">${this.escapeHtml(quote.source)}</p>
          </div>
          <button class="quote-item-delete" data-id="${
            quote.id
          }" title="Delete">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
            </svg>
          </button>
        `;
        this.quotesListContainer.appendChild(quoteEl);
      });

      // Bind delete buttons
      this.quotesListContainer
        .querySelectorAll(".quote-item-delete")
        .forEach((btn) => {
          btn.addEventListener("click", () => {
            const id = parseInt(btn.dataset.id);
            if (confirm("Delete this quote?")) {
              this.deleteUserQuote(id);
            }
          });
        });
    }

    // Render pagination
    this.renderPagination(totalPages);
  }

  /**
   * Render pagination controls
   */
  renderPagination(totalPages) {
    if (!this.paginationContainer) return;

    if (totalPages <= 1) {
      this.paginationContainer.innerHTML = "";
      return;
    }

    let paginationHtml = `
      <button class="pagination-btn" data-page="prev" ${
        this.currentPage === 1 ? "disabled" : ""
      }>
        ‹ Prev
      </button>
    `;

    // Page numbers
    const maxVisible = 5;
    let startPage = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);

    if (endPage - startPage < maxVisible - 1) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    if (startPage > 1) {
      paginationHtml += `<button class="pagination-btn" data-page="1">1</button>`;
      if (startPage > 2) {
        paginationHtml += `<span class="pagination-ellipsis">...</span>`;
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      paginationHtml += `
        <button class="pagination-btn ${
          i === this.currentPage ? "active" : ""
        }" data-page="${i}">
          ${i}
        </button>
      `;
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        paginationHtml += `<span class="pagination-ellipsis">...</span>`;
      }
      paginationHtml += `<button class="pagination-btn" data-page="${totalPages}">${totalPages}</button>`;
    }

    paginationHtml += `
      <button class="pagination-btn" data-page="next" ${
        this.currentPage === totalPages ? "disabled" : ""
      }>
        Next ›
      </button>
    `;

    this.paginationContainer.innerHTML = paginationHtml;

    // Bind pagination buttons
    this.paginationContainer
      .querySelectorAll(".pagination-btn")
      .forEach((btn) => {
        btn.addEventListener("click", () => {
          const page = btn.dataset.page;
          if (page === "prev") {
            this.goToPage(this.currentPage - 1);
          } else if (page === "next") {
            this.goToPage(this.currentPage + 1);
          } else {
            this.goToPage(parseInt(page));
          }
        });
      });
  }

  /**
   * Export quotes as JSON
   */
  exportQuotes() {
    const json = JSON.stringify(this.userQuotes, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "muslim_dashboard_quotes.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Import quotes from JSON file
   */
  importQuotes(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const json = e.target.result;
          const quotes = JSON.parse(json);

          if (!Array.isArray(quotes)) {
            reject(new Error("Invalid format: expected an array"));
            return;
          }

          // Validate and add quotes
          let addedCount = 0;
          quotes.forEach((q) => {
            if (typeof q.text === "string" && q.text.trim()) {
              this.userQuotes.push({
                id: Date.now() + Math.random(),
                text: q.text.trim(),
                source: q.source || "",
                type: "user",
                isArabic: q.isArabic || false,
              });
              addedCount++;
            }
          });

          this.storage.saveUserQuotes(this.userQuotes);
          this.renderQuotesList();
          resolve(addedCount);
        } catch (e) {
          reject(new Error("Failed to parse JSON: " + e.message));
        }
      };

      reader.onerror = () => {
        reject(new Error("Failed to read file"));
      };

      reader.readAsText(file);
    });
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Quote refresh button
    if (this.quoteRefresh) {
      this.quoteRefresh.addEventListener("click", () => {
        this.quoteRefresh.style.transform = "rotate(360deg)";
        setTimeout(() => {
          this.quoteRefresh.style.transform = "";
        }, 300);
        this.displayRandomQuote();
      });
    }

    // Export button
    if (this.exportBtn) {
      this.exportBtn.addEventListener("click", () => {
        if (this.userQuotes.length === 0) {
          alert("No quotes to export");
          return;
        }
        this.exportQuotes();
      });
    }

    // Import button
    if (this.importBtn) {
      this.importBtn.addEventListener("click", () => {
        if (this.importInput) {
          this.importInput.click();
        }
      });
    }

    // Import file input
    if (this.importInput) {
      this.importInput.addEventListener("change", async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
          const count = await this.importQuotes(file);
          alert(`Successfully imported ${count} quotes`);
        } catch (error) {
          alert("Import failed: " + error.message);
        }

        // Reset input
        this.importInput.value = "";
      });
    }
  }

  /**
   * Escape HTML
   */
  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
}

// Export for use
window.QuotesManager = QuotesManager;
