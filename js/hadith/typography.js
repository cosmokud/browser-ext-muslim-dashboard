/**
 * HadithManager: card font and scale.
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

  getTypography() {
    const settings = this.getHadithSettings();

    const title = this.clampNumber(
      parseInt(settings.titleFontSize, 10),
      12,
      144,
      22,
    );

    const text = this.clampNumber(
      parseInt(settings.textFontSize, 10),
      12,
      144,
      18,
    );

    const meta = this.clampNumber(
      parseInt(settings.metaFontSize, 10),
      10,
      96,
      14,
    );

    return { title, text, meta };
  }

  setTypography({ title, text, meta }) {
    const next = this.getHadithSettings();

    if (title !== undefined)
      next.titleFontSize = this.clampNumber(parseInt(title, 10), 12, 144, 22);
    if (text !== undefined)
      next.textFontSize = this.clampNumber(parseInt(text, 10), 12, 144, 18);
    if (meta !== undefined)
      next.metaFontSize = this.clampNumber(parseInt(meta, 10), 10, 96, 14);

    this.setHadithSettings(next);
    this.applyTypography();
  }

  applyTypography() {
    if (!this.cardEl) return;
    const t = this.getTypography();
    const scale = this.getFontScale();
    const title = this.scaleTypographyValue(t.title, scale);
    const text = this.scaleTypographyValue(t.text, scale);
    const meta = this.scaleTypographyValue(t.meta, scale);
    this.cardEl.style.setProperty("--hadith-title-font-size", `${title}px`);
    this.cardEl.style.setProperty("--hadith-text-font-size", `${text}px`);
    this.cardEl.style.setProperty("--hadith-meta-font-size", `${meta}px`);
    this.updateFontScaleButtons();
  }

  normalizeArabicFontFamily(value) {
    const v = String(value || "").trim();
    if (HadithManager.ARABIC_FONT_FAMILIES.includes(v)) return v;
    return "Noto Naskh Arabic";
  }

  normalizeTranslationFontFamily(value) {
    const v = String(value || "").trim();
    if (HadithManager.TRANSLATION_FONT_FAMILIES.includes(v)) return v;
    return "Poppins";
  }

  resolveTranslationFontCssValue(fontFamily) {
    if (fontFamily === "Georgia") return '"Georgia", serif';
    if (fontFamily === "Courier New") return '"Courier New", monospace';
    if (fontFamily === "Cascadia Code") {
      return '"Cascadia Code", "JetBrains Mono", Consolas, monospace';
    }
    return `"${fontFamily}", var(--font-primary)`;
  }

  applyArabicFontFamily(fontFamily, opts = {}) {
    const { persist = false } = opts;
    const normalized = this.normalizeArabicFontFamily(fontFamily);
    this._arabicFontFamily = normalized;

    if (this.cardEl) {
      this.cardEl.style.setProperty(
        "--hadith-arabic-font-family",
        `"${normalized}", var(--font-arabic)`,
      );
    }

    if (persist) {
      this.setHadithSettings({ arabicFontFamily: normalized });
    }
  }

  applyTranslationFontFamily(fontFamily, opts = {}) {
    const { persist = false } = opts;
    const normalized = this.normalizeTranslationFontFamily(fontFamily);
    this._translationFontFamily = normalized;

    if (this.cardEl) {
      this.cardEl.style.setProperty(
        "--hadith-translation-font-family",
        this.resolveTranslationFontCssValue(normalized),
      );
    }

    if (persist) {
      this.setHadithSettings({ translationFontFamily: normalized });
    }
  }

  containsArabicText(value) {
    return /[\u0600-\u06ff\u0750-\u077f\u08a0-\u08ff]/.test(
      String(value || ""),
    );
  }

  applyTextLanguageStyling(element, textValue) {
    if (!element) return;
    element.classList.toggle("arabic-text", this.containsArabicText(textValue));
  }

  getFontScale() {
    const settings = this.getHadithSettings();
    const raw = settings.fontScale;
    const parsed = parseFloat(raw);
    const scale = Number.isFinite(parsed) ? parsed : 1;
    return this.clampNumber(
      scale,
      HadithManager.FONT_SCALE_MIN,
      HadithManager.FONT_SCALE_MAX,
      1,
    );
  }

  normalizeScale(scale) {
    if (!Number.isFinite(scale)) return 1;
    return Math.round(scale * 10) / 10;
  }

  scaleTypographyValue(value, scale) {
    const scaled = value * scale;
    return Math.round(scaled * 10) / 10;
  }

  setFontScale(scale) {
    const normalized = this.clampNumber(
      this.normalizeScale(parseFloat(scale)),
      HadithManager.FONT_SCALE_MIN,
      HadithManager.FONT_SCALE_MAX,
      1,
    );
    this.setHadithSettings({ fontScale: normalized });
    this.applyTypography();
  }

  adjustFontScale(delta) {
    const next = this.getFontScale() + delta;
    this.setFontScale(next);
  }

  updateFontScaleButtons() {
    const scale = this.getFontScale();
    const label = `${scale.toFixed(1)}x`;

    if (this.fontScaleDecreaseBtn) {
      this.fontScaleDecreaseBtn.disabled =
        scale <= HadithManager.FONT_SCALE_MIN + 0.001;
      this.fontScaleDecreaseBtn.title = `Decrease font size (${label})`;
      this.fontScaleDecreaseBtn.setAttribute(
        "aria-label",
        `Decrease hadith font size (${label})`,
      );
    }

    if (this.fontScaleIncreaseBtn) {
      this.fontScaleIncreaseBtn.disabled =
        scale >= HadithManager.FONT_SCALE_MAX - 0.001;
      this.fontScaleIncreaseBtn.title = `Increase font size (${label})`;
      this.fontScaleIncreaseBtn.setAttribute(
        "aria-label",
        `Increase hadith font size (${label})`,
      );
    }
  }

  updateTypographyLabels(title, text, meta) {
    if (this.settingsTitleFontSizeValue)
      this.settingsTitleFontSizeValue.textContent = `${title}px`;
    if (this.settingsTextFontSizeValue)
      this.settingsTextFontSizeValue.textContent = `${text}px`;
    if (this.settingsMetaFontSizeValue)
      this.settingsMetaFontSizeValue.textContent = `${meta}px`;
  }
});
