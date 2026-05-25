/**
 * Base Manager
 * Shared UI helpers used across dashboard managers.
 */

class BaseManager {
  constructor() {
    this._sharedModalUid = Math.random().toString(36).slice(2, 10);

    this._sharedUrlPromptOverlay = null;
    this._sharedUrlPromptResolver = null;
    this._sharedUrlPromptConfig = null;
    this._sharedUrlPromptFocusRestoreEl = null;
    this._sharedUrlPromptEscapeBound = false;

    this._sharedConfirmOverlay = null;
    this._sharedConfirmResolver = null;
    this._sharedConfirmFocusRestoreEl = null;
    this._sharedConfirmEscapeBound = false;
  }

  /**
   * Get icon based on current icon theme.
   */
  _getIcon(emoji, options = {}) {
    if (window.dashboard?.iconThemes) {
      return window.dashboard.iconThemes.getIcon(emoji, options);
    }
    return emoji;
  }

  /**
   * Native <option> cannot render inline SVG, so use a text-style lock marker
   * in Lucide themes to avoid colored emoji clashing with the icon theme.
   */
  _getLockedOptionLabel(label) {
    const theme = window.dashboard?.iconThemes?.getCurrentTheme?.() || "emoji";
    const lockPrefix = theme === "emoji" ? "🔒" : "🔒︎";
    return `${lockPrefix} ${label}`;
  }

  /**
   * Close modal overlays only when clicking backdrop.
   */
  _bindOverlayCloseBehavior(overlayEl, closeFn) {
    if (!overlayEl || typeof closeFn !== "function") return;

    let pointerDownOnBackdrop = false;
    const downEvent = window.PointerEvent ? "pointerdown" : "mousedown";

    overlayEl.addEventListener(downEvent, (e) => {
      pointerDownOnBackdrop = e.target === overlayEl;
    });

    overlayEl.addEventListener("click", (e) => {
      if (e.target !== overlayEl) return;
      if (!pointerDownOnBackdrop) return;
      closeFn();
    });
  }

