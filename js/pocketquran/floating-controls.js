/**
 * PocketQuranManager: floating recitation controls.
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

  shouldAutoFloatRecitationControls() {
    return (
      this._recitationFloatingEnabled &&
      this._isPlaying &&
      !this._recitationFloatingManualOnly
    );
  }

  isElementMeaningfullyVisible(element) {
    if (!element) return false;

    const rect = element.getBoundingClientRect();
    const width = Math.max(0, rect.width);
    const height = Math.max(0, rect.height);
    if (!width || !height) return false;

    const viewportWidth =
      window.innerWidth || document.documentElement.clientWidth || 0;
    const viewportHeight =
      window.innerHeight || document.documentElement.clientHeight || 0;

    const visibleWidth =
      Math.min(rect.right, viewportWidth) - Math.max(rect.left, 0);
    const visibleHeight =
      Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0);

    if (visibleWidth <= 0 || visibleHeight <= 0) return false;

    const visibleArea = visibleWidth * visibleHeight;
    const totalArea = width * height;
    return visibleArea / totalArea >= 0.2;
  }

  ensureRecitationVisibilityObserver() {
    if (this._recitationVisibilityObserver) return;
    if (typeof IntersectionObserver !== "function") return;

    this._recitationVisibilityObserver = new IntersectionObserver(
      (entries) => {
        const entry = Array.isArray(entries) ? entries[0] : null;
        if (
          !entry ||
          !this._headerControlsBox ||
          this._recitationFloatingMode
        ) {
          return;
        }

        const isVisible =
          entry.isIntersecting === true && entry.intersectionRatio >= 0.2;
        if (!isVisible) {
          this.maybeAutoFloatRecitationControls();
        }
      },
      {
        threshold: [0, 0.2, 0.4, 0.6, 1],
      },
    );
  }

  watchRecitationControlsVisibility() {
    if (
      !this._headerControlsBox ||
      this._recitationFloatingMode ||
      !this._recitationFloatingEnabled
    ) {
      return;
    }

    this.ensureRecitationVisibilityObserver();
    if (!this._recitationVisibilityObserver) return;

    this._recitationVisibilityObserver.disconnect();
    this._recitationVisibilityObserver.observe(this._headerControlsBox);
  }

  unwatchRecitationControlsVisibility() {
    if (this._recitationVisibilityObserver) {
      this._recitationVisibilityObserver.disconnect();
    }
  }

  ensureRecitationAutoDockObserver() {
    if (this._recitationAutoDockObserver) return;
    if (typeof IntersectionObserver !== "function") return;

    this._recitationAutoDockObserver = new IntersectionObserver(
      (entries) => {
        const entry = Array.isArray(entries) ? entries[0] : null;
        if (
          !entry ||
          !this._headerControlsBox ||
          !this._recitationFloatingMode
        ) {
          return;
        }

        const isVisible =
          entry.isIntersecting === true && entry.intersectionRatio >= 0.2;

        if (!isVisible) {
          this._recitationAutoDockAwaitingReturn = true;
          return;
        }

        if (
          this._recitationAutoDockOnVisible &&
          this._recitationAutoDockAwaitingReturn
        ) {
          this.disableRecitationFloating({ preserveManualOnly: true });
        }
      },
      {
        threshold: [0, 0.2, 0.4, 0.6, 1],
      },
    );
  }

  watchRecitationAutoDockVisibility() {
    if (!this._recitationFloatingMode || !this._recitationAutoDockOnVisible) {
      return;
    }

    const target =
      this.card?.querySelector(".pocket-quran-header") || this.card;
    if (!target) return;

    this.ensureRecitationAutoDockObserver();
    if (!this._recitationAutoDockObserver) return;

    this._recitationAutoDockObserver.disconnect();
    this._recitationAutoDockObserver.observe(target);

    this._recitationAutoDockAwaitingReturn =
      !this.isElementMeaningfullyVisible(target);
  }

  unwatchRecitationAutoDockVisibility() {
    if (this._recitationAutoDockObserver) {
      this._recitationAutoDockObserver.disconnect();
    }
    this._recitationAutoDockAwaitingReturn = false;
  }

  maybeAutoFloatRecitationControls() {
    if (!this.shouldAutoFloatRecitationControls()) return;
    if (!this._headerControlsBox || this._recitationFloatingMode) return;
    if (this.isElementMeaningfullyVisible(this._headerControlsBox)) return;

    this.enableRecitationFloating({ source: "auto" });
  }

  ensureRecitationControlsAttachedToHeader() {
    const header = this.card?.querySelector(".pocket-quran-header");
    if (!header || !this._headerControlsBox) return false;

    const actions = header.querySelector(".card-header-actions");
    const title = header.querySelector(".card-title");
    if (actions) {
      actions.after(this._headerControlsBox);
    } else if (title) {
      title.after(this._headerControlsBox);
    } else {
      header.appendChild(this._headerControlsBox);
    }

    header.classList.add("pq-has-recitation-controls");
    return true;
  }

  positionRecitationFloatingPanel() {
    if (!this._headerControlsBox || !this._recitationFloatingMode) return;

    const box = this._headerControlsBox;
    const margin = 12;

    const viewportWidth =
      window.innerWidth || document.documentElement.clientWidth || 0;
    const viewportHeight =
      window.innerHeight || document.documentElement.clientHeight || 0;

    const rect = box.getBoundingClientRect();
    const panelWidth = Math.max(
      260,
      Math.round(rect.width || box.offsetWidth || 360),
    );
    const panelHeight = Math.max(
      80,
      Math.round(rect.height || box.offsetHeight || 90),
    );

    const hasStoredPosition =
      Number.isFinite(this._recitationFloatingPosition?.left) &&
      Number.isFinite(this._recitationFloatingPosition?.top);

    let left = hasStoredPosition
      ? this._recitationFloatingPosition.left
      : margin;
    let top = hasStoredPosition
      ? this._recitationFloatingPosition.top
      : Math.max(margin, viewportHeight - panelHeight - margin);

    if (!hasStoredPosition) {
      const attribution = document.getElementById("bg-attribution");
      if (attribution) {
        const attrRect = attribution.getBoundingClientRect();
        const overlapsHoriz =
          left < attrRect.right + margin &&
          left + panelWidth > attrRect.left - margin;
        const overlapsVert =
          top < attrRect.bottom + margin &&
          top + panelHeight > attrRect.top - margin;

        if (overlapsHoriz && overlapsVert) {
          top = Math.max(margin, attrRect.top - panelHeight - margin);
        }
      }
    }

    left = Math.max(
      margin,
      Math.min(left, viewportWidth - panelWidth - margin),
    );
    top = Math.max(
      margin,
      Math.min(top, viewportHeight - panelHeight - margin),
    );

    this._recitationFloatingPosition = {
      left: Math.round(left),
      top: Math.round(top),
    };

    box.style.left = `${this._recitationFloatingPosition.left}px`;
    box.style.top = `${this._recitationFloatingPosition.top}px`;
  }

  startRecitationFloatingDrag(event) {
    if (!this._headerControlsBox || !this._recitationFloatingMode) return;

    const box = this._headerControlsBox;
    if (!(event instanceof PointerEvent)) return;

    if (
      event.button !== 0 &&
      event.pointerType !== "touch" &&
      event.pointerType !== "pen"
    ) {
      return;
    }

    const interactiveTarget = event.target?.closest?.(
      "button, input, select, textarea, a, label, [role='button'], .pq-recitation-ayah, .pq-recitation-reciter, .pq-volume-control",
    );
    if (interactiveTarget) return;

    const boxRect = box.getBoundingClientRect();
    const parsedLeft = Number.parseFloat(box.style.left);
    const parsedTop = Number.parseFloat(box.style.top);
    const startLeft = Number.isFinite(parsedLeft) ? parsedLeft : boxRect.left;
    const startTop = Number.isFinite(parsedTop) ? parsedTop : boxRect.top;

    this.stopRecitationFloatingDrag();

    const dragState = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startLeft,
      startTop,
      onPointerMove: null,
      onPointerUp: null,
    };

    dragState.onPointerMove = (moveEvent) => {
      if (moveEvent.pointerId !== dragState.pointerId) return;
      if (!this._headerControlsBox || !this._recitationFloatingMode) {
        this.stopRecitationFloatingDrag();
        return;
      }

      const deltaX = moveEvent.clientX - dragState.startX;
      const deltaY = moveEvent.clientY - dragState.startY;

      this._recitationFloatingPosition = {
        left: dragState.startLeft + deltaX,
        top: dragState.startTop + deltaY,
      };
      this.positionRecitationFloatingPanel();
    };

    dragState.onPointerUp = (upEvent) => {
      if (upEvent.pointerId !== dragState.pointerId) return;
      this.stopRecitationFloatingDrag();
    };

    this._recitationFloatingDrag = dragState;
    box.classList.add("pq-recitation-controls-dragging");

    if (typeof box.setPointerCapture === "function") {
      try {
        box.setPointerCapture(event.pointerId);
      } catch (err) {
        // Ignore unsupported capture failures.
      }
    }

    window.addEventListener("pointermove", dragState.onPointerMove, {
      passive: true,
    });
    window.addEventListener("pointerup", dragState.onPointerUp);
    window.addEventListener("pointercancel", dragState.onPointerUp);

    event.preventDefault();
  }

  stopRecitationFloatingDrag() {
    const dragState = this._recitationFloatingDrag;
    if (!dragState) return;

    window.removeEventListener("pointermove", dragState.onPointerMove);
    window.removeEventListener("pointerup", dragState.onPointerUp);
    window.removeEventListener("pointercancel", dragState.onPointerUp);

    const box = this._headerControlsBox;
    if (box) {
      box.classList.remove("pq-recitation-controls-dragging");
      if (typeof box.releasePointerCapture === "function") {
        try {
          box.releasePointerCapture(dragState.pointerId);
        } catch (err) {
          // Ignore unsupported release failures.
        }
      }
    }

    this._recitationFloatingDrag = null;
  }

  syncRecitationFloatingAppearanceClass() {
    if (!this._headerControlsBox) return;

    const useOpaqueMode =
      this._recitationFloatingMode &&
      this._recitationFloatingAppearance === "opaque";

    this._headerControlsBox.classList.toggle(
      "pq-recitation-controls-floating-opaque",
      useOpaqueMode,
    );
  }

  enableRecitationFloating({ source = "manual" } = {}) {
    if (source !== "manual" && !this._recitationFloatingEnabled) return;

    if (!this._headerControlsBox) {
      this.showHeaderControls();
    }
    if (!this._headerControlsBox) return;

    if (this._recitationFloatingMode) {
      this._recitationFloatingModeReason = source;
      this.syncRecitationFloatingAppearanceClass();
      this.positionRecitationFloatingPanel();
      if (this._recitationAutoDockOnVisible) {
        this.watchRecitationAutoDockVisibility();
      }
      this.updateRecitationFloatingButtons();
      return;
    }

    this.unwatchRecitationControlsVisibility();

    const header = this.card?.querySelector(".pocket-quran-header");
    if (header) {
      header.classList.remove("pq-has-recitation-controls");
    }

    document.body.appendChild(this._headerControlsBox);
    this._headerControlsBox.classList.add("pq-recitation-controls-floating");

    this._recitationFloatingMode = true;
    this._recitationFloatingModeReason = source;

    this.syncRecitationFloatingAppearanceClass();
    this.positionRecitationFloatingPanel();
    if (this._recitationAutoDockOnVisible) {
      this.watchRecitationAutoDockVisibility();
    } else {
      this.unwatchRecitationAutoDockVisibility();
    }
    this.updateRecitationFloatingButtons();
  }

  disableRecitationFloating({ preserveManualOnly = false } = {}) {
    if (!this._headerControlsBox) return;

    this.stopRecitationFloatingDrag();
    this._headerControlsBox.classList.remove("pq-recitation-controls-floating");
    this._headerControlsBox.classList.remove(
      "pq-recitation-controls-floating-opaque",
    );
    this._headerControlsBox.style.removeProperty("left");
    this._headerControlsBox.style.removeProperty("top");
    this.unwatchRecitationAutoDockVisibility();

    this._recitationFloatingMode = false;
    this._recitationFloatingModeReason = null;
    if (!preserveManualOnly) {
      this._recitationFloatingManualOnly = false;
    }

    this.ensureRecitationControlsAttachedToHeader();

    if (this._recitationFloatingEnabled) {
      this.watchRecitationControlsVisibility();
      this.maybeAutoFloatRecitationControls();
    }

    this.updateRecitationFloatingButtons();
  }

  minimizeRecitationFloating() {
    this._recitationFloatingManualOnly = true;
    this.disableRecitationFloating({ preserveManualOnly: true });
  }

  toggleRecitationFloating() {
    if (this._recitationFloatingMode) {
      this.disableRecitationFloating({ preserveManualOnly: true });
      return;
    }

    this.enableRecitationFloating({ source: "manual" });
  }

  updateRecitationFloatingButtons() {
    if (!this._headerControlsBox) return;

    const floatToggleBtn = this._headerControlsBox.querySelector(
      ".pq-recitation-float-toggle-btn",
    );

    if (floatToggleBtn) {
      const label = this._recitationFloatingMode
        ? "Dock recitation controls"
        : "Detach recitation controls";

      floatToggleBtn.innerHTML = this._recitationFloatingMode
        ? '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-picture-in-picture2-icon lucide-picture-in-picture-2" aria-hidden="true" focusable="false"><path d="M21 9V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v10c0 1.1.9 2 2 2h4"/><rect width="10" height="7" x="12" y="13" rx="2"/></svg>'
        : '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-picture-in-picture-icon lucide-picture-in-picture" aria-hidden="true" focusable="false"><path d="M2 10h6V4"/><path d="m2 4 6 6"/><path d="M21 10V7a2 2 0 0 0-2-2h-7"/><path d="M3 14v2a2 2 0 0 0 2 2h3"/><rect x="12" y="14" width="10" height="7" rx="1"/></svg>';
      floatToggleBtn.title = label;
      floatToggleBtn.setAttribute("aria-label", label);
      floatToggleBtn.setAttribute(
        "aria-pressed",
        this._recitationFloatingMode ? "true" : "false",
      );
    }

    this._headerControlsBox.classList.toggle(
      "pq-recitation-controls-manual-only",
      this._recitationFloatingManualOnly,
    );
  }
});
