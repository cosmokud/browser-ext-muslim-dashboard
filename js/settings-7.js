/**
 * SettingsManager, part 7 of 9.
 * Moved out of js/settings.js at method boundaries, so no single file carries the
 * whole class. The class itself is declared in js/settings.js; load this after it.
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
})(SettingsManager.prototype, class {

  bindDetachedEditorViewportRefresh() {
    if (this._detachedEditorViewportHandler) {
      window.removeEventListener("resize", this._detachedEditorViewportHandler);
      window.removeEventListener(
        "orientationchange",
        this._detachedEditorViewportHandler,
      );
      this._detachedEditorViewportHandler = null;
    }

    this._detachedEditorViewportHandler = () => {
      if (this._detachedEditorViewportRaf) return;

      this._detachedEditorViewportRaf = window.requestAnimationFrame(() => {
        this._detachedEditorViewportRaf = 0;
        this.scheduleDetachedEditorLayoutRefresh({ includeWidth: true });
      });
    };

    window.addEventListener("resize", this._detachedEditorViewportHandler);
    window.addEventListener(
      "orientationchange",
      this._detachedEditorViewportHandler,
    );
  }

  isDetachedResizeArtifactNode(node) {
    if (!(node instanceof Element)) return false;
    if (node.classList.contains("editor-col-resize-handle")) return true;
    if (node.classList.contains("editor-resize-colgroup")) return true;
    if (
      node.tagName === "COL" &&
      node.parentElement?.classList?.contains("editor-resize-colgroup")
    ) {
      return true;
    }
    return false;
  }

  bindDetachedEditorMutationRefresh() {
    if (this._detachedEditorMutationObserver) {
      try {
        this._detachedEditorMutationObserver.disconnect();
      } catch (e) {
        // ignore
      }
      this._detachedEditorMutationObserver = null;
    }

    const state = this._detachedEditorState;
    if (!state?.group) return;

    this._detachedEditorMutationObserver = new MutationObserver((mutations) => {
      if (!this._detachedEditorState) return;

      const hasRelevantStructureChange = mutations.some((mutation) => {
        if (mutation.type !== "childList") return false;
        const nodes = [...mutation.addedNodes, ...mutation.removedNodes];
        if (!nodes.length) return false;

        return nodes.some((node) => {
          if (this.isDetachedResizeArtifactNode(node)) return false;
          return true;
        });
      });

      if (!hasRelevantStructureChange) return;
      this.scheduleDetachedEditorLayoutRefresh({ includeWidth: false });
    });

    this._detachedEditorMutationObserver.observe(state.group, {
      childList: true,
      subtree: true,
    });
  }

  getEditorColumnMinWidth(cell, index, totalColumns) {
    const cls = String(cell?.className || "").toLowerCase();
    const label = String(cell?.textContent || "").toLowerCase();

    if (index === 0) return 42;
    if (index === totalColumns - 1) return 34;
    if (cls.includes("col-actions")) return 34;
    if (cls.includes("col-id")) return 48;
    if (cls.includes("text-lang") || label.includes("text")) return 220;
    if (cls.includes("question") || cls.includes("answer")) return 180;
    if (cls.includes("narrator") || cls.includes("reference")) return 120;
    if (cls.includes("title") || label.includes("title")) return 140;
    if (cls.includes("arabic") || cls.includes("romanization")) return 150;
    return 110;
  }

  enableDetachedEditorColumnResize(group) {
    if (!group) return null;
    const cleanups = [];

    const gridHeader = group.querySelector(".flashcard-editor-header");
    if (gridHeader) {
      const cleanup = this.enableDetachedGridColumnResize(gridHeader, group);
      if (typeof cleanup === "function") cleanups.push(cleanup);
    }

    const table = group.querySelector(
      ".hadith-editor-table, .adhkar-editor-table",
    );
    if (table) {
      const cleanup = this.enableDetachedTableColumnResize(table);
      if (typeof cleanup === "function") cleanups.push(cleanup);
    }

    if (!cleanups.length) return null;
    return () => {
      cleanups.forEach((fn) => {
        try {
          fn();
        } catch (e) {
          // ignore
        }
      });
    };
  }

  enableDetachedGridColumnResize(header, group) {
    if (!header || !group) return null;

    const headerCells = Array.from(header.children || []);
    if (headerCells.length < 4) return null;

    let widths = String(getComputedStyle(header).gridTemplateColumns || "")
      .split(/\s+/)
      .map((value) => parseFloat(value))
      .filter((value) => Number.isFinite(value) && value > 0);

    if (widths.length !== headerCells.length) {
      widths = headerCells.map((cell) =>
        Math.max(40, cell.getBoundingClientRect().width),
      );
    }

    const applyTemplate = () => {
      const template = widths.map((w) => `${Math.round(w)}px`).join(" ");
      header.style.gridTemplateColumns = template;
      group.querySelectorAll(".flashcard-row").forEach((row) => {
        row.style.gridTemplateColumns = template;
      });
    };

    applyTemplate();

    const handles = [];
    const listeners = [];

    for (let i = 1; i < headerCells.length - 2; i += 1) {
      const cell = headerCells[i];
      if (!cell) continue;

      const handle = document.createElement("span");
      handle.className = "editor-col-resize-handle";
      handle.setAttribute("role", "separator");
      handle.setAttribute("aria-orientation", "vertical");
      handle.setAttribute("aria-label", "Resize columns");

      const onPointerDown = (event) => {
        event.preventDefault();
        event.stopPropagation();

        const startX = event.clientX;
        const startLeft = widths[i];
        const startRight = widths[i + 1];
        const minLeft = this.getEditorColumnMinWidth(
          headerCells[i],
          i,
          headerCells.length,
        );
        const minRight = this.getEditorColumnMinWidth(
          headerCells[i + 1],
          i + 1,
          headerCells.length,
        );

        handle.classList.add("is-dragging");

        const onPointerMove = (moveEvent) => {
          const deltaX = moveEvent.clientX - startX;
          const total = startLeft + startRight;
          const nextLeft = Math.max(
            minLeft,
            Math.min(startLeft + deltaX, total - minRight),
          );
          const nextRight = total - nextLeft;

          widths[i] = nextLeft;
          widths[i + 1] = nextRight;
          applyTemplate();
        };

        const onPointerUp = () => {
          handle.classList.remove("is-dragging");
          window.removeEventListener("pointermove", onPointerMove);
          window.removeEventListener("pointerup", onPointerUp);
        };

        window.addEventListener("pointermove", onPointerMove);
        window.addEventListener("pointerup", onPointerUp);
      };

      handle.addEventListener("pointerdown", onPointerDown);
      listeners.push({ handle, onPointerDown });
      cell.appendChild(handle);
      handles.push(handle);
    }

    return () => {
      listeners.forEach(({ handle, onPointerDown }) => {
        try {
          handle.removeEventListener("pointerdown", onPointerDown);
          handle.remove();
        } catch (e) {
          // ignore
        }
      });

      header.style.removeProperty("grid-template-columns");
      group.querySelectorAll(".flashcard-row").forEach((row) => {
        row.style.removeProperty("grid-template-columns");
      });
    };
  }

  enableDetachedTableColumnResize(table) {
    if (!table) return null;

    const headerCells = Array.from(table.querySelectorAll("thead th"));
    if (headerCells.length < 3) return null;

    const colgroup = document.createElement("colgroup");
    colgroup.className = "editor-resize-colgroup";

    const widths = headerCells.map((cell, index) => {
      const measured = Math.max(
        40,
        Math.round(cell.getBoundingClientRect().width),
      );
      const min = this.getEditorColumnMinWidth(cell, index, headerCells.length);
      return Math.max(min, measured);
    });

    widths.forEach((width) => {
      const col = document.createElement("col");
      col.style.width = `${Math.round(width)}px`;
      colgroup.appendChild(col);
    });

    table.insertBefore(colgroup, table.firstChild);
    const cols = Array.from(colgroup.children);

    const prevLayout = table.style.tableLayout;
    const prevWidth = table.style.width;

    table.style.tableLayout = "fixed";

    const applyWidths = () => {
      cols.forEach((col, index) => {
        col.style.width = `${Math.round(widths[index])}px`;
      });
      table.style.width = `${Math.round(widths.reduce((acc, val) => acc + val, 0))}px`;
    };

    applyWidths();

    const listeners = [];

    for (let i = 1; i < headerCells.length - 1; i += 1) {
      const leftCell = headerCells[i];
      const rightCell = headerCells[i + 1];
      if (!leftCell || !rightCell) continue;
      if (
        String(leftCell.className || "").includes("col-actions") ||
        String(rightCell.className || "").includes("col-actions")
      ) {
        continue;
      }

      const handle = document.createElement("span");
      handle.className = "editor-col-resize-handle";
      handle.setAttribute("role", "separator");
      handle.setAttribute("aria-orientation", "vertical");
      handle.setAttribute("aria-label", "Resize columns");

      const onPointerDown = (event) => {
        event.preventDefault();
        event.stopPropagation();

        const startX = event.clientX;
        const startLeft = widths[i];
        const startRight = widths[i + 1];
        const minLeft = this.getEditorColumnMinWidth(
          leftCell,
          i,
          headerCells.length,
        );
        const minRight = this.getEditorColumnMinWidth(
          rightCell,
          i + 1,
          headerCells.length,
        );

        handle.classList.add("is-dragging");

        const onPointerMove = (moveEvent) => {
          const deltaX = moveEvent.clientX - startX;
          const total = startLeft + startRight;
          const nextLeft = Math.max(
            minLeft,
            Math.min(startLeft + deltaX, total - minRight),
          );
          const nextRight = total - nextLeft;

          widths[i] = nextLeft;
          widths[i + 1] = nextRight;
          applyWidths();
        };

        const onPointerUp = () => {
          handle.classList.remove("is-dragging");
          window.removeEventListener("pointermove", onPointerMove);
          window.removeEventListener("pointerup", onPointerUp);
        };

        window.addEventListener("pointermove", onPointerMove);
        window.addEventListener("pointerup", onPointerUp);
      };

      handle.addEventListener("pointerdown", onPointerDown);
      listeners.push({ handle, onPointerDown });
      leftCell.appendChild(handle);
    }

    return () => {
      listeners.forEach(({ handle, onPointerDown }) => {
        try {
          handle.removeEventListener("pointerdown", onPointerDown);
          handle.remove();
        } catch (e) {
          // ignore
        }
      });

      colgroup.remove();
      table.style.tableLayout = prevLayout;
      table.style.width = prevWidth;
    };
  }

  closeDetachedEditorModal({ skipAfterCloseRefresh = false } = {}) {
    if (this.detachedEditorModal) {
      this.detachedEditorModal.classList.remove("active");
    }

    if (!this._detachedEditorState) return;

    if (this._detachedEditorMutationObserver) {
      try {
        this._detachedEditorMutationObserver.disconnect();
      } catch (e) {
        // ignore
      }
      this._detachedEditorMutationObserver = null;
    }

    if (this._detachedEditorRefreshTimer) {
      clearTimeout(this._detachedEditorRefreshTimer);
      this._detachedEditorRefreshTimer = null;
    }
    this._detachedEditorRefreshNeedsWidth = false;

    if (this._detachedEditorViewportRaf) {
      window.cancelAnimationFrame(this._detachedEditorViewportRaf);
      this._detachedEditorViewportRaf = 0;
    }

    if (this._detachedEditorViewportHandler) {
      window.removeEventListener("resize", this._detachedEditorViewportHandler);
      window.removeEventListener(
        "orientationchange",
        this._detachedEditorViewportHandler,
      );
      this._detachedEditorViewportHandler = null;
    }

    const { group, placeholder, onAfterClose, resizeCleanup } =
      this._detachedEditorState;

    if (typeof resizeCleanup === "function") {
      try {
        resizeCleanup();
      } catch (e) {
        // ignore
      }
    }

    if (placeholder?.parentElement && group) {
      placeholder.parentElement.insertBefore(group, placeholder);
      placeholder.remove();
    }

    if (!skipAfterCloseRefresh && typeof onAfterClose === "function") {
      try {
        onAfterClose();
      } catch (e) {
        // ignore
      }
    }

    this._detachedEditorState = null;
  }

  getChangelogResourceUrl() {
    if (typeof chrome !== "undefined" && chrome.runtime?.getURL) {
      return chrome.runtime.getURL("data/changelog.txt");
    }

    if (typeof browser !== "undefined" && browser.runtime?.getURL) {
      return browser.runtime.getURL("data/changelog.txt");
    }

    return "data/changelog.txt";
  }

  renderChangelogInlineMarkdown(value) {
    const escaped = this.escapeHtml(value);
    return escaped
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/`([^`]+)`/g, "<code>$1</code>");
  }

  renderChangelogMarkdown(markdown) {
    const lines = String(markdown || "").split(/\r?\n/);
    const html = [];
    let hasEntry = false;
    let entryOpen = false;
    let listOpen = false;

    const closeList = () => {
      if (!listOpen) return;
      html.push("</ul>");
      listOpen = false;
    };

    const closeEntry = () => {
      closeList();
      if (!entryOpen) return;
      html.push("</section>");
      entryOpen = false;
    };

    const ensureEntry = () => {
      if (entryOpen) return;
      html.push('<section class="changelog-entry">');
      entryOpen = true;
      hasEntry = true;
    };

    lines.forEach((rawLine) => {
      const line = String(rawLine || "").trim();

      if (!line) {
        closeList();
        return;
      }

      if (line.startsWith("## ")) {
        closeEntry();
        ensureEntry();
        html.push(
          `<h3 class="changelog-entry-title">${this.renderChangelogInlineMarkdown(line.slice(3).trim())}</h3>`,
        );
        return;
      }

      if (line.startsWith("### ")) {
        ensureEntry();
        closeList();
        html.push(
          `<h4 class="changelog-entry-subtitle">${this.renderChangelogInlineMarkdown(line.slice(4).trim())}</h4>`,
        );
        return;
      }

      if (line.startsWith("- ")) {
        ensureEntry();
        if (!listOpen) {
          html.push('<ul class="changelog-list">');
          listOpen = true;
        }

        html.push(
          `<li>${this.renderChangelogInlineMarkdown(line.replace(/^-\s+/, ""))}</li>`,
        );
        return;
      }

      ensureEntry();
      closeList();
      html.push(
        `<p class="changelog-text">${this.renderChangelogInlineMarkdown(line)}</p>`,
      );
    });

    closeEntry();

    if (!hasEntry) {
      return '<p class="changelog-empty">No changelog entries found.</p>';
    }

    return html.join("");
  }

  async ensureChangelogContentLoaded() {
    if (!this.changelogContent) {
      return;
    }

    if (this._changelogHtmlCache) {
      this.changelogContent.innerHTML = this._changelogHtmlCache;
      return;
    }

    if (!this._changelogLoadPromise) {
      this.changelogContent.innerHTML =
        '<p class="changelog-empty">Loading changelog...</p>';

      this._changelogLoadPromise = this.fetchTextResource(
        this.getChangelogResourceUrl(),
        { cache: "no-store", label: "Changelog" },
      )
        .then((markdown) => {
          const rendered = this.renderChangelogMarkdown(markdown);
          this._changelogHtmlCache = rendered;
          return rendered;
        })
        .catch((error) => {
          console.warn("Unable to load changelog:", error);
          return '<p class="changelog-empty">Unable to load data/changelog.txt right now.</p>';
        })
        .finally(() => {
          this._changelogLoadPromise = null;
        });
    }

    const rendered = await this._changelogLoadPromise;
    if (this.changelogContent) {
      this.changelogContent.innerHTML = rendered;
    }
  }

  async openChangelogModal() {
    if (!this.changelogModal) {
      return;
    }

    this.changelogModal.classList.add("active");
    this.changelogModal.setAttribute("aria-hidden", "false");
    this.changelogCloseBtn?.focus?.();

    await this.ensureChangelogContentLoaded();
  }

  closeChangelogModal() {
    if (!this.changelogModal) {
      return;
    }

    this.changelogModal.classList.remove("active");
    this.changelogModal.setAttribute("aria-hidden", "true");
  }

  openModal() {
    this.loadSettings();
    this.resetSaveButtonState();
    if (this.quotes) {
      this.quotes.renderQuotesList();
    }
    if (this.flashcards) {
      this.flashcards.renderSettings();
    }
    if (this.hadith) {
      this.hadith.renderSettings();
    }
    if (this.adhkar) {
      this.adhkar.renderSettings();
    }
    if (this.modal) {
      this.modal.classList.add("active");
    }

    this.resetSettingsSearch();

    this.updateSettingsRangeProgress();

    this.updateSettingsTabsMinWidth();
    this.updateSettingsVisualPreviewMode(this.getActiveSettingsTabName());
  }

  closeModal() {
    if (this._saveSettingsCloseTimer) {
      clearTimeout(this._saveSettingsCloseTimer);
      this._saveSettingsCloseTimer = null;
    }
    this.resetSaveButtonState();
    this.updateSettingsVisualPreviewMode(null);
    this.flushPendingAutoSaveBeforeClose();
    this.closeDetachedEditorModal();
    this.closeChangelogModal();
    this.resetBackgroundThumbObserver();
    this.clearBackgroundThumbBlobUrlCache();

    if (this.modal) {
      this.modal.classList.remove("active");
    }
    // Restore dashboard layout in case user made a live preview
    if (
      window.dashboard &&
      typeof window.dashboard.applyComponentVisibility === "function"
    ) {
      try {
        window.dashboard.applyComponentVisibility();
      } catch (e) {
        // ignore
      }
    }
  }

  switchTab(tabName) {
    if (tabName === "debug" && !this.debugEnabled) return;

    const activeTab = Array.from(this.tabs || []).find(
      (tab) => tab.dataset.tab === tabName,
    );

    // Update tabs
    this.tabs.forEach((tab) => {
      tab.classList.toggle("active", tab.dataset.tab === tabName);
    });

    // Keep the active tab visible in the (horizontally scrollable) tab strip.
    activeTab?.scrollIntoView?.({
      block: "nearest",
      inline: "nearest",
      behavior: "smooth",
    });

    // Update panels
    this.panels.forEach((panel) => {
      panel.classList.toggle("active", panel.id === `${tabName}Panel`);
    });

    if (tabName === "flashcards" && this.flashcards) {
      this.flashcards.renderSettings();
    }

    if (tabName === "hadith" && this.hadith) {
      this.hadith.renderSettings();
    }

    if (tabName === "adhkar" && this.adhkar) {
      this.adhkar.renderSettings();
    }

    if (tabName === "notes") {
      this.updateNotesCountHint();
    }

    const activePanel = document.getElementById(`${tabName}Panel`);
    this.updateSettingsRangeProgress(activePanel);
    this.updateSettingsVisualPreviewMode(tabName);
  }

  getActiveSettingsTabName() {
    const activeTab = Array.from(this.tabs || []).find((tab) =>
      tab.classList.contains("active"),
    );
    return activeTab?.dataset?.tab || null;
  }

  isVisualPreviewSettingsTab(tabName) {
    return ["background", "heading", "themes"].includes(tabName);
  }

  updateSettingsVisualPreviewMode(tabName) {
    if (!this.modal) return;

    const enabled =
      this.modal.classList.contains("active") &&
      this.isVisualPreviewSettingsTab(tabName);

    this.modal.classList.toggle("settings-visual-preview", enabled);
  }

  resetSaveButtonState() {
    if (!this.saveBtn) return;

    if (this._saveButtonSavedTimer) {
      clearTimeout(this._saveButtonSavedTimer);
      this._saveButtonSavedTimer = null;
    }

    if (!this.saveBtn.dataset.defaultLabel) {
      this.saveBtn.dataset.defaultLabel =
        this.saveBtn.textContent.trim() || "💾 Save Settings";
    }

    this.saveBtn.classList.remove("is-saved");
    this.saveBtn.textContent = this.saveBtn.dataset.defaultLabel;
  }

  showSaveButtonSavedState() {
    if (!this.saveBtn) return;

    if (!this.saveBtn.dataset.defaultLabel) {
      this.saveBtn.dataset.defaultLabel =
        this.saveBtn.textContent.trim() || "💾 Save Settings";
    }

    if (this._saveButtonSavedTimer) {
      clearTimeout(this._saveButtonSavedTimer);
    }

    this.saveBtn.classList.add("is-saved");
    this.saveBtn.textContent = "✓ Saved";
    this.saveBtn.setAttribute("aria-live", "polite");

    this._saveButtonSavedTimer = setTimeout(() => {
      this._saveButtonSavedTimer = null;
      if (!this.modal?.classList.contains("active")) return;
      this.saveBtn.classList.remove("is-saved");
      this.saveBtn.textContent = this.saveBtn.dataset.defaultLabel;
    }, 1600);
  }

  applyDebugModeVisibility() {
    const enabled = globalThis.ENABLE_DEBUG_MODE === true;
    this.debugEnabled = enabled;

    if (this.debugTab) {
      this.debugTab.classList.toggle("hidden", !enabled);
      this.debugTab.setAttribute("aria-hidden", enabled ? "false" : "true");
      this.debugTab.toggleAttribute("disabled", !enabled);
    }

    if (this.debugPanel) {
      this.debugPanel.classList.toggle("hidden", !enabled);
    }

    // Safety: if debug is disabled while the tab is active, go back to Location.
    if (!enabled && this.debugPanel?.classList.contains("active")) {
      this.switchTab("location");
    }
  }

  setDebugDateControlsEnabled(enabled) {
    const next = enabled === true;

    if (this.debugDateControls) {
      this.debugDateControls.classList.toggle("is-disabled", !next);
    }

    [
      this.debugSimDatePicker,
      this.debugSimDateYear,
      this.debugSimDateMonth,
      this.debugSimDateDay,
      this.debugSimDateTime,
    ]
      .filter(Boolean)
      .forEach((el) => {
        el.disabled = !next;
      });
  }

  normalizeDebugDateYMD(rawValue) {
    return DebugClock.normalizeDateYMD(rawValue);
  }

  getDebugDateFromParts() {
    const yearRaw = String(this.debugSimDateYear?.value || "").trim();
    const monthRaw = String(this.debugSimDateMonth?.value || "").trim();
    const dayRaw = String(this.debugSimDateDay?.value || "").trim();

    if (!yearRaw && !monthRaw && !dayRaw) {
      return "";
    }

    if (!yearRaw || !monthRaw || !dayRaw) {
      return "";
    }

    const year = parseInt(yearRaw, 10);
    const month = parseInt(monthRaw, 10);
    const day = parseInt(dayRaw, 10);

    if (
      !Number.isFinite(year) ||
      !Number.isFinite(month) ||
      !Number.isFinite(day)
    ) {
      return "";
    }

    const combined = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return this.normalizeDebugDateYMD(combined);
  }

  syncDebugDatePartsFromPicker() {
    const normalized = this.normalizeDebugDateYMD(
      this.debugSimDatePicker?.value,
    );

    if (!normalized) {
      if (this.debugSimDateYear) this.debugSimDateYear.value = "";
      if (this.debugSimDateMonth) this.debugSimDateMonth.value = "";
      if (this.debugSimDateDay) this.debugSimDateDay.value = "";
      return;
    }

    const [year, month, day] = normalized.split("-");
    if (this.debugSimDateYear) this.debugSimDateYear.value = year;
    if (this.debugSimDateMonth) this.debugSimDateMonth.value = month;
    if (this.debugSimDateDay) this.debugSimDateDay.value = day;
  }

  syncDebugDatePickerFromParts() {
    const normalized = this.getDebugDateFromParts();

    if (normalized) {
      if (this.debugSimDatePicker) this.debugSimDatePicker.value = normalized;
      return;
    }

    const hasAnyPart =
      String(this.debugSimDateYear?.value || "").trim() ||
      String(this.debugSimDateMonth?.value || "").trim() ||
      String(this.debugSimDateDay?.value || "").trim();

    if (!hasAnyPart && this.debugSimDatePicker) {
      this.debugSimDatePicker.value = "";
    }
  }

  loadDebugSettings(settings) {
    const debug =
      settings && typeof settings.debug === "object" ? settings.debug : {};

    const enabled = debug.simulatedDateEnabled === true;
    const normalized = this.normalizeDebugDateYMD(debug.simulatedDate);

    if (this.debugSimDateEnabled) {
      this.debugSimDateEnabled.checked = enabled;
    }

    if (this.debugSimDatePicker) {
      this.debugSimDatePicker.value = normalized || "";
    }

    if (normalized) {
      const [year, month, day] = normalized.split("-");
      if (this.debugSimDateYear) this.debugSimDateYear.value = year;
      if (this.debugSimDateMonth) this.debugSimDateMonth.value = month;
      if (this.debugSimDateDay) this.debugSimDateDay.value = day;
    } else {
      if (this.debugSimDateYear) this.debugSimDateYear.value = "";
      if (this.debugSimDateMonth) this.debugSimDateMonth.value = "";
      if (this.debugSimDateDay) this.debugSimDateDay.value = "";
    }

    if (this.debugSimDateTime) {
      this.debugSimDateTime.value = DebugClock.normalizeTimeHM(
        debug.simulatedTime,
      );
    }

    this.setDebugDateControlsEnabled(enabled);
  }

  saveDebugSettings(settings, options = {}) {
    const { showValidationErrors = true } = options;

    settings.debug =
      settings.debug && typeof settings.debug === "object"
        ? settings.debug
        : {};

    const enabled = this.debugSimDateEnabled?.checked === true;
    const fromPicker = this.normalizeDebugDateYMD(
      this.debugSimDatePicker?.value,
    );
    const fromParts = this.getDebugDateFromParts();
    const selectedDate = fromPicker || fromParts;

    if (enabled && !selectedDate) {
      if (showValidationErrors) {
        this.showToast(
          "Please select a valid simulated date (YYYY-MM-DD).",
          "error",
        );
        if (this.debugEnabled) {
          try {
            this.switchTab("debug");
          } catch (e) {}
        }
      }
      return false;
    }

    settings.debug.simulatedDateEnabled = enabled;
    settings.debug.simulatedDate =
      selectedDate || settings.debug.simulatedDate || null;
    settings.debug.simulatedTime =
      DebugClock.normalizeTimeHM(this.debugSimDateTime?.value) || null;

    return true;
  }

  showToast(message, type = "info") {
    // Create toast container if not exists
    let container = document.querySelector(".toast-container");
    if (!container) {
      container = document.createElement("div");
      container.className = "toast-container";
      document.body.appendChild(container);
    }

    // Create toast
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;

    const iconSpan = document.createElement("span");
    const iconEmoji = type === "success" ? "✓" : type === "error" ? "✗" : "ℹ";
    iconSpan.innerHTML = this._getIcon(iconEmoji, { size: 16 });

    const msgSpan = document.createElement("span");
    msgSpan.textContent = String(message ?? "");

    toast.appendChild(iconSpan);
    toast.appendChild(msgSpan);

    container.appendChild(toast);

    let hideTimer = null;

    const removeToast = () => {
      try {
        toast.remove();
      } catch (e) {
        // ignore
      }
    };

    const hideToast = () => {
      if (toast.classList.contains("toast-hiding")) return;

      if (hideTimer) {
        clearTimeout(hideTimer);
        hideTimer = null;
      }

      toast.classList.add("toast-hiding");

      // Remove after transition; also keep a safety timeout.
      const fallbackMs = 350;
      const t = setTimeout(removeToast, fallbackMs);

      toast.addEventListener(
        "transitionend",
        (e) => {
          if (e && e.propertyName && e.propertyName !== "opacity") return;
          clearTimeout(t);
          removeToast();
        },
        { once: true },
      );
    };

    const scheduleHide = (delayMs) => {
      if (hideTimer) {
        clearTimeout(hideTimer);
      }
      hideTimer = setTimeout(hideToast, delayMs);
    };

    // If the user hovers over a toast (often near the FAB region), hide it quickly.
    toast.addEventListener(
      "mouseenter",
      () => {
        scheduleHide(120);
      },
      { once: true },
    );

    scheduleHide(2500);
  }

  normalizePocketQuranArabicFontFamily(value) {
    const normalized = String(value || "").trim();
    if (
      SettingsManager.POCKET_QURAN_ARABIC_FONT_FAMILIES.includes(normalized)
    ) {
      return normalized;
    }
    return "KFGQPC Uthman Taha Naskh";
  }

  normalizePocketQuranTranslationFontFamily(value) {
    const normalized = String(value || "").trim();
    if (
      SettingsManager.POCKET_QURAN_POPUP_TRANSLATION_FONT_FAMILIES.includes(
        normalized,
      )
    ) {
      return normalized;
    }
    return "Poppins";
  }

  normalizePocketQuranPopupTranslationFontFamily(value) {
    const normalized = String(value || "").trim();
    if (
      SettingsManager.POCKET_QURAN_POPUP_TRANSLATION_FONT_FAMILIES.includes(
        normalized,
      )
    ) {
      return normalized;
    }
    return "Poppins";
  }

  normalizeNotesCardFontFamily(value) {
    const normalized = String(value || "").trim();
    if (SettingsManager.NOTES_CARD_FONT_FAMILIES.includes(normalized)) {
      return normalized;
    }
    return "Poppins";
  }

  applyNotesCardFontFamily(fontFamily) {
    const normalized = this.normalizeNotesCardFontFamily(fontFamily);
    const notesCard = document.getElementById("notesCard");

    if (!notesCard) return normalized;

    let cssValue = `"${normalized}", var(--font-primary)`;
    if (normalized === "Georgia") {
      cssValue = '"Georgia", serif';
    } else if (normalized === "Courier New") {
      cssValue = '"Courier New", monospace';
    } else if (normalized === "Cascadia Code") {
      cssValue = '"Cascadia Code", "JetBrains Mono", Consolas, monospace';
    }

    notesCard.style.setProperty("--notes-card-font-family", cssValue);

    if (this.notesCardFontFamily) {
      this.notesCardFontFamily.value = normalized;
    }

    return normalized;
  }

  updateNotesCountHint() {
    if (!this.notesCountHint) return;
    const notes = this.storage.getNotes
      ? this.storage.getNotes()
      : this.storage.get("notes", []);
    const count = Array.isArray(notes) ? notes.length : 0;
    this.notesCountHint.textContent = `Currently stored: ${count} note${
      count === 1 ? "" : "s"
    }.`;
  }

  exportNotes() {
    const notes = this.storage.getNotes
      ? this.storage.getNotes()
      : this.storage.get("notes", []);
    const payload = {
      exportType: "notes",
      version: 1,
      exportDate: new Date().toISOString(),
      notes: Array.isArray(notes) ? notes : [],
    };

    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `muslim-dashboard-notes-${
      new Date().toISOString().split("T")[0]
    }.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    this.showToast("Notes exported successfully!", "success");
  }

  handleNotesImport(e) {
    const input = e && e.target;
    const file = input && input.files && input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result || "");
        const data = JSON.parse(text);

        const incoming = Array.isArray(data)
          ? data
          : data && Array.isArray(data.notes)
            ? data.notes
            : null;

        if (!incoming) {
          this.showToast("Invalid notes JSON format.", "error");
          return;
        }

        const existing = this.storage.getNotes
          ? this.storage.getNotes()
          : Array.isArray(this.storage.get("notes", []))
            ? this.storage.get("notes", [])
            : [];

        const byId = new Set(
          existing.map((n) => String(n && n.id ? n.id : "")),
        );
        const now = Date.now();

        const normalized = incoming
          .filter((n) => n && typeof n === "object")
          .map((n) => {
            let id = String(n.id || "").trim();
            if (!id || byId.has(id)) {
              id = this._generateNotesId();
            }
            byId.add(id);

            const title = String(n.title || "Untitled").slice(0, 120);
            const html = typeof n.html === "string" ? n.html : "";
            const rawScale =
              typeof n.scale === "number" || typeof n.scale === "string"
                ? parseFloat(n.scale)
                : 1;
            const scale = Number.isNaN(rawScale)
              ? 1
              : Math.max(1, Math.min(5, rawScale));
            const createdAt =
              typeof n.createdAt === "number" ? n.createdAt : now;
            const updatedAt =
              typeof n.updatedAt === "number" ? n.updatedAt : createdAt;

            return { id, title, html, scale, createdAt, updatedAt };
          });

        const merged = existing.concat(normalized);
        merged.sort(
          (a, b) => (Number(b.updatedAt) || 0) - (Number(a.updatedAt) || 0),
        );

        if (this.storage.saveNotes) this.storage.saveNotes(merged);
        else this.storage.set("notes", merged);

        this.updateNotesCountHint();

        try {
          window.dashboard?.notes?.reloadFromStorage?.();
        } catch (err) {
          // ignore
        }

        this.showToast(
          `Imported ${normalized.length} note${
            normalized.length === 1 ? "" : "s"
          }.`,
          "success",
        );
      } catch (err) {
        console.error("Notes import error:", err);
        this.showToast("Failed to import notes JSON.", "error");
      } finally {
        try {
          input.value = "";
        } catch (e2) {}
      }
    };

    reader.onerror = () => {
      this.showToast("Failed to read file.", "error");
      try {
        input.value = "";
      } catch (e2) {}
    };

    reader.readAsText(file);
  }

  _generateNotesId() {
    return (
      Date.now().toString(36) +
      Math.random().toString(36).slice(2) +
      Math.random().toString(36).slice(2)
    ).slice(0, 24);
  }
});