  /**
   * Escape HTML to prevent XSS.
   */
  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = String(text ?? "");
    return div.innerHTML;
  }

  resolveResourceUrl(url) {
    const raw = String(url || "").trim();
    if (!raw) return raw;

    if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(raw) || raw.startsWith("/")) {
      return raw;
    }

    if (typeof chrome !== "undefined" && chrome.runtime?.getURL) {
      return chrome.runtime.getURL(raw.replace(/^\.\//, ""));
    }

    return raw;
  }

  async fetchJsonResource(
    url,
    { cache = "no-store", label = "Resource" } = {},
  ) {
    const response = await fetch(this.resolveResourceUrl(url), { cache });
    if (!response.ok) {
      throw new Error(`${label} request failed: HTTP ${response.status}`);
    }

    try {
      return await response.json();
    } catch (error) {
      throw new Error(`${label} returned invalid JSON.`);
    }
  }

  async fetchTextResource(
    url,
    { cache = "no-store", label = "Resource" } = {},
  ) {
    const response = await fetch(this.resolveResourceUrl(url), { cache });
    if (!response.ok) {
      throw new Error(`${label} request failed: HTTP ${response.status}`);
    }

    try {
      return await response.text();
    } catch (error) {
      throw new Error(`${label} returned invalid text payload.`);
    }
  }

  _ensureSharedUrlPromptModal() {
    if (
      this._sharedUrlPromptOverlay &&
      document.body.contains(this._sharedUrlPromptOverlay)
    ) {
      return;
    }

    const uid = this._sharedModalUid || "shared";
    const overlayId = `sharedUrlPromptModal-${uid}`;
    const titleId = `sharedUrlPromptTitle-${uid}`;
    const closeBtnId = `sharedUrlPromptCloseBtn-${uid}`;
    const descId = `sharedUrlPromptDescription-${uid}`;
    const formId = `sharedUrlPromptForm-${uid}`;
    const labelId = `sharedUrlPromptLabel-${uid}`;
    const inputId = `sharedUrlPromptInput-${uid}`;
    const cancelBtnId = `sharedUrlPromptCancelBtn-${uid}`;
    const submitBtnId = `sharedUrlPromptSubmitBtn-${uid}`;

    const overlay = document.createElement("div");
    overlay.id = overlayId;
    overlay.className = "modal-overlay notes-url-prompt-modal";
    overlay.setAttribute("aria-hidden", "true");
    overlay.innerHTML = `
      <div
        class="modal modal-small notes-url-prompt-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="${titleId}"
      >
        <div class="modal-header">
          <h2 class="modal-title" id="${titleId}">Import by URL</h2>
          <button
            class="modal-close"
            id="${closeBtnId}"
            type="button"
            aria-label="Close"
          >
            &times;
          </button>
        </div>
        <div class="modal-body">
          <p class="notes-url-prompt-description" id="${descId}"></p>
          <form id="${formId}">
            <div class="setting-group notes-url-prompt-group">
              <label class="setting-label" for="${inputId}" id="${labelId}">
                Image URL
              </label>
              <input
                class="setting-input"
                id="${inputId}"
                type="text"
                inputmode="url"
                autocomplete="off"
                spellcheck="false"
                placeholder="https://"
                required
              />
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button class="modal-btn cancel-btn" id="${cancelBtnId}" type="button">
            Cancel
          </button>
          <button
            class="modal-btn save-btn"
            id="${submitBtnId}"
            type="submit"
            form="${formId}"
          >
            Import
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    this._sharedUrlPromptOverlay = overlay;
    this._sharedUrlPromptTitleEl = overlay.querySelector(`#${titleId}`);
    this._sharedUrlPromptDescriptionEl = overlay.querySelector(`#${descId}`);
    this._sharedUrlPromptLabelEl = overlay.querySelector(`#${labelId}`);
    this._sharedUrlPromptInputEl = overlay.querySelector(`#${inputId}`);
    this._sharedUrlPromptSubmitBtn = overlay.querySelector(`#${submitBtnId}`);

    const form = overlay.querySelector(`#${formId}`);
    const closeBtn = overlay.querySelector(`#${closeBtnId}`);
    const cancelBtn = overlay.querySelector(`#${cancelBtnId}`);

    form?.addEventListener("submit", (event) => {
      event.preventDefault();
      this._submitSharedUrlPromptModal();
    });

    closeBtn?.addEventListener("click", () => {
      this._closeSharedUrlPromptModal("");
    });

    cancelBtn?.addEventListener("click", () => {
      this._closeSharedUrlPromptModal("");
    });

    this._bindOverlayCloseBehavior(overlay, () =>
      this._closeSharedUrlPromptModal(""),
    );

    if (!this._sharedUrlPromptEscapeBound) {
      document.addEventListener("keydown", (event) => {
        if (!this._sharedUrlPromptOverlay?.classList.contains("active")) return;
        if (event.key !== "Escape") return;

        event.preventDefault();
        this._closeSharedUrlPromptModal("");
      });

      this._sharedUrlPromptEscapeBound = true;
    }
  }

  openUrlInputModal(config = {}) {
    this._ensureSharedUrlPromptModal();

    if (
      !this._sharedUrlPromptOverlay ||
      !this._sharedUrlPromptTitleEl ||
      !this._sharedUrlPromptDescriptionEl ||
      !this._sharedUrlPromptLabelEl ||
      !this._sharedUrlPromptInputEl ||
      !this._sharedUrlPromptSubmitBtn
    ) {
      return Promise.resolve("");
    }

    if (typeof this._sharedUrlPromptResolver === "function") {
      this._sharedUrlPromptResolver("");
      this._sharedUrlPromptResolver = null;
    }

    const title =
      String(config.title || "Import by URL").trim() || "Import by URL";
    const description = String(config.description || "").trim();
    const label = String(config.label || "Image URL").trim() || "Image URL";
    const placeholder =
      String(config.placeholder || "https://").trim() || "https://";
    const submitLabel =
      String(config.submitLabel || "Import").trim() || "Import";
    const initialValue = String(config.initialValue || "").trim();

    this._sharedUrlPromptConfig = {
      validate:
        typeof config.validate === "function"
          ? config.validate
          : (value) => String(value || "").trim(),
      invalidMessage:
        String(config.invalidMessage || "Please enter a valid URL.").trim() ||
        "Please enter a valid URL.",
    };

    this._sharedUrlPromptTitleEl.textContent = title;
    this._sharedUrlPromptDescriptionEl.textContent = description;
    this._sharedUrlPromptDescriptionEl.hidden = !description;
    this._sharedUrlPromptLabelEl.textContent = label;
    this._sharedUrlPromptInputEl.placeholder = placeholder;
    this._sharedUrlPromptInputEl.value = initialValue;
    this._sharedUrlPromptInputEl.setCustomValidity("");
    this._sharedUrlPromptSubmitBtn.textContent = submitLabel;

    this._sharedUrlPromptFocusRestoreEl =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    this._sharedUrlPromptOverlay.classList.add("active");
    this._sharedUrlPromptOverlay.setAttribute("aria-hidden", "false");

    const focusInput = () => {
      if (!this._sharedUrlPromptInputEl) return;
      this._sharedUrlPromptInputEl.focus();
      if (this._sharedUrlPromptInputEl.value) {
        this._sharedUrlPromptInputEl.select();
      }
    };

    if (typeof window.requestAnimationFrame === "function") {
      window.requestAnimationFrame(focusInput);
    } else {
      window.setTimeout(focusInput, 0);
    }

    return new Promise((resolve) => {
      this._sharedUrlPromptResolver = resolve;
    });
  }

  _submitSharedUrlPromptModal() {
    if (!this._sharedUrlPromptInputEl) return;

    const rawValue = String(this._sharedUrlPromptInputEl.value || "").trim();
    const validator = this._sharedUrlPromptConfig?.validate;
    const normalized =
      typeof validator === "function"
        ? String(validator(rawValue) || "").trim()
        : rawValue;

    if (!normalized) {
      const message =
        String(this._sharedUrlPromptConfig?.invalidMessage || "").trim() ||
        "Please enter a valid URL.";
      this._sharedUrlPromptInputEl.setCustomValidity(message);
      this._sharedUrlPromptInputEl.reportValidity();
      return;
    }

    this._sharedUrlPromptInputEl.setCustomValidity("");
    this._closeSharedUrlPromptModal(normalized);
  }

  _closeSharedUrlPromptModal(result = "") {
    if (!this._sharedUrlPromptOverlay) return;

    this._sharedUrlPromptOverlay.classList.remove("active");
    this._sharedUrlPromptOverlay.setAttribute("aria-hidden", "true");
    this._sharedUrlPromptInputEl?.setCustomValidity("");

    const resolve = this._sharedUrlPromptResolver;
    const focusRestoreEl = this._sharedUrlPromptFocusRestoreEl;

    this._sharedUrlPromptResolver = null;
    this._sharedUrlPromptConfig = null;
    this._sharedUrlPromptFocusRestoreEl = null;

    if (focusRestoreEl && typeof focusRestoreEl.focus === "function") {
      window.setTimeout(() => {
        try {
          focusRestoreEl.focus({ preventScroll: true });
        } catch (_error) {
          // Ignore focus restore failures.
        }
      }, 0);
    }

    if (typeof resolve === "function") {
      resolve(String(result || "").trim());
    }
  }

  _ensureSharedConfirmModal() {
    if (
      this._sharedConfirmOverlay &&
      document.body.contains(this._sharedConfirmOverlay)
    ) {
      return;
    }

    const uid = this._sharedModalUid || "shared";
    const overlayId = `sharedConfirmModal-${uid}`;
    const iconId = `sharedConfirmIcon-${uid}`;
    const titleId = `sharedConfirmTitle-${uid}`;
    const textId = `sharedConfirmText-${uid}`;
    const hintId = `sharedConfirmHint-${uid}`;
    const cancelId = `sharedConfirmCancelBtn-${uid}`;
    const confirmId = `sharedConfirmConfirmBtn-${uid}`;

    const overlay = document.createElement("div");
    overlay.id = overlayId;
    overlay.className = "modal-overlay delete-confirm-modal";
    overlay.setAttribute("aria-hidden", "true");
    overlay.innerHTML = `
      <div
        class="delete-confirm-content"
        role="dialog"
        aria-modal="true"
        aria-labelledby="${titleId}"
      >
        <div class="delete-confirm-icon" id="${iconId}">⚠️</div>
        <h3 id="${titleId}">Confirm</h3>
        <p id="${textId}"></p>
        <p
          class="delete-confirm-hint"
          id="${hintId}"
          style="font-size: 0.85rem; color: var(--text-muted)"
          hidden
        ></p>
        <div class="delete-confirm-buttons">
          <button class="delete-confirm-btn cancel" id="${cancelId}" type="button">
            Cancel
          </button>
          <button class="delete-confirm-btn confirm" id="${confirmId}" type="button">
            Confirm
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    this._sharedConfirmOverlay = overlay;
    this._sharedConfirmIconEl = overlay.querySelector(`#${iconId}`);
    this._sharedConfirmTitleEl = overlay.querySelector(`#${titleId}`);
    this._sharedConfirmTextEl = overlay.querySelector(`#${textId}`);
    this._sharedConfirmHintEl = overlay.querySelector(`#${hintId}`);
    this._sharedConfirmCancelBtn = overlay.querySelector(`#${cancelId}`);
    this._sharedConfirmConfirmBtn = overlay.querySelector(`#${confirmId}`);

    this._sharedConfirmCancelBtn?.addEventListener("click", () => {
      this._closeSharedConfirmModal(false);
    });

    this._sharedConfirmConfirmBtn?.addEventListener("click", () => {
      this._closeSharedConfirmModal(true);
    });

    this._bindOverlayCloseBehavior(overlay, () =>
      this._closeSharedConfirmModal(false),
    );

    if (!this._sharedConfirmEscapeBound) {
      document.addEventListener("keydown", (event) => {
        if (!this._sharedConfirmOverlay?.classList.contains("active")) return;

        if (event.key === "Escape") {
          event.preventDefault();
          this._closeSharedConfirmModal(false);
          return;
        }

        if (event.key === "Enter") {
          event.preventDefault();
          this._closeSharedConfirmModal(true);
        }
      });

      this._sharedConfirmEscapeBound = true;
    }
  }

  openConfirmModal(config = {}) {
    this._ensureSharedConfirmModal();

    if (
      !this._sharedConfirmOverlay ||
      !this._sharedConfirmTitleEl ||
      !this._sharedConfirmTextEl ||
      !this._sharedConfirmCancelBtn ||
      !this._sharedConfirmConfirmBtn
    ) {
      return Promise.resolve(window.confirm(String(config.text || "Confirm?")));
    }

    if (typeof this._sharedConfirmResolver === "function") {
      this._sharedConfirmResolver(false);
      this._sharedConfirmResolver = null;
    }

    const icon = String(config.icon || "⚠️").trim() || "⚠️";
    const title = String(config.title || "Confirm").trim() || "Confirm";
    const text = String(config.text || "").trim();
    const hint = String(config.hint || "").trim();
    const confirmLabel =
      String(config.confirmLabel || "Confirm").trim() || "Confirm";
    const cancelLabel =
      String(config.cancelLabel || "Cancel").trim() || "Cancel";

    if (this._sharedConfirmIconEl) {
      this._sharedConfirmIconEl.innerHTML = this._getIcon(icon, { size: 32 });
    }
    this._sharedConfirmTitleEl.textContent = title;
    this._sharedConfirmTextEl.textContent = text;
    this._sharedConfirmCancelBtn.textContent = cancelLabel;
    this._sharedConfirmConfirmBtn.textContent = confirmLabel;

    if (this._sharedConfirmHintEl) {
      this._sharedConfirmHintEl.textContent = hint;
      this._sharedConfirmHintEl.hidden = !hint;
    }

    this._sharedConfirmFocusRestoreEl =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    this._sharedConfirmOverlay.classList.add("active");
    this._sharedConfirmOverlay.setAttribute("aria-hidden", "false");

    window.setTimeout(() => {
      try {
        this._sharedConfirmConfirmBtn?.focus({ preventScroll: true });
      } catch (_error) {
        // Ignore focus failures.
      }
    }, 0);

    return new Promise((resolve) => {
      this._sharedConfirmResolver = resolve;
    });
  }

  _closeSharedConfirmModal(confirmed) {
    if (!this._sharedConfirmOverlay) return;

    this._sharedConfirmOverlay.classList.remove("active");
    this._sharedConfirmOverlay.setAttribute("aria-hidden", "true");

    const resolve = this._sharedConfirmResolver;
    const focusRestoreEl = this._sharedConfirmFocusRestoreEl;

    this._sharedConfirmResolver = null;
    this._sharedConfirmFocusRestoreEl = null;

    if (focusRestoreEl && typeof focusRestoreEl.focus === "function") {
      window.setTimeout(() => {
        try {
          focusRestoreEl.focus({ preventScroll: true });
        } catch (_error) {
          // Ignore focus restore failures.
        }
      }, 0);
    }

    if (typeof resolve === "function") {
      resolve(confirmed === true);
    }
  }
}

window.BaseManager = BaseManager;
