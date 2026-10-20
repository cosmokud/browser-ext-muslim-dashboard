/**
 * HadithManager: dashboard card rendering and navigation.
 * Part of the class declared in js/hadith/index.js; load this after it.
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
})(HadithManager.prototype, class {

  cancelDashboardAnimation() {
    if (this._dashboardMidTimer) {
      clearTimeout(this._dashboardMidTimer);
      this._dashboardMidTimer = null;
    }
    if (this._dashboardEndTimer) {
      clearTimeout(this._dashboardEndTimer);
      this._dashboardEndTimer = null;
    }
    this._dashboardAnimating = false;
  }

  animateDashboardSwap(direction) {
    if (!this.shellEl) return;

    this.cancelDashboardAnimation();

    this._dashboardAnimating = true;
    const cls = direction === "prev" ? "hadith-anim-prev" : "hadith-anim-next";

    this.shellEl.classList.remove("hadith-anim-next", "hadith-anim-prev");
    this.shellEl.classList.add(cls);

    this._dashboardEndTimer = setTimeout(() => {
      this._dashboardAnimating = false;
      if (!this.shellEl) return;
      this.shellEl.classList.remove("hadith-anim-next", "hadith-anim-prev");
    }, HadithManager.NAV_ANIM_MS + 30);
  }

  renderJumpControls(total) {
    const totalSafe = Math.max(0, parseInt(total, 10) || 0);
    const currentOneBased = totalSafe ? this.currentCardIndex + 1 : 0;

    if (this.jumpLabelEl) {
      this.jumpLabelEl.textContent = `${currentOneBased} / ${totalSafe}`;
    }

    if (this.jumpSliderEl) {
      this.jumpSliderEl.min = "1";
      this.jumpSliderEl.max = String(Math.max(1, totalSafe || 1));
      this.jumpSliderEl.value = String(Math.max(1, currentOneBased || 1));
      this.jumpSliderEl.disabled = totalSafe <= 1;

      const min = parseInt(this.jumpSliderEl.min, 10);
      const max = parseInt(this.jumpSliderEl.max, 10);
      const value = parseInt(this.jumpSliderEl.value, 10);

      const safeMin = Number.isFinite(min) ? min : 1;
      const safeMax = Number.isFinite(max) ? max : safeMin + 1;
      const safeValue = Number.isFinite(value) ? value : safeMin;

      const range = Math.max(1, safeMax - safeMin);
      const progress = ((safeValue - safeMin) / range) * 100;
      const clampedProgress = Math.max(0, Math.min(100, progress));

      this.jumpSliderEl.style.setProperty(
        "--jump-progress",
        `${clampedProgress}%`,
      );
    }

    if (this.jumpInputEl) {
      this.jumpInputEl.min = "1";
      this.jumpInputEl.max = String(Math.max(1, totalSafe || 1));
      this.jumpInputEl.value = String(Math.max(1, currentOneBased || 1));
      this.jumpInputEl.disabled = totalSafe <= 1;
    }
  }

  renderDashboard({ animateDirection = null } = {}) {
    const activeSet = this.getActiveSet();
    const items = activeSet?.cards || [];

    this.normalizeCurrentIndex();

    const item = items[this.currentCardIndex] || null;

    if (this.titleEl) {
      this.titleEl.textContent = item ? this.getCardTitle(item) : "Loading...";
      this.applyTextLanguageStyling(this.titleEl, this.titleEl.textContent);
    }

    if (this.textEl) {
      this.textEl.textContent = item ? this.getCardText(item) : "";
      this.applyTextLanguageStyling(this.textEl, this.textEl.textContent);
    }

    const narrator = item?.narrator ? String(item.narrator) : "";
    const reference = item?.reference ? String(item.reference) : "";

    if (this.metaEl) {
      const metaText =
        narrator || reference ? `Narrated by: ${narrator} - ${reference}` : "";
      this.metaEl.textContent = metaText;
      this.applyTextLanguageStyling(this.metaEl, metaText);
      this.metaEl.toggleAttribute("hidden", !metaText);
    }

    if (this.metaDividerEl) {
      const showDivider = !!(narrator || reference);
      this.metaDividerEl.toggleAttribute("hidden", !showDivider);
    }

    this.updateLanguageSelectorButton();
    this.updateHeaderText();
    this.renderJumpControls(items.length);

    if (animateDirection) {
      this.animateDashboardSwap(animateDirection);
    }
  }

  updateHeaderText() {
    const headerText = document.getElementById("hadithHeaderText");
    if (!headerText) return;

    const active = this.getActiveSet();
    headerText.textContent = active?.name || "Hadith";
  }

  gotoNextCard() {
    const activeSet = this.getActiveSet();
    const items = activeSet?.cards || [];
    if (!items.length) return;

    const next = (this.currentCardIndex + 1) % items.length;
    this.setCurrentCardIndex(next, { cancelAnimation: false });
    this.animateDashboardSwap("next");
  }

  gotoPrevCard() {
    const activeSet = this.getActiveSet();
    const items = activeSet?.cards || [];
    if (!items.length) return;

    const prev = (this.currentCardIndex - 1 + items.length) % items.length;
    this.setCurrentCardIndex(prev, { cancelAnimation: false });
    this.animateDashboardSwap("prev");
  }

  bindDashboardEvents() {
    if (this.prevBtn && !this.prevBtn.dataset.bound) {
      this.prevBtn.dataset.bound = "true";
      this.prevBtn.addEventListener("click", () => this.gotoPrevCard());
    }

    if (this.nextBtn && !this.nextBtn.dataset.bound) {
      this.nextBtn.dataset.bound = "true";
      this.nextBtn.addEventListener("click", () => this.gotoNextCard());
    }

    if (
      this.fontScaleDecreaseBtn &&
      this.fontScaleDecreaseBtn.dataset.bound !== "true"
    ) {
      this.fontScaleDecreaseBtn.dataset.bound = "true";
      this.fontScaleDecreaseBtn.addEventListener("click", () => {
        this.adjustFontScale(-HadithManager.FONT_SCALE_STEP);
      });
    }

    if (
      this.fontScaleIncreaseBtn &&
      this.fontScaleIncreaseBtn.dataset.bound !== "true"
    ) {
      this.fontScaleIncreaseBtn.dataset.bound = "true";
      this.fontScaleIncreaseBtn.addEventListener("click", () => {
        this.adjustFontScale(HadithManager.FONT_SCALE_STEP);
      });
    }

    const headerText = document.getElementById("hadithHeaderText");
    if (headerText && headerText.dataset.bound !== "true") {
      headerText.dataset.bound = "true";
      headerText.addEventListener("click", () => this.openSetSelectorModal());
      headerText.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          this.openSetSelectorModal();
        }
      });
    }

    // Jump slider and input
    if (this.jumpSliderEl && this.jumpSliderEl.dataset.bound !== "true") {
      this.jumpSliderEl.dataset.bound = "true";
      this.jumpSliderEl.addEventListener("input", (e) => {
        const v = parseInt(e.target.value, 10);
        if (!Number.isFinite(v)) return;
        this.setCurrentCardIndex(v - 1);
      });
    }

    if (this.jumpInputEl && this.jumpInputEl.dataset.bound !== "true") {
      this.jumpInputEl.dataset.bound = "true";
      this.jumpInputEl.addEventListener("change", (e) => {
        const v = parseInt(e.target.value, 10);
        if (!Number.isFinite(v)) return;
        this.setCurrentCardIndex(v - 1);
      });
      this.jumpInputEl.addEventListener("keydown", (e) => {
        if (e.key !== "Enter") return;
        const v = parseInt(e.target.value, 10);
        if (!Number.isFinite(v)) return;
        this.setCurrentCardIndex(v - 1);
      });
    }

    if (
      this.autoAdvanceToggleBtn &&
      this.autoAdvanceToggleBtn.dataset.bound !== "true"
    ) {
      this.autoAdvanceToggleBtn.dataset.bound = "true";
      this.autoAdvanceToggleBtn.addEventListener("click", () =>
        this.toggleAutoAdvancePaused(),
      );
    }

    if (this.cardEl && this.cardEl.dataset.autoAdvanceHoverBound !== "true") {
      this.cardEl.dataset.autoAdvanceHoverBound = "true";

      this.cardEl.addEventListener("mouseenter", () => {
        this._hoverPauseAutoAdvance = true;
        this.clearAutoAdvanceTimer();
      });

      this.cardEl.addEventListener("mouseleave", () => {
        this._hoverPauseAutoAdvance = false;
        this.ensureAutoAdvanceState({ reset: true });
      });
    }
  }
});
