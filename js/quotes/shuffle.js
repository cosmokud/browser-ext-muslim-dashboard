/**
 * QuotesManager: shuffle playlist bookkeeping.
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

  getQuoteShufflePlaylistKey(quotes) {
    return quotes
      .map((quote, index) => {
        const id = quote?.id ?? index;
        const source = String(quote?.source || "").trim();
        const text = this.getQuoteText(quote);
        return `${id}:${source}:${text}`;
      })
      .join("\n");
  }

  resetQuoteShufflePlaylist(quotes = this.getAvailableQuotes()) {
    this._quoteShufflePlaylist = quotes.slice();
    this._quoteShufflePlaylistKey = this.getQuoteShufflePlaylistKey(quotes);
    this._quoteShufflePlaylistIndex = -1;

    for (let i = this._quoteShufflePlaylist.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [this._quoteShufflePlaylist[i], this._quoteShufflePlaylist[j]] = [
        this._quoteShufflePlaylist[j],
        this._quoteShufflePlaylist[i],
      ];
    }

    const currentIndex = this._quoteShufflePlaylist.indexOf(this.currentQuote);
    if (currentIndex >= 0) {
      this._quoteShufflePlaylistIndex = currentIndex;
    }
  }

  ensureQuoteShufflePlaylist(quotes) {
    const key = this.getQuoteShufflePlaylistKey(quotes);
    if (
      this._quoteShufflePlaylist.length !== quotes.length ||
      this._quoteShufflePlaylistKey !== key
    ) {
      this.resetQuoteShufflePlaylist(quotes);
    }
  }

  getNextQuoteFromShufflePlaylist(quotes) {
    this.ensureQuoteShufflePlaylist(quotes);
    if (this._quoteShufflePlaylist.length === 0) return null;

    this._quoteShufflePlaylistIndex += 1;
    if (this._quoteShufflePlaylistIndex >= this._quoteShufflePlaylist.length) {
      this._quoteShufflePlaylistIndex = 0;
    }

    return this._quoteShufflePlaylist[this._quoteShufflePlaylistIndex];
  }

  getPreviousQuoteFromShufflePlaylist(quotes) {
    this.ensureQuoteShufflePlaylist(quotes);
    if (this._quoteShufflePlaylist.length === 0) return null;

    this._quoteShufflePlaylistIndex -= 1;
    if (this._quoteShufflePlaylistIndex < 0) {
      this._quoteShufflePlaylistIndex = this._quoteShufflePlaylist.length - 1;
    }

    return this._quoteShufflePlaylist[this._quoteShufflePlaylistIndex];
  }
});
