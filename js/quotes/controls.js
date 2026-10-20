/**
 * QuotesManager: rotate/shuffle controls and quote loading.
 * Part of the class declared in js/quotes/index.js; load this after it.
 */
(function (prototype, members) {
  for (const name of Object.getOwnPropertyNames(members.prototype)) {
    if (name === "constructor") continue;
    Object.defineProperty(
      prototype,
      name,
      Object.getOwnPropertyDescriptor(members.prototype, name),
    );
  }
})(QuotesManager.prototype, class {

  setQuoteAutoRotatePaused(paused, { persist = true } = {}) {
    this.quoteAutoRotatePaused = paused === true;
    this.updateQuoteControlButtons();

    if (persist) {
      this.persistQuoteBehaviorSettings();
    }

    if (this.quoteAutoRotatePaused) {
      this.stopAutoRotate();
    } else {
      this.startAutoRotate();
    }
  }

  setQuoteShuffleEnabled(enabled, { persist = true } = {}) {
    this.quoteShuffleEnabled = enabled !== false;

    if (this.quoteShuffleEnabled) {
      this._sequentialQuoteCursor = -1;
      this.resetQuoteShufflePlaylist();
    } else {
      const quotes = this.getAvailableQuotes();
      this._sequentialQuoteCursor = quotes.indexOf(this.currentQuote);
    }

    this.updateQuoteControlButtons();

    if (persist) {
      this.persistQuoteBehaviorSettings();
    }
  }

  getQuoteTopActionsContainer() {
    const container = this.quoteContainer;
    if (!container) return null;

    let actionsGroup = container.querySelector(".quote-top-actions");
    if (!actionsGroup) {
      actionsGroup = document.createElement("div");
      actionsGroup.className = "quote-top-actions";
      actionsGroup.setAttribute("role", "group");
      actionsGroup.setAttribute("aria-label", "Quote controls");
      container.appendChild(actionsGroup);
    }

    return actionsGroup;
  }

  createQuoteControlButtons() {
    const actionsGroup = this.getQuoteTopActionsContainer();
    if (!actionsGroup) return;

    let pauseBtn = this.quoteContainer?.querySelector(".quote-pause-btn");
    if (!pauseBtn) {
      pauseBtn = document.createElement("button");
      pauseBtn.type = "button";
      pauseBtn.className = "adhkar-set-selector-btn quote-pause-btn";
      pauseBtn.addEventListener("click", (e) => {
        e.preventDefault();
        const autoPlayEnabled = this.quoteAutoRotatePaused !== true;
        this.setQuoteAutoRotatePaused(autoPlayEnabled);
      });
    }
    if (pauseBtn.parentElement !== actionsGroup) {
      actionsGroup.appendChild(pauseBtn);
    }

    let shuffleBtn = this.quoteContainer?.querySelector(".quote-shuffle-btn");
    if (!shuffleBtn) {
      shuffleBtn = document.createElement("button");
      shuffleBtn.type = "button";
      shuffleBtn.className = "adhkar-set-selector-btn quote-shuffle-btn";
      shuffleBtn.addEventListener("click", (e) => {
        e.preventDefault();
        this.setQuoteShuffleEnabled(!this.quoteShuffleEnabled);
      });
    }
    if (shuffleBtn.parentElement !== actionsGroup) {
      actionsGroup.appendChild(shuffleBtn);
    }

    this.quotePauseBtn = pauseBtn;
    this.quoteShuffleBtn = shuffleBtn;
    this.updateQuoteControlButtons();
  }

  updateQuoteControlButtons() {
    const pauseBtn =
      this.quotePauseBtn ||
      this.quoteContainer?.querySelector(".quote-pause-btn");
    const shuffleBtn =
      this.quoteShuffleBtn ||
      this.quoteContainer?.querySelector(".quote-shuffle-btn");

    this.quotePauseBtn = pauseBtn || null;
    this.quoteShuffleBtn = shuffleBtn || null;

    if (pauseBtn) {
      const autoPlayEnabled = this.quoteAutoRotatePaused !== true;
      const autoPlayIcon = this._getIcon("▶", { size: 16 });
      const autoPlayState = autoPlayEnabled ? "on" : "off";

      pauseBtn.innerHTML = autoPlayIcon;
      pauseBtn.setAttribute("aria-pressed", autoPlayEnabled ? "true" : "false");
      pauseBtn.setAttribute(
        "aria-label",
        `Toggle quote auto play (currently ${autoPlayState})`,
      );
      pauseBtn.title = `Auto play: ${autoPlayState}`;
    }

    if (shuffleBtn) {
      const shuffleOn = this.quoteShuffleEnabled !== false;
      const shuffleIcon = this._getIcon("🔀", { size: 16 });
      const shuffleTitle = `Shuffle quotes: ${shuffleOn ? "on" : "off"}`;

      shuffleBtn.innerHTML = shuffleIcon;
      shuffleBtn.setAttribute("aria-pressed", shuffleOn ? "true" : "false");
      shuffleBtn.setAttribute(
        "aria-label",
        `Toggle quote shuffle (currently ${shuffleOn ? "on" : "off"})`,
      );
      shuffleBtn.title = shuffleTitle;
    }
  }

  async loadDefaultQuotes() {
    try {
      const response = await fetch("data/quotes_default.json", {
        cache: "no-store",
      });
      if (response.ok) {
        const raw = await response.json();
        this.defaultQuotes = (Array.isArray(raw) ? raw : []).map((q) => ({
          ...(q && typeof q === "object" && !Array.isArray(q) ? q : {}),
          _isDefault: true,
        }));
      }
    } catch (e) {
      console.error("Failed to load default quotes:", e);
      // Fallback quotes
      this.defaultQuotes = [
        {
          text_en: "Indeed, with hardship comes ease.",
          text_id: "Sesungguhnya bersama kesulitan ada kemudahan.",
          source: "Quran 94:6",
          type: "quran",
          _isDefault: true,
        },
        {
          text_en: "And He found you lost and guided you.",
          text_id:
            "Dan Dia mendapatimu dalam keadaan bingung, lalu Dia memberi petunjuk.",
          source: "Quran 93:7",
          type: "quran",
          _isDefault: true,
        },
        {
          text_en: "So remember Me; I will remember you.",
          text_id: "Maka ingatlah Aku, niscaya Aku mengingatmu.",
          source: "Quran 2:152",
          type: "quran",
          _isDefault: true,
        },
      ];
    }

    this.updateLanguageSelectorButton();
  }

  async refreshDefaultQuotes() {
    await this.loadDefaultQuotes();
    // If defaults are enabled (or no other source is enabled), this will
    // immediately reflect the refreshed data.
    this.displayRandomQuote();
  }

  loadUserQuotes() {
    const stored = this.storage.getUserQuotes();
    this.userQuotes = this.normalizeUserQuotes(stored);
    const settings = this.storage.getSettings();
    this.quotesPerPage = settings.quotesPerPage || 10;

    // Persist migrations from legacy quote schema if needed.
    this.storage.saveUserQuotes(this.userQuotes);
  }
});
