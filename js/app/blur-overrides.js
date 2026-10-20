/**
 * MuslimDashboard: per component readability blur.
 * Part of the class declared in js/app/index.js; load this after it.
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
})(MuslimDashboard.prototype, class {

  initReadabilityBlurOverrides() {
    /**
     * Enhanced blur settings popup for individual cards.
     * Features:
     * - Triple toggle for glass effect: OFF / DASH (follow dashboard) / ON
     *   - OFF: Disable glass effect for this card only (more readable), locks blur power slider
     *   - DASH: Follow dashboard's global glass setting (default behavior)
     *   - ON: Force enable glass effect for this card
     * - Blur power slider: enabled only in ON mode
     */

    const isDashboardGlassEnabled = () => {
      try {
        const settings = this.storage.getSettings();
        return settings?.theme?.glassEnabled !== false;
      } catch (e) {
        return true;
      }
    };

    const getDashboardBlurPower = () => {
      try {
        const settings = this.storage.getSettings();
        return settings?.uiBlurPower ?? 100;
      } catch (e) {
        return 100;
      }
    };

    const getDashboardGlassOpacity = () => {
      try {
        const settings = this.storage.getSettings();
        return SettingsRegistry.coerce("glassOpacity", settings?.theme?.glassOpacity);
      } catch (e) {
        return 50;
      }
    };

    const readSettings = () => this.storage.getSettings();
    const writeSettings = (patch) => {
      const current = this.storage.get("settings", {});
      this.storage.set("settings", { ...current, ...patch });
    };

    const validBlurStates = new Set(["off", "dashboard", "on"]);
    const normalizeBlurState = (value) =>
      validBlurStates.has(value) ? value : "dashboard";
    const normalizeBlurPower = (value) =>
      SettingsRegistry.coerce("blurPower", value, 100);
    const normalizeGlassOpacity = (
      value,
      fallback = getDashboardGlassOpacity(),
    ) => {
      if (value === null || typeof value === "undefined") {
        return fallback;
      }

      return SettingsRegistry.coerce("glassOpacity", value, fallback);
    };

    const blurPopupByCardId = new Map();
    const blurPopupPortalled = new WeakSet();
    let blurPopupPositionRaf = null;

    const ensureBlurPopupPortal = (menu, popup) => {
      if (!menu || !popup) return;
      if (blurPopupPortalled.has(popup)) return;

      try {
        document.body.appendChild(popup);
        popup.classList.add("blur-popup-portal");
        blurPopupPortalled.add(popup);
      } catch (e) {}
    };

    const positionBlurPopup = (menu, popup) => {
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
    };

    const repositionOpenBlurPopups = () => {
      if (blurPopupPositionRaf) return;

      blurPopupPositionRaf = requestAnimationFrame(() => {
        blurPopupPositionRaf = null;

        const openMenus = document.querySelectorAll(
          ".card-blur-menu.blur-menu-open",
        );
        if (!openMenus.length) return;

        openMenus.forEach((menu) => {
          const cardId = menu.dataset.cardId;
          if (!cardId) return;
          const popup = blurPopupByCardId.get(cardId);
          if (!popup) return;
          positionBlurPopup(menu, popup);
        });
      });
    };

    // Close all open blur menus
    const closeAllBlurMenus = () => {
      if (blurPopupPositionRaf) {
        cancelAnimationFrame(blurPopupPositionRaf);
        blurPopupPositionRaf = null;
      }

      document
        .querySelectorAll(".card-blur-menu.blur-menu-open")
        .forEach((menu) => {
          menu.classList.remove("blur-menu-open");
          menu.closest(".card")?.classList.remove("card-blur-popup-open");

          const cardId = menu.dataset.cardId;
          if (!cardId) return;
          const popup = blurPopupByCardId.get(cardId);
          popup?.classList.remove("blur-popup-open");
        });

      document
        .querySelectorAll(".blur-settings-popup.blur-popup-open")
        .forEach((popup) => {
          popup.classList.remove("blur-popup-open");
        });
    };

    // Close menus when clicking outside
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".card-blur-menu")) {
        closeAllBlurMenus();
      }
    });

    // Close menus on Escape key
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closeAllBlurMenus();
      }
    });

    window.addEventListener("resize", repositionOpenBlurPopups);
    window.addEventListener("scroll", repositionOpenBlurPopups, {
      capture: true,
      passive: true,
    });

    const setupBlurMenu = ({ cardId, stateKey, blurPowerKey, opacityKey }) => {
      const card = document.getElementById(cardId);
      const menu = document.querySelector(
        `.card-blur-menu[data-card-id="${cardId}"]`,
      );

      if (!card || !menu) return null;

      const btn = menu.querySelector(".card-blur-btn");
      const popup = menu.querySelector(".blur-settings-popup");
      const closeBtn = popup?.querySelector(".blur-popup-close");
      const glassOptions = popup?.querySelectorAll(".blur-glass-option");
      const sliderWrap = popup?.querySelector(".blur-power-slider-wrap");
      const slider = popup?.querySelector(".blur-power-slider");
      const valueDisplay = popup?.querySelector(".blur-power-value");

      let opacityWrap = popup?.querySelector(".blur-opacity-slider-wrap");
      if (!opacityWrap && popup) {
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
              value="${getDashboardGlassOpacity()}"
              aria-label="Glass opacity"
            />
            <span class="blur-power-value blur-opacity-value">${getDashboardGlassOpacity()}%</span>
          </div>
        `;
        popup.appendChild(section);
        opacityWrap = section.querySelector(".blur-opacity-slider-wrap");
      }

      const opacitySlider = popup?.querySelector(".blur-opacity-slider");
      const opacityValueDisplay = popup?.querySelector(".blur-opacity-value");

      if (!btn || !popup) return null;

      blurPopupByCardId.set(cardId, popup);
      ensureBlurPopupPortal(menu, popup);

      const clearCardGlassVars = () => {
        card.style.removeProperty("--glass-bg");
        card.style.removeProperty("--glass-bg-hover");
        card.style.removeProperty("--glass-border");
        card.style.removeProperty("--glass-shadow");
      };

      const setColorAlpha = (value, alpha) => {
        if (typeof value !== "string") return value;
        const match = value
          .replace(/\s+/g, "")
          .match(/^rgba?\((\d+),(\d+),(\d+)(?:,[0-9.]+)?\)$/i);
        if (!match) return value;

        const bounded = Number(
          Math.min(1, Math.max(0, Number(alpha))).toFixed(3),
        );
        return `rgba(${match[1]}, ${match[2]}, ${match[3]}, ${bounded})`;
      };

      const getGlassOpacityAlphas = (opacityPercent) => {
        const baseAlpha = normalizeGlassOpacity(opacityPercent, 35) / 100;
        const hoverRatio = 0.45 / 0.35;
        const borderRatio = 0.4 / 0.35;
        const clampAlpha = (alpha) =>
          Number(Math.min(1, Math.max(0, alpha)).toFixed(3));

        return {
          bg: clampAlpha(baseAlpha),
          hover: clampAlpha(baseAlpha * hoverRatio),
          border: clampAlpha(baseAlpha * borderRatio),
        };
      };

      const applyCardGlassVars = (glassEnabled, opacityPercent = null) => {
        const colors = this.themes?.getThemeColors?.();
        if (!colors) return;

        if (glassEnabled) {
          const targetOpacity = normalizeGlassOpacity(
            opacityPercent,
            getDashboardGlassOpacity(),
          );
          const opacityAlphas = getGlassOpacityAlphas(targetOpacity);
          const glassBg = setColorAlpha(colors.glassBg, opacityAlphas.bg);
          const glassBgHover = setColorAlpha(
            colors.glassBgHover,
            opacityAlphas.hover,
          );
          const glassBorder = setColorAlpha(
            colors.glassBorder,
            opacityAlphas.border,
          );

          card.style.setProperty("--glass-bg", glassBg);
          card.style.setProperty("--glass-bg-hover", glassBgHover);
          card.style.setProperty("--glass-border", glassBorder);
          card.style.setProperty(
            "--glass-shadow",
            "0 8px 32px rgba(0, 0, 0, 0.3)",
          );
          return;
        }

        // Solid mode - NO transparency in the base surfaces.
        // We mix theme colors into the body background to get fully-opaque panel colors.
        const isLight = this.themes.getCurrentMode?.() === "light";

        const bgMix = isLight ? 0.12 : 0.38;
        const bgHoverMix = isLight ? 0.18 : 0.48;
        const borderMix = isLight ? 0.25 : 0.58;

        const mixHexToRgb = (baseHex, mixHex, mixWeight) => {
          const base = this.themes.hexToRgb?.(baseHex);
          const mix = this.themes.hexToRgb?.(mixHex);
          if (!base || !mix) return null;

          const w = Math.max(0, Math.min(1, Number(mixWeight)));
          const blend = (a, b) => Math.round(a * (1 - w) + b * w);

          return `rgb(${blend(base.r, mix.r)}, ${blend(base.g, mix.g)}, ${blend(
            base.b,
            mix.b,
          )})`;
        };

        const solidBg =
          mixHexToRgb(colors.bodyBg, colors.primary, bgMix) ||
          (isLight ? "rgb(255, 255, 255)" : "rgb(30, 30, 50)");
        const solidHover =
          mixHexToRgb(colors.bodyBg, colors.primary, bgHoverMix) ||
          (isLight ? "rgb(245, 245, 245)" : "rgb(40, 40, 60)");
        const solidBorder =
          mixHexToRgb(colors.bodyBg, colors.primaryLight, borderMix) ||
          (isLight ? "rgb(220, 220, 220)" : "rgb(90, 90, 110)");

        card.style.setProperty("--glass-bg", solidBg);
        card.style.setProperty("--glass-bg-hover", solidHover);
        card.style.setProperty("--glass-border", solidBorder);
        card.style.setProperty(
          "--glass-shadow",
          "0 4px 20px rgba(0, 0, 0, 0.2)",
        );
      };

      // Apply glass state to the card
      const applyGlassState = (
        state,
        customBlurEnabled,
        customBlurPower,
        customGlassOpacity,
        options = {},
      ) => {
        const resetDashboardSurface = options?.resetDashboardSurface === true;

        // Determine effective glass state based on the triple toggle
        // OFF: Force glass disabled for this component only
        // DASH: Follow dashboard setting
        // ON: Force glass enabled for this component
        const isDashboardState = state === "dashboard";
        let effectiveGlass;
        if (state === "on") {
          effectiveGlass = true;
        } else if (state === "off") {
          effectiveGlass = false;
        } else {
          // "dashboard" - follow global setting
          effectiveGlass = isDashboardGlassEnabled();
        }

        // Apply per-card glass override attribute:
        // - OFF  => data-glass-enabled="false" on this card only
        // - ON   => data-glass-enabled="true" on this card only
        // - DASH => remove attribute so it follows dashboard/root setting
        if (state === "dashboard") {
          delete card.dataset.glassEnabled;
          if (resetDashboardSurface) {
            clearCardGlassVars();
          }
        } else if (state === "on") {
          card.dataset.glassEnabled = "true";
          applyCardGlassVars(true, customGlassOpacity);
        } else if (state === "off") {
          card.dataset.glassEnabled = "false";
          applyCardGlassVars(false);
        }

        // Determine effective blur power
        const usingCustomBlur = state === "on";
        let effectiveBlurPower;
        if (!effectiveGlass) {
          // Glass is off, blur multiplier should be 0
          effectiveBlurPower = 0;
        } else if (usingCustomBlur) {
          // Custom blur power enabled
          effectiveBlurPower = customBlurPower / 100;
        } else {
          // Follow dashboard blur power
          effectiveBlurPower = getDashboardBlurPower() / 100;
        }

        // Apply via CSS custom property
        if (!effectiveGlass) {
          // Glass disabled - set multiplier to 0
          card.style.setProperty("--ui-blur-multiplier", "0");
          card.dataset.blurOverride = "off";
        } else if (usingCustomBlur) {
          // Custom blur power
          card.style.setProperty(
            "--ui-blur-multiplier",
            String(effectiveBlurPower),
          );
          card.dataset.blurOverride = String(effectiveBlurPower);
        } else {
          // Follow dashboard
          card.style.removeProperty("--ui-blur-multiplier");
          delete card.dataset.blurOverride;
        }

        // Update button icon based on state
        const getThemedIcon = (emoji) => {
          if (window.dashboard?.iconThemes) {
            return window.dashboard.iconThemes.getIcon(emoji, { size: 16 });
          }
          return emoji;
        };

        if (state === "off") {
          btn.innerHTML = getThemedIcon("⬜");
        } else if (state === "on") {
          btn.innerHTML = getThemedIcon("✨");
        } else {
          btn.innerHTML = getThemedIcon("🔗");
        }

        // Notify components
        try {
          document.dispatchEvent(
            new CustomEvent("md:card-blur-update", { detail: { cardId } }),
          );
        } catch (e) {}
      };

      // Update UI to match state
      const syncUI = (
        glassState,
        customBlurEnabled,
        customBlurPower,
        customGlassOpacity,
      ) => {
        // Update glass toggle buttons
        glassOptions?.forEach((opt) => {
          const val = opt.dataset.glassValue;
          opt.classList.toggle("active", val === glassState);
        });

        // Blur power slider is only adjustable in ON mode.
        const isGlassOff = glassState === "off";
        const isDashboardState = glassState === "dashboard";

        // Update slider state - disabled when glass is off or dashboard-linked
        const effectiveBlurPower = isDashboardState
          ? getDashboardBlurPower()
          : customBlurPower;
        if (sliderWrap) {
          sliderWrap.classList.toggle(
            "disabled",
            isGlassOff || isDashboardState,
          );
        }

        // Update slider value
        if (slider) {
          slider.value = String(effectiveBlurPower);
          slider.disabled = isGlassOff || isDashboardState;
        }

        // Update value display
        if (valueDisplay) {
          valueDisplay.textContent = effectiveBlurPower + "%";
        }

        const effectiveOpacity = isDashboardState
          ? getDashboardGlassOpacity()
          : customGlassOpacity;
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
          opacityValueDisplay.textContent = effectiveOpacity + "%";
        }
      };

      // Load initial state
      const settings = readSettings();
      let currentGlassState = normalizeBlurState(settings?.[stateKey]);
      let currentCustomEnabled = currentGlassState === "on";
      let currentCustomPower = normalizeBlurPower(settings?.[blurPowerKey]);
      let currentGlassOpacity = normalizeGlassOpacity(settings?.[opacityKey]);

      // Persist normalized defaults so every blur-capable component starts in
      // dashboard-follow mode and keeps its own custom settings across reloads.
      const initialPatch = {};
      if (settings?.[stateKey] !== currentGlassState) {
        initialPatch[stateKey] = currentGlassState;
      }
      if (settings?.[blurPowerKey + "Enabled"] !== currentCustomEnabled) {
        initialPatch[blurPowerKey + "Enabled"] = currentCustomEnabled;
      }
      if (settings?.[blurPowerKey] !== currentCustomPower) {
        initialPatch[blurPowerKey] = currentCustomPower;
      }
      if (settings?.[opacityKey] !== currentGlassOpacity) {
        initialPatch[opacityKey] = currentGlassOpacity;
      }
      if (Object.keys(initialPatch).length > 0) {
        writeSettings(initialPatch);
      }

      // Apply initial state
      syncUI(
        currentGlassState,
        currentCustomEnabled,
        currentCustomPower,
        currentGlassOpacity,
      );
      applyGlassState(
        currentGlassState,
        currentCustomEnabled,
        currentCustomPower,
        currentGlassOpacity,
      );

      // Toggle popup open/close
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();

        const isOpen = menu.classList.contains("blur-menu-open");

        // Close all other menus first
        closeAllBlurMenus();

        // Toggle this menu
        if (!isOpen) {
          menu.classList.add("blur-menu-open");
          card.classList.add("card-blur-popup-open");
          popup.classList.add("blur-popup-open");
          ensureBlurPopupPortal(menu, popup);
          positionBlurPopup(menu, popup);
        }
      });

      // Close button
      closeBtn?.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        menu.classList.remove("blur-menu-open");
        card.classList.remove("card-blur-popup-open");
        popup.classList.remove("blur-popup-open");
      });

      // Prevent popup clicks from closing it
      popup.addEventListener("click", (e) => {
        e.stopPropagation();
      });

      // Glass effect toggle options
      glassOptions?.forEach((opt) => {
        opt.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();

          const newState = opt.dataset.glassValue;
          currentGlassState = newState;
          currentCustomEnabled = newState === "on";

          // Update UI
          glassOptions.forEach((o) => o.classList.remove("active"));
          opt.classList.add("active");
          syncUI(
            currentGlassState,
            currentCustomEnabled,
            currentCustomPower,
            currentGlassOpacity,
          );

          // Apply and save
          applyGlassState(
            currentGlassState,
            currentCustomEnabled,
            currentCustomPower,
            currentGlassOpacity,
            { resetDashboardSurface: newState === "dashboard" },
          );
          writeSettings({
            [stateKey]: newState,
            [blurPowerKey + "Enabled"]: currentCustomEnabled,
          });

          if (newState === "dashboard" && this.themes?.applyTheme) {
            this.themes.applyTheme();
          }
        });
      });

      // Blur power slider
      slider?.addEventListener("input", () => {
        // Only editable in ON mode.
        if (currentGlassState !== "on") {
          return;
        }

        currentCustomPower = normalizeBlurPower(slider.value);

        // Update value display
        if (valueDisplay) {
          valueDisplay.textContent = currentCustomPower + "%";
        }

        // Apply and save
        applyGlassState(
          currentGlassState,
          currentCustomEnabled,
          currentCustomPower,
          currentGlassOpacity,
        );
        writeSettings({ [blurPowerKey]: currentCustomPower });
      });

      // Per-card glass opacity slider
      opacitySlider?.addEventListener("input", () => {
        if (currentGlassState === "off" || currentGlassState === "dashboard") {
          return;
        }

        currentGlassOpacity = normalizeGlassOpacity(
          opacitySlider.value,
          currentGlassOpacity,
        );
        if (opacityValueDisplay) {
          opacityValueDisplay.textContent = currentGlassOpacity + "%";
        }

        applyGlassState(
          currentGlassState,
          currentCustomEnabled,
          currentCustomPower,
          currentGlassOpacity,
        );
        writeSettings({ [opacityKey]: currentGlassOpacity });
      });

      // Listen for dashboard glass setting changes
      document.addEventListener("md:glass-setting-changed", () => {
        // Only update if following dashboard setting
        if (currentGlassState === "dashboard") {
          syncUI(
            currentGlassState,
            currentCustomEnabled,
            currentCustomPower,
            currentGlassOpacity,
          );
          applyGlassState(
            currentGlassState,
            currentCustomEnabled,
            currentCustomPower,
            currentGlassOpacity,
          );
        }
      });

      // Recompute per-card glass/solid colors on theme changes.
      document.addEventListener("md:theme-change", () => {
        applyGlassState(
          currentGlassState,
          currentCustomEnabled,
          currentCustomPower,
          currentGlassOpacity,
        );
      });

      // Listen for dashboard blur power changes
      document.addEventListener("md:ui-blur-update", () => {
        // Update only when dashboard-linked.
        if (currentGlassState === "dashboard") {
          syncUI(
            currentGlassState,
            currentCustomEnabled,
            currentCustomPower,
            currentGlassOpacity,
          );
          applyGlassState(
            currentGlassState,
            currentCustomEnabled,
            currentCustomPower,
            currentGlassOpacity,
          );
        }
      });

      return {
        card,
        menu,
        applyGlassState: () =>
          applyGlassState(
            currentGlassState,
            currentCustomEnabled,
            currentCustomPower,
            currentGlassOpacity,
          ),
      };
    };

    // Setup all cards with blur menu
    const blurConfigs = [
      {
        cardId: "pocketQuranCard",
        stateKey: "pocketQuranBlurState",
        blurPowerKey: "pocketQuranBlurPower",
        opacityKey: "pocketQuranGlassOpacity",
      },
      {
        cardId: "todoCard",
        stateKey: "todoBlurState",
        blurPowerKey: "todoBlurPower",
        opacityKey: "todoGlassOpacity",
      },
      {
        cardId: "flashcardCard",
        stateKey: "flashcardBlurState",
        blurPowerKey: "flashcardBlurPower",
        opacityKey: "flashcardGlassOpacity",
      },
      {
        cardId: "adhkarCard",
        stateKey: "adhkarBlurState",
        blurPowerKey: "adhkarBlurPower",
        opacityKey: "adhkarGlassOpacity",
      },
      {
        cardId: "hadithCard",
        stateKey: "hadithBlurState",
        blurPowerKey: "hadithBlurPower",
        opacityKey: "hadithGlassOpacity",
      },
      {
        cardId: "notesCard",
        stateKey: "notesBlurState",
        blurPowerKey: "notesBlurPower",
        opacityKey: "notesGlassOpacity",
      },
    ];

    this._blurMenus = blurConfigs
      .map((cfg) => setupBlurMenu(cfg))
      .filter(Boolean);

    // Listen for icon theme changes and update blur menu button icons
    document.addEventListener("md:icon-theme-change", () => {
      const readSettings = () => this.storage.getSettings();
      const getThemedIcon = (emoji) => {
        if (window.dashboard?.iconThemes) {
          return window.dashboard.iconThemes.getIcon(emoji, { size: 16 });
        }
        return emoji;
      };

      blurConfigs.forEach(({ stateKey }) => {
        const settings = readSettings();
        const state = settings?.[stateKey] || "dashboard";
        const menu = document.querySelector(`.card-blur-menu[data-card-id]`);

        document.querySelectorAll(".card-blur-btn").forEach((btn) => {
          const cardMenu = btn.closest(".card-blur-menu");
          const cardId = cardMenu?.dataset?.cardId;
          if (!cardId) return;

          const cardStateKey = blurConfigs.find(
            (c) => c.cardId === cardId,
          )?.stateKey;
          const cardState = settings?.[cardStateKey] || "dashboard";

          if (cardState === "off") {
            btn.innerHTML = getThemedIcon("⬜");
          } else if (cardState === "on") {
            btn.innerHTML = getThemedIcon("✨");
          } else {
            btn.innerHTML = getThemedIcon("🔗");
          }
        });
      });
    });
  }
});
