// Local Lucide integration wrapper.
// lucide.min.js is loaded via index.html (offline-friendly vendor copy).

(function () {
  const defaultAttrs = {
    "aria-hidden": "true",
    focusable: "false",
  };

  function renderLucideIcons(root = null) {
    try {
      if (!window.lucide || typeof window.lucide.createIcons !== "function") {
        return;
      }

      const rootEl =
        root && typeof root.querySelectorAll === "function" ? root : document;

      // Replaces all elements with [data-lucide] under the root.
      window.lucide.createIcons({ attrs: defaultAttrs, root: rootEl });
    } catch (e) {
      // Non-fatal: UI still works, only icons may be missing.
      try {
        console.warn("Lucide icon render failed", e);
      } catch (e2) {}
    }
  }

  function setLucideIcon(containerEl, iconName, attrs = null) {
    if (!containerEl) return;
    containerEl.innerHTML = `<i data-lucide="${String(iconName)}"></i>`;

    if (attrs && typeof attrs === "object") {
      try {
        const i = containerEl.querySelector("i[data-lucide]");
        if (i) {
          for (const [k, v] of Object.entries(attrs)) {
            i.setAttribute(k, String(v));
          }
        }
      } catch (e) {}
    }

    renderLucideIcons(containerEl);
  }

  window.renderLucideIcons = renderLucideIcons;
  window.setLucideIcon = setLucideIcon;
})();
