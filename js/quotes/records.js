/**
 * QuotesManager: quote record normalization and serialization.
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

  normalizeQuoteRecord(raw) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;

    const source = String(raw.source || "").trim();
    const type = String(raw.type || "user").trim() || "user";
    const textFields = {};

    Object.entries(raw).forEach(([rawKey, rawValue]) => {
      if (rawValue == null) return;
      const key = String(rawKey || "");
      const value = String(rawValue).trim();
      if (!value) return;

      let match = key.match(/^text_(.+)$/i);
      if (match) {
        const code = this.normalizeLanguageCode(match[1]);
        if (!code) return;
        textFields[`text_${code}`] = value;
        return;
      }

      match = key.match(/^translation_(.+)$/i);
      if (match) {
        const code = this.normalizeLanguageCode(match[1]);
        if (!code) return;
        if (!textFields[`text_${code}`]) {
          textFields[`text_${code}`] = value;
        }
      }
    });

    const legacyText = String(
      raw.text || raw.translation || raw.english || "",
    ).trim();
    if (legacyText) {
      if (raw.isArabic === true) {
        if (!textFields.text_ar) textFields.text_ar = legacyText;
      } else if (!textFields.text_en) {
        textFields.text_en = legacyText;
      }
    }

    if (!Object.keys(textFields).length) return null;

    const rawId = raw.id;
    const parsedId = Number(rawId);
    const id = Number.isFinite(parsedId)
      ? parsedId
      : Date.now() + Math.floor(Math.random() * 1000000);

    return {
      id,
      source,
      type,
      ...textFields,
    };
  }

  normalizeUserQuotes(quotes) {
    const list = Array.isArray(quotes) ? quotes : [];
    const normalized = list
      .map((q) => this.normalizeQuoteRecord(q))
      .filter(Boolean);

    const deduped = [];
    const seen = new Set();
    normalized.forEach((quote) => {
      const key = JSON.stringify(this.serializeUserQuote(quote));
      if (seen.has(key)) return;
      seen.add(key);
      deduped.push(quote);
    });

    return deduped;
  }

  serializeUserQuote(quote) {
    const out = {};
    Object.keys(quote || {})
      .filter((key) => /^text_[a-z0-9-]+$/i.test(key))
      .sort()
      .forEach((key) => {
        const value = String(quote[key] || "").trim();
        if (value) out[key.toLowerCase()] = value;
      });

    out.source = String(quote?.source || "").trim();
    out.type = String(quote?.type || "user").trim() || "user";
    return out;
  }

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
});
