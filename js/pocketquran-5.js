/**
 * PocketQuranManager, part 5 of 6.
 * Moved out of js/pocketquran.js at method boundaries, so no single file carries the
 * whole class. The class itself is declared in js/pocketquran.js; load this after it.
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

  hideHeaderControls() {
    this.unwatchRecitationControlsVisibility();
    this.unwatchRecitationAutoDockVisibility();
    this.stopRecitationFloatingDrag();

    if (this._headerControlsBox) {
      this._headerControlsBox.classList.remove(
        "pq-recitation-controls-floating",
      );
      this._headerControlsBox.classList.remove(
        "pq-recitation-controls-floating-opaque",
      );
      this._headerControlsBox.style.removeProperty("left");
      this._headerControlsBox.style.removeProperty("top");
      this._headerControlsBox.remove();
      this._headerControlsBox = null;
    }

    this._recitationFloatingMode = false;
    this._recitationFloatingModeReason = null;
    this._recitationFloatingManualOnly = false;

    const header = this.card?.querySelector(".pocket-quran-header");
    if (header) {
      header.classList.remove("pq-has-recitation-controls");
    }
  }

  updatePlaybackUI() {
    // Update header controls
    if (this._headerControlsBox) {
      const playPauseBtn =
        this._headerControlsBox.querySelector(".pq-play-pause-btn");
      if (playPauseBtn) {
        playPauseBtn.innerHTML = this._isPlaying
          ? '<svg viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>'
          : '<svg viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="M8 5v14l11-7z"/></svg>';
        playPauseBtn.classList.toggle("active", this._isPlaying);
        playPauseBtn.setAttribute(
          "aria-pressed",
          this._isPlaying ? "true" : "false",
        );
      }

      const loopAyahBtn =
        this._headerControlsBox.querySelector(".pq-loop-ayah-btn");
      if (loopAyahBtn) {
        loopAyahBtn.classList.toggle("active", this._isLooping);
      }

      const loopSurahBtn =
        this._headerControlsBox.querySelector(".pq-loop-surah-btn");
      if (loopSurahBtn) {
        loopSurahBtn.classList.toggle("active", this._isSurahLooping);
      }

      const autoplayBtn =
        this._headerControlsBox.querySelector(".pq-autoplay-btn");
      if (autoplayBtn) {
        autoplayBtn.classList.toggle("active", this._isAutoplay);
      }

      const autoplayNextSurahBtn = this._headerControlsBox.querySelector(
        ".pq-autoplay-next-surah-btn",
      );
      if (autoplayNextSurahBtn) {
        autoplayNextSurahBtn.classList.toggle(
          "active",
          this._isAutoplayNextSurah,
        );
        autoplayNextSurahBtn.setAttribute(
          "aria-pressed",
          this._isAutoplayNextSurah ? "true" : "false",
        );
      }

      const autoscrollBtn =
        this._headerControlsBox.querySelector(".pq-autoscroll-btn");
      if (autoscrollBtn) {
        autoscrollBtn.classList.toggle("active", this._isAutoScroll);
        autoscrollBtn.setAttribute(
          "aria-pressed",
          this._isAutoScroll ? "true" : "false",
        );
      }

      const highlighterBtn =
        this._headerControlsBox.querySelector(".pq-highlighter-btn");
      if (highlighterBtn) {
        highlighterBtn.classList.toggle("active", this._isRecitationHighlighterEnabled);
        highlighterBtn.setAttribute(
          "aria-pressed",
          this._isRecitationHighlighterEnabled ? "true" : "false",
        );
      }

      const ayahInfo = this._headerControlsBox.querySelector(
        ".pq-recitation-ayah",
      );
      if (ayahInfo) {
        const fallback = { surah: this._activeSurah, ayah: this._activeAyah };
        const target = this._playingAyah || fallback;
        ayahInfo.textContent = this.formatRecitationAyahLabel(
          target?.surah,
          target?.ayah,
        );
      }

      const reciterInfo = this._headerControlsBox.querySelector(
        ".pq-recitation-reciter",
      );
      if (reciterInfo) {
        reciterInfo.textContent = this.getActiveReciterName();
      }

      this.updateRecitationFloatingButtons();

      if (this._recitationFloatingMode) {
        this.positionRecitationFloatingPanel();
      } else if (this._recitationFloatingEnabled) {
        this.watchRecitationControlsVisibility();
        this.maybeAutoFloatRecitationControls();
      }
    }

    // Update ayah play buttons
    this.updateAyahPlayButtons();

    this.publishPopupSyncState();
  }

  updateAyahPlayButtons() {
    if (!this._virtualContent) return;

    const playButtons =
      this._virtualContent.querySelectorAll(".pq-ayah-play-btn");
    playButtons.forEach((btn) => {
      const ayahEl = btn.closest(".pocket-quran-ayah");
      if (!ayahEl) return;

      const ayahNumber = parseInt(ayahEl.dataset.ayah, 10);
      const isThisAyahPlaying =
        this._isPlaying &&
        this._playingAyah?.surah === this._activeSurah &&
        this._playingAyah?.ayah === ayahNumber;

      btn.classList.toggle("playing", isThisAyahPlaying);
      btn.innerHTML = isThisAyahPlaying
        ? '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>'
        : '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M8 5v14l11-7z"/></svg>';
      btn.title = isThisAyahPlaying ? "Pause" : "Play recitation";
    });
  }

  getActiveReciterName() {
    const reciter = this._reciters.find((r) => r.id === this._activeReciterId);
    if (reciter) {
      return reciter.style
        ? `${reciter.name} (${reciter.style})`
        : reciter.name;
    }
    return "Unknown Reciter";
  }

  createReciterModal() {
    if (document.getElementById("pqReciterModal")) return;

    const modal = document.createElement("div");
    modal.id = "pqReciterModal";
    modal.className = "pq-bookmark-modal";
    modal.innerHTML = `
      <div class="pq-bookmark-modal-content pq-translation-modal-content">
        <div class="pq-bookmark-modal-header">
          <h3 class="pq-bookmark-modal-title">🎙️ Select Reciter</h3>
          <button type="button" class="pq-bookmark-modal-close" aria-label="Close">&times;</button>
        </div>
        <div class="pq-bookmark-modal-body">
          <div class="pq-bookmark-search">
            <input type="text" class="pq-bookmark-search-input pq-reciter-search" placeholder="Search reciters..." />
          </div>
          <div class="pq-reciter-list"></div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    this._reciterModal = modal;

    // Close button
    modal
      .querySelector(".pq-bookmark-modal-close")
      .addEventListener("click", () => {
        this.closeReciterModal();
      });

    // Click outside to close
    this._bindOverlayCloseBehavior(modal, () => this.closeReciterModal());

    // Search input
    const searchInput = modal.querySelector(".pq-reciter-search");
    searchInput.addEventListener("input", () => {
      this.renderReciterList(searchInput.value);
    });

    // Keyboard navigation
    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        this.closeReciterModal();
      }
    });
  }

  openReciterModal() {
    const modal = document.getElementById("pqReciterModal");
    if (!modal) return;

    const searchInput = modal.querySelector(".pq-reciter-search");
    if (searchInput) searchInput.value = "";

    this.renderReciterList("");
    modal.classList.add("active");

    // Focus search input
    setTimeout(() => {
      if (searchInput) searchInput.focus();
    }, 100);
  }

  closeReciterModal() {
    const modal = document.getElementById("pqReciterModal");
    if (modal) modal.classList.remove("active");
  }

  renderReciterList(query = "") {
    const modal = document.getElementById("pqReciterModal");
    if (!modal) return;

    const container = modal.querySelector(".pq-reciter-list");
    if (!container) return;

    const q = String(query || "")
      .toLowerCase()
      .trim();

    // Filter reciters by query
    const filtered = this._reciters.filter((r) => {
      if (!q) return true;
      const name = String(r.name || "").toLowerCase();
      const style = String(r.style || "").toLowerCase();
      return name.includes(q) || style.includes(q);
    });

    // Build HTML
    let html = "";
    for (const r of filtered) {
      const isActive = r.id === this._activeReciterId;
      const displayName = r.style ? `${r.name} (${r.style})` : r.name;
      html += `<button type="button" class="pq-translation-item ${
        isActive ? "active" : ""
      }" data-reciter-id="${r.id}">
        <span class="pq-translation-name">${this.escapeHtml(displayName)}</span>
        ${
          isActive
            ? `<span class="pq-translation-check">${this._getIcon("✓", {
                size: 14,
              })}</span>`
            : ""
        }
      </button>`;
    }

    if (!html) {
      html = `<div class="pq-translation-empty">No reciters found for "${this.escapeHtml(
        query,
      )}"</div>`;
    }

    container.innerHTML = html;

    // Add click handlers
    container.querySelectorAll(".pq-translation-item").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = parseInt(btn.dataset.reciterId, 10);
        if (Number.isFinite(id)) {
          this.selectReciter(id);
        }
      });
    });

    // Scroll active reciter into view
    const activeItem = container.querySelector(".pq-translation-item.active");
    if (activeItem && !q) {
      setTimeout(() => {
        activeItem.scrollIntoView({ block: "center", behavior: "auto" });
      }, 50);
    }
  }

  renderLoading(message) {
    if (!this.contentEl) return;
    this.destroyVirtualization();
    this.contentEl.innerHTML = "";

    const containerHeight =
      this._lastVirtualContainerHeightPx &&
      this._lastVirtualContainerHeightPx > 0
        ? this._lastVirtualContainerHeightPx
        : 1000;

    const contentMinHeight =
      this._lastVirtualContentHeightPx && this._lastVirtualContentHeightPx > 0
        ? this._lastVirtualContentHeightPx
        : Math.max(320, containerHeight - 120);

    const spacerHeight =
      this._lastVirtualSpacerHeightPx && this._lastVirtualSpacerHeightPx > 0
        ? this._lastVirtualSpacerHeightPx
        : Math.max(1400, containerHeight * 2);

    const virtualContainer = document.createElement("div");
    virtualContainer.className = "pq-virtual-container";
    virtualContainer.style.height = `${containerHeight}px`;

    const spacer = document.createElement("div");
    spacer.className = "pq-virtual-spacer";
    spacer.style.height = `${spacerHeight}px`;

    const content = document.createElement("div");
    content.className = "pq-virtual-content pq-virtual-content-loading";
    content.style.transform = "translateY(0px)";
    content.style.minHeight = `${contentMinHeight}px`;

    const label = document.createElement("div");
    label.className = "pq-loading-label";

    const spinner = document.createElement("div");
    spinner.className = "pocket-quran-spinner";
    spinner.setAttribute("aria-hidden", "true");

    const text = document.createElement("div");
    text.className = "pocket-quran-loading-text";
    text.textContent = message || "Loading…";

    label.appendChild(spinner);
    label.appendChild(text);
    content.appendChild(label);

    const stack = document.createElement("div");
    stack.className = "pq-skeleton-stack";

    const widths = [
      { ar: "88%", tr: "66%" },
      { ar: "92%", tr: "58%" },
      { ar: "84%", tr: "72%" },
      { ar: "90%", tr: "62%" },
      { ar: "86%", tr: "70%" },
      { ar: "94%", tr: "54%" },
    ];

    for (let i = 0; i < widths.length; i++) {
      const card = document.createElement("div");
      card.className = "pq-skeleton-ayah";

      const ar = document.createElement("div");
      ar.className = "pq-skeleton-line pq-skel-ar";
      ar.style.width = widths[i].ar;

      const tr = document.createElement("div");
      tr.className = "pq-skeleton-line pq-skel-tr";
      tr.style.width = widths[i].tr;

      card.appendChild(ar);
      card.appendChild(tr);
      stack.appendChild(card);
    }

    content.appendChild(stack);
    spacer.appendChild(content);
    virtualContainer.appendChild(spacer);
    this.contentEl.appendChild(virtualContainer);
  }

  renderError(message) {
    if (!this.contentEl) return;
    this.destroyVirtualization();
    this.contentEl.innerHTML = "";

    const div = document.createElement("div");
    div.className = "pocket-quran-error";

    const text = document.createElement("div");
    text.className = "pocket-quran-error-text";
    text.textContent = message || "Something went wrong.";

    const retry = document.createElement("button");
    retry.type = "button";
    retry.className = "pocket-quran-retry-btn";
    retry.textContent = "Retry";
    retry.addEventListener("click", () => this.loadSurah(this._activeSurah));

    div.appendChild(text);
    div.appendChild(retry);
    this.contentEl.appendChild(div);
  }

  stripHtmlToText(html) {
    try {
      const div = document.createElement("div");
      div.innerHTML = String(html || "");

      // Remove footnote elements (usually <sup> tags with footnote markers)
      // quran.com API uses <sup foot_note="..."> for footnotes
      const footnotes = div.querySelectorAll(
        "sup[foot_note], sup.foot_note, sup",
      );
      footnotes.forEach((fn) => fn.remove());

      return (div.textContent || "").replace(/\s+/g, " ").trim();
    } catch (e) {
      return String(html || "")
        .replace(/<sup[^>]*>.*?<\/sup>/gi, "") // Remove sup tags and their content
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    }
  }

  normalizeTranslationId(value) {
    const n = parseInt(value, 10);
    if (Number.isFinite(n) && PocketQuranManager.TRANSLATIONS[n]) return n;
    return 85;
  }

  normalizeRecitationFloatingAppearance(value) {
    return value === "theme" ? "theme" : "opaque";
  }

  clampNumber(value, min, max, fallback) {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, n));
  }

  normalizeTextVisibilityState(
    showArabicText,
    showTranslationText,
    allowBothOff = false,
  ) {
    const normalized = {
      showArabicText: showArabicText !== false,
      showTranslationText: showTranslationText !== false,
    };

    if (
      allowBothOff ||
      normalized.showArabicText ||
      normalized.showTranslationText
    ) {
      return normalized;
    }

    return {
      showArabicText: true,
      showTranslationText: false,
    };
  }

  persistPocketQuranSettings(patch) {
    const settings = this.storage.getSettings();
    const nextPocketQuran = {
      ...(settings.pocketQuran || {}),
      ...(patch || {}),
    };

    const normalizedVisibility = this.normalizeTextVisibilityState(
      nextPocketQuran.showArabicText,
      nextPocketQuran.showTranslationText,
      false,
    );
    nextPocketQuran.showArabicText = normalizedVisibility.showArabicText;
    nextPocketQuran.showTranslationText =
      normalizedVisibility.showTranslationText;

    settings.pocketQuran = nextPocketQuran;
    this.storage.saveSettings(settings);
  }

  normalizeCssHexColor(value, fallback) {
    const v = String(value || "").trim();
    if (/^#[0-9a-f]{6}$/i.test(v)) return v;
    if (/^#[0-9a-f]{3}$/i.test(v)) return v;
    return fallback;
  }

  normalizeArabicFontFamily(value) {
    const v = String(value || "").trim();
    if (PocketQuranManager.ARABIC_FONT_FAMILIES.includes(v)) return v;
    return "KFGQPC Uthman Taha Naskh";
  }

  normalizeTranslationFontFamily(value) {
    const v = String(value || "").trim();
    if (PocketQuranManager.TRANSLATION_FONT_FAMILIES.includes(v)) return v;
    return "Poppins";
  }

  resolveTranslationFontCssValue(fontFamily) {
    if (fontFamily === "Georgia") {
      return '"Georgia", serif';
    }
    if (fontFamily === "Courier New") {
      return '"Courier New", monospace';
    }
    if (fontFamily === "Cascadia Code") {
      return '"Cascadia Code", "JetBrains Mono", Consolas, monospace';
    }
    return `"${fontFamily}", var(--font-primary)`;
  }

  applyArabicFontFamily(fontFamily, opts = {}) {
    const { persist = false, recalculate = true } = opts;

    const normalized = this.normalizeArabicFontFamily(fontFamily);
    const previous = this._arabicFontFamily;
    const fontChanged = previous !== normalized;
    this._arabicFontFamily = normalized;

    if (this.card) {
      const cssValue = `"${normalized}", var(--font-arabic)`;
      this.card.style.setProperty("--pq-arabic-font-family", cssValue);
    }

    if (this.fontToggleBtn) {
      this.fontToggleBtn.title = `Change Arabic font (current: ${normalized})`;
    }

    this.syncTajweedAvailabilityForFont();

    if (recalculate && fontChanged) {
      this._ayahHeights.clear();
      this.recalculateVirtualization();
    }

    if (persist) {
      this.persistPocketQuranSettings({ arabicFontFamily: normalized });
    }

    if (fontChanged) {
      try {
        document.dispatchEvent(
          new CustomEvent("md:pq-arabic-font-selected", {
            detail: { fontFamily: normalized },
          }),
        );
      } catch (e) {}
    }
  }

  applyTranslationFontFamily(fontFamily, opts = {}) {
    const { persist = false, recalculate = true } = opts;

    const normalized = this.normalizeTranslationFontFamily(fontFamily);
    const previous = this._translationFontFamily;
    const fontChanged = previous !== normalized;
    this._translationFontFamily = normalized;

    if (this.card) {
      this.card.style.setProperty(
        "--pq-translation-font-family",
        this.resolveTranslationFontCssValue(normalized),
      );
    }

    if (recalculate && fontChanged) {
      this._ayahHeights.clear();
      this.recalculateVirtualization();
    }

    if (persist) {
      this.persistPocketQuranSettings({ translationFontFamily: normalized });
    }

    if (fontChanged) {
      try {
        document.dispatchEvent(
          new CustomEvent("md:pq-translation-font-selected", {
            detail: { fontFamily: normalized },
          }),
        );
      } catch (e) {}
    }
  }

  createFontPickerModal() {
    if (document.getElementById("pqFontModal")) return;

    const modal = document.createElement("div");
    modal.id = "pqFontModal";
    modal.className = "pq-bookmark-modal";
    modal.innerHTML = `
      <div class="pq-bookmark-modal-content pq-translation-modal-content">
        <div class="pq-bookmark-modal-header">
          <h3 class="pq-bookmark-modal-title">Arabic Font</h3>
          <button type="button" class="pq-bookmark-modal-close" aria-label="Close">&times;</button>
        </div>
        <div class="pq-bookmark-modal-body">
          <div class="pq-bookmark-search">
            <input type="text" class="pq-bookmark-search-input pq-font-search" placeholder="Search fonts..." />
          </div>
          <div class="pq-translation-list">
            <div class="pq-translation-items pq-font-items"></div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    this._fontModal = modal;

    modal
      .querySelector(".pq-bookmark-modal-close")
      .addEventListener("click", () => this.closeFontPickerModal());

    this._bindOverlayCloseBehavior(modal, () => this.closeFontPickerModal());

    const searchInput = modal.querySelector(".pq-font-search");
    searchInput.addEventListener("input", () => {
      this.renderFontList(searchInput.value);
    });
    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Escape") this.closeFontPickerModal();
    });
  }

  openFontPickerModal(opts = {}) {
    const modal = document.getElementById("pqFontModal");
    if (!modal) return;

    const target = opts?.target === "popup" ? "popup" : "card";
    const requestedCurrentFont =
      target === "popup" ? opts?.currentFont : this._arabicFontFamily;

    this._fontPickerTarget = target;
    this._fontPickerKind = "arabic";
    this._fontPickerCurrentFont =
      this.normalizeArabicFontFamily(requestedCurrentFont);

    const title = modal.querySelector(".pq-bookmark-modal-title");
    if (title) title.textContent = "Arabic Font";

    const searchInput = modal.querySelector(".pq-font-search");
    if (searchInput) searchInput.value = "";

    this.renderFontList("");
    modal.classList.add("active");

    setTimeout(() => {
      try {
        searchInput?.focus();
      } catch (e) {}
    }, 100);
  }

  openTranslationFontPickerModal(opts = {}) {
    const modal = document.getElementById("pqFontModal");
    if (!modal) return;

    const target = opts?.target === "popup" ? "popup" : "card";
    const requestedCurrentFont =
      target === "popup" ? opts?.currentFont : this._translationFontFamily;

    this._fontPickerTarget = target;
    this._fontPickerKind = "translation";
    this._fontPickerCurrentFont =
      this.normalizeTranslationFontFamily(requestedCurrentFont);

    const title = modal.querySelector(".pq-bookmark-modal-title");
    if (title) title.textContent = "Translation Font";

    const searchInput = modal.querySelector(".pq-font-search");
    if (searchInput) searchInput.value = "";

    this.renderFontList("");
    modal.classList.add("active");

    setTimeout(() => {
      try {
        searchInput?.focus();
      } catch (e) {}
    }, 100);
  }

  closeFontPickerModal() {
    const modal = document.getElementById("pqFontModal");
    if (modal) modal.classList.remove("active");
    this._fontPickerTarget = "card";
    this._fontPickerKind = "arabic";
    this._fontPickerCurrentFont = null;
  }

  renderFontList(query = "") {
    const modal = document.getElementById("pqFontModal");
    if (!modal) return;

    const container = modal.querySelector(".pq-font-items");
    if (!container) return;

    const q = String(query || "")
      .toLowerCase()
      .trim();
    const isTranslationPicker = this._fontPickerKind === "translation";
    const availableFonts = isTranslationPicker
      ? PocketQuranManager.TRANSLATION_FONT_FAMILIES
      : PocketQuranManager.ARABIC_FONT_FAMILIES;
    const fonts = availableFonts.filter((f) => f.toLowerCase().includes(q));

    const current = isTranslationPicker
      ? this.normalizeTranslationFontFamily(
          this._fontPickerTarget === "popup"
            ? this._fontPickerCurrentFont || this._translationFontFamily
            : this._translationFontFamily,
        )
      : this.normalizeArabicFontFamily(
          this._fontPickerTarget === "popup"
            ? this._fontPickerCurrentFont || this._arabicFontFamily
            : this._arabicFontFamily,
        );
    const previewText = isTranslationPicker
      ? "The quick brown fox jumps over the lazy dog"
      : "بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ";
    const previewClass = isTranslationPicker
      ? "pq-font-preview pq-font-preview-translation"
      : "pq-font-preview";
    let html = "";
    for (const f of fonts) {
      const isActive = f === current;
      html += `<button type="button" class="pq-translation-item ${
        isActive ? "active" : ""
      }" data-font-family="${this.escapeHtml(f)}">
        <span class="pq-font-label">
          <span class="pq-translation-name">${this.escapeHtml(f)}</span>
          <span class="${previewClass}" ${
            isTranslationPicker ? 'lang="en"' : 'lang="ar" dir="rtl"'
          }>${previewText}</span>
        </span>
        ${
          isActive
            ? `<span class="pq-translation-check">${this._getIcon("✓", {
                size: 14,
              })}</span>`
            : ""
        }
      </button>`;
    }

    if (!html) {
      html = `<div class="pq-translation-empty">No fonts found for "${this.escapeHtml(
        query,
      )}"</div>`;
      container.innerHTML = html;
      return;
    }

    container.innerHTML = html;
    container.querySelectorAll(".pq-font-preview").forEach((preview) => {
      const font = preview
        .closest(".pq-translation-item")
        ?.getAttribute("data-font-family");
      if (!font) return;
      preview.style.fontFamily = isTranslationPicker
        ? this.resolveTranslationFontCssValue(font)
        : `"${font}", var(--font-arabic)`;
    });
    container.querySelectorAll(".pq-translation-item").forEach((btn) => {
      btn.addEventListener("click", () => {
        const font = btn.getAttribute("data-font-family");

        if (isTranslationPicker && this._fontPickerTarget === "popup") {
          const normalized = this.normalizeTranslationFontFamily(font);
          this._fontPickerCurrentFont = normalized;
          try {
            document.dispatchEvent(
              new CustomEvent("md:pq-popup-translation-font-selected", {
                detail: { fontFamily: normalized },
              }),
            );
          } catch (e) {}
          this.closeFontPickerModal();
          return;
        }

        if (isTranslationPicker) {
          this.applyTranslationFontFamily(font, {
            persist: false,
            recalculate: true,
          });
          this.closeFontPickerModal();
          return;
        }

        if (this._fontPickerTarget === "popup") {
          const normalized = this.normalizeArabicFontFamily(font);
          this._fontPickerCurrentFont = normalized;
          try {
            document.dispatchEvent(
              new CustomEvent("md:pq-popup-arabic-font-selected", {
                detail: { fontFamily: normalized },
              }),
            );
          } catch (e) {}
          this.closeFontPickerModal();
          return;
        }

        this.applyArabicFontFamily(font, { persist: true, recalculate: true });
        this.closeFontPickerModal();
      });
    });
  }

  applyTajweedColors(colors, opts = {}) {
    const { persist = false } = opts;
    if (!this.card) return;

    const defaults = PocketQuranManager.DEFAULT_TAJWEED_COLORS;
    const input = colors && typeof colors === "object" ? colors : {};
    const merged = { ...defaults, ...input };

    for (const key of Object.keys(defaults)) {
      const normalized = this.normalizeCssHexColor(merged[key], defaults[key]);
      this.card.style.setProperty(`--pq-tajweed-${key}`, normalized);
    }

    if (persist) {
      this.persistPocketQuranSettings({ tajweedColors: merged });
    }
  }

  updateRangeProgress(rangeEl) {
    if (!(rangeEl instanceof HTMLInputElement)) return;

    const min = parseInt(rangeEl.min, 10);
    const max = parseInt(rangeEl.max, 10);
    const value = parseInt(rangeEl.value, 10);

    const safeMin = Number.isFinite(min) ? min : 1;
    const safeMax = Number.isFinite(max) ? max : safeMin + 1;
    const safeValue = Number.isFinite(value) ? value : safeMin;

    const range = Math.max(1, safeMax - safeMin);
    const progress = ((safeValue - safeMin) / range) * 100;
    const clampedProgress = Math.max(0, Math.min(100, progress));

    rangeEl.style.setProperty("--jump-progress", `${clampedProgress}%`);
  }

  applyFontSizes(arabicPx, translationPx, opts = {}) {
    const { syncInputs = false, persist = false } = opts;

    const a = SettingsRegistry.coerce("arabicFontSize", arabicPx, 40);
    const t = SettingsRegistry.coerce("translationFontSize", translationPx, 18);

    if (this.card) {
      const badgeOffset = Math.max(0, (a * 1.95 - 34) / 2);
      this.card.style.setProperty("--pq-arabic-size", `${a}px`);
      this.card.style.setProperty(
        "--pq-ayah-badge-align-offset",
        `${badgeOffset.toFixed(2)}px`,
      );
      this.card.style.setProperty("--pq-translation-size", `${t}px`);
    }

    if (syncInputs) {
      if (this.arabicSizeRange) this.arabicSizeRange.value = String(a);
      if (this.translationSizeRange)
        this.translationSizeRange.value = String(t);
      if (this.arabicSizeValue) this.arabicSizeValue.textContent = `${a}px`;
      if (this.translationSizeValue)
        this.translationSizeValue.textContent = `${t}px`;
    }

    this.updateRangeProgress(this.arabicSizeRange);
    this.updateRangeProgress(this.translationSizeRange);

    if (persist) {
      this.persistPocketQuranSettings({
        arabicFontSize: a,
        translationFontSize: t,
      });
    }
  }

  async fetchJson(url, opts = {}) {
    const { signal, timeoutMs = 15000 } = opts;

    const normalizedUrl = String(url || "").trim();
    const cacheable = this._pqCache?.isCacheableJsonUrl(normalizedUrl) === true;

    if (signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }

    // If JSON is cached, avoid any API call.
    if (cacheable && this._pqCache) {
      const cached = await this._pqCache.getJson(normalizedUrl);
      if (cached) return cached;
    }

    const controller = !signal ? new AbortController() : null;
    const timer = setTimeout(() => {
      try {
        if (controller) controller.abort();
      } catch (e) {}
    }, timeoutMs);

    try {
      const res = await fetch(normalizedUrl, {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: signal || controller.signal,
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} for ${normalizedUrl}`);
      }

      const data = await res.json();
      if (cacheable && this._pqCache) {
        // Best-effort: ignore quota/transaction failures.
        await this._pqCache.setJson(normalizedUrl, data, "quran_api");
      }

      return data;
    } finally {
      clearTimeout(timer);
    }
  }

  getBookmarkCategories() {
    return this.storage.get("pocketQuran_bookmarkCategories", []);
  }

  saveBookmarkCategories(categories) {
    this.storage.set("pocketQuran_bookmarkCategories", categories);
  }

  getBookmarks() {
    return this.storage.get("pocketQuran_bookmarks", []);
  }

  saveBookmarks(bookmarks) {
    this.storage.set("pocketQuran_bookmarks", bookmarks);
  }

  ensureDefaultBookmarkCategory() {
    const categories = this.getBookmarkCategories();
    if (!categories.length) {
      this.saveBookmarkCategories([
        {
          id: "default",
          name: "Bookmarked",
          createdAt: new Date().toISOString(),
        },
      ]);
    }
  }

  createBookmarkCategory(name) {
    const categories = this.getBookmarkCategories();
    const trimmed = String(name || "")
      .trim()
      .slice(0, 50);
    if (!trimmed) return null;

    const existing = categories.find(
      (c) => c.name.toLowerCase() === trimmed.toLowerCase(),
    );
    if (existing) return existing;

    const newCategory = {
      id: `cat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: trimmed,
      createdAt: new Date().toISOString(),
    };

    categories.push(newCategory);
    this.saveBookmarkCategories(categories);
    return newCategory;
  }

  renameBookmarkCategory(categoryId, newName) {
    const categories = this.getBookmarkCategories();
    const category = categories.find((c) => c.id === categoryId);
    if (!category) return false;

    const trimmed = String(newName || "")
      .trim()
      .slice(0, 50);
    if (!trimmed) return false;

    category.name = trimmed;
    this.saveBookmarkCategories(categories);
    return true;
  }

  deleteBookmarkCategory(categoryId) {
    if (categoryId === "default") return false;

    let categories = this.getBookmarkCategories();
    categories = categories.filter((c) => c.id !== categoryId);
    this.saveBookmarkCategories(categories);

    let bookmarks = this.getBookmarks();
    bookmarks = bookmarks.filter((b) => b.categoryId !== categoryId);
    this.saveBookmarks(bookmarks);

    return true;
  }

  addBookmark(categoryId, surah, ayah, arabicText, translationText) {
    const bookmarks = this.getBookmarks();

    // Check if already bookmarked in this category
    const existing = bookmarks.find(
      (b) =>
        b.categoryId === categoryId && b.surah === surah && b.ayah === ayah,
    );
    if (existing) return existing;

    const chapter = this._chapters.find((c) => c.id === surah);

    const bookmark = {
      id: `bm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      categoryId,
      surah,
      ayah,
      surahName: chapter?.name_simple || `Surah ${surah}`,
      surahNameAr: chapter?.name_arabic || "",
      arabicText: (arabicText || "").slice(0, 500),
      translationText: (translationText || "").slice(0, 500),
      createdAt: new Date().toISOString(),
    };

    bookmarks.push(bookmark);
    this.saveBookmarks(bookmarks);
    return bookmark;
  }

  removeBookmark(bookmarkId) {
    let bookmarks = this.getBookmarks();
    bookmarks = bookmarks.filter((b) => b.id !== bookmarkId);
    this.saveBookmarks(bookmarks);
  }

  removeBookmarkByAyah(categoryId, surah, ayah) {
    let bookmarks = this.getBookmarks();
    bookmarks = bookmarks.filter(
      (b) =>
        !(b.categoryId === categoryId && b.surah === surah && b.ayah === ayah),
    );
    this.saveBookmarks(bookmarks);
  }

  isAyahBookmarked(surah, ayah) {
    const bookmarks = this.getBookmarks();
    return bookmarks.some((b) => b.surah === surah && b.ayah === ayah);
  }

  isAyahBookmarkedInCategory(categoryId, surah, ayah) {
    const bookmarks = this.getBookmarks();
    return bookmarks.some(
      (b) =>
        b.categoryId === categoryId && b.surah === surah && b.ayah === ayah,
    );
  }

  getBookmarksForCategory(categoryId, searchQuery = "") {
    let bookmarks = this.getBookmarks().filter(
      (b) => b.categoryId === categoryId,
    );

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      bookmarks = bookmarks.filter(
        (b) =>
          b.surahName.toLowerCase().includes(q) ||
          b.surahNameAr.includes(searchQuery) ||
          String(b.surah).includes(q) ||
          String(b.ayah).includes(q) ||
          (b.arabicText || "").includes(searchQuery) ||
          (b.translationText || "").toLowerCase().includes(q),
      );
    }

    return bookmarks.sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
    );
  }

  getBookmarkCount(categoryId) {
    return this.getBookmarks().filter((b) => b.categoryId === categoryId)
      .length;
  }

  exportBookmarksJSON() {
    const data = {
      version: 1,
      exportedAt: new Date().toISOString(),
      categories: this.getBookmarkCategories(),
      bookmarks: this.getBookmarks(),
    };
    return JSON.stringify(data, null, 2);
  }

  importBookmarksJSON(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      if (!data || typeof data !== "object") {
        throw new Error("Invalid JSON structure");
      }

      const categories = Array.isArray(data.categories) ? data.categories : [];
      const bookmarks = Array.isArray(data.bookmarks) ? data.bookmarks : [];

      // Validate and normalize categories
      const validCategories = categories
        .filter((c) => c && c.id && c.name)
        .map((c) => ({
          id: String(c.id),
          name: String(c.name).slice(0, 50),
          createdAt: c.createdAt || new Date().toISOString(),
        }));

      // Ensure default category exists
      if (!validCategories.find((c) => c.id === "default")) {
        validCategories.unshift({
          id: "default",
          name: "Bookmarked",
          createdAt: new Date().toISOString(),
        });
      }

      // Validate and normalize bookmarks
      const validBookmarks = bookmarks
        .filter(
          (b) =>
            b &&
            b.id &&
            b.categoryId &&
            Number.isFinite(b.surah) &&
            Number.isFinite(b.ayah),
        )
        .map((b) => ({
          id: String(b.id),
          categoryId: String(b.categoryId),
          surah: parseInt(b.surah, 10),
          ayah: parseInt(b.ayah, 10),
          surahName: String(b.surahName || ""),
          surahNameAr: String(b.surahNameAr || ""),
          arabicText: String(b.arabicText || "").slice(0, 500),
          translationText: String(b.translationText || "").slice(0, 500),
          createdAt: b.createdAt || new Date().toISOString(),
        }));

      this.saveBookmarkCategories(validCategories);
      this.saveBookmarks(validBookmarks);

      return {
        success: true,
        categoriesCount: validCategories.length,
        bookmarksCount: validBookmarks.length,
      };
    } catch (e) {
      console.error("Failed to import bookmarks:", e);
      return { success: false, error: e.message };
    }
  }

  createPocketQuranSearchButton() {
    const headerActions = this.card?.querySelector(".card-header-actions");
    if (!headerActions) return;

    if (headerActions.querySelector(".pq-search-btn")) return;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "pq-search-btn";
    btn.innerHTML =
      '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M9.5 3a6.5 6.5 0 0 1 5.14 10.48l4.44 4.44-1.41 1.41-4.44-4.44A6.5 6.5 0 1 1 9.5 3Zm0 2a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9Z"/></svg>';
    btn.title = "Search Quran translation";
    btn.setAttribute("aria-label", "Search Quran translation");

    btn.addEventListener("click", (e) => {
      e.preventDefault();
      this.openPocketQuranSearchModal();
    });

    const bookmarkBtn = headerActions.querySelector(".pq-bookmark-btn");
    const blurMenu = headerActions.querySelector(".card-blur-menu");
    if (bookmarkBtn) {
      headerActions.insertBefore(btn, bookmarkBtn);
    } else if (blurMenu) {
      headerActions.insertBefore(btn, blurMenu);
    } else {
      headerActions.appendChild(btn);
    }
  }

  createPocketQuranSearchModal() {
    if (this._searchModal) return this._searchModal;

    const modal = document.createElement("div");
    modal.className = "pq-bookmark-modal pq-search-modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "pqSearchModalTitle");
    modal.innerHTML = `
      <div class="pq-bookmark-modal-content pq-search-modal-content">
        <div class="pq-bookmark-modal-header">
          <h3 class="pq-bookmark-modal-title" id="pqSearchModalTitle">Search Quran</h3>
          <div class="pq-search-header-actions">
            <label class="pq-search-size-control">
              <span>Arabic</span>
              <input type="range" class="pq-search-arabic-size" min="18" max="56" step="1" />
              <output class="pq-search-arabic-size-value"></output>
            </label>
            <label class="pq-search-size-control">
              <span>Translation</span>
              <input type="range" class="pq-search-translation-size" min="12" max="28" step="1" />
              <output class="pq-search-translation-size-value"></output>
            </label>
            <button type="button" class="pq-bookmark-modal-close" aria-label="Close">&times;</button>
          </div>
        </div>
        <form class="pq-search-form">
          <input type="search" class="pq-search-input" placeholder="Search selected translation" autocomplete="off" />
          <button type="submit" class="pq-search-submit-btn">Search</button>
        </form>
        <div class="pq-search-progress" hidden>
          <div class="pq-search-progress-ring" aria-hidden="true"></div>
          <div class="pq-search-progress-text">Preparing search cache...</div>
        </div>
        <div class="pq-search-status" aria-live="polite"></div>
        <div class="pq-search-results" role="list"></div>
        <div class="pq-search-pagination"></div>
      </div>
    `;

    document.body.appendChild(modal);
    this._searchModal = modal;
    this._searchInput = modal.querySelector(".pq-search-input");
    this._searchResultsEl = modal.querySelector(".pq-search-results");
    this._searchPaginationEl = modal.querySelector(".pq-search-pagination");
    this._searchStatusEl = modal.querySelector(".pq-search-status");
    this._searchProgressEl = modal.querySelector(".pq-search-progress");
    this._searchProgressTextEl = modal.querySelector(
      ".pq-search-progress-text",
    );
    this._searchSubmitBtn = modal.querySelector(".pq-search-submit-btn");
    this._searchArabicSizeRange = modal.querySelector(".pq-search-arabic-size");
    this._searchTranslationSizeRange = modal.querySelector(
      ".pq-search-translation-size",
    );
    this._searchArabicSizeValue = modal.querySelector(
      ".pq-search-arabic-size-value",
    );
    this._searchTranslationSizeValue = modal.querySelector(
      ".pq-search-translation-size-value",
    );
    this.syncSearchResultFontControls();

    modal
      .querySelector(".pq-bookmark-modal-close")
      ?.addEventListener("click", () => this.closePocketQuranSearchModal());
    modal.addEventListener("click", (e) => {
      if (e.target === modal) this.closePocketQuranSearchModal();
    });
    modal.querySelector(".pq-search-form")?.addEventListener("submit", (e) => {
      e.preventDefault();
      this.runPocketQuranSearch();
    });
    this._searchArabicSizeRange?.addEventListener("input", () => {
      this.applySearchResultFontSizes(
        this._searchArabicSizeRange.value,
        this._searchTranslationSizeRange?.value,
      );
    });
    this._searchTranslationSizeRange?.addEventListener("input", () => {
      this.applySearchResultFontSizes(
        this._searchArabicSizeRange?.value,
        this._searchTranslationSizeRange.value,
      );
    });

    return modal;
  }

  openPocketQuranSearchModal() {
    const modal = this.createPocketQuranSearchModal();
    modal.classList.add("active");
    this._searchInput?.focus();
  }

  closePocketQuranSearchModal() {
    if (!this._searchModal) return;
    this._searchModal.classList.remove("active");
  }

  getSearchResultFontDefaults() {
    const readPx = (name, fallback) => {
      try {
        const value = getComputedStyle(this.card).getPropertyValue(name);
        const parsed = parseFloat(String(value || "").trim());
        return Number.isFinite(parsed) ? parsed : fallback;
      } catch (e) {
        return fallback;
      }
    };

    return {
      arabic: this.clampNumber(readPx("--pq-arabic-size", 32), 18, 56, 32),
      translation: this.clampNumber(
        readPx("--pq-translation-size", 16),
        12,
        28,
        16,
      ),
    };
  }

  syncSearchResultFontControls() {
    if (!this._searchModal) return;
    const sizes = this.getSearchResultFontDefaults();
    this.applySearchResultFontSizes(sizes.arabic, sizes.translation);
  }

  applySearchResultFontSizes(arabicPx, translationPx) {
    if (!this._searchModal) return;

    const arabic = this.clampNumber(arabicPx, 18, 56, 32);
    const translation = this.clampNumber(translationPx, 12, 28, 16);
    this._searchModal.style.setProperty(
      "--pq-search-arabic-size",
      `${arabic}px`,
    );
    this._searchModal.style.setProperty(
      "--pq-search-translation-size",
      `${translation}px`,
    );

    if (this._searchArabicSizeRange) {
      this._searchArabicSizeRange.value = String(arabic);
      this.updateRangeProgress(this._searchArabicSizeRange);
    }
    if (this._searchTranslationSizeRange) {
      this._searchTranslationSizeRange.value = String(translation);
      this.updateRangeProgress(this._searchTranslationSizeRange);
    }
    if (this._searchArabicSizeValue) {
      this._searchArabicSizeValue.textContent = `${arabic}px`;
    }
    if (this._searchTranslationSizeValue) {
      this._searchTranslationSizeValue.textContent = `${translation}px`;
    }
  }

  setPocketQuranSearchLoading(isLoading, progress = null) {
    this._isSearchLoading = isLoading;
    if (this._searchSubmitBtn) this._searchSubmitBtn.disabled = isLoading;
    if (!this._searchProgressEl) return;

    this._searchProgressEl.hidden = !isLoading;
    if (!isLoading) return;

    const done = Math.max(0, Number(progress?.done) || 0);
    const total = Math.max(1, Number(progress?.total) || 114);
    const percent = Math.min(100, Math.round((done / total) * 100));
    const source = progress?.source === "indexeddb" ? "cache" : "api";
    const ring = this._searchProgressEl.querySelector(
      ".pq-search-progress-ring",
    );
    if (ring) ring.style.setProperty("--pq-search-progress", `${percent}%`);
    if (this._searchProgressTextEl) {
      if (!progress) {
        this._searchProgressTextEl.textContent = "Searching Quran.com...";
      } else {
        this._searchProgressTextEl.textContent =
          progress?.source === "indexeddb" || progress?.source === "memory"
            ? "Loaded from IndexedDB cache"
            : `Loading from ${source}: ${done}/${total}`;
      }
    }
  }

  async runPocketQuranSearch() {
    const query = String(this._searchInput?.value || "").trim();
    if (!query) {
      this.renderPocketQuranSearchMessage("Type a word or phrase to search.");
      return;
    }

    if (this._isSearchLoading) return;

    const translationId = this.normalizeTranslationId(
      this.storage.getSettings()?.pocketQuran?.translationResourceId,
    );
    const translationLabel =
      PocketQuranManager.TRANSLATIONS[translationId]?.label || "Translation";

    this.renderPocketQuranSearchMessage(`Searching ${translationLabel}...`);
    this.setPocketQuranSearchLoading(true);

    try {
      const search = await this.fetchPocketQuranSearchResults(
        query,
        translationId,
      );
      let source = "api";
      let totalResults = search.totalResults;
      let results = this.buildPocketQuranSearchResults(query, search.results);
      if (!totalResults) {
        this.renderPocketQuranSearchMessage(
          "Quran.com direct search had no hits. Checking cached translation...",
        );
        const fallbackResults = await this.getFallbackTranslationSearchResults(
          query,
          translationId,
        );
        results = this.buildPocketQuranSearchResults(query, fallbackResults);
        totalResults = results.length;
        source = "cache";
      }
      this.renderPocketQuranSearchResults({
        query,
        results,
        totalResults,
        source,
        translationLabel,
      });
    } catch (e) {
      console.error("Pocket Quran search failed:", e);
      this.renderPocketQuranSearchMessage(
        "Could not prepare Quran search right now. Please try again.",
      );
    } finally {
      this.setPocketQuranSearchLoading(false);
    }
  }

  renderPocketQuranSearchMessage(message) {
    if (this._searchStatusEl) this._searchStatusEl.textContent = message;
    if (this._searchResultsEl) this._searchResultsEl.innerHTML = "";
    if (this._searchPaginationEl) this._searchPaginationEl.innerHTML = "";
  }

  renderPocketQuranSearchResults({
    query,
    results,
    totalResults,
    source,
    translationLabel,
  }) {
    if (!this._searchResultsEl || !this._searchStatusEl) return;

    const count = Array.isArray(results) ? results.length : 0;
    const total = Math.max(count, Number(totalResults) || 0);
    this._searchRenderedResults = Array.isArray(results) ? results : [];
    this._searchRenderedQuery = query;
    this._searchRenderedTranslationLabel = translationLabel;
    this._searchRenderedSource = source;
    this._searchRenderedTotal = total;
    this._searchResultPage = 1;

    if (!count) {
      this._searchStatusEl.textContent = `No results in ${translationLabel}.`;
      if (this._searchPaginationEl) this._searchPaginationEl.innerHTML = "";
      this._searchResultsEl.innerHTML = "";
      const empty = document.createElement("div");
      empty.className = "pq-search-empty";
      empty.textContent = `No matches for "${query}".`;
      this._searchResultsEl.appendChild(empty);
      return;
    }

    this.renderPocketQuranSearchResultPage(1);
  }

  renderPocketQuranSearchResultPage(page = 1) {
    if (!this._searchResultsEl || !this._searchStatusEl) return;

    const perPage = 100;
    const results = this._searchRenderedResults;
    const count = results.length;
    const totalPages = Math.max(1, Math.ceil(count / perPage));
    const currentPage = this.clampNumber(page, 1, totalPages, 1);
    const start = (currentPage - 1) * perPage;
    const visibleResults = results.slice(start, start + perPage);
    const sourceText =
      this._searchRenderedSource === "api"
        ? "Quran.com search"
        : "Loaded from cache";

    this._searchResultPage = currentPage;
    this._searchStatusEl.textContent = `Showing ${start + 1}-${Math.min(
      start + visibleResults.length,
      count,
    )} of ${this._searchRenderedTotal} result${
      this._searchRenderedTotal === 1 ? "" : "s"
    } in ${this._searchRenderedTranslationLabel}. ${sourceText}.`;
    this._searchResultsEl.innerHTML = "";

    visibleResults.forEach((result) => {
      const item = document.createElement("div");
      item.className = "pq-search-result";
      item.setAttribute("role", "listitem");

      const meta = document.createElement("div");
      meta.className = "pq-search-result-meta";

      const metaText = document.createElement("span");
      metaText.className = "pq-search-result-meta-text";
      metaText.textContent = `${this.getSurahNameSimple(result.surah)} ${result.surah}:${result.ayah}`;

      const metaIcon = document.createElement("button");
      metaIcon.type = "button";
      metaIcon.className = "pq-search-result-meta-icon";
      metaIcon.setAttribute(
        "aria-label",
        `Open ${this.getSurahNameSimple(result.surah)} ${result.surah}:${result.ayah}`,
      );
      metaIcon.title = `Open ${this.getSurahNameSimple(result.surah)} ${result.surah}:${result.ayah}`;
      metaIcon.innerHTML =
        '<svg viewBox="0 0 24 24" width="14" height="14" focusable="false" aria-hidden="true"><path fill="currentColor" d="M14 3h7v7h-2V6.41l-9.29 9.3-1.42-1.42 9.3-9.29H14V3zM5 5h6v2H7v10h10v-4h2v6H5V5z"/></svg>';

      const copyButton = document.createElement("button");
      copyButton.type = "button";
      copyButton.className = "pq-search-result-copy";
      copyButton.setAttribute(
        "aria-label",
        `Copy ayah ${result.surah}:${result.ayah}`,
      );
      copyButton.title = `Copy ayah ${result.surah}:${result.ayah}`;
      copyButton.innerHTML =
        '<svg viewBox="0 0 24 24" width="14" height="14" focusable="false" aria-hidden="true"><path fill="currentColor" d="M16 1H4c-1.1 0-2 .9-2 2v12h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>';

      meta.appendChild(metaText);
      meta.appendChild(metaIcon);
      meta.appendChild(copyButton);

      const arabic = document.createElement("div");
      arabic.className = "pq-search-result-ar";
      arabic.setAttribute("dir", "rtl");
      this.appendHighlightedText(
        arabic,
        result.arabicText,
        this._searchRenderedQuery,
      );

      const translation = document.createElement("div");
      translation.className = "pq-search-result-tr";
      this.appendHighlightedText(
        translation,
        result.translationText,
        this._searchRenderedQuery,
      );

      item.appendChild(meta);
      item.appendChild(arabic);
      item.appendChild(translation);
      metaIcon.addEventListener("click", () =>
        this.goToPocketQuranSearchResult(result),
      );
      copyButton.addEventListener("click", async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const copied = await this.copyPocketQuranAyah(
          {
            text_uthmani: result.arabicText,
            translations: [{ text: result.translationText }],
          },
          result.surah,
          result.ayah,
        );
        if (copied) this.showPocketQuranCopyIndicator(copyButton);
      });
      this._searchResultsEl.appendChild(item);
    });

    this.renderPocketQuranSearchPagination(totalPages, currentPage);
  }

  renderPocketQuranSearchPagination(totalPages, currentPage) {
    if (!this._searchPaginationEl) return;
    this._searchPaginationEl.innerHTML = "";
    if (totalPages <= 1) return;

    this.renderPagination(
      this._searchPaginationEl,
      totalPages,
      currentPage,
      (page) => this.renderPocketQuranSearchResultPage(page),
    );
  }

  async goToPocketQuranSearchResult(result) {
    this.closePocketQuranSearchModal();
    await this.setActiveSurah(result.surah, {
      preserveAyah: false,
      autoScroll: false,
    });
    this.scrollToAyah(result.ayah, { persist: true, smooth: true });
  }

  appendHighlightedText(container, text, query) {
    if (!container) return;
    container.textContent = "";

    const value = String(text || "");
    const terms = String(query || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));

    if (!value || !terms.length) {
      container.textContent = value;
      return;
    }

    const regex = new RegExp(`(${terms.join("|")})`, "gi");
    let lastIndex = 0;
    value.replace(regex, (match, _term, offset) => {
      if (offset > lastIndex) {
        container.appendChild(
          document.createTextNode(value.slice(lastIndex, offset)),
        );
      }
      const mark = document.createElement("mark");
      mark.className = "pq-search-highlight";
      mark.textContent = match;
      container.appendChild(mark);
      lastIndex = offset + match.length;
      return match;
    });

    if (lastIndex < value.length) {
      container.appendChild(document.createTextNode(value.slice(lastIndex)));
    }
  }

  createBookmarkButton() {
    const headerActions = this.card?.querySelector(".card-header-actions");
    if (!headerActions) return;

    // Check if button already exists
    if (headerActions.querySelector(".pq-bookmark-btn")) return;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "pq-bookmark-btn";
    btn.innerHTML = this._getIcon("📑", { size: 18 });
    btn.title = "View bookmarked ayahs";
    btn.setAttribute("aria-label", "View bookmarked ayahs");

    btn.addEventListener("click", (e) => {
      e.preventDefault();
      this.openBookmarkModal();
    });

    // Insert before the blur menu
    const blurMenu = headerActions.querySelector(".card-blur-menu");
    if (blurMenu) {
      headerActions.insertBefore(btn, blurMenu);
    } else {
      headerActions.appendChild(btn);
    }
  }
});
