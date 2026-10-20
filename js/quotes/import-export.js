/**
 * QuotesManager: quote export and import.
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

  exportQuotes() {
    const normalizedQuotes = this.normalizeUserQuotes(this.userQuotes);
    if (normalizedQuotes.length !== this.userQuotes.length) {
      this.userQuotes = normalizedQuotes;
      this.storage.saveUserQuotes(this.userQuotes);
    }

    const payload = normalizedQuotes.map((quote) =>
      this.serializeUserQuote(quote),
    );
    const json = JSON.stringify(payload, null, 2);
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

  importQuotes(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const json = e.target.result;
          const parsed = JSON.parse(json);
          const quotes = Array.isArray(parsed)
            ? parsed
            : Array.isArray(parsed?.quotes)
              ? parsed.quotes
              : Array.isArray(parsed?.items)
                ? parsed.items
                : null;

          if (!Array.isArray(quotes)) {
            reject(new Error("Invalid format: expected an array"));
            return;
          }

          const before = this.userQuotes.length;
          const incoming = this.normalizeUserQuotes(quotes);
          this.userQuotes = this.normalizeUserQuotes([
            ...this.userQuotes,
            ...incoming,
          ]);
          const addedCount = Math.max(0, this.userQuotes.length - before);

          if (!addedCount) {
            reject(new Error("JSON contains no valid quotes"));
            return;
          }

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
});
