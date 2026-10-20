/**
 * SettingsManager: detached editor modal and column resizing.
 * Part of the class declared in js/settings/index.js; load this after it.
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

  getDetachedEditorConfigs() {
    return [
      {
        buttonId: "quotesDetachEditorBtn",
        groupId: "quotesEditorGroup",
        title: "Quotes Editor",
        onBeforeOpen: () => this.quotes?.renderQuotesList?.(),
        onAfterOpen: () => this.quotes?.renderQuotesList?.(),
        onAfterClose: () => this.quotes?.renderQuotesList?.(),
      },
      {
        buttonId: "flashcardsDetachEditorBtn",
        groupId: "flashcardsEditorGroup",
        title: "Flashcards Editor",
        onBeforeOpen: () => this.flashcards?.renderSettings?.(),
        onAfterOpen: () => this.flashcards?.renderSettings?.(),
        onAfterClose: () => this.flashcards?.renderSettings?.(),
      },
      {
        buttonId: "hadithDetachEditorBtn",
        groupId: "hadithEditorGroup",
        title: "Hadith Editor",
        onBeforeOpen: () => this.hadith?.renderSettings?.(),
        onAfterOpen: () => this.hadith?.renderSettings?.(),
        onAfterClose: () => this.hadith?.renderSettings?.(),
      },
      {
        buttonId: "adhkarDetachEditorBtn",
        groupId: "adhkarEditorGroup",
        title: "Adhkar Editor",
        onBeforeOpen: () => this.adhkar?.renderSettings?.(),
        onAfterOpen: () => this.adhkar?.renderSettings?.(),
        onAfterClose: () => this.adhkar?.renderSettings?.(),
      },
    ];
  }

  ensureDetachedEditorModal() {
    if (this.detachedEditorModal) return;

    let modal = document.getElementById("settingsEditorDetachModal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "settingsEditorDetachModal";
      modal.className = "editor-detach-modal";
      modal.innerHTML = `
        <div class="editor-detach-modal-content">
          <div class="editor-detach-modal-header">
            <h3 class="editor-detach-modal-title" id="settingsEditorDetachTitle">Detached Editor</h3>
            <button type="button" class="editor-detach-modal-close" aria-label="Close detached editor">&times;</button>
          </div>
          <div class="editor-detach-modal-body" id="settingsEditorDetachBody"></div>
        </div>
      `;
      document.body.appendChild(modal);
    }

    this.detachedEditorModal = modal;
    this.detachedEditorModalContent = modal.querySelector(
      ".editor-detach-modal-content",
    );
    this.detachedEditorModalBody = modal.querySelector(
      ".editor-detach-modal-body",
    );
    this.detachedEditorModalTitle = modal.querySelector(
      ".editor-detach-modal-title",
    );
    this.detachedEditorCloseBtn = modal.querySelector(
      ".editor-detach-modal-close",
    );

    if (this.detachedEditorCloseBtn?.dataset.bound !== "1") {
      this.detachedEditorCloseBtn.dataset.bound = "1";
      this.detachedEditorCloseBtn.addEventListener("click", () =>
        this.closeDetachedEditorModal(),
      );
    }

    this._bindOverlayCloseBehavior(this.detachedEditorModal, () =>
      this.closeDetachedEditorModal(),
    );

    if (!document.documentElement.dataset.detachedEditorEscBound) {
      document.documentElement.dataset.detachedEditorEscBound = "1";
      document.addEventListener("keydown", (e) => {
        if (e.key !== "Escape") return;
        if (this.detachedEditorModal?.classList.contains("active")) {
          this.closeDetachedEditorModal();
        }
      });
    }
  }

  bindDetachedEditorButtons() {
    this.getDetachedEditorConfigs().forEach((config) => {
      const btn = document.getElementById(config.buttonId);
      if (!btn || btn.dataset.bound === "1") return;

      btn.dataset.bound = "1";
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        this.openDetachedEditorModal(config);
      });
    });
  }

  openDetachedEditorModal(config) {
    if (!config?.groupId) return;
    this.ensureDetachedEditorModal();

    if (!this.detachedEditorModal || !this.detachedEditorModalBody) return;

    if (typeof config.onBeforeOpen === "function") {
      try {
        config.onBeforeOpen();
      } catch (e) {
        // ignore
      }
    }

    if (this._detachedEditorState?.groupId === config.groupId) {
      return;
    }

    if (this._detachedEditorState) {
      this.closeDetachedEditorModal({ skipAfterCloseRefresh: true });
    }

    const group = document.getElementById(config.groupId);
    const parent = group?.parentElement;
    if (!group || !parent) return;

    const placeholder = document.createElement("div");
    placeholder.className = "editor-detached-host-placeholder";
    placeholder.hidden = true;
    parent.insertBefore(placeholder, group);

    this.detachedEditorModalBody.appendChild(group);
    this.detachedEditorModal.classList.add("active");
    this.detachedEditorModalTitle.textContent =
      config.title || "Detached Editor";

    this._detachedEditorState = {
      groupId: config.groupId,
      group,
      placeholder,
      onAfterClose: config.onAfterClose,
      resizeCleanup: null,
    };

    if (typeof config.onAfterOpen === "function") {
      try {
        config.onAfterOpen();
      } catch (e) {
        // ignore
      }
    }

    this.applyDetachedEditorModalInitialWidth();
    this.refreshDetachedEditorColumnResize();
    this.bindDetachedEditorViewportRefresh();
    this.bindDetachedEditorMutationRefresh();
  }

  getDetachedEditorRowCount(group) {
    if (!group) return 0;
    return group.querySelectorAll(
      ".quote-editor-row, .flashcard-row, .hadith-editor-row, .adhkar-editor-row",
    ).length;
  }

  applyDetachedEditorModalInitialWidth() {
    if (!this._detachedEditorState?.group || !this.detachedEditorModalContent)
      return;

    const group = this._detachedEditorState.group;
    const surface =
      group.querySelector(
        ".hadith-editor-table-wrap, .adhkar-editor-table-wrap, .flashcard-editor-body, .flashcards-editor, .adhkar-editor, .user-quotes-list",
      ) || group;

    const rowCount = this.getDetachedEditorRowCount(group);
    const viewportWidth =
      window.innerWidth || document.documentElement?.clientWidth || 1200;
    const minWidth = Math.max(520, Math.floor(viewportWidth * 0.36));
    const maxWidth = Math.floor(viewportWidth * 0.96);

    // Size detached editors from row density first, then cap with content width.
    const normalizedRows = Math.max(1, Math.min(rowCount || 1, 30));
    const baseRatio = Math.min(0.78, 0.42 + normalizedRows * 0.011);
    const baseWidth = Math.floor(viewportWidth * baseRatio);

    const measured = Math.max(
      surface.scrollWidth || 0,
      group.scrollWidth || 0,
      760,
    );
    const softCap = baseWidth + Math.max(120, Math.floor(normalizedRows * 6));
    const preferredWidth = Math.min(measured + 72, softCap);
    const targetWidth = Math.max(
      minWidth,
      Math.min(maxWidth, Math.max(baseWidth, preferredWidth)),
    );

    this.detachedEditorModalContent.style.setProperty(
      "--detached-editor-width",
      `${targetWidth}px`,
    );
  }

  refreshDetachedEditorColumnResize() {
    const state = this._detachedEditorState;
    if (!state?.group) return;

    if (typeof state.resizeCleanup === "function") {
      try {
        state.resizeCleanup();
      } catch (e) {
        // ignore
      }
      state.resizeCleanup = null;
    }

    state.resizeCleanup = this.enableDetachedEditorColumnResize(state.group);
  }

  scheduleDetachedEditorLayoutRefresh({ includeWidth = false } = {}) {
    if (!this._detachedEditorState) return;
    if (includeWidth) {
      this._detachedEditorRefreshNeedsWidth = true;
    }
    if (this._detachedEditorRefreshTimer) return;

    this._detachedEditorRefreshTimer = setTimeout(() => {
      this._detachedEditorRefreshTimer = null;
      if (!this._detachedEditorState) return;

      const shouldRefreshWidth = this._detachedEditorRefreshNeedsWidth;
      this._detachedEditorRefreshNeedsWidth = false;

      if (shouldRefreshWidth) {
        this.applyDetachedEditorModalInitialWidth();
      }
      this.refreshDetachedEditorColumnResize();
    }, 0);
  }

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
});
