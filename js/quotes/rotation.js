/**
 * QuotesManager: random quote display and auto rotate.
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

  displayRandomQuote() {
    const quotes = this.getAvailableQuotes();
    if (quotes.length === 0) {
      if (this.quoteText) {
        this.quoteText.textContent = "Add some inspiring quotes in settings!";
      }
      if (this.quoteSource) {
        this.quoteSource.textContent = "";
      }

      this.currentQuote = null;
      this._quoteHistory = [];
      this._quoteHistoryIndex = -1;
      this.resetQuoteShufflePlaylist([]);
      return;
    }

    // Shuffle mode: page playlist; non-shuffle mode: deterministic sequential quote.
    let newQuote;
    if (quotes.length === 1) {
      newQuote = quotes[0];
      this._sequentialQuoteCursor = 0;
    } else if (this.quoteShuffleEnabled === false) {
      const currentIndex = quotes.indexOf(this.currentQuote);
      let nextIndex =
        currentIndex >= 0 ? currentIndex + 1 : this._sequentialQuoteCursor + 1;

      if (!Number.isInteger(nextIndex) || nextIndex < 0) {
        nextIndex = 0;
      }
      if (nextIndex >= quotes.length) {
        nextIndex = 0;
      }

      newQuote = quotes[nextIndex];
      this._sequentialQuoteCursor = nextIndex;
    } else {
      newQuote = this.getNextQuoteFromShufflePlaylist(quotes);
    }

    this.setCurrentQuote(newQuote, { pushToHistory: true });
  }

  setCurrentQuote(quote, { pushToHistory = false } = {}) {
    if (!quote) return;

    if (pushToHistory) {
      this.pushQuoteToHistory(quote);
    }

    this.currentQuote = quote;

    if (this.quoteShuffleEnabled === false) {
      const quotes = this.getAvailableQuotes();
      const currentIndex = quotes.indexOf(quote);
      if (currentIndex >= 0) {
        this._sequentialQuoteCursor = currentIndex;
      }
    } else {
      const quotes = this.getAvailableQuotes();
      this.ensureQuoteShufflePlaylist(quotes);
      const currentIndex = this._quoteShufflePlaylist.indexOf(quote);
      if (currentIndex >= 0) {
        this._quoteShufflePlaylistIndex = currentIndex;
      }
    }

    this.animateQuote(quote);
  }

  pushQuoteToHistory(quote) {
    if (!quote) return;

    // If the user previously navigated back, truncate the forward history.
    if (this._quoteHistoryIndex < this._quoteHistory.length - 1) {
      this._quoteHistory = this._quoteHistory.slice(
        0,
        this._quoteHistoryIndex + 1,
      );
    }

    this._quoteHistory.push(quote);
    this._quoteHistoryIndex = this._quoteHistory.length - 1;

    // Cap history size.
    if (this._quoteHistory.length > this._maxQuoteHistory) {
      const overflow = this._quoteHistory.length - this._maxQuoteHistory;
      this._quoteHistory.splice(0, overflow);
      this._quoteHistoryIndex = Math.max(0, this._quoteHistoryIndex - overflow);
    }
  }

  showPreviousQuote() {
    if (this._quoteHistoryIndex > 0) {
      this._quoteHistoryIndex -= 1;
      const q = this._quoteHistory[this._quoteHistoryIndex];
      this.setCurrentQuote(q, { pushToHistory: false });
      return;
    }

    const quotes = this.getAvailableQuotes();
    if (quotes.length === 0) return;

    if (this.quoteShuffleEnabled !== false) {
      const q = this.getPreviousQuoteFromShufflePlaylist(quotes);
      this.setCurrentQuote(q, { pushToHistory: true });
      return;
    }

    const currentIndex = quotes.indexOf(this.currentQuote);
    let previousIndex =
      currentIndex >= 0 ? currentIndex : this._sequentialQuoteCursor;

    previousIndex -= 1;
    if (previousIndex < 0) {
      previousIndex = quotes.length - 1;
    }

    this.setCurrentQuote(quotes[previousIndex], { pushToHistory: true });
  }

  showNextQuote() {
    // If we have forward history (user went back), use it.
    if (this._quoteHistoryIndex >= 0) {
      const canForward =
        this._quoteHistoryIndex < this._quoteHistory.length - 1;
      if (canForward) {
        this._quoteHistoryIndex += 1;
        const q = this._quoteHistory[this._quoteHistoryIndex];
        this.setCurrentQuote(q, { pushToHistory: false });
        return;
      }
    }

    // Otherwise, pick the next quote and extend history.
    this.displayRandomQuote();
  }

  animateQuote(quote) {
    if (!this.quoteText || !this.quoteSource) return;

    const prefersReducedMotion = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    )?.matches;
    const container = this.quoteContainer || this.quoteText.parentElement;

    const quoteText = this.getQuoteText(quote);
    const quoteSource = quote?.source ? `— ${quote.source}` : "";
    const quoteLang = this.getQuoteLanguageCode(quote);
    const isArabic = quoteLang === "ar" || !!quote?.isArabic;

    if (!container || prefersReducedMotion) {
      this.quoteText.textContent = quoteText;
      this.quoteSource.textContent = quoteSource;
      this.quoteText.classList.toggle("arabic-text", isArabic);
      return;
    }

    // Cancel any in-flight animations to avoid stacking/jank
    if (this._activeAnimations.length > 0) {
      this._activeAnimations.forEach((a) => {
        try {
          a.cancel();
        } catch {
          // no-op
        }
      });
      this._activeAnimations = [];
    }

    // FLIP technique: First, measure initial state
    const startRect = container.getBoundingClientRect();
    const startHeight = startRect.height;

    // Lock the container height immediately to prevent layout shift
    container.style.height = `${startHeight}px`;
    container.style.overflow = "hidden";

    const outKeyframes = [
      { opacity: 1, transform: "translateY(0)" },
      { opacity: 0, transform: "translateY(-6px)" },
    ];

    const outOptions = {
      duration: 150,
      easing: "cubic-bezier(0.4, 0, 1, 1)",
      fill: "forwards",
    };

    const outText = this.quoteText.animate(outKeyframes, outOptions);
    const outSource = this.quoteSource.animate(outKeyframes, outOptions);
    this._activeAnimations.push(outText, outSource);

    outText.finished
      .catch(() => {})
      .finally(() => {
        // Skip if animation was cancelled
        if (outText.playState === "idle") return;

        // Swap content while invisible
        this.quoteText.textContent = quoteText;
        this.quoteSource.textContent = quoteSource;
        this.quoteText.classList.toggle("arabic-text", isArabic);

        // Force layout recalc and measure new height
        // Temporarily remove height lock to get natural height
        container.style.height = "auto";
        const endHeight = container.getBoundingClientRect().height;

        // Immediately re-lock at start height (no visual change yet)
        container.style.height = `${startHeight}px`;

        // Use requestAnimationFrame to batch the height transition
        requestAnimationFrame(() => {
          // Animate height using CSS transition for smoother performance
          container.style.transition =
            "height 280ms cubic-bezier(0.4, 0, 0.2, 1)";
          container.style.height = `${endHeight}px`;

          const inKeyframes = [
            { opacity: 0, transform: "translateY(8px)" },
            { opacity: 1, transform: "translateY(0)" },
          ];

          const inOptions = {
            duration: 220,
            delay: 40,
            easing: "cubic-bezier(0, 0, 0.2, 1)",
            fill: "forwards",
          };

          const inText = this.quoteText.animate(inKeyframes, inOptions);
          const inSource = this.quoteSource.animate(inKeyframes, inOptions);
          this._activeAnimations.push(inText, inSource);

          // Clean up after all animations complete
          const cleanup = () => {
            container.style.height = "";
            container.style.overflow = "";
            container.style.transition = "";
            this._activeAnimations = [];
          };

          // Wait for both height transition and fade-in to complete
          const heightTransitionEnd = new Promise((resolve) => {
            const onEnd = (e) => {
              if (e.propertyName === "height") {
                container.removeEventListener("transitionend", onEnd);
                resolve();
              }
            };
            container.addEventListener("transitionend", onEnd);
            // Fallback timeout in case transitionend doesn't fire
            setTimeout(resolve, 320);
          });

          Promise.all([
            heightTransitionEnd,
            inText.finished.catch(() => {}),
            inSource.finished.catch(() => {}),
          ]).then(cleanup);
        });
      });
  }

  startAutoRotate() {
    this.stopAutoRotate();
    if (this._hoverPauseAutoRotate || this.quoteAutoRotatePaused) return;
    this.autoRotateTimer = setInterval(() => {
      this.displayRandomQuote();
    }, this.autoRotateMs);
  }

  stopAutoRotate() {
    if (this.autoRotateTimer) {
      clearInterval(this.autoRotateTimer);
      this.autoRotateTimer = null;
    }
  }
});
