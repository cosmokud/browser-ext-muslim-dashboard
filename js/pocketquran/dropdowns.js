/**
 * PocketQuranManager: blur aware dropdown portal.
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

  getEffectiveBlurMultiplier() {
    if (this.card) {
      try {
        const inlineVal = this.card.style.getPropertyValue(
          "--ui-blur-multiplier",
        );
        if (inlineVal) {
          const n = parseFloat(String(inlineVal).trim());
          if (Number.isFinite(n) && n >= 0) return n;
        }
      } catch (e) {}
    }

    const readComputed = (el) => {
      if (!el) return null;
      try {
        const raw =
          getComputedStyle(el).getPropertyValue("--ui-blur-multiplier") || "";
        const n = parseFloat(String(raw).trim());
        if (Number.isFinite(n) && n >= 0) return n;
      } catch (e) {}
      return null;
    };

    return (
      readComputed(this.card) ?? readComputed(document.documentElement) ?? 1
    );
  }

  syncDropdownBlurMultiplier(el) {
    if (!el) return;
    const multiplier = this.getEffectiveBlurMultiplier();
    try {
      el.style.setProperty("--ui-blur-multiplier", String(multiplier));
      const sourceStyle = this.card ? getComputedStyle(this.card) : null;
      [
        "--glass-bg",
        "--glass-bg-hover",
        "--glass-bg-subtle",
        "--glass-border",
        "--glass-shadow",
      ].forEach((prop) => {
        const value = sourceStyle?.getPropertyValue(prop);
        if (value) el.style.setProperty(prop, value.trim());
      });
      if (this.card?.dataset.glassEnabled) {
        el.dataset.glassEnabled = this.card.dataset.glassEnabled;
      } else {
        delete el.dataset.glassEnabled;
      }
    } catch (e) {}
  }

  ensureDropdownPortal(el) {
    if (!el) return;
    if (this._dropdownPortalled?.has(el)) return;
    try {
      document.body.appendChild(el);
      el.classList.add("pq-portal");
      this._dropdownPortalled.add(el);
    } catch (e) {}
    this.syncDropdownBlurMultiplier(el);
  }

  positionDropdown(el) {
    if (!el || el.hidden) return;

    this.syncDropdownBlurMultiplier(el);

    let anchor = null;
    if (el === this.surahDropdown) anchor = this.surahCombobox;
    if (el === this.ayahDropdown) anchor = this.ayahCombobox;
    if (!anchor) return;

    const rect = anchor.getBoundingClientRect();
    const gap = 8;
    const viewportPadding = 10;

    const belowSpace = window.innerHeight - rect.bottom - gap - viewportPadding;
    const aboveSpace = rect.top - gap - viewportPadding;
    const preferAbove = belowSpace < 200 && aboveSpace > belowSpace;

    const left = Math.max(viewportPadding, Math.round(rect.left));
    const width = Math.max(220, Math.round(rect.width));
    const maxListHeight = Math.min(
      420,
      Math.max(180, Math.floor((preferAbove ? aboveSpace : belowSpace) - 10)),
    );

    el.style.left = `${left}px`;
    el.style.width = `${width}px`;
    el.style.right = "auto";

    if (preferAbove) {
      const bottom = Math.max(
        viewportPadding,
        Math.round(window.innerHeight - rect.top + gap),
      );
      el.style.top = "auto";
      el.style.bottom = `${bottom}px`;
    } else {
      const top = Math.max(viewportPadding, Math.round(rect.bottom + gap));
      el.style.top = `${top}px`;
      el.style.bottom = "auto";
    }

    const list = el.querySelector(".pocket-quran-dropdown-list");
    if (list) {
      list.style.maxHeight = `${maxListHeight}px`;
    }
  }

  openDropdown(el) {
    if (!el) return;
    this.ensureDropdownPortal(el);
    try {
      if (el === this.surahDropdown && this.surahCombobox)
        this.surahCombobox.classList.add("pq-open");
      if (el === this.ayahDropdown && this.ayahCombobox)
        this.ayahCombobox.classList.add("pq-open");
    } catch (e) {}
    el.hidden = false;
    this.syncDropdownBlurMultiplier(el);
    this.positionDropdown(el);
  }

  closeDropdown(el) {
    if (!el) return;
    try {
      if (el === this.surahDropdown && this.surahCombobox)
        this.surahCombobox.classList.remove("pq-open");
      if (el === this.ayahDropdown && this.ayahCombobox)
        this.ayahCombobox.classList.remove("pq-open");
    } catch (e) {}
    el.hidden = true;
  }
});
