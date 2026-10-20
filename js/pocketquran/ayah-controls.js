/**
 * PocketQuranManager: ayah and surah dropdown sync.
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

  updateAyahControls(ayahCount) {
    const max = this.clampNumber(ayahCount, 1, 286, 1);
    if (this.ayahInput && !this.ayahInput.value) {
      this.ayahInput.value = "1";
    }

    if (this.ayahListEl) {
      this.ayahListEl.innerHTML = "";
      const frag = document.createDocumentFragment();
      for (let i = 1; i <= max; i++) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "pocket-quran-ayah-option";
        btn.dataset.ayah = String(i);
        btn.textContent = String(i);
        frag.appendChild(btn);
      }
      this.ayahListEl.appendChild(frag);
    }

    this.updateAyahDropdownActiveState();
  }

  updateAyahDropdownActiveState() {
    if (!this.ayahListEl) return;
    const max = this.getActiveSurahAyahCount() || 286;
    const current = this.clampNumber(this._activeAyah, 1, max, 1);

    let activeBtn = null;
    for (const btn of this.ayahListEl.querySelectorAll(
      ".pocket-quran-ayah-option",
    )) {
      const n = parseInt(btn.dataset.ayah, 10);
      const isActive = n === current;
      btn.classList.toggle("active", isActive);
      btn.setAttribute("aria-selected", isActive ? "true" : "false");
      if (isActive) {
        activeBtn = btn;
      }
    }

    // Scroll the dropdown list to show the active ayah at the top
    if (activeBtn && !this.ayahDropdown?.hidden) {
      this.scrollAyahDropdownToActive(activeBtn);
    }
  }

  scrollAyahDropdownToActive(activeBtn) {
    if (!activeBtn || !this.ayahListEl) return;

    // Get the scroll container (the dropdown list itself)
    const scrollContainer = this.ayahListEl;

    // Calculate the offset of the active button relative to the scroll container
    const btnOffsetTop = activeBtn.offsetTop;

    // Scroll so the active ayah is at the top of the visible area
    // Use a small offset (e.g., 4px) for visual padding
    const targetScrollTop = Math.max(0, btnOffsetTop - 4);

    scrollContainer.scrollTop = targetScrollTop;
  }

  scrollSurahDropdownToActive() {
    if (!this.surahListEl) return;

    // Find the active surah button
    const activeBtn = this.surahListEl.querySelector(
      `.pocket-quran-surah-item[data-surah="${this._activeSurah}"]`,
    );
    if (!activeBtn) return;

    // Get the scroll container (the dropdown list itself)
    const scrollContainer = this.surahListEl;

    // Calculate the offset of the active button relative to the scroll container
    const btnOffsetTop = activeBtn.offsetTop;

    // Scroll so the active surah is at the top of the visible area
    // Use a small offset (e.g., 4px) for visual padding
    const targetScrollTop = Math.max(0, btnOffsetTop - 4);

    scrollContainer.scrollTop = targetScrollTop;
  }

  getActiveSurahAyahCount() {
    return this.getSurahAyahCount(this._activeSurah);
  }

  getSurahAyahCount(surah) {
    const surahNumber = this.clampNumber(surah, 1, 114, null);
    const chapter = this._chapters.find((c) => c.id === surahNumber);
    const count = chapter?.verses_count;
    return Number.isFinite(count) ? count : null;
  }
});
