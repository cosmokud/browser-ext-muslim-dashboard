/**
 * StickyNotesManager: colour maths, presets and glass lookup.
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

  adjustAlpha(rgba, alpha) {
    const match = rgba.match(
      /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/,
    );
    if (match) {
      const [, r, g, b] = match;
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    return rgba;
  }

  clampNumber(value, min, max, fallback) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    return Math.min(max, Math.max(min, numeric));
  }

  normalizeHexColor(value, fallback = "#ff7eb9") {
    const normalize = (input) => {
      if (typeof input !== "string") return null;
      const match = input.trim().match(/^#([\da-f]{3}|[\da-f]{6})$/i);
      if (!match) return null;

      let raw = match[1].toLowerCase();
      if (raw.length === 3) {
        raw = raw
          .split("")
          .map((ch) => ch + ch)
          .join("");
      }
      return `#${raw}`;
    };

    return normalize(value) || normalize(fallback) || "#ff7eb9";
  }

  extractHexFromColorString(value) {
    if (typeof value !== "string") return null;
    const raw = value.trim();

    const hexMatch = raw.match(/^#([\da-f]{3}|[\da-f]{6})$/i);
    if (hexMatch) {
      return this.normalizeHexColor(raw);
    }

    const rgbMatch = raw.match(
      /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*([\d.]+))?\s*\)$/i,
    );
    if (!rgbMatch) return null;

    const toHex = (num) =>
      this.clampNumber(Number(num), 0, 255, 0).toString(16).padStart(2, "0");

    return `#${toHex(rgbMatch[1])}${toHex(rgbMatch[2])}${toHex(rgbMatch[3])}`;
  }

  hexToRgb(hex) {
    const normalized = this.normalizeHexColor(hex);
    const raw = normalized.slice(1);
    return {
      r: parseInt(raw.slice(0, 2), 16),
      g: parseInt(raw.slice(2, 4), 16),
      b: parseInt(raw.slice(4, 6), 16),
    };
  }

  getReadableTextColorForHex(hex) {
    const { r, g, b } = this.hexToRgb(hex);
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 150 ? "#1f1f1f" : "#ffffff";
  }

  getNoteCustomColorHex(note) {
    const customPreset = this.colorPresets.find((preset) => preset?.custom);
    const fallbackHex = this.normalizeHexColor(customPreset?.defaultHex);

    if (note?.color?.customHex) {
      return this.normalizeHexColor(note.color.customHex, fallbackHex);
    }

    const derivedHex = this.extractHexFromColorString(note?.color?.bg);
    if (derivedHex) {
      return this.normalizeHexColor(derivedHex, fallbackHex);
    }

    return fallbackHex;
  }

  buildCustomColorPreset(hex) {
    const normalizedHex = this.normalizeHexColor(hex);
    const { r, g, b } = this.hexToRgb(normalizedHex);
    return {
      name: "Custom",
      bg: `rgba(${r}, ${g}, ${b}, 0.95)`,
      text: this.getReadableTextColorForHex(normalizedHex),
      custom: true,
      customHex: normalizedHex,
    };
  }

  clearCustomColorSaveTimer(noteId) {
    const id = String(noteId || "").trim();
    if (!id) return;

    const timer = this.customColorSaveTimers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.customColorSaveTimers.delete(id);
    }
  }

  scheduleCustomColorSave(noteId) {
    const id = String(noteId || "").trim();
    if (!id) return;

    this.clearCustomColorSaveTimer(id);
    const timer = setTimeout(() => {
      this.customColorSaveTimers.delete(id);
      this.saveNotes();
    }, this.customColorSaveDelayMs);

    this.customColorSaveTimers.set(id, timer);
  }

  clearCustomColorPreviewState(noteId) {
    const id = String(noteId || "").trim();
    if (!id) return;

    const previewTimer = this.customColorPreviewTimers.get(id);
    if (previewTimer) {
      clearTimeout(previewTimer);
      this.customColorPreviewTimers.delete(id);
    }

    this.customColorPreviewLatestHex.delete(id);
    this.clearCustomColorSaveTimer(id);
  }

  queueCustomColorPreview(noteId, hex) {
    const id = String(noteId || "").trim();
    if (!id) return;

    this.customColorPreviewLatestHex.set(id, this.normalizeHexColor(hex));

    if (this.customColorPreviewTimers.has(id)) return;

    const timer = setTimeout(() => {
      this.customColorPreviewTimers.delete(id);

      const latestHex = this.customColorPreviewLatestHex.get(id);
      this.customColorPreviewLatestHex.delete(id);

      this.updateNoteColor(id, this.buildCustomColorPreset(latestHex), {
        save: false,
      });
      this.scheduleCustomColorSave(id);
    }, this.customColorPreviewDelayMs);

    this.customColorPreviewTimers.set(id, timer);
  }

  flushCustomColorPreview(noteId, { save = true, hex = null } = {}) {
    const id = String(noteId || "").trim();
    if (!id) return;

    const previewTimer = this.customColorPreviewTimers.get(id);
    if (previewTimer) {
      clearTimeout(previewTimer);
      this.customColorPreviewTimers.delete(id);
    }

    if (hex !== null && hex !== undefined) {
      this.customColorPreviewLatestHex.set(id, this.normalizeHexColor(hex));
    }

    const note = this.notes.find((n) => String(n.id) === id);
    const resolvedHex = this.normalizeHexColor(
      this.customColorPreviewLatestHex.get(id) ||
        this.getNoteCustomColorHex(note),
    );
    this.customColorPreviewLatestHex.delete(id);
    this.clearCustomColorSaveTimer(id);

    this.updateNoteColor(id, this.buildCustomColorPreset(resolvedHex), {
      save,
    });

    if (!save) {
      this.scheduleCustomColorSave(id);
    }
  }

  getDashboardGlassEnabled() {
    try {
      const themes = window.dashboard?.themes;
      if (themes && typeof themes.isGlassEnabled === "function") {
        return themes.isGlassEnabled();
      }

      const settings = this.storage?.getSettings?.();
      return settings?.theme?.glassEnabled !== false;
    } catch (e) {
      return true;
    }
  }

  getDashboardBlurPower() {
    try {
      const settings = this.storage?.getSettings?.();
      return SettingsRegistry.coerce("uiBlurPower", settings?.uiBlurPower);
    } catch (e) {
      return SettingsRegistry.defaultOf("uiBlurPower");
    }
  }

  getDashboardGlassOpacity() {
    try {
      const themes = window.dashboard?.themes;
      if (themes && typeof themes.getGlassOpacity === "function") {
        return this.clampNumber(themes.getGlassOpacity(), 0, 100, 35);
      }

      const settings = this.storage?.getSettings?.();
      return SettingsRegistry.coerce("glassOpacity", settings?.theme?.glassOpacity, 35);
    } catch (e) {
      return 35;
    }
  }

  getDashboardComponentOpacity() {
    try {
      const themes = window.dashboard?.themes;
      if (themes && typeof themes.getMainGridComponentOpacity === "function") {
        return this.clampNumber(
          themes.getMainGridComponentOpacity(),
          0,
          100,
          0,
        );
      }

      const settings = this.storage?.getSettings?.();
      return SettingsRegistry.coerce("componentOpacity", settings?.theme?.componentOpacity, 0);
    } catch (e) {
      return 0;
    }
  }

  getColorPresetSwatchBackground(color, note = null) {
    if (color?.custom) {
      if (note?.color?.custom === true && note?.color?.bg) {
        return note.color.bg;
      }
      return color?.bg;
    }

    if (!color?.glass) {
      return color?.bg;
    }

    let bg = color.bg;

    if (typeof bg === "string" && bg.trim().startsWith("var(")) {
      const match = bg.match(/var\((--[^)]+)\)/);
      if (match) {
        try {
          const computed = getComputedStyle(document.documentElement)
            .getPropertyValue(match[1])
            .trim();
          if (computed) bg = computed;
        } catch (e) {
          // Keep the original swatch background if computed-style lookup fails.
        }
      }
    }

    if (!this.getDashboardGlassEnabled()) {
      return bg;
    }

    const componentOpacity = this.clampNumber(
      this.getDashboardComponentOpacity(),
      0,
      100,
      0,
    );
    const adjusted = this.adjustAlpha(bg, componentOpacity / 100);
    return adjusted || bg;
  }

  refreshDefaultColorPresetSwatches(noteId = null) {
    const defaultPresetIndex = this.colorPresets.findIndex(
      (preset) => preset?.glass === true,
    );
    if (defaultPresetIndex < 0) return;

    const defaultPreset = this.colorPresets[defaultPresetIndex];
    const background = this.getColorPresetSwatchBackground(defaultPreset);
    const selector = noteId
      ? `#sticky-note-${noteId} .color-preset[data-color-index="${defaultPresetIndex}"]`
      : `.sticky-note .color-preset[data-color-index="${defaultPresetIndex}"]`;

    document.querySelectorAll(selector).forEach((btn) => {
      btn.style.background = background;
    });
  }

  getThemedIcon(emoji, size = 16) {
    if (window.dashboard?.iconThemes) {
      return window.dashboard.iconThemes.getIcon(emoji, { size });
    }
    return emoji;
  }
});
