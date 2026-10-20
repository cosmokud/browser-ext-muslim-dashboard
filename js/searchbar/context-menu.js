/**
 * SearchBarManager: engine context menu and delete.
 * Part of the class declared in js/searchbar/index.js; load this after it.
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
})(SearchBarManager.prototype, class {

  createContextMenu() {
    if (this.contextMenu) return;

    const menu = document.createElement("div");
    menu.className = "pinned-app-context-menu";
    menu.classList.add("search-bar-context-menu");
    menu.innerHTML = `
      <button class="context-menu-item context-menu-edit" type="button">
        <span class="context-menu-icon">${this._getIcon("✏️", {
          size: 16,
        })}</span>
        <span>Edit</span>
      </button>
      <div class="context-menu-divider" role="separator"></div>
      <div class="context-menu-accent" aria-label="Accent color">
        <div class="context-menu-accent-title">Accent color</div>
        <div class="context-menu-accent-palette" data-role="accent-palette"></div>
        <button class="context-menu-item context-menu-accent-custom" type="button">
          <span class="context-menu-icon">${this._getIcon("🎨", {
            size: 16,
          })}</span>
          <span>Custom color…</span>
        </button>
        <button class="context-menu-item context-menu-accent-dominant" type="button">
          <span class="context-menu-icon">${this._getIcon("🎯", {
            size: 16,
          })}</span>
          <span>Dominant color</span>
        </button>
      </div>
      <div class="context-menu-divider" role="separator"></div>
      <button class="context-menu-item context-menu-delete" type="button">
        <span class="context-menu-icon">${this._getIcon("🗑️", {
          size: 16,
        })}</span>
        <span>Delete</span>
      </button>
    `;

    document.body.appendChild(menu);
    this.contextMenu = menu;

    // Hidden color input to allow arbitrary selection.
    const colorInput = document.createElement("input");
    colorInput.type = "color";
    colorInput.className = "context-menu-color-input";
    colorInput.setAttribute("aria-label", "Pick custom accent color");
    colorInput.tabIndex = -1;
    menu.appendChild(colorInput);
    this.customColorInput = colorInput;

    // Build palette swatches from theme primitives.
    this._renderAccentPaletteForEngine(null);

    this.contextMenu
      .querySelector(".context-menu-edit")
      .addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const id = this.contextMenu?.dataset?.engineId;
        this.hideContextMenu();
        if (id != null) this.showEditModal(id);
      });

    this.contextMenu
      .querySelector(".context-menu-accent-custom")
      .addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();

        const engineId = this.contextMenu?.dataset?.engineId;
        if (!engineId || !this.customColorInput) return;

        const engine = this.searches.find(
          (s) => String(s.id) === String(engineId),
        );
        const current = this._normalizeRgbString(engine?.accentRgb);
        this.customColorInput.value =
          this._rgbStringToHex(current) || "#ffffff";

        const normalizedEngineId = String(engineId);
        this.customColorPickerEngineId = normalizedEngineId;
        this.selectEngine(normalizedEngineId);

        // Trigger native picker.
        try {
          if (typeof this.customColorInput.showPicker === "function") {
            this.customColorInput.showPicker();
          } else {
            this.customColorInput.click();
          }
        } catch (error) {
          this.customColorInput.click();
        }
      });

    this.contextMenu
      .querySelector(".context-menu-accent-dominant")
      .addEventListener("click", async (e) => {
        e.preventDefault();
        e.stopPropagation();

        const engineId = this.contextMenu?.dataset?.engineId;
        if (!engineId) return;

        await this.applyDominantAccentForEngine(engineId, {
          force: true,
          closeMenu: true,
        });
      });

    if (this.customColorInput) {
      const applyCustomAccentFromPicker = (hex, { closeMenu = false } = {}) => {
        const engineId =
          this.customColorPickerEngineId || this.contextMenu?.dataset?.engineId;
        if (!engineId) return;

        const rgb = this._hexToRgbString(hex);
        if (!rgb) return;

        this.selectEngine(engineId);
        this.setEngineAccent(engineId, rgb);

        if (closeMenu) {
          this.hideContextMenu();
          this.customColorPickerEngineId = null;
        }
      };

      this.customColorInput.addEventListener("input", (e) => {
        const hex = String(e.target?.value || "").trim();
        applyCustomAccentFromPicker(hex);
      });

      this.customColorInput.addEventListener("change", (e) => {
        const hex = String(e.target?.value || "").trim();
        applyCustomAccentFromPicker(hex, { closeMenu: true });
      });

      this.customColorInput.addEventListener("blur", () => {
        this.customColorPickerEngineId = null;
      });
    }

    const palette = this.contextMenu.querySelector(
      '[data-role="accent-palette"]',
    );
    if (palette) {
      palette.addEventListener("click", (e) => {
        const btn = e.target.closest("button.context-menu-swatch");
        if (!btn) return;
        e.preventDefault();
        e.stopPropagation();
        const engineId = this.contextMenu?.dataset?.engineId;
        const rgb = btn.dataset.rgb;
        if (!engineId || !rgb) return;
        this.selectEngine(engineId);
        this.setEngineAccent(engineId, rgb);
        this.hideContextMenu();
      });
    }

    this.contextMenu
      .querySelector(".context-menu-delete")
      .addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const id = this.contextMenu?.dataset?.engineId;
        this.hideContextMenu();
        if (id != null) this.showDeleteConfirmation(id);
      });

    document.addEventListener("click", (e) => {
      if (this.contextMenu && !this.contextMenu.contains(e.target)) {
        this.hideContextMenu();
      }
    });

    // Close context menu on outside right-click.
    // Capture phase ensures opener stopPropagation() doesn't prevent dismissal.
    document.addEventListener(
      "contextmenu",
      (e) => {
        if (this.contextMenu && !this.contextMenu.contains(e.target)) {
          this.hideContextMenu();
        }
      },
      true,
    );

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        this.hideContextMenu();
      }
    });

    document.addEventListener(
      "scroll",
      () => {
        this.hideContextMenu();
      },
      true,
    );
  }

  showContextMenu(x, y, engineId) {
    if (!this.contextMenu) return;

    this.customColorPickerEngineId = null;
    this.contextMenu.dataset.engineId = String(engineId);

    // Refresh the palette for the current engine.
    this._renderAccentPaletteForEngine(engineId, {
      refreshDominant: true,
      applyDominant: true,
    });

    this.contextMenu.style.left = `${x}px`;
    this.contextMenu.style.top = `${y}px`;
    this.contextMenu.classList.add("active");

    const rect = this.contextMenu.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
      this.contextMenu.style.left = `${x - rect.width}px`;
    }
    if (rect.bottom > window.innerHeight) {
      this.contextMenu.style.top = `${y - rect.height}px`;
    }
  }

  hideContextMenu() {
    if (!this.contextMenu) return;
    this.contextMenu.classList.remove("active");
    delete this.contextMenu.dataset.engineId;
  }

  setEngineAccent(engineId, rgbString, { source = "custom" } = {}) {
    const idx = this.searches.findIndex(
      (s) => String(s.id) === String(engineId),
    );
    if (idx < 0) return;

    const normalized = this._normalizeRgbString(rgbString);
    this.searches[idx] = {
      ...this.searches[idx],
      accentRgb: normalized,
      accentRgbSource: source,
    };

    // If this engine is selected, apply immediately.
    if (String(this.selectedId) === String(engineId)) {
      this.applyEngineAccent(this.searches[idx]);
    }

    this.persist();
    this.render();
  }

  _isValidRgbString(rgbString) {
    return (
      typeof rgbString === "string" &&
      /^\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*$/.test(rgbString)
    );
  }

  deleteEngine(engineId) {
    const idx = this.searches.findIndex(
      (s) => String(s.id) === String(engineId),
    );
    if (idx < 0) return;

    this.searches.splice(idx, 1);

    if (this.searches.length === 0) {
      this.selectedId = null;
      this.scrollIndex = 0;
    } else if (String(this.selectedId) === String(engineId)) {
      this.selectedId =
        this.searches[Math.min(idx, this.searches.length - 1)].id;
    }

    this.persist();
    this.render();
  }
});
