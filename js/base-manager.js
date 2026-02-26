/**
 * Base Manager
 * Shared UI helpers used across dashboard managers.
 */

class BaseManager {
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
}

window.BaseManager = BaseManager;
