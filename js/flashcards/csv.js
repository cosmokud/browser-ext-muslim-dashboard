/**
 * FlashcardManager: CSV parsing and writing.
 * Part of the class declared in js/flashcards/index.js; load this after it.
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
})(FlashcardManager.prototype, class {

  parseCsvTwoColumns(text) {
    const rows = this.parseCsv(text);

    const cards = [];
    for (const row of rows) {
      if (!row || row.length === 0) continue;

      const question = (row[0] ?? "").trim();
      const answer = (row[1] ?? "").trim();

      // Skip completely empty lines
      if (!question && !answer) continue;

      cards.push({ question, answer });
    }

    return cards;
  }

  parsePipeTwoColumns(text) {
    if (!text) return [];
    const lines = String(text).split(/\r?\n/);
    const cards = [];
    for (const raw of lines) {
      const line = (raw || "").trim();
      if (!line) continue;
      const idx = line.indexOf("|");
      if (idx === -1) {
        // Fallback to CSV parsing for this line if no pipe found
        const rows = this.parseCsv(line);
        for (const row of rows) {
          const question = (row[0] ?? "").trim();
          const answer = (row[1] ?? "").trim();
          if (!question && !answer) continue;
          cards.push({ question, answer });
        }
        continue;
      }
      const question = line.slice(0, idx).trim();
      const answer = line.slice(idx + 1).trim();
      if (!question && !answer) continue;
      cards.push({ question, answer });
    }
    return cards;
  }

  parseCsv(text) {
    if (!text) return [];
    // RFC4180-ish parser: handles quotes, commas, CRLF
    const rows = [];
    let row = [];
    let field = "";
    let inQuotes = false;

    const pushField = () => {
      row.push(field);
      field = "";
    };

    const pushRow = () => {
      // Avoid trailing empty row when file ends with newline
      if (row.length === 1 && row[0] === "" && rows.length === 0) {
        // allow empty file
      }
      rows.push(row);
      row = [];
    };

    for (let i = 0; i < text.length; i += 1) {
      const ch = text[i];

      if (inQuotes) {
        if (ch === '"') {
          const next = text[i + 1];
          if (next === '"') {
            field += '"';
            i += 1;
          } else {
            inQuotes = false;
          }
        } else {
          field += ch;
        }
        continue;
      }

      if (ch === ",") {
        pushField();
      } else if (ch === "\n") {
        pushField();
        pushRow();
      } else if (ch === "\r") {
        // ignore CR; handle CRLF by skipping
      } else if (ch === '"') {
        inQuotes = true;
      } else {
        field += ch;
      }
    }

    // last field
    pushField();
    // only push if not a trailing empty row
    if (!(row.length === 1 && row[0] === "" && rows.length > 0)) {
      pushRow();
    }

    // Filter out fully empty rows
    return rows.filter((r) => r.some((v) => String(v).trim() !== ""));
  }

  cardsToCsv(cards) {
    const escape = (value) => {
      const s = String(value ?? "");
      if (/[\n\r,"]/.test(s)) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    return (cards || [])
      .map((c) => `${escape(c.question)},${escape(c.answer)}`)
      .join("\r\n");
  }
});
