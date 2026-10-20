/**
 * StickyNotesManager: per-note blur popup.
 * Part of the class declared in js/stickynotes/index.js; load this after it.
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
})(StickyNotesManager.prototype, class {

  normalizeNoteBlurSettings(note) {
    if (!note || typeof note !== "object") return null;

    const isLegacyDefaultGlassState =
      note.color?.glass === true &&
      note.blurState === "on" &&
      SettingsRegistry.coerce("blurPower", note.blurPower, 100) === 200 &&
      SettingsRegistry.coerce("glassOpacity", note.glassOpacity, 100) === 100;
    if (isLegacyDefaultGlassState) {
      note.blurState = "dashboard";
    }

    const validStates = new Set(["off", "dashboard", "on"]);
    if (!validStates.has(note.blurState)) {
      note.blurState =
        note.color?.glass === true
          ? "dashboard"
          : note.glassEffect === false
            ? "off"
            : "on";
    }

    const legacyBlurPower = Math.round(
      (this.clampNumber(note.blur, 0, 20, 10) / 20) * 200,
    );
    note.blurPower = SettingsRegistry.coerce(
      "blurPower",
      note.blurPower,
      legacyBlurPower,
    );
    note.blurPowerEnabled = note.blurState === "on";

    note.glassOpacity = this.clampNumber(
      note.glassOpacity,
      0,
      100,
      Math.round(this.clampNumber(note.transparency, 0, 1, 1) * 100),
    );

    return note;
  }

  applyNoteBlurState(noteId, { save = true } = {}) {
    const id = String(noteId || "").trim();
    if (!id) return;

    const note = this.notes.find((n) => String(n.id) === id);
    if (!note) return;

    this.normalizeNoteBlurSettings(note);

    const state = note.blurState;
    const dashboardGlassEnabled = this.getDashboardGlassEnabled();
    const dashboardBlurPower = this.getDashboardBlurPower();
    const dashboardGlassOpacity = this.getDashboardGlassOpacity();
    const dashboardComponentOpacity = this.getDashboardComponentOpacity();

    let effectiveGlass = false;
    if (state === "on") {
      effectiveGlass = true;
    } else if (state === "dashboard") {
      effectiveGlass = dashboardGlassEnabled;
    }

    const effectiveBlurPower = !effectiveGlass
      ? 0
      : state === "on"
        ? note.blurPower
        : dashboardBlurPower;

    const dashboardLinkedOpacity = note.color?.glass
      ? dashboardComponentOpacity
      : dashboardGlassOpacity;
    const effectiveOpacity =
      state === "on" ? note.glassOpacity : dashboardLinkedOpacity;

    // Keep legacy fields in sync so existing rendering logic remains intact.
    note.glassEffect = effectiveGlass;
    note.blur = effectiveGlass
      ? this.clampNumber(Math.round((effectiveBlurPower / 200) * 20), 0, 20, 10)
      : 0;
    note.transparency = effectiveGlass
      ? this.clampNumber(effectiveOpacity / 100, 0, 1, 1)
      : this.clampNumber(note.transparency, 0.2, 1, 1);

    this.refreshNoteStyles(id);
    this.refreshDefaultColorPresetSwatches(id);
    if (save) this.saveNotes();
  }

  ensureNoteBlurPopupPortal(menu, popup) {
    if (!menu || !popup) return;
    if (this.noteBlurPopupPortalled.has(popup)) return;

    try {
      document.body.appendChild(popup);
      popup.classList.add("blur-popup-portal");
      this.noteBlurPopupPortalled.add(popup);
    } catch (e) {}
  }

  positionNoteBlurPopup(menu, popup) {
    if (!menu || !popup || !popup.classList.contains("blur-popup-open")) {
      return;
    }

    const anchorRect = menu.getBoundingClientRect();
    const viewportPadding = 10;
    const gap = 10;

    const popupWidth = Math.max(220, Math.round(popup.offsetWidth || 280));
    const popupHeight = Math.max(200, Math.round(popup.offsetHeight || 320));

    let left = Math.round(anchorRect.right - popupWidth);
    left = Math.max(
      viewportPadding,
      Math.min(left, window.innerWidth - viewportPadding - popupWidth),
    );

    const belowTop = Math.round(anchorRect.bottom + gap);
    const aboveTop = Math.round(anchorRect.top - gap - popupHeight);
    const canFitBelow =
      belowTop + popupHeight <= window.innerHeight - viewportPadding;
    const canFitAbove = aboveTop >= viewportPadding;

    let top = belowTop;
    if (!canFitBelow && canFitAbove) {
      top = aboveTop;
    } else if (!canFitBelow && !canFitAbove) {
      top = Math.max(
        viewportPadding,
        Math.min(top, window.innerHeight - viewportPadding - popupHeight),
      );
    }

    popup.style.left = `${left}px`;
    popup.style.top = `${top}px`;
    popup.style.right = "auto";
    popup.style.bottom = "auto";
  }

  repositionOpenNoteBlurPopups() {
    if (this.noteBlurPopupPositionRaf) return;

    this.noteBlurPopupPositionRaf = requestAnimationFrame(() => {
      this.noteBlurPopupPositionRaf = null;

      const openMenus = document.querySelectorAll(
        ".sticky-note-blur-menu.blur-menu-open",
      );
      if (!openMenus.length) return;

      openMenus.forEach((menu) => {
        const noteId = String(menu.dataset.noteId || "").trim();
        if (!noteId) return;
        const popup = this.noteBlurPopupByNoteId.get(noteId);
        if (!popup) return;
        this.positionNoteBlurPopup(menu, popup);
      });
    });
  }

  closeAllNoteBlurMenus() {
    if (this.noteBlurPopupPositionRaf) {
      cancelAnimationFrame(this.noteBlurPopupPositionRaf);
      this.noteBlurPopupPositionRaf = null;
    }

    document
      .querySelectorAll(".sticky-note-blur-menu.blur-menu-open")
      .forEach((menu) => {
        menu.classList.remove("blur-menu-open");
        menu.closest(".sticky-note")?.classList.remove("card-blur-popup-open");

        const noteId = String(menu.dataset.noteId || "").trim();
        if (!noteId) return;
        const popup = this.noteBlurPopupByNoteId.get(noteId);
        popup?.classList.remove("blur-popup-open");
      });

    document
      .querySelectorAll(".sticky-note-blur-popup.blur-popup-open")
      .forEach((popup) => {
        popup.classList.remove("blur-popup-open");
      });
  }

  setupStickyNoteBlurMenu(noteEl, note, dropdown) {
    const menu = dropdown.querySelector(".sticky-note-blur-menu");
    const btn = menu?.querySelector(".card-blur-btn");
    const popup = menu?.querySelector(".blur-settings-popup");
    const closeBtn = popup?.querySelector(".blur-popup-close");
    const glassOptions = popup?.querySelectorAll(".blur-glass-option");
    const sliderWrap = popup?.querySelector(".blur-power-slider-wrap");
    const slider = popup?.querySelector(".blur-power-slider");
    const valueDisplay = popup?.querySelector(".blur-power-value");

    if (!menu || !btn || !popup) return;

    this.normalizeNoteBlurSettings(note);

    let opacityWrap = popup.querySelector(".blur-opacity-slider-wrap");
    if (!opacityWrap) {
      const section = document.createElement("div");
      section.className = "blur-setting-section blur-opacity-section";
      section.innerHTML = `
        <span class="blur-setting-label">Opacity</span>
        <div class="blur-power-slider-wrap blur-opacity-slider-wrap disabled">
          <input
            type="range"
            class="blur-power-slider blur-opacity-slider"
            min="0"
            max="100"
            value="${SettingsRegistry.coerce("glassOpacity", note.glassOpacity, 100)}"
            aria-label="Glass opacity"
          />
          <span class="blur-power-value blur-opacity-value">${this.clampNumber(
            note.glassOpacity,
            0,
            100,
            100,
          )}%</span>
        </div>
      `;
      popup.appendChild(section);
      opacityWrap = section.querySelector(".blur-opacity-slider-wrap");
    }

    const opacitySlider = popup.querySelector(".blur-opacity-slider");
    const opacityValueDisplay = popup.querySelector(".blur-opacity-value");

    const noteId = String(note.id);
    this.noteBlurPopupByNoteId.set(noteId, popup);
    this.ensureNoteBlurPopupPortal(menu, popup);

    const syncUI = () => {
      this.normalizeNoteBlurSettings(note);

      const isGlassOff = note.blurState === "off";
      const isDashboardState = note.blurState === "dashboard";

      glassOptions?.forEach((opt) => {
        const val = String(opt.dataset.glassValue || "");
        opt.classList.toggle("active", val === note.blurState);
      });

      const effectiveBlurPower = isDashboardState
        ? this.getDashboardBlurPower()
        : note.blurPower;
      if (sliderWrap) {
        sliderWrap.classList.toggle("disabled", isGlassOff || isDashboardState);
      }
      if (slider) {
        slider.value = String(effectiveBlurPower);
        slider.disabled = isGlassOff || isDashboardState;
      }
      if (valueDisplay) {
        valueDisplay.textContent = `${effectiveBlurPower}%`;
      }

      const effectiveOpacity = isDashboardState
        ? this.getDashboardGlassOpacity()
        : note.glassOpacity;
      if (opacityWrap) {
        opacityWrap.classList.toggle(
          "disabled",
          isGlassOff || isDashboardState,
        );
      }
      if (opacitySlider) {
        opacitySlider.value = String(effectiveOpacity);
        opacitySlider.disabled = isGlassOff || isDashboardState;
      }
      if (opacityValueDisplay) {
        opacityValueDisplay.textContent = `${effectiveOpacity}%`;
      }

      if (note.blurState === "off") {
        btn.innerHTML = this.getThemedIcon("⬜", 16);
      } else if (note.blurState === "on") {
        btn.innerHTML = this.getThemedIcon("✨", 16);
      } else {
        btn.innerHTML = this.getThemedIcon("🔗", 16);
      }
    };

    // Apply initial normalized state and sync controls.
    this.applyNoteBlurState(noteId, { save: false });
    syncUI();

    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();

      const isOpen = menu.classList.contains("blur-menu-open");
      this.closeAllNoteBlurMenus();

      if (!isOpen) {
        menu.classList.add("blur-menu-open");
        noteEl.classList.add("card-blur-popup-open");
        popup.classList.add("blur-popup-open");
        this.ensureNoteBlurPopupPortal(menu, popup);
        this.positionNoteBlurPopup(menu, popup);
      }
    });

    closeBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      menu.classList.remove("blur-menu-open");
      noteEl.classList.remove("card-blur-popup-open");
      popup.classList.remove("blur-popup-open");
    });

    popup.addEventListener("click", (e) => {
      e.stopPropagation();
    });

    glassOptions?.forEach((opt) => {
      opt.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();

        const newState = String(opt.dataset.glassValue || "dashboard");
        note.blurState = ["off", "dashboard", "on"].includes(newState)
          ? newState
          : "dashboard";
        note.blurPowerEnabled = note.blurState === "on";

        this.applyNoteBlurState(noteId, { save: true });
        syncUI();
      });
    });

    slider?.addEventListener("input", (e) => {
      note.blurPower = this.clampNumber(
        parseInt(e.target.value, 10),
        0,
        200,
        100,
      );

      if (valueDisplay) {
        valueDisplay.textContent = `${note.blurPower}%`;
      }

      if (note.blurState === "on") {
        this.applyNoteBlurState(noteId, { save: true });
      }
    });

    opacitySlider?.addEventListener("input", (e) => {
      note.glassOpacity = this.clampNumber(
        parseInt(e.target.value, 10),
        0,
        100,
        100,
      );

      if (opacityValueDisplay) {
        opacityValueDisplay.textContent = `${note.glassOpacity}%`;
      }

      if (note.blurState === "on") {
        this.applyNoteBlurState(noteId, { save: true });
      }
    });
  }
});
