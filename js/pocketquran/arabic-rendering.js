/**
 * PocketQuranManager: arabic word and tajweed spans.
 * Part of the class declared in js/pocketquran/index.js; load this after it.
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
})(PocketQuranManager.prototype, class {

  normalizeArabicWordForRecitation(text) {
    return QuranArabic.normalizeWord(text);
  }

  getPlainArabicRecitationWords(text) {
    return String(text || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .filter((word) => !this.isAyahNumberMarkerText(word))
      .map((word) => ({
        text: word,
        normalized: this.normalizeArabicWordForRecitation(word),
      }))
      .filter((word) => word.normalized.length > 0);
  }

  isArabicCombiningMark(char) {
    return QuranArabic.isCombiningMark(char);
  }

  splitArabicTextClusters(text) {
    return QuranArabic.clusters(text);
  }

  appendTajweedClusterToWord(wordEl, cluster, ancestors = []) {
    if (!wordEl || !cluster) return;

    if (!ancestors.length) {
      wordEl.appendChild(document.createTextNode(cluster));
      return;
    }

    let parent = wordEl;
    ancestors.forEach((ancestor) => {
      const clone = ancestor.cloneNode(false);
      parent.appendChild(clone);
      parent = clone;
    });
    parent.appendChild(document.createTextNode(cluster));
  }

  appendTajweedNodeToRecitationWords(node, state, ancestors = []) {
    if (!node || !state) return;

    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || "";
      if (this.isAyahNumberMarkerText(text)) {
        state.closeWord();
        state.appendMarker(text);
        return;
      }

      this.splitArabicTextClusters(text).forEach((cluster) => {
        if (!cluster || /^\s+$/.test(cluster)) return;

        if (this.isAyahNumberMarkerText(cluster)) {
          state.closeWord();
          state.appendMarker(cluster);
          return;
        }

        const normalized = this.normalizeArabicWordForRecitation(cluster);
        if (!normalized && !state.currentWordEl) return;

        const wordEl = state.ensureWordEl();
        if (!wordEl) {
          if (normalized || this.isAyahNumberMarkerText(cluster)) {
            state.appendMarker(cluster);
          }
          return;
        }

        this.appendTajweedClusterToWord(wordEl, cluster, ancestors);
        if (!normalized) return;

        const targetWord = state.plainWords[state.currentWordIndex - 1];
        const currentWordNormalized =
          (state.currentWordNormalized || "") + normalized;
        state.currentWordNormalized = currentWordNormalized;

        if (
          targetWord &&
          currentWordNormalized.length >= targetWord.normalized.length
        ) {
          state.closeWord();
        }
      });
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return;

    if (this.isAyahNumberMarkerText(node.textContent)) {
      state.closeWord();
      state.appendMarker(node);
      return;
    }

    const nextAncestors = [...ancestors, node];
    node.childNodes.forEach((child) => {
      this.appendTajweedNodeToRecitationWords(child, state, nextAncestors);
    });
  }

  renderArabicWordSpans(container, text, verseKey) {
    if (!container) return;

    container.textContent = "";
    const words = String(text || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (!words.length) return;

    let wordIndex = 0;
    words.forEach((word, index) => {
      if (index > 0) {
        container.appendChild(document.createTextNode(" "));
      }

      if (this.isAyahNumberMarkerText(word)) {
        this.appendAyahNumberMarker(container, word);
        return;
      }

      wordIndex += 1;
      const wordEl = document.createElement("span");
      wordEl.className = "pq-recitation-word";
      wordEl.dataset.verseKey = verseKey;
      wordEl.dataset.wordIndex = String(wordIndex);
      wordEl.dataset.recitationKey = `${verseKey}:${wordIndex}`;
      wordEl.textContent = word;
      container.appendChild(wordEl);
    });
  }

  renderTajweedWordSpans(container, html, verseKey, plainText = "") {
    if (!container) return;

    const plainWords = this.getPlainArabicRecitationWords(plainText);
    const template = document.createElement("template");
    template.innerHTML = html;
    container.textContent = "";

    let wordIndex = 0;
    let currentWordEl = null;

    const closeWord = () => {
      currentWordEl = null;
      state.currentWordEl = null;
      state.currentWordNormalized = "";
    };

    const appendMarker = (content) => {
      if (wordIndex > 0) {
        container.appendChild(document.createTextNode(" "));
      }
      this.appendAyahNumberMarker(container, content);
    };

    const ensureWordEl = () => {
      if (currentWordEl) return currentWordEl;
      if (plainWords.length && wordIndex >= plainWords.length) return null;

      wordIndex += 1;
      if (wordIndex > 1) {
        container.appendChild(document.createTextNode(" "));
      }

      currentWordEl = document.createElement("span");
      currentWordEl.className = "pq-recitation-word";
      currentWordEl.dataset.verseKey = verseKey;
      currentWordEl.dataset.wordIndex = String(wordIndex);
      currentWordEl.dataset.recitationKey = `${verseKey}:${wordIndex}`;
      container.appendChild(currentWordEl);
      state.currentWordEl = currentWordEl;
      state.currentWordIndex = wordIndex;
      state.currentWordNormalized = "";
      return currentWordEl;
    };
    const state = {
      container,
      plainWords,
      currentWordEl: null,
      currentWordIndex: 0,
      currentWordNormalized: "",
      ensureWordEl,
      closeWord,
      appendMarker,
    };

    const appendText = (text) => {
      if (plainWords.length) {
        const node = document.createTextNode(text);
        this.appendTajweedNodeToRecitationWords(node, state);
        return;
      }

      String(text || "")
        .split(/(\s+)/)
        .filter((part) => part.length > 0)
        .forEach((part) => {
          if (/^\s+$/.test(part)) {
            container.appendChild(document.createTextNode(part));
            closeWord();
            return;
          }

          if (this.isAyahNumberMarkerText(part)) {
            this.appendAyahNumberMarker(container, part);
            closeWord();
            return;
          }

          ensureWordEl().appendChild(document.createTextNode(part));
        });
    };

    template.content.childNodes.forEach((node) => {
      if (plainWords.length) {
        this.appendTajweedNodeToRecitationWords(node, state);
        return;
      }

      if (node.nodeType === Node.TEXT_NODE) {
        appendText(node.textContent);
        return;
      }

      if (node.nodeType === Node.ELEMENT_NODE) {
        if (this.isAyahNumberMarkerText(node.textContent)) {
          if (plainWords.length && wordIndex > 0) {
            container.appendChild(document.createTextNode(" "));
          }
          this.appendAyahNumberMarker(container, node);
          closeWord();
          return;
        }

        const clone = node.cloneNode(true);
        const wordEl = ensureWordEl();
        if (!wordEl) return;
        wordEl.appendChild(clone);

        if (plainWords.length) {
          const targetWord = plainWords[ensureWordEl.currentWordIndex - 1];
          const normalized = this.normalizeArabicWordForRecitation(
            node.textContent,
          );
          const currentWordNormalized =
            (ensureWordEl.currentWordNormalized || "") + normalized;
          ensureWordEl.currentWordNormalized = currentWordNormalized;

          if (
            targetWord &&
            currentWordNormalized.length >= targetWord.normalized.length
          ) {
            closeWord();
          }
        }
      }
    });
  }
});
